# Patch Resolution Index

This index records the integrity defects closed by the current patch set and the mechanism that now
keeps each issue from drifting back.

## Forensic Finding Closure Register

This register is the mechanism-level mirror of the forensic ledger in `AUDIT_FINDINGS.md`. It MUST
cover every numbered audit finding exactly once, and it SHALL remain synchronized with the audit
ledger before the corpus can claim forensic or acceptance closure.

| Finding Range | Status | Owning Prompt Stages | Authoritative Corpus | Resolution Mechanism Families |
| --- | --- | --- | --- | --- |
| AF-01..AF-19 | RESOLVED | SYS-00, BE-06, BE-07, BE-09, BE-21, BE-22, SYS-01 | `contract_integrity_requirements.md` Manifest, lineage, and gate integrity; `manifest_and_config_freeze_contract.md`; `exact_gate_logic_and_decision_tables.md`; `northbound_api_and_session_contract.md`; `data_model.md` | Manifest, decision, and authority coherence; Validator and toolchain cohesion |
| AF-20..AF-40 | RESOLVED | SYS-00, BE-08, BE-09, BE-10, BE-22 | `contract_integrity_requirements.md` Decision artifacts, evidence, and data-model integrity; `canonical_source_and_evidence_taxonomy.md`; `provenance_graph_semantics.md`; `defensible_filing_graph_contract.md`; `data_model.md` | Provenance-path integrity; Trust and set-wrapper integrity; Proof-graph integrity |
| AF-41..AF-59 | RESOLVED | SYS-00, BE-09, BE-13, BE-16, BE-22 | `contract_integrity_requirements.md` Compute, trust, and amendment logic integrity; `compute_parity_and_trust_formulas.md`; `exact_gate_logic_and_decision_tables.md`; `amendment_and_drift_semantics.md`; `state_machines.md` | Manifest, decision, and authority coherence; Documentation repairs |
| AF-60..AF-62 | RESOLVED | SYS-00, BE-14, BE-15, BE-23 | `contract_integrity_requirements.md` Authority interaction integrity; `authority_interaction_protocol.md`; `schemas/authority_request_envelope.schema.json`; `schemas/authority_response_envelope.schema.json`; `schemas/authority_interaction_record.schema.json` | Manifest, decision, and authority coherence |
| AF-63..AF-80 | RESOLVED | SYS-00, FE-19, FE-25, FE-26, FE-32, FE-33, SYS-01 | `contract_integrity_requirements.md` Experience and presentation contract integrity; `low_noise_experience_contract.md`; `frontend_shell_and_interaction_law.md`; `UIUX_DESIGN_SKILL.md`; `schemas/experience_delta.schema.json` | Calm-shell integrity; Documentation repairs; Identifier and routing hardening |

## Provenance-path integrity

1. Duplicate `node_refs[]` were still admissible in `ProvenancePath`.
   Resolution: `schemas/provenance_path.schema.json` now requires unique node refs.
2. Duplicate `edge_refs[]` were still admissible in `ProvenancePath`.
   Resolution: `schemas/provenance_path.schema.json` now requires unique edge refs.
3. `ranking_basis[]` could be empty even though path ranking is mandatory.
   Resolution: `schemas/provenance_path.schema.json` now requires at least one ranking-basis item.
4. `ranking_basis[]` could repeat the same basis object.
   Resolution: `schemas/provenance_path.schema.json` now rejects duplicate ranking-basis entries.
5. `hop_count` could disagree with `edge_refs[]`.
   Resolution: `scripts/validate_contracts.py` now checks `hop_count = len(edge_refs)`.
6. The node/edge traversal shape could be impossible (`len(node_refs) != len(edge_refs) + 1`).
   Resolution: `scripts/validate_contracts.py` now enforces deterministic path shape.
7. `anchor_ref` could point outside the declared path.
   Resolution: `scripts/validate_contracts.py` now requires `anchor_ref in node_refs[]`.
8. `decisive_edge_refs[]` could reference edges outside the path.
   Resolution: `scripts/validate_contracts.py` now requires `decisive_edge_refs[] ⊆ edge_refs[]`.

## Calm-shell integrity

9. Non-calm `DecisionSummaryState` payloads could omit visible reasons.
   Resolution: `schemas/decision_summary_state.schema.json` now requires at least one visible reason whenever `attention_state != CALM`.
10. Calm `DecisionSummaryState` payloads could still show warning posture.
    Resolution: `schemas/decision_summary_state.schema.json` now forces `visible_warning_count = 0` for `attention_state = CALM`.
11. Calm `DecisionSummaryState` payloads could still emit visible reasons.
    Resolution: `schemas/decision_summary_state.schema.json` now forces `visible_reasons[]` to be empty for `attention_state = CALM`.
12. `ExperienceDelta` top-level shell fields could drift from `attention_policy`.
    Resolution: `scripts/validate_contracts.py` now checks exact mirror equality for attention, object, actionability, action, no-safe-action reason, notice count, detail entry points, and suggested detail surface.
13. `affected_surface_codes[]` could drift from the actual `surface_updates[]`.
    Resolution: `scripts/validate_contracts.py` now checks set equality between the two fields.
14. Visible summary reasons could drift from machine-readable summary reason codes.
    Resolution: `scripts/validate_contracts.py` now requires every `visible_reasons[].reason_code` to appear in `machine_reason_codes[]`.

## Trust and set-wrapper integrity

15. `TrustSummary.dominant_reason_code` could diverge from `reason_codes[]`.
    Resolution: `scripts/validate_contracts.py` now enforces membership.
16. `SourceRecordSet.items[]` could contain duplicate logical `source_record_id` values.
    Resolution: `scripts/validate_contracts.py` now enforces logical-id uniqueness.
17. `EvidenceItemSet.items[]` could contain duplicate logical `evidence_item_id` values.
    Resolution: `scripts/validate_contracts.py` now enforces logical-id uniqueness.
18. `CandidateFactSet.items[]` could contain duplicate logical `candidate_fact_id` values.
    Resolution: `scripts/validate_contracts.py` now enforces logical-id uniqueness.
19. `CanonicalFactSet.items[]` could contain duplicate logical `canonical_fact_id` values.
    Resolution: `scripts/validate_contracts.py` now enforces logical-id uniqueness.
20. `ConflictSet.items[]` could contain duplicate logical `conflict_id` values.
    Resolution: `scripts/validate_contracts.py` now enforces logical-id uniqueness.
21. `ConflictSet.open_conflict_ids[]` and `open_conflict_count` could drift from the actual unresolved conflicts.
    Resolution: `scripts/validate_contracts.py` now recomputes and verifies both.
22. `ConflictSet.blocking_conflict_ids[]`, `blocking_conflict_count`, and `resolution_frontier` could drift from the actual blocking conflicts.
    Resolution: `scripts/validate_contracts.py` now recomputes and verifies all three.

## Documentation repairs

23. `AMENDMENT_GATE` decision prose still relied on ambiguous free-text boolean groupings.
    Resolution: `exact_gate_logic_and_decision_tables.md` now defines named predicates and parenthesized decision conditions.
24. Provenance-path shape rules were implicit rather than explicit.
    Resolution: `provenance_graph_semantics.md` now defines path-order, hop-count, anchor, and decisive-edge integrity rules directly in the contract.
25. Low-noise shell mirror fields were described across multiple contracts but not restated in the low-noise contract itself.
    Resolution: `low_noise_experience_contract.md` now makes the mirror set explicit alongside the deterministic rendering rules.

## Twin-view integrity

26. `TwinReadinessState` could emit no-safe-action reasons while still claiming a safe action existed.
    Resolution: `schemas/twin_readiness_state.schema.json` and `scripts/validate_contracts.py` now force `no_safe_action_reason_codes[]` to be empty unless `safe_action_state = NO_SAFE_ACTION`.
27. `TwinMismatchSummary.total_subject_count` could drift from the matched/mismatch totals.
    Resolution: `scripts/validate_contracts.py` now checks `total_subject_count = matched_count + mismatch_count`.
28. `TwinMismatchSummary.mismatch_count` could drift from the severity buckets.
    Resolution: `scripts/validate_contracts.py` now checks the blocking/material/review/informational bucket sum.
29. `TwinMismatchSummary.highest_materiality_class` could contradict the emitted counts.
    Resolution: `scripts/validate_contracts.py` now derives and verifies the highest materiality class from the mismatch buckets.
30. `TwinMismatchSummary.suppressed_match_count` could exceed the number of matched subjects.
    Resolution: `scripts/validate_contracts.py` now enforces `suppressed_match_count <= matched_count`.
31. `TwinPortfolioSummary` bucket counts could diverge from `total_twin_count`.
    Resolution: `scripts/validate_contracts.py` now recomputes and verifies the readiness-bucket total.
32. Non-empty twin portfolios could still serialize no top-ranked twins.
    Resolution: `schemas/twin_portfolio_summary.schema.json` and `scripts/validate_contracts.py` now require non-empty `top_twin_refs[]` when `total_twin_count > 0`.
33. Non-empty twin portfolios could still expose a zero attention rank.
    Resolution: `schemas/twin_portfolio_summary.schema.json` and `scripts/validate_contracts.py` now require a positive `highest_attention_rank` when twins are present.
34. Reconciliation state could exceed its own automatic retry budget.
    Resolution: `scripts/validate_contracts.py` now enforces `auto_attempt_count <= max_auto_attempts`.
35. `blocking_mismatch_refs[]` could name mismatches outside the reconciliation target set.
    Resolution: `scripts/validate_contracts.py` now enforces `blocking_mismatch_refs[] ⊆ target_mismatch_refs[]`.
36. Twin timelines could serialize inverted windows or orphan primary anchors.
    Resolution: `scripts/validate_contracts.py` now checks window ordering, anchor presence, and anchor membership in persisted lane events.
37. `TwinDeltaArc.priority_rank` could drift from the ranking formula defined by the contract.
    Resolution: `scripts/validate_contracts.py` now recomputes and verifies the exact twin ranking formula.
38. Blocking twin deltas could omit blocking reason codes.
    Resolution: `scripts/validate_contracts.py` now requires at least one `blocking_reason_codes[]` entry for blocking delta arcs.

## Proof-graph integrity

39. `ProofBundle.primary_path_ref` could point outside `decisive_path_refs[]`.
    Resolution: `scripts/validate_contracts.py` now requires the primary path to appear in the decisive path set.
40. `ProofBundle.rejected_path_refs[]` could overlap the decisive path set.
    Resolution: `scripts/validate_contracts.py` now enforces disjoint decisive and rejected path sets.
41. `PARTIALLY_SUPPORTED` proof bundles could serialize contradictory admissibility or closure posture.
    Resolution: `schemas/proof_bundle.schema.json` and `scripts/validate_contracts.py` now force `admissibility_state = LIMITED` and `closure_state = CLOSED`.
42. `UNSUPPORTED` proof bundles could still claim decisive paths.
    Resolution: `schemas/proof_bundle.schema.json` and `scripts/validate_contracts.py` now force open, pathless unsupported bundles.
43. `CONTRADICTED` proof bundles could remain closed even with unresolved contradiction posture.
    Resolution: `schemas/proof_bundle.schema.json` and `scripts/validate_contracts.py` now force `closure_state = OPEN`.
44. Proof-bundle explanation status could contradict the actual render refs.
    Resolution: `scripts/validate_contracts.py` now verifies `AVAILABLE`, `LIMITED`, and `FAILED` against the presence of operator/reviewer/filing render refs.
45. `EvidenceGraph.target_assessments[]` could not expose replayability or explanation status, making integrity counts non-derivable.
    Resolution: `schemas/evidence_graph.schema.json`, `provenance_graph_semantics.md`, `defensible_filing_graph_contract.md`, and `data_model.md` now require `replayable` and `explanation_status` on each target assessment.
46. `EvidenceGraph.path_ranking_basis[]` could repeat entries.
    Resolution: `schemas/evidence_graph.schema.json` now treats ranking-basis entries as a canonical set.
47. `EvidenceGraph.target_assessments[]` could duplicate the same logical target.
    Resolution: `scripts/validate_contracts.py` now enforces logical uniqueness by `target_ref`.
48. `EvidenceGraph.integrity_summary` counts could drift from the target assessments they summarize.
    Resolution: `scripts/validate_contracts.py` now recomputes unsupported, contradicted, stale, open, replay-failure, missing-proof-bundle, and explanation-failure counts from filing-critical target assessments.
49. `EvidenceGraph.quality` summary counts could drift from integrity posture.
    Resolution: `scripts/validate_contracts.py` now checks the persisted quality counts against the filing-critical target assessments.
50. `EvidenceGraph.quality.proof_bundle_coverage` could drift from the filing-critical proof-bundle population.
    Resolution: `scripts/validate_contracts.py` now recomputes and verifies proof-bundle coverage.

## Validator and toolchain cohesion

51. The repo carried two competing validation entrypoints.
    Resolution: the duplicate root validator was retired so `Algorithm/scripts/validate_contracts.py` is authoritative.
52. The authoritative validator omitted the forensic guardrail suite.
    Resolution: `Algorithm/scripts/validate_contracts.py` now runs `Algorithm/tools/forensic_contract_guard.py` checks in-process.
53. The authoritative validator did not detect contradictory array defaults such as `default: []` combined with `minItems > 0`.
    Resolution: `Algorithm/scripts/validate_contracts.py` now walks every schema and rejects default/minItems contradictions.
54. The authoritative validator did not detect stale calm-shell vocabulary drift in docs and schemas.
    Resolution: `Algorithm/scripts/validate_contracts.py` now checks `core_engine.md`, `modules.md`, `data_model.md`, `README.md`, and `experience_delta.schema.json` for stale or conflicting shell terminology.
55. Validator setup instructions under-specified the runtime dependencies.
    Resolution: `Algorithm/requirements-dev.txt` now pins `referencing` directly because the validator imports it explicitly.
56. README validation guidance pointed to inconsistent commands and under-described the actual validation surface.
    Resolution: `Algorithm/README.md` now points only to `python3 Algorithm/scripts/validate_contracts.py --self-test` and states that it includes the forensic guardrail suite.

## Identifier and routing hardening

57. `ClientUploadSession.upload_session_id` accepted empty strings for a required transfer identity key.
    Resolution: `schemas/client_upload_session.schema.json` now requires a non-empty session id.
58. `ClientUploadSession.tenant_id`, `client_id`, `request_id`, and `request_version_ref` accepted empty strings, allowing uploads to detach from their governing request lineage.
    Resolution: `schemas/client_upload_session.schema.json` now requires non-empty request-binding identifiers.
59. `ClientUploadSession.manifest_id`, `resume_token_ref`, and `attached_document_ref` accepted `""` when present, which could masquerade as valid resumability or attachment state.
    Resolution: `schemas/client_upload_session.schema.json` now requires non-empty optional refs and repeats that rule in the `RESUMABLE` and `ATTACHED` state guards.
60. `ClientUploadSession.initiated_by`, `storage_ref`, `filename`, and `media_type` accepted empty strings, weakening auditability and downstream file-routing semantics.
    Resolution: `schemas/client_upload_session.schema.json` now rejects empty actor, storage, filename, and media-type values.
61. `ClientUploadSession.outcome_reason_code` could be an empty string even in failure and replacement flows.
    Resolution: `schemas/client_upload_session.schema.json` now requires non-empty outcome reasons globally and in corrective-action branches.
62. `ExperienceDelta` top-level routing keys such as `manifest_id`, `shell_route_key`, `cause_ref`, `focus_anchor_ref`, and `shell_stability_token` accepted empty strings.
    Resolution: `schemas/experience_delta.schema.json` now requires non-empty routing and reconnect identifiers whenever present.
63. `ExperienceDelta` reason and action references such as `primary_object_ref`, `primary_action_code`, `no_safe_action_reason_code`, `blocked_action_codes[]`, and `affected_object_refs[]` accepted empty strings.
    Resolution: `schemas/experience_delta.schema.json` now rejects empty object refs, action codes, reason codes, and affected-object entries.
64. `ExperienceDelta.attentionPolicy` mirrored routing fields could drift into empty-string values even while the top-level delta looked structurally valid.
    Resolution: `schemas/experience_delta.schema.json` now hardens `policy_version`, mirrored refs/codes, and `ranking_basis[]`.
65. `ExperienceDelta.reasonItem` and `actionToken` payloads could render blank reason labels or action codes inside low-noise shell updates.
    Resolution: `schemas/experience_delta.schema.json` now requires non-empty reason codes, reason labels, action codes, action labels, and ownership labels.
66. `ExperienceDelta.actionStripPayload` could serialize blank waiting or blocking copy in `WAITING` and `NO_SAFE_ACTION` states.
    Resolution: `schemas/experience_delta.schema.json` now requires non-empty `waiting_on_label` and `blocking_reason` text in the relevant action-strip branches.
67. `ExperienceDelta.experienceFrame` mirrored identity and routing fields were weaker than the live delta contract.
    Resolution: `schemas/experience_delta.schema.json` now applies the same non-empty identity and routing constraints to the embedded frame snapshot.
68. The forensic guardrail suite did not lock these upload-session and experience-delta constraints in place.
    Resolution: `tools/forensic_contract_guard.py` now asserts the non-empty identifier, reason-code, and action-routing invariants for both contracts.

## Manifest, decision, and authority coherence

69. `DecisionBundle.decision_reason_codes[]` could drift outside the flattened persisted `reason_codes[]`.
    Resolution: `scripts/validate_contracts.py` now enforces `decision_reason_codes[] ⊆ reason_codes[]`.
70. `DecisionBundle.primary_action_code` could diverge from the legal next-action set or also appear in blocked actions.
    Resolution: `scripts/validate_contracts.py` now requires the primary action to appear in `next_action_codes[]` and remain absent from `blocked_action_codes[]`.
71. `GateDecisionRecord.dominant_reason_code` could drift outside `reason_codes[]`.
    Resolution: `scripts/validate_contracts.py` now enforces dominant-reason membership for gate records as well as trust summaries.
72. `RunManifest` top-level lineage mirrors could drift from `continuation_set{...}`.
    Resolution: `scripts/validate_contracts.py` now requires exact equality for root/parent/continuation/replay/supersession lineage and generation fields.
