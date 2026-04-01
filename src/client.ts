/**
 * HashiClient: a convenience facade that bundles a SuiClient + HashiConfig
 * and delegates to the standalone transaction builder and query functions.
 *
 * Use HashiClient when you want a single object to manage configuration
 * and RPC access. Use the standalone functions directly when you need
 * maximum flexibility or tree-shaking.
 *
 * @example
 * ```ts
 * import { SuiClient } from '@mysten/sui/client';
 * import { HashiClient } from 'hashi-sdk/client';
 *
 * const hashi = new HashiClient({
 *   client: new SuiClient({ url: 'https://fullnode.testnet.sui.io' }),
 *   network: 'testnet',
 * });
 *
 * // Build a deposit request transaction
 * const build = hashi.createDepositRequest({
 *   txid: '00'.repeat(32),
 *   vout: 0,
 *   amount: 100_000n,
 * });
 *
 * // Query the bridge state
 * const state = await hashi.getHashiState();
 * ```
 */

import type { CoreClient } from '@mysten/sui/client';
import type { SuiClientTypes } from '@mysten/sui/client';
import { HashiConfig, type NetworkPreset, type HashiConfigOptions } from './utils/config.js';
import { HashiConfigError } from './errors.js';

// Transaction builders
import { createDepositRequest, type CreateDepositRequestParams } from './transactions/createDepositRequest.js';
import { requestWithdrawal, type RequestWithdrawalParams } from './transactions/requestWithdrawal.js';
import { cancelWithdrawal, type CancelWithdrawalParams } from './transactions/cancelWithdrawal.js';
import { confirmDeposit, deleteExpiredDeposits, type ConfirmDepositParams, type DeleteExpiredDepositsParams } from './transactions/deposit-ops.js';
import {
	approveWithdrawalRequests,
	commitWithdrawalTx,
	signWithdrawal,
	confirmWithdrawal,
	deleteExpiredSpentUtxo,
	type ApproveWithdrawalRequestsParams,
	type CommitWithdrawalTxParams,
	type SignWithdrawalParams,
	type ConfirmWithdrawalParams,
	type DeleteExpiredSpentUtxoParams,
} from './transactions/withdrawal-ops.js';
import {
	register,
	updatePublicKey,
	updateOperatorAddress,
	updateEndpointUrl,
	updateTlsPublicKey,
	updateEncryptionPublicKey,
	type UpdatePublicKeyParams,
	type UpdateOperatorAddressParams,
	type UpdateEndpointUrlParams,
	type UpdateTlsPublicKeyParams,
	type UpdateEncryptionPublicKeyParams,
} from './transactions/validator-ops.js';
import { startReconfig, endReconfig, type EndReconfigParams } from './transactions/reconfig-ops.js';
import {
	submitDkgCert,
	submitRotationCert,
	submitNonceCert,
	destroyAllCerts,
	type SubmitDkgCertParams,
	type SubmitRotationCertParams,
	type SubmitNonceCertParams,
	type DestroyAllCertsParams,
} from './transactions/cert-ops.js';
import {
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
	type ProposeUpdateConfigParams,
	type ProposeEnableVersionParams,
	type ProposeDisableVersionParams,
	type ProposeUpgradeParams,
	type VoteParams,
	type RemoveVoteParams,
	type DeleteExpiredProposalParams,
	type ExecuteUpdateConfigParams,
	type ExecuteEnableVersionParams,
	type ExecuteDisableVersionParams,
	type ExecuteUpgradeParams,
	type FinalizeUpgradeParams,
} from './transactions/governance-ops.js';

// Query functions
import { getHashiState, getConfig } from './queries/state.js';
import { getDepositRequest, listDepositRequests } from './queries/deposits.js';
import { getWithdrawalRequest, listPendingWithdrawals } from './queries/withdrawals.js';
import { getCommittee, getMemberInfo } from './queries/committee.js';
import { getUtxo } from './queries/utxo.js';

