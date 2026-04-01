# hashi-sdk -- Specification

## 1. Executive Summary

`hashi-sdk` is a production-grade TypeScript SDK for the Hashi Bitcoin-on-Sui bridge. Hashi is a Sui-native bridge where users deposit native BTC to receive hBTC (`Coin<BTC>`) on Sui, and withdraw by burning hBTC back to a Bitcoin address. A committee of Sui validators operates the bridge via threshold MPC (BLS12-381 Schnorr) with a Guardian 2-of-2 Taproot multisig.

The Hashi codebase today is purely Rust + Move (~40k lines Rust, 24 Move modules). No TypeScript SDK exists. This project builds one from scratch in a standalone repository, translating the Rust `SuiTxExecutor` (14 transaction methods) and `hashi-types` (35+ data types, 24 event types) into idiomatic TypeScript that integrates with the `@mysten/sui` ecosystem. The SDK serves dApp developers (deposit, withdraw, query balance) and validator operators (committee management, governance proposals, certificate submission).

The SDK MUST be signing-agnostic -- it builds `Transaction` objects only, never holds private keys. It is compatible with server-side `SuiClient.signAndExecuteTransaction()` and browser dapp-kit wallet signing. It uses `@mysten/codegen` as the primary type-generation mechanism, with hand-written wrappers only where codegen cannot express the required patterns.

## 2. Goals and Non-Goals

### Goals

- Provide a complete, type-safe TypeScript API covering all user-facing and validator operations exposed by the Hashi Move package.
- Use `@mysten/codegen` to generate BCS types and Move function wrappers, minimizing manual boilerplate.
- Follow established Mysten ecosystem conventions (DeepBook v3, Walrus SDK patterns) for transaction building, client architecture, and packaging.
- Support both Node.js (>=18) and modern browser runtimes.
- Ship with comprehensive unit tests, TSDoc, and usage documentation.
- Publish as a dual ESM/CJS package with subpath exports and tree-shakable imports.

### Non-Goals (Explicitly Out of Scope)

- **Signer/wallet management or key custody**: The SDK never holds private keys.
- **Indexer or database integration**: No persistent storage layer.
- **React components or dapp-kit UI bindings**: No frontend framework code.
- **MPC protocol implementation or BLS signing**: The SDK accepts pre-computed committee signatures; it does not perform BLS operations.
- **Bitcoin transaction construction or broadcasting**: The SDK encodes/decodes Bitcoin addresses and derives deposit addresses, but does not build or broadcast Bitcoin transactions.
- **Bitcoin full node integration**: No RPC calls to a Bitcoin node.
- **Real-time WebSocket event subscription helpers**: The SDK parses events but does not manage subscriptions or reconnection.
- **Retry/backoff logic for RPC calls**: Caller's responsibility.
- **`abort_reconfig`**: Always aborts on-chain (hard-coded `abort EAbortReconfigDisabled`). MUST NOT be exposed.
- **`finish_publish`**: One-time deploy function. MUST NOT be exposed.

## 3. Assumptions and External Dependencies

### Assumptions (to validate during implementation)

1. **A-CODEGEN**: `@mysten/codegen` can generate usable BCS type definitions and Move function wrappers for the Hashi Move package. If codegen fails on specific modules or types, manual BCS definitions MUST be written as fallbacks.
2. **A-MOVE-SUMMARY**: The Hashi Move package compiles successfully with `sui move build` and `sui move summary` produces output compatible with the codegen tool. The Sui CLI MUST be available in the development and CI environments.
3. **A-BCS-VECVEC**: Codegen will NOT handle the `vector<vector<u8>>` double-encoding pattern required by `commit_withdrawal_tx`. Manual BCS encoding MUST be provided for `UtxoId` and `OutputUtxo` serialization into byte vectors.
4. **A-BTC-STRUCT-TAG**: The BTC coin type uses `originalPackageId` in its StructTag (e.g., `{originalPackageId}::btc::BTC`), not the current upgraded package ID.
5. **A-DYNAMIC-FIELDS**: The Hashi shared object stores sub-state (deposit requests, withdrawal requests, committees, UTXOs, proposals, TOB certs) in `Bag` dynamic fields. The SDK reads these via `getDynamicFieldObject` / `getDynamicFields` RPC calls.
6. **A-ENTRY-VS-PUBLIC**: The Move package uses both `public fun` and `entry fun` for different operations. Codegen SHOULD generate wrappers for both. Entry functions that construct `CommitteeSignature` internally (e.g., `approve_request`, `commit_withdrawal_tx`, `sign_withdrawal`, `confirm_withdrawal`) accept raw `epoch`, `signature`, and `signers_bitmap` parameters directly -- they do NOT take a `CommitteeSignature` object.
7. **A-WITHDRAW-CANCEL-RETURN**: `cancel_withdrawal` returns `Coin<BTC>` which MUST be captured and transferred to the sender via `transferObjects`.
8. **A-PROPOSAL-TYPE-PARAMS**: Proposal events use `phantom T` type parameters. The `T` in the StructTag identifies the proposal type (UpdateConfig, EnableVersion, DisableVersion, Upgrade). The SDK MUST extract this type parameter string from the event's StructTag.

### External Dependencies

| Dependency | Role | Version Constraint |
|---|---|---|
| `@mysten/sui` | Sui client, Transaction, BCS utilities | >=1.x (peer dependency) |
| `@mysten/bcs` | BCS serialization (via @mysten/sui re-export) | Transitive via @mysten/sui |
| `@noble/curves` | secp256k1 point arithmetic for deposit address derivation | >=1.x |
| `@noble/hashes` | SHA-256, RIPEMD-160 for Bitcoin address operations | >=1.x |
| `@mysten/codegen` | Move type/function code generation (dev only) | >=0.5.x |
| `typescript` | Type checking and declaration generation | >=5.x |
| `vitest` | Unit testing framework | >=3.x |
| `esbuild` | Dual ESM/CJS bundling | >=0.20.x |
| `@changesets/cli` | Semantic versioning and changelog | >=2.x |

### External Systems

- **Hashi Move package**: Referenced by relative path from `sui-codegen.config.ts`. The Move package MUST be locally available and compilable. It is NOT bundled into this repository.
- **Sui RPC**: All on-chain reads use the Sui JSON-RPC API via `SuiClient`. The SDK assumes a standard Sui RPC endpoint (fullnode or similar).
- **Sui CLI**: Required for `sui move build` and `sui move summary` during codegen. MUST be installed in dev/CI environments.

## 4. Architecture and Package Layout

### Directory Structure

```
hashi-sdk/
  src/
    index.ts               -- Package root barrel export
    client.ts              -- HashiClient class
    contracts/             -- @mysten/codegen output (GENERATED, committed)
    transactions/          -- Hand-written transaction builder functions
    queries/               -- Read/query layer for on-chain state
    events/                -- Event parsing and discriminated union types
    types/                 -- Domain TypeScript interfaces + BCS re-exports
    utils/                 -- HashiConfig class, constants, network presets
    errors.ts              -- Typed error hierarchy
    bitcoin.ts             -- bech32/bech32m encoding + deposit address derivation
  tests/                   -- vitest test files
    fixtures/              -- Hand-crafted JSON/hex test fixtures
  sui-codegen.config.ts    -- Codegen configuration
  package.json
  tsconfig.json            -- CJS TypeScript config
  tsconfig.esm.json        -- ESM TypeScript config
  vitest.config.ts
```

### Responsibility Boundaries

| Directory | Responsibility | Generated vs Handwritten | Public Export |
|---|---|---|---|
| `contracts/` | BCS type definitions and raw Move function call wrappers from codegen | **Generated** (committed to repo) | Internal only -- not directly exported to consumers |
| `transactions/` | Domain-level transaction builder functions that compose codegen wrappers into correct PTBs | Handwritten | Yes, via `./transactions` subpath |
| `queries/` | On-chain state reads via RPC, deserialization, pagination | Handwritten | Yes, via `./queries` subpath |
| `events/` | Event type definitions, discriminated union, parser functions | Handwritten | Yes, via `./events` subpath |
| `types/` | Domain TypeScript interfaces, BCS re-exports from contracts/, type conversion utilities | Handwritten (re-exports generated) | Yes, via `./types` subpath |
| `utils/` | `HashiConfig`, network presets, well-known object IDs, shared constants | Handwritten | Internal primarily; config exported via `./client` |
| `errors.ts` | Error class hierarchy and abort code mapping | Handwritten | Yes, via root export |
| `bitcoin.ts` | Bitcoin address encoding/decoding, deposit address derivation | Handwritten | Yes, via `./bitcoin` subpath |
| `client.ts` | `HashiClient` facade composing transactions, queries, events | Handwritten | Yes, via root export and `./client` subpath |

### Key Architectural Decisions

