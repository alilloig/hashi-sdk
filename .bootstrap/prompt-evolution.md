## v1 (Claude)
See `.bootstrap/prompt-v1.md` — comprehensive but loose on behavioral contracts, missing non-goals, ambiguous type mappings.

## Codex Critique of v1
Key issues: no explicit document sections, no RFC-style language, query returns/pagination/error semantics underspecified, ambiguous VecMap representation, no non-goals, no acceptance criteria for testing, missing runtime compatibility.

## v2 (Codex)
Added: 17 mandatory document sections, RFC-style MUST/SHOULD/MAY, forced decisions on VecMap/pagination/error handling, non-goals, assumptions section, phased milestones. Lost some concrete function signatures from v1.

## Claude's Synthesis Notes (v3)
Kept from v1: concrete function signatures with parameter types, specific PTB construction patterns, code examples. Incorporated from v2: all structural improvements, RFC language, non-goals, per-query return shapes, error semantics.

## Codex Critique of v3
10 remaining weaknesses: builder return type ambiguity, pagination contract not standardized, query error semantics overspecified, event parser underspecified operationally, normalization rules too broad, validation timing undefined, missing browser compatibility, no test thresholds, abort mapping potentially unrealistic, thin documentation section.

## Final Version (v3 + Codex feedback)
All 10 issues addressed: canonical builder type, shared PaginatedResult<T>, refined error semantics (null vs throw), strict parser mode, explicit normalization rules, validation timing policy, Node+browser runtime, ≥80% branch coverage for high-risk, realistic abort mapping, future extension points section.

## Codex Convergence Assessment
CONVERGED. "The prompt now fixes ambiguous contracts, forces concrete decisions in correctness-sensitive areas, constrains output quality, and reduces room for hand-wavy output."
