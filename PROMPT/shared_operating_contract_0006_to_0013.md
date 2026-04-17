# Shared Operating Contract For Cards pc_0006 To pc_0013

```text
You are an autonomous coding agent operating on the Taxat Core Engine corpus extracted from `Algorithm.zip`.
Treat the full `Algorithm/` tree as the definitive source algorithm and the `PROMPT/` tree as the execution scaffold.

These eight cards convert the source corpus from “authoritative narrative” into execution-grade maps for:
- the end-to-end engine run spine,
- the named procedure graph,
- canonical entities, artifacts, and schema ownership,
- state machines and transition laws,
- gate order and override semantics,
- formula requirements,
- authority interaction and reconciliation,
- and frontend shell / route / interaction-layer architecture.

This block is still foundation work. Do not jump ahead into product feature implementation that contradicts later roadmap sequencing.
Your job is to extract, normalize, model, and where necessary prototype the canonical behavior so later implementation cards can build without semantic drift.

Authoritative source order you must honor:
1. `core_engine.md` for the numbered `RUN_ENGINE(...)` phase spine, output contract, manifest lifecycle intent, and boundary specification.
2. `modules.md` for named procedure contracts and the decomposition of `RUN_ENGINE(...)` into concrete callable units.
3. `data_model.md`, `state_machines.md`, `invariants_and_gates.md`, `exact_gate_logic_and_decision_tables.md`,
   `compute_parity_and_trust_formulas.md`, `actor_and_authority_model.md`,
   `authority_interaction_protocol.md`, and `frontend_shell_and_interaction_law.md`
   for canonical semantic rules governing objects, states, gates, formulas, authority, and shell behavior.
4. Specialized bounded-domain contracts that tighten the shared law, especially
   `manifest_and_config_freeze_contract.md`, `replay_and_reproducibility_contract.md`,
   `late_data_authority_correction_and_replay_propagation_contract.md`,
   `observability_and_audit_contract.md`, `low_noise_experience_contract.md`,
   `customer_client_portal_experience_contract.md`, `collaboration_workspace_contract.md`,
   `admin_governance_console_architecture.md`,
   `cross_shell_design_token_and_interaction_layer_foundation_contract.md`,
   `semantic_selector_and_accessibility_contract.md`,
   `semantic_selector_and_accessibility_regression_pack_contract.md`,
   `shell_continuity_fuzzing_and_recovery_contract.md`,
   `focus_restoration_and_return_target_harness_contract.md`,
   `cross_device_continuity_and_restoration_contract.md`,
   `stream_resume_and_catch_up_ordering_contract.md`, and
   `native_cache_hydration_purge_and_rebase_contract.md`.
5. Machine enforcement artifacts in `schemas/`, plus `scripts/validate_contracts.py` and `tools/forensic_contract_guard.py`.
6. Coherence layers: `README.md`, `glossary.md`, `implementation_conventions.md`,
   `architecture_coherence_guardrails.md`, `contract_integrity_requirements.md`,
   `constraint_traceability_register.json`, `constraint_coverage_index.md`,
   `AUDIT_FINDINGS.md`, `PATCH_RESOLUTION_INDEX.md`, and `test_vectors.md`.
7. Prior derived outputs from cards `pc_0001` to `pc_0005`, if present, as convenience inputs only.
   They may accelerate extraction, but they never outrank canonical prose, schemas, or validators.

Non-negotiable interpretation rules:
- Preserve the distinction between `raw_requested_scope[]` and executable `runtime_scope[]`.
  Audit may narrate the former; downstream branching, collection, compute, filing, transport, and reconciliation must use the latter.
- Preserve the separation between `COMPLIANCE` and `ANALYSIS` execution modes.
  Analysis affordances must not silently widen compliance behavior.
- Preserve the distinction between mutable operational entities, append-only artifacts, control contracts, read models, and projections.
- Preserve the distinction between decision-side confidence and projection-adjusted confidence.
  Masking or retention-limited projection must not back-propagate into authoritative compute unless the corpus says it does.
- Preserve the distinction between internal intent, packet construction, authority transport, authority acknowledgement, and authority-of-record truth.
- Preserve partition isolation, masking isolation, replay determinism, lineage-safe continuation, and fail-closed behavior.
- Preserve same-object / same-shell law, dominant-question law, one-promoted-support-region law, and route continuity law.
- Treat browser- or native-viewable atlas surfaces created in this block as contract visualizers and executable requirement harnesses, not as permission to redesign domain behavior.
- Treat `__MACOSX/` folders, `.DS_Store`, and stale absolute paths in `AGENT.md` / `Checklist.md` as packaging or environment residue, not domain truth.
- Never let support docs or prompt scaffolding override the core algorithm.

Engineering standards:
- Determinism is mandatory. Re-runs over the same corpus must produce byte-stable or deliberately sorted outputs.
- Use typed parsing, explicit schemas, and stable identifiers. Do not rely on brittle one-off regexes where structured extraction is possible.
- Emit every unresolved issue as `GAP_*`, `CONFLICT_*`, `ASSUMPTION_*`, or `RISK_*`.
- Do not silently “fix” contradictory source behavior. Record the contradiction and isolate the least-assumptive fallback.
- Backend-oriented extraction tools must follow industry best practices:
  input validation, no unsafe eval, no shell injection, no network dependency, no hidden mutable globals,
  streaming or bounded-memory processing where practical, explicit error handling, and unit-testable pure transforms.
- Treat cryptographic hashes, request identity, idempotency keys, and exact-decimal money handling as correctness boundaries, not convenience details.
- Prefer repo-local scripts under `tools/analysis/` and machine-readable outputs under `data/analysis/`.
- Every derived row must carry `source_file`, `source_heading_or_logical_block`, and a concise rationale.

Validation expectations:
- For any task that cross-links schemas, contracts, or validators, run:
  - `python3 Algorithm/scripts/validate_contracts.py --self-test`
  - `python3 Algorithm/tools/forensic_contract_guard.py`
- If you create a browser-viewable atlas, explorer, or prototype, Playwright is mandatory for both development and verification.
  Use semantic selectors and role-based locators first, reserve `data-testid` for stable domain anchors,
  rely on auto-waiting instead of sleeps, and retain traces/screenshots for failures.
- Browser-visible artifacts must follow a restrained premium requirement-atlas aesthetic:
  typography-led hierarchy, near-monochrome structural surfaces, one restrained accent family,
  explicit state colors for success/notice/block only, generous whitespace, high legibility,
  and motion limited to causal state changes. No decorative loops, parallax, or “AI dashboard” clutter.
- Reduced-motion behavior is mandatory. Replace spatial or multi-axis motion with opacity, highlight, or color-state transitions.
- Accessibility is part of the contract, not post-facto polish:
  landmark structure, heading hierarchy, keyboard-only flow, visible focus, and stable return targets are required.

Repo expectations:
- Use `docs/analysis/`, `data/analysis/`, `tools/analysis/`, `diagrams/analysis/`, and `prototypes/analysis/`
  unless a card explicitly justifies another location.
- Preserve existing card metadata headers and keep task status only in `Checklist.md`.
- Do not rename card IDs or change checklist ordering.
- Keep all output paths repo-relative and portable across machines.

Definition of success for this eight-card block:
- A later implementation agent can consume the outputs of cards `pc_0006` to `pc_0013` and begin building engine services,
  authority workflows, stateful projections, and shell surfaces without rereading the entire corpus just to reconstruct
  execution order, module topology, state laws, gate order, formulas, authority semantics, or shell/route behavior.
```
