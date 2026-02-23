export interface VoiceProfile {
  id: string;
  name: string;
  voice_id: string;
  is_default: boolean;
  created_at: string;
  audio_sample_path?: string;
}

export interface VoiceProfileCreate {
  name: string;
  voice_id: string;
  is_default?: boolean;
  audio_sample_path?: string;
}

export interface VoiceProfileUpdate {
  name?: string;
  voice_id?: string;
  is_default?: boolean;
  audio_sample_path?: string;
}

export interface VoiceCloneRequest {
  name: string;
  audio: File;
}

export interface VoiceCloneResponse {
  profile_id: string;
  name: string;
  voice_id: string;
  audio_sample_path: string;
}

export interface VoicePresets {
  presets: string[];
}
