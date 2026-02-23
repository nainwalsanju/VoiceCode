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
    <div className="command-list">
      {commands.map((command) => (
        <div
          key={command.id}
          className={`command-item ${selectedId === command.id ? 'selected' : ''} ${!command.is_active ? 'inactive' : ''}`}
          onClick={() => onSelect?.(command)}
        >
          <div className="command-info">
            <span className="command-trigger">{command.trigger}</span>
            <span className="command-type">{getActionTypeLabel(command.action_type)}</span>
            {command.is_regex && <span className="command-badge">Regex</span>}
            {command.description && <span className="command-description">{command.description}</span>}
          </div>
          <div className="command-actions">
            <button
              className={`btn-toggle ${command.is_active ? 'active' : ''}`}
              onClick={(e) => handleToggle(command.id, e)}
              title={command.is_active ? 'Disable command' : 'Enable command'}
            >
              {command.is_active ? 'Active' : 'Inactive'}
            </button>
            <button
              className="btn-delete"
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
