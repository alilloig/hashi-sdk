# Planning Prompt v3

Generate a rigorous implementation specification for `hashi-sdk`, a production-grade TypeScript SDK for the Hashi Bitcoin-on-Sui bridge.

Your output is a project specification, not code. Write it as an engineering design document with concrete decisions, explicit assumptions, and clear acceptance criteria.

## Document Requirements

Produce these sections in order:
1. Executive summary
2. Goals and non-goals
3. Assumptions and external dependencies
4. Architecture and package layout
5. Public API surface and exports
6. Transaction-building design
7. Query/read-layer design
8. Event parsing design
9. Bitcoin helper design
10. Type system and conversion strategy
11. Error model
12. Build, packaging, and exports
13. Testing and CI strategy
14. Documentation plan
15. Release/versioning plan
16. Risks and open questions
17. Phase-based implementation plan with milestones and acceptance criteria

## Output Quality Bar

- Use RFC-style language: `MUST`, `SHOULD`, `MAY`.
- Separate hard requirements from recommendations.
- Be specific enough that an engineer could implement from the spec without guessing core behavior.
- Call out unresolved items explicitly instead of hand-waving.
- Include tradeoffs where multiple valid designs exist, then choose one and justify.
- Where behavior depends on inspecting the external Move package, mark it as an assumption to validate.

## Project Context

`hashi-sdk` is a TypeScript SDK for the Hashi Bitcoin-on-Sui bridge — a Sui-native bridge where users deposit native BTC to receive hBTC (`Coin<BTC>`) on Sui, and withdraw by burning hBTC. A committee of Sui validators operates the bridge via threshold MPC (BLS12-381 Schnorr) with a Guardian 2-of-2 Taproot multisig.

The Hashi codebase is purely Rust + Move (~40k lines Rust, 24 Move modules). This TypeScript SDK is built from scratch in a standalone repository.

**Target audience**: Full spectrum — dApp developers (deposit, withdraw, query) and validator operators (committee management, governance).

## Hard Requirements

### Architecture

MUST use this package structure:
```text
src/
  client.ts          — HashiClient class (top-level convenience API)
  contracts/         — @mysten/codegen output (BCS types + Move function wrappers)
  transactions/      — Hand-written domain transaction classes per module
  queries/           — Read/query layer for on-chain state
  events/            — Event parsing and discriminated union types
  types/             — TypeScript domain interfaces + BCS re-exports from contracts/
  utils/             — Config class, constants, network presets
  errors.ts          — Typed error hierarchy with Move abort code mapping
  bitcoin.ts         — bech32/bech32m encoding + deposit address derivation
```

The spec MUST define:
- What each directory owns and its responsibility boundary
- Which modules are public exports (available to SDK consumers)
- Which modules are internal-only (not exported from package root)
- How tree-shakable imports are preserved (subpath exports or barrel file strategy)

### Codegen Foundation

- `@mysten/codegen` MUST be the primary type and function generation mechanism.
- A `sui-codegen.config.ts` MUST target the external Hashi Move package via configurable relative path.
- Generated output MUST live in `src/contracts/`.
- Manual wrappers/helpers MUST be limited to cases codegen cannot express, specifically:
  - Nested BCS double-encoding for `commit_withdrawal_tx` (`vector<vector<u8>>` with BCS-encoded `UtxoId` and `OutputUtxo`)
  - Multi-step PTB orchestration (5-step deposit, two-call confirm_deposit)
  - CoinWithBalance intent usage in `requestWithdrawal`
  - TransferObjects for `cancelWithdrawal` refund
- The spec MUST identify what is generated vs handwritten.

### Client and Config

- `HashiClient` MUST accept an injected `SuiClient` (from `@mysten/sui/client`).
- `HashiConfig` MUST support `'mainnet' | 'testnet'` presets plus explicit overrides for custom networks (devnet, localnet).
- Config MUST track:
  - `packageId` — current package address (for Move call targets, changes on upgrade)
  - `originalPackageId` — first published address (for StructTags like `{originalPkg}::btc::BTC`)
  - `hashiObjectId` — the shared Hashi object (stable across upgrades)
