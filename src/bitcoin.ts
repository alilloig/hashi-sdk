/**
 * Bitcoin address encoding/decoding and amount conversion helpers.
 *
 * Supports BIP-173 (bech32, segwit v0) and BIP-350 (bech32m, taproot v1)
 * address formats.
 *
 * This module depends only on @scure/base (transitive dep of @noble/curves)
 * and does NOT import @mysten/sui.
 */

import { schnorr } from '@noble/curves/secp256k1';
import { bytesToNumberBE, concatBytes, hexToBytes, numberToBytesBE } from '@noble/curves/abstract/utils';
import { sha256 } from '@noble/hashes/sha2';
import { sha3_256 } from '@noble/hashes/sha3';
import { hkdf } from '@noble/hashes/hkdf';
import { bech32, bech32m } from '@scure/base';
import { HashiBitcoinError } from './errors.js';

// ---- Constants ----

const MAINNET_HRP = 'bc';
const TESTNET_HRP = 'tb';
const REGTEST_HRP = 'bcrt';
const VALID_HRPS = new Set([MAINNET_HRP, TESTNET_HRP, REGTEST_HRP]);

/** Bitcoin network type for address encoding/decoding. */
export type BitcoinNetwork = 'mainnet' | 'testnet' | 'regtest';

const SATS_PER_BTC = 100_000_000n;
const BTC_DECIMALS = 8;

// ---- Address Encoding ----

/**
 * Encode a Bitcoin witness program into a bech32/bech32m address.
 *
 * @param witnessProgram - The raw witness program bytes
 * @param witnessVersion - The segwit witness version (0 or 1)
 * @param network - 'mainnet', 'testnet', or 'regtest'
 * @returns The encoded Bitcoin address string
 *
 * @throws {HashiBitcoinError} If witnessVersion is unsupported or program length is invalid
 */
export function encodeBitcoinAddress(
	witnessProgram: Uint8Array,
	witnessVersion: number,
	network: BitcoinNetwork,
): string {
	const hrp = network === 'mainnet' ? MAINNET_HRP : network === 'regtest' ? REGTEST_HRP : TESTNET_HRP;

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
	network: BitcoinNetwork;
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
			`Unknown address prefix "${decoded.prefix}". Expected "bc" (mainnet), "tb" (testnet), or "bcrt" (regtest)`,
		);
	}

	const network: BitcoinNetwork = prefix === MAINNET_HRP ? 'mainnet' : prefix === REGTEST_HRP ? 'regtest' : 'testnet';

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

// ---- Deposit Address Derivation ----

// secp256k1 group order
const SECP256K1_N = BigInt('0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141');

// secp256k1 field prime
const SECP256K1_P = BigInt('0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f');

// BIP-341 NUMS (Nothing-Up-My-Sleeve) internal key — no known private key
const NUMS_X = BigInt('0x50929b74c1a04954b78b4b6035e97a5e078a5a0f28ec96d547bfee9ace803ac0');

/**
 * Convert a 33-byte ark-works compressed secp256k1 point to standard Bitcoin
 * compressed format (02/03 prefix + 32-byte big-endian x).
 *
 * ark-works format: 32 bytes x (little-endian) + 1 flag byte
 *
 * ark-works uses "positive/negative" Y convention:
 *   flag 0x00 = "positive" Y  (y <= (p-1)/2)
 *   flag 0x80 = "negative" Y  (y > (p-1)/2)
 *
 * Bitcoin uses even/odd Y convention:
 *   02 prefix = even Y  (y % 2 == 0)
 *   03 prefix = odd Y   (y % 2 == 1)
 *
 * These are NOT the same — we must recover the actual Y to determine even/odd.
 *
 * @param arkBytes - 33-byte ark-works compressed point
 * @returns Hex string with 02/03 prefix + 32-byte big-endian x
 */
