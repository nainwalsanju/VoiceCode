import { useState, useEffect } from 'react';
import { voiceProfilesApi } from '../api/voiceProfiles';
import { VoicePreview } from './VoicePreview';

interface Voice {
  id: string;
  name: string;
  type: 'edge' | 'cloned';
  is_default?: boolean;
}

interface VoiceSelectorProps {
  onVoiceChange?: (voiceId: string) => void;
  selectedVoiceId?: string;
}

export function VoiceSelector({ onVoiceChange, selectedVoiceId }: VoiceSelectorProps) {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVoice, setSelectedVoice] = useState<string>(selectedVoiceId || '');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    loadVoices();
  }, []);

  const loadVoices = async () => {
    try {
      setLoading(true);

      // Get cloned profiles
      const profiles = await voiceProfilesApi.list();

      // Build voice list
      const voiceList: Voice[] = [];

      // Add cloned voices
      for (const profile of profiles) {
        voiceList.push({
          id: profile.id,
          name: profile.name,
          type: 'cloned',
          is_default: profile.is_default,
        });
      }

      // Set default if available
      const defaultProfile = profiles.find(p => p.is_default);
      if (defaultProfile && !selectedVoice) {
        setSelectedVoice(defaultProfile.id);
        onVoiceChange?.(defaultProfile.id);
      }

      setVoices(voiceList);
    } catch (err) {
      console.error('Failed to load neural profiles:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="relative w-full sm:w-64 animate-pulse">
        <div className="h-10 bg-surface/50 border border-border rounded-xl w-full"></div>
      </div>
    );
  }

  const selectedVoiceData = voices.find(v => v.id === selectedVoice);

  return (
    <div className="relative w-full sm:w-64">
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-surface/50 backdrop-blur-md border border-border rounded-xl px-4 py-2.5 text-xs font-mono font-bold text-left focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all cursor-pointer shadow-sm hover:bg-surface/70 flex items-center justify-between"
      >
        <span className={selectedVoice ? 'text-text-primary' : 'text-text-secondary'}>
          {selectedVoiceData ? (
            <>
              {selectedVoiceData.type === 'cloned' && (
                <span className="text-[10px] font-bold bg-accent/20 text-accent px-2 py-0.5 rounded uppercase mr-2 tracking-wide">
                  CLONE
                </span>
              )}
              {selectedVoiceData.name.toUpperCase()}
              {selectedVoiceData.is_default && (
                <span className="text-text-secondary ml-2 opacity-50">[DEFAULT]</span>
              )}
            </>
          ) : (
            'SELECT_NEURAL_LINK'
          )}
        </span>
        <svg
          className={`w-4 h-4 text-text-secondary opacity-50 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute z-50 mt-2 w-full bg-background/95 backdrop-blur-md border border-border rounded-xl shadow-lg overflow-hidden">
          {/* Cloned voices section */}
          {voices.filter(v => v.type === 'cloned').length > 0 && (
            <>
              <div className="px-4 py-2 text-xs font-mono font-bold text-text-secondary uppercase tracking-wider bg-surface/30">
                Cloned Voices
              </div>
              {voices.filter(v => v.type === 'cloned').map(voice => (
                <div
                  key={voice.id}
                  className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-all ${selectedVoice === voice.id
                      ? 'bg-primary/20 text-primary'
                      : 'hover:bg-surface/70 text-text-primary'
                    }`}
                  onClick={() => {
                    setSelectedVoice(voice.id);
                    onVoiceChange?.(voice.id);
                    setIsOpen(false);
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold font-mono tracking-wide bg-accent/20 text-accent px-2 py-0.5 rounded uppercase">
                      CLONE
                    </span>
                    <span className="text-xs font-mono font-bold uppercase">
                      {voice.name}
                      {voice.is_default && (
                        <span className="text-text-secondary ml-2 opacity-50">[DEFAULT]</span>
                      )}
                    </span>
                  </div>
                  <VoicePreview
                    voiceId={voice.id}
                    voiceType={voice.type}
                  />
                </div>
              ))}
            </>
          )}

          {/* No voices message */}
          {voices.length === 0 && (
            <div className="px-4 py-3 text-xs font-mono text-text-secondary">
              NO_PROFILES_DETECTED
            </div>
          )}
        </div>
      )}

      {/* Link status indicator */}
      <div
        className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-background shadow-sm transition-colors duration-500 ${selectedVoice ? 'bg-accent animate-pulse' : 'bg-text-secondary/30'
          }`}
      />
    </div>
  );
}