// Events
import { parseHashiEvent, parseHashiEventStrict } from './events/parser.js';

// Types re-exported for convenience
import type { HashiState } from './types/hashi.js';
import type { Config } from './types/config.js';
import type { DepositRequest } from './types/deposit.js';
import type { WithdrawalRequest, PendingWithdrawal } from './types/withdrawal.js';
import type { Committee, MemberInfo } from './types/committee.js';
import type { Utxo } from './types/utxo.js';
import type { PaginatedResult } from './types/common.js';
import type { HashiEvent } from './events/types.js';
import type { ParseHashiEventResult } from './events/parser.js';
import type { Transaction, TransactionResult } from '@mysten/sui/transactions';

/** Options for constructing a HashiClient. */
export interface HashiClientOptions {
	/** A Sui CoreClient instance for RPC calls. */
	client: CoreClient;
	/** Network preset name. Provide either this or `config`. */
	network?: NetworkPreset;
	/** Explicit configuration options. Provide either this or `network`. */
	config?: HashiConfigOptions;
}

/**
 * Convenience facade that bundles a SuiClient with a HashiConfig and
 * exposes every SDK operation as a method.
 *
 * Transaction builder methods return `(tx: Transaction) => void` closures
 * (or `(tx: Transaction) => TransactionResult` where applicable), identical
 * to the standalone functions. Query methods return Promises.
 *
 * @example
 * ```ts
 * const hashi = new HashiClient({
 *   client: new SuiClient({ url: 'https://fullnode.testnet.sui.io' }),
 *   network: 'testnet',
 * });
 *
 * const build = hashi.createDepositRequest({ txid: '00'.repeat(32), vout: 0, amount: 100_000n });
 * const tx = new Transaction();
 * build(tx);
 * ```
 */
export class HashiClient {
	/** The resolved configuration for this client instance. */
	readonly config: HashiConfig;

	/** The underlying Sui RPC client. */
	private readonly client: CoreClient;

	/**
	 * Create a new HashiClient.
	 *
	 * @param options - Must include `client` and either `network` or `config`.
	 * @throws {HashiConfigError} If neither `network` nor `config` is provided.
	 */
	constructor(options: HashiClientOptions) {
		this.client = options.client;

		if (options.config) {
			this.config = new HashiConfig(options.config);
		} else if (options.network) {
			this.config = new HashiConfig(options.network);
		} else {
			throw new HashiConfigError('Either network or config must be provided');
		}
	}

	// ----------------------------------------------------------------
	// Transaction builders -- User operations
	// ----------------------------------------------------------------

	/**
	 * Build a deposit request transaction.
	 *
	 * @param params - Deposit request parameters (txid, vout, amount, derivationPath).
	 * @returns A closure that populates a Transaction with the PTB steps.
	 */
	createDepositRequest(params: CreateDepositRequestParams): (tx: Transaction) => void {
		return createDepositRequest(this.config, params);
	}

	/**
	 * Build a withdrawal request transaction.
	 *
	 * @param params - Withdrawal parameters (amount, bitcoinAddress).
	 * @returns A closure that populates a Transaction with the PTB steps.
	 */
	requestWithdrawal(params: RequestWithdrawalParams): (tx: Transaction) => void {
		return requestWithdrawal(this.config, params);
	}

	/**
	 * Build a cancel withdrawal transaction.
	 *
	 * @param params - Cancel parameters (requestId).
	 * @returns A closure that populates a Transaction and returns the refunded coin.
	 */
	cancelWithdrawal(params: CancelWithdrawalParams): (tx: Transaction) => TransactionResult {
		return cancelWithdrawal(this.config, params);
	}

	// ----------------------------------------------------------------
	// Transaction builders -- Deposit operations (validator/committee)
	// ----------------------------------------------------------------

