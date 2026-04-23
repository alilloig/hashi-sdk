---
type: intent
created: 2026-04-01T18:01:00Z
mode: existing
---

## Original Prompt
Build a dashboard for the SDK that will allow you to interact with Hashi on devnet, include the full functionality like giving access to Sui devnet faucet and the BTC testnet faucet as well. The goal is not to have a nice UI, we have hashi frontend for that, but rather a tool that will showcase all the operations that the hashi SDK is allowing you to do. When the job is done update the readme with a quick start guide that will allow anyone cloning the repo to run locally the dashboard and check the utility of the SDK.

## User Answers

**Tech stack**: React + Vite with @mysten/dapp-kit-react for wallet connection. Same ecosystem as hashi-frontend.

**Scope**: Everything possible — all user operations (deposit, withdraw, cancel) + all queries (state, deposits, withdrawals, committee, UTXO) + all events (25 variants) + bitcoin helpers + validator/committee/governance operations (will fail without committee keys but demonstrates the full API surface) + faucets.

**BTC Testnet4 faucet**: Link to external faucet site. No API integration needed.

**Quality bar**: Functional prototype. Works and demonstrates the SDK, minimal error handling. Ship fast.

## Derived Intent

Build a **developer dashboard** web app inside the hashi-sdk repo (e.g., `dashboard/` directory) that serves as an **interactive API explorer** for every operation the SDK exposes. This is NOT a user-facing product — it's a developer tool / SDK showcase.

### Key Characteristics
- **React + Vite** app with `@mysten/dapp-kit-react` for Sui wallet connection
- **Consumes hashi-sdk locally** (workspace link, not published package)
- **Targets Sui devnet** with hardcoded devnet config (package ID, Hashi object ID from `.env.devnet`)
- **Every SDK operation gets a panel/form** — even validator/governance ops that require committee keys
- **Sui devnet faucet** button (uses `@mysten/sui` requestSuiFromFaucet or similar)
- **BTC Testnet4 faucet** as external link
- **Functional prototype quality** — works, shows results, minimal polish
- **README update** with quick start guide for running the dashboard locally
