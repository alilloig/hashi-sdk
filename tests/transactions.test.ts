import { describe, it, expect } from 'vitest';
import { Transaction } from '@mysten/sui/transactions';
import { HashiConfig } from '../src/utils/config';
import { HashiTransactionError } from '../src/errors';
import { createDepositRequest } from '../src/transactions/createDepositRequest';
import { requestWithdrawal } from '../src/transactions/requestWithdrawal';
import { cancelWithdrawal } from '../src/transactions/cancelWithdrawal';
import {
	validateU64,
	validateTxid,
	validateAddress,
	validateVout,
	validateBitcoinAddress,
} from '../src/transactions/validation';

// ---------- Test Fixtures ----------

const TEST_PACKAGE_ID = '0x' + 'aa'.repeat(32);
const TEST_ORIGINAL_PACKAGE_ID = '0x' + 'bb'.repeat(32);
const TEST_HASHI_OBJECT_ID = '0x' + 'cc'.repeat(32);

const config = new HashiConfig({
	packageId: TEST_PACKAGE_ID,
	originalPackageId: TEST_ORIGINAL_PACKAGE_ID,
	hashiObjectId: TEST_HASHI_OBJECT_ID,
});

/** A valid 64-char hex txid (all zeros). */
const VALID_TXID = '0'.repeat(64);

/** A valid Bitcoin address as 20 bytes. */
const VALID_BTC_ADDRESS_20 = new Uint8Array(20).fill(0xab);

/** A valid Bitcoin address as 32 bytes. */
const VALID_BTC_ADDRESS_32 = new Uint8Array(32).fill(0xcd);

/** A valid 20-byte Bitcoin address as hex string. */
const VALID_BTC_HEX_20 = 'ab'.repeat(20);

/** A valid request ID (Sui address). */
const VALID_REQUEST_ID = '0x' + 'dd'.repeat(32);

// Helper to serialize transaction data for snapshots, handling BigInt
function serializeTxData(tx: Transaction): string {
	return JSON.stringify(
		tx.getData(),
		(_key, value) => (typeof value === 'bigint' ? `__bigint__${value}` : value),
		2,
	);
}

// ============================================================
// Snapshot Tests
// ============================================================

describe('createDepositRequest snapshot', () => {
	it('produces correct PTB structure without derivation path', () => {
		const builder = createDepositRequest(config, {
			txid: VALID_TXID,
			vout: 0,
			amount: 100000n,
		});

		const tx = new Transaction();
		builder(tx);

		const serialized = serializeTxData(tx);
		expect(serialized).toMatchSnapshot();
	});

	it('produces correct PTB structure with derivation path', () => {
		const derivationPath = '0x' + 'ee'.repeat(32);
		const builder = createDepositRequest(config, {
			txid: VALID_TXID,
			vout: 1,
			amount: 250000n,
			derivationPath,
		});

		const tx = new Transaction();
		builder(tx);

		const serialized = serializeTxData(tx);
		expect(serialized).toMatchSnapshot();
	});

	it('creates exactly 5 commands', () => {
		const builder = createDepositRequest(config, {
			txid: VALID_TXID,
			vout: 0,
			amount: 100000n,
		});

		const tx = new Transaction();
		builder(tx);

		const data = tx.getData();
		expect(data.commands).toHaveLength(5);
	});

	it('has correct command types in order', () => {
		const builder = createDepositRequest(config, {
			txid: VALID_TXID,
			vout: 0,
			amount: 100000n,
		});

		const tx = new Transaction();
		builder(tx);

		const data = tx.getData();
		const commandKinds = data.commands.map((c: { $kind: string }) => c.$kind);
		expect(commandKinds).toEqual([
			'MoveCall',    // utxo_id
			'MoveCall',    // utxo
			'MoveCall',    // deposit_request
			'SplitCoins',  // split gas for fee
			'MoveCall',    // deposit
		]);
	});
});

