import { useState, useEffect, useRef, useCallback } from 'react';
import './VoiceButton.css';

interface VoiceButtonProps {
  onTranscript?: (text: string) => void;
  isProcessing?: boolean;
}

export function VoiceButton({ onTranscript, isProcessing = false }: VoiceButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'ready' | 'recording' | 'error'>('idle');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setStatus('connecting');
      audioChunksRef.current = [];

      // Step 1: Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        }
      });
      streamRef.current = stream;

      // Step 2: Create WebSocket first
      const ws = new WebSocket('ws://localhost:8000/stt/stream');
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        setStatus('ready');
        wsRef.current = ws;
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('WS message:', data);
          
          if (data.type === 'ready') {
            setStatus('recording');
            // Start recording after WS is ready
            startMediaRecording();
          } else if (data.type === 'transcription' && data.text) {
            if (onTranscript) {
              onTranscript(data.text.trim());
            }
          }
        } catch (e) {
          console.error('Parse error:', e);
        }
      };
      
      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        setError('Connection error');
        setStatus('error');
      };
      
      ws.onclose = () => {
        console.log('WebSocket closed');
        wsRef.current = null;
        if (isRecording) {
          setStatus('idle');
        }
      };

      // Wait for WebSocket to connect before proceeding
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('WebSocket timeout')), 10000);
        ws.onopen = () => {
          clearTimeout(timeout);
          console.log('WebSocket connected');
          setStatus('ready');
          wsRef.current = ws;
          resolve();
        };
        ws.onerror = (err) => {
          clearTimeout(timeout);
          console.error('WebSocket error:', err);
          reject(err);
        };
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start recording';
      setError(errorMessage);
      setStatus('error');
      console.error('Recording error:', err);
    }
  }, [onTranscript]);

  const startMediaRecording = () => {
    if (!streamRef.current) return;
    
    const mediaRecorder = new MediaRecorder(streamRef.current, {
      mimeType: 'audio/webm;codecs=opus'
    });
    
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = async (event) => {
      if (event.data.size > 0) {
        audioChunksRef.current.push(event.data);
        
        const ws = wsRef.current;
        if (ws && ws.readyState === WebSocket.OPEN) {
          const arrayBuffer = await event.data.arrayBuffer();
          const base64 = btoa(
            new Uint8Array(arrayBuffer)
              .reduce((data, byte) => data + String.fromCharCode(byte), '')
          );
          
          ws.send(JSON.stringify({
            type: 'audio',
            data: base64
          }));
        }
      }
    };

    mediaRecorder.start(500);
    setIsRecording(true);
    setStatus('recording');
  };

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setIsRecording(false);
    setStatus('idle');
  }, []);

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const statusColors: Record<string, string> = {
    idle: '',
    connecting: 'connecting',
    ready: 'ready',
    recording: 'recording',
    error: 'error'
  };

  return (
    <div className="voice-button-container">
      <button 
        className={`voice-button ${statusColors[status]} ${error ? 'error' : ''}`}
        onClick={toggleRecording}
        disabled={isProcessing || status === 'connecting'}
      >
        <span className="mic-icon">
          {status === 'recording' ? (
            <svg viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          ) : status === 'connecting' ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="spin">
              <circle cx="12" cy="12" r="10" strokeDasharray="60" strokeDashoffset="20" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="23"/>
              <line x1="8" y1="23" x2="16" y2="23"/>
            </svg>
          )}
        </span>
      </button>
      
      <div className="status-info">
        {status === 'idle' && <span className="status-label">Click to start</span>}
        {status === 'connecting' && <span className="status-label">Connecting...</span>}
        {status === 'ready' && <span className="status-label">Ready</span>}
        {status === 'recording' && <span className="status-label recording-label">Listening...</span>}
        {status === 'error' && <span className="error-label">{error || 'Error'}</span>}
      </div>
    </div>
  );
}
