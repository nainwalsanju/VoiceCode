import { useState, useEffect } from 'react';
import type { VoiceCommand, VoiceCommandCreate, ActionType } from '../types/voiceCommand';
import { commandsApi } from '../api/commands';

interface CommandFormProps {
  command?: VoiceCommand | null;
  onSave?: (command: VoiceCommand) => void;
  onCancel?: () => void;
}

const ACTION_TYPES: { value: ActionType; label: string }[] = [
  { value: 'insert_text', label: 'Insert Text' },
  { value: 'run_command', label: 'Run Command' },
  { value: 'hotkey', label: 'Hotkey' },
  { value: 'snippet', label: 'Snippet' },
];

export function CommandForm({ command, onSave, onCancel }: CommandFormProps) {
  const [trigger, setTrigger] = useState('');
  const [actionType, setActionType] = useState<ActionType>('insert_text');
  const [actionData, setActionData] = useState('');
  const [description, setDescription] = useState('');
  const [isRegex, setIsRegex] = useState(false);
  const [priority, setPriority] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (command) {
      setTrigger(command.trigger);
      setActionType(command.action_type);
      setActionData(JSON.stringify(command.action_data, null, 2));
      setDescription(command.description);
      setIsRegex(command.is_regex);
      setPriority(command.priority);
      setIsActive(command.is_active);
    } else {
      setTrigger('');
      setActionType('insert_text');
      setActionData('{\n  "text": ""\n}');
      setDescription('');
      setIsRegex(false);
      setPriority(0);
      setIsActive(true);
    }
  }, [command]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      let parsedActionData: Record<string, unknown>;
      try {
        parsedActionData = JSON.parse(actionData);
      } catch {
        setError('Invalid JSON in action data');
        setSaving(false);
        return;
      }

      const data: VoiceCommandCreate = {
        trigger,
        action_type: actionType,
        action_data: parsedActionData,
        description,
        is_regex: isRegex,
        priority,
        is_active: isActive,
      };

      let savedCommand: VoiceCommand;
      if (command) {
        savedCommand = await commandsApi.update(command.id, data);
      } else {
        savedCommand = await commandsApi.create(data);
      }

      onSave?.(savedCommand);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save command');
    } finally {
      setSaving(false);
    }
  };

  const getActionDataPlaceholder = () => {
    const placeholders: Record<ActionType, string> = {
      insert_text: '{\n  "text": "Hello, world!"\n}',
      run_command: '{\n  "command": "echo hello",\n  "shell": true,\n  "timeout": 30\n}',
      hotkey: '{\n  "keys": ["command", "v"],\n  "modifiers": ["command"]\n}',
      snippet: '{\n  "template": "function {{name}}() {\\n  {{body}}\\n}",\n  "variables": {\n    "name": "myFunction",\n    "body": "console.log()"\n  }\n}',
    };
    return placeholders[actionType];
  };

  return (
    <form className="command-form" onSubmit={handleSubmit}>
      <h3>{command ? 'Edit Command' : 'Create Command'}</h3>

      {error && <div className="form-error">{error}</div>}

      <div className="form-group">
        <label htmlFor="trigger">Trigger Phrase</label>
        <input
          id="trigger"
          type="text"
          value={trigger}
          onChange={(e) => setTrigger(e.target.value)}
          placeholder="e.g., insert signature"
          required
        />
        <small>The phrase that activates this command</small>
      </div>

      <div className="form-group">
        <label htmlFor="description">Description</label>
        <input
          id="description"
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What this command does"
        />
      </div>

      <div className="form-group">
        <label htmlFor="actionType">Action Type</label>
        <select
          id="actionType"
          value={actionType}
          onChange={(e) => {
            setActionType(e.target.value as ActionType);
            setActionData(getActionDataPlaceholder());
          }}
        >
          {ACTION_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="actionData">Action Data (JSON)</label>
        <textarea
          id="actionData"
          value={actionData}
          onChange={(e) => setActionData(e.target.value)}
          placeholder={getActionDataPlaceholder()}
          rows={6}
          required
        />
        <small>JSON configuration for the action</small>
      </div>

      <div className="form-row">
        <div className="form-group checkbox">
          <label>
            <input
              type="checkbox"
              checked={isRegex}
              onChange={(e) => setIsRegex(e.target.checked)}
            />
            Regular Expression
          </label>
        </div>

        <div className="form-group">
          <label htmlFor="priority">Priority</label>
          <input
            id="priority"
            type="number"
            value={priority}
            onChange={(e) => setPriority(parseInt(e.target.value) || 0)}
            min={0}
            max={100}
          />
          <small>Higher priority commands match first</small>
        </div>
      </div>

      <div className="form-group checkbox">
        <label>
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          Active
        </label>
      </div>

      <div className="form-actions">
        <button type="submit" disabled={saving}>
          {saving ? 'Saving...' : command ? 'Update Command' : 'Create Command'}
        </button>
        {onCancel && (
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
