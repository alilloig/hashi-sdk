/**
 * Deposit domain types.
 */

import type { Utxo } from './utxo.js';
import type { Bag } from './common.js';

/** A pending deposit request in the queue. */
export interface DepositRequest {
	id: string;
	utxo: Utxo;
	timestampMs: bigint;
	requesterAddress: string;
	suiTxDigest: Uint8Array;
}

/** The on-chain deposit request queue. */
export interface DepositRequestQueue {
	requests: Bag;
}
