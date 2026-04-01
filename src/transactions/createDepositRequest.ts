/**
 * createDepositRequest transaction builder.
 *
 * Constructs a 5-step PTB for submitting a Bitcoin deposit request:
 *   1. utxo::utxo_id(txid, vout) -- creates UtxoId (pure return)
 *   2. utxo::utxo(utxo_id, amount, derivation_path) -- creates Utxo (pure return)
 *   3. deposit_queue::deposit_request(utxo, clock) -- creates DepositRequest (Clock auto-injected)
 *   4. tx.splitCoins(tx.gas, [0n]) -- split zero SUI for fee coin
 *   5. deposit::deposit(hashi, deposit_request, fee_coin) -- Hashi mutable shared
 */

import type { Transaction } from '@mysten/sui/transactions';
import type { HashiConfig } from '../utils/config.js';
import { utxoId as utxoIdCall, utxo as utxoCall } from '../contracts/hashi/utxo.js';
import { depositRequest as depositRequestCall } from '../contracts/hashi/deposit_queue.js';
import { deposit as depositCall } from '../contracts/hashi/deposit.js';
import {
	validateTxid,
	validateVout,
	validateU64,
	validateAddress,
} from './validation.js';

/** Parameters for createDepositRequest. */
export interface CreateDepositRequestParams {
	/** Bitcoin transaction ID, 64-character hex string (display byte order). */
	txid: string;
	/** Output index within the Bitcoin transaction. */
	vout: number;
	/** Amount in satoshis. */
	amount: bigint | number;
	/** Optional derivation path, as a Sui address. */
	derivationPath?: string;
}

/**
 * Build a deposit request transaction.
 *
 * Validates inputs synchronously, then returns a closure that populates a
 * Transaction with the 5-step PTB.
 *
 * @param config - The HashiConfig providing package and object IDs.
 * @param params - The deposit request parameters.
 * @returns A function `(tx: Transaction) => void` that adds the PTB steps.
 * @throws HashiTransactionError if any input is invalid.
 */
export function createDepositRequest(
	config: HashiConfig,
	params: CreateDepositRequestParams,
): (tx: Transaction) => void {
	// -- Validate all inputs synchronously --
	const normalizedTxid = validateTxid(params.txid);
	const validatedVout = validateVout(params.vout);
	const validatedAmount = validateU64(params.amount, 'amount');
	const normalizedDerivationPath = params.derivationPath !== undefined
		? validateAddress(params.derivationPath, 'derivationPath')
		: null;

	const packageId = config.packageId;
	const hashiObjectId = config.hashiObjectId;

	return (tx: Transaction): void => {
		// Step 1: Create UtxoId from txid + vout
		const utxoIdResult = tx.add(
			utxoIdCall({
				package: packageId,
				arguments: {
					txid: normalizedTxid,
					vout: validatedVout,
				},
			}),
		);

		// Step 2: Create Utxo from UtxoId + amount + derivation_path
		const utxoResult = tx.add(
			utxoCall({
				package: packageId,
				arguments: {
					utxoId: utxoIdResult,
					amount: validatedAmount,
					derivationPath: normalizedDerivationPath,
				},
			}),
		);

		// Step 3: Create DepositRequest from Utxo (Clock is auto-injected by codegen)
		const depositRequestResult = tx.add(
			depositRequestCall({
				package: packageId,
				arguments: {
					utxo: utxoResult,
				},
			}),
		);

		// Step 4: Split zero SUI from gas for the fee coin
		const feeCoin = tx.splitCoins(tx.gas, [0n]);

		// Step 5: Submit the deposit (Hashi shared object passed as object reference)
		tx.add(
			depositCall({
				package: packageId,
				arguments: {
					hashi: hashiObjectId,
					request: depositRequestResult,
					fee: feeCoin,
				},
			}),
		);
	};
}
