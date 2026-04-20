import { describe, it, expect } from 'vitest';
import {
	encodeBitcoinAddress,
	decodeBitcoinAddress,
	satsToBtc,
	btcToSats,
	deriveDepositAddress,
	arkworksToCompressedHex,
} from '../src/bitcoin';
import { HashiBitcoinError } from '../src/errors';
import { hexToBytes } from '@noble/curves/abstract/utils';

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

// ---- Regtest Network Support ----

describe('Regtest network (bcrt prefix)', () => {
	// Regtest uses 'bcrt' HRP per BIP-173
	// Test vectors generated using Bitcoin Core regtest mode

	// P2WPKH (witness v0) - same witness program as mainnet/testnet tests
	const p2wpkhProgram = new Uint8Array([
		0x75, 0x1e, 0x76, 0xe8, 0x19, 0x91, 0x96, 0xd4,
		0x54, 0x94, 0x1c, 0x45, 0xd1, 0xb3, 0xa3, 0x23,
		0xf1, 0x43, 0x3b, 0xd6,
	]);

	it('encodes regtest P2WPKH address with bcrt prefix', () => {
		const encoded = encodeBitcoinAddress(p2wpkhProgram, 0, 'regtest');
		expect(encoded.startsWith('bcrt1q')).toBe(true);
		expect(encoded).toBe('bcrt1qw508d6qejxtdg4y5r3zarvary0c5xw7kygt080');
	});

	it('decodes regtest P2WPKH address correctly', () => {
		const address = 'bcrt1qw508d6qejxtdg4y5r3zarvary0c5xw7kygt080';
		const result = decodeBitcoinAddress(address);
		expect(result.witnessVersion).toBe(0);
		expect(result.network).toBe('regtest');
		expect(result.witnessProgram).toEqual(p2wpkhProgram);
	});

	it('round-trips regtest P2WPKH', () => {
		const address = 'bcrt1qw508d6qejxtdg4y5r3zarvary0c5xw7kygt080';
		const decoded = decodeBitcoinAddress(address);
		const reencoded = encodeBitcoinAddress(decoded.witnessProgram, decoded.witnessVersion, decoded.network);
		expect(reencoded).toBe(address);
	});

	// P2TR (witness v1) - using the same 32-byte program from mainnet test
	it('encodes regtest P2TR address with bcrt1p prefix', () => {
		// Use the witness program from the mainnet P2TR test
		const mainnetP2tr = 'bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqzk5jj0';
		const decoded = decodeBitcoinAddress(mainnetP2tr);
		const regtestP2tr = encodeBitcoinAddress(decoded.witnessProgram, 1, 'regtest');
		expect(regtestP2tr.startsWith('bcrt1p')).toBe(true);
	});

	it('decodes regtest P2TR address correctly', () => {
		// First encode a regtest P2TR, then decode it
		const mainnetP2tr = 'bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqzk5jj0';
		const mainnetDecoded = decodeBitcoinAddress(mainnetP2tr);
		const regtestP2tr = encodeBitcoinAddress(mainnetDecoded.witnessProgram, 1, 'regtest');

		const result = decodeBitcoinAddress(regtestP2tr);
		expect(result.witnessVersion).toBe(1);
		expect(result.network).toBe('regtest');
		expect(result.witnessProgram).toEqual(mainnetDecoded.witnessProgram);
	});

	it('round-trips regtest P2TR', () => {
		const mainnetP2tr = 'bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqzk5jj0';
		const mainnetDecoded = decodeBitcoinAddress(mainnetP2tr);
		const regtestP2tr = encodeBitcoinAddress(mainnetDecoded.witnessProgram, 1, 'regtest');

		const decoded = decodeBitcoinAddress(regtestP2tr);
		const reencoded = encodeBitcoinAddress(decoded.witnessProgram, decoded.witnessVersion, decoded.network);
		expect(reencoded).toBe(regtestP2tr);
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

// ---- Deposit Address Derivation ----

describe('deriveDepositAddress', () => {
	// Test vector: secp256k1 generator point G as MPC key
	const mpcKeyHex = '0279BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798';
	const suiAddress = '0xfa48ce61314393474915fa05cb757810a6b8aab1c3c11b4b1d265b4cdccd9bed';
	const expectedTestnetAddress = 'tb1py4n6pf6uxhqafane8l946kdhvy0tsg9vp4wz89qt899m35umm0zsf6y09l';

	it('derives the correct testnet deposit address from hex key', () => {
		const address = deriveDepositAddress(mpcKeyHex, suiAddress, 'testnet');
		expect(address).toBe(expectedTestnetAddress);
	});

	it('derives the correct testnet deposit address from Uint8Array key', () => {
		const keyBytes = hexToBytes(mpcKeyHex);
		const address = deriveDepositAddress(keyBytes, suiAddress, 'testnet');
		expect(address).toBe(expectedTestnetAddress);
	});

	it('derives a mainnet address with bc1p prefix', () => {
		const address = deriveDepositAddress(mpcKeyHex, suiAddress, 'mainnet');
		expect(address.startsWith('bc1p')).toBe(true);
	});

	it('derives a regtest address with bcrt1p prefix', () => {
		const address = deriveDepositAddress(mpcKeyHex, suiAddress, 'regtest');
		expect(address.startsWith('bcrt1p')).toBe(true);
	});

	it('produces a valid regtest P2TR address that can be decoded', () => {
		const address = deriveDepositAddress(mpcKeyHex, suiAddress, 'regtest');
		const decoded = decodeBitcoinAddress(address);
		expect(decoded.witnessVersion).toBe(1);
		expect(decoded.witnessProgram.length).toBe(32);
		expect(decoded.network).toBe('regtest');
	});

	it('regtest and testnet addresses have same witness program but different prefix', () => {
		const testnetAddr = deriveDepositAddress(mpcKeyHex, suiAddress, 'testnet');
		const regtestAddr = deriveDepositAddress(mpcKeyHex, suiAddress, 'regtest');

		const testnetDecoded = decodeBitcoinAddress(testnetAddr);
		const regtestDecoded = decodeBitcoinAddress(regtestAddr);

		// Same witness program (same derivation)
		expect(regtestDecoded.witnessProgram).toEqual(testnetDecoded.witnessProgram);
		// Different networks
		expect(testnetDecoded.network).toBe('testnet');
		expect(regtestDecoded.network).toBe('regtest');
		// Different prefixes
		expect(testnetAddr.startsWith('tb1p')).toBe(true);
		expect(regtestAddr.startsWith('bcrt1p')).toBe(true);
	});

	it('produces a valid P2TR address that can be decoded', () => {
		const address = deriveDepositAddress(mpcKeyHex, suiAddress, 'testnet');
		const decoded = decodeBitcoinAddress(address);
		expect(decoded.witnessVersion).toBe(1);
		expect(decoded.witnessProgram.length).toBe(32);
		expect(decoded.network).toBe('testnet');
	});

	it('different sui addresses produce different deposit addresses', () => {
		const addr1 = deriveDepositAddress(mpcKeyHex, suiAddress, 'testnet');
		const addr2 = deriveDepositAddress(mpcKeyHex, '0x' + '00'.repeat(32), 'testnet');
		expect(addr1).not.toBe(addr2);
	});

	it('is deterministic: same inputs produce same output', () => {
		const addr1 = deriveDepositAddress(mpcKeyHex, suiAddress, 'testnet');
		const addr2 = deriveDepositAddress(mpcKeyHex, suiAddress, 'testnet');
		expect(addr1).toBe(addr2);
	});
});

// ---- Arkworks Conversion ----

describe('arkworksToCompressedHex', () => {
	it('rejects non-33-byte input', () => {
		expect(() => arkworksToCompressedHex(new Uint8Array(32))).toThrow(HashiBitcoinError);
		expect(() => arkworksToCompressedHex(new Uint8Array(34))).toThrow(HashiBitcoinError);
	});

	it('returns a 66-char hex string with 02 or 03 prefix', () => {
		// Create a dummy 33-byte arkworks point (x=1, flag=0x00)
		const ark = new Uint8Array(33);
		ark[0] = 1; // x = 1 in LE
		ark[32] = 0x00; // positive Y
		const hex = arkworksToCompressedHex(ark);
		expect(hex.length).toBe(66);
		expect(hex.startsWith('02') || hex.startsWith('03')).toBe(true);
	});
});
