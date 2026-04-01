---
cycle: 5
iteration: 1
verdict: PASS
timestamp: 2026-04-01T15:10:00Z
---

## Contract Criteria Checklist

- [x] Criterion 1 (confirmDeposit two-call PTB) — PASS. Evidence: `src/transactions/deposit-ops.ts:58-82` creates `newCommitteeSignature` as step 1, passes result to `confirmDepositCall` as step 2. Test at `tests/validator-transactions.test.ts:98-176` verifies 2 MoveCall commands, first calling `committee::new_committee_signature`, second calling `deposit::confirm_deposit`.

- [x] Criterion 2 (deleteExpiredDeposits batched) — PASS. Evidence: `src/transactions/deposit-ops.ts:116-128` loops over `normalizedIds` adding one `deleteExpiredDepositCall` per ID. Test at line 179 verifies N commands for N request IDs.

- [x] Criterion 3 (approveWithdrawalRequests batched) — PASS. Evidence: `src/transactions/withdrawal-ops.ts:85-100` loops over `normalizedIds` adding one `approveRequestCall` per ID. Snapshot test and batch count test at lines 209-238 verify.

- [x] Criterion 4 (commitWithdrawalTx nested BCS double-encoding + Clock + Random) — PASS. Evidence: `src/transactions/withdrawal-ops.ts:35-38` defines `UtxoIdBcsSchema` and `OutputUtxoBcsSchema`. Lines 145-165 export `encodeUtxoId` and `encodeOutputUtxo` for double-encoding. Lines 223-224 apply these to produce `vector<vector<u8>>`. The codegen wrapper at `src/contracts/hashi/withdraw.ts:139-140` declares `'0x2::clock::Clock'` and `'0x2::random::Random'` argument types, and `src/contracts/utils/index.ts:100-107,115-117` auto-injects `tx.object.clock()`, `tx.object.random()`, and `tx.object.system()` for these types.

- [x] Criterion 5 (signWithdrawal, confirmWithdrawal, deleteExpiredSpentUtxo) — PASS. Evidence: All three implemented in `src/transactions/withdrawal-ops.ts` at lines 274-307, 338-364, 384-406. Tests at lines 924-1000+ verify correct module/function targeting.

- [x] Criterion 6 (register with SuiSystem 0x5) — PASS. Evidence: `src/contracts/hashi/validator.ts:31` declares `'0x3::sui_system::SuiSystemState'` as an argument type for `register`. `src/contracts/utils/index.ts:115-117` auto-injects `tx.object.system()` (which resolves to 0x5). The builder at `src/transactions/validator-ops.ts:41-50` delegates to the codegen wrapper correctly.

- [x] Criterion 7 (5 validator update methods) — PASS. Evidence: `src/transactions/validator-ops.ts` implements `updatePublicKey` (line 73), `updateOperatorAddress` (line 124), `updateEndpointUrl` (line 166), `updateTlsPublicKey` (line 210), `updateEncryptionPublicKey` (line 256). Tests at lines 720-770 verify each creates 1 command.

- [x] Criterion 8 (startReconfig with SuiSystem, endReconfig) — PASS. Evidence: `src/transactions/reconfig-ops.ts` implements `startReconfig` (line 32, SuiSystem auto-injected via codegen at `src/contracts/hashi/reconfig.ts:42`) and `endReconfig` (line 68). Tests at lines 673-717.

- [x] Criterion 9 (4 cert submission methods) — PASS. Evidence: `src/transactions/cert-ops.ts` implements `submitDkgCert` (line 95), `submitRotationCert` (line 130), `submitNonceCert` (line 165), `destroyAllCerts` (line 203). Tests at lines 773-815.

- [x] Criterion 10 (Governance: 4 propose + vote/removeVote/deleteExpired + 4 execute + finalizeUpgrade) — PASS. Evidence: `src/transactions/governance-ops.ts` implements: `proposeUpdateConfig` (line 93), `proposeEnableVersion` (line 139), `proposeDisableVersion` (line 182), `proposeUpgrade` (line 225), `vote` (line 272), `removeVote` (line 314), `deleteExpiredProposal` (line 358), `executeUpdateConfig` (line 400), `executeEnableVersion` (line 440), `executeDisableVersion` (line 480), `executeUpgrade` (line 524), `finalizeUpgrade` (line 567). Tests at lines 818-922.

- [x] Criterion 11 (Governance lifecycle complete) — PASS. Same evidence as criterion 10. All 12 governance functions are present plus `resolveProposalTypeTag` helper at line 56 for type parameter resolution across all 4 proposal types.

- [x] Criterion 12 (Validator preflight checks) — PASS. Evidence: `src/transactions/validation.ts` implements `validateSignature` (48-byte check, line 217), `validateSignersBitmap` (non-empty, line 240), `validateNoDuplicates` (line 261), `validateNonEmpty` (line 280). Applied in `commitWithdrawalTx` at lines 186-209 (empty arrays, duplicate requestIds, duplicate UTXOs, output cardinality). Tests at lines 458-629 cover all validation paths.

- [x] Criterion 13 (All return (tx: Transaction) => void | TransactionResult) — PASS. Evidence: All builders return `(tx: Transaction) => void` except `executeUpgrade` at `src/transactions/governance-ops.ts:527` which returns `(tx: Transaction) => TransactionResult`. Test at line 881-888 verifies `executeUpgrade` returns a defined result with `$kind`.

- [x] Criterion 14 (Snapshot tests for key patterns) — PASS. Evidence: `tests/__snapshots__/validator-transactions.test.ts.snap` contains exactly 4 snapshots: `confirmDeposit` (two-call), `commitWithdrawalTx` (double-BCS), `approveWithdrawalRequests` (batched approve), `vote` (type parameter). This meets the contract minimum of confirmDeposit, commitWithdrawalTx, batched approve, and governance vote.

- [x] Criterion 15 (BCS round-trip for UtxoId/OutputUtxo double-encoding) — PASS. Evidence: Tests at lines 349-451 include 6 BCS round-trip tests: UtxoId (normal, zero, max vout) and OutputUtxo (normal, large amount, zero amount). All decode back to original values using independent BCS schema definitions.

- [x] Criterion 16 (npx tsc --noEmit exits 0) — PASS. Evidence: Command ran with no output and exit code 0.

- [x] Criterion 17 (npx vitest run exits 0) — PASS. Evidence: `8 test files, 267 tests passed, 0 failed`. Duration 371ms.

## Verification Commands Run

- `npx tsc --noEmit` — exit code 0, no errors
- `npx vitest run` — exit code 0, 8 test files, 267 tests passed (0 failed), 371ms

## Overall Assessment

All 17 contract criteria are verified with evidence. The implementation covers all validator/committee transaction builders, includes proper preflight validation, BCS double-encoding for commitWithdrawalTx, auto-injection of SuiSystem/Clock/Random via codegen wrappers, snapshot and round-trip tests, and full governance proposal lifecycle. Both tsc and vitest pass cleanly.
