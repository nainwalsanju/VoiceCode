import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Voice {
  id: string;
  name: string;
  engine: string;
  is_default?: boolean;
}

interface VoiceState {
  selectedVoice: string;
  defaultVoice: string;
  voices: Voice[];
  previewingVoiceId: string | null;
  setSelectedVoice: (voiceId: string) => void;
  setDefaultVoice: (voiceId: string) => void;
  loadVoices: () => void;
  startPreview: (voiceId: string) => void;
  stopPreview: () => void;
}

// Map tts_service AVAILABLE_VOICES to Voice[]
const AVAILABLE_VOICES_MAP: Voice[] = [
  // Qwen3
  { id: 'qwen3-tts-0.6b', name: 'Qwen3 0.6B', engine: 'qwen3', is_default: true },
  { id: 'qwen3-tts-1.7b', name: 'Qwen3 1.7B', engine: 'qwen3' },
  // NeuTTS Air
  { id: 'neutts-air-en', name: 'NeuTTS Air EN', engine: 'neutts-air' },
  { id: 'neutts-air-multi', name: 'NeuTTS Air Multi', engine: 'neutts-air' },
  // NeuTTS Nano
  { id: 'neutts-nano-en', name: 'NeuTTS Nano EN', engine: 'neutts-nano' },
  { id: 'neutts-nano-hi', name: 'NeuTTS Nano HI', engine: 'neutts-nano' },
  // Pocket
  { id: 'pocket-tts-en', name: 'Pocket EN', engine: 'pocket' },
  { id: 'pocket-tts-hi', name: 'Pocket HI', engine: 'pocket' },
  // Kokoro
  { id: 'kokoro-zh', name: 'Kokoro ZH', engine: 'kokoro' },
  { id: 'kokoro-en', name: 'Kokoro EN', engine: 'kokoro' },
  // Edge
  { id: 'en-US-AriaNeural', name: 'Aria', engine: 'edge' },
  { id: 'en-US-GuyNeural', name: 'Guy', engine: 'edge' },
  { id: 'en-GB-SoniaNeural', name: 'Sonia', engine: 'edge' },
];

export const useVoiceStore = create<VoiceState>()(
  persist(
    (set, get) => ({
      selectedVoice: '',
      defaultVoice: 'qwen3-tts-0.6b',
      voices: AVAILABLE_VOICES_MAP,
      previewingVoiceId: null,

      setSelectedVoice: (voiceId: string) => {
        set({ selectedVoice: voiceId });
      },

      setDefaultVoice: (voiceId: string) => {
        set({ defaultVoice: voiceId });
        // Also set as selected if no selection
        const { selectedVoice } = get();
        if (!selectedVoice) {
          set({ selectedVoice: voiceId });
        }
      },

      loadVoices: () => {
        const { defaultVoice, selectedVoice } = get();
        // Voices are already loaded from the map
        // Just ensure default is set
        if (!selectedVoice && defaultVoice) {
          set({ selectedVoice: defaultVoice });
        }
      },

      startPreview: (voiceId: string) => {
        set({ previewingVoiceId: voiceId });
      },

      stopPreview: () => {
        set({ previewingVoiceId: null });
      },
    }),
    {
      name: 'voice-storage',
      partialize: (state) => ({ defaultVoice: state.defaultVoice }),
    }
  )
);
