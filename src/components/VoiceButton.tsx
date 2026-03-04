import { useState, useEffect, useRef, useCallback } from 'react';
import { useSessionStore, SessionState } from '../stores/sessionStore';
import { useTranscriptStore } from '../stores/transcriptStore';
import { registerGlobalHotkey, unregisterGlobalHotkey } from '../hooks/useGlobalHotkey';
import { getSettings } from '../api/settings';
import { useBargeIn } from '../hooks/useBargeIn';

interface VoiceButtonProps {
  onTranscript?: (text: string) => void;
  isProcessing?: boolean;
}

export function VoiceButton({ onTranscript, isProcessing = false }: VoiceButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wsSessionState, setWsSessionState] = useState<SessionState>('IDLE');
  const [isConnecting, setIsConnecting] = useState(false);
  const [hotkeyActivated, setHotkeyActivated] = useState(false);

  // Use session store for state management
  const {
    currentState,
    setState,
    startListening,
    startProcessing,
    startSpeaking,
    endSpeaking,
    interruptSpeaking,
    isContinuousMode
  } = useSessionStore();

  // Add messages to transcript store
  const addMessage = useTranscriptStore((state) => state.addMessage);

  // Derive display status from session store and WebSocket state
  // Priority: error > connecting > recording > wsSessionState > currentState
  const status: 'idle' | 'connecting' | 'listening' | 'speaking' | 'error' =
    error ? 'error' :
      isConnecting ? 'connecting' :
        isRecording ? 'listening' :
          wsSessionState === 'PROCESSING' ? 'listening' : // Show as listening during processing for UX
            wsSessionState === 'SPEAKING' ? 'speaking' :
              currentState === 'SPEAKING' ? 'speaking' :
                currentState === 'LISTENING' || currentState === 'PROCESSING' ? 'listening' :
                  'idle';

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

  // Handle WebSocket state messages from backend
  const handleStateMessage = useCallback((state: SessionState) => {
    setWsSessionState(state);
    if (state === 'LISTENING') {
      startListening();
    } else if (state === 'PROCESSING') {
      startProcessing();
    } else if (state === 'SPEAKING') {
      startSpeaking();
    } else if (state === 'IDLE') {
      endSpeaking();
    }
  }, [startListening, startProcessing, startSpeaking, endSpeaking]);

  const startInteraction = useCallback(async () => {
    try {
      setError(null);
      setIsConnecting(true);
      initAudioContext();
      nextPlayTimeRef.current = 0;

      // Connect to session store
      startListening();

      // 1: Connect WebSocket to unified Agent Stream
      const ws = new WebSocket('ws://localhost:8000/agent/stream');

      ws.onopen = () => {
        wsRef.current = ws;
        setIsConnecting(false);
      };

      ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'ready') {
            startMediaRecording(ws);
          } else if (data.type === 'transcription' && data.text) {
            const text = data.text.trim();
            if (onTranscript) onTranscript(text);
            // Add to transcript store
            addMessage('user', text);
          } else if (data.type === 'state' && data.state) {
            // Handle state messages from backend
            const stateMap: Record<string, SessionState> = {
              'listening': 'LISTENING',
              'processing': 'PROCESSING',
              'speaking': 'SPEAKING',
              'idle': 'IDLE'
            };
            const sessionState = stateMap[data.state];
            if (sessionState) {
              handleStateMessage(sessionState);
            }
          } else if (data.type === 'tts_start') {
            setWsSessionState('SPEAKING');
            startSpeaking();
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
            setWsSessionState('IDLE');
            endSpeaking();
          } else if (data.type === 'llm_start') {
            // LLM started processing - show as processing
            startProcessing();
          } else if (data.type === 'llm_end') {
            // LLM finished - ready for TTS
          } else if (data.type === 'sentence_start' && data.text) {
            // Add assistant message to transcript
            addMessage('assistant', data.text, data.agent);
          }
        } catch (e) {
          console.error('WS Parse error:', e);
        }
      };

      ws.onerror = (err) => {
        console.error('Agent WS error:', err);
        setError('Connection error');
        setWsSessionState('IDLE');
        setState('IDLE');
      };

      ws.onclose = () => {
        wsRef.current = null;
        setWsSessionState('IDLE');
        if (isRecording) stopInteraction();
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start');
      setWsSessionState('IDLE');
      setState('IDLE');
    }
  }, [onTranscript, addMessage, handleStateMessage, startListening, startProcessing, startSpeaking, endSpeaking, setState, isRecording]);

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
      startListening();
    } catch (err) {
      setError('Mic access denied');
      setWsSessionState('IDLE');
      setState('IDLE');
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
    setIsConnecting(true); // Show spinner while Agent processes

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
    setWsSessionState('IDLE');
    setIsConnecting(false);
  }, []);

  const stopInteraction = useCallback(() => {
    finishListening();
    closeConnection();
    setState('IDLE');
  }, [finishListening, closeConnection, setState]);

  const toggleRecording = () => isRecording ? finishListening() : startInteraction();

  useEffect(() => {
    return () => {
      stopInteraction();
    };
  }, [stopInteraction]);

  // Register global hotkey on mount
  useEffect(() => {
    let cleanup: (() => void) | null = null;

    const setupHotkey = async () => {
      try {
        const settings = await getSettings();
        const hotkey = settings.hotkey || 'Ctrl+Shift+V';

        const handleHotkeyActivation = () => {
          setHotkeyActivated(true);
          setTimeout(() => setHotkeyActivated(false), 500);

          const currentState = useSessionStore.getState().currentState;

          if (currentState === 'IDLE') {
            startInteraction();
          } else {
            stopInteraction();
          }
        };

        await registerGlobalHotkey(hotkey, handleHotkeyActivation);

        cleanup = () => {
          unregisterGlobalHotkey(hotkey);
        };
      } catch (error) {
        console.error('Failed to setup hotkey:', error);
      }
    };

    setupHotkey().catch(console.error);

    return () => {
      cleanup?.();
    };
  }, [startInteraction, stopInteraction]);

  // Barge-in handler - interrupts TTS when user speaks during playback
  const handleBargeIn = useCallback(() => {
    // 1. Suspend audio immediately
    if (audioContextRef.current) {
      audioContextRef.current.suspend();
    }

    // 2. Send cancel to backend
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'cancel_tts' }));
    }

    // 3. Update state
    interruptSpeaking();

    // 4. Reset nextPlayTimeRef to prevent audio glitches on next playback
    nextPlayTimeRef.current = 0;
  }, [interruptSpeaking]);

  // Enable barge-in detection only when SPEAKING
  useBargeIn({
    enabled: wsSessionState === 'SPEAKING',
    onBargeIn: handleBargeIn,
    threshold: 0.3, // Lower threshold for faster response
    debounceMs: 50, // Quick debounce for interruption
  });

  // Get state label based on current state
  const getStateLabel = () => {
    if (error) return error || 'Core Failure';
    if (isConnecting) return 'Establishing Link...';
    if (isRecording) return 'Capturing Neural Input';
    if (wsSessionState === 'PROCESSING' || currentState === 'PROCESSING') return 'Processing...';
    if (wsSessionState === 'SPEAKING' || currentState === 'SPEAKING') return 'Synthesizing Response';
    return 'System Ready / Idle';
  };

  // Get CSS class for state label
  const getStateLabelClass = () => {
    if (error) return 'text-error font-bold';
    if (isConnecting || isRecording || wsSessionState === 'PROCESSING') return 'text-secondary animate-pulse';
    if (wsSessionState === 'SPEAKING' || currentState === 'SPEAKING') return 'text-accent animate-pulse';
    return 'text-text-secondary opacity-60';
  };

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="relative group">
        {/* Outer Glow Layer */}
        <div className={`absolute -inset-4 rounded-full blur-2xl transition-opacity duration-1000 ${status === 'listening' ? 'bg-secondary/30 opacity-100' :
          status === 'speaking' ? 'bg-accent/20 opacity-100' : 'opacity-0'
          }`}></div>

        <button
          className={`relative w-32 h-32 rounded-full flex items-center justify-center transition-all duration-700 cursor-pointer isolation-auto z-10 
            ${status === 'listening' ? 'bg-secondary ring-4 ring-secondary/30 shadow-[0_0_50px_rgba(139,92,246,0.6)] scale-110' :
              status === 'speaking' ? 'bg-accent shadow-[0_0_40px_rgba(16,185,129,0.5)] animate-pulse' :
                status === 'error' ? 'bg-error shadow-[0_0_30px_rgba(239,68,68,0.5)]' :
                  'bg-surface border-2 border-border hover:border-primary/50 hover:shadow-neon'}
            ${isProcessing || status === 'connecting' ? 'opacity-50 cursor-wait' : ''}
            ${hotkeyActivated ? 'ring-4 ring-primary/50 scale-110' : ''}
          `}
          onClick={toggleRecording}
          disabled={isProcessing || status === 'connecting'}
        >
          {/* Hotkey activation flash */}
          {hotkeyActivated && (
            <div className="absolute inset-0 rounded-full bg-primary/30 animate-ping" />
          )}

          {/* Animated Spectral Rings for Listening */}
          {status === 'listening' && (
            <div className="absolute inset-0 z-0">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="absolute inset-0 rounded-full border-2 border-secondary/30 animate-ping"
                  style={{ animationDelay: `${i * 400}ms`, animationDuration: '2s' }}
                ></div>
              ))}
            </div>
          )}

          {/* Core Icon */}
          <span className={`relative z-10 transition-all duration-500 group-hover:scale-110 ${status === 'listening' ? 'text-white' : 'text-text-primary'}`}>
            {status === 'speaking' ? (
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12 drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">
                <path d="M11 5L6 9H2v6h4l5 4V5z" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            ) : status === 'listening' ? (
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12">
                <rect x="7" y="7" width="10" height="10" rx="1.5" />
              </svg>
            ) : status === 'connecting' ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-12 h-12 animate-spin opacity-50">
                <circle cx="12" cy="12" r="10" strokeDasharray="60" strokeDashoffset="20" strokeLinecap="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-12 h-12">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            )}
          </span>
        </button>

        {/* Visualizer Bars (Overlay when listening) */}
        {status === 'listening' && (
          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex items-end gap-1 h-8 z-20">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="w-1 bg-white/80 rounded-full animate-pulse"
                style={{
                  height: `${20 + Math.random() * 80}%`,
                  animationDelay: `${i * 100}ms`,
                  animationDuration: `${0.5 + Math.random()}s`
                }}
              ></div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col items-center">
        <span className={`text-sm font-mono tracking-widest uppercase ${getStateLabelClass()}`}>
          {getStateLabel()}
        </span>

        {/* Continuous mode indicator */}
        {isContinuousMode && status !== 'idle' && !error && (
          <span className="text-xs text-text-secondary mt-1 opacity-50">
            Continuous Mode Active
          </span>
        )}
      </div>
    </div>
  );
}
