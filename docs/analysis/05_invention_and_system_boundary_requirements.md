# Invention and System Boundary Requirements

## Summary

- Requirement rows: `45`
- Inside-core rows: `22`
- Controlled-edge rows: `5`
- Broader-product rows: `10`
- External-authority or actor rows: `8`
- Out-of-scope but adjacent register entries: `23`

## Authoritative Sources

- `Algorithm/invention_and_system_boundary.md`
- `Algorithm/core_engine.md`
- `Algorithm/canonical_source_and_evidence_taxonomy.md`
- `Algorithm/authority_interaction_protocol.md`
- `Algorithm/northbound_api_and_session_contract.md`
- `Algorithm/security_and_runtime_hardening_contract.md`
- `Algorithm/deployment_and_resilience_contract.md`
- `Algorithm/retention_and_privacy.md`
- `Algorithm/replay_and_reproducibility_contract.md`
- `Algorithm/actor_and_authority_model.md`
- `Algorithm/data_model.md`

## Non-Negotiable Distinctions

- Raw source truth stays external until normalized into `Snapshot` and promoted into canonical facts.
- Filing intent, packet formation, request identity, and state interpretation are inside the engine; legal acceptance remains authority-owned.
- Parity and trust are engine outputs; HMRC's own calculation service remains external comparison input.
- Amendment recommendation is inside the engine; unrestricted amendment right and acceptance remain authority-controlled.
- Replay, recovery, continuation, and supersession are lineage-governed engine decisions, not queue or session retries.
- Semantic read-side posture is inside the engine; transport, UI layout, routing, and session delivery are outside the core.
- Guidance to HMRC-only journeys is lawful; absorbing HMRC-only tasks into local product logic is not.
- Compliance-vs-analysis segregation is itself a boundary invariant, not a presentation choice.

## Coverage By Zone

| Zone | Count | Representative IDs |
| --- | --- | --- |
| `inside_core_engine` | `22` | `BR_001, BR_002, BR_003, BR_004, BR_005, BR_006` |
| `controlled_edge` | `5` | `BR_023, BR_024, BR_025, BR_026, BR_027` |
| `broader_product_outside_core` | `10` | `BR_028, BR_029, BR_030, BR_031, BR_032, BR_033` |
| `external_authority_or_actor` | `8` | `BR_038, BR_039, BR_040, BR_041, BR_042, BR_043` |

## Explicit Boundary Rule Coverage

| Boundary rule family | Requirement IDs |
| --- | --- |
| `amendment_recommendation_not_unrestricted_amendment_right` | `BR_018` |
| `boundary_ingress_requires_auth_correlation_normalization` | `BR_016, BR_026` |
| `canonicalization_not_raw_source_truth` | `BR_005` |
| `compliance_vs_analysis_segregation` | `BR_008, BR_022` |
| `exact_scope_posture_not_client_flattening` | `BR_017` |
| `explainability_for_engine_created_states` | `BR_011, BR_021` |
| `filing_intent_and_packet_not_authority_acceptance` | `BR_014, BR_015` |
| `guide_not_absorb_hmrc_online_services_only` | `BR_039` |
| `identity_issuance_outside_engine` | `BR_038` |
| `lineage_safe_replay_recovery_continuation` | `BR_002, BR_020` |
| `parity_and_trust_not_authority_calculation` | `BR_009, BR_041` |

## Inside-Core Semantic Requirements

