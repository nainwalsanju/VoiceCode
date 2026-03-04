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
    if (!confirm('Are you sure you want to deauthorize this neural profile?')) return;

    try {
      await voiceProfilesApi.delete(id);
      await loadProfiles();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Datalink failure: Could not delete');
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await voiceProfilesApi.update(id, { is_default: true });
      await loadProfiles();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Datalink failure: Could not update');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full shadow-neon"></div>
        <span className="text-xs font-mono font-bold tracking-widest text-text-secondary uppercase animate-pulse">Scanning Neural Banks...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-error/10 border border-error/20 rounded-xl p-6 transition-all animate-in fade-in duration-500">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-2 h-2 rounded-full bg-error animate-ping"></div>
          <p className="text-error font-mono text-xs font-bold uppercase tracking-tight">System Error: {error}</p>
        </div>
        <button
          onClick={loadProfiles}
          className="w-full py-2.5 bg-error/20 text-error hover:bg-error/30 border border-error/30 rounded-xl font-mono text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
        >
          Re-establish Link
        </button>
      </div>
    );
  }

  if (profiles.length === 0) {
    return (
      <div className="text-center py-12 text-text-secondary animate-in fade-in duration-700">
        <svg className="w-12 h-12 mx-auto mb-4 opacity-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
        <p className="text-sm font-mono opacity-80 text-text-secondary uppercase tracking-wider">No Active Neural Profiles</p>
        <p className="text-xs mt-2 opacity-60 font-mono">Initialization required</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {profiles.map((profile) => (
        <div
          key={profile.id}
          onClick={() => onSelect?.(profile)}
          className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border transition-all duration-300 group cursor-pointer
            ${selectedId === profile.id
              ? 'bg-primary/10 border-primary/50 shadow-neon'
              : 'bg-surface/30 border-border hover:border-text-secondary/30 hover:bg-surface/50'}
          `}
        >
          <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300
              ${profile.is_default ? 'bg-accent/20 text-accent' : 'bg-surface border border-border text-text-secondary group-hover:text-text-primary'}
            `}>
              <span className="font-mono font-bold text-xs uppercase">{profile.name.substring(0, 2)}</span>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-text-primary tracking-tight group-hover:text-primary transition-colors">{profile.name}</span>
              {profile.is_default && (
                <span className="text-[10px] font-mono font-bold text-accent uppercase tracking-widest mt-0.5">Primary_Link</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 mt-4 sm:mt-0 opacity-0 group-hover:opacity-100 transition-opacity">
            {!profile.is_default && (
              <button
                className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider bg-primary/10 text-primary hover:bg-primary/20 transition-all cursor-pointer border border-primary/20"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSetDefault(profile.id);
                }}
              >
                Sync
              </button>
            )}
            <button
              className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider bg-error/10 text-error/70 hover:text-error hover:bg-error/20 transition-all cursor-pointer border border-error/20"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(profile.id);
              }}
            >
              Purge
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
