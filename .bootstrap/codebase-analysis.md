---
type: codebase-analysis
created: 2026-04-01T18:02:00Z
---

## Architecture

hashi-sdk is a TypeScript SDK for the Hashi Bitcoin Bridge on Sui. Layered design:

```
HashiClient (facade) — wraps all operations
  ↓
Transactions / Queries / Events / Bitcoin — standalone modules
  ↓
src/contracts/ — codegen BCS types + Move call wrappers (32 files)
  ↓
Hashi Move Package (24 modules, external at ~/workspace/hashi)
```

- Signing-agnostic: builders return `(tx: Transaction) => void | TransactionResult` closures
- Curried closure composition via `tx.add()`
- HashiClient facade OR standalone imports (7 subpath exports)
- Dual ESM/CJS build via `scripts/build.mjs`

## Patterns & Conventions

- **Barrel exports**: Each module has `index.ts` re-exporting public API
- **Subpath exports**: `hashi-sdk`, `hashi-sdk/client`, `hashi-sdk/transactions`, `hashi-sdk/queries`, `hashi-sdk/events`, `hashi-sdk/bitcoin`, `hashi-sdk/types`
- **Test organization**: `tests/` directory with `*.test.ts` files, vitest, mock RPC
- **Error hierarchy**: HashiError base with 5 specialized subclasses + 31 abort codes
- **Domain types**: 3-layer model (codegen internal → domain public → conversion)
- **Config**: `HashiConfig` class with network presets + custom overrides
- **Naming**: camelCase throughout, PascalCase for types/classes

## Tech Stack

- **Runtime**: TypeScript, Node.js >= 18
- **Sui SDK**: @mysten/sui (>=2.0.0), @mysten/bcs (^2.0.0)
- **Crypto**: @noble/curves, @noble/hashes, @scure/base
- **Build**: esbuild + tsc (dual ESM/CJS)
- **Test**: vitest (281 tests, ~465ms)
- **Lint**: ESLint with TypeScript plugins
- **Codegen**: @mysten/codegen (^0.8.3)

## Key Files for This Work

1. `src/client.ts` — HashiClient facade (687 lines, all operations)
2. `src/transactions/index.ts` — all transaction builder exports
3. `src/queries/index.ts` — all query function exports
4. `src/events/types.ts` — 25 event variant union type
5. `src/events/parser.ts` — event parsing functions
6. `src/bitcoin.ts` — Bitcoin address/amount helpers
7. `src/types/index.ts` — all domain type exports
8. `src/utils/config.ts` — HashiConfig with network presets
9. `src/errors.ts` — error hierarchy + abort codes
10. `package.json` — dependencies, scripts, exports map

## Constraints & Warnings

- SDK is NOT published to npm yet — dashboard must use local workspace link
- Devnet IDs are known (packageId: 0xe87f..., hashiObjectId: 0x3b80...)
- Bitcoin network is Testnet4 (tb1p prefix, bech32m)
- Validator/committee operations need committee keys (will fail on devnet but should show the forms)
- `deriveDepositAddress` is still a stub — dashboard should note this
- Network presets in config.ts may still have placeholder zero addresses for devnet
