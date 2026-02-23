import { useState, useEffect } from 'react';
import { voiceProfilesApi } from '../api/voiceProfiles';

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
      console.error('Failed to load voices:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const voiceId = e.target.value;
    setSelectedVoice(voiceId);
    onVoiceChange?.(voiceId);
  };

  if (loading) {
    return <select disabled><option>Loading voices...</option></select>;
  }

  return (
    <select
      value={selectedVoice}
      onChange={handleChange}
      className="voice-selector"
    >
      <option value="">Select a voice</option>
      
      {voices.filter(v => v.type === 'cloned').map(voice => (
        <option key={voice.id} value={voice.id}>
          {voice.name} {voice.is_default ? '(Default)' : ''}
        </option>
      ))}
      
      {voices.length === 0 && (
        <option value="" disabled>No cloned voices yet</option>
      )}
    </select>
  );
}
