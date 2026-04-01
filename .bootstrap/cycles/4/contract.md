---
cycle: 4
name: Query Layer
---

## Scope
Implement all 10 query methods for reading on-chain Hashi state via Sui RPC. All reads use getObject/getDynamicFieldObject/getDynamicFields since Hashi has no public view functions.

## Completion Criteria

1. [ ] `src/queries/` directory exists with query functions
2. [ ] `getHashiState()` fetches and deserializes the root Hashi shared object
3. [ ] `getDepositRequest(id)` fetches from deposit queue Bag, returns DepositRequest | null
4. [ ] `listDepositRequests({ cursor?, limit? })` returns PaginatedResult<DepositRequest>
5. [ ] `getWithdrawalRequest(id)` fetches from withdrawal queue Bag, returns WithdrawalRequest | null
6. [ ] `listPendingWithdrawals({ cursor?, limit? })` returns PaginatedResult<PendingWithdrawal>
7. [ ] `getCommittee(epoch?)` fetches from committees Bag, returns Committee | null
8. [ ] `getMemberInfo(validatorAddress)` fetches from members Bag, returns MemberInfo | null
9. [ ] `getConfig()` fetches and parses config, returns typed Config object
10. [ ] `getUtxo(txid, vout)` fetches from active UTXOs Bag, returns Utxo | null
11. [ ] All queries accept a SuiClient parameter (or use one from HashiConfig context)
12. [ ] Not-found returns null (singular getters), invalid input/decode/RPC throws typed errors
13. [ ] PaginatedResult<T> uses { items, nextCursor, hasNextPage } shape
14. [ ] Unit tests with mock RPC responses pass for all queries
15. [ ] `npx tsc --noEmit` exits 0
16. [ ] `npx vitest run` exits 0 with all tests passing

## Verification Commands
- `npx tsc --noEmit` — verifies criterion 15
- `npx vitest run` — verifies criteria 14, 16

## Context from Previous Cycles
Cycle 1: Foundation with codegen BCS types, HashiConfig, errors, domain types. Cycle 2: User transaction builders. Cycle 3: Bitcoin helpers + event system (25-variant parser). The domain types (HashiState, DepositRequest, WithdrawalRequest, Committee, etc.) are already defined in src/types/. The BCS types for deserialization are in src/contracts/ and re-exported via src/types/bcs.ts.
