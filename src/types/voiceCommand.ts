export type ActionType = 'insert_text' | 'run_command' | 'hotkey' | 'snippet';

export interface VoiceCommand {
  id: string;
  trigger: string;
  action_type: ActionType;
  action_data: Record<string, unknown>;
  description: string;
  is_active: boolean;
  is_regex: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface VoiceCommandCreate {
  trigger: string;
  action_type: ActionType;
  action_data: Record<string, unknown>;
  description?: string;
  is_active?: boolean;
  is_regex?: boolean;
  priority?: number;
}

export interface VoiceCommandUpdate {
  trigger?: string;
  action_type?: ActionType;
  action_data?: Record<string, unknown>;
  description?: string;
  is_active?: boolean;
  is_regex?: boolean;
  priority?: number;
}

export interface ExecuteRequest {
  text: string;
}

export interface ExecuteResponse {
  matched: boolean;
  command_id?: string;
  trigger?: string;
  action_type?: string;
  success: boolean;
  output?: {
    text?: string;
    type?: string;
    stdout?: string;
    stderr?: string;
    returncode?: number;
    keys?: string[];
    modifiers?: string[];
  };
  error?: string;
}

export interface CommandTemplate {
  id: string;
  name: string;
  trigger: string;
  action_type: ActionType;
  action_data: Record<string, unknown>;
  description: string;
  category: string;
}
