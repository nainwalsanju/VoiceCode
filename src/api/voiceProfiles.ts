import { apiClient } from './client';
import type { VoiceProfile, VoiceProfileCreate, VoiceProfileUpdate, VoiceCloneResponse, VoicePresets } from '../types/voiceProfile';

export const voiceProfilesApi = {
  list: async (): Promise<VoiceProfile[]> => {
    return apiClient.get<VoiceProfile[]>('/voice-profiles');
  },

  get: async (id: string): Promise<VoiceProfile> => {
    return apiClient.get<VoiceProfile>(`/voice-profiles/${id}`);
  },

  getDefault: async (): Promise<VoiceProfile> => {
    return apiClient.get<VoiceProfile>('/voice-profiles/default');
  },

  create: async (data: VoiceProfileCreate): Promise<VoiceProfile> => {
    return apiClient.post<VoiceProfile>('/voice-profiles', data);
  },

  update: async (id: string, data: VoiceProfileUpdate): Promise<VoiceProfile> => {
    return apiClient.post<VoiceProfile>(`/voice-profiles/${id}`, data);
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.post(`/voice-profiles/${id}`, { method: 'DELETE' });
  },

  clone: async (name: string, audioFile: File): Promise<VoiceCloneResponse> => {
    const formData = new FormData();
    formData.append('name', name);
    formData.append('audio', audioFile);

    const response = await fetch('http://localhost:8000/voice/clone', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Voice cloning failed' }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return response.json();
  },

  getPresets: async (): Promise<VoicePresets> => {
    return apiClient.get<VoicePresets>('/voice/presets');
  },
};
