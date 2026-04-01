---
cycle: 1
iteration: 1
verdict: PASS
timestamp: 2026-04-01T13:40:00Z
---

## Contract Criteria Checklist

- [x] Criterion 1 — PASS. Repository scaffold exists. Verified: `package.json`, `tsconfig.json`, `tsconfig.esm.json`, `vitest.config.ts`, `eslint.config.js` (flat config variant), `.gitignore` all exist at project root.

- [x] Criterion 2 — PASS. `sui-codegen.config.ts` exists at package root, targets Hashi Move package at relative path `../hashi/worktrees/alilloig/sdk/packages/hashi`, outputs to `./src/contracts`.

- [x] Criterion 3 — PASS. Codegen has been run; `src/contracts/` contains 32 generated files across `hashi/` and `utils/` subdirectories, including BCS type definitions (structs/enums) and Move function wrappers for 24 modules plus dependency types.

- [x] Criterion 4 — PASS. `src/utils/config.ts` implements `HashiConfig` with mainnet/testnet presets (placeholder zero addresses), override support via second constructor argument, and input validation (66-char 0x-prefixed lowercase hex check via `isValidSuiAddress`, type checking, field name in error messages). Throws `HashiConfigError` on validation failure.

- [x] Criterion 5 — PASS. `src/errors.ts` implements full error hierarchy: `HashiError` (base, extends `Error`), `HashiTransactionError` (with optional `module` and `abortCode`), `HashiQueryError`, `HashiParseError`, `HashiBitcoinError`, `HashiConfigError`. All six classes present and verified.

- [x] Criterion 6 — PASS. `ABORT_CODES` array contains 31 entries covering 11 Move modules (committee, config, config_value, reconfig, deposit_queue, proposal, tob, threshold, utxo_pool, withdraw, withdrawal_queue). Exceeds the 28+ requirement. Each entry has module, code, constant, and message fields. Helper functions `lookupAbortCode()` and `transactionErrorFromAbort()` also present.

- [x] Criterion 7 — PASS. `src/types/` contains domain type interfaces for all 17 listed types: `HashiState` (hashi.ts), `Committee`, `CommitteeMember`, `CommitteeSignature`, `MemberInfo` (committee.ts), `Config`, `ConfigValue` (config.ts), `DepositRequest` (deposit.ts), `WithdrawalRequest`, `WithdrawalRequestInfo`, `PendingWithdrawal`, `OutputUtxo` (withdrawal.ts), `Utxo`, `UtxoId`, `UtxoPool` (utxo.ts), `Proposal` (proposal.ts), `EpochCerts` (tob.ts).

- [x] Criterion 8 — PASS. `src/types/bcs.ts` re-exports BCS types from `src/contracts/` under ergonomic names (e.g., `UtxoIdBcs`, `CommitteeSignatureBcs`, `ConfigValueBcs`, etc.). 26 re-exports covering all major codegen types.

- [x] Criterion 9 — PASS. Build pipeline produces both `dist/esm/` and `dist/cjs/` output directories, each containing compiled JS, source maps, and declaration files, plus a `package.json` marker file.

- [x] Criterion 10 — PASS. `npx tsc --noEmit` exits 0 with no output (no type errors).

- [x] Criterion 11 — PASS. `npm run build` exits 0 and produces both ESM and CJS output. Output: "Building CJS... Building ESM... Build complete."

- [x] Criterion 12 — PASS. Config unit tests pass: 13 tests in `tests/config.test.ts` covering explicit construction, preset construction (mainnet, testnet), unknown preset rejection, override behavior, validation errors (missing prefix, uppercase hex, wrong length, non-string), field name in error messages, and `btcCoinType` derivation.

- [x] Criterion 13 — PASS. Error unit tests pass: 18 tests in `tests/errors.test.ts` covering hierarchy instanceof checks (all 6 classes), optional fields, abort code table size (>=28), entry structure validation, module coverage check (11 modules), `lookupAbortCode` (known codes, unknown module, unknown code), and `transactionErrorFromAbort` (known and unknown aborts).

- [x] Criterion 14 — PASS. BCS round-trip tests pass: 9 tests in `tests/bcs.test.ts` covering 8 distinct types: UtxoId, Utxo (with/without derivation_path), OutputUtxo, CommitteeSignature, WithdrawalRequestInfo, ConfigValue (all 5 enum variants), TobKey (with/without batch_index), DealerMessagesHashV1. Exceeds the 5-type minimum.

- [x] Criterion 15 — PASS. Open questions documented in `implementation-notes.md`: Q-CODEGEN-ENTRY-FNS (codegen generates wrappers for entry and public functions), Q-BUILD-SCRIPTS (@mysten/build-scripts not on npm, replicated locally in scripts/build.mjs), Q-BTC-COIN-TYPE-PKG (BTC coin type uses original package ID, confirmed from Rust source).

## Verification Commands Run

- `npx tsc --noEmit` -> exit 0, no output (no errors)
- `npm run build` -> exit 0, output: "Building CJS... Building ESM... Build complete."
- `npx vitest run` -> exit 0, 3 test files, 40 tests passed (0 failed), duration 288ms
- `ls src/contracts/` -> 2 directories (hashi/, utils/) containing 32 generated files total
- `ls dist/esm/ dist/cjs/` -> both directories present with compiled output
- `node -e "require('./dist/cjs/errors.js').ABORT_CODES.length"` -> 31 entries

## Overall Assessment

All 15 contract criteria are verified with evidence. The repository scaffold, codegen output, configuration management, error hierarchy with 31 abort codes, domain type interfaces for all 17 required types, BCS re-export layer, dual ESM/CJS build pipeline, and 40 passing tests across config/error/BCS test suites all meet or exceed the specified requirements. Open questions are documented with findings from source code investigation.
