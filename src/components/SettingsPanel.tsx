import { useState, useEffect } from 'react';
import { AppSettings, Microphone, TtsVoice, getSettings, updateSettings, getMicrophones, getTtsVoices } from '../api/settings';
import { setAlwaysOnTop } from '../hooks/useWindowManagement';
import { enable, disable } from '@tauri-apps/plugin-autostart';
import { registerGlobalHotkey, unregisterGlobalHotkey } from '../hooks/useGlobalHotkey';

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
      setError(err instanceof Error ? err.message : 'Datalink failure: Could not retrieve configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (key: string, value: unknown) => {
    if (!settings) return;

    try {
      // Unregister old hotkey before changing it
      if (key === 'hotkey' && settings.hotkey) {
        await unregisterGlobalHotkey(settings.hotkey);
      }

      const updated = await updateSettings({ [key]: value });
      setSettings(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Datalink failure: Synchronization failed');
    }
  };

  // Normalize hotkey format for consistency
  const normalizeHotkey = (input: string): string => {
    return input
      .toUpperCase()
      .replace(/CONTROL/g, 'CTRL')
      .replace(/COMMAND|CMD|META/g, 'SUPER')
      .replace(/\s+/g, '');
  };

  const handleToggle = async (key: keyof AppSettings) => {
    if (!settings) return;

    const newValue = !settings[key];

    if (key === 'always_on_top') {
      try {
        await setAlwaysOnTop(newValue);
      } catch (err) {
        console.error('Window Management Error:', err);
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
        console.error('Initialization Error:', err);
      }
    }

    handleSave(key, newValue);
  };

  useEffect(() => {
    if (settings && settings.hotkey) {
      const handleVoiceActivation = () => {
        // Voice activation hotkey triggered
      };
      registerGlobalHotkey(settings.hotkey, handleVoiceActivation);
    }
  }, [settings?.hotkey]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background/20 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
      <div className="bg-surface/80 backdrop-blur-2xl rounded-3xl w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-2xl border border-border flex flex-col relative scale-in-center animate-in zoom-in-95 duration-300">
        {/* Glow effect */}
        <div className="absolute top-0 left-1/4 w-1/2 h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent blur-sm"></div>

        <div className="flex items-center justify-between px-8 py-6 border-b border-border/50">
          <div>
            <h2 className="text-sm font-mono font-bold uppercase tracking-[0.3em] text-text-primary">System_Core_Config</h2>
            <p className="text-[10px] font-mono text-text-secondary uppercase opacity-50 mt-1">Adjust neural parameters & interface</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-surface/50 transition-all border border-transparent hover:border-border cursor-pointer group"
          >
            <svg className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
          {loading && (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="animate-spin w-10 h-10 border-2 border-primary border-t-transparent rounded-full shadow-neon"></div>
              <span className="text-[10px] font-mono font-bold tracking-[0.2em] text-text-secondary uppercase animate-pulse">Scanning Registry...</span>
            </div>
          )}

          {error && (
            <div className="bg-error/10 border border-error/20 rounded-xl p-4 mb-8 animate-in slide-in-from-top-4 duration-500 flex items-center gap-4">
              <div className="w-2 h-2 rounded-full bg-error animate-ping shrink-0"></div>
              <p className="text-error font-mono text-[10px] font-bold uppercase tracking-tight">{error}</p>
            </div>
          )}

          {!loading && settings && (
            <div className="space-y-10">
              <section className="space-y-6">
                <div className="flex items-center gap-4">
                  <h3 className="text-[10px] font-mono font-bold uppercase tracking-widest text-primary">01 // Acoustic_Vocal_Capture</h3>
                  <div className="flex-1 h-px bg-gradient-to-r from-primary/20 to-transparent"></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[9px] font-mono font-bold text-text-secondary uppercase tracking-widest pl-1">
                      Link_Provider
                    </label>
                    <select
                      value={settings.stt_provider}
                      onChange={(e) => handleSave('stt_provider', e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-background/50 border border-border text-text-primary font-mono text-xs focus:outline-none focus:ring-1 focus:ring-primary/50 cursor-pointer transition-all"
                    >
                      <option value="google" className="bg-background">GOOGLE_CLOUD</option>
                      <option value="whisper" className="bg-background">WHISPER_LOCAL</option>
                      <option value="assemblyai" className="bg-background">ASSEMBLY_AI</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-mono font-bold text-text-secondary uppercase tracking-widest pl-1">
                      Acoustic_Source
                    </label>
                    <select
                      value={settings.microphone}
                      onChange={(e) => handleSave('microphone', e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-background/50 border border-border text-text-primary font-mono text-xs focus:outline-none focus:ring-1 focus:ring-primary/50 cursor-pointer transition-all"
                    >
                      <option value="" className="bg-background">SYSTEM_DEFAULT</option>
                      {microphones.map((mic) => (
                        <option key={mic.id} value={mic.id} className="bg-background">
                          {mic.name.toUpperCase().replace(/\s+/g, '_')}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-mono font-bold text-text-secondary uppercase tracking-widest pl-1">
                    Language_Set
                  </label>
                  <select
                    value={settings.language}
                    onChange={(e) => handleSave('language', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-background/50 border border-border text-text-primary font-mono text-xs focus:outline-none focus:ring-1 focus:ring-primary/50 cursor-pointer transition-all"
                  >
                    <option value="en-US" className="bg-background">ENGLISH_US</option>
                    <option value="en-GB" className="bg-background">ENGLISH_UK</option>
                    <option value="es-ES" className="bg-background">SPANISH_ESP</option>
                    <option value="fr-FR" className="bg-background">FRENCH_FRA</option>
                    <option value="de-DE" className="bg-background">GERMAN_DEU</option>
                    <option value="ja-JP" className="bg-background">JAPANESE_JPN</option>
                    <option value="zh-CN" className="bg-background">CHINESE_ZHO</option>
                  </select>
                </div>
              </section>

              <section className="space-y-6">
                <div className="flex items-center gap-4">
                  <h3 className="text-[10px] font-mono font-bold uppercase tracking-widest text-secondary">02 // Vocal_Synthesis</h3>
                  <div className="flex-1 h-px bg-gradient-to-r from-secondary/20 to-transparent"></div>
                </div>

                <div className="bg-surface/30 border border-border rounded-xl p-6 space-y-6 shadow-inner">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <label className="text-[10px] font-mono font-bold text-text-primary uppercase tracking-widest">
                        Initialize_Synthesis
                      </label>
                      <span className="text-[8px] font-mono text-text-secondary uppercase opacity-50">Master switch for audio feedback</span>
                    </div>
                    <button
                      onClick={() => handleToggle('tts_enabled')}
                      className={`relative w-12 h-6 rounded-full transition-all duration-300 border border-transparent ${settings.tts_enabled ? 'bg-secondary shadow-[0_0_10px_rgba(var(--secondary-rgb),0.5)]' : 'bg-surface border-border'
                        }`}
                    >
                      <span
                        className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-all duration-300 ${settings.tts_enabled ? 'translate-x-6 scale-110' : 'opacity-30'
                          }`}
                      />
                    </button>
                  </div>

                  <div className="space-y-6 pt-4 border-t border-border/30 opacity-100 transition-opacity">
                    <div className="space-y-2 opacity-100">
                      <label className="text-[9px] font-mono font-bold text-text-secondary uppercase tracking-widest pl-1">
                        Neural_Voice_Model
                      </label>
                      <select
                        value={settings.tts_voice}
                        onChange={(e) => handleSave('tts_voice', e.target.value)}
                        disabled={!settings.tts_enabled}
                        className="w-full px-4 py-3 rounded-xl bg-background/50 border border-border text-text-primary font-mono text-xs focus:outline-none focus:ring-1 focus:ring-secondary/50 cursor-pointer transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                      >
                        {voices.map((voice) => (
                          <option key={voice.id} value={voice.id} className="bg-background">
                            {voice.name.toUpperCase()} ({voice.language.split('-')[0]})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <div className="flex justify-between items-center px-1">
                          <label className="text-[9px] font-mono font-bold text-text-secondary uppercase tracking-widest">
                            Tempo_Scalar
                          </label>
                          <span className="text-[10px] font-mono font-bold text-secondary uppercase">{settings.tts_speed.toFixed(1)}x</span>
                        </div>
                        <input
                          type="range"
                          min="0.5"
                          max="2.0"
                          step="0.1"
                          value={settings.tts_speed}
                          onChange={(e) => handleSave('tts_speed', parseFloat(e.target.value))}
                          disabled={!settings.tts_enabled}
                          className="w-full h-1 bg-surface rounded-full appearance-none cursor-pointer accent-secondary disabled:opacity-20"
                        />
                      </div>

                      <div className="space-y-4">
                        <div className="flex justify-between items-center px-1">
                          <label className="text-[9px] font-mono font-bold text-text-secondary uppercase tracking-widest">
                            Frequency_Pitch
                          </label>
                          <span className="text-[10px] font-mono font-bold text-secondary uppercase">{settings.tts_pitch.toFixed(1)}</span>
                        </div>
                        <input
                          type="range"
                          min="0.5"
                          max="2.0"
                          step="0.1"
                          value={settings.tts_pitch}
                          onChange={(e) => handleSave('tts_pitch', parseFloat(e.target.value))}
                          disabled={!settings.tts_enabled}
                          className="w-full h-1 bg-surface rounded-full appearance-none cursor-pointer accent-secondary disabled:opacity-20"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-6">
                <div className="flex items-center gap-4">
                  <h3 className="text-[10px] font-mono font-bold uppercase tracking-widest text-accent">03 // User_Interface_Link</h3>
                  <div className="flex-1 h-px bg-gradient-to-r from-accent/20 to-transparent"></div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[9px] font-mono font-bold text-text-secondary uppercase tracking-widest pl-1">
                      Manual_activation_hotkey
                    </label>
                    <div className="relative group">
                      <input
                        type="text"
                        value={settings.hotkey}
                        onChange={(e) => handleSave('hotkey', normalizeHotkey(e.target.value))}
                        placeholder="CTRL+SHIFT+V"
                        className="w-full px-5 py-4 rounded-xl bg-background/50 border border-border text-text-primary font-mono text-sm focus:outline-none focus:ring-1 focus:ring-accent/50 transition-all placeholder:opacity-20 shadow-inner group-hover:border-accent/30"
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-accent opacity-30 group-focus-within:opacity-100 group-focus-within:animate-pulse transition-all"></div>
                      </div>
                    </div>
                    <p className="text-[8px] font-mono text-text-secondary uppercase mt-1 opacity-50 px-1 tracking-tighter">
                      Supported modifiers: CTRL | SHIFT | ALT | SUPER
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { key: 'auto_start' as const, label: 'Auto_Boot', sub: 'Initialize on login' },
                      { key: 'minimize_to_tray' as const, label: 'Process_Persistence', sub: 'Continue in system tray' },
                      { key: 'always_on_top' as const, label: 'Visual_Priority', sub: 'Lock window to foreground' },
                    ].map((item) => (
                      <div key={item.key} className="p-5 rounded-xl bg-surface/30 border border-border flex items-center justify-between group hover:border-accent/20 transition-all">
                        <div className="flex flex-col">
                          <label className="text-[10px] font-mono font-bold text-text-primary uppercase tracking-widest group-hover:text-accent transition-colors">
                            {item.label}
                          </label>
                          <span className="text-[8px] font-mono text-text-secondary uppercase opacity-50">{item.sub}</span>
                        </div>
                        <button
                          onClick={() => handleToggle(item.key)}
                          className={`relative w-10 h-5 rounded-full transition-all duration-300 border border-transparent ${settings[item.key] ? 'bg-accent shadow-[0_0_8px_rgba(var(--accent-rgb),0.4)]' : 'bg-surface border-border'
                            }`}
                        >
                          <span
                            className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-all duration-300 ${settings[item.key] ? 'translate-x-5' : 'opacity-20'
                              }`}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section className="space-y-6">
                <div className="flex items-center gap-4">
                  <h3 className="text-[10px] font-mono font-bold uppercase tracking-widest text-text-secondary">04 // Advanced_Synthetics</h3>
                  <div className="flex-1 h-px bg-gradient-to-r from-border to-transparent"></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center px-1">
                      <div className="flex flex-col">
                        <label className="text-[9px] font-mono font-bold text-text-primary uppercase tracking-widest">
                          Silence_Gate
                        </label>
                        <span className="text-[8px] font-mono text-text-secondary uppercase opacity-50">Activation sensitivity</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-text-primary uppercase">{settings.silence_threshold.toFixed(1)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.1"
                      value={settings.silence_threshold}
                      onChange={(e) => handleSave('silence_threshold', parseFloat(e.target.value))}
                      className="w-full h-1 bg-surface rounded-full appearance-none cursor-pointer accent-text-primary"
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center px-1">
                      <div className="flex flex-col">
                        <label className="text-[9px] font-mono font-bold text-text-primary uppercase tracking-widest">
                          Buffer_Limit
                        </label>
                        <span className="text-[8px] font-mono text-text-secondary uppercase opacity-50">Max capture duration</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-text-primary uppercase">{settings.max_recording_duration}S</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="120"
                      step="5"
                      value={settings.max_recording_duration}
                      onChange={(e) => handleSave('max_recording_duration', parseInt(e.target.value))}
                      className="w-full h-1 bg-surface rounded-full appearance-none cursor-pointer accent-text-primary"
                    />
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>

        <div className="px-8 py-6 border-t border-border/50 bg-background/50 flex justify-end gap-4 shadow-inner">
          <button
            onClick={onClose}
            className="px-8 py-3.5 rounded-xl bg-primary text-white font-mono font-bold text-[10px] uppercase tracking-[0.2em] shadow-neon hover:bg-primary/90 transition-all cursor-pointer active:scale-95"
          >
            Acknowledge_Commit
          </button>
        </div>
      </div>
    </div>
  );
}
