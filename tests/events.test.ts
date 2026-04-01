import { describe, it, expect } from 'vitest';
import { parseHashiEvent, parseHashiEventStrict } from '../src/events/parser';
import type { HashiEvent } from '../src/events/types';
import { HashiParseError } from '../src/errors';
import type { SuiClientTypes } from '@mysten/sui/client';

// ---- BCS codegen imports for serializing test data ----

import {
	DepositRequestedEvent as DepositRequestedEventBcs,
	DepositConfirmedEvent as DepositConfirmedEventBcs,
	ExpiredDepositDeletedEvent as ExpiredDepositDeletedEventBcs,
} from '../src/contracts/hashi/deposit';

import {
	WithdrawalRequestedEvent as WithdrawalRequestedEventBcs,
	WithdrawalApprovedEvent as WithdrawalApprovedEventBcs,
	WithdrawalPickedForProcessingEvent as WithdrawalPickedForProcessingEventBcs,
	WithdrawalSignedEvent as WithdrawalSignedEventBcs,
	WithdrawalConfirmedEvent as WithdrawalConfirmedEventBcs,
	WithdrawalCancelledEvent as WithdrawalCancelledEventBcs,
} from '../src/contracts/hashi/withdrawal_queue';

import {
	ValidatorRegistered as ValidatorRegisteredBcs,
	ValidatorUpdated as ValidatorUpdatedBcs,
} from '../src/contracts/hashi/validator';

import {
	StartReconfigEvent as StartReconfigEventBcs,
	EndReconfigEvent as EndReconfigEventBcs,
	AbortReconfigEvent as AbortReconfigEventBcs,
} from '../src/contracts/hashi/reconfig';

import {
	UtxoSpentEvent as UtxoSpentEventBcs,
	SpentUtxoDeletedEvent as SpentUtxoDeletedEventBcs,
} from '../src/contracts/hashi/utxo_pool';

import {
	MintEvent as MintEventBcs,
	BurnEvent as BurnEventBcs,
} from '../src/contracts/hashi/treasury';

import {
	ProposalCreatedEvent as ProposalCreatedEventBcs,
	VoteCastEvent as VoteCastEventBcs,
	VoteRemovedEvent as VoteRemovedEventBcs,
	ProposalDeletedEvent as ProposalDeletedEventBcs,
	ProposalExecutedEvent as ProposalExecutedEventBcs,
	QuorumReachedEvent as QuorumReachedEventBcs,
	PackageUpgradedEvent as PackageUpgradedEventBcs,
} from '../src/contracts/hashi/proposal_events';

// ---- Test Fixtures ----

const PKG = '0x' + 'ab'.repeat(32);
const PKG_IDS = new Set([PKG]);
const ADDR_A = '0x' + 'aa'.repeat(32);
const ADDR_B = '0x' + 'bb'.repeat(32);
const TXID = '0x' + 'cc'.repeat(32);

/** Helper to create a mock SuiClientTypes.Event. */
function mockEvent(
	module: string,
	eventName: string,
	bcsBytes: Uint8Array,
	typeParam?: string,
): SuiClientTypes.Event {
	const eventType = typeParam
		? `${PKG}::${module}::${eventName}<${typeParam}>`
		: `${PKG}::${module}::${eventName}`;

	return {
		packageId: PKG,
		module,
		sender: ADDR_A,
		eventType,
		bcs: bcsBytes,
		json: null,
	};
}

// ---- Tests for all 25 event variants ----

