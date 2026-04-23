# Hashi SDK Developer Dashboard -- Specification

## Vision

The Hashi SDK Developer Dashboard is an interactive web application that exposes every operation in the `hashi-sdk` TypeScript library as a usable developer tool targeting Sui devnet. It serves as both a functional test harness and an SDK showcase, letting engineers connect a wallet, browse every capability the SDK offers, fill forms with typed inputs, build and inspect transactions before signing, execute wallet-backed flows, run read-only queries, subscribe to events, and exercise Bitcoin helper utilities -- all from a single-page interface.

This is not a polished product or marketing site. It is an SDK explorer for engineers building on the Hashi bridge, designed to demonstrate the full API surface and validate that every operation works end-to-end against a live devnet deployment. It lives inside the SDK repository itself and consumes the SDK via a local workspace link, ensuring the dashboard always reflects the actual published API.

## Target Users

- **SDK integrators** who want to understand what operations are available before writing code
- **Bridge operators / validators** who need to test committee and governance operations against devnet
- **Hashi core developers** who want to manually exercise specific operations or inspect on-chain state during development
- **Reviewers** evaluating the SDK's completeness by seeing every exported function with a working UI

## Core Features

### 1. Wallet Connection and Faucets

**What it does**: Provides a persistent wallet connection UI and quick access to fund the connected wallet with SUI tokens and BTC test tokens.

**Why it matters**: Every transaction operation requires a connected wallet with SUI for gas. The Hashi bridge also requires BTC tokens for deposit/withdrawal flows.

**Key constraints**:
- Wallet connection uses `@mysten/dapp-kit-react` targeting Sui devnet exclusively
- SUI faucet calls the devnet faucet endpoint programmatically (button click, no form)
- BTC Testnet4 faucet is an external link (no API integration)
- Wallet address and SUI balance should be visible in the header at all times

**Acceptance criteria**:
- A "Connect Wallet" button is present and functional with standard Sui wallets
- Connected wallet address and balance display persistently
- SUI faucet button dispenses tokens to the connected address (success/error feedback shown)
- BTC faucet link opens the external Testnet4 faucet in a new tab

### 2. Read-Only Queries

**What it does**: Provides forms and one-click buttons for every SDK query function, displaying results as formatted JSON.

**Why it matters**: The Hashi bridge stores all state on-chain. Engineers need to inspect bridge state, deposit/withdrawal queues, committee membership, UTXO pool, and configuration without running custom scripts.

**Key constraints**:
- Queries do not require a connected wallet (only SuiClient)
- Paginated queries must provide cursor-based next/previous navigation
- Results display as formatted JSON with basic syntax highlighting or structure
- Loading and error states must be clearly indicated

**Operations covered** (9 SDK query functions):

| Operation | Input | Output |
|---|---|---|
| `getHashiState` | none (button) | Full bridge root state object |
| `getConfig` | none (button) | Bridge configuration entries |
| `getDepositRequest` | requestId (text) | Single deposit request or null |
| `listDepositRequests` | optional cursor, limit | Paginated deposit request list |
| `getWithdrawalRequest` | requestId (text) | Single withdrawal request or null |
| `listPendingWithdrawals` | optional cursor, limit | Paginated pending withdrawal list |
| `getCommittee` | optional epoch (number) | Committee for given or current epoch |
| `getMemberInfo` | validatorAddress (text) | Validator member information or null |
| `getUtxo` | txid (text), vout (number) | Single UTXO or null |

**Acceptance criteria**:
- Every query function has a dedicated panel with appropriate inputs
- `getHashiState` returns and displays data when the devnet Hashi object exists
- Paginated queries show next/previous controls and current cursor position
- Null results display clearly (e.g., "Not found")
- Query errors display the error type and message

### 3. User Transaction Operations

**What it does**: Provides forms for the three end-user bridge operations (deposit, withdraw, cancel), with a two-step build-then-sign flow.

**Why it matters**: These are the primary SDK operations that frontend integrators will use. The dashboard demonstrates the full lifecycle: fill form, build transaction, inspect it, sign and execute.

**Operations covered** (3 SDK transaction builders):

| Operation | Parameters | Notes |
|---|---|---|
| `createDepositRequest` | txid (64-char hex), vout (number), amount (satoshis), optional derivationPath | 5-step PTB |
| `requestWithdrawal` | amount (satoshis), bitcoinAddress (hex bytes or address) | Uses CoinWithBalance intent; requires BTC balance |
| `cancelWithdrawal` | requestId (object ID), recipient (Sui address) | Returns refunded Coin<BTC> |