- The spec MUST define validation rules for config values.
- The spec MUST define how multi-version package support works for event parsing across upgrades.

### Transaction API

The SDK MUST be signing-agnostic — it builds `Transaction` content only, never holds private keys. Compatible with both server-side `SuiClient.signAndExecuteTransaction()` and browser dapp-kit wallet signing.

MUST use the curried closure pattern throughout:
```typescript
const op = client.createDepositRequest({ txid, vout, amount });
const tx = new Transaction();
tx.add(op);
// Caller signs and executes
```

The spec MUST define a consistent builder pattern for ALL write operations, including:
- Method name and signature (parameters + types)
- Return type (`(tx: Transaction) => void | TransactionResult`)
- Input validation behavior (what gets validated eagerly vs deferred to on-chain)
- Which Move calls are made, in what order, with what arguments

**User-facing operations** (callable by anyone):
1. `createDepositRequest({ txid, vout, amount, derivationPath? })` — 5-step PTB: `utxo::utxo_id()` → `utxo::utxo()` → `deposit_queue::deposit_request()` → `splitCoins(gas, [0])` for fee → `deposit::deposit()`
2. `requestWithdrawal({ amount, bitcoinAddress })` — `CoinWithBalance` intent for BTC coin + `withdraw::request_withdrawal()`. Bitcoin address accepted as human-readable bech32/bech32m string OR raw witness program bytes.
3. `cancelWithdrawal({ requestId })` — `withdraw::cancel_withdrawal()` → captures returned `Coin<BTC>` → `transferObjects([coin], sender)`

**Validator/committee operations** (entry functions, committee signature required):
4. `confirmDeposit({ requestId, epoch, signature, signersBitmap })` — Two-call PTB: `committee::new_committee_signature(epoch, sig, bitmap)` → `deposit::confirm_deposit(hashi, requestId, committeeSig)`
5. `deleteExpiredDeposits({ requestIds })` — Batched: multiple `deposit::delete_expired_deposit(hashi, id, clock)` calls in one PTB
6. `approveWithdrawalRequests({ approvals: Array<{requestId, epoch, signature, signersBitmap}> })` — Batched in single PTB
7. `commitWithdrawalTx({ requestIds, selectedUtxos, outputs, txid, epoch, signature, signersBitmap })` — Nested BCS: each `UtxoId` and `OutputUtxo` individually BCS-encoded to `Uint8Array`, then passed as `vector<vector<u8>>`. Requires Clock (`0x6`) + Random (`0x8`).
8. `signWithdrawal({ withdrawalId, requestIds, signatures, epoch, signature, signersBitmap })`
9. `confirmWithdrawal({ withdrawalId, epoch, signature, signersBitmap })`
10. `deleteExpiredSpentUtxo({ txid, vout })`
11. `register()` — `validator::register(hashi, suiSystem)` with SuiSystem object `0x5`
12. `updatePublicKey/updateOperatorAddress/updateEndpointUrl/updateTlsPublicKey/updateEncryptionPublicKey` — 5 separate methods, each taking the validator address + new value
13. `startReconfig()` / `endReconfig({ mpcPublicKey, signature, signersBitmap })`
14. `submitDkgCert/submitRotationCert/submitNonceCert({ epoch, dealer, messagesHash, signature, signersBitmap, batchIndex? })` / `destroyAllCerts({ epoch, batchIndex? })`
15. Governance: `proposeUpdateConfig/proposeEnableVersion/proposeDisableVersion/proposeUpgrade` + `vote<T>({ proposalId })` / `removeVote<T>({ proposalId })` / `deleteExpiredProposal<T>({ proposalId })` / `executeProposal<T>({ proposalId })`

