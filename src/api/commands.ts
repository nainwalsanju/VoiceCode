import { apiClient } from './client';
import type { VoiceCommand, VoiceCommandCreate, VoiceCommandUpdate, ExecuteResponse, CommandTemplate } from '../types/voiceCommand';

export const commandsApi = {
  list: async (): Promise<VoiceCommand[]> => {
    return apiClient.get<VoiceCommand[]>('/commands');
  },

  listActive: async (): Promise<VoiceCommand[]> => {
    return apiClient.get<VoiceCommand[]>('/commands/active');
  },

  get: async (id: string): Promise<VoiceCommand> => {
    return apiClient.get<VoiceCommand>(`/commands/${id}`);
  },

  create: async (data: VoiceCommandCreate): Promise<VoiceCommand> => {
    return apiClient.post<VoiceCommand>('/commands', data);
  },

  update: async (id: string, data: VoiceCommandUpdate): Promise<VoiceCommand> => {
    return apiClient.post<VoiceCommand>(`/commands/${id}`, data);
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/commands/${id}`);
  },

  toggle: async (id: string): Promise<VoiceCommand> => {
    return apiClient.post<VoiceCommand>(`/commands/${id}/toggle`, {});
  },

  execute: async (text: string): Promise<ExecuteResponse> => {
    return apiClient.post<ExecuteResponse>('/commands/execute', { text });
  },

  getTemplates: async (): Promise<CommandTemplate[]> => {
    return apiClient.get<CommandTemplate[]>('/commands/templates');
  },
};