**Acceptance criteria**:
- Each operation has a form with typed inputs and validation feedback
- "Build Transaction" produces an inspectable transaction representation
- "Sign & Execute" submits via wallet and shows the transaction digest and effects
- Errors (validation, execution) display with SDK error type information
- Wallet connection is required and enforced before transaction operations

### 4. Validator and Committee Operations

**What it does**: Provides forms for all committee/validator transaction builders, including validator registration, key updates, deposit confirmation, withdrawal processing pipeline, reconfiguration, certificate submission, and governance proposals.

**Why it matters**: These operations represent the majority of the SDK's API surface. Even though they will fail on devnet without proper committee keys, the forms demonstrate that the SDK covers the full protocol and allow bridge operators to test their tooling.

**Operations covered** (30 SDK transaction builders):

*Validator Management (6):* `register`, `updatePublicKey`, `updateOperatorAddress`, `updateEndpointUrl`, `updateTlsPublicKey`, `updateEncryptionPublicKey`

*Deposit Operations (2):* `confirmDeposit`, `deleteExpiredDeposits`

*Withdrawal Operations (5):* `approveWithdrawalRequests`, `commitWithdrawalTx`, `signWithdrawal`, `confirmWithdrawal`, `deleteExpiredSpentUtxo`

*Reconfiguration (2):* `startReconfig`, `endReconfig`

*Certificate Submission (4):* `submitDkgCert`, `submitRotationCert`, `submitNonceCert`, `destroyAllCerts`

*Governance (11):* `proposeUpdateConfig`, `proposeEnableVersion`, `proposeDisableVersion`, `proposeUpgrade`, `vote`, `removeVote`, `deleteExpiredProposal`, `executeUpdateConfig`, `executeEnableVersion`, `executeDisableVersion`, `executeUpgrade`, `finalizeUpgrade`

**Key constraints**:
- All operations follow the same build-then-sign flow as user operations
- Committee signature fields (epoch, signature bytes, signersBitmap) are common across many forms and should use shared input components
- Batch operations (deleteExpiredDeposits, approveWithdrawalRequests) need dynamic list inputs for multiple IDs
- `commitWithdrawalTx` has the most complex form with nested UTXO inputs and outputs
- A visible note should indicate that committee operations will fail without proper signing keys

**Acceptance criteria**:
- Every transaction builder function has a corresponding form panel
- Forms accept all required parameters in the correct types
- Committee signature fields (epoch, signature, bitmap) are consistently presented
- Batch operations support adding/removing multiple entries
- Complex nested inputs (commitWithdrawalTx outputs, cert params) are manageable
- Transaction build and sign flow works identically to user operations

### 5. Event Subscription and Parsing

**What it does**: Provides a live event subscription that receives Hashi bridge events from devnet, parses them using the SDK's event parser, and displays them in a scrolling log. Also provides a manual parse mode for pasting raw event JSON.

**Why it matters**: The SDK parses 25 distinct event variants. The dashboard demonstrates real-time event monitoring and the parser's ability to discriminate event types.

**Key constraints**:
- Live subscription connects to Sui RPC WebSocket event stream
- Events are parsed using `parseHashiEvent` / `parseHashiEventStrict` with the configured package IDs
- The event log should be filterable by event type (25 variants)
- Manual parse mode accepts raw Sui event JSON and runs it through the parser
- Start/stop subscription lifecycle must be explicit

**All 25 event variants**:
DepositRequested, DepositConfirmed, ExpiredDepositDeleted, WithdrawalRequested, WithdrawalApproved, WithdrawalPickedForProcessing, WithdrawalSigned, WithdrawalConfirmed, WithdrawalCancelled, ValidatorRegistered, ValidatorUpdated, StartReconfig, EndReconfig, AbortReconfig, UtxoSpent, SpentUtxoDeleted, Mint, Burn, ProposalCreated, VoteCast, VoteRemoved, ProposalDeleted, ProposalExecuted, QuorumReached, PackageUpgraded

**Acceptance criteria**:
- Start/stop buttons control the event subscription
- Incoming events are parsed and displayed with their discriminant type
- Event type filter controls which events appear in the log
- Manual parse mode accepts JSON input and displays the parsed result (or parse error)
- Parsed events show all their typed fields in a readable format