export function arkworksToCompressedHex(arkBytes: Uint8Array | number[]): string {
	const bytes = arkBytes instanceof Uint8Array ? arkBytes : new Uint8Array(arkBytes);
	if (bytes.length !== 33) {
		throw new HashiBitcoinError(`Expected 33-byte ark-works point, got ${bytes.length}`);
	}

	// x is stored as 32 bytes little-endian, flag byte at index 32
	const xLE = bytes.slice(0, 32);
	const flag = bytes[32];
	const xBE = new Uint8Array(xLE).reverse();
	const xHex = Array.from(xBE).map(b => b.toString(16).padStart(2, '0')).join('');

	const x = BigInt('0x' + xHex);
	const isArkPositive = (flag & 0x80) === 0; // 0x00 = positive (y <= (p-1)/2)

	const halfP = (SECP256K1_P - 1n) / 2n;

	// Recover Y from x: y^2 = x^3 + 7 mod p
	const x3 = modPow(x, 3n, SECP256K1_P);
	const y2 = (x3 + 7n) % SECP256K1_P;
	const y = modPow(y2, (SECP256K1_P + 1n) / 4n, SECP256K1_P); // sqrt via p ≡ 3 mod 4

	// Pick the Y that matches the ark-works flag
	const yPositive = y <= halfP ? y : SECP256K1_P - y;
	const actualY = isArkPositive ? yPositive : SECP256K1_P - yPositive;

	// Bitcoin prefix from even/odd
	const prefix = actualY % 2n === 0n ? '02' : '03';
	return prefix + xHex;
}

/**
 * Derive a Bitcoin taproot deposit address from the committee's MPC public
 * key and a recipient Sui address.
 *
 * Algorithm (ports the Rust implementation):
 *   1. tweak = HKDF-SHA3-256(ikm = x(mpcKey) || suiAddress, salt = [], info = [], len = 64)
 *   2. scalar = tweak mod n  (secp256k1 group order)
 *   3. derivedPoint = mpcKey + scalar * G
 *   4. xOnly = x-coordinate of derivedPoint
 *   5. address = P2TR script-path using NUMS internal key + <xOnly> OP_CHECKSIG leaf
 *
 * @param mpcPublicKey - 33-byte compressed secp256k1 public key (standard 02/03 prefix, big-endian x).
 *   If the MPC key is in ark-works format (from on-chain), convert it first with `arkworksToCompressedHex`.
 * @param suiAddress - 32-byte Sui address (hex, with or without 0x prefix)
 * @param network - 'mainnet', 'testnet', or 'regtest'
 * @returns Bitcoin P2TR address string
 *
 * @throws {HashiBitcoinError} If inputs are invalid
 */
export function deriveDepositAddress(
	mpcPublicKey: Uint8Array | string,
	suiAddress: string,
	network: BitcoinNetwork,
): string {
	// 1. Parse the MPC public key (33-byte compressed) into a curve point
	const mpcHex = typeof mpcPublicKey === 'string' ? mpcPublicKey : bytesToHex(mpcPublicKey);
	const mpcPoint = schnorr.utils.lift_x(
		bytesToNumberBE(hexToBytes(mpcHex.replace(/^0x/, '').slice(2))),
	);

	// Determine correct Y parity from the 02/03 prefix
	const prefix = mpcHex.replace(/^0x/, '').slice(0, 2);
	const mpcAffine = mpcPoint.toAffine();
	const needNegate = (prefix === '02' && mpcAffine.y % 2n !== 0n)
		|| (prefix === '03' && mpcAffine.y % 2n === 0n);
	const finalMpcPoint = needNegate ? mpcPoint.negate() : mpcPoint;

	// 2. Extract x-coordinate as 32 bytes big-endian
	const xBytes = numberToBytesBE(finalMpcPoint.toAffine().x, 32);

	// 3. Parse the Sui address (remove 0x prefix if present)
	const addrHex = suiAddress.startsWith('0x') ? suiAddress.slice(2) : suiAddress;
	const addrBytes = hexToBytes(addrHex.padStart(64, '0'));

	// 4. Compute tweak via HKDF-SHA3-256
	//    ikm = x_bytes || sui_address (64 bytes), salt = empty, info = empty, output = 64 bytes
	const ikm = concatBytes(xBytes, addrBytes);
	const tweakBytes = hkdf(sha3_256, ikm, new Uint8Array(0), new Uint8Array(0), 64);

	// 5. Reduce 64 bytes mod group order to get scalar
	const tweakScalar = bytesToNumberBE(tweakBytes) % SECP256K1_N;

	// 6. Derive new point: mpcKey + tweakScalar * G
	const GPoint = schnorr.utils.lift_x(
		bytesToNumberBE(hexToBytes('79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798')),
	);
	const tweakPoint = GPoint.multiply(tweakScalar);
	const derivedPoint = finalMpcPoint.add(tweakPoint);

	// 7. Get x-only representation (32 bytes)
	const xOnly = numberToBytesBE(derivedPoint.toAffine().x, 32);

	// 8. Build P2TR address with script-path spending
	return buildTaprootScriptPathAddress(xOnly, network);
}

