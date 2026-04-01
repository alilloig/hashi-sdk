# Planning Prompt v1

Generate a comprehensive project specification for **hashi-sdk**, a TypeScript SDK for the Hashi Bitcoin-on-Sui bridge.

## What to Build

A production-grade TypeScript SDK that provides complete programmatic access to the Hashi bridge protocol. The SDK wraps all on-chain Move operations (24 modules, 50+ public/entry functions) and provides typed state queries, event parsing, and Bitcoin address helpers.

## Architecture Requirements

### Package Structure
Follow the Mysten TS SDK ecosystem conventions (DeepBook v3, Walrus patterns):
```
src/
  client.ts          — HashiClient class (top-level convenience API)
  contracts/         — @mysten/codegen output (BCS types + Move function wrappers)
  transactions/      — Hand-written domain transaction classes
  types/             — TypeScript domain interfaces + BCS re-exports
  utils/             — Config, constants, helpers
  errors.ts          — Typed error hierarchy with Move abort code mapping
  bitcoin.ts         — bech32/bech32m encoding + deposit address derivation
```

### Codegen Foundation
Use `@mysten/codegen` as the primary type generation mechanism:
- `sui-codegen.config.ts` pointing at the Hashi Move package at a configurable relative path
- Generated output in `src/contracts/` — BCS struct definitions + per-function transaction wrappers
- Manual supplements only for patterns codegen can't handle (nested BCS double-encoding in `commit_withdrawal_tx`)

### API Design
Every transaction-building method returns `(tx: Transaction) => void | TransactionResult`:
```typescript
// Curried closure pattern
const addDeposit = client.createDepositRequest({ txid, vout, amount });
const tx = new Transaction();
tx.add(addDeposit);
// Caller signs and executes
```

The SDK must be **signing-agnostic** — it builds `Transaction` objects, never holds private keys. Compatible with both server-side `SuiClient.signAndExecuteTransaction()` and browser `dapp-kit` wallet signing.

### Config & Client
- `HashiConfig` class with env-based presets (`'mainnet' | 'testnet'`) + override capability for devnet/localnet
- Tracks three IDs: `packageId` (current, for Move calls), `originalPackageId` (stable, for StructTags like BTC coin type), `hashiObjectId` (stable, the shared Hashi object)
- `HashiClient` accepts `SuiClient` via constructor injection, composes all transaction sub-classes

## Functional Scope

### User-Facing Operations
1. **createDepositRequest(txid, vout, amount, derivationPath?)** — 5-step PTB: utxo_id → utxo → deposit_request → split fee → deposit
2. **requestWithdrawal(amount, bitcoinAddress)** — CoinWithBalance intent for BTC + Move call
3. **cancelWithdrawal(requestId)** — Move call + transferObjects for BTC refund to sender

### Validator/Committee Operations
4. **confirmDeposit(requestId, committeeSignature)** — Two-call pattern: new_committee_signature → confirm_deposit
5. **deleteExpiredDeposit(requestId)** — With Clock shared object
6. **approveWithdrawalRequests(approvals[])** — Batched multiple approvals in single PTB
7. **commitWithdrawalTx(commitment, signature)** — Nested BCS: vector<vector<u8>> for UtxoId/OutputUtxo + Clock + Random
8. **signWithdrawal(withdrawalId, requestIds, signatures, cert)** — Committee-certified
9. **confirmWithdrawal(withdrawalId, cert)** — Committee-certified
10. **deleteExpiredSpentUtxo(txid, vout)** — Cleanup
11. **register(suiSystem)** — Validator registration
12. **updatePublicKey/OperatorAddress/EndpointUrl/TlsKey/EncryptionKey** — 5 validator update methods
13. **startReconfig/endReconfig** — Epoch transition
14. **submitDkgCert/submitRotationCert/submitNonceCert/destroyAllCerts** — Certificate submission
15. **proposeUpdateConfig/EnableVersion/DisableVersion/Upgrade** — Governance proposals
16. **vote/removeVote/deleteExpiredProposal** — Proposal lifecycle (generic on proposal type T)

### Query Layer
- **getHashiState()** — Fetch and deserialize the root Hashi shared object
- **getDepositRequest(id)** — Dynamic field from deposit queue Bag
- **listDepositRequests(cursor?, limit?)** — Paginated query
- **getWithdrawalRequest(id)** — From withdrawal queue Bag
- **listPendingWithdrawals(cursor?, limit?)** — Paginated
- **getCommittee(epoch?)** — From committees Bag (current epoch default)
- **getMemberInfo(validatorAddress)** — From members Bag
- **getConfig()** — Parse VecMap<String, ConfigValue> into typed object
- **getUtxo(txid, vout)** — Active UTXO lookup

