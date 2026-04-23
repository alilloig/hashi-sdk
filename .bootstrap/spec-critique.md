# Spec Critique & Negotiation Log

## Codex Review (Gate G2)

Codex identified 12 issues (2 critical, 4 high, 4 medium, 2 low):

### Accepted & Addressed
1. **Coverage numbers inconsistency** (Critical) — Fixed: matrix header now says 34, summary table corrected to 36 total (34 exposed + 2 excluded).
2. **"ALL" vs exclusions contradiction** (High) — Added "Scope Definition" section explicitly defining what "all operations" means and excluding non-interactive exports.
3. **Open questions too vague** (High) — Resolved all 6 open questions with concrete decisions in new "Resolved Design Decisions" section.
4. **Form strategy underspecified** (High) — Decided: hand-authored forms with shared input components.
5. **Event subscription undefined** (Medium) — Decided: manual reconnect, 500-entry cap, no auto-reconnect.
6. **Faucet ambiguous** (Medium) — Decided: `@mysten/sui/faucet` API with link fallback.
7. **Routing undecided** (Medium) — Decided: single-page with hash-based deep links.
8. **Config isolation vague** (Medium) — Decided: single `config.ts` module, no scattered constants.
9. **README underspecified** (Low) — Defined required sections.
10. **Shared component lifecycle** (Low) — Addressed implicitly via form strategy decision.

### Partially Accepted
11. **Acceptance criteria not testable enough** (High) — The spec already has per-section acceptance criteria. For a prototype, these are sufficient. Adding formal test contracts would contradict the "no tests in v1" user decision.

### Rejected
12. **No automated tests** (Critical per Codex) — The user explicitly chose "functional prototype" quality bar. Manual verification via the acceptance criteria is sufficient for v1. The dashboard IS the test harness for the SDK.
13. **Security posture** (High per Codex) — The dashboard is a local dev tool, not a public app. Network is pinned to devnet by hardcoded config. Transaction preview before signing is already specified. No secrets are handled. Additional threat modeling is out of scope for a prototype.
