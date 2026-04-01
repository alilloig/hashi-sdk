# Cycle Plan

## Cycle 1: Foundation (Scaffold + Codegen + Config + Types + Errors + Protocol Verification)
- **Scope**: Initialize repository (package.json, tsconfig, vitest, eslint). Set up @mysten/codegen with Hashi Move package and run initial codegen. Implement HashiConfig with presets. Implement HashiError hierarchy with abort code mapping. Define all domain type interfaces. Set up build pipeline (esbuild + tsc for dual ESM/CJS). Resolve all 7 open questions by inspecting reference codebases (Q-DERIVE, Q-TXID-BYTE-ORDER, Q-BTC-COIN-TYPE-PKG, Q-ERROR-FORMAT, Q-CODEGEN-ENTRY-FNS, Q-BUILD-SCRIPTS, Q-WITHDRAWAL-CANCELLED-EVENT). Create initial test fixtures.
- **Dependencies**: None (foundation cycle)
- **Complexity**: Moderate
- **Deliverables**: 
  - Working package scaffold that builds (dist/esm/ + dist/cjs/)
  - Codegen output in src/contracts/
  - HashiConfig with mainnet/testnet presets + override + validation
  - Complete error hierarchy with abort code mapping
  - All domain type interfaces in src/types/
  - BCS re-export layer
  - Protocol verification findings documented
  - Unit tests for config and errors
  - BCS round-trip tests for at least 5 representative types
  - Initial test fixtures (BCS payloads, event envelopes)
- **Suggested model**: opus

## Cycle 2: User-Facing Transaction Builders
- **Scope**: Implement createDepositRequest (5-step PTB), requestWithdrawal (CoinWithBalance), cancelWithdrawal (transferObjects refund). Implement shared-object argument helpers. Add input validation. Note: requestWithdrawal may accept raw bytes for Bitcoin address initially if Bitcoin helpers aren't ready (cycle 3 adds the string address path).
- **Dependencies**: Cycle 1
- **Complexity**: Moderate
- **Deliverables**:
  - 3 user-facing transaction builder functions
  - Shared object helpers (Hashi, Clock)
  - Input validation (address format, byte lengths, bigint bounds)
  - Snapshot tests for all 3 PTB structures
  - Validation error tests
- **Suggested model**: opus

## Cycle 3: Bitcoin Helpers + Event System
- **Scope**: Implement Bitcoin address encode/decode (bech32/bech32m), deposit address derivation (secp256k1 via @noble/curves), satsToBtc/btcToSats. Define HashiEvent discriminated union (25 variants). Implement parseHashiEvent (best-effort) and parseHashiEventStrict. Implement generic type param extraction. Implement multi-version package matching. Update requestWithdrawal to accept human-readable Bitcoin addresses.
- **Dependencies**: Cycle 1 (types, errors)
- **Complexity**: Moderate
- **Deliverables**:
  - Bitcoin address encode/decode with BIP-173/BIP-350 test vectors
  - Deposit address derivation (secp256k1)
  - Amount conversion helpers
  - HashiEvent type with 25 variants
  - parseHashiEvent + parseHashiEventStrict functions
  - Generic type parameter extraction
  - Multi-version package matching
  - Event parser tests for all 25 variants
  - Multi-version parsing tests (two package IDs)
  - requestWithdrawal updated to accept bech32/bech32m strings
- **Suggested model**: opus

## Cycle 4: Query Layer
- **Scope**: Implement all 10 query methods: getHashiState, getDepositRequest, listDepositRequests, getWithdrawalRequest, listPendingWithdrawals, getCommittee, getMemberInfo, getConfig, getUtxo, getEpochCerts. Implement PaginatedResult<T> wrapper. Implement BCS deserialization for all queried types. Implement dynamic field key encoding.
- **Dependencies**: Cycle 1 (types, config, errors)
- **Complexity**: Complex
- **Deliverables**:
  - All 10 query functions
  - PaginatedResult<T> type
  - Dynamic field key encoding for struct keys (UtxoId, TobKey)
  - Unit tests with mock RPC responses
  - Pagination tests (first page, continuation, empty)
  - Not-found → null tests
  - Decode failure → throw tests
- **Suggested model**: opus

## Cycle 5: Validator/Committee Transaction Builders
- **Scope**: Implement all validator/committee operations: confirmDeposit (two-call), deleteExpiredDeposits (batched), approveWithdrawalRequests (batched), commitWithdrawalTx (nested BCS + Random), signWithdrawal, confirmWithdrawal, deleteExpiredSpentUtxo, register, 5 validator updates, startReconfig, endReconfig, 4 cert submissions, full governance lifecycle (4 propose + vote/removeVote/deleteExpired + 4 execute + finalizeUpgrade).
- **Dependencies**: Cycle 2 (shared-object helpers, validation patterns), Cycle 3 (Bitcoin address validation for outputs)
- **Complexity**: Complex
- **Deliverables**:
  - All remaining transaction builder functions (~25+ methods)
  - Manual BCS encoding helpers for UtxoId and OutputUtxo (double-encoding)
  - Validator preflight checks (bitmap, signature length, cardinality, deduplication)
  - Governance proposal type parameter resolution
  - Snapshot tests for all PTB structures
  - BCS round-trip tests for UtxoId/OutputUtxo double-encoding
- **Suggested model**: opus

## Cycle 6: Client Facade + Documentation + Polish
- **Scope**: Implement HashiClient class composing all subsystems. Wire up SuiClient injection and HashiConfig DI. Configure subpath exports in package.json. Write README (quickstart, user flow, validator flow, signing guidance, upgrade notes, compatibility contract). Add TSDoc to all public functions. Integration test scaffolding. Final coverage audit (≥80% branch for high-risk modules). Set up @changesets/cli. Final build verification.
- **Dependencies**: Cycles 1-5 (everything)
- **Complexity**: Moderate
- **Deliverables**:
  - HashiClient class
  - Subpath exports working (., ./client, ./transactions, ./queries, ./events, ./bitcoin, ./types)
  - README with all required sections
  - TSDoc on all public exports
  - Integration test scaffolding (gated behind env flag)
  - ≥80% branch coverage for high-risk modules
  - @changesets/cli configured
  - Clean build with dual ESM/CJS output
- **Suggested model**: opus
