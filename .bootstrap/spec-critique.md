---
type: spec-critique
created: 2026-04-01T13:30:00Z
---

## Codex Review (Gate G2)

### Findings (7 items)

1. **[Critical] Core protocol details unknown** — 7 open questions block implementation correctness.
   - **Resolution**: Added Phase 0 (Protocol Verification) that MUST resolve all questions before coding starts.

2. **[High] Upgrade/version handling underspecified** — No explicit compatibility contract.
   - **Resolution**: Added Compatibility Contract section in Release/Versioning. Each SDK release bound to specific Hashi package schema. Version mismatch → HashiParseError. SDK SHOULD warn on version mismatch in getHashiState().

3. **[High] Validator security model too thin** — SDK defers all validation to on-chain.
   - **Resolution**: Added validator preflight checks (bitmap non-empty, signature 48 bytes, no duplicate UTXOs/requestIds, output cardinality checks, witness program length validation).

4. **[High] Query BCS coupling with no compatibility strategy** — BCS layout coupled to specific package version.
   - **Resolution**: Explicit statement: SDK targets one schema version at a time. After incompatible upgrade, SDK must be updated (codegen re-run). CI codegen is-dirty check catches local drift. Consumer-facing mismatch is documented failure mode.

5. **[Medium] Event count 24 vs 25 contradiction** — WithdrawalCancelledEvent creates ambiguity.
   - **Resolution**: Settled at 25 variants. Updated all references from 24 → 25.

6. **[Medium] Acceptance criteria not objective enough** — Snapshot tests don't prove execution correctness.
   - **Resolution**: Added Acceptance Gate Ownership section: unit/snapshot tests are SDK's gate; execution validation is Hashi project's external gate.

7. **[Medium] Scope aggressive for AI implementation** — Should split MVP/deferred.
   - **Not accepted**: User explicitly requested all 6 phases. Phasing provides incremental delivery. Risk is schedule, not architecture.

## Negotiation Round 2

Codex reviewed changes and flagged 5 refinements:
- Compatibility contract should be release-facing (incorporated)
- commitWithdrawalTx needs duplicate-rejection checks (incorporated)
- Update event count references everywhere (done)
- Historical package ID source-of-truth operationally vague (documented as consumer responsibility)
- CI codegen check scope limitation (clarified in spec)

All accepted and incorporated.
