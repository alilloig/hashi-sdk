# Planning Prompt (Final)

Generate a rigorous implementation specification for `hashi-sdk`, a production-grade TypeScript SDK for the Hashi Bitcoin-on-Sui bridge.

Your output is a project specification, not code. Write it as an engineering design document with concrete decisions, explicit assumptions, and clear acceptance criteria.

## Document Requirements

Produce these sections in order:
1. Executive summary
2. Goals and non-goals
3. Assumptions and external dependencies
4. Architecture and package layout
5. Public API surface
6. Transaction-building design
7. Query/read-layer design
8. Event parsing design
9. Bitcoin helper design
10. Type system and conversion strategy
11. Error model
12. Build, packaging, and module exports
13. Testing and CI strategy
14. Documentation plan
15. Release/versioning plan
16. Risks, open questions, and future extension points
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
- Which modules are public (exported from package root or subpath exports)
- Which modules are internal-only (consumed within the package but not exported)
- How tree-shakable imports are preserved

### Codegen Foundation

- `@mysten/codegen` MUST be the primary type and function generation mechanism.
- A `sui-codegen.config.ts` MUST exist at package root, targeting the external Hashi Move package via configurable relative path.
- Generated output MUST live in `src/contracts/`.
- Manual wrappers/helpers MUST be limited to cases codegen cannot express:
  - Nested BCS double-encoding for `commit_withdrawal_tx` (`vector<vector<u8>>` with BCS-encoded `UtxoId` and `OutputUtxo`)
  - Multi-step PTB orchestration (5-step deposit, two-call confirm_deposit)
  - CoinWithBalance intent usage in `requestWithdrawal`
  - TransferObjects for `cancelWithdrawal` refund
- The spec MUST identify what is generated vs handwritten per directory.

### Client and Config

- `HashiClient` MUST accept an injected `SuiClient` (from `@mysten/sui/client`).
- `HashiConfig` MUST support `'mainnet' | 'testnet'` presets plus explicit overrides for custom networks (devnet, localnet).
- Config MUST track:
  - `packageId` — current package address (for Move call targets, changes on upgrade)
  - `originalPackageId` — first published address (stable, for StructTags like `{originalPkg}::btc::BTC`)
  - `hashiObjectId` — the shared Hashi object (stable across upgrades)
- The spec MUST define validation rules for config values (format, length, 0x-prefix).
- The spec MUST define how multi-version package support works for event parsing across upgrades.

### Transaction API

The SDK MUST be signing-agnostic — it builds `Transaction` content only, never holds private keys. Compatible with both server-side `SuiClient.signAndExecuteTransaction()` and browser dapp-kit wallet signing.

**Builder contract — the spec MUST define:**
- One canonical builder return type used uniformly across ALL write APIs. Choose between `(tx: Transaction) => void` or `(tx: Transaction) => TransactionResult`, and use it consistently. Name it (e.g., `HashiTransactionPlugin`).
- Whether builders perform eager validation before closure creation. Recommendation: validate input format synchronously (address format, byte lengths), defer semantic validation to on-chain execution.
- Whether any builder returns handles to newly created on-chain objects, and if so, how (via TransactionResult or event parsing post-execution).

**User-facing operations** (callable by anyone):
1. `createDepositRequest({ txid, vout, amount, derivationPath? })` — 5-step PTB: `utxo::utxo_id()` → `utxo::utxo()` → `deposit_queue::deposit_request()` → `splitCoins(gas, [0])` for fee → `deposit::deposit()`
2. `requestWithdrawal({ amount, bitcoinAddress })` — `CoinWithBalance` intent for BTC coin + `withdraw::request_withdrawal()`. Bitcoin address accepted as human-readable bech32/bech32m string OR raw `Uint8Array` witness program.
3. `cancelWithdrawal({ requestId })` — `withdraw::cancel_withdrawal()` → captures returned `Coin<BTC>` → `transferObjects([coin], sender)`

**Validator/committee operations** (entry functions, committee signature required):
4. `confirmDeposit({ requestId, epoch, signature, signersBitmap })` — Two-call PTB: `committee::new_committee_signature(epoch, sig, bitmap)` → `deposit::confirm_deposit(hashi, requestId, committeeSig)`
5. `deleteExpiredDeposits({ requestIds })` — Batched: multiple `deposit::delete_expired_deposit(hashi, id, clock)` calls in one PTB
6. `approveWithdrawalRequests({ approvals: Array<{requestId, epoch, signature, signersBitmap}> })` — Batched in single PTB
7. `commitWithdrawalTx({ requestIds, selectedUtxos, outputs, txid, epoch, signature, signersBitmap })` — Nested BCS: each `UtxoId` and `OutputUtxo` individually BCS-encoded to `Uint8Array`, then passed as `vector<vector<u8>>`. Requires Clock (`0x6`) + Random (`0x8`).
8. `signWithdrawal({ withdrawalId, requestIds, signatures, epoch, signature, signersBitmap })`
9. `confirmWithdrawal({ withdrawalId, epoch, signature, signersBitmap })`
10. `deleteExpiredSpentUtxo({ txid, vout })`
11. `register()` — `validator::register(hashi, suiSystem)` with SuiSystem `0x5`
12. `updatePublicKey/updateOperatorAddress/updateEndpointUrl/updateTlsPublicKey/updateEncryptionPublicKey` — 5 separate methods
13. `startReconfig()` / `endReconfig({ mpcPublicKey, signature, signersBitmap })`
14. `submitDkgCert/submitRotationCert/submitNonceCert` / `destroyAllCerts`
15. Governance: `proposeUpdateConfig/proposeEnableVersion/proposeDisableVersion/proposeUpgrade` + `vote<T>` / `removeVote<T>` / `deleteExpiredProposal<T>` / `executeProposal<T>`

