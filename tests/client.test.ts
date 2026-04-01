/**
 * Unit tests for the HashiClient facade.
 */

import { describe, it, expect } from 'vitest';
import { HashiClient } from '../src/client.js';
import { HashiConfigError } from '../src/errors.js';

// Minimal mock CoreClient (satisfies the interface without real RPC)
const mockClient = {} as any;

const TEST_PKG = '0x' + 'ab'.repeat(32);
const TEST_ORIG_PKG = '0x' + 'cd'.repeat(32);
const TEST_HASHI_OBJ = '0x' + 'ef'.repeat(32);

describe('HashiClient', () => {
	describe('constructor', () => {
		it('should create with network preset', () => {
			const client = new HashiClient({
				client: mockClient,
				network: 'testnet',
			});
			expect(client.config).toBeDefined();
			expect(client.config.packageId).toBeDefined();
		});

		it('should create with explicit config', () => {
			const client = new HashiClient({
				client: mockClient,
				config: {
					packageId: TEST_PKG,
					originalPackageId: TEST_ORIG_PKG,
					hashiObjectId: TEST_HASHI_OBJ,
				},
			});
			expect(client.config.packageId).toBe(TEST_PKG);
			expect(client.config.originalPackageId).toBe(TEST_ORIG_PKG);
			expect(client.config.hashiObjectId).toBe(TEST_HASHI_OBJ);
		});

		it('should throw when neither network nor config is provided', () => {
			expect(
				() => new HashiClient({ client: mockClient }),
			).toThrow(HashiConfigError);
			expect(
				() => new HashiClient({ client: mockClient }),
			).toThrow('Either network or config must be provided');
		});

		it('should prefer config over network when both are provided', () => {
			const client = new HashiClient({
				client: mockClient,
				network: 'testnet',
				config: {
					packageId: TEST_PKG,
					originalPackageId: TEST_ORIG_PKG,
					hashiObjectId: TEST_HASHI_OBJ,
				},
			});
			// config should take precedence
			expect(client.config.packageId).toBe(TEST_PKG);
		});
	});

	describe('btcCoinType', () => {
		it('should return the correct BTC coin type', () => {
			const client = new HashiClient({
				client: mockClient,
				config: {
					packageId: TEST_PKG,
					originalPackageId: TEST_ORIG_PKG,
					hashiObjectId: TEST_HASHI_OBJ,
				},
			});
			expect(client.btcCoinType).toBe(`${TEST_ORIG_PKG}::btc::BTC`);
		});
	});

	describe('transaction builders', () => {
		let client: HashiClient;

		const createClient = () =>
			new HashiClient({
				client: mockClient,
				config: {
					packageId: TEST_PKG,
					originalPackageId: TEST_ORIG_PKG,
					hashiObjectId: TEST_HASHI_OBJ,
				},
			});

		it('createDepositRequest returns a function', () => {
			client = createClient();
			const build = client.createDepositRequest({
				txid: '00'.repeat(32),
				vout: 0,
				amount: 100_000n,
			});
			expect(typeof build).toBe('function');
		});

		it('requestWithdrawal returns a function', () => {
			client = createClient();
			const build = client.requestWithdrawal({
				amount: 50_000n,
				bitcoinAddress: new Uint8Array(20),
			});
			expect(typeof build).toBe('function');
		});

		it('cancelWithdrawal returns a function', () => {
			client = createClient();
			const build = client.cancelWithdrawal({
				requestId: '0x' + 'aa'.repeat(32),
			});
			expect(typeof build).toBe('function');
		});

		it('confirmDeposit returns a function', () => {
			client = createClient();
			const build = client.confirmDeposit({
				requestId: '0x' + 'bb'.repeat(32),
				epoch: 1n,
				signature: new Uint8Array(48),
				signersBitmap: new Uint8Array(4),
			});
			expect(typeof build).toBe('function');
		});

		it('register returns a function', () => {
			client = createClient();
			const build = client.register();
			expect(typeof build).toBe('function');
		});

		it('startReconfig returns a function', () => {
			client = createClient();
			const build = client.startReconfig();
			expect(typeof build).toBe('function');
		});

		it('vote returns a function', () => {
			client = createClient();
			const build = client.vote({
				proposalId: '0x' + 'cc'.repeat(32),
				proposalType: 'UpdateConfig',
			});
			expect(typeof build).toBe('function');
		});
	});

	describe('event parsing', () => {
		it('parseEvent returns null for unrecognized events', () => {
			const client = new HashiClient({
				client: mockClient,
				config: {
					packageId: TEST_PKG,
					originalPackageId: TEST_ORIG_PKG,
					hashiObjectId: TEST_HASHI_OBJ,
				},
			});

			const result = client.parseEvent({
				eventType: '0xunknown::module::SomeEvent',
				parsedJson: {},
				bcs: new Uint8Array(),
			} as any);
			expect(result).toBeNull();
		});

		it('parseEventStrict returns error for unrecognized events', () => {
			const client = new HashiClient({
				client: mockClient,
				config: {
					packageId: TEST_PKG,
					originalPackageId: TEST_ORIG_PKG,
					hashiObjectId: TEST_HASHI_OBJ,
				},
			});

			const result = client.parseEventStrict({
				eventType: '0xunknown::module::SomeEvent',
				parsedJson: {},
				bcs: new Uint8Array(),
			} as any);
			expect('error' in result).toBe(true);
		});
	});
});
