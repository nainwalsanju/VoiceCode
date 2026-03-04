import { useState } from "react";
import { useBackendStatus } from "./hooks/useBackendStatus";
import { SettingsPanel } from "./components/SettingsPanel";
import { VoiceButton } from "./components/VoiceButton";
import { DictationDisplay } from "./components/DictationDisplay";
import { VoiceProfileList } from "./components/VoiceProfileList";
import { VoiceCloneForm } from "./components/VoiceCloneForm";
import { VoiceSelector } from "./components/VoiceSelector";
import { CommandList } from "./components/CommandList";
import { CommandForm } from "./components/CommandForm";
import { CommandTester } from "./components/CommandTester";
import { ThemeToggle } from "./components/ThemeToggle";
import { useDictationStore } from "./store/dictationStore";
import { useTheme } from "./hooks/useTheme";

type View = "dictate" | "voices" | "commands" | "test";

function App() {
  const [currentView, setCurrentView] = useState<View>("dictate");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { isConnected, isLoading } = useBackendStatus();

  const { text, isRecording } = useDictationStore();
  const { theme } = useTheme();

  const handleTranscript = (newText: string) => {
    // The STT backend streams cumulative text over the single session, so we overwrite the state.
    useDictationStore.getState().setText(newText);
  };

  return (
    <div className="min-h-screen flex bg-background text-text-primary relative overflow-hidden font-sans transition-colors duration-500">
      {/* Dynamic Background Effects */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden origin-center">
        <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-primary/20 rounded-full blur-[160px] animate-[mesh_25s_infinite_alternate]"></div>
        <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-secondary/20 rounded-full blur-[160px] animate-[mesh_30s_infinite_alternate-reverse]"></div>
        <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-accent/10 rounded-full blur-[120px] animate-[mesh_20s_infinite]"></div>
        {theme === 'dark' ? (
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-30 brightness-150 contrast-150 mix-blend-overlay"></div>
        ) : (
          <div className="absolute inset-0 bg-white/40 backdrop-blur-[100px]"></div>
        )}
      </div>

      {/* Sidebar */}
      <aside className="w-72 z-10 bg-surface/80 backdrop-blur-xl border-r border-border/80 flex flex-col shadow-2xl relative">
        {/* Logo */}
        <div className="p-8 border-b border-border/30">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shadow-neon relative group overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
              <svg className="w-7 h-7 text-white relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <div>
              <h1 className="text-sm font-mono font-black uppercase tracking-[0.3em] text-text-primary">
                Voice_Code
              </h1>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"></span>
                <p className="text-[10px] font-mono font-bold text-text-secondary uppercase opacity-50">Pulse_Active</p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-3 overflow-y-auto">
          {[
            { id: "dictate" as View, label: "NEURAL_TRANSCRIPT", icon: "01", desc: "Real-time speech capture" },
            { id: "voices" as View, label: "VOCAL_PROFILES", icon: "02", desc: "Neural voice mapping" },
            { id: "commands" as View, label: "COMM_PROTOCOLS", icon: "03", desc: "Automated trigger sets" },
            { id: "test" as View, label: "LOGIC_VERIFIER", icon: "04", desc: "Neural link diagnostics" },
          ].map((item, idx) => (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              style={{ animationDelay: `${idx * 100}ms` }}
              className={`w-full group relative flex flex-col items-start gap-1 p-4 rounded-xl transition-all duration-300 overflow-hidden animate-in fade-in slide-in-from-left-4 fill-mode-both ${currentView === item.id
                ? "bg-primary text-white shadow-neon border border-primary/50"
                : "text-text-secondary hover:bg-surface hover:text-text-primary border border-transparent hover:border-border/50"
                }`}
            >
              <span className={`text-[8px] font-mono font-bold mb-1 opacity-50 ${currentView === item.id ? 'text-white' : 'text-primary'}`}>
                {item.id.toUpperCase()}_LINK // {item.icon}
              </span>
              <div className="font-mono font-bold text-[11px] uppercase tracking-widest">{item.label}</div>
              <div className={`text-[9px] font-mono leading-tight opacity-40 mt-1 ${currentView === item.id ? 'text-white' : 'text-text-secondary'}`}>
                {item.desc}
              </div>
              {currentView === item.id && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white animate-ping"></div>
              )}
            </button>
          ))}
        </nav>

        {/* System Metrics */}
        <div className="p-6 border-t border-border/20 bg-background/20 space-y-4">
          <div className="flex flex-col gap-3">
            {[
              { label: "Neural_Load", val: 42, color: "bg-primary" },
              { label: "Sync_Index", val: 88, color: "bg-accent" },
              { label: "Buffer_Cap", val: 12, color: "bg-secondary" },
            ].map((metric) => (
              <div key={metric.label} className="space-y-1.5">
                <div className="flex justify-between text-[8px] font-mono font-bold uppercase tracking-tighter opacity-50">
                  <span>{metric.label}</span>
                  <span>{metric.val}%</span>
                </div>
                <div className="h-1 w-full bg-border/20 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${metric.color} transition-all duration-1000 ease-out`}
                    style={{ width: `${metric.val}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
          <div className="pt-2 flex items-center justify-between">
            <div className="text-[8px] font-mono text-text-secondary opacity-30 uppercase tracking-[0.2em]">Uplink_Secure</div>
            <div className="w-2 h-2 rounded-full bg-accent animate-pulse"></div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden z-10 relative">
        {/* Main Workspace CRT Overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.012] z-50 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.04),rgba(0,255,0,0.01),rgba(0,0,255,0.04))] bg-[length:100%_3px,3px_100%]"></div>

        {/* Header */}
        <header className="px-8 py-6 border-b border-border/80 bg-background/80 backdrop-blur-xl shrink-0">
          <div className="flex items-center justify-between">
            <div className="animate-in fade-in slide-in-from-left-6 duration-1000">
              <h2 className="text-xs font-mono font-bold text-primary uppercase tracking-[0.5em] drop-shadow-[0_0_8px_rgba(var(--primary-rgb),0.3)]">
                {currentView === "dictate" && "Neural_Dictation_Module"}
                {currentView === "voices" && "Vocal_Identity_Terminal"}
                {currentView === "commands" && "Command_Protocol_Registry"}
                {currentView === "test" && "Neural_Diagnostic_Array"}
              </h2>
              <p className="text-[10px] font-mono text-text-secondary uppercase opacity-40 mt-1.5 tracking-[0.2em]">
                {currentView === "dictate" && "Mode: Real-time_Neural_Capture // Status: Active"}
                {currentView === "voices" && "Mode: Identity_Relink // Status: Secure"}
                {currentView === "commands" && "Mode: Protocol_Registry_V2 // Status: Ready"}
                {currentView === "test" && "Mode: Diagnostic_Validation // Status: Deep_Scan"}
              </p>
            </div>

            <div className="flex items-center gap-4">
              <VoiceSelector />
              <div className="h-8 w-px bg-border/30 mx-2"></div>
              <ThemeToggle />
              <button
                onClick={() => setSettingsOpen(true)}
                className="p-3 rounded-xl bg-surface/50 border border-border text-text-secondary hover:text-text-primary hover:border-text-secondary/30 transition-all duration-300 group shadow-lg"
                title="System Configuration"
              >
                <svg className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              <div className="flex items-center gap-2.5 px-4 py-3 bg-surface/80 rounded-xl border border-border transition-all duration-300 shadow-md">
                {isLoading ? (
                  <span className="text-[10px] font-mono font-bold text-text-secondary animate-pulse px-2">PINGING...</span>
                ) : isConnected ? (
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-accent animate-pulse shadow-[0_0_8px_rgba(var(--accent-rgb),0.6)]"></span>
                    <span className="text-[10px] font-mono font-bold text-accent tracking-tighter uppercase">Link_Established</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-error shadow-[0_0_8px_rgba(var(--error-rgb),0.6)]"></span>
                    <span className="text-[10px] font-mono font-bold text-error tracking-tighter uppercase">Link_Severed</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-5xl mx-auto">
            {currentView === "dictate" && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 fill-mode-both">
                <div className="flex justify-center py-12">
                  <VoiceButton onTranscript={handleTranscript} />
                </div>
                <div className="delay-300 fill-mode-both">
                  <DictationDisplay
                    text={text}
                    onTextChange={(newText) => useDictationStore.getState().setText(newText)}
                    isRecording={isRecording}
                  />
                </div>
              </div>
            )}

            {currentView === "voices" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 fill-mode-both">
                <div className="bg-surface/90 backdrop-blur-lg rounded-xl border border-border/80 p-8 shadow-2xl relative overflow-hidden group transition-all duration-500 hover:border-primary/30">
                  <div className="absolute top-0 right-0 p-4 opacity-10 font-mono text-[10px] tracking-tighter uppercase pointer-events-none">Link_Storage_01</div>
                  <h3 className="text-[11px] font-mono font-bold uppercase tracking-widest mb-6 text-text-secondary opacity-70">Authenticated_Identities</h3>
                  <VoiceProfileList />
                </div>
                <div className="bg-surface/90 backdrop-blur-lg rounded-xl border border-border/80 p-8 shadow-2xl relative overflow-hidden group transition-all duration-500 hover:border-secondary/30">
                  <div className="absolute top-0 right-0 p-4 opacity-10 font-mono text-[10px] tracking-tighter uppercase pointer-events-none">Clone_Interface_04</div>
                  <h3 className="text-[11px] font-mono font-bold uppercase tracking-widest mb-6 text-text-secondary opacity-70">Neural_Identity_Cloning</h3>
                  <VoiceCloneForm />
                </div>
              </div>
            )}

            {currentView === "commands" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 fill-mode-both">
                <div className="bg-surface/90 backdrop-blur-lg rounded-xl border border-border/80 p-8 shadow-2xl relative overflow-hidden group transition-all duration-500 hover:border-primary/30">
                  <div className="absolute top-0 right-0 p-4 opacity-10 font-mono text-[10px] tracking-tighter uppercase pointer-events-none">Protocol_Dump_02</div>
                  <h3 className="text-[11px] font-mono font-bold uppercase tracking-widest mb-6 text-text-secondary opacity-70">Active_Link_Protocols</h3>
                  <CommandList />
                </div>
                <div className="bg-surface/90 backdrop-blur-lg rounded-xl border border-border/80 p-8 shadow-2xl relative overflow-hidden group transition-all duration-500 hover:border-secondary/30">
                  <div className="absolute top-0 right-0 p-4 opacity-10 font-mono text-[10px] tracking-tighter uppercase pointer-events-none">Registry_Forge_07</div>
                  <h3 className="text-[11px] font-mono font-bold uppercase tracking-widest mb-6 text-text-secondary opacity-70">Protocol_Forge_Interface</h3>
                  <CommandForm />
                </div>
              </div>
            )}

            {currentView === "test" && (
              <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000 fill-mode-both bg-surface/90 backdrop-blur-lg rounded-xl border border-border/80 p-8 shadow-2xl relative overflow-hidden group transition-all duration-500 hover:border-accent/30">
                <div className="absolute top-0 right-0 p-4 opacity-10 font-mono text-[10px] tracking-tighter uppercase pointer-events-none">Diagnostic_Core_09</div>
                <h3 className="text-[11px] font-mono font-bold uppercase tracking-widest mb-6 text-text-secondary opacity-70">Neural_Feedback_Diagnostics</h3>
                <CommandTester />
              </div>
            )}
          </div>
        </div>

        <footer className="px-8 py-4 border-t border-border/30 bg-background/20 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-[9px] font-mono uppercase tracking-widest text-text-secondary opacity-40">
              <span className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-primary"></span>
                CORE_BUILD_v0.9.4_RC
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-accent"></span>
                UPLINK_STABLE
              </span>
            </div>
            <div className="flex items-center gap-4 text-[9px] font-mono text-text-secondary opacity-30 hover:opacity-100 transition-opacity uppercase tracking-tighter">
              <span>Hyper-optimized Neural Processing Core</span>
              <span className="h-3 w-px bg-border"></span>
              <span>Proprietary Neural Link protocol v2.1.0</span>
            </div>
          </div>
        </footer>
      </main>

      <SettingsPanel isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

export default App;
