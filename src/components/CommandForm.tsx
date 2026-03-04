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
        setError('Syntax Error: Invalid JSON detected in action_data');
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
      setError(err instanceof Error ? err.message : 'Uplink fail: Could not transmit command');
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
    <form className="space-y-6" onSubmit={handleSubmit}>
      {error && (
        <div className="bg-error/10 border border-error/20 text-error p-4 rounded-xl text-xs font-mono font-bold uppercase tracking-tight flex items-center gap-3 animate-in slide-in-from-top-2 duration-300">
          <span className="w-1.5 h-1.5 rounded-full bg-error animate-ping shrink-0"></span>
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex flex-col gap-2.5">
          <label htmlFor="trigger" className="text-xs font-mono font-bold text-text-secondary uppercase tracking-wider pl-1 opacity-80">
            Trigger_Pattern_Identity
          </label>
          <div className="relative group/input">
            <input
              id="trigger"
              type="text"
              value={trigger}
              onChange={(e) => setTrigger(e.target.value)}
              placeholder="e.g. initialize_systems"
              required
              className="w-full bg-background/80 border border-border/80 rounded-xl px-5 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all text-text-primary placeholder:text-text-secondary/40 font-mono shadow-sm group-hover/input:border-primary/40"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono text-primary opacity-0 group-focus-within/input:opacity-100 transition-opacity">_LISTEN</div>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <label htmlFor="actionType" className="text-xs font-mono font-bold text-text-secondary uppercase tracking-wider pl-1 opacity-80">
            Execution_Protocol_Type
          </label>
          <div className="relative group/input">
            <select
              id="actionType"
              value={actionType}
              onChange={(e) => {
                setActionType(e.target.value as ActionType);
                setActionData(getActionDataPlaceholder());
              }}
              className="w-full bg-background/80 border border-border/80 rounded-xl px-5 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all text-text-primary font-mono shadow-sm cursor-pointer appearance-none group-hover/input:border-primary/40"
            >
              {ACTION_TYPES.map((type) => (
                <option key={type.value} value={type.value} className="bg-slate-900 text-text-primary">
                  {type.label.toUpperCase().replace(' ', '_')}
                </option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40 group-focus-within/input:text-primary transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M19 9l-7 7-7-7" strokeWidth={2} /></svg>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="description" className="text-xs font-mono font-bold text-text-secondary uppercase tracking-wider pl-1 opacity-80">
          Protocol_Description
        </label>
        <input
          id="description"
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="// Optional metadata for this instruction"
          className="w-full bg-surface/80 border border-border rounded-xl px-5 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all text-text-primary placeholder:text-text-secondary/40 font-mono shadow-sm"
        />
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between px-1">
          <label htmlFor="actionData" className="text-xs font-mono font-bold text-text-secondary uppercase tracking-wider opacity-80">
            Internal_Payload_Logic
          </label>
          <span className="text-[10px] font-mono text-primary/60 font-bold uppercase tracking-tight">Enc: UTF-8 // Type: JSON</span>
        </div>
        <div className="relative">
          <textarea
            id="actionData"
            value={actionData}
            onChange={(e) => setActionData(e.target.value)}
            placeholder={getActionDataPlaceholder()}
            rows={8}
            required
            className="w-full bg-background/80 border border-border/80 rounded-xl px-6 py-5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary/50 transition-all text-text-primary placeholder:text-text-secondary/40 resize-none shadow-sm custom-scrollbar"
          />
          <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-background/20 to-transparent pointer-events-none"></div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <label className="flex items-center gap-3 p-4 rounded-xl bg-surface/60 border border-border hover:border-secondary/50 transition-all cursor-pointer shadow-sm group">
          <input
            type="checkbox"
            checked={isRegex}
            onChange={(e) => setIsRegex(e.target.checked)}
            className="w-4 h-4 rounded border-border bg-surface text-secondary focus:ring-secondary/50 focus:ring-offset-background"
          />
          <div className="flex flex-col gap-1">
            <span className="text-sm font-mono font-bold text-text-primary uppercase tracking-tight group-hover:text-secondary transition-colors">Regex</span>
            <span className="text-[10px] font-mono text-text-secondary uppercase opacity-70">Pattern_Match</span>
          </div>
        </label>

        <label className="flex items-center gap-3 p-4 rounded-xl bg-surface/60 border border-border hover:border-accent/50 transition-all cursor-pointer shadow-sm group">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="w-4 h-4 rounded border-border bg-surface text-accent focus:ring-accent/50 focus:ring-offset-background"
          />
          <div className="flex flex-col gap-1">
            <span className="text-sm font-mono font-bold text-text-primary uppercase tracking-tight group-hover:text-accent transition-colors">Active</span>
            <span className="text-[10px] font-mono text-text-secondary uppercase opacity-70">Status_Link</span>
          </div>
        </label>

        <div className="flex flex-col gap-1.5 p-3.5 rounded-xl bg-surface/60 border border-border shadow-sm">
          <label htmlFor="priority" className="text-xs font-mono font-bold text-text-secondary uppercase tracking-wider pl-1 opacity-80">
            Priority_Level
          </label>
          <input
            id="priority"
            type="number"
            value={priority}
            onChange={(e) => setPriority(parseInt(e.target.value) || 0)}
            min={0}
            max={100}
            className="bg-transparent border-none text-sm focus:outline-none font-mono text-text-primary p-0 h-6"
          />
        </div>
      </div>

      <div className="flex items-center gap-4 pt-6 border-t border-border mt-4">
        {onCancel && (
          <button
            type="button"
            className="flex-1 py-4 px-4 rounded-xl font-bold font-mono text-xs uppercase tracking-widest bg-surface/80 text-text-secondary border border-border hover:bg-surface hover:text-text-primary transition-all cursor-pointer shadow-sm"
            onClick={onCancel}
          >
            Abort
          </button>
        )}
        <button
          type="submit"
          disabled={saving}
          className="flex-1 py-4 px-4 rounded-xl font-bold font-mono text-xs uppercase tracking-widest bg-primary text-white shadow-neon hover:bg-primary/90 transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
        >
          {saving ? 'Transmitting...' : command ? 'Update_Logic' : 'Commit_Protocol'}
        </button>
      </div>
    </form>
  );
}
