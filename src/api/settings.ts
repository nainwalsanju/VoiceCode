import { apiClient } from './client';

export interface AppSettings {
  stt_provider: string;
  tts_voice: string;
  tts_speed: number;
  tts_pitch: number;
  microphone: string;
  hotkey: string;
  auto_start: boolean;
  tts_enabled: boolean;
  minimize_to_tray: boolean;
  always_on_top: boolean;
  language: string;
  silence_threshold: number;
  max_recording_duration: number;
}

export interface Microphone {
  id: string;
  name: string;
}

export interface TtsVoice {
  id: string;
  name: string;
  language: string;
}

export async function getSettings(): Promise<AppSettings> {
  return apiClient.get<AppSettings>('/settings');
}

export async function updateSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
  return apiClient.put<AppSettings>('/settings', settings);
}

export async function getMicrophones(): Promise<Microphone[]> {
  return apiClient.get<Microphone[]>('/settings/microphones');
}

export async function getTtsVoices(): Promise<TtsVoice[]> {
  return apiClient.get<TtsVoice[]>('/settings/voices');
}
