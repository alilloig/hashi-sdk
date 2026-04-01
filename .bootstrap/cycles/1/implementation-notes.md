---
cycle: 1
iteration: 1
status: DONE
timestamp: 2026-04-01T13:31:00Z
---

## What I Implemented

Full foundation cycle: repository scaffold, codegen from Hashi Move package, configuration management, error hierarchy with abort code mapping, domain type interfaces, BCS re-export layer, build pipeline, and comprehensive tests.

## Contract Criteria Addressed

1. **Repository scaffold**: package.json (dual ESM/CJS, @mysten/sui >=2.0.0 peer dep), tsconfig.json, tsconfig.esm.json (module: preserve, moduleResolution: bundler), vitest.config.ts, eslint.config.js, .gitignore -- all present and functional.

2. **sui-codegen.config.ts**: Created at package root targeting the Hashi Move package via relative path `../hashi/worktrees/alilloig/sdk/packages/hashi`.

3. **Codegen run**: Successfully ran `sui-ts-codegen generate` which first generates `package_summaries` via `sui move summary`, then produces TypeScript. Output in `src/contracts/` contains 32 files: BCS type definitions for all structs/enums and Move function wrappers for all public + entry functions across 24 modules.

4. **HashiConfig**: In `src/utils/config.ts` with `packageId`, `originalPackageId`, `hashiObjectId`. Supports construction from network preset string (`'mainnet'`/`'testnet'`), explicit options object, or preset + overrides. Validates all addresses as 66-char 0x-prefixed lowercase hex. Placeholder presets (zero addresses) since bridge is not yet deployed. `btcCoinType` getter derives the BTC coin type from `originalPackageId`.

5. **Error hierarchy**: In `src/errors.ts`. HashiError base class with HashiTransactionError (optional `module` + `abortCode`), HashiQueryError, HashiParseError, HashiBitcoinError, HashiConfigError. All extend HashiError which extends Error.

6. **Abort code mapping table**: 30 entries covering 11 modules (committee, config, config_value, reconfig, deposit_queue, proposal, tob, threshold, utxo_pool, withdraw, withdrawal_queue). Includes `lookupAbortCode()` and `transactionErrorFromAbort()` helper functions.

7. **Domain type interfaces**: In `src/types/` with separate files for committee, config, deposit, withdrawal, utxo, proposal, tob, hashi (root state), and common types. All use camelCase fields, string for addresses, bigint for u64, Uint8Array for bytes, T|null for Option<T>.

8. **BCS re-export layer**: In `src/types/bcs.ts`, re-exports all codegen BCS types under ergonomic names (e.g., `UtxoIdBcs`, `CommitteeSignatureBcs`, `ConfigValueBcs`).

9. **Build pipeline**: `scripts/build.mjs` replicates `@mysten/build-scripts`: finds all `.ts` files in `src/`, builds CJS via esbuild, builds ESM via esbuild, emits `.d.ts` via tsc for both tsconfig.json and tsconfig.esm.json, writes `dist/cjs/package.json` (type: commonjs) and `dist/esm/package.json` (type: module). `npm run build` exits 0.

10. **`npx tsc --noEmit`**: Exits 0.

11. **`npm run build`**: Exits 0, producing both `dist/esm/` and `dist/cjs/` with source maps and declaration files.

12. **Config unit tests**: 13 tests covering explicit construction, preset construction, overrides, validation errors, and btcCoinType. All pass.

13. **Error unit tests**: 18 tests covering hierarchy (instanceof checks), optional fields, abort code table (28+ entries verified), lookupAbortCode, and transactionErrorFromAbort. All pass.

14. **BCS round-trip tests**: 9 tests covering UtxoId, Utxo (with and without derivation_path), OutputUtxo, CommitteeSignature, WithdrawalRequestInfo, ConfigValue (all 5 enum variants), TobKey (with and without batch_index), DealerMessagesHashV1. All serialize and deserialize correctly.

