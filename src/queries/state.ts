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
	return getConfigU64(cfg, 'deposit_fee', 0n);
}

/**
 * Fetch the current withdrawal protocol fee (in satoshis) from on-chain config.
 *
 * This fee is deducted from the user's BTC coin inside the Move contract when
 * calling `requestWithdrawal()`. The returned value is floored at
 * `DUST_RELAY_MIN_VALUE` (546 sats), matching the contract behaviour.
 *
 * @throws HashiQueryError if the object cannot be fetched
 * @throws HashiParseError if BCS deserialization fails
 */
export async function getWithdrawalFeeBtc(
	client: CoreClient,
	config: HashiConfig,
): Promise<bigint> {
	const cfg = await getConfig(client, config);
	const raw = getConfigU64(cfg, 'withdrawal_fee_btc', DUST_RELAY_MIN_VALUE);
	return raw > DUST_RELAY_MIN_VALUE ? raw : DUST_RELAY_MIN_VALUE;
}

/**
 * Fetch the minimum withdrawal amount (in satoshis) accepted by the contract.
 *
 * Users must pass at least this amount when calling `requestWithdrawal()`.
 * The value is computed from three on-chain config entries, replicating
 * the Move contract's `config::withdrawal_minimum()` formula:
 *
 *   `withdrawal_fee_btc + worst_case_network_fee + DUST_RELAY_MIN_VALUE`
 *
 * @throws HashiQueryError if the object cannot be fetched
 * @throws HashiParseError if BCS deserialization fails
 */
export async function getWithdrawalMinimum(
	client: CoreClient,
	config: HashiConfig,
): Promise<bigint> {
	const cfg = await getConfig(client, config);

	const withdrawalFeeBtc = bigintMax(
		getConfigU64(cfg, 'withdrawal_fee_btc', DUST_RELAY_MIN_VALUE),
		DUST_RELAY_MIN_VALUE,
	);
	const maxFeeRate = bigintMax(
		getConfigU64(cfg, 'max_fee_rate', MIN_RELAY_FEE_RATE),
		MIN_RELAY_FEE_RATE,
	);
	const inputBudget = bigintMax(
		getConfigU64(cfg, 'input_budget', 1n),
		1n,
	);

	const txVbytes = TX_FIXED_VB + inputBudget * INPUT_VB + OUTPUT_BUDGET * OUTPUT_VB;
	const worstCaseNetworkFee = maxFeeRate * txVbytes;

	return withdrawalFeeBtc + worstCaseNetworkFee + DUST_RELAY_MIN_VALUE;
}

/**
 * Fetch the minimum deposit amount (in satoshis) accepted by the contract.
 *
 * This is currently the dust relay minimum value (546 sats).
 *
 * @throws HashiQueryError if the object cannot be fetched
 * @throws HashiParseError if BCS deserialization fails
 */
export async function getDepositMinimum(
	client: CoreClient,
	config: HashiConfig,
): Promise<bigint> {
	// The Move contract's deposit_minimum() is a constant (DUST_RELAY_MIN_VALUE).
	// We still accept client/config for API consistency and future-proofing.
	void client;
	void config;
	return DUST_RELAY_MIN_VALUE;
}

/**
 * Check whether the Hashi bridge is currently paused.
 *
 * When paused, most transaction builders will fail on-chain with
 * an `assert_unpaused` abort.
 *
 * @throws HashiQueryError if the object cannot be fetched
 * @throws HashiParseError if BCS deserialization fails
 */
export async function getIsPaused(
	client: CoreClient,
	config: HashiConfig,
): Promise<boolean> {
	const cfg = await getConfig(client, config);
	const entry = cfg.entries.find((e) => e.key === 'paused');
	if (!entry || entry.value.type !== 'Bool') {
		return false;
	}
	return entry.value.value;
}

/**
 * Fetch the withdrawal cancellation cooldown (in milliseconds).
 *
 * After requesting a withdrawal, the user must wait at least this long
 * before they can cancel it.
 *
 * @throws HashiQueryError if the object cannot be fetched
 * @throws HashiParseError if BCS deserialization fails
 */
export async function getWithdrawalCancellationCooldownMs(
	client: CoreClient,
	config: HashiConfig,
): Promise<bigint> {
	const cfg = await getConfig(client, config);
	return getConfigU64(cfg, 'withdrawal_cancellation_cooldown_ms', 0n);
}

// ---- Bitcoin fee-estimation constants (must match Move contract) ----

/** Minimum value (sats) for a Bitcoin output to be relayed. Matches `config.move:DUST_RELAY_MIN_VALUE`. */
export const DUST_RELAY_MIN_VALUE = 546n;

/** Minimum relay fee rate (sat/vB). Matches `config.move:MIN_RELAY_FEE_RATE`. */
const MIN_RELAY_FEE_RATE = 1n;

/** Virtual bytes per 2-of-2 taproot script-path input. Matches `config.move:INPUT_VB`. */
const INPUT_VB = 100n;

/** Virtual bytes per P2TR output. Matches `config.move:OUTPUT_VB`. */
const OUTPUT_VB = 43n;

/** Number of outputs assumed per withdrawal (recipient + change). Matches `config.move:OUTPUT_BUDGET`. */
const OUTPUT_BUDGET = 2n;

/** Fixed virtual bytes overhead per Bitcoin transaction. Matches `config.move:TX_FIXED_VB`. */
const TX_FIXED_VB = 11n;

// ---- Internal helpers ----

/** Extract a U64 config entry or return a default. */
function getConfigU64(cfg: Config, key: string, defaultValue: bigint): bigint {
	const entry = cfg.entries.find((e) => e.key === key);
	if (!entry || entry.value.type !== 'U64') {
		return defaultValue;
	}
	return entry.value.value;
}

/** Return the larger of two bigints. */
function bigintMax(a: bigint, b: bigint): bigint {
	return a > b ? a : b;
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
