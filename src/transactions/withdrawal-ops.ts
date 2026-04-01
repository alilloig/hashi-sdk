/**
 * Withdrawal operation transaction builders for committee/validator use.
 *
 * - approveWithdrawalRequests: Batched approval of multiple withdrawal requests
 * - commitWithdrawalTx: Nested BCS double-encoding + Clock + Random
 * - signWithdrawal: Submit ECDSA signatures for a pending withdrawal
 * - confirmWithdrawal: Confirm a withdrawal after Bitcoin broadcast
 * - deleteExpiredSpentUtxo: Clean up expired spent UTXOs
 */

import type { Transaction } from '@mysten/sui/transactions';
import type { HashiConfig } from '../utils/config.js';
import { bcs } from '@mysten/sui/bcs';
import {
	approveRequest as approveRequestCall,
	commitWithdrawalTx as commitWithdrawalTxCall,
	signWithdrawal as signWithdrawalCall,
	confirmWithdrawal as confirmWithdrawalCall,
	deleteExpiredSpentUtxo as deleteExpiredSpentUtxoCall,
} from '../contracts/hashi/withdraw.js';
import {
	validateAddress,
	validateTxid,
	validateU64,
	validateVout,
	validateSignature,
	validateSignersBitmap,
	validateNonEmpty,
	validateNoDuplicates,
} from './validation.js';
import { HashiTransactionError } from '../errors.js';

// ---- UtxoId BCS schema for double-encoding ----

const UtxoIdBcsSchema = bcs.struct('UtxoId', {
	txid: bcs.Address,
	vout: bcs.u32(),
});

const OutputUtxoBcsSchema = bcs.struct('OutputUtxo', {
	amount: bcs.u64(),
	bitcoin_address: bcs.vector(bcs.u8()),
});

// ---- approveWithdrawalRequests ----

/** Parameters for approveWithdrawalRequests. */
export interface ApproveWithdrawalRequestsParams {
	/** Array of withdrawal request IDs to approve. */
	requestIds: string[];
	/** The committee epoch for signature verification. */
	epoch: bigint | number;
	/** Committee BLS signature (48 bytes). */
	signature: Uint8Array;
	/** Signers bitmap indicating which validators signed. */
	signersBitmap: Uint8Array;
}

/**
 * Build a batched approve withdrawal requests transaction.
 *
 * Adds one approve_request call per request ID to the same PTB.
 * Each call receives the same epoch, signature, and bitmap.
 *
 * @param config - The HashiConfig providing package and object IDs.
 * @param params - The batch approval parameters.
 * @returns A function `(tx: Transaction) => void` that adds the PTB steps.
 * @throws HashiTransactionError if any input is invalid.
 */
export function approveWithdrawalRequests(
	config: HashiConfig,
	params: ApproveWithdrawalRequestsParams,
): (tx: Transaction) => void {
	validateNonEmpty(params.requestIds, 'requestIds');
	const normalizedIds = params.requestIds.map((id, i) =>
		validateAddress(id, `requestIds[${i}]`),
	);
	const validatedEpoch = validateU64(params.epoch, 'epoch');
	const validatedSignature = validateSignature(params.signature);
	const validatedBitmap = validateSignersBitmap(params.signersBitmap);

	const packageId = config.packageId;
	const hashiObjectId = config.hashiObjectId;

	return (tx: Transaction): void => {
		for (const requestId of normalizedIds) {
			tx.add(
				approveRequestCall({
					package: packageId,
					arguments: {
						hashi: hashiObjectId,
						requestId,
						epoch: validatedEpoch,
						signature: validatedSignature,
						signersBitmap: validatedBitmap,
					},
				}),
			);
		}
	};
}

// ---- commitWithdrawalTx ----

/** A UTXO input for commitWithdrawalTx. */
export interface UtxoInput {
	/** Bitcoin transaction ID (64-char hex string). */
	txid: string;
	/** Output index. */
	vout: number;
}

/** An output for commitWithdrawalTx. */
export interface OutputUtxoInput {
	/** Amount in satoshis. */
	amount: bigint | number;
	/** Bitcoin destination address as bytes. */
	bitcoinAddress: Uint8Array;
}

/** Parameters for commitWithdrawalTx. */
export interface CommitWithdrawalTxParams {
	/** Array of withdrawal request IDs being committed. */
	requestIds: string[];
	/** Array of selected UTXOs to spend. */
	selectedUtxos: UtxoInput[];
	/** Array of outputs (one per request, optionally +1 for change). */
	outputs: OutputUtxoInput[];
	/** Bitcoin transaction ID for the withdrawal transaction. */
	txid: string;
	/** The committee epoch for signature verification. */
	epoch: bigint | number;
	/** Committee BLS signature (48 bytes). */
	signature: Uint8Array;
	/** Signers bitmap indicating which validators signed. */
	signersBitmap: Uint8Array;
}

