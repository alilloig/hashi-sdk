---
cycle: 4
iteration: 1
status: DONE
timestamp: 2026-04-01T14:15:00Z
---

## What I Implemented

Complete query layer for reading on-chain Hashi state via Sui RPC. All queries use the @mysten/sui v2 `CoreClient` API (`getObject`, `getDynamicField`, `listDynamicFields`) since Hashi has no public view functions. BCS deserialization uses the codegen types from `src/contracts/`.

## Contract Criteria Addressed

1. **src/queries/ directory with query functions**: Created 7 files: `helpers.ts`, `state.ts`, `deposits.ts`, `withdrawals.ts`, `committee.ts`, `utxo.ts`, `index.ts`

2. **getHashiState()**: Fetches root Hashi object via `getObject` with `include: { content: true }`, deserializes full nested structure (CommitteeSet, Config, Treasury, DepositRequestQueue, WithdrawalRequestQueue, UtxoPool, Bags). Throws `HashiQueryError` if not found.

3. **getDepositRequest(id)**: Looks up from deposit queue Bag using `getDynamicField` with address key type. Returns `DepositRequest | null`.

4. **listDepositRequests({ cursor?, limit? })**: Uses `listDynamicFields` for pagination, then fetches each field value. Returns `PaginatedResult<DepositRequest>`.

5. **getWithdrawalRequest(id)**: Looks up from withdrawal queue requests Bag. Returns `WithdrawalRequest | null`.

6. **listPendingWithdrawals({ cursor?, limit? })**: Paginates over pending withdrawals Bag. Returns `PaginatedResult<PendingWithdrawal>`.

7. **getCommittee(epoch?)**: Looks up committee by u64 epoch key. Defaults to current epoch from Hashi state if not provided.

8. **getMemberInfo(validatorAddress)**: Looks up from committee set members Bag using address key.

9. **getConfig()**: Convenience wrapper that fetches HashiState and extracts/converts the Config section with proper ConfigValue enum conversion.

10. **getUtxo(txid, vout)**: Looks up from active UTXOs Bag using struct key type `{originalPackageId}::utxo::UtxoId`.

11. **All queries accept CoreClient + HashiConfig**: Every query function takes `(client: CoreClient, config: HashiConfig, ...)` as its first two parameters.

12. **Not-found returns null, errors throw**: Dynamic field lookups return `null` on not-found. BCS decode failures throw `HashiParseError`. RPC errors throw `HashiQueryError`. Root state object not-found throws `HashiQueryError` (it must exist).

13. **PaginatedResult uses { items, nextCursor, hasNextPage }**: Both list functions return this shape.

14. **Unit tests with mock RPC responses**: 27 tests covering all query functions with BCS fixtures generated from codegen types.

15. **npx tsc --noEmit exits 0**: Verified.

16. **npx vitest run exits 0**: All 195 tests pass (27 new query tests + 168 existing).

## Tests Written and Results

- `npx tsc --noEmit` -> exits 0, no errors
- `npx vitest run` -> 195 tests passed (7 test files), 0 failures

Test coverage for queries:
- getHashiState: correct deserialization, config entries, not-found error, invalid BCS error, RPC error
- getConfig: correct structure extraction
- getDepositRequest: correct deserialization, null on not-found, parse error on bad BCS
- listDepositRequests: empty list, paginated with items and cursor
- getWithdrawalRequest: correct deserialization with nested types, null on not-found
- listPendingWithdrawals: empty list, items with nested structures
- getCommittee: current epoch default, explicit epoch, null on not-found
- getMemberInfo: correct deserialization, null on not-found
- getUtxo: correct deserialization, null derivation path, struct key type verification
- Error handling: RPC errors wrapped, BCS errors wrapped, dynamic field errors wrapped

## Files Changed

- `src/queries/helpers.ts` -- Shared utilities: BCS fetch/parse, dynamic field access, type conversion (BCS strings to bigint, arrays to Uint8Array), error detection
- `src/queries/state.ts` -- getHashiState, getConfig with full nested BCS-to-domain conversion
- `src/queries/deposits.ts` -- getDepositRequest, listDepositRequests
- `src/queries/withdrawals.ts` -- getWithdrawalRequest, listPendingWithdrawals with all nested types
- `src/queries/committee.ts` -- getCommittee (with epoch default), getMemberInfo
- `src/queries/utxo.ts` -- getUtxo with struct key serialization
- `src/queries/index.ts` -- Barrel exports
- `src/index.ts` -- Added query function exports to main SDK entry point
- `tests/queries.test.ts` -- 27 unit tests with mock clients and BCS fixtures

## Commits

- `71af165` -- feat: add query layer for reading on-chain Hashi state via Sui RPC

## Design Decisions

**Client type**: Used `CoreClient` from `@mysten/sui/client` rather than the legacy `SuiClient`. This is the v2 API that provides `getObject`, `getDynamicField`, and `listDynamicFields` as abstract/concrete methods. Works with JSON-RPC, GraphQL, and gRPC backends.

**BCS content access**: In @mysten/sui v2, `getObject` with `include: { content: true }` returns `content` as `Uint8Array` (raw BCS bytes), not the base64 format from v1. The codegen `BcsStruct.parse()` accepts `Uint8Array` directly.

**Dynamic field key format**: The v2 `getDynamicField` API takes `name: { type: string, bcs: Uint8Array }` where `bcs` is the raw serialized key bytes (not JSON). For address keys, we serialize with `bcs.Address.serialize()`. For u64 keys, with `bcs.u64().serialize()`. For struct keys (UtxoId), with the codegen struct's `.serialize()`.

**Type conversion**: BCS v2 deserializes u64 as strings and vector<u8> as number[]. All conversions to domain types (bigint, Uint8Array) are done in explicit converter functions per module.

**List queries**: Each list query first fetches the HashiState to get the Bag ID, then lists dynamic fields for pagination, then fetches each field individually to get BCS content. This is N+2 RPC calls per page (1 for state, 1 for listing, N for field values).
