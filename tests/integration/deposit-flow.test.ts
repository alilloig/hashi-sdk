/**
 * Integration test: Deposit flow.
 *
 * Requires a running Sui node with a deployed Hashi package.
 * Skipped unless HASHI_INTEGRATION=1 is set in the environment.
 */

import { describe, it, expect } from 'vitest';

describe.skipIf(!process.env.HASHI_INTEGRATION)('Deposit Flow (integration)', () => {
	it('should create a deposit request transaction', async () => {
		// TODO: Requires Sui localnet + deployed Hashi package
		// 1. Create a HashiClient with real SuiClient
		// 2. Build a createDepositRequest transaction
		// 3. Sign and execute
		// 4. Verify the deposit request exists via getDepositRequest
		expect(true).toBe(true);
	});

	it('should confirm a deposit with committee signature', async () => {
		// TODO: Requires committee key material for signing
		// 1. Create a deposit request (from above)
		// 2. Build a confirmDeposit transaction with valid signature
		// 3. Sign and execute
		// 4. Verify the deposit was confirmed
		expect(true).toBe(true);
	});

	it('should list deposit requests with pagination', async () => {
		// TODO: Requires multiple deposit requests in the queue
		// 1. Create multiple deposit requests
		// 2. List with limit=1 and verify pagination cursor works
		expect(true).toBe(true);
	});
});