**Decision: Codegen as foundation, not facade.** The `contracts/` directory contains raw codegen output. The `transactions/` directory wraps codegen functions to handle multi-step PTBs, special encoding, and domain validation. SDK consumers interact with `transactions/` or `HashiClient`, never `contracts/` directly.

**Rationale**: Codegen produces correct BCS types and single-function call wrappers, but cannot express multi-step PTBs (5-step deposit), nested BCS encoding (commit_withdrawal_tx), CoinWithBalance intents, or transferObjects patterns. The handwritten layer adds these while staying thin.

**Decision: HashiClient as convenience facade, not mandatory.** All transaction builders, queries, and event parsers MUST be usable standalone without `HashiClient`. `HashiClient` composes them for convenience.

**Rationale**: dApp developers want a simple client. Validator operators and advanced users want fine-grained control. Both are served.

**Decision: Config as internal DI.** `HashiConfig` is instantiated once and passed internally to all subsystems. It is not passed to every public function call.

## 5. Public API Surface and Exports

### Package Exports Map (`package.json` `exports` field)

```
"."           -- HashiClient, HashiConfig, error types, top-level re-exports
"./client"    -- HashiClient, HashiConfig
"./transactions" -- All transaction builder functions
"./queries"   -- All query functions
"./events"    -- HashiEvent union type, parseHashiEvent, parseHashiEventStrict
"./bitcoin"   -- encodeBitcoinAddress, decodeBitcoinAddress, deriveDepositAddress, satsToBtc, btcToSats
"./types"     -- All domain type interfaces and BCS re-exports
```

Each subpath export MUST provide both ESM and CJS entrypoints with TypeScript declarations.

### Tree-Shaking

Each subpath export MUST be independently importable. A consumer importing only `hashi-sdk/bitcoin` MUST NOT pull in `@mysten/sui` or any other heavy dependency not required by that subpath. The `bitcoin.ts` module MUST depend only on `@noble/curves` and `@noble/hashes`.

## 6. Transaction-Building Design

### Builder Contract

All write operations MUST return a function with this signature:

```
(tx: Transaction) => void | TransactionResult
```

This is the canonical builder return type, referred to as a "transaction plugin" throughout this spec. Builders that create objects whose handles are needed by subsequent calls (e.g., `cancel_withdrawal` capturing the returned coin) MUST return `TransactionResult`. Builders that produce only side effects (e.g., `confirmDeposit`) MAY return `void`.

Callers compose builders via `tx.add()`:

```typescript
const op = client.createDepositRequest({ txid, vout, amount });
const tx = new Transaction();
tx.add(op);
// Caller signs and executes
```

### Input Validation

Builder methods MUST validate input format synchronously before returning the closure:

- Sui addresses/object IDs: MUST be valid hex strings (with or without `0x` prefix), normalized to lowercase 0x-prefixed 66-character form. Invalid format throws `HashiTransactionError`.
- Bitcoin txids: MUST be 32 bytes (as hex string or Uint8Array). Invalid length throws `HashiTransactionError`.
- Byte arrays (signatures, bitmaps): MUST be `Uint8Array` or hex strings. Length validation where known (e.g., signers_bitmap is variable but non-empty).
- `u64` values: MUST be `bigint` or `number` (numbers MUST be safe integers, i.e. `<= Number.MAX_SAFE_INTEGER`). Negative values throw `HashiTransactionError`.

Semantic validation (e.g., "does this deposit request exist?", "is the request already approved?") is deferred to on-chain execution.

**Validator operation preflight checks** (format/cardinality, not business logic):
- `signersBitmap` MUST be non-empty (length > 0).
- `signature` MUST be exactly 48 bytes (compressed G2 point for BLS12-381).
- `commitWithdrawalTx`: `selectedUtxos` MUST have no duplicates and length > 0; `requestIds` MUST have no duplicates and length > 0; `outputs.length` MUST equal `requestIds.length` or `requestIds.length + 1` (change output); outputs with raw byte addresses MUST have supported witness program lengths (20 or 32 bytes).
- `signWithdrawal`: `signatures` array length MUST be > 0.
- `txid` inputs MUST be normalized and validated consistently across all operations (not just user-facing deposit flow).

### User-Facing Operations

#### `createDepositRequest`

**Parameters**: `{ txid: string, vout: number, amount: bigint, derivationPath?: string }`

**PTB Steps** (5-step):
1. `utxo::utxo_id(txid, vout)` -- creates `UtxoId` (pure return)
2. `utxo::utxo(utxo_id, amount, derivation_path)` -- creates `Utxo` (pure return)
3. `deposit_queue::deposit_request(utxo, clock)` -- creates `DepositRequest` (Clock `0x6` immutable shared)
4. `tx.splitCoins(tx.gas, [0n])` -- split zero SUI for fee coin
5. `deposit::deposit(hashi, deposit_request, fee_coin)` -- Hashi mutable shared

**Returns**: `(tx: Transaction) => void`

**Notes**: The `txid` parameter is a Bitcoin transaction ID (32-byte hash). It is passed to the Move function as an `address` (32 bytes). The SDK MUST accept txid as a 64-character hex string (display byte order) and convert to the Sui address format. The `derivationPath` is optional and passed as `Option<address>`.

#### `requestWithdrawal`

**Parameters**: `{ amount: bigint, bitcoinAddress: string | Uint8Array }`

**PTB Steps**:
1. Create BTC coin via `CoinWithBalance` intent with type `{originalPackageId}::btc::BTC` and specified amount
2. `withdraw::request_withdrawal(hashi, clock, btc_coin, bitcoin_address)` -- Hashi mutable shared, Clock `0x6` immutable shared

**Returns**: `(tx: Transaction) => void`

**Notes**: If `bitcoinAddress` is a string, it MUST be decoded from bech32/bech32m to extract the witness program bytes. Only 20-byte (P2WPKH) and 32-byte (P2TR) witness programs are accepted. The BTC coin type MUST use `originalPackageId` in the StructTag.

#### `cancelWithdrawal`

**Parameters**: `{ requestId: string }`

**PTB Steps**:
1. `withdraw::cancel_withdrawal(hashi, request_id, clock)` -- returns `Coin<BTC>`
2. `tx.transferObjects([returned_coin], tx.pure.address(sender))` -- transfer refund to sender

**Returns**: `(tx: Transaction) => TransactionResult`

**Notes**: The returned `Coin<BTC>` MUST be transferred to the transaction sender. The SDK uses `tx.pure.address()` with the sender placeholder (resolved at execution time by the Sui runtime). The `Coin<BTC>` return from the Move call MUST be captured as a `TransactionResult` and passed to `transferObjects`.

### Validator/Committee Operations

All validator operations require committee signatures. The SDK accepts raw signature components (`epoch`, `signature`, `signersBitmap`) and passes them to the Move functions. The SDK does NOT construct or verify BLS signatures.

#### `confirmDeposit`

**Parameters**: `{ requestId: string, epoch: bigint, signature: Uint8Array, signersBitmap: Uint8Array }`

**PTB Steps** (two-call):
1. `committee::new_committee_signature(epoch, signature, signers_bitmap)` -- returns `CommitteeSignature` object
2. `deposit::confirm_deposit(hashi, request_id, committee_sig)` -- Hashi mutable shared

**Returns**: `(tx: Transaction) => void`

**Notes**: This is the unique two-call pattern. The `CommitteeSignature` is constructed in the PTB by calling the Move constructor, not serialized client-side. This differs from `approve_request` and other entry functions which accept raw components.

#### `deleteExpiredDeposits`

**Parameters**: `{ requestIds: string[] }`

**PTB Steps** (batched):
- For each `requestId`: `deposit::delete_expired_deposit(hashi, request_id, clock)` -- Hashi mutable shared, Clock `0x6` immutable shared

**Returns**: `(tx: Transaction) => void`

#### `approveWithdrawalRequests`

**Parameters**: `{ approvals: Array<{ requestId: string, epoch: bigint, signature: Uint8Array, signersBitmap: Uint8Array }> }`

**PTB Steps** (batched):
- For each approval: `withdraw::approve_request(hashi, request_id, epoch, signature, signers_bitmap)` -- Hashi mutable shared

**Returns**: `(tx: Transaction) => void`

**Notes**: `approve_request` is an `entry fun` that constructs `CommitteeSignature` internally from the raw components.

#### `commitWithdrawalTx`

**Parameters**: `{ requestIds: string[], selectedUtxos: Array<{ txid: string, vout: number }>, outputs: Array<{ amount: bigint, bitcoinAddress: Uint8Array }>, txid: string, epoch: bigint, signature: Uint8Array, signersBitmap: Uint8Array }`

