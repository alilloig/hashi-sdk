/**
 * Infrastructure smoke tests.
 *
 * These tests verify that the test infrastructure is working correctly.
 * They are the foundation for higher-level integration tests.
 *
 * Skipped unless HASHI_INTEGRATION=1 is set.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
	isBitcoinRpcAvailable,
	isSuiRpcAvailable,
	getBlockCount,
	mineBlocks,
	getNewAddress,
	getTestConfig,
	canRunIntegrationTests,
} from './test-utils';

// Determine if we can run these tests
let canRun = false;
let skipReason = '';

beforeAll(async () => {
	[canRun, skipReason] = await canRunIntegrationTests();
	if (!canRun) {
		console.log(`Skipping integration tests: ${skipReason}`);
	}
});

describe.skipIf(!process.env.HASHI_INTEGRATION)('Infrastructure Smoke Tests', () => {
	describe('Bitcoin Regtest', () => {
		it('should be reachable at RPC endpoint', async () => {
			const available = await isBitcoinRpcAvailable();
			if (!available) {
				console.log('Bitcoin regtest not available. Start with: npm run docker:up');
			}
			expect(available).toBe(true);
		});

		it('should have at least 101 blocks (wallet funded)', async () => {
			const blocks = await getBlockCount();
			expect(blocks).toBeGreaterThanOrEqual(101);
		});

		it('should be able to mine new blocks', async () => {
			const beforeCount = await getBlockCount();
			await mineBlocks(1);
			const afterCount = await getBlockCount();
			expect(afterCount).toBe(beforeCount + 1);
		});

		it('should be able to create new addresses', async () => {
			const address = await getNewAddress();
			// Regtest addresses start with bcrt1
			expect(address.startsWith('bcrt1')).toBe(true);
		});

		it('should create bech32m addresses for P2TR', async () => {
			const address = await getNewAddress('', 'bech32m');
			// bech32m P2TR addresses on regtest start with bcrt1p
			expect(address.startsWith('bcrt1p')).toBe(true);
		});
	});

	describe('Configuration', () => {
		it('should load test configuration', () => {
			const config = getTestConfig();
			// Config may be null if no localnet state and no env vars
			// This test just verifies the function works
			if (config) {
				expect(config.suiRpcUrl).toBeDefined();
				expect(config.packageId).toBeDefined();
				expect(config.hashiObjectId).toBeDefined();
			} else {
				console.log('No test configuration found (localnet state or env vars)');
			}
		});
	});

	describe('Sui RPC', () => {
		it('should be reachable if configured', async () => {
			const config = getTestConfig();
			if (!config) {
				console.log('Skipping Sui RPC test: no configuration');
				return;
			}

			const available = await isSuiRpcAvailable(config.suiRpcUrl);
			if (!available) {
				console.log(`Sui RPC not available at ${config.suiRpcUrl}`);
				console.log('Start localnet with: cd ../hashi && cargo run -p e2e-tests --bin hashi-localnet -- start');
			}
			expect(available).toBe(true);
		});
	});
});
