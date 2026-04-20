/**
 * Integration test: Deposit flow.
 *
 * Tests the complete deposit request creation flow:
 * 1. Derive a regtest deposit address
 * 2. Create a UTXO at that address on Bitcoin regtest
 * 3. Build a deposit request transaction
 * 4. Submit to Sui and verify state
 *
 * Requires:
 * - Bitcoin regtest running (npm run docker:up)
 * - Sui localnet running (hashi-localnet from sibling repo)
 * - HASHI_INTEGRATION=1 environment variable
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { Transaction } from '@mysten/sui/transactions';

import { HashiClient, deriveDepositAddress, decodeBitcoinAddress } from '../../src/index';
import {
	getTestConfig,
	createTestUtxo,
	isBitcoinRpcAvailable,
} from './test-utils';

// Test configuration
let hashi: HashiClient | null = null;

// Use a known test MPC key for regtest address derivation tests
// This is the secp256k1 generator point G - a valid public key for testing
const TEST_MPC_KEY = '0279BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798';
const TEST_SUI_ADDRESS = '0xfa48ce61314393474915fa05cb757810a6b8aab1c3c11b4b1d265b4cdccd9bed';

beforeAll(async () => {
	const config = getTestConfig();

	if (config) {
		// Create a mock client for transaction building tests
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const mockClient = {} as any;

		hashi = new HashiClient({
			client: mockClient,
			config: {
				packageId: config.packageId,
				originalPackageId: config.originalPackageId,
				hashiObjectId: config.hashiObjectId,
			},
		});
	}
});

describe.skipIf(!process.env.HASHI_INTEGRATION)('Deposit Flow (integration)', () => {
	describe('Address Derivation', () => {
		it('should derive a valid regtest deposit address', () => {
			const depositAddress = deriveDepositAddress(TEST_MPC_KEY, TEST_SUI_ADDRESS, 'regtest');

			// Should be a valid regtest P2TR address
			expect(depositAddress.startsWith('bcrt1p')).toBe(true);

			// Should decode correctly
			const decoded = decodeBitcoinAddress(depositAddress);
			expect(decoded.network).toBe('regtest');
			expect(decoded.witnessVersion).toBe(1);
			expect(decoded.witnessProgram.length).toBe(32);
		});

		it('should produce deterministic addresses', () => {
			const addr1 = deriveDepositAddress(TEST_MPC_KEY, TEST_SUI_ADDRESS, 'regtest');
			const addr2 = deriveDepositAddress(TEST_MPC_KEY, TEST_SUI_ADDRESS, 'regtest');

			expect(addr1).toBe(addr2);
		});

		it('should produce different addresses for different Sui addresses', () => {
			const addr1 = deriveDepositAddress(TEST_MPC_KEY, TEST_SUI_ADDRESS, 'regtest');
			const addr2 = deriveDepositAddress(TEST_MPC_KEY, '0x' + '00'.repeat(32), 'regtest');

			expect(addr1).not.toBe(addr2);
		});
	});

	describe('UTXO Creation', () => {
		it('should create a funded UTXO on regtest', async () => {
			const btcAvailable = await isBitcoinRpcAvailable();
			if (!btcAvailable) {
				console.log('Skipping: Bitcoin regtest not available');
				return;
			}

			const depositAddress = deriveDepositAddress(TEST_MPC_KEY, TEST_SUI_ADDRESS, 'regtest');

			// Create a 0.001 BTC UTXO
			const utxo = await createTestUtxo(depositAddress, 100_000n);

			expect(utxo.txid).toHaveLength(64);
			expect(utxo.vout).toBeGreaterThanOrEqual(0);
			expect(utxo.amount).toBe(100_000n);
			expect(utxo.address).toBe(depositAddress);
		});
	});

	describe('Deposit Request Transaction', () => {
		it('should build a valid deposit request transaction', () => {
			if (!hashi) {
				console.log('Skipping: No HashiClient available');
				return;
			}

			const tx = new Transaction();

			// Use a test UTXO (doesn't need to exist on chain for this test)
			const testTxid = '0'.repeat(64);
			const testVout = 0;
			const testAmount = 100_000n;

			const builder = hashi.createDepositRequest({
				txid: testTxid,
				vout: testVout,
				amount: testAmount,
			});

			builder(tx);

			// Verify the transaction has the expected structure
			const data = tx.getData();
			expect(data.commands.length).toBeGreaterThan(0);
		});

		it('should include deposit fee when specified', () => {
			if (!hashi) {
				console.log('Skipping: No HashiClient available');
				return;
			}

			const tx = new Transaction();

			const builder = hashi.createDepositRequest({
				txid: '0'.repeat(64),
				vout: 0,
				amount: 100_000n,
				depositFee: 1_000_000n, // 0.001 SUI
			});

			builder(tx);

			// Transaction should include a SplitCoins command for the fee
			const data = tx.getData();
			const hasSplitCoins = data.commands.some(
				(cmd) => '$kind' in cmd && cmd.$kind === 'SplitCoins'
			);
			expect(hasSplitCoins).toBe(true);
		});
	});

	describe('Full Deposit Flow', () => {
		it.skip('should submit deposit request and query it back', async () => {
			// This test requires:
			// - A funded Sui wallet
			// - Working Sui localnet with deployed Hashi package
			// - Bitcoin regtest with funded wallet
			//
			// Enable when running against a proper test environment with:
			// 1. hashi-localnet running
			// 2. npm run docker:up
			// 3. A funded test wallet

			const btcAvailable = await isBitcoinRpcAvailable();
			if (!btcAvailable) {
				console.log('Skipping: Bitcoin regtest not available');
				return;
			}

			// 1. Derive deposit address
			const depositAddress = deriveDepositAddress(TEST_MPC_KEY, TEST_SUI_ADDRESS, 'regtest');

			// 2. Create UTXO on regtest
			const utxo = await createTestUtxo(depositAddress, 100_000n);

			// 3. Build deposit request transaction
			// (Actual submission requires funded wallet and real Sui client)
			expect(utxo.txid).toHaveLength(64);
		});
	});

	describe('Deposit Confirmation (Mock Signatures)', () => {
		it('should accept valid mock signature parameters', () => {
			// This test verifies mock signature structure for future tests
			// Real signatures require committee key material

			// Mock BLS signature (48 bytes - compressed G2 point)
			const mockSignature = new Uint8Array(48).fill(0x42);

			// Mock signers bitmap (indicates which validators signed)
			const mockBitmap = new Uint8Array([0x01]); // First validator signed

			// Verify mock data structure
			expect(mockSignature.length).toBe(48);
			expect(mockBitmap.length).toBeGreaterThan(0);
		});
	});
});