15. **Open questions investigated**:
    - **Q-CODEGEN-ENTRY-FNS**: Confirmed. `@mysten/codegen` generates wrappers for `entry fun` by default (`privateMethods: 'entry'`). The `move-module-builder.ts` filters: Public functions always included; for non-Public, only `entry` funs are included by default. This means all public functions AND entry functions get wrappers, but `public(package)` functions without `entry` are excluded.
    - **Q-BUILD-SCRIPTS**: Confirmed `@mysten/build-scripts` is NOT published to npm (404). Replicated the build pipeline locally in `scripts/build.mjs` following the same pattern: esbuild for CJS/ESM bundles, tsc for declaration files, package.json markers for module type.
    - **Q-BTC-COIN-TYPE-PKG**: The Rust `SuiTxExecutor` at line 411-416 constructs the BTC `StructTag` using `self.hashi_ids.package_id`. The `HashiIds` struct (config.rs:353) only has `package_id` and `hashi_object_id`. Since coin types always reference the original package where the struct was defined, and the Rust operator config tracks this as `package_id`, the SDK correctly separates `packageId` (current/upgraded) and `originalPackageId` (for type resolution). The `btcCoinType` getter uses `originalPackageId`.

## Tests Written and Results

- `npx vitest run` -- 40 tests pass (3 test files):
  - `tests/config.test.ts`: 13 tests
  - `tests/errors.test.ts`: 18 tests
  - `tests/bcs.test.ts`: 9 tests (covering 8 distinct BCS types)

## Files Changed

- `.gitignore` -- node_modules, dist, build artifacts
- `package.json` -- project metadata, scripts, dependencies
- `package-lock.json` -- lockfile
- `tsconfig.json` -- TypeScript config (module: preserve, moduleResolution: bundler)
- `tsconfig.esm.json` -- ESM-specific TypeScript config
- `vitest.config.ts` -- Vitest test runner config
- `eslint.config.js` -- ESLint flat config
- `sui-codegen.config.ts` -- Codegen config targeting Hashi Move package
- `scripts/build.mjs` -- Build script (esbuild + tsc dual output)
- `src/contracts/` -- 32 generated files (BCS types + function wrappers)
- `src/errors.ts` -- Error hierarchy + abort code table
- `src/utils/config.ts` -- HashiConfig class
- `src/utils/index.ts` -- Utils barrel export
- `src/types/common.ts` -- Bag, VecMapEntry, PaginatedResult
- `src/types/committee.ts` -- Committee, CommitteeMember, CommitteeSignature, MemberInfo
- `src/types/config.ts` -- Config, ConfigValue
- `src/types/deposit.ts` -- DepositRequest, DepositRequestQueue
- `src/types/withdrawal.ts` -- WithdrawalRequest, PendingWithdrawal, OutputUtxo, events
- `src/types/utxo.ts` -- UtxoId, Utxo, UtxoInfo, UtxoPool
- `src/types/proposal.ts` -- Proposal<T>, ProposalType
- `src/types/tob.ts` -- TobKey, EpochCerts, DealerSubmission, ProtocolType
- `src/types/hashi.ts` -- HashiState
- `src/types/bcs.ts` -- BCS re-export layer
- `src/types/index.ts` -- Types barrel export
- `src/index.ts` -- Main entry point
- `tests/config.test.ts` -- Config unit tests
- `tests/errors.test.ts` -- Error unit tests
- `tests/bcs.test.ts` -- BCS round-trip tests

## Commits

- `756d4ea` -- feat: repository scaffold with build tooling and codegen config
- `8f88a9a` -- feat: add codegen-generated BCS types and Move function wrappers
- `fd0cdba` -- feat: add config, errors, domain types, and BCS re-export layer
- `07ccaf7` -- test: add config, error, and BCS round-trip tests

## Notable Decisions

- **@mysten/sui v2**: The codegen output uses APIs from `@mysten/sui` v2 (e.g., `ClientWithCoreApi`, `SuiClientTypes`). Updated the SDK to depend on `@mysten/sui@^2.13.0` instead of the originally planned `>=1.0.0`.

- **@mysten/bcs v2**: Similarly, the generated BCS types use `@mysten/bcs` v2 which deserializes u64 as strings (not BigInt). BCS round-trip tests compare via `String()` accordingly.

- **moduleResolution: bundler**: Required by `@mysten/sui` v2 which only exports `.mts` declaration files. The `module: "preserve"` + `moduleResolution: "bundler"` combination works because esbuild handles the actual module bundling.

- **Network presets use placeholder zeros**: Since the Hashi bridge is not yet deployed to mainnet or testnet, the preset configurations use all-zero addresses. These will be updated when deployment occurs.
