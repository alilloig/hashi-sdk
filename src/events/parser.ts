/**
 * Event parsers for Hashi bridge events.
 *
 * Provides two parsers:
 * - parseHashiEvent (best-effort): returns HashiEvent | null
 * - parseHashiEventStrict: returns { event } | { error }
 *
 * Events are identified by parsing the Move StructTag from the event's
 * `eventType` field and matching against known (module, eventName) pairs.
 * Multi-version package matching is supported via a Set of known package IDs.
 */

import type { SuiClientTypes } from '@mysten/sui/client';

import { HashiParseError } from '../errors.js';
import type { HashiEvent } from './types.js';

// ---- BCS imports from codegen ----

import {
	DepositRequestedEvent as DepositRequestedEventBcs,
	DepositConfirmedEvent as DepositConfirmedEventBcs,
	ExpiredDepositDeletedEvent as ExpiredDepositDeletedEventBcs,
} from '../contracts/hashi/deposit.js';

import {
	WithdrawalRequestedEvent as WithdrawalRequestedEventBcs,
	WithdrawalApprovedEvent as WithdrawalApprovedEventBcs,
	WithdrawalPickedForProcessingEvent as WithdrawalPickedForProcessingEventBcs,
	WithdrawalSignedEvent as WithdrawalSignedEventBcs,
	WithdrawalConfirmedEvent as WithdrawalConfirmedEventBcs,
	WithdrawalCancelledEvent as WithdrawalCancelledEventBcs,
} from '../contracts/hashi/withdrawal_queue.js';

import {
	ValidatorRegistered as ValidatorRegisteredBcs,
	ValidatorUpdated as ValidatorUpdatedBcs,
} from '../contracts/hashi/validator.js';

import {
	StartReconfigEvent as StartReconfigEventBcs,
	EndReconfigEvent as EndReconfigEventBcs,
	AbortReconfigEvent as AbortReconfigEventBcs,
} from '../contracts/hashi/reconfig.js';

import {
	UtxoSpentEvent as UtxoSpentEventBcs,
	SpentUtxoDeletedEvent as SpentUtxoDeletedEventBcs,
} from '../contracts/hashi/utxo_pool.js';

import {
	MintEvent as MintEventBcs,
	BurnEvent as BurnEventBcs,
} from '../contracts/hashi/treasury.js';

import {
	ProposalCreatedEvent as ProposalCreatedEventBcs,
	VoteCastEvent as VoteCastEventBcs,
	VoteRemovedEvent as VoteRemovedEventBcs,
	ProposalDeletedEvent as ProposalDeletedEventBcs,
	ProposalExecutedEvent as ProposalExecutedEventBcs,
	QuorumReachedEvent as QuorumReachedEventBcs,
	PackageUpgradedEvent as PackageUpgradedEventBcs,
} from '../contracts/hashi/proposal_events.js';

// ---- StructTag Parsing ----

interface ParsedStructTag {
	packageAddress: string;
	module: string;
	name: string;
	typeParam: string | null;
}

/**
 * Parse a Move StructTag string like:
 *   "0xPKG::module::EventName"
 *   "0xPKG::module::EventName<0xPKG::other::Type>"
 */
function parseStructTag(structTag: string): ParsedStructTag | null {
	// Extract type parameter if present
	let typeParam: string | null = null;
	let basePart = structTag;

	const angleBracketIdx = structTag.indexOf('<');
	if (angleBracketIdx !== -1) {
		// Extract content between < and last >
		const lastAngle = structTag.lastIndexOf('>');
		if (lastAngle === -1) return null;
		typeParam = structTag.slice(angleBracketIdx + 1, lastAngle);
		basePart = structTag.slice(0, angleBracketIdx);
	}

	const parts = basePart.split('::');
	if (parts.length !== 3) return null;

	return {
		packageAddress: parts[0],
		module: parts[1],
		name: parts[2],
		typeParam,
	};
}

// ---- Helper: convert BCS-deserialized u8 array to Uint8Array ----

function toUint8Array(arr: number[]): Uint8Array {
	return new Uint8Array(arr);
}

// ---- Helper: convert BCS-deserialized u8 array to hex string ----

