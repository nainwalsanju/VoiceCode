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
  
  // Use store for dictation
  const { text, isRecording, appendText } = useDictationStore();
  
  const handleTranscript = (newText: string) => {
    appendText(newText);
  };

  return (
    <main className="min-h-screen flex flex-col bg-slate-900 text-slate-50">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-slate-800">
        <h1 className="text-xl font-bold text-indigo-400">VoiceCode</h1>
        
        {/* Navigation */}
        <nav className="flex gap-2">
          {[
            { id: "dictate", label: "Dictate", icon: "🎤" },
            { id: "voices", label: "Voices", icon: "🎭" },
            { id: "commands", label: "Commands", icon: "⚡" },
            { id: "test", label: "Test", icon: "🧪" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id as View)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                currentView === item.id
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-700 text-slate-300 hover:bg-slate-600"
              }`}
            >
              <span className="mr-2">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          {/* Voice Selector */}
          <VoiceSelector />
          
          {/* Settings */}
          <button
            onClick={() => setSettingsOpen(true)}
            className="p-2 rounded-lg hover:bg-slate-700 transition-colors"
            title="Settings"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          
          {/* Backend Status */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">Backend:</span>
            {isLoading ? (
              <span className="text-slate-400">Checking...</span>
            ) : isConnected ? (
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                Connected
              </span>
            ) : (
              <span className="flex items-center gap-1 text-red-400">
                <span className="w-2 h-2 rounded-full bg-red-400"></span>
                Disconnected
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 p-6">
        {currentView === "dictate" && (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold mb-6">Voice Dictation</h2>
            
            {/* Voice Button */}
            <div className="flex justify-center mb-8">
              <VoiceButton onTranscript={handleTranscript} />
            </div>
            
            {/* Dictation Display */}
            <DictationDisplay 
              text={text} 
              onTextChange={(newText) => useDictationStore.getState().setText(newText)}
              isRecording={isRecording}
            />
          </div>
        )}

        {currentView === "voices" && (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold mb-6">Voice Profiles</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Your Voices</h3>
                <VoiceProfileList />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-4">Clone New Voice</h3>
                <VoiceCloneForm />
              </div>
            </div>
          </div>
        )}

        {currentView === "commands" && (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold mb-6">Voice Commands</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Your Commands</h3>
                <CommandList />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-4">Create Command</h3>
                <CommandForm />
              </div>
            </div>
          </div>
        )}

        {currentView === "test" && (
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-6">Test Commands</h2>
            <CommandTester />
          </div>
        )}
      </div>

      {/* Settings Modal */}
      <SettingsPanel isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </main>
  );
}

export default App;