73. Embedded `config_freeze`, `input_freeze`, and `hash_set` objects could drift from their parent manifest identity and frozen hash surface.
    Resolution: `scripts/validate_contracts.py` now verifies manifest-id, schema-bundle, feature-flag, access-binding, config-freeze, config-surface, and input-set mirrors across the envelope.
74. Blocked manifests that had already crossed freeze could still drop `config_freeze`, `input_freeze`, or `hash_set`.
    Resolution: `schemas/run_manifest.schema.json` and `scripts/validate_contracts.py` now require the frozen basis whenever `frozen_at` is present.
75. Manifest lifecycle timestamps could appear on illegal states or move backward in time.
    Resolution: `scripts/validate_contracts.py`, `manifest_and_config_freeze_contract.md`, and `data_model.md` now enforce lawful timestamp/state combinations and monotonic ordering.
76. Embedded `gating_decisions[]` could be out of canonical order, bound to the wrong manifest, or carry a different effective scope.
    Resolution: `scripts/validate_contracts.py`, `manifest_and_config_freeze_contract.md`, and `data_model.md` now require manifest-bound ordered gate chains whose `effective_scope` matches the authorized manifest scope.
77. `AMENDMENT_GATE`, `FILING_GATE`, or `SUBMISSION_GATE` could appear on manifests whose requested scope did not authorize those stages.
    Resolution: `scripts/validate_contracts.py` now checks scope-conditional gate legality against `requested_scope[]`.
78. Sample and bundle validation did not actually enforce JSON Schema `format` constraints such as `date-time`.
    Resolution: `scripts/validate_contracts.py` now instantiates sample validation with `Draft202012Validator.FORMAT_CHECKER`.
79. `AuthorityRequestEnvelope.canonical_query` could drift from the stable serialization of `query_params{}`.
    Resolution: `scripts/validate_contracts.py` now recomputes the canonical query string with lexicographically sorted keys and ordered repeated values.
80. `AuthorityResponseEnvelope` could claim a missing body while still persisting a non-sentinel body hash, or the reverse.
    Resolution: `schemas/authority_response_envelope.schema.json`, `scripts/validate_contracts.py`, and `authority_interaction_protocol.md` now force `<NONE>` exactly when no body ref exists.
81. `AuthorityInteractionRecord` could serialize abandonment with an active response or reconciliation deadline.
    Resolution: `schemas/authority_interaction_record.schema.json`, `scripts/validate_contracts.py`, `authority_interaction_protocol.md`, and `state_machines.md` now require `ABANDONED` exchanges to stay pre-response and deadline-free.
82. `AuthorityInteractionRecord.last_status_at` could predate `created_at`.
    Resolution: `scripts/validate_contracts.py` now enforces monotonic interaction timestamps.
83. `AuthorityInteractionRecord` could expose `reconciliation_deadline_at` before any response was captured.
    Resolution: `schemas/authority_interaction_record.schema.json` and `scripts/validate_contracts.py` now keep the deadline null through queued, dispatch-ready, in-flight, and abandoned states.

## Audit and governance lineage hardening

69. `ApiCommandReceipt.manifest_id`, `work_item_id`, and `governance_target_ref` accepted empty strings when present, weakening target-scope binding.
    Resolution: `schemas/api_command_receipt.schema.json` now rejects empty scope refs across manifest, work-item, and governance targets.
70. `ApiCommandReceipt.duplicate_of_receipt_id` could be an empty string in duplicate-replay state.
    Resolution: `schemas/api_command_receipt.schema.json` now requires non-empty duplicate lineage refs.
71. `ApiCommandReceipt.latest_projection_ref`, `semantic_action_id`, and `result_ref` accepted empty strings even though they anchor replay-safe side effects.
    Resolution: `schemas/api_command_receipt.schema.json` now requires non-empty projection, action, and result refs whenever present.
72. `AuditEvent.client_id`, `manifest_id`, `actor_ref`, and `service_ref` accepted empty strings, allowing audit rows with syntactically present but unusable lineage.
    Resolution: `schemas/audit_event.schema.json` now rejects empty correlation identifiers when present.
73. `AuditEvent.object_refs[]` and `reason_codes[]` accepted empty-string entries.
    Resolution: `schemas/audit_event.schema.json` now requires non-empty object refs and reason codes.
74. `AuditEvent.prev_event_hash` and `signature_ref` accepted empty strings, weakening chain-of-custody and signature lineage.
    Resolution: `schemas/audit_event.schema.json` now requires non-empty hash and signature refs whenever present.
75. Continuation-related `AuditEvent.correlation_context` refs could be blank as long as some other lineage ref satisfied the branch.
    Resolution: `schemas/audit_event.schema.json` now rejects empty `root_manifest_id`, `parent_manifest_id`, `continuation_of_manifest_id`, and `replay_of_manifest_id` values whenever present.
76. `AuditInvestigationFrame.frame_id` and `tenant_id` accepted empty strings in a governance console frame that depends on stable anchoring.
    Resolution: `schemas/audit_investigation_frame.schema.json` now requires non-empty frame and tenant identifiers.
77. `AuditInvestigationFrame.ordered_event_refs[]`, `correlation_keys[]`, and `object_neighborhood_refs[]` accepted empty-string entries.
    Resolution: `schemas/audit_investigation_frame.schema.json` now rejects empty event refs, correlation keys, and neighborhood refs.
78. `AuditInvestigationFrame.next_cursor` accepted an empty string, blurring the difference between “no next page” and “malformed cursor”.
    Resolution: `schemas/audit_investigation_frame.schema.json` now requires non-empty cursors whenever present.
79. `AuditInvestigationFrame.exportPosture.reason_codes[]` accepted empty reason tokens.
    Resolution: `schemas/audit_investigation_frame.schema.json` now requires non-empty export-posture reason codes.
80. `AuditInvestigationFrame.activeFilters` arrays accepted empty actor, event-family, client, manifest, authority-operation, and object refs.
    Resolution: `schemas/audit_investigation_frame.schema.json` now rejects empty filter entries across all active-filter dimensions.
81. `AuthorityLinkInventoryItem.tenant_id`, `authority_link_id`, `client_id`, `authority_scope`, and `provider_environment` accepted empty strings.
    Resolution: `schemas/authority_link_inventory_item.schema.json` now requires non-empty governance inventory identifiers and scope labels.
82. `AuthorityLinkInventoryItem.blocked_reason_codes[]` accepted empty-string reason tokens.
    Resolution: `schemas/authority_link_inventory_item.schema.json` now requires non-empty blocked-reason codes.
83. The forensic guardrail suite did not protect command-receipt target refs against empty-string regressions.
    Resolution: `tools/forensic_contract_guard.py` now asserts non-empty scope, projection, duplicate-lineage, and result refs for `ApiCommandReceipt`.
84. The forensic guardrail suite did not protect append-only audit-event lineage fields against empty-string regressions.
    Resolution: `tools/forensic_contract_guard.py` now asserts non-empty actor/service/manifest lineage, object refs, reason codes, and continuation-correlation refs for `AuditEvent`.
85. The forensic guardrail suite did not protect governance audit-frame pagination and filter tokens against empty-string regressions.
    Resolution: `tools/forensic_contract_guard.py` now asserts non-empty frame ids, cursors, event refs, correlation keys, and active-filter entries for `AuditInvestigationFrame`.
86. The forensic guardrail suite did not protect authority-link inventory rows against empty-string identity and blocked-reason regressions.
    Resolution: `tools/forensic_contract_guard.py` now asserts non-empty identity, scope, environment, and blocked-reason fields for `AuthorityLinkInventoryItem`.

## Retention and access-control hardening

87. `ArtifactRetention.hold_ref` accepted empty strings when present, weakening legal-hold lineage.
    Resolution: `schemas/artifact_retention.schema.json` now requires a non-empty hold ref whenever one is present.
88. `ArtifactRetention.limitation_behavior` accepted empty strings, blurring the distinction between no limitation and an unspecified limitation mode.
    Resolution: `schemas/artifact_retention.schema.json` now requires non-empty limitation behavior values whenever present.
89. `ArtifactRetention.erasure_request_ref`, `erasure_action_ref`, and `erasure_proof_ref` accepted empty strings even in erasure-bearing lifecycle states.
    Resolution: `schemas/artifact_retention.schema.json` now rejects empty erasure lineage refs whenever present.
90. `RetentionGovernanceFrame.frame_id` and `tenant_id` accepted empty strings in a control-plane frame that depends on stable anchoring.
    Resolution: `schemas/retention_governance_frame.schema.json` now requires non-empty frame and tenant identifiers.
91. `RetentionGovernanceFrame.policy_snapshot_hash`, `legal_hold_register_ref`, and `erasure_queue_ref` accepted empty strings, weakening operator navigation and policy provenance.
    Resolution: `schemas/retention_governance_frame.schema.json` now requires non-empty policy and register refs.
92. `RetentionGovernanceFrame.retentionArtifactRow.artifact_class`, `retention_class`, `statutory_minimum_ref`, and `effective_minimum_ref` accepted empty strings.
    Resolution: `schemas/retention_governance_frame.schema.json` now rejects empty retention row identity and minimum-policy refs.
93. `RetentionGovernanceFrame.retentionArtifactRow.tenant_override_ref` accepted empty strings when present.
    Resolution: `schemas/retention_governance_frame.schema.json` now requires non-empty override refs whenever present.
94. `RetentionGovernanceFrame.retentionArtifactRow.pseudonymisation_mode` and `limitation_behavior` accepted empty strings.
    Resolution: `schemas/retention_governance_frame.schema.json` now requires non-empty pseudonymisation and limitation-behavior values.
95. `PrincipalAccessView.tenant_id` and `principal_id` accepted empty strings, weakening access-subject anchoring.
    Resolution: `schemas/principal_access_view.schema.json` now requires non-empty tenant and principal identifiers.
96. `PrincipalAccessView.effective_role_set[]`, `approval_capabilities[]`, and `run_kind_capabilities[]` accepted empty-string capability tokens.
    Resolution: `schemas/principal_access_view.schema.json` now rejects empty role and capability entries.
97. `PrincipalAccessView.delegationSummary.client_id`, `scope_refs[]`, and `lifecycle_state` accepted empty strings.
    Resolution: `schemas/principal_access_view.schema.json` now requires non-empty delegation client ids, scope refs, and lifecycle tokens.
98. `PrincipalAccessView.actionMatrixCell.resource_class` and `action_family` accepted empty strings in the access matrix.
    Resolution: `schemas/principal_access_view.schema.json` now requires non-empty action-matrix resource and action identifiers.
99. `PrincipalAccessView.actionMatrixCell.reason_codes[]`, `effective_scope[]`, `masking_rules[]`, and `required_approvals[]` accepted empty-string tokens.
    Resolution: `schemas/principal_access_view.schema.json` now rejects empty action-matrix reason, scope, masking, and approval entries.
100. `PrincipalAccessView.actionMatrixCell.policy_path_ref` accepted an empty string, weakening explainability lineage for access decisions.
    Resolution: `schemas/principal_access_view.schema.json` now requires non-empty policy-path refs whenever present.
101. The forensic guardrail suite did not protect retention lifecycle refs against empty-string regressions.
    Resolution: `tools/forensic_contract_guard.py` now asserts non-empty hold, limitation, and erasure-lineage refs for `ArtifactRetention`.
102. The forensic guardrail suite did not protect retention governance frame identifiers and row policy refs against empty-string regressions.
    Resolution: `tools/forensic_contract_guard.py` now asserts non-empty frame ids, policy refs, row refs, and override refs for `RetentionGovernanceFrame`.
103. The forensic guardrail suite did not protect principal access-view identifiers and action-matrix tokens against empty-string regressions.
    Resolution: `tools/forensic_contract_guard.py` now asserts non-empty principal ids, capability entries, delegation refs, matrix refs, and matrix token arrays for `PrincipalAccessView`.
104. `RunManifest.requested_scope[]` could persist action tokens ahead of the reporting-scope token, destabilizing manifest identity and replay comparisons.
    Resolution: `schemas/run_manifest.schema.json` and `scripts/validate_contracts.py` now require canonical scope ordering with the reporting token first.
105. `RunManifest.access_decision` still admitted `REQUIRE_STEP_UP`, `REQUIRE_APPROVAL`, and `DENY` even though those are pre-manifest exits.
    Resolution: `schemas/run_manifest.schema.json`, `scripts/validate_contracts.py`, `actor_and_authority_model.md`, and `data_model.md` now restrict persisted manifest access decisions to `ALLOW` or `ALLOW_MASKED`.
106. `RunManifest.access_decision.effective_scope[]` could be empty, out of order, or exceed `requested_scope[]`.
    Resolution: `schemas/run_manifest.schema.json` and `scripts/validate_contracts.py` now require non-empty canonical executable scope and enforce subset semantics against `requested_scope[]`.
107. `RunManifest.access_decision` could serialize masking, approval, or step-up posture that only makes sense before manifest allocation.
    Resolution: `schemas/run_manifest.schema.json` and `scripts/validate_contracts.py` now force approval/authn fields off manifest-scoped access decisions, require masking only for `ALLOW_MASKED`, and reject masking on `ALLOW`.
108. `AuthorityOperation.requested_scope[]` could persist non-canonical scope ordering.
    Resolution: `schemas/authority_operation.schema.json`, `scripts/validate_contracts.py`, and `authority_interaction_protocol.md` now enforce canonical requested-scope order.
109. `AuthorityOperation.runtime_scope[]` could persist non-canonical scope ordering.
    Resolution: `schemas/authority_operation.schema.json`, `scripts/validate_contracts.py`, and `authority_interaction_protocol.md` now enforce canonical runtime-scope order.
110. `AuthorityOperation.runtime_scope[]` could drift outside `requested_scope[]` while still passing token-level schema checks.
    Resolution: `scripts/validate_contracts.py` now verifies runtime-scope subset semantics directly.
111. `GateDecisionRecord.effective_scope[]` could serialize action tokens in a non-canonical order after the reporting scope.
    Resolution: `scripts/validate_contracts.py` now enforces the frozen scope-token order on gate records.
112. Canonical `AuthorizationDecision.effective_scope[]` accepted arbitrary strings rather than governed scope tokens.
    Resolution: `schemas/authorization_decision.schema.json` now restricts `effective_scope[]` to the closed scope-token vocabulary.
113. Canonical `AuthorizationDecision.effective_scope[]` could persist action-first ordering.
    Resolution: `schemas/authorization_decision.schema.json` and `scripts/validate_contracts.py` now require the reporting-scope token to appear first.
114. `ALLOW_MASKED` authorization decisions could still omit masking rules in the custom invariant layer.
    Resolution: `scripts/validate_contracts.py` now explicitly enforces non-empty `masking_rules[]` for `ALLOW_MASKED`.
115. Plain `ALLOW` authorization decisions could still carry masking rules in the custom invariant layer.
    Resolution: `scripts/validate_contracts.py` now rejects `masking_rules[]` for unmasked allow decisions.

## Evidence and fact-lineage hardening

104. `CandidateFact.candidate_fact_id` and `manifest_id` accepted empty strings, weakening fact identity and manifest binding.
    Resolution: `schemas/candidate_fact.schema.json` now requires non-empty candidate-fact and manifest ids.
105. `CandidateFact.non_compliance_config_refs[]` and `supporting_evidence_refs[]` accepted empty-string refs.
    Resolution: `schemas/candidate_fact.schema.json` now rejects empty config and evidence refs.
106. `CandidateFact.counterfactual_basis`, `value_payload_ref`, and `partition_scope` accepted empty strings when present.
    Resolution: `schemas/candidate_fact.schema.json` now requires non-empty analysis basis, payload refs, and partition scopes.
107. `CanonicalFact.canonical_fact_id` and `manifest_id` accepted empty strings, weakening canonical fact identity.
    Resolution: `schemas/canonical_fact.schema.json` now requires non-empty canonical-fact and manifest ids.
108. `CanonicalFact.non_compliance_config_refs[]` and `supporting_evidence_refs[]` accepted empty-string refs.
    Resolution: `schemas/canonical_fact.schema.json` now rejects empty config and evidence refs.
109. `CanonicalFact.counterfactual_basis`, `value_payload_ref`, and `partition_scope` accepted empty strings when present.
    Resolution: `schemas/canonical_fact.schema.json` now requires non-empty analysis basis, payload refs, and partition scopes.
110. `EvidenceItem.evidence_item_id`, `manifest_id`, `source_record_id`, `evidence_kind`, and `content_ref` accepted empty strings.
    Resolution: `schemas/evidence_item.schema.json` now requires non-empty evidence, manifest, source, kind, and content refs.
111. `EvidenceItem.lineage_refs[]` accepted empty-string lineage entries.
    Resolution: `schemas/evidence_item.schema.json` now rejects empty lineage refs.
112. `EvidenceItem.business_partition` and `period_partition` accepted empty strings.
    Resolution: `schemas/evidence_item.schema.json` now requires non-empty partition keys.
113. `SourceRecord.source_record_id`, `manifest_id`, and `collection_boundary_ref` accepted empty strings.
    Resolution: `schemas/source_record.schema.json` now requires non-empty source-record, manifest, and collection-boundary ids.
114. `SourceRecord.provider`, `tenant_id`, `client_id`, and `business_partition` accepted empty strings.
    Resolution: `schemas/source_record.schema.json` now requires non-empty provider and partition identity fields.
115. `SourceRecord.raw_hash`, `raw_payload_ref`, and `ingestion_run_ref` accepted empty strings, weakening raw lineage and replayability.
    Resolution: `schemas/source_record.schema.json` now requires non-empty raw-hash, payload, and ingestion-run refs.
116. `ConflictRecord.conflict_id` and `manifest_id` accepted empty strings, weakening conflict identity and manifest binding.
    Resolution: `schemas/conflict_record.schema.json` now requires non-empty conflict and manifest ids.
117. `ConflictRecord.involved_fact_refs[]`, `reason_codes[]`, `decisive_target_refs[]`, `evidence_refs[]`, and `authority_position_refs[]` accepted empty-string entries.
    Resolution: `schemas/conflict_record.schema.json` now rejects empty fact, reason, target, evidence, and authority refs.
118. `ConflictRecord.supersedes_conflict_id` accepted empty strings when present.
    Resolution: `schemas/conflict_record.schema.json` now requires non-empty supersession refs whenever present.
