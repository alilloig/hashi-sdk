---
cycle: 1
name: Foundation & App Shell
---

## Scope
Scaffold a Vite + React + TypeScript dashboard app in `dashboard/`. Set up package.json with local SDK workspace link, dapp-kit-react, react-query. Create config module with devnet constants. Build app shell with sidebar navigation, wallet connect header, and HashiClient provider context. Create shared OperationPanel, JsonViewer, and ErrorDisplay components. Implement faucets panel (SUI devnet faucet button + BTC external link).

## Completion Criteria

1. [ ] `dashboard/` directory exists with a working Vite + React + TypeScript project
2. [ ] `package.json` has `"hashi-sdk": "file:.."` as a dependency and the project installs without errors (`cd dashboard && npm install` exits 0)
3. [ ] `npm run dev` in `dashboard/` starts a dev server that serves a page at localhost without errors
4. [ ] TypeScript compiles with no errors (`cd dashboard && npx tsc --noEmit` exits 0)
5. [ ] A `config.ts` module exports devnet constants: packageId, hashiObjectId, rpcUrl, faucetUrl, btcFaucetLink — all in one file
6. [ ] The app renders a sidebar with category headings for all operation groups: Faucets, Queries, User Operations, Validator Management, Committee: Deposits, Committee: Withdrawals, Reconfiguration, Certificate Operations, Governance, Events, Bitcoin Helpers
7. [ ] The header contains a working "Connect Wallet" button using dapp-kit-react that connects to Sui devnet
8. [ ] After wallet connection, the header displays the connected wallet address
9. [ ] A HashiClient provider (React context) is initialized with devnet config and available to child components
10. [ ] The SUI faucet panel has a button that requests SUI from the devnet faucet and shows success/error feedback
11. [ ] The BTC faucet panel has a link that opens an external Testnet4 faucet in a new tab
12. [ ] Shared `OperationPanel` component exists and renders a title, description slot, form slot, and result area
13. [ ] Shared `JsonViewer` component exists and renders a JSON object as formatted text
14. [ ] Shared `ErrorDisplay` component exists and renders an error with class name and message

## Verification Commands
- `cd /Users/alilloig/workspace/hashi-sdk/dashboard && npm install` — verifies criteria 2
- `cd /Users/alilloig/workspace/hashi-sdk/dashboard && npx tsc --noEmit` — verifies criteria 4
- `cd /Users/alilloig/workspace/hashi-sdk/dashboard && npm run dev &` then check localhost — verifies criteria 3
- Visual inspection of running app — verifies criteria 6, 7, 8, 10, 11, 12, 13, 14

## Context from Previous Cycles
None (foundation cycle)
