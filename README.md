# hashi-sdk

TypeScript SDK for the **Hashi Bitcoin Bridge** on Sui.

Build, sign, and submit transactions for depositing BTC into the bridge and
withdrawing back to Bitcoin. Query on-chain bridge state, parse events, and
encode Bitcoin addresses -- all with full TypeScript types and zero runtime
dependencies beyond `@mysten/sui`.

## Installation

```bash
npm install hashi-sdk
```

Peer dependency:

```bash
npm install @mysten/sui
```

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
  txid: 'abcd'.padEnd(64, '0'),
  vout: 0,
  amount: 100_000n,
});

const tx = new Transaction();
buildDeposit(tx);

// 3. Sign and execute (see Signing Guide below)
```

## Architecture

The SDK follows a **layered architecture**:

- **Transaction builders** return `(tx: Transaction) => void` closures that
  populate a Sui `Transaction` (programmable transaction block).
- **Query functions** accept a `CoreClient` and `HashiConfig` and return
  deserialized domain types.
- **Event parsers** take raw Sui events and return typed discriminated unions.
- **HashiClient** is a thin facade that bundles a `CoreClient` + `HashiConfig`
  and delegates to the standalone functions.

Every function is available both through `HashiClient` methods and as standalone
imports for tree-shaking:

```ts
// Via HashiClient
const build = hashi.createDepositRequest({ ... });

// Via standalone import
import { createDepositRequest } from 'hashi-sdk/transactions';
import { HashiConfig } from 'hashi-sdk';
const config = new HashiConfig('testnet');
const build = createDepositRequest(config, { ... });
```

### Subpath Exports

| Import path            | Contents                                     |
| ---------------------- | -------------------------------------------- |
| `hashi-sdk`            | Everything (HashiClient, config, types, etc.) |
| `hashi-sdk/client`     | HashiClient class only                        |
| `hashi-sdk/transactions` | Transaction builder functions               |
| `hashi-sdk/queries`    | Query functions                               |
| `hashi-sdk/events`     | Event types and parsers                       |
| `hashi-sdk/bitcoin`    | Bitcoin address and amount helpers             |
| `hashi-sdk/types`      | Domain type definitions                       |

## User Operations

### Create a Deposit Request

Submit a Bitcoin UTXO for bridging into the Sui-side BTC token:

```ts
const build = hashi.createDepositRequest({
  txid: 'a1b2c3...', // 64-char hex, Bitcoin txid (display byte order)
  vout: 0,           // output index
  amount: 500_000n,  // satoshis
  derivationPath: '0x...', // optional
});

const tx = new Transaction();
build(tx);
// sign and execute...
```

### Request a Withdrawal

Burn BTC tokens on Sui and request a payout to a Bitcoin address:

```ts
const build = hashi.requestWithdrawal({
  amount: 200_000n,                     // satoshis to withdraw
  bitcoinAddress: new Uint8Array(20),    // witness program bytes
});

const tx = new Transaction();
build(tx);
```

### Cancel a Withdrawal

Cancel a pending (unapproved) withdrawal and reclaim BTC tokens:

```ts
const build = hashi.cancelWithdrawal({
  requestId: '0x...',  // the withdrawal request object ID
});

const tx = new Transaction();
const refundedCoin = build(tx);  // returns the refunded BTC coin result
tx.transferObjects([refundedCoin], senderAddress);
```

## Querying State

All query methods return Promises and use the `CoreClient` configured in
the `HashiClient`.

### Get Bridge State

```ts
const state = await hashi.getHashiState();
console.log('Current epoch:', state.committeeSet.epoch);
console.log('Deposit queue size:', state.depositQueue.requests.size);
```

### Get a Deposit Request

```ts
const deposit = await hashi.getDepositRequest('0x...');
if (deposit) {
  console.log('Amount:', deposit.utxo.amount);
  console.log('Requester:', deposit.requesterAddress);
}
```

### List Deposit Requests (paginated)

```ts
const page = await hashi.listDepositRequests({ limit: 10 });
for (const req of page.items) {
  console.log(req.utxo.id.txid, req.utxo.amount);
}
if (page.hasNextPage) {
  const next = await hashi.listDepositRequests({
    cursor: page.nextCursor,
    limit: 10,
  });
}
```

### Get Committee Information

```ts
// Current committee
const committee = await hashi.getCommittee();