/**
 * BCS-encode a UtxoId into bytes for double-encoding.
 *
 * The Move function expects `vector<vector<u8>>` where each inner vector
 * is a BCS-encoded UtxoId struct.
 */
export function encodeUtxoId(txid: string, vout: number): number[] {
	const encoded = UtxoIdBcsSchema.serialize({
		txid,
		vout,
	}).toBytes();
	return Array.from(encoded);
}

/**
 * BCS-encode an OutputUtxo into bytes for double-encoding.
 *
 * The Move function expects `vector<vector<u8>>` where each inner vector
 * is a BCS-encoded OutputUtxo struct.
 */
export function encodeOutputUtxo(amount: bigint, bitcoinAddress: Uint8Array): number[] {
	const encoded = OutputUtxoBcsSchema.serialize({
		amount,
		bitcoin_address: Array.from(bitcoinAddress),
	}).toBytes();
	return Array.from(encoded);
}

/**
 * Build a commit withdrawal transaction.
 *
 * This is the most complex transaction builder. It involves:
 *   - BCS double-encoding of UtxoId and OutputUtxo structs
 *   - Clock and Random shared objects (auto-injected by codegen)
 *   - Preflight validation (no duplicate UTXOs/requestIds, output count checks)
 *
 * @param config - The HashiConfig providing package and object IDs.
 * @param params - The commit withdrawal parameters.
 * @returns A function `(tx: Transaction) => void` that adds the PTB steps.
 * @throws HashiTransactionError if any input is invalid.
 */
export function commitWithdrawalTx(
	config: HashiConfig,
	params: CommitWithdrawalTxParams,
): (tx: Transaction) => void {
	// -- Preflight validation --
	validateNonEmpty(params.requestIds, 'requestIds');
	validateNonEmpty(params.selectedUtxos, 'selectedUtxos');

	const normalizedRequestIds = params.requestIds.map((id, i) =>
		validateAddress(id, `requestIds[${i}]`),
	);
	validateNoDuplicates(normalizedRequestIds, 'requestIds');

	// Validate and normalize UTXOs, check for duplicates
	const normalizedUtxos = params.selectedUtxos.map((u) => ({
		txid: validateTxid(u.txid),
		vout: validateVout(u.vout),
	}));
	const utxoKeys = normalizedUtxos.map(u => `${u.txid}:${u.vout}`);
	validateNoDuplicates(utxoKeys, 'selectedUtxos');

	// Validate outputs count: must be requestIds.length or requestIds.length + 1
	if (
		params.outputs.length !== params.requestIds.length &&
		params.outputs.length !== params.requestIds.length + 1
	) {
		throw new HashiTransactionError(
			`outputs.length must equal requestIds.length (${params.requestIds.length}) or requestIds.length + 1 (${params.requestIds.length + 1}), got ${params.outputs.length}`,
		);
	}

	// Validate and encode outputs
	const validatedOutputs = params.outputs.map((o, i) => ({
		amount: validateU64(o.amount, `outputs[${i}].amount`),
		bitcoinAddress: o.bitcoinAddress,
	}));

	const normalizedTxid = validateTxid(params.txid);
	const validatedEpoch = validateU64(params.epoch, 'epoch');
	const validatedSignature = validateSignature(params.signature);
	const validatedBitmap = validateSignersBitmap(params.signersBitmap);

	// BCS double-encode UTXOs and outputs
	const encodedUtxos = normalizedUtxos.map(u => encodeUtxoId(u.txid, u.vout));
	const encodedOutputs = validatedOutputs.map(o => encodeOutputUtxo(o.amount, o.bitcoinAddress));

	const packageId = config.packageId;
	const hashiObjectId = config.hashiObjectId;

	return (tx: Transaction): void => {
		tx.add(
			commitWithdrawalTxCall({
				package: packageId,
				arguments: {
					hashi: hashiObjectId,
					requestIds: normalizedRequestIds,
					selectedUtxos: encodedUtxos,
					outputs: encodedOutputs,
					txid: normalizedTxid,
					epoch: validatedEpoch,
					signature: validatedSignature,
					signersBitmap: validatedBitmap,
				},
			}),
		);
	};
}

// ---- signWithdrawal ----

/** Parameters for signWithdrawal. */
export interface SignWithdrawalParams {
	/** The pending withdrawal ID. */
	withdrawalId: string;
	/** The request IDs included in this withdrawal. */
	requestIds: string[];
	/** Array of ECDSA signatures (one per input UTXO). */
	signatures: Uint8Array[];
	/** The committee epoch for signature verification. */
	epoch: bigint | number;
	/** Committee BLS signature (48 bytes). */
	signature: Uint8Array;
	/** Signers bitmap indicating which validators signed. */
	signersBitmap: Uint8Array;
}

