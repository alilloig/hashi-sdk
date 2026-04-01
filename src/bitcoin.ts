/**
 * Bitcoin address encoding/decoding and amount conversion helpers.
 *
 * Supports BIP-173 (bech32, segwit v0) and BIP-350 (bech32m, taproot v1)
 * address formats.
 *
 * This module depends only on @scure/base (transitive dep of @noble/curves)
 * and does NOT import @mysten/sui.
 */

import { bech32, bech32m } from '@scure/base';
import { HashiBitcoinError } from './errors.js';

// ---- Constants ----

const MAINNET_HRP = 'bc';
const TESTNET_HRP = 'tb';
const VALID_HRPS = new Set([MAINNET_HRP, TESTNET_HRP]);

const SATS_PER_BTC = 100_000_000n;
const BTC_DECIMALS = 8;

// ---- Address Encoding ----

/**
 * Encode a Bitcoin witness program into a bech32/bech32m address.
 *
 * @param witnessProgram - The raw witness program bytes
 * @param witnessVersion - The segwit witness version (0 or 1)
 * @param network - 'mainnet' or 'testnet'
 * @returns The encoded Bitcoin address string
 *
 * @throws {HashiBitcoinError} If witnessVersion is unsupported or program length is invalid
 */
export function encodeBitcoinAddress(
	witnessProgram: Uint8Array,
	witnessVersion: number,
	network: 'mainnet' | 'testnet',
): string {
	const hrp = network === 'mainnet' ? MAINNET_HRP : TESTNET_HRP;

	if (witnessVersion === 0) {
		if (witnessProgram.length !== 20) {
			throw new HashiBitcoinError(
				`Witness version 0 requires a 20-byte program (P2WPKH), got ${witnessProgram.length} bytes`,
			);
		}
		const words = [witnessVersion, ...bech32.toWords(witnessProgram)];
		return bech32.encode(hrp, words);
	}

	if (witnessVersion === 1) {
		if (witnessProgram.length !== 32) {
			throw new HashiBitcoinError(
				`Witness version 1 requires a 32-byte program (P2TR), got ${witnessProgram.length} bytes`,
			);
		}
		const words = [witnessVersion, ...bech32m.toWords(witnessProgram)];
		return bech32m.encode(hrp, words);
	}

	throw new HashiBitcoinError(
		`Unsupported witness version: ${witnessVersion}. Only versions 0 (P2WPKH) and 1 (P2TR) are supported`,
	);
}

// ---- Address Decoding ----

/** Result of decoding a Bitcoin segwit address. */
export interface DecodedBitcoinAddress {
	/** The raw witness program bytes. */
	witnessProgram: Uint8Array;
	/** The segwit witness version (0 or 1). */
	witnessVersion: number;
	/** The network this address belongs to. */
	network: 'mainnet' | 'testnet';
}

/**
 * Decode a Bitcoin bech32/bech32m address.
 *
 * @param address - The Bitcoin address string (bc1... or tb1...)
 * @returns The decoded address components
 *
 * @throws {HashiBitcoinError} If the address is invalid, has a bad checksum,
 *   uses the wrong encoding for its witness version, or has an invalid
 *   program length
 */
export function decodeBitcoinAddress(address: string): DecodedBitcoinAddress {
	// Try both bech32 and bech32m decoding to determine the encoding used
	let decoded: { prefix: string; words: number[] } | undefined;
	let encoding: 'bech32' | 'bech32m' | undefined;

	try {
		decoded = bech32.decode(address as `${string}1${string}`);
		encoding = 'bech32';
	} catch {
		// Not valid bech32, try bech32m
	}

	if (!decoded) {
		try {
			decoded = bech32m.decode(address as `${string}1${string}`);
			encoding = 'bech32m';
		} catch {
			throw new HashiBitcoinError(
				`Invalid Bitcoin address: failed to decode bech32/bech32m checksum`,
			);
		}
	}

	const prefix = decoded.prefix.toLowerCase();
	if (!VALID_HRPS.has(prefix)) {
		throw new HashiBitcoinError(
			`Unknown address prefix "${decoded.prefix}". Expected "bc" (mainnet) or "tb" (testnet)`,
		);
	}

	const network: 'mainnet' | 'testnet' = prefix === MAINNET_HRP ? 'mainnet' : 'testnet';

	if (decoded.words.length < 1) {
		throw new HashiBitcoinError('Invalid Bitcoin address: no witness version');
	}

	const witnessVersion = decoded.words[0];
	const dataWords = decoded.words.slice(1);

	// Validate encoding matches witness version per BIP-173/BIP-350
	if (witnessVersion === 0 && encoding !== 'bech32') {
		throw new HashiBitcoinError(
			'Witness version 0 must use bech32 encoding, not bech32m',
		);
	}
	if (witnessVersion === 1 && encoding !== 'bech32m') {
		throw new HashiBitcoinError(
			'Witness version 1 must use bech32m encoding, not bech32',
		);
	}
	if (witnessVersion !== 0 && witnessVersion !== 1) {
		throw new HashiBitcoinError(
			`Unsupported witness version: ${witnessVersion}. Only versions 0 (P2WPKH) and 1 (P2TR) are supported`,
		);
	}

	// Convert 5-bit words back to 8-bit bytes
	const coder = witnessVersion === 0 ? bech32 : bech32m;
	const witnessProgram = coder.fromWords(dataWords);

	// Validate program length
	if (witnessVersion === 0 && witnessProgram.length !== 20) {
		throw new HashiBitcoinError(
			`Witness version 0 requires a 20-byte program (P2WPKH), got ${witnessProgram.length} bytes`,
		);
	}
	if (witnessVersion === 1 && witnessProgram.length !== 32) {
		throw new HashiBitcoinError(
			`Witness version 1 requires a 32-byte program (P2TR), got ${witnessProgram.length} bytes`,
		);
	}

	return {
		witnessProgram: new Uint8Array(witnessProgram),
		witnessVersion,
		network,
	};
}

