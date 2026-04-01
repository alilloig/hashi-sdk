---
cycle: 5
name: Validator/Committee Transaction Builders
---

## Scope
Implement all validator/committee transaction builder functions: confirmDeposit (two-call PTB), deleteExpiredDeposits (batched), approveWithdrawalRequests (batched), commitWithdrawalTx (nested BCS double-encoding + Random), signWithdrawal, confirmWithdrawal, deleteExpiredSpentUtxo, register, 5 validator update methods, startReconfig, endReconfig, 4 cert submission methods, and full governance proposal lifecycle.

## Completion Criteria

1. [ ] confirmDeposit implements two-call PTB: new_committee_signature → confirm_deposit
2. [ ] deleteExpiredDeposits batches multiple delete_expired_deposit calls in one PTB
3. [ ] approveWithdrawalRequests batches multiple approve_request calls in one PTB
4. [ ] commitWithdrawalTx implements nested BCS double-encoding for UtxoId and OutputUtxo as vector<vector<u8>>, uses Clock 0x6 + Random 0x8
5. [ ] signWithdrawal, confirmWithdrawal, deleteExpiredSpentUtxo implemented
6. [ ] register uses SuiSystem 0x5 as immutable shared object
7. [ ] 5 validator update methods: updatePublicKey, updateOperatorAddress, updateEndpointUrl, updateTlsPublicKey, updateEncryptionPublicKey
8. [ ] startReconfig (with SuiSystem 0x5) and endReconfig implemented
9. [ ] 4 cert submission methods: submitDkgCert, submitRotationCert, submitNonceCert, destroyAllCerts
10. [ ] Governance: proposeUpdateConfig, proposeEnableVersion, proposeDisableVersion, proposeUpgrade
11. [ ] Governance: vote, removeVote, deleteExpiredProposal, executeUpdateConfig, executeEnableVersion, executeDisableVersion, executeUpgrade, finalizeUpgrade
12. [ ] Validator preflight checks: signersBitmap non-empty, signature 48 bytes, no duplicate UTXOs/requestIds, output cardinality
13. [ ] All builders return (tx: Transaction) => void | TransactionResult
14. [ ] Snapshot tests for key PTB structures (at minimum: confirmDeposit, commitWithdrawalTx, batched approve, governance vote)
15. [ ] BCS round-trip tests for manual UtxoId/OutputUtxo double-encoding
16. [ ] npx tsc --noEmit exits 0
17. [ ] npx vitest run exits 0 with all tests passing

## Verification Commands
- `npx tsc --noEmit` — verifies criterion 16
- `npx vitest run` — verifies criteria 14, 15, 17

## Context from Previous Cycles
Cycles 1-4 built: scaffold + codegen, user transaction builders (with shared object helpers and validation patterns), Bitcoin helpers + event system, query layer. The codegen wrappers in src/contracts/hashi/ provide typed Move call helpers. The validation utilities in src/transactions/validation.ts handle address normalization, u64 bounds, etc.
