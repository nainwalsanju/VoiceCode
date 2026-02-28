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
import { useDictationStore } from "./store/dictationStore";

type View = "dictate" | "voices" | "commands" | "test";

function App() {
  const [currentView, setCurrentView] = useState<View>("dictate");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { isConnected, isLoading } = useBackendStatus();

  const { text, isRecording, appendText } = useDictationStore();

  const handleTranscript = (newText: string) => {
    // The STT backend streams cumulative text over the single session, so we overwrite the state.
    useDictationStore.getState().setText(newText);
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-800/50 backdrop-blur-xl border-r border-slate-700/50 flex flex-col">
        {/* Logo */}
        <div className="p-4 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                VoiceCode
              </h1>
              <p className="text-xs text-slate-500">Voice Coding App</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-2">
          {[
            { id: "dictate" as View, label: "Dictate", icon: "🎤", desc: "Voice dictation" },
            { id: "voices" as View, label: "Voices", icon: "🎭", desc: "Voice profiles" },
            { id: "commands" as View, label: "Commands", icon: "⚡", desc: "Voice commands" },
            { id: "test" as View, label: "Test", icon: "🧪", desc: "Test commands" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${currentView === item.id
                  ? "bg-gradient-to-r from-indigo-600/20 to-purple-600/20 text-indigo-400 border border-indigo-500/30"
                  : "text-slate-400 hover:bg-slate-700/50 hover:text-slate-200 border border-transparent"
                }`}
            >
              <span>{item.icon}</span>
              <div className="text-left">
                <div className="font-medium">{item.label}</div>
                <div className="text-xs text-slate-500">{item.desc}</div>
              </div>
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="px-6 py-4 border-b border-slate-700/50 bg-slate-800/30 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">
                {currentView === "dictate" && "Voice Dictation"}
                {currentView === "voices" && "Voice Profiles"}
                {currentView === "commands" && "Voice Commands"}
                {currentView === "test" && "Test Commands"}
              </h2>
              <p className="text-sm text-slate-400">
                {currentView === "dictate" && "Speak and your words will appear here"}
                {currentView === "voices" && "Manage your cloned voices"}
                {currentView === "commands" && "Create and manage voice commands"}
                {currentView === "test" && "Test your voice commands"}
              </p>
            </div>

            <div className="flex items-center gap-4">
              <VoiceSelector />
              <button
                onClick={() => setSettingsOpen(true)}
                className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:text-white hover:border-slate-600 transition-all"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 rounded-lg border border-slate-700/50">
                {isLoading ? (
                  <span className="text-sm text-slate-400">Checking...</span>
                ) : isConnected ? (
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-sm text-emerald-400">Connected</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                    <span className="text-sm text-red-400">Disconnected</span>
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
              <div className="space-y-6">
                <div className="flex justify-center py-8">
                  <VoiceButton onTranscript={handleTranscript} />
                </div>
                <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
                  <DictationDisplay
                    text={text}
                    onTextChange={(newText) => useDictationStore.getState().setText(newText)}
                    isRecording={isRecording}
                  />
                </div>
              </div>
            )}

            {currentView === "voices" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
                  <h3 className="text-lg font-semibold mb-4">Your Voices</h3>
                  <VoiceProfileList />
                </div>
                <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
                  <h3 className="text-lg font-semibold mb-4">Clone New Voice</h3>
                  <VoiceCloneForm />
                </div>
              </div>
            )}

            {currentView === "commands" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
                  <h3 className="text-lg font-semibold mb-4">Your Commands</h3>
                  <CommandList />
                </div>
                <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
                  <h3 className="text-lg font-semibold mb-4">Create Command</h3>
                  <CommandForm />
                </div>
              </div>
            )}

            {currentView === "test" && (
              <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
                <h3 className="text-lg font-semibold mb-4">Test Commands</h3>
                <CommandTester />
              </div>
            )}
          </div>
        </div>

        <footer className="px-6 py-3 border-t border-slate-700/50 bg-slate-800/30">
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>VoiceCode v0.1.0</span>
            <span>Powered by Edge TTS & Faster Whisper</span>
          </div>
        </footer>
      </main>

      <SettingsPanel isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

export default App;
