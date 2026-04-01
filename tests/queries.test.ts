import { describe, it, expect, vi } from 'vitest';
import type { CoreClient, SuiClientTypes } from '@mysten/sui/client';
import { bcs } from '@mysten/sui/bcs';
import { HashiConfig } from '../src/utils/config';
import { HashiQueryError, HashiParseError } from '../src/errors';
import {
	getHashiState,
	getConfig,
	getDepositRequest,
	listDepositRequests,
	getWithdrawalRequest,
	listPendingWithdrawals,
	getCommittee,
	getMemberInfo,
	getUtxo,
} from '../src/queries/index';

// BCS types for building fixtures
import { Hashi as HashiBcs } from '../src/contracts/hashi/hashi';
import { DepositRequest as DepositRequestBcs } from '../src/contracts/hashi/deposit_queue';
import {
	WithdrawalRequest as WithdrawalRequestBcs,
	PendingWithdrawal as PendingWithdrawalBcs,
} from '../src/contracts/hashi/withdrawal_queue';
import { Committee as CommitteeBcs } from '../src/contracts/hashi/committee';
import { MemberInfo as MemberInfoBcs } from '../src/contracts/hashi/committee_set';
import { Utxo as UtxoBcs } from '../src/contracts/hashi/utxo';

// ---- Test fixture helpers ----

const ZERO_ADDR = '0x' + '0'.repeat(64);
const TEST_ADDR_1 = '0x' + 'aa'.repeat(32);
const TEST_ADDR_2 = '0x' + 'bb'.repeat(32);
const TEST_ADDR_3 = '0x' + 'cc'.repeat(32);
const TEST_TXID = '0x' + 'dd'.repeat(32);

function makeTestConfig(): HashiConfig {
	return new HashiConfig({
		packageId: TEST_ADDR_1,
		originalPackageId: TEST_ADDR_2,
		hashiObjectId: TEST_ADDR_3,
	});
}

/**
 * Build a minimal valid Hashi BCS fixture.
 */
function makeHashiStateBytes(): Uint8Array {
	return HashiBcs.serialize({
		id: TEST_ADDR_3,
		committee_set: {
			members: { id: '0x' + '01'.repeat(32), size: 2n },
			epoch: 5n,
			committees: { id: '0x' + '02'.repeat(32), size: 3n },
			pending_epoch_change: null,
			mpc_public_key: [1, 2, 3, 4],
		},
		config: {
			config: {
				contents: [
					{ key: 'min_deposit', value: { U64: 1000n } },
					{ key: 'bridge_paused', value: { Bool: false } },
				],
			},
			enabled_versions: { contents: [1n, 2n] },
			upgrade_cap: {
				id: '0x' + '03'.repeat(32),
				package: TEST_ADDR_1,
				version: 2n,
				policy: 0,
			},
		},
		treasury: {
			objects: { id: '0x' + '04'.repeat(32), size: 1n },
		},
		deposit_queue: {
			requests: { id: '0x' + '05'.repeat(32), size: 10n },
		},
		withdrawal_queue: {
			requests: { id: '0x' + '06'.repeat(32), size: 5n },
			pending_withdrawals: { id: '0x' + '07'.repeat(32), size: 2n },
			num_consumed_presigs: 42n,
		},
		utxo_pool: {
			active_utxos: { id: '0x' + '08'.repeat(32), size: 20n },
			spent_utxos: { id: '0x' + '09'.repeat(32), size: 3n },
		},
		proposals: { id: '0x' + '0a'.repeat(32), size: 0n },
		tob: { id: '0x' + '0b'.repeat(32), size: 0n },
	}).toBytes();
}

function makeDepositRequestBytes(): Uint8Array {
	return DepositRequestBcs.serialize({
		id: TEST_ADDR_1,
		utxo: {
			id: { txid: TEST_TXID, vout: 0 },
			amount: 100000n,
			derivation_path: TEST_ADDR_2,
		},
		timestamp_ms: 1700000000000n,
		requester_address: TEST_ADDR_2,
		sui_tx_digest: Array.from({ length: 32 }, (_, i) => i),
	}).toBytes();
}

