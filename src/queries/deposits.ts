/**
 * Query functions for deposit requests.
 */

import type { CoreClient } from '@mysten/sui/client';
import type { HashiConfig } from '../utils/config.js';
import type { DepositRequest } from '../types/deposit.js';
import type { PaginatedResult } from '../types/common.js';
import { DepositRequest as DepositRequestBcs } from '../contracts/hashi/deposit_queue.js';
import {
	fetchDynamicFieldBcs,
	listDynamicFieldEntries,
	parseBcs,
	toBigInt,
	serializeAddressKey,
} from './helpers.js';
import { getHashiState } from './state.js';
import { reverseTxidBytes } from '../transactions/validation.js';

/**
 * Fetch a single deposit request from the deposit queue by its ID.
 *
 * @param client - A CoreClient instance
 * @param config - HashiConfig with Hashi deployment addresses
 * @param requestId - The deposit request object ID (0x-prefixed hex address)
 * @returns The DepositRequest, or null if not found
 * @throws HashiQueryError on RPC errors
 * @throws HashiParseError on BCS decode failure
 */
export async function getDepositRequest(
	client: CoreClient,
	config: HashiConfig,
	requestId: string,
): Promise<DepositRequest | null> {
	const state = await getHashiState(client, config);
	const bagId = state.depositQueue.requests.id;

	const valueBcs = await fetchDynamicFieldBcs(
		client,
		bagId,
		'address',
		serializeAddressKey(requestId),
	);

	if (valueBcs == null) {
		return null;
	}

	const raw = parseBcs(DepositRequestBcs, valueBcs, 'DepositRequest');
	return convertDepositRequest(raw);
}

/**
 * List deposit requests with pagination.
 *
 * Note: This first lists dynamic field entries from the deposit queue Bag,
 * then fetches each field's value to deserialize. The cursor and limit
 * correspond to the dynamic field listing, not the items themselves.
 *
 * @param client - A CoreClient instance
 * @param config - HashiConfig with Hashi deployment addresses
 * @param options - Optional pagination parameters
 * @returns PaginatedResult of DepositRequests
 * @throws HashiQueryError on RPC errors
 * @throws HashiParseError on BCS decode failure
 */
export async function listDepositRequests(
	client: CoreClient,
	config: HashiConfig,
	options?: { cursor?: string; limit?: number },
): Promise<PaginatedResult<DepositRequest>> {
	const state = await getHashiState(client, config);
	const bagId = state.depositQueue.requests.id;

	const response = await listDynamicFieldEntries(client, bagId, {
		cursor: options?.cursor,
		limit: options?.limit,
	});

	const items: DepositRequest[] = [];
	for (const entry of response.dynamicFields) {
		const valueBcs = await fetchDynamicFieldBcs(
			client,
			bagId,
			entry.name.type,
			entry.name.bcs,
		);

		if (valueBcs != null) {
			const raw = parseBcs(DepositRequestBcs, valueBcs, 'DepositRequest');
			items.push(convertDepositRequest(raw));
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

function convertDepositRequest(raw: any): DepositRequest {
	return {
		id: raw.id,
		utxo: {
			id: {
				txid: '0x' + reverseTxidBytes(raw.utxo.id.txid),
				vout: raw.utxo.id.vout,
			},
			amount: toBigInt(raw.utxo.amount),
			derivationPath: raw.utxo.derivation_path ?? null,
		},
		timestampMs: toBigInt(raw.timestamp_ms),
		requesterAddress: raw.requester_address,
		suiTxDigest: toHexString(raw.sui_tx_digest),
	};
}

/**
 * Convert a BCS vector<u8> (number[]) to a hex string representation.
 * Used for tx digests which are stored as bytes but displayed as hex.
 */
function toHexString(bytes: number[] | Uint8Array): string {
	const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
	return '0x' + Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}