	/**
	 * Build a confirm deposit transaction.
	 *
	 * @param params - Confirm deposit parameters.
	 * @returns A closure that populates a Transaction with the PTB steps.
	 */
	confirmDeposit(params: ConfirmDepositParams): (tx: Transaction) => void {
		return confirmDeposit(this.config, params);
	}

	/**
	 * Build a batched delete expired deposits transaction.
	 *
	 * @param params - Delete expired deposits parameters.
	 * @returns A closure that populates a Transaction with the PTB steps.
	 */
	deleteExpiredDeposits(params: DeleteExpiredDepositsParams): (tx: Transaction) => void {
		return deleteExpiredDeposits(this.config, params);
	}

	// ----------------------------------------------------------------
	// Transaction builders -- Withdrawal operations (validator/committee)
	// ----------------------------------------------------------------

	/**
	 * Build a batched approve withdrawal requests transaction.
	 *
	 * @param params - Approve parameters (requestIds, epoch, signature, signersBitmap).
	 * @returns A closure that populates a Transaction with the PTB steps.
	 */
	approveWithdrawalRequests(params: ApproveWithdrawalRequestsParams): (tx: Transaction) => void {
		return approveWithdrawalRequests(this.config, params);
	}

	/**
	 * Build a commit withdrawal transaction.
	 *
	 * @param params - Commit parameters (requestIds, selectedUtxos, outputs, txid, epoch, signature, signersBitmap).
	 * @returns A closure that populates a Transaction with the PTB steps.
	 */
	commitWithdrawalTx(params: CommitWithdrawalTxParams): (tx: Transaction) => void {
		return commitWithdrawalTx(this.config, params);
	}

	/**
	 * Build a sign withdrawal transaction.
	 *
	 * @param params - Sign parameters (withdrawalId, requestIds, signatures, epoch, signature, signersBitmap).
	 * @returns A closure that populates a Transaction with the PTB steps.
	 */
	signWithdrawal(params: SignWithdrawalParams): (tx: Transaction) => void {
		return signWithdrawal(this.config, params);
	}

	/**
	 * Build a confirm withdrawal transaction.
	 *
	 * @param params - Confirm withdrawal parameters.
	 * @returns A closure that populates a Transaction with the PTB steps.
	 */
	confirmWithdrawal(params: ConfirmWithdrawalParams): (tx: Transaction) => void {
		return confirmWithdrawal(this.config, params);
	}

	/**
	 * Build a delete expired spent UTXO transaction.
	 *
	 * @param params - UTXO identification parameters (txid, vout).
	 * @returns A closure that populates a Transaction with the PTB steps.
	 */
	deleteExpiredSpentUtxo(params: DeleteExpiredSpentUtxoParams): (tx: Transaction) => void {
		return deleteExpiredSpentUtxo(this.config, params);
	}

	// ----------------------------------------------------------------
	// Transaction builders -- Validator management
	// ----------------------------------------------------------------

	/**
	 * Build a validator registration transaction.
	 *
	 * @returns A closure that populates a Transaction with the PTB steps.
	 */
	register(): (tx: Transaction) => void {
		return register(this.config);
	}

	/**
	 * Build an update public key transaction.
	 *
	 * @param params - Update public key parameters.
	 * @returns A closure that populates a Transaction with the PTB steps.
	 */
	updatePublicKey(params: UpdatePublicKeyParams): (tx: Transaction) => void {
		return updatePublicKey(this.config, params);
	}

	/**
	 * Build an update operator address transaction.
	 *
	 * @param params - Update operator address parameters.
	 * @returns A closure that populates a Transaction with the PTB steps.
	 */
	updateOperatorAddress(params: UpdateOperatorAddressParams): (tx: Transaction) => void {
		return updateOperatorAddress(this.config, params);
	}

	/**
	 * Build an update endpoint URL transaction.
	 *
	 * @param params - Update endpoint URL parameters.
	 * @returns A closure that populates a Transaction with the PTB steps.
	 */
	updateEndpointUrl(params: UpdateEndpointUrlParams): (tx: Transaction) => void {
		return updateEndpointUrl(this.config, params);
	}

