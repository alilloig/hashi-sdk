/**
 * Query functions for the root Hashi state object and its Config.
 */

import type { CoreClient } from '@mysten/sui/client';
import type { HashiConfig } from '../utils/config.js';
import type { HashiState } from '../types/hashi.js';
import type { Config, ConfigValue } from '../types/config.js';
import { Hashi as HashiBcs } from '../contracts/hashi/hashi.js';
import { HashiQueryError } from '../errors.js';
import {
	fetchObjectBcs,
	parseBcs,
	toBigInt,
	toUint8Array,
	toBag,
} from './helpers.js';

/**
 * Fetch the root Hashi shared object and deserialize it into the HashiState
 * domain type.
 *
 * @throws HashiQueryError if the object cannot be fetched
 * @throws HashiParseError if BCS deserialization fails
 */
export async function getHashiState(
	client: CoreClient,
	config: HashiConfig,
): Promise<HashiState> {
	const content = await fetchObjectBcs(client, config.hashiObjectId);
	if (content == null) {
		throw new HashiQueryError(
			`Hashi state object not found: ${config.hashiObjectId}`,
		);
	}

	const raw = parseBcs(HashiBcs, content, 'HashiState');
	return convertHashiState(raw);
}

/**
 * Fetch the Config from the Hashi state object.
 *
 * This is a convenience wrapper that fetches the full HashiState and
 * extracts the config portion.
 *
 * @throws HashiQueryError if the object cannot be fetched
 * @throws HashiParseError if BCS deserialization fails
 */
export async function getConfig(
	client: CoreClient,
	config: HashiConfig,
): Promise<Config> {
	const state = await getHashiState(client, config);
	return {
		entries: state.config.config.map((entry) => ({
			key: entry.key,
			value: entry.value,
		})),
		enabledVersions: state.config.enabledVersions,
		upgradeCap: state.config.upgradeCap,
	};
}

/**
 * Fetch the current deposit fee from the Hashi on-chain config.
 *
 * Returns the fee in MIST (SUI base units). Pass this value as the
 * `depositFee` parameter to `createDepositRequest()`.
 *
 * @throws HashiQueryError if the object cannot be fetched
 * @throws HashiParseError if BCS deserialization fails
 */
export async function getDepositFee(
	client: CoreClient,
	config: HashiConfig,
): Promise<bigint> {
	const cfg = await getConfig(client, config);
	const entry = cfg.entries.find((e) => e.key === 'deposit_fee');
	if (!entry || entry.value.type !== 'U64') {
		return 0n;
	}
	return entry.value.value;
}

// ---- Internal conversion ----

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Convert the raw BCS-deserialized Hashi object to the HashiState domain type.
 */
function convertHashiState(raw: any): HashiState {
	return {
		id: raw.id,
		committeeSet: {
			members: toBag(raw.committee_set.members),
			epoch: toBigInt(raw.committee_set.epoch),
			committees: toBag(raw.committee_set.committees),
			pendingEpochChange: raw.committee_set.pending_epoch_change != null
				? toBigInt(raw.committee_set.pending_epoch_change)
				: null,
			mpcPublicKey: toUint8Array(raw.committee_set.mpc_public_key),
		},
		config: {
			config: convertConfigEntries(raw.config.config),
			enabledVersions: convertVecSet(raw.config.enabled_versions),
			upgradeCap: raw.config.upgrade_cap != null
				? convertUpgradeCap(raw.config.upgrade_cap)
				: null,
		},
		treasury: {
			objects: toBag(raw.treasury.objects),
		},
		depositQueue: {
			requests: toBag(raw.deposit_queue.requests),
		},
		withdrawalQueue: {
			requests: toBag(raw.withdrawal_queue.requests),
			pendingWithdrawals: toBag(raw.withdrawal_queue.pending_withdrawals),
			numConsumedPresigs: toBigInt(raw.withdrawal_queue.num_consumed_presigs),
		},
		utxoPool: {
			activeUtxos: toBag(raw.utxo_pool.active_utxos),
			spentUtxos: toBag(raw.utxo_pool.spent_utxos),
		},
		proposals: toBag(raw.proposals),
		tob: toBag(raw.tob),
	};
}

/**
 * Convert VecMap BCS contents to config entries with proper ConfigValue types.
 */
function convertConfigEntries(
	raw: { contents: Array<{ key: string; value: any }> },
): Array<{ key: string; value: ConfigValue }> {
	return raw.contents.map((entry) => ({
		key: entry.key,
		value: convertConfigValue(entry.value),
	}));
}

/**
 * Convert a BCS-deserialized config value enum to the domain ConfigValue type.
 */
function convertConfigValue(raw: any): ConfigValue {
	switch (raw.$kind) {
		case 'U64':
			return { type: 'U64', value: toBigInt(raw.U64) };
		case 'Address':
			return { type: 'Address', value: raw.Address };
		case 'String':
			return { type: 'String', value: raw.String };
		case 'Bool':
			return { type: 'Bool', value: raw.Bool };
		case 'Bytes':
			return { type: 'Bytes', value: toUint8Array(raw.Bytes) };
		default:
			return { type: 'U64', value: 0n };
	}
}

/**
 * Convert a VecSet BCS structure to a bigint array.
 */
function convertVecSet(raw: { contents: Array<string | number | bigint> }): bigint[] {
	return raw.contents.map(toBigInt);
}

/**
 * Convert a BCS UpgradeCap to the domain type.
 */
function convertUpgradeCap(
	raw: any,
): { id: string; package: string; version: bigint; policy: number } {
	return {
		id: raw.id,
		package: raw.package,
		version: toBigInt(raw.version),
		policy: raw.policy,
	};
}
