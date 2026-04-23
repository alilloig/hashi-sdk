---
cycle: 2
name: Queries Panel
---

## Scope
Install `@tanstack/react-query` (gap from Cycle 1). Implement all 9 query operation panels using the shared OperationPanel + JsonViewer components. Include paginated list queries with cursor controls. Wire the #queries hash route in App.tsx.

## Completion Criteria

1. [ ] `@tanstack/react-query` is in package.json dependencies and installed
2. [ ] A `QueryClientProvider` wraps the app (or is integrated with dapp-kit's existing provider)
3. [ ] The #queries hash route renders a QueriesPanel component with all 9 query sub-panels
4. [ ] `getHashiState` panel: button that fetches and displays full bridge state as JSON
5. [ ] `getConfig` panel: button that fetches and displays bridge config as JSON
6. [ ] `getDepositRequest` panel: text input for request ID, button to fetch, displays result or "Not found"
7. [ ] `listDepositRequests` panel: button to fetch first page, next/prev pagination controls, displays list as JSON
8. [ ] `getWithdrawalRequest` panel: text input for request ID, button to fetch, displays result or "Not found"
9. [ ] `listPendingWithdrawals` panel: button to fetch first page, next/prev pagination controls, displays list as JSON
10. [ ] `getCommittee` panel: optional epoch input, button to fetch current committee, displays result as JSON
11. [ ] `getMemberInfo` panel: text input for validator address, button to fetch, displays result or "Not found"
12. [ ] `getUtxo` panel: text inputs for txid and vout, button to fetch, displays result or "Not found"
13. [ ] All query panels show loading state while fetching
14. [ ] All query panels show errors via ErrorDisplay when queries fail
15. [ ] TypeScript compiles with no errors (`npx tsc --noEmit` exits 0)

## Verification Commands
- `cd /Users/alilloig/workspace/hashi-sdk/dashboard && npx tsc --noEmit` — verifies criteria 15
- `npm run dev` and navigate to #queries — verifies criteria 3-14 visually

## Context from Previous Cycles
Cycle 1 built the app shell with sidebar, header, wallet connect, HashiClient provider, and shared components (OperationPanel, JsonViewer, ErrorDisplay). The HashiClient is available via `useHashiClient()` hook. Query functions are imported from `hashi-sdk/queries`.