119. The forensic guardrail suite did not protect candidate and canonical fact ids, payload refs, and evidence refs against empty-string regressions.
    Resolution: `tools/forensic_contract_guard.py` now asserts non-empty ids, payload refs, config refs, evidence refs, and partition scopes for `CandidateFact` and `CanonicalFact`.
120. The forensic guardrail suite did not protect source/evidence/conflict lineage contracts against empty-string regressions.
    Resolution: `tools/forensic_contract_guard.py` now asserts non-empty source-record refs, evidence lineage refs, conflict ids, supersession refs, and conflict reference arrays across `SourceRecord`, `EvidenceItem`, and `ConflictRecord`.

## Submission, notice, drift, and audit coherence

121. Terminal or superseded `SubmissionRecord` states could retain a stale `reconciliation_deadline_at`.
    Resolution: `schemas/submission_record.schema.json` and `scripts/validate_contracts.py` now force `reconciliation_deadline_at = null` for `CONFIRMED`, `REJECTED`, `OUT_OF_BAND`, and `SUPERSEDED`.
122. `SubmissionRecord = REJECTED` could omit `authority_evidence_ref`, weakening the authority basis for a negative legal outcome.
    Resolution: `schemas/submission_record.schema.json`, `scripts/validate_contracts.py`, and `authority_interaction_protocol.md` now require rejection evidence to remain attached.
123. Non-authoritative `SubmissionRecord` states could still persist a non-null `baseline_type`, fabricating legal baseline posture.
    Resolution: `schemas/submission_record.schema.json`, `scripts/validate_contracts.py`, and `authority_interaction_protocol.md` now keep `baseline_type = null` for intent, transmit, pending-ack, rejected, and unknown states.
124. `FilingNoticeStep.packet_refs[]` could omit the owning `packet_id`, breaking packet-local notice binding.
    Resolution: `scripts/validate_contracts.py` and `modules.md` now require `packet_refs[]` to include the owning packet.
125. `FilingNoticeStep.resolved_at` could be earlier than `created_at`.
    Resolution: `scripts/validate_contracts.py` now enforces monotonic notice-step timestamps.
126. Satisfied `FilingNoticeResolution` payloads could not encode `declared_basis_ack_state = NOT_APPLICABLE` when no declaration-basis notice existed.
    Resolution: `schemas/filing_notice_resolution.schema.json` and `modules.md` now permit `NOT_APPLICABLE` in satisfied resolution posture.
127. `FilingNoticeResolution.notice_refs[]` could drift from `notice_step_refs[]`, weakening replayable packet-local notice order.
    Resolution: `scripts/validate_contracts.py` and `modules.md` now require exact ordered mirroring.
128. Unsatisfied `FilingNoticeResolution` payloads could omit `unresolved_reason_codes[]`.
    Resolution: `scripts/validate_contracts.py` now requires unresolved reasons whenever notice requirements remain unsatisfied.
129. Unsatisfied `FilingNoticeResolution` payloads could still serialize only satisfied or not-required component states.
    Resolution: `scripts/validate_contracts.py` now requires at least one unresolved approval or declaration-basis posture when `notice_requirements_satisfied = false`.
130. `DriftRecord.lifecycle_state = NOT_ASSESSED` could still persist non-zero `tax_delta_abs`.
    Resolution: `schemas/drift_record.schema.json`, `scripts/validate_contracts.py`, and `amendment_and_drift_semantics.md` now force zero tax deltas before assessment.
131. `DriftRecord.lifecycle_state = NOT_ASSESSED` could still persist non-zero `tax_delta_rel`.
    Resolution: `schemas/drift_record.schema.json`, `scripts/validate_contracts.py`, and `amendment_and_drift_semantics.md` now force zero relative deltas before assessment.
132. `DriftRecord.lifecycle_state = NOT_ASSESSED` could still persist non-zero drift pressure, amendment pressure, or critical-delta counts.
    Resolution: `schemas/drift_record.schema.json`, `scripts/validate_contracts.py`, and `amendment_and_drift_semantics.md` now force those quantitative fields to zero before assessment.
133. `DriftRecord.critical_field_delta_count` could drift from the actual number of critical `field_deltas[]`.
    Resolution: `scripts/validate_contracts.py` and `amendment_and_drift_semantics.md` now enforce exact projection from the field-delta list.
134. `DriftRecord.lifecycle_state = REVIEW_REQUIRED` could keep `review_state != REVIEW_OPEN`.
    Resolution: `schemas/drift_record.schema.json`, `scripts/validate_contracts.py`, and `amendment_and_drift_semantics.md` now require an open review posture for review-required drift.
135. `DriftRecord.lifecycle_state in {RESOLVED, SUPERSEDED}` could retain `review_state = REVIEW_OPEN`.
    Resolution: `schemas/drift_record.schema.json`, `scripts/validate_contracts.py`, and `amendment_and_drift_semantics.md` now close review posture on resolved or superseded drift.
136. `OutOfBandStateObserved` audit events could omit `submission_record_id`, severing the submission-lineage join for external-state reconciliation.
    Resolution: `schemas/audit_event.schema.json`, `scripts/validate_contracts.py`, and `observability_and_audit_contract.md` now require submission-record correlation for out-of-band events.
137. `AuditEvent` payloads could omit both `actor_ref` and `service_ref`, erasing event origin.
    Resolution: `schemas/audit_event.schema.json`, `scripts/validate_contracts.py`, and `observability_and_audit_contract.md` now require at least one origin identity.
138. `AuditEvent.correlation_context` could repeat `tenant_id`, `client_id`, or `manifest_id` values that disagreed with the top-level event identity.
    Resolution: `scripts/validate_contracts.py` and `observability_and_audit_contract.md` now enforce identity mirroring when those fields are repeated in correlation context.
139. Manifest-scoped manifest, submission, and drift audit events could still serialize `manifest_id = null`.
    Resolution: `scripts/validate_contracts.py` now rejects null manifest ids for manifest-scoped event families.

## Filing and obligation state-coherence hardening

121. `ObligationMirror.authority_refs[]` could be persisted empty even though the mirror is defined as an authority-grounded legal-state artifact.
    Resolution: `schemas/obligation_mirror.schema.json` now requires at least one authority ref.
122. `ObligationMirror.OPEN` could retain a non-null `ready_manifest_ref`, falsely implying filing-ready posture before all gates passed.
    Resolution: `schemas/obligation_mirror.schema.json` now forces `ready_manifest_ref = null` for `OPEN`.
123. `ObligationMirror.DUE_SOON` could retain a non-null `ready_manifest_ref`, collapsing deadline pressure into filing-ready posture.
    Resolution: `schemas/obligation_mirror.schema.json` now forces `ready_manifest_ref = null` for `DUE_SOON`.
124. `ObligationMirror.NOT_YET_OPEN` could carry `last_confirmed_submission_ref`, leaking legal-completion lineage into pre-window posture.
    Resolution: `schemas/obligation_mirror.schema.json` now forces `last_confirmed_submission_ref = null` for `NOT_YET_OPEN`.
125. `ObligationMirror.OPEN` could carry `last_confirmed_submission_ref`, conflicting with the state machine's unmet-open posture.
    Resolution: `schemas/obligation_mirror.schema.json` now forces `last_confirmed_submission_ref = null` for `OPEN`.
126. `ObligationMirror.DUE_SOON` could carry `last_confirmed_submission_ref`, conflating a still-unmet obligation with confirmed completion.
    Resolution: `schemas/obligation_mirror.schema.json` now forces `last_confirmed_submission_ref = null` for `DUE_SOON`.
127. `ObligationMirror.READY_TO_FILE` could retain `last_confirmed_submission_ref`, mixing pre-submit readiness with already-met legal state.
    Resolution: `schemas/obligation_mirror.schema.json` now forces `last_confirmed_submission_ref = null` for `READY_TO_FILE`.
128. `ObligationMirror.SUBMITTED_PENDING` could retain `last_confirmed_submission_ref`, collapsing pending acknowledgement into confirmed completion.
    Resolution: `schemas/obligation_mirror.schema.json` now forces `last_confirmed_submission_ref = null` for `SUBMITTED_PENDING`.
129. `ObligationMirror.LATE_UNMET` could retain `last_confirmed_submission_ref`, contradicting the unmet-late state.
    Resolution: `schemas/obligation_mirror.schema.json` now forces `last_confirmed_submission_ref = null` for `LATE_UNMET`.
130. `ObligationMirror.NO_LONGER_RELEVANT` could retain `last_confirmed_submission_ref`, preserving stale completion lineage after rescoping removed the obligation.
    Resolution: `schemas/obligation_mirror.schema.json` now forces `last_confirmed_submission_ref = null` for `NO_LONGER_RELEVANT`.
131. `ObligationMirror.SUBMITTED_PENDING` could retain `blocked_reason_codes[]`, creating a contradictory state that was both in-flight and blocked.
    Resolution: `schemas/obligation_mirror.schema.json` now caps `blocked_reason_codes[]` at zero for `SUBMITTED_PENDING`.
132. `ObligationMirror.NO_LONGER_RELEVANT` could retain `blocked_reason_codes[]`, leaking stale filing blockers into a removed obligation.
    Resolution: `schemas/obligation_mirror.schema.json` now caps `blocked_reason_codes[]` at zero for `NO_LONGER_RELEVANT`.
133. `FilingCase` states beyond `NOT_STARTED` could still null out `current_manifest_ref`, severing the live case from its active manifest lineage.
    Resolution: `schemas/filing_case.schema.json` now requires a non-empty `current_manifest_ref` for every active lifecycle state.
134. `FilingCase.AMENDED_CONFIRMED` could omit `controlling_proof_bundle_ref`, violating the closed-proof requirement for filing-capable terminal posture.
    Resolution: `schemas/filing_case.schema.json` now requires a non-empty controlling proof-bundle ref for `AMENDED_CONFIRMED`.
135. `FilingCase.AMENDED_CONFIRMED` could leave `proof_closure_state` open or non-terminal.
    Resolution: `schemas/filing_case.schema.json` now forces `proof_closure_state = CLOSED` for `AMENDED_CONFIRMED`.
136. `FilingCase.CLOSED` had no terminal-state guard and could drop `current_submission_ref`.
    Resolution: `schemas/filing_case.schema.json` now requires a non-empty `current_submission_ref` for `CLOSED`.
137. `FilingCase.CLOSED` could drift away from confirmed submission lineage.
    Resolution: `schemas/filing_case.schema.json` now forces `current_submission_state = CONFIRMED` for `CLOSED`.
138. `FilingCase.CLOSED` could drop `current_packet_ref`, obscuring the terminal packet lineage.
    Resolution: `schemas/filing_case.schema.json` now requires a non-empty `current_packet_ref` for `CLOSED`.
139. `FilingCase.CLOSED` could carry a non-submitted packet state.
    Resolution: `schemas/filing_case.schema.json` now forces `packet_state = SUBMITTED` for `CLOSED`.
140. `FilingCase.CLOSED` could omit `amendment_case_ref` even though the only legal path to `CLOSED` is through amendment completion.
    Resolution: `schemas/filing_case.schema.json` now requires a non-empty `amendment_case_ref` for `CLOSED`.
141. `FilingCase.CLOSED` could omit `controlling_proof_bundle_ref`, weakening replay-safe terminal defence lineage.
    Resolution: `schemas/filing_case.schema.json` now requires a non-empty controlling proof-bundle ref for `CLOSED`.
142. `FilingCase.CLOSED` could preserve an open or unknown proof-closure posture.
    Resolution: `schemas/filing_case.schema.json` now forces `proof_closure_state = CLOSED` for `CLOSED`.
143. `SubmissionRecord.INTENT_RECORDED` could omit `packet_ref`, allowing an authority-attempt intent to exist without the packet lineage it is meant to transmit.
    Resolution: `schemas/submission_record.schema.json` now requires a non-empty `packet_ref` for `INTENT_RECORDED`.
144. The forensic guardrail suite did not protect obligation-mirror and filing-case lifecycle coherence against state/ref regressions.
    Resolution: `tools/forensic_contract_guard.py` now asserts authority anchoring, ready-manifest resets, non-met completion-lineage nulling, terminal proof posture, and manifest-binding rules across `ObligationMirror` and `FilingCase`.
145. The forensic guardrail suite did not protect `SubmissionRecord.INTENT_RECORDED` from losing packet lineage.
    Resolution: `tools/forensic_contract_guard.py` now asserts that `INTENT_RECORDED` requires a non-empty `packet_ref`.

## Late-data, risk, and parity coherence hardening

146. `LateDataFinding` severity rules forced active-manifest effects even after a finding was superseded, so historical findings still serialized as live posture.
    Resolution: `schemas/late_data_finding.schema.json` now limits severity-to-effect mapping to non-superseded findings.
147. `LateDataFinding.SUPERSEDED` did not force `active_manifest_effect = NONE`.
    Resolution: `schemas/late_data_finding.schema.json` now clears active-manifest effect for superseded findings.
148. `LateDataMonitorResult.input_freeze_ref` was required but nullable, weakening replay-safe binding to the frozen post-seal basis.
    Resolution: `schemas/late_data_monitor_result.schema.json` now requires a non-null, non-empty input-freeze ref.
149. `LateDataMonitorResult.latest_indicator_set_ref` was nullable even though the late-data persistence contract requires a persisted indicator set for every post-seal scan.
    Resolution: `schemas/late_data_monitor_result.schema.json` now requires a non-null, non-empty latest-indicator-set ref.
150. `LateDataMonitorResult.NO_LATE_DATA` explicitly nulled `latest_indicator_set_ref`, contradicting the mandatory `LateDataIndicatorSet` persistence rule.
    Resolution: `schemas/late_data_monitor_result.schema.json` now requires the empty-scan indicator-set ref even for `NO_LATE_DATA`.
151. `LateDataMonitorResult` could serialize `child_manifest_refs[]` while `child_manifest_required_count = 0`, creating contradictory aggregate posture.
    Resolution: `schemas/late_data_monitor_result.schema.json` now forces `child_manifest_refs[]` empty whenever the child-manifest-required count is zero.
152. `RiskReport.feature_scores[]` required at least one positive-weight feature score, making the documented `RISK_WEIGHT_PROFILE_INVALID` zero-weight path unreachable.
    Resolution: `schemas/risk_report.schema.json` now allows the zero-feature invalid-profile case and separately requires feature scores for normal profiles.
153. `RiskReport` did not force empty `feature_scores[]` when `RISK_WEIGHT_PROFILE_INVALID` was emitted.
    Resolution: `schemas/risk_report.schema.json` now caps `feature_scores[]` at zero for invalid profiles.
154. `RiskReport` did not force `unresolved_blocking_risk_flag = false` for `RISK_WEIGHT_PROFILE_INVALID`, even though the formula only raises the material/blocking aggregate in that branch.
    Resolution: `schemas/risk_report.schema.json` now clears the blocking flag for invalid profiles.
155. `RiskReport.unresolved_material_blocking_risk_flag = true` lacked any reverse evidence requirement, so the aggregate flag could be raised with no unresolved flagged feature and no invalid-profile basis.
    Resolution: `schemas/risk_report.schema.json` now requires either `RISK_WEIGHT_PROFILE_INVALID` or at least one `MATERIAL_UNRESOLVED` / `BLOCKING_UNRESOLVED` feature.
156. `RiskReport.unresolved_blocking_risk_flag = false` still allowed `BLOCKING_RISK_UNRESOLVED` aggregate flags and `BLOCKING_UNRESOLVED` feature states.
    Resolution: `schemas/risk_report.schema.json` now forbids blocking aggregate and feature markers whenever the blocking flag is false.
157. `RiskReport.featureScore.blocking_threshold` allowed zero, contradicting the published threshold formula where blocking thresholds are strictly positive because they are bounded below by `material_threshold > 0`.
    Resolution: `schemas/risk_report.schema.json` now requires `blocking_threshold > 0`.
158. `ParityResult.MINOR_DIFFERENCE` allowed non-zero critical blocking counts, contradicting the aggregate classification formula.
    Resolution: `schemas/parity_result.schema.json` now forces `critical_blocking_field_count = 0` for `MINOR_DIFFERENCE`.
159. `ParityResult.MINOR_DIFFERENCE` allowed non-zero critical material counts, blurring minor and material posture.
    Resolution: `schemas/parity_result.schema.json` now forces `critical_material_field_count = 0` for `MINOR_DIFFERENCE`.
160. `ParityResult.MINOR_DIFFERENCE` allowed `weighted_parity_pressure >= 1.0`, which is the formula boundary for material difference.
    Resolution: `schemas/parity_result.schema.json` now requires `weighted_parity_pressure < 1.0` for `MINOR_DIFFERENCE`.
161. `ParityResult.MATERIAL_DIFFERENCE` allowed non-zero critical blocking counts even though the formula defines material difference only when no critical blocking field exists.
    Resolution: `schemas/parity_result.schema.json` now forces `critical_blocking_field_count = 0` for `MATERIAL_DIFFERENCE`.
162. `ParityResult.MATCH` allowed retained `cause_hypotheses[]`, preserving mismatch-cause posture on an exact match classification.
    Resolution: `schemas/parity_result.schema.json` now forces `cause_hypotheses[]` empty for `MATCH`.
163. The forensic guardrail suite did not protect late-data supersession and monitor-lineage rules against regression.
    Resolution: `tools/forensic_contract_guard.py` now asserts superseded-effect clearing, mandatory indicator-set linkage, and child-manifest reverse guards across `LateDataFinding` and `LateDataMonitorResult`.
164. The forensic guardrail suite did not protect risk invalid-profile, blocking-flag, and reverse-evidence semantics.
    Resolution: `tools/forensic_contract_guard.py` now asserts zero-feature invalid-profile posture, strict blocking-threshold floor, and reverse guards for unresolved risk flags in `RiskReport`.
165. The forensic guardrail suite did not protect parity classification/count coherence.
    Resolution: `tools/forensic_contract_guard.py` now asserts material/minor critical-count guards, minor pressure ceiling, and empty match-cause posture in `ParityResult`.

## Validator script repair

166. `validate_contracts.py` contained an unmatched closing parenthesis in the filing-notice-resolution custom invariant block, so the repo's authoritative validator could not start.
    Resolution: `scripts/validate_contracts.py` now compiles cleanly and the filing-notice-resolution invariant block is syntactically balanced.
