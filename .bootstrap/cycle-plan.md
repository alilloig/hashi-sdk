# Cycle Plan

## Cycle 1: Foundation & App Shell
- **Scope**: Scaffold Vite + React + TypeScript app in `dashboard/`. Set up package.json with local SDK link, dapp-kit-react, react-query. Create config module with devnet constants. Build app shell with sidebar navigation, wallet connect header, and HashiClient provider context. Create the shared OperationPanel, JsonViewer, and ErrorDisplay components. Implement faucets panel (SUI devnet faucet button + BTC external link).
- **Dependencies**: None (foundation cycle)
- **Complexity**: moderate
- **Deliverables**: 
  - `dashboard/` directory with working Vite dev server
  - Wallet connects and shows address/balance
  - Sidebar navigation with all categories (panels empty)
  - SUI faucet dispenses tokens
  - BTC faucet link works
  - Shared components exist and render
- **Suggested model**: opus

## Cycle 2: Queries Panel
- **Scope**: Implement all 9 query operation panels using the shared OperationPanel + JsonViewer components. Include paginated list queries with cursor controls. Each query panel has appropriate input fields and displays results as formatted JSON.
- **Dependencies**: Cycle 1 (app shell, shared components, HashiClient provider)
- **Complexity**: moderate
- **Deliverables**:
  - 9 query panels functional
  - getHashiState returns and displays data from devnet
  - Paginated queries have next/prev controls
  - Null results show "Not found"
  - Query errors display with type info
- **Suggested model**: sonnet

## Cycle 3: User Transaction Operations
- **Scope**: Implement the build-inspect-sign-execute transaction flow infrastructure (TransactionPreview, WalletGuard components, useTransactionExecution hook). Build the 3 user transaction panels: createDepositRequest, requestWithdrawal, cancelWithdrawal. Each form validates inputs, builds the transaction, shows preview, and supports sign+execute.
- **Dependencies**: Cycle 1 (app shell, shared components), Cycle 2 (validates SuiClient works)
- **Complexity**: moderate
- **Deliverables**:
  - TransactionPreview component shows Move call details
  - WalletGuard blocks wallet-required operations when disconnected
  - 3 user transaction panels with forms and validation
  - Build → inspect → sign → execute flow works end-to-end
  - Errors display with SDK error hierarchy info
- **Suggested model**: opus

## Cycle 4: Validator, Committee & Protocol Operations
- **Scope**: Implement the remaining 31 transaction builder panels: validator management (6), committee deposit ops (2), committee withdrawal ops (5), reconfiguration (2), certificate ops (4), governance (12). Create shared input components for committee signatures (epoch + signature + bitmap), batch ID inputs, and hex byte inputs. These reuse the transaction flow from Cycle 3.
- **Dependencies**: Cycle 3 (transaction execution infrastructure)
- **Complexity**: complex (highest panel count, complex forms like commitWithdrawalTx)
- **Deliverables**:
  - All 31 remaining transaction panels implemented
  - Committee signature inputs are consistent across forms
  - Batch operations support add/remove for multiple entries
  - commitWithdrawalTx handles nested UTXO inputs
  - All forms build transactions and support sign+execute
  - Warning note visible for committee operations
- **Suggested model**: opus

## Cycle 5: Events & Bitcoin Helpers
- **Scope**: Implement the Events panel with live subscription (start/stop, filtered log, 500-entry cap, manual reconnect) and manual parse mode. Implement 4 Bitcoin helper panels (encode/decode address, sats/BTC conversion) plus deriveDepositAddress info note. Build the EventLog component with type badges and filtering.
- **Dependencies**: Cycle 1 (app shell), indirectly Cycle 2 (SuiClient configuration)
- **Complexity**: moderate
- **Deliverables**:
  - Live event subscription with start/stop
  - Event type filtering (25 variants)
  - Manual parse mode accepts JSON and displays result
  - EventLog component with scrolling, badges, filtering
  - 4 Bitcoin helper panels work without wallet
  - deriveDepositAddress shows stub note
- **Suggested model**: sonnet

## Cycle 6: Polish, README & Coverage Verification
- **Scope**: Hash-based deep linking for all panels. Verify every SDK operation has a panel (coverage audit). Fix any broken panels found during verification. Add README quick-start section with install, run, wallet prereqs, devnet warning, faucet instructions, known limitations. Final pass on error handling and edge cases.
- **Dependencies**: All previous cycles
- **Complexity**: simple
- **Deliverables**:
  - Hash-based URLs work for all panels (#category/operation)
  - Coverage matrix verified: all 49 panels accessible
  - README updated with quick-start guide
  - All panels render without errors
  - No TypeScript compilation errors
- **Suggested model**: sonnet
