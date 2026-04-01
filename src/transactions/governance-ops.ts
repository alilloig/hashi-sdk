/**
 * Governance transaction builders.
 *
 * Proposal lifecycle:
 *   1. propose* — create a new proposal
 *   2. vote / removeVote — cast or remove a vote on a proposal
 *   3. execute* — execute an approved proposal
 *   4. deleteExpiredProposal — clean up an expired proposal
 *   5. finalizeUpgrade — finalize a package upgrade (after execute)
 *
 * Supported proposal types:
 *   - UpdateConfig: change a config key/value
 *   - EnableVersion: enable a package version
 *   - DisableVersion: disable a package version
 *   - Upgrade: upgrade the package
 */

import type { Transaction, TransactionResult } from '@mysten/sui/transactions';
import type { HashiConfig } from '../utils/config.js';
import {
	propose as proposeUpdateConfigCall,
	execute as executeUpdateConfigCall,
} from '../contracts/hashi/update_config.js';
import {
	propose as proposeEnableVersionCall,
	execute as executeEnableVersionCall,
} from '../contracts/hashi/enable_version.js';
import {
	propose as proposeDisableVersionCall,
	execute as executeDisableVersionCall,
} from '../contracts/hashi/disable_version.js';
import {
	propose as proposeUpgradeCall,
	execute as executeUpgradeCall,
	finalizeUpgrade as finalizeUpgradeCall,
} from '../contracts/hashi/upgrade.js';
import {
	vote as voteCall,
	removeVote as removeVoteCall,
	deleteExpired as deleteExpiredCall,
} from '../contracts/hashi/proposal.js';
import {
	validateAddress,
	validateU64,
} from './validation.js';
import { HashiTransactionError } from '../errors.js';

// ---- Proposal type tag resolution ----

/** Supported governance proposal types. */
export type ProposalTypeName = 'UpdateConfig' | 'EnableVersion' | 'DisableVersion' | 'Upgrade';

/**
 * Resolve a proposal type name to a full Move struct tag.
 */
function resolveProposalTypeTag(config: HashiConfig, typeName: ProposalTypeName): string {
	const TYPE_MAP: Record<ProposalTypeName, string> = {
		UpdateConfig: `${config.packageId}::update_config::UpdateConfig`,
		EnableVersion: `${config.packageId}::enable_version::EnableVersion`,
		DisableVersion: `${config.packageId}::disable_version::DisableVersion`,
		Upgrade: `${config.packageId}::upgrade::Upgrade`,
	};
	return TYPE_MAP[typeName];
}

// ---- proposeUpdateConfig ----

/** Supported config value types. */
export type ConfigValueType = 'u64' | 'address' | 'string' | 'bool' | 'bytes';

/** Parameters for proposeUpdateConfig. */
export interface ProposeUpdateConfigParams {
	/** The config key to update. */
	key: string;
	/** The config value object ID (created separately) or inline value. */
	value: string;
	/** Metadata object ID for the proposal. */
	metadata: string;
}

/**
 * Build a propose update config transaction.
 *
 * The `value` parameter should be a config_value object ID (created in the
 * same PTB or previously). The `metadata` is a VecMap<String, String> object.
 * Clock is auto-injected by the codegen wrapper.
 *
 * @param config - The HashiConfig providing package and object IDs.
 * @param params - The proposal parameters.
 * @returns A function `(tx: Transaction) => void` that adds the PTB steps.
 * @throws HashiTransactionError if any input is invalid.
 */
export function proposeUpdateConfig(
	config: HashiConfig,
	params: ProposeUpdateConfigParams,
): (tx: Transaction) => void {
	if (typeof params.key !== 'string' || params.key.length === 0) {
		throw new HashiTransactionError('key must be a non-empty string');
	}

	const packageId = config.packageId;
	const hashiObjectId = config.hashiObjectId;

	return (tx: Transaction): void => {
		tx.add(
			proposeUpdateConfigCall({
				package: packageId,
				arguments: {
					hashi: hashiObjectId,
					key: params.key,
					value: params.value,
					metadata: params.metadata,
				},
			}),
		);
	};
}

// ---- proposeEnableVersion ----

