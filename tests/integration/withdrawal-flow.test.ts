/**
 * Integration test: Withdrawal flow.
 *
 * Requires a running Sui node with a deployed Hashi package.
 * Skipped unless HASHI_INTEGRATION=1 is set in the environment.
 */

import { describe, it, expect } from 'vitest';

describe.skipIf(!process.env.HASHI_INTEGRATION)('Withdrawal Flow (integration)', () => {
	it('should request a withdrawal', async () => {
		// TODO: Requires Sui localnet + deployed Hashi package + BTC coins
		// 1. Create a HashiClient with real SuiClient
		// 2. Build a requestWithdrawal transaction
		// 3. Sign and execute
		// 4. Verify the withdrawal request exists via getWithdrawalRequest
		expect(true).toBe(true);
	});

	it('should cancel a withdrawal and receive refund', async () => {
		// TODO: Requires a pending (unapproved) withdrawal request
		// 1. Create a withdrawal request
		// 2. Wait for cooldown period
		// 3. Build a cancelWithdrawal transaction
		// 4. Sign and execute
		// 5. Verify the BTC coin was returned
		expect(true).toBe(true);
	});

	it('should list pending withdrawals', async () => {
		// TODO: Requires approved and committed withdrawals
		// 1. Set up withdrawal requests that have been committed
		// 2. List pending withdrawals and verify structure
		expect(true).toBe(true);
	});
});