function makeWithdrawalRequestBytes(): Uint8Array {
	return WithdrawalRequestBcs.serialize({
		info: {
			id: TEST_ADDR_1,
			btc_amount: 50000n,
			bitcoin_address: Array.from({ length: 20 }, () => 0xab),
			timestamp_ms: 1700000000000n,
			requester_address: TEST_ADDR_2,
			sui_tx_digest: Array.from({ length: 32 }, (_, i) => i),
		},
		btc: { value: 50000n },
		approved: true,
	}).toBytes();
}

function makePendingWithdrawalBytes(): Uint8Array {
	return PendingWithdrawalBcs.serialize({
		id: TEST_ADDR_1,
		txid: TEST_TXID,
		requests: [
			{
				id: TEST_ADDR_2,
				btc_amount: 25000n,
				bitcoin_address: Array.from({ length: 20 }, () => 0xcd),
				timestamp_ms: 1700000000000n,
				requester_address: TEST_ADDR_3,
				sui_tx_digest: Array.from({ length: 32 }, () => 0xff),
			},
		],
		inputs: [
			{
				id: { txid: TEST_TXID, vout: 0 },
				amount: 50000n,
				derivation_path: null,
			},
		],
		withdrawal_outputs: [
			{
				amount: 25000n,
				bitcoin_address: Array.from({ length: 20 }, () => 0xcd),
			},
		],
		change_output: {
			amount: 24000n,
			bitcoin_address: Array.from({ length: 20 }, () => 0xef),
		},
		timestamp_ms: 1700000000000n,
		randomness: [1, 2, 3],
		signatures: null,
	}).toBytes();
}

function makeCommitteeBytes(): Uint8Array {
	return CommitteeBcs.serialize({
		epoch: 5n,
		members: [
			{
				validator_address: TEST_ADDR_1,
				public_key: { bytes: Array.from({ length: 48 }, () => 0x01) },
				encryption_public_key: Array.from({ length: 32 }, () => 0x02),
				weight: 100n,
			},
			{
				validator_address: TEST_ADDR_2,
				public_key: { bytes: Array.from({ length: 48 }, () => 0x03) },
				encryption_public_key: Array.from({ length: 32 }, () => 0x04),
				weight: 200n,
			},
		],
		total_weight: 300n,
	}).toBytes();
}

function makeMemberInfoBytes(): Uint8Array {
	return MemberInfoBcs.serialize({
		validator_address: TEST_ADDR_1,
		operator_address: TEST_ADDR_2,
		next_epoch_public_key: { bytes: Array.from({ length: 48 }, () => 0x05) },
		endpoint_url: 'https://validator.example.com',
		tls_public_key: Array.from({ length: 32 }, () => 0x06),
		next_epoch_encryption_public_key: Array.from({ length: 32 }, () => 0x07),
	}).toBytes();
}

function makeUtxoBytes(): Uint8Array {
	return UtxoBcs.serialize({
		id: { txid: TEST_TXID, vout: 1 },
		amount: 75000n,
		derivation_path: TEST_ADDR_1,
	}).toBytes();
}

// ---- Mock client factory ----

interface MockClientSetup {
	getObjectResult?: Uint8Array | null;
	getDynamicFieldResult?: Uint8Array | null;
	listDynamicFieldsResult?: SuiClientTypes.ListDynamicFieldsResponse;
	getObjectError?: Error;
	getDynamicFieldError?: Error;
}

