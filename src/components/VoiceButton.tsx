import { useState, useEffect, useRef, useCallback } from 'react';
import './VoiceButton.css';

interface VoiceButtonProps {
  onTranscript?: (text: string) => void;
  isProcessing?: boolean;
}

export function VoiceButton({ onTranscript, isProcessing = false }: VoiceButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [websocket, setWebsocket] = useState<WebSocket | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const processingRef = useRef(false);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      audioChunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        }
      });
      
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          
          if (websocket && websocket.readyState === WebSocket.OPEN) {
            const arrayBuffer = await event.data.arrayBuffer();
            const base64 = btoa(
              new Uint8Array(arrayBuffer)
                .reduce((data, byte) => data + String.fromCharCode(byte), '')
            );
            
            websocket.send(JSON.stringify({
              type: 'audio',
              data: base64
            }));
          }
        }
      };

      mediaRecorder.start(500);
      setIsRecording(true);

      const ws = new WebSocket('ws://localhost:8000/stt/stream');
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        setWebsocket(ws);
      };
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'transcription' && data.text) {
          setTranscript(prev => {
            const newText = prev + ' ' + data.text;
            if (onTranscript) {
              onTranscript(newText.trim());
            }
            return newText.trim();
          });
        }
      };
      
      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        setError('Connection error');
      };
      
      ws.onclose = () => {
        console.log('WebSocket closed');
        setWebsocket(null);
      };

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start recording';
      setError(errorMessage);
      console.error('Recording error:', err);
    }
  }, [websocket, onTranscript]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (websocket) {
      websocket.close();
      setWebsocket(null);
    }
    
    setIsRecording(false);
  }, [websocket]);

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
      if (websocket) {
        websocket.close();
      }
    };
  }, []);

  return (
    <div className="voice-button-container">
      <button 
        className={`voice-button ${isRecording ? 'recording' : ''} ${error ? 'error' : ''}`}
        onClick={toggleRecording}
        disabled={isProcessing}
      >
        <span className="mic-icon">
          {isRecording ? (
            <svg viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="2" />
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
      
      {isRecording && <span className="recording-label">Listening...</span>}
      {error && <span className="error-label">{error}</span>}
    </div>
  );
}
