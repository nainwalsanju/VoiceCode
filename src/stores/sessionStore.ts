import { create } from 'zustand';

export type SessionState = 'IDLE' | 'LISTENING' | 'PROCESSING' | 'SPEAKING';

interface SessionStateData {
  currentState: SessionState;
  isContinuousMode: boolean;
  contextLength: number;
}

interface SessionActions {
  setState: (newState: SessionState) => boolean;
  startListening: () => boolean;
  startProcessing: () => boolean;
  startSpeaking: () => boolean;
  endSpeaking: () => boolean;
  interruptSpeaking: () => boolean;
  setContinuousMode: (enabled: boolean) => void;
  reset: () => void;
}

type SessionStore = SessionStateData & SessionActions;

// Valid state transitions
const VALID_TRANSITIONS: Record<SessionState, SessionState[]> = {
  IDLE: ['LISTENING'],
  LISTENING: ['PROCESSING'],
  PROCESSING: ['SPEAKING', 'IDLE'],
  SPEAKING: ['LISTENING', 'IDLE'],
};

const INITIAL_STATE: SessionStateData = {
  currentState: 'IDLE',
  isContinuousMode: true,
  contextLength: 10,
};

export const useSessionStore = create<SessionStore>((set, get) => ({
  ...INITIAL_STATE,

  setState: (newState: SessionState) => {
    const { currentState } = get();
    const validTransitions = VALID_TRANSITIONS[currentState];
    
    // Use indexOf for ES5 compatibility
    if (validTransitions.indexOf(newState) !== -1) {
      set({ currentState: newState });
      return true;
    }
    
    console.warn(`Invalid state transition: ${currentState} -> ${newState}`);
    return false;
  },

  startListening: () => {
    const { currentState, isContinuousMode } = get();
    
    // Can start listening from IDLE or SPEAKING (continuous mode)
    if (currentState === 'IDLE') {
      set({ currentState: 'LISTENING' });
      return true;
    }
    
    if (currentState === 'SPEAKING' && isContinuousMode) {
      set({ currentState: 'LISTENING' });
      return true;
    }
    
    console.warn(`Cannot start listening from state: ${currentState}`);
    return false;
  },

  startProcessing: () => {
    return get().setState('PROCESSING');
  },

  startSpeaking: () => {
    return get().setState('SPEAKING');
  },

  endSpeaking: () => {
    const { isContinuousMode } = get();

    if (isContinuousMode) {
      // In continuous mode, go back to listening for next turn
      set({ currentState: 'LISTENING' });
    } else {
      set({ currentState: 'IDLE' });
    }
    return true;
  },

  interruptSpeaking: () => {
    const { currentState } = get();
    
    if (currentState === 'SPEAKING') {
      set({ currentState: 'LISTENING' });
      return true;
    }
    
    return false;
  },

  setContinuousMode: (enabled: boolean) => {
    set({ isContinuousMode: enabled });
  },

  reset: () => {
    set(INITIAL_STATE);
  },
}));
