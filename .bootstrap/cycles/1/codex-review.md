---
codex_verdict: "Partial pass with material issues"
quality_rating: 3/5
---

## Codex Findings

1. **PaginatedResult uses `data` instead of `items`** — spec says `items`. FIXING.
2. **MemberInfo missing fields** — only has validatorAddress + weight, missing operator, keys, endpoint. FIXING.
3. **Config missing upgradeCap** — FIXING.
4. **HashiState too flat** — needs full nested shape per spec. FIXING.
5. **DepositRequest.suiTxDigest should be string not Uint8Array** — FIXING.
6. **WithdrawalRequest.btcBalance should be btc** — FIXING.
7. **Config validates but doesn't normalize** — should accept and normalize non-prefixed, uppercase. FIXING.
8. **Only 3/7 open questions resolved** — contract only required 3 minimum. Others deferred to relevant cycles.
9. **Abort codes may be string-based for #[error] attrs** — pragmatic numeric table is acceptable foundation; will update when Q-ERROR-FORMAT resolved.
10. **Subpath exports not in package.json yet** — intentionally deferred to Cycle 6.

## Resolution
Fixing items 1-7 directly. Items 8-10 acceptable as-is for foundation cycle.