/** Parameters for proposeEnableVersion. */
export interface ProposeEnableVersionParams {
	/** The version number to enable. */
	version: bigint | number;
	/** Metadata object ID for the proposal. */
	metadata: string;
}

/**
 * Build a propose enable version transaction.
 *
 * Clock is auto-injected by the codegen wrapper.
 *
 * @param config - The HashiConfig providing package and object IDs.
 * @param params - The proposal parameters.
 * @returns A function `(tx: Transaction) => void` that adds the PTB steps.
 * @throws HashiTransactionError if any input is invalid.
 */
export function proposeEnableVersion(
	config: HashiConfig,
	params: ProposeEnableVersionParams,
): (tx: Transaction) => void {
	const validatedVersion = validateU64(params.version, 'version');

	const packageId = config.packageId;
	const hashiObjectId = config.hashiObjectId;

	return (tx: Transaction): void => {
		tx.add(
			proposeEnableVersionCall({
				package: packageId,
				arguments: {
					hashi: hashiObjectId,
					version: validatedVersion,
					metadata: params.metadata,
				},
			}),
		);
	};
}

// ---- proposeDisableVersion ----

/** Parameters for proposeDisableVersion. */
export interface ProposeDisableVersionParams {
	/** The version number to disable. */
	version: bigint | number;
	/** Metadata object ID for the proposal. */
	metadata: string;
}

/**
 * Build a propose disable version transaction.
 *
 * Clock is auto-injected by the codegen wrapper.
 *
 * @param config - The HashiConfig providing package and object IDs.
 * @param params - The proposal parameters.
 * @returns A function `(tx: Transaction) => void` that adds the PTB steps.
 * @throws HashiTransactionError if any input is invalid.
 */
export function proposeDisableVersion(
	config: HashiConfig,
	params: ProposeDisableVersionParams,
): (tx: Transaction) => void {
	const validatedVersion = validateU64(params.version, 'version');

	const packageId = config.packageId;
	const hashiObjectId = config.hashiObjectId;

	return (tx: Transaction): void => {
		tx.add(
			proposeDisableVersionCall({
				package: packageId,
				arguments: {
					hashi: hashiObjectId,
					version: validatedVersion,
					metadata: params.metadata,
				},
			}),
		);
	};
}

// ---- proposeUpgrade ----

/** Parameters for proposeUpgrade. */
export interface ProposeUpgradeParams {
	/** The new package digest (bytes). */
	digest: Uint8Array;
	/** Metadata object ID for the proposal. */
	metadata: string;
}

/**
 * Build a propose upgrade transaction.
 *
 * Clock is auto-injected by the codegen wrapper.
 *
 * @param config - The HashiConfig providing package and object IDs.
 * @param params - The proposal parameters.
 * @returns A function `(tx: Transaction) => void` that adds the PTB steps.
 * @throws HashiTransactionError if any input is invalid.
 */
export function proposeUpgrade(
	config: HashiConfig,
	params: ProposeUpgradeParams,
): (tx: Transaction) => void {
	if (!(params.digest instanceof Uint8Array) || params.digest.length === 0) {
		throw new HashiTransactionError('digest must be a non-empty Uint8Array');
	}

	const digestArr = Array.from(params.digest);

	const packageId = config.packageId;
	const hashiObjectId = config.hashiObjectId;

	return (tx: Transaction): void => {
		tx.add(
			proposeUpgradeCall({
				package: packageId,
				arguments: {
					hashi: hashiObjectId,
					digest: digestArr,
					metadata: params.metadata,
				},
			}),
		);
	};
}

// ---- vote ----

/** Parameters for vote. */
export interface VoteParams {
	/** The proposal object ID. */
	proposalId: string;
	/** The proposal type for generic type resolution. */
	proposalType: ProposalTypeName;
}

/**
 * Build a vote transaction.
 *
 * Clock is auto-injected by the codegen wrapper.
 *
 * @param config - The HashiConfig providing package and object IDs.
 * @param params - The vote parameters.
 * @returns A function `(tx: Transaction) => void` that adds the PTB steps.
 * @throws HashiTransactionError if any input is invalid.
 */
