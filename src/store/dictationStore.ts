import { create } from 'zustand';

interface DictationState {
  text: string;
  isRecording: boolean;
  isProcessing: boolean;
  setText: (text: string) => void;
  appendText: (text: string) => void;
  clearText: () => void;
  setIsRecording: (isRecording: boolean) => void;
  setIsProcessing: (isProcessing: boolean) => void;
}

export const useDictationStore = create<DictationState>((set) => ({
  text: '',
  isRecording: false,
  isProcessing: false,
  setText: (text) => set({ text }),
  appendText: (text) => set((state) => ({ text: state.text + (state.text ? ' ' : '') + text })),
  clearText: () => set({ text: '' }),
  setIsRecording: (isRecording) => set({ isRecording }),
  setIsProcessing: (isProcessing) => set({ isProcessing }),
}));