	/**
	 * Build an update TLS public key transaction.
	 *
	 * @param params - Update TLS public key parameters.
	 * @returns A closure that populates a Transaction with the PTB steps.
	 */
	updateTlsPublicKey(params: UpdateTlsPublicKeyParams): (tx: Transaction) => void {
		return updateTlsPublicKey(this.config, params);
	}

	/**
	 * Build an update encryption public key transaction.
	 *
	 * @param params - Update encryption public key parameters.
	 * @returns A closure that populates a Transaction with the PTB steps.
	 */
	updateEncryptionPublicKey(params: UpdateEncryptionPublicKeyParams): (tx: Transaction) => void {
		return updateEncryptionPublicKey(this.config, params);
	}

	// ----------------------------------------------------------------
	// Transaction builders -- Reconfiguration
	// ----------------------------------------------------------------

	/**
	 * Build a start reconfiguration transaction.
	 *
	 * @returns A closure that populates a Transaction with the PTB steps.
	 */
	startReconfig(): (tx: Transaction) => void {
		return startReconfig(this.config);
	}

	/**
	 * Build an end reconfiguration transaction.
	 *
	 * @param params - End reconfig parameters (mpcPublicKey, signature, signersBitmap).
	 * @returns A closure that populates a Transaction with the PTB steps.
	 */
	endReconfig(params: EndReconfigParams): (tx: Transaction) => void {
		return endReconfig(this.config, params);
	}

	// ----------------------------------------------------------------
	// Transaction builders -- Certificate submission
	// ----------------------------------------------------------------

	/**
	 * Build a submit DKG certificate transaction.
	 *
	 * @param params - DKG cert parameters.
	 * @returns A closure that populates a Transaction with the PTB steps.
	 */
	submitDkgCert(params: SubmitDkgCertParams): (tx: Transaction) => void {
		return submitDkgCert(this.config, params);
	}

	/**
	 * Build a submit rotation certificate transaction.
	 *
	 * @param params - Rotation cert parameters.
	 * @returns A closure that populates a Transaction with the PTB steps.
	 */
	submitRotationCert(params: SubmitRotationCertParams): (tx: Transaction) => void {
		return submitRotationCert(this.config, params);
	}

	/**
	 * Build a submit nonce certificate transaction.
	 *
	 * @param params - Nonce cert parameters.
	 * @returns A closure that populates a Transaction with the PTB steps.
	 */
	submitNonceCert(params: SubmitNonceCertParams): (tx: Transaction) => void {
		return submitNonceCert(this.config, params);
	}

	/**
	 * Build a destroy all certificates transaction.
	 *
	 * @param params - Destroy parameters (epoch, batchIndex).
	 * @returns A closure that populates a Transaction with the PTB steps.
	 */
	destroyAllCerts(params: DestroyAllCertsParams): (tx: Transaction) => void {
		return destroyAllCerts(this.config, params);
	}

	// ----------------------------------------------------------------
	// Transaction builders -- Governance
	// ----------------------------------------------------------------

	/**
	 * Build a propose update config transaction.
	 *
	 * @param params - Proposal parameters (key, value, metadata).
	 * @returns A closure that populates a Transaction with the PTB steps.
	 */
	proposeUpdateConfig(params: ProposeUpdateConfigParams): (tx: Transaction) => void {
		return proposeUpdateConfig(this.config, params);
	}

	/**
	 * Build a propose enable version transaction.
	 *
	 * @param params - Proposal parameters (version, metadata).
	 * @returns A closure that populates a Transaction with the PTB steps.
	 */
	proposeEnableVersion(params: ProposeEnableVersionParams): (tx: Transaction) => void {
		return proposeEnableVersion(this.config, params);
	}

