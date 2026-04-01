# hashi-sdk

TypeScript SDK for the **Hashi Bitcoin Bridge** on Sui.

Hashi is a Sui-native bridge where users deposit native BTC to receive hBTC (`Coin<BTC>`) on Sui, and withdraw by burning hBTC back to a Bitcoin address. A committee of Sui validators operates the bridge via threshold MPC (BLS12-381 Schnorr) with a Guardian 2-of-2 Taproot multisig.

This SDK provides complete, signing-agnostic TypeScript bindings for every on-chain operation, query, and event the Hashi Move package exposes.

---

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [User Operations](#user-operations)
- [Querying State](#querying-state)
- [Parsing Events](#parsing-events)
- [Bitcoin Helpers](#bitcoin-helpers)
- [Validator Operations](#validator-operations)
- [Signing Guide](#signing-guide)
- [Configuration](#configuration)
- [Package Upgrades](#package-upgrades)
- [Error Handling](#error-handling)
- [Type System](#type-system)
- [Developer Dashboard](#developer-dashboard)
- [Development](#development)
- [Non-Goals](#non-goals)
- [License](#license)

---

## Installation

```bash
npm install hashi-sdk @mysten/sui
```

`@mysten/sui` (v2+) is a peer dependency. The SDK also depends on `@noble/curves`, `@noble/hashes`, and `@scure/base` at runtime (installed automatically).

## Quick Start

```ts
import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { HashiClient } from 'hashi-sdk';

// 1. Create a client
const suiClient = new SuiClient({ url: 'https://fullnode.testnet.sui.io' });
const hashi = new HashiClient({
  client: suiClient,
  network: 'testnet',
});

// 2. Build a deposit request
const buildDeposit = hashi.createDepositRequest({
  txid: 'abcd'.padEnd(64, '0'), // Bitcoin txid (64 hex chars)
  vout: 0,
  amount: 100_000n,             // satoshis
});

// 3. Add to transaction and sign
const tx = new Transaction();
buildDeposit(tx);

const result = await suiClient.signAndExecuteTransaction({
  transaction: tx,
  signer: keypair,
});
```

---

## Architecture

The SDK follows a **layered architecture** inspired by the Mysten TS SDK ecosystem (DeepBook v3, Walrus):

```
                  HashiClient (facade)
                 /       |        \
      Transactions    Queries    Events     Bitcoin
      (30+ builders)  (9 methods) (25 types) (encode/decode)
           |              |          |
      src/contracts/ (codegen: BCS types + Move call wrappers)
           |
    Hashi Move Package (24 modules, external)
```

### Core Principles

- **Signing-agnostic**: Every transaction builder returns a `(tx: Transaction) => void | TransactionResult` closure. The SDK never holds private keys. You sign however your environment supports (server-side keypair, browser wallet, dApp Kit).

- **Curried closure composition**: Builders are composed via `tx.add()`:
  ```ts
  const tx = new Transaction();
  tx.add(hashi.createDepositRequest({ ... }));
  tx.add(hashi.requestWithdrawal({ ... }));
  // Both operations in a single PTB
  ```

- **Codegen foundation**: `@mysten/codegen` generates BCS type definitions and Move function wrappers from the Hashi Move package. The SDK's hand-written transaction builders compose these generated primitives into correct multi-step PTBs.

- **Standalone or facade**: Everything is available both through `HashiClient` methods and as standalone imports for tree-shaking.

### Subpath Exports

| Import path              | Contents                                       |
| ------------------------ | ---------------------------------------------- |
| `hashi-sdk`              | Everything (HashiClient, config, types, errors) |
| `hashi-sdk/client`       | HashiClient class                               |
| `hashi-sdk/transactions` | All transaction builder functions                |
| `hashi-sdk/queries`      | Query functions for on-chain state               |
| `hashi-sdk/events`       | Event types and parser functions                 |
| `hashi-sdk/bitcoin`      | Bitcoin address and amount helpers                |
| `hashi-sdk/types`        | Domain type interfaces and BCS re-exports        |

---

## Project Structure

```
hashi-sdk/
  src/
    index.ts                    Main barrel export
    client.ts                   HashiClient facade (687 lines)
    errors.ts                   Error hierarchy + abort code mapping (31 codes)
    bitcoin.ts                  bech32/bech32m encode/decode, sats/BTC conversion
    contracts/                  @mysten/codegen output (32 files, GENERATED)
      hashi/                    Per-module BCS types + Move call wrappers
        deposit.ts              deposit::deposit, confirm_deposit, delete_expired
        withdraw.ts             request_withdrawal, approve, commit, sign, confirm
        utxo.ts                 utxo_id, utxo constructors
        committee.ts            new_committee_signature
        validator.ts            register, update_* methods
        reconfig.ts             start_reconfig, end_reconfig
        proposal.ts             vote, remove_vote, delete_expired
        ...                     24 modules total
      utils/                    Generated runtime (normalizeMoveArguments, etc.)
    transactions/               Hand-written PTB builders
      createDepositRequest.ts   5-step PTB (utxo_id -> utxo -> request -> fee -> deposit)
      requestWithdrawal.ts      CoinWithBalance intent for BTC + request_withdrawal
      cancelWithdrawal.ts       cancel_withdrawal + transferObjects refund
      deposit-ops.ts            confirmDeposit (two-call PTB), deleteExpiredDeposits (batched)
      withdrawal-ops.ts         approve, commit (double-BCS), sign, confirm, delete spent
      validator-ops.ts          register, 5 update methods
      reconfig-ops.ts           startReconfig, endReconfig
      cert-ops.ts               submitDkgCert, submitRotationCert, submitNonceCert
      governance-ops.ts         4 propose + vote/removeVote + 4 execute + finalizeUpgrade
      validation.ts             Input validation (address, txid, u64, bytes, preflight)
      shared-objects.ts         Clock (0x6), SuiSystem (0x5), Random (0x8) constants
    queries/                    On-chain state reads via Sui RPC
      state.ts                  getHashiState, getConfig
      deposits.ts               getDepositRequest, listDepositRequests
      withdrawals.ts            getWithdrawalRequest, listPendingWithdrawals
      committee.ts              getCommittee, getMemberInfo
      utxo.ts                   getUtxo
      helpers.ts                BCS decode, dynamic field helpers, type conversion
    events/                     Event parsing
      types.ts                  HashiEvent discriminated union (25 variants)
      parser.ts                 parseHashiEvent (best-effort), parseHashiEventStrict
    types/                      Domain TypeScript interfaces
      common.ts                 Bag, VecMapEntry, PaginatedResult
      committee.ts              Committee, CommitteeMember, MemberInfo, CommitteeSignature
      config.ts                 Config, ConfigValue (discriminated union)
      deposit.ts                DepositRequest
      withdrawal.ts             WithdrawalRequest, PendingWithdrawal, OutputUtxo, events
      utxo.ts                   UtxoId, Utxo, UtxoInfo, UtxoPool
      proposal.ts               Proposal, ProposalType
      tob.ts                    TobKey, EpochCerts, DealerSubmission
      hashi.ts                  HashiState (root object)
      bcs.ts                    BCS re-exports from contracts/ under ergonomic names
    utils/
      config.ts                 HashiConfig (presets, validation, normalization)
  tests/
    config.test.ts              13 tests: presets, overrides, normalization, validation
    errors.test.ts              18 tests: hierarchy, abort codes, factory helpers
    bcs.test.ts                 9 tests: BCS round-trips for 8 types
    transactions.test.ts        47 tests: snapshots + validation for user builders
    validator-transactions.test.ts  72 tests: snapshots + validation for validator builders
    events.test.ts              37 tests: all 25 variants, multi-version, strict parser
    bitcoin.test.ts             44 tests: BIP-173, BIP-350, round-trips, edge cases
    queries.test.ts             27 tests: mock RPC, pagination, not-found, decode errors
    client.test.ts              14 tests: HashiClient delegation
    integration/                Scaffolding (skipped unless HASHI_INTEGRATION=1)
  sui-codegen.config.ts         Codegen config pointing at Hashi Move package
  scripts/build.mjs             Dual ESM/CJS build (esbuild + tsc)
```

---

## User Operations

### Create a Deposit Request

Submit a Bitcoin UTXO for bridging into hBTC on Sui. This builds a 5-step PTB:

```ts
const build = hashi.createDepositRequest({
  txid: 'a1b2c3d4...', // 64-char hex Bitcoin txid
  vout: 0,              // output index
  amount: 500_000n,     // satoshis
  derivationPath: '0x...', // optional Sui address for minting target
});

const tx = new Transaction();
build(tx);
```

**PTB internals**: `utxo::utxo_id(txid, vout)` -> `utxo::utxo(id, amount, path)` -> `deposit_queue::deposit_request(utxo, clock)` -> `splitCoins(gas, [0])` -> `deposit::deposit(hashi, request, fee)`

### Request a Withdrawal

Burn hBTC on Sui and request a BTC payout:

```ts
const build = hashi.requestWithdrawal({
  amount: 200_000n,                   // satoshis to withdraw
  bitcoinAddress: new Uint8Array(20), // P2WPKH witness program (20 bytes)
  // OR: bitcoinAddress: 'bc1q...'    // bech32 address (decoded automatically)
});

const tx = new Transaction();
build(tx);
```

Uses a `CoinWithBalance` intent to automatically select/merge BTC coins from the sender's balance. The BTC coin type is derived from `originalPackageId`.

### Cancel a Withdrawal

Cancel a pending (unapproved) withdrawal and reclaim hBTC:

```ts
const build = hashi.cancelWithdrawal({
  requestId: '0x...',    // withdrawal request object ID
  recipient: '0x...',    // address to receive the refunded Coin<BTC>
});

const tx = new Transaction();
build(tx); // returns TransactionResult with the refunded coin
```

---

## Querying State

Hashi has **no public view functions** -- all state reads use Sui RPC (`getObject`, `getDynamicFieldObject`, `getDynamicFields`). The query layer deserializes BCS-encoded object content into domain types.

```ts
// Root bridge state
const state = await hashi.getHashiState();
console.log('Epoch:', state.committeeSet.epoch);
console.log('MPC key:', state.committeeSet.mpcPublicKey);
console.log('Deposit queue size:', state.depositQueue.requests.size);

// Single deposit request (returns null if not found)
const deposit = await hashi.getDepositRequest('0x...');

// Paginated deposit list
const page = await hashi.listDepositRequests({ limit: 10 });
for (const req of page.items) {
  console.log(req.utxo.id.txid, req.utxo.amount);
}
if (page.hasNextPage) {
  const next = await hashi.listDepositRequests({ cursor: page.nextCursor });
}

// Committee (current epoch or specific)
const committee = await hashi.getCommittee();       // current
const old = await hashi.getCommittee(5n);           // epoch 5

// Validator info
const member = await hashi.getMemberInfo('0x...');

// Bridge config
const config = await hashi.getConfig();

// UTXO lookup
const utxo = await hashi.getUtxo('abcd...', 0);
```

All singular getters return `T | null`. List methods return `PaginatedResult<T>` with `{ items, nextCursor, hasNextPage }`.

---

## Parsing Events

The SDK parses raw Sui events into a 25-variant **discriminated union**:

```ts
import type { SuiClientTypes } from '@mysten/sui/client';

function handleEvent(rawEvent: SuiClientTypes.Event) {
  const event = hashi.parseEvent(rawEvent);
  if (!event) return; // not a Hashi event

  switch (event.type) {
    case 'DepositRequested':
      console.log('Deposit:', event.utxo.txid, event.amount);
      break;
    case 'WithdrawalConfirmed':
      console.log('Withdrawal confirmed:', event.txid);
      break;
    case 'ProposalCreated':
      console.log('Proposal type:', event.proposalType);
      break;
    case 'Mint':
      console.log('Minted:', event.amount, 'of', event.coinType);
      break;
    // ... 25 total variants
  }
}
```

### Best-Effort vs Strict Parsing

```ts
// Best-effort: returns null for unknown/failed events
const event = parseHashiEvent(rawEvent, packageIds); // HashiEvent | null

// Strict: returns structured error on failure
const result = parseHashiEventStrict(rawEvent, packageIds);
if ('error' in result) {
  console.error(result.error.message);
} else {
  console.log(result.event.type);
}
```

### Multi-Version Package Matching

After a Hashi package upgrade, events from both old and new package addresses need parsing. Pass all known package IDs:

```ts
const packageIds = new Set([
  '0xORIGINAL_PACKAGE...',
  '0xUPGRADED_PACKAGE_V2...',
  '0xUPGRADED_PACKAGE_V3...',
]);
const event = parseHashiEvent(rawEvent, packageIds);
```

### All 25 Event Variants

| Discriminant | Module | Fields |
|---|---|---|
| `DepositRequested` | deposit | requestId, utxo, amount, derivationPath, timestampMs, requesterAddress |
| `DepositConfirmed` | deposit | requestId, utxo, amount, derivationPath |
| `ExpiredDepositDeleted` | deposit | requestId |
| `WithdrawalRequested` | withdrawal_queue | requestId, btcAmount, bitcoinAddress, timestampMs, requesterAddress |
| `WithdrawalApproved` | withdrawal_queue | requestId |
| `WithdrawalPickedForProcessing` | withdrawal_queue | pendingId, txid, requestIds, inputs, outputs, changeOutput |
| `WithdrawalSigned` | withdrawal_queue | withdrawalId, requestIds, signatures |
| `WithdrawalConfirmed` | withdrawal_queue | pendingId, txid, changeUtxoId, requestIds, changeUtxoAmount |
| `WithdrawalCancelled` | withdrawal_queue | requestId, requesterAddress, btcAmount |
| `ValidatorRegistered` | validator | validatorAddress |
| `ValidatorUpdated` | validator | validatorAddress |
| `StartReconfig` | reconfig | epoch |
| `EndReconfig` | reconfig | epoch, mpcPublicKey |
| `AbortReconfig` | reconfig | epoch |
| `UtxoSpent` | utxo_pool | utxoId, spentEpoch |
| `SpentUtxoDeleted` | utxo_pool | utxoId |
| `Mint` | treasury | coinType, amount |
| `Burn` | treasury | coinType, amount |
| `ProposalCreated` | proposal_events | proposalType, proposalId, timestampMs |
| `VoteCast` | proposal_events | proposalType, proposalId, voter |
| `VoteRemoved` | proposal_events | proposalType, proposalId, voter |
| `ProposalDeleted` | proposal_events | proposalType, proposalId |
| `ProposalExecuted` | proposal_events | proposalType, proposalId |
| `QuorumReached` | proposal_events | proposalType, proposalId |
| `PackageUpgraded` | proposal_events | packageId, version |

---

## Bitcoin Helpers

The `hashi-sdk/bitcoin` subpath has **zero Sui dependencies** and can be used independently.

### Address Encoding/Decoding

```ts
import { encodeBitcoinAddress, decodeBitcoinAddress } from 'hashi-sdk/bitcoin';

// Encode witness program to bech32/bech32m address
const addr = encodeBitcoinAddress(
  witnessProgram,   // Uint8Array: 20 bytes (P2WPKH) or 32 bytes (P2TR)
  1,                // witness version: 0 = SegWit, 1 = Taproot
  'mainnet',        // 'mainnet' or 'testnet'
);
// => "bc1p..."

// Decode back
const decoded = decodeBitcoinAddress('tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx');
// { witnessProgram: Uint8Array(20), witnessVersion: 0, network: 'testnet' }
```

Only **witness v0** (20-byte P2WPKH, bech32) and **witness v1** (32-byte P2TR, bech32m) are supported. Other versions/lengths throw `HashiBitcoinError`.

### Amount Conversion

```ts
import { satsToBtc, btcToSats } from 'hashi-sdk/bitcoin';

satsToBtc(100_000_000n);  // "1.00000000"
satsToBtc(1n);             // "0.00000001"
btcToSats('1.5');           // 150_000_000n
btcToSats('0.00000001');    // 1n
```

---

## Validator Operations

These transaction builders are for bridge operators (validators), not end users. All committee-certified operations accept raw BLS signature components (`epoch`, `signature`, `signersBitmap`).

### Deposit Confirmation (Two-Call PTB)

```ts
const build = hashi.confirmDeposit({
  requestId: '0x...',
  epoch: 1n,
  signature: blsSignature,       // Uint8Array, 48 bytes (compressed G2)
  signersBitmap: bitmap,          // Uint8Array, bit-vector of signers
});
```

Internally builds a two-call PTB: `committee::new_committee_signature()` -> `deposit::confirm_deposit()`.

### Withdrawal Processing Pipeline

```ts
// 1. Approve requests (batched in single PTB)
hashi.approveWithdrawalRequests({
  approvals: [
    { requestId: '0x...', epoch: 1n, signature: sig1, signersBitmap: bm1 },
    { requestId: '0x...', epoch: 1n, signature: sig2, signersBitmap: bm2 },
  ],
});

// 2. Commit withdrawal transaction (nested BCS double-encoding)
hashi.commitWithdrawalTx({
  requestIds: ['0x...'],
  selectedUtxos: [{ txid: '...', vout: 0 }],  // BCS-encoded individually
  outputs: [{ amount: 50_000n, bitcoinAddress: witness }], // BCS-encoded individually
  txid: '...',
  epoch: 1n, signature: sig, signersBitmap: bitmap,
});

// 3. Sign withdrawal (threshold Schnorr witnesses)
hashi.signWithdrawal({
  withdrawalId: '0x...',
  requestIds: ['0x...'],
  signatures: [schnorrWitness],
  epoch: 1n, signature: sig, signersBitmap: bitmap,
});

// 4. Confirm withdrawal (after BTC broadcast)
hashi.confirmWithdrawal({
  withdrawalId: '0x...',
  epoch: 1n, signature: sig, signersBitmap: bitmap,
});
```

### Validator Registration & Updates

```ts
hashi.register();
hashi.updatePublicKey({ validatorAddress: '0x...', nextEpochPublicKey: key, proofOfPossessionSignature: pop });
hashi.updateOperatorAddress({ validatorAddress: '0x...', operator: '0x...' });
hashi.updateEndpointUrl({ validatorAddress: '0x...', endpointUrl: 'https://...' });
hashi.updateTlsPublicKey({ validatorAddress: '0x...', tlsPublicKey: key });
hashi.updateEncryptionPublicKey({ validatorAddress: '0x...', nextEpochEncryptionPublicKey: key });
```

### Epoch Reconfiguration

```ts
hashi.startReconfig();  // initiates with SuiSystem (0x5)
hashi.endReconfig({ mpcPublicKey: newKey, signature: sig, signersBitmap: bitmap });
```

### Certificate Submission (DKG/Key Rotation/Nonce)

```ts
hashi.submitDkgCert({ epoch: 1n, dealer: '0x...', messagesHash: hash, signature: sig, signersBitmap: bm });
hashi.submitRotationCert({ ... });
hashi.submitNonceCert({ epoch: 1n, batchIndex: 0, dealer: '0x...', ... });
hashi.destroyAllCerts({ epoch: 1n, batchIndex: 0 });
```

### Governance Proposals

```ts
// Create proposals
hashi.proposeUpdateConfig({ key: 'withdrawal_fee_btc', value: { type: 'U64', value: 1000n }, metadata: {} });
hashi.proposeEnableVersion({ version: 2n, metadata: {} });
hashi.proposeDisableVersion({ version: 1n, metadata: {} });
hashi.proposeUpgrade({ digest: upgradeDigest, metadata: {} });

// Vote (type param required for generic Move call)
hashi.vote({ proposalId: '0x...', proposalType: 'UpdateConfig' });
hashi.removeVote({ proposalId: '0x...', proposalType: 'UpdateConfig' });

// Execute approved proposals
hashi.executeUpdateConfig({ proposalId: '0x...' });
hashi.executeEnableVersion({ proposalId: '0x...' });
hashi.executeUpgrade({ proposalId: '0x...' });  // returns UpgradeTicket
hashi.finalizeUpgrade({ receipt: upgradeReceipt });
```

### Preflight Validation

Validator builders perform client-side preflight checks before returning the closure:
- `signersBitmap` must be non-empty
- `signature` must be exactly 48 bytes (BLS12-381 compressed G2)
- `commitWithdrawalTx`: no duplicate UTXOs or requestIds, correct output cardinality
- All address inputs normalized to canonical 66-char hex

---

## Signing Guide

### Server-Side (Node.js)

```ts
import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

const keypair = Ed25519Keypair.fromSecretKey(secretKey);
const client = new SuiClient({ url: 'https://fullnode.testnet.sui.io' });

const tx = new Transaction();
hashi.createDepositRequest({ txid: '...', vout: 0, amount: 100_000n })(tx);

const result = await client.signAndExecuteTransaction({
  transaction: tx,
  signer: keypair,
});
```

### Browser (dApp Kit)

```tsx
import { useSignAndExecuteTransaction } from '@mysten/dapp-kit-react';
import { Transaction } from '@mysten/sui/transactions';

function DepositButton() {
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();

  return (
    <button onClick={() => {
      const tx = new Transaction();
      hashi.createDepositRequest({ txid: '...', vout: 0, amount: 100_000n })(tx);
      signAndExecute({ transaction: tx });
    }}>
      Deposit
    </button>
  );
}
```

---

## Configuration

### Network Presets

```ts
const hashi = new HashiClient({ client: suiClient, network: 'testnet' });
const hashi = new HashiClient({ client: suiClient, network: 'mainnet' });
```

### Custom / Local Configuration

```ts
const hashi = new HashiClient({
  client: suiClient,
  config: {
    packageId: '0x...',          // current (upgraded) package address
    originalPackageId: '0x...',  // first published address (stable)
    hashiObjectId: '0x...',      // shared Hashi object (stable)
  },
});
```

### Preset with Override

```ts
const hashi = new HashiClient({
  client: suiClient,
  network: 'testnet',
  configOverrides: { packageId: '0xNEW_UPGRADED...' },
});
```

### Standalone Config

```ts
import { HashiConfig } from 'hashi-sdk';

const config = new HashiConfig({
  packageId: '0x...',
  originalPackageId: '0x...',
  hashiObjectId: '0x...',
});
console.log(config.btcCoinType); // "{originalPackageId}::btc::BTC"
```

Address inputs are **normalized automatically**: `0x` prefix optional, any case accepted, shorter hex is zero-padded to 66 chars.

---

## Package Upgrades

The Hashi Move package can be upgraded on-chain. When this happens:

| ID | After upgrade | Used for |
|---|---|---|
| `packageId` | Changes (new address) | Move call targets (`tx.moveCall`) |
| `originalPackageId` | Stays the same | StructTags (BTC coin type, event types, proposal types) |
| `hashiObjectId` | Stays the same | The shared Hashi state object |

```ts
// After an upgrade, update packageId only
const hashi = new HashiClient({
  client: suiClient,
  config: {
    packageId: '0xNEW_VERSION...',
    originalPackageId: '0xORIGINAL...',
    hashiObjectId: '0xHASHI...',
  },
});
```

**Event parsing across versions**: Pass all known package IDs to `parseHashiEvent` to handle events from any version.

---

## Error Handling

All errors extend `HashiError`:

| Error class | When thrown |
| --- | --- |
| `HashiConfigError` | Invalid config (bad addresses, missing fields) |
| `HashiTransactionError` | Invalid tx params, Move abort codes |
| `HashiQueryError` | RPC failures, unexpected responses |
| `HashiParseError` | BCS deserialization, unknown events |
| `HashiBitcoinError` | Invalid Bitcoin addresses/amounts |

### Move Abort Code Lookup

The SDK maps 31 on-chain abort codes to human-readable messages:

```ts
import { lookupAbortCode, transactionErrorFromAbort } from 'hashi-sdk';

const entry = lookupAbortCode('committee', 2);
// { module: 'committee', code: 2, constant: 'ENotEnoughStake',
//   message: 'Not enough stake for threshold' }

const error = transactionErrorFromAbort('withdraw', 0);
// HashiTransactionError with module='withdraw', abortCode=0
```

---

## Type System

The SDK uses a **three-layer type model**:

1. **Codegen layer** (`src/contracts/`): BCS-serializable `MoveStruct` definitions generated by `@mysten/codegen`. Internal to the SDK.

2. **Domain layer** (`src/types/`): Developer-friendly TypeScript interfaces. Public API surface. `camelCase` fields, `string` for addresses, `bigint` for u64, `Uint8Array` for bytes, `T | null` for Option.

3. **Conversion layer** (in queries/events): Transforms BCS output to domain types (address normalization, hex encoding, bigint conversion).

### Key Type Mappings

| Move | TypeScript | Notes |
|---|---|---|
| `address` | `string` | 0x-prefixed, lowercase, 66 chars |
| `u64` | `bigint` | JS numbers lose precision above 2^53 |
| `vector<u8>` | `Uint8Array` | Standard binary |
| `Option<T>` | `T \| null` | Idiomatic TS |
| `Bag` | `{ id: string; size: number }` | Contents via dynamic field queries |
| `VecMap<K,V>` | `Array<{ key: K; value: V }>` | Preserves insertion order |
| `VecSet<T>` | `T[]` | Unwrapped |
| `ConfigValue` | Discriminated union | `{ type: 'U64' \| 'Address' \| ... ; value: ... }` |

---

## Developer Dashboard

The SDK includes an interactive developer dashboard that showcases every operation. It's a React + Vite app targeting Sui devnet.

### Quick Start

```bash
# Prerequisites: Node.js >= 18 and a Sui wallet browser extension (e.g., Sui Wallet)

# 1. Build the SDK first (the dashboard consumes the local build)
npm install
npm run build

# 2. Start the dashboard
cd dashboard
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

### Using the Dashboard

1. **Connect your wallet** -- click "Connect Wallet" in the header and select your Sui wallet. Make sure it's set to **Sui Devnet**.

2. **Get SUI tokens** -- go to **Faucets** and click "Request SUI from Devnet Faucet" to fund your wallet with devnet SUI for gas fees.

3. **Get BTC tokens** -- click the BTC Testnet4 faucet link to get testnet Bitcoin (needed for deposit operations).

4. **Explore operations** -- browse categories in the sidebar:
   - **Queries** -- read on-chain bridge state, deposits, withdrawals, committee info, UTXOs
   - **User Operations** -- create deposit requests, request/cancel withdrawals
   - **Bitcoin Helpers** -- encode/decode Bitcoin addresses, convert sats/BTC
   - **Events** -- subscribe to live bridge events or manually parse event JSON
   - **Validator/Committee/Governance** -- all protocol operations (require committee authority)

5. **Transaction flow** -- for any transaction operation: fill the form → click "Build" to inspect the transaction → click "Sign & Execute" to submit via your wallet.

### Devnet Configuration

The dashboard is hardcoded to Sui devnet:

| Parameter | Value |
|-----------|-------|
| Hashi Package ID | `0xe87f0c85488c5c442612103a08e5df93d2f190cdb0456b667f5257be506aefc7` |
| Hashi Object ID | `0x3b8013407b5caaceb9dbfce56c45987c8e778c2302fc712bd52db093f5997c04` |
| Sui RPC | `https://fullnode.devnet.sui.io` |
| Bitcoin Network | Testnet4 (`tb1p` prefix) |

### Known Limitations

- **Committee operations will fail** without proper validator/committee signing authority -- they're included to demonstrate the full SDK API surface.
- **`deriveDepositAddress`** is not yet implemented in the SDK (stub only).
- **Event subscription** uses polling (`queryEvents` every 5s) rather than WebSocket -- devnet may not have consistent event activity.
- The dashboard consumes the SDK's built `dist/` output -- if you edit SDK source files, rebuild the SDK (`npm run build` in the repo root) before refreshing the dashboard.

---

## Development

### Prerequisites

- Node.js >= 18
- [Sui CLI](https://docs.sui.io/build/install) (for codegen)
- Access to the Hashi Move package (for codegen source)

### Setup

```bash
git clone <repo-url> && cd hashi-sdk
npm install
```

### Build

```bash
npm run build          # Dual ESM/CJS output to dist/
npm run typecheck      # tsc --noEmit
```

The build script (`scripts/build.mjs`) produces:
- `dist/cjs/` -- CommonJS output with `.d.ts` declarations
- `dist/esm/` -- ESM output with `.d.ts` declarations

### Test

```bash
npm test               # vitest run (281 tests)
npm run test:watch     # vitest in watch mode
```

Test breakdown:
- **config.test.ts** (13): Presets, overrides, normalization, validation
- **errors.test.ts** (18): Hierarchy, abort codes, factory helpers
- **bcs.test.ts** (9): BCS round-trips for 8 types
- **transactions.test.ts** (47): PTB snapshots + validation for user builders
- **validator-transactions.test.ts** (72): PTB snapshots + validation for all validator builders
- **events.test.ts** (37): All 25 event variants, multi-version matching, strict parser
- **bitcoin.test.ts** (44): BIP-173, BIP-350 test vectors, round-trips, edge cases
- **queries.test.ts** (27): Mock RPC responses, pagination, not-found, decode errors
- **client.test.ts** (14): HashiClient delegation to standalone functions

### Codegen

Regenerate BCS types and Move function wrappers from the Hashi Move package:

```bash
npm run codegen
```

This runs `sui-ts-codegen generate` which:
1. Calls `sui move summary` on the Hashi Move package
2. Generates TypeScript from the package summaries
3. Outputs to `src/contracts/`

The codegen config is in `sui-codegen.config.ts`. The `path` field must point at a locally available Hashi Move package.

**Important**: Generated files in `src/contracts/` are committed to the repo. After running codegen, check for changes with `git diff src/contracts/`.

### Integration Tests

Integration tests require a Sui localnet with a deployed Hashi Move package:

```bash
HASHI_INTEGRATION=1 npm test
```

These are scaffolding-only and skipped by default.

---

## Non-Goals

This SDK intentionally does **not**:

- **Manage keys or sign transactions** -- it builds `Transaction` objects; you sign them.
- **Run a bridge validator node** -- it provides the transaction builders, not the orchestration.
- **Monitor the Bitcoin blockchain** -- no block header relay, no confirmation watching.
- **Construct or broadcast Bitcoin transactions** -- the committee handles Bitcoin-side operations.
- **Provide a wallet UI** -- use `@mysten/dapp-kit-react` for frontend integration.
- **Subscribe to events** -- it parses events, but doesn't manage WebSocket connections.
- **Implement BLS signing** -- it accepts pre-computed committee signatures as raw bytes.

---

## License

Apache-2.0