export function vote(
	config: HashiConfig,
	params: VoteParams,
): (tx: Transaction) => void {
	const normalizedProposalId = validateAddress(params.proposalId, 'proposalId');
	const typeTag = resolveProposalTypeTag(config, params.proposalType);

	const packageId = config.packageId;
	const hashiObjectId = config.hashiObjectId;

	return (tx: Transaction): void => {
		tx.add(
			voteCall({
				package: packageId,
				arguments: {
					hashi: hashiObjectId,
					proposalId: normalizedProposalId,
				},
				typeArguments: [typeTag],
			}),
		);
	};
}

// ---- removeVote ----

/** Parameters for removeVote. */
export interface RemoveVoteParams {
	/** The proposal object ID. */
	proposalId: string;
	/** The proposal type for generic type resolution. */
	proposalType: ProposalTypeName;
}

/**
 * Build a remove vote transaction.
 *
 * @param config - The HashiConfig providing package and object IDs.
 * @param params - The remove vote parameters.
 * @returns A function `(tx: Transaction) => void` that adds the PTB steps.
 * @throws HashiTransactionError if any input is invalid.
 */
export function removeVote(
	config: HashiConfig,
	params: RemoveVoteParams,
): (tx: Transaction) => void {
	const normalizedProposalId = validateAddress(params.proposalId, 'proposalId');
	const typeTag = resolveProposalTypeTag(config, params.proposalType);

	const packageId = config.packageId;
	const hashiObjectId = config.hashiObjectId;

	return (tx: Transaction): void => {
		tx.add(
			removeVoteCall({
				package: packageId,
				arguments: {
					hashi: hashiObjectId,
					proposalId: normalizedProposalId,
				},
				typeArguments: [typeTag],
			}),
		);
	};
}

// ---- deleteExpiredProposal ----

/** Parameters for deleteExpiredProposal. */
export interface DeleteExpiredProposalParams {
	/** The proposal object ID. */
	proposalId: string;
	/** The proposal type for generic type resolution. */
	proposalType: ProposalTypeName;
}

/**
 * Build a delete expired proposal transaction.
 *
 * Clock is auto-injected by the codegen wrapper.
 *
 * @param config - The HashiConfig providing package and object IDs.
 * @param params - The delete parameters.
 * @returns A function `(tx: Transaction) => void` that adds the PTB steps.
 * @throws HashiTransactionError if any input is invalid.
 */
export function deleteExpiredProposal(
	config: HashiConfig,
	params: DeleteExpiredProposalParams,
): (tx: Transaction) => void {
	const normalizedProposalId = validateAddress(params.proposalId, 'proposalId');
	const typeTag = resolveProposalTypeTag(config, params.proposalType);

	const packageId = config.packageId;
	const hashiObjectId = config.hashiObjectId;

	return (tx: Transaction): void => {
		tx.add(
			deleteExpiredCall({
				package: packageId,
				arguments: {
					hashi: hashiObjectId,
					proposalId: normalizedProposalId,
				},
				typeArguments: [typeTag],
			}),
		);
	};
}

// ---- executeUpdateConfig ----

/** Parameters for executeUpdateConfig. */
export interface ExecuteUpdateConfigParams {
	/** The proposal object ID. */
	proposalId: string;
}

/**
 * Build an execute update config transaction.
 *
 * Clock is auto-injected by the codegen wrapper.
 *
 * @param config - The HashiConfig providing package and object IDs.
 * @param params - The execute parameters.
 * @returns A function `(tx: Transaction) => void` that adds the PTB steps.
 * @throws HashiTransactionError if any input is invalid.
 */
export function executeUpdateConfig(
	config: HashiConfig,
	params: ExecuteUpdateConfigParams,
): (tx: Transaction) => void {
	const normalizedProposalId = validateAddress(params.proposalId, 'proposalId');

	const packageId = config.packageId;
	const hashiObjectId = config.hashiObjectId;

	return (tx: Transaction): void => {
		tx.add(
			executeUpdateConfigCall({
				package: packageId,
				arguments: {
					hashi: hashiObjectId,
					proposalId: normalizedProposalId,
				},
			}),
		);
	};
}

// ---- executeEnableVersion ----

/** Parameters for executeEnableVersion. */
export interface ExecuteEnableVersionParams {
	/** The proposal object ID. */
	proposalId: string;
}