	/**
	 * Build a propose disable version transaction.
	 *
	 * @param params - Proposal parameters (version, metadata).
	 * @returns A closure that populates a Transaction with the PTB steps.
	 */
	proposeDisableVersion(params: ProposeDisableVersionParams): (tx: Transaction) => void {
		return proposeDisableVersion(this.config, params);
	}

	/**
	 * Build a propose upgrade transaction.
	 *
	 * @param params - Proposal parameters (digest, metadata).
	 * @returns A closure that populates a Transaction with the PTB steps.
	 */
	proposeUpgrade(params: ProposeUpgradeParams): (tx: Transaction) => void {
		return proposeUpgrade(this.config, params);
	}

	/**
	 * Build a vote transaction.
	 *
	 * @param params - Vote parameters (proposalId, proposalType).
	 * @returns A closure that populates a Transaction with the PTB steps.
	 */
	vote(params: VoteParams): (tx: Transaction) => void {
		return vote(this.config, params);
	}

	/**
	 * Build a remove vote transaction.
	 *
	 * @param params - Remove vote parameters (proposalId, proposalType).
	 * @returns A closure that populates a Transaction with the PTB steps.
	 */
	removeVote(params: RemoveVoteParams): (tx: Transaction) => void {
		return removeVote(this.config, params);
	}

	/**
	 * Build a delete expired proposal transaction.
	 *
	 * @param params - Delete parameters (proposalId, proposalType).
	 * @returns A closure that populates a Transaction with the PTB steps.
	 */
	deleteExpiredProposal(params: DeleteExpiredProposalParams): (tx: Transaction) => void {
		return deleteExpiredProposal(this.config, params);
	}

	/**
	 * Build an execute update config transaction.
	 *
	 * @param params - Execute parameters (proposalId).
	 * @returns A closure that populates a Transaction with the PTB steps.
	 */
	executeUpdateConfig(params: ExecuteUpdateConfigParams): (tx: Transaction) => void {
		return executeUpdateConfig(this.config, params);
	}

	/**
	 * Build an execute enable version transaction.
	 *
	 * @param params - Execute parameters (proposalId).
	 * @returns A closure that populates a Transaction with the PTB steps.
	 */
	executeEnableVersion(params: ExecuteEnableVersionParams): (tx: Transaction) => void {
		return executeEnableVersion(this.config, params);
	}

	/**
	 * Build an execute disable version transaction.
	 *
	 * @param params - Execute parameters (proposalId).
	 * @returns A closure that populates a Transaction with the PTB steps.
	 */
	executeDisableVersion(params: ExecuteDisableVersionParams): (tx: Transaction) => void {
		return executeDisableVersion(this.config, params);
	}

	/**
	 * Build an execute upgrade transaction.
	 *
	 * @param params - Execute parameters (proposalId).
	 * @returns A closure that returns the UpgradeTicket TransactionResult.
	 */
	executeUpgrade(params: ExecuteUpgradeParams): (tx: Transaction) => TransactionResult {
		return executeUpgrade(this.config, params);
	}

	/**
	 * Build a finalize upgrade transaction.
	 *
	 * @param params - Finalize parameters (receipt).
	 * @returns A closure that populates a Transaction with the PTB steps.
	 */
	finalizeUpgrade(params: FinalizeUpgradeParams): (tx: Transaction) => void {
		return finalizeUpgrade(this.config, params);
	}

	// ----------------------------------------------------------------
	// Query methods
	// ----------------------------------------------------------------

	/**
	 * Fetch the root Hashi shared object and deserialize it.
	 *
	 * @returns The full HashiState.
	 */
	async getHashiState(): Promise<HashiState> {
		return getHashiState(this.client, this.config);
	}

	/**
	 * Fetch the Config from the Hashi state object.
	 *
	 * @returns The bridge Config.
	 */
	async getConfig(): Promise<Config> {
		return getConfig(this.client, this.config);
	}

