export type AudioState = 'idle' | 'playing' | 'paused' | 'stopped';

export interface AudioOptions {
  voice?: string;
  speed?: number;
}

class AudioService {
  private audioElement: HTMLAudioElement | null = null;
  private currentState: AudioState = 'idle';
  private onStateChange: ((state: AudioState) => void) | null = null;
  private streamController: AbortController | null = null;

  setStateChangeCallback(callback: (state: AudioState) => void) {
    this.onStateChange = callback;
  }

  private setState(state: AudioState) {
    this.currentState = state;
    if (this.onStateChange) {
      this.onStateChange(state);
    }
  }

  async playAudio(audioBase64: string): Promise<void> {
    this.stopAudio();

    try {
      const audioBytes = this.base64ToBytes(audioBase64);
      const audioBlob = new Blob([audioBytes], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);

      this.audioElement = new Audio(audioUrl);
      
      this.audioElement.onplay = () => this.setState('playing');
      this.audioElement.onended = () => this.setState('idle');
      this.audioElement.onpause = () => this.setState('paused');
      this.audioElement.onerror = () => {
        this.setState('idle');
        console.error('Audio playback error');
      };

      await this.audioElement.play();
    } catch (error) {
      this.setState('idle');
      throw error;
    }
  }

  async streamAudio(text: string, options: AudioOptions = {}): Promise<void> {
    this.stopAudio();
    this.streamController = new AbortController();

    const { voice = 'en-US-AriaNeural', speed = 1.0 } = options;

    try {
      this.setState('playing');

      const response = await fetch('/tts/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, voice, speed }),
        signal: this.streamController.signal,
      });

      if (!response.ok) {
        throw new Error(`TTS stream failed: ${response.statusText}`);
      }

      if (!this.audioElement) {
        this.audioElement = new Audio();
      }

      const mediaSource = new MediaSource();
      const audioUrl = URL.createObjectURL(mediaSource);
      this.audioElement.src = audioUrl;
      this.audioElement.onplay = () => this.setState('playing');
      this.audioElement.onended = () => this.setState('idle');
      this.audioElement.onpause = () => this.setState('paused');

      await this.audioElement.play();

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      const sourceBuffer = mediaSource.addSourceBuffer('audio/mpeg');
      sourceBuffer.mode = 'segments';

      const chunks: Uint8Array[] = [];
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          chunks.push(value);
          
          if (mediaSource.readyState === 'open') {
            try {
              sourceBuffer.appendBuffer(value);
            } catch (e) {
              console.warn('Buffer append error:', e);
            }
          }
        }
      } catch (e) {
        if ((e as Error).name !== 'AbortError') {
          throw e;
        }
      }

      sourceBuffer.onupdateend = () => {
        if (mediaSource.readyState === 'ended') {
          this.setState('idle');
        }
      };

    } catch (error) {
      this.setState('idle');
      if ((error as Error).name !== 'AbortError') {
        throw error;
      }
    }
  }

  stopAudio() {
    if (this.streamController) {
      this.streamController.abort();
      this.streamController = null;
    }

    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
      this.audioElement.src = '';
      this.audioElement = null;
    }

    this.setState('idle');
  }

  pauseAudio() {
    if (this.audioElement) {
      this.audioElement.pause();
      this.setState('paused');
    }
  }

  resumeAudio() {
    if (this.audioElement && this.currentState === 'paused') {
      this.audioElement.play();
    }
  }

  getState(): AudioState {
    return this.currentState;
  }

  private base64ToBytes(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }
}

export const audioService = new AudioService();
