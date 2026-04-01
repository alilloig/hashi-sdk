---
cycle: 6
iteration: 1
status: DONE
timestamp: 2026-04-01T14:50:00Z
---

## What I Implemented

Final cycle implementing the HashiClient facade, subpath exports, README documentation, TSDoc comments, integration test scaffolding, and full build verification.

## Contract Criteria Addressed

- **Criterion 1 (HashiClient class in src/client.ts)**: Implemented a full facade class that wraps all transaction builders (user ops, deposit ops, withdrawal ops, validator management, reconfiguration, certificate submission, governance -- 30+ methods) and all query functions (9 methods). Also includes `parseEvent`/`parseEventStrict` convenience methods and a `btcCoinType` getter. The class accepts `{ client, network }` or `{ client, config }` options and delegates to standalone functions.

- **Criterion 2 (Subpath exports in package.json)**: Added 7 subpath export entries (`.`, `./client`, `./transactions`, `./queries`, `./events`, `./bitcoin`, `./types`) with `types`, `import`, and `require` conditions in correct precedence order.

- **Criterion 3 (README.md)**: Wrote a comprehensive README with 13 sections: header, installation, quick start, architecture, user operations (deposit/withdrawal/cancel), querying state (6 examples), event parsing, Bitcoin helpers, validator operations, signing guide (Node.js and dApp Kit), package upgrades, configuration, error handling, non-goals, API reference, and license.

- **Criterion 4 (TSDoc on all public functions)**: Added TSDoc comments to all HashiClient methods, all error classes (HashiError, HashiTransactionError, HashiQueryError, HashiParseError, HashiBitcoinError, HashiConfigError), all 25 event type interfaces, event sub-types, and the types module index. Existing transaction builders, queries, config, and bitcoin modules already had comprehensive TSDoc from prior cycles.

- **Criterion 5 (Integration test scaffolding)**: Created `tests/integration/` with:
  - `README.md` explaining how to run integration tests
  - `deposit-flow.test.ts` -- 3 placeholder tests (skipped via `describe.skipIf`)
  - `withdrawal-flow.test.ts` -- 3 placeholder tests (skipped via `describe.skipIf`)
  All skip unless `HASHI_INTEGRATION=1` is set.

- **Criterion 6 (npm run build succeeds)**: Build produces both `dist/esm/` and `dist/cjs/` with all expected files.

- **Criterion 7 (npx tsc --noEmit exits 0)**: Type checking passes with zero errors.

- **Criterion 8 (npx vitest run exits 0)**: 281 tests pass, 6 integration tests properly skipped, across 11 test files (9 passed, 2 skipped).

- **Criterion 9 (Subpath imports resolve)**: Verified all 14 expected files (7 subpath exports x 2 formats) exist in dist after build.

## Tests Written and Results

- `npx tsc --noEmit` -> exit 0 (no errors)
- `npx vitest run` -> 281 passed, 6 skipped (9 test files passed, 2 skipped)
- `npm run build` -> exit 0, dist/esm/ and dist/cjs/ produced

New test file: `tests/client.test.ts` (14 tests)
- Constructor tests: network preset, explicit config, missing config error, config-over-network precedence
- btcCoinType getter test
- Transaction builder delegation tests (createDepositRequest, requestWithdrawal, cancelWithdrawal, confirmDeposit, register, startReconfig, vote)
- Event parsing tests (parseEvent returns null, parseEventStrict returns error)

Integration scaffolding: 2 files, 6 tests (all skipped by default)

## Files Changed

- `src/client.ts` -- New HashiClient facade class (470 lines)
- `src/index.ts` -- Added HashiClient export
- `src/errors.ts` -- Added TSDoc to all error classes
- `src/events/types.ts` -- Added TSDoc to all 25 event interfaces and sub-types
- `src/types/index.ts` -- Added module-level TSDoc
- `package.json` -- Added 7 subpath exports with types/import/require conditions
- `README.md` -- New comprehensive documentation
- `tests/client.test.ts` -- New unit tests for HashiClient
- `tests/integration/README.md` -- Integration test guide
- `tests/integration/deposit-flow.test.ts` -- Placeholder integration test
- `tests/integration/withdrawal-flow.test.ts` -- Placeholder integration test

## Commits

- `5a74728` -- feat: add HashiClient facade, subpath exports, README, and integration test scaffolding
