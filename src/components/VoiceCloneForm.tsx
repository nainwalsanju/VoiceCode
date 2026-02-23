import { useState, useRef } from 'react';
import { voiceProfilesApi } from '../api/voiceProfiles';

interface VoiceCloneFormProps {
  onSuccess?: () => void;
}

export function VoiceCloneForm({ onSuccess }: VoiceCloneFormProps) {
  const [name, setName] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        
        // Convert to File
        const file = new File([blob], 'recording.wav', { type: 'audio/wav' });
        setAudioFile(file);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setRecording(true);
      setError(null);
    } catch (err) {
      setError('Failed to start recording. Please check microphone permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAudioFile(file);
      setAudioUrl(URL.createObjectURL(file));
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('Please enter a name for this voice profile');
      return;
    }
    
    if (!audioFile) {
      setError('Please record or upload an audio sample');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await voiceProfilesApi.clone(name, audioFile);
      setName('');
      setAudioFile(null);
      setAudioUrl(null);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clone voice');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setName('');
    setAudioFile(null);
    setAudioUrl(null);
    setError(null);
  };

  return (
    <form className="voice-clone-form" onSubmit={handleSubmit}>
      <h3>Clone Your Voice</h3>
      
      <div className="form-group">
        <label htmlFor="voice-name">Voice Name</label>
        <input
          id="voice-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter a name for this voice"
          disabled={loading}
        />
      </div>

      <div className="form-group">
        <label>Audio Sample</label>
        
        <div className="recorder-controls">
          {recording ? (
            <button type="button" className="btn-record stop" onClick={stopRecording}>
              ⏹ Stop Recording
            </button>
          ) : (
            <button type="button" className="btn-record start" onClick={startRecording}>
              🎤 Record Audio
            </button>
          )}
          
          <span className="or-divider">or</span>
          
          <label className="btn-upload">
            📁 Upload File
            <input
              type="file"
              accept="audio/*"
              onChange={handleFileChange}
              disabled={loading}
              style={{ display: 'none' }}
            />
          </label>
        </div>

        {audioUrl && (
          <div className="audio-preview">
            <audio src={audioUrl} controls />
            <p className="file-info">
              {audioFile?.name || 'Recording ready'}
            </p>
          </div>
        )}
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className="form-actions">
        <button type="button" className="btn-clear" onClick={handleClear} disabled={loading}>
          Clear
        </button>
        <button type="submit" className="btn-submit" disabled={loading || !name || !audioFile}>
          {loading ? 'Cloning...' : 'Clone Voice'}
        </button>
      </div>
    </form>
  );
}