function createMockClient(setup: MockClientSetup = {}): CoreClient {
	const mockGetObject = vi.fn().mockImplementation(async () => {
		if (setup.getObjectError) {
			throw setup.getObjectError;
		}
		if (setup.getObjectResult == null) {
			throw new Error('Object not found');
		}
		return {
			object: {
				objectId: TEST_ADDR_3,
				version: '1',
				digest: 'test',
				owner: { $kind: 'Shared' },
				type: 'test::hashi::Hashi',
				content: setup.getObjectResult,
			},
		};
	});

	const mockGetDynamicField = vi.fn().mockImplementation(async () => {
		if (setup.getDynamicFieldError) {
			throw setup.getDynamicFieldError;
		}
		if (setup.getDynamicFieldResult == null) {
			throw new Error('Dynamic field not found');
		}
		return {
			dynamicField: {
				$kind: 'DynamicField' as const,
				fieldId: ZERO_ADDR,
				type: 'test',
				name: { type: 'address', bcs: new Uint8Array(32) },
				value: { type: 'test', bcs: setup.getDynamicFieldResult },
				version: '1',
				digest: 'test',
				previousTransaction: null,
			},
		};
	});

	const mockListDynamicFields = vi.fn().mockImplementation(async () => {
		return setup.listDynamicFieldsResult ?? {
			dynamicFields: [],
			hasNextPage: false,
			cursor: null,
		};
	});

	return {
		getObject: mockGetObject,
		getDynamicField: mockGetDynamicField,
		listDynamicFields: mockListDynamicFields,
	} as unknown as CoreClient;
}

/**
 * Creates a mock client that returns the Hashi state for getObject
 * and a custom result for getDynamicField.
 */
function createMockClientWithState(dynamicFieldResult?: Uint8Array | null): CoreClient {
	const hashiBytes = makeHashiStateBytes();

	const mockGetObject = vi.fn().mockImplementation(async () => {
		return {
			object: {
				objectId: TEST_ADDR_3,
				version: '1',
				digest: 'test',
				owner: { $kind: 'Shared' },
				type: 'test::hashi::Hashi',
				content: hashiBytes,
			},
		};
	});

	const mockGetDynamicField = vi.fn().mockImplementation(async () => {
		if (dynamicFieldResult == null) {
			throw new Error('Dynamic field not found');
		}
		return {
			dynamicField: {
				$kind: 'DynamicField' as const,
				fieldId: ZERO_ADDR,
				type: 'test',
				name: { type: 'address', bcs: new Uint8Array(32) },
				value: { type: 'test', bcs: dynamicFieldResult },
				version: '1',
				digest: 'test',
				previousTransaction: null,
			},
		};
	});

	const mockListDynamicFields = vi.fn().mockImplementation(async () => {
		return {
			dynamicFields: [],
			hasNextPage: false,
			cursor: null,
		};
	});

	return {
		getObject: mockGetObject,
		getDynamicField: mockGetDynamicField,
		listDynamicFields: mockListDynamicFields,
	} as unknown as CoreClient;
}

// ---- Tests ----

describe('getHashiState', () => {
	it('returns correctly deserialized HashiState', async () => {
		const config = makeTestConfig();
		const client = createMockClient({ getObjectResult: makeHashiStateBytes() });

		const state = await getHashiState(client, config);

		expect(state.id).toBe(TEST_ADDR_3);
		expect(state.committeeSet.epoch).toBe(5n);
		expect(state.committeeSet.members.id).toBe('0x' + '01'.repeat(32));
		expect(state.committeeSet.members.size).toBe(2);
		expect(state.committeeSet.committees.size).toBe(3);
		expect(state.committeeSet.pendingEpochChange).toBeNull();
		expect(state.committeeSet.mpcPublicKey).toEqual(new Uint8Array([1, 2, 3, 4]));
		expect(state.config.enabledVersions).toEqual([1n, 2n]);
		expect(state.config.upgradeCap).not.toBeNull();
		expect(state.config.upgradeCap!.version).toBe(2n);
		expect(state.config.upgradeCap!.policy).toBe(0);
		expect(state.depositQueue.requests.size).toBe(10);
		expect(state.withdrawalQueue.numConsumedPresigs).toBe(42n);
		expect(state.utxoPool.activeUtxos.size).toBe(20);
		expect(state.proposals.size).toBe(0);
		expect(state.tob.size).toBe(0);
	});

	it('includes correct config entries', async () => {
		const config = makeTestConfig();
		const client = createMockClient({ getObjectResult: makeHashiStateBytes() });

		const state = await getHashiState(client, config);

		expect(state.config.config).toHaveLength(2);
		expect(state.config.config[0].key).toBe('min_deposit');
		expect(state.config.config[0].value).toEqual({ type: 'U64', value: 1000n });
		expect(state.config.config[1].key).toBe('bridge_paused');
		expect(state.config.config[1].value).toEqual({ type: 'Bool', value: false });
	});

	it('throws HashiQueryError when object not found', async () => {
		const config = makeTestConfig();
		const client = createMockClient({ getObjectResult: null });

		await expect(getHashiState(client, config)).rejects.toThrow(HashiQueryError);
	});

	it('throws HashiParseError on invalid BCS data', async () => {
		const config = makeTestConfig();
		const client = createMockClient({
			getObjectResult: new Uint8Array([0, 1, 2]),
		});

		await expect(getHashiState(client, config)).rejects.toThrow(HashiParseError);
	});

	it('throws HashiQueryError on RPC error', async () => {
		const config = makeTestConfig();
		const client = createMockClient({
			getObjectError: new Error('RPC connection failed'),
		});

		await expect(getHashiState(client, config)).rejects.toThrow(HashiQueryError);
	});
});

