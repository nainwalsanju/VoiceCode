import { useState, useEffect, useRef, useCallback } from 'react';
import './VoiceButton.css';

interface VoiceButtonProps {
  onTranscript?: (text: string) => void;
  isProcessing?: boolean;
}

export function VoiceButton({ onTranscript, isProcessing = false }: VoiceButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'listening' | 'speaking' | 'error'>('idle');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Audio playback context for streaming TTS bytes
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextPlayTimeRef = useRef<number>(0);

  const initAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000
      });
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
  };

  const playAudioChunk = async (pcmData: number[]) => {
    const ctx = audioContextRef.current;
    if (!ctx) return;

    // Convert generic byte list back to Float32Array
    const float32Data = new Float32Array(pcmData.length);
    for (let i = 0; i < pcmData.length; i++) {
      // Assuming simple 16-bit PCM conversion for this simulation snippet
      float32Data[i] = (pcmData[i] - 128) / 128.0;
    }

    const buffer = ctx.createBuffer(1, float32Data.length, 16000);
    buffer.getChannelData(0).set(float32Data);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);

    const currentTime = ctx.currentTime;
    // Schedule seamlessly
    const playTime = Math.max(currentTime, nextPlayTimeRef.current);
    source.start(playTime);
    nextPlayTimeRef.current = playTime + buffer.duration;
  };

  const startInteraction = useCallback(async () => {
    try {
      setError(null);
      setStatus('connecting');
      initAudioContext();
      nextPlayTimeRef.current = 0;

      // 1: Connect WebSocket to unified Agent Stream
      const ws = new WebSocket('ws://localhost:8000/agent/stream');

      ws.onopen = () => {
        console.log('Agent WebSocket connected');
        wsRef.current = ws;
      };

      ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("WS Data Payload:", data.type, data.text ? data.text : (data.data ? `[data array size: ${data.data.length}]` : ""));

          if (data.type === 'ready') {
            startMediaRecording(ws);
          } else if (data.type === 'transcription' && data.text) {
            if (onTranscript) onTranscript(data.text.trim());
          } else if (data.type === 'tts_start') {
            setStatus('speaking');
          } else if (data.type === 'tts_audio' && data.data) {
            // Feed streaming TTS chunks to AudioContext instantly
            let pcmData = data.data;
            if (typeof data.data === 'string') {
              const bin = window.atob(data.data);
              pcmData = new Array(bin.length);
              for (let i = 0; i < bin.length; i++) {
                pcmData[i] = bin.charCodeAt(i);
              }
            }
            await playAudioChunk(pcmData);
          } else if (data.type === 'tts_end') {
            setStatus('idle');
          }
        } catch (e) {
          console.error('WS Parse error:', e);
        }
      };

      ws.onerror = (err) => {
        console.error('Agent WS error:', err);
        setError('Connection error');
        setStatus('error');
      };

      ws.onclose = () => {
        console.log('Agent WS closed');
        wsRef.current = null;
        if (isRecording) stopInteraction();
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start');
      setStatus('error');
    }
  }, [onTranscript]);

  const startMediaRecording = async (ws: WebSocket) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 }
      });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && ws.readyState === WebSocket.OPEN) {
          const reader = new FileReader();
          reader.readAsDataURL(event.data);
          reader.onloadend = () => {
            const base64Data = (reader.result as string).split(',')[1];
            ws.send(JSON.stringify({ type: 'audio', data: base64Data }));
          };
        }
      };

      // Aggressive chunking for ultra-low latency (250ms)
      mediaRecorder.start(250);
      setIsRecording(true);
      setStatus('listening');
    } catch (err) {
      setError('Mic access denied');
      setStatus('error');
    }
  };

  const finishListening = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    setIsRecording(false);
    setStatus('connecting'); // Show spinner while Agent thinks

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'audio_end' }));
    }
  }, []);

  const closeConnection = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.suspend();
    }
    setStatus('idle');
  }, []);

  const stopInteraction = useCallback(() => {
    finishListening();
    closeConnection();
  }, [finishListening, closeConnection]);

  const toggleRecording = () => isRecording ? finishListening() : startInteraction();

  useEffect(() => {
    return () => {
      stopInteraction();
    };
  }, [stopInteraction]);

  return (
    <div className="voice-button-container">
      <button
        className={`voice-button ${status} ${error ? 'error' : ''}`}
        onClick={toggleRecording}
        disabled={isProcessing || status === 'connecting'}
      >
        <span className="mic-icon">
          {status === 'speaking' ? (
            <svg viewBox="0 0 24 24" fill="currentColor">
              {/* Speaker Icon indicating Agent is talking */}
              <path d="M11 5L6 9H2v6h4l5 4V5z" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          ) : status === 'listening' ? (
            <svg viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          ) : status === 'connecting' ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="spin">
              <circle cx="12" cy="12" r="10" strokeDasharray="60" strokeDashoffset="20" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          )}
        </span>
      </button>

      <div className="status-info">
        {status === 'idle' && <span className="status-label">Click to Start Flow</span>}
        {status === 'connecting' && <span className="status-label">Connecting S2S...</span>}
        {status === 'listening' && <span className="status-label recording-label">Listening...</span>}
        {status === 'speaking' && <span className="status-label speaking-label">Agent is Speaking...</span>}
        {status === 'error' && <span className="error-label">{error || 'Error'}</span>}
      </div>
    </div>
  );
}
