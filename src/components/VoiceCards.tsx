import { useState, useCallback } from 'react';
import { useVoiceStore, Voice } from '../stores/voiceStore';

// Sample preview text for voice preview
const PREVIEW_TEXT = 'Hello! This is a sample of my voice.';

// Engine display names
const ENGINE_NAMES: Record<string, string> = {
  qwen3: 'Qwen3',
  'neutts-air': 'NeuTTS Air',
  'neutts-nano': 'NeuTTS Nano',
  pocket: 'Pocket',
  kokoro: 'Kokoro',
  edge: 'Edge',
};

// Engine colors
const ENGINE_COLORS: Record<string, string> = {
  qwen3: 'bg-primary/20 text-primary border-primary/30',
  'neutts-air': 'bg-accent/20 text-accent border-accent/30',
  'neutts-nano': 'bg-secondary/20 text-secondary border-secondary/30',
  pocket: 'bg-warning/20 text-warning border-warning/30',
  kokoro: 'bg-success/20 text-success border-success/30',
  edge: 'bg-error/20 text-error border-error/30',
};

interface VoiceCardsProps {
  onVoiceSelect?: (voiceId: string) => void;
}

export function VoiceCards({ onVoiceSelect }: VoiceCardsProps) {
  const { voices, selectedVoice, defaultVoice, setSelectedVoice, setDefaultVoice } = useVoiceStore();
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  // Select 4-6 voices for display (first voice from each engine)
  const displayVoices: Voice[] = [
    voices.find(v => v.id === 'qwen3-tts-0.6b')!,
    voices.find(v => v.id === 'neutts-air-en')!,
    voices.find(v => v.id === 'neutts-nano-en')!,
    voices.find(v => v.id === 'pocket-tts-en')!,
    voices.find(v => v.id === 'kokoro-en')!,
    voices.find(v => v.id === 'en-US-AriaNeural')!,
  ].filter(Boolean);

  const handlePreview = useCallback(async (voice: Voice) => {
    // Stop any existing preview
    if (audioElement) {
      audioElement.pause();
      setAudioElement(null);
    }

    if (previewingVoice === voice.id) {
      // Stop preview
      setPreviewingVoice(null);
      return;
    }

    setPreviewingVoice(voice.id);

    try {
      // Call TTS API to get preview audio
      const response = await fetch('/api/tts/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voice: voice.id, text: PREVIEW_TEXT }),
      });

      if (!response.ok) {
        console.error('Failed to get preview audio');
        setPreviewingVoice(null);
        return;
      }

      const data = await response.json();

      // Create audio element and play
      const audio = new Audio(`data:audio/wav;base64,${data.audio}`);
      audio.onended = () => {
        setPreviewingVoice(null);
        setAudioElement(null);
      };
      audio.onerror = () => {
        setPreviewingVoice(null);
        setAudioElement(null);
      };

      await audio.play();
      setAudioElement(audio);
    } catch (err) {
      console.error('Preview failed:', err);
      setPreviewingVoice(null);
    }
  }, [previewingVoice, audioElement]);

  const handleSelect = (voice: Voice) => {
    setSelectedVoice(voice.id);
    onVoiceSelect?.(voice.id);
  };

  const handleSetDefault = (voice: Voice, e: React.MouseEvent) => {
    e.stopPropagation();
    setDefaultVoice(voice.id);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-border/30 pb-4">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5 px-2">
            <div className="w-2.5 h-2.5 rounded-full bg-primary/40 shadow-[0_0_8px_rgba(99,102,241,0.3)]"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-accent/40 shadow-[0_0_8px_rgba(16,185,129,0.3)]"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-secondary/40 shadow-[0_0_8px_rgba(168,85,247,0.3)]"></div>
          </div>
          <h3 className="text-xs font-mono font-bold tracking-widest text-text-primary uppercase opacity-80">
            Voice_Selection_Matrix
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {displayVoices.map((voice) => {
          const isSelected = selectedVoice === voice.id;
          const isDefault = defaultVoice === voice.id;
          const isPreviewing = previewingVoice === voice.id;
          const engineColor = ENGINE_COLORS[voice.engine] || 'bg-text-secondary/20 text-text-secondary';

          return (
            <div
              key={voice.id}
              onClick={() => handleSelect(voice)}
              className={`
                relative p-4 rounded-xl border cursor-pointer transition-all duration-300
                ${isSelected
                  ? 'bg-primary/10 border-primary/50 shadow-[0_0_20px_rgba(99,102,241,0.2)]'
                  : 'bg-surface/60 border-border/80 hover:border-primary/30 hover:bg-surface/80'
                }
              `}
            >
              {/* Default indicator */}
              {isDefault && (
                <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-accent text-white text-[10px] font-bold uppercase tracking-wide rounded-full shadow-lg">
                  Default
                </div>
              )}

              {/* Voice name */}
              <h4 className="text-sm font-mono font-bold text-text-primary mb-2 truncate">
                {voice.name}
              </h4>

              {/* Engine badge */}
              <div className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${engineColor} mb-3`}>
                {ENGINE_NAMES[voice.engine] || voice.engine}
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-2">
                <button
                  onClick={(e) => handleSetDefault(voice, e)}
                  disabled={isDefault}
                  className={`
                    flex-1 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all
                    ${isDefault
                      ? 'bg-accent/20 text-accent cursor-default'
                      : 'bg-surface/50 text-text-secondary hover:bg-accent/20 hover:text-accent border border-border hover:border-accent/30'
                    }
                  `}
                >
                  {isDefault ? 'Default' : 'Set Default'}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePreview(voice);
                  }}
                  disabled={isPreviewing}
                  className={`
                    px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all
                    ${isPreviewing
                      ? 'bg-secondary/20 text-secondary animate-pulse'
                      : 'bg-surface/50 text-text-secondary hover:bg-secondary/20 hover:text-secondary border border-border hover:border-secondary/30'
                    }
                  `}
                >
                  {isPreviewing ? 'Playing...' : 'Preview'}
                </button>
              </div>

              {/* Selection indicator */}
              {isSelected && (
                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(99,102,241,0.5)]"></div>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected voice info */}
      {selectedVoice && (
        <div className="mt-4 p-3 bg-surface/40 border border-border/50 rounded-lg">
          <span className="text-[10px] font-mono text-text-secondary uppercase tracking-wider">
            Selected: </span>
          <span className="text-xs font-mono font-bold text-primary">
            {voices.find(v => v.id === selectedVoice)?.name || selectedVoice}
          </span>
        </div>
      )}
    </div>
  );
}