167. `validate_contracts.py` contained a second unmatched closing parenthesis in the drift-record / audit-event custom invariant section, leaving the main self-test command unusable.
    Resolution: `scripts/validate_contracts.py` now compiles cleanly across the drift-record and audit-event validators, restoring `--self-test`.

## Workflow and collaboration coherence

168. `WorkflowItem.customer_due_at` could remain populated on `INTERNAL_ONLY` items even though those items suppress the customer lane entirely.
    Resolution: `schemas/workflow_item.schema.json`, `scripts/validate_contracts.py`, `collaboration_workspace_contract.md`, and `data_model.md` now force internal-only items to keep `customer_due_at = null`.
169. `WorkflowItem.customer_workspace_version` could drift ahead of `staff_workspace_version`, breaking route-visible version monotonicity.
    Resolution: `scripts/validate_contracts.py`, `collaboration_workspace_contract.md`, and `data_model.md` now require `customer_workspace_version <= staff_workspace_version`.
170. `WorkflowItem.lifecycle_state = WAITING_ON_CLIENT` could still appear on non-customer-shared work.
    Resolution: `scripts/validate_contracts.py` and `collaboration_workspace_contract.md` now require `WAITING_ON_CLIENT` items to remain `CUSTOMER_SHARED`.
171. `WorkflowItem.waiting_on_actor = AUTHORITY` could serialize outside `WAITING_ON_AUTHORITY`, creating competing wait-state projections.
    Resolution: `scripts/validate_contracts.py` now requires authority wait posture to project to `lifecycle_state = WAITING_ON_AUTHORITY`.
172. `WorkflowItem.last_customer_activity_at` could drift from `last_customer_visible_event_ref`.
    Resolution: `scripts/validate_contracts.py` and `collaboration_workspace_contract.md` now require those customer-lane fields to appear together.
173. `WorkflowItem.last_internal_activity_at` could drift from `last_internal_event_ref`.
    Resolution: `scripts/validate_contracts.py` and `collaboration_workspace_contract.md` now require those internal-lane fields to appear together.
174. Customer-visible `CollaborationEntry` payloads could still serialize raw `ASSIGNMENT_CHANGE`.
    Resolution: `schemas/collaboration_entry.schema.json`, `scripts/validate_contracts.py`, and `collaboration_workspace_contract.md` now force assignment-change entries to remain `INTERNAL_ONLY`.
175. Customer-visible `CollaborationEntry` payloads could still serialize raw `ESCALATION`.
    Resolution: `schemas/collaboration_entry.schema.json`, `scripts/validate_contracts.py`, and `collaboration_workspace_contract.md` now force escalation entries to remain `INTERNAL_ONLY`.
176. Customer-facing `WorkItemParticipant` roles could masquerade as `WATCHER` or `PRIMARY_OWNER` instead of `CUSTOMER_PARTICIPANT`.
    Resolution: `schemas/work_item_participant.schema.json`, `schemas/workspace_snapshot.schema.json`, `scripts/validate_contracts.py`, `collaboration_workspace_contract.md`, and `data_model.md` now bind customer roles to `watch_state = CUSTOMER_PARTICIPANT`.
177. `WorkspaceSnapshot.context_bar.item_id` could drift from the top-level `item_id`, weakening same-object shell continuity.
    Resolution: `scripts/validate_contracts.py` and `collaboration_workspace_contract.md` now require the context bar to mirror the snapshot item id.
178. `WorkspaceSnapshot.participants[].item_id` could drift from the mounted workspace item.
    Resolution: `scripts/validate_contracts.py` and `collaboration_workspace_contract.md` now require participant rows to mirror the snapshot item id.
179. Customer-visible `WorkspaceSnapshot` payloads could still expose staff participants or staff read posture.
    Resolution: `scripts/validate_contracts.py`, `collaboration_workspace_contract.md`, and `data_model.md` now require customer-visible snapshots to expose only customer participants with customer read posture.
180. `WorkspaceSnapshot.action_strip.primary_action_code` could drift outside `available_action_codes[]` or also appear in `blocked_action_codes[]`.
    Resolution: `scripts/validate_contracts.py` and `collaboration_workspace_contract.md` now enforce primary-action membership and disjointness for actionable workspaces.
181. Customer-visible `WorkspaceSnapshot.action_strip.suggested_module_code` could still point at staff-only modules.
    Resolution: `schemas/workspace_snapshot.schema.json`, `scripts/validate_contracts.py`, and `collaboration_workspace_contract.md` now restrict customer-visible suggestions to `CUSTOMER_ACTIVITY`, `FILES`, or `null`.
182. `WorkspaceSnapshot.action_strip.suggested_module_code` could reference a module that was not actually mounted in `detail_drawer.modules[]`.
    Resolution: `scripts/validate_contracts.py` and `collaboration_workspace_contract.md` now require suggestion codes to reference mounted modules.
183. `WorkspaceSnapshot.moduleState.content_state = LIMITED` could omit `limitation_reason_codes[]`, collapsing typed limitation posture into generic emptiness.
    Resolution: `schemas/workspace_snapshot.schema.json`, `scripts/validate_contracts.py`, and `collaboration_workspace_contract.md` now require at least one limitation reason for limited modules.
184. `WorkItemNotification` chronology could run backward, allowing `delivered_at < queued_at` or `read_at < delivered_at`.
    Resolution: `scripts/validate_contracts.py` and `collaboration_workspace_contract.md` now enforce monotonic notification timestamps.

## Governance overview and authority-interaction coherence hardening

185. `TenantGovernanceSnapshot.attention_summary.attention_family = PENDING_APPROVALS` could still serialize a different `primary_queue_code`, letting the dominant hero card disagree with the promoted queue.
    Resolution: `schemas/tenant_governance_snapshot.schema.json` now forces `primary_queue_code = PENDING_APPROVALS` when the dominant attention family is `PENDING_APPROVALS`.
186. `TenantGovernanceSnapshot.attention_summary.attention_family = CONFIGURATION_DRIFT` could drift away from the promoted queue, splitting dominant-question copy from the active worklist lane.
    Resolution: `schemas/tenant_governance_snapshot.schema.json` now forces `primary_queue_code = CONFIGURATION_DRIFT` when the dominant attention family is `CONFIGURATION_DRIFT`.
187. `TenantGovernanceSnapshot.attention_summary.attention_family = AUTHORITY_LINK_RISK` could coexist with a different dominant queue code, creating a contradictory operator posture.
    Resolution: `schemas/tenant_governance_snapshot.schema.json` now forces `primary_queue_code = AUTHORITY_LINK_RISKS` when the dominant attention family is `AUTHORITY_LINK_RISK`.
188. `TenantGovernanceSnapshot.attention_summary.attention_family = RETENTION_EXCEPTION` could point operators at a non-retention queue even though the snapshot claims retention is the dominant question.
    Resolution: `schemas/tenant_governance_snapshot.schema.json` now forces `primary_queue_code = RETENTION_EXCEPTIONS` when the dominant attention family is `RETENTION_EXCEPTION`.
189. `TenantGovernanceSnapshot.attention_summary.attention_family = AUDIT_HOTSPOT` could promote a different queue than the hotspot tape named by the hero card.
    Resolution: `schemas/tenant_governance_snapshot.schema.json` now forces `primary_queue_code = AUDIT_HOTSPOTS` when the dominant attention family is `AUDIT_HOTSPOT`.
190. `TenantGovernanceSnapshot.primary_queue_code = PENDING_APPROVALS` could still point `primary_worklist_ref` at a non-approval worklist, breaking the documented dominant-worklist contract.
    Resolution: `scripts/validate_contracts.py` now requires `primary_worklist_ref` to match `pending_approval_worklist_ref` whenever `primary_queue_code = PENDING_APPROVALS`.
191. `TenantGovernanceSnapshot.primary_queue_code = CONFIGURATION_DRIFT` could still serialize a mismatched `primary_worklist_ref`, sending the dominant queue to the wrong filtered list.
    Resolution: `scripts/validate_contracts.py` now requires `primary_worklist_ref` to match `configuration_drift_worklist_ref` whenever `primary_queue_code = CONFIGURATION_DRIFT`.
192. `TenantGovernanceSnapshot.primary_queue_code = AUTHORITY_LINK_RISKS` could still target a non-authority-link worklist, severing the queue/worklist binding.
    Resolution: `scripts/validate_contracts.py` now requires `primary_worklist_ref` to match `authority_link_risk_worklist_ref` whenever `primary_queue_code = AUTHORITY_LINK_RISKS`.
193. `TenantGovernanceSnapshot.primary_queue_code = RETENTION_EXCEPTIONS` could still target a non-retention worklist, leaving the dominant queue detached from its actual queue route.
    Resolution: `scripts/validate_contracts.py` now requires `primary_worklist_ref` to match `retention_exception_worklist_ref` whenever `primary_queue_code = RETENTION_EXCEPTIONS`.
194. `TenantGovernanceSnapshot.primary_queue_code = AUDIT_HOTSPOTS` could still drive a non-hotspot primary worklist, contradicting the promoted audit lane.
    Resolution: `scripts/validate_contracts.py` now requires `primary_worklist_ref` to match `audit_hotspot_worklist_ref` whenever `primary_queue_code = AUDIT_HOTSPOTS`.
195. A non-calm `TenantGovernanceSnapshot.attention_summary.primary_worklist_ref` could diverge from the top-level `primary_worklist_ref`, allowing the hero card and promoted queue to route to different places.
    Resolution: `scripts/validate_contracts.py` now requires non-calm `attention_summary.primary_worklist_ref` to match the top-level `primary_worklist_ref`.
196. `AuthorityInteractionRecord.RESPONSE_CAPTURED` could retain a non-null `resolution_basis`, falsely serializing the exchange as resolved before the lifecycle reached `RESOLVED`.
    Resolution: `schemas/authority_interaction_record.schema.json` and `scripts/validate_contracts.py` now keep `resolution_basis = null` until the interaction is actually `RESOLVED`.
197. The forensic guardrail suite did not protect tenant-governance family-to-queue alignment, so future schema edits could silently reintroduce dominant-queue drift.
    Resolution: `tools/forensic_contract_guard.py` now asserts the family-to-queue guards for every non-calm `TenantGovernanceSnapshot` attention family.
198. The forensic guardrail suite did not protect `AuthorityInteractionRecord.RESPONSE_CAPTURED` from carrying a premature `resolution_basis`.
    Resolution: `tools/forensic_contract_guard.py` now asserts the explicit `RESPONSE_CAPTURED` resolution-basis nulling rule.
199. The validator self-test suite did not exercise tenant-governance queue/worklist alignment or pre-resolution authority-interaction basis leakage.
    Resolution: `scripts/validate_contracts.py` now includes regression cases for queue/worklist binding, attention/worklist alignment, family/queue alignment, and premature authority resolution basis.

## Collaboration request-info and notification hardening

200. `WorkflowItem.WAITING_ON_CLIENT` could still serialize a non-customer `waiting_on_actor`, contradicting the collaboration state machine.
    Resolution: `schemas/workflow_item.schema.json` and `scripts/validate_contracts.py` now force `waiting_on_actor = CUSTOMER` for `WAITING_ON_CLIENT`.
201. `WorkflowItem.WAITING_ON_CLIENT` could drop `active_request_info_ref`, leaving the item waiting on an unnamed request-for-info.
    Resolution: `schemas/workflow_item.schema.json` and `scripts/validate_contracts.py` now require a non-null `active_request_info_ref` for `WAITING_ON_CLIENT`.
202. `WorkflowItem.WAITING_ON_CLIENT` could publish any customer status projection other than `ACTION_REQUIRED`, splitting internal and customer-visible posture.
    Resolution: `schemas/workflow_item.schema.json` and `scripts/validate_contracts.py` now force `customer_status_projection = ACTION_REQUIRED` for `WAITING_ON_CLIENT`.
203. `WorkflowItem.customer_status_projection = UNDER_REVIEW` could drift onto terminal or waiting states even though the published projection table limits it to `OPEN`, `IN_PROGRESS`, or `BLOCKED`.
    Resolution: `schemas/workflow_item.schema.json` and `scripts/validate_contracts.py` now restrict `UNDER_REVIEW` to `OPEN`, `IN_PROGRESS`, or `BLOCKED`.
204. `WorkflowItem.customer_status_projection = WAITING_ON_CONFIRMATION` could drift away from `WAITING_ON_AUTHORITY`.
    Resolution: `schemas/workflow_item.schema.json` and `scripts/validate_contracts.py` now force `WAITING_ON_CONFIRMATION` to derive only from `WAITING_ON_AUTHORITY`.
205. `WorkflowItem.customer_status_projection = RESOLVED` could drift away from `DONE`.
    Resolution: `schemas/workflow_item.schema.json` and `scripts/validate_contracts.py` now force `RESOLVED` to derive only from `DONE`.
206. `WorkflowItem.customer_status_projection = CLOSED` could drift away from `CANCELLED` or `STALE`.
    Resolution: `schemas/workflow_item.schema.json` and `scripts/validate_contracts.py` now force `CLOSED` to derive only from `CANCELLED` or `STALE`.
207. `RequestInfoRecord` could retain `response_entry_ref` after `closure_reason_code = CANCELLED` or `SUPERSEDED`, falsely preserving a customer-reply lineage on a non-reply closure.
    Resolution: `schemas/request_info_record.schema.json` and `scripts/validate_contracts.py` now clear `response_entry_ref` for cancelled or superseded closures.
208. `RequestInfoRecord` could retain `response_body_ref` after `closure_reason_code = CANCELLED` or `SUPERSEDED`, leaking reply content into a closed-without-accepted-reply posture.
    Resolution: `schemas/request_info_record.schema.json` and `scripts/validate_contracts.py` now clear `response_body_ref` for cancelled or superseded closures.
209. `RequestInfoRecord` could retain `responded_by_ref` after `closure_reason_code = CANCELLED` or `SUPERSEDED`, fabricating a responder on a non-reply closure path.
    Resolution: `schemas/request_info_record.schema.json` and `scripts/validate_contracts.py` now clear `responded_by_ref` for cancelled or superseded closures.
210. `RequestInfoRecord` could retain `responded_at` after `closure_reason_code = CANCELLED` or `SUPERSEDED`, preserving an impossible reply timestamp.
    Resolution: `schemas/request_info_record.schema.json` and `scripts/validate_contracts.py` now clear `responded_at` for cancelled or superseded closures.
211. `RequestInfoRecord` could serialize only part of the response-lineage quartet, weakening exact request/reply binding.
    Resolution: `schemas/request_info_record.schema.json` and `scripts/validate_contracts.py` now require `response_entry_ref`, `response_body_ref`, `responded_by_ref`, and `responded_at` to appear together.
212. `RequestInfoRecord.responded_at` could be earlier than `opened_at`.
    Resolution: `scripts/validate_contracts.py` now enforces monotonic request-response timestamps.
213. `RequestInfoRecord.closed_at` could be earlier than `opened_at`.
    Resolution: `scripts/validate_contracts.py` now enforces monotonic open-close timestamps.
214. `RequestInfoRecord.closed_at` could be earlier than `responded_at`, breaking accepted-reply closure chronology.
    Resolution: `scripts/validate_contracts.py` now enforces `responded_at <= closed_at` whenever both timestamps exist.
215. `WorkItemNotification.REQUEST_INFO_OPENED` could be emitted as `INTERNAL_ONLY`, contradicting the customer-notification contract.
    Resolution: `schemas/work_item_notification.schema.json` and `scripts/validate_contracts.py` now force `REQUEST_INFO_OPENED` notifications to remain `CUSTOMER_VISIBLE`.
216. `WorkItemNotification.REQUEST_INFO_OPENED` could omit `focus_anchor_ref`, preventing exact request-block routing from a notification open.
    Resolution: `schemas/work_item_notification.schema.json` and `scripts/validate_contracts.py` now require a non-null `focus_anchor_ref` for `REQUEST_INFO_OPENED`.
217. `WorkItemNotification.CUSTOMER_VISIBLE_COMMENT` could be emitted as `INTERNAL_ONLY`, leaking a customer-only notification family into staff-only routing.
    Resolution: `schemas/work_item_notification.schema.json` and `scripts/validate_contracts.py` now force `CUSTOMER_VISIBLE_COMMENT` notifications to remain `CUSTOMER_VISIBLE`.
218. Staff-only notification families (`NEW_ASSIGNMENT`, `REASSIGNMENT`, `ESCALATION`, `CUSTOMER_REPLY`, `SLA_DUE_SOON`, `SLA_OVERDUE`, `SLA_BREACHED`) could be emitted as customer-visible notifications.
    Resolution: `schemas/work_item_notification.schema.json` and `scripts/validate_contracts.py` now force those notification families to remain `INTERNAL_ONLY`.
219. The forensic guardrail suite did not protect workflow customer-projection reverse mapping, request-info closure cleanup, or notification family visibility rules.
    Resolution: `tools/forensic_contract_guard.py` now asserts the new `WorkflowItem`, `RequestInfoRecord`, and `WorkItemNotification` guards.
220. The validator self-test suite did not exercise workflow customer-projection drift, request-info response-lineage coherence, or notification family visibility leakage.
    Resolution: `scripts/validate_contracts.py` now includes regression cases for those collaboration failures.

## Portal approval, onboarding, and help-route hardening

221. `ClientApprovalPack.CANCELLED` could still retain `viewed_at`, even though cancellation is only reachable from `READY_FOR_CLIENT`.
    Resolution: `schemas/client_approval_pack.schema.json` and `scripts/validate_contracts.py` now force cancelled packs to clear `viewed_at`.
222. `ClientApprovalPack.CANCELLED` could still retain `acknowledged_at`, fabricating client acknowledgement on a never-opened pack.
    Resolution: `schemas/client_approval_pack.schema.json` and `scripts/validate_contracts.py` now force cancelled packs to clear `acknowledged_at`.
223. `ClientApprovalPack.acknowledged_at` could be earlier than `viewed_at`, breaking the documented review progression.
    Resolution: `scripts/validate_contracts.py` now enforces `viewed_at <= acknowledged_at` whenever both timestamps exist.
224. `ClientApprovalPack.signed_at` could be earlier than `viewed_at`, allowing signature chronology to bypass the review event entirely.
    Resolution: `scripts/validate_contracts.py` now enforces `viewed_at <= signed_at` whenever both timestamps exist.
