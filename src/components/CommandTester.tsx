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
        error: err instanceof Error ? err.message : 'Test failed',
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
    <div className="command-tester">
      <h3>Command Tester</h3>
      <p className="tester-description">
        Enter text to test which command would be triggered
      </p>

      <div className="tester-input">
        <textarea
          value={testInput}
          onChange={(e) => setTestInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter text to test (e.g., 'insert signature')"
          rows={3}
        />
        <button onClick={handleTest} disabled={testing || !testInput.trim()}>
          {testing ? 'Testing...' : 'Test Command'}
        </button>
      </div>

      {result && (
        <div className={`tester-result ${result.matched ? 'matched' : 'no-match'}`}>
          {result.matched ? (
            <>
              <div className="result-header">
                <span className="result-label">Matched Command:</span>
                <span className="result-trigger">{result.trigger}</span>
                <span className="result-type">{result.action_type}</span>
              </div>
              <div className="result-status">
                {result.success ? (
                  <span className="status-success">Success</span>
                ) : (
                  <span className="status-error">Failed</span>
                )}
              </div>
              {result.output && (
                <div className="result-output">
                  <pre>{JSON.stringify(result.output, null, 2)}</pre>
                </div>
              )}
              {result.error && (
                <div className="result-error">
                  <pre>{result.error}</pre>
                </div>
              )}
            </>
          ) : (
            <div className="no-match-result">
              <span className="no-match-label">No matching command found</span>
              <span className="no-match-hint">
                Try creating a command with this trigger phrase
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