### Event System
- Discriminated union type `HashiEvent` with 24 variants
- `parseHashiEvent(event, packageIds)` dispatcher matching on `(module, name)` pairs
- BCS deserialization for each event type using codegen'd types
- Support multi-version package IDs for upgrade-safe event parsing
- Events with generic type params (Proposal events, Mint/Burn) extract the type parameter

### Bitcoin Helpers
- **bech32/bech32m encoding**: Convert human-readable Bitcoin addresses (bc1...) to raw witness programs
- **bech32/bech32m decoding**: Convert raw witness programs back to human-readable addresses
- **deriveDepositAddress(mpcPublicKey, derivationPath)**: Taproot address derivation using secp256k1 point arithmetic via `@noble/curves`
- **satsToBtc/btcToSats**: Amount conversion helpers

### Error Handling
- Base `HashiError extends Error` with subclasses
- Map all Move abort codes to human-readable messages (EUnauthorizedCancellation, ECooldownNotElapsed, etc.)
- Parse `MoveAbort` responses from transaction execution into typed errors
- Include module name and abort code in error message

## Type System

### Three-Layer Strategy
1. **Codegen layer** (`contracts/`): BCS-serializable types from `@mysten/codegen`
2. **Domain types** (`types/`): Developer-friendly TypeScript interfaces (string for addresses, bigint for u64, Uint8Array for bytes)
3. **Conversion layer**: Bidirectional mapping between codegen and domain types

### Key Type Mappings
| Move | TypeScript |
|---|---|
| `address` | `string` (0x-prefixed hex) |
| `u64` | `bigint` |
| `vector<u8>` | `Uint8Array` |
| `Option<T>` | `T \| null` |
| `Bag` | `{ id: string; size: number }` (contents via dynamic field queries) |
| `VecMap<K,V>` | `Map<K, V>` or `Array<{key: K, value: V}>` |
| `CommitteeSignature` | `{ epoch: bigint; signature: Uint8Array; signersBitmap: Uint8Array }` |

## Build & Tooling

- **Build**: Dual CJS/ESM output via esbuild (replicate `@mysten/build-scripts` pattern locally)
- **TypeScript**: >=5.x, strict mode, ES2020 target
- **Tests**: vitest for unit tests (BCS round-trips, event parsing, builder snapshots)
- **Codegen**: `sui-ts-codegen generate` as npm script, requires Sui CLI
- **Versioning**: `@changesets/cli` for semantic versioning
- **Linting**: ESLint + Prettier

## Dependencies

### Runtime
- `@mysten/sui` (>=1.x) — Transaction, SuiClient, bcs, types
- `@mysten/bcs` — BCS primitives
- `@noble/curves` — secp256k1 for deposit address derivation
- `@noble/hashes` — SHA256 for Bitcoin txid handling (peer of @noble/curves)

### Development
- `@mysten/codegen` — Move type/function generation
- `typescript` >=5.x
- `vitest` — testing
- `@changesets/cli` — versioning
- `esbuild` — bundling
- `eslint` + `prettier` — code quality

## Testing Strategy

### Unit Tests
- BCS round-trip for all ~30 types: serialize → deserialize → assert equality
- Event parser: mock event data for all 24 event variants
- Transaction builder output: snapshot tests comparing PTB structure
- Bitcoin address encoding/decoding: known test vectors
- Config: network preset resolution, override behavior
- Error mapping: abort codes → human-readable messages

### Integration Test Scaffolding
- Placeholder test structure for Sui localnet + published Hashi Move package
- Key flows: deposit request, withdrawal request, cancel withdrawal, state queries
- Event subscription and parsing against live events

## Constraints

1. The Hashi Move package is external — codegen references it by relative path, not bundled
2. `originalPackageId` must be used for coin type StructTags (e.g., `{originalPkg}::btc::BTC`)
3. Current `packageId` for Move call targets (changes on upgrade)
4. `commit_withdrawal_tx` requires manual BCS double-encoding helper
5. `confirm_deposit` requires two-call PTB pattern (new_committee_signature → confirm_deposit)
6. `cancel_withdrawal` must transferObjects the returned Coin<BTC> to sender
7. Only 20-byte (P2WPKH) and 32-byte (P2TR) Bitcoin addresses accepted
8. `abort_reconfig` always aborts — do not expose
9. Random object `0x8` required by `commit_withdrawal_tx`
10. No public view functions on Hashi — all state reads via RPC object queries
