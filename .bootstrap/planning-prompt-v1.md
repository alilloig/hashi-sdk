# Planning Prompt v1

You are a senior architect generating a project specification for a **developer dashboard** that showcases every operation in the hashi-sdk TypeScript SDK.

## Context

hashi-sdk is a TypeScript SDK for the Hashi Bitcoin Bridge on Sui. It provides signing-agnostic transaction builders, on-chain queries, event parsing, and Bitcoin helpers. The SDK has 30+ transaction builders, 9 query methods, 25 event types, and Bitcoin address/amount utilities.

The dashboard lives inside the SDK repo at `dashboard/` and consumes the SDK via local workspace link. It targets Sui devnet.

## What to Build

A **React + Vite** web app with `@mysten/dapp-kit-react` that serves as an interactive API explorer. Every SDK operation gets its own panel/form. The dashboard is a developer tool, not a polished product.

## Tech Stack
- React 18+ with Vite
- @mysten/dapp-kit-react for Sui wallet connection
- @tanstack/react-query (peer dep of dapp-kit)
- Local hashi-sdk via workspace link
- TypeScript throughout

## SDK Operations to Expose

### Faucets Panel
- Sui devnet faucet button (request SUI from devnet faucet API)
- BTC Testnet4 faucet as external link to a known faucet

### User Operations Panel
- **Create Deposit Request**: Form with sender, txid, vout, amount, recipient fields
- **Request Withdrawal**: Form with BTC address and amount
- **Cancel Withdrawal**: Form with withdrawal request ID

### Queries Panel
- **Bridge State**: Button to fetch and display HashiState
- **Config**: Button to fetch and display bridge Config
- **Deposit Requests**: Paginated list + single lookup by ID
- **Withdrawal Requests**: Paginated list + single lookup by ID
- **Committee**: Current committee info + member lookup
- **UTXO Lookup**: Search by txid + vout

### Events Panel
- Subscribe to Hashi events via Sui RPC
- Display parsed events with type discrimination
- Filter by event type

### Bitcoin Helpers Panel
- Encode Bitcoin address (witness program + version + network → address)
- Decode Bitcoin address (address → witness program + version + network)
- Sats ↔ BTC conversion

### Validator Operations Panel
- Register validator
- Update public key, operator address, endpoint URL, TLS key, encryption key

### Committee Operations Panel
- Confirm deposit (committee signature fields)
- Approve/commit/sign/confirm withdrawal operations
- Delete expired deposits and UTXOs

### Reconfiguration Panel
- Start reconfig
- End reconfig (committee signature)

### Certificate Panel
- Submit DKG cert, rotation cert, nonce cert
- Destroy all certs

### Governance Panel
- Create proposals (config update, enable/disable version, upgrade)
- Vote / remove vote
- Execute proposals
- Delete expired proposals
- Finalize upgrade

## Architecture Constraints
- Dashboard is a separate Vite app in `dashboard/` subdirectory
- Uses local SDK via `"hashi-sdk": "file:.."` or workspace link in package.json
- Hardcoded Sui devnet config (known package ID and Hashi object ID)
- All transaction forms show the Transaction object inspection before signing
- Results display raw JSON for transparency
- Error display shows the full HashiError hierarchy info

## Devnet Configuration
- Hashi Package ID: `0xe87f0c85488c5c442612103a08e5df93d2f190cdb0456b667f5257be506aefc7`
- Hashi Object ID: `0x3b8013407b5caaceb9dbfce56c45987c8e778c2302fc712bd52db093f5997c04`
- Sui RPC: `https://fullnode.devnet.sui.io`
- Bitcoin Network: Testnet4 (tb1p prefix)

## Quality Bar
- Functional prototype — works and demonstrates SDK
- Minimal styling (utility CSS or very basic CSS, NOT a design system)
- Error states shown but not polished
- No tests required for the dashboard itself
- README update with quick start guide

## Non-Goals
- Pretty UI (hashi-frontend handles that)
- Mobile responsive design
- Authentication/authorization
- Persistent state or database
- Deployment configuration
