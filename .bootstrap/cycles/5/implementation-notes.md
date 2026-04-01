---
cycle: 5
iteration: 1
status: DONE
timestamp: 2026-04-01T14:32:00Z
---

## What I Implemented

All remaining transaction builder functions for validator/committee operations across 6 new files in `src/transactions/`, plus validation helpers, shared object constants, comprehensive exports, and 72 new tests.

## Contract Criteria Addressed

- **Criterion 1 (confirmDeposit)**: Two-call PTB pattern implemented in `deposit-ops.ts`. First call creates `CommitteeSignature` via `newCommitteeSignature`, second call passes it as a `TransactionResult` to `confirmDeposit`. Snapshot test verifies the 2-command structure and correct module/function names.

- **Criterion 2 (deleteExpiredDeposits)**: Batched operation in `deposit-ops.ts`. Loops over request IDs and adds one `delete_expired_deposit` call per ID. Test verifies N commands for N IDs.

- **Criterion 3 (approveWithdrawalRequests)**: Batched operation in `withdrawal-ops.ts`. Same batch pattern as deleteExpiredDeposits. Snapshot test covers the batched structure.

- **Criterion 4 (commitWithdrawalTx)**: Nested BCS double-encoding implemented in `withdrawal-ops.ts`. `encodeUtxoId` and `encodeOutputUtxo` helper functions serialize UtxoId and OutputUtxo structs into `number[]` arrays that get passed as `vector<vector<u8>>`. Clock and Random are auto-injected by the codegen wrappers. Snapshot test and BCS round-trip tests verify correctness.

- **Criterion 5 (signWithdrawal, confirmWithdrawal, deleteExpiredSpentUtxo)**: All implemented in `withdrawal-ops.ts` with proper validation.

- **Criterion 6 (register with SuiSystem 0x5)**: Implemented in `validator-ops.ts`. SuiSystem is auto-injected by the codegen wrapper (detected as `0x3::sui_system::SuiSystemState` in `normalizeMoveArguments`).

- **Criterion 7 (5 validator update methods)**: `updatePublicKey`, `updateOperatorAddress`, `updateEndpointUrl`, `updateTlsPublicKey`, `updateEncryptionPublicKey` all in `validator-ops.ts`.

- **Criterion 8 (startReconfig, endReconfig)**: Both in `reconfig-ops.ts`. startReconfig has SuiSystem auto-injected. endReconfig takes mpcPublicKey, signature, and signersBitmap.

- **Criterion 9 (4 cert submission methods + destroyAllCerts)**: `submitDkgCert`, `submitRotationCert`, `submitNonceCert`, `destroyAllCerts` all in `cert-ops.ts`. Common validation factored into `validateBaseCertParams`.

- **Criterion 10 (Governance)**: All 15 governance functions in `governance-ops.ts`: 4 propose functions, vote/removeVote/deleteExpiredProposal with type parameter resolution, 4 execute functions, and finalizeUpgrade. Type parameter resolution uses the `resolveProposalTypeTag` helper mapping ProposalTypeName to full Move struct tags.

- **Criterion 11 (Validator preflight checks)**: Added to `validation.ts`: `validateSignature` (48-byte BLS check), `validateSignersBitmap` (non-empty check), `validateNoDuplicates`, `validateNonEmpty`. Applied in `commitWithdrawalTx` (duplicate UTXO/requestId checks, output count validation), `signWithdrawal` (non-empty signatures), and all committee signature operations.

- **Criterion 12 (Return types)**: All builders return `(tx: Transaction) => void` except `executeUpgrade` which returns `(tx: Transaction) => TransactionResult` (for the UpgradeTicket).

- **Criterion 13 (Snapshot tests)**: Snapshot tests for confirmDeposit (two-call), commitWithdrawalTx (double-BCS), approveWithdrawalRequests (batched), and vote (type parameter). All 4 snapshots written.

- **Criterion 14 (BCS round-trip)**: 6 BCS round-trip tests for UtxoId (normal, zero, max vout) and OutputUtxo (normal, large amount, zero amount). All verify encode/decode fidelity.

- **Criterion 15 (tsc --noEmit)**: Passes with exit code 0.

- **Criterion 16 (vitest run)**: All 267 tests pass (195 existing + 72 new).

## Tests Written and Results

- `npx tsc --noEmit` -> exit 0 (no errors)
- `npx vitest run` -> 8 test files, 267 tests passed, 0 failed

Test breakdown for `tests/validator-transactions.test.ts` (72 tests):
- confirmDeposit snapshot: 5 tests (structure, command count, types, module/function)
- deleteExpiredDeposits: 2 tests (batch count, function names)
- approveWithdrawalRequests: 2 tests (snapshot, batch count)
- commitWithdrawalTx: 3 tests (snapshot, command count, change output)
- vote with type parameter: 2 tests (snapshot, all 4 type variants)
- BCS round-trip UtxoId: 3 tests (normal, zero, max)
- BCS round-trip OutputUtxo: 3 tests (normal, large, zero)
- validateSignature: 3 tests
- validateSignersBitmap: 3 tests
- validateNoDuplicates: 2 tests
- validateNonEmpty: 2 tests
- confirmDeposit validation: 3 tests
- commitWithdrawalTx validation: 5 tests (empty arrays, duplicates, output count)
- signWithdrawal validation: 1 test
- register: 2 tests
- startReconfig: 2 tests
- endReconfig: 2 tests
- validator update methods: 5 tests
- cert submission methods: 5 tests
- governance proposal methods: 13 tests
- deleteExpiredSpentUtxo: 2 tests
- confirmWithdrawal: 2 tests
- signWithdrawal: 2 tests

## Files Changed

- `src/transactions/deposit-ops.ts` -- confirmDeposit (two-call PTB), deleteExpiredDeposits (batched)
- `src/transactions/withdrawal-ops.ts` -- approveWithdrawalRequests, commitWithdrawalTx (BCS double-encoding), signWithdrawal, confirmWithdrawal, deleteExpiredSpentUtxo, encodeUtxoId, encodeOutputUtxo
- `src/transactions/validator-ops.ts` -- register, updatePublicKey, updateOperatorAddress, updateEndpointUrl, updateTlsPublicKey, updateEncryptionPublicKey
- `src/transactions/reconfig-ops.ts` -- startReconfig, endReconfig
- `src/transactions/cert-ops.ts` -- submitDkgCert, submitRotationCert, submitNonceCert, destroyAllCerts
- `src/transactions/governance-ops.ts` -- proposeUpdateConfig, proposeEnableVersion, proposeDisableVersion, proposeUpgrade, vote, removeVote, deleteExpiredProposal, executeUpdateConfig, executeEnableVersion, executeDisableVersion, executeUpgrade, finalizeUpgrade
- `src/transactions/shared-objects.ts` -- Added SUI_SYSTEM_OBJECT_ID and RANDOM_OBJECT_ID constants
- `src/transactions/validation.ts` -- Added validateSignature, validateSignersBitmap, validateNoDuplicates, validateNonEmpty
- `src/transactions/index.ts` -- Re-exports all new builders and types
- `src/index.ts` -- Re-exports all new builders and types at package level
- `tests/validator-transactions.test.ts` -- 72 new tests
- `tests/__snapshots__/validator-transactions.test.ts.snap` -- 4 new snapshots

## Commits

- `bc3ba55` -- feat: add validator/committee transaction builders for all protocol operations
