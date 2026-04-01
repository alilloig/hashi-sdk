---
cycle: 2
iteration: 1
status: DONE
timestamp: 2026-04-01T13:46:00Z
---

## What I Implemented

Three user-facing transaction builder functions for the Hashi bridge SDK, along with input validation utilities, shared-object helpers, and comprehensive tests.

## Contract Criteria Addressed

- **Criterion 1 (src/transactions/ directory)**: Created 6 files: `validation.ts`, `shared-objects.ts`, `createDepositRequest.ts`, `requestWithdrawal.ts`, `cancelWithdrawal.ts`, `index.ts`. All re-exported from the main `src/index.ts`.

- **Criterion 2 (createDepositRequest 5-step PTB)**: Implements the exact 5-step sequence: (1) `utxo::utxo_id(txid, vout)`, (2) `utxo::utxo(utxo_id, amount, derivation_path)`, (3) `deposit_queue::deposit_request(utxo, clock)` (Clock auto-injected by codegen), (4) `tx.splitCoins(tx.gas, [0n])`, (5) `deposit::deposit(hashi, deposit_request, fee_coin)`.

- **Criterion 3 (requestWithdrawal CoinWithBalance)**: Uses `coinWithBalance({ type: btcCoinType, balance: amount })` from `@mysten/sui/transactions` to create BTC coin, then calls `withdraw::request_withdrawal`. BTC coin type constructed from `config.btcCoinType` (which uses `originalPackageId`).

- **Criterion 4 (cancelWithdrawal cancel + transferObjects)**: Calls `withdraw::cancel_withdrawal` to get returned `Coin<BTC>`, then `tx.transferObjects([returnedCoin], sender_placeholder)` for refund.

- **Criterion 5 (return type)**: `createDepositRequest` and `requestWithdrawal` return `(tx: Transaction) => void`. `cancelWithdrawal` returns `(tx: Transaction) => TransactionResult` since it captures the returned coin from transferObjects.

- **Criterion 6 (shared object helpers)**: `CLOCK_OBJECT_ID` constant exported. Hashi object passed as `hashiObjectId` string from config (SDK resolves as `UnresolvedObject`). Clock is auto-injected by the codegen `normalizeMoveArguments` when it sees `0x2::clock::Clock` in `argumentsTypes`.

- **Criterion 7 (input validation)**: All validation runs synchronously before the closure is returned. Includes: address normalization (via `normalizeSuiAddress`), txid validation (64-char hex), u64 range checks, vout u32 range, bitcoin address byte length (20 or 32). All throw `HashiTransactionError`.

- **Criterion 8 (Uint8Array for bitcoinAddress)**: `requestWithdrawal` accepts `string | Uint8Array`. Uint8Array validated for 20 or 32 byte length. String treated as hex and decoded to bytes. Bech32 deferred to Cycle 3.

- **Criterion 9 (snapshot tests)**: 6 snapshot tests across 3 builders covering: deposit without derivation path, deposit with derivation path, withdrawal with Uint8Array, withdrawal with hex string, withdrawal with 32-byte address, cancel withdrawal. Snapshots committed.

- **Criterion 10 (validation error tests)**: 25 validation tests covering all validators (`validateU64`, `validateTxid`, `validateAddress`, `validateVout`, `validateBitcoinAddress`) plus integration tests verifying builders throw `HashiTransactionError` for invalid inputs.

- **Criterion 11 (tsc --noEmit)**: Exits 0 with no errors.

- **Criterion 12 (vitest run)**: All 87 tests pass (47 new transaction tests + 40 existing).

## Tests Written and Results

- `npx tsc --noEmit` -> Exit 0, no errors
- `npx vitest run` -> 4 test files, 87 tests passed (47 new)
  - 6 snapshot tests for PTB structures
  - 16 structural assertion tests (command counts, command types, return values)
  - 25 validation unit tests
  - Plus existing 40 tests from Cycle 1

## Files Changed

- `src/transactions/validation.ts` -- Input validation: validateU64, validateTxid, validateAddress, validateVout, validateBitcoinAddress
- `src/transactions/shared-objects.ts` -- CLOCK_OBJECT_ID constant
- `src/transactions/createDepositRequest.ts` -- 5-step deposit PTB builder
- `src/transactions/requestWithdrawal.ts` -- Withdrawal request PTB builder with coinWithBalance
- `src/transactions/cancelWithdrawal.ts` -- Cancel withdrawal PTB builder with transferObjects refund
- `src/transactions/index.ts` -- Re-exports for all transaction builders and utilities
- `src/index.ts` -- Added transaction builder exports to main barrel file
- `tests/transactions.test.ts` -- 47 tests: snapshots, structural assertions, validation errors
- `tests/__snapshots__/transactions.test.ts.snap` -- Committed snapshot file

## Commits

- `5474205` -- feat: add user-facing transaction builders for deposit, withdrawal, and cancel
