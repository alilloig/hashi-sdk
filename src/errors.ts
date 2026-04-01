/**
 * Error hierarchy for the Hashi SDK.
 *
 * All SDK errors extend HashiError. Specific subclasses provide structured
 * information about transaction failures, query failures, BCS parsing issues,
 * Bitcoin address problems, and configuration validation.
 */

// ---- Base Error ----

/** Base error class for all Hashi SDK errors. */
export class HashiError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'HashiError';
	}
}

// ---- Transaction Errors ----

/**
 * Error thrown for invalid transaction parameters or Move abort codes.
 * Includes optional `module` and `abortCode` fields for programmatic handling.
 */
export class HashiTransactionError extends HashiError {
	/** The Move module that produced the abort, if known. */
	readonly module?: string;
	/** The numeric abort code from the Move module. */
	readonly abortCode?: number;

	constructor(
		message: string,
		options?: { module?: string; abortCode?: number },
	) {
		super(message);
		this.name = 'HashiTransactionError';
		this.module = options?.module;
		this.abortCode = options?.abortCode;
	}
}

// ---- Query Errors ----

/** Error thrown when an RPC query fails. */
export class HashiQueryError extends HashiError {
	constructor(message: string) {
		super(message);
		this.name = 'HashiQueryError';
	}
}

// ---- Parse Errors ----

/** Error thrown when BCS deserialization or event parsing fails. */
export class HashiParseError extends HashiError {
	constructor(message: string) {
		super(message);
		this.name = 'HashiParseError';
	}
}

// ---- Bitcoin Errors ----

/** Error thrown for invalid Bitcoin addresses or amounts. */
export class HashiBitcoinError extends HashiError {
	constructor(message: string) {
		super(message);
		this.name = 'HashiBitcoinError';
	}
}

// ---- Config Errors ----

/** Error thrown for invalid configuration (bad addresses, missing fields). */
export class HashiConfigError extends HashiError {
	constructor(message: string) {
		super(message);
		this.name = 'HashiConfigError';
	}
}

// ---- Abort Code Mapping ----

/**
 * An entry in the abort code table, mapping a (module, code) pair to a
 * human-readable error message.
 */
export interface AbortCodeEntry {
	module: string;
	code: number;
	constant: string;
	message: string;
}

/**
 * Abort code table sourced from Hashi Move modules.
 *
 * Some modules use sequential numeric codes (e.g. committee 0-3),
 * while others use error attribute annotations without explicit codes.
 * For modules without explicit codes, we assign codes starting from 0
 * based on declaration order in the source.
 */
export const ABORT_CODES: AbortCodeEntry[] = [
	// committee module
	{ module: 'committee', code: 0, constant: 'EInvalidBitmap', message: 'Invalid signer bitmap' },
	{ module: 'committee', code: 1, constant: 'ESigVerification', message: 'Signature verification failed' },
	{ module: 'committee', code: 2, constant: 'ENotEnoughStake', message: 'Not enough stake for threshold' },
	{ module: 'committee', code: 3, constant: 'EIncorrectCommittee', message: 'Incorrect committee for epoch' },

	// config module
	{ module: 'config', code: 0, constant: 'EVersionDisabled', message: 'Version disabled' },
	{ module: 'config', code: 1, constant: 'EDisableCurrentVersion', message: 'Cannot disable current version' },
	{ module: 'config', code: 2, constant: 'EInvalidConfigEntry', message: 'Unknown config key or wrong value type' },

	// config_value module
	{ module: 'config_value', code: 0, constant: 'EInvalidConfigValue', message: 'Invalid config value' },

	// reconfig module
	{ module: 'reconfig', code: 0, constant: 'ENotReconfiguring', message: 'Not currently reconfiguring' },
	{ module: 'reconfig', code: 1, constant: 'EAbortReconfigDisabled', message: 'Abort reconfig is disabled' },

	// deposit_queue module
	{ module: 'deposit_queue', code: 0, constant: 'EDepositRequestNotExpired', message: 'Deposit request not expired' },

	// proposal module
	{ module: 'proposal', code: 0, constant: 'EUnauthorizedCaller', message: 'Caller must be a voting member' },
	{ module: 'proposal', code: 1, constant: 'EVoteAlreadyCounted', message: 'Vote already counted' },
	{ module: 'proposal', code: 2, constant: 'EQuorumNotReached', message: 'Quorum not reached' },
	{ module: 'proposal', code: 3, constant: 'ENoVoteFound', message: "Vote doesn't exist" },
	{ module: 'proposal', code: 4, constant: 'EProposalNotExpired', message: 'Proposal not expired' },
	{ module: 'proposal', code: 5, constant: 'EProposalExpired', message: 'Proposal expired' },

	// tob module
	{ module: 'tob', code: 0, constant: 'EWrongEpoch', message: 'Wrong epoch for certificate' },
	{ module: 'tob', code: 1, constant: 'ETooEarlyToDestroy', message: 'Too early to destroy certificates' },

	// threshold module
	{ module: 'threshold', code: 0, constant: 'EThresholdBpsTooHigh', message: 'Threshold BPS must be at most 10000' },

	// utxo_pool module
	{ module: 'utxo_pool', code: 0, constant: 'ESpentUtxoNotExpired', message: 'Spent UTXO not expired yet' },

	// withdraw module
	{ module: 'withdraw', code: 0, constant: 'EUnauthorizedCancellation', message: 'Only original requester can cancel' },
	{ module: 'withdraw', code: 1, constant: 'ECooldownNotElapsed', message: 'Cancellation cooldown not elapsed' },
	{ module: 'withdraw', code: 2, constant: 'ERequestAlreadyApproved', message: 'Request already approved' },

	// withdrawal_queue module
	{ module: 'withdrawal_queue', code: 0, constant: 'ERequestNotApproved', message: 'Request not approved' },
	{ module: 'withdrawal_queue', code: 1, constant: 'EOutputBelowDust', message: 'Output below dust threshold' },
	{ module: 'withdrawal_queue', code: 2, constant: 'EOutputAmountMismatch', message: 'Output amount mismatch' },
	{ module: 'withdrawal_queue', code: 3, constant: 'EOutputAddressMismatch', message: 'Output address mismatch' },
	{ module: 'withdrawal_queue', code: 4, constant: 'EMinerFeeExceedsMax', message: 'Miner fee exceeds max' },
	{ module: 'withdrawal_queue', code: 5, constant: 'EInputsBelowOutputs', message: 'Inputs below outputs' },
	{ module: 'withdrawal_queue', code: 6, constant: 'EOutputCountMismatch', message: 'Output count mismatch' },
];

/**
 * Look up a human-readable message for a Move abort code.
 *
 * @param module - The Move module name (e.g. "committee", "config")
 * @param code - The numeric abort code
 * @returns The abort code entry if found, or undefined
 */
export function lookupAbortCode(module: string, code: number): AbortCodeEntry | undefined {
	return ABORT_CODES.find((entry) => entry.module === module && entry.code === code);
}

/**
 * Create a HashiTransactionError from a Move abort, enriched with the
 * human-readable message from the abort code table.
 */
export function transactionErrorFromAbort(
	module: string,
	abortCode: number,
): HashiTransactionError {
	const entry = lookupAbortCode(module, abortCode);
	const message = entry
		? `${module}::${entry.constant} (code ${abortCode}): ${entry.message}`
		: `${module} abort code ${abortCode}`;
	return new HashiTransactionError(message, { module, abortCode });
}
