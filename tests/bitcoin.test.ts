import { describe, it, expect } from 'vitest';
import {
	encodeBitcoinAddress,
	decodeBitcoinAddress,
	satsToBtc,
	btcToSats,
	deriveDepositAddress,
} from '../src/bitcoin';
import { HashiBitcoinError } from '../src/errors';

// ---- BIP-173 Test Vectors (bech32 segwit v0) ----

describe('BIP-173 bech32 segwit v0', () => {
	// Known P2WPKH addresses and their witness programs
	const mainnetP2wpkh = 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4';
	const testnetP2wpkh = 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx';

	// The witness program for both (same 20 bytes, different network)
	const p2wpkhProgram = new Uint8Array([
		0x75, 0x1e, 0x76, 0xe8, 0x19, 0x91, 0x96, 0xd4,
		0x54, 0x94, 0x1c, 0x45, 0xd1, 0xb3, 0xa3, 0x23,
		0xf1, 0x43, 0x3b, 0xd6,
	]);

	it('decodes mainnet P2WPKH address correctly', () => {
		const result = decodeBitcoinAddress(mainnetP2wpkh);
		expect(result.witnessVersion).toBe(0);
		expect(result.network).toBe('mainnet');
		expect(result.witnessProgram).toEqual(p2wpkhProgram);
		expect(result.witnessProgram.length).toBe(20);
	});

	it('decodes testnet P2WPKH address correctly', () => {
		const result = decodeBitcoinAddress(testnetP2wpkh);
		expect(result.witnessVersion).toBe(0);
		expect(result.network).toBe('testnet');
		expect(result.witnessProgram).toEqual(p2wpkhProgram);
		expect(result.witnessProgram.length).toBe(20);
	});

	it('encodes mainnet P2WPKH address correctly', () => {
		const encoded = encodeBitcoinAddress(p2wpkhProgram, 0, 'mainnet');
		expect(encoded).toBe(mainnetP2wpkh);
	});

	it('encodes testnet P2WPKH address correctly', () => {
		const encoded = encodeBitcoinAddress(p2wpkhProgram, 0, 'testnet');
		expect(encoded).toBe(testnetP2wpkh);
	});

	it('round-trips mainnet P2WPKH', () => {
		const decoded = decodeBitcoinAddress(mainnetP2wpkh);
		const reencoded = encodeBitcoinAddress(decoded.witnessProgram, decoded.witnessVersion, decoded.network);
		expect(reencoded).toBe(mainnetP2wpkh);
	});

	it('round-trips testnet P2WPKH', () => {
		const decoded = decodeBitcoinAddress(testnetP2wpkh);
		const reencoded = encodeBitcoinAddress(decoded.witnessProgram, decoded.witnessVersion, decoded.network);
		expect(reencoded).toBe(testnetP2wpkh);
	});
});

// ---- BIP-350 Test Vectors (bech32m taproot v1) ----

describe('BIP-350 bech32m taproot v1', () => {
	const mainnetP2tr = 'bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqzk5jj0';
	const testnetP2tr = 'tb1pqqqqp399et2xygdj5xreqhjjvcmzhxw4aywxecjdzew6hylgvsesf3hn0c';

	it('decodes mainnet P2TR address correctly', () => {
		const result = decodeBitcoinAddress(mainnetP2tr);
		expect(result.witnessVersion).toBe(1);
		expect(result.network).toBe('mainnet');
		expect(result.witnessProgram.length).toBe(32);
	});

	it('decodes testnet P2TR address correctly', () => {
		const result = decodeBitcoinAddress(testnetP2tr);
		expect(result.witnessVersion).toBe(1);
		expect(result.network).toBe('testnet');
		expect(result.witnessProgram.length).toBe(32);
	});

	it('round-trips mainnet P2TR', () => {
		const decoded = decodeBitcoinAddress(mainnetP2tr);
		const reencoded = encodeBitcoinAddress(decoded.witnessProgram, decoded.witnessVersion, decoded.network);
		expect(reencoded).toBe(mainnetP2tr);
	});

	it('round-trips testnet P2TR', () => {
		const decoded = decodeBitcoinAddress(testnetP2tr);
		const reencoded = encodeBitcoinAddress(decoded.witnessProgram, decoded.witnessVersion, decoded.network);
		expect(reencoded).toBe(testnetP2tr);
	});

	it('encodes a known 32-byte program as P2TR mainnet', () => {
		const decoded = decodeBitcoinAddress(mainnetP2tr);
		const encoded = encodeBitcoinAddress(decoded.witnessProgram, 1, 'mainnet');
		expect(encoded).toBe(mainnetP2tr);
	});
});

// ---- Error Cases ----

