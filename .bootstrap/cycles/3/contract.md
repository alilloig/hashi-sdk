---
cycle: 3
name: User Transaction Operations
---

## Scope
Implement the build-inspect-sign-execute transaction flow infrastructure (TransactionPreview, WalletGuard components, useTransactionExecution hook). Build the 3 user transaction panels: createDepositRequest, requestWithdrawal, cancelWithdrawal. Wire #user-operations route.

## Completion Criteria

1. [ ] A `WalletGuard` component exists that shows "Connect wallet to use this operation" when no wallet is connected, and renders children when connected
2. [ ] A `TransactionPreview` component exists that displays built transaction details (Move call targets, arguments)
3. [ ] A shared `useTransactionExecution` hook or pattern exists that handles: build TX → show preview → sign & execute → show result/error
4. [ ] The #user-operations hash route renders a UserOperationsPanel
5. [ ] `createDepositRequest` panel: form with txid (hex), vout (number), amount (satoshis bigint) inputs. Builds and executes transaction.
6. [ ] `requestWithdrawal` panel: form with Bitcoin address (hex bytes), amount (satoshis) inputs. Builds and executes transaction.
7. [ ] `cancelWithdrawal` panel: form with withdrawal request ID, recipient address inputs. Builds and executes transaction.
8. [ ] Transaction execution shows the transaction digest on success
9. [ ] Transaction execution shows full error details on failure (including abort code if available)
10. [ ] TypeScript compiles with no errors (`npx tsc --noEmit` exits 0)

## Verification Commands
- `cd /Users/alilloig/workspace/hashi-sdk/dashboard && npx tsc --noEmit` — verifies criteria 10

## Context from Previous Cycles
- Cycle 1: App shell, shared components (OperationPanel, JsonViewer, ErrorDisplay), HashiClient provider, wallet connect
- Cycle 2: Queries panel with all 9 query operations, AsyncState pattern for loading/error states
- HashiClient is available via `useHashiClient()` from `./context/HashiClientContext`
- The SDK transaction builders return `(tx: Transaction) => void | TransactionResult` closures
- For signing/executing, use dapp-kit-react's `useSignAndExecuteTransaction` hook
