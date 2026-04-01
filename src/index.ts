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
