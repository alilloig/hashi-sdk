/**
 * HashiConfig: configuration management for the Hashi SDK.
 *
 * Tracks the three essential object IDs needed to interact with the
 * Hashi bridge on-chain:
 *   - packageId: the published package address (current version)
 *   - originalPackageId: the original package address (for type resolution)
 *   - hashiObjectId: the shared Hashi state object
 *
 * Provides mainnet/testnet presets and validation.
 */

import { HashiConfigError } from '../errors.js';

/** The set of values that configure an SDK instance. */
export interface HashiConfigOptions {
	/** The current (potentially upgraded) package ID. */
	packageId: string;
	/** The original package ID used for type resolution (e.g. BTC coin type). */
	originalPackageId: string;
	/** The shared Hashi state object ID. */
	hashiObjectId: string;
}

/**
 * Validates that a string looks like a Sui address / object ID:
 * 0x-prefixed, lowercase hex, 66 characters total (32 bytes).
 */
function isValidSuiAddress(value: string): boolean {
	return /^0x[0-9a-f]{64}$/.test(value);
}

// ---- Network Presets ----

/**
 * Placeholder mainnet configuration.
 * Object IDs should be updated once the bridge is deployed to mainnet.
 */
export const MAINNET_CONFIG: HashiConfigOptions = {
	packageId: '0x' + '0'.repeat(64),
	originalPackageId: '0x' + '0'.repeat(64),
	hashiObjectId: '0x' + '0'.repeat(64),
};

/**
 * Placeholder testnet configuration.
 * Object IDs should be updated once the bridge is deployed to testnet.
 */
export const TESTNET_CONFIG: HashiConfigOptions = {
	packageId: '0x' + '0'.repeat(64),
	originalPackageId: '0x' + '0'.repeat(64),
	hashiObjectId: '0x' + '0'.repeat(64),
};

export type NetworkPreset = 'mainnet' | 'testnet';

const PRESETS: Record<NetworkPreset, HashiConfigOptions> = {
	mainnet: MAINNET_CONFIG,
	testnet: TESTNET_CONFIG,
};

// ---- HashiConfig Class ----

export class HashiConfig {
	readonly packageId: string;
	readonly originalPackageId: string;
	readonly hashiObjectId: string;

	/**
	 * Create a HashiConfig.
	 *
	 * @param options - Either a network preset name or explicit config values.
	 *                  When using a preset, individual fields can be overridden.
	 *
	 * @example
	 * ```ts
	 * // From a preset
	 * const cfg = new HashiConfig('testnet');
	 *
	 * // From explicit values
	 * const cfg = new HashiConfig({
	 *   packageId: '0x...',
	 *   originalPackageId: '0x...',
	 *   hashiObjectId: '0x...',
	 * });
	 *
	 * // Preset with overrides
	 * const cfg = new HashiConfig('testnet', { packageId: '0x...' });
	 * ```
	 */
	constructor(
		presetOrOptions: NetworkPreset | HashiConfigOptions,
		overrides?: Partial<HashiConfigOptions>,
	) {
		let resolved: HashiConfigOptions;

		if (typeof presetOrOptions === 'string') {
			const preset = PRESETS[presetOrOptions];
			if (!preset) {
				throw new HashiConfigError(
					`Unknown network preset "${presetOrOptions}". Valid presets: ${Object.keys(PRESETS).join(', ')}`,
				);
			}
			resolved = { ...preset, ...overrides };
		} else {
			resolved = { ...presetOrOptions, ...overrides };
		}

		// Validate all required fields
		this.packageId = HashiConfig.validateAddress(resolved.packageId, 'packageId');
		this.originalPackageId = HashiConfig.validateAddress(
			resolved.originalPackageId,
			'originalPackageId',
		);
		this.hashiObjectId = HashiConfig.validateAddress(
			resolved.hashiObjectId,
			'hashiObjectId',
		);
	}

	/**
	 * Validate that a value is a well-formed Sui address.
	 * Returns the validated value or throws HashiConfigError.
	 */
	private static validateAddress(value: unknown, fieldName: string): string {
		if (typeof value !== 'string') {
			throw new HashiConfigError(`${fieldName} must be a string, got ${typeof value}`);
		}
		if (!isValidSuiAddress(value)) {
			throw new HashiConfigError(
				`${fieldName} must be a valid Sui address (0x-prefixed, lowercase hex, 66 characters). Got: "${value}"`,
			);
		}
		return value;
	}

	/**
	 * Construct the BTC coin type string for this deployment.
	 * The BTC coin type uses the original package ID.
	 */
	get btcCoinType(): string {
		return `${this.originalPackageId}::btc::BTC`;
	}
}
