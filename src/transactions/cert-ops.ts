/**
 * Certificate submission transaction builders.
 *
 * - submitDkgCert: Submit a DKG certificate
 * - submitRotationCert: Submit a rotation certificate
 * - submitNonceCert: Submit a nonce certificate
 * - destroyAllCerts: Destroy all certificates for an epoch
 */

import type { Transaction } from '@mysten/sui/transactions';
import type { HashiConfig } from '../utils/config.js';
import {
	submitDkgCert as submitDkgCertCall,
	submitRotationCert as submitRotationCertCall,
	submitNonceCert as submitNonceCertCall,
	destroyAllCerts as destroyAllCertsCall,
} from '../contracts/hashi/cert_submission.js';
import {
	validateAddress,
	validateU64,
	validateVout,
	validateSignature,
	validateSignersBitmap,
} from './validation.js';
import { HashiTransactionError } from '../errors.js';

// ---- Common cert params ----

/** Common parameters for DKG and rotation cert submissions. */
interface BaseCertParams {
	/** The committee epoch. */
	epoch: bigint | number;
	/** The dealer's address. */
	dealer: string;
	/** Hash of the dealer's messages. */
	messagesHash: Uint8Array;
	/** Committee BLS signature (48 bytes). */
	signature: Uint8Array;
	/** Signers bitmap. */
	signersBitmap: Uint8Array;
}

/** Parameters for submitDkgCert. */
export type SubmitDkgCertParams = BaseCertParams;

/** Parameters for submitRotationCert. */
export type SubmitRotationCertParams = BaseCertParams;

/** Parameters for submitNonceCert. */
export interface SubmitNonceCertParams extends BaseCertParams {
	/** The batch index (u32). */
	batchIndex: number;
}

/** Parameters for destroyAllCerts. */
export interface DestroyAllCertsParams {
	/** The epoch whose certificates should be destroyed. */
	epoch: bigint | number;
	/** Optional batch index. Pass null to destroy all. */
	batchIndex: number | null;
}

/**
 * Validate common cert submission params and return normalized values.
 */
function validateBaseCertParams(params: BaseCertParams) {
	const validatedEpoch = validateU64(params.epoch, 'epoch');
	const normalizedDealer = validateAddress(params.dealer, 'dealer');
	if (!(params.messagesHash instanceof Uint8Array) || params.messagesHash.length === 0) {
		throw new HashiTransactionError('messagesHash must be a non-empty Uint8Array');
	}
	const messagesHashArr = Array.from(params.messagesHash);
	const validatedSignature = validateSignature(params.signature);
	const validatedBitmap = validateSignersBitmap(params.signersBitmap);

	return {
		epoch: validatedEpoch,
		dealer: normalizedDealer,
		messagesHash: messagesHashArr,
		signature: validatedSignature,
		signersBitmap: validatedBitmap,
	};
}

// ---- submitDkgCert ----

/**
 * Build a submit DKG certificate transaction.
 *
 * @param config - The HashiConfig providing package and object IDs.
 * @param params - The DKG cert parameters.
 * @returns A function `(tx: Transaction) => void` that adds the PTB steps.
 * @throws HashiTransactionError if any input is invalid.
 */
export function submitDkgCert(
	config: HashiConfig,
	params: SubmitDkgCertParams,
): (tx: Transaction) => void {
	const validated = validateBaseCertParams(params);
	const packageId = config.packageId;
	const hashiObjectId = config.hashiObjectId;

	return (tx: Transaction): void => {
		tx.add(
			submitDkgCertCall({
				package: packageId,
				arguments: {
					hashi: hashiObjectId,
					epoch: validated.epoch,
					dealer: validated.dealer,
					messagesHash: validated.messagesHash,
					signature: validated.signature,
					signersBitmap: validated.signersBitmap,
				},
			}),
		);
	};
}

// ---- submitRotationCert ----

/**
 * Build a submit rotation certificate transaction.
 *
 * @param config - The HashiConfig providing package and object IDs.
 * @param params - The rotation cert parameters.
 * @returns A function `(tx: Transaction) => void` that adds the PTB steps.
 * @throws HashiTransactionError if any input is invalid.
 */
export function submitRotationCert(
	config: HashiConfig,
	params: SubmitRotationCertParams,
): (tx: Transaction) => void {
	const validated = validateBaseCertParams(params);
	const packageId = config.packageId;
	const hashiObjectId = config.hashiObjectId;

	return (tx: Transaction): void => {
		tx.add(
			submitRotationCertCall({
				package: packageId,
				arguments: {
					hashi: hashiObjectId,
					epoch: validated.epoch,
					dealer: validated.dealer,
					messagesHash: validated.messagesHash,
					signature: validated.signature,
					signersBitmap: validated.signersBitmap,
				},
			}),
		);
	};
}

// ---- submitNonceCert ----

/**
 * Build a submit nonce certificate transaction.
 *
 * @param config - The HashiConfig providing package and object IDs.
 * @param params - The nonce cert parameters.
 * @returns A function `(tx: Transaction) => void` that adds the PTB steps.
 * @throws HashiTransactionError if any input is invalid.
 */
export function submitNonceCert(
	config: HashiConfig,
	params: SubmitNonceCertParams,
): (tx: Transaction) => void {
	const validated = validateBaseCertParams(params);
	const validatedBatchIndex = validateVout(params.batchIndex); // u32 range check

	const packageId = config.packageId;
	const hashiObjectId = config.hashiObjectId;

	return (tx: Transaction): void => {
		tx.add(
			submitNonceCertCall({
				package: packageId,
				arguments: {
					hashi: hashiObjectId,
					epoch: validated.epoch,
					batchIndex: validatedBatchIndex,
					dealer: validated.dealer,
					messagesHash: validated.messagesHash,
					signature: validated.signature,
					signersBitmap: validated.signersBitmap,
				},
			}),
		);
	};
}

// ---- destroyAllCerts ----

/**
 * Build a destroy all certificates transaction.
 *
 * @param config - The HashiConfig providing package and object IDs.
 * @param params - The destroy parameters.
 * @returns A function `(tx: Transaction) => void` that adds the PTB steps.
 * @throws HashiTransactionError if any input is invalid.
 */
export function destroyAllCerts(
	config: HashiConfig,
	params: DestroyAllCertsParams,
): (tx: Transaction) => void {
	const validatedEpoch = validateU64(params.epoch, 'epoch');
	if (params.batchIndex !== null) {
		validateVout(params.batchIndex); // u32 range check
	}

	const packageId = config.packageId;
	const hashiObjectId = config.hashiObjectId;

	return (tx: Transaction): void => {
		tx.add(
			destroyAllCertsCall({
				package: packageId,
				arguments: {
					hashi: hashiObjectId,
					epoch: validatedEpoch,
					batchIndex: params.batchIndex,
				},
			}),
		);
	};
}
