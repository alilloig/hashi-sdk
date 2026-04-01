/**
 * Withdrawal domain types.
 */

import type { Utxo, UtxoId, UtxoInfo } from './utxo.js';
import type { Bag } from './common.js';

/** A Bitcoin output in a withdrawal transaction. */
export interface OutputUtxo {
	/** Amount in satoshis. */
	amount: bigint;
	/** Raw Bitcoin witness program (20 or 32 bytes). */
	bitcoinAddress: Uint8Array;
}

/** Metadata about a withdrawal request (copyable, without balance). */
export interface WithdrawalRequestInfo {
	id: string;
	btcAmount: bigint;
	bitcoinAddress: Uint8Array;
	timestampMs: bigint;
	requesterAddress: string;
	suiTxDigest: Uint8Array;
}

/** A withdrawal request including the locked BTC balance. */
export interface WithdrawalRequest {
	info: WithdrawalRequestInfo;
	/** The locked BTC balance in satoshis. */
	btcBalance: bigint;
	approved: boolean;
}

/** A pending withdrawal that has been committed but not yet confirmed. */
export interface PendingWithdrawal {
	id: string;
	txid: string;
	requests: WithdrawalRequestInfo[];
	inputs: Utxo[];
	withdrawalOutputs: OutputUtxo[];
	changeOutput: OutputUtxo | null;
	timestampMs: bigint;
	randomness: Uint8Array;
	signatures: Uint8Array[][] | null;
}

/** The on-chain withdrawal request queue. */
export interface WithdrawalRequestQueue {
	requests: Bag;
	pendingWithdrawals: Bag;
	numConsumedPresigs: bigint;
}

// ---- Event types ----

export interface WithdrawalRequestedEvent {
	requestId: string;
	btcAmount: bigint;
	bitcoinAddress: Uint8Array;
	timestampMs: bigint;
	requesterAddress: string;
	suiTxDigest: Uint8Array;
}

export interface WithdrawalApprovedEvent {
	requestId: string;
}

export interface WithdrawalPickedForProcessingEvent {
	pendingId: string;
	txid: string;
	requestIds: string[];
	inputs: UtxoInfo[];
	withdrawalOutputs: OutputUtxo[];
	changeOutput: OutputUtxo | null;
	timestampMs: bigint;
	randomness: Uint8Array;
}

export interface WithdrawalSignedEvent {
	withdrawalId: string;
	requestIds: string[];
	signatures: Uint8Array[][];
}

export interface WithdrawalConfirmedEvent {
	pendingId: string;
	txid: string;
	changeUtxoId: UtxoId | null;
	requestIds: string[];
	changeUtxoAmount: bigint | null;
}

export interface WithdrawalCancelledEvent {
	requestId: string;
	requesterAddress: string;
	btcAmount: bigint;
}
