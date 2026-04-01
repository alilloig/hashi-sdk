/**
 * HashiEvent: a 25-variant discriminated union covering all events
 * emitted by the Hashi bridge Move modules.
 *
 * Each variant has a `type` string literal discriminant. Field names
 * use camelCase and follow the domain type conventions in src/types/.
 */

// ---- UTXO ID sub-type (inline for event independence) ----

/** A Bitcoin UTXO identifier as it appears in events. */
export interface EventUtxoId {
	/** Bitcoin transaction ID (0x-prefixed hex). */
	txid: string;
	/** Output index within the transaction. */
	vout: number;
}

// ---- Withdrawal event sub-types ----

/** A Bitcoin output as it appears in withdrawal events. */
export interface EventOutputUtxo {
	/** Amount in satoshis. */
	amount: bigint;
	/** Raw Bitcoin witness program bytes. */
	bitcoinAddress: Uint8Array;
}

/** UTXO information as it appears in events. */
export interface EventUtxoInfo {
	/** The UTXO identifier. */
	id: EventUtxoId;
	/** Amount in satoshis. */
	amount: bigint;
	/** Derivation path for deposit UTXOs, null for change. */
	derivationPath: string | null;
}

// ---- Deposit Events ----

/** Emitted when a user submits a deposit request. */
export interface DepositRequestedEvent {
	type: 'DepositRequested';
	requestId: string;
	utxoId: EventUtxoId;
	amount: bigint;
	derivationPath: string | null;
	timestampMs: bigint;
	requesterAddress: string;
	suiTxDigest: string;
}

/** Emitted when a deposit is confirmed by the committee. */
export interface DepositConfirmedEvent {
	type: 'DepositConfirmed';
	requestId: string;
	utxoId: EventUtxoId;
	amount: bigint;
	derivationPath: string | null;
}

/** Emitted when an expired deposit request is cleaned up. */
export interface ExpiredDepositDeletedEvent {
	type: 'ExpiredDepositDeleted';
	requestId: string;
}

// ---- Withdrawal Events ----

/** Emitted when a user requests a withdrawal. */
export interface WithdrawalRequestedEvent {
	type: 'WithdrawalRequested';
	requestId: string;
	btcAmount: bigint;
	bitcoinAddress: Uint8Array;
	timestampMs: bigint;
	requesterAddress: string;
	suiTxDigest: string;
}

/** Emitted when a withdrawal request is approved by the committee. */
export interface WithdrawalApprovedEvent {
	type: 'WithdrawalApproved';
	requestId: string;
}

/** Emitted when approved withdrawal requests are committed into a Bitcoin transaction. */
export interface WithdrawalPickedForProcessingEvent {
	type: 'WithdrawalPickedForProcessing';
	pendingId: string;
	txid: string;
	requestIds: string[];
	inputs: EventUtxoInfo[];
	withdrawalOutputs: EventOutputUtxo[];
	changeOutput: EventOutputUtxo | null;
	timestampMs: bigint;
	randomness: Uint8Array;
}

/** Emitted when ECDSA signatures are submitted for a pending withdrawal. */
export interface WithdrawalSignedEvent {
	type: 'WithdrawalSigned';
	withdrawalId: string;
	requestIds: string[];
	signatures: Uint8Array[][];
}

/** Emitted when a withdrawal is confirmed after Bitcoin broadcast. */
export interface WithdrawalConfirmedEvent {
	type: 'WithdrawalConfirmed';
	pendingId: string;
	txid: string;
	changeUtxoId: EventUtxoId | null;
	requestIds: string[];
	changeUtxoAmount: bigint | null;
}

/** Emitted when a user cancels a pending withdrawal request. */
export interface WithdrawalCancelledEvent {
	type: 'WithdrawalCancelled';
	requestId: string;
	requesterAddress: string;
	btcAmount: bigint;
}

// ---- Validator Events ----

/** Emitted when a new validator registers with the bridge. */
export interface ValidatorRegisteredEvent {
	type: 'ValidatorRegistered';
	validator: string;
}

