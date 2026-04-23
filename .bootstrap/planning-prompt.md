# Planning Prompt v3 (Final)

You are a senior architect generating an implementation-ready project specification for a **developer dashboard** inside the `hashi-sdk` repository.

Produce a concrete spec that a developer can execute with minimal ambiguity. Optimize for completeness, implementation clarity, and accurate SDK coverage over product polish.

## Objective

Design a React + Vite dashboard at `dashboard/` that exposes **every operation in the local TypeScript `hashi-sdk`** as an interactive developer tool targeting **Sui devnet**.

This is an SDK explorer for engineers — not a marketing site or polished product. It must use the local workspace-linked SDK as the source of truth.

## Product Intent

The dashboard lets a developer:
- Connect a Sui wallet
- Browse SDK capabilities by category
- Fill forms for each operation with typed inputs
- Build transactions and inspect them before signing
- Execute wallet-backed flows
- Run read-only queries and view raw JSON results
- Subscribe to and parse events
- Use Bitcoin helper utilities interactively
- Understand failures through surfaced SDK errors

## Repo / Runtime Constraints

- Lives at `dashboard/` inside the SDK repo
- Consumes `hashi-sdk` via `"hashi-sdk": "file:.."` in package.json
- Targets Sui devnet only (config isolated for future expansion)
- TypeScript throughout
- Minimal styling — developer-functional, not beautiful
- No automated tests for v1
- Update repo README with dashboard quick-start

## Required Tech Stack

- React 18+ with Vite
- TypeScript
- `@mysten/dapp-kit-react` for wallet connection
- `@tanstack/react-query` (peer dep of dapp-kit)
- Local `hashi-sdk` workspace package

## Devnet Configuration (Hardcoded)

- Hashi Package ID: `0xe87f0c85488c5c442612103a08e5df93d2f190cdb0456b667f5257be506aefc7`
- Hashi Object ID: `0x3b8013407b5caaceb9dbfce56c45987c8e778c2302fc712bd52db093f5997c04`
- Sui RPC: `https://fullnode.devnet.sui.io`
- Bitcoin Network: Testnet4 (`tb1p` prefix, bech32m)

## Critical Requirement: Full SDK Coverage

The spec MUST enumerate operations from the actual SDK source. For each operation, identify:
1. Which SDK function/method it wraps
2. Its invocation mode:
   - **pure utility** — local computation, no network
   - **read-only query** — SuiClient call, no wallet
   - **build-only transaction** — constructs TX for inspection only
   - **build + sign + execute transaction** — full wallet flow
   - **event parser** — transforms raw event data
   - **live subscription** — ongoing event stream
3. Which dashboard panel hosts it

Produce a **coverage matrix** mapping every exported SDK operation to a dashboard panel. Call out any operations intentionally excluded with rationale.

**Source-of-truth rule**: If the provided operation list below differs from the actual SDK exports, the SDK source is authoritative. The spec must list mismatches and how they are handled.

## SDK Operations by Category

### Faucets
- Sui devnet faucet: button that calls `requestSuiFromFaucet` or hits the devnet faucet endpoint
- BTC Testnet4 faucet: external link to known Testnet4 faucet

### User Transactions (wallet-execute)
- `createDepositRequest` — form: sender, txid, vout, amount, recipient
- `requestWithdrawal` — form: BTC address, amount (in sats)
- `cancelWithdrawal` — form: withdrawal request ID, recipient

### Queries (read-only)
- `getHashiState` — button, display full state
- `getConfig` — button, display config entries
- `getDepositRequest` — form: request ID → single result
- `listDepositRequests` — paginated with cursor controls
- `getWithdrawalRequest` — form: request ID → single result
- `listPendingWithdrawals` — paginated with cursor controls
- `getCommittee` — button (current epoch) + optional epoch input
- `getMemberInfo` — form: validator address
- `getUtxo` — form: txid + vout

### Events
- Live subscription via Sui RPC event subscription
- Parse incoming events using `parseHashiEvent`
- Display parsed events with type discrimination
- Filter by event variant (25 types)
- Manual parse mode: paste raw event JSON → parse and display

### Bitcoin Helpers (pure utility, no wallet needed)
- `encodeBitcoinAddress` — form: witness program (hex), witness version, network
- `decodeBitcoinAddress` — form: Bitcoin address string
- `satsToBtc` — form: satoshis input
- `btcToSats` — form: BTC string input

### Validator Operations (wallet-execute)
- `register` — button
- `updatePublicKey` — form: new public key bytes
- `updateOperatorAddress` — form: new operator address
- `updateEndpointUrl` — form: new URL bytes
- `updateTlsPublicKey` — form: new TLS key bytes
- `updateEncryptionPublicKey` — form: new encryption key bytes

### Committee/Deposit Operations (wallet-execute)
- `confirmDeposit` — form: deposit request ID, committee signature fields
- `deleteExpiredDeposits` — form: deposit request IDs (batch)

