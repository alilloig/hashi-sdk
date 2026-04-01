/**
 * Shared object argument helpers for Hashi transaction builders.
 *
 * Provides convenience functions for constructing the two shared-object
 * arguments used throughout the Hashi protocol:
 *   - Hashi (mutable shared)
 *   - Clock (immutable shared, address 0x6)
 */

/** The canonical Sui Clock object address. */
export const CLOCK_OBJECT_ID =
	'0x0000000000000000000000000000000000000000000000000000000000000006';
