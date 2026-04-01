/**
 * requestWithdrawal transaction builder.
 *
 * Constructs a PTB for requesting a Bitcoin withdrawal:
 *   1. Create BTC coin via coinWithBalance({ type: btcCoinType, balance: amount })
 *   2. withdraw::request_withdrawal(hashi, clock, btc_coin, bitcoin_address)
 *      - Hashi mutable shared, Clock auto-injected by codegen
 *      - bitcoin_address: passed as pure vector<u8>
 */

import type { Transaction } from '@mysten/sui/transactions';
import { coinWithBalance } from '@mysten/sui/transactions';
import type { HashiConfig } from '../utils/config.js';
import { requestWithdrawal as requestWithdrawalCall } from '../contracts/hashi/withdraw.js';
import { validateU64, validateBitcoinAddress } from './validation.js';

/** Parameters for requestWithdrawal. */
export interface RequestWithdrawalParams {
	/** Amount of BTC to withdraw, in satoshis. */
	amount: bigint | number;
	/**
	 * Bitcoin destination address.
	 *
	 * Accepts Uint8Array (20 or 32 bytes) or hex string.
	 * Bech32 string support is deferred to Cycle 3.
	 */
	bitcoinAddress: string | Uint8Array;
}

/**
 * Build a withdrawal request transaction.
 *
 * Validates inputs synchronously, then returns a closure that populates a
 * Transaction with the PTB steps.
 *
 * @param config - The HashiConfig providing package and object IDs.
 * @param params - The withdrawal request parameters.
 * @returns A function `(tx: Transaction) => void` that adds the PTB steps.
 * @throws HashiTransactionError if any input is invalid.
 */
export function requestWithdrawal(
	config: HashiConfig,
	params: RequestWithdrawalParams,
): (tx: Transaction) => void {
	// -- Validate all inputs synchronously --
	const validatedAmount = validateU64(params.amount, 'amount');
	const validatedBitcoinAddress = validateBitcoinAddress(params.bitcoinAddress);

	const packageId = config.packageId;
	const hashiObjectId = config.hashiObjectId;
	const btcCoinType = config.btcCoinType;

	return (tx: Transaction): void => {
		// Step 1: Create BTC coin with the requested balance
		const btcCoin = tx.add(
			coinWithBalance({
				type: btcCoinType,
				balance: validatedAmount,
			}),
		);

		// Step 2: Request withdrawal (Clock is auto-injected by codegen)
		// bitcoin_address is passed as vector<u8> which the codegen serializes via BCS
		tx.add(
			requestWithdrawalCall({
				package: packageId,
				arguments: {
					hashi: hashiObjectId,
					btc: btcCoin,
					bitcoinAddress: Array.from(validatedBitcoinAddress),
				},
			}),
		);
	};
}
