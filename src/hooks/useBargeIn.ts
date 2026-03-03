import { useEffect } from 'react';

interface UseBargeInOptions {
  enabled: boolean;
  onBargeIn: () => void;
  threshold?: number;
  debounceMs?: number;
}

/**
 * Custom hook for detecting barge-in (user speaking during TTS playback)
 * Monitors microphone input and triggers callback when sustained audio above threshold is detected
 */
export function useBargeIn(options: UseBargeInOptions): void {
  const { enabled, onBargeIn, threshold = 0.5, debounceMs = 100 } = options;

  useEffect(() => {
    if (!enabled) return;

    let audioContext: AudioContext;
    let analyser: AnalyserNode;
    let microphone: MediaStreamAudioSourceNode;
    let stream: MediaStream;
    let animationId: number;
    let aboveThresholdSince: number | null = null;
    let hasTriggered = false; // Prevent multiple triggers

    const startMonitoring = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContext = new AudioContext();
        analyser = audioContext.createAnalyser();
        microphone = audioContext.createMediaStreamSource(stream);
        microphone.connect(analyser);
        analyser.fftSize = 256;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const checkVolume = () => {
          if (hasTriggered) return; // Stop after trigger

          analyser.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length / 255;

          if (average > threshold) {
            if (aboveThresholdSince === null) {
              aboveThresholdSince = Date.now();
            } else if (Date.now() - aboveThresholdSince > debounceMs) {
              hasTriggered = true;
              onBargeIn();
              return; // Stop monitoring after trigger
            }
          } else {
            aboveThresholdSince = null;
          }

          animationId = requestAnimationFrame(checkVolume);
        };

        checkVolume();
      } catch (error) {
        console.error('Failed to start barge-in monitoring:', error);
      }
    };

    startMonitoring();

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close();
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [enabled, onBargeIn, threshold, debounceMs]);
}