225. `ClientApprovalPack.signed_at` could be earlier than `acknowledged_at`, contradicting the acknowledgement-before-sign sequence.
    Resolution: `scripts/validate_contracts.py` now enforces `acknowledged_at <= signed_at` whenever both timestamps exist.
226. `ClientOnboardingJourney.resume_step_code` could point outside frozen `required_steps[]`, restoring a draft into an invalid step.
    Resolution: `scripts/validate_contracts.py` now requires every non-null `resume_step_code` to remain inside `required_steps[]`.
227. `ClientOnboardingJourney.resume_state = LIVE` could reopen a step that was already listed in `completed_steps[]`.
    Resolution: `scripts/validate_contracts.py` now prevents live resume from targeting an already completed step.
228. `ClientOnboardingJourney.resume_state = RECONFIRMATION_REQUIRED` could point to a step not listed in `reconfirmation_step_codes[]`.
    Resolution: `scripts/validate_contracts.py` now requires the resumed step to be one of the explicit reconfirmation targets.
229. `ClientOnboardingJourney.draft_upload_session_refs[]` could persist while the lifecycle had already left `DOCUMENTS_PENDING`.
    Resolution: `scripts/validate_contracts.py` now restricts draft upload sessions to `lifecycle_state = DOCUMENTS_PENDING`.
230. `ClientOnboardingJourney.draft_upload_session_refs[]` could coexist with `current_step_code != DOCUMENT_COLLECTION`.
    Resolution: `scripts/validate_contracts.py` now forces document draft posture to keep `current_step_code = DOCUMENT_COLLECTION`.
231. `ClientOnboardingJourney.draft_upload_session_refs[]` could resume into a non-document step, breaking save-and-return continuity for uploads.
    Resolution: `scripts/validate_contracts.py` now requires document draft resume to target `resume_step_code = DOCUMENT_COLLECTION`.
232. `ClientOnboardingJourney.state_changed_at` could precede `invited_at`, producing impossible lifecycle chronology.
    Resolution: `scripts/validate_contracts.py` now enforces `invited_at <= state_changed_at`.
233. `ClientOnboardingJourney.completed_at` could precede `invited_at` or `state_changed_at`, corrupting completion chronology.
    Resolution: `scripts/validate_contracts.py` now enforces completion timestamps to remain on or after invite and state-change time.
234. `ClientOnboardingJourney.expires_at` could be earlier than `invited_at`, creating an already-expired invite window at issuance.
    Resolution: `scripts/validate_contracts.py` now enforces `invited_at <= expires_at` when an expiry window exists.
235. `ClientOnboardingJourney.expired_at` could precede `invited_at`, `state_changed_at`, or `expires_at`, breaking terminal expiry chronology.
    Resolution: `scripts/validate_contracts.py` now enforces `expired_at` to stay on or after the invite, last state change, and scheduled expiry boundary.
236. `ClientOnboardingJourney.abandoned_at` could precede `invited_at` or `state_changed_at`, inventing abandonment before the journey existed.
    Resolution: `scripts/validate_contracts.py` now enforces abandonment timestamps to remain on or after invite and state-change time.
237. `PortalHelpRequest.source_route = REQUEST_DETAIL` could still omit `item_id`, weakening exact return-route context.
    Resolution: `schemas/portal_help_request.schema.json` and `scripts/validate_contracts.py` now require a non-null `item_id` on `REQUEST_DETAIL` help routes.
238. `PortalHelpRequest.source_route = REQUEST_DETAIL` could still omit `source_focus_anchor_ref`, losing exact focus restoration after help handoff.
    Resolution: `schemas/portal_help_request.schema.json` and `scripts/validate_contracts.py` now require a non-null `source_focus_anchor_ref` on `REQUEST_DETAIL` help routes.
239. `PortalHelpRequest.request_info_ref` could still serialize on a non-request route, breaking request-for-info lineage binding.
    Resolution: `schemas/portal_help_request.schema.json` and `scripts/validate_contracts.py` now force linked request-info help to keep `source_route = REQUEST_DETAIL`.
240. `PortalHelpRequest.request_info_ref` could still omit `source_focus_anchor_ref`, degrading exact request-block return context into a generic ticket.
    Resolution: `schemas/portal_help_request.schema.json` and `scripts/validate_contracts.py` now require a non-null `source_focus_anchor_ref` whenever `request_info_ref` is present.
241. `PortalHelpRequest.closed_at` could be present before the lifecycle reached `CLOSED`.
    Resolution: `schemas/portal_help_request.schema.json` and `scripts/validate_contracts.py` now force non-null `closed_at` to imply `lifecycle_state = CLOSED`.
242. The forensic guardrail suite did not protect cancelled approval-pack history reset or portal-help route/closure reverse guards.
    Resolution: `tools/forensic_contract_guard.py` now asserts the new `ClientApprovalPack` and `PortalHelpRequest` schema guards.
243. The validator self-test suite did not exercise approval-pack chronology, onboarding resume/timestamp drift, or portal-help request-detail lineage failures.
    Resolution: `scripts/validate_contracts.py` now includes regression cases for those portal contract failures.

## Portal and northbound recovery hardening

244. `ClientPortalWorkspace.route` could drift away from the one active `navigation_tabs[]` entry, letting the mounted shell claim one top-level tab while the nav highlights another.
    Resolution: `scripts/validate_contracts.py` and `customer_client_portal_experience_contract.md` now require the active tab to match the top-level route.
245. Contextual portal routes could serialize a `route_context.return_route` that disagreed with the mounted parent tab, breaking same-shell return behavior after rebase or resize.
    Resolution: `scripts/validate_contracts.py` and `customer_client_portal_experience_contract.md` now require contextual return routes to mirror the parent top-level route.
246. `ClientPortalWorkspace.document_center.open_request_count` could drift away from the serialized request cards.
    Resolution: `scripts/validate_contracts.py`, `customer_client_portal_experience_contract.md`, and `data_model.md` now require exact open-request count projection from request-card status.
247. `ClientPortalWorkspace.document_center.requests[].current_upload_ref` could point outside its own request card, and duplicate `upload_session_id` values could survive inside one request history.
    Resolution: `scripts/validate_contracts.py` and `customer_client_portal_experience_contract.md` now require request-local upload identity and unique upload session ids per request card.
248. Request-card status could disagree with the transfer posture of the `current_upload_ref`, allowing `UPLOADING`, `UNDER_REVIEW`, `ACCEPTED`, or `REJECTED` cards to point at the wrong upload state.
    Resolution: `scripts/validate_contracts.py` now enforces status-compatible current-upload transfer posture.
249. `ClientPortalWorkspace.approval_center.outstanding_count` could drift away from the serialized approval-pack list.
    Resolution: `scripts/validate_contracts.py`, `customer_client_portal_experience_contract.md`, and `data_model.md` now require exact outstanding-pack projection from active approval statuses.
250. `ClientPortalWorkspace.approval_center.latest_pack_ref` could point at a pack that was not actually serialized.
    Resolution: `scripts/validate_contracts.py` and `customer_client_portal_experience_contract.md` now require `latest_pack_ref` to resolve to one serialized approval pack.
251. `ClientPortalWorkspace.approval_center.packs[].status = STEP_UP_REQUIRED` could still serialize `requires_step_up = false` or a non-step-up primary action.
    Resolution: `schemas/client_portal_workspace.schema.json`, `scripts/validate_contracts.py`, `customer_client_portal_experience_contract.md`, and `data_model.md` now force step-up-required packs to keep explicit step-up posture.
252. `ClientPortalWorkspace.activity_timeline[]` could duplicate `event_id`s or render oldest-first, destabilizing reconnect-safe recent activity.
    Resolution: `scripts/validate_contracts.py`, `customer_client_portal_experience_contract.md`, and `data_model.md` now require unique event ids and newest-first timeline ordering.
253. `ClientPortalWorkspace.onboarding_journey.completed_step_count` could exceed `total_step_count`, and completed journeys could stop short of full completion.
    Resolution: `scripts/validate_contracts.py`, `customer_client_portal_experience_contract.md`, and `data_model.md` now enforce coherent onboarding completion counts.
254. `CommandEnvelope.requested_scope[]` could persist non-canonical scope ordering even on northbound write commands.
    Resolution: `scripts/validate_contracts.py` now applies canonical scope-order validation to `CommandEnvelope.requested_scope[]`.
255. Collaboration command families could target non-`WORK_ITEM` scope or bind the wrong work-item stale guards and thread-head lane.
    Resolution: `schemas/command_envelope.schema.json`, `scripts/validate_contracts.py`, and `northbound_api_and_session_contract.md` now align collaboration command families with `WORK_ITEM` scope plus the correct version/head guard.
256. Client-portal command families could omit `client_id`, target governance scope, or skip the documented approval-pack or portal-workspace stale guards.
    Resolution: `schemas/command_envelope.schema.json`, `scripts/validate_contracts.py`, and `northbound_api_and_session_contract.md` now require client identity and the correct pack/workspace guards for portal commands.
257. Governance command families could still target non-governance scope classes.
    Resolution: `schemas/command_envelope.schema.json`, `scripts/validate_contracts.py`, and `northbound_api_and_session_contract.md` now force `ADMIN_*` commands onto `GOVERNANCE` scope.
258. `ProblemEnvelope` could mix manifest resume-token recovery with portal, collaboration, or governance recovery refs, forcing clients to guess which shell to rebase.
    Resolution: `schemas/problem_envelope.schema.json`, `scripts/validate_contracts.py`, and `northbound_api_and_session_contract.md` now keep manifest resume-token recovery separate from non-manifest recovery families.
259. `ProblemEnvelope` could publish multiple non-manifest recovery families at once or point portal-facing errors at expert-only detail surfaces.
    Resolution: `scripts/validate_contracts.py`, `schemas/problem_envelope.schema.json`, `northbound_api_and_session_contract.md`, and `data_model.md` now enforce one non-manifest recovery family at a time and restrict portal-facing surfaces to client-safe values.
260. `PortalHelpRequest.support_channel = CONTEXTUAL_REQUEST` could omit the linked `request_info_ref`.
    Resolution: `schemas/portal_help_request.schema.json`, `scripts/validate_contracts.py`, `customer_client_portal_experience_contract.md`, and `data_model.md` now require `request_info_ref` on contextual request help.
261. `PortalHelpRequest.reason_family` could drift away from its source route, such as approval help coming from `DOCUMENTS`.
    Resolution: `schemas/portal_help_request.schema.json`, `scripts/validate_contracts.py`, `customer_client_portal_experience_contract.md`, and `data_model.md` now align route-specific help reasons with allowed source routes.
262. `PortalHelpRequest` lifecycle timestamps could run backward across acknowledgement, response, and closure.
    Resolution: `scripts/validate_contracts.py` now enforces monotonic help-request timestamps.
263. `RequestInfoRecord.audit_event_refs[]` could be empty even though the open, response, or closure transition must remain audit-traceable.
    Resolution: `schemas/request_info_record.schema.json`, `scripts/validate_contracts.py`, `collaboration_workspace_contract.md`, and `data_model.md` now require non-empty audit lineage.
264. `RequestInfoRecord` could reuse prompt lineage for the response lineage, collapsing the exact request/reply boundary.
    Resolution: `scripts/validate_contracts.py`, `collaboration_workspace_contract.md`, and `data_model.md` now require response entry/body refs to stay distinct from the prompt lineage.
265. `ClientUploadSession` chronology could still run backward across transfer, scan, validation, finalize, attachment confirmation, or reconfirmation timestamps.
    Resolution: `scripts/validate_contracts.py` and `data_model.md` now enforce monotonic upload-session timestamps.
266. `ClientUploadSession` could drift between accepted attachment posture and its resumability, reconfirmation, or next-action fields.
    Resolution: `scripts/validate_contracts.py` and `data_model.md` now enforce accepted-session resume-token posture, reconfirmed binding timestamps, attached-document requirements, and attachment-state-specific next actions.

## Error remediation and accepted-risk lifecycle hardening

267. `AcceptedRiskApproval.expires_at` could be earlier than `approved_at`, creating an already-expired approval at issuance.
    Resolution: `scripts/validate_contracts.py` now enforces `approved_at <= expires_at`.
268. `AcceptedRiskApproval.revoked_at` could be earlier than `approved_at`, fabricating revocation before the approval existed.
    Resolution: `scripts/validate_contracts.py` now enforces `approved_at <= revoked_at` whenever revocation is present.
269. `AcceptedRiskApproval.superseded_by_approval_id` could self-reference `accepted_risk_approval_id`, creating an impossible one-node supersession loop.
    Resolution: `scripts/validate_contracts.py` now rejects self-superseding accepted-risk approvals.
270. `FailureInvestigation.due_at` could be earlier than `opened_at`, producing an already-overdue investigation at creation.
    Resolution: `scripts/validate_contracts.py` now enforces `opened_at <= due_at` whenever a due date exists.
271. `FailureInvestigation.last_activity_at` could be earlier than `opened_at`, corrupting investigation chronology.
    Resolution: `scripts/validate_contracts.py` now enforces `opened_at <= last_activity_at`.
272. `FailureInvestigation.resolved_at` could be earlier than `opened_at`, allowing closure before the investigation existed.
    Resolution: `scripts/validate_contracts.py` now enforces `opened_at <= resolved_at` whenever the investigation is terminal.
273. `FailureInvestigation.resolved_at` could be earlier than `last_activity_at`, reversing the final activity timeline.
    Resolution: `scripts/validate_contracts.py` now enforces `last_activity_at <= resolved_at` whenever both timestamps exist.
274. `FailureInvestigation.outcome = REMEDIATION_SPAWNED` could serialize with no `remediation_task_refs[]`, losing the task-backed closure linkage required by the remediation model.
    Resolution: `scripts/validate_contracts.py` now requires at least one remediation task ref for remediation-spawned investigations.
275. `FailureInvestigation.superseded_by_investigation_id` could self-reference `investigation_id`, creating an impossible supersession cycle.
    Resolution: `scripts/validate_contracts.py` now rejects self-superseding investigations.
276. `FailureInvestigation.resolved_at` could be non-null on non-terminal investigation states because only state-to-field guards existed.
    Resolution: `schemas/failure_investigation.schema.json` now forces non-null `resolved_at` to imply a terminal state (`RESOLVED`, `ACCEPTED_RISK`, `SUPERSEDED`, or `CANCELLED`).
277. `FailureInvestigation.resolution_basis_ref` could be non-null on non-terminal states, leaking closure semantics into active investigations.
    Resolution: `schemas/failure_investigation.schema.json` now forces non-null `resolution_basis_ref` to imply a terminal investigation state.
278. `FailureInvestigation.closure_evidence_refs[]` could be populated on non-terminal states, allowing active investigations to masquerade as closed.
    Resolution: `schemas/failure_investigation.schema.json` now forces non-empty `closure_evidence_refs[]` to imply a terminal investigation state.
279. The forensic guardrail suite did not protect the new terminal reverse guards for `FailureInvestigation`, and the validator self-test suite did not exercise accepted-risk chronology or remediation-investigation closure drift.
    Resolution: `tools/forensic_contract_guard.py` now asserts the reverse guards, and `scripts/validate_contracts.py` now includes regression cases for accepted-risk chronology/self-supersession and failure-investigation chronology/remediation linkage.

## Session and stream transport hardening

280. Success-class `ApiCommandReceipt` rows could still serialize with no authoritative recovery anchor at all, leaving `GET /commands/{command_id}` unable to recover meaningfully after a lost POST response.
    Resolution: `scripts/validate_contracts.py`, `northbound_api_and_session_contract.md`, and `data_model.md` now require success-class receipts to retain at least one recovery anchor among `result_ref`, `latest_projection_ref`, or published side-effect refs.
281. `ApiCommandReceipt.duplicate_of_receipt_id` could still point back to the receipt itself, collapsing duplicate lineage into a self-loop.
    Resolution: `scripts/validate_contracts.py` and `northbound_api_and_session_contract.md` now reject self-pointing duplicate lineage.
282. Manifest stale guards (`DECISION_BUNDLE_HASH`, `SHELL_STABILITY_TOKEN`, `FRAME_EPOCH`, `APPROVAL_PACK_HASH`) could drift onto non-manifest command receipts.
    Resolution: `schemas/api_command_receipt.schema.json`, `scripts/validate_contracts.py`, `northbound_api_and_session_contract.md`, and `data_model.md` now bind those stale guards to `target_scope_class = MANIFEST`.
283. Collaboration stale guards (`WORK_ITEM_VERSION`, `INTERNAL_THREAD_HEAD`, `CUSTOMER_THREAD_HEAD`) could drift onto non-work-item command receipts.
    Resolution: `schemas/api_command_receipt.schema.json`, `scripts/validate_contracts.py`, and `northbound_api_and_session_contract.md` now bind collaboration stale guards to `target_scope_class = WORK_ITEM`.
284. `ApiCommandReceipt.stale_guard_family = POLICY_SNAPSHOT_HASH` could drift onto non-governance command receipts.
    Resolution: `schemas/api_command_receipt.schema.json`, `scripts/validate_contracts.py`, and `northbound_api_and_session_contract.md` now bind policy stale guards to `target_scope_class = GOVERNANCE`.
285. `ApiCommandReceipt.expires_at` could predate or equal `accepted_at`, making the receipt terminal at the instant it was recorded.
    Resolution: `scripts/validate_contracts.py` now enforces `accepted_at < expires_at`.
286. `ExperienceCursor.last_ack_sequence` could exceed `last_published_sequence`, claiming the client had acknowledged events the stream never published.
    Resolution: `scripts/validate_contracts.py`, `northbound_api_and_session_contract.md`, and `data_model.md` now enforce `last_ack_sequence <= last_published_sequence`.
287. `ExperienceCursor.replacement_snapshot_ref` could equal `latest_snapshot_ref`, causing a rebase cursor to point back to the stale snapshot it was replacing.
    Resolution: `scripts/validate_contracts.py`, `northbound_api_and_session_contract.md`, and `data_model.md` now require replacement snapshots to differ from the prior latest snapshot.
