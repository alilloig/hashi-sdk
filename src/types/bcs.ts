/**
 * BCS re-export layer.
 *
 * Re-exports the codegen-generated BCS type definitions from src/contracts/
 * under a single, ergonomic namespace. Consumers can use these for
 * serialization/deserialization without importing from the generated
 * contracts directory directly.
 */

// ---- Hashi core ----
export { Hashi as HashiBcs } from '../contracts/hashi/hashi.js';

// ---- Committee ----
export {
	CommitteeMember as CommitteeMemberBcs,
	Committee as CommitteeBcs,
	CommitteeSignature as CommitteeSignatureBcs,
	CertifiedMessage as CertifiedMessageBcs,
} from '../contracts/hashi/committee.js';

// ---- Config ----
export { Config as ConfigBcs } from '../contracts/hashi/config.js';
export { Value as ConfigValueBcs } from '../contracts/hashi/config_value.js';

// ---- Deposit ----
export {
	DepositRequest as DepositRequestBcs,
	DepositRequestQueue as DepositRequestQueueBcs,
} from '../contracts/hashi/deposit_queue.js';

// ---- UTXO ----
export {
	UtxoId as UtxoIdBcs,
	Utxo as UtxoBcs,
	UtxoInfo as UtxoInfoBcs,
} from '../contracts/hashi/utxo.js';

export { UtxoPool as UtxoPoolBcs } from '../contracts/hashi/utxo_pool.js';

// ---- Withdrawal ----
export {
	OutputUtxo as OutputUtxoBcs,
	WithdrawalRequestInfo as WithdrawalRequestInfoBcs,
	WithdrawalRequest as WithdrawalRequestBcs,
	PendingWithdrawal as PendingWithdrawalBcs,
	WithdrawalRequestQueue as WithdrawalRequestQueueBcs,
	WithdrawalRequestedEvent as WithdrawalRequestedEventBcs,
	WithdrawalApprovedEvent as WithdrawalApprovedEventBcs,
	WithdrawalPickedForProcessingEvent as WithdrawalPickedForProcessingEventBcs,
	WithdrawalSignedEvent as WithdrawalSignedEventBcs,
	WithdrawalConfirmedEvent as WithdrawalConfirmedEventBcs,
	WithdrawalCancelledEvent as WithdrawalCancelledEventBcs,
} from '../contracts/hashi/withdrawal_queue.js';

// ---- Proposal ----
export { Proposal as ProposalBcs } from '../contracts/hashi/proposal.js';

// ---- TOB ----
export {
	TobKey as TobKeyBcs,
	ProtocolType as ProtocolTypeBcs,
	EpochCertsV1 as EpochCertsV1Bcs,
	DealerMessagesHashV1 as DealerMessagesHashV1Bcs,
	DealerSubmissionV1 as DealerSubmissionV1Bcs,
} from '../contracts/hashi/tob.js';
