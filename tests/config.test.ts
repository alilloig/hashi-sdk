import { describe, it, expect } from 'vitest';
import { HashiConfig, MAINNET_CONFIG, TESTNET_CONFIG } from '../src/utils/config';
import { HashiConfigError } from '../src/errors';

describe('HashiConfig', () => {
	const VALID_ADDRESS = '0x' + 'ab'.repeat(32);

	describe('construction from explicit options', () => {
		it('accepts valid addresses', () => {
			const config = new HashiConfig({
				packageId: VALID_ADDRESS,
				originalPackageId: VALID_ADDRESS,
				hashiObjectId: VALID_ADDRESS,
			});

			expect(config.packageId).toBe(VALID_ADDRESS);
			expect(config.originalPackageId).toBe(VALID_ADDRESS);
			expect(config.hashiObjectId).toBe(VALID_ADDRESS);
		});

		it('normalizes missing 0x prefix', () => {
			const config = new HashiConfig({
				packageId: 'ab'.repeat(32),
				originalPackageId: VALID_ADDRESS,
				hashiObjectId: VALID_ADDRESS,
			});
			expect(config.packageId).toBe(VALID_ADDRESS);
		});

		it('normalizes uppercase hex', () => {
			const config = new HashiConfig({
				packageId: '0x' + 'AB'.repeat(32),
				originalPackageId: VALID_ADDRESS,
				hashiObjectId: VALID_ADDRESS,
			});
			expect(config.packageId).toBe(VALID_ADDRESS);
		});

		it('normalizes shorter hex with zero-padding', () => {
			const config = new HashiConfig({
				packageId: '0x' + 'ab'.repeat(16),
				originalPackageId: VALID_ADDRESS,
				hashiObjectId: VALID_ADDRESS,
			});
			expect(config.packageId).toBe('0x' + '0'.repeat(32) + 'ab'.repeat(16));
		});

		it('rejects non-string values', () => {
			expect(
				() =>
					new HashiConfig({
						packageId: 123 as unknown as string,
						originalPackageId: VALID_ADDRESS,
						hashiObjectId: VALID_ADDRESS,
					}),
			).toThrow(HashiConfigError);
		});
	});

	describe('construction from preset', () => {
		it('creates config from testnet preset', () => {
			const config = new HashiConfig('testnet');
			expect(config.packageId).toBe(TESTNET_CONFIG.packageId);
			expect(config.originalPackageId).toBe(TESTNET_CONFIG.originalPackageId);
			expect(config.hashiObjectId).toBe(TESTNET_CONFIG.hashiObjectId);
		});

		it('creates config from mainnet preset', () => {
			const config = new HashiConfig('mainnet');
			expect(config.packageId).toBe(MAINNET_CONFIG.packageId);
		});

		it('rejects unknown preset', () => {
			expect(() => new HashiConfig('devnet' as 'testnet')).toThrow(HashiConfigError);
		});
	});

	describe('preset with overrides', () => {
		it('allows overriding specific fields', () => {
			const customPackageId = '0x' + 'cd'.repeat(32);
			const config = new HashiConfig('testnet', {
				packageId: customPackageId,
			});

			expect(config.packageId).toBe(customPackageId);
			// Other fields come from preset
			expect(config.originalPackageId).toBe(TESTNET_CONFIG.originalPackageId);
		});

		it('validates overridden fields', () => {
			expect(
				() => new HashiConfig('testnet', { packageId: 'invalid' }),
			).toThrow(HashiConfigError);
		});
	});

	describe('btcCoinType', () => {
		it('constructs BTC coin type from originalPackageId', () => {
			const config = new HashiConfig({
				packageId: '0x' + 'aa'.repeat(32),
				originalPackageId: '0x' + 'bb'.repeat(32),
				hashiObjectId: '0x' + 'cc'.repeat(32),
			});

			expect(config.btcCoinType).toBe(`${'0x' + 'bb'.repeat(32)}::btc::BTC`);
		});
	});

	describe('error messages', () => {
		it('includes field name in validation errors', () => {
			try {
				new HashiConfig({
					packageId: 'xyz_not_hex',
					originalPackageId: VALID_ADDRESS,
					hashiObjectId: VALID_ADDRESS,
				});
				expect.fail('should have thrown');
			} catch (e) {
				expect(e).toBeInstanceOf(HashiConfigError);
				expect((e as HashiConfigError).message).toContain('packageId');
			}
		});

		it('includes preset name in unknown preset errors', () => {
			try {
				new HashiConfig('localnet' as 'testnet');
				expect.fail('should have thrown');
			} catch (e) {
				expect(e).toBeInstanceOf(HashiConfigError);
				expect((e as HashiConfigError).message).toContain('localnet');
			}
		});
	});
});