### 6. Bitcoin Helpers

**What it does**: Provides interactive forms for the SDK's four Bitcoin utility functions, plus a note about the stub `deriveDepositAddress`.

**Why it matters**: The Bitcoin helper module has zero Sui dependencies and demonstrates standalone SDK capabilities for address encoding/decoding and amount conversion.

**Operations covered** (4 working + 1 stub):

| Operation | Input | Output | Mode |
|---|---|---|---|
| `encodeBitcoinAddress` | witnessProgram (hex), witnessVersion (0 or 1), network (mainnet/testnet) | bech32/bech32m address string | Pure utility |
| `decodeBitcoinAddress` | Bitcoin address string (bc1.../tb1...) | witnessProgram, witnessVersion, network | Pure utility |
| `satsToBtc` | satoshis (bigint) | BTC string with 8 decimal places | Pure utility |
| `btcToSats` | BTC decimal string | satoshis (bigint) | Pure utility |
| `deriveDepositAddress` | N/A | N/A (stub, always throws) | Display note only |

**Acceptance criteria**:
- Each helper has a form with appropriate inputs
- No wallet connection required for any Bitcoin helper
- `encodeBitcoinAddress` produces valid bech32/bech32m addresses
- `decodeBitcoinAddress` correctly parses bc1 and tb1 addresses
- Amount conversion round-trips correctly
- `deriveDepositAddress` is mentioned with a note that it is not yet implemented

### 7. Error Display

**What it does**: Surfaces SDK errors with full type information, including the error hierarchy class name, message, and when applicable, the Move module and abort code with human-readable mapping.

**Why it matters**: The SDK has a structured 5-class error hierarchy with 31 mapped abort codes. Demonstrating rich error display is a key SDK feature.

**Acceptance criteria**:
- Errors display the error class name (HashiTransactionError, HashiQueryError, etc.)
- Transaction errors with abort codes show the module, code, constant name, and message
- Validation errors (before transaction build) are distinguished from execution errors (after submit)
- Raw error details are available in an expandable section

## Architecture Overview

### Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| Framework | React 18+ | Same ecosystem as hashi-frontend; dApp Kit requires React |
| Build tool | Vite | Fast dev server, native TS support, standard for Sui ecosystem |
| Wallet | `@mysten/dapp-kit-react` | Official Sui wallet adapter for React apps |
| Data fetching | `@tanstack/react-query` | Peer dependency of dapp-kit; handles caching, loading states, refetching |
| SDK | `hashi-sdk` via `"file:.."` workspace link | Must consume the local SDK, not a published version |
| Language | TypeScript throughout | Matches SDK codebase |
| Styling | Minimal CSS (or utility-first) | Developer tool, not a product; optimize for function |

### Major Components

- **App Shell**: Single-page layout with persistent header (wallet connection, network badge, balance) and a sidebar/navigation system for browsing operation categories.

- **Navigation System**: Category-based grouping that mirrors the SDK's module structure. Each category expands to show individual operations. Selecting an operation displays its panel in the main content area.

- **Operation Panel Framework**: A reusable shell that wraps every operation with a title, description, parameter form, action buttons (Build, Execute, or Run), and a result display area. The panel framework handles the four invocation modes uniformly.

- **Transaction Execution Engine**: Shared logic for the build-inspect-sign-execute lifecycle. Constructs a `Transaction`, calls the SDK builder to populate it, displays the built transaction for inspection, then hands it to dApp Kit for signing and execution.

- **Query Runner**: Shared logic for invoking SDK query functions with the app's SuiClient and HashiConfig, managing loading/error states via React Query, and rendering JSON results.

- **Event Subscription Manager**: Manages WebSocket connection lifecycle for live Sui event subscriptions, pipes raw events through `parseHashiEvent`, and maintains an in-memory event log with type filtering.

- **HashiClient Provider**: Application-level React context that initializes a `HashiClient` instance with the devnet configuration and the dApp Kit's SuiClient. All operation panels consume this shared client.

### Data Model Concepts

The dashboard does not have its own persistent data. All state is derived from:

- **SDK domain types**: `HashiState`, `Config`, `DepositRequest`, `WithdrawalRequest`, `PendingWithdrawal`, `Committee`, `MemberInfo`, `Utxo`, plus 25 event variant types
- **Form state**: Local React state for each operation's input fields
- **Transaction state**: Build result, execution result, error -- per operation panel
- **Event log**: In-memory array of parsed `HashiEvent` objects with subscription status
- **Wallet state**: Managed by dApp Kit (address, connection status, balance)

### Communication Patterns

- **RPC queries**: SuiClient JSON-RPC via React Query (caching, refetching)
- **Transaction execution**: dApp Kit `signAndExecuteTransaction` hook
- **Event subscription**: Sui RPC WebSocket subscription (`suiClient.subscribeEvent`)
- **SUI faucet**: HTTP request to Sui devnet faucet endpoint
- **No backend**: The dashboard is purely client-side; all operations go directly to Sui devnet

### Integration Points

- **Sui Devnet RPC** (`https://fullnode.devnet.sui.io`): All queries and transaction submissions
- **Hashi Move Package** (packageId `0xe87f0c85488c5c442612103a08e5df93d2f190cdb0456b667f5257be506aefc7`): Target for all Move calls
- **Hashi Shared Object** (hashiObjectId `0x3b8013407b5caaceb9dbfce56c45987c8e778c2302fc712bd52db093f5997c04`): Root bridge state
- **Sui Devnet Faucet**: Token dispensing endpoint
- **BTC Testnet4 Faucet**: External website (link only)
- **Local hashi-sdk**: Workspace-linked npm package providing all SDK functionality

## UX Flows

### Wallet Connection Flow
Connect Wallet button -> dApp Kit modal -> wallet approval -> header updates with address and balance -> wallet-dependent operations become available

### Query Flow
Select query from navigation -> fill optional parameters -> click "Run Query" -> loading indicator -> JSON result displayed (or error with type info) -> for paginated queries, use next/prev controls to navigate pages

### Transaction Flow (User Operations)
Select operation from navigation -> fill form with parameters -> click "Build Transaction" -> transaction details displayed for inspection -> click "Sign & Execute" -> wallet signature prompt -> success: display digest + effects / failure: display error with abort code lookup

### Transaction Flow (Validator/Committee Operations)
Same as user transaction flow, but with a visible warning that committee operations require proper signing authority and will likely fail on devnet without it

### Bitcoin Helper Flow
Select helper from navigation -> fill form inputs -> click "Compute" -> result displayed immediately (no network call, no wallet needed)

### Event Subscription Flow
Open Events panel -> click "Start Subscription" -> events begin streaming into log -> optionally filter by event type using checkboxes/dropdown -> click "Stop Subscription" to disconnect -> log is preserved until cleared

### Manual Event Parse Flow
Open Events panel -> switch to "Manual Parse" tab -> paste raw Sui event JSON into text area -> click "Parse" -> parsed event displayed with type badge and fields (or parse error)

### Error Recovery
Any failed operation -> error displays with class name, message, and details -> user can modify inputs and retry -> no page reload needed

## SDK Coverage Matrix

This matrix accounts for every exported function and class from the SDK's public API surface (`src/index.ts` barrel export). Each item maps to a dashboard panel, an invocation mode, and a navigation category.

### Transaction Builders (34 functions)