The spec MUST explicitly note:
- `abort_reconfig` MUST NOT be exposed (always aborts on-chain)
- `finish_publish` MUST NOT be exposed (one-time deploy-only function)

### Query Layer

Because Hashi exposes NO public view functions, ALL reads MUST use Sui RPC object queries (getObject, getDynamicFieldObject, getDynamicFields).

The spec MUST define for each query:
- Exact return type shape (domain types, not raw BCS)
- Pagination contract (cursor-based, matching Sui's `{ data: T[]; nextCursor: string | null; hasNextPage: boolean }`)
- Behavior for missing/not-found objects (return `null`, not throw)
- Deserialization path (which BCS types are used, how dynamic field values are unwrapped)

Required queries:
- `getHashiState()` → root Hashi object with Bag IDs for sub-queries
- `getDepositRequest(id)` → single deposit request from deposit queue Bag
- `listDepositRequests({ cursor?, limit? })` → paginated list
- `getWithdrawalRequest(id)` → single withdrawal request
- `listPendingWithdrawals({ cursor?, limit? })` → paginated
- `getCommittee(epoch?)` → committee for given epoch (current if omitted)
- `getMemberInfo(validatorAddress)` → validator's MemberInfo
- `getConfig()` → parsed config as typed object (not VecMap)
- `getUtxo(txid, vout)` → active UTXO lookup
- `getEpochCerts(epoch, batchIndex?)` → TOB certificates

### Event System

The spec MUST define:
- A discriminated union `HashiEvent` with all 24 variants (use `type` field as discriminant)
- `parseHashiEvent(event: SuiEvent, packageIds: Set<string>): HashiEvent | null`
- Behavior: return `null` for unknown/unsupported events (best-effort, not strict)
- Package-version matching: accept a `Set<string>` of all known package IDs (current + prior versions)
- Generic type parameter extraction for proposal events (VoteCast, ProposalCreated, etc.) and treasury events (Mint, Burn)
- Each variant MUST have a `type` string literal discriminant and BCS-deserialized fields using domain types

### Bitcoin Helpers

The spec MUST define:
- `encodeBitcoinAddress(witnessProgram: Uint8Array, witnessVersion: number, network: 'mainnet' | 'testnet'): string` — bech32m for v1+ (Taproot), bech32 for v0 (SegWit)
- `decodeBitcoinAddress(address: string): { witnessProgram: Uint8Array; witnessVersion: number; network: string }` — validates and decodes
- `deriveDepositAddress(mpcPublicKey: Uint8Array, derivationPath: string, network: 'mainnet' | 'testnet'): string` — Taproot address derivation via secp256k1 point arithmetic using `@noble/curves`
- `satsToBtc(sats: bigint): string` and `btcToSats(btc: string): bigint`
- Error behavior: throw `HashiBitcoinError` for invalid addresses, unsupported witness versions, or malformed inputs
- Only 20-byte (P2WPKH, witness v0) and 32-byte (P2TR, witness v1) witness programs MUST be supported

### Type System

Use a three-layer model:
1. **Codegen layer** (`contracts/`): BCS-serializable types from `@mysten/codegen` — `MoveStruct` definitions
2. **Domain layer** (`types/`): Developer-friendly TypeScript interfaces — public API surface
3. **Conversion layer**: Bidirectional mapping between codegen and domain types

The spec MUST choose one representation for ambiguous types:

| Move Type | TypeScript Type | Rationale |
|---|---|---|
| `address` | `string` (0x-prefixed 64-hex-char) | Consistent with `@mysten/sui` |
| `u64` | `bigint` | JavaScript numbers lose precision above 2^53 |
| `vector<u8>` | `Uint8Array` | Standard for binary data |
| `Option<T>` | `T \| null` | Idiomatic TypeScript |
| `Bag` | `{ id: string; size: number }` | Contents via dynamic field queries |
| `VecMap<K,V>` | `Array<{ key: K; value: V }>` | Preserves insertion order (Map does not guarantee cross-engine) |
| `VecSet<T>` | `T[]` | Simple array |
| `CommitteeSignature` | `{ epoch: bigint; signature: Uint8Array; signersBitmap: Uint8Array }` | Flat interface |
| `ConfigValue` | discriminated union with `type` field | Match Move enum variants |

The spec MUST define normalization rules for addresses (lowercase, 0x-prefix, 64-char padding), txids (32-byte, big-endian), and validation boundaries.

### Error Model

MUST define a typed error hierarchy rooted at `HashiError extends Error`:
- `HashiTransactionError` — Move abort mapping (module, abort code, human message)
- `HashiQueryError` — RPC/transport failures, object not found
- `HashiParseError` — BCS decode failures, unknown event types
- `HashiBitcoinError` — invalid addresses, unsupported formats
- `HashiConfigError` — invalid config values, missing required fields

APIs MUST throw (not return Result-like values). This matches the `@mysten/sui` ecosystem convention.

The spec MUST include the complete abort code → message mapping for all known error constants from the Move package.

### Build and Release

- Dual ESM/CJS output via esbuild (replicate `@mysten/build-scripts` pattern locally)
- TypeScript >=5.x, strict mode, ES2020 target, `moduleResolution: "node"`
- `package.json` exports map: `.` (main), `./client`, `./transactions`, `./events`, `./bitcoin`, `./types`
- `@changesets/cli` for semantic versioning
- Minimum Node.js 18
- CI: type-check + lint + unit tests on every PR; codegen `is-dirty` check

### Testing

- Unit tests (vitest): BCS round-trips for all types, event parser for all 24 variants, transaction builder snapshot tests, Bitcoin address test vectors, config resolution, error mapping
- Fixture strategy: hand-crafted JSON/hex fixtures committed to repo (not generated at test time)
- Integration test scaffolding: placeholder structure for localnet testing (deposit, withdraw, cancel, queries)
- Event compatibility: test parsing events from at least two different package IDs (simulating an upgrade)
- Coverage: no strict threshold, but all public API functions MUST have at least one test

### Documentation

- README with quickstart (install, configure, deposit, withdraw)
- API usage examples for all major flows (deposit, withdraw, cancel, query state, parse events)
- Server vs browser signing guidance
- Upgrade/versioning notes (how to handle package upgrades)
- TSDoc on all public functions and types

### Non-Goals

The spec MUST explicitly list these as out of scope:
- Signer/wallet management or key custody
- Indexer or database integration
- React components or dapp-kit UI bindings
- MPC protocol implementation or BLS signing
- Bitcoin transaction construction or broadcasting
- Bitcoin full node integration
- Real-time WebSocket event subscription helpers (just parsing, not transport)

### Constraints

1. The Hashi Move package is external — codegen references it by relative path, not bundled
2. `originalPackageId` MUST be used for coin type StructTags (e.g., `{originalPkg}::btc::BTC`)
3. Current `packageId` MUST be used for Move call targets
4. `commit_withdrawal_tx` requires manual BCS double-encoding helper
5. `confirm_deposit` requires two-call PTB pattern
6. `cancel_withdrawal` MUST transferObjects the returned Coin<BTC> to sender
7. Only 20-byte (P2WPKH) and 32-byte (P2TR) Bitcoin addresses accepted
8. Random object `0x8` required by `commit_withdrawal_tx`
9. No public view functions on Hashi — all state reads via RPC

### Implementation Planning

End with a phased plan (targeting 5-7 cycles). For each phase include:
- Scope and concrete deliverables
- Dependencies on prior phases
- Exit criteria (objective, testable)
- Estimated complexity (simple / moderate / complex)
- Risks

Bias toward a spec that is explicit, implementable, and conservative about unsupported behavior.
