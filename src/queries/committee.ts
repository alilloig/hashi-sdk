/**
 * Query functions for committee data and member info.
 */

import type { CoreClient } from '@mysten/sui/client';
import type { HashiConfig } from '../utils/config.js';
import type { Committee, MemberInfo } from '../types/committee.js';
import {
	Committee as CommitteeBcs,
} from '../contracts/hashi/committee.js';
import {
	MemberInfo as MemberInfoBcs,
} from '../contracts/hashi/committee_set.js';
import {
	fetchDynamicFieldBcs,
	parseBcs,
	toBigInt,
	toUint8Array,
	serializeAddressKey,
	serializeU64Key,
} from './helpers.js';
import { getHashiState } from './state.js';

/**
 * Fetch a Committee for a given epoch. If epoch is not provided,
 * the current epoch is used (fetched from the Hashi state).
 *
 * @param client - A CoreClient instance
 * @param config - HashiConfig with Hashi deployment addresses
 * @param epoch - Optional epoch number. Defaults to current epoch.
 * @returns The Committee, or null if not found for the given epoch
 * @throws HashiQueryError on RPC errors
 * @throws HashiParseError on BCS decode failure
 */
export async function getCommittee(
	client: CoreClient,
	config: HashiConfig,
	epoch?: bigint | number,
): Promise<Committee | null> {
	const state = await getHashiState(client, config);
	const bagId = state.committeeSet.committees.id;

	const targetEpoch = epoch != null ? BigInt(epoch) : state.committeeSet.epoch;

	const valueBcs = await fetchDynamicFieldBcs(
		client,
		bagId,
		'u64',
		serializeU64Key(targetEpoch),
	);

	if (valueBcs == null) {
		return null;
	}

	const raw = parseBcs(CommitteeBcs, valueBcs, 'Committee');
	return convertCommittee(raw);
}

/**
 * Fetch MemberInfo for a specific validator address from the committee set.
 *
 * @param client - A CoreClient instance
 * @param config - HashiConfig with Hashi deployment addresses
 * @param validatorAddress - The validator's Sui address
 * @returns The MemberInfo, or null if the validator is not a member
 * @throws HashiQueryError on RPC errors
 * @throws HashiParseError on BCS decode failure
 */
export async function getMemberInfo(
	client: CoreClient,
	config: HashiConfig,
	validatorAddress: string,
): Promise<MemberInfo | null> {
	const state = await getHashiState(client, config);
	const bagId = state.committeeSet.members.id;

	const valueBcs = await fetchDynamicFieldBcs(
		client,
		bagId,
		'address',
		serializeAddressKey(validatorAddress),
	);

	if (valueBcs == null) {
		return null;
	}

	const raw = parseBcs(MemberInfoBcs, valueBcs, 'MemberInfo');
	return convertMemberInfo(raw);
}

// ---- Internal conversion ----

/* eslint-disable @typescript-eslint/no-explicit-any */

function convertCommittee(raw: any): Committee {
	return {
		epoch: toBigInt(raw.epoch),
		members: raw.members.map((m: any) => ({
			validatorAddress: m.validator_address,
			publicKey: toUint8Array(m.public_key.bytes),
			encryptionPublicKey: toUint8Array(m.encryption_public_key),
			weight: toBigInt(m.weight),
		})),
		totalWeight: toBigInt(raw.total_weight),
	};
}

function convertMemberInfo(raw: any): MemberInfo {
	return {
		validatorAddress: raw.validator_address,
		operatorAddress: raw.operator_address,
		nextEpochPublicKey: toUint8Array(raw.next_epoch_public_key.bytes),
		endpointUrl: raw.endpoint_url,
		tlsPublicKey: toUint8Array(raw.tls_public_key),
		nextEpochEncryptionPublicKey: toUint8Array(raw.next_epoch_encryption_public_key),
	};
}
