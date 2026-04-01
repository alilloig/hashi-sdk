/**
 * cancelWithdrawal transaction builder.
 *
 * Constructs a PTB for cancelling a pending withdrawal request:
 *   1. withdraw::cancel_withdrawal(hashi, request_id, clock) -- returns Coin<BTC>
 *   2. tx.transferObjects([returned_coin], sender) -- refund BTC to sender
 */

import type { Transaction, TransactionResult } from '@mysten/sui/transactions';
import type { HashiConfig } from '../utils/config.js';
import { cancelWithdrawal as cancelWithdrawalCall } from '../contracts/hashi/withdraw.js';
import { validateAddress } from './validation.js';

/** Parameters for cancelWithdrawal. */
export interface CancelWithdrawalParams {
	/** The withdrawal request object ID to cancel. */
	requestId: string;
	/** The address to receive the refunded BTC coin. Typically the sender's address. */
	recipient: string;
}

/**
 * Build a cancel withdrawal transaction.
 *
 * Validates inputs synchronously, then returns a closure that populates a
 * Transaction with the PTB steps. The closure returns a TransactionResult
 * capturing the returned BTC coin.
 *
 * @param config - The HashiConfig providing package and object IDs.
 * @param params - The cancel withdrawal parameters.
 * @returns A function `(tx: Transaction) => TransactionResult` that adds the PTB steps.
 * @throws HashiTransactionError if any input is invalid.
 */
export function cancelWithdrawal(
	config: HashiConfig,
	params: CancelWithdrawalParams,
): (tx: Transaction) => TransactionResult {
	// -- Validate all inputs synchronously --
	const normalizedRequestId = validateAddress(params.requestId, 'requestId');
	const normalizedRecipient = validateAddress(params.recipient, 'recipient');

	const packageId = config.packageId;
	const hashiObjectId = config.hashiObjectId;

	return (tx: Transaction): TransactionResult => {
		// Step 1: Cancel withdrawal and get returned Coin<BTC>
		const returnedCoin = tx.add(
			cancelWithdrawalCall({
				package: packageId,
				arguments: {
					hashi: hashiObjectId,
					requestId: normalizedRequestId,
				},
			}),
		);

		// Step 2: Transfer the returned BTC coin to the recipient.
		return tx.transferObjects([returnedCoin], tx.pure.address(normalizedRecipient));
	};
}
