import { useEffect, useRef } from 'react';
import { useVoiceStore } from '../stores/voiceStore';

interface VoicePreviewProps {
  voiceId: string;
  voiceType: 'edge' | 'cloned';
  sampleAudioUrl?: string; // For cloned voices, use their source audio
}

const PREVIEW_PHRASE = "Hello, this is a voice preview.";

export function VoicePreview({ voiceId, voiceType, sampleAudioUrl }: VoicePreviewProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previewingVoiceId = useVoiceStore((state) => state.previewingVoiceId);
  const startPreview = useVoiceStore((state) => state.startPreview);
  const stopPreview = useVoiceStore((state) => state.stopPreview);

  const isPlaying = previewingVoiceId === voiceId;

  useEffect(() => {
    // Stop this preview if another one started
    if (!isPlaying && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [isPlaying]);

  const handlePreview = async () => {
    // Stop any currently playing preview
    if (previewingVoiceId && previewingVoiceId !== voiceId) {
      stopPreview();
    }

    if (isPlaying) {
      // Stop this preview
      if (audioRef.current) {
        audioRef.current.pause();
      }
      stopPreview();
    } else {
      // Start this preview
      startPreview(voiceId);

      if (!audioRef.current) {
        audioRef.current = new Audio();

        audioRef.current.onended = () => {
          stopPreview();
        };

        audioRef.current.onerror = () => {
          console.error('Preview failed for voice:', voiceId);
          stopPreview();
        };
      }

      // For cloned voices, use the uploaded sample
      // For built-in voices, use backend preview endpoint
      const previewUrl = voiceType === 'cloned' && sampleAudioUrl
        ? sampleAudioUrl
        : `http://localhost:8000/voice/preview/${voiceId}?text=${encodeURIComponent(PREVIEW_PHRASE)}`;

      audioRef.current.src = previewUrl;
      audioRef.current.play().catch(console.error);
    }
  };

  return (
    <button
      onClick={handlePreview}
      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
        isPlaying
          ? 'bg-accent text-white shadow-[0_0_10px_rgba(16,185,129,0.5)]'
          : 'bg-surface/50 text-text-secondary hover:bg-surface hover:text-text-primary border border-border'
      }`}
      title={isPlaying ? 'Stop preview' : 'Preview voice'}
    >
      {isPlaying ? (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <rect x="6" y="6" width="12" height="12" rx="1" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 5v14l11-7z" />
        </svg>
      )}
    </button>
  );
}
