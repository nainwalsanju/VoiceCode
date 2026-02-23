import { apiClient } from './client';

export interface AppState {
  last_voice_profile_id: string | null;
  last_tts_voice: string | null;
  window_position: { x: number | null; y: number | null };
  window_size: { width: number | null; height: number | null };
  active_command_ids: string[];
  recent_commands: Array<{
    id: string;
    trigger: string;
    used_at: string;
  }>;
  started_at: string | null;
  last_session_at: string | null;
}

export async function getAppState(): Promise<AppState> {
  return apiClient.get<AppState>('/app-state');
}

export async function updateAppState(state: Partial<AppState>): Promise<AppState> {
  return apiClient.put<AppState>('/app-state', state);
}

export async function addRecentCommand(command: { id: string; trigger: string }): Promise<AppState> {
  return apiClient.post<AppState>('/app-state/recent-command', command);
}