/**
 * Build an execute enable version transaction.
 *
 * Clock is auto-injected by the codegen wrapper.
 *
 * @param config - The HashiConfig providing package and object IDs.
 * @param params - The execute parameters.
 * @returns A function `(tx: Transaction) => void` that adds the PTB steps.
 * @throws HashiTransactionError if any input is invalid.
 */
export function executeEnableVersion(
	config: HashiConfig,
	params: ExecuteEnableVersionParams,
): (tx: Transaction) => void {
	const normalizedProposalId = validateAddress(params.proposalId, 'proposalId');

	const packageId = config.packageId;
	const hashiObjectId = config.hashiObjectId;

	return (tx: Transaction): void => {
		tx.add(
			executeEnableVersionCall({
				package: packageId,
				arguments: {
					hashi: hashiObjectId,
					proposalId: normalizedProposalId,
				},
			}),
		);
	};
}

// ---- executeDisableVersion ----

/** Parameters for executeDisableVersion. */
export interface ExecuteDisableVersionParams {
	/** The proposal object ID. */
	proposalId: string;
}

/**
 * Build an execute disable version transaction.
 *
 * Clock is auto-injected by the codegen wrapper.
 *
 * @param config - The HashiConfig providing package and object IDs.
 * @param params - The execute parameters.
 * @returns A function `(tx: Transaction) => void` that adds the PTB steps.
 * @throws HashiTransactionError if any input is invalid.
 */
export function executeDisableVersion(
	config: HashiConfig,
	params: ExecuteDisableVersionParams,
): (tx: Transaction) => void {
	const normalizedProposalId = validateAddress(params.proposalId, 'proposalId');

	const packageId = config.packageId;
	const hashiObjectId = config.hashiObjectId;

	return (tx: Transaction): void => {
		tx.add(
			executeDisableVersionCall({
				package: packageId,
				arguments: {
					hashi: hashiObjectId,
					proposalId: normalizedProposalId,
				},
			}),
		);
	};
}

// ---- executeUpgrade ----

/** Parameters for executeUpgrade. */
export interface ExecuteUpgradeParams {
	/** The proposal object ID. */
	proposalId: string;
}

/**
 * Build an execute upgrade transaction.
 *
 * Returns the UpgradeTicket as a TransactionResult. The caller must use this
 * ticket in the same transaction with sui::package::upgrade, then pass the
 * resulting UpgradeReceipt to finalizeUpgrade.
 *
 * Clock is auto-injected by the codegen wrapper.
 *
 * @param config - The HashiConfig providing package and object IDs.
 * @param params - The execute parameters.
 * @returns A function `(tx: Transaction) => TransactionResult` that adds the PTB steps.
 * @throws HashiTransactionError if any input is invalid.
 */
export function executeUpgrade(
	config: HashiConfig,
	params: ExecuteUpgradeParams,
): (tx: Transaction) => TransactionResult {
	const normalizedProposalId = validateAddress(params.proposalId, 'proposalId');

	const packageId = config.packageId;
	const hashiObjectId = config.hashiObjectId;

	return (tx: Transaction): TransactionResult => {
		return tx.add(
			executeUpgradeCall({
				package: packageId,
				arguments: {
					hashi: hashiObjectId,
					proposalId: normalizedProposalId,
				},
			}),
		);
	};
}

// ---- finalizeUpgrade ----

/** Parameters for finalizeUpgrade. */
export interface FinalizeUpgradeParams {
	/** The UpgradeReceipt object ID or TransactionResult from a prior step. */
	receipt: string;
}

/**
 * Build a finalize upgrade transaction.
 *
 * Must be called after executeUpgrade + sui::package::upgrade in the same PTB.
 *
 * @param config - The HashiConfig providing package and object IDs.
 * @param params - The finalize parameters.
 * @returns A function `(tx: Transaction) => void` that adds the PTB steps.
 * @throws HashiTransactionError if any input is invalid.
 */
export function finalizeUpgrade(
	config: HashiConfig,
	params: FinalizeUpgradeParams,
): (tx: Transaction) => void {
	const packageId = config.packageId;
	const hashiObjectId = config.hashiObjectId;

	return (tx: Transaction): void => {
		tx.add(
			finalizeUpgradeCall({
				package: packageId,
				arguments: {
					hashi: hashiObjectId,
					receipt: params.receipt,
				},
			}),
		);
	};
}
