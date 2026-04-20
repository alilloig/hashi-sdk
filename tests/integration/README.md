# Integration Tests

End-to-end tests for the Hashi SDK, testing against real Bitcoin regtest and Sui localnet.

## Prerequisites

1. **Docker** — For Bitcoin regtest
2. **Sui localnet** — Via `hashi-localnet` from the sibling `hashi` repo
3. **Node.js 18+** — For running tests

## Quick Start

### 1. Start Bitcoin Regtest

```bash
# From hashi-sdk directory
npm run docker:up

# Verify it's running (wait for bootstrap to complete)
npm run docker:logs
# Should see "Bootstrap complete. Wallet funded with mature coinbase."
```

### 2. Start Sui Localnet

```bash
# From the sibling hashi repo
cd ../hashi
cargo run -p e2e-tests --bin hashi-localnet -- start --num-validators 4

# This creates ~/.hashi/localnet/state.json with package IDs
```

### 3. Run Integration Tests

```bash
# From hashi-sdk directory
npm run test:integration

# Or run all tests including integration
npm run test:ci
```

## Configuration

Tests auto-detect configuration from:

1. **Environment variables** (highest priority):
   ```bash
   export HASHI_INTEGRATION=1
   export SUI_RPC_URL=http://127.0.0.1:9000
   export HASHI_PACKAGE_ID=0x...
   export HASHI_ORIGINAL_PACKAGE_ID=0x...
   export HASHI_OBJECT_ID=0x...
   ```

2. **Localnet state file** (auto-detected):
   - `~/.hashi/localnet/state.json`
   - Created by `hashi-localnet` from the sibling repo

## Test Files

| File | Description |
|------|-------------|
| `smoke.test.ts` | Infrastructure health checks (Bitcoin RPC, Sui RPC) |
| `deposit-flow.test.ts` | Deposit request creation and submission |
| `withdrawal-flow.test.ts` | Withdrawal request and cancellation |
| `test-utils.ts` | Shared utilities (RPC helpers, UTXO creation) |

## Docker Commands

```bash
npm run docker:up     # Start Bitcoin regtest
npm run docker:down   # Stop containers
npm run docker:logs   # View logs
npm run docker:reset  # Stop and remove volumes (fresh start)
```

## Troubleshooting

### "Bitcoin regtest RPC not available"

```bash
# Check if container is running
docker ps | grep hashi-bitcoin-regtest

# Check logs
npm run docker:logs

# Restart
npm run docker:reset && npm run docker:up
```

### "No Sui configuration found"

Either:
- Start `hashi-localnet` from the sibling repo, OR
- Set environment variables manually

### "Could not fetch MPC public key"

The committee may not be initialized on a fresh localnet. Some tests will be skipped.

### Tests hang or timeout

```bash
# Increase test timeout
npm run test:integration -- --timeout 60000
```

## Writing New Tests

Use the test utilities:

```typescript
import {
  bitcoinRpc,
  createTestUtxo,
  getTestConfig,
  canRunIntegrationTests,
} from './test-utils';

// Check prerequisites
const [canRun, reason] = await canRunIntegrationTests();
if (!canRun) {
  console.log(`Skipping: ${reason}`);
  return;
}

// Create a UTXO for testing
const utxo = await createTestUtxo(depositAddress, 100_000n);

// Use the test config
const config = getTestConfig()!;
const suiClient = new SuiClient({ url: config.suiRpcUrl });
```

## Network Details

### Bitcoin Regtest

- RPC URL: `http://127.0.0.1:18443`
- Credentials: `test:test`
- Address prefix: `bcrt1p...` (P2TR) / `bcrt1q...` (P2WPKH)
- Initial blocks: 101 (for spendable coinbase)

### Sui Localnet

- RPC URL: `http://127.0.0.1:9000` (default)
- Package IDs: From `~/.hashi/localnet/state.json`
