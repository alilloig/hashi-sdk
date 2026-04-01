/**
 * React context that provides a HashiClient instance to all child components.
 *
 * The client is initialized once with devnet configuration and shared
 * throughout the component tree.
 */

import { createContext, useContext, useMemo, useState, useCallback, type ReactNode } from 'react';
import { HashiClient } from 'hashi-sdk/client';
import { SuiJsonRpcClient } from '@mysten/sui/jsonRpc';
import { loadConfig, saveConfig, clearConfig, rpcUrl, type HashiDashboardConfig } from '../config';

interface HashiClientContextValue {
  client: HashiClient;
  config: HashiDashboardConfig;
  updateConfig: (config: HashiDashboardConfig) => void;
  resetConfig: () => void;
}

const HashiClientContext = createContext<HashiClientContextValue | null>(null);

interface HashiClientProviderProps {
  children: ReactNode;
}

function createClient(config: HashiDashboardConfig): HashiClient {
  const suiClient = new SuiJsonRpcClient({
    network: 'devnet',
    url: rpcUrl,
  });
  return new HashiClient({
    client: suiClient.core,
    config: {
      packageId: config.packageId,
      originalPackageId: config.originalPackageId,
      hashiObjectId: config.hashiObjectId,
    },
  });
}

/**
 * Provider that creates and holds a HashiClient instance for the devnet deployment.
 * Config is loaded from localStorage (if saved) or falls back to defaults.
 * Can be updated at runtime via the Settings panel.
 */
export function HashiClientProvider({ children }: HashiClientProviderProps) {
  const [config, setConfig] = useState<HashiDashboardConfig>(loadConfig);

  const client = useMemo(() => createClient(config), [config]);

  const updateConfig = useCallback((newConfig: HashiDashboardConfig) => {
    saveConfig(newConfig);
    setConfig(newConfig);
  }, []);

  const resetConfig = useCallback(() => {
    clearConfig();
    setConfig(loadConfig());
  }, []);

  const value = useMemo(
    () => ({ client, config, updateConfig, resetConfig }),
    [client, config, updateConfig, resetConfig],
  );

  return (
    <HashiClientContext.Provider value={value}>
      {children}
    </HashiClientContext.Provider>
  );
}

/** Hook to access the HashiClient from context. */
export function useHashiClient(): HashiClient {
  const ctx = useContext(HashiClientContext);
  if (!ctx) {
    throw new Error('useHashiClient must be used within a HashiClientProvider');
  }
  return ctx.client;
}

/** Hook to access and update the dashboard config. */
export function useHashiConfig() {
  const ctx = useContext(HashiClientContext);
  if (!ctx) {
    throw new Error('useHashiConfig must be used within a HashiClientProvider');
  }
  return { config: ctx.config, updateConfig: ctx.updateConfig, resetConfig: ctx.resetConfig };
}
