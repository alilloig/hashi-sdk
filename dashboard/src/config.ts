/**
 * Devnet configuration for the Hashi SDK Dashboard.
 *
 * Default values point to the last known Sui devnet deployment.
 * Users can override these via the Settings panel (persisted in localStorage).
 *
 * NOTE: Sui devnet resets periodically, wiping all deployed objects.
 * After a reset, update these IDs or use the Settings panel.
 */

const STORAGE_KEY = 'hashi-dashboard-config';

/** Default IDs from the last known deployment (may be stale after devnet reset). */
const DEFAULTS = {
  packageId:
    '0xe87f0c85488c5c442612103a08e5df93d2f190cdb0456b667f5257be506aefc7',
  hashiObjectId:
    '0x3b8013407b5caaceb9dbfce56c45987c8e778c2302fc712bd52db093f5997c04',
} as const;

export interface HashiDashboardConfig {
  packageId: string;
  originalPackageId: string;
  hashiObjectId: string;
}

/** Load config from localStorage, falling back to defaults. */
export function loadConfig(): HashiDashboardConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<HashiDashboardConfig>;
      if (parsed.packageId && parsed.hashiObjectId) {
        return {
          packageId: parsed.packageId,
          originalPackageId: parsed.originalPackageId ?? parsed.packageId,
          hashiObjectId: parsed.hashiObjectId,
        };
      }
    }
  } catch {
    // Ignore parse errors, use defaults
  }
  return {
    packageId: DEFAULTS.packageId,
    originalPackageId: DEFAULTS.packageId,
    hashiObjectId: DEFAULTS.hashiObjectId,
  };
}

/** Save config to localStorage. */
export function saveConfig(config: HashiDashboardConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

/** Clear saved config, reverting to defaults. */
export function clearConfig(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/** Sui devnet full node RPC URL. */
export const rpcUrl = 'https://fullnode.devnet.sui.io';

/** Sui devnet faucet URL. */
export const faucetUrl = 'https://faucet.devnet.sui.io';

/** Bitcoin Testnet4 faucet (external link). */
export const btcFaucetLink = 'https://mempool.space/testnet4/faucet';