// Specific epoch
const oldCommittee = await hashi.getCommittee(5n);

// Individual validator info
const member = await hashi.getMemberInfo('0x...');
```

### Get a UTXO

```ts
const utxo = await hashi.getUtxo('abcd...', 0);
if (utxo) {
  console.log('UTXO amount:', utxo.amount);
}
```

## Parsing Events

The event parser converts raw Sui events into typed discriminated unions.
Use pattern matching on the `type` field:

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
    case 'ValidatorRegistered':
      console.log('New validator:', event.validatorAddress);
      break;
    // ... 25 event types total
  }
}
```

For strict parsing that returns errors instead of null:

```ts
const result = hashi.parseEventStrict(rawEvent);
if ('error' in result) {
  console.error('Parse failed:', result.error.message);
} else {
  console.log('Parsed event:', result.event.type);
}
```

### Standalone Event Parsing

```ts
import { parseHashiEvent } from 'hashi-sdk/events';

const packageIds = new Set(['0xPKG_CURRENT', '0xPKG_ORIGINAL']);
const event = parseHashiEvent(rawSuiEvent, packageIds);
```

## Bitcoin Helpers

### Address Encoding/Decoding

```ts
import {
  encodeBitcoinAddress,
  decodeBitcoinAddress,
} from 'hashi-sdk/bitcoin';

// Encode a witness program to bech32/bech32m address
const address = encodeBitcoinAddress(
  witnessProgram,  // Uint8Array (20 bytes for v0, 32 for v1)
  1,               // witness version (0 = P2WPKH, 1 = P2TR)
  'mainnet',       // or 'testnet'
);
// => "bc1p..."

// Decode back
const decoded = decodeBitcoinAddress('tb1q...');
console.log(decoded.witnessVersion); // 0
console.log(decoded.network);        // 'testnet'
console.log(decoded.witnessProgram); // Uint8Array(20)
```

### Amount Conversion

```ts
import { satsToBtc, btcToSats } from 'hashi-sdk/bitcoin';

satsToBtc(100_000_000n); // "1.00000000"
satsToBtc(1n);            // "0.00000001"

btcToSats('1.5');          // 150_000_000n
btcToSats('0.00000001');   // 1n
```

## Validator Operations

The SDK includes transaction builders for all validator and committee
operations. These are typically used by bridge operators, not end users.

### Registration and Configuration

```ts
// Register as a validator (requires active Sui validator status)
const build = hashi.register();

// Update validator settings
hashi.updatePublicKey({ validator: '0x...', nextEpochPublicKey: pubkey, proofOfPossessionSignature: pop });
hashi.updateOperatorAddress({ validator: '0x...', operator: '0x...' });
hashi.updateEndpointUrl({ validator: '0x...', endpointUrl: 'https://...' });
hashi.updateTlsPublicKey({ validator: '0x...', tlsPublicKey: tlsKey });
hashi.updateEncryptionPublicKey({ validator: '0x...', nextEpochEncryptionPublicKey: encKey });
```

### Deposit Confirmation

```ts
const build = hashi.confirmDeposit({
  requestId: '0x...',
  epoch: 1n,
  signature: committeeSig,
  signersBitmap: bitmap,
});
```

### Withdrawal Processing

```ts
// Approve withdrawal requests
hashi.approveWithdrawalRequests({ requestIds: ['0x...'], epoch: 1n, signature: sig, signersBitmap: bitmap });

// Commit a withdrawal transaction
hashi.commitWithdrawalTx({ requestIds: [...], selectedUtxos: [...], outputs: [...], txid: '...', epoch: 1n, signature: sig, signersBitmap: bitmap });

// Sign and confirm
hashi.signWithdrawal({ withdrawalId: '0x...', requestIds: [...], signatures: [...], epoch: 1n, signature: sig, signersBitmap: bitmap });
hashi.confirmWithdrawal({ withdrawalId: '0x...', epoch: 1n, signature: sig, signersBitmap: bitmap });
```

### Reconfiguration

```ts
hashi.startReconfig();
hashi.endReconfig({ mpcPublicKey: newKey, signature: sig, signersBitmap: bitmap });
```

### Governance Proposals

