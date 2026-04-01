/**
 * Validator management transaction builders.
 *
 * - register: Register as a Hashi validator (requires SuiSystem, auto-injected)
 * - updatePublicKey: Update next epoch's BLS public key
 * - updateOperatorAddress: Update the operator address
 * - updateEndpointUrl: Update the endpoint URL
 * - updateTlsPublicKey: Update the TLS public key
 * - updateEncryptionPublicKey: Update next epoch's encryption public key
 */

import type { Transaction } from '@mysten/sui/transactions';
import type { HashiConfig } from '../utils/config.js';
import {
	register as registerCall,
	updateNextEpochPublicKey as updatePublicKeyCall,
	updateOperatorAddress as updateOperatorCall,
	updateEndpointUrl as updateEndpointCall,
	updateTlsPublicKey as updateTlsCall,
	updateNextEpochEncryptionPublicKey as updateEncryptionCall,
} from '../contracts/hashi/validator.js';
import { validateAddress } from './validation.js';
import { HashiTransactionError } from '../errors.js';

// ---- register ----

/**
 * Build a validator registration transaction.
 *
 * The SuiSystem shared object is auto-injected by the codegen wrapper.
 *
 * @param config - The HashiConfig providing package and object IDs.
 * @returns A function `(tx: Transaction) => void` that adds the PTB steps.
 */
export function register(
	config: HashiConfig,
): (tx: Transaction) => void {
	const packageId = config.packageId;
	const hashiObjectId = config.hashiObjectId;

	return (tx: Transaction): void => {
		tx.add(
			registerCall({
				package: packageId,
				arguments: {
					self: hashiObjectId,
				},
			}),
		);
	};
}

// ---- updatePublicKey ----

/** Parameters for updatePublicKey. */
export interface UpdatePublicKeyParams {
	/** The validator object ID (address of the validator on Sui). */
	validator: string;
	/** The new public key for the next epoch (BLS12-381 G1 point, 48 bytes). */
	nextEpochPublicKey: Uint8Array;
	/** Proof of possession signature (BLS signature over the public key). */
	proofOfPossessionSignature: Uint8Array;
}

/**
 * Build an update public key transaction.
 *
 * @param config - The HashiConfig providing package and object IDs.
 * @param params - The update parameters.
 * @returns A function `(tx: Transaction) => void` that adds the PTB steps.
 * @throws HashiTransactionError if any input is invalid.
 */
export function updatePublicKey(
	config: HashiConfig,
	params: UpdatePublicKeyParams,
): (tx: Transaction) => void {
	const normalizedValidator = validateAddress(params.validator, 'validator');
	if (!(params.nextEpochPublicKey instanceof Uint8Array) || params.nextEpochPublicKey.length === 0) {
		throw new HashiTransactionError('nextEpochPublicKey must be a non-empty Uint8Array');
	}
	if (!(params.proofOfPossessionSignature instanceof Uint8Array) || params.proofOfPossessionSignature.length === 0) {
		throw new HashiTransactionError('proofOfPossessionSignature must be a non-empty Uint8Array');
	}

	const publicKeyArr = Array.from(params.nextEpochPublicKey);
	const popArr = Array.from(params.proofOfPossessionSignature);

	const packageId = config.packageId;
	const hashiObjectId = config.hashiObjectId;

	return (tx: Transaction): void => {
		tx.add(
			updatePublicKeyCall({
				package: packageId,
				arguments: {
					self: hashiObjectId,
					validator: normalizedValidator,
					nextEpochPublicKey: publicKeyArr,
					proofOfPossessionSignature: popArr,
				},
			}),
		);
	};
}

// ---- updateOperatorAddress ----

/** Parameters for updateOperatorAddress. */
export interface UpdateOperatorAddressParams {
	/** The validator object ID. */
	validator: string;
	/** The new operator address. */
	operator: string;
}

/**
 * Build an update operator address transaction.
 *
 * @param config - The HashiConfig providing package and object IDs.
 * @param params - The update parameters.
 * @returns A function `(tx: Transaction) => void` that adds the PTB steps.
 * @throws HashiTransactionError if any input is invalid.
 */
export function updateOperatorAddress(
	config: HashiConfig,
	params: UpdateOperatorAddressParams,
): (tx: Transaction) => void {
	const normalizedValidator = validateAddress(params.validator, 'validator');
	const normalizedOperator = validateAddress(params.operator, 'operator');

	const packageId = config.packageId;
	const hashiObjectId = config.hashiObjectId;

	return (tx: Transaction): void => {
		tx.add(
			updateOperatorCall({
				package: packageId,
				arguments: {
					self: hashiObjectId,
					validator: normalizedValidator,
					operator: normalizedOperator,
				},
			}),
		);
	};
}