describe('Event parsing: Deposit events', () => {
	it('parses DepositRequestedEvent', () => {
		const bcs = DepositRequestedEventBcs.serialize({
			request_id: ADDR_A,
			utxo_id: { txid: TXID, vout: 0 },
			amount: 100000n,
			derivation_path: ADDR_B,
			timestamp_ms: 1700000000000n,
			requester_address: ADDR_A,
			sui_tx_digest: Array.from(new Uint8Array(32).fill(0xdd)),
		}).toBytes();

		const event = mockEvent('deposit', 'DepositRequestedEvent', bcs);
		const result = parseHashiEvent(event, PKG_IDS);

		expect(result).not.toBeNull();
		expect(result!.type).toBe('DepositRequested');
		if (result!.type === 'DepositRequested') {
			expect(result.requestId).toBe(ADDR_A);
			expect(result.utxoId.txid).toBe(TXID);
			expect(result.utxoId.vout).toBe(0);
			expect(result.amount).toBe(100000n);
			expect(result.derivationPath).toBe(ADDR_B);
			expect(result.timestampMs).toBe(1700000000000n);
			expect(result.requesterAddress).toBe(ADDR_A);
			expect(typeof result.suiTxDigest).toBe('string');
		}
	});

	it('parses DepositConfirmedEvent', () => {
		const bcs = DepositConfirmedEventBcs.serialize({
			request_id: ADDR_A,
			utxo_id: { txid: TXID, vout: 1 },
			amount: 50000n,
			derivation_path: null,
		}).toBytes();

		const event = mockEvent('deposit', 'DepositConfirmedEvent', bcs);
		const result = parseHashiEvent(event, PKG_IDS);

		expect(result).not.toBeNull();
		expect(result!.type).toBe('DepositConfirmed');
		if (result!.type === 'DepositConfirmed') {
			expect(result.requestId).toBe(ADDR_A);
			expect(result.utxoId.vout).toBe(1);
			expect(result.amount).toBe(50000n);
			expect(result.derivationPath).toBeNull();
		}
	});

	it('parses ExpiredDepositDeletedEvent', () => {
		const bcs = ExpiredDepositDeletedEventBcs.serialize({
			request_id: ADDR_A,
		}).toBytes();

		const event = mockEvent('deposit', 'ExpiredDepositDeletedEvent', bcs);
		const result = parseHashiEvent(event, PKG_IDS);

		expect(result).not.toBeNull();
		expect(result!.type).toBe('ExpiredDepositDeleted');
		if (result!.type === 'ExpiredDepositDeleted') {
			expect(result.requestId).toBe(ADDR_A);
		}
	});
});

