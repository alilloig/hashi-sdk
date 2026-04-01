---
cycle: 2
name: User-Facing Transaction Builders
---

## Scope
Implement the three user-facing transaction builder functions: createDepositRequest, requestWithdrawal, cancelWithdrawal. Add shared-object argument helpers and input validation.

## Completion Criteria

1. [ ] `src/transactions/` directory exists with transaction builder functions
2. [ ] `createDepositRequest({ txid, vout, amount, derivationPath? })` implements the 5-step PTB: utxo_id → utxo → deposit_request → splitCoins fee → deposit
3. [ ] `requestWithdrawal({ amount, bitcoinAddress })` uses CoinWithBalance intent for BTC coin with the correct StructTag using originalPackageId, plus withdraw::request_withdrawal call
4. [ ] `cancelWithdrawal({ requestId })` calls withdraw::cancel_withdrawal, captures the returned Coin<BTC>, and transfers it to sender via transferObjects
5. [ ] All three builders return `(tx: Transaction) => void | TransactionResult` (the canonical builder type)
6. [ ] Shared object helpers exist for Hashi (mutable), Clock 0x6 (immutable)
7. [ ] Input validation: address format (normalize to canonical), byte lengths, bigint/number bounds (non-negative, u64 range), txid (32 bytes)
8. [ ] `requestWithdrawal` accepts bitcoinAddress as either Uint8Array (raw witness program) or string (deferred bech32 decoding — raw bytes only for now since bitcoin helpers come in Cycle 3)
9. [ ] Snapshot tests exist for all 3 PTB structures
10. [ ] Input validation error tests pass (invalid addresses, wrong byte lengths, negative amounts)
11. [ ] `npx tsc --noEmit` exits 0
12. [ ] `npx vitest run` exits 0 with all tests passing

## Verification Commands
- `npx tsc --noEmit` — verifies criterion 11
- `npx vitest run` — verifies criteria 9, 10, 12
- `ls src/transactions/` — verifies criterion 1

## Context from Previous Cycles
Cycle 1 built: package scaffold, codegen output in src/contracts/ (BCS types + function wrappers for all 24 Move modules), HashiConfig with address normalization, error hierarchy, domain type interfaces, build pipeline. The codegen wrappers in src/contracts/hashi/ provide typed Move call helpers that can be used by the transaction builders.
