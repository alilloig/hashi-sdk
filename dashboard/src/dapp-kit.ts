/**
 * DAppKit instance configuration for Sui devnet.
 *
 * Creates a singleton dapp-kit instance configured for the devnet network.
 * Uses SuiJsonRpcClient for JSON-RPC communication with the Sui full node.
 */

import { createDAppKit } from '@mysten/dapp-kit-core';
import { SuiJsonRpcClient } from '@mysten/sui/jsonRpc';
import { rpcUrl } from './config';

export const dAppKit = createDAppKit({
  networks: ['devnet'] as const,
  defaultNetwork: 'devnet',
  createClient: () =>
    new SuiJsonRpcClient({ network: 'devnet', url: rpcUrl }),
});

/** Register the dAppKit type for hook type inference. */
declare module '@mysten/dapp-kit-react' {
  interface Register {
    dAppKit: typeof dAppKit;
  }
}
