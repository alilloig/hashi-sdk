/**
 * Input validation helpers for transaction builders.
 *
 * All validation runs synchronously before the PTB closure is returned.
 * Invalid input throws HashiTransactionError.
 */

import { HashiTransactionError } from '../errors.js';
import { normalizeSuiAddress } from '../utils/config.js';

/** Maximum value for a Move u64. */
const U64_MAX = 18446744073709551615n;

/**
 * Validate and normalize a value as a u64-compatible bigint.
 *
 * Accepts bigint or number (must be a safe integer).
 * Must be non-negative and fit in u64 range [0, 2^64 - 1].
 *
 * @param value - The value to validate.
 * @param fieldName - Name of the field, used in error messages.
 * @returns The validated value as bigint.
 * @throws HashiTransactionError if the value is invalid.
 */
export function validateU64(value: bigint | number, fieldName: string): bigint {
	let result: bigint;

	if (typeof value === 'number') {
		if (!Number.isSafeInteger(value)) {
			throw new HashiTransactionError(
				`${fieldName} must be a safe integer when passed as number, got ${value}`,
			);
		}
		result = BigInt(value);
	} else if (typeof value === 'bigint') {
		result = value;
	} else {
		throw new HashiTransactionError(
			`${fieldName} must be a bigint or number, got ${typeof value}`,
		);
	}

	if (result < 0n) {
		throw new HashiTransactionError(
			`${fieldName} must be non-negative, got ${result}`,
		);
	}

	if (result > U64_MAX) {
		throw new HashiTransactionError(
			`${fieldName} must fit in u64 (max ${U64_MAX}), got ${result}`,
		);
	}

	return result;
}

/**
 * Validate a Bitcoin transaction ID (txid).
 *
 * Must be a 64-character hex string (display byte order).
 * Normalizes to Sui address format (0x-prefixed, lowercase, 66 chars).
 *
 * @param txid - The Bitcoin txid as a 64-char hex string.
 * @returns The normalized txid in Sui address format.
 * @throws HashiTransactionError if the txid is invalid.
 */
export function validateTxid(txid: string): string {
	if (typeof txid !== 'string') {
		throw new HashiTransactionError(
			`txid must be a string, got ${typeof txid}`,
		);
	}

	// Strip 0x prefix for length check
	let hex = txid.toLowerCase();
	if (hex.startsWith('0x')) {
		hex = hex.slice(2);
	}

	if (hex.length !== 64) {
		throw new HashiTransactionError(
			`txid must be exactly 64 hex characters (got ${hex.length}): "${txid}"`,
		);
	}

	if (!/^[0-9a-f]+$/.test(hex)) {
		throw new HashiTransactionError(
			`txid contains invalid hex characters: "${txid}"`,
		);
	}

	return normalizeSuiAddress(txid);
}

/**
 * Validate and normalize a Sui address.
 *
 * Wraps normalizeSuiAddress but throws HashiTransactionError
 * instead of HashiConfigError.
 *
 * @param address - The address to validate.
 * @param fieldName - Name of the field, used in error messages.
 * @returns The normalized address.
 * @throws HashiTransactionError if the address is invalid.
 */
export function validateAddress(address: string, fieldName: string): string {
	if (typeof address !== 'string') {
		throw new HashiTransactionError(
			`${fieldName} must be a string, got ${typeof address}`,
		);
	}

	try {
		return normalizeSuiAddress(address);
	} catch {
		throw new HashiTransactionError(
			`${fieldName} is not a valid Sui address: "${address}"`,
		);
	}
}

/**
 * Validate a vout (output index) as a u32.
 *
 * Must be a non-negative integer that fits in u32 range [0, 2^32 - 1].
 *
 * @param vout - The output index.
 * @returns The validated vout.
 * @throws HashiTransactionError if the vout is invalid.
 */
export function validateVout(vout: number): number {
	if (typeof vout !== 'number' || !Number.isInteger(vout)) {
		throw new HashiTransactionError(
			`vout must be an integer, got ${vout}`,
		);
	}

	if (vout < 0 || vout > 0xFFFFFFFF) {
		throw new HashiTransactionError(
			`vout must be in range [0, ${0xFFFFFFFF}], got ${vout}`,
		);
	}

	return vout;
}

/**
 * Validate a Bitcoin address as bytes.
 *
 * For Uint8Array: validates length is 20 or 32 bytes.
 * For string: treats as hex string and decodes to bytes.
 *
 * @param bitcoinAddress - The Bitcoin address as Uint8Array or hex string.
 * @returns The validated address as Uint8Array.
 * @throws HashiTransactionError if the address is invalid.
 */
export function validateBitcoinAddress(bitcoinAddress: string | Uint8Array): Uint8Array {
	if (bitcoinAddress instanceof Uint8Array) {
		if (bitcoinAddress.length !== 20 && bitcoinAddress.length !== 32) {
			throw new HashiTransactionError(
				`bitcoinAddress byte length must be 20 or 32, got ${bitcoinAddress.length}`,
			);
		}
		return bitcoinAddress;
	}

	if (typeof bitcoinAddress === 'string') {
		let hex = bitcoinAddress;
		if (hex.startsWith('0x')) {
			hex = hex.slice(2);
		}

		if (hex.length % 2 !== 0) {
			throw new HashiTransactionError(
				`bitcoinAddress hex string must have even length, got ${hex.length}`,
			);
		}

		if (!/^[0-9a-fA-F]*$/.test(hex)) {
			throw new HashiTransactionError(
				`bitcoinAddress contains invalid hex characters: "${bitcoinAddress}"`,
			);
		}

		const bytes = new Uint8Array(hex.length / 2);
		for (let i = 0; i < hex.length; i += 2) {
			bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
		}

		if (bytes.length !== 20 && bytes.length !== 32) {
			throw new HashiTransactionError(
				`bitcoinAddress decoded byte length must be 20 or 32, got ${bytes.length}`,
			);
		}

		return bytes;
	}

	throw new HashiTransactionError(
		`bitcoinAddress must be a Uint8Array or hex string, got ${typeof bitcoinAddress}`,
	);
}
