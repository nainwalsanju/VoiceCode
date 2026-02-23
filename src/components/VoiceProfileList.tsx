import { useState, useEffect } from 'react';
import type { VoiceProfile } from '../types/voiceProfile';
import { voiceProfilesApi } from '../api/voiceProfiles';

interface VoiceProfileListProps {
  onSelect?: (profile: VoiceProfile) => void;
  selectedId?: string;
}

export function VoiceProfileList({ onSelect, selectedId }: VoiceProfileListProps) {
  const [profiles, setProfiles] = useState<VoiceProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProfiles = async () => {
    try {
      setLoading(true);
      const data = await voiceProfilesApi.list();
      setProfiles(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profiles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfiles();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this voice profile?')) return;
    
    try {
      await voiceProfilesApi.delete(id);
      await loadProfiles();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete profile');
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await voiceProfilesApi.update(id, { is_default: true });
      await loadProfiles();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to set default');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></div>
        <span className="ml-3 text-text-secondary">Loading voice profiles...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-error/20 border border-error rounded-lg p-4">
        <p className="text-error text-sm mb-3">{error}</p>
        <button
          onClick={loadProfiles}
          className="px-4 py-2 bg-error text-white rounded-lg hover:opacity-90 transition-opacity"
        >
          Retry
        </button>
      </div>
    );
  }

  if (profiles.length === 0) {
    return (
      <div className="text-center py-12 text-text-secondary">
        <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
        <p>No voice profiles yet. Clone a voice to get started!</p>
      </div>
    );
  }

  return (
    <div className="voice-profile-list">
      {profiles.map((profile) => (
        <div
          key={profile.id}
          className={`voice-profile-item ${selectedId === profile.id ? 'selected' : ''} ${profile.is_default ? 'default' : ''}`}
          onClick={() => onSelect?.(profile)}
        >
          <div className="voice-profile-info">
            <span className="voice-profile-name">{profile.name}</span>
            {profile.is_default && <span className="voice-profile-badge">Default</span>}
          </div>
          <div className="voice-profile-actions">
            {!profile.is_default && (
              <button
                className="btn-set-default"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSetDefault(profile.id);
                }}
              >
                Set Default
              </button>
            )}
            <button
              className="btn-delete"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(profile.id);
              }}
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
