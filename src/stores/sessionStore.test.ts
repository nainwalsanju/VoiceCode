import { describe, it, expect, beforeEach } from 'vitest';
import { useSessionStore } from './sessionStore';

describe('sessionStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useSessionStore.getState().reset();
  });

  describe('interruptSpeaking', () => {
    it('should transition from SPEAKING to LISTENING when called during SPEAKING state', () => {
      const store = useSessionStore.getState();

      // Setup: Transition to SPEAKING state
      store.setState('IDLE');
      store.startListening();
      store.startProcessing();
      store.startSpeaking();

      expect(useSessionStore.getState().currentState).toBe('SPEAKING');

      // Execute interruptSpeaking
      const result = store.interruptSpeaking();

      // Verify
      expect(result).toBe(true);
      expect(useSessionStore.getState().currentState).toBe('LISTENING');
    });

    it('should return false when called during non-SPEAKING state', () => {
      const store = useSessionStore.getState();

      // Test from IDLE state
      expect(useSessionStore.getState().currentState).toBe('IDLE');
      const resultIdle = store.interruptSpeaking();
      expect(resultIdle).toBe(false);
      expect(useSessionStore.getState().currentState).toBe('IDLE');

      // Test from LISTENING state
      store.startListening();
      expect(useSessionStore.getState().currentState).toBe('LISTENING');
      const resultListening = store.interruptSpeaking();
      expect(resultListening).toBe(false);
      expect(useSessionStore.getState().currentState).toBe('LISTENING');
    });

    it('should return false when called during PROCESSING state', () => {
      const store = useSessionStore.getState();

      // Setup: Transition to PROCESSING state
      store.setState('IDLE');
      store.startListening();
      store.startProcessing();

      expect(useSessionStore.getState().currentState).toBe('PROCESSING');

      // Execute interruptSpeaking
      const result = store.interruptSpeaking();

      // Verify
      expect(result).toBe(false);
      expect(useSessionStore.getState().currentState).toBe('PROCESSING');
    });
  });
});
