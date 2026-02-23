import { useState, useRef, useCallback } from 'react';

export type RecordingState = 'idle' | 'recording' | 'processing';

export interface AudioCaptureOptions {
  onDataAvailable?: (audioBlob: Blob) => void;
  onError?: (error: Error) => void;
}

export function useAudioCapture(options: AudioCaptureOptions = {}) {
  const [state, setState] = useState<RecordingState>('idle');
  const [error, setError] = useState<Error | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

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

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (options.onDataAvailable) {
          options.onDataAvailable(audioBlob);
        }
      };

      mediaRecorder.onerror = () => {
        const err = new Error('MediaRecorder error');
        setError(err);
        if (options.onError) {
          options.onError(err);
        }
      };

      mediaRecorder.start(100);
      setState('recording');
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to start recording');
      setError(error);
      if (options.onError) {
        options.onError(error);
      }
    }
  }, [options]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    setState('idle');
  }, []);

  const isRecording = state === 'recording';

  return {
    state,
    error,
    isRecording,
    startRecording,
    stopRecording,
  };
}