// ---- Amount Conversion ----

/**
 * Convert satoshis to a BTC string with 8 decimal places.
 *
 * @param sats - Amount in satoshis (must be non-negative)
 * @returns BTC amount as a string with exactly 8 decimal places
 *
 * @example
 * ```ts
 * satsToBtc(100000000n) // "1.00000000"
 * satsToBtc(150000000n) // "1.50000000"
 * satsToBtc(1n)         // "0.00000001"
 * ```
 *
 * @throws {HashiBitcoinError} If sats is negative
 */
export function satsToBtc(sats: bigint): string {
	if (sats < 0n) {
		throw new HashiBitcoinError(`Satoshi amount must be non-negative, got ${sats}`);
	}

	const whole = sats / SATS_PER_BTC;
	const fraction = sats % SATS_PER_BTC;
	const fractionStr = fraction.toString().padStart(BTC_DECIMALS, '0');

	return `${whole}.${fractionStr}`;
}

/**
 * Convert a BTC string to satoshis.
 *
 * @param btc - BTC amount as a decimal string (e.g. "1.5", "0.001", "100")
 * @returns Amount in satoshis as bigint
 *
 * @example
 * ```ts
 * btcToSats("1.5")        // 150000000n
 * btcToSats("0.00000001") // 1n
 * btcToSats("21000000")   // 2100000000000000n
 * ```
 *
 * @throws {HashiBitcoinError} If the string is not a valid decimal number,
 *   has more than 8 decimal places, or represents a negative amount
 */
export function btcToSats(btc: string): bigint {
	const trimmed = btc.trim();
	if (trimmed === '' || trimmed === '.') {
		throw new HashiBitcoinError(`Invalid BTC amount: "${btc}"`);
	}

	// Check for negative
	if (trimmed.startsWith('-')) {
		throw new HashiBitcoinError(`BTC amount must be non-negative: "${btc}"`);
	}

	const parts = trimmed.split('.');
	if (parts.length > 2) {
		throw new HashiBitcoinError(`Invalid BTC amount (multiple decimal points): "${btc}"`);
	}

	const wholePart = parts[0];
	const fracPart = parts.length === 2 ? parts[1] : '';

	// Validate characters
	if (wholePart !== '' && !/^\d+$/.test(wholePart)) {
		throw new HashiBitcoinError(`Invalid BTC amount (non-numeric characters): "${btc}"`);
	}
	if (fracPart !== '' && !/^\d+$/.test(fracPart)) {
		throw new HashiBitcoinError(`Invalid BTC amount (non-numeric characters): "${btc}"`);
	}

	if (fracPart.length > BTC_DECIMALS) {
		throw new HashiBitcoinError(
			`BTC amount has too many decimal places (max ${BTC_DECIMALS}): "${btc}"`,
		);
	}

	const wholeValue = wholePart === '' ? 0n : BigInt(wholePart);
	const fracValue = fracPart === '' ? 0n : BigInt(fracPart.padEnd(BTC_DECIMALS, '0'));

	return wholeValue * SATS_PER_BTC + fracValue;
}

// ---- Deposit Address Derivation (Stub) ----

/**
 * Derive a deposit address from MPC public key and derivation path.
 *
 * @throws Always throws "Not yet implemented" — pending determination of the
 *   exact derivation algorithm from the Rust source (Q-DERIVE).
 */
export function deriveDepositAddress(
	_mpcPublicKey: Uint8Array,
	_derivationPath: string,
	_network: 'mainnet' | 'testnet',
): never {
	throw new HashiBitcoinError('deriveDepositAddress is not yet implemented (Q-DERIVE)');
}
