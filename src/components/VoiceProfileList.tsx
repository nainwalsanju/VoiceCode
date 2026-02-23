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
    return <div className="voice-profile-list-loading">Loading voice profiles...</div>;
  }

  if (error) {
    return (
      <div className="voice-profile-list-error">
        <p>Error: {error}</p>
        <button onClick={loadProfiles}>Retry</button>
      </div>
    );
  }

  if (profiles.length === 0) {
    return (
      <div className="voice-profile-list-empty">
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
