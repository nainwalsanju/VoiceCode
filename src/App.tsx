import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useBackendStatus } from "./hooks/useBackendStatus";

function App() {
  const [greetMsg, setGreetMsg] = useState("");
  const [name, setName] = useState("");
  const { isConnected, isLoading } = useBackendStatus();

  async function greet() {
    setGreetMsg(await invoke("greet", { name }));
  }

  return (
    <main className="min-h-screen flex flex-col bg-background text-text-primary">
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
        <h1 className="text-xl font-bold">VoiceCode</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-secondary">Backend:</span>
            {isLoading ? (
              <span className="text-text-secondary">Checking...</span>
            ) : isConnected ? (
              <span className="flex items-center gap-1 text-success">
                <span className="w-2 h-2 rounded-full bg-success"></span>
                Connected
              </span>
            ) : (
              <span className="flex items-center gap-1 text-error">
                <span className="w-2 h-2 rounded-full bg-error"></span>
                Disconnected
              </span>
            )}
          </div>
        </div>
      </header>
      
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="flex gap-8 mb-8">
          <a href="https://vite.dev" target="_blank" className="text-primary hover:opacity-80 transition-opacity">
            <img src="/vite.svg" className="h-24" alt="Vite logo" />
          </a>
          <a href="https://tauri.app" target="_blank" className="text-primary hover:opacity-80 transition-opacity">
            <img src="/tauri.svg" className="h-24" alt="Tauri logo" />
          </a>
          <a href="https://react.dev" target="_blank" className="text-primary hover:opacity-80 transition-opacity">
            <img src="/react.svg" className="h-24" alt="React logo" />
          </a>
        </div>
        
        <p className="text-text-secondary mb-8">Voice coding application powered by Tauri + React</p>

        <form className="flex gap-4" onSubmit={(e) => { e.preventDefault(); greet(); }}>
          <input
            id="greet-input"
            onChange={(e) => setName(e.currentTarget.value)}
            placeholder="Enter a name..."
            className="px-4 py-2 rounded-lg bg-surface border border-slate-600 text-text-primary placeholder-text-secondary focus:outline-none focus:border-primary"
          />
          <button type="submit" className="px-6 py-2 rounded-lg bg-primary text-white font-medium hover:opacity-90 transition-opacity">
            Greet
          </button>
        </form>
        {greetMsg && <p className="mt-4 text-accent">{greetMsg}</p>}
      </div>
    </main>
  );
}

export default App;