// ---- updateEndpointUrl ----

/** Parameters for updateEndpointUrl. */
export interface UpdateEndpointUrlParams {
	/** The validator object ID. */
	validator: string;
	/** The new endpoint URL string. */
	endpointUrl: string;
}

/**
 * Build an update endpoint URL transaction.
 *
 * @param config - The HashiConfig providing package and object IDs.
 * @param params - The update parameters.
 * @returns A function `(tx: Transaction) => void` that adds the PTB steps.
 * @throws HashiTransactionError if any input is invalid.
 */
export function updateEndpointUrl(
	config: HashiConfig,
	params: UpdateEndpointUrlParams,
): (tx: Transaction) => void {
	const normalizedValidator = validateAddress(params.validator, 'validator');
	if (typeof params.endpointUrl !== 'string' || params.endpointUrl.length === 0) {
		throw new HashiTransactionError('endpointUrl must be a non-empty string');
	}

	const packageId = config.packageId;
	const hashiObjectId = config.hashiObjectId;

	return (tx: Transaction): void => {
		tx.add(
			updateEndpointCall({
				package: packageId,
				arguments: {
					self: hashiObjectId,
					validator: normalizedValidator,
					endpointUrl: params.endpointUrl,
				},
			}),
		);
	};
}

// ---- updateTlsPublicKey ----

/** Parameters for updateTlsPublicKey. */
export interface UpdateTlsPublicKeyParams {
	/** The validator object ID. */
	validator: string;
	/** The new TLS public key bytes. */
	tlsPublicKey: Uint8Array;
}

/**
 * Build an update TLS public key transaction.
 *
 * @param config - The HashiConfig providing package and object IDs.
 * @param params - The update parameters.
 * @returns A function `(tx: Transaction) => void` that adds the PTB steps.
 * @throws HashiTransactionError if any input is invalid.
 */
export function updateTlsPublicKey(
	config: HashiConfig,
	params: UpdateTlsPublicKeyParams,
): (tx: Transaction) => void {
	const normalizedValidator = validateAddress(params.validator, 'validator');
	if (!(params.tlsPublicKey instanceof Uint8Array) || params.tlsPublicKey.length === 0) {
		throw new HashiTransactionError('tlsPublicKey must be a non-empty Uint8Array');
	}

	const tlsArr = Array.from(params.tlsPublicKey);

	const packageId = config.packageId;
	const hashiObjectId = config.hashiObjectId;

	return (tx: Transaction): void => {
		tx.add(
			updateTlsCall({
				package: packageId,
				arguments: {
					self: hashiObjectId,
					validator: normalizedValidator,
					tlsPublicKey: tlsArr,
				},
			}),
		);
	};
}

// ---- updateEncryptionPublicKey ----

/** Parameters for updateEncryptionPublicKey. */
export interface UpdateEncryptionPublicKeyParams {
	/** The validator object ID. */
	validator: string;
	/** The new encryption public key bytes for the next epoch. */
	nextEpochEncryptionPublicKey: Uint8Array;
}

/**
 * Build an update encryption public key transaction.
 *
 * @param config - The HashiConfig providing package and object IDs.
 * @param params - The update parameters.
 * @returns A function `(tx: Transaction) => void` that adds the PTB steps.
 * @throws HashiTransactionError if any input is invalid.
 */
export function updateEncryptionPublicKey(
	config: HashiConfig,
	params: UpdateEncryptionPublicKeyParams,
): (tx: Transaction) => void {
	const normalizedValidator = validateAddress(params.validator, 'validator');
	if (!(params.nextEpochEncryptionPublicKey instanceof Uint8Array) || params.nextEpochEncryptionPublicKey.length === 0) {
		throw new HashiTransactionError('nextEpochEncryptionPublicKey must be a non-empty Uint8Array');
	}

	const encArr = Array.from(params.nextEpochEncryptionPublicKey);

	const packageId = config.packageId;
	const hashiObjectId = config.hashiObjectId;

	return (tx: Transaction): void => {
		tx.add(
			updateEncryptionCall({
				package: packageId,
				arguments: {
					self: hashiObjectId,
					validator: normalizedValidator,
					nextEpochEncryptionPublicKey: encArr,
				},
			}),
		);
	};
}