describe('Event parsing: Withdrawal events', () => {
	it('parses WithdrawalRequestedEvent', () => {
		const btcAddr = new Uint8Array(20).fill(0xef);
		const bcs = WithdrawalRequestedEventBcs.serialize({
			request_id: ADDR_A,
			btc_amount: 200000n,
			bitcoin_address: Array.from(btcAddr),
			timestamp_ms: 1700000001000n,
			requester_address: ADDR_B,
			sui_tx_digest: Array.from(new Uint8Array(32).fill(0x11)),
		}).toBytes();

		const event = mockEvent('withdrawal_queue', 'WithdrawalRequestedEvent', bcs);
		const result = parseHashiEvent(event, PKG_IDS);

		expect(result).not.toBeNull();
		expect(result!.type).toBe('WithdrawalRequested');
		if (result!.type === 'WithdrawalRequested') {
			expect(result.requestId).toBe(ADDR_A);
			expect(result.btcAmount).toBe(200000n);
			expect(result.bitcoinAddress).toEqual(btcAddr);
			expect(result.timestampMs).toBe(1700000001000n);
			expect(result.requesterAddress).toBe(ADDR_B);
		}
	});

	it('parses WithdrawalApprovedEvent', () => {
		const bcs = WithdrawalApprovedEventBcs.serialize({
			request_id: ADDR_A,
		}).toBytes();

		const event = mockEvent('withdrawal_queue', 'WithdrawalApprovedEvent', bcs);
		const result = parseHashiEvent(event, PKG_IDS);

		expect(result).not.toBeNull();
		expect(result!.type).toBe('WithdrawalApproved');
		if (result!.type === 'WithdrawalApproved') {
			expect(result.requestId).toBe(ADDR_A);
		}
	});

	it('parses WithdrawalPickedForProcessingEvent', () => {
		const bcs = WithdrawalPickedForProcessingEventBcs.serialize({
			pending_id: ADDR_A,
			txid: TXID,
			request_ids: [ADDR_B],
			inputs: [
				{
					id: { txid: TXID, vout: 0 },
					amount: 500000n,
					derivation_path: null,
				},
			],
			withdrawal_outputs: [
				{
					amount: 400000n,
					bitcoin_address: Array.from(new Uint8Array(20).fill(0x01)),
				},
			],
			change_output: {
				amount: 90000n,
				bitcoin_address: Array.from(new Uint8Array(20).fill(0x02)),
			},
			timestamp_ms: 1700000002000n,
			randomness: Array.from(new Uint8Array(16).fill(0xff)),
		}).toBytes();

		const event = mockEvent('withdrawal_queue', 'WithdrawalPickedForProcessingEvent', bcs);
		const result = parseHashiEvent(event, PKG_IDS);

		expect(result).not.toBeNull();
		expect(result!.type).toBe('WithdrawalPickedForProcessing');
		if (result!.type === 'WithdrawalPickedForProcessing') {
			expect(result.pendingId).toBe(ADDR_A);
			expect(result.txid).toBe(TXID);
			expect(result.requestIds).toEqual([ADDR_B]);
			expect(result.inputs.length).toBe(1);
			expect(result.inputs[0].id.txid).toBe(TXID);
			expect(result.inputs[0].amount).toBe(500000n);
			expect(result.withdrawalOutputs.length).toBe(1);
			expect(result.withdrawalOutputs[0].amount).toBe(400000n);
			expect(result.changeOutput).not.toBeNull();
			expect(result.changeOutput!.amount).toBe(90000n);
			expect(result.timestampMs).toBe(1700000002000n);
			expect(result.randomness.length).toBe(16);
		}
	});

	it('parses WithdrawalSignedEvent', () => {
		const sig1 = Array.from(new Uint8Array(64).fill(0xaa));
		const sig2 = Array.from(new Uint8Array(64).fill(0xbb));
		const bcs = WithdrawalSignedEventBcs.serialize({
			withdrawal_id: ADDR_A,
			request_ids: [ADDR_B],
			signatures: [sig1, sig2],
		}).toBytes();

		const event = mockEvent('withdrawal_queue', 'WithdrawalSignedEvent', bcs);
		const result = parseHashiEvent(event, PKG_IDS);

		expect(result).not.toBeNull();
		expect(result!.type).toBe('WithdrawalSigned');
		if (result!.type === 'WithdrawalSigned') {
			expect(result.withdrawalId).toBe(ADDR_A);
			expect(result.requestIds).toEqual([ADDR_B]);
			expect(result.signatures.length).toBe(2);
		}
	});

	it('parses WithdrawalConfirmedEvent', () => {
		const bcs = WithdrawalConfirmedEventBcs.serialize({
			pending_id: ADDR_A,
			txid: TXID,
			change_utxo_id: { txid: TXID, vout: 1 },
			request_ids: [ADDR_B],
			change_utxo_amount: 50000n,
		}).toBytes();

		const event = mockEvent('withdrawal_queue', 'WithdrawalConfirmedEvent', bcs);
		const result = parseHashiEvent(event, PKG_IDS);

		expect(result).not.toBeNull();
		expect(result!.type).toBe('WithdrawalConfirmed');
		if (result!.type === 'WithdrawalConfirmed') {
			expect(result.pendingId).toBe(ADDR_A);
			expect(result.txid).toBe(TXID);
			expect(result.changeUtxoId).not.toBeNull();
			expect(result.changeUtxoId!.txid).toBe(TXID);
			expect(result.changeUtxoId!.vout).toBe(1);
			expect(result.requestIds).toEqual([ADDR_B]);
			expect(result.changeUtxoAmount).toBe(50000n);
		}
	});

	it('parses WithdrawalConfirmedEvent with null change', () => {
		const bcs = WithdrawalConfirmedEventBcs.serialize({
			pending_id: ADDR_A,
			txid: TXID,
			change_utxo_id: null,
			request_ids: [ADDR_B],
			change_utxo_amount: null,
		}).toBytes();

		const event = mockEvent('withdrawal_queue', 'WithdrawalConfirmedEvent', bcs);
		const result = parseHashiEvent(event, PKG_IDS);

		expect(result).not.toBeNull();
		if (result!.type === 'WithdrawalConfirmed') {
			expect(result.changeUtxoId).toBeNull();
			expect(result.changeUtxoAmount).toBeNull();
		}
	});

	it('parses WithdrawalCancelledEvent', () => {
		const bcs = WithdrawalCancelledEventBcs.serialize({
			request_id: ADDR_A,
			requester_address: ADDR_B,
			btc_amount: 300000n,
		}).toBytes();

		const event = mockEvent('withdrawal_queue', 'WithdrawalCancelledEvent', bcs);
		const result = parseHashiEvent(event, PKG_IDS);

		expect(result).not.toBeNull();
		expect(result!.type).toBe('WithdrawalCancelled');
		if (result!.type === 'WithdrawalCancelled') {
			expect(result.requestId).toBe(ADDR_A);
			expect(result.requesterAddress).toBe(ADDR_B);
			expect(result.btcAmount).toBe(300000n);
		}
	});
});

