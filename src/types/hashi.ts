/**
 * Root Hashi state domain type.
 */

import type { Bag } from './common.js';

/**
 * The root Hashi shared object that holds all bridge state.
 * Dynamic-field Bags are represented by their ID and size,
 * while nested structs are typed directly.
 */
export interface HashiState {
	id: string;
	/** Committee set managing epoch transitions. */
	committeeSet: {
		epoch: bigint;
		pendingEpochChange: bigint | null;
	};
	/** Bridge configuration parameters. */
	config: Bag;
	/** Treasury managing BTC minting/burning. */
	treasury: Bag;
	/** Queue of pending deposit requests. */
	depositQueue: Bag;
	/** Queue of pending withdrawal requests. */
	withdrawalQueue: Bag;
	/** Pool of active and spent UTXOs. */
	utxoPool: Bag;
	/** Governance proposals bag. */
	proposals: Bag;
	/** TOB certificates bag. */
	tob: Bag;
}
