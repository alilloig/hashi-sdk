/**
 * React context that provides a HashiClient instance to all child components.
 *
 * The client is initialized once with devnet configuration and shared
 * throughout the component tree.
 */

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { HashiClient } from 'hashi-sdk/client';
import { SuiJsonRpcClient } from '@mysten/sui/jsonRpc';
import { packageId, originalPackageId, hashiObjectId, rpcUrl } from '../config';

const HashiClientContext = createContext<HashiClient | null>(null);

interface HashiClientProviderProps {
  children: ReactNode;
}

/**
 * Provider that creates and holds a HashiClient instance for the devnet deployment.
 * Wrap your app (or a subtree) with this to make the client available via useHashiClient().
 */
export function HashiClientProvider({ children }: HashiClientProviderProps) {
  const client = useMemo(() => {
    const suiClient = new SuiJsonRpcClient({
      network: 'devnet',
      url: rpcUrl,
    });
    return new HashiClient({
      client: suiClient.core,
      config: {
        packageId,
        originalPackageId,
        hashiObjectId,
      },
    });
  }, []);

  return (
    <HashiClientContext.Provider value={client}>
      {children}
    </HashiClientContext.Provider>
  );
}

/**
 * Hook to access the HashiClient from context.
 * Must be used inside a HashiClientProvider.
 */
export function useHashiClient(): HashiClient {
  const client = useContext(HashiClientContext);
  if (!client) {
    throw new Error('useHashiClient must be used within a HashiClientProvider');
  }
  return client;
}