describe('getConfig', () => {
	it('returns correctly structured Config', async () => {
		const config = makeTestConfig();
		const client = createMockClient({ getObjectResult: makeHashiStateBytes() });

		const result = await getConfig(client, config);

		expect(result.entries).toHaveLength(2);
		expect(result.entries[0].key).toBe('min_deposit');
		expect(result.entries[0].value).toEqual({ type: 'U64', value: 1000n });
		expect(result.entries[1].key).toBe('bridge_paused');
		expect(result.entries[1].value).toEqual({ type: 'Bool', value: false });
		expect(result.enabledVersions).toEqual([1n, 2n]);
		expect(result.upgradeCap).not.toBeNull();
	});
});

describe('getDepositRequest', () => {
	it('returns correctly deserialized DepositRequest', async () => {
		const config = makeTestConfig();
		const client = createMockClientWithState(makeDepositRequestBytes());

		const result = await getDepositRequest(client, config, TEST_ADDR_1);

		expect(result).not.toBeNull();
		expect(result!.id).toBe(TEST_ADDR_1);
		expect(result!.utxo.id.txid).toBe(TEST_TXID);
		expect(result!.utxo.id.vout).toBe(0);
		expect(result!.utxo.amount).toBe(100000n);
		expect(result!.timestampMs).toBe(1700000000000n);
		expect(result!.requesterAddress).toBe(TEST_ADDR_2);
	});

	it('returns null when deposit request not found', async () => {
		const config = makeTestConfig();
		const client = createMockClientWithState(null);

		const result = await getDepositRequest(client, config, TEST_ADDR_1);
		expect(result).toBeNull();
	});

	it('throws HashiParseError on invalid BCS', async () => {
		const config = makeTestConfig();
		const client = createMockClientWithState(new Uint8Array([0xff, 0xff]));

		await expect(
			getDepositRequest(client, config, TEST_ADDR_1),
		).rejects.toThrow(HashiParseError);
	});
});

describe('listDepositRequests', () => {
	it('returns empty list when no deposits', async () => {
		const config = makeTestConfig();
		const client = createMockClientWithState();

		const result = await listDepositRequests(client, config);

		expect(result.items).toHaveLength(0);
		expect(result.hasNextPage).toBe(false);
		expect(result.nextCursor).toBeNull();
	});

	it('returns paginated deposits with items', async () => {
		const config = makeTestConfig();
		const hashiBytes = makeHashiStateBytes();
		const depositBytes = makeDepositRequestBytes();

		const mockGetObject = vi.fn().mockResolvedValue({
			object: {
				objectId: TEST_ADDR_3,
				version: '1',
				digest: 'test',
				owner: { $kind: 'Shared' },
				type: 'test',
				content: hashiBytes,
			},
		});

		const nameBcs = bcs.Address.serialize(TEST_ADDR_1).toBytes();

		const mockListDynamicFields = vi.fn().mockResolvedValue({
			dynamicFields: [
				{
					fieldId: ZERO_ADDR,
					type: 'test',
					name: { type: 'address', bcs: nameBcs },
					valueType: 'test',
					$kind: 'DynamicField' as const,
				},
			],
			hasNextPage: true,
			cursor: 'next_cursor_value',
		});

		const mockGetDynamicField = vi.fn().mockResolvedValue({
			dynamicField: {
				$kind: 'DynamicField' as const,
				fieldId: ZERO_ADDR,
				type: 'test',
				name: { type: 'address', bcs: nameBcs },
				value: { type: 'test', bcs: depositBytes },
				version: '1',
				digest: 'test',
				previousTransaction: null,
			},
		});

		const client = {
			getObject: mockGetObject,
			getDynamicField: mockGetDynamicField,
			listDynamicFields: mockListDynamicFields,
		} as unknown as CoreClient;

		const result = await listDepositRequests(client, config, { limit: 1 });

		expect(result.items).toHaveLength(1);
		expect(result.items[0].id).toBe(TEST_ADDR_1);
		expect(result.hasNextPage).toBe(true);
		expect(result.nextCursor).toBe('next_cursor_value');
	});
});