| SDK Function | Dashboard Panel | Category | Invocation Mode |
|---|---|---|---|
| `createDepositRequest` | Create Deposit Request | User Operations | build + sign + execute |
| `requestWithdrawal` | Request Withdrawal | User Operations | build + sign + execute |
| `cancelWithdrawal` | Cancel Withdrawal | User Operations | build + sign + execute |
| `confirmDeposit` | Confirm Deposit | Committee: Deposits | build + sign + execute |
| `deleteExpiredDeposits` | Delete Expired Deposits | Committee: Deposits | build + sign + execute |
| `approveWithdrawalRequests` | Approve Withdrawal Requests | Committee: Withdrawals | build + sign + execute |
| `commitWithdrawalTx` | Commit Withdrawal TX | Committee: Withdrawals | build + sign + execute |
| `signWithdrawal` | Sign Withdrawal | Committee: Withdrawals | build + sign + execute |
| `confirmWithdrawal` | Confirm Withdrawal | Committee: Withdrawals | build + sign + execute |
| `deleteExpiredSpentUtxo` | Delete Expired Spent UTXO | Committee: Withdrawals | build + sign + execute |
| `register` | Register Validator | Validator Management | build + sign + execute |
| `updatePublicKey` | Update Public Key | Validator Management | build + sign + execute |
| `updateOperatorAddress` | Update Operator Address | Validator Management | build + sign + execute |
| `updateEndpointUrl` | Update Endpoint URL | Validator Management | build + sign + execute |
| `updateTlsPublicKey` | Update TLS Public Key | Validator Management | build + sign + execute |
| `updateEncryptionPublicKey` | Update Encryption Public Key | Validator Management | build + sign + execute |
| `startReconfig` | Start Reconfiguration | Reconfiguration | build + sign + execute |
| `endReconfig` | End Reconfiguration | Reconfiguration | build + sign + execute |
| `submitDkgCert` | Submit DKG Certificate | Certificate Operations | build + sign + execute |
| `submitRotationCert` | Submit Rotation Certificate | Certificate Operations | build + sign + execute |
| `submitNonceCert` | Submit Nonce Certificate | Certificate Operations | build + sign + execute |
| `destroyAllCerts` | Destroy All Certificates | Certificate Operations | build + sign + execute |
| `proposeUpdateConfig` | Propose Config Update | Governance | build + sign + execute |
| `proposeEnableVersion` | Propose Enable Version | Governance | build + sign + execute |
| `proposeDisableVersion` | Propose Disable Version | Governance | build + sign + execute |
| `proposeUpgrade` | Propose Upgrade | Governance | build + sign + execute |
| `vote` | Vote on Proposal | Governance | build + sign + execute |
| `removeVote` | Remove Vote | Governance | build + sign + execute |
| `deleteExpiredProposal` | Delete Expired Proposal | Governance | build + sign + execute |
| `executeUpdateConfig` | Execute Config Update | Governance | build + sign + execute |
| `executeEnableVersion` | Execute Enable Version | Governance | build + sign + execute |
| `executeDisableVersion` | Execute Disable Version | Governance | build + sign + execute |
| `executeUpgrade` | Execute Upgrade | Governance | build + sign + execute |
| `finalizeUpgrade` | Finalize Upgrade | Governance | build + sign + execute |

### Query Functions (9 functions)

| SDK Function | Dashboard Panel | Category | Invocation Mode |
|---|---|---|---|
| `getHashiState` | Hashi State | Queries | read-only query |
| `getConfig` | Bridge Config | Queries | read-only query |
| `getDepositRequest` | Deposit Request Lookup | Queries | read-only query |
| `listDepositRequests` | Deposit Request List | Queries | read-only query |
| `getWithdrawalRequest` | Withdrawal Request Lookup | Queries | read-only query |
| `listPendingWithdrawals` | Pending Withdrawals List | Queries | read-only query |
| `getCommittee` | Committee Lookup | Queries | read-only query |
| `getMemberInfo` | Member Info Lookup | Queries | read-only query |
| `getUtxo` | UTXO Lookup | Queries | read-only query |

### Event Functions (2 functions + types)

| SDK Function | Dashboard Panel | Category | Invocation Mode |
|---|---|---|---|
| `parseHashiEvent` | Live Event Log | Events | event parser (used in subscription callback) |
| `parseHashiEventStrict` | Manual Event Parser | Events | event parser (manual mode) |
| *25 event type variants* | Event type filter + display | Events | type discrimination |

### Bitcoin Helpers (5 functions)

| SDK Function | Dashboard Panel | Category | Invocation Mode |
|---|---|---|---|
| `encodeBitcoinAddress` | Encode Bitcoin Address | Bitcoin Helpers | pure utility |
| `decodeBitcoinAddress` | Decode Bitcoin Address | Bitcoin Helpers | pure utility |
| `satsToBtc` | Satoshis to BTC | Bitcoin Helpers | pure utility |
| `btcToSats` | BTC to Satoshis | Bitcoin Helpers | pure utility |
| `deriveDepositAddress` | (info note only) | Bitcoin Helpers | N/A -- stub, always throws |

### Faucets (2, not SDK functions)

| Operation | Dashboard Panel | Category | Invocation Mode |
|---|---|---|---|
| SUI devnet faucet | Request SUI | Faucets | HTTP request (no wallet signing) |
| BTC Testnet4 faucet | External link | Faucets | external navigation |

### Configuration and Error Utilities (displayed contextually, not as panels)