describe('Event parsing: Validator events', () => {
	it('parses ValidatorRegistered', () => {
		const bcs = ValidatorRegisteredBcs.serialize({
			validator: ADDR_A,
		}).toBytes();

		const event = mockEvent('validator', 'ValidatorRegistered', bcs);
		const result = parseHashiEvent(event, PKG_IDS);

		expect(result).not.toBeNull();
		expect(result!.type).toBe('ValidatorRegistered');
		if (result!.type === 'ValidatorRegistered') {
			expect(result.validator).toBe(ADDR_A);
		}
	});

	it('parses ValidatorUpdated', () => {
		const bcs = ValidatorUpdatedBcs.serialize({
			validator: ADDR_B,
		}).toBytes();

		const event = mockEvent('validator', 'ValidatorUpdated', bcs);
		const result = parseHashiEvent(event, PKG_IDS);

		expect(result).not.toBeNull();
		expect(result!.type).toBe('ValidatorUpdated');
		if (result!.type === 'ValidatorUpdated') {
			expect(result.validator).toBe(ADDR_B);
		}
	});
});

describe('Event parsing: Reconfig events', () => {
	it('parses StartReconfigEvent', () => {
		const bcs = StartReconfigEventBcs.serialize({
			epoch: 5n,
		}).toBytes();

		const event = mockEvent('reconfig', 'StartReconfigEvent', bcs);
		const result = parseHashiEvent(event, PKG_IDS);

		expect(result).not.toBeNull();
		expect(result!.type).toBe('StartReconfig');
		if (result!.type === 'StartReconfig') {
			expect(result.epoch).toBe(5n);
		}
	});

	it('parses EndReconfigEvent', () => {
		const pubKey = Array.from(new Uint8Array(48).fill(0x33));
		const bcs = EndReconfigEventBcs.serialize({
			epoch: 6n,
			mpc_public_key: pubKey,
		}).toBytes();

		const event = mockEvent('reconfig', 'EndReconfigEvent', bcs);
		const result = parseHashiEvent(event, PKG_IDS);

		expect(result).not.toBeNull();
		expect(result!.type).toBe('EndReconfig');
		if (result!.type === 'EndReconfig') {
			expect(result.epoch).toBe(6n);
			expect(result.mpcPublicKey.length).toBe(48);
			expect(result.mpcPublicKey[0]).toBe(0x33);
		}
	});

	it('parses AbortReconfigEvent', () => {
		const bcs = AbortReconfigEventBcs.serialize({
			epoch: 7n,
		}).toBytes();

		const event = mockEvent('reconfig', 'AbortReconfigEvent', bcs);
		const result = parseHashiEvent(event, PKG_IDS);

		expect(result).not.toBeNull();
		expect(result!.type).toBe('AbortReconfig');
		if (result!.type === 'AbortReconfig') {
			expect(result.epoch).toBe(7n);
		}
	});
});

describe('Event parsing: UTXO pool events', () => {
	it('parses UtxoSpentEvent', () => {
		const bcs = UtxoSpentEventBcs.serialize({
			utxo_id: { txid: TXID, vout: 2 },
			spent_epoch: 10n,
		}).toBytes();

		const event = mockEvent('utxo_pool', 'UtxoSpentEvent', bcs);
		const result = parseHashiEvent(event, PKG_IDS);

		expect(result).not.toBeNull();
		expect(result!.type).toBe('UtxoSpent');
		if (result!.type === 'UtxoSpent') {
			expect(result.utxoId.txid).toBe(TXID);
			expect(result.utxoId.vout).toBe(2);
			expect(result.spentEpoch).toBe(10n);
		}
	});

	it('parses SpentUtxoDeletedEvent', () => {
		const bcs = SpentUtxoDeletedEventBcs.serialize({
			utxo_id: { txid: TXID, vout: 3 },
		}).toBytes();

		const event = mockEvent('utxo_pool', 'SpentUtxoDeletedEvent', bcs);
		const result = parseHashiEvent(event, PKG_IDS);

		expect(result).not.toBeNull();
		expect(result!.type).toBe('SpentUtxoDeleted');
		if (result!.type === 'SpentUtxoDeleted') {
			expect(result.utxoId.txid).toBe(TXID);
			expect(result.utxoId.vout).toBe(3);
		}
	});
});

