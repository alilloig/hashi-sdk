/**
 * UTXO domain types.
 */

import type { Bag } from './common.js';

/** A Bitcoin UTXO identifier: txid:vout */
export interface UtxoId {
	/** 32-byte SHA-256 transaction hash, as a 0x-prefixed hex address. */
	txid: string;
	/** Output position within the transaction. */
	vout: number;
}

/** A Bitcoin UTXO tracked by the bridge. */
export interface Utxo {
	id: UtxoId;
	/** Amount in satoshis. */
	amount: bigint;
	/** Sui address for deposit derivation, null for change UTXOs. */
	derivationPath: string | null;
}

/** Copyable view of a UTXO, used in events. */
export interface UtxoInfo {
	id: UtxoId;
	amount: bigint;
	derivationPath: string | null;
}

/** The on-chain UTXO pool tracking active and spent UTXOs. */
export interface UtxoPool {
	activeUtxos: Bag;
	spentUtxos: Bag;
}
