import { useState, useEffect } from 'react';
import { apiClient } from '../api/client';

export function useBackendStatus() {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkHealth = async () => {
    try {
      const health: { status: string; service: string } = await apiClient.healthCheck();
      setIsConnected(health.status === 'healthy');
      setError(null);
    } catch (err) {
      setIsConnected(false);
      setError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  return { isConnected, isLoading, error, refetch: checkHealth };
}
