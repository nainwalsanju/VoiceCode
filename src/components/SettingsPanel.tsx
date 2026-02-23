import { useState, useEffect } from 'react';
import { AppSettings, Microphone, TtsVoice, getSettings, updateSettings, getMicrophones, getTtsVoices } from '../api/settings';
import { setAlwaysOnTop } from '../hooks/useWindowManagement';
import { enable, disable } from '@tauri-apps/plugin-autostart';
import { registerGlobalHotkey } from '../hooks/useGlobalHotkey';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [microphones, setMicrophones] = useState<Microphone[]>([]);
  const [voices, setVoices] = useState<TtsVoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const [settingsData, micData, voiceData] = await Promise.all([
        getSettings(),
        getMicrophones(),
        getTtsVoices()
      ]);
      setSettings(settingsData);
      setMicrophones(micData);
      setVoices(voiceData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (key: string, value: unknown) => {
    if (!settings) return;
    try {
      const updated = await updateSettings({ [key]: value });
      setSettings(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    }
  };

  const handleToggle = async (key: keyof AppSettings) => {
    if (!settings) return;
    
    const newValue = !settings[key];
    
    if (key === 'always_on_top') {
      try {
        await setAlwaysOnTop(newValue);
      } catch (err) {
        console.error('Failed to set always on top:', err);
      }
    }
    
    if (key === 'auto_start') {
      try {
        if (newValue) {
          await enable();
        } else {
          await disable();
        }
      } catch (err) {
        console.error('Failed to toggle autostart:', err);
      }
    }
    
    handleSave(key, newValue);
  };

  useEffect(() => {
    if (settings && settings.hotkey) {
      const handleVoiceActivation = () => {
        console.log('Voice activation hotkey pressed');
      };
      registerGlobalHotkey(settings.hotkey, handleVoiceActivation);
    }
  }, [settings?.hotkey]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface rounded-xl w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <h2 className="text-xl font-bold">Settings</h2>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full"></div>
            </div>
          )}

          {error && (
            <div className="bg-error/20 border border-error rounded-lg px-4 py-3 mb-4">
              <p className="text-error text-sm">{error}</p>
            </div>
          )}

          {!loading && settings && (
            <div className="space-y-6">
              <section>
                <h3 className="text-lg font-semibold mb-4 text-primary">Speech Recognition</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      STT Provider
                    </label>
                    <select
                      value={settings.stt_provider}
                      onChange={(e) => handleSave('stt_provider', e.target.value)}
                      className="w-full px-4 py-2 rounded-lg bg-background border border-slate-600 text-text-primary focus:outline-none focus:border-primary"
                    >
                      <option value="google">Google Cloud Speech</option>
                      <option value="whisper">Whisper (Local)</option>
                      <option value="assemblyai">AssemblyAI</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      Microphone
                    </label>
                    <select
                      value={settings.microphone}
                      onChange={(e) => handleSave('microphone', e.target.value)}
                      className="w-full px-4 py-2 rounded-lg bg-background border border-slate-600 text-text-primary focus:outline-none focus:border-primary"
                    >
                      <option value="">Default</option>
                      {microphones.map((mic) => (
                        <option key={mic.id} value={mic.id}>
                          {mic.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      Language
                    </label>
                    <select
                      value={settings.language}
                      onChange={(e) => handleSave('language', e.target.value)}
                      className="w-full px-4 py-2 rounded-lg bg-background border border-slate-600 text-text-primary focus:outline-none focus:border-primary"
                    >
                      <option value="en-US">English (US)</option>
                      <option value="en-GB">English (UK)</option>
                      <option value="es-ES">Spanish</option>
                      <option value="fr-FR">French</option>
                      <option value="de-DE">German</option>
                      <option value="ja-JP">Japanese</option>
                      <option value="zh-CN">Chinese (Simplified)</option>
                    </select>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-4 text-primary">Text-to-Speech</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-text-secondary">
                      Enable TTS
                    </label>
                    <button
                      onClick={() => handleToggle('tts_enabled')}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        settings.tts_enabled ? 'bg-primary' : 'bg-slate-600'
                      }`}
                    >
                      <span
                        className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                          settings.tts_enabled ? 'translate-x-6' : ''
                        }`}
                      />
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      Voice
                    </label>
                    <select
                      value={settings.tts_voice}
                      onChange={(e) => handleSave('tts_voice', e.target.value)}
                      disabled={!settings.tts_enabled}
                      className="w-full px-4 py-2 rounded-lg bg-background border border-slate-600 text-text-primary focus:outline-none focus:border-primary disabled:opacity-50"
                    >
                      {voices.map((voice) => (
                        <option key={voice.id} value={voice.id}>
                          {voice.name} ({voice.language})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      Speed: {settings.tts_speed.toFixed(1)}x
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="2.0"
                      step="0.1"
                      value={settings.tts_speed}
                      onChange={(e) => handleSave('tts_speed', parseFloat(e.target.value))}
                      disabled={!settings.tts_enabled}
                      className="w-full accent-primary disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      Pitch: {settings.tts_pitch.toFixed(1)}
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="2.0"
                      step="0.1"
                      value={settings.tts_pitch}
                      onChange={(e) => handleSave('tts_pitch', parseFloat(e.target.value))}
                      disabled={!settings.tts_enabled}
                      className="w-full accent-primary disabled:opacity-50"
                    />
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-4 text-primary">Keyboard Shortcuts</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      Voice Activation Hotkey
                    </label>
                    <input
                      type="text"
                      value={settings.hotkey}
                      onChange={(e) => handleSave('hotkey', e.target.value)}
                      placeholder="Ctrl+Shift+V"
                      className="w-full px-4 py-2 rounded-lg bg-background border border-slate-600 text-text-primary focus:outline-none focus:border-primary"
                    />
                    <p className="text-xs text-text-secondary mt-1">
                      Use format: Ctrl+Shift+Key or Alt+Key
                    </p>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-4 text-primary">Application</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-text-secondary">
                        Auto-start
                      </label>
                      <p className="text-xs text-text-secondary">
                        Start VoiceCode when you log in
                      </p>
                    </div>
                    <button
                      onClick={() => handleToggle('auto_start')}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        settings.auto_start ? 'bg-primary' : 'bg-slate-600'
                      }`}
                    >
                      <span
                        className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                          settings.auto_start ? 'translate-x-6' : ''
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-text-secondary">
                        Minimize to Tray
                      </label>
                      <p className="text-xs text-text-secondary">
                        Keep running in system tray when closed
                      </p>
                    </div>
                    <button
                      onClick={() => handleToggle('minimize_to_tray')}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        settings.minimize_to_tray ? 'bg-primary' : 'bg-slate-600'
                      }`}
                    >
                      <span
                        className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                          settings.minimize_to_tray ? 'translate-x-6' : ''
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-text-secondary">
                        Always on Top
                      </label>
                      <p className="text-xs text-text-secondary">
                        Keep window above other windows
                      </p>
                    </div>
                    <button
                      onClick={() => handleToggle('always_on_top')}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        settings.always_on_top ? 'bg-primary' : 'bg-slate-600'
                      }`}
                    >
                      <span
                        className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                          settings.always_on_top ? 'translate-x-6' : ''
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-4 text-primary">Advanced</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      Silence Threshold: {settings.silence_threshold.toFixed(1)}
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.1"
                      value={settings.silence_threshold}
                      onChange={(e) => handleSave('silence_threshold', parseFloat(e.target.value))}
                      className="w-full accent-primary"
                    />
                    <p className="text-xs text-text-secondary mt-1">
                      Lower values are more sensitive to silence
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      Max Recording Duration: {settings.max_recording_duration}s
                    </label>
                    <input
                      type="range"
                      min="5"
                      max="120"
                      step="5"
                      value={settings.max_recording_duration}
                      onChange={(e) => handleSave('max_recording_duration', parseInt(e.target.value))}
                      className="w-full accent-primary"
                    />
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-lg bg-primary text-white font-medium hover:opacity-90 transition-opacity"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
