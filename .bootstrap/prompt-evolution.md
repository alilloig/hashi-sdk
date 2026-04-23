# Prompt Evolution Log

## v1 (Claude)
Straightforward planning prompt listing all SDK operations by category with basic architecture, acceptance criteria, and quality constraints. Good breadth but lacked enforceability on coverage, execution model precision, and form strategy.

## Codex Critique of v1
Key issues identified:
1. No enforcement mechanism for "every operation" — needs coverage matrix requirement
2. Operation invocation modes were conflated (transaction builder vs wallet-execute not distinguished)
3. Missing repo-level integration details (workspace wiring, config isolation)
4. UX underspecified for a developer tool (navigation, parameter entry, transaction preview)
5. No acceptance criteria or phased delivery plan
6. Missing form generation strategy guidance

## v2 (Codex)
Expanded significantly: forced SDK enumeration, required coverage matrix, separated execution modes, added architecture/UX/component sections, explicit acceptance criteria, phased delivery plan, constrained output format.

## Claude's Synthesis Notes
- Kept Codex's coverage matrix and SDK-as-source-of-truth requirements
- Kept Codex's expanded spec section requirements
- Simplified v2's verbosity — Codex's version was ~2x longer than needed
- Retained v1's concrete operation listing (Codex's v2 was more abstract)
- Added specific devnet configuration values from project knowledge
- Kept shared component names from v1 as concrete anchors

## v3 (Claude — Final, with Codex patches)
Applied 7 specific patches from Codex convergence review:
1. Source-of-truth rule: SDK exports override enumerated list
2. Refined invocation modes (6 types including build-only vs build+sign+execute)
3. Navigation: allow routing choice with justification
4. Added form strategy section (schema-driven vs hand-authored tradeoff)
5. Added shared infrastructure boundaries requirement
6. Strengthened README deliverable (install, run, wallet prereqs, known limitations)
7. Added coverage verification acceptance criterion (#13)

## Codex Convergence Assessment
Not fully converged on first check. Provided 7 specific patches. After applying patches, Codex indicated it would call it converged.