describe('requestWithdrawal snapshot', () => {
	it('produces correct PTB structure with Uint8Array address', () => {
		const builder = requestWithdrawal(config, {
			amount: 50000n,
			bitcoinAddress: VALID_BTC_ADDRESS_20,
		});

		const tx = new Transaction();
		builder(tx);

		const serialized = serializeTxData(tx);
		expect(serialized).toMatchSnapshot();
	});

	it('produces correct PTB structure with hex string address', () => {
		const builder = requestWithdrawal(config, {
			amount: 50000n,
			bitcoinAddress: VALID_BTC_HEX_20,
		});

		const tx = new Transaction();
		builder(tx);

		const serialized = serializeTxData(tx);
		expect(serialized).toMatchSnapshot();
	});

	it('produces correct PTB structure with 32-byte address', () => {
		const builder = requestWithdrawal(config, {
			amount: 100000n,
			bitcoinAddress: VALID_BTC_ADDRESS_32,
		});

		const tx = new Transaction();
		builder(tx);

		const serialized = serializeTxData(tx);
		expect(serialized).toMatchSnapshot();
	});

	it('creates exactly 2 commands', () => {
		const builder = requestWithdrawal(config, {
			amount: 50000n,
			bitcoinAddress: VALID_BTC_ADDRESS_20,
		});

		const tx = new Transaction();
		builder(tx);

		const data = tx.getData();
		expect(data.commands).toHaveLength(2);
	});

	it('has correct command types in order', () => {
		const builder = requestWithdrawal(config, {
			amount: 50000n,
			bitcoinAddress: VALID_BTC_ADDRESS_20,
		});

		const tx = new Transaction();
		builder(tx);

		const data = tx.getData();
		const commandKinds = data.commands.map((c: { $kind: string }) => c.$kind);
		expect(commandKinds).toEqual([
			'$Intent',     // coinWithBalance
			'MoveCall',    // request_withdrawal
		]);
	});
});

describe('cancelWithdrawal snapshot', () => {
	it('produces correct PTB structure', () => {
		const builder = cancelWithdrawal(config, {
			requestId: VALID_REQUEST_ID,
		});

		const tx = new Transaction();
		builder(tx);

		const serialized = serializeTxData(tx);
		expect(serialized).toMatchSnapshot();
	});

	it('creates exactly 2 commands', () => {
		const builder = cancelWithdrawal(config, {
			requestId: VALID_REQUEST_ID,
		});

		const tx = new Transaction();
		builder(tx);

		const data = tx.getData();
		expect(data.commands).toHaveLength(2);
	});

	it('has correct command types in order', () => {
		const builder = cancelWithdrawal(config, {
			requestId: VALID_REQUEST_ID,
		});

		const tx = new Transaction();
		builder(tx);

		const data = tx.getData();
		const commandKinds = data.commands.map((c: { $kind: string }) => c.$kind);
		expect(commandKinds).toEqual([
			'MoveCall',         // cancel_withdrawal
			'TransferObjects',  // transfer refund to sender
		]);
	});

	it('returns a TransactionResult', () => {
		const builder = cancelWithdrawal(config, {
			requestId: VALID_REQUEST_ID,
		});

		const tx = new Transaction();
		const result = builder(tx);

		// TransactionResult has $kind: 'Result' or $kind: 'NestedResult'
		expect(result).toBeDefined();
		expect(result.$kind).toBeDefined();
	});
});

// ============================================================
// Validation Error Tests
// ============================================================

describe('validateU64', () => {
	it('accepts valid bigint', () => {
		expect(validateU64(0n, 'test')).toBe(0n);
		expect(validateU64(100n, 'test')).toBe(100n);
		expect(validateU64(18446744073709551615n, 'test')).toBe(18446744073709551615n);
	});

	it('accepts valid safe integer number', () => {
		expect(validateU64(0, 'test')).toBe(0n);
		expect(validateU64(42, 'test')).toBe(42n);
	});

	it('rejects negative values', () => {
		expect(() => validateU64(-1n, 'test')).toThrow(HashiTransactionError);
		expect(() => validateU64(-1, 'test')).toThrow(HashiTransactionError);
	});

	it('rejects values above u64 max', () => {
		expect(() => validateU64(18446744073709551616n, 'test')).toThrow(HashiTransactionError);
	});

	it('rejects non-safe integer numbers', () => {
		expect(() => validateU64(Number.MAX_SAFE_INTEGER + 1, 'test')).toThrow(HashiTransactionError);
		expect(() => validateU64(1.5, 'test')).toThrow(HashiTransactionError);
	});
});

describe('validateTxid', () => {
	it('accepts valid 64-char hex txid', () => {
		const result = validateTxid(VALID_TXID);
		expect(result).toBe('0x' + VALID_TXID);
	});

	it('accepts 0x-prefixed txid', () => {
		const result = validateTxid('0x' + VALID_TXID);
		expect(result).toBe('0x' + VALID_TXID);
	});

	it('normalizes uppercase', () => {
		const upper = 'AB'.repeat(32);
		const result = validateTxid(upper);
		expect(result).toBe('0x' + 'ab'.repeat(32));
	});

	it('rejects too-short txid', () => {
		expect(() => validateTxid('abcd')).toThrow(HashiTransactionError);
	});

	it('rejects too-long txid', () => {
		expect(() => validateTxid('a'.repeat(65))).toThrow(HashiTransactionError);
	});

	it('rejects non-hex characters', () => {
		expect(() => validateTxid('g'.repeat(64))).toThrow(HashiTransactionError);
	});
});

