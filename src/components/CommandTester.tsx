import { useState } from 'react';
import { commandsApi } from '../api/commands';

export function CommandTester() {
  const [testInput, setTestInput] = useState('');
  const [result, setResult] = useState<{
    matched: boolean;
    success: boolean;
    output?: unknown;
    error?: string;
    trigger?: string;
    action_type?: string;
  } | null>(null);
  const [testing, setTesting] = useState(false);

  const handleTest = async () => {
    if (!testInput.trim()) return;

    setTesting(true);
    try {
      const response = await commandsApi.execute(testInput);
      setResult(response);
    } catch (err) {
      setResult({
        matched: false,
        success: false,
        error: err instanceof Error ? err.message : 'Datalink failure: Test aborted',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleTest();
    }
  };

  return (
    <div className="bg-surface/30 backdrop-blur-md border border-border rounded-xl p-6 shadow-xl relative overflow-hidden group">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-primary/10 transition-all duration-700"></div>

      <div className="relative flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-mono font-bold text-text-primary uppercase tracking-[0.2em]">Protocol_Scanner</h3>
          <p className="text-xs font-mono text-text-secondary uppercase mt-1 opacity-70 tracking-wider">
            Verify neural command mapping
          </p>
        </div>
        <div className="flex gap-1">
          <div className="w-1 h-1 rounded-full bg-primary animate-pulse"></div>
          <div className="w-1 h-1 rounded-full bg-primary animate-pulse delay-75"></div>
          <div className="w-1 h-1 rounded-full bg-primary animate-pulse delay-150"></div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="relative">
          <textarea
            value={testInput}
            onChange={(e) => setTestInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Input_Stream [e.g. 'execute signature_injection']"
            rows={3}
            className="w-full bg-background/50 border border-border rounded-xl px-4 py-3 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all text-text-primary placeholder:text-text-secondary/20 resize-none shadow-inner custom-scrollbar"
          />
          <div className="absolute bottom-3 right-3 text-[10px] font-mono tracking-widest text-text-secondary opacity-50 pointer-events-none">
            CTRL + ENTER_TO_COMMIT
          </div>
        </div>

        <button
          onClick={handleTest}
          disabled={testing || !testInput.trim()}
          className="w-full py-3 px-6 rounded-xl font-mono font-bold text-xs uppercase tracking-widest transition-all focus:outline-none focus:ring-2 focus:ring-primary/50
            bg-primary text-white shadow-neon hover:bg-primary/90 
            disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
        >
          {testing ? 'Analyzing...' : 'Initialize_Scan'}
        </button>
      </div>

      {result && (
        <div className={`mt-6 p-5 border rounded-xl transition-all duration-500 animate-in fade-in slide-in-from-top-2
          ${result.matched
            ? 'bg-primary/5 border-primary/20 shadow-sm'
            : 'bg-error/5 border-error/20'}`}
        >
          {result.matched ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-primary animate-ping"></span>
                  <span className="text-xs font-mono font-bold text-primary uppercase tracking-widest">Match_Found</span>
                </div>
                {result.success ? (
                  <span className="text-xs font-mono font-bold text-accent uppercase tracking-widest px-2 py-0.5 bg-accent/10 rounded border border-accent/20">Executed</span>
                ) : (
                  <span className="text-xs font-mono font-bold text-error uppercase tracking-widest px-2 py-0.5 bg-error/10 rounded border border-error/20">Fault</span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 py-3 border-y border-border/50">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-mono text-text-secondary uppercase opacity-70 tracking-wider">Trigger</span>
                  <span className="text-xs font-mono font-bold text-text-primary tracking-tight">{result.trigger}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-mono text-text-secondary uppercase opacity-70 tracking-wider">Action_Type</span>
                  <span className="text-xs font-mono font-bold text-text-primary tracking-tight uppercase">{result.action_type || 'Unknown'}</span>
                </div>
              </div>

              {!!result.output && (
                <div className="mt-2">
                  <span className="text-xs font-mono tracking-wider text-text-secondary uppercase opacity-70 mb-1 block">Output_Payload</span>
                  <div className="bg-background/80 rounded-lg p-3 border border-border">
                    <pre className="text-xs font-mono text-primary/80 overflow-x-auto custom-scrollbar">
                      {JSON.stringify(result.output, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {result.error && (
                <div className="mt-2 text-error font-mono text-xs uppercase tracking-wider flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-error"></span>
                  ERROR: {result.error}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center text-center gap-2">
              <div className="w-8 h-8 rounded-full bg-error/10 flex items-center justify-center mb-1">
                <span className="text-error text-lg">!</span>
              </div>
              <span className="text-xs font-mono font-bold text-text-primary uppercase tracking-wider">Null_Reference</span>
              <span className="text-[10px] font-mono text-text-secondary uppercase opacity-70 tracking-wider">
                Input stream does not match active protocols
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