/**
 * Build a sign withdrawal transaction.
 *
 * @param config - The HashiConfig providing package and object IDs.
 * @param params - The sign withdrawal parameters.
 * @returns A function `(tx: Transaction) => void` that adds the PTB steps.
 * @throws HashiTransactionError if any input is invalid.
 */
export function signWithdrawal(
	config: HashiConfig,
	params: SignWithdrawalParams,
): (tx: Transaction) => void {
	const normalizedWithdrawalId = validateAddress(params.withdrawalId, 'withdrawalId');
	const normalizedRequestIds = params.requestIds.map((id, i) =>
		validateAddress(id, `requestIds[${i}]`),
	);
	validateNonEmpty(params.signatures, 'signatures');
	const encodedSignatures = params.signatures.map(s => Array.from(s));
	const validatedEpoch = validateU64(params.epoch, 'epoch');
	const validatedSignature = validateSignature(params.signature);
	const validatedBitmap = validateSignersBitmap(params.signersBitmap);

	const packageId = config.packageId;
	const hashiObjectId = config.hashiObjectId;

	return (tx: Transaction): void => {
		tx.add(
			signWithdrawalCall({
				package: packageId,
				arguments: {
					hashi: hashiObjectId,
					withdrawalId: normalizedWithdrawalId,
					requestIds: normalizedRequestIds,
					signatures: encodedSignatures,
					epoch: validatedEpoch,
					signature: validatedSignature,
					signersBitmap: validatedBitmap,
				},
			}),
		);
	};
}

// ---- confirmWithdrawal ----

/** Parameters for confirmWithdrawal. */
export interface ConfirmWithdrawalParams {
	/** The pending withdrawal ID to confirm. */
	withdrawalId: string;
	/** The committee epoch for signature verification. */
	epoch: bigint | number;
	/** Committee BLS signature (48 bytes). */
	signature: Uint8Array;
	/** Signers bitmap indicating which validators signed. */
	signersBitmap: Uint8Array;
}

/**
 * Build a confirm withdrawal transaction.
 *
 * Constructs a two-call PTB:
 *   1. committee::new_committee_signature(epoch, signature, signers_bitmap)
 *   2. withdraw::confirm_withdrawal(hashi, withdrawal_id, epoch, signature, signers_bitmap)
 *
 * Note: The codegen wrapper for confirm_withdrawal takes the signature parameters
 * directly (not a CommitteeSignature object), so we pass them inline.
 *
 * @param config - The HashiConfig providing package and object IDs.
 * @param params - The confirm withdrawal parameters.
 * @returns A function `(tx: Transaction) => void` that adds the PTB steps.
 * @throws HashiTransactionError if any input is invalid.
 */
export function confirmWithdrawal(
	config: HashiConfig,
	params: ConfirmWithdrawalParams,
): (tx: Transaction) => void {
	const normalizedWithdrawalId = validateAddress(params.withdrawalId, 'withdrawalId');
	const validatedEpoch = validateU64(params.epoch, 'epoch');
	const validatedSignature = validateSignature(params.signature);
	const validatedBitmap = validateSignersBitmap(params.signersBitmap);

	const packageId = config.packageId;
	const hashiObjectId = config.hashiObjectId;

	return (tx: Transaction): void => {
		tx.add(
			confirmWithdrawalCall({
				package: packageId,
				arguments: {
					hashi: hashiObjectId,
					withdrawalId: normalizedWithdrawalId,
					epoch: validatedEpoch,
					signature: validatedSignature,
					signersBitmap: validatedBitmap,
				},
			}),
		);
	};
}

// ---- deleteExpiredSpentUtxo ----

/** Parameters for deleteExpiredSpentUtxo. */
export interface DeleteExpiredSpentUtxoParams {
	/** Bitcoin transaction ID (64-char hex string). */
	txid: string;
	/** Output index. */
	vout: number;
}

/**
 * Build a delete expired spent UTXO transaction.
 *
 * @param config - The HashiConfig providing package and object IDs.
 * @param params - The UTXO identification parameters.
 * @returns A function `(tx: Transaction) => void` that adds the PTB steps.
 * @throws HashiTransactionError if any input is invalid.
 */
export function deleteExpiredSpentUtxo(
	config: HashiConfig,
	params: DeleteExpiredSpentUtxoParams,
): (tx: Transaction) => void {
	const normalizedTxid = validateTxid(params.txid);
	const validatedVout = validateVout(params.vout);

	const packageId = config.packageId;
	const hashiObjectId = config.hashiObjectId;

	return (tx: Transaction): void => {
		tx.add(
			deleteExpiredSpentUtxoCall({
				package: packageId,
				arguments: {
					hashi: hashiObjectId,
					txid: normalizedTxid,
					vout: validatedVout,
				},
			}),
		);
	};
}
