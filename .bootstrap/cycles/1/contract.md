---
cycle: 1
name: Foundation (Scaffold + Codegen + Config + Types + Errors)
---

## Scope
Initialize the hashi-sdk repository with build tooling, code generation from the Hashi Move package, configuration management, error handling, and domain type definitions. Resolve protocol-level open questions by inspecting the reference Rust/Move codebases.

## Completion Criteria

1. [ ] Repository scaffold exists with: `package.json`, `tsconfig.json`, `tsconfig.esm.json`, `vitest.config.ts`, `.eslintrc.js` (or eslint.config.js), `.gitignore`
2. [ ] `sui-codegen.config.ts` exists at package root targeting the Hashi Move package at a relative path
3. [ ] Codegen has been run and `src/contracts/` contains generated BCS type definitions and Move function wrappers
4. [ ] `src/utils/config.ts` implements `HashiConfig` with:
   - `'mainnet'` and `'testnet'` presets (object IDs can be placeholder values)
   - Override support for custom networks
   - Input validation (address format, required fields)
5. [ ] `src/errors.ts` implements the full error hierarchy: `HashiError`, `HashiTransactionError`, `HashiQueryError`, `HashiParseError`, `HashiBitcoinError`, `HashiConfigError`
6. [ ] `src/errors.ts` includes the abort code mapping table for all known Move error constants (28+ codes)
7. [ ] `src/types/` contains domain type interfaces for all major Hashi types (Hashi, Committee, CommitteeMember, MemberInfo, Config, ConfigValue, DepositRequest, WithdrawalRequest, WithdrawalRequestInfo, PendingWithdrawal, OutputUtxo, Utxo, UtxoId, UtxoPool, Proposal, CommitteeSignature, EpochCerts)
8. [ ] `src/types/bcs.ts` re-exports relevant BCS types from `src/contracts/`
9. [ ] Build pipeline produces `dist/esm/` and `dist/cjs/` output directories
10. [ ] `npx tsc --noEmit` exits 0 with no type errors
11. [ ] `npm run build` exits 0 and produces both ESM and CJS output
12. [ ] Config unit tests pass: preset resolution, override behavior, validation errors
13. [ ] Error unit tests pass: hierarchy instanceof checks, abort code → message mapping
14. [ ] BCS round-trip tests pass for at least 5 representative types (e.g., UtxoId, OutputUtxo, CommitteeSignature, ConfigValue, Committee)
15. [ ] Open questions investigated and findings documented (at minimum Q-CODEGEN-ENTRY-FNS, Q-BUILD-SCRIPTS, Q-BTC-COIN-TYPE-PKG)

## Verification Commands
- `npx tsc --noEmit` — verifies criteria 10
- `npm run build` — verifies criteria 9, 11
- `npx vitest run` — verifies criteria 12, 13, 14
- `ls src/contracts/` — verifies criteria 3
- `ls dist/esm/ dist/cjs/` — verifies criteria 9

## Context from Previous Cycles
None — this is the foundation cycle.
