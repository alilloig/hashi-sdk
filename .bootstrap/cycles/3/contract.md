---
cycle: 3
name: Bitcoin Helpers + Event System
---

## Scope
Implement Bitcoin address encoding/decoding (bech32/bech32m), deposit address derivation, amount conversion helpers. Define the HashiEvent discriminated union (25 variants), implement best-effort and strict event parsers with multi-version package matching and generic type parameter extraction.

## Completion Criteria

1. [ ] `src/bitcoin.ts` implements `encodeBitcoinAddress(witnessProgram, witnessVersion, network)` with bech32 for v0, bech32m for v1
2. [ ] `src/bitcoin.ts` implements `decodeBitcoinAddress(address)` returning `{ witnessProgram, witnessVersion, network }`
3. [ ] `src/bitcoin.ts` implements `satsToBtc(sats)` and `btcToSats(btc)` with correct 8-decimal precision
4. [ ] `src/bitcoin.ts` throws `HashiBitcoinError` for invalid addresses, unsupported witness versions, wrong program lengths
5. [ ] `src/bitcoin.ts` depends only on `@noble/curves` and `@noble/hashes` (no `@mysten/sui` imports)
6. [ ] Bitcoin helper tests pass BIP-173 test vectors (bech32 segwit v0)
7. [ ] Bitcoin helper tests pass BIP-350 test vectors (bech32m taproot v1)
8. [ ] `satsToBtc`/`btcToSats` round-trip correctly for edge cases (0, max supply, precision)
9. [ ] `src/events/` directory exists with event types and parser functions
10. [ ] `HashiEvent` discriminated union type defined with 25 variants, each having a `type` string literal discriminant
11. [ ] `parseHashiEvent(event, packageIds)` returns `HashiEvent | null` (best-effort: null for unknown packages/events/decode failures)
12. [ ] `parseHashiEventStrict(event, packageIds)` returns `{ event: HashiEvent } | { error: HashiParseError }` with failure reasons
13. [ ] Generic type parameter extraction works for proposal events (VoteCast, ProposalCreated, etc.) and treasury events (Mint, Burn)
14. [ ] Multi-version package matching: events parsed correctly regardless of which package version emitted them
15. [ ] Event parser tests cover all 25 variants with mock data
16. [ ] Event parser tested with two different package IDs (simulating upgrade)
17. [ ] `npx tsc --noEmit` exits 0
18. [ ] `npx vitest run` exits 0 with all tests passing

## Verification Commands
- `npx tsc --noEmit` — verifies criterion 17
- `npx vitest run` — verifies criteria 6, 7, 8, 15, 16, 18

## Context from Previous Cycles
Cycle 1: Foundation (scaffold, codegen, config, errors, types, build). Cycle 2: User-facing transaction builders (createDepositRequest, requestWithdrawal, cancelWithdrawal with validation and snapshot tests). The error hierarchy (HashiBitcoinError, HashiParseError) and domain types are already defined.
