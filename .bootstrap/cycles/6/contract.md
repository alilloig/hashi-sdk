---
cycle: 6
name: Client Facade + Documentation + Polish
---

## Scope
Implement the HashiClient class composing all subsystems, configure subpath exports, write README documentation, add TSDoc to public API, set up integration test scaffolding, and perform final build verification.

## Completion Criteria

1. [ ] `src/client.ts` implements HashiClient class that:
   - Accepts SuiClient and HashiConfig (or network preset) in constructor
   - Exposes all transaction builders as methods (createDepositRequest, requestWithdrawal, cancelWithdrawal, confirmDeposit, etc.)
   - Exposes all query methods (getHashiState, getDepositRequest, listDepositRequests, etc.)
   - Exposes event parsing helpers
   - Provides btcCoinType getter
2. [ ] Subpath exports work in package.json: ., ./client, ./transactions, ./queries, ./events, ./bitcoin, ./types
3. [ ] README.md exists with:
   - Quickstart (install, configure, create deposit, request withdrawal)
   - User flow example (deposit → query → withdraw)
   - Validator flow example (register → confirm deposit → approve withdrawal)
   - Server vs browser signing guidance
   - Upgrade notes (packageId vs originalPackageId)
4. [ ] TSDoc comments on all public functions and types (at minimum: all transaction builders, all query methods, event parsers, Bitcoin helpers, HashiClient, HashiConfig)
5. [ ] Integration test scaffolding exists in tests/integration/ (gated behind env flag, placeholder structure)
6. [ ] `npm run build` succeeds with clean output (dist/esm/ + dist/cjs/)
7. [ ] `npx tsc --noEmit` exits 0
8. [ ] `npx vitest run` exits 0 with all tests passing
9. [ ] All subpath imports resolve correctly (verified by import test or manual check)

## Verification Commands
- `npx tsc --noEmit` — verifies criterion 7
- `npm run build` — verifies criterion 6
- `npx vitest run` — verifies criterion 8

## Context from Previous Cycles
All implementation is complete: Cycle 1 (foundation), Cycle 2 (user tx builders), Cycle 3 (bitcoin + events), Cycle 4 (query layer), Cycle 5 (validator tx builders). This cycle composes everything into a cohesive SDK.