describe('getWithdrawalRequest', () => {
	it('returns correctly deserialized WithdrawalRequest', async () => {
		const config = makeTestConfig();
		const client = createMockClientWithState(makeWithdrawalRequestBytes());

		const result = await getWithdrawalRequest(client, config, TEST_ADDR_1);

		expect(result).not.toBeNull();
		expect(result!.info.id).toBe(TEST_ADDR_1);
		expect(result!.info.btcAmount).toBe(50000n);
		expect(result!.info.bitcoinAddress).toBeInstanceOf(Uint8Array);
		expect(result!.info.bitcoinAddress.length).toBe(20);
		expect(result!.info.timestampMs).toBe(1700000000000n);
		expect(result!.btc).toBe(50000n);
		expect(result!.approved).toBe(true);
	});

	it('returns null when withdrawal request not found', async () => {
		const config = makeTestConfig();
		const client = createMockClientWithState(null);

		const result = await getWithdrawalRequest(client, config, TEST_ADDR_1);
		expect(result).toBeNull();
	});
});

describe('listPendingWithdrawals', () => {
	it('returns empty list when no pending withdrawals', async () => {
		const config = makeTestConfig();
		const client = createMockClientWithState();

		const result = await listPendingWithdrawals(client, config);

		expect(result.items).toHaveLength(0);
		expect(result.hasNextPage).toBe(false);
		expect(result.nextCursor).toBeNull();
	});

	it('returns paginated pending withdrawals with items', async () => {
		const config = makeTestConfig();
		const hashiBytes = makeHashiStateBytes();
		const pendingBytes = makePendingWithdrawalBytes();
		const nameBcs = bcs.Address.serialize(TEST_ADDR_1).toBytes();

		const client = {
			getObject: vi.fn().mockResolvedValue({
				object: {
					objectId: TEST_ADDR_3,
					version: '1',
					digest: 'test',
					owner: { $kind: 'Shared' },
					type: 'test',
					content: hashiBytes,
				},
			}),
			getDynamicField: vi.fn().mockResolvedValue({
				dynamicField: {
					$kind: 'DynamicField' as const,
					fieldId: ZERO_ADDR,
					type: 'test',
					name: { type: 'address', bcs: nameBcs },
					value: { type: 'test', bcs: pendingBytes },
					version: '1',
					digest: 'test',
					previousTransaction: null,
				},
			}),
			listDynamicFields: vi.fn().mockResolvedValue({
				dynamicFields: [
					{
						fieldId: ZERO_ADDR,
						type: 'test',
						name: { type: 'address', bcs: nameBcs },
						valueType: 'test',
						$kind: 'DynamicField' as const,
					},
				],
				hasNextPage: false,
				cursor: null,
			}),
		} as unknown as CoreClient;

		const result = await listPendingWithdrawals(client, config);

		expect(result.items).toHaveLength(1);
		const pw = result.items[0];
		expect(pw.id).toBe(TEST_ADDR_1);
		expect(pw.txid).toBe(TEST_TXID);
		expect(pw.requests).toHaveLength(1);
		expect(pw.inputs).toHaveLength(1);
		expect(pw.inputs[0].amount).toBe(50000n);
		expect(pw.withdrawalOutputs).toHaveLength(1);
		expect(pw.withdrawalOutputs[0].amount).toBe(25000n);
		expect(pw.changeOutput).not.toBeNull();
		expect(pw.changeOutput!.amount).toBe(24000n);
		expect(pw.timestampMs).toBe(1700000000000n);
		expect(pw.randomness).toEqual(new Uint8Array([1, 2, 3]));
		expect(pw.signatures).toBeNull();
	});
});

