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
 * Normalizes a Sui address/object ID to canonical form:
 * 0x-prefixed, lowercase, zero-padded to 66 chars.
 * Accepts with or without 0x prefix, any case, shorter hex.
 * Throws HashiConfigError for non-hex or too-long input.
 */
export function normalizeSuiAddress(value: string): string {
	let hex = value.toLowerCase();
	if (hex.startsWith('0x')) {
		hex = hex.slice(2);
	}
	if (!/^[0-9a-f]+$/.test(hex)) {
		throw new HashiConfigError(
			`Invalid hex characters in address: "${value}"`,
		);
	}
	if (hex.length > 64) {
		throw new HashiConfigError(
			`Address too long (max 64 hex chars without 0x prefix): "${value}"`,
		);
	}
	return '0x' + hex.padStart(64, '0');
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
	 * Validate and normalize a Sui address/object ID.
	 * Accepts any hex string (with/without 0x, any case, shorter than 64 chars)
	 * and returns the canonical 0x-prefixed, lowercase, 66-char form.
	 */
	private static validateAddress(value: unknown, fieldName: string): string {
		if (typeof value !== 'string') {
			throw new HashiConfigError(`${fieldName} must be a string, got ${typeof value}`);
		}
		try {
			return normalizeSuiAddress(value);
		} catch (e) {
			throw new HashiConfigError(
				`${fieldName}: ${e instanceof Error ? e.message : String(e)}`,
			);
		}
	}

	/**
	 * Construct the BTC coin type string for this deployment.
	 * The BTC coin type uses the original package ID.
	 */
	get btcCoinType(): string {
		return `${this.originalPackageId}::btc::BTC`;
	}
}
