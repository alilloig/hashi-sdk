import { describe, it, expect } from 'vitest';
import { Transaction } from '@mysten/sui/transactions';
import { bcs } from '@mysten/sui/bcs';
import { HashiConfig } from '../src/utils/config';
import { HashiTransactionError } from '../src/errors';

// -- Import all new builders --
import { confirmDeposit, deleteExpiredDeposits } from '../src/transactions/deposit-ops';
import {
	approveWithdrawalRequests,
	commitWithdrawalTx,
	signWithdrawal,
	confirmWithdrawal,
	deleteExpiredSpentUtxo,
	encodeUtxoId,
	encodeOutputUtxo,
} from '../src/transactions/withdrawal-ops';
import {
	register,
	updatePublicKey,
	updateOperatorAddress,
	updateEndpointUrl,
	updateTlsPublicKey,
	updateEncryptionPublicKey,
} from '../src/transactions/validator-ops';
import { startReconfig, endReconfig } from '../src/transactions/reconfig-ops';
import {
	submitDkgCert,
	submitRotationCert,
	submitNonceCert,
	destroyAllCerts,
} from '../src/transactions/cert-ops';
import {
	proposeUpdateConfig,
	proposeEnableVersion,
	proposeDisableVersion,
	proposeUpgrade,
	vote,
	removeVote,
	deleteExpiredProposal,
	executeUpdateConfig,
	executeEnableVersion,
	executeDisableVersion,
	executeUpgrade,
	finalizeUpgrade,
} from '../src/transactions/governance-ops';
import {
	validateSignature,
	validateSignersBitmap,
	validateNoDuplicates,
	validateNonEmpty,
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

const VALID_TXID = '0'.repeat(64);
const VALID_REQUEST_ID = '0x' + 'dd'.repeat(32);
const VALID_WITHDRAWAL_ID = '0x' + 'ee'.repeat(32);
const VALID_VALIDATOR_ID = '0x' + 'ff'.repeat(32);
const VALID_PROPOSAL_ID = '0x' + '11'.repeat(32);

/** A valid 48-byte BLS signature. */
const VALID_BLS_SIGNATURE = new Uint8Array(48).fill(0xab);

/** A valid signers bitmap. */
const VALID_BITMAP = new Uint8Array([0b11110000, 0b00001111]);

/** A valid 48-byte public key. */
const VALID_PUBLIC_KEY = new Uint8Array(48).fill(0x01);

/** A valid 32-byte package digest. */
const VALID_DIGEST = new Uint8Array(32).fill(0xfe);

// Helper to serialize transaction data for snapshots, handling BigInt
function serializeTxData(tx: Transaction): string {
	return JSON.stringify(
		tx.getData(),
		(_key, value) => (typeof value === 'bigint' ? `__bigint__${value}` : value),
		2,
	);
}

// ============================================================
// Snapshot Tests - Key Patterns
// ============================================================

describe('confirmDeposit snapshot (two-call PTB)', () => {
	it('produces correct PTB structure with 2 MoveCall commands', () => {
		const builder = confirmDeposit(config, {
			requestId: VALID_REQUEST_ID,
			epoch: 1n,
			signature: VALID_BLS_SIGNATURE,
			signersBitmap: VALID_BITMAP,
		});

		const tx = new Transaction();
		builder(tx);

		const serialized = serializeTxData(tx);
		expect(serialized).toMatchSnapshot();
	});

	it('creates exactly 2 commands', () => {
		const builder = confirmDeposit(config, {
			requestId: VALID_REQUEST_ID,
			epoch: 1n,
			signature: VALID_BLS_SIGNATURE,
			signersBitmap: VALID_BITMAP,
		});

		const tx = new Transaction();
		builder(tx);

		const data = tx.getData();
		expect(data.commands).toHaveLength(2);
	});

	it('has correct command types: MoveCall, MoveCall', () => {
		const builder = confirmDeposit(config, {
			requestId: VALID_REQUEST_ID,
			epoch: 1n,
			signature: VALID_BLS_SIGNATURE,
			signersBitmap: VALID_BITMAP,
		});

		const tx = new Transaction();
		builder(tx);

		const data = tx.getData();
		const commandKinds = data.commands.map((c: { $kind: string }) => c.$kind);
		expect(commandKinds).toEqual(['MoveCall', 'MoveCall']);
	});

	it('first call is to committee::new_committee_signature', () => {
		const builder = confirmDeposit(config, {
			requestId: VALID_REQUEST_ID,
			epoch: 1n,
			signature: VALID_BLS_SIGNATURE,
			signersBitmap: VALID_BITMAP,
		});

		const tx = new Transaction();
		builder(tx);

		const data = tx.getData();
		const firstCmd = data.commands[0] as { MoveCall: { module: string; function: string } };
		expect(firstCmd.MoveCall.module).toBe('committee');
		expect(firstCmd.MoveCall.function).toBe('new_committee_signature');
	});

	it('second call is to deposit::confirm_deposit', () => {
		const builder = confirmDeposit(config, {
			requestId: VALID_REQUEST_ID,
			epoch: 1n,
			signature: VALID_BLS_SIGNATURE,
			signersBitmap: VALID_BITMAP,
		});

		const tx = new Transaction();
		builder(tx);

		const data = tx.getData();
		const secondCmd = data.commands[1] as { MoveCall: { module: string; function: string } };
		expect(secondCmd.MoveCall.module).toBe('deposit');
		expect(secondCmd.MoveCall.function).toBe('confirm_deposit');
	});
});

describe('deleteExpiredDeposits snapshot (batched)', () => {
	it('creates N commands for N request IDs', () => {
		const builder = deleteExpiredDeposits(config, {
			requestIds: [VALID_REQUEST_ID, VALID_PROPOSAL_ID, VALID_VALIDATOR_ID],
		});

		const tx = new Transaction();
		builder(tx);

		const data = tx.getData();
		expect(data.commands).toHaveLength(3);
	});

	it('all commands call deposit::delete_expired_deposit', () => {
		const builder = deleteExpiredDeposits(config, {
			requestIds: [VALID_REQUEST_ID, VALID_PROPOSAL_ID],
		});

		const tx = new Transaction();
		builder(tx);

		const data = tx.getData();
		for (const cmd of data.commands) {
			const moveCall = (cmd as { MoveCall: { module: string; function: string } }).MoveCall;
			expect(moveCall.module).toBe('deposit');
			expect(moveCall.function).toBe('delete_expired_deposit');
		}
	});
});

describe('approveWithdrawalRequests snapshot (batched)', () => {
	it('produces correct PTB structure with batched calls', () => {
		const builder = approveWithdrawalRequests(config, {
			requestIds: [VALID_REQUEST_ID, VALID_PROPOSAL_ID],
			epoch: 5n,
			signature: VALID_BLS_SIGNATURE,
			signersBitmap: VALID_BITMAP,
		});

		const tx = new Transaction();
		builder(tx);

		const serialized = serializeTxData(tx);
		expect(serialized).toMatchSnapshot();
	});

	it('creates N commands for N request IDs', () => {
		const builder = approveWithdrawalRequests(config, {
			requestIds: [VALID_REQUEST_ID, VALID_PROPOSAL_ID, VALID_VALIDATOR_ID],
			epoch: 5n,
			signature: VALID_BLS_SIGNATURE,
			signersBitmap: VALID_BITMAP,
		});

		const tx = new Transaction();
		builder(tx);

		const data = tx.getData();
		expect(data.commands).toHaveLength(3);
	});
});

describe('commitWithdrawalTx snapshot (double-BCS)', () => {
	it('produces correct PTB structure', () => {
		const builder = commitWithdrawalTx(config, {
			requestIds: [VALID_REQUEST_ID],
			selectedUtxos: [{ txid: VALID_TXID, vout: 0 }],
			outputs: [{
				amount: 50000n,
				bitcoinAddress: new Uint8Array(20).fill(0xab),
			}],
			txid: VALID_TXID,
			epoch: 1n,
			signature: VALID_BLS_SIGNATURE,
			signersBitmap: VALID_BITMAP,
		});

		const tx = new Transaction();
		builder(tx);

		const serialized = serializeTxData(tx);
		expect(serialized).toMatchSnapshot();
	});

	it('creates exactly 1 MoveCall command', () => {
		const builder = commitWithdrawalTx(config, {
			requestIds: [VALID_REQUEST_ID],
			selectedUtxos: [{ txid: VALID_TXID, vout: 0 }],
			outputs: [{
				amount: 50000n,
				bitcoinAddress: new Uint8Array(20).fill(0xab),
			}],
			txid: VALID_TXID,
			epoch: 1n,
			signature: VALID_BLS_SIGNATURE,
			signersBitmap: VALID_BITMAP,
		});

		const tx = new Transaction();
		builder(tx);

		const data = tx.getData();
		expect(data.commands).toHaveLength(1);
	});

	it('accepts outputs.length === requestIds.length + 1 (with change)', () => {
		const builder = commitWithdrawalTx(config, {
			requestIds: [VALID_REQUEST_ID],
			selectedUtxos: [{ txid: VALID_TXID, vout: 0 }],
			outputs: [
				{ amount: 50000n, bitcoinAddress: new Uint8Array(20).fill(0xab) },
				{ amount: 10000n, bitcoinAddress: new Uint8Array(20).fill(0xcd) }, // change output
			],
			txid: VALID_TXID,
			epoch: 1n,
			signature: VALID_BLS_SIGNATURE,
			signersBitmap: VALID_BITMAP,
		});

		const tx = new Transaction();
		builder(tx);

		const data = tx.getData();
		expect(data.commands).toHaveLength(1);
	});
});

describe('vote with type parameter snapshot', () => {
	it('produces correct PTB structure with type argument', () => {
		const builder = vote(config, {
			proposalId: VALID_PROPOSAL_ID,
			proposalType: 'UpdateConfig',
		});

		const tx = new Transaction();
		builder(tx);

		const serialized = serializeTxData(tx);
		expect(serialized).toMatchSnapshot();
	});

	it('sets correct typeArguments for each proposal type', () => {
		const expectedModuleMap: Record<string, string> = {
			UpdateConfig: 'update_config::UpdateConfig',
			EnableVersion: 'enable_version::EnableVersion',
			DisableVersion: 'disable_version::DisableVersion',
			Upgrade: 'upgrade::Upgrade',
		};

		for (const proposalType of ['UpdateConfig', 'EnableVersion', 'DisableVersion', 'Upgrade'] as const) {
			const builder = vote(config, {
				proposalId: VALID_PROPOSAL_ID,
				proposalType,
			});

			const tx = new Transaction();
			builder(tx);

			const data = tx.getData();
			const cmd = data.commands[0] as { MoveCall: { typeArguments: string[] } };
			expect(cmd.MoveCall.typeArguments).toHaveLength(1);
			expect(cmd.MoveCall.typeArguments[0]).toContain(expectedModuleMap[proposalType]);
		}
	});
});

// ============================================================
// BCS Round-Trip Tests
// ============================================================

describe('BCS round-trip for UtxoId', () => {
	it('encodes and decodes UtxoId correctly', () => {
		const txid = '0x' + 'ab'.repeat(32);
		const vout = 42;

		const encoded = encodeUtxoId(txid, vout);
		expect(encoded.length).toBeGreaterThan(0);

		// Decode using the BCS schema from contracts
		const UtxoIdSchema = bcs.struct('UtxoId', {
			txid: bcs.Address,
			vout: bcs.u32(),
		});

		const decoded = UtxoIdSchema.parse(new Uint8Array(encoded));
		expect(decoded.txid).toBe(txid);
		expect(decoded.vout).toBe(vout);
	});

	it('handles zero txid and zero vout', () => {
		const txid = '0x' + '00'.repeat(32);
		const vout = 0;

		const encoded = encodeUtxoId(txid, vout);

		const UtxoIdSchema = bcs.struct('UtxoId', {
			txid: bcs.Address,
			vout: bcs.u32(),
		});

		const decoded = UtxoIdSchema.parse(new Uint8Array(encoded));
		expect(decoded.txid).toBe(txid);
		expect(decoded.vout).toBe(vout);
	});

	it('handles max vout', () => {
		const txid = '0x' + 'ff'.repeat(32);
		const vout = 0xFFFFFFFF;

		const encoded = encodeUtxoId(txid, vout);

		const UtxoIdSchema = bcs.struct('UtxoId', {
			txid: bcs.Address,
			vout: bcs.u32(),
		});

		const decoded = UtxoIdSchema.parse(new Uint8Array(encoded));
		expect(decoded.txid).toBe(txid);
		expect(decoded.vout).toBe(vout);
	});
});

describe('BCS round-trip for OutputUtxo', () => {
	it('encodes and decodes OutputUtxo correctly', () => {
		const amount = 100000n;
		const bitcoinAddress = new Uint8Array(20).fill(0xcd);

		const encoded = encodeOutputUtxo(amount, bitcoinAddress);
		expect(encoded.length).toBeGreaterThan(0);

		// Decode using the BCS schema
		const OutputUtxoSchema = bcs.struct('OutputUtxo', {
			amount: bcs.u64(),
			bitcoin_address: bcs.vector(bcs.u8()),
		});

		const decoded = OutputUtxoSchema.parse(new Uint8Array(encoded));
		// BCS u64 returns a string representation
		expect(BigInt(decoded.amount)).toBe(amount);
		expect(new Uint8Array(decoded.bitcoin_address)).toEqual(bitcoinAddress);
	});

	it('handles large amount', () => {
		const amount = 2100000000000000n; // 21 million BTC in sats
		const bitcoinAddress = new Uint8Array(32).fill(0xab);

		const encoded = encodeOutputUtxo(amount, bitcoinAddress);

		const OutputUtxoSchema = bcs.struct('OutputUtxo', {
			amount: bcs.u64(),
			bitcoin_address: bcs.vector(bcs.u8()),
		});

		const decoded = OutputUtxoSchema.parse(new Uint8Array(encoded));
		expect(BigInt(decoded.amount)).toBe(amount);
		expect(new Uint8Array(decoded.bitcoin_address)).toEqual(bitcoinAddress);
	});

	it('handles zero amount', () => {
		const amount = 0n;
		const bitcoinAddress = new Uint8Array(20).fill(0x00);

		const encoded = encodeOutputUtxo(amount, bitcoinAddress);

		const OutputUtxoSchema = bcs.struct('OutputUtxo', {
			amount: bcs.u64(),
			bitcoin_address: bcs.vector(bcs.u8()),
		});

		const decoded = OutputUtxoSchema.parse(new Uint8Array(encoded));
		expect(BigInt(decoded.amount)).toBe(amount);
		expect(new Uint8Array(decoded.bitcoin_address)).toEqual(bitcoinAddress);
	});
});

// ============================================================
// Validation Tests - Preflight Checks
// ============================================================

describe('validateSignature', () => {
	it('accepts valid 48-byte signature', () => {
		const result = validateSignature(VALID_BLS_SIGNATURE);
		expect(result).toHaveLength(48);
	});

	it('rejects non-48-byte signature', () => {
		expect(() => validateSignature(new Uint8Array(47))).toThrow(HashiTransactionError);
		expect(() => validateSignature(new Uint8Array(49))).toThrow(HashiTransactionError);
		expect(() => validateSignature(new Uint8Array(0))).toThrow(HashiTransactionError);
	});

	it('rejects non-Uint8Array', () => {
		expect(() => validateSignature(null as unknown as Uint8Array)).toThrow(HashiTransactionError);
		expect(() => validateSignature([1, 2, 3] as unknown as Uint8Array)).toThrow(HashiTransactionError);
	});
});

describe('validateSignersBitmap', () => {
	it('accepts valid non-empty bitmap', () => {
		const result = validateSignersBitmap(VALID_BITMAP);
		expect(result).toHaveLength(2);
	});

	it('rejects empty bitmap', () => {
		expect(() => validateSignersBitmap(new Uint8Array(0))).toThrow(HashiTransactionError);
	});

	it('rejects non-Uint8Array', () => {
		expect(() => validateSignersBitmap(null as unknown as Uint8Array)).toThrow(HashiTransactionError);
	});
});

describe('validateNoDuplicates', () => {
	it('accepts unique items', () => {
		expect(() => validateNoDuplicates(['a', 'b', 'c'], 'test')).not.toThrow();
	});

	it('rejects duplicates', () => {
		expect(() => validateNoDuplicates(['a', 'b', 'a'], 'test')).toThrow(HashiTransactionError);
	});
});

describe('validateNonEmpty', () => {
	it('accepts non-empty array', () => {
		expect(() => validateNonEmpty([1], 'test')).not.toThrow();
	});

	it('rejects empty array', () => {
		expect(() => validateNonEmpty([], 'test')).toThrow(HashiTransactionError);
	});
});

// ============================================================
// Validation Error Tests for Builders
// ============================================================

describe('confirmDeposit validation', () => {
	it('throws for invalid signature length', () => {
		expect(() =>
			confirmDeposit(config, {
				requestId: VALID_REQUEST_ID,
				epoch: 1n,
				signature: new Uint8Array(32), // wrong length
				signersBitmap: VALID_BITMAP,
			}),
		).toThrow(HashiTransactionError);
	});

	it('throws for empty signersBitmap', () => {
		expect(() =>
			confirmDeposit(config, {
				requestId: VALID_REQUEST_ID,
				epoch: 1n,
				signature: VALID_BLS_SIGNATURE,
				signersBitmap: new Uint8Array(0),
			}),
		).toThrow(HashiTransactionError);
	});

	it('throws for invalid requestId', () => {
		expect(() =>
			confirmDeposit(config, {
				requestId: 'not-valid',
				epoch: 1n,
				signature: VALID_BLS_SIGNATURE,
				signersBitmap: VALID_BITMAP,
			}),
		).toThrow(HashiTransactionError);
	});
});

describe('commitWithdrawalTx validation', () => {
	it('throws for empty requestIds', () => {
		expect(() =>
			commitWithdrawalTx(config, {
				requestIds: [],
				selectedUtxos: [{ txid: VALID_TXID, vout: 0 }],
				outputs: [{ amount: 50000n, bitcoinAddress: new Uint8Array(20).fill(0xab) }],
				txid: VALID_TXID,
				epoch: 1n,
				signature: VALID_BLS_SIGNATURE,
				signersBitmap: VALID_BITMAP,
			}),
		).toThrow(HashiTransactionError);
	});

	it('throws for empty selectedUtxos', () => {
		expect(() =>
			commitWithdrawalTx(config, {
				requestIds: [VALID_REQUEST_ID],
				selectedUtxos: [],
				outputs: [{ amount: 50000n, bitcoinAddress: new Uint8Array(20).fill(0xab) }],
				txid: VALID_TXID,
				epoch: 1n,
				signature: VALID_BLS_SIGNATURE,
				signersBitmap: VALID_BITMAP,
			}),
		).toThrow(HashiTransactionError);
	});

	it('throws for duplicate requestIds', () => {
		expect(() =>
			commitWithdrawalTx(config, {
				requestIds: [VALID_REQUEST_ID, VALID_REQUEST_ID],
				selectedUtxos: [{ txid: VALID_TXID, vout: 0 }],
				outputs: [
					{ amount: 50000n, bitcoinAddress: new Uint8Array(20).fill(0xab) },
					{ amount: 30000n, bitcoinAddress: new Uint8Array(20).fill(0xcd) },
				],
				txid: VALID_TXID,
				epoch: 1n,
				signature: VALID_BLS_SIGNATURE,
				signersBitmap: VALID_BITMAP,
			}),
		).toThrow(HashiTransactionError);
	});

	it('throws for duplicate selectedUtxos', () => {
		expect(() =>
			commitWithdrawalTx(config, {
				requestIds: [VALID_REQUEST_ID],
				selectedUtxos: [
					{ txid: VALID_TXID, vout: 0 },
					{ txid: VALID_TXID, vout: 0 },
				],
				outputs: [{ amount: 50000n, bitcoinAddress: new Uint8Array(20).fill(0xab) }],
				txid: VALID_TXID,
				epoch: 1n,
				signature: VALID_BLS_SIGNATURE,
				signersBitmap: VALID_BITMAP,
			}),
		).toThrow(HashiTransactionError);
	});

	it('throws for wrong outputs count', () => {
		expect(() =>
			commitWithdrawalTx(config, {
				requestIds: [VALID_REQUEST_ID],
				selectedUtxos: [{ txid: VALID_TXID, vout: 0 }],
				outputs: [
					{ amount: 50000n, bitcoinAddress: new Uint8Array(20).fill(0xab) },
					{ amount: 30000n, bitcoinAddress: new Uint8Array(20).fill(0xcd) },
					{ amount: 10000n, bitcoinAddress: new Uint8Array(20).fill(0xef) }, // 3 outputs for 1 request
				],
				txid: VALID_TXID,
				epoch: 1n,
				signature: VALID_BLS_SIGNATURE,
				signersBitmap: VALID_BITMAP,
			}),
		).toThrow(HashiTransactionError);
	});
});

describe('signWithdrawal validation', () => {
	it('throws for empty signatures array', () => {
		expect(() =>
			signWithdrawal(config, {
				withdrawalId: VALID_WITHDRAWAL_ID,
				requestIds: [VALID_REQUEST_ID],
				signatures: [],
				epoch: 1n,
				signature: VALID_BLS_SIGNATURE,
				signersBitmap: VALID_BITMAP,
			}),
		).toThrow(HashiTransactionError);
	});
});

// ============================================================
// Structural Tests - Other Builders
// ============================================================

describe('register', () => {
	it('creates exactly 1 MoveCall command', () => {
		const builder = register(config);
		const tx = new Transaction();
		builder(tx);

		const data = tx.getData();
		expect(data.commands).toHaveLength(1);
	});

	it('calls validator::register', () => {
		const builder = register(config);
		const tx = new Transaction();
		builder(tx);

		const data = tx.getData();
		const cmd = data.commands[0] as { MoveCall: { module: string; function: string } };
		expect(cmd.MoveCall.module).toBe('validator');
		expect(cmd.MoveCall.function).toBe('register');
	});
});

describe('startReconfig', () => {
	it('creates exactly 1 MoveCall command', () => {
		const builder = startReconfig(config);
		const tx = new Transaction();
		builder(tx);

		const data = tx.getData();
		expect(data.commands).toHaveLength(1);
	});

	it('calls reconfig::start_reconfig', () => {
		const builder = startReconfig(config);
		const tx = new Transaction();
		builder(tx);

		const data = tx.getData();
		const cmd = data.commands[0] as { MoveCall: { module: string; function: string } };
		expect(cmd.MoveCall.module).toBe('reconfig');
		expect(cmd.MoveCall.function).toBe('start_reconfig');
	});
});

describe('endReconfig', () => {
	it('creates exactly 1 MoveCall command', () => {
		const builder = endReconfig(config, {
			mpcPublicKey: VALID_PUBLIC_KEY,
			signature: VALID_BLS_SIGNATURE,
			signersBitmap: VALID_BITMAP,
		});
		const tx = new Transaction();
		builder(tx);

		const data = tx.getData();
		expect(data.commands).toHaveLength(1);
	});

	it('throws for empty mpcPublicKey', () => {
		expect(() =>
			endReconfig(config, {
				mpcPublicKey: new Uint8Array(0),
				signature: VALID_BLS_SIGNATURE,
				signersBitmap: VALID_BITMAP,
			}),
		).toThrow(HashiTransactionError);
	});
});

describe('validator update methods', () => {
	it('updatePublicKey creates 1 command', () => {
		const builder = updatePublicKey(config, {
			validator: VALID_VALIDATOR_ID,
			nextEpochPublicKey: VALID_PUBLIC_KEY,
			proofOfPossessionSignature: VALID_BLS_SIGNATURE,
		});
		const tx = new Transaction();
		builder(tx);
		expect(tx.getData().commands).toHaveLength(1);
	});

	it('updateOperatorAddress creates 1 command', () => {
		const builder = updateOperatorAddress(config, {
			validator: VALID_VALIDATOR_ID,
			operator: VALID_REQUEST_ID,
		});
		const tx = new Transaction();
		builder(tx);
		expect(tx.getData().commands).toHaveLength(1);
	});

	it('updateEndpointUrl creates 1 command', () => {
		const builder = updateEndpointUrl(config, {
			validator: VALID_VALIDATOR_ID,
			endpointUrl: 'https://example.com',
		});
		const tx = new Transaction();
		builder(tx);
		expect(tx.getData().commands).toHaveLength(1);
	});

	it('updateTlsPublicKey creates 1 command', () => {
		const builder = updateTlsPublicKey(config, {
			validator: VALID_VALIDATOR_ID,
			tlsPublicKey: new Uint8Array(32).fill(0x01),
		});
		const tx = new Transaction();
		builder(tx);
		expect(tx.getData().commands).toHaveLength(1);
	});

	it('updateEncryptionPublicKey creates 1 command', () => {
		const builder = updateEncryptionPublicKey(config, {
			validator: VALID_VALIDATOR_ID,
			nextEpochEncryptionPublicKey: new Uint8Array(32).fill(0x02),
		});
		const tx = new Transaction();
		builder(tx);
		expect(tx.getData().commands).toHaveLength(1);
	});
});

describe('cert submission methods', () => {
	const baseCertParams = {
		epoch: 1n,
		dealer: VALID_VALIDATOR_ID,
		messagesHash: new Uint8Array(32).fill(0xaa),
		signature: VALID_BLS_SIGNATURE,
		signersBitmap: VALID_BITMAP,
	};

	it('submitDkgCert creates 1 command', () => {
		const builder = submitDkgCert(config, baseCertParams);
		const tx = new Transaction();
		builder(tx);
		expect(tx.getData().commands).toHaveLength(1);
	});

	it('submitRotationCert creates 1 command', () => {
		const builder = submitRotationCert(config, baseCertParams);
		const tx = new Transaction();
		builder(tx);
		expect(tx.getData().commands).toHaveLength(1);
	});

	it('submitNonceCert creates 1 command', () => {
		const builder = submitNonceCert(config, { ...baseCertParams, batchIndex: 0 });
		const tx = new Transaction();
		builder(tx);
		expect(tx.getData().commands).toHaveLength(1);
	});

	it('destroyAllCerts creates 1 command', () => {
		const builder = destroyAllCerts(config, { epoch: 1n, batchIndex: null });
		const tx = new Transaction();
		builder(tx);
		expect(tx.getData().commands).toHaveLength(1);
	});

	it('destroyAllCerts with batchIndex creates 1 command', () => {
		const builder = destroyAllCerts(config, { epoch: 1n, batchIndex: 3 });
		const tx = new Transaction();
		builder(tx);
		expect(tx.getData().commands).toHaveLength(1);
	});
});

describe('governance proposal methods', () => {
	it('proposeUpdateConfig creates 1 command', () => {
		const builder = proposeUpdateConfig(config, {
			key: 'withdrawal_fee_btc',
			value: VALID_REQUEST_ID,
			metadata: VALID_PROPOSAL_ID,
		});
		const tx = new Transaction();
		builder(tx);
		expect(tx.getData().commands).toHaveLength(1);
	});

	it('proposeEnableVersion creates 1 command', () => {
		const builder = proposeEnableVersion(config, {
			version: 2n,
			metadata: VALID_PROPOSAL_ID,
		});
		const tx = new Transaction();
		builder(tx);
		expect(tx.getData().commands).toHaveLength(1);
	});

	it('proposeDisableVersion creates 1 command', () => {
		const builder = proposeDisableVersion(config, {
			version: 1n,
			metadata: VALID_PROPOSAL_ID,
		});
		const tx = new Transaction();
		builder(tx);
		expect(tx.getData().commands).toHaveLength(1);
	});

	it('proposeUpgrade creates 1 command', () => {
		const builder = proposeUpgrade(config, {
			digest: VALID_DIGEST,
			metadata: VALID_PROPOSAL_ID,
		});
		const tx = new Transaction();
		builder(tx);
		expect(tx.getData().commands).toHaveLength(1);
	});

	it('executeUpdateConfig creates 1 command', () => {
		const builder = executeUpdateConfig(config, { proposalId: VALID_PROPOSAL_ID });
		const tx = new Transaction();
		builder(tx);
		expect(tx.getData().commands).toHaveLength(1);
	});

	it('executeEnableVersion creates 1 command', () => {
		const builder = executeEnableVersion(config, { proposalId: VALID_PROPOSAL_ID });
		const tx = new Transaction();
		builder(tx);
		expect(tx.getData().commands).toHaveLength(1);
	});

	it('executeDisableVersion creates 1 command', () => {
		const builder = executeDisableVersion(config, { proposalId: VALID_PROPOSAL_ID });
		const tx = new Transaction();
		builder(tx);
		expect(tx.getData().commands).toHaveLength(1);
	});

	it('executeUpgrade creates 1 command and returns TransactionResult', () => {
		const builder = executeUpgrade(config, { proposalId: VALID_PROPOSAL_ID });
		const tx = new Transaction();
		const result = builder(tx);
		expect(tx.getData().commands).toHaveLength(1);
		expect(result).toBeDefined();
		expect(result.$kind).toBeDefined();
	});

	it('finalizeUpgrade creates 1 command', () => {
		const builder = finalizeUpgrade(config, { receipt: VALID_PROPOSAL_ID });
		const tx = new Transaction();
		builder(tx);
		expect(tx.getData().commands).toHaveLength(1);
	});

	it('removeVote creates 1 command with type argument', () => {
		const builder = removeVote(config, {
			proposalId: VALID_PROPOSAL_ID,
			proposalType: 'Upgrade',
		});
		const tx = new Transaction();
		builder(tx);
		const data = tx.getData();
		expect(data.commands).toHaveLength(1);
		const cmd = data.commands[0] as { MoveCall: { typeArguments: string[] } };
		expect(cmd.MoveCall.typeArguments[0]).toContain('upgrade::Upgrade');
	});

	it('deleteExpiredProposal creates 1 command with type argument', () => {
		const builder = deleteExpiredProposal(config, {
			proposalId: VALID_PROPOSAL_ID,
			proposalType: 'EnableVersion',
		});
		const tx = new Transaction();
		builder(tx);
		const data = tx.getData();
		expect(data.commands).toHaveLength(1);
		const cmd = data.commands[0] as { MoveCall: { typeArguments: string[] } };
		expect(cmd.MoveCall.typeArguments[0]).toContain('enable_version::EnableVersion');
	});
});

describe('deleteExpiredSpentUtxo', () => {
	it('creates exactly 1 MoveCall command', () => {
		const builder = deleteExpiredSpentUtxo(config, {
			txid: VALID_TXID,
			vout: 0,
		});
		const tx = new Transaction();
		builder(tx);
		expect(tx.getData().commands).toHaveLength(1);
	});

	it('calls withdraw::delete_expired_spent_utxo', () => {
		const builder = deleteExpiredSpentUtxo(config, {
			txid: VALID_TXID,
			vout: 0,
		});
		const tx = new Transaction();
		builder(tx);
		const cmd = tx.getData().commands[0] as { MoveCall: { module: string; function: string } };
		expect(cmd.MoveCall.module).toBe('withdraw');
		expect(cmd.MoveCall.function).toBe('delete_expired_spent_utxo');
	});
});

describe('confirmWithdrawal', () => {
	it('creates exactly 1 MoveCall command', () => {
		const builder = confirmWithdrawal(config, {
			withdrawalId: VALID_WITHDRAWAL_ID,
			epoch: 1n,
			signature: VALID_BLS_SIGNATURE,
			signersBitmap: VALID_BITMAP,
		});
		const tx = new Transaction();
		builder(tx);
		expect(tx.getData().commands).toHaveLength(1);
	});

	it('calls withdraw::confirm_withdrawal', () => {
		const builder = confirmWithdrawal(config, {
			withdrawalId: VALID_WITHDRAWAL_ID,
			epoch: 1n,
			signature: VALID_BLS_SIGNATURE,
			signersBitmap: VALID_BITMAP,
		});
		const tx = new Transaction();
		builder(tx);
		const cmd = tx.getData().commands[0] as { MoveCall: { module: string; function: string } };
		expect(cmd.MoveCall.module).toBe('withdraw');
		expect(cmd.MoveCall.function).toBe('confirm_withdrawal');
	});
});

describe('signWithdrawal', () => {
	it('creates exactly 1 MoveCall command', () => {
		const builder = signWithdrawal(config, {
			withdrawalId: VALID_WITHDRAWAL_ID,
			requestIds: [VALID_REQUEST_ID],
			signatures: [new Uint8Array(64).fill(0x01)],
			epoch: 1n,
			signature: VALID_BLS_SIGNATURE,
			signersBitmap: VALID_BITMAP,
		});
		const tx = new Transaction();
		builder(tx);
		expect(tx.getData().commands).toHaveLength(1);
	});

	it('calls withdraw::sign_withdrawal', () => {
		const builder = signWithdrawal(config, {
			withdrawalId: VALID_WITHDRAWAL_ID,
			requestIds: [VALID_REQUEST_ID],
			signatures: [new Uint8Array(64).fill(0x01)],
			epoch: 1n,
			signature: VALID_BLS_SIGNATURE,
			signersBitmap: VALID_BITMAP,
		});
		const tx = new Transaction();
		builder(tx);
		const cmd = tx.getData().commands[0] as { MoveCall: { module: string; function: string } };
		expect(cmd.MoveCall.module).toBe('withdraw');
		expect(cmd.MoveCall.function).toBe('sign_withdrawal');
	});
});