	/**
	 * Fetch a single deposit request by its ID.
	 *
	 * @param requestId - The deposit request object ID.
	 * @returns The DepositRequest, or null if not found.
	 */
	async getDepositRequest(requestId: string): Promise<DepositRequest | null> {
		return getDepositRequest(this.client, this.config, requestId);
	}

	/**
	 * List deposit requests with optional pagination.
	 *
	 * @param options - Optional cursor and limit for pagination.
	 * @returns Paginated deposit requests.
	 */
	async listDepositRequests(options?: { cursor?: string; limit?: number }): Promise<PaginatedResult<DepositRequest>> {
		return listDepositRequests(this.client, this.config, options);
	}

	/**
	 * Fetch a single withdrawal request by its ID.
	 *
	 * @param requestId - The withdrawal request object ID.
	 * @returns The WithdrawalRequest, or null if not found.
	 */
	async getWithdrawalRequest(requestId: string): Promise<WithdrawalRequest | null> {
		return getWithdrawalRequest(this.client, this.config, requestId);
	}

	/**
	 * List pending withdrawals with optional pagination.
	 *
	 * @param options - Optional cursor and limit for pagination.
	 * @returns Paginated pending withdrawals.
	 */
	async listPendingWithdrawals(options?: { cursor?: string; limit?: number }): Promise<PaginatedResult<PendingWithdrawal>> {
		return listPendingWithdrawals(this.client, this.config, options);
	}

	/**
	 * Fetch a Committee for a given epoch. Defaults to the current epoch.
	 *
	 * @param epoch - Optional epoch number.
	 * @returns The Committee, or null if not found.
	 */
	async getCommittee(epoch?: bigint | number): Promise<Committee | null> {
		return getCommittee(this.client, this.config, epoch);
	}

	/**
	 * Fetch MemberInfo for a specific validator address.
	 *
	 * @param validatorAddress - The validator's Sui address.
	 * @returns The MemberInfo, or null if not found.
	 */
	async getMemberInfo(validatorAddress: string): Promise<MemberInfo | null> {
		return getMemberInfo(this.client, this.config, validatorAddress);
	}

	/**
	 * Fetch a UTXO from the active pool by its transaction ID and output index.
	 *
	 * @param txid - The Bitcoin transaction ID.
	 * @param vout - The output index.
	 * @returns The Utxo, or null if not found.
	 */
	async getUtxo(txid: string, vout: number): Promise<Utxo | null> {
		return getUtxo(this.client, this.config, txid, vout);
	}

	// ----------------------------------------------------------------
	// Event parsing
	// ----------------------------------------------------------------

	/**
	 * Parse a Sui event into a typed HashiEvent (best-effort).
	 *
	 * Uses the client's configured packageId and originalPackageId for
	 * package matching.
	 *
	 * @param event - A raw Sui event object.
	 * @returns The parsed HashiEvent, or null if the event is not a Hashi event.
	 */
	parseEvent(event: SuiClientTypes.Event): HashiEvent | null {
		return parseHashiEvent(
			event,
			new Set([this.config.packageId, this.config.originalPackageId]),
		);
	}

	/**
	 * Parse a Sui event into a typed HashiEvent (strict mode).
	 *
	 * Returns `{ event }` on success or `{ error }` on failure.
	 *
	 * @param event - A raw Sui event object.
	 * @returns A discriminated result with either the parsed event or an error.
	 */
	parseEventStrict(event: SuiClientTypes.Event): ParseHashiEventResult {
		return parseHashiEventStrict(
			event,
			new Set([this.config.packageId, this.config.originalPackageId]),
		);
	}

	// ----------------------------------------------------------------
	// Convenience getters
	// ----------------------------------------------------------------

	/**
	 * The BTC coin type string for this deployment.
	 * Uses the original package ID for type resolution.
	 */
	get btcCoinType(): string {
		return this.config.btcCoinType;
	}
}