describe('validateAddress', () => {
	it('accepts valid Sui address', () => {
		const result = validateAddress('0x' + 'ab'.repeat(32), 'test');
		expect(result).toBe('0x' + 'ab'.repeat(32));
	});

	it('normalizes short address with zero-padding', () => {
		const result = validateAddress('0x1', 'test');
		expect(result).toBe('0x' + '0'.repeat(63) + '1');
	});

	it('rejects non-hex characters', () => {
		expect(() => validateAddress('0xzzzz', 'test')).toThrow(HashiTransactionError);
	});
});

describe('validateVout', () => {
	it('accepts valid vout', () => {
		expect(validateVout(0)).toBe(0);
		expect(validateVout(42)).toBe(42);
		expect(validateVout(0xFFFFFFFF)).toBe(0xFFFFFFFF);
	});

	it('rejects negative vout', () => {
		expect(() => validateVout(-1)).toThrow(HashiTransactionError);
	});

	it('rejects vout above u32 max', () => {
		expect(() => validateVout(0xFFFFFFFF + 1)).toThrow(HashiTransactionError);
	});

	it('rejects non-integer vout', () => {
		expect(() => validateVout(1.5)).toThrow(HashiTransactionError);
	});
});

describe('validateBitcoinAddress', () => {
	it('accepts 20-byte Uint8Array', () => {
		const result = validateBitcoinAddress(VALID_BTC_ADDRESS_20);
		expect(result).toEqual(VALID_BTC_ADDRESS_20);
	});

	it('accepts 32-byte Uint8Array', () => {
		const result = validateBitcoinAddress(VALID_BTC_ADDRESS_32);
		expect(result).toEqual(VALID_BTC_ADDRESS_32);
	});

	it('rejects wrong-length Uint8Array', () => {
		expect(() => validateBitcoinAddress(new Uint8Array(16))).toThrow(HashiTransactionError);
		expect(() => validateBitcoinAddress(new Uint8Array(25))).toThrow(HashiTransactionError);
	});

	it('accepts valid hex string (40 chars = 20 bytes)', () => {
		const result = validateBitcoinAddress(VALID_BTC_HEX_20);
		expect(result).toHaveLength(20);
	});

	it('accepts valid hex string (64 chars = 32 bytes)', () => {
		const hex32 = 'cd'.repeat(32);
		const result = validateBitcoinAddress(hex32);
		expect(result).toHaveLength(32);
	});

	it('accepts 0x-prefixed hex string', () => {
		const result = validateBitcoinAddress('0x' + VALID_BTC_HEX_20);
		expect(result).toHaveLength(20);
	});

	it('rejects wrong-length hex string', () => {
		expect(() => validateBitcoinAddress('ab'.repeat(15))).toThrow(HashiTransactionError);
	});

	it('rejects non-hex characters in string', () => {
		expect(() => validateBitcoinAddress('zz'.repeat(20))).toThrow(HashiTransactionError);
	});

	it('rejects odd-length hex string', () => {
		expect(() => validateBitcoinAddress('abc')).toThrow(HashiTransactionError);
	});
});

// ============================================================
// Integration: Validation errors on builder construction
// ============================================================

describe('createDepositRequest validation', () => {
	it('throws for invalid txid', () => {
		expect(() =>
			createDepositRequest(config, {
				txid: 'not-a-valid-txid',
				vout: 0,
				amount: 100000n,
			}),
		).toThrow(HashiTransactionError);
	});

	it('throws for negative amount', () => {
		expect(() =>
			createDepositRequest(config, {
				txid: VALID_TXID,
				vout: 0,
				amount: -1n,
			}),
		).toThrow(HashiTransactionError);
	});

	it('throws for invalid vout', () => {
		expect(() =>
			createDepositRequest(config, {
				txid: VALID_TXID,
				vout: -1,
				amount: 100000n,
			}),
		).toThrow(HashiTransactionError);
	});

	it('throws for invalid derivation path', () => {
		expect(() =>
			createDepositRequest(config, {
				txid: VALID_TXID,
				vout: 0,
				amount: 100000n,
				derivationPath: 'not-hex',
			}),
		).toThrow(HashiTransactionError);
	});
});

describe('requestWithdrawal validation', () => {
	it('throws for invalid amount', () => {
		expect(() =>
			requestWithdrawal(config, {
				amount: -1n,
				bitcoinAddress: VALID_BTC_ADDRESS_20,
			}),
		).toThrow(HashiTransactionError);
	});

	it('throws for invalid bitcoin address length', () => {
		expect(() =>
			requestWithdrawal(config, {
				amount: 50000n,
				bitcoinAddress: new Uint8Array(16),
			}),
		).toThrow(HashiTransactionError);
	});
});

describe('cancelWithdrawal validation', () => {
	it('throws for invalid request ID', () => {
		expect(() =>
			cancelWithdrawal(config, {
				requestId: 'invalid-hex-id',
			}),
		).toThrow(HashiTransactionError);
	});
});