| SDK Export | Dashboard Usage | Notes |
|---|---|---|
| `HashiClient` | App-level provider | Initialized once with devnet config |
| `HashiConfig` | Internal to HashiClient | Not directly exposed as a panel |
| `MAINNET_CONFIG`, `TESTNET_CONFIG` | Not used | Dashboard targets devnet only |
| `HashiError` hierarchy (5 classes) | Error display component | Shown on any operation failure |
| `ABORT_CODES`, `lookupAbortCode`, `transactionErrorFromAbort` | Error display component | Enriches transaction error display |

### Explicitly Excluded Exports

| SDK Export | Rationale |
|---|---|
| `encodeUtxoId`, `encodeOutputUtxo` | Internal helpers used by `commitWithdrawalTx`. Not user-facing operations. |
| `CLOCK_OBJECT_ID`, `SUI_SYSTEM_OBJECT_ID`, `RANDOM_OBJECT_ID` | Constants used internally by transaction builders. No interactive value. |
| `validateU64`, `validateTxid`, `validateAddress`, `validateVout`, `validateBitcoinAddress`, `validateSignature`, `validateSignersBitmap`, `validateNoDuplicates`, `validateNonEmpty` | Internal validation utilities. Forms perform their own validation by calling the SDK builders which invoke these internally. |
| `HashiBcs` and all `*Bcs` re-exports (26 items) | Low-level BCS codecs for advanced consumers. Not meaningful as interactive panels. |
| `normalizeSuiAddress` | Internal utility, called implicitly by SDK validation. |
| All type-only exports (interfaces, type aliases) | Types are not runtime operations. They inform form field types but have no interactive panel. |

### Coverage Summary

| Category | SDK Functions | Dashboard Panels | Coverage |
|---|---|---|---|
| Transaction Builders | 36 (including `encodeUtxoId`, `encodeOutputUtxo`) | 34 panels for 34 builders (2 internal helpers excluded) | 34/36 (2 excluded with rationale) |
| Queries | 9 | 9 | 9/9 |
| Event Parsers | 2 | 2 (live + manual) | 2/2 |
| Bitcoin Helpers | 5 | 4 + info note | 5/5 |
| Faucets | 0 (external) | 2 | N/A |
| **Total interactive panels** | | **49** | |

### Mismatches Between Planning Prompt and SDK Source

1. **Planning prompt lists `confirmWithdrawal` with params `(pendingWithdrawalId, txid, vout)`**. Actual SDK signature is `(withdrawalId, epoch, signature, signersBitmap)` -- it is a committee-signed operation, not a UTXO confirmation. The dashboard form follows the actual SDK.

2. **Planning prompt suggests `destroyAllCerts` form has only `epoch`**. Actual SDK accepts `(epoch, batchIndex: number | null)`. Dashboard includes both fields.

3. **Planning prompt does not mention `finalizeUpgrade`**. The SDK exports it as a distinct transaction builder. Dashboard includes it under Governance.

4. **Planning prompt lists cert operations as "form: cert data bytes"**. Actual SDK params are structured objects with `(epoch, dealer, messagesHash, signature, signersBitmap)` for DKG/rotation certs, and additionally `batchIndex` for nonce certs. Dashboard forms reflect the actual param shapes.

5. **`register` in validator ops**: Planning prompt says "button". Actual SDK takes no params beyond config, so a simple button is correct.

6. **Validator update params**: Planning prompt says "form: new public key bytes". Actual `updatePublicKey` requires `(validator, nextEpochPublicKey, proofOfPossessionSignature)` -- three fields, not one. All validator update operations also require a `validator` address field. Dashboard forms reflect actual params.

## Non-Functional Requirements

### Performance
- Dashboard should load and become interactive within 3 seconds on a standard connection
- Query results should render within the RPC response time (no additional processing delay)
- Event log should handle at least 1000 accumulated events without degrading scroll performance

### Security
- No private keys are ever entered into or handled by the dashboard
- All transaction signing happens through the wallet adapter (dApp Kit)
- Devnet configuration is hardcoded; no user-supplied RPC endpoints in v1
- No secrets, API keys, or credentials are stored or transmitted

### Scalability
- Single-user, single-network (devnet) tool -- no multi-tenancy concerns
- Network configuration is isolated behind a config layer to support future testnet/mainnet expansion without structural changes

