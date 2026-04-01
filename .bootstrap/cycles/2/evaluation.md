---
cycle: 2
iteration: 1
verdict: PASS
timestamp: 2026-04-01T14:00:00Z
---

## Contract Criteria Checklist

- [x] Criterion 1 — PASS. Evidence: `ls src/transactions/` shows 6 files: `cancelWithdrawal.ts`, `createDepositRequest.ts`, `index.ts`, `requestWithdrawal.ts`, `shared-objects.ts`, `validation.ts`.

- [x] Criterion 2 — PASS. Evidence: `createDepositRequest.ts` implements exactly 5 steps: (1) `utxo::utxo_id(txid, vout)` at line 64, (2) `utxo::utxo(utxo_id, amount, derivation_path)` at line 75, (3) `deposit_queue::deposit_request(utxo)` with Clock auto-injected by codegen at line 87, (4) `tx.splitCoins(tx.gas, [0n])` at line 97, (5) `deposit::deposit(hashi, deposit_request, fee_coin)` at line 100. Snapshot confirms 5 commands in order: MoveCall, MoveCall, MoveCall, SplitCoins, MoveCall with correct module/function names.

- [x] Criterion 3 — PASS. Evidence: `requestWithdrawal.ts` line 55 uses `coinWithBalance({ type: btcCoinType, balance: validatedAmount })`. The `btcCoinType` comes from `config.btcCoinType` (config.ts:159) which constructs `${this.originalPackageId}::btc::BTC`. Snapshot confirms `$Intent` CoinWithBalance with type `0xbbbbbb...bb::btc::BTC` where `0xbb...bb` is the test `originalPackageId`.

- [x] Criterion 4 — PASS. Evidence: `cancelWithdrawal.ts` line 44 captures `returnedCoin` from `cancelWithdrawalCall`, then line 59 calls `tx.transferObjects([returnedCoin], ...)`. Snapshot confirms command sequence: MoveCall (cancel_withdrawal) followed by TransferObjects with `Result(0)` as the object.

- [x] Criterion 5 — PASS. Evidence: `createDepositRequest` returns `(tx: Transaction) => void` (line 50), `requestWithdrawal` returns `(tx: Transaction) => void` (line 44), `cancelWithdrawal` returns `(tx: Transaction) => TransactionResult` (line 35). All match the canonical builder type `(tx: Transaction) => void | TransactionResult`.

- [x] Criterion 6 — PASS. Evidence: `shared-objects.ts` exports `CLOCK_OBJECT_ID` (0x6, fully zero-padded). Clock is also auto-injected by codegen (`normalizeMoveArguments` in `src/contracts/utils/index.ts:100-103`) when `argumentsTypes` contains `'0x2::clock::Clock'`. Hashi shared object is passed via `config.hashiObjectId` as a string, resolved by the codegen as `UnresolvedObject` (confirmed in snapshots). Snapshots show Clock as `SharedObject` with `mutable: false` and Hashi as `UnresolvedObject` (mutability resolved at execution time by the Sui runtime).

- [x] Criterion 7 — PASS. Evidence: `validation.ts` implements: `validateAddress` (normalizes via `normalizeSuiAddress`, lines 107-121), `validateTxid` (validates 64 hex chars = 32 bytes, lines 68-94), `validateU64` (non-negative, u64 range 0 to 2^64-1, safe integer check for numbers, lines 25-56), `validateVout` (u32 range 0 to 0xFFFFFFFF, lines 132-146), `validateBitcoinAddress` (20 or 32 byte length, lines 158-203). All throw `HashiTransactionError`.

- [x] Criterion 8 — PASS. Evidence: `requestWithdrawal.ts` line 27 declares `bitcoinAddress: string | Uint8Array`. `validateBitcoinAddress` in validation.ts handles both types: Uint8Array validated for 20/32 byte length (line 159), string treated as hex and decoded to bytes (line 168).

- [x] Criterion 9 — PASS. Evidence: `tests/__snapshots__/transactions.test.ts.snap` exists with 6 snapshots: (1) createDepositRequest without derivation path, (2) createDepositRequest with derivation path, (3) requestWithdrawal with Uint8Array, (4) requestWithdrawal with hex string, (5) requestWithdrawal with 32-byte address, (6) cancelWithdrawal.

- [x] Criterion 10 — PASS. Evidence: `tests/transactions.test.ts` contains 25 validation unit tests across 5 `describe` blocks (`validateU64`, `validateTxid`, `validateAddress`, `validateVout`, `validateBitcoinAddress`) plus 7 integration tests in 3 builder validation blocks that verify `HashiTransactionError` is thrown for invalid inputs. All 47 tests pass.

- [x] Criterion 11 — PASS. Evidence: `npx tsc --noEmit` exited with code 0, no output (no errors).

- [x] Criterion 12 — PASS. Evidence: `npx vitest run` exited with code 0. Output: "Test Files 4 passed (4), Tests 87 passed (87)".

## Verification Commands Run

- `npx tsc --noEmit` -> exit code 0, no errors
- `npx vitest run` -> exit code 0, 4 test files, 87 tests passed (47 transaction tests + 40 existing)
- `ls src/transactions/` -> 6 files confirmed

## Overall Assessment

All 12 contract criteria verified with evidence. The three transaction builders correctly implement their PTB structures: createDepositRequest has the 5-step sequence with proper Move calls, requestWithdrawal uses coinWithBalance with originalPackageId-based BTC type, and cancelWithdrawal captures the returned coin and transfers it to sender. Input validation covers all specified cases. Both tsc and vitest pass cleanly.