288. `ExperienceCursor.invalidated_at` could predate `last_seen_at`, implying the cursor had already been invalidated before its last acknowledged use.
    Resolution: `scripts/validate_contracts.py` and `northbound_api_and_session_contract.md` now enforce `last_seen_at <= invalidated_at` for non-live cursors.
289. `ExperienceCursor.cursor_state = EXPIRED` could invalidate before `expires_at`, contradicting the TTL-based invalidation semantics.
    Resolution: `scripts/validate_contracts.py` and `northbound_api_and_session_contract.md` now require expired cursors to invalidate on or after `expires_at`.
290. `ActorSession.expires_at` could predate or equal `issued_at`.
    Resolution: `scripts/validate_contracts.py` now enforces `issued_at < expires_at`.
291. `ActorSession.revoked_at`, `last_seen_at`, or `step_up_completed_at` could predate `issued_at`, or `step_up_completed_at` could exceed `expires_at`.
    Resolution: `scripts/validate_contracts.py` and `northbound_api_and_session_contract.md` now enforce monotonic session timestamps.
292. `ActorSession.last_seen_at` could continue after `revoked_at`, implying live session activity after revocation.
    Resolution: `scripts/validate_contracts.py` now rejects revoked sessions whose `last_seen_at` exceeds `revoked_at`.
293. `ActorSession.device_binding_state = INVALIDATED` could persist without an explicit revocation timestamp.
    Resolution: `schemas/actor_session.schema.json`, `scripts/validate_contracts.py`, `northbound_api_and_session_contract.md`, and `data_model.md` now require `revoked_at` when device binding is invalidated.
294. Interactive `ActorSession` records (`BROWSER`, `NATIVE`) could still resolve to non-human principal classes.
    Resolution: `schemas/actor_session.schema.json`, `scripts/validate_contracts.py`, `northbound_api_and_session_contract.md`, and `data_model.md` now require interactive sessions to stay `principal_class = HUMAN`.
295. `PrincipalContext.requested_scope[]` could still persist non-canonical scope ordering.
    Resolution: `scripts/validate_contracts.py` now applies canonical scope-order validation to `PrincipalContext.requested_scope[]`.
296. Service `PrincipalContext` records could still carry human authentication or assurance posture.
    Resolution: `schemas/principal_context.schema.json`, `scripts/validate_contracts.py`, `actor_and_authority_model.md`, and `data_model.md` now force service contexts to keep `authn_level = BASIC` and `subject_identity_assurance_level = UNVERIFIED`.
297. Service `PrincipalContext` records could still carry human delegation bases such as `CLIENT_GRANTED` or `SELF_ACTING`.
    Resolution: `schemas/principal_context.schema.json`, `scripts/validate_contracts.py`, and `actor_and_authority_model.md` now restrict service delegation bases to `{TENANT_INTERNAL, SYSTEM_ASSIGNED}`.
298. Service `PrincipalContext` records could still advertise human approval or client-portal capabilities.
    Resolution: `schemas/principal_context.schema.json`, `scripts/validate_contracts.py`, `actor_and_authority_model.md`, and `data_model.md` now force empty approval and client-portal capability sets for service principals.
299. Client-acting delegation bases (`SELF_ACTING`, `CLIENT_GRANTED`, `SELF_ASSESSMENT_IMPORTED`, `DIGITAL_HANDSHAKE`) could serialize with empty `client_scope[]`.
    Resolution: `schemas/principal_context.schema.json`, `scripts/validate_contracts.py`, and `actor_and_authority_model.md` now require non-empty `client_scope[]` for client-acting delegation.
300. `PrincipalContext.client_portal_capabilities[]` could appear on non-human principals or with no bound client scope.
    Resolution: `schemas/principal_context.schema.json`, `scripts/validate_contracts.py`, and `data_model.md` now require a human principal plus non-empty `client_scope[]` whenever portal capabilities are present.
301. `PrincipalContext.authority_link_refs[]` could survive without matching frozen `authority_link_snapshot_refs[]`, weakening replay-safe authorization lineage.
    Resolution: `schemas/principal_context.schema.json`, `scripts/validate_contracts.py`, and `actor_and_authority_model.md` now require non-empty authority-link snapshot lineage whenever authority-link refs are frozen into the context.

## Client document request lineage hardening

302. `ClientDocumentRequest.latest_upload_ref` could point at an upload that was not listed in `upload_refs[]`, allowing request history to drift away from the authoritative upload set.
    Resolution: `scripts/validate_contracts.py` now requires `latest_upload_ref` to resolve to one entry in `upload_refs[]`.
303. `ClientDocumentRequest.latest_upload_ref` could remain non-null while `upload_refs[]` was empty, creating a dangling primary-upload pointer.
    Resolution: `schemas/client_document_request.schema.json` and `scripts/validate_contracts.py` now require a non-empty `upload_refs[]` set whenever `latest_upload_ref` is present.
304. `ClientDocumentRequest.lifecycle_state = WITHDRAWN` could still serialize historical `upload_refs[]` even though the state machine only allows withdrawal directly from `OPEN`.
    Resolution: `schemas/client_document_request.schema.json` and `scripts/validate_contracts.py` now force withdrawn requests to clear `upload_refs[]`.
305. `ClientDocumentRequest.lifecycle_state = WITHDRAWN` could still retain `latest_upload_ref`, leaving a pseudo-current upload on a withdrawn request.
    Resolution: `schemas/client_document_request.schema.json` and `scripts/validate_contracts.py` now force withdrawn requests to clear `latest_upload_ref`.
306. `ClientDocumentRequest.lifecycle_state = EXPIRED` could omit `due_at`, even though expiry is only reachable through due-window exhaustion.
    Resolution: `schemas/client_document_request.schema.json` and `scripts/validate_contracts.py` now require non-null `due_at` for expired requests.
307. Active upload-bearing request states (`UPLOAD_IN_PROGRESS`, `SUBMITTED`, `UNDER_REVIEW`, `ACCEPTED`, `REJECTED`) had no custom-validator backstop for missing `upload_refs[]`.
    Resolution: `scripts/validate_contracts.py` now rejects those states when `upload_refs[]` is empty.
308. The same active request states had no custom-validator backstop for missing `latest_upload_ref`, so partial or regressed payloads could slip past the regression suite.
    Resolution: `scripts/validate_contracts.py` now rejects upload-bearing states that clear `latest_upload_ref`.
309. The validator suite had no request-specific regression case for upload-membership drift between `latest_upload_ref` and `upload_refs[]`.
    Resolution: `scripts/validate_contracts.py` now includes a self-test for request/upload lineage membership drift.
310. The validator suite had no request-specific regression case for withdrawn upload leakage or expiry without a due-window anchor.
    Resolution: `scripts/validate_contracts.py` now includes self-tests for withdrawn-state upload reset and expired-state `due_at` requirements.
311. The forensic contract guard did not assert the new reverse and terminal-state guards for `ClientDocumentRequest`.
    Resolution: `tools/forensic_contract_guard.py` now asserts non-null latest-upload backstops, empty-upload reverse nulling, withdrawn upload reset, and expired-state `due_at` enforcement.

## Release and resilience evidence hardening

312. `BuildArtifact.distribution_targets[]` could serialize in arbitrary order, causing candidate identity and release evidence hashes to drift across equivalent builds.
    Resolution: `scripts/validate_contracts.py`, `deployment_and_resilience_contract.md`, and `data_model.md` now require canonical frozen distribution-target ordering.
313. `VerificationSuiteResult.enabled_provider_profile_refs[]` could serialize in arbitrary order, weakening exact-candidate identity stability across reruns.
    Resolution: `scripts/validate_contracts.py` and `data_model.md` now require canonical sorted provider-profile ordering.
314. `VerificationSuiteResult.test_run_identifiers[]` could serialize in arbitrary order, making equivalent suite evidence hash differently.
    Resolution: `scripts/validate_contracts.py` and `data_model.md` now require canonical sorted test-run ordering.
315. `VerificationSuiteResult.suite_family = MIGRATION_VERIFICATION` could omit `migration_plan_ref`, severing the suite from the migration plan it claimed to validate.
    Resolution: `schemas/verification_suite_result.schema.json`, `scripts/validate_contracts.py`, `tools/forensic_contract_guard.py`, and `data_model.md` now require a non-null migration plan for migration-verification suites.
316. `DeploymentRelease.rollout_strategy = PIN_BASELINE` could drift onto non-`PINNED` rollout states or carry a canary fraction.
    Resolution: `schemas/deployment_release.schema.json`, `scripts/validate_contracts.py`, `tools/forensic_contract_guard.py`, `deployment_and_resilience_contract.md`, and `data_model.md` now force baseline pins onto `PINNED` posture with no canary fraction.
317. `DeploymentRelease.rollout_strategy = FAIL_FORWARD_COMPENSATING` could serialize under non-`FAILED_FORWARD` rollout states.
    Resolution: `schemas/deployment_release.schema.json`, `scripts/validate_contracts.py`, `tools/forensic_contract_guard.py`, and `deployment_and_resilience_contract.md` now bind compensating releases to `FAILED_FORWARD`.
318. `DeploymentRelease.rollout_state = ABORTED` could serialize without standard-canary posture, without the actual aborted canary fraction, or without red health state.
    Resolution: `schemas/deployment_release.schema.json`, `scripts/validate_contracts.py`, `tools/forensic_contract_guard.py`, and `deployment_and_resilience_contract.md` now require standard-canary abort posture, retained canary fraction, and red health gates.
319. `DeploymentRelease.rollback_of_release_id` could self-reference `release_id`, collapsing rollback lineage into a one-node loop.
    Resolution: `scripts/validate_contracts.py` and `data_model.md` now reject self-rollback lineage.
320. `DeploymentRelease.emergency_override_ref` and `emergency_override_expires_at` could appear on non-emergency promotions, and override expiry could predate deployment.
    Resolution: `schemas/deployment_release.schema.json`, `scripts/validate_contracts.py`, `tools/forensic_contract_guard.py`, `deployment_and_resilience_contract.md`, and `data_model.md` now restrict override refs to `EMERGENCY_PROMOTE` and require post-deploy expiry.
321. Terminal served release states (`CANARY`, `PROMOTED`, `FAILED_FORWARD`, `PINNED`, `ABORTED`, `ROLLED_BACK`) could still clear `deployed_at`.
    Resolution: `scripts/validate_contracts.py` and `data_model.md` now require non-null deployment timestamps for terminal served states not already fully covered by schema.
322. `CanaryHealthSummary.health_gate_state = AMBER` could serialize while both budgets remained within budget.
    Resolution: `schemas/canary_health_summary.schema.json`, `scripts/validate_contracts.py`, `tools/forensic_contract_guard.py`, and `data_model.md` now require at least one breached budget for AMBER posture.
323. `CanaryHealthSummary` could keep both budgets `WITHIN_BUDGET` while publishing non-`GREEN` health posture.
    Resolution: `schemas/canary_health_summary.schema.json`, `scripts/validate_contracts.py`, `tools/forensic_contract_guard.py`, and `data_model.md` now force all-within-budget posture back to `GREEN`.
324. `CanaryHealthSummary` could publish dual budget breaches without forcing red abort posture.
    Resolution: `schemas/canary_health_summary.schema.json`, `scripts/validate_contracts.py`, `tools/forensic_contract_guard.py`, and `data_model.md` now force dual breaches to `RED` plus `abort_recommended = true`.
325. `RestoreDrillResult` could serialize `FAILED` or `QUARANTINED` while still claiming every verification basis succeeded.
    Resolution: `schemas/restore_drill_result.schema.json`, `scripts/validate_contracts.py`, `tools/forensic_contract_guard.py`, and `data_model.md` now require all-true verification posture to collapse back to `PASSED`.
326. `RestoreDrillResult.failure_reason_codes[]` could serialize in arbitrary order, creating unstable failure-evidence identity.
    Resolution: `scripts/validate_contracts.py` and `data_model.md` now require canonical sorted failure-reason ordering.
327. `ReleaseVerificationManifest.decision_changed_at` could predate `created_at` or the latest blocking-gate evidence used by the decision.
    Resolution: `scripts/validate_contracts.py` and `data_model.md` now enforce forward-only decision chronology against manifest creation and gate execution time.
328. A `ReleaseVerificationManifest` blocking gate could still serialize as `GREEN` while being inadmissible, quarantined, or manually waived.
    Resolution: `schemas/release_verification_manifest.schema.json`, `scripts/validate_contracts.py`, `tools/forensic_contract_guard.py`, `verification_and_release_gates.md`, and `data_model.md` now force green gates to remain admissible, unquarantined, and unwaived.
329. `ReleaseVerificationManifest.restore_drill_ref` and `restore_checkpoint_ref` could drift apart, leaving restore evidence half-bound.
    Resolution: `schemas/release_verification_manifest.schema.json`, `scripts/validate_contracts.py`, `tools/forensic_contract_guard.py`, `verification_and_release_gates.md`, and `data_model.md` now require restore drill and checkpoint refs to travel together.
330. `ReleaseVerificationManifest` could mark the performance/canary, restore-drill, or operator-client gates `GREEN` while omitting the corresponding first-class evidence artifacts.
    Resolution: `scripts/validate_contracts.py`, `verification_and_release_gates.md`, and `data_model.md` now require green gate posture to keep `canary_summary_ref`, restore evidence, and `client_compatibility_matrix_ref` respectively.
331. `ReleaseVerificationManifest.superseded_by_verification_manifest_ref` could self-reference `verification_manifest_id`, and candidate identity arrays could serialize in non-canonical order.
    Resolution: `scripts/validate_contracts.py`, `deployment_and_resilience_contract.md`, and `data_model.md` now reject self-supersession and enforce canonical ordering for provider-profile, executed test-run, and migration-ledger arrays.

## Release control-plane and key-rotation hardening

332. `GateAdmissibilityRecord.suite_family = MIGRATION_VERIFICATION` could omit `migration_plan_ref`, severing admissibility from the migration plan it claimed to judge.
    Resolution: `schemas/gate_admissibility_record.schema.json`, `scripts/validate_contracts.py`, `tools/forensic_contract_guard.py`, `verification_and_release_gates.md`, and `data_model.md` now require a non-null migration plan for migration admissibility records.
333. `GateAdmissibilityRecord.suite_family = OPERATOR_CLIENT` could omit `supported_client_window_ref`, weakening the exact compatibility window binding used for promotion.
    Resolution: `schemas/gate_admissibility_record.schema.json`, `scripts/validate_contracts.py`, `tools/forensic_contract_guard.py`, `verification_and_release_gates.md`, and `data_model.md` now require a non-null supported-client window for operator-client admissibility records.
334. Failed admissibility dimensions (`candidate_identity_match`, `freshness_verified`, `contract_window_consistent`, `rerun_scope_preserved`) could still serialize as admissible or with no explicit reasons.
    Resolution: `schemas/gate_admissibility_record.schema.json`, `scripts/validate_contracts.py`, and `tools/forensic_contract_guard.py` now force failed dimensions to `INADMISSIBLE` with reason codes.
335. Non-empty `GateAdmissibilityRecord.reason_codes[]` could still serialize under `admissibility_state = ADMISSIBLE`.
    Resolution: `schemas/gate_admissibility_record.schema.json` and `scripts/validate_contracts.py` now force non-empty reasons back to `INADMISSIBLE`.
336. `ClientCompatibilityMatrix.browser_rows[]` or `macos_rows[]` could duplicate the same `client_version` / `scenario` pair, making platform coverage ambiguous.
    Resolution: `scripts/validate_contracts.py` and `data_model.md` now reject duplicate platform/scenario rows.
337. A tested client family in `ClientCompatibilityMatrix` could omit one of the two required compatibility scenarios, leaving the rollback-safe or oldest-supported edge unproven.
    Resolution: `scripts/validate_contracts.py`, `verification_and_release_gates.md`, and `data_model.md` now require both compatibility scenarios for every populated platform row set.
338. `ClientCompatibilityMatrix.matrix_state = RED` could serialize without any incompatible rows.
    Resolution: `schemas/client_compatibility_matrix.schema.json`, `scripts/validate_contracts.py`, `tools/forensic_contract_guard.py`, and `verification_and_release_gates.md` now require red posture to be backed by at least one incompatible row.
339. `RecoveryCheckpoint.restore_drill_ref`, `restore_tested_at`, and `restore_verification_hash` could drift apart, leaving half-bound restore evidence.
    Resolution: `schemas/recovery_checkpoint.schema.json`, `scripts/validate_contracts.py`, `tools/forensic_contract_guard.py`, and `data_model.md` now require those restore-evidence fields to travel together.
340. `RecoveryCheckpoint.checkpoint_state = VERIFIED` could omit `privacy_reconciliation_outcome_ref`, allowing restore evidence to claim success before privacy reconciliation was proven.
    Resolution: `schemas/recovery_checkpoint.schema.json`, `scripts/validate_contracts.py`, `tools/forensic_contract_guard.py`, `deployment_and_resilience_contract.md`, and `data_model.md` now require privacy reconciliation evidence for verified checkpoints.
341. `RecoveryCheckpoint.checkpoint_state = QUARANTINED` could omit `restore_verification_hash`, losing the exact failing drill basis that caused quarantine.
    Resolution: `schemas/recovery_checkpoint.schema.json`, `scripts/validate_contracts.py`, `tools/forensic_contract_guard.py`, and `data_model.md` now require quarantined checkpoints to retain the failing restore-verification hash.
342. `RecoveryCheckpoint.restore_tested_at` could predate `snapshot_time`, inverting restore chronology.
    Resolution: `scripts/validate_contracts.py` and `deployment_and_resilience_contract.md` now enforce forward-only checkpoint chronology.
343. `SchemaMigrationLedger.contract_phase_required = false` could still drift into `CONTRACTING` or `CONTRACTED`.
    Resolution: `schemas/schema_migration_ledger.schema.json`, `scripts/validate_contracts.py`, `tools/forensic_contract_guard.py`, `deployment_and_resilience_contract.md`, and `data_model.md` now exclude contract-phase states for optional-contract migrations.
344. `SchemaMigrationLedger.verified_at` could appear on pre-verification states, or `verified_at` could predate `applied_at`.
    Resolution: `schemas/schema_migration_ledger.schema.json`, `scripts/validate_contracts.py`, and `tools/forensic_contract_guard.py` now bind `verified_at` to post-verification phases and enforce forward chronology.