```ts
// Create proposals
hashi.proposeUpdateConfig({ key: 'max_withdrawal', value: '0x...', metadata: '0x...' });
hashi.proposeEnableVersion({ version: 2n, metadata: '0x...' });
hashi.proposeUpgrade({ digest: upgradeDigest, metadata: '0x...' });

// Vote
hashi.vote({ proposalId: '0x...', proposalType: 'UpdateConfig' });
hashi.removeVote({ proposalId: '0x...', proposalType: 'UpdateConfig' });

// Execute approved proposals
hashi.executeUpdateConfig({ proposalId: '0x...' });
```

## Signing Guide

Transaction builders return `(tx: Transaction) => void` closures. You add
them to a `Transaction`, then sign and execute however your environment
supports.

### Server-Side (Node.js)

```ts
import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

const keypair = Ed25519Keypair.fromSecretKey(secretKey);
const client = new SuiClient({ url: '...' });

const tx = new Transaction();
const build = hashi.createDepositRequest({ txid: '...', vout: 0, amount: 100_000n });
build(tx);

const result = await client.signAndExecuteTransaction({
  transaction: tx,
  signer: keypair,
});
```

### Browser (dApp Kit)

```tsx
import { useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';

function DepositButton() {
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();

  const handleDeposit = () => {
    const tx = new Transaction();
    const build = hashi.createDepositRequest({ txid: '...', vout: 0, amount: 100_000n });
    build(tx);

    signAndExecute({ transaction: tx });
  };

  return <button onClick={handleDeposit}>Deposit</button>;
}
```

## Package Upgrades

The Hashi Move package can be upgraded on-chain. When this happens, the
`packageId` changes but the `originalPackageId` stays the same. The
`originalPackageId` is needed for type resolution (e.g., the BTC coin type
is always `{originalPackageId}::btc::BTC`).

```ts
const hashi = new HashiClient({
  client: suiClient,
  config: {
    packageId: '0xNEW_VERSION...',         // latest published package
    originalPackageId: '0xORIGINAL...',     // never changes
    hashiObjectId: '0xHASHI_OBJECT...',     // shared state object
  },
});
```

When using the `'testnet'` or `'mainnet'` preset, the SDK provides
built-in addresses. After a package upgrade, you can override just the
`packageId`:

```ts
const config = new HashiConfig('testnet', {
  packageId: '0xUPGRADED_PACKAGE...',
});
```

## Configuration

### Network Presets

```ts
const hashi = new HashiClient({ client, network: 'testnet' });
const hashi = new HashiClient({ client, network: 'mainnet' });
```

### Custom Configuration

```ts
const hashi = new HashiClient({
  client,
  config: {
    packageId: '0x...',
    originalPackageId: '0x...',
    hashiObjectId: '0x...',
  },
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
console.log(config.btcCoinType); // "0x...::btc::BTC"
```

## Error Handling

All SDK errors extend `HashiError`:

| Error class             | When thrown                              |
| ----------------------- | ---------------------------------------- |
| `HashiConfigError`      | Invalid config (bad addresses, missing)  |
| `HashiTransactionError` | Invalid transaction params, Move aborts  |
| `HashiQueryError`       | RPC failures during queries              |
| `HashiParseError`       | BCS deserialization failures             |
| `HashiBitcoinError`     | Invalid Bitcoin addresses/amounts        |

### Move Abort Code Lookup

```ts
import { lookupAbortCode, transactionErrorFromAbort } from 'hashi-sdk';

const entry = lookupAbortCode('committee', 2);
// { module: 'committee', code: 2, constant: 'ENotEnoughStake', message: 'Not enough stake for threshold' }

const error = transactionErrorFromAbort('withdraw', 0);
// HashiTransactionError: withdraw::EUnauthorizedCancellation (code 0): Only original requester can cancel
```

## Non-Goals

This SDK intentionally does **not**:

- **Manage Bitcoin keys or sign Bitcoin transactions.** The bridge committee
  handles Bitcoin-side signing. This SDK only builds Sui transactions.
- **Run a bridge validator node.** It provides the transaction builders a
  validator would use, but not the orchestration logic.
- **Monitor the Bitcoin blockchain.** It does not watch for Bitcoin
  confirmations or relay block headers.
- **Provide a wallet UI.** Use `@mysten/dapp-kit` or your own wallet
  integration for signing.

## API Reference

All public functions, classes, and types have TSDoc comments. Use your IDE's
hover/autocomplete or generate documentation with `typedoc`:

```bash
npx typedoc --entryPoints src/index.ts --out docs/
```

## License

Apache-2.0
