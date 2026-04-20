// Client facade
export { HashiClient } from './client.js';
export type { HashiClientOptions } from './client.js';

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
	// User operations
	createDepositRequest,
	requestWithdrawal,
	cancelWithdrawal,
	// Deposit operations (committee/validator)
	confirmDeposit,
	deleteExpiredDeposits,
	// Withdrawal operations (committee/validator)
	approveWithdrawalRequests,
	commitWithdrawalTx,
	signWithdrawal,
	confirmWithdrawal,
	deleteExpiredSpentUtxo,
	encodeUtxoId,
	encodeOutputUtxo,
	// Validator management
	register,
	updatePublicKey,
	updateOperatorAddress,
	updateEndpointUrl,
	updateTlsPublicKey,
	updateEncryptionPublicKey,
	// Reconfiguration
	startReconfig,
	endReconfig,
	// Certificate submission
	submitDkgCert,
	submitRotationCert,
	submitNonceCert,
	destroyAllCerts,
	// Governance
	proposeUpdateConfig,
	proposeEnableVersion,
	proposeDisableVersion,
	proposeUpgrade,
	vote,
	removeVote,
	deleteExpiredProposal,
	executeUpdateConfig,
	executeEnableVersion,
	executeDisableVersion,
	executeUpgrade,
	finalizeUpgrade,
	// Shared objects
	CLOCK_OBJECT_ID,
	SUI_SYSTEM_OBJECT_ID,
	RANDOM_OBJECT_ID,
	// Validation utilities
	validateU64,
	validateTxid,
	validateAddress,
	validateVout,
	validateBitcoinAddress,
	validateSignature,
	validateSignersBitmap,
	validateNoDuplicates,
	validateNonEmpty,
	reverseTxidBytes,
} from './transactions/index.js';
export type {
	// User operation params
	CreateDepositRequestParams,
	RequestWithdrawalParams,
	CancelWithdrawalParams,
	// Deposit operation params
	ConfirmDepositParams,
	DeleteExpiredDepositsParams,
	// Withdrawal operation params
	ApproveWithdrawalRequestsParams,
	UtxoInput,
	OutputUtxoInput,
	CommitWithdrawalTxParams,
	SignWithdrawalParams,
	ConfirmWithdrawalParams,
	DeleteExpiredSpentUtxoParams,
	// Validator management params
	UpdatePublicKeyParams,
	UpdateOperatorAddressParams,
	UpdateEndpointUrlParams,
	UpdateTlsPublicKeyParams,
	UpdateEncryptionPublicKeyParams,
	// Reconfiguration params
	EndReconfigParams,
	// Certificate submission params
	SubmitDkgCertParams,
	SubmitRotationCertParams,
	SubmitNonceCertParams,
	DestroyAllCertsParams,
	// Governance params
	ProposalTypeName,
	ConfigValueType,
	ProposeUpdateConfigParams,
	ProposeEnableVersionParams,
	ProposeDisableVersionParams,
	ProposeUpgradeParams,
	VoteParams,
	RemoveVoteParams,
	DeleteExpiredProposalParams,
	ExecuteUpdateConfigParams,
	ExecuteEnableVersionParams,
	ExecuteDisableVersionParams,
	ExecuteUpgradeParams,
	FinalizeUpgradeParams,
} from './transactions/index.js';

// Bitcoin helpers
export {
	encodeBitcoinAddress,
	decodeBitcoinAddress,
	satsToBtc,
	btcToSats,
	deriveDepositAddress,
	arkworksToCompressedHex,
} from './bitcoin.js';
export type { DecodedBitcoinAddress, BitcoinNetwork } from './bitcoin.js';

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

// Query functions
export {
	getHashiState,
	getConfig,
	getDepositFee,
	getWithdrawalFeeBtc,
	getWithdrawalMinimum,
	getDepositMinimum,
	getIsPaused,
	getWithdrawalCancellationCooldownMs,
	DUST_RELAY_MIN_VALUE,
	getDepositRequest,
	listDepositRequests,
	getWithdrawalRequest,
	listPendingWithdrawals,
	getCommittee,
	getMemberInfo,
	getUtxo,
} from './queries/index.js';
export type { QueryContext } from './queries/index.js';

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