**PTB Steps**:
1. BCS-encode each `UtxoId` (`{ txid: address, vout: u32 }`) individually to `Uint8Array`, collect as `vector<vector<u8>>`
2. BCS-encode each `OutputUtxo` (`{ amount: u64, bitcoin_address: vector<u8> }`) individually to `Uint8Array`, collect as `vector<vector<u8>>`
3. `withdraw::commit_withdrawal_tx(hashi, request_ids, selected_utxos_bcs, outputs_bcs, txid, epoch, signature, signers_bitmap, clock, random)` -- Hashi mutable shared, Clock `0x6` immutable, Random `0x8` immutable

**Returns**: `(tx: Transaction) => void`

**Notes**: This is the nested BCS double-encoding pattern. Each `UtxoId` and `OutputUtxo` is BCS-serialized to bytes, then the vectors of byte-vectors are passed as `vector<vector<u8>>` to the Move function. The codegen wrapper MUST NOT be used for this function; a manual builder is required.

#### `signWithdrawal`

**Parameters**: `{ withdrawalId: string, requestIds: string[], signatures: Uint8Array[], epoch: bigint, signature: Uint8Array, signersBitmap: Uint8Array }`

**PTB Steps**:
1. `withdraw::sign_withdrawal(hashi, withdrawal_id, request_ids, signatures, epoch, signature, signers_bitmap)` -- Hashi mutable shared

**Returns**: `(tx: Transaction) => void`

#### `confirmWithdrawal`

**Parameters**: `{ withdrawalId: string, epoch: bigint, signature: Uint8Array, signersBitmap: Uint8Array }`

**PTB Steps**:
1. `withdraw::confirm_withdrawal(hashi, withdrawal_id, epoch, signature, signers_bitmap)` -- Hashi mutable shared

**Returns**: `(tx: Transaction) => void`

#### `deleteExpiredSpentUtxo`

**Parameters**: `{ txid: string, vout: number }`

**PTB Steps**:
1. `withdraw::delete_expired_spent_utxo(hashi, txid, vout)` -- Hashi mutable shared

**Returns**: `(tx: Transaction) => void`

#### `register`

**Parameters**: None (sender is the validator)

**PTB Steps**:
1. `validator::register(hashi, sui_system)` -- Hashi mutable shared, SuiSystem `0x5` immutable shared

**Returns**: `(tx: Transaction) => void`

#### Validator Update Methods (5 separate)

Each follows the same pattern:

- `updatePublicKey({ validatorAddress, publicKey, proofOfPossession })` -- `validator::update_next_epoch_public_key(hashi, validator, public_key, pop_signature)`
- `updateOperatorAddress({ validatorAddress, operator })` -- `validator::update_operator_address(hashi, validator, operator)`
- `updateEndpointUrl({ validatorAddress, endpointUrl })` -- `validator::update_endpoint_url(hashi, validator, endpoint_url)`
- `updateTlsPublicKey({ validatorAddress, tlsPublicKey })` -- `validator::update_tls_public_key(hashi, validator, tls_public_key)`
- `updateEncryptionPublicKey({ validatorAddress, encryptionPublicKey })` -- `validator::update_next_epoch_encryption_public_key(hashi, validator, encryption_public_key)`

All take Hashi mutable shared. All return `(tx: Transaction) => void`.

#### `startReconfig`

**Parameters**: None

**PTB Steps**:
1. `reconfig::start_reconfig(hashi, sui_system)` -- Hashi mutable shared, SuiSystem `0x5` immutable shared

**Returns**: `(tx: Transaction) => void`

#### `endReconfig`

**Parameters**: `{ mpcPublicKey: Uint8Array, signature: Uint8Array, signersBitmap: Uint8Array }`

**PTB Steps**:
1. `reconfig::end_reconfig(hashi, mpc_public_key, signature, signers_bitmap)` -- Hashi mutable shared

**Returns**: `(tx: Transaction) => void`

#### Certificate Submission (3 methods + 1 destroy)

- `submitDkgCert({ epoch, dealer, messagesHash, signature, signersBitmap })` -- `cert_submission::submit_dkg_cert(hashi, epoch, dealer, messages_hash, signature, signers_bitmap)`
- `submitRotationCert({ epoch, dealer, messagesHash, signature, signersBitmap })` -- `cert_submission::submit_rotation_cert(hashi, epoch, dealer, messages_hash, signature, signers_bitmap)`
- `submitNonceCert({ epoch, batchIndex, dealer, messagesHash, signature, signersBitmap })` -- `cert_submission::submit_nonce_cert(hashi, epoch, batch_index, dealer, messages_hash, signature, signers_bitmap)`
- `destroyAllCerts({ epoch, batchIndex? })` -- `cert_submission::destroy_all_certs(hashi, epoch, batch_index)`

All take Hashi mutable shared. All return `(tx: Transaction) => void`.

**Note**: `submit_nonce_cert` takes `batch_index: u32` as a required parameter (not optional). `destroy_all_certs` takes `batch_index: Option<u32>`.

#### Governance Proposal Lifecycle

Proposal operations are generic over the proposal type `T`. The SDK MUST provide concrete methods for each of the 4 proposal types.

**Propose methods** (one per type):
- `proposeUpdateConfig({ key, value, metadata })` -- `update_config::propose(hashi, key, value, metadata, clock)`
- `proposeEnableVersion({ version, metadata })` -- `enable_version::propose(hashi, version, metadata, clock)`
- `proposeDisableVersion({ version, metadata })` -- `disable_version::propose(hashi, version, metadata, clock)`
- `proposeUpgrade({ digest, metadata })` -- `upgrade::propose(hashi, digest, metadata, clock)`

**Generic operations** (parameterized by proposal type string):
- `vote({ proposalId, proposalType })` -- `proposal::vote<T>(hashi, proposal_id, clock)`
- `removeVote({ proposalId, proposalType })` -- `proposal::remove_vote<T>(hashi, proposal_id)`
- `deleteExpiredProposal({ proposalId, proposalType })` -- `proposal::delete_expired<T>(hashi, proposal_id, clock)`

**Execute methods** (one per type, since return types differ):
- `executeUpdateConfig({ proposalId })` -- `update_config::execute(hashi, proposal_id, clock)`
- `executeEnableVersion({ proposalId })` -- `enable_version::execute(hashi, proposal_id, clock)`
- `executeDisableVersion({ proposalId })` -- `disable_version::execute(hashi, proposal_id, clock)`
- `executeUpgrade({ proposalId })` -- `upgrade::execute(hashi, proposal_id, clock)` -- returns `UpgradeTicket`
- `finalizeUpgrade({ receipt })` -- `upgrade::finalize_upgrade(hashi, receipt)`

**Note on `proposalType`**: For generic methods (`vote`, `removeVote`, `deleteExpiredProposal`), the SDK MUST accept a string identifier for the type parameter (e.g., `'UpdateConfig'`, `'EnableVersion'`, `'DisableVersion'`, `'Upgrade'`) and resolve it to the correct Move type argument using `{packageId}::{module}::{Type}`.

All take Hashi mutable shared and Clock `0x6` immutable shared (where applicable). All return `(tx: Transaction) => void` except `executeUpgrade` which returns `(tx: Transaction) => TransactionResult` (for the `UpgradeTicket`).

### Shared Object Arguments

The following well-known shared objects are used across transaction builders:

| Object | Address | Mutability | Used By |
|---|---|---|---|
| Hashi | `hashiObjectId` (from config) | Mutable | All operations |
| Clock | `0x6` | Immutable | deposit, withdrawal, cancel, commit, proposals, delete_expired |
| SuiSystem | `0x5` | Immutable | register, start_reconfig |
| Random | `0x8` | Immutable | commit_withdrawal_tx only |

## 7. Query/Read-Layer Design

### Design Rationale

Because Hashi exposes NO public view functions (all getters are `public(package)`), ALL reads MUST use Sui RPC object queries (`getObject`, `getDynamicFieldObject`, `getDynamicFields`). The query layer deserializes BCS-encoded object content into domain types.

### Pagination Contract

All list queries MUST return:

```typescript
interface PaginatedResult<T> {
  items: T[];
  nextCursor: string | null;
  hasNextPage: boolean;
}
```

