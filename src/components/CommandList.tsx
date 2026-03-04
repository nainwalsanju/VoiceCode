import { useState, useEffect } from 'react';
import type { VoiceCommand } from '../types/voiceCommand';
import { commandsApi } from '../api/commands';

interface CommandListProps {
  onSelect?: (command: VoiceCommand) => void;
  selectedId?: string;
  onRefresh?: () => void;
}

export function CommandList({ onSelect, selectedId, onRefresh }: CommandListProps) {
  const [commands, setCommands] = useState<VoiceCommand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCommands = async () => {
    try {
      setLoading(true);
      const data = await commandsApi.list();
      setCommands(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load commands');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCommands();
  }, []);

  const handleToggle = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await commandsApi.toggle(id);
      await loadCommands();
      onRefresh?.();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to toggle command');
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this command?')) return;

    try {
      await commandsApi.delete(id);
      await loadCommands();
      onRefresh?.();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete command');
    }
  };

  const getActionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      insert_text: 'Insert Text',
      run_command: 'Run Command',
      hotkey: 'Hotkey',
      snippet: 'Snippet',
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></div>
        <span className="ml-3 text-text-secondary">Loading commands...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-error/20 border border-error rounded-lg p-4">
        <p className="text-error text-sm mb-3">{error}</p>
        <button
          onClick={loadCommands}
          className="px-4 py-2 bg-error text-white rounded-lg hover:opacity-90 transition-opacity"
        >
          Retry
        </button>
      </div>
    );
  }

  if (commands.length === 0) {
    return (
      <div className="text-center py-12 text-text-secondary">
        <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
        <p>No voice commands yet. Create one to get started!</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {commands.map((command) => (
        <div
          key={command.id}
          className={`flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-xl border transition-all duration-300 group cursor-pointer ${selectedId === command.id
              ? 'bg-primary/10 border-primary/50 shadow-neon'
              : 'bg-surface/60 border-border hover:border-text-secondary/30 hover:bg-surface/80'
            } ${!command.is_active ? 'opacity-60 saturate-50' : ''}`}
          onClick={() => onSelect?.(command)}
        >
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <span className="text-text-primary font-mono font-bold text-sm tracking-wider">{command.trigger}</span>
              <span className="text-[9px] font-mono text-text-secondary uppercase px-2 py-0.5 rounded-md bg-background border border-border/80">
                {getActionTypeLabel(command.action_type)}
              </span>
              {command.is_regex && (
                <span className="text-[9px] font-mono font-bold text-secondary uppercase px-2 py-0.5 rounded-md bg-secondary/10 border border-secondary/20">
                  Regex
                </span>
              )}
            </div>
            {command.description && <span className="text-[11px] font-mono text-text-secondary/60">{command.description}</span>}
          </div>
          <div className="flex items-center gap-3 mt-4 sm:mt-0">
            <button
              className={`px-4 py-2 rounded-lg text-[10px] font-mono font-bold uppercase tracking-widest transition-all cursor-pointer border ${command.is_active
                ? 'bg-accent/10 text-accent border-accent/20 hover:bg-accent/20'
                : 'bg-surface text-text-secondary border-border hover:bg-surface/80'
                }`}
              onClick={(e) => handleToggle(command.id, e)}
              title={command.is_active ? 'Disable command' : 'Enable command'}
            >
              {command.is_active ? 'Active' : 'Inactive'}
            </button>
            <button
              className="px-4 py-2 rounded-lg text-[10px] font-mono font-bold uppercase tracking-widest bg-error/10 text-error border border-error/20 hover:bg-error/20 transition-all cursor-pointer"
              onClick={(e) => handleDelete(command.id, e)}
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