function bytesToHexDigest(arr: number[]): string {
	return Array.from(arr)
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

// ---- Core parsing logic ----

/* eslint-disable @typescript-eslint/no-explicit-any */

type EventDeserializer = (bcsBytes: Uint8Array, typeParam: string | null) => HashiEvent;

/**
 * Map from (module, eventName) to a deserializer function.
 */
const EVENT_DESERIALIZERS: Map<string, EventDeserializer> = new Map();

function registerEvent(module: string, name: string, deserializer: EventDeserializer): void {
	EVENT_DESERIALIZERS.set(`${module}::${name}`, deserializer);
}

// ---- Deposit Events ----

registerEvent('deposit', 'DepositRequestedEvent', (bcsBytes) => {
	const raw = DepositRequestedEventBcs.parse(bcsBytes);
	return {
		type: 'DepositRequested',
		requestId: raw.request_id as string,
		utxoId: {
			txid: (raw.utxo_id as any).txid as string,
			vout: (raw.utxo_id as any).vout as number,
		},
		amount: BigInt(raw.amount),
		derivationPath: (raw.derivation_path as string | null),
		timestampMs: BigInt(raw.timestamp_ms),
		requesterAddress: raw.requester_address as string,
		suiTxDigest: bytesToHexDigest(raw.sui_tx_digest as number[]),
	};
});

registerEvent('deposit', 'DepositConfirmedEvent', (bcsBytes) => {
	const raw = DepositConfirmedEventBcs.parse(bcsBytes);
	return {
		type: 'DepositConfirmed',
		requestId: raw.request_id as string,
		utxoId: {
			txid: (raw.utxo_id as any).txid as string,
			vout: (raw.utxo_id as any).vout as number,
		},
		amount: BigInt(raw.amount),
		derivationPath: (raw.derivation_path as string | null),
	};
});

registerEvent('deposit', 'ExpiredDepositDeletedEvent', (bcsBytes) => {
	const raw = ExpiredDepositDeletedEventBcs.parse(bcsBytes);
	return {
		type: 'ExpiredDepositDeleted',
		requestId: raw.request_id as string,
	};
});

// ---- Withdrawal Events ----

registerEvent('withdrawal_queue', 'WithdrawalRequestedEvent', (bcsBytes) => {
	const raw = WithdrawalRequestedEventBcs.parse(bcsBytes);
	return {
		type: 'WithdrawalRequested',
		requestId: raw.request_id as string,
		btcAmount: BigInt(raw.btc_amount),
		bitcoinAddress: toUint8Array(raw.bitcoin_address as number[]),
		timestampMs: BigInt(raw.timestamp_ms),
		requesterAddress: raw.requester_address as string,
		suiTxDigest: bytesToHexDigest(raw.sui_tx_digest as number[]),
	};
});

registerEvent('withdrawal_queue', 'WithdrawalApprovedEvent', (bcsBytes) => {
	const raw = WithdrawalApprovedEventBcs.parse(bcsBytes);
	return {
		type: 'WithdrawalApproved',
		requestId: raw.request_id as string,
	};
});

registerEvent('withdrawal_queue', 'WithdrawalPickedForProcessingEvent', (bcsBytes) => {
	const raw = WithdrawalPickedForProcessingEventBcs.parse(bcsBytes);
	return {
		type: 'WithdrawalPickedForProcessing',
		pendingId: raw.pending_id as string,
		txid: raw.txid as string,
		requestIds: raw.request_ids as string[],
		inputs: (raw.inputs as any[]).map((inp: any) => ({
			id: {
				txid: inp.id.txid as string,
				vout: inp.id.vout as number,
			},
			amount: BigInt(inp.amount),
			derivationPath: (inp.derivation_path as string | null),
		})),
		withdrawalOutputs: (raw.withdrawal_outputs as any[]).map((out: any) => ({
			amount: BigInt(out.amount),
			bitcoinAddress: toUint8Array(out.bitcoin_address as number[]),
		})),
		changeOutput: raw.change_output
			? {
					amount: BigInt((raw.change_output as any).amount),
					bitcoinAddress: toUint8Array((raw.change_output as any).bitcoin_address as number[]),
				}
			: null,
		timestampMs: BigInt(raw.timestamp_ms),
		randomness: toUint8Array(raw.randomness as number[]),
	};
});

registerEvent('withdrawal_queue', 'WithdrawalSignedEvent', (bcsBytes) => {
	const raw = WithdrawalSignedEventBcs.parse(bcsBytes);
	return {
		type: 'WithdrawalSigned',
		withdrawalId: raw.withdrawal_id as string,
		requestIds: raw.request_ids as string[],
		signatures: (raw.signatures as number[][]).map((sig: number[]) => [toUint8Array(sig)]),
	};
});

registerEvent('withdrawal_queue', 'WithdrawalConfirmedEvent', (bcsBytes) => {
	const raw = WithdrawalConfirmedEventBcs.parse(bcsBytes);
	return {
		type: 'WithdrawalConfirmed',
		pendingId: raw.pending_id as string,
		txid: raw.txid as string,
		changeUtxoId: raw.change_utxo_id
			? {
					txid: (raw.change_utxo_id as any).txid as string,
					vout: (raw.change_utxo_id as any).vout as number,
				}
			: null,
		requestIds: raw.request_ids as string[],
		changeUtxoAmount: raw.change_utxo_amount != null
			? BigInt(raw.change_utxo_amount as string)
			: null,
	};
});

registerEvent('withdrawal_queue', 'WithdrawalCancelledEvent', (bcsBytes) => {
	const raw = WithdrawalCancelledEventBcs.parse(bcsBytes);
	return {
		type: 'WithdrawalCancelled',
		requestId: raw.request_id as string,
		requesterAddress: raw.requester_address as string,
		btcAmount: BigInt(raw.btc_amount),
	};
});

// ---- Validator Events ----

registerEvent('validator', 'ValidatorRegistered', (bcsBytes) => {
	const raw = ValidatorRegisteredBcs.parse(bcsBytes);
	return {
		type: 'ValidatorRegistered',
		validator: raw.validator as string,
	};
});

registerEvent('validator', 'ValidatorUpdated', (bcsBytes) => {
	const raw = ValidatorUpdatedBcs.parse(bcsBytes);
	return {
		type: 'ValidatorUpdated',
		validator: raw.validator as string,
	};
});

// ---- Reconfig Events ----

registerEvent('reconfig', 'StartReconfigEvent', (bcsBytes) => {
	const raw = StartReconfigEventBcs.parse(bcsBytes);
	return {
		type: 'StartReconfig',
		epoch: BigInt(raw.epoch),
	};
});

registerEvent('reconfig', 'EndReconfigEvent', (bcsBytes) => {
	const raw = EndReconfigEventBcs.parse(bcsBytes);
	return {
		type: 'EndReconfig',
		epoch: BigInt(raw.epoch),
		mpcPublicKey: toUint8Array(raw.mpc_public_key as number[]),
	};
});

registerEvent('reconfig', 'AbortReconfigEvent', (bcsBytes) => {
	const raw = AbortReconfigEventBcs.parse(bcsBytes);
	return {
		type: 'AbortReconfig',
		epoch: BigInt(raw.epoch),
	};
});

// ---- UTXO Pool Events ----

registerEvent('utxo_pool', 'UtxoSpentEvent', (bcsBytes) => {
	const raw = UtxoSpentEventBcs.parse(bcsBytes);
	return {
		type: 'UtxoSpent',
		utxoId: {
			txid: (raw.utxo_id as any).txid as string,
			vout: (raw.utxo_id as any).vout as number,
		},
		spentEpoch: BigInt(raw.spent_epoch),
	};
});

registerEvent('utxo_pool', 'SpentUtxoDeletedEvent', (bcsBytes) => {
	const raw = SpentUtxoDeletedEventBcs.parse(bcsBytes);
	return {
		type: 'SpentUtxoDeleted',
		utxoId: {
			txid: (raw.utxo_id as any).txid as string,
			vout: (raw.utxo_id as any).vout as number,
		},
	};
});

// ---- Treasury Events (generic: extract coinType from type param) ----

registerEvent('treasury', 'MintEvent', (bcsBytes, typeParam) => {
	const raw = MintEventBcs.parse(bcsBytes);
	return {
		type: 'Mint',
		coinType: typeParam ?? '',
		amount: BigInt(raw.amount),
	};
});

registerEvent('treasury', 'BurnEvent', (bcsBytes, typeParam) => {
	const raw = BurnEventBcs.parse(bcsBytes);
	return {
		type: 'Burn',
		coinType: typeParam ?? '',
		amount: BigInt(raw.amount),
	};
});

// ---- Proposal Events (generic: extract proposalType from type param) ----

registerEvent('proposal_events', 'ProposalCreatedEvent', (bcsBytes, typeParam) => {
	const raw = ProposalCreatedEventBcs.parse(bcsBytes);
	return {
		type: 'ProposalCreated',
		proposalType: typeParam ?? '',
		proposalId: raw.proposal_id as string,
		timestampMs: BigInt(raw.timestamp_ms),
	};
});

registerEvent('proposal_events', 'VoteCastEvent', (bcsBytes, typeParam) => {
	const raw = VoteCastEventBcs.parse(bcsBytes);
	return {
		type: 'VoteCast',
		proposalType: typeParam ?? '',
		proposalId: raw.proposal_id as string,
		voter: raw.voter as string,
	};
});

registerEvent('proposal_events', 'VoteRemovedEvent', (bcsBytes, typeParam) => {
	const raw = VoteRemovedEventBcs.parse(bcsBytes);
	return {
		type: 'VoteRemoved',
		proposalType: typeParam ?? '',
		proposalId: raw.proposal_id as string,
		voter: raw.voter as string,
	};
});

registerEvent('proposal_events', 'ProposalDeletedEvent', (bcsBytes, typeParam) => {
	const raw = ProposalDeletedEventBcs.parse(bcsBytes);
	return {
		type: 'ProposalDeleted',
		proposalType: typeParam ?? '',
		proposalId: raw.proposal_id as string,
	};
});

registerEvent('proposal_events', 'ProposalExecutedEvent', (bcsBytes, typeParam) => {
	const raw = ProposalExecutedEventBcs.parse(bcsBytes);
	return {
		type: 'ProposalExecuted',
		proposalType: typeParam ?? '',
		proposalId: raw.proposal_id as string,
	};
});

registerEvent('proposal_events', 'QuorumReachedEvent', (bcsBytes, typeParam) => {
	const raw = QuorumReachedEventBcs.parse(bcsBytes);
	return {
		type: 'QuorumReached',
		proposalType: typeParam ?? '',
		proposalId: raw.proposal_id as string,
	};
});

registerEvent('proposal_events', 'PackageUpgradedEvent', (bcsBytes) => {
	const raw = PackageUpgradedEventBcs.parse(bcsBytes);
	return {
		type: 'PackageUpgraded',
		package: raw.package as string,
		version: BigInt(raw.version),
	};
});

/* eslint-enable @typescript-eslint/no-explicit-any */

// ---- Public API ----

/**
 * Best-effort parser: returns a parsed HashiEvent or null if the event
 * is not recognized or does not belong to a known package.
 *
 * @param event - A Sui event from the client (SuiClientTypes.Event)
 * @param packageIds - Set of known Hashi package addresses (current + historical)
 * @returns The parsed event, or null if unrecognized/not matching
 */
export function parseHashiEvent(
	event: SuiClientTypes.Event,
	packageIds: Set<string>,
): HashiEvent | null {
	try {
		const tag = parseStructTag(event.eventType);
		if (!tag) return null;

		// Check if the package is one of our known packages
		if (!packageIds.has(tag.packageAddress)) return null;

		// Look up the deserializer by (module, eventName)
		const key = `${tag.module}::${tag.name}`;
		const deserializer = EVENT_DESERIALIZERS.get(key);
		if (!deserializer) return null;

		// The event's bcs field is Uint8Array in @mysten/sui v2
		const bcsBytes = event.bcs instanceof Uint8Array
			? event.bcs
			: new Uint8Array(event.bcs as ArrayLike<number>);

		return deserializer(bcsBytes, tag.typeParam);
	} catch {
		return null;
	}
}

/** Result type for strict event parsing. */
export type ParseHashiEventResult =
	| { event: HashiEvent; error?: undefined }
	| { event?: undefined; error: HashiParseError };

/**
 * Strict parser: returns { event } on success or { error } on failure.
 * Unlike parseHashiEvent, this never silently swallows errors.
 *
 * Returns { error } when:
 * - The event's StructTag cannot be parsed
 * - The package is not in the known set
 * - The event name is not recognized
 * - BCS deserialization fails
 *
 * @param event - A Sui event from the client (SuiClientTypes.Event)
 * @param packageIds - Set of known Hashi package addresses (current + historical)
 * @returns { event: HashiEvent } or { error: HashiParseError }
 */
export function parseHashiEventStrict(
	event: SuiClientTypes.Event,
	packageIds: Set<string>,
): ParseHashiEventResult {
	const tag = parseStructTag(event.eventType);
	if (!tag) {
		return {
			error: new HashiParseError(
				`Failed to parse StructTag from event type: "${event.eventType}"`,
			),
		};
	}

	if (!packageIds.has(tag.packageAddress)) {
		return {
			error: new HashiParseError(
				`Event package "${tag.packageAddress}" is not in the known package set`,
			),
		};
	}

	const key = `${tag.module}::${tag.name}`;
	const deserializer = EVENT_DESERIALIZERS.get(key);
	if (!deserializer) {
		return {
			error: new HashiParseError(
				`Unknown event type: ${tag.module}::${tag.name}`,
			),
		};
	}

	try {
		const bcsBytes = event.bcs instanceof Uint8Array
			? event.bcs
			: new Uint8Array(event.bcs as ArrayLike<number>);

		const parsed = deserializer(bcsBytes, tag.typeParam);
		return { event: parsed };
	} catch (e) {
		return {
			error: new HashiParseError(
				`Failed to deserialize BCS for ${key}: ${e instanceof Error ? e.message : String(e)}`,
			),
		};
	}
}