/**
 * Build a P2TR address using script-path spending with a single
 * <pubkey> OP_CHECKSIG leaf and a NUMS internal key.
 */
function buildTaprootScriptPathAddress(
	xOnlyPubkey: Uint8Array,
	network: BitcoinNetwork,
): string {
	// Build the leaf script: <xOnlyPubkey> OP_CHECKSIG
	const leafScript = concatBytes(
		Uint8Array.of(0x20), // push 32 bytes
		xOnlyPubkey,
		Uint8Array.of(0xac), // OP_CHECKSIG
	);

	// Compute the leaf hash: tagged_hash("TapLeaf", [leafVersion, compactSize(script), script])
	const leafVersion = 0xc0;
	const scriptLen = compactSize(leafScript.length);
	const leafData = concatBytes(Uint8Array.of(leafVersion), scriptLen, leafScript);
	const leafHash = taggedHash('TapLeaf', leafData);

	// For a single-leaf tree, the merkle root IS the leaf hash
	const merkleRoot = leafHash;

	// Internal key is NUMS point (x-only, 32 bytes)
	const internalKey = numberToBytesBE(NUMS_X, 32);

	// Compute the tweak: t = tagged_hash("TapTweak", internal_key || merkle_root)
	const tweakHash = taggedHash('TapTweak', concatBytes(internalKey, merkleRoot));
	const t = bytesToNumberBE(tweakHash) % SECP256K1_N;

	// Compute output key: P = lift_x(internal_key) + t*G
	const internalPoint = schnorr.utils.lift_x(NUMS_X);
	const GPoint = schnorr.utils.lift_x(
		bytesToNumberBE(hexToBytes('79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798')),
	);
	const tPoint = GPoint.multiply(t);
	const outputPoint = internalPoint.add(tPoint);
	const outputAffine = outputPoint.toAffine();

	// The output key x-coordinate (32 bytes)
	const outputKey = numberToBytesBE(outputAffine.x, 32);

	// Encode as bech32m: witness version 1 + 32-byte output key
	const hrp = network === 'mainnet' ? MAINNET_HRP : network === 'regtest' ? REGTEST_HRP : TESTNET_HRP;
	const words = [1, ...bech32m.toWords(outputKey)];
	return bech32m.encode(hrp, words);
}

// ---- Internal Helpers ----

/** Modular exponentiation: base^exp mod m */
function modPow(base: bigint, exp: bigint, m: bigint): bigint {
	let result = 1n;
	base = base % m;
	while (exp > 0n) {
		if (exp % 2n === 1n) result = (result * base) % m;
		exp = exp / 2n;
		base = (base * base) % m;
	}
	return result;
}

/** BIP-340/341 tagged hash: SHA256(SHA256(tag) || SHA256(tag) || data) */
function taggedHash(tag: string, data: Uint8Array): Uint8Array {
	const tagBytes = new TextEncoder().encode(tag);
	const tagHash = sha256(tagBytes);
	return sha256(concatBytes(tagHash, tagHash, data));
}

/** Bitcoin compact size encoding */
function compactSize(n: number): Uint8Array {
	if (n < 0xfd) return Uint8Array.of(n);
	if (n <= 0xffff) {
		const buf = new Uint8Array(3);
		buf[0] = 0xfd;
		buf[1] = n & 0xff;
		buf[2] = (n >> 8) & 0xff;
		return buf;
	}
	throw new HashiBitcoinError('compactSize too large');
}

/** Convert bytes to hex string. */
function bytesToHex(bytes: Uint8Array): string {
	return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}
