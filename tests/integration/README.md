# Integration Tests

These tests run against a live Sui network (localnet or testnet) with a deployed
Hashi package. They are **skipped by default** in CI and regular `npm test` runs.

## Prerequisites

1. A running Sui localnet or testnet node
2. A deployed Hashi package with known object IDs
3. A funded Sui wallet for signing transactions

## Running

Set the `HASHI_INTEGRATION` environment variable to `1` and provide the required
configuration via environment variables:

```bash
export HASHI_INTEGRATION=1
export SUI_RPC_URL=http://127.0.0.1:9000
export HASHI_PACKAGE_ID=0x...
export HASHI_ORIGINAL_PACKAGE_ID=0x...
export HASHI_OBJECT_ID=0x...

npx vitest run tests/integration/
```

## Test Files

- `deposit-flow.test.ts` -- End-to-end deposit request creation and confirmation
- `withdrawal-flow.test.ts` -- End-to-end withdrawal request and cancellation

## Notes

- Integration tests are inherently slower and may require chain state setup.
- Each test file documents its specific prerequisites in the test description.
- Tests use `describe.skipIf(!process.env.HASHI_INTEGRATION)` to self-skip when
  the environment variable is not set.
