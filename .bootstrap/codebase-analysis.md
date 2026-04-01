---
type: codebase-analysis
created: 2026-04-01T12:30:00Z
---

## Architecture

The Hashi codebase is a Rust+Move Bitcoin-on-Sui bridge with three key layers:

### Move Package (24 modules, ~2k LoC)
- Single shared object `Hashi` holds all bridge state via `Bag` dynamic fields
- **User-facing**: `deposit()` (5-step PTB), `request_withdrawal()`, `cancel_withdrawal()`
- **Validator/committee**: 13 entry/public functions for deposit confirmation, withdrawal lifecycle (approve → commit → sign → confirm), reconfig, certificate submission
- **Governance**: Generic `Proposal<T>` with 4 concrete types (UpdateConfig, EnableVersion, DisableVersion, Upgrade)
- Committee signatures use BLS12-381 MinPK with bitmap-based signer identification
- Two structs require client-side BCS encoding: `UtxoId` and `OutputUtxo` (passed as `vector<vector<u8>>`)

### Rust Transaction Executor (1254 LoC, 14 methods)
- `SuiTxExecutor` with generic `execute()` pipeline: set sender → build (dry-run + gas) → sign → submit
- **Critical patterns**: multi-step PTBs with chained results, `CoinWithBalance` intents, nested BCS double-encoding, event extraction for return values, conditional multi-call validator registration
- Shared objects: Hashi (always mutable), Clock `0x6` (immutable), SuiSystem `0x5` (immutable), Random `0x8` (immutable)
- `confirm_deposit` has unique pattern: calls `committee::new_committee_signature()` first, passes result to `deposit::confirm_deposit()`

### Rust Type System (35+ structs, 24 event variants)
- `HashiEvent` discriminated union with `try_parse()` matching on `(module, name)` pairs
- Multi-version package ID tracking via `BTreeSet<Address>` for event filtering across upgrades
- OnchainState uses `derive_dynamic_child_id()` for Bag field lookups, `list_dynamic_fields()` streams for traversal

## Patterns & Conventions (Mysten TS SDK Ecosystem)

### Package Structure (DeepBook v3 / Walrus pattern)
```
src/
  client.ts          — top-level HashiClient class
  contracts/         — @mysten/codegen output (BCS types + function wrappers)
  transactions/      — hand-written domain contract classes
  types/             — TypeScript interfaces + BCS re-exports
  utils/             — config class, constants, helpers
  errors.ts          — typed error hierarchy
```

### Core Patterns
1. **Transaction closures**: Every method returns `(tx: Transaction) => void | TransactionResult`
2. **`tx.add()` composition**: Callers compose closures via `tx.add(client.method(params))`
3. **Config class as DI**: `HashiConfig` holds env-based package/object IDs, injected into all sub-classes
4. **SuiClient injection**: Accept `SuiClient` in constructor, never create internally
5. **BCS re-export layer**: `types/bcs.ts` re-exports from `contracts/` for clean import paths
6. **Signing-agnostic**: SDK builds `Transaction` objects, caller handles signing (compatible with dapp-kit wallets)

### Codegen Setup
- `sui-codegen.config.ts` at package root: `{ output: './src/contracts', packages: [{ package: '@pkg/name', path: '../relative/path' }] }`
- Runs `sui move summary` automatically, generates `MoveStruct` definitions + per-function wrappers
- Generated utils include `normalizeMoveArguments()`, `MoveStruct`, `MoveEnum`
- Manual supplements needed for nested BCS patterns (codegen won't handle `vector<vector<u8>>` double-encoding)

### Build System
- Dual CJS/ESM via `@mysten/build-scripts` (esbuild + tsc)
- Two tsconfigs: `tsconfig.json` (CJS) + `tsconfig.esm.json` (ESM)
- Target: ES2020, strict mode, `moduleResolution: "node"`
- Network constants: `export const TESTNET_CONFIG = { ... } satisfies HashiConfig`

## Tech Stack

| Component | Technology | Version |
|---|---|---|
| Core SDK | `@mysten/sui` | >=1.x |
| BCS | `@mysten/bcs` | (via @mysten/sui) |
| Codegen | `@mysten/codegen` (`sui-ts-codegen`) | ^0.5.9 |
| Build | `@mysten/build-scripts` (esbuild) | — |
| TypeScript | typescript | >=5.x |
| Tests | vitest | >=3.x |
| Bitcoin crypto | `@noble/curves` | (for secp256k1, bech32) |
| Output | Dual CJS+ESM | ES2020 target |

## Key Files for This Work

### Hashi Reference (Move)
1. `packages/hashi/sources/withdraw.move` — 7 withdrawal functions, most complex module
2. `packages/hashi/sources/deposit.move` — 3 deposit functions with committee cert
3. `packages/hashi/sources/committee/committee.move` — CommitteeSignature, verify_certificate
4. `packages/hashi/sources/validator.move` — 6 validator management functions
5. `packages/hashi/sources/utxo.move` — UtxoId/Utxo types, BCS decoders

### Hashi Reference (Rust)
6. `crates/hashi/src/sui_tx_executor.rs` — All 14 PTB construction methods
7. `crates/hashi-types/src/move_types/mod.rs` — All BCS types + event dispatcher
8. `crates/hashi/src/onchain/mod.rs` — Dynamic field scraping, Bag traversal

### Mysten TS SDK Patterns
9. `ts-sdks/packages/deepbook-v3/src/client.ts` — Client class pattern
10. `ts-sdks/packages/deepbook-v3/sui-codegen.config.ts` — Codegen config template

## Constraints & Warnings

1. **Codegen requires `sui move summary`**: Sui CLI must be installed, Move package must compile. CI needs Sui CLI.
2. **Local path coupling**: `sui-codegen.config.ts` references Move packages by relative path. Hashi Move package must be accessible.
3. **BTC coin type uses original package ID**: Not the latest upgrade address. SDK must track `originalPackageId` separately.
4. **`commit_withdrawal_tx` double-BCS**: `vector<vector<u8>>` with BCS-encoded `UtxoId` and `OutputUtxo` inside. Manual helper required.
5. **`confirm_deposit` two-call pattern**: Must call `committee::new_committee_signature()` first, pass result to `deposit::confirm_deposit()`.
6. **`cancel_withdrawal` returns `Coin<BTC>`**: Must `transferObjects` the returned coin to sender.
7. **`abort_reconfig` always aborts**: Do not expose in SDK or document as disabled.
8. **No public view functions on Hashi**: All getters are `public(package)`. SDK must query state via RPC.
9. **Random object `0x8`**: Required by `commit_withdrawal_tx`.
10. **Bitcoin address constraint**: Only 20-byte (P2WPKH) or 32-byte (P2TR) witness programs accepted.
11. **`MemberInfo.next_epoch_public_key`**: Stored as uncompressed G1 on-chain, needs conversion to compressed BLS format.
12. **Standalone package**: Must replicate `build-scripts` and `tsconfig` locally (not published to npm).
