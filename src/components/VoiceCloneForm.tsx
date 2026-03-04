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
      setError('Neural capture failed: Micro-op permission denied.');
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
      setError('Identity required: Specify neural subject');
      return;
    }

    if (!audioFile) {
      setError('Source missing: Neural sample required');
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
      setError(err instanceof Error ? err.message : 'Cloning failed: Neural rejection');
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
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-2">
        <label htmlFor="voice-name" className="text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest pl-1">
          Neural_Identity_Label
        </label>
        <input
          id="voice-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Protocol_X"
          disabled={loading}
          className="w-full bg-surface/50 border border-border rounded-xl px-5 py-3.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all text-text-primary placeholder:text-text-secondary/30 font-mono shadow-sm"
        />
      </div>

      <div className="flex flex-col gap-3">
        <label className="text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest pl-1">Acoustic_Vector_Input</label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {recording ? (
            <button
              type="button"
              className="w-full py-3.5 px-4 rounded-xl font-bold font-mono text-[10px] uppercase tracking-widest bg-error text-white shadow-lg shadow-error/20 transition-all flex items-center justify-center gap-3 cursor-pointer"
              onClick={stopRecording}
            >
              <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
              Cease Recording
            </button>
          ) : (
            <button
              type="button"
              className="w-full py-3.5 px-4 rounded-xl font-bold font-mono text-[10px] uppercase tracking-widest bg-primary text-white shadow-neon hover:bg-primary/90 transition-all flex items-center justify-center gap-3 cursor-pointer"
              onClick={startRecording}
            >
              🎤 Capture Sample
            </button>
          )}

          <label className="w-full py-3.5 px-4 rounded-xl font-bold font-mono text-[10px] uppercase tracking-widest bg-surface/50 text-text-secondary border border-border hover:bg-surface hover:text-text-primary hover:border-text-secondary/30 transition-all flex items-center justify-center gap-3 cursor-pointer shadow-sm">
            📁 Inject Stream
            <input
              type="file"
              accept="audio/*"
              onChange={handleFileChange}
              disabled={loading}
              className="hidden"
            />
          </label>
        </div>

        {audioUrl && (
          <div className="mt-2 p-5 bg-primary/5 border border-primary/20 rounded-xl space-y-4 animate-in fade-in zoom-in-95 duration-500">
            <audio src={audioUrl} controls className="w-full h-8 opacity-70 contrast-125 saturate-50" />
            <div className="flex items-center gap-3 text-[10px] font-mono text-primary font-bold uppercase tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
              {audioFile?.name || 'Vocal_Source_Ready'}
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-error/10 border border-error/20 text-error p-4 rounded-xl text-[10px] font-mono font-bold uppercase tracking-tight flex items-center gap-3">
          <span className="w-1.5 h-1.5 rounded-full bg-error animate-ping shrink-0"></span>
          {error}
        </div>
      )}

      <div className="flex items-center gap-4 pt-4 border-t border-border mt-2">
        <button
          type="button"
          className="flex-1 py-3.5 px-4 rounded-xl font-bold font-mono text-[10px] uppercase tracking-[0.2em] bg-surface/50 text-text-secondary border border-border hover:bg-surface hover:text-text-primary transition-all cursor-pointer"
          onClick={handleClear}
          disabled={loading}
        >
          Clear
        </button>
        <button
          type="submit"
          className="flex-1 py-3.5 px-4 rounded-xl font-bold font-mono text-[10px] uppercase tracking-[0.2em] bg-accent text-white shadow-lg shadow-accent/20 hover:bg-accent/90 transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          disabled={loading || !name || !audioFile}
        >
          {loading ? 'Synthesizing...' : 'Initialize Clone'}
        </button>
      </div>
    </form>
  );
}