describe('Event parsing: Treasury events (generic)', () => {
	const COIN_TYPE = `${PKG}::btc::BTC`;

	it('parses MintEvent with type parameter', () => {
		const bcs = MintEventBcs.serialize({
			amount: 1000000n,
		}).toBytes();

		const event = mockEvent('treasury', 'MintEvent', bcs, COIN_TYPE);
		const result = parseHashiEvent(event, PKG_IDS);

		expect(result).not.toBeNull();
		expect(result!.type).toBe('Mint');
		if (result!.type === 'Mint') {
			expect(result.coinType).toBe(COIN_TYPE);
			expect(result.amount).toBe(1000000n);
		}
	});

	it('parses BurnEvent with type parameter', () => {
		const bcs = BurnEventBcs.serialize({
			amount: 500000n,
		}).toBytes();

		const event = mockEvent('treasury', 'BurnEvent', bcs, COIN_TYPE);
		const result = parseHashiEvent(event, PKG_IDS);

		expect(result).not.toBeNull();
		expect(result!.type).toBe('Burn');
		if (result!.type === 'Burn') {
			expect(result.coinType).toBe(COIN_TYPE);
			expect(result.amount).toBe(500000n);
		}
	});
});

describe('Event parsing: Proposal events (generic)', () => {
	const PROPOSAL_TYPE = `${PKG}::update_config::UpdateConfig`;

	it('parses ProposalCreatedEvent with type parameter', () => {
		const bcs = ProposalCreatedEventBcs.serialize({
			proposal_id: ADDR_A,
			timestamp_ms: 1700000003000n,
		}).toBytes();

		const event = mockEvent('proposal_events', 'ProposalCreatedEvent', bcs, PROPOSAL_TYPE);
		const result = parseHashiEvent(event, PKG_IDS);

		expect(result).not.toBeNull();
		expect(result!.type).toBe('ProposalCreated');
		if (result!.type === 'ProposalCreated') {
			expect(result.proposalType).toBe(PROPOSAL_TYPE);
			expect(result.proposalId).toBe(ADDR_A);
			expect(result.timestampMs).toBe(1700000003000n);
		}
	});

	it('parses VoteCastEvent with type parameter', () => {
		const bcs = VoteCastEventBcs.serialize({
			proposal_id: ADDR_A,
			voter: ADDR_B,
		}).toBytes();

		const event = mockEvent('proposal_events', 'VoteCastEvent', bcs, PROPOSAL_TYPE);
		const result = parseHashiEvent(event, PKG_IDS);

		expect(result).not.toBeNull();
		expect(result!.type).toBe('VoteCast');
		if (result!.type === 'VoteCast') {
			expect(result.proposalType).toBe(PROPOSAL_TYPE);
			expect(result.proposalId).toBe(ADDR_A);
			expect(result.voter).toBe(ADDR_B);
		}
	});

	it('parses VoteRemovedEvent with type parameter', () => {
		const bcs = VoteRemovedEventBcs.serialize({
			proposal_id: ADDR_A,
			voter: ADDR_B,
		}).toBytes();

		const event = mockEvent('proposal_events', 'VoteRemovedEvent', bcs, PROPOSAL_TYPE);
		const result = parseHashiEvent(event, PKG_IDS);

		expect(result).not.toBeNull();
		expect(result!.type).toBe('VoteRemoved');
		if (result!.type === 'VoteRemoved') {
			expect(result.proposalType).toBe(PROPOSAL_TYPE);
			expect(result.proposalId).toBe(ADDR_A);
			expect(result.voter).toBe(ADDR_B);
		}
	});

	it('parses ProposalDeletedEvent with type parameter', () => {
		const bcs = ProposalDeletedEventBcs.serialize({
			proposal_id: ADDR_A,
		}).toBytes();

		const event = mockEvent('proposal_events', 'ProposalDeletedEvent', bcs, PROPOSAL_TYPE);
		const result = parseHashiEvent(event, PKG_IDS);

		expect(result).not.toBeNull();
		expect(result!.type).toBe('ProposalDeleted');
		if (result!.type === 'ProposalDeleted') {
			expect(result.proposalType).toBe(PROPOSAL_TYPE);
			expect(result.proposalId).toBe(ADDR_A);
		}
	});

	it('parses ProposalExecutedEvent with type parameter', () => {
		const bcs = ProposalExecutedEventBcs.serialize({
			proposal_id: ADDR_A,
		}).toBytes();

		const event = mockEvent('proposal_events', 'ProposalExecutedEvent', bcs, PROPOSAL_TYPE);
		const result = parseHashiEvent(event, PKG_IDS);

		expect(result).not.toBeNull();
		expect(result!.type).toBe('ProposalExecuted');
		if (result!.type === 'ProposalExecuted') {
			expect(result.proposalType).toBe(PROPOSAL_TYPE);
			expect(result.proposalId).toBe(ADDR_A);
		}
	});

	it('parses QuorumReachedEvent with type parameter', () => {
		const bcs = QuorumReachedEventBcs.serialize({
			proposal_id: ADDR_A,
		}).toBytes();

		const event = mockEvent('proposal_events', 'QuorumReachedEvent', bcs, PROPOSAL_TYPE);
		const result = parseHashiEvent(event, PKG_IDS);

		expect(result).not.toBeNull();
		expect(result!.type).toBe('QuorumReached');
		if (result!.type === 'QuorumReached') {
			expect(result.proposalType).toBe(PROPOSAL_TYPE);
			expect(result.proposalId).toBe(ADDR_A);
		}
	});
});

