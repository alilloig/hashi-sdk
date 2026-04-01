/**
 * Shared object argument helpers for Hashi transaction builders.
 *
 * Provides convenience constants for the well-known shared objects
 * used throughout the Hashi protocol:
 *   - Clock (immutable shared, address 0x6)
 *   - SuiSystem (immutable shared, address 0x5)
 *   - Random (immutable shared, address 0x8)
 */

/** The canonical Sui Clock object address. */
export const CLOCK_OBJECT_ID =
	'0x0000000000000000000000000000000000000000000000000000000000000006';

/** The canonical SuiSystem object address. */
export const SUI_SYSTEM_OBJECT_ID =
	'0x0000000000000000000000000000000000000000000000000000000000000005';

/** The canonical Random object address. */
export const RANDOM_OBJECT_ID =
	'0x0000000000000000000000000000000000000000000000000000000000000008';
