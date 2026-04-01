// Configuration
export { HashiConfig, MAINNET_CONFIG, TESTNET_CONFIG } from './utils/config.js';
export type { HashiConfigOptions, NetworkPreset } from './utils/config.js';

// Errors
export {
	HashiError,
	HashiTransactionError,
	HashiQueryError,
	HashiParseError,
	HashiBitcoinError,
	HashiConfigError,
	ABORT_CODES,
	lookupAbortCode,
	transactionErrorFromAbort,
} from './errors.js';
export type { AbortCodeEntry } from './errors.js';

// Domain types (re-export everything from types/)
export type {
	Bag,
	VecMapEntry,
	PaginatedResult,
	Committee,
	CommitteeMember,
	CommitteeSignature,
	MemberInfo,
	Config,
	ConfigValue,
	DepositRequest,
	DepositRequestQueue,
	HashiState,
	Proposal,
	ProposalType,
	ProtocolType,
	TobKey,
	DealerSubmission,
	EpochCerts,
	UtxoId,
	Utxo,
	UtxoInfo,
	UtxoPool,
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
} from './types/index.js';

// Transaction builders
export {
	createDepositRequest,
	requestWithdrawal,
	cancelWithdrawal,
	CLOCK_OBJECT_ID,
	validateU64,
	validateTxid,
	validateAddress,
	validateVout,
	validateBitcoinAddress,
} from './transactions/index.js';
export type {
	CreateDepositRequestParams,
	RequestWithdrawalParams,
	CancelWithdrawalParams,
} from './transactions/index.js';

// Bitcoin helpers
export {
	encodeBitcoinAddress,
	decodeBitcoinAddress,
	satsToBtc,
	btcToSats,
	deriveDepositAddress,
} from './bitcoin.js';
export type { DecodedBitcoinAddress } from './bitcoin.js';

// Event types and parsers
export type {
	HashiEvent,
	EventUtxoId,
	EventOutputUtxo,
	EventUtxoInfo,
	DepositRequestedEvent as DepositRequestedHashiEvent,
	DepositConfirmedEvent as DepositConfirmedHashiEvent,
	ExpiredDepositDeletedEvent as ExpiredDepositDeletedHashiEvent,
	WithdrawalRequestedEvent as WithdrawalRequestedHashiEvent,
	WithdrawalApprovedEvent as WithdrawalApprovedHashiEvent,
	WithdrawalPickedForProcessingEvent as WithdrawalPickedForProcessingHashiEvent,
	WithdrawalSignedEvent as WithdrawalSignedHashiEvent,
	WithdrawalConfirmedEvent as WithdrawalConfirmedHashiEvent,
	WithdrawalCancelledEvent as WithdrawalCancelledHashiEvent,
	ValidatorRegisteredEvent as ValidatorRegisteredHashiEvent,
	ValidatorUpdatedEvent as ValidatorUpdatedHashiEvent,
	StartReconfigEvent as StartReconfigHashiEvent,
	EndReconfigEvent as EndReconfigHashiEvent,
	AbortReconfigEvent as AbortReconfigHashiEvent,
	UtxoSpentEvent as UtxoSpentHashiEvent,
	SpentUtxoDeletedEvent as SpentUtxoDeletedHashiEvent,
	MintEvent as MintHashiEvent,
	BurnEvent as BurnHashiEvent,
	ProposalCreatedEvent as ProposalCreatedHashiEvent,
	VoteCastEvent as VoteCastHashiEvent,
	VoteRemovedEvent as VoteRemovedHashiEvent,
	ProposalDeletedEvent as ProposalDeletedHashiEvent,
	ProposalExecutedEvent as ProposalExecutedHashiEvent,
	QuorumReachedEvent as QuorumReachedHashiEvent,
	PackageUpgradedEvent as PackageUpgradedHashiEvent,
	ParseHashiEventResult,
} from './events/index.js';

export {
	parseHashiEvent,
	parseHashiEventStrict,
} from './events/index.js';

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
} from './types/bcs.js';
