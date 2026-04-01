/**
 * Root Hashi state domain type.
 */

import type { Bag } from './common.js';

/**
 * The root Hashi shared object that holds all bridge state.
 * Dynamic-field Bags are represented by their ID and size,
 * while nested structs include their top-level scalar fields.
 */
export interface HashiState {
	id: string;
	committeeSet: {
		members: Bag;
		epoch: bigint;
		committees: Bag;
		pendingEpochChange: bigint | null;
		mpcPublicKey: Uint8Array;
	};
	config: {
		config: Array<{ key: string; value: import('./config.js').ConfigValue }>;
		enabledVersions: bigint[];
		upgradeCap: { id: string; package: string; version: bigint; policy: number } | null;
	};
	treasury: {
		objects: Bag;
	};
	depositQueue: {
		requests: Bag;
	};
	withdrawalQueue: {
		requests: Bag;
		pendingWithdrawals: Bag;
		numConsumedPresigs: bigint;
	};
	utxoPool: {
		activeUtxos: Bag;
		spentUtxos: Bag;
	};
	proposals: Bag;
	tob: Bag;
}
