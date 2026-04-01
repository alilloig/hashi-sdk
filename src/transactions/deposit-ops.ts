/**
 * Deposit operation transaction builders for committee/validator use.
 *
 * - confirmDeposit: Two-call PTB (newCommitteeSignature -> confirmDeposit)
 * - deleteExpiredDeposits: Batched deletion of multiple expired deposits
 */

import type { Transaction } from '@mysten/sui/transactions';
import type { HashiConfig } from '../utils/config.js';
import { newCommitteeSignature } from '../contracts/hashi/committee.js';
import { confirmDeposit as confirmDepositCall, deleteExpiredDeposit as deleteExpiredDepositCall } from '../contracts/hashi/deposit.js';
import {
	validateAddress,
	validateU64,
	validateSignature,
	validateSignersBitmap,
	validateNonEmpty,
} from './validation.js';

// ---- confirmDeposit ----

/** Parameters for confirmDeposit. */
export interface ConfirmDepositParams {
	/** The deposit request object ID to confirm. */
	requestId: string;
	/** The committee epoch for signature verification. */
	epoch: bigint | number;
	/** Committee BLS signature (48 bytes). */
	signature: Uint8Array;
	/** Signers bitmap indicating which validators signed. */
	signersBitmap: Uint8Array;
}

/**
 * Build a confirm deposit transaction.
 *
 * This is a two-call PTB:
 *   1. committee::new_committee_signature(epoch, signature, signers_bitmap) -> CommitteeSignature
 *   2. deposit::confirm_deposit(hashi, request_id, committee_signature)
 *
 * @param config - The HashiConfig providing package and object IDs.
 * @param params - The confirm deposit parameters.
 * @returns A function `(tx: Transaction) => void` that adds the PTB steps.
 * @throws HashiTransactionError if any input is invalid.
 */
export function confirmDeposit(
	config: HashiConfig,
	params: ConfirmDepositParams,
): (tx: Transaction) => void {
	const normalizedRequestId = validateAddress(params.requestId, 'requestId');
	const validatedEpoch = validateU64(params.epoch, 'epoch');
	const validatedSignature = validateSignature(params.signature);
	const validatedBitmap = validateSignersBitmap(params.signersBitmap);

	const packageId = config.packageId;
	const hashiObjectId = config.hashiObjectId;

	return (tx: Transaction): void => {
		// Step 1: Create CommitteeSignature on-chain
		const committeeSig = tx.add(
			newCommitteeSignature({
				package: packageId,
				arguments: {
					epoch: validatedEpoch,
					signature: validatedSignature,
					signersBitmap: validatedBitmap,
				},
			}),
		);

		// Step 2: Confirm deposit using the on-chain CommitteeSignature
		tx.add(
			confirmDepositCall({
				package: packageId,
				arguments: {
					hashi: hashiObjectId,
					requestId: normalizedRequestId,
					signature: committeeSig,
				},
			}),
		);
	};
}

// ---- deleteExpiredDeposits ----

/** Parameters for deleteExpiredDeposits. */
export interface DeleteExpiredDepositsParams {
	/** Array of deposit request IDs to delete. */
	requestIds: string[];
}

/**
 * Build a batched delete expired deposits transaction.
 *
 * Adds one delete_expired_deposit call per request ID to the same PTB.
 * Clock is auto-injected by the codegen wrapper.
 *
 * @param config - The HashiConfig providing package and object IDs.
 * @param params - The batch deletion parameters.
 * @returns A function `(tx: Transaction) => void` that adds the PTB steps.
 * @throws HashiTransactionError if any input is invalid.
 */
export function deleteExpiredDeposits(
	config: HashiConfig,
	params: DeleteExpiredDepositsParams,
): (tx: Transaction) => void {
	validateNonEmpty(params.requestIds, 'requestIds');
	const normalizedIds = params.requestIds.map((id, i) =>
		validateAddress(id, `requestIds[${i}]`),
	);

	const packageId = config.packageId;
	const hashiObjectId = config.hashiObjectId;

	return (tx: Transaction): void => {
		for (const requestId of normalizedIds) {
			tx.add(
				deleteExpiredDepositCall({
					package: packageId,
					arguments: {
						hashi: hashiObjectId,
						requestId,
					},
				}),
			);
		}
	};
}