345. `SchemaMigrationLedger.failure_ref` and `halted_subphase` could leak onto impossible states, and `FAILED` migrations could still retain halt posture.
    Resolution: `schemas/schema_migration_ledger.schema.json`, `scripts/validate_contracts.py`, and `tools/forensic_contract_guard.py` now confine failure/halt evidence to legal states and clear halt posture from `FAILED`.
346. `SecretVersion.rotation_state = RETIRED` could omit `rotation_started_at`, breaking the cutover lineage required by the state machine.
    Resolution: `schemas/secret_version.schema.json`, `scripts/validate_contracts.py`, `tools/forensic_contract_guard.py`, `security_and_runtime_hardening_contract.md`, and `data_model.md` now require retired versions to retain `rotation_started_at`.
347. `SecretVersion` chronology could invert across issuance, attestation, activation, rotation, retirement, historical-read window, or revocation.
    Resolution: `scripts/validate_contracts.py` and `security_and_runtime_hardening_contract.md` now enforce forward-only secret-version chronology.
348. `SecretVersion` could serialize revoked, retired, or supersession fields under the wrong `rotation_state`, and `superseded_by_secret_version_id` could self-reference `secret_version_id`.
    Resolution: `schemas/secret_version.schema.json`, `scripts/validate_contracts.py`, and `tools/forensic_contract_guard.py` now bind state-specific fields back to `REVOKED` or `RETIRED` posture and reject self-supersession.

## Retention and remediation hardening

349. `RetentionTag.minimum_expiry_at` could predate `anchor_timestamp`, allowing the retained baseline to expire before the anchor event it claimed to measure from.
    Resolution: `scripts/validate_contracts.py`, `retention_error_and_observability_contract.md`, `retention_and_privacy.md`, and `data_model.md` now enforce forward-only anchor-to-expiry chronology.
350. `RetentionTag.policy_expiry_at` could predate `anchor_timestamp`, creating a policy horizon that ran backward past the retained basis event.
    Resolution: `scripts/validate_contracts.py`, `retention_error_and_observability_contract.md`, `retention_and_privacy.md`, and `data_model.md` now require policy expiry to remain on or after the anchor timestamp.
351. `RetentionTag.effective_expiry_at` could predate `minimum_expiry_at` or `policy_expiry_at`, letting the operative retention deadline undercut one of its own retained bases.
    Resolution: `scripts/validate_contracts.py`, `retention_error_and_observability_contract.md`, and `retention_and_privacy.md` now require effective expiry to stay greater than or equal to both retained basis timestamps.
352. `RetentionTag.erasure_decided_at` or `legal_hold_changed_at` could predate `anchor_timestamp`, inverting the causal order of retention decisions.
    Resolution: `scripts/validate_contracts.py`, `retention_error_and_observability_contract.md`, and `retention_and_privacy.md` now enforce anchor-first retention chronology.
353. `RetentionTag.legal_hold_ref` or `legal_hold_changed_at` could appear while `legal_hold_state = NONE`, leaving legal-hold lineage half-bound.
    Resolution: `scripts/validate_contracts.py`, `tools/forensic_contract_guard.py`, `retention_error_and_observability_contract.md`, `retention_and_privacy.md`, and `data_model.md` now keep legal-hold lineage aligned with non-`NONE` hold states in both directions.
354. `RetentionTag.proof_preservation_basis_ref` or `authority_ambiguity_ref` could drift away from `erasure_eligibility`, weakening the exact reason an object remained non-erasable.
    Resolution: `scripts/validate_contracts.py`, `tools/forensic_contract_guard.py`, `retention_error_and_observability_contract.md`, `retention_and_privacy.md`, and `data_model.md` now bind those basis refs to `BLOCKED_PROOF_PRESERVATION` and `BLOCKED_AUTHORITY_AMBIGUITY` respectively.
355. `ArtifactRetention.hold_ref` could escape the `LEGAL_HOLD` lifecycle, making hold posture look optional instead of state-owning.
    Resolution: `scripts/validate_contracts.py`, `tools/forensic_contract_guard.py`, `retention_error_and_observability_contract.md`, `retention_and_privacy.md`, and `data_model.md` now force non-null `hold_ref` back to `LEGAL_HOLD`.
356. `ArtifactRetention.next_checkpoint_at` or `workflow_item_refs[]` could leak onto non-pending lifecycle states or predate `state_changed_at`, obscuring which objects still needed retention follow-up.
    Resolution: `scripts/validate_contracts.py`, `tools/forensic_contract_guard.py`, `retention_error_and_observability_contract.md`, `retention_and_privacy.md`, and `data_model.md` now confine pending follow-up markers to `LEGAL_HOLD` and `ERASURE_PENDING` and enforce forward checkpoint chronology.
357. `ArtifactRetention.limitation_behavior` or `limitation_reason_codes[]` could appear outside `LIMITED` or `PSEUDONYMISED`, turning limitation posture into ambient metadata rather than a governed state.
    Resolution: `scripts/validate_contracts.py`, `tools/forensic_contract_guard.py`, `retention_error_and_observability_contract.md`, `retention_and_privacy.md`, and `data_model.md` now bind limitation refs to limited lifecycle states.
358. `ArtifactRetention.erasure_request_ref`, `erasure_action_ref`, or `erasure_proof_ref` could appear on non-erasure lifecycle states, leaving request, action, and proof lineage detached from actual erasure posture.
    Resolution: `scripts/validate_contracts.py`, `tools/forensic_contract_guard.py`, `retention_error_and_observability_contract.md`, `retention_and_privacy.md`, and `data_model.md` now keep erasure lineage limited to `ERASURE_PENDING`, `PSEUDONYMISED`, and `ERASED` as applicable.
359. `ArtifactRetention.last_evaluated_at` or `effective_expiry_at` could invert chronology against `state_changed_at`, `minimum_expiry_at`, or `policy_expiry_at`.
    Resolution: `scripts/validate_contracts.py`, `retention_error_and_observability_contract.md`, `retention_and_privacy.md`, and `data_model.md` now enforce forward-only lifecycle and expiry chronology.
360. `ErrorRecord` could serialize `blocking_class = NON_BLOCKING` while still carrying a blocked `blocking_effects[]` entry.
    Resolution: `schemas/error_record.schema.json`, `scripts/validate_contracts.py`, `tools/forensic_contract_guard.py`, `error_model_and_remediation_model.md`, and `data_model.md` now reject blocked effects under non-blocking posture.
361. Automatic retry states in `ErrorRecord` could omit `next_retry_at`, leaving retry posture declared but unschedulable.
    Resolution: `schemas/error_record.schema.json`, `scripts/validate_contracts.py`, `tools/forensic_contract_guard.py`, and `error_model_and_remediation_model.md` now require `next_retry_at` for scheduled automatic retry classes.
362. `ErrorRecord.retry_class = RECONCILE_THEN_RETRY` or `REBUILD_THEN_RETRY` could omit `retry_precondition_refs[]`, allowing gated retries to run without explicit prerequisite artifacts.
    Resolution: `schemas/error_record.schema.json`, `scripts/validate_contracts.py`, `tools/forensic_contract_guard.py`, `error_model_and_remediation_model.md`, and `data_model.md` now require non-empty retry preconditions for reconcile/rebuild retry posture.
363. `ErrorRecord` chronology could invert across `first_seen_at`, `opened_at`, `last_seen_at`, `resolved_at`, `escalated_at`, and `next_retry_at`.
    Resolution: `scripts/validate_contracts.py`, `retention_error_and_observability_contract.md`, `error_model_and_remediation_model.md`, and `data_model.md` now enforce forward-only error chronology.
364. `ErrorRecord.accepted_risk_approval_ref` or `accepted_risk_expires_at` could appear away from `resolution_state = ACCEPTED_RISK`.
    Resolution: `schemas/error_record.schema.json`, `scripts/validate_contracts.py`, `tools/forensic_contract_guard.py`, `retention_error_and_observability_contract.md`, `error_model_and_remediation_model.md`, and `data_model.md` now keep accepted-risk lineage exclusive to accepted-risk resolution posture.
365. `ErrorRecord.resolved_by_task_id` or `reopened_by_error_id` could appear on still-open error states, falsely implying resolution or historical closure.
    Resolution: `schemas/error_record.schema.json`, `scripts/validate_contracts.py`, `tools/forensic_contract_guard.py`, `error_model_and_remediation_model.md`, and `data_model.md` now confine those refs to monitoring or terminal resolution states.
366. `ErrorRecord.caused_by_error_id` or `reopened_by_error_id` could self-reference `error_id`, creating cyclic single-record lineage.
    Resolution: `scripts/validate_contracts.py` now rejects self-referential causal or reopen lineage in `ErrorRecord`.
367. `CompensationRecord.compensated_at` could predate `created_at`, inverting the settlement timeline.
    Resolution: `scripts/validate_contracts.py`, `retention_error_and_observability_contract.md`, `error_model_and_remediation_model.md`, and `data_model.md` now enforce forward-only compensation chronology.
368. `CompensationRecord.verification_ref` or `superseded_by_compensation_id` could drift from `compensation_status`, and `superseded_by_compensation_id` could self-reference `compensation_id`.
    Resolution: `schemas/compensation_record.schema.json`, `scripts/validate_contracts.py`, `tools/forensic_contract_guard.py`, `retention_error_and_observability_contract.md`, `error_model_and_remediation_model.md`, and `data_model.md` now bind verification/supersession lineage back to status and reject self-supersession.

## Authority calculation and binding hardening

369. `AuthorityCalculationRequest.live_authority_call_executed = false` could still retain `authority_operation_ref`, leaving a modeled calculation half-bound to live authority lineage.
    Resolution: `schemas/authority_calculation_request.schema.json`, `scripts/validate_contracts.py`, `tools/forensic_contract_guard.py`, `authority_calculation_contract.md`, and `data_model.md` now clear `authority_operation_ref` on modeled requests.
370. `AuthorityCalculationRequest.runtime_scope[]` could serialize in non-canonical order, weakening request identity and replay stability.
    Resolution: `scripts/validate_contracts.py`, `authority_calculation_contract.md`, and `data_model.md` now require canonical scope-token ordering.
371. `AuthorityCalculationRequest.runtime_scope[]` could leak `submit` or `amendment_submit`, letting a calculation handshake masquerade as live transmit scope.
    Resolution: `schemas/authority_calculation_request.schema.json`, `scripts/validate_contracts.py`, `tools/forensic_contract_guard.py`, `authority_calculation_contract.md`, and `data_model.md` now exclude live submit tokens from calculation requests.
372. `AuthorityCalculationRequest.calculation_type = intent-to-amend` could still carry `prepare_submission`, or non-amendment calculation types could still carry `amendment_intent`.
    Resolution: `schemas/authority_calculation_request.schema.json`, `scripts/validate_contracts.py`, `tools/forensic_contract_guard.py`, `authority_calculation_contract.md`, and `data_model.md` now enforce exact amendment-vs-filing calculation scope posture.
373. `AuthorityCalculationResult.result_state = MODELED` could still serialize `validation_outcome = PASS`, overstating a non-live calculation as authority-cleared.
    Resolution: `schemas/authority_calculation_result.schema.json`, `scripts/validate_contracts.py`, `tools/forensic_contract_guard.py`, `authority_calculation_contract.md`, and `data_model.md` now reject `PASS` for modeled results.
374. `AuthorityCalculationResult.reason_codes[]` could serialize in arbitrary order, weakening replay-stable modeled-block and review lineage.
    Resolution: `scripts/validate_contracts.py` and `authority_calculation_contract.md` now require canonical sorted reason-code ordering.
375. `AuthorityCalculationResult.superseded_at` could predate `retrieved_at`, inverting calculation supersession chronology.
    Resolution: `scripts/validate_contracts.py` and `authority_calculation_contract.md` now enforce forward-only retrieval-to-supersession timing.
376. `CalculationBasis.parity_reusable` or `filing_reusable` could stay true on `PROVISIONAL`, `REJECTED`, or `SUPERSEDED` bases, leaking reusable posture onto non-current or non-accepted basis state.
    Resolution: `schemas/calculation_basis.schema.json`, `scripts/validate_contracts.py`, `tools/forensic_contract_guard.py`, `authority_calculation_contract.md`, and `data_model.md` now reserve reusable posture for `basis_status = CONFIRMED`.
377. `CalculationBasis.superseded_at` could appear away from `basis_status = SUPERSEDED`.
    Resolution: `schemas/calculation_basis.schema.json`, `scripts/validate_contracts.py`, `tools/forensic_contract_guard.py`, and `authority_calculation_contract.md` now bind non-null `superseded_at` back to `SUPERSEDED`.
378. `CalculationBasis.captured_at`, `confirmed_at`, and `superseded_at` could run backward.
    Resolution: `scripts/validate_contracts.py` and `authority_calculation_contract.md` now enforce forward-only basis chronology.
379. `CalculationBasis.reason_codes[]` could serialize in arbitrary order, weakening deterministic rejection and supersession rationale.
    Resolution: `scripts/validate_contracts.py` and `authority_calculation_contract.md` now require canonical sorted reason-code ordering for calculation bases.
380. `CalculationUserConfirmation.confirmation_state = CONFIRMED` could still retain `reason_codes[]`, or non-empty `reason_codes[]` could drift off `DECLINED`.
    Resolution: `schemas/calculation_user_confirmation.schema.json`, `scripts/validate_contracts.py`, `tools/forensic_contract_guard.py`, `authority_calculation_contract.md`, and `data_model.md` now keep decline reasons exclusive to `DECLINED`.
381. `CalculationUserConfirmation.reason_codes[]` could serialize in arbitrary order.
    Resolution: `scripts/validate_contracts.py` and `authority_calculation_contract.md` now require canonical sorted decline-reason ordering.
382. `AuthorityBinding.binding_health` could drift from `token_client_binding_state`, allowing healthy/expiring bindings to remain unverified or mismatch posture to lose its exact cause.
    Resolution: `schemas/authority_binding.schema.json`, `scripts/validate_contracts.py`, `tools/forensic_contract_guard.py`, `authority_interaction_protocol.md`, and `data_model.md` now align binding-health and token-client-binding posture in both directions.
383. `AuthorityBinding.binding_health in {EXPIRING_SOON, EXPIRED}` could omit `expires_at`, or an `EXPIRED` binding could claim expiry after `binding_resolved_at`.
    Resolution: `schemas/authority_binding.schema.json`, `scripts/validate_contracts.py`, `tools/forensic_contract_guard.py`, and `authority_interaction_protocol.md` now require explicit expiry posture and enforce expired-binding chronology.
384. `AuthorityBinding.acting_party_ref` could differ from `subject_ref` while `delegation_grant_ref` remained null, leaving delegated authority execution unbound.
    Resolution: `scripts/validate_contracts.py`, `authority_interaction_protocol.md`, and `data_model.md` now require explicit delegation lineage whenever the acting party differs from the subject.
385. `AuthorityBinding.partition_scope_refs[]` or `blocked_reason_codes[]` could serialize in arbitrary order, weakening replay-stable binding identity and blocked posture.
    Resolution: `scripts/validate_contracts.py` and `data_model.md` now require canonical ordering for binding partition-scope and blocked-reason arrays.

## Amendment and drift hardening

386. `DriftBaselineEnvelope.baseline_type` and `baseline_submission_state` could drift apart, letting the frozen baseline claim a different legal posture than its own type.
    Resolution: `schemas/drift_baseline_envelope.schema.json`, `scripts/validate_contracts.py`, `tools/forensic_contract_guard.py`, `amendment_and_drift_semantics.md`, `modules.md`, and `data_model.md` now bind baseline type and submission state together.
387. `DriftBaselineEnvelope.baseline_type = OUT_OF_BAND` could still retain `baseline_manifest_id`, or authority-grounded envelopes could omit `authority_basis_refs[]`.
    Resolution: `schemas/drift_baseline_envelope.schema.json`, `scripts/validate_contracts.py`, `tools/forensic_contract_guard.py`, and `amendment_and_drift_semantics.md` now keep out-of-band baselines off the internal manifest chain and require explicit authority basis lineage where authority truth is claimed.
388. `DriftBaselineEnvelope.superseded_by_baseline_envelope_id` could self-reference or drift away from `superseded_at`, and supersession could predate the baseline effective time.
    Resolution: `schemas/drift_baseline_envelope.schema.json`, `scripts/validate_contracts.py`, and `tools/forensic_contract_guard.py` now pair supersession fields, reject self-supersession, and enforce forward chronology.
389. `AmendmentWindowContext.eligible_scope_refs[]` or `blocked_scope_refs[]` could escape `scope_refs[]` or overlap, leaving exact-scope eligibility classification contradictory.
    Resolution: `scripts/validate_contracts.py`, `amendment_and_drift_semantics.md`, and `modules.md` now require eligible/blocked scope refs to stay within the exact scope and remain disjoint.
390. Open or closed `AmendmentWindowContext` objects could leave some scope refs unclassified, or `eligible_scope_refs[]` could remain populated away from `window_state = OPEN`.
    Resolution: `schemas/amendment_window_context.schema.json`, `scripts/validate_contracts.py`, `tools/forensic_contract_guard.py`, `amendment_and_drift_semantics.md`, and `modules.md` now make exact-scope classification complete for proved open/closed contexts and force non-empty eligibility back to `OPEN`.
391. `AmendmentWindowContext` chronology could invert across final-declaration confirmation, open/close times, evaluation time, and stale-after time, and a context could remain `OPEN` after it had already closed.
    Resolution: `scripts/validate_contracts.py`, `amendment_and_drift_semantics.md`, and `modules.md` now enforce forward-only window chronology and reject stale open posture.
392. `RetroactiveImpactAnalysis.restatement_required = false` could still retain `restatement_scope_refs[]`, or non-empty `restatement_scope_refs[]` could drift away from `restatement_required = true`.
    Resolution: `schemas/retroactive_impact_analysis.schema.json`, `tools/forensic_contract_guard.py`, and `scripts/validate_contracts.py` now keep restatement scope and restatement posture aligned in both directions.
393. `RetroactiveImpactAnalysis.restatement_scope_refs[]` could escape `impacted_scope_refs[]`, weakening bounded retroactivity.
    Resolution: `scripts/validate_contracts.py`, `amendment_and_drift_semantics.md`, and `modules.md` now require restatement scope to stay within explicitly impacted scope.
