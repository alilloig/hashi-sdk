/**
 * Query function for UTXO lookup.
 */

import type { CoreClient } from '@mysten/sui/client';
import type { HashiConfig } from '../utils/config.js';
import type { Utxo } from '../types/utxo.js';
import {
	Utxo as UtxoBcs,
	UtxoId as UtxoIdBcs,
} from '../contracts/hashi/utxo.js';
import {
	fetchDynamicFieldBcs,
	parseBcs,
	toBigInt,
} from './helpers.js';
import { getHashiState } from './state.js';

/**
 * Fetch a UTXO from the active UTXO pool by its transaction ID and output index.
 *
 * @param client - A CoreClient instance
 * @param config - HashiConfig with Hashi deployment addresses
 * @param txid - The Bitcoin transaction ID (0x-prefixed, 64 hex chars)
 * @param vout - The output index within the transaction
 * @returns The Utxo, or null if not found in the active pool
 * @throws HashiQueryError on RPC errors
 * @throws HashiParseError on BCS decode failure
 */
export async function getUtxo(
	client: CoreClient,
	config: HashiConfig,
	txid: string,
	vout: number,
): Promise<Utxo | null> {
	const state = await getHashiState(client, config);
	const bagId = state.utxoPool.activeUtxos.id;

	// Serialize the UtxoId struct as the dynamic field key.
	const utxoIdBcsBytes = UtxoIdBcs.serialize({ txid, vout }).toBytes();

	// The key type is the full Move struct type path.
	const keyType = `${config.originalPackageId}::utxo::UtxoId`;

	const valueBcs = await fetchDynamicFieldBcs(
		client,
		bagId,
		keyType,
		utxoIdBcsBytes,
	);

	if (valueBcs == null) {
		return null;
	}

	const raw = parseBcs(UtxoBcs, valueBcs, 'Utxo');
	return convertUtxo(raw);
}

// ---- Internal conversion ----

/* eslint-disable @typescript-eslint/no-explicit-any */

function convertUtxo(raw: any): Utxo {
	return {
		id: {
			txid: raw.id.txid,
			vout: raw.id.vout,
		},
		amount: toBigInt(raw.amount),
		derivationPath: raw.derivation_path ?? null,
	};
}
