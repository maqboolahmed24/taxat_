# Constraint Coverage Index

This index is the human-readable summary of the live constraint traceability model.

The machine-checkable source of truth is [`constraint_traceability_register.json`](constraint_traceability_register.json). It binds each active named constraint to:

- authoritative contract locations
- machine-enforcement paths
- downstream read surfaces and specialized contracts
- example and scenario coverage

Historical cleanup notes do not belong in this file. Historical gaps, numbered findings, and patch-era closure notes live only in:

- `AUDIT_FINDINGS.md`
- `PATCH_RESOLUTION_INDEX.md`
- `contract_integrity_requirements.md`

This file therefore answers "what live named constraints are authoritative now?" rather than
"which stale defect note used to describe the gap?".

## Critical Constraint Family Coverage Map

| Constraint Family | Authoritative Homes | Prompt Stages | Enforcement Surfaces |
| --- | --- | --- | --- |
| Foundation spine, route stability, and visibility | `frontend_shell_and_interaction_law.md`, `data_model.md`, `contract_integrity_requirements.md`, `architecture_coherence_guardrails.md` | `SYS-00`, `SYS-01`, `SYS-03`, `SYS-04` | `validate_contracts.py`, `forensic_contract_guard.py`, route read-model schemas |
| Manifest, lineage, gates, and replay | `manifest_and_config_freeze_contract.md`, `replay_and_reproducibility_contract.md`, `exact_gate_logic_and_decision_tables.md`, `state_machines.md` | `BE-06`, `BE-07`, `BE-09`, `BE-21`, `BE-22`, `SYS-01`, `SYS-02`, `SYS-04` | manifest, decision, replay, and receipt schemas plus validator/guard checks |
| Intake, facts, evidence, provenance, and twin-view | `canonical_source_and_evidence_taxonomy.md`, `provenance_graph_semantics.md`, `defensible_filing_graph_contract.md`, `twin_view_contract.md` | `BE-08`, `BE-10`, `BE-22`, `SYS-02`, `SYS-04` | intake, graph, proof, and twin schemas plus validator/guard checks |
| Authority, filing, amendments, workflow, and remediation | `authority_interaction_protocol.md`, `authority_calculation_contract.md`, `amendment_and_drift_semantics.md`, `collaboration_workspace_contract.md`, `retention_error_and_observability_contract.md` | `BE-11..BE-17`, `BE-23`, `SYS-01`, `SYS-02`, `SYS-04` | authority, filing, amendment, workflow, and remediation schemas plus validator/guard checks |
| Portal, governance, staff/operator, and interaction layers | `customer_client_portal_experience_contract.md`, `admin_governance_console_architecture.md`, `low_noise_experience_contract.md`, `macos_native_operator_workspace_blueprint.md` | `FE-01..FE-33`, `SYS-01`, `SYS-03`, `SYS-04` | route/workspace schemas, validator coherence checks, and forensic guard layer checks |
| Platform operations, observability, release, and acceptance closure | `observability_and_audit_contract.md`, `deployment_and_resilience_contract.md`, `verification_and_release_gates.md`, `README.md`, `test_vectors.md` | `BE-18..BE-25`, `SYS-02`, `SYS-03`, `SYS-04` | observability/release schemas, validator self-test, and forensic guard suite |

Every critical constraint family SHALL therefore keep all four of: an authoritative prose home, a
prompt-stage execution path, machine-enforced validation, and a guardrail path that fails closed if
the coverage drifts.

## Active Named Constraint Register

These rows summarize the current live obligations from `constraint_traceability_register.json`.
The validator and forensic guard parse this active named constraint register and fail closed if row
ids, names, or traced path sets drift from the machine register.