describe('getCommittee', () => {
	it('returns correctly deserialized Committee for current epoch', async () => {
		const config = makeTestConfig();
		const client = createMockClientWithState(makeCommitteeBytes());

		const result = await getCommittee(client, config);

		expect(result).not.toBeNull();
		expect(result!.epoch).toBe(5n);
		expect(result!.members).toHaveLength(2);
		expect(result!.members[0].validatorAddress).toBe(TEST_ADDR_1);
		expect(result!.members[0].publicKey).toBeInstanceOf(Uint8Array);
		expect(result!.members[0].publicKey.length).toBe(48);
		expect(result!.members[0].encryptionPublicKey).toBeInstanceOf(Uint8Array);
		expect(result!.members[0].encryptionPublicKey.length).toBe(32);
		expect(result!.members[0].weight).toBe(100n);
		expect(result!.members[1].weight).toBe(200n);
		expect(result!.totalWeight).toBe(300n);
	});

	it('accepts explicit epoch parameter', async () => {
		const config = makeTestConfig();
		const hashiBytes = makeHashiStateBytes();
		const committeeBytes = makeCommitteeBytes();

		const mockGetDynamicField = vi.fn().mockResolvedValue({
			dynamicField: {
				$kind: 'DynamicField' as const,
				fieldId: ZERO_ADDR,
				type: 'test',
				name: { type: 'u64', bcs: bcs.u64().serialize(3n).toBytes() },
				value: { type: 'test', bcs: committeeBytes },
				version: '1',
				digest: 'test',
				previousTransaction: null,
			},
		});

		const client = {
			getObject: vi.fn().mockResolvedValue({
				object: {
					objectId: TEST_ADDR_3,
					version: '1',
					digest: 'test',
					owner: { $kind: 'Shared' },
					type: 'test',
					content: hashiBytes,
				},
			}),
			getDynamicField: mockGetDynamicField,
			listDynamicFields: vi.fn(),
		} as unknown as CoreClient;

		const result = await getCommittee(client, config, 3n);

		expect(result).not.toBeNull();
		// Verify it used the u64 key type for the dynamic field query
		expect(mockGetDynamicField).toHaveBeenCalledWith(
			expect.objectContaining({
				name: expect.objectContaining({
					type: 'u64',
				}),
			}),
		);
	});

	it('returns null when committee not found', async () => {
		const config = makeTestConfig();
		const client = createMockClientWithState(null);

		const result = await getCommittee(client, config, 999n);
		expect(result).toBeNull();
	});
});

describe('getMemberInfo', () => {
	it('returns correctly deserialized MemberInfo', async () => {
		const config = makeTestConfig();
		const client = createMockClientWithState(makeMemberInfoBytes());

		const result = await getMemberInfo(client, config, TEST_ADDR_1);

		expect(result).not.toBeNull();
		expect(result!.validatorAddress).toBe(TEST_ADDR_1);
		expect(result!.operatorAddress).toBe(TEST_ADDR_2);
		expect(result!.nextEpochPublicKey).toBeInstanceOf(Uint8Array);
		expect(result!.nextEpochPublicKey.length).toBe(48);
		expect(result!.endpointUrl).toBe('https://validator.example.com');
		expect(result!.tlsPublicKey).toBeInstanceOf(Uint8Array);
		expect(result!.tlsPublicKey.length).toBe(32);
		expect(result!.nextEpochEncryptionPublicKey).toBeInstanceOf(Uint8Array);
		expect(result!.nextEpochEncryptionPublicKey.length).toBe(32);
	});

	it('returns null when member not found', async () => {
		const config = makeTestConfig();
		const client = createMockClientWithState(null);

		const result = await getMemberInfo(client, config, TEST_ADDR_1);
		expect(result).toBeNull();
	});
});