describe('Bitcoin address error handling', () => {
	it('throws HashiBitcoinError for invalid checksum', () => {
		expect(() => decodeBitcoinAddress('bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t5'))
			.toThrow(HashiBitcoinError);
	});

	it('throws HashiBitcoinError for unsupported witness version in encode', () => {
		expect(() => encodeBitcoinAddress(new Uint8Array(20), 2, 'mainnet'))
			.toThrow(HashiBitcoinError);
		expect(() => encodeBitcoinAddress(new Uint8Array(20), 2, 'mainnet'))
			.toThrow('Unsupported witness version');
	});

	it('throws HashiBitcoinError for wrong program length in v0 encode', () => {
		expect(() => encodeBitcoinAddress(new Uint8Array(32), 0, 'mainnet'))
			.toThrow(HashiBitcoinError);
		expect(() => encodeBitcoinAddress(new Uint8Array(32), 0, 'mainnet'))
			.toThrow('20-byte');
	});

	it('throws HashiBitcoinError for wrong program length in v1 encode', () => {
		expect(() => encodeBitcoinAddress(new Uint8Array(20), 1, 'mainnet'))
			.toThrow(HashiBitcoinError);
		expect(() => encodeBitcoinAddress(new Uint8Array(20), 1, 'mainnet'))
			.toThrow('32-byte');
	});

	it('throws HashiBitcoinError for completely invalid address string', () => {
		expect(() => decodeBitcoinAddress('notanaddress'))
			.toThrow(HashiBitcoinError);
	});
});

// ---- Amount Conversion ----

describe('satsToBtc', () => {
	it('converts 1 BTC correctly', () => {
		expect(satsToBtc(100_000_000n)).toBe('1.00000000');
	});

	it('converts 1.5 BTC correctly', () => {
		expect(satsToBtc(150_000_000n)).toBe('1.50000000');
	});

	it('converts 1 satoshi correctly', () => {
		expect(satsToBtc(1n)).toBe('0.00000001');
	});

	it('converts 0 satoshis correctly', () => {
		expect(satsToBtc(0n)).toBe('0.00000000');
	});

	it('converts 21 million BTC correctly', () => {
		expect(satsToBtc(2_100_000_000_000_000n)).toBe('21000000.00000000');
	});

	it('converts fractional amounts correctly', () => {
		expect(satsToBtc(12345678n)).toBe('0.12345678');
	});

	it('throws for negative amounts', () => {
		expect(() => satsToBtc(-1n)).toThrow(HashiBitcoinError);
	});
});

describe('btcToSats', () => {
	it('converts 1 BTC correctly', () => {
		expect(btcToSats('1')).toBe(100_000_000n);
	});

	it('converts 1.5 BTC correctly', () => {
		expect(btcToSats('1.5')).toBe(150_000_000n);
	});

	it('converts 0.00000001 BTC correctly', () => {
		expect(btcToSats('0.00000001')).toBe(1n);
	});

	it('converts 0 correctly', () => {
		expect(btcToSats('0')).toBe(0n);
	});

	it('converts 21000000 correctly', () => {
		expect(btcToSats('21000000')).toBe(2_100_000_000_000_000n);
	});

	it('converts 0.001 correctly', () => {
		expect(btcToSats('0.001')).toBe(100_000n);
	});

	it('throws for too many decimal places', () => {
		expect(() => btcToSats('0.000000001')).toThrow(HashiBitcoinError);
	});

	it('throws for negative amounts', () => {
		expect(() => btcToSats('-1')).toThrow(HashiBitcoinError);
	});

	it('throws for empty string', () => {
		expect(() => btcToSats('')).toThrow(HashiBitcoinError);
	});

	it('throws for non-numeric characters', () => {
		expect(() => btcToSats('abc')).toThrow(HashiBitcoinError);
	});

	it('throws for multiple decimal points', () => {
		expect(() => btcToSats('1.2.3')).toThrow(HashiBitcoinError);
	});
});

describe('satsToBtc / btcToSats round-trip', () => {
	const testCases: bigint[] = [
		0n,
		1n,
		100n,
		100_000_000n,
		150_000_000n,
		12_345_678n,
		2_100_000_000_000_000n,
		99_999_999n,
		50_000n,
	];

	for (const sats of testCases) {
		it(`round-trips ${sats} sats`, () => {
			const btcStr = satsToBtc(sats);
			const roundTripped = btcToSats(btcStr);
			expect(roundTripped).toBe(sats);
		});
	}
});

// ---- Stub ----

describe('deriveDepositAddress (stub)', () => {
	it('throws "Not yet implemented"', () => {
		expect(() => deriveDepositAddress(new Uint8Array(33), 'm/0/0', 'mainnet'))
			.toThrow(HashiBitcoinError);
		expect(() => deriveDepositAddress(new Uint8Array(33), 'm/0/0', 'mainnet'))
			.toThrow('not yet implemented');
	});
});