### Committee/Withdrawal Operations (wallet-execute)
- `approveWithdrawalRequests` — form: request IDs (batch)
- `commitWithdrawalTx` — form: complex nested inputs (requests, outputs, fee)
- `signWithdrawal` — form: pending withdrawal ID, signatures, bitmap
- `confirmWithdrawal` — form: pending withdrawal ID, txid, vout
- `deleteExpiredSpentUtxo` — form: UTXO IDs (batch)

### Reconfiguration (wallet-execute)
- `startReconfig` — button (uses SuiSystem shared object)
- `endReconfig` — form: committee signature fields

### Certificate Operations (wallet-execute)
- `submitDkgCert` — form: cert data bytes
- `submitRotationCert` — form: cert data bytes
- `submitNonceCert` — form: cert data bytes
- `destroyAllCerts` — form: epoch

### Governance (wallet-execute)
- `proposeUpdateConfig` — form: config key, value
- `proposeEnableVersion` — form: version number
- `proposeDisableVersion` — form: version number
- `proposeUpgrade` — form: upgrade params
- `vote` — form: proposal ID, proposal type
- `removeVote` — form: proposal ID, proposal type
- `deleteExpiredProposal` — form: proposal ID, proposal type
- `executeUpdateConfig` / `executeEnableVersion` / `executeDisableVersion` / `executeUpgrade` — form: proposal ID
- `finalizeUpgrade` — form: upgrade receipt

## What the Spec Must Cover

### 1. App Architecture
- Directory structure under `dashboard/`
- Package.json wiring (file: link to SDK)
- Environment and config strategy (isolated for network expansion)
- How Sui client, wallet provider, and HashiClient are initialized
- State management: React Query for server state, local state for forms

### 2. Navigation & Layout
- Sidebar or tab navigation grouping operations by category
- Wallet connect button in header
- Each category expands to show its operations
- Active panel displays in main content area
- Single-page shell or lightweight routed dashboard; justify the choice

### 3. Operation Execution Model
Distinguish and handle:
- **Pure utility**: call function, display result. No wallet needed.
- **Read-only query**: call with SuiClient, display JSON result. No wallet needed.
- **Transaction builder**: build TX → inspect → sign & execute. Wallet required.
- **Event subscription**: start/stop lifecycle, accumulate parsed events in a log.

For transaction flows:
- Build the transaction and display serialized TX details
- User clicks "Sign & Execute" to submit via wallet
- Display transaction digest and effects on success
- Display full error on failure

### 4. Shared Components
- `OperationPanel` — shell with title, description, form, result area
- `JsonViewer` — render JSON with basic formatting (pre tag is fine)
- `TransactionPreview` — show built transaction details before signing
- `ErrorDisplay` — render HashiError hierarchy info
- `PaginatedList` — cursor-based pagination controls
- `EventLog` — scrolling log of parsed events with type badges
- `WalletGuard` — show "connect wallet" message for wallet-required operations

### 5. Form Strategy
- Justify whether forms are schema-driven, config-driven, or hand-authored per operation
- Define where reuse stops being worth it
- Define shared infrastructure boundaries: hooks/runner layer, operation metadata layer, per-operation adapters

### 6. Error Handling
- Display SDK error type (HashiConfigError, HashiTransactionError, etc.)
- Show abort code mapping when available
- Distinguish validation errors (before TX build) from execution errors (after submit)
- Show raw error details in expandable section

### 6. Acceptance Criteria
1. `npm run dev` starts the dashboard at localhost
2. Wallet connects via dapp-kit
3. Sui devnet faucet button dispenses SUI to connected wallet
4. BTC faucet link opens external faucet
5. At least one query (getHashiState) returns and displays data
6. Paginated queries show next/prev controls
7. Transaction builder forms produce inspectable TX
8. Sign & execute submits to devnet
9. Bitcoin helpers encode/decode correctly
10. Event subscription receives and parses events
11. All SDK operations have a corresponding panel (coverage matrix satisfied)
12. README has working quick-start guide (install, run, wallet prereqs, devnet assumptions, known limitations)
13. Coverage verification: every exported SDK operation is mapped in the coverage matrix or explicitly excluded with rationale

### 7. Implementation Phases
Provide 3-6 ordered phases building from foundation to full coverage.

## Output Format

1. Executive Summary
2. Scope and Non-Goals
3. SDK Coverage Matrix (table: operation → panel → invocation mode)
4. App Architecture
5. Navigation & Layout Design
6. Shared Component Model
7. Operation Execution Flows
8. State, Data Fetching, and Error Handling
9. Config / Devnet Integration
10. Implementation Phases
11. Acceptance Criteria
12. Risks / Open Questions

## Writing Constraints
- Be concrete — specify component names, file paths, prop shapes
- Do not assume a backend outside what the SDK and Sui devnet provide
- Do not optimize for aesthetics — optimize for developer usefulness
- When details depend on the actual SDK source, state the assumption and mark it for validation
- Keep implementation phases independently testable
