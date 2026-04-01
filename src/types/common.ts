/**
 * Common domain types and type mappings for the Hashi SDK.
 *
 * Type mapping conventions from Move to TypeScript:
 *   address  -> string (0x-prefixed, lowercase, 66 chars)
 *   u64      -> bigint
 *   vector<u8> -> Uint8Array
 *   Option<T> -> T | null
 *   Bag      -> { id: string; size: number }
 *   VecMap<K,V> -> Array<{ key: K; value: V }>
 *   VecSet<T> -> T[]
 *   Balance<T> -> bigint
 */

/** A Sui dynamic-field Bag, represented by its object ID and current size. */
export interface Bag {
	id: string;
	size: number;
}

/** A key-value entry in a VecMap. */
export interface VecMapEntry<K, V> {
	key: K;
	value: V;
}

/** A paginated result for query responses. */
export interface PaginatedResult<T> {
	data: T[];
	hasNextPage: boolean;
	nextCursor: string | null;
}
