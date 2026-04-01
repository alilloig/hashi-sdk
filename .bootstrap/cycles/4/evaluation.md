---
cycle: 4
iteration: 1
verdict: PASS
timestamp: 2026-04-01T14:20:00Z
---

## Contract Criteria Checklist

- [x] Criterion 1: `src/queries/` directory exists — PASS. Directory contains 7 files: `helpers.ts`, `state.ts`, `deposits.ts`, `withdrawals.ts`, `committee.ts`, `utxo.ts`, `index.ts`.

- [x] Criterion 2: `getHashiState()` fetches root Hashi object — PASS. Implemented in `src/queries/state.ts:26-39`. Uses `fetchObjectBcs` + BCS `Hashi.parse()`, converts all nested structures (CommitteeSet, Config, Treasury, queues, pools) to domain types. Throws `HashiQueryError` if not found. Tested with 5 tests including deserialization, config entries, not-found error, invalid BCS, and RPC error.

- [x] Criterion 3: `getDepositRequest(id)` returns `DepositRequest | null` — PASS. Implemented in `src/queries/deposits.ts:29-50`. Fetches Hashi state to get Bag ID, uses `fetchDynamicFieldBcs` with address key, returns `null` on not-found. Tested with 3 tests.

- [x] Criterion 4: `listDepositRequests({ cursor?, limit? })` returns `PaginatedResult` — PASS. Implemented in `src/queries/deposits.ts:66-99`. Uses `listDynamicFieldEntries` for pagination, fetches each field value individually, returns `{ items, hasNextPage, nextCursor }`. Tested with empty and paginated cases.

- [x] Criterion 5: `getWithdrawalRequest(id)` returns `WithdrawalRequest | null` — PASS. Implemented in `src/queries/withdrawals.ts:34-55`. Looks up from withdrawal queue requests Bag. Returns null on not-found. Tested with 2 tests including nested type verification.

- [x] Criterion 6: `listPendingWithdrawals` returns `PaginatedResult` — PASS. Implemented in `src/queries/withdrawals.ts:67-99`. Paginates over pendingWithdrawals Bag. Returns `PaginatedResult<PendingWithdrawal>`. Tested with empty and populated cases (verifying nested structures: requests, inputs, withdrawalOutputs, changeOutput).

- [x] Criterion 7: `getCommittee(epoch?)` returns `Committee | null` — PASS. Implemented in `src/queries/committee.ts:35-58`. Defaults to current epoch from Hashi state when epoch parameter omitted. Uses u64 key serialization. Returns null on not-found. Tested with 3 tests.

- [x] Criterion 8: `getMemberInfo(validatorAddress)` returns `MemberInfo | null` — PASS. Implemented in `src/queries/committee.ts:70-91`. Looks up from committeeSet members Bag using address key. Returns null on not-found. Tested with 2 tests.

- [x] Criterion 9: `getConfig()` returns `Config` — PASS. Implemented in `src/queries/state.ts:50-63`. Convenience wrapper that fetches HashiState and extracts config entries, enabledVersions, and upgradeCap. Tested to verify correct structure extraction.

- [x] Criterion 10: `getUtxo(txid, vout)` returns `Utxo | null` — PASS. Implemented in `src/queries/utxo.ts:30-58`. Uses `UtxoId` struct serialization as dynamic field key with type `${originalPackageId}::utxo::UtxoId`. Handles null derivation path. Returns null on not-found. Tested with 4 tests including struct key type verification.

- [x] Criterion 11: Queries accept SuiClient + HashiConfig — PASS. All 10 exported query functions accept `(client: CoreClient, config: HashiConfig, ...)` as their first two parameters. `CoreClient` is the v2 API client from `@mysten/sui/client`, which is the current-generation equivalent of `SuiClient`. Verified via grep across all query files.

- [x] Criterion 12: Not-found returns null, errors throw — PASS. Dynamic field lookups return `null` on not-found (via `isNotFoundError` check in `helpers.ts:163-176`). BCS decode failures throw `HashiParseError` (via `parseBcs` in `helpers.ts:99-111`). RPC errors throw `HashiQueryError` (via wrappers in `fetchObjectBcs` and `fetchDynamicFieldBcs`). Root state not-found throws `HashiQueryError` (state.ts:32-34). All error paths tested.

- [x] Criterion 13: PaginatedResult uses `{ items, nextCursor, hasNextPage }` — PASS. Defined in `src/types/common.ts:28-32` as `interface PaginatedResult<T> { items: T[]; hasNextPage: boolean; nextCursor: string | null; }`. Both `listDepositRequests` and `listPendingWithdrawals` return this shape, verified in test assertions.

- [x] Criterion 14: Unit tests with mock RPC — PASS. `tests/queries.test.ts` contains 27 tests across 8 describe blocks, using mock `CoreClient` objects with BCS fixtures generated from codegen types. All tests pass.

- [x] Criterion 15: `npx tsc --noEmit` exits 0 — PASS. Command completed with exit code 0 and no output (no type errors).

- [x] Criterion 16: `npx vitest run` exits 0 — PASS. 195 tests passed across 7 test files (27 query tests + 168 existing), 0 failures.

## Verification Commands Run

- `npx tsc --noEmit` -> exit code 0, no errors
- `npx vitest run` -> exit code 0, 195 tests passed (7 test files), 0 failures, duration 342ms

## Overall Assessment

All 16 contract criteria are met with evidence. The query layer implements 10 query functions covering all Hashi on-chain state reads, with proper BCS deserialization, null-return semantics for not-found cases, typed error throwing, PaginatedResult pagination, and comprehensive mock-based unit tests. Both verification commands pass cleanly.