**Excluded**: `abort_reconfig` (always aborts on-chain), `finish_publish` (one-time deploy function).

### Query Layer

Because Hashi exposes NO public view functions, ALL reads MUST use Sui RPC object queries.

**Pagination contract**: All list APIs MUST use one shared pagination result type:
```typescript
interface PaginatedResult<T> {
  items: T[];
  nextCursor: string | null;
  hasNextPage: boolean;
}
```
The spec MUST define ordering guarantees for each list method.

**Error semantics for queries**:
- Object not found → return `null` (singular getters only)
- Invalid input (malformed address, bad config) → throw `HashiConfigError` or `HashiQueryError`
- BCS decode failure → throw `HashiParseError`
- RPC transport failure → throw `HashiQueryError`

The spec MUST define for each query: exact return type shape (domain types only), deserialization path, and which BCS types are used.

Required queries:
- `getHashiState()` → root Hashi object with Bag IDs
- `getDepositRequest(id)` → single deposit request | null
- `listDepositRequests({ cursor?, limit? })` → PaginatedResult<DepositRequest>
- `getWithdrawalRequest(id)` → single withdrawal request | null
- `listPendingWithdrawals({ cursor?, limit? })` → PaginatedResult<PendingWithdrawal>
- `getCommittee(epoch?)` → Committee (current epoch if omitted) | null
- `getMemberInfo(validatorAddress)` → MemberInfo | null
- `getConfig()` → typed config object (not VecMap)
- `getUtxo(txid, vout)` → Utxo | null
- `getEpochCerts(epoch, batchIndex?)` → EpochCerts | null

### Event System

The spec MUST define:
- A discriminated union `HashiEvent` with all 24 variants. The discriminant MUST be a string literal `type` field (e.g., `type: 'DepositRequested'`).
- `parseHashiEvent(event: SuiEvent, packageIds: Set<string>): HashiEvent | null` — best-effort public parser, returns `null` for unknown events.
- A stricter internal/debug parser or a result shape that includes parse failure reasons (e.g., `parseHashiEventStrict(): HashiEvent | ParseError`).
- Package-version matching: accept `Set<string>` of all known package IDs.
- Generic type parameter extraction for proposal events and treasury events.
- The exact discriminant fields and union shape.

### Bitcoin Helpers

- `encodeBitcoinAddress(witnessProgram, witnessVersion, network)` — bech32m for v1+ (Taproot), bech32 for v0 (SegWit)
- `decodeBitcoinAddress(address)` → `{ witnessProgram, witnessVersion, network }`
- `deriveDepositAddress(mpcPublicKey, derivationPath, network)` — Taproot address via secp256k1 (`@noble/curves`)
- `satsToBtc(sats)` and `btcToSats(btc)`
- Only 20-byte (P2WPKH, v0) and 32-byte (P2TR, v1) witness programs MUST be supported
- Throw `HashiBitcoinError` for invalid/unsupported inputs

### Type System

Three-layer model: Codegen → Domain → Conversion.

**Canonical type mappings** (the spec MUST use these, no ambiguity):

| Move Type | TypeScript Type | Rationale |
|---|---|---|
| `address` | `string` (0x-prefixed, lowercase, 66 chars) | `@mysten/sui` convention |
| `u64` | `bigint` | Precision safety |
| `vector<u8>` | `Uint8Array` | Standard binary |
| `Option<T>` | `T \| null` | Idiomatic TS |
| `Bag` | `{ id: string; size: number }` | Contents via dynamic field queries |
| `VecMap<K,V>` | `Array<{ key: K; value: V }>` | Preserves insertion order |
| `VecSet<T>` | `T[]` | Simple array |
| `CommitteeSignature` | `{ epoch: bigint; signature: Uint8Array; signersBitmap: Uint8Array }` | Flat |
| `ConfigValue` | Discriminated union with `type` field | Match Move enum |

**Normalization rules — the spec MUST define canonical public input forms for:**
- Sui addresses and object IDs: accepted string format (with/without 0x prefix, case, length), normalization behavior (lowercase, pad to 66 chars)
- Bitcoin txids: display order vs internal byte order, accepted string format, reversal policy
- Byte arrays: whether public APIs accept hex strings, Uint8Array, or both
- `u64` inputs: whether string or number inputs are accepted in addition to bigint, and bounds checking behavior

