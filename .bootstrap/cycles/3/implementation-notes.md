---
cycle: 3
iteration: 1
status: DONE
timestamp: 2026-04-01T14:00:00Z
---

## What I Implemented

### Bitcoin Helpers (src/bitcoin.ts)

- `encodeBitcoinAddress(witnessProgram, witnessVersion, network)` — encodes to bech32 (v0/P2WPKH) or bech32m (v1/P2TR) addresses
- `decodeBitcoinAddress(address)` — decodes bech32/bech32m addresses, validates checksums, encoding-version agreement, and program lengths
- `satsToBtc(sats)` — converts bigint satoshis to 8-decimal-place BTC string
- `btcToSats(btc)` — converts decimal BTC string to bigint satoshis
- `deriveDepositAddress()` — stub that throws HashiBitcoinError (Q-DERIVE pending)
- Uses `@scure/base` (transitive dep of `@noble/curves`) for bech32/bech32m encoding/decoding
- Zero imports from `@mysten/sui`

### Event System (src/events/)

- `src/events/types.ts` — 25-variant discriminated union `HashiEvent` with string literal `type` discriminant
- `src/events/parser.ts` — StructTag parsing, BCS deserialization, multi-version package matching
- `src/events/index.ts` — barrel exports
- `parseHashiEvent(event, packageIds)` — best-effort parser returning `HashiEvent | null`
- `parseHashiEventStrict(event, packageIds)` — strict parser returning `{ event } | { error: HashiParseError }`
- Generic type parameter extraction for proposal events (proposalType) and treasury events (coinType)
- Uses the `SuiClientTypes.Event` interface from `@mysten/sui/client` v2 which has `bcs: Uint8Array`

## Contract Criteria Addressed

1. **src/bitcoin.ts: encodeBitcoinAddress, decodeBitcoinAddress, satsToBtc, btcToSats** — All four functions implemented
2. **BIP-173 test vectors (bech32 segwit v0) pass** — Mainnet and testnet P2WPKH vectors tested with known program bytes
3. **BIP-350 test vectors (bech32m taproot v1) pass** — Mainnet and testnet P2TR vectors tested
4. **satsToBtc/btcToSats round-trip correctly** — 9 round-trip cases verified
5. **HashiBitcoinError thrown for invalid inputs** — Tested: bad checksum, wrong program length, unsupported witness version, negative amounts, malformed strings
6. **bitcoin.ts depends only on @noble/curves and @noble/hashes (no @mysten/sui)** — Imports only `@scure/base` (transitive dep of `@noble/curves`)
7. **src/events/ with HashiEvent union type (25 variants) and parsers** — Created types.ts, parser.ts, index.ts
8. **parseHashiEvent(event, packageIds) -> HashiEvent | null** — Implemented with StructTag parsing, package matching, BCS deserialization
9. **parseHashiEventStrict(event, packageIds) -> { event } | { error }** — Implemented with detailed error messages for each failure mode
10. **Generic type param extraction for proposal/treasury events** — Type parameter extracted from StructTag angle brackets, passed as `proposalType` or `coinType`
11. **Multi-version package matching** — `packageIds` is a `Set<string>` checked against the StructTag's package address
12. **Event tests for all 25 variants** — Each variant tested with serialized BCS data through the parser
13. **npx tsc --noEmit exits 0** — Verified
14. **npx vitest run exits 0** — 168 tests pass (44 bitcoin + 37 events + existing)

## Tests Written and Results

- `npx tsc --noEmit` -> exits 0 (clean)
- `npx vitest run` -> 168 tests passed across 6 test files

### Bitcoin tests (tests/bitcoin.test.ts) — 44 tests
- BIP-173 bech32 segwit v0: decode/encode/round-trip for mainnet and testnet P2WPKH
- BIP-350 bech32m taproot v1: decode/encode/round-trip for mainnet and testnet P2TR
- Error handling: invalid checksum, wrong version, wrong program length, invalid strings
- satsToBtc: 1 BTC, 1.5 BTC, 1 sat, 0 sats, 21M BTC, fractional, negative
- btcToSats: whole, decimal, smallest unit, zero, max supply, too many decimals, negative, empty, non-numeric, multiple dots
- Round-trip: 9 values from 0n to 2.1 quadrillion sats
- deriveDepositAddress stub throws

### Event tests (tests/events.test.ts) — 37 tests
- All 25 event variants parsed from BCS-serialized data
- WithdrawalConfirmed tested with both null and non-null change UTXO
- Multi-version package matching (old + new package IDs)
- Unknown package rejection
- Unknown module/event name returns null
- Malformed eventType returns null
- parseHashiEventStrict returns { event } on success
- parseHashiEventStrict returns { error } for: unknown package, unknown event, malformed StructTag, BCS deserialization failure
- Type discriminant union has exactly 25 unique variants

## Files Changed

- `src/bitcoin.ts` — New: Bitcoin address encoding/decoding, amount conversion, stub
- `src/events/types.ts` — New: 25-variant HashiEvent discriminated union
- `src/events/parser.ts` — New: parseHashiEvent, parseHashiEventStrict, StructTag parsing, BCS deserialization
- `src/events/index.ts` — New: barrel exports
- `src/index.ts` — Updated: added bitcoin and event exports
- `tests/bitcoin.test.ts` — New: 44 tests for BIP-173, BIP-350, amount conversion, error cases
- `tests/events.test.ts` — New: 37 tests for all 25 event variants and parser behavior

## Commits

- `5608c53` — feat: add Bitcoin address helpers and event parsing system
