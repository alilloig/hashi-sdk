---
cycle: 5
iteration: 1
status: DONE
timestamp: 2026-04-01T12:00:00Z
---

## What I Implemented

Two new dashboard panels: EventsPanel for live event monitoring and manual event parsing, and BitcoinHelpersPanel for all Bitcoin utility functions from the SDK. Both panels are wired into the app router.

## Contract Criteria Addressed

- Criterion 1 (EventsPanel live subscription tab): Implemented with start/stop buttons, event log displaying type badges (color-coded by category: deposits blue, withdrawals amber, validators green, etc.), and a dropdown filter for all 25 event types. Uses polling via `SuiJsonRpcClient.queryEvents` across all 7 Hashi Move modules (deposit, withdrawal_queue, validator, reconfig, utxo_pool, treasury, proposal_events).

- Criterion 2 (EventsPanel manual parse tab): Tab-based UI with a textarea for pasting raw event JSON. Supports both JSON-RPC format (bcs as base58 string, `type` field) and SuiClientTypes.Event format (bcs as array, `eventType` field). Parses via `parseHashiEventStrict` and displays the result with type badge or error.

- Criterion 3 (Event log capped at 500): `MAX_EVENT_LOG = 500` constant. After each poll, the combined log is sliced to keep only the most recent 500 entries (oldest dropped first).

- Criterion 4 (Manual reconnect button): When a poll fails, status transitions to `disconnected` and the timer is stopped. A "Reconnect" button (orange) appears that restarts polling from the last cursor position.

- Criterion 5 (BitcoinHelpersPanel with 4 panels): Four sub-panels using OperationPanel: `encodeBitcoinAddress` (hex witness program + version + network selector), `decodeBitcoinAddress` (address input, displays hex program, version, network), `satsToBtc` (integer input, displays formatted BTC), `btcToSats` (decimal input, displays satoshis).

- Criterion 6 (deriveDepositAddress info note): A styled info box at the bottom of BitcoinHelpersPanel explains the function is not yet implemented (pending Q-DERIVE algorithm) and currently throws.

- Criterion 7 (No wallet for Bitcoin helpers): BitcoinHelpersPanel uses only pure SDK functions from `hashi-sdk/bitcoin`. No wallet hooks or context used.

- Criterion 8 (Routes wired in App.tsx): Added `#events` and `#bitcoin-helpers` route handling in `renderContent()`, with corresponding imports. The sidebar already had these entries from prior cycles.

- Criterion 9 (TypeScript compiles clean): `npx tsc --noEmit` exits 0. Vite build also succeeds.

## Tests Written and Results

- `npx tsc --noEmit` (from dashboard/) -> exits 0, no errors
- `npx vite build` (from dashboard/) -> builds successfully (584 modules, 690 KB output)

## Files Changed

- `dashboard/src/panels/EventsPanel.tsx` -- new file: EventsPanel with live subscription (polling) and manual parse tabs
- `dashboard/src/panels/BitcoinHelpersPanel.tsx` -- new file: Bitcoin helper panels for encode/decode address and sats/btc conversion
- `dashboard/src/App.tsx` -- added imports and route handlers for #events and #bitcoin-helpers

## Commits

- `074f75d` -- feat: add Events panel and Bitcoin Helpers panel to dashboard

## Design Decisions

- **Polling over WebSocket**: The `@mysten/sui` v2 `SuiJsonRpcClient` does not expose a `subscribeEvent` method. Used polling with `queryEvents` at 5-second intervals instead. Polls all 7 Hashi Move modules in parallel and deduplicates by event ID.

- **Base58 BCS conversion**: JSON-RPC events return BCS as base58-encoded strings, but the SDK parser expects `Uint8Array`. Used `@scure/base`'s `base58.decode()` to bridge the format gap.

- **Event type badges**: Color-coded by event category (deposits=blue, withdrawals=amber, validators=green, reconfig=purple, UTXO=indigo, treasury=red, governance=teal, upgrade=gray) for quick visual identification.
