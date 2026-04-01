import { describe, it, expect } from 'vitest';
import {
	UtxoIdBcs,
	UtxoBcs,
	OutputUtxoBcs,
	CommitteeSignatureBcs,
	WithdrawalRequestInfoBcs,
	ConfigValueBcs,
	TobKeyBcs,
	DealerMessagesHashV1Bcs,
} from '../src/types/bcs';

/**
 * BCS round-trip tests.
 *
 * Note: @mysten/bcs v2 deserializes u64 values as strings (not bigint).
 * We test accordingly by comparing string representations.
 */
describe('BCS round-trip tests', () => {
	it('UtxoId serializes and deserializes correctly', () => {
		const original = {
			txid: '0x' + 'ab'.repeat(32),
			vout: 42,
		};

		const bytes = UtxoIdBcs.serialize(original).toBytes();
		const deserialized = UtxoIdBcs.parse(bytes);

		expect(deserialized.txid).toBe(original.txid);
		expect(deserialized.vout).toBe(original.vout);
	});

	it('Utxo serializes and deserializes correctly', () => {
		const original = {
			id: {
				txid: '0x' + 'cd'.repeat(32),
				vout: 0,
			},
			amount: 100000n,
			derivation_path: '0x' + 'ef'.repeat(32),
		};

		const bytes = UtxoBcs.serialize(original).toBytes();
		const deserialized = UtxoBcs.parse(bytes);

		expect(deserialized.id.txid).toBe(original.id.txid);
		expect(deserialized.id.vout).toBe(original.id.vout);
		expect(String(deserialized.amount)).toBe('100000');
		expect(deserialized.derivation_path).toBe(original.derivation_path);
	});

	it('Utxo round-trips with null derivation_path', () => {
		const original = {
			id: {
				txid: '0x' + '00'.repeat(32),
				vout: 3,
			},
			amount: 546n,
			derivation_path: null,
		};

		const bytes = UtxoBcs.serialize(original).toBytes();
		const deserialized = UtxoBcs.parse(bytes);

		expect(deserialized.derivation_path).toBeNull();
		expect(String(deserialized.amount)).toBe('546');
	});

	it('OutputUtxo serializes and deserializes correctly', () => {
		const bitcoinAddress = new Uint8Array(20).fill(0xab);
		const original = {
			amount: 50000n,
			bitcoin_address: Array.from(bitcoinAddress),
		};

		const bytes = OutputUtxoBcs.serialize(original).toBytes();
		const deserialized = OutputUtxoBcs.parse(bytes);

		expect(String(deserialized.amount)).toBe('50000');
		expect(new Uint8Array(deserialized.bitcoin_address)).toEqual(bitcoinAddress);
	});

	it('CommitteeSignature serializes and deserializes correctly', () => {
		const original = {
			epoch: 7n,
			signature: Array.from(new Uint8Array(96).fill(0x01)),
			signers_bitmap: [0b11000000],
		};

		const bytes = CommitteeSignatureBcs.serialize(original).toBytes();
		const deserialized = CommitteeSignatureBcs.parse(bytes);

		expect(String(deserialized.epoch)).toBe('7');
		expect(deserialized.signature.length).toBe(96);
		expect(deserialized.signers_bitmap).toEqual([0b11000000]);
	});

	it('WithdrawalRequestInfo serializes and deserializes correctly', () => {
		const original = {
			id: '0x' + 'aa'.repeat(32),
			btc_amount: 1000000n,
			bitcoin_address: Array.from(new Uint8Array(32).fill(0xff)),
			timestamp_ms: 1700000000000n,
			requester_address: '0x' + 'bb'.repeat(32),
			sui_tx_digest: Array.from(new Uint8Array(32).fill(0xcc)),
		};

		const bytes = WithdrawalRequestInfoBcs.serialize(original).toBytes();
		const deserialized = WithdrawalRequestInfoBcs.parse(bytes);

		expect(deserialized.id).toBe(original.id);
		expect(String(deserialized.btc_amount)).toBe('1000000');
		expect(deserialized.bitcoin_address.length).toBe(32);
		expect(String(deserialized.timestamp_ms)).toBe('1700000000000');
		expect(deserialized.requester_address).toBe(original.requester_address);
		expect(deserialized.sui_tx_digest.length).toBe(32);
	});

	it('ConfigValue (enum) round-trips all variants', () => {
		// U64 variant
		const u64Bytes = ConfigValueBcs.serialize({ U64: 42n }).toBytes();
		const u64Result = ConfigValueBcs.parse(u64Bytes);
		expect(String(u64Result.U64)).toBe('42');

		// Bool variant
		const boolBytes = ConfigValueBcs.serialize({ Bool: true }).toBytes();
		const boolResult = ConfigValueBcs.parse(boolBytes);
		expect(boolResult.Bool).toBe(true);

		// Address variant
		const addr = '0x' + '11'.repeat(32);
		const addrBytes = ConfigValueBcs.serialize({ Address: addr }).toBytes();
		const addrResult = ConfigValueBcs.parse(addrBytes);
		expect(addrResult.Address).toBe(addr);

		// String variant
		const strBytes = ConfigValueBcs.serialize({ String: 'hello' }).toBytes();
		const strResult = ConfigValueBcs.parse(strBytes);
		expect(strResult.String).toBe('hello');

		// Bytes variant
		const bytesData = [1, 2, 3, 4, 5];
		const bytesBytes = ConfigValueBcs.serialize({ Bytes: bytesData }).toBytes();
		const bytesResult = ConfigValueBcs.parse(bytesBytes);
		expect(Array.from(bytesResult.Bytes)).toEqual(bytesData);
	});

	it('TobKey serializes and deserializes correctly', () => {
		// With batch_index
		const withBatch = {
			epoch: 5n,
			batch_index: 3,
		};
		const bytes1 = TobKeyBcs.serialize(withBatch).toBytes();
		const result1 = TobKeyBcs.parse(bytes1);
		expect(String(result1.epoch)).toBe('5');
		expect(result1.batch_index).toBe(3);

		// Without batch_index (null)
		const withoutBatch = {
			epoch: 10n,
			batch_index: null,
		};
		const bytes2 = TobKeyBcs.serialize(withoutBatch).toBytes();
		const result2 = TobKeyBcs.parse(bytes2);
		expect(String(result2.epoch)).toBe('10');
		expect(result2.batch_index).toBeNull();
	});

	it('DealerMessagesHashV1 serializes and deserializes correctly', () => {
		const original = {
			dealer_address: '0x' + 'dd'.repeat(32),
			messages_hash: Array.from(new Uint8Array(32).fill(0xee)),
		};

		const bytes = DealerMessagesHashV1Bcs.serialize(original).toBytes();
		const deserialized = DealerMessagesHashV1Bcs.parse(bytes);

		expect(deserialized.dealer_address).toBe(original.dealer_address);
		expect(deserialized.messages_hash.length).toBe(32);
	});
});
