/**
 * HashiEvent: a 25-variant discriminated union covering all events
 * emitted by the Hashi bridge Move modules.
 *
 * Each variant has a `type` string literal discriminant. Field names
 * use camelCase and follow the domain type conventions in src/types/.
 */

// ---- UTXO ID sub-type (inline for event independence) ----

export interface EventUtxoId {
	txid: string;
	vout: number;
}

// ---- Withdrawal event sub-types ----

export interface EventOutputUtxo {
	amount: bigint;
	bitcoinAddress: Uint8Array;
}

export interface EventUtxoInfo {
	id: EventUtxoId;
	amount: bigint;
	derivationPath: string | null;
}

// ---- Deposit Events ----

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

export interface DepositConfirmedEvent {
	type: 'DepositConfirmed';
	requestId: string;
	utxoId: EventUtxoId;
	amount: bigint;
	derivationPath: string | null;
}

export interface ExpiredDepositDeletedEvent {
	type: 'ExpiredDepositDeleted';
	requestId: string;
}

// ---- Withdrawal Events ----

export interface WithdrawalRequestedEvent {
	type: 'WithdrawalRequested';
	requestId: string;
	btcAmount: bigint;
	bitcoinAddress: Uint8Array;
	timestampMs: bigint;
	requesterAddress: string;
	suiTxDigest: string;
}

export interface WithdrawalApprovedEvent {
	type: 'WithdrawalApproved';
	requestId: string;
}

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

export interface WithdrawalSignedEvent {
	type: 'WithdrawalSigned';
	withdrawalId: string;
	requestIds: string[];
	signatures: Uint8Array[][];
}

export interface WithdrawalConfirmedEvent {
	type: 'WithdrawalConfirmed';
	pendingId: string;
	txid: string;
	changeUtxoId: EventUtxoId | null;
	requestIds: string[];
	changeUtxoAmount: bigint | null;
}

export interface WithdrawalCancelledEvent {
	type: 'WithdrawalCancelled';
	requestId: string;
	requesterAddress: string;
	btcAmount: bigint;
}

// ---- Validator Events ----

export interface ValidatorRegisteredEvent {
	type: 'ValidatorRegistered';
	validator: string;
}

export interface ValidatorUpdatedEvent {
	type: 'ValidatorUpdated';
	validator: string;
}

// ---- Reconfig Events ----

export interface StartReconfigEvent {
	type: 'StartReconfig';
	epoch: bigint;
}

export interface EndReconfigEvent {
	type: 'EndReconfig';
	epoch: bigint;
	mpcPublicKey: Uint8Array;
}

export interface AbortReconfigEvent {
	type: 'AbortReconfig';
	epoch: bigint;
}

// ---- UTXO Pool Events ----

export interface UtxoSpentEvent {
	type: 'UtxoSpent';
	utxoId: EventUtxoId;
	spentEpoch: bigint;
}

export interface SpentUtxoDeletedEvent {
	type: 'SpentUtxoDeleted';
	utxoId: EventUtxoId;
}

// ---- Treasury Events (generic over coin type) ----

export interface MintEvent {
	type: 'Mint';
	coinType: string;
	amount: bigint;
}

export interface BurnEvent {
	type: 'Burn';
	coinType: string;
	amount: bigint;
}

// ---- Proposal Events (generic over proposal type) ----

export interface ProposalCreatedEvent {
	type: 'ProposalCreated';
	proposalType: string;
	proposalId: string;
	timestampMs: bigint;
}

export interface VoteCastEvent {
	type: 'VoteCast';
	proposalType: string;
	proposalId: string;
	voter: string;
}

export interface VoteRemovedEvent {
	type: 'VoteRemoved';
	proposalType: string;
	proposalId: string;
	voter: string;
}

export interface ProposalDeletedEvent {
	type: 'ProposalDeleted';
	proposalType: string;
	proposalId: string;
}

export interface ProposalExecutedEvent {
	type: 'ProposalExecuted';
	proposalType: string;
	proposalId: string;
}

export interface QuorumReachedEvent {
	type: 'QuorumReached';
	proposalType: string;
	proposalId: string;
}

// ---- Package Upgrade Event ----

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