| ID | Active constraint | Architectural rationale | Authoritative boundary | Machine enforcement | Downstream and example propagation |
| --- | --- | --- | --- | --- | --- |
| `CC-01` | Shared shell and route-stability vocabulary stays authoritative across specialized surfaces | Same-object continuity and stale-view safety break if route contracts invent parallel shell vocabulary. | `frontend_shell_and_interaction_law.md`, `data_model.md`, `architecture_coherence_guardrails.md` | `scripts/validate_contracts.py`, `tools/forensic_contract_guard.py` | `schemas/low_noise_experience_frame.schema.json`, `schemas/workspace_snapshot.schema.json`, `schemas/client_portal_workspace.schema.json`, `test_vectors.md` |
| `CC-02` | Interaction-layer and customer-safe projection boundaries remain shared instead of route-local | Selector, restore, masking, and export posture must stay server-authored across portal, operator, and governance surfaces. | `frontend_shell_and_interaction_law.md`, `customer_client_portal_experience_contract.md`, `admin_governance_console_architecture.md` | `scripts/validate_contracts.py`, `tools/forensic_contract_guard.py` | `schemas/portal_interaction_layer.schema.json`, `schemas/operator_interaction_layer.schema.json`, `schemas/governance_interaction_layer.schema.json`, `schemas/customer_safe_projection_contract.schema.json`, `test_vectors.md` |
| `CC-03` | Manifest freeze, continuation lineage, gate tape, and replay basis remain one immutable execution spine | Replay and continuation are indefensible if the sealed basis must be reconstructed from adjacent artifacts. | `manifest_and_config_freeze_contract.md`, `replay_and_reproducibility_contract.md`, `state_machines.md` | `scripts/validate_contracts.py`, `tools/forensic_contract_guard.py` | `schemas/run_manifest.schema.json`, `schemas/replay_attestation.schema.json`, `schemas/preseal_gate_evaluation_contract.schema.json`, `schemas/manifest_branch_decision_contract.schema.json`, `test_vectors.md` |
| `CC-04` | Evidence, proof, twin comparison, and late-data invalidation keep one explicit lineage and closure vocabulary | Proof closure, delta precedence, and stale dependency lineage must be serialized rather than inferred. | `provenance_graph_semantics.md`, `twin_view_contract.md`, `late_data_policy_contract.md` | `scripts/validate_contracts.py`, `tools/forensic_contract_guard.py` | `schemas/proof_bundle.schema.json`, `schemas/evidence_graph.schema.json`, `schemas/twin_delta_arc.schema.json`, `schemas/late_data_monitor_result.schema.json`, `test_vectors.md` |
| `CC-05` | Authority ingress, truth boundaries, workflow actionability, and amendment posture stay bound to explicit contracts | Authority mutation and amendment readiness are unsafe when request identity or stale-view posture is rebuilt from partial projections. | `authority_interaction_protocol.md`, `amendment_and_drift_semantics.md`, `collaboration_workspace_contract.md` | `scripts/validate_contracts.py`, `tools/forensic_contract_guard.py` | `schemas/authority_request_identity_contract.schema.json`, `schemas/authority_ingress_proof_contract.schema.json`, `schemas/authority_layer_boundary_contract.schema.json`, `schemas/command_truth_boundary_contract.schema.json`, `test_vectors.md` |
| `CC-06` | Governance mutation risk, nightly publication, and externalization rules reuse one reviewed basis instead of transport-local heuristics | Preview, publication, and handoff flows must preserve one reviewed risk or delivery basis across governance, nightly, and export boundaries. | `admin_governance_console_architecture.md`, `nightly_autopilot_contract.md`, `authority_interaction_protocol.md` | `scripts/validate_contracts.py`, `tools/forensic_contract_guard.py` | `schemas/governance_mutation_hazard_contract.schema.json`, `schemas/nightly_batch_identity_contract.schema.json`, `schemas/operator_digest_derivation_contract.schema.json`, `schemas/externalization_governance_contract.schema.json`, `test_vectors.md` |
| `CC-07` | Schema evolution, release identity, recovery governance, and state transitions remain closed, typed, and replay-safe | Release and recovery posture drift when reader windows, backfill, checkpoint reopen, and lifecycle legality stop being typed contracts. | `deployment_and_resilience_contract.md`, `verification_and_release_gates.md`, `recovery_tier_checkpoint_and_fail_forward_governance_contract.md` | `scripts/validate_contracts.py`, `tools/forensic_contract_guard.py` | `schemas/schema_reader_window_contract.schema.json`, `schemas/backfill_execution_contract.schema.json`, `schemas/release_candidate_identity_contract.schema.json`, `schemas/recovery_governance_contract.schema.json`, `schemas/state_transition_contract.schema.json`, `test_vectors.md` |
| `CC-08` | Constraint coverage stays live-only, machine-checkable, and distinct from forensic history | Coverage becomes misleading when stale defect notes and live obligations share the same layer. | `constraint_traceability_register.json`, `constraint_coverage_index.md`, `architecture_coherence_guardrails.md`, `implementation_conventions.md`, `README.md` | `scripts/validate_contracts.py`, `tools/forensic_contract_guard.py` | `AUDIT_FINDINGS.md`, `PATCH_RESOLUTION_INDEX.md`, `test_vectors.md` |
| `CC-09` | Invariant failures stay typed, durable, and stage-bound instead of assertion-only | Scope, reuse, gate, filing, replay, and authority invariants become legally ambiguous if they can crash, partially mutate state, or normalize into a nearby posture instead of emitting one typed fail-closed terminal outcome. | `invariant_enforcement_and_fail_closed_contract.md`, `core_engine.md`, `error_model_and_remediation_model.md` | `scripts/validate_contracts.py`, `tools/forensic_contract_guard.py` | `schemas/invariant_enforcement_contract.schema.json`, `schemas/run_manifest.schema.json`, `schemas/error_record.schema.json`, `schemas/audit_event.schema.json`, `test_vectors.md` |

## Historical Cleanup Notes Boundary

Historical cleanup notes SHALL stay in the forensic closure documents, not in the live coverage
index. In particular:

- `AUDIT_FINDINGS.md` owns the historical numbered findings and their closure status.
- `PATCH_RESOLUTION_INDEX.md` owns the mechanism-level repair map and guard inventory.
- `contract_integrity_requirements.md` owns the standing ambiguity classes the architecture SHALL
  continue to keep closed.

If a rule cannot be mapped through `constraint_traceability_register.json` to authoritative
contracts, machine enforcement, downstream surfaces, and example coverage, then it is not a live
constraint yet and SHALL NOT be presented as one in this index.