describe('getUtxo', () => {
	it('returns correctly deserialized Utxo', async () => {
		const config = makeTestConfig();
		const client = createMockClientWithState(makeUtxoBytes());

		const result = await getUtxo(client, config, TEST_TXID, 1);

		expect(result).not.toBeNull();
		expect(result!.id.txid).toBe(TEST_TXID);
		expect(result!.id.vout).toBe(1);
		expect(result!.amount).toBe(75000n);
		expect(result!.derivationPath).toBe(TEST_ADDR_1);
	});

	it('returns null when utxo not found', async () => {
		const config = makeTestConfig();
		const client = createMockClientWithState(null);

		const result = await getUtxo(client, config, TEST_TXID, 99);
		expect(result).toBeNull();
	});

	it('handles utxo with null derivation path', async () => {
		const config = makeTestConfig();
		const utxoBytes = UtxoBcs.serialize({
			id: { txid: TEST_TXID, vout: 2 },
			amount: 30000n,
			derivation_path: null,
		}).toBytes();

		const client = createMockClientWithState(utxoBytes);

		const result = await getUtxo(client, config, TEST_TXID, 2);

		expect(result).not.toBeNull();
		expect(result!.derivationPath).toBeNull();
		expect(result!.amount).toBe(30000n);
	});

	it('passes correct struct key type', async () => {
		const config = makeTestConfig();
		const hashiBytes = makeHashiStateBytes();
		const utxoBytes = makeUtxoBytes();

		const mockGetDynamicField = vi.fn().mockResolvedValue({
			dynamicField: {
				$kind: 'DynamicField' as const,
				fieldId: ZERO_ADDR,
				type: 'test',
				name: { type: 'test', bcs: new Uint8Array(0) },
				value: { type: 'test', bcs: utxoBytes },
				version: '1',
				digest: 'test',
				previousTransaction: null,
			},
		});

		const client = {
			getObject: vi.fn().mockResolvedValue({
				object: {
					objectId: TEST_ADDR_3,
					version: '1',
					digest: 'test',
					owner: { $kind: 'Shared' },
					type: 'test',
					content: hashiBytes,
				},
			}),
			getDynamicField: mockGetDynamicField,
			listDynamicFields: vi.fn(),
		} as unknown as CoreClient;

		await getUtxo(client, config, TEST_TXID, 1);

		// Verify the struct key type uses the original package ID
		expect(mockGetDynamicField).toHaveBeenCalledWith(
			expect.objectContaining({
				name: expect.objectContaining({
					type: `${TEST_ADDR_2}::utxo::UtxoId`,
				}),
			}),
		);
	});
});

describe('error handling', () => {
	it('wraps RPC errors in HashiQueryError', async () => {
		const config = makeTestConfig();
		const client = createMockClient({
			getObjectError: new Error('network timeout'),
		});

		await expect(getHashiState(client, config)).rejects.toThrow(HashiQueryError);
		await expect(getHashiState(client, config)).rejects.toThrow(/network timeout/);
	});

	it('wraps BCS decode errors in HashiParseError', async () => {
		const config = makeTestConfig();
		const client = createMockClient({
			getObjectResult: new Uint8Array([0xff]),
		});

		await expect(getHashiState(client, config)).rejects.toThrow(HashiParseError);
	});

	it('dynamic field RPC errors become HashiQueryError', async () => {
		const config = makeTestConfig();
		const hashiBytes = makeHashiStateBytes();

		const client = {
			getObject: vi.fn().mockResolvedValue({
				object: {
					objectId: TEST_ADDR_3,
					version: '1',
					digest: 'test',
					owner: { $kind: 'Shared' },
					type: 'test',
					content: hashiBytes,
				},
			}),
			getDynamicField: vi.fn().mockRejectedValue(new Error('RPC timeout')),
			listDynamicFields: vi.fn(),
		} as unknown as CoreClient;

		await expect(
			getDepositRequest(client, config, TEST_ADDR_1),
		).rejects.toThrow(HashiQueryError);
	});
});
