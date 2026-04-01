---
cycle: 6
iteration: 1
verdict: PASS
timestamp: 2026-04-01T14:55:00Z
---

## Contract Criteria Checklist

- [x] Criterion 1 (HashiClient class in src/client.ts) -- PASS. Evidence: `src/client.ts` (687 lines) implements the `HashiClient` class with constructor accepting `{ client, network }` or `{ client, config }` (lines 169-179). Exposes 30+ transaction builder methods (createDepositRequest, requestWithdrawal, cancelWithdrawal, confirmDeposit, approveWithdrawalRequests, commitWithdrawalTx, signWithdrawal, confirmWithdrawal, register, updatePublicKey, updateOperatorAddress, updateEndpointUrl, updateTlsPublicKey, updateEncryptionPublicKey, startReconfig, endReconfig, submitDkgCert, submitRotationCert, submitNonceCert, destroyAllCerts, proposeUpdateConfig, proposeEnableVersion, proposeDisableVersion, proposeUpgrade, vote, removeVote, deleteExpiredProposal, executeUpdateConfig, executeEnableVersion, executeDisableVersion, executeUpgrade, finalizeUpgrade, deleteExpiredDeposits, deleteExpiredSpentUtxo). Exposes 9 query methods (getHashiState, getConfig, getDepositRequest, listDepositRequests, getWithdrawalRequest, listPendingWithdrawals, getCommittee, getMemberInfo, getUtxo). Exposes event parsing helpers (parseEvent, parseEventStrict). Provides `btcCoinType` getter (line 683). Exported from `src/index.ts`.

- [x] Criterion 2 (Subpath exports in package.json) -- PASS. Evidence: `package.json` lines 10-46 define 7 subpath exports (`.`, `./client`, `./transactions`, `./queries`, `./events`, `./bitcoin`, `./types`) each with `types`, `import`, and `require` conditions. All 21 referenced files verified to exist in dist/ via Node.js file-existence check (all returned OK).

- [x] Criterion 3 (README.md) -- PASS. Evidence: `README.md` (503 lines) contains: Quickstart with install + configure + create deposit (lines 16-47); User flow examples covering deposit (lines 89-104), querying (lines 138-193), and withdrawal (lines 107-132); Validator flow examples covering registration, confirm deposit, approve withdrawal, reconfiguration, and governance (lines 278-343); Server vs browser signing guidance with Node.js and dApp Kit examples (lines 347-389); Upgrade notes explaining packageId vs originalPackageId (lines 392-418).

- [x] Criterion 4 (TSDoc on public functions and types) -- PASS. Evidence: TSDoc comment counts across modules: `src/client.ts` has TSDoc on every public method (30+ `/**` blocks); `src/errors.ts` has 13 TSDoc blocks covering all error classes; `src/events/types.ts` has 37 TSDoc blocks covering all 25 event interfaces; `src/transactions/` has 180 TSDoc blocks across 11 files; `src/queries/` has 33 TSDoc blocks across 6 files; `src/bitcoin.ts` has 10 TSDoc blocks. HashiConfig, HashiClient, and HashiClientOptions all have TSDoc.

- [x] Criterion 5 (Integration test scaffolding in tests/integration/) -- PASS. Evidence: `tests/integration/` contains 3 files: `README.md` (setup instructions), `deposit-flow.test.ts` (3 tests, gated by `describe.skipIf(!process.env.HASHI_INTEGRATION)`), and `withdrawal-flow.test.ts` (3 tests, same gating). Tests correctly skip during `npx vitest run` (confirmed: "2 skipped" in test output).

- [x] Criterion 6 (npm run build succeeds) -- PASS. Evidence: `npm run build` exited 0 with output "Build complete." Both `dist/esm/` and `dist/cjs/` directories contain the expected files (index.js, client.js, bitcoin.js, errors.js, events/, queries/, transactions/, types/, utils/).

- [x] Criterion 7 (npx tsc --noEmit exits 0) -- PASS. Evidence: `npx tsc --noEmit` exited 0 with no output (no errors).

- [x] Criterion 8 (npx vitest run exits 0) -- PASS. Evidence: `npx vitest run` exited 0 with output: "Test Files 9 passed | 2 skipped (11), Tests 281 passed | 6 skipped (287)". All non-integration tests pass; integration tests correctly skip.

- [x] Criterion 9 (Subpath imports resolve correctly) -- PASS. Evidence: Node.js script checked all 21 files referenced by the 7 subpath exports (7 subpaths x 3 conditions each: types, import, require). All 21 files exist in `dist/`. ESM and CJS formats both present with proper `package.json` markers in each dist subdirectory.

## Verification Commands Run

- `npm run build` -> exit 0, "Build complete.", dist/esm/ and dist/cjs/ produced
- `npx tsc --noEmit` -> exit 0, no errors
- `npx vitest run` -> exit 0, 281 passed, 6 skipped, 9 test files passed, 2 skipped
- Node.js subpath file existence check -> all 21 files OK

## Overall Assessment

All 9 contract criteria are met with verified evidence. The HashiClient facade in `src/client.ts` composes all subsystems (transactions, queries, events, config). Subpath exports are configured correctly in `package.json` and all target files exist. The README covers all required sections (quickstart, user/validator flows, signing guidance, upgrade notes). TSDoc is present on all public API surfaces. Integration test scaffolding exists with proper env-gating. Build, type-check, and test suite all pass cleanly.
