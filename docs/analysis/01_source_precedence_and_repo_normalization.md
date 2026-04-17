# Source Precedence And Repo Normalization

## Source Precedence

| Order | Layer | Source files | Source heading or logical block | Rationale |
| --- | --- | --- | --- | --- |
| 1 | Core execution spine | `Algorithm/core_engine.md` | `PROMPT/shared_operating_contract_0001_to_0005.md -> Authoritative source order item 1` | Primary end-to-end execution, manifest lifecycle, decision bundle contract, and system boundary pointer. |
| 2 | Named module decomposition | `Algorithm/modules.md` | `PROMPT/shared_operating_contract_0001_to_0005.md -> Authoritative source order item 2` | Canonical reusable procedure decomposition for implementation planning. |
| 3 | Canonical object, state, formula, and protocol semantics | `Algorithm/data_model.md`, `Algorithm/state_machines.md`, `Algorithm/invariants_and_gates.md`, `Algorithm/exact_gate_logic_and_decision_tables.md`, `Algorithm/compute_parity_and_trust_formulas.md`, `Algorithm/canonical_source_and_evidence_taxonomy.md`, `Algorithm/authority_interaction_protocol.md`, `Algorithm/amendment_and_drift_semantics.md` | `PROMPT/shared_operating_contract_0001_to_0005.md -> Authoritative source order item 3` | Governs core domain entities, transitions, gates, trust/parity math, evidence precedence, authority envelopes, and amendment semantics. |
| 4 | Specialized bounded-domain contracts | `Algorithm/frontend_shell_and_interaction_law.md`, `Algorithm/collaboration_workspace_contract.md`, `Algorithm/customer_client_portal_experience_contract.md`, `Algorithm/admin_governance_console_architecture.md`, `Algorithm/northbound_api_and_session_contract.md`, `Algorithm/retention_and_privacy.md`, `Algorithm/security_and_runtime_hardening_contract.md`, `Algorithm/deployment_and_resilience_contract.md`, `Algorithm/replay_and_reproducibility_contract.md`, `Algorithm/manifest_and_config_freeze_contract.md`, `Algorithm/observability_and_audit_contract.md` | `PROMPT/shared_operating_contract_0001_to_0005.md -> Authoritative source order item 4` | Adds bounded-domain behavior without overriding the core engine or canonical object contracts. |
| 5 | Machine enforcement artifacts | `Algorithm/schemas/*.schema.json`, `Algorithm/scripts/validate_contracts.py`, `Algorithm/tools/forensic_contract_guard.py` | `PROMPT/shared_operating_contract_0001_to_0005.md -> Authoritative source order item 5`; `Algorithm/README.md -> Validation` | Enforcement mirrors and closure gates that prove schema/document/forensic coherence. |
| 6 | Support and coherence docs | `Algorithm/README.md`, `Algorithm/glossary.md`, `Algorithm/implementation_conventions.md`, `Algorithm/architecture_coherence_guardrails.md`, `Algorithm/contract_integrity_requirements.md`, `Algorithm/constraint_traceability_register.json`, `Algorithm/constraint_coverage_index.md`, `Algorithm/test_vectors.md` | `PROMPT/shared_operating_contract_0001_to_0005.md -> Authoritative source order item 6` | Support docs must stay synchronized with authoritative contracts and validator coverage. |
| 7 | Historical closure docs | `Algorithm/AUDIT_FINDINGS.md`, `Algorithm/PATCH_RESOLUTION_INDEX.md` | `PROMPT/shared_operating_contract_0001_to_0005.md -> Authoritative source order item 7`; `Algorithm/README.md -> Reference document roles` | Historical defect closure evidence; authoritative for forensic lineage, not for overriding live domain behavior. |
| 8 | Prompt execution scaffold | `PROMPT/AGENT.md`, `PROMPT/Checklist.md`, `PROMPT/CARDS/*.md`, `PROMPT/shared_operating_contract_*.md` | `PROMPT/AGENT.md -> Source Of Truth`; `PROMPT/CARDS/pc_0001.md -> Agent Instructions` | Governs task claim protocol and execution order; it never overrides the Algorithm corpus on domain behavior. |

## Command Working-Directory Assumptions

- The README-documented validator commands are repo-root relative and assume the current working directory is the repository root.
- In this checkout, dependency-ready execution requires `.venv` activation or direct use of `.venv/bin/python3`.

## Prompt Path Normalization

- Absolute path occurrences discovered: `15`
- Files with absolute paths: `3`
- Placeholder occurrences: `2`
- Unresolved occurrences: `0`

| File | Line | Absolute path | Normalized repo-relative path | Resolution |
| --- | --- | --- | --- | --- |
| `PROMPT/AGENT.md` | `5` | `/Users/test/Code/taxat_/PROMPT/Checklist.md` | `PROMPT/Checklist.md` | `resolved` |
| `PROMPT/AGENT.md` | `11` | `/Users/test/Code/taxat_/PROMPT/AGENT.md` | `PROMPT/AGENT.md` | `resolved` |
| `PROMPT/AGENT.md` | `12` | `/Users/test/Code/taxat_/PROMPT/Checklist.md` | `PROMPT/Checklist.md` | `resolved` |
| `PROMPT/AGENT.md` | `13` | `/Users/test/Code/taxat_/PROMPT/CARDS/pc_####.md` | `PROMPT/CARDS/pc_####.md` | `placeholder_pattern` |
| `PROMPT/AGENT.md` | `24` | `/Users/test/Code/taxat_/PROMPT/Checklist.md` | `PROMPT/Checklist.md` | `resolved` |
| `PROMPT/AGENT.md` | `25` | `/Users/test/Code/taxat_/PROMPT/Checklist.md` | `PROMPT/Checklist.md` | `resolved` |
| `PROMPT/AGENT.md` | `26` | `/Users/test/Code/taxat_/PROMPT/CARDS/` | `PROMPT/CARDS/` | `resolved` |
| `PROMPT/AGENT.md` | `32` | `/Users/test/Code/taxat_/PROMPT/Checklist.md` | `PROMPT/Checklist.md` | `resolved` |
| `PROMPT/AGENT.md` | `43` | `/Users/test/Code/taxat_/PROMPT/Checklist.md` | `PROMPT/Checklist.md` | `resolved` |
| `PROMPT/AGENT.md` | `53` | `/Users/test/Code/taxat_/PROMPT/Checklist.md` | `PROMPT/Checklist.md` | `resolved` |
| `PROMPT/AGENT.md` | `55` | `/Users/test/Code/taxat_/PROMPT/CARDS/` | `PROMPT/CARDS/` | `resolved` |
| `PROMPT/AGENT.md` | `57` | `/Users/test/Code/taxat_/PROMPT/Checklist.md` | `PROMPT/Checklist.md` | `resolved` |
| `PROMPT/Checklist.md` | `4` | `/Users/test/Code/taxat_/PROMPT/AGENT.md` | `PROMPT/AGENT.md` | `resolved` |
| `PROMPT/Checklist.md` | `14` | `/Users/test/Code/taxat_/PROMPT/AGENT.md` | `PROMPT/AGENT.md` | `resolved` |
| `PROMPT/shared_operating_contract_0001_to_0005.md` | `42` | `/Users/test/Code/taxat_/PROMPT/...` | `PROMPT/...` | `placeholder_pattern` |