/** Emitted when a validator updates its configuration. */
export interface ValidatorUpdatedEvent {
	type: 'ValidatorUpdated';
	validator: string;
}

// ---- Reconfig Events ----

/** Emitted when committee reconfiguration begins. */
export interface StartReconfigEvent {
	type: 'StartReconfig';
	epoch: bigint;
}

/** Emitted when committee reconfiguration completes successfully. */
export interface EndReconfigEvent {
	type: 'EndReconfig';
	epoch: bigint;
	mpcPublicKey: Uint8Array;
}

/** Emitted when a committee reconfiguration is aborted. */
export interface AbortReconfigEvent {
	type: 'AbortReconfig';
	epoch: bigint;
}

// ---- UTXO Pool Events ----

/** Emitted when a UTXO is consumed in a withdrawal transaction. */
export interface UtxoSpentEvent {
	type: 'UtxoSpent';
	utxoId: EventUtxoId;
	spentEpoch: bigint;
}

/** Emitted when an expired spent UTXO is cleaned up. */
export interface SpentUtxoDeletedEvent {
	type: 'SpentUtxoDeleted';
	utxoId: EventUtxoId;
}

// ---- Treasury Events (generic over coin type) ----

/** Emitted when BTC tokens are minted (on deposit confirmation). */
export interface MintEvent {
	type: 'Mint';
	coinType: string;
	amount: bigint;
}

/** Emitted when BTC tokens are burned (on withdrawal confirmation). */
export interface BurnEvent {
	type: 'Burn';
	coinType: string;
	amount: bigint;
}

// ---- Proposal Events (generic over proposal type) ----

/** Emitted when a governance proposal is created. */
export interface ProposalCreatedEvent {
	type: 'ProposalCreated';
	proposalType: string;
	proposalId: string;
	timestampMs: bigint;
}

/** Emitted when a vote is cast on a governance proposal. */
export interface VoteCastEvent {
	type: 'VoteCast';
	proposalType: string;
	proposalId: string;
	voter: string;
}

/** Emitted when a vote is removed from a governance proposal. */
export interface VoteRemovedEvent {
	type: 'VoteRemoved';
	proposalType: string;
	proposalId: string;
	voter: string;
}

/** Emitted when a governance proposal is deleted. */
export interface ProposalDeletedEvent {
	type: 'ProposalDeleted';
	proposalType: string;
	proposalId: string;
}

/** Emitted when a governance proposal is executed. */
export interface ProposalExecutedEvent {
	type: 'ProposalExecuted';
	proposalType: string;
	proposalId: string;
}

/** Emitted when a governance proposal reaches voting quorum. */
export interface QuorumReachedEvent {
	type: 'QuorumReached';
	proposalType: string;
	proposalId: string;
}

// ---- Package Upgrade Event ----

/** Emitted when the Hashi Move package is upgraded. */
export interface PackageUpgradedEvent {
	type: 'PackageUpgraded';
	package: string;
	version: bigint;
}

// ---- Discriminated Union ----

/**
 * Discriminated union of all 25 Hashi bridge event variants.
 *
 * Use the `type` field to narrow:
 * ```ts
 * if (event.type === 'DepositRequested') {
 *   console.log(event.utxoId, event.amount);
 * }
 * ```
 */
export type HashiEvent =
	| DepositRequestedEvent
	| DepositConfirmedEvent
	| ExpiredDepositDeletedEvent
	| WithdrawalRequestedEvent
	| WithdrawalApprovedEvent
	| WithdrawalPickedForProcessingEvent
	| WithdrawalSignedEvent
	| WithdrawalConfirmedEvent
	| WithdrawalCancelledEvent
	| ValidatorRegisteredEvent
	| ValidatorUpdatedEvent
	| StartReconfigEvent
	| EndReconfigEvent
	| AbortReconfigEvent
	| UtxoSpentEvent
	| SpentUtxoDeletedEvent
	| MintEvent
	| BurnEvent
	| ProposalCreatedEvent
	| VoteCastEvent
	| VoteRemovedEvent
	| ProposalDeletedEvent
	| ProposalExecutedEvent
	| QuorumReachedEvent
	| PackageUpgradedEvent;
