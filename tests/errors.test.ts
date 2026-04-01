import { describe, it, expect } from 'vitest';
import {
	HashiError,
	HashiTransactionError,
	HashiQueryError,
	HashiParseError,
	HashiBitcoinError,
	HashiConfigError,
	ABORT_CODES,
	lookupAbortCode,
	transactionErrorFromAbort,
} from '../src/errors';

describe('Error hierarchy', () => {
	it('HashiError extends Error', () => {
		const err = new HashiError('test');
		expect(err).toBeInstanceOf(Error);
		expect(err).toBeInstanceOf(HashiError);
		expect(err.name).toBe('HashiError');
		expect(err.message).toBe('test');
	});

	it('HashiTransactionError extends HashiError', () => {
		const err = new HashiTransactionError('tx failed', {
			module: 'committee',
			abortCode: 2,
		});
		expect(err).toBeInstanceOf(Error);
		expect(err).toBeInstanceOf(HashiError);
		expect(err).toBeInstanceOf(HashiTransactionError);
		expect(err.name).toBe('HashiTransactionError');
		expect(err.module).toBe('committee');
		expect(err.abortCode).toBe(2);
	});

	it('HashiTransactionError optional fields default to undefined', () => {
		const err = new HashiTransactionError('generic fail');
		expect(err.module).toBeUndefined();
		expect(err.abortCode).toBeUndefined();
	});

	it('HashiQueryError extends HashiError', () => {
		const err = new HashiQueryError('rpc failed');
		expect(err).toBeInstanceOf(HashiError);
		expect(err.name).toBe('HashiQueryError');
	});

	it('HashiParseError extends HashiError', () => {
		const err = new HashiParseError('decode failed');
		expect(err).toBeInstanceOf(HashiError);
		expect(err.name).toBe('HashiParseError');
	});

	it('HashiBitcoinError extends HashiError', () => {
		const err = new HashiBitcoinError('bad address');
		expect(err).toBeInstanceOf(HashiError);
		expect(err.name).toBe('HashiBitcoinError');
	});

	it('HashiConfigError extends HashiError', () => {
		const err = new HashiConfigError('bad config');
		expect(err).toBeInstanceOf(HashiError);
		expect(err.name).toBe('HashiConfigError');
	});

	it('all error subclasses can be caught as HashiError', () => {
		const errors = [
			new HashiTransactionError('a'),
			new HashiQueryError('b'),
			new HashiParseError('c'),
			new HashiBitcoinError('d'),
			new HashiConfigError('e'),
		];

		for (const err of errors) {
			expect(err).toBeInstanceOf(HashiError);
		}
	});
});

describe('Abort code table', () => {
	it('contains at least 28 entries', () => {
		expect(ABORT_CODES.length).toBeGreaterThanOrEqual(28);
	});

	it('every entry has module, code, constant, and message', () => {
		for (const entry of ABORT_CODES) {
			expect(typeof entry.module).toBe('string');
			expect(typeof entry.code).toBe('number');
			expect(typeof entry.constant).toBe('string');
			expect(typeof entry.message).toBe('string');
			expect(entry.module.length).toBeGreaterThan(0);
			expect(entry.constant.length).toBeGreaterThan(0);
			expect(entry.message.length).toBeGreaterThan(0);
		}
	});

	it('has codes for all specified modules', () => {
		const modules = new Set(ABORT_CODES.map((e) => e.module));
		const expectedModules = [
			'committee',
			'config',
			'config_value',
			'reconfig',
			'deposit_queue',
			'proposal',
			'tob',
			'threshold',
			'utxo_pool',
			'withdraw',
			'withdrawal_queue',
		];

		for (const mod of expectedModules) {
			expect(modules.has(mod), `Missing module: ${mod}`).toBe(true);
		}
	});
});

describe('lookupAbortCode', () => {
	it('finds known committee error codes', () => {
		const entry = lookupAbortCode('committee', 0);
		expect(entry).toBeDefined();
		expect(entry!.constant).toBe('EInvalidBitmap');
		expect(entry!.message).toBe('Invalid signer bitmap');
	});

	it('finds known config error codes', () => {
		const entry = lookupAbortCode('config', 2);
		expect(entry).toBeDefined();
		expect(entry!.constant).toBe('EInvalidConfigEntry');
	});

	it('finds known proposal error codes', () => {
		const entry = lookupAbortCode('proposal', 5);
		expect(entry).toBeDefined();
		expect(entry!.constant).toBe('EProposalExpired');
	});

	it('returns undefined for unknown module', () => {
		expect(lookupAbortCode('nonexistent', 0)).toBeUndefined();
	});

	it('returns undefined for unknown code in known module', () => {
		expect(lookupAbortCode('committee', 99)).toBeUndefined();
	});
});

describe('transactionErrorFromAbort', () => {
	it('creates enriched error for known abort', () => {
		const err = transactionErrorFromAbort('committee', 1);
		expect(err).toBeInstanceOf(HashiTransactionError);
		expect(err.module).toBe('committee');
		expect(err.abortCode).toBe(1);
		expect(err.message).toContain('ESigVerification');
		expect(err.message).toContain('Signature verification failed');
	});

	it('creates generic error for unknown abort', () => {
		const err = transactionErrorFromAbort('unknown_module', 42);
		expect(err).toBeInstanceOf(HashiTransactionError);
		expect(err.module).toBe('unknown_module');
		expect(err.abortCode).toBe(42);
		expect(err.message).toContain('abort code 42');
	});
});
