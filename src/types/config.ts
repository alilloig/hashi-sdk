/**
 * On-chain Config domain types.
 */

import type { VecMapEntry } from './common.js';

/**
 * Discriminated union for config values, mirroring the Move enum
 * `config_value::Value`.
 */
export type ConfigValue =
	| { type: 'U64'; value: bigint }
	| { type: 'Address'; value: string }
	| { type: 'String'; value: string }
	| { type: 'Bool'; value: boolean }
	| { type: 'Bytes'; value: Uint8Array };

/**
 * The on-chain Config struct, holding all bridge configuration parameters
 * as a VecMap of string keys to ConfigValue entries.
 */
export interface Config {
	entries: Array<VecMapEntry<string, ConfigValue>>;
	enabledVersions: bigint[];
}
