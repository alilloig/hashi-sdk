/**
 * Devnet configuration constants for the Hashi SDK Dashboard.
 *
 * All values are hardcoded for the Sui devnet deployment.
 */

/** The current (and original) Hashi package ID on devnet. */
export const packageId =
  '0xe87f0c85488c5c442612103a08e5df93d2f190cdb0456b667f5257be506aefc7';

/** The original package ID (same as packageId since devnet has not been upgraded). */
export const originalPackageId = packageId;

/** The shared Hashi state object ID on devnet. */
export const hashiObjectId =
  '0x3b8013407b5caaceb9dbfce56c45987c8e778c2302fc712bd52db093f5997c04';

/** Sui devnet full node RPC URL. */
export const rpcUrl = 'https://fullnode.devnet.sui.io';

/** Sui devnet faucet URL. */
export const faucetUrl = 'https://faucet.devnet.sui.io';

/** Bitcoin Testnet4 faucet (external link). */
export const btcFaucetLink = 'https://mempool.space/testnet4/faucet';
