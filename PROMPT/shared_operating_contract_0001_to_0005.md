# Shared Operating Contract For Cards pc_0001 To pc_0005

```text
You are an autonomous coding agent operating on the Taxat Core Engine corpus extracted from `Algorithm.zip`.
Treat the full `Algorithm/` tree as the definitive source algorithm and the `PROMPT/` tree as the execution scaffold.

These first five cards are not product-feature implementation tasks. They are the corpus-intake, inventory,
traceability, vocabulary-normalization, and boundary-extraction foundation for every later phase. Your outputs
must therefore maximize determinism, traceability, and machine-readability. Do not shortcut them into prose-only notes.

Authoritative source order you must honor:
1. `core_engine.md` for the end-to-end execution spine, manifest lifecycle, decision-bundle contract, and boundary pointer.
2. `modules.md` for named procedures and decomposition of the engine into reusable implementation units.
3. `data_model.md`, `state_machines.md`, `invariants_and_gates.md`, `exact_gate_logic_and_decision_tables.md`,
   `compute_parity_and_trust_formulas.md`, `canonical_source_and_evidence_taxonomy.md`,
   `authority_interaction_protocol.md`, and `amendment_and_drift_semantics.md` for canonical object/state/formula/protocol semantics.
4. Specialized contracts for bounded domains, especially `frontend_shell_and_interaction_law.md`,
   `collaboration_workspace_contract.md`, `customer_client_portal_experience_contract.md`,
   `admin_governance_console_architecture.md`, `northbound_api_and_session_contract.md`,
   `retention_and_privacy.md`, `security_and_runtime_hardening_contract.md`,
   `deployment_and_resilience_contract.md`, `replay_and_reproducibility_contract.md`,
   `manifest_and_config_freeze_contract.md`, and `observability_and_audit_contract.md`.
5. Machine enforcement artifacts: every file in `schemas/`, plus `scripts/validate_contracts.py`
   and `tools/forensic_contract_guard.py`. These are enforcement mirrors and closure mechanisms; they do not replace
   canonical prose, but they are mandatory evidence of what the corpus actually locks down.
6. Support and coherence layers: `README.md`, `glossary.md`, `implementation_conventions.md`,
   `architecture_coherence_guardrails.md`, `contract_integrity_requirements.md`,
   `constraint_traceability_register.json`, `constraint_coverage_index.md`, and `test_vectors.md`.
7. Historical closure and anti-regression layers: `AUDIT_FINDINGS.md` and `PATCH_RESOLUTION_INDEX.md`.

Non-negotiable interpretation rules:
- Do not invent domain behavior that contradicts the corpus.
- Do not let README or prompt scaffolding override the canonical engine contracts.
- Preserve the separation between `COMPLIANCE` and `ANALYSIS` execution modes.
- Preserve the distinction between raw source material, evidence items, candidate facts, canonical facts,
  derived values, governance artifacts, and authority acknowledgements.
- Preserve the authority boundary: internal intent, packet formation, and request dispatch are not the same thing as authority acceptance.
- Preserve replay, recovery, continuation, supersession, and branch-selection lineage as explicit governed decisions.
- Preserve customer-safe, customer-visible, internal-only, staff-full, governance-controlled, and authority-facing visibility boundaries.
- Preserve the shell-family vocabulary and the same-object / same-shell law wherever shell or route terms appear.
- Treat `__MACOSX/` folders and `.DS_Store` files as non-canonical archive residue unless the current task explicitly studies archive hygiene.
- Treat absolute paths embedded in `AGENT.md` or `Checklist.md` (for example `/Users/test/Code/taxat_/PROMPT/...`) as environment-local references only.
  Normalize them to repo-relative paths in your derived artifacts; do not let them block execution in a different checkout.
- For tasks 001-005, resolve missing machine-readability and traceability by creating derived analysis artifacts first.
  Do not rewrite canonical algorithm behavior unless a real contradiction or broken reference makes the corpus unusable.

Execution standards:
- Parse the live filesystem rather than trusting any count or example in this prompt.
- Every derived row in a registry, matrix, or manifest must carry explicit traceability:
  `source_file`, `source_heading_or_logical_block`, and a concise rationale.
- Every unresolved issue must be emitted as one of:
  - `GAP_*` for missing machine-readable or architectural detail that needs closure,
  - `CONFLICT_*` for incompatible source statements,
  - `ASSUMPTION_*` for grounded default decisions,
  - `RISK_*` for downstream implementation hazards.
- Prefer deterministic machine-readable outputs (`json`, `jsonl`, `csv`, `yaml`, `md`) over prose-only summaries.
- Sort identifiers, rows, and keys deterministically so reruns produce stable outputs.
- Do not ask follow-up questions. Make grounded assumptions, record them, and continue.
- Use the algorithm corpus as the source of truth, not the reference prompt pack. The separate reference pack is style guidance only and must not leak foreign-domain assumptions into Taxat.

Validation expectations:
- Where a task touches corpus alignment, schema ownership, or enforcement coverage, run:
  - `python3 Algorithm/scripts/validate_contracts.py --self-test`
  - `python3 Algorithm/tools/forensic_contract_guard.py`
- If you generate any browser-viewable HTML atlas, explorer, or review surface, default to Playwright for both development and verification.
  Use semantic/role-based locators, keyboard navigation checks, landmark checks, focus assertions, and trace capture for failures.
- Any optional browser-viewable artifact must follow a restrained premium analysis-console aesthetic:
  dense information hierarchy, generous whitespace, typography-led emphasis, one restrained accent family for status,
  explicit focus states, reduced-motion compliance, and no decorative UI that obscures evidence or state meaning.

Repo expectations:
- Create outputs under `docs/analysis/`, `data/analysis/`, and `tools/analysis/` unless a task explicitly calls for another folder.
- Preserve the card metadata headers in `PROMPT/CARDS/`.
- Keep checklist status in `PROMPT/Checklist.md` only if you are actually executing the task; do not mirror status into derived analysis files.
- Keep generated files repo-relative and portable across machines.

Definition of success for this five-card block:
- A later implementation agent can consume the outputs of tasks 001-005 without rereading the entire corpus just to understand
  file inventory, source precedence, enforcement coverage, vocabulary, or inside-vs-outside system boundary.
```
