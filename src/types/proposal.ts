/**
 * Proposal domain types.
 */

import type { VecMapEntry } from './common.js';

/** A governance proposal with typed data payload. */
export interface Proposal<T> {
	id: string;
	creator: string;
	votes: string[];
	quorumThresholdBps: bigint;
	timestampMs: bigint;
	metadata: Array<VecMapEntry<string, string>>;
	data: T;
}

/**
 * Known proposal types.
 * New proposal types can be added as the bridge evolves.
 */
export type ProposalType =
	| { kind: 'UpdateConfig'; key: string; value: unknown }
	| { kind: 'Upgrade'; digest: Uint8Array }
	| { kind: 'EnableVersion'; version: bigint }
	| { kind: 'DisableVersion'; version: bigint }
	| { kind: 'Unknown'; typeName: string };