| ID | Capability | Rule family | Owning objects/contracts | Produced artifacts |
| --- | --- | --- | --- | --- |
| `BR_001` | Run initiation and authority-to-act evaluation | `run_initiation_and_authority_to_act` | AuthorizationDecision; PrincipalContext; RunManifest; actor_and_authority_model.md | AuthorizationDecision; RunManifest; access_binding_hash; runtime_scope |
| `BR_002` | Manifest reuse, replay, recovery, continuation, and branching decisions | `lineage_safe_replay_recovery_continuation` | ReplayAttestation; RunManifest; continuation basis; replay_and_reproducibility_contract.md | ReplayAttestation; child-manifest lineage; manifest strategy |
| `BR_003` | Config freeze and immutable execution-envelope binding | `config_freeze_and_execution_envelope` | ConfigFreeze; ConfigVersion; RunManifest; execution_basis_hash | ConfigFreeze; execution_basis_hash; frozen execution envelope |
| `BR_004` | Engine-controlled evidence intake decisioning | `controlled_intake_before_canonicalization` | ConnectorBinding; RunManifest; Snapshot; SourceCollectionRun | collection audit refs; fetch instructions; scoped payload refs |
| `BR_005` | Canonicalization from raw source material into Snapshot | `canonicalization_not_raw_source_truth` | CandidateFact; CanonicalFact; EvidenceItem; Snapshot; SourceRecord | CanonicalFact; EvidenceItem; Snapshot; validation output |
| `BR_006` | Explicit validation quality, completeness, and uncertainty measurement | `validation_quality_and_completeness` | Snapshot; TrustSummary; validation result sets | completeness metrics; gate inputs; quality metrics; uncertainty markers |
| `BR_007` | Outcome computation on the frozen canonical snapshot | `outcome_computation_from_snapshot` | DecisionBundle; DerivedValue; Snapshot; data_model.md | DecisionBundle; computed outcomes; derived value refs |
| `BR_008` | Analysis-only forecast and counterfactual segregation | `compliance_vs_analysis_segregation` | DecisionBundle; Forecast artifacts; execution_mode_boundary_contract | analysis_only flags; execution_mode_boundary_contract; forecast artifacts |
| `BR_009` | Parity comparison against authority values and prior submissions | `parity_and_trust_not_authority_calculation` | AuthorityReference; CanonicalFact; SubmissionRecord; parity result | comparison facts; mismatch reasons; parity deltas |
| `BR_010` | Trust synthesis, gate evaluation, and bounded override handling | `override_bounded_gate_evaluation` | ExceptionalAuthorityGrant; GateDecisionRecord; TrustSummary | TrustSummary; filing readiness posture; gate decisions |
| `BR_011` | Evidence-linked provenance graph and proof binding | `explainability_for_engine_created_states` | DecisionBundle; EvidenceGraph; ProofBundle; audit and provenance contract | EvidenceGraph; ProofBundle; traceable artifact bindings |
| `BR_012` | TwinView and cross-source delta formation | `twin_view_and_delta_exposure` | AuthorityComparisonFact; DecisionBundle; TwinView | TwinView; delta summaries; mismatch clusters |
| `BR_013` | Workflow planning from trust, parity, risk, data quality, and drift | `workflow_planning` | DecisionBundle; TrustSummary; TwinView; WorkflowItem | WorkflowItem; review or remediation posture; routing hints |
| `BR_014` | Filing packet formation and basis declaration | `filing_intent_and_packet_not_authority_acceptance` | AuthorityOperation; FilingPacket; RunManifest | FilingPacket; basis declaration; manifest-linked packet identity |
| `BR_015` | Submission intent, request identity, and SubmissionRecord persistence | `filing_intent_and_packet_not_authority_acceptance` | AuthorityBinding; AuthorityOperation; AuthorityRequestEnvelope; SubmissionRecord | SubmissionRecord; authority interaction lineage; idempotency_key; request_hash |
| `BR_016` | Authenticated authority ingress normalization and acknowledgement-state interpretation | `boundary_ingress_requires_auth_correlation_normalization` | AuthorityIngressReceipt; AuthorityInteractionRecord; AuthorityResponseEnvelope; SubmissionRecord | acknowledgement state; legal-state mutation inputs; normalized authority artifacts |
| `BR_017` | Semantic read-side legal posture projection | `exact_scope_posture_not_client_flattening` | ClientPortalWorkspace; DecisionBundle; ExperienceDelta; LowNoiseExperienceFrame; TenantGovernanceSnapshot; WorkInboxSnapshot | ExperienceDelta; machine-stable posture artifacts; route-visible read models |
| `BR_018` | Drift classification and amendment recommendation | `amendment_recommendation_not_unrestricted_amendment_right` | DecisionBundle; SubmissionRecord; WorkflowItem; drift monitor | amendment recommendation; drift classification; review workflow |
| `BR_019` | Retention, expiry, erasure, and limitation propagation governance | `retention_and_limitation_governance` | ArtifactRetention; DecisionBundle; ErasureProof; EvidenceGraph; RetentionTag | ArtifactRetention; RetentionTag; erasure proofs; limitation notes |
| `BR_020` | Lineage-safe replay, recovery, continuation, and supersession governance | `lineage_safe_replay_recovery_continuation` | ReplayAttestation; RunManifest; continuation_set; replay_and_reproducibility_contract.md | ReplayAttestation; continuation lineage; recovery posture |
| `BR_021` | Evidence-linked explainability for engine-created states | `explainability_for_engine_created_states` | AuditInvestigationFrame; DecisionBundle; EnquiryPack; EvidenceGraph | enquiry-pack artifacts; investigation frames; proof paths; reason codes |
| `BR_022` | Compliance-vs-analysis execution boundary enforcement | `compliance_vs_analysis_segregation` | DecisionBundle; FilingPacket; ReplayAttestation; execution_mode_boundary_contract | blocked legal-effect posture; disclosure reason codes; execution_mode_boundary_contract |

