import { create } from 'zustand';

export type MessageRole = 'user' | 'assistant';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
}

interface TranscriptState {
  messages: Message[];
  maxMessages: number;
  addMessage: (role: MessageRole, content: string) => void;
  clearTranscript: () => void;
}

const MAX_MESSAGES = 20;

export const useTranscriptStore = create<TranscriptState>((set) => ({
  messages: [],
  maxMessages: MAX_MESSAGES,

  addMessage: (role: MessageRole, content: string) => {
    set((state) => {
      const newMessage: Message = {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        role,
        content,
        timestamp: Date.now(),
      };

      let messages = [...state.messages, newMessage];

      // FIFO removal - keep maxMessages
      if (messages.length > MAX_MESSAGES) {
        messages = messages.slice(messages.length - MAX_MESSAGES);
      }

      return { messages };
    });
  },

  clearTranscript: () => {
    set({ messages: [] });
  },
}));