### Error Model

Typed error hierarchy rooted at `HashiError extends Error`:
- `HashiTransactionError` — Move abort mapping
- `HashiQueryError` — RPC/transport failures, object not found
- `HashiParseError` — BCS decode failures, unknown event types
- `HashiBitcoinError` — invalid addresses, unsupported formats
- `HashiConfigError` — invalid config values, missing fields

APIs MUST throw (not return Result-like values). Matches `@mysten/sui` convention.

**Validation timing**:
- Builder methods MUST validate input format synchronously before returning the closure
- Query methods MUST validate inputs before making RPC calls
- Best-effort parsers return `null`; strict parsers throw `HashiParseError`

**Abort code mapping**: Enumerate all known abort codes discoverable from the current Move package. Mark unknown/unverified mappings explicitly. Do not fabricate codes.

### Build, Packaging, and Module Exports

- Dual ESM/CJS output via esbuild (replicate `@mysten/build-scripts` locally)
- TypeScript >=5.x, strict mode, ES2020 target, `moduleResolution: "node"`
- Subpath exports in `package.json`: `.` (main), `./client`, `./transactions`, `./events`, `./bitcoin`, `./types`, `./queries`
- Generated TypeScript declarations alongside compiled output
- `@changesets/cli` for semantic versioning
- Minimum Node.js 18
- **Runtime compatibility**: MUST support Node.js and modern browsers. Runtime code MUST NOT use Node-only APIs (fs, path, crypto) unless isolated behind environment-specific entrypoints. `@noble/curves` and `@noble/hashes` are browser-compatible.
- CI: type-check + lint + unit tests on every PR; codegen `is-dirty` check ensures generated code is committed

### Testing

- vitest for all tests
- **BCS round-trips**: all generated types — serialize → deserialize → assert deep equality
- **Event parser**: all 24 variants with mock event data; test parsing from two different package IDs (simulating upgrade)
- **Transaction builders**: snapshot tests comparing PTB structure
- **Bitcoin helpers**: known test vectors (BIP-173, BIP-350 for bech32/bech32m; secp256k1 for derivation)
- **Config**: preset resolution, override behavior, validation errors
- **Errors**: abort code → message mapping for all known codes
- **Fixtures**: hand-crafted JSON/hex committed to repo (not generated at test time)
- **Coverage**: no global threshold, but all public API functions MUST have at least one test. High-risk modules (bitcoin, events, transaction builders, error mapping) SHOULD have ≥80% branch coverage.
- **Integration scaffolding**: placeholder structure for localnet testing (deposit, withdraw, cancel, queries) — optional in CI, gated behind env flag
- **Snapshot review**: snapshot updates MUST be reviewed in PR diffs

### Documentation

- README with quickstart: install, configure, create deposit, request withdrawal
- Package installation with peer dependency expectations (`@mysten/sui`)
- One end-to-end example for user flow (deposit → query status → withdraw)
- One end-to-end example for validator flow (register → confirm deposit → approve withdrawal)
- Server vs browser signing guidance (SuiClient.signAndExecute vs dapp-kit)
- Upgrade note about `packageId` vs `originalPackageId` handling
- TSDoc on all public functions and types
- Limitations and non-goals

### Non-Goals

The spec MUST explicitly list these as out of scope:
- Signer/wallet management or key custody
- Indexer or database integration
- React components or dapp-kit UI bindings
- MPC protocol implementation or BLS signing
- Bitcoin transaction construction or broadcasting
- Bitcoin full node integration
- Real-time WebSocket event subscription helpers (just parsing, not transport)
- Retry/backoff logic for RPC calls (caller's responsibility)

### Future Extension Points

The spec SHOULD identify these as natural future additions (out of scope for v1):
- WebSocket subscription helpers wrapping `SuiClient.subscribeEvent`
- Signer adapter interface for pluggable signing strategies
- Indexer adapter for historical queries
- React hooks package (`@hashi/react`) wrapping transaction builders

### Constraints

1. The Hashi Move package is external — codegen references it by relative path, not bundled
2. `originalPackageId` MUST be used for coin type StructTags
3. Current `packageId` MUST be used for Move call targets
4. `commit_withdrawal_tx` requires manual BCS double-encoding helper
5. `confirm_deposit` requires two-call PTB pattern
6. `cancel_withdrawal` MUST transferObjects the returned Coin<BTC> to sender
7. Only 20-byte (P2WPKH) and 32-byte (P2TR) Bitcoin addresses accepted
8. Random object `0x8` required by `commit_withdrawal_tx`
9. No public view functions on Hashi — all state reads via RPC

### Implementation Planning

End with a phased plan (5-7 cycles). For each phase include:
- Scope and concrete deliverables
- Dependencies on prior phases
- Exit criteria (objective, testable — e.g., "`npx tsc --noEmit` exits 0", "all vitest tests pass")
- Estimated complexity (simple / moderate / complex)
- Risks

Bias toward a spec that is explicit, implementable, and conservative about unsupported behavior.