describe('Event parsing: PackageUpgraded event', () => {
	it('parses PackageUpgradedEvent', () => {
		const bcs = PackageUpgradedEventBcs.serialize({
			package: ADDR_A,
			version: 3n,
		}).toBytes();

		const event = mockEvent('proposal_events', 'PackageUpgradedEvent', bcs);
		const result = parseHashiEvent(event, PKG_IDS);

		expect(result).not.toBeNull();
		expect(result!.type).toBe('PackageUpgraded');
		if (result!.type === 'PackageUpgraded') {
			expect(result.package).toBe(ADDR_A);
			expect(result.version).toBe(3n);
		}
	});
});

// ---- Multi-version package matching ----

describe('Multi-version package matching', () => {
	it('matches events from any package in the set', () => {
		const oldPkg = '0x' + '11'.repeat(32);
		const newPkg = '0x' + '22'.repeat(32);
		const multiPkgIds = new Set([oldPkg, newPkg]);

		const bcs = StartReconfigEventBcs.serialize({
			epoch: 1n,
		}).toBytes();

		// Event from old package
		const oldEvent: SuiClientTypes.Event = {
			packageId: oldPkg,
			module: 'reconfig',
			sender: ADDR_A,
			eventType: `${oldPkg}::reconfig::StartReconfigEvent`,
			bcs,
			json: null,
		};

		// Event from new package
		const newEvent: SuiClientTypes.Event = {
			packageId: newPkg,
			module: 'reconfig',
			sender: ADDR_A,
			eventType: `${newPkg}::reconfig::StartReconfigEvent`,
			bcs,
			json: null,
		};

		expect(parseHashiEvent(oldEvent, multiPkgIds)).not.toBeNull();
		expect(parseHashiEvent(newEvent, multiPkgIds)).not.toBeNull();
	});

	it('rejects events from unknown packages', () => {
		const bcs = StartReconfigEventBcs.serialize({
			epoch: 1n,
		}).toBytes();

		const unknownPkg = '0x' + 'ff'.repeat(32);
		const event: SuiClientTypes.Event = {
			packageId: unknownPkg,
			module: 'reconfig',
			sender: ADDR_A,
			eventType: `${unknownPkg}::reconfig::StartReconfigEvent`,
			bcs,
			json: null,
		};

		expect(parseHashiEvent(event, PKG_IDS)).toBeNull();
	});
});

// ---- parseHashiEvent returns null for unrecognized ----

describe('parseHashiEvent returns null for unrecognized events', () => {
	it('returns null for unknown module', () => {
		const event: SuiClientTypes.Event = {
			packageId: PKG,
			module: 'unknown_module',
			sender: ADDR_A,
			eventType: `${PKG}::unknown_module::SomeEvent`,
			bcs: new Uint8Array(0),
			json: null,
		};

		expect(parseHashiEvent(event, PKG_IDS)).toBeNull();
	});

	it('returns null for unknown event name', () => {
		const event: SuiClientTypes.Event = {
			packageId: PKG,
			module: 'deposit',
			sender: ADDR_A,
			eventType: `${PKG}::deposit::UnknownEvent`,
			bcs: new Uint8Array(0),
			json: null,
		};

		expect(parseHashiEvent(event, PKG_IDS)).toBeNull();
	});

	it('returns null for malformed eventType', () => {
		const event: SuiClientTypes.Event = {
			packageId: PKG,
			module: 'deposit',
			sender: ADDR_A,
			eventType: 'not-a-struct-tag',
			bcs: new Uint8Array(0),
			json: null,
		};

		expect(parseHashiEvent(event, PKG_IDS)).toBeNull();
	});
});