## Rule Families With Multiple Requirement Rows

| Rule family | Row count | Requirement IDs |
| --- | --- | --- |
| `amendment_recommendation_not_unrestricted_amendment_right` | `1` | `BR_018` |
| `authority_acceptance_and_legal_truth_external` | `1` | `BR_040` |
| `authority_side_processing_external` | `1` | `BR_045` |
| `boundary_ingress_requires_auth_correlation_normalization` | `2` | `BR_016`, `BR_026` |
| `canonicalization_not_raw_source_truth` | `1` | `BR_005` |
| `compliance_vs_analysis_segregation` | `2` | `BR_008`, `BR_022` |
| `config_freeze_and_execution_envelope` | `1` | `BR_003` |
| `controlled_authority_channel_not_core_logic` | `1` | `BR_023` |
| `controlled_connector_use_not_generic_etl` | `1` | `BR_024` |
| `controlled_fetch_transport_not_raw_truth` | `1` | `BR_027` |
| `controlled_intake_before_canonicalization` | `1` | `BR_004` |
| `controlled_ocr_not_inventive_center` | `1` | `BR_025` |
| `core_semantics_vs_northbound_transport` | `1` | `BR_030` |
| `exact_scope_posture_not_client_flattening` | `1` | `BR_017` |
| `explainability_for_engine_created_states` | `2` | `BR_011`, `BR_021` |
| `external_source_truth_outside_engine` | `1` | `BR_044` |
| `filing_intent_and_packet_not_authority_acceptance` | `2` | `BR_014`, `BR_015` |
| `guide_not_absorb_hmrc_online_services_only` | `1` | `BR_039` |
| `human_judgment_outside_override_protocol` | `1` | `BR_042` |
| `identity_issuance_outside_engine` | `1` | `BR_038` |
| `legal_consent_external_to_engine` | `1` | `BR_043` |
| `lineage_safe_replay_recovery_continuation` | `2` | `BR_002`, `BR_020` |
| `notification_delivery_not_engine_decisioning` | `1` | `BR_034` |
| `outcome_computation_from_snapshot` | `1` | `BR_007` |
| `override_bounded_gate_evaluation` | `1` | `BR_010` |
| `parity_and_trust_not_authority_calculation` | `2` | `BR_009`, `BR_041` |
| `product_surface_embodiment_not_engine` | `1` | `BR_029` |
| `release_resilience_not_engine` | `1` | `BR_036` |
| `retention_and_limitation_governance` | `1` | `BR_019` |
| `route_shell_choreography_not_engine_truth` | `1` | `BR_031` |
| `run_initiation_and_authority_to_act` | `1` | `BR_001` |
| `runtime_identity_and_secret_hardening_not_engine` | `2` | `BR_032`, `BR_033` |
| `runtime_topology_not_engine` | `1` | `BR_035` |
| `semantic_posture_not_renderer_layout` | `1` | `BR_028` |
| `standalone_forecasting_outside_invention` | `1` | `BR_037` |
| `twin_view_and_delta_exposure` | `1` | `BR_012` |
| `validation_quality_and_completeness` | `1` | `BR_006` |
| `workflow_planning` | `1` | `BR_013` |

## Output Files

- `data/analysis/system_boundary_requirements.jsonl`
- `data/analysis/boundary_capability_matrix.csv`
- `data/analysis/out_of_scope_but_adjacent_functions.json`
- `docs/analysis/05_boundary_capability_matrix.md`
- `docs/analysis/05_controlled_edge_and_external_actor_context.mmd`