### Accessibility
- Semantic HTML elements for forms, buttons, and navigation
- Form labels associated with inputs
- Keyboard navigation for primary actions
- Sufficient color contrast for text readability (developer tool standard, not WCAG AAA)

## Out of Scope

- **Production-quality UI/UX**: No design system, no animations, no responsive mobile layout. Functional developer-tool aesthetics only.
- **Automated tests**: No unit tests, integration tests, or E2E tests for the dashboard in v1.
- **Multi-network support**: Only Sui devnet. Config is isolated for future expansion, but network switching UI is not included.
- **Backend server**: No server component. Everything runs client-side against Sui devnet RPC.
- **Authentication or access control**: Open tool, anyone with the repo can run it.
- **Bitcoin transaction construction**: The dashboard does not build or broadcast Bitcoin transactions.
- **BLS signature generation**: Committee signature fields accept raw bytes; the dashboard does not implement BLS signing.
- **Persistent storage**: No database, no localStorage for form state, no history of past operations (beyond the in-memory event log).
- **CI/CD or deployment**: Local development tool only. No Docker, no hosting.
- **`deriveDepositAddress` interactive panel**: This function is a stub in the SDK and always throws. A note is shown instead of a form.

## Scope Definition

**"All SDK operations"** means: every runtime-callable function or method exported from the SDK's public API surface. This explicitly excludes:
- Type-only exports (interfaces, type aliases, discriminated unions)
- BCS codec re-exports (low-level serialization, not interactive operations)
- Internal validation utilities (called implicitly by builders)
- Constants (object IDs, shared object references)

The exclusion rationale is in the coverage matrix above. The dashboard covers **all 49 user-actionable runtime operations** plus 2 faucet panels.

## Resolved Design Decisions

The following questions were originally open. They are now resolved:

### 1. Form Strategy: Hybrid
**Decision**: Hand-authored forms for all operations. With 49 panels, most forms are simple (1-5 fields). Complex forms like `commitWithdrawalTx` need custom layouts. A metadata registry adds abstraction complexity without enough payoff at this scale. Reuse comes from shared input components (hex input, address input, bigint input, committee signature group) rather than a generic form generator.

### 2. Navigation: Single-page with hash-based deep links
**Decision**: Single-page app with a sidebar. Use URL hash fragments (e.g., `#queries/hashi-state`) for deep-linking to specific panels without adding a router dependency. This gives bookmarkability with minimal complexity.

### 3. Transaction Inspection: Structured Move call summary
**Decision**: Display the transaction's Move call targets, arguments (typed), and gas budget. Use `Transaction.getData()` or equivalent to extract structured info. Not raw bytes — that has no value for developers.

### 4. Event Subscription: Manual reconnect
**Decision**: Show a "Reconnect" button if the WebSocket disconnects. No automatic reconnect — keep it simple for a prototype. Event log is capped at 500 entries (oldest dropped). Subscriptions do not survive page navigation away from the Events panel.

### 5. Byte Input: Hex strings only
**Decision**: All binary inputs (signatures, public keys, bitmaps) use hex string input fields. Hex is the standard in the Sui ecosystem. No base64 or file upload in v1.

### 6. SUI Faucet: `@mysten/sui/faucet`
**Decision**: Use `requestSuiFromFaucet` from `@mysten/sui/faucet` targeting `https://faucet.devnet.sui.io/v2/gas`. Fallback: display the faucet URL as a link if the API fails.

### 7. Config Isolation
**Decision**: A single `config.ts` module exports all network-specific constants (package ID, object ID, RPC URL, faucet URL, BTC faucet link). No network constants scattered in components. Future network support means adding entries to this one file.

### 8. README Quick-Start Contents
Required sections:
- Prerequisites (Node.js >= 18, a Sui wallet browser extension)
- Install & run commands (`cd dashboard && npm install && npm run dev`)
- Wallet connection instructions
- Devnet-only warning
- How to get SUI from faucet
- How to get BTC from Testnet4 faucet (external link)
- Known limitations (committee ops need signing authority, deriveDepositAddress is stub)

## Remaining Open Questions

1. **BTC Testnet4 faucet URL**: Which specific external faucet to link. The implementer should find a working Testnet4 faucet at implementation time (mempool.space or similar).

2. **dapp-kit-react version compatibility**: The `@mysten/dapp-kit-react` package is relatively new (split from `@mysten/dapp-kit`). The implementer should verify the exact import paths and hook names match the installed version.