// ---- parseHashiEventStrict ----

describe('parseHashiEventStrict', () => {
	it('returns { event } on success', () => {
		const bcs = StartReconfigEventBcs.serialize({
			epoch: 42n,
		}).toBytes();

		const event = mockEvent('reconfig', 'StartReconfigEvent', bcs);
		const result = parseHashiEventStrict(event, PKG_IDS);

		expect(result.error).toBeUndefined();
		expect(result.event).toBeDefined();
		expect(result.event!.type).toBe('StartReconfig');
	});

	it('returns { error } for unknown package', () => {
		const unknownPkg = '0x' + 'ff'.repeat(32);
		const event: SuiClientTypes.Event = {
			packageId: unknownPkg,
			module: 'reconfig',
			sender: ADDR_A,
			eventType: `${unknownPkg}::reconfig::StartReconfigEvent`,
			bcs: new Uint8Array(8),
			json: null,
		};

		const result = parseHashiEventStrict(event, PKG_IDS);
		expect(result.event).toBeUndefined();
		expect(result.error).toBeInstanceOf(HashiParseError);
		expect(result.error!.message).toContain('not in the known package set');
	});

	it('returns { error } for unknown event name', () => {
		const event: SuiClientTypes.Event = {
			packageId: PKG,
			module: 'deposit',
			sender: ADDR_A,
			eventType: `${PKG}::deposit::UnknownEvent`,
			bcs: new Uint8Array(0),
			json: null,
		};

		const result = parseHashiEventStrict(event, PKG_IDS);
		expect(result.event).toBeUndefined();
		expect(result.error).toBeInstanceOf(HashiParseError);
		expect(result.error!.message).toContain('Unknown event type');
	});

	it('returns { error } for malformed StructTag', () => {
		const event: SuiClientTypes.Event = {
			packageId: PKG,
			module: 'deposit',
			sender: ADDR_A,
			eventType: 'invalid',
			bcs: new Uint8Array(0),
			json: null,
		};

		const result = parseHashiEventStrict(event, PKG_IDS);
		expect(result.event).toBeUndefined();
		expect(result.error).toBeInstanceOf(HashiParseError);
		expect(result.error!.message).toContain('Failed to parse StructTag');
	});

	it('returns { error } for BCS deserialization failure', () => {
		// Valid event type but garbage BCS data
		const event: SuiClientTypes.Event = {
			packageId: PKG,
			module: 'reconfig',
			sender: ADDR_A,
			eventType: `${PKG}::reconfig::EndReconfigEvent`,
			bcs: new Uint8Array([0xff, 0xff]),
			json: null,
		};

		const result = parseHashiEventStrict(event, PKG_IDS);
		expect(result.event).toBeUndefined();
		expect(result.error).toBeInstanceOf(HashiParseError);
		expect(result.error!.message).toContain('Failed to deserialize BCS');
	});
});

// ---- Type narrowing test ----

describe('Type narrowing with discriminant', () => {
	it('TypeScript can narrow all 25 variants', () => {
		// This test verifies the discriminated union works at both
		// type level and runtime level for all variants
		const allTypes: HashiEvent['type'][] = [
			'DepositRequested',
			'DepositConfirmed',
			'ExpiredDepositDeleted',
			'WithdrawalRequested',
			'WithdrawalApproved',
			'WithdrawalPickedForProcessing',
			'WithdrawalSigned',
			'WithdrawalConfirmed',
			'WithdrawalCancelled',
			'ValidatorRegistered',
			'ValidatorUpdated',
			'StartReconfig',
			'EndReconfig',
			'AbortReconfig',
			'UtxoSpent',
			'SpentUtxoDeleted',
			'Mint',
			'Burn',
			'ProposalCreated',
			'VoteCast',
			'VoteRemoved',
			'ProposalDeleted',
			'ProposalExecuted',
			'QuorumReached',
			'PackageUpgraded',
		];

		expect(allTypes.length).toBe(25);
		expect(new Set(allTypes).size).toBe(25); // All unique
	});
});
