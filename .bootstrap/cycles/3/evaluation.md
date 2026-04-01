---
cycle: 3
iteration: 1
verdict: PASS
timestamp: 2026-04-01T14:03:00Z
---

## Contract Criteria Checklist

- [x] Criterion 1: `src/bitcoin.ts` implements `encodeBitcoinAddress`, `decodeBitcoinAddress`, `satsToBtc`, `btcToSats` -- PASS. All four functions exported from `/Users/alilloig/workspace/hashi-sdk/src/bitcoin.ts` (lines 35, 89, 185, 213). `encodeBitcoinAddress` handles v0/bech32 and v1/bech32m. `decodeBitcoinAddress` validates checksums, encoding-version agreement, and program lengths.

- [x] Criterion 2: BIP-173 test vectors pass -- PASS. `tests/bitcoin.test.ts` lines 13-62 test mainnet and testnet P2WPKH addresses with known 20-byte witness programs. Decode, encode, and round-trip all pass (vitest output confirms 44 bitcoin tests passing).

- [x] Criterion 3: BIP-350 test vectors pass -- PASS. `tests/bitcoin.test.ts` lines 66-101 test mainnet and testnet P2TR (taproot v1) addresses. Decode, encode, and round-trip verified.

- [x] Criterion 4: `satsToBtc`/`btcToSats` round-trip correctly -- PASS. `tests/bitcoin.test.ts` lines 216-236: 9 round-trip test cases from 0n to 2,100,000,000,000,000n. Additional edge cases for precision, max supply, zero, 1 sat tested individually.

- [x] Criterion 5: `HashiBitcoinError` for invalid inputs -- PASS. Tests at lines 105-136 verify errors for: invalid checksum, unsupported witness version (v2), wrong program length (v0 with 32 bytes, v1 with 20 bytes), invalid address strings. `btcToSats` tests verify errors for: negative, empty string, non-numeric, multiple decimal points, too many decimals. `satsToBtc` throws for negative.

- [x] Criterion 6: `bitcoin.ts` has no `@mysten/sui` imports -- PASS. Grep confirmed 0 matches for `@mysten/sui` in `src/bitcoin.ts`. Only imports are `@scure/base` (transitive dep of `@noble/curves`) and local `./errors.js`.

- [x] Criterion 7: `src/events/` directory with `HashiEvent` union (25 variants) -- PASS. Directory contains `types.ts`, `parser.ts`, `index.ts`. The `HashiEvent` type at `types.ts:225-250` is a union of exactly 25 pipe-separated variants (verified by grep count: 25 `|` lines, 25 exported interfaces).

- [x] Criterion 8: `parseHashiEvent` returns `HashiEvent | null` -- PASS. Function at `parser.ts:437-462` accepts `SuiClientTypes.Event` and `Set<string>`, returns `HashiEvent | null`. Returns null for: unknown package, unknown module/event name, malformed StructTag, BCS deserialization failure (try/catch wraps all logic).

- [x] Criterion 9: `parseHashiEventStrict` returns `{ event } | { error }` -- PASS. Function at `parser.ts:483-528` returns `ParseHashiEventResult` which is `{ event: HashiEvent; error?: undefined } | { event?: undefined; error: HashiParseError }`. Tests at lines 706-783 verify all four error paths (malformed StructTag, unknown package, unknown event name, BCS failure).

- [x] Criterion 10: Generic type parameter extraction for proposal/treasury events -- PASS. `parseStructTag` at `parser.ts:80-103` extracts the content between `<...>` as `typeParam`. Treasury events (MintEvent, BurnEvent at lines 339-355) pass it as `coinType`. Proposal events (ProposalCreatedEvent, VoteCastEvent, etc. at lines 359-423) pass it as `proposalType`. Tests at lines 444-603 verify extraction with explicit type parameters.

- [x] Criterion 11: Multi-version package matching -- PASS. `parseHashiEvent` checks `packageIds.has(tag.packageAddress)` where `packageIds` is a `Set<string>`. Test at lines 607-658 creates two different package IDs (`'0x' + '11'.repeat(32)` and `'0x' + '22'.repeat(32)`), verifies both produce parsed events, and verifies an unknown package returns null.

- [x] Criterion 12: Event tests for all 25 variants -- PASS. Extracted all `result!.type).toBe(...)` assertions from `tests/events.test.ts`: found exactly 25 unique event type strings, each matching a variant of the union (AbortReconfig, Burn, DepositConfirmed, DepositRequested, EndReconfig, ExpiredDepositDeleted, Mint, PackageUpgraded, ProposalCreated, ProposalDeleted, ProposalExecuted, QuorumReached, SpentUtxoDeleted, StartReconfig, UtxoSpent, ValidatorRegistered, ValidatorUpdated, VoteCast, VoteRemoved, WithdrawalApproved, WithdrawalCancelled, WithdrawalConfirmed, WithdrawalPickedForProcessing, WithdrawalRequested, WithdrawalSigned).

- [x] Criterion 13: `npx tsc --noEmit` exits 0 -- PASS. Verified: exit code 0 with no output (no errors).

- [x] Criterion 14: `npx vitest run` exits 0 -- PASS. Verified: exit code 0, 168 tests passed across 6 test files (44 bitcoin + 37 events + 87 existing).

## Verification Commands Run

- `npx tsc --noEmit` -> exit code 0, no errors
- `npx vitest run` -> exit code 0, 6 test files passed, 168 tests passed, 0 failures
- `grep '@mysten/sui' src/bitcoin.ts` -> 0 matches (confirming no Sui imports)
- `grep -c '^\t|' src/events/types.ts` -> 25 (confirming 25 union members)

## Overall Assessment

All 14 contract criteria are satisfied with verified evidence. Bitcoin helpers correctly implement BIP-173 (bech32 v0) and BIP-350 (bech32m v1) encoding/decoding with proper error handling. The event system defines a 25-variant discriminated union with both best-effort and strict parsers, supports multi-version package matching and generic type parameter extraction, and all variants are individually tested through BCS serialization round-trips.