This mirrors the Sui RPC pagination model. The `cursor` is opaque (Sui's internal cursor format). List methods accept `{ cursor?: string, limit?: number }` parameters.

**Ordering**: Items are returned in the order provided by `getDynamicFields`, which is insertion order for Bag dynamic fields. The SDK does NOT re-sort results.

### Error Semantics

- **Object not found**: Singular getters (e.g., `getDepositRequest`) MUST return `null`.
- **Invalid input** (malformed address, invalid config): MUST throw `HashiConfigError` or `HashiQueryError`.
- **BCS decode failure**: MUST throw `HashiParseError`.
- **RPC transport failure**: MUST throw `HashiQueryError` wrapping the underlying RPC error.

### Query Methods

#### `getHashiState()`

**Returns**: Root `Hashi` object with Bag IDs for sub-queries.

**Domain type shape**:
```typescript
{
  id: string;                    // object ID
  committeeSet: {
    members: { id: string; size: number };
    epoch: bigint;
    committees: { id: string; size: number };
    pendingEpochChange: bigint | null;
    mpcPublicKey: Uint8Array;
  };
  config: {
    config: Array<{ key: string; value: ConfigValue }>;
    enabledVersions: bigint[];
    upgradeCap: { id: string; package: string; version: bigint; policy: number } | null;
  };
  treasury: {
    objects: { id: string; size: number };
  };
  depositQueue: {
    requests: { id: string; size: number };
  };
  withdrawalQueue: {
    requests: { id: string; size: number };
    pendingWithdrawals: { id: string; size: number };
    numConsumedPresigs: bigint;
  };
  utxoPool: {
    activeUtxos: { id: string; size: number };
    spentUtxos: { id: string; size: number };
  };
  proposals: { id: string; size: number };
  tob: { id: string; size: number };
}
```

**Deserialization**: `getObject` with BCS content option on the Hashi object ID, then BCS-decode as `Hashi` struct.

#### `getDepositRequest(id: string)`

**Returns**: `DepositRequest | null`

**Domain type shape**:
```typescript
{
  id: string;
  utxo: {
    id: { txid: string; vout: number };
    amount: bigint;
    derivationPath: string | null;
  };
  timestampMs: bigint;
  requesterAddress: string;
  suiTxDigest: string;
}
```

**Deserialization**: Fetch the Hashi state to get `depositQueue.requests.id` (Bag ID), then `getDynamicFieldObject` with key type `address` and the deposit request ID.

#### `listDepositRequests({ cursor?, limit? })`

**Returns**: `PaginatedResult<DepositRequest>`

**Deserialization**: `getDynamicFields` on the deposit queue Bag ID, then batch-fetch each field object and deserialize.

#### `getWithdrawalRequest(id: string)`

**Returns**: `WithdrawalRequest | null`

**Domain type shape**:
```typescript
{
  info: {
    id: string;
    btcAmount: bigint;
    bitcoinAddress: Uint8Array;
    timestampMs: bigint;
    requesterAddress: string;
    suiTxDigest: string;
  };
  btc: bigint;          // balance amount
  approved: boolean;
}
```

**Deserialization**: Fetch from `withdrawalQueue.requests` Bag.

#### `listPendingWithdrawals({ cursor?, limit? })`

**Returns**: `PaginatedResult<PendingWithdrawal>`

**Domain type shape**:
```typescript
{
  id: string;
  txid: string;
  requests: WithdrawalRequestInfo[];
  inputs: Utxo[];
  withdrawalOutputs: OutputUtxo[];
  changeOutput: OutputUtxo | null;
  timestampMs: bigint;
  randomness: Uint8Array;
  signatures: Uint8Array[] | null;
}
```

**Deserialization**: Fetch from `withdrawalQueue.pendingWithdrawals` Bag.

#### `getCommittee(epoch?: bigint)`

**Returns**: `Committee | null`

If `epoch` is omitted, the SDK MUST first fetch the Hashi state to determine the current epoch, then fetch the committee for that epoch.

**Domain type shape**:
```typescript
{
  epoch: bigint;
  members: Array<{
    validatorAddress: string;
    publicKey: Uint8Array;
    encryptionPublicKey: Uint8Array;
    weight: bigint;
  }>;
  totalWeight: bigint;
}
```

**Deserialization**: Fetch from `committeeSet.committees` Bag with key type `u64` (epoch number).

#### `getMemberInfo(validatorAddress: string)`

**Returns**: `MemberInfo | null`

**Domain type shape**:
```typescript
{
  validatorAddress: string;
  operatorAddress: string;
  nextEpochPublicKey: Uint8Array;
  endpointUrl: string;
  tlsPublicKey: Uint8Array;
  nextEpochEncryptionPublicKey: Uint8Array;
}
```

**Deserialization**: Fetch from `committeeSet.members` Bag with key type `address` (validator address).

#### `getConfig()`

**Returns**: Typed config object (not raw VecMap).

**Domain type shape**:
```typescript
{
  entries: Array<{ key: string; value: ConfigValue }>;
  enabledVersions: bigint[];
  upgradeCap: { id: string; package: string; version: bigint; policy: number } | null;
}
```

**Note**: The config entries are stored as `VecMap<String, Value>`. The SDK MAY provide convenience accessor methods for well-known config keys (e.g., `depositFee()`, `withdrawalMinimum()`).

#### `getUtxo(txid: string, vout: number)`

**Returns**: `Utxo | null`

**Deserialization**: Fetch from `utxoPool.activeUtxos` Bag. The key type is `UtxoId` (BCS-encoded struct).

**Note**: This query requires constructing the BCS-encoded `UtxoId` as the dynamic field key. This is a case where manual BCS encoding is needed for the query key, not just the value.

#### `getEpochCerts(epoch: bigint, batchIndex?: number)`

**Returns**: `EpochCertsV1 | null`

**Deserialization**: Fetch from `tob` Bag. The key type is `TobKey` (BCS-encoded struct containing epoch and optional batch_index).

**Domain type shape**:
```typescript
{
  epoch: bigint;
  protocolType: 'Dkg' | 'KeyRotation' | 'NonceGeneration';
  certs: {
    id: string;
    size: bigint;
    head: string | null;
    tail: string | null;
  };
}
```

## 8. Event Parsing Design

### Discriminated Union

The SDK MUST define a discriminated union `HashiEvent` with 25 variants. The discriminant field MUST be `type` with string literal values.

**Variant mapping** (Move module::name -> SDK type discriminant):

| Move Type | Module | SDK `type` Discriminant |
|---|---|---|
| `DepositRequestedEvent` | `deposit` | `'DepositRequested'` |
| `DepositConfirmedEvent` | `deposit` | `'DepositConfirmed'` |
| `ExpiredDepositDeletedEvent` | `deposit` | `'ExpiredDepositDeleted'` |
| `WithdrawalRequestedEvent` | `withdrawal_queue` | `'WithdrawalRequested'` |
| `WithdrawalApprovedEvent` | `withdrawal_queue` | `'WithdrawalApproved'` |
| `WithdrawalPickedForProcessingEvent` | `withdrawal_queue` | `'WithdrawalPickedForProcessing'` |
| `WithdrawalSignedEvent` | `withdrawal_queue` | `'WithdrawalSigned'` |
| `WithdrawalConfirmedEvent` | `withdrawal_queue` | `'WithdrawalConfirmed'` |
| `WithdrawalCancelledEvent` | `withdrawal_queue` | `'WithdrawalCancelled'` |
| `ValidatorRegistered` | `validator` | `'ValidatorRegistered'` |
| `ValidatorUpdated` | `validator` | `'ValidatorUpdated'` |
| `StartReconfigEvent` | `reconfig` | `'StartReconfig'` |
| `EndReconfigEvent` | `reconfig` | `'EndReconfig'` |
| `AbortReconfigEvent` | `reconfig` | `'AbortReconfig'` |
| `UtxoSpentEvent` | `utxo_pool` | `'UtxoSpent'` |
| `SpentUtxoDeletedEvent` | `utxo_pool` | `'SpentUtxoDeleted'` |
| `MintEvent<T>` | `treasury` | `'Mint'` |
| `BurnEvent<T>` | `treasury` | `'Burn'` |
| `ProposalCreatedEvent<T>` | `proposal_events` | `'ProposalCreated'` |
| `VoteCastEvent<T>` | `proposal_events` | `'VoteCast'` |
| `VoteRemovedEvent<T>` | `proposal_events` | `'VoteRemoved'` |
| `ProposalDeletedEvent<T>` | `proposal_events` | `'ProposalDeleted'` |
| `ProposalExecutedEvent<T>` | `proposal_events` | `'ProposalExecuted'` |
| `QuorumReachedEvent<T>` | `proposal_events` | `'QuorumReached'` |
| `PackageUpgradedEvent` | `proposal_events` | `'PackageUpgraded'` |

**Note**: `WithdrawalCancelledEvent` is confirmed from the Move source (`withdrawal_queue.move`). The total variant count is 25 (including `AbortReconfigEvent`). Both are included in the SDK's discriminated union.

### Parser Functions

#### `parseHashiEvent(event: SuiEvent, packageIds: Set<string>): HashiEvent | null`

Best-effort parser. Returns `null` for:
- Events from packages not in `packageIds`
- Events with unrecognized `(module, name)` pairs
- Events with BCS decode failures (silently dropped)

#### `parseHashiEventStrict(event: SuiEvent, packageIds: Set<string>): { event: HashiEvent } | { error: HashiParseError }`

Strict parser that returns structured errors instead of silently returning `null`. Returns a discriminated result:
- On success: `{ event: HashiEvent }`
- On failure: `{ error: HashiParseError }` with specific failure reason (unknown package, unknown event type, BCS decode failure)

### Generic Type Parameter Extraction

For events with `phantom T` type parameters (`ProposalCreatedEvent<T>`, `VoteCastEvent<T>`, `VoteRemovedEvent<T>`, `ProposalDeletedEvent<T>`, `ProposalExecutedEvent<T>`, `QuorumReachedEvent<T>`, `MintEvent<T>`, `BurnEvent<T>`):

- The SDK MUST extract the type parameter string from the event's StructTag.
- The extracted type parameter MUST be stored as a string field `typeParam` on the parsed event.
- For proposal events, the `typeParam` identifies the proposal type (e.g., `{packageId}::update_config::UpdateConfig`).
- For treasury events, the `typeParam` identifies the coin type (e.g., `{originalPackageId}::btc::BTC`).

### Multi-Version Package Matching

`packageIds` is a `Set<string>` containing all known package IDs (current + prior versions after upgrades). An event is considered a Hashi event if its StructTag address is in this set, regardless of which specific version emitted it. This enables parsing events from historical transactions that used earlier package versions.

## 9. Bitcoin Helper Design

### Functions

#### `encodeBitcoinAddress(witnessProgram: Uint8Array, witnessVersion: number, network: 'mainnet' | 'testnet'): string`

Encodes a witness program into a human-readable Bitcoin address.

- `witnessVersion === 0`: Use bech32 encoding. Only 20-byte programs (P2WPKH) accepted.
- `witnessVersion === 1`: Use bech32m encoding. Only 32-byte programs (P2TR) accepted.
- Other witness versions: Throw `HashiBitcoinError`.
- HRP: `'bc'` for mainnet, `'tb'` for testnet.

#### `decodeBitcoinAddress(address: string): { witnessProgram: Uint8Array; witnessVersion: number; network: 'mainnet' | 'testnet' }`

Decodes a bech32/bech32m Bitcoin address.

- Validates checksum (bech32 for v0, bech32m for v1+).
- Validates witness program length (20 for v0, 32 for v1).
- Returns structured result.
- Throws `HashiBitcoinError` for invalid addresses, unsupported witness versions, or wrong program lengths.
- Network detection: `'bc'` prefix -> `'mainnet'`, `'tb'` prefix -> `'testnet'`. Other prefixes throw.

#### `deriveDepositAddress(mpcPublicKey: Uint8Array, derivationPath: Uint8Array, network: 'mainnet' | 'testnet'): string`

Derives a Taproot deposit address from the MPC committee's public key and a derivation path.

- Uses secp256k1 point arithmetic via `@noble/curves`.
- The derivation mechanism MUST match the Hashi protocol's deposit address derivation scheme.
- Returns a bech32m-encoded P2TR address.
- **Assumption to validate**: The exact derivation algorithm (how `derivationPath` is combined with `mpcPublicKey` to produce the Taproot internal key or tweaked key) MUST be verified against the Hashi reference implementation. Mark this as an open question if the Rust implementation is not inspected during spec writing.

#### `satsToBtc(sats: bigint): string`

Converts satoshis to BTC as a decimal string with 8 decimal places. Example: `100000000n` -> `"1.00000000"`.

#### `btcToSats(btc: string): bigint`

Converts a BTC decimal string to satoshis. Example: `"1.5"` -> `150000000n`. Throws `HashiBitcoinError` if the string has more than 8 decimal places or is not a valid decimal number.

### Dependencies

Bitcoin helpers MUST depend only on `@noble/curves` and `@noble/hashes`. They MUST NOT import `@mysten/sui` or any Sui-specific code, ensuring the `./bitcoin` subpath is lightweight and independently usable.

### Bech32 Implementation

The SDK MUST implement bech32/bech32m encoding and decoding. Two options:

1. **Use `@noble/hashes` bech32 utilities** if available in the library.
2. **Implement bech32/bech32m from BIP-173/BIP-350** as a small utility (~100 lines).

**Decision**: Use `@noble/hashes` if it exports bech32 utilities (check `@noble/hashes/utils` or similar). If not, implement a minimal bech32/bech32m codec. Do NOT add a separate `bech32` npm dependency.

## 10. Type System and Conversion Strategy

### Three-Layer Model

1. **Codegen layer** (`contracts/`): BCS-serializable types generated by `@mysten/codegen`. These are `MoveStruct` definitions used for serialization/deserialization. Internal to the SDK.

2. **Domain layer** (`types/`): Developer-friendly TypeScript interfaces. These are the public API surface. Field names use camelCase. All addresses are normalized strings. All binary data is `Uint8Array`. All large integers are `bigint`.

3. **Conversion layer**: Functions that map between codegen types and domain types. These handle normalization (address padding, hex encoding) and structural transformation (flattening nested BCS wrappers).

### Canonical Type Mappings

| Move Type | TypeScript Domain Type | Notes |
|---|---|---|
| `address` | `string` | 0x-prefixed, lowercase, 66 characters (32 bytes + '0x') |
| `u8` | `number` | |
| `u16` | `number` | |
| `u32` | `number` | |
| `u64` | `bigint` | JavaScript numbers lose precision above 2^53 |
| `u128` | `bigint` | |
| `u256` | `bigint` | |
| `bool` | `boolean` | |
| `vector<u8>` | `Uint8Array` | Standard binary representation |
| `vector<T>` | `T[]` | Array of converted elements |
| `Option<T>` | `T \| null` | Idiomatic TypeScript |
| `String` | `string` | UTF-8 string |
| `ID` | `string` | Same as address normalization |
| `Bag` | `{ id: string; size: number }` | Contents accessed via dynamic field queries |
| `ObjectBag` | `{ id: string; size: number }` | Same as Bag |
| `VecMap<K,V>` | `Array<{ key: K; value: V }>` | Preserves insertion order |
| `VecSet<T>` | `T[]` | Unwrap `.contents` |
| `VecMap::Entry<K,V>` | `{ key: K; value: V }` | |
| `LinkedTable<K>` | `{ id: string; size: bigint; head: K \| null; tail: K \| null }` | |
| `Balance<T>` | `bigint` | Extract `.value` field |
| `Coin<T>` | `{ id: string; balance: bigint }` | |
| `UpgradeCap` | `{ id: string; package: string; version: bigint; policy: number }` | |
| `CommitteeSignature` | `{ epoch: bigint; signature: Uint8Array; signersBitmap: Uint8Array }` | Flat interface |
| `ConfigValue` / `Value` | Discriminated union: `{ type: 'U64'; value: bigint } \| { type: 'Address'; value: string } \| { type: 'String'; value: string } \| { type: 'Bool'; value: boolean } \| { type: 'Bytes'; value: Uint8Array }` | Match Move enum variants |
| `ProtocolType` | `'Dkg' \| 'KeyRotation' \| 'NonceGeneration'` | String union |
| `Digest` | `string` | Base58-encoded or hex, matching Sui convention |

### Normalization Rules

**Sui addresses and object IDs**:
- Input: Accept with or without `0x` prefix, any case, any length up to 64 hex characters.
- Normalization: Lowercase, `0x`-prefix, left-pad with zeros to exactly 66 characters total (`0x` + 64 hex chars).
- Validation: Reject non-hex characters. Reject strings longer than 66 characters.

**Bitcoin txids**:
- Input: Accept as 64-character hex string (display byte order, big-endian) or `Uint8Array` (32 bytes).
- Internal representation: Stored as Sui `address` (32 bytes, same byte order as the hex string).
- The SDK does NOT reverse byte order. Bitcoin txids in Hashi are stored in their natural byte order (as Sui addresses), not in Bitcoin's display-reversed order.
- **Assumption to validate**: Confirm whether Hashi stores txids in Bitcoin display order or internal (reversed) order. The Rust code passes `txid: Address` directly, suggesting natural byte order.

**Byte arrays**:
- Public APIs MUST accept `Uint8Array`.
- Public APIs MAY additionally accept hex strings for convenience, performing automatic conversion.
- Domain type interfaces MUST use `Uint8Array` for output.

**u64 inputs**:
- Public APIs MUST accept `bigint`.
- Public APIs MAY additionally accept `number` for convenience (MUST be safe integers, i.e., `Number.isSafeInteger(n)` returns true).
- Values MUST be non-negative and fit in u64 range (`0n <= x <= 18446744073709551615n`).
- Out-of-range values MUST throw `HashiTransactionError` or `HashiQueryError`.

## 11. Error Model

### Error Hierarchy

```
Error
  HashiError
    HashiTransactionError    -- Move abort or PTB construction failures
    HashiQueryError          -- RPC/transport failures, unexpected responses
    HashiParseError          -- BCS decode failures, unknown event types
    HashiBitcoinError        -- Invalid addresses, unsupported formats
    HashiConfigError         -- Invalid config values, missing required fields
```

All error classes MUST extend `HashiError` which extends `Error`. All MUST set `name` to the class name. All MUST be exported from the package root.

### Throw Convention

APIs MUST throw errors (not return Result-like values). This matches the `@mysten/sui` ecosystem convention.

### Validation Timing

- **Builder methods**: MUST validate input format synchronously before returning the closure. Invalid input throws immediately.
- **Query methods**: MUST validate inputs before making RPC calls.
- **Best-effort parsers** (`parseHashiEvent`): Return `null` on failure, never throw.
- **Strict parsers** (`parseHashiEventStrict`): Return structured error objects, never throw.

### Move Abort Code Mapping

`HashiTransactionError` SHOULD include optional fields for Move abort context:
- `module`: The Move module name (e.g., `"committee"`, `"proposal"`)
- `abortCode`: The numeric abort code
- `message`: Human-readable message derived from the mapping below

**Complete abort code mapping from Move source**:

| Module | Constant | Code | Message |
|---|---|---|---|
| `committee` | `EInvalidBitmap` | 0 | Invalid signer bitmap |
| `committee` | `ESigVerification` | 1 | Signature verification failed |
| `committee` | `ENotEnoughStake` | 2 | Not enough stake for threshold |
| `committee` | `EIncorrectCommittee` | 3 | Incorrect committee for epoch |
| `config` | `EVersionDisabled` | 0 | Version disabled |
| `config` | `EDisableCurrentVersion` | 1 | Cannot disable current version |
| `config` | `EInvalidConfigEntry` | 2 | Unknown config key or wrong value type |
| `config_value` | `EInvalidConfigValue` | 0 | Invalid config value |
| `reconfig` | `ENotReconfiguring` | 0 | Not currently reconfiguring |
| `reconfig` | `EAbortReconfigDisabled` | 1 | Abort reconfig is disabled |
| `deposit_queue` | `EDepositRequestNotExpired` | 0 | Deposit request not expired |
| `proposal` | `EUnauthorizedCaller` | 0 | Caller must be a voting member |
| `proposal` | `EVoteAlreadyCounted` | 1 | Vote already counted |
| `proposal` | `EQuorumNotReached` | 2 | Quorum not reached |
| `proposal` | `ENoVoteFound` | 3 | Vote doesn't exist |
| `proposal` | `EProposalNotExpired` | 4 | Proposal not expired |
| `proposal` | `EProposalExpired` | 5 | Proposal expired |
| `tob` | `EWrongEpoch` | 0 | Wrong epoch for certificate |
| `tob` | `ETooEarlyToDestroy` | 1 | Too early to destroy certificates |
| `utxo_pool` | `ESpentUtxoNotExpired` | * | Spent UTXO has not expired yet |
| `threshold` | `EThresholdBpsTooHigh` | * | Threshold basis points must be at most 10000 |
| `withdraw` | `EUnauthorizedCancellation` | * | Only the original requester can cancel |
| `withdraw` | `ECooldownNotElapsed` | * | Cancellation cooldown has not elapsed |
| `withdraw` | `ERequestAlreadyApproved` | * | Request has already been approved |
| `withdrawal_queue` | `ERequestNotApproved` | * | Withdrawal request has not been approved |
| `withdrawal_queue` | `EOutputBelowDust` | * | Withdrawal output would be below dust threshold after miner fee deduction |
| `withdrawal_queue` | `EOutputAmountMismatch` | * | Withdrawal output amount does not match expected value |
| `withdrawal_queue` | `EOutputAddressMismatch` | * | Withdrawal output address does not match request |
| `withdrawal_queue` | `EMinerFeeExceedsMax` | * | Per-user miner fee exceeds worst-case network fee budget |
| `withdrawal_queue` | `EInputsBelowOutputs` | * | Total input amount is less than total output amount |
| `withdrawal_queue` | `EOutputCountMismatch` | * | Output count must equal request count or request count + 1 (change) |

**Note**: Entries marked `*` for code use the `#[error]` attribute without explicit `code = N`. Move 2024 edition `#[error]` with `vector<u8>` message uses string-based error reporting, not numeric codes. The SDK SHOULD match on the error string message rather than numeric codes for these entries. The exact abort code format for string-based errors depends on the Move VM's error encoding -- the implementer MUST verify the actual format returned in transaction effects.

## 12. Build, Packaging, and Module Exports

### Build System

- **Dual ESM/CJS output** via esbuild, replicating the `@mysten/build-scripts` pattern locally.
- Two TypeScript configs: `tsconfig.json` (CJS, `module: "commonjs"`) and `tsconfig.esm.json` (ESM, `module: "esnext"`).
- Target: `ES2020`.
- Strict mode enabled.
- `moduleResolution: "node"`.
- Generated TypeScript declarations (`.d.ts`) alongside compiled output.

### Package.json Configuration

```json
{
  "name": "hashi-sdk",
  "type": "module",
  "exports": {
    ".": { "import": "./dist/esm/index.js", "require": "./dist/cjs/index.js", "types": "./dist/esm/index.d.ts" },
    "./client": { "import": "./dist/esm/client.js", "require": "./dist/cjs/client.js", "types": "./dist/esm/client.d.ts" },
    "./transactions": { "import": "./dist/esm/transactions/index.js", "require": "./dist/cjs/transactions/index.js", "types": "./dist/esm/transactions/index.d.ts" },
    "./queries": { "import": "./dist/esm/queries/index.js", "require": "./dist/cjs/queries/index.js", "types": "./dist/esm/queries/index.d.ts" },
    "./events": { "import": "./dist/esm/events/index.js", "require": "./dist/cjs/events/index.js", "types": "./dist/esm/events/index.d.ts" },
    "./bitcoin": { "import": "./dist/esm/bitcoin.js", "require": "./dist/cjs/bitcoin.js", "types": "./dist/esm/bitcoin.d.ts" },
    "./types": { "import": "./dist/esm/types/index.js", "require": "./dist/cjs/types/index.js", "types": "./dist/esm/types/index.d.ts" }
  },
  "peerDependencies": {
    "@mysten/sui": ">=1.0.0"
  }
}
```

### Runtime Compatibility

- MUST support Node.js >=18 and modern browsers (last 2 versions of Chrome, Firefox, Safari, Edge).
- Runtime code MUST NOT use Node-only APIs (`fs`, `path`, `crypto`, `Buffer`) unless isolated behind environment-specific entrypoints.
- `@noble/curves` and `@noble/hashes` are browser-compatible. `@mysten/sui` is browser-compatible.

### Codegen

- `sui-codegen.config.ts` at package root.
- Generated output committed to repository (not generated at install time).
- CI MUST include a codegen "is-dirty" check: run codegen, then `git diff --exit-code src/contracts/` to ensure generated code is up to date.

### Scripts

```
"codegen":    "sui-ts-codegen"
"build":      "tsc && tsc -p tsconfig.esm.json && node scripts/build.js"
"test":       "vitest run"
"typecheck":  "tsc --noEmit"
"lint":       "eslint src/"
"prepublish": "npm run build"
```

## 13. Testing and CI Strategy

### Framework

vitest for all tests.

### Test Categories

#### BCS Round-Trip Tests
- For every generated BCS type: serialize a sample value, deserialize the output, assert deep equality with the original.
- Cover all domain types including nested structs (`DepositRequest` containing `Utxo` containing `UtxoId`).
- Cover the manual BCS types (`UtxoId`, `OutputUtxo`) used in double-encoding.

#### Event Parser Tests
- All 24 event variants with mock BCS data and mock `SuiEvent` envelopes.
- Test parsing from two different package IDs (simulating a package upgrade).
- Test `parseHashiEvent` returns `null` for unknown packages.
- Test `parseHashiEvent` returns `null` for unknown event types.
- Test `parseHashiEventStrict` returns structured errors.
- Test generic type parameter extraction for proposal and treasury events.

#### Transaction Builder Snapshot Tests
- For each transaction builder function: construct the PTB with sample inputs, serialize the `Transaction` to JSON/bytes, compare against a committed snapshot.
- Snapshot updates MUST be reviewed in PR diffs.
- Cover special patterns: 5-step deposit, two-call confirm_deposit, CoinWithBalance withdrawal, transferObjects cancel, batched approve, double-BCS commit.

#### Bitcoin Helper Tests
- **BIP-173 test vectors**: bech32 encoding/decoding for segwit v0 addresses.
- **BIP-350 test vectors**: bech32m encoding/decoding for taproot v1 addresses.
- **Edge cases**: invalid checksums, wrong witness version, wrong program length, mainnet vs testnet HRP.
- **satsToBtc/btcToSats**: round-trip, edge cases (0, MAX_SUPPLY, precision).
- **deriveDepositAddress**: test with known MPC public key and derivation path against expected output (test vector from Hashi reference implementation if available).

#### Config Tests
- Preset resolution (`'mainnet'`, `'testnet'`).
- Override behavior (custom packageId, hashiObjectId).
- Validation errors (invalid address format, missing required fields).

#### Error Tests
- Abort code -> message mapping for all known codes.
- Error class hierarchy (`instanceof` checks).
- Error `name` property.

### Fixtures

Hand-crafted JSON/hex fixtures MUST be committed to `tests/fixtures/`. Fixtures are NOT generated at test time. They include:
- BCS-encoded event payloads (one per event variant).
- BCS-encoded state objects (Hashi, Committee, DepositRequest, etc.).
- Bitcoin address test vectors.

### Coverage

- No global coverage threshold enforced.
- All public API functions MUST have at least one test.
- High-risk modules SHOULD have >= 80% branch coverage:
  - `bitcoin.ts`
  - `events/`
  - `transactions/`
  - `errors.ts`

### Integration Test Scaffolding

Placeholder directory structure for localnet integration tests. These tests:
- Are gated behind an environment flag (e.g., `HASHI_INTEGRATION=1`).
- Are NOT run in standard CI.
- Provide a structure for future deposit -> query -> withdraw end-to-end flows.

### CI Pipeline

On every PR:
1. `npm run typecheck` -- TypeScript type checking (`tsc --noEmit`).
2. `npm run lint` -- ESLint.
3. `npm run test` -- vitest unit tests.
4. Codegen is-dirty check: run codegen, then `git diff --exit-code src/contracts/`.

## 14. Documentation Plan

### README

- **Quickstart**: Install, configure for testnet, create a deposit request, request a withdrawal.
- **Package installation** with peer dependency expectations (`@mysten/sui`).
- **User flow example**: Deposit BTC -> query deposit status -> request withdrawal -> cancel withdrawal.
- **Validator flow example**: Register -> confirm deposit -> approve withdrawal -> commit withdrawal.
- **Server vs browser signing guidance**: Using `SuiClient.signAndExecuteTransaction()` server-side vs dapp-kit `useSignAndExecuteTransaction()` in browser.
- **Upgrade handling**: How `packageId` vs `originalPackageId` works, when to update config after a package upgrade.
- **Limitations and non-goals**: What the SDK does NOT do.

### TSDoc

All public functions, types, and interfaces MUST have TSDoc comments including:
- Brief description.
- `@param` for each parameter.
- `@returns` description.
- `@throws` listing possible error types.
- `@example` for key functions (deposit, withdraw, parse events).

### Changelog

Managed via `@changesets/cli`. Each PR that changes public API SHOULD include a changeset.

## 15. Release/Versioning Plan

- Semantic versioning via `@changesets/cli`.
- Initial release: `0.1.0` (pre-1.0 to allow API iteration).
- Breaking changes increment minor version while pre-1.0.
- Public API stability goal: reach `1.0.0` after field testing on testnet.
- Each release MUST pass all CI checks (typecheck, lint, tests, codegen is-dirty).

### Compatibility Contract

Each SDK release is bound to a specific Hashi Move package schema version. The relationship MUST be documented:
- README MUST state which Hashi package version(s) the SDK release supports.
- After a Hashi package upgrade that changes struct layouts: the SDK MUST be updated (codegen re-run + types update) and a new SDK version released.
- After a Hashi package upgrade that only adds new entry points: existing SDK functionality continues to work; new wrappers are additive.
- **Consumer failure mode**: If a consumer uses an SDK version against an incompatible (newer) on-chain package, BCS deserialization errors will manifest as `HashiParseError` or `HashiQueryError`. The SDK SHOULD include a version check in `getHashiState()` that compares the on-chain `enabledVersions` against the SDK's known-compatible versions and emits a warning if mismatched.
- The CI codegen is-dirty check catches drift between the local Move package and committed codegen output; it does NOT catch "consumer points SDK at a newer on-chain package than the repo was generated from."

### Acceptance Gate Ownership

- **Unit/snapshot tests** in this repo are the SDK's acceptance gate. They verify structural correctness (PTB shape, BCS encoding, type safety).
- **Execution-level validation** (transactions succeeding against a live Hashi contract) is an external gate owned by the Hashi project's e2e test infrastructure. The SDK provides integration test scaffolding but does not own or run the localnet environment.

## 16. Risks, Open Questions, and Future Extension Points

### Risks

1. **Codegen compatibility**: `@mysten/codegen` may not handle all Hashi Move types correctly (e.g., `UpgradeCap`, `UpgradeTicket`, phantom type parameters). Mitigation: manual BCS fallbacks are scoped and expected.
2. **Move package path coupling**: `sui-codegen.config.ts` uses a relative path to the Hashi Move package. If the package moves or the developer's workspace layout differs, codegen breaks. Mitigation: document the expected layout, support environment variable override.
3. **BCS format changes**: If the Move package upgrades and changes struct layouts, the codegen output and manual BCS code must be regenerated/updated. Mitigation: CI codegen is-dirty check catches drift.
4. **Sui RPC API changes**: The query layer depends on specific RPC methods (`getObject`, `getDynamicFieldObject`, `getDynamicFields`). If these change, the query layer must adapt. Mitigation: these are stable Sui JSON-RPC methods.
5. **Dynamic field key encoding**: Some queries (e.g., `getUtxo`) require BCS-encoding a struct as the dynamic field key. The exact encoding must match what the Move runtime expects. Mitigation: test against live objects.

### Open Questions

1. **Q-DERIVE**: What is the exact algorithm for `deriveDepositAddress`? The Rust implementation must be inspected to determine how the MPC public key and derivation path are combined via secp256k1 to produce the Taproot internal key. The `derivationPath` is an `Option<address>` (32 bytes) on-chain -- is it used as a tweak, a BIP-32 path, or something else?

2. **Q-WITHDRAWAL-CANCELLED-EVENT**: The planning prompt lists 24 event variants including `WithdrawalCancelledEvent`. The Rust enum lists 25 variants but some include `AbortReconfigEvent` instead. Does `cancel_withdrawal` emit a `WithdrawalCancelledEvent`? The Move code calls `request.emit_withdrawal_cancelled()` -- verify the event struct exists in `withdrawal_queue.move`.

3. **Q-TXID-BYTE-ORDER**: Does Hashi store Bitcoin txids in display byte order (big-endian, as shown in block explorers) or internal byte order (little-endian, as used in Bitcoin wire format)? The Rust code uses `Address` directly, suggesting big-endian/display order, but this must be confirmed.

4. **Q-BTC-COIN-TYPE-PKG**: Does `CoinWithBalance` for BTC use `originalPackageId` or current `packageId` in the StructTag? The Rust code uses `self.hashi_ids.package_id` in the `StructTag::new()` call for the BTC type. This may be a bug in the Rust code or intentional. Verify the correct behavior.

5. **Q-ERROR-FORMAT**: How do `#[error]` attributes with `vector<u8>` messages (Move 2024 edition) manifest in transaction effects? Are they numeric abort codes, UTF-8 strings, or BCS-encoded? This affects the abort code mapping strategy.

6. **Q-CODEGEN-ENTRY-FNS**: Does `@mysten/codegen` generate wrappers for `entry fun` declarations, or only for `public fun`? If entry functions are not covered, manual wrappers are needed for: `approve_request`, `commit_withdrawal_tx`, `sign_withdrawal`, `confirm_withdrawal`, `start_reconfig`, `end_reconfig`, `abort_reconfig`, all `cert_submission` functions, `destroy_all_certs`, `finish_publish`.

7. **Q-BUILD-SCRIPTS**: Can `@mysten/build-scripts` be used directly as a dev dependency (it may not be published to npm), or must the build pipeline be replicated locally with esbuild + tsc?

### Future Extension Points

These are natural future additions, out of scope for v1:

- **WebSocket subscription helpers**: Wrapping `SuiClient.subscribeEvent` with Hashi-specific filtering and automatic `parseHashiEvent` deserialization.
- **Signer adapter interface**: A pluggable signing strategy interface for different wallet types.
- **Indexer adapter**: An interface for historical queries backed by a database or indexer service.
- **React hooks package** (`@hashi/react`): React hooks wrapping transaction builders with dapp-kit integration.
- **CLI tool**: A command-line interface for common operations (deposit, withdraw, query status).

## 17. Phase-Based Implementation Plan

### Phase 0: Protocol Verification (Resolve Open Questions)

**Scope**:
- Inspect the Hashi Rust source (`crates/hashi/`) and Move source (`packages/hashi/`) to resolve all 7 open questions.
- Q-DERIVE: Determine the exact deposit address derivation algorithm from the Rust implementation.
- Q-WITHDRAWAL-CANCELLED-EVENT: Confirm WithdrawalCancelledEvent exists in withdrawal_queue.move (confirmed: yes, 25 variants total).
- Q-TXID-BYTE-ORDER: Determine whether Hashi uses display or internal byte order for Bitcoin txids.
- Q-BTC-COIN-TYPE-PKG: Determine correct packageId for BTC coin type StructTag.
- Q-ERROR-FORMAT: Determine how Move 2024 `#[error]` attributes manifest in transaction effects.
- Q-CODEGEN-ENTRY-FNS: Test whether `@mysten/codegen` handles `entry fun` declarations.
- Q-BUILD-SCRIPTS: Check whether `@mysten/build-scripts` is published to npm.
- Document findings in `.bootstrap/protocol-verification.md`.

**Dependencies**: None.

**Exit criteria**:
- All 7 open questions answered with source references.
- Findings documented and incorporated into the spec.

**Estimated complexity**: Simple (research only, no code).

**Risks**: Some answers may require changes to the spec's type mappings, error model, or Bitcoin helpers.

### Phase 1: Foundation (Scaffold + Codegen + Config + Types + Errors)

**Scope**:
- Initialize repository: `package.json`, `tsconfig.json`, `tsconfig.esm.json`, `vitest.config.ts`, `.gitignore`, `.eslintrc`.
- Set up `sui-codegen.config.ts` targeting the Hashi Move package and run initial codegen.
- Implement `HashiConfig` with `'mainnet' | 'testnet'` presets, override support, and validation.
- Implement the `HashiError` hierarchy (`HashiError`, `HashiTransactionError`, `HashiQueryError`, `HashiParseError`, `HashiBitcoinError`, `HashiConfigError`).
- Implement the abort code mapping table.
- Define all domain type interfaces in `types/`.
- Implement BCS re-export layer from `contracts/` into `types/`.
- Set up build pipeline (esbuild + tsc for dual ESM/CJS).

**Dependencies**: None.

**Exit criteria**:
- `npx tsc --noEmit` exits 0.
- `npm run build` produces `dist/esm/` and `dist/cjs/` output.
- Codegen output exists in `src/contracts/`.
- Config unit tests pass (preset resolution, overrides, validation).
- Error unit tests pass (hierarchy, abort code mapping).
- BCS round-trip tests pass for at least 5 representative types.

**Estimated complexity**: Moderate.

**Risks**: Codegen may fail on certain Hashi types. Mitigation: identify and stub out problematic types, add manual BCS as needed.

### Phase 2: Transaction Builders (User-Facing)

**Scope**:
- Implement `createDepositRequest` (5-step PTB).
- Implement `requestWithdrawal` (CoinWithBalance intent).
- Implement `cancelWithdrawal` (transferObjects refund).
- Implement input validation for all three builders.
- Add shared-object argument helpers (Hashi, Clock).

**Dependencies**: Phase 1 (types, config, errors).

**Exit criteria**:
- All three user-facing builder functions compile and pass type checking.
- Snapshot tests pass for all three PTB structures.
- Input validation tests pass (invalid addresses, wrong byte lengths, negative amounts).
- `npx tsc --noEmit` exits 0.

**Estimated complexity**: Moderate (CoinWithBalance and transferObjects patterns are non-trivial).

**Risks**: CoinWithBalance intent API may have changed in recent `@mysten/sui` versions. Mitigation: test against the latest `@mysten/sui` API.

### Phase 3: Transaction Builders (Validator/Committee)

**Scope**:
- Implement `confirmDeposit` (two-call PTB).
- Implement `deleteExpiredDeposits` (batched).
- Implement `approveWithdrawalRequests` (batched).
- Implement `commitWithdrawalTx` (nested BCS double-encoding, Random `0x8`).
- Implement `signWithdrawal`, `confirmWithdrawal`, `deleteExpiredSpentUtxo`.
- Implement `register`, all 5 validator update methods.
- Implement `startReconfig`, `endReconfig`.
- Implement certificate submission (3 submit + 1 destroy).
- Implement governance proposal lifecycle (4 propose + vote/removeVote/deleteExpired + 4 execute + finalizeUpgrade).

**Dependencies**: Phase 2 (shared-object helpers, validation patterns).

**Exit criteria**:
- All validator/committee builder functions compile and pass type checking.
- Snapshot tests pass for all PTB structures, including special patterns (two-call, batched, double-BCS).
- Manual BCS encoding for `UtxoId` and `OutputUtxo` verified via round-trip tests.
- `npx tsc --noEmit` exits 0.

**Estimated complexity**: Complex (many functions, special encoding patterns, governance generics).

**Risks**: Proposal type parameter resolution (converting `'UpdateConfig'` to `{packageId}::update_config::UpdateConfig`) may require careful StructTag construction. Double-BCS encoding must exactly match the Move-side `bcs::new().peel_*()` pattern.

### Phase 4: Query Layer

**Scope**:
- Implement `getHashiState`.
- Implement `getDepositRequest`, `listDepositRequests`.
- Implement `getWithdrawalRequest`, `listPendingWithdrawals`.
- Implement `getCommittee`, `getMemberInfo`.
- Implement `getConfig`.
- Implement `getUtxo`, `getEpochCerts`.
- Implement `PaginatedResult<T>` pagination wrapper.
- Implement BCS deserialization for all queried types.
- Implement dynamic field key encoding for typed lookups.

**Dependencies**: Phase 1 (types, config, errors).

**Exit criteria**:
- All query functions compile and pass type checking.
- Unit tests with mock RPC responses pass for all queries.
- Pagination behavior tested (first page, continuation, empty result).
- Not-found returns `null` (tested).
- BCS decode failures throw `HashiParseError` (tested).
- `npx tsc --noEmit` exits 0.

**Estimated complexity**: Complex (dynamic field encoding, BCS deserialization for all types, pagination).

**Risks**: Dynamic field key encoding for struct keys (e.g., `UtxoId`, `TobKey`) may require experimentation to match the Move runtime's key encoding format.

### Phase 5: Event System + Bitcoin Helpers

**Scope**:
- Define the `HashiEvent` discriminated union type with all 25 variants.
- Implement `parseHashiEvent` (best-effort) and `parseHashiEventStrict`.
- Implement generic type parameter extraction for proposal and treasury events.
- Implement multi-version package matching.
- Implement `encodeBitcoinAddress`, `decodeBitcoinAddress`.
- Implement `deriveDepositAddress`.
- Implement `satsToBtc`, `btcToSats`.

**Dependencies**: Phase 1 (types, errors).

**Exit criteria**:
- All 24 event variants parseable from mock data.
- Multi-version parsing tested (two package IDs).
- Generic type parameter extraction tested for proposal events.
- BIP-173 and BIP-350 test vectors pass.
- `deriveDepositAddress` produces correct output for known test vector (if available).
- `satsToBtc`/`btcToSats` round-trip correctly.
- `npx tsc --noEmit` exits 0.

**Estimated complexity**: Moderate (event parsing is mechanical; Bitcoin helpers require careful bech32 implementation and secp256k1 point arithmetic).

**Risks**: `deriveDepositAddress` algorithm is an open question (Q-DERIVE). If the exact derivation scheme cannot be determined from the Rust source, this function SHOULD be implemented as a stub with a clear TODO and documented assumption.

### Phase 6: Client Facade + Documentation + Polish

**Scope**:
- Implement `HashiClient` class composing transactions, queries, and events.
- Wire up `SuiClient` injection and `HashiConfig` DI.
- Write README with all required sections.
- Add TSDoc to all public functions and types.
- Set up subpath exports in `package.json`.
- Add integration test scaffolding.
- Final coverage audit (>= 80% branch coverage for high-risk modules).
- Set up `@changesets/cli`.
- Final build verification (dual ESM/CJS, subpath exports, tree-shaking).

**Dependencies**: Phases 1-5 (everything).

**Exit criteria**:
- `HashiClient` exposes all transaction, query, and event methods.
- `npm run build` succeeds with clean output.
- All subpath exports resolve correctly (`import { ... } from 'hashi-sdk/bitcoin'` etc.).
- README includes quickstart, user flow, validator flow, signing guidance, upgrade notes.
- TSDoc coverage on all public exports.
- All vitest tests pass.
- `npx tsc --noEmit` exits 0.
- Branch coverage >= 80% for `bitcoin.ts`, `events/`, `transactions/`, `errors.ts`.

**Estimated complexity**: Moderate (composition and documentation, no new algorithms).

**Risks**: Subpath exports and dual ESM/CJS packaging can have subtle compatibility issues across bundlers and Node.js versions. Mitigation: test with both `import` and `require` in a minimal consumer project.
