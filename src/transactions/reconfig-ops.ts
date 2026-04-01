/**
 * Reconfiguration transaction builders.
 *
 * - startReconfig: Initiate committee reconfiguration (SuiSystem auto-injected)
 * - endReconfig: Complete reconfiguration with the new MPC public key
 */

import type { Transaction } from '@mysten/sui/transactions';
import type { HashiConfig } from '../utils/config.js';
import {
	startReconfig as startReconfigCall,
	endReconfig as endReconfigCall,
} from '../contracts/hashi/reconfig.js';
import {
	validateSignature,
	validateSignersBitmap,
} from './validation.js';
import { HashiTransactionError } from '../errors.js';

// ---- startReconfig ----

/**
 * Build a start reconfiguration transaction.
 *
 * The SuiSystem shared object is auto-injected by the codegen wrapper.
 *
 * @param config - The HashiConfig providing package and object IDs.
 * @returns A function `(tx: Transaction) => void` that adds the PTB steps.
 */
export function startReconfig(
	config: HashiConfig,
): (tx: Transaction) => void {
	const packageId = config.packageId;
	const hashiObjectId = config.hashiObjectId;

	return (tx: Transaction): void => {
		tx.add(
			startReconfigCall({
				package: packageId,
				arguments: {
					self: hashiObjectId,
				},
			}),
		);
	};
}

// ---- endReconfig ----

/** Parameters for endReconfig. */
export interface EndReconfigParams {
	/** The new MPC committee's threshold public key. */
	mpcPublicKey: Uint8Array;
	/** Committee BLS signature (48 bytes). */
	signature: Uint8Array;
	/** Signers bitmap indicating which validators signed. */
	signersBitmap: Uint8Array;
}

/**
 * Build an end reconfiguration transaction.
 *
 * @param config - The HashiConfig providing package and object IDs.
 * @param params - The end reconfig parameters.
 * @returns A function `(tx: Transaction) => void` that adds the PTB steps.
 * @throws HashiTransactionError if any input is invalid.
 */
export function endReconfig(
	config: HashiConfig,
	params: EndReconfigParams,
): (tx: Transaction) => void {
	if (!(params.mpcPublicKey instanceof Uint8Array) || params.mpcPublicKey.length === 0) {
		throw new HashiTransactionError('mpcPublicKey must be a non-empty Uint8Array');
	}

	const mpcKeyArr = Array.from(params.mpcPublicKey);
	const validatedSignature = validateSignature(params.signature);
	const validatedBitmap = validateSignersBitmap(params.signersBitmap);

	const packageId = config.packageId;
	const hashiObjectId = config.hashiObjectId;

	return (tx: Transaction): void => {
		tx.add(
			endReconfigCall({
				package: packageId,
				arguments: {
					self: hashiObjectId,
					mpcPublicKey: mpcKeyArr,
					signature: validatedSignature,
					signersBitmap: validatedBitmap,
				},
			}),
		);
	};
}