394. `RetroactiveImpactAnalysis.bounded_retroactivity_class = NONE` could still retain replay, impacted submissions, or restatement posture.
    Resolution: `schemas/retroactive_impact_analysis.schema.json`, `tools/forensic_contract_guard.py`, and `scripts/validate_contracts.py` now collapse no-retroactivity posture back to empty impact and `replay_requirement = NONE`.
395. `RetroactiveImpactAnalysis.bounded_retroactivity_class = CURRENT_SCOPE_ONLY` could still retain prior `impacted_submission_refs[]`, reopening historical filings by implication.
    Resolution: `scripts/validate_contracts.py`, `amendment_and_drift_semantics.md`, and `modules.md` now keep current-scope-only retroactivity off prior submission lineage.
396. Contradictory or authority-reconciliation retroactivity could serialize without reconcile-first replay posture.
    Resolution: `schemas/retroactive_impact_analysis.schema.json`, `scripts/validate_contracts.py`, `tools/forensic_contract_guard.py`, and `amendment_and_drift_semantics.md` now force contradiction-driven retroactivity into reconciliation-first replay.
397. `RetroactiveImpactAnalysis` chronology could invert across `earliest_affected_effective_at` and `latest_affected_effective_at`.
    Resolution: `scripts/validate_contracts.py` and `amendment_and_drift_semantics.md` now enforce forward-only retroactive impact chronology.
398. `AmendmentCase.supersedes_amendment_case_id` could self-reference `amendment_case_id`, undermining same-scope supersession lineage.
    Resolution: `scripts/validate_contracts.py` and `modules.md` now reject self-superseding amendment cases.
399. `AmendmentCase.freshness_state` could remain `FRESH` or `STALE` before readiness existed or after the case was superseded.
    Resolution: `scripts/validate_contracts.py` now confine non-`NOT_APPLICABLE` freshness posture to readiness-bearing amendment states.
400. `AmendmentCase.escalation_state` could drift away from `review_state = REVIEW_OPEN`, or superseded cases could still retain open review posture.
    Resolution: `scripts/validate_contracts.py` and `amendment_and_drift_semantics.md` now keep escalation bound to open review and clear open-review posture from superseded cases.
401. `AmendmentCase.READY_TO_AMEND` could omit fresh calculation lineage or still carry a blocking validation outcome, and `INTENT_SUBMITTED` could drift away from the intent-to-amend calculation path.
    Resolution: `schemas/amendment_case.schema.json`, `scripts/validate_contracts.py`, `tools/forensic_contract_guard.py`, `amendment_and_drift_semantics.md`, and `modules.md` now require exact calculation/readiness lineage for ready or intent-submitted cases.
402. Bundle-backed amendment states could omit `current_bundle_ref`, or `current_bundle_ref` could leak onto pre-bundle lifecycle states.
    Resolution: `schemas/amendment_case.schema.json`, `scripts/validate_contracts.py`, and `tools/forensic_contract_guard.py` now confine bundle refs to bundle-backed amendment states in both directions.
403. Active `AmendmentBundle` states could omit the frozen retroactive-impact, window-context, basis, confirmation, authority-profile, payload, or packet lineage; superseded bundles could also drift away from `superseded_at`, self-supersede, or run chronology backward.
    Resolution: `schemas/amendment_bundle.schema.json`, `scripts/validate_contracts.py`, `tools/forensic_contract_guard.py`, `amendment_and_drift_semantics.md`, `modules.md`, and `data_model.md` now require the full active bundle lineage, pair `superseded_at` with `SUPERSEDED`, reject self-supersession, and enforce forward chronology.

## Low-noise and governance scoring hardening

404. `ExperienceDelta.attention_policy` could publish a dominant issue without frozen rank scores or a machine-checkable dominance margin, leaving live salience partially heuristic.
    Resolution: `schemas/experience_delta.schema.json`, `scripts/validate_contracts.py`, `tools/forensic_contract_guard.py`, `core_engine.md`, `modules.md`, `low_noise_experience_contract.md`, and `data_model.md` now require `primary_rank_score`, `runner_up_rank_score`, and `dominance_margin` on the published low-noise attention policy.
405. `LowNoiseExperienceFrame.attention_policy` could drift below the richer delta contract and omit the widened ranking trace and default-detail guards used by the reconnect-safe shell.
    Resolution: `schemas/low_noise_experience_frame.schema.json`, `scripts/validate_contracts.py`, `tools/forensic_contract_guard.py`, `modules.md`, `low_noise_experience_contract.md`, and `data_model.md` now align the frame-level attention policy with the live delta contract and reconnect-safe default-detail requirements.
406. The frozen low-noise `cognitive_budget` omitted visibility, dominance, hysteresis, and refresh-coalescing thresholds, so continuity and shell-width policy lived only in prose.
    Resolution: `schemas/experience_delta.schema.json`, `schemas/low_noise_experience_frame.schema.json`, `scripts/validate_contracts.py`, `tools/forensic_contract_guard.py`, `core_engine.md`, `modules.md`, `low_noise_experience_contract.md`, and `data_model.md` now freeze the full low-noise budget surface including visibility, dominance, hysteresis, and refresh-budget constants.
407. `ActionStripState` could publish a primary action without frozen score evidence, making reconnect-safe action salience weaker than the attention-side contract.
    Resolution: `schemas/action_strip_state.schema.json`, `scripts/validate_contracts.py`, `tools/forensic_contract_guard.py`, `modules.md`, `low_noise_experience_contract.md`, and `data_model.md` now require `primary_action_score`, `runner_up_action_score`, `dominance_margin`, and `suppressed_secondary_count`.
408. `ActionStripState.primary_action` and `secondary_actions[]` could drift away from `available_action_codes[]` or collide with `blocked_action_codes[]`.
    Resolution: `scripts/validate_contracts.py` now requires visible action codes to remain in the available inventory and disjoint from blocked codes.
409. Mutation-capable primary actions could still serialize below the frozen action-score and dominance thresholds.
    Resolution: `scripts/validate_contracts.py`, `core_engine.md`, `modules.md`, and `low_noise_experience_contract.md` now enforce the minimum score and dominance gate before a mutation action may occupy the primary slot.
410. `ActionStripState.suppressed_secondary_count` could drift away from the actual hidden remainder of the available action set.
    Resolution: `scripts/validate_contracts.py` now derives the expected hidden-secondary count from the available action inventory and rejects mismatches.
411. `LowNoiseExperienceFrame` could drift the drawer entry ordering away from `attention_policy.detail_entry_points[]`, producing one ranked path in policy and another in the mounted drawer.
    Resolution: `scripts/validate_contracts.py` now requires exact ordered mirroring between attention-policy detail entry points and drawer entry modules.
412. `LowNoiseExperienceFrame` could drift focus, active-detail routing, warning counts, and primary action linkage across `attention_policy`, `action_strip`, `decision_summary`, and `detail_drawer`.
    Resolution: `scripts/validate_contracts.py` now rejects focus/detail/action mirror drift across the composite shell surfaces.
413. `ExperienceDelta` validation only checked top-level convenience mirrors, so malformed low-noise rank arithmetic and budget constants could still slip through as long as the scalar mirrors matched.
    Resolution: `scripts/validate_contracts.py` and `tools/forensic_contract_guard.py` now validate low-noise dominance arithmetic and the frozen budget constants on live deltas as well as snapshots.
414. The governance overview still described a fixed queue order, which was too brittle for age, criticality, operator-action need, and hysteresis-aware promotion.
    Resolution: `admin_governance_console_architecture.md`, `modules.md`, and `data_model.md` now replace the hard-coded family order with the frozen `family_score(...)` and hysteresis policy.
415. `TwinDeltaArc.priority_rank` ignored `resolution_class`, understating reconcile-first or amendment-relevant mismatches relative to otherwise equal arcs.
    Resolution: `scripts/validate_contracts.py` and `twin_view_contract.md` now add the frozen `resolution_weight(...)` term to the twin priority formula.
416. Portfolio attention documentation ignored `safe_action_state`, flattening refresh-required and no-safe-action twins into the same portfolio attention band as equally ranked safe twins.
    Resolution: `twin_view_contract.md` now adds explicit safe-action penalties to the portfolio `attention_rank(t)` formula.

## Client-portal reliability hardening

417. `ClientUploadSession` lacked explicit surface, capture, progress, retry, resume, and integrity fields, so upload confidence and recovery posture could not be governed or replayed from the artifact itself.
    Resolution: `schemas/client_upload_session.schema.json`, `data_model.md`, and `compute_parity_and_trust_formulas.md` now require the missing upload telemetry and posture fields.
418. `ClientUploadSession.upload_confidence_score` could be absent or treated as a UI-only guess, allowing transfer success to masquerade as safe completion.
    Resolution: `schemas/client_upload_session.schema.json`, `scripts/validate_contracts.py`, `compute_parity_and_trust_formulas.md`, `customer_client_portal_experience_contract.md`, `modules.md`, and `state_machines.md` now define, publish, and recompute the frozen upload-confidence formula.
419. Upload recovery posture could drift away from `next_action_code`, leaving reconnect flows to guess whether the client should resume, reconfirm, restart, or seek support.
    Resolution: `schemas/client_upload_session.schema.json`, `scripts/validate_contracts.py`, and `tools/forensic_contract_guard.py` now bind upload `recovery_posture` and `dominant_hazard_code` to the governed next-action posture.
420. Attached or accepted uploads could retain incomplete byte transfer, unverified integrity, or low confidence while still looking completion-capable.
    Resolution: `schemas/client_upload_session.schema.json`, `scripts/validate_contracts.py`, `state_machines.md`, and `customer_client_portal_experience_contract.md` now force integrity-verified completion posture and confidence thresholds before attachment or submission promotion.
421. `ClientApprovalPack` lacked view-guard, stale-protection, change-digest acknowledgement, declaration acknowledgement, step-up freshness, and readiness fields, so signability could not be frozen into the artifact.
    Resolution: `schemas/client_approval_pack.schema.json`, `data_model.md`, and `compute_parity_and_trust_formulas.md` now require the missing approval-readiness inputs and outputs.
422. Approval packs could reach acknowledgement or signed posture without explicit digest and declaration acknowledgement lineage.
    Resolution: `schemas/client_approval_pack.schema.json`, `scripts/validate_contracts.py`, `state_machines.md`, and `tools/forensic_contract_guard.py` now require and chronologically validate `change_digest_acknowledged_at` and `declaration_acknowledged_at`.
423. Approval recovery posture could drift from stale-pack or step-up blocker state, leaving the portal free to improvise stale-review and step-up retry behavior.
    Resolution: `schemas/client_approval_pack.schema.json`, `scripts/validate_contracts.py`, `tools/forensic_contract_guard.py`, and `compute_parity_and_trust_formulas.md` now derive recovery posture from concrete blocker state and reject drift.
424. Signed approval packs could remain below the frozen readiness threshold or keep non-current stale posture while still appearing sign-complete.
    Resolution: `schemas/client_approval_pack.schema.json`, `scripts/validate_contracts.py`, `state_machines.md`, and `tools/forensic_contract_guard.py` now require `stale_protection_state = CURRENT`, `approval_readiness_score >= 85`, and cleared recovery posture for signed states.
425. `ClientPortalWorkspace` lacked a governed reliability summary, forcing completion, friction, and abandonment posture back into renderer-local heuristics.
    Resolution: `schemas/client_portal_workspace.schema.json`, `data_model.md`, `customer_client_portal_experience_contract.md`, `modules.md`, and `compute_parity_and_trust_formulas.md` now require `reliability_summary`.
426. Portal document-request upload rows could omit the governed action, confidence, and recovery posture needed to keep request-card CTAs safe under reconnect and mobile retry.
    Resolution: `schemas/client_portal_workspace.schema.json`, `scripts/validate_contracts.py`, and `modules.md` now mirror `next_action_code`, `upload_confidence_score`, `recovery_posture`, and `dominant_hazard_code` onto portal upload projections.
427. Portal approval rows could omit readiness and recovery posture while still surfacing a sign action, weakening contained stale-pack and step-up recovery.
    Resolution: `schemas/client_portal_workspace.schema.json`, `scripts/validate_contracts.py`, `customer_client_portal_experience_contract.md`, and `modules.md` now mirror approval readiness and recovery posture onto portal approval projections.
428. The client-portal validator did not recompute upload confidence from the persisted artifact, so score drift or under-specified completion gating could silently regress.
    Resolution: `scripts/validate_contracts.py` now recomputes the frozen upload-confidence score, validates hard fail-closed caps, and rejects score drift.
429. The client-portal validator did not recompute approval readiness from the persisted pack, so stale or step-up-expired packs could overstate signability.
    Resolution: `scripts/validate_contracts.py` now recomputes the frozen approval-readiness score, validates chronology, and rejects stale or expired signability drift.
430. Portal workspaces could retain mutating posture under low flow stability or keep `READY_TO_SIGN` dominant while completion probability had already fallen below the frozen safety threshold.
    Resolution: `scripts/validate_contracts.py`, `customer_client_portal_experience_contract.md`, `modules.md`, `state_machines.md`, and `test_vectors.md` now demote unstable or low-completion portal flows back to explicit review, recovery, save, or help posture.
431. The AI-generated recovery formula was circular because it attempted to derive viability from an already-published `recovery_posture` value.
    Resolution: `compute_parity_and_trust_formulas.md` now derives recovery viability from concrete blocker state and only then maps to the published recovery posture.
432. The formula and validation vocabulary lacked machine-stable client-flow reason codes for low stability, low upload confidence, stale approval view, expired step-up, excessive friction, and high completion risk.
    Resolution: `compute_parity_and_trust_formulas.md`, `scripts/validate_contracts.py`, and `test_vectors.md` now add the client-flow reason-code surface and regression coverage.

## Governance simulation and stale-guard hardening

433. `AuthorizationDecision` lacked explicit governance mutation bounded-safe and approval-class posture, so reusable `AUTHORIZE(...)` outputs could not persist whether a governance write was directly bounded or still approval-gated.
    Resolution: `schemas/authorization_decision.schema.json`, `scripts/validate_contracts.py`, `tools/forensic_contract_guard.py`, `data_model.md`, and `actor_and_authority_model.md` now require `bounded_safe_mutation` and `approval_requirement` with bidirectional consistency.
434. The access contract left the governance simulation basis outside the formal binding surface, so blast-radius or approval computations could be superseded without the authorization contract making that dependency explicit.
    Resolution: `actor_and_authority_model.md`, `modules.md`, `northbound_api_and_session_contract.md`, and `data_model.md` now bind governance mutation authorization to the current simulation or topology basis and document the stronger replay/stale-view semantics.
435. The AI-proposed tuple math for `AUTHORIZE(...)` suppressed step-up when governance approval was also outstanding, creating an invalid dead zone where step-up and approval posture could cancel into a blocked result.
    Resolution: `modules.md` now makes `REQUIRE_STEP_UP` the first surfaced escalation while preserving pending governance or packet-local approval obligations in the returned contract.
436. Packet-local approval semantics could be misread as the approval model for governance/control-plane writes.
    Resolution: `modules.md` now explicitly confines `APPROVAL_STATE(...)` to filing/packet flows and routes governance mutation approval through `SIMULATE_GOVERNANCE_MUTATION(...).approval_requirement`.
437. The governance policy simulator could present nominal ABAC allowability without the mutation-hazard overlay, bounded blast-radius interval, or confidence/predictability gates needed for safe operator decisions.
    Resolution: `admin_governance_console_architecture.md`, `modules.md`, and `northbound_api_and_session_contract.md` now require joint `AUTHORIZE(...)` plus `SIMULATE_GOVERNANCE_MUTATION(...)` output, bounded blast-radius review, and advisory-only thresholds for low-confidence simulations.
438. Governance blast-radius review was under-specified as simple counts, which was too weak for uncertain propagation or transitive impact.
    Resolution: `admin_governance_console_architecture.md` and `modules.md` now require lower/upper impact intervals plus direct/transitive object-class counts and explicit privilege, masking, and segregation-of-duties exposure.
439. `ChangeBasket` could mix staged governance mutations justified by different simulation bases or dependency topology cuts and still look atomically committable.
    Resolution: `admin_governance_console_architecture.md` now groups staged mutations by `simulation_basis_hash`, preserves the matching topology hash, and blocks direct submission when the staged set is not simulation-atomic.
440. `CommandEnvelope` lacked governance simulation stale guards, so policy writes formed from a reviewed blast-radius estimate could not carry the topology or simulation basis they depended on.
    Resolution: `schemas/command_envelope.schema.json`, `scripts/validate_contracts.py`, `tools/forensic_contract_guard.py`, `northbound_api_and_session_contract.md`, and `data_model.md` now add `if_match_dependency_topology_hash` and `simulation_basis_hash`.
441. `CommandEnvelope` could carry governance simulation hashes outside governance scope or without the policy-snapshot guard they depend on.
    Resolution: `schemas/command_envelope.schema.json`, `scripts/validate_contracts.py`, and `tools/forensic_contract_guard.py` now force simulation-basis guards to remain governance-only and policy-bound.
442. `ApiCommandReceipt` lacked durable lineage for governance simulation stale-view rejection, so a rejected policy write could not preserve which simulation basis or topology cut had gone stale.
    Resolution: `schemas/api_command_receipt.schema.json`, `scripts/validate_contracts.py`, `tools/forensic_contract_guard.py`, and `data_model.md` now retain `dependency_topology_hash` and `simulation_basis_hash` on receipts where applicable.
443. `ApiCommandReceipt.stale_guard_family` did not include governance simulation stale guards, and receipts could publish those families without the matching hash evidence.
    Resolution: `schemas/api_command_receipt.schema.json`, `scripts/validate_contracts.py`, and `tools/forensic_contract_guard.py` now add `DEPENDENCY_TOPOLOGY_HASH` and `SIMULATION_BASIS_HASH` and require their corresponding hash fields.
444. Governance mutation stale-view protection was documented only against `policy_snapshot_hash`, leaving commit-time rejection under-specified for superseded topology or simulation assumptions.
    Resolution: `admin_governance_console_architecture.md` and `northbound_api_and_session_contract.md` now require stale rejection on outdated `dependency_topology_hash` and `simulation_basis_hash` as well as policy-snapshot drift.
