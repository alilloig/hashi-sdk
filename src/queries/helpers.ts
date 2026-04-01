/**
 * Shared query utilities for the Hashi SDK query layer.
 *
 * Provides BCS deserialization helpers, dynamic field access utilities,
 * and type conversion functions from BCS-deserialized values to domain types.
 */

import type { CoreClient, SuiClientTypes } from '@mysten/sui/client';
import { bcs } from '@mysten/sui/bcs';
import type { HashiConfig } from '../utils/config.js';
import { HashiQueryError, HashiParseError } from '../errors.js';
import type { Bag } from '../types/common.js';

/** The common first parameter shape for all query functions. */
export interface QueryContext {
	client: CoreClient;
	config: HashiConfig;
}

/**
 * Fetch a Sui object by ID and return its raw BCS content bytes.
 * Returns null if the object is not found.
 * Throws HashiQueryError on RPC errors.
 */
export async function fetchObjectBcs(
	client: CoreClient,
	objectId: string,
): Promise<Uint8Array | null> {
	try {
		const { object } = await client.getObject({
			objectId,
			include: { content: true },
		});
		return object.content;
	} catch (error: unknown) {
		if (isNotFoundError(error)) {
			return null;
		}
		throw new HashiQueryError(
			`Failed to fetch object ${objectId}: ${errorMessage(error)}`,
		);
	}
}

/**
 * Fetch a dynamic field value from a parent Bag/UID.
 * The name type and BCS-encoded key are provided as parameters.
 *
 * Returns the raw BCS bytes of the field value, or null if not found.
 */
export async function fetchDynamicFieldBcs(
	client: CoreClient,
	parentId: string,
	nameType: string,
	nameBcs: Uint8Array,
): Promise<Uint8Array | null> {
	try {
		const { dynamicField } = await client.getDynamicField({
			parentId,
			name: { type: nameType, bcs: nameBcs },
		});
		return dynamicField.value.bcs;
	} catch (error: unknown) {
		if (isNotFoundError(error)) {
			return null;
		}
		throw new HashiQueryError(
			`Failed to fetch dynamic field from ${parentId}: ${errorMessage(error)}`,
		);
	}
}

/**
 * List dynamic fields from a parent Bag/UID with optional pagination.
 * Returns the raw ListDynamicFieldsResponse.
 */
export async function listDynamicFieldEntries(
	client: CoreClient,
	parentId: string,
	options?: { cursor?: string | null; limit?: number },
): Promise<SuiClientTypes.ListDynamicFieldsResponse> {
	try {
		return await client.listDynamicFields({
			parentId,
			cursor: options?.cursor ?? null,
			limit: options?.limit,
		});
	} catch (error: unknown) {
		throw new HashiQueryError(
			`Failed to list dynamic fields on ${parentId}: ${errorMessage(error)}`,
		);
	}
}

/**
 * Parse BCS bytes using a BCS type, wrapping any deserialization errors
 * in HashiParseError.
 */
export function parseBcs<T>(
	bcsType: { parse(bytes: Uint8Array): T },
	bytes: Uint8Array,
	label: string,
): T {
	try {
		return bcsType.parse(bytes);
	} catch (error: unknown) {
		throw new HashiParseError(
			`Failed to decode BCS for ${label}: ${errorMessage(error)}`,
		);
	}
}

// ---- Type conversion utilities ----

/**
 * Convert a BCS u64 string to bigint.
 * BCS v2 deserializes u64 as string.
 */
export function toBigInt(value: string | number | bigint): bigint {
	return BigInt(value);
}

/**
 * Convert a BCS vector<u8> (number[]) to Uint8Array.
 */
export function toUint8Array(value: number[] | Uint8Array): Uint8Array {
	if (value instanceof Uint8Array) {
		return value;
	}
	return new Uint8Array(value);
}

/**
 * Convert a BCS Bag (with u64 size as string) to the domain Bag type.
 */
export function toBag(raw: { id: string; size: string | number | bigint }): Bag {
	return {
		id: raw.id,
		size: Number(raw.size),
	};
}

/**
 * Serialize an address (string) to BCS bytes for use as a dynamic field key.
 */
export function serializeAddressKey(address: string): Uint8Array {
	return bcs.Address.serialize(address).toBytes();
}

/**
 * Serialize a u64 value to BCS bytes for use as a dynamic field key.
 */
export function serializeU64Key(value: bigint | number): Uint8Array {
	return bcs.u64().serialize(value).toBytes();
}

// ---- Error detection helpers ----

/**
 * Check if an error represents a "not found" condition.
 * Different Sui clients may throw different error types for missing objects.
 */
function isNotFoundError(error: unknown): boolean {
	if (error instanceof Error) {
		const msg = error.message.toLowerCase();
		return (
			msg.includes('not found') ||
			msg.includes('could not find') ||
			msg.includes('does not exist') ||
			msg.includes('no data') ||
			msg.includes('deleted') ||
			msg.includes('notexists')
		);
	}
	return false;
}

/** Extract a message string from an unknown error value. */
function errorMessage(error: unknown): string {
	if (error instanceof Error) {
		return error.message;
	}
	return String(error);
}
