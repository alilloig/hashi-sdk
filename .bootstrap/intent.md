---
type: intent
created: 2026-04-01T12:05:00Z
mode: greenfield
---

## Original Prompt
Use the report at /Users/alilloig/.claude/plans/spicy-hugging-shannon.md to create the hashi sdk

## User Answers

**BCS Strategy**: @mysten/codegen from start — set up codegen pipeline generating types from Move package summaries. Requires running `sui move build` on the Hashi Move package.

**Scope**: All 6 phases — full SDK including foundation, user-facing operations, query layer, event system, validator operations, testing, and documentation. Complete parity with the Rust transaction executor.

**Bitcoin Helpers**: Full Bitcoin helpers — bech32/bech32m encoding plus deposit address derivation from MPC public key. Adds `@noble/curves` for secp256k1 point arithmetic.

**Quality Bar**: Production-grade — clean TypeScript, proper error handling with Move abort code mapping, TSDoc on public API, unit tests for BCS and transaction builders.

## Derived Intent

Build a comprehensive TypeScript SDK (`hashi-sdk`) for the Hashi Bitcoin bridge on Sui. The SDK translates the existing Rust `SuiTxExecutor` (1254 lines, 13 domain methods) and `hashi-types` (30 data types, 20 event types) into idiomatic TypeScript that integrates with the `@mysten/sui` ecosystem.

**What to build**:
- Package scaffold with `@mysten/codegen` pipeline for BCS type generation from Move package summaries
- Transaction builder functions following DeepBook/Walrus patterns (return `(tx: Transaction) => void`)
- `HashiClient` convenience class accepting `SuiClient` via constructor injection
- Complete user-facing operations: deposit, withdraw, cancel withdrawal
- Complete validator operations: confirm deposit, approve/commit/sign/confirm withdrawal, register, reconfig, governance
- Query layer for Hashi shared object, dynamic fields (Bags), with pagination
- Event system with discriminated union type and BCS deserialization for all 20 event types
- Bitcoin address helpers (bech32/bech32m encoding) and deposit address derivation (secp256k1 via @noble/curves)
- Move abort code mapping to human-readable error messages
- Production-grade unit tests (BCS round-trips, event parsing, builder snapshots)
- TSDoc on all public API surfaces

**Key constraints**:
- Must use `@mysten/codegen` (not manual BCS) as the type generation foundation
- Must be signing-agnostic (never hold private keys, compatible with dapp-kit wallets)
- Must follow Mysten ecosystem conventions (DeepBook v3, Walrus SDK patterns)
- Single package architecture with tree-shakeable modules
- Network presets (testnet, mainnet) with override capability
- `originalPackageId` for StructTags, current `packageId` for Move call targets

**Reference codebases**:
- Hashi Rust/Move: `/Users/alilloig/workspace/hashi/worktrees/alilloig/sdk/`
- Mysten TS SDKs (DeepBook, Walrus patterns): `~/workspace/ts-sdks/`

**Target audience**: Full spectrum — dApp developers (deposit/withdraw/query) and validator operators (committee management, governance).

**Runtime dependencies**: `@mysten/sui`, `@mysten/bcs`, `@noble/curves`
**Dev dependencies**: `@mysten/codegen`, `@mysten/build-scripts`, `typescript` ≥5.x, `vitest`, `@changesets/cli`
