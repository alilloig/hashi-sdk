/**
 * Domain types for the Hashi bridge SDK.
 *
 * These types represent the deserialized on-chain state objects.
 * All addresses are 0x-prefixed lowercase hex strings, all u64 values
 * are bigint, and all byte vectors are Uint8Array.
 *
 * @module types
 */

// Common shared types
export type { Bag, VecMapEntry, PaginatedResult } from './common.js';
export type { Committee, CommitteeMember, CommitteeSignature, MemberInfo } from './committee.js';
export type { Config, ConfigValue } from './config.js';
export type { DepositRequest, DepositRequestQueue } from './deposit.js';
export type { HashiState } from './hashi.js';
export type { Proposal, ProposalType } from './proposal.js';
export type { ProtocolType, TobKey, DealerSubmission, EpochCerts } from './tob.js';
export type { UtxoId, Utxo, UtxoInfo, UtxoPool } from './utxo.js';
export type {
	OutputUtxo,
	WithdrawalRequestInfo,
	WithdrawalRequest,
	PendingWithdrawal,
	WithdrawalRequestQueue,
	WithdrawalRequestedEvent,
	WithdrawalApprovedEvent,
	WithdrawalPickedForProcessingEvent,
	WithdrawalSignedEvent,
	WithdrawalConfirmedEvent,
	WithdrawalCancelledEvent,
} from './withdrawal.js';

// BCS re-exports
export {
	HashiBcs,
	CommitteeMemberBcs,
	CommitteeBcs,
	CommitteeSignatureBcs,
	CertifiedMessageBcs,
	ConfigBcs,
	ConfigValueBcs,
	DepositRequestBcs,
	DepositRequestQueueBcs,
	UtxoIdBcs,
	UtxoBcs,
	UtxoInfoBcs,
	UtxoPoolBcs,
	OutputUtxoBcs,
	WithdrawalRequestInfoBcs,
	WithdrawalRequestBcs,
	PendingWithdrawalBcs,
	WithdrawalRequestQueueBcs,
	WithdrawalRequestedEventBcs,
	WithdrawalApprovedEventBcs,
	WithdrawalPickedForProcessingEventBcs,
	WithdrawalSignedEventBcs,
	WithdrawalConfirmedEventBcs,
	WithdrawalCancelledEventBcs,
	ProposalBcs,
	TobKeyBcs,
	ProtocolTypeBcs,
	EpochCertsV1Bcs,
	DealerMessagesHashV1Bcs,
	DealerSubmissionV1Bcs,
} from './bcs.js';
