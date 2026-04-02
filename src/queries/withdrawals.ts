/**
 * Query functions for withdrawal requests and pending withdrawals.
 */

import type { CoreClient } from '@mysten/sui/client';
import type { HashiConfig } from '../utils/config.js';
import type { WithdrawalRequest, PendingWithdrawal, WithdrawalRequestInfo, OutputUtxo } from '../types/withdrawal.js';
import type { PaginatedResult } from '../types/common.js';
import type { Utxo } from '../types/utxo.js';
import {
	WithdrawalRequest as WithdrawalRequestBcs,
	PendingWithdrawal as PendingWithdrawalBcs,
} from '../contracts/hashi/withdrawal_queue.js';
import {
	fetchDynamicFieldBcs,
	listDynamicFieldEntries,
	parseBcs,
	toBigInt,
	toUint8Array,
	serializeAddressKey,
} from './helpers.js';
import { getHashiState } from './state.js';
import { reverseTxidBytes } from '../transactions/validation.js';

/**
 * Fetch a single withdrawal request from the withdrawal queue by its ID.
 *
 * @param client - A CoreClient instance
 * @param config - HashiConfig with Hashi deployment addresses
 * @param requestId - The withdrawal request object ID (0x-prefixed hex address)
 * @returns The WithdrawalRequest, or null if not found
 * @throws HashiQueryError on RPC errors
 * @throws HashiParseError on BCS decode failure
 */
export async function getWithdrawalRequest(
	client: CoreClient,
	config: HashiConfig,
	requestId: string,
): Promise<WithdrawalRequest | null> {
	const state = await getHashiState(client, config);
	const bagId = state.withdrawalQueue.requests.id;

	const valueBcs = await fetchDynamicFieldBcs(
		client,
		bagId,
		'address',
		serializeAddressKey(requestId),
	);

	if (valueBcs == null) {
		return null;
	}

	const raw = parseBcs(WithdrawalRequestBcs, valueBcs, 'WithdrawalRequest');
	return convertWithdrawalRequest(raw);
}

/**
 * List pending withdrawals with pagination.
 *
 * @param client - A CoreClient instance
 * @param config - HashiConfig with Hashi deployment addresses
 * @param options - Optional pagination parameters
 * @returns PaginatedResult of PendingWithdrawals
 * @throws HashiQueryError on RPC errors
 * @throws HashiParseError on BCS decode failure
 */
export async function listPendingWithdrawals(
	client: CoreClient,
	config: HashiConfig,
	options?: { cursor?: string; limit?: number },
): Promise<PaginatedResult<PendingWithdrawal>> {
	const state = await getHashiState(client, config);
	const bagId = state.withdrawalQueue.pendingWithdrawals.id;

	const response = await listDynamicFieldEntries(client, bagId, {
		cursor: options?.cursor,
		limit: options?.limit,
	});

	const items: PendingWithdrawal[] = [];
	for (const entry of response.dynamicFields) {
		const valueBcs = await fetchDynamicFieldBcs(
			client,
			bagId,
			entry.name.type,
			entry.name.bcs,
		);

		if (valueBcs != null) {
			const raw = parseBcs(PendingWithdrawalBcs, valueBcs, 'PendingWithdrawal');
			items.push(convertPendingWithdrawal(raw));
		}
	}

	return {
		items,
		hasNextPage: response.hasNextPage,
		nextCursor: response.cursor,
	};
}

// ---- Internal conversion ----

/* eslint-disable @typescript-eslint/no-explicit-any */

function convertWithdrawalRequest(raw: any): WithdrawalRequest {
	return {
		info: convertWithdrawalRequestInfo(raw.info),
		btc: toBigInt(raw.btc.value),
		approved: raw.approved,
	};
}

function convertWithdrawalRequestInfo(raw: any): WithdrawalRequestInfo {
	return {
		id: raw.id,
		btcAmount: toBigInt(raw.btc_amount),
		bitcoinAddress: toUint8Array(raw.bitcoin_address),
		timestampMs: toBigInt(raw.timestamp_ms),
		requesterAddress: raw.requester_address,
		suiTxDigest: toHexString(raw.sui_tx_digest),
	};
}

function convertPendingWithdrawal(raw: any): PendingWithdrawal {
	return {
		id: raw.id,
		txid: '0x' + reverseTxidBytes(raw.txid),
		requests: raw.requests.map(convertWithdrawalRequestInfo),
		inputs: raw.inputs.map(convertUtxo),
		withdrawalOutputs: raw.withdrawal_outputs.map(convertOutputUtxo),
		changeOutput: raw.change_output != null
			? convertOutputUtxo(raw.change_output)
			: null,
		timestampMs: toBigInt(raw.timestamp_ms),
		randomness: toUint8Array(raw.randomness),
		signatures: raw.signatures != null
			? raw.signatures.map((sigs: any[]) => sigs.map(toUint8Array))
			: null,
	};
}

function convertUtxo(raw: any): Utxo {
	return {
		id: {
			txid: '0x' + reverseTxidBytes(raw.id.txid),
			vout: raw.id.vout,
		},
		amount: toBigInt(raw.amount),
		derivationPath: raw.derivation_path ?? null,
	};
}

function convertOutputUtxo(raw: any): OutputUtxo {
	return {
		amount: toBigInt(raw.amount),
		bitcoinAddress: toUint8Array(raw.bitcoin_address),
	};
}

function toHexString(bytes: number[] | Uint8Array): string {
	const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
	return '0x' + Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}
