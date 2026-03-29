# Data Model (canonical entities + compliance control objects)

This section defines the minimal entities needed to implement the core engine in a reproducible, auditable way.
It deliberately separates **mutable operational state** from **compliance control objects and append-only artifacts**.

## Mutable operational entities (state)
- **Tenant**: tenant_id, name, policy_profile_id, default_retention_profile_id
- **User**: user_id, tenant_id, roles, attributes, MFA_state
- **ActorSession**: session_id, tenant_id, principal_ref, authn_level, step_up_state, session_binding_hash,
  csrf_ref, issued_at, expires_at, revoked_at, revocation_reason
- **Client**: client_id, tenant_id, external_ids, relationship_state, erasure_state
- **ConnectorBinding**: binding_id, tenant_id, client_id, provider, scopes, token_ref, health_state
- **ConfigVersion**: version_id, config_type, lifecycle_state, content_hash, effective_scope, approvals
- **AuthorityLink**: authority_link_id, tenant_id, client_id, authority_scope, lifecycle_state, token_binding_profile_ref
- **AuthorityOperationProfile**: profile_id, operation_family, provider_environment, required_scopes,
  fraud_header_profile_ref, idempotency_strategy, reconciliation_rules, legal_state_rules
- **SourceCollectionRun**: collection_run_id, manifest_id, lifecycle_state, source_window_ref, fetch_audit_refs
- **WorkflowItem**: item_id, tenant_id, client_id, period, type, status, priority, due_at, context_refs
- **RemediationTask**: task_id, error_id, task_type, owner_type, owner_ref, due_at, priority, task_state,
  remediation_steps_ref, blocking_class, superseded_by_task_id, closure_outcome
- **Override**: override_id, tenant_id, scope, decision_type, rationale, approver_id, expires_at
- **ConfigChangeRequest**: ccr_id, tenant_id, diff, risk_assessment, status, approvals
- **ApiCommandReceipt**: receipt_id, tenant_id, principal_ref, session_ref, command_id, command_type, manifest_id,
  request_hash, idempotency_key, acceptance_state, duplicate_of_receipt_id, latest_experience_sequence,
  result_ref, reason_codes[], accepted_at, expires_at
- **ExperienceCursor**: cursor_id, tenant_id, principal_ref, manifest_id, session_ref, frame_epoch,
  last_ack_sequence, resume_token_hash, cursor_state, last_seen_at, expires_at
- **ObligationMirror**: obligation_mirror_id, tenant_id, client_id, income_source_partition, lifecycle_state, authority_refs
- **FilingCase**: filing_case_id, tenant_id, client_id, period, lifecycle_state, current_manifest_ref, current_submission_ref,
  current_packet_ref, calculation_basis_ref, authority_calculation_ref, amendment_case_ref
- **AmendmentCase**: amendment_case_id, filing_case_id, current_manifest_ref, lifecycle_state, baseline_ref, drift_ref,
  intent_ref, amendment_window_ref, calculation_request_ref, calculation_id, calculation_type, calculation_hash,
  calculation_basis_ref, user_confirmation_ref, validation_outcome
- **ArtifactRetention**: retention_id, artifact_ref, lifecycle_state, hold_ref, expiry_at
- **TelemetryResource**: resource_id, service_name, environment_ref, build_ref, deployment_identity
- **BuildArtifact**: build_id, vcs_ref, artifact_digest, sbom_ref, provenance_ref, signature_ref,
  artifact_registry_ref, release_channel, build_time
- **DeploymentRelease**: release_id, environment_ref, build_id, schema_bundle_hash, config_bundle_hash,
  rollout_strategy, rollout_state, canary_fraction, health_gate_state, deployed_at, rollback_of_release_id
- **SchemaMigrationLedger**: migration_id, datastore_ref, target_version, compatibility_window_ref,
  phase_state, applied_at, verified_at, rollback_class, verification_ref
- **SecretVersion**: secret_version_id, secret_class, store_ref, key_version_ref, issued_at, expires_at,
  rotation_state, last_attested_at
- **RecoveryCheckpoint**: checkpoint_id, datastore_ref, backup_ref, snapshot_time, restore_tested_at,
  restore_verification_hash, rpo_class, rto_class, checkpoint_state

## Compliance control objects and append-only artifacts
## Common execution-context field group for derived artifacts

Every derived artifact produced after manifest allocation SHALL embed the following fields:

- `execution_mode`
- `analysis_only`
- `non_compliance_config_refs[]`
- `counterfactual_basis`

For `mode = COMPLIANCE`:

- `analysis_only = false`
- `non_compliance_config_refs[] = []`
- `counterfactual_basis = None`

For `mode = ANALYSIS`:

- `analysis_only = true`
- `non_compliance_config_refs[]` SHALL identify every frozen config entry whose status-at-freeze is
  not compliance-live for the modeled action
- `counterfactual_basis` SHALL capture the modeled/non-live basis for the run

This field group applies at minimum to:

- `CandidateFact`
- `CanonicalFact`
- `Snapshot`
- `ComputeResult`
- `ForecastSet`
- `RiskReport`
- `ParityResult`
- `TrustSummary`
- `DecisionBundle`
- `EvidenceGraph`
- `TwinView`
- `DriftRecord`
- `FilingCase`
- `AmendmentCase`
- `FilingPacket`
- `AuthorityOperation`
- `AuthorityBinding`
- `AuthorityRequestEnvelope`
- `AuthorityResponseEnvelope`
- `AuthorityInteractionRecord`
- `SubmissionRecord`

`RunManifest.continuation_set{...}` SHALL always record `config_inheritance_mode`; use `null` only
for root manifests and same-manifest pre-start reuse, and otherwise use the frozen continuation
classification `{FRESH_CHILD_RESOLUTION, REPLAY_EXACT, RECOVERY_EXACT, HISTORICAL_EXPLICIT}` so
child-manifest config lineage is explicit even when no parent freeze is reused.

Where the top-level lineage projection fields on `RunManifest` (`root_manifest_id`,
`parent_manifest_id`, `continuation_of_manifest_id`, `replay_of_manifest_id`,
`supersedes_manifest_id`, `manifest_generation`) are materialized in addition to
`continuation_set{...}`, they SHALL be exact mirrors of the nested values and SHALL NOT diverge.

- **RunManifest**: manifest_id, root_manifest_id, parent_manifest_id, continuation_of_manifest_id, replay_of_manifest_id,
  supersedes_manifest_id, manifest_generation, manifest_schema_version, tenant_id, client_id, period,
  requested_scope[], run_kind, mode, principal_context_ref, environment_ref, code_build_id, schema_bundle_hash,
  deterministic_seed, idempotency_key, lifecycle_state, created_at, frozen_at, opened_at, sealed_at,
  completed_at, superseded_at, retired_at, config_freeze{{...}}, input_freeze{{...}}, hash_set{{...}},
  continuation_set{{...}}, access_decision{{...}}, gating_decisions[], output_refs{{...}}, audit_refs[], submission_refs[],
  drift_refs[], decision_bundle_hash
  `RunManifest` is a special stateful control object: lifecycle_state, gate summaries, output refs, decision-bundle hash,
  audit refs, submission refs, and drift refs may advance only through named transitions and append-only audit evidence; the frozen
  execution envelope itself is never silently rewritten.
- **DecisionBundle**: decision_bundle_id, manifest_id, artifact_type, execution_mode, analysis_only,
  non_compliance_config_refs[], counterfactual_basis, decision_status, decision_reason_codes[],
  workflow_item_refs[], snapshot_id, compute_id, forecast_id, risk_id, parity_id, trust_id, graph_id,
  twin_id, filing_packet_id, submission_record_id, outcome_class, waiting_on, checkpoint_state,
  truth_state, plain_reason, reason_codes[], next_action_codes[], blocked_action_codes[],
  actionability_state, primary_action_code, no_safe_action_reason_code,
  suggested_detail_surface_code, active_detail_surface_code, focus_anchor_ref,
  next_checkpoint_at, filing_case_id, amendment_case_id, persisted_at, contract
  `DecisionBundle` is a persisted terminal/review projection keyed by `RunManifest.decision_bundle_hash`; same-manifest
  idempotent retries reload this object instead of regenerating artifacts. The outcome-bridge fields
  exist so terminal reload, notification, and queue surfaces can restore the user's next legal step
  without rerunning the whole evidence and gate chain. It SHALL also preserve a compact top-level
  reason summary (`decision_reason_codes[]`) instead of forcing every consumer to reconstruct
  terminal posture by replaying the full gate chain.
- **ExperienceDelta**: manifest_id, experience_sequence, frame_epoch, delivery_class, shell_route_key,
  posture_state, semantic_motion, cause_ref, connection_state, activity_state, truth_state,
  checkpoint_state, truth_origin, experience_profile, attention_state, primary_object_ref,
  actionability_state, primary_action_code, no_safe_action_reason_code, secondary_notice_count,
  detail_entry_points[], suggested_detail_surface_code, active_detail_surface_code,
  attention_policy{{...}}, cognitive_budget{{...}}, focus_anchor_ref, shell_stability_token,
  affected_object_refs[], affected_surface_codes[], occurred_at, surface_updates[]
  `ExperienceDelta` is a reconnect-safe Live Observatory patch envelope. It is UX-critical and
  machine-validated, but it is never the legal record of submission, approval, or authority state.
  The scalar attention fields are convenience projections and MUST be exact mirrors of
  `attention_policy{{...}}` so clients do not invent divergent primary issues, action hierarchies,
  or detail-entry ordering.
- **ClientPortalWorkspace**: workspace_id, tenant_id, client_id, manifest_id, viewer_role, route, navigation_tabs[],
  status_hero{{...}}, task_groups[], document_center{{...}}, approval_center{{...}}, onboarding_journey{{...}},
  support_panel{{...}}, activity_timeline[], updated_at
  `ClientPortalWorkspace` is a read-side projection optimized for the customer/client portal. It SHALL
  flatten gate, workflow, and authority posture into literal status, deadline, task, and confirmation
  language and SHALL NOT expose internal-only reason codes or expert-only surface taxonomies as first-view content.
- **ClientDocumentRequest**: request_id, tenant_id, client_id, manifest_id, category, title, description_ref,
  requested_file_types[], due_at, lifecycle_state, required_count, upload_refs[], latest_upload_ref,
  review_outcome, assistance_mode
- **ClientUploadSession**: upload_session_id, request_id, initiated_by, storage_ref, filename, media_type,
  byte_count, checksum, transfer_state, malware_scan_state, validation_state, submitted_at, finalized_at,
  expires_at
- **ClientApprovalPack**: approval_pack_id, tenant_id, client_id, manifest_id, title, summary_ref,
  change_highlights_ref, declaration_text_ref, approval_pack_hash, lifecycle_state, requires_step_up,
  viewed_at, acknowledged_at, signed_at, supersedes_pack_ref
- **ClientOnboardingJourney**: journey_id, tenant_id, client_id, lifecycle_state, current_step_code,
  required_steps[], completed_steps[], verification_state, authority_link_requirement, document_request_refs[],
  help_channel_ref, invited_at, completed_at, expires_at
- **ClientTimelineEvent**: event_id, tenant_id, client_id, manifest_id, event_kind, headline, detail_ref,
  occurred_at, visible_to_client, related_object_ref
- **ConfigFreeze**: config_freeze_id, manifest_id, artifact_type, entries[], config_freeze_hash, approval_snapshot_ref,
  materiality_profile_ref, amendment_materiality_profile_ref, retention_profile_ref, provider_contract_profile_ref,
  workflow_policy_ref, override_policy_ref, masking_export_policy_ref, canonicalization_rules_ref,
  connector_mapping_rules_ref, parity_threshold_profile_ref, trust_threshold_profile_ref,
  risk_threshold_profile_ref, evidence_confidence_policy_ref, computation_rules_ref,
  required_config_types_present[]
- **SchemaBundle**: schema_bundle_hash, entries[], published_at, compatibility_profile_ref
- **SchemaBundleEntry**: schema_id, artifact_type, semantic_version, content_hash, dialect_ref,
  compatibility_class, supersedes_schema_id, writer_min_reader_version, allowed_upgrade_kinds[]
- **SourcePlan**: source_plan_id, manifest_id, required_domains[], planned_sources[] where each planned source freezes
  source_domain, source_class, provider_binding_ref, partition_scope_refs[], query_basis_ref,
  cursor_strategy_ref, read_model, late_data_policy_ref, freshness_slo_ref, required_schema_refs[]
- **SourceWindow**: source_window_id, manifest_id, collection_started_at, collection_completed_at, read_cutoff_at
- **CollectionBoundary**: collection_boundary_id, manifest_id, source_window_id, read_cutoff_at,
  connector_profile_ref, connector_build_id, source_boundaries[] where each boundary freezes
  source_domain, provider_environment_ref, provider_api_version, provider_schema_version,
  cursor_checkpoint_ref, revision_ref, request_audit_refs[], completeness_expectation_ref,
  late_data_policy_ref
- **NormalizationContext**: normalization_context_id, manifest_id, mapping_rules_ref, evidence_rules_ref,
  promotion_rules_ref, normalization_rules_ref, transformation_version_set, normalization_context_hash
- **SourceRecord**: source_record_id, manifest_id, collection_boundary_ref, source_class, provider,
  provider_account_ref, capture_method, captured_at, effective_period, tenant_id, client_id,
  business_partition, raw_hash, raw_payload_ref, ingestion_run_ref, source_strength_tier, freshness_state
- **SourceRecordSet**: set_id, manifest_id, set_hash, artifact_contract_hash, items[]
- **EvidenceItem**: evidence_item_id, manifest_id, source_record_id, evidence_kind, content_ref,
  extraction_method, extraction_confidence, source_strength_tier, freshness_state, lineage_refs[],
  retention_tag, erasure_state, business_partition, period_partition
- **EvidenceItemSet**: set_id, manifest_id, set_hash, artifact_contract_hash, items[]
- **CandidateFact**: candidate_fact_id, manifest_id, fact_family, value_payload_ref, confidence,
  source_strength_tier, promotion_state, supporting_evidence_refs[], partition_scope
- **CandidateFactSet**: set_id, manifest_id, set_hash, artifact_contract_hash, items[]
- **ConflictRecord**: conflict_id, manifest_id, conflict_type, involved_fact_refs[], severity, reason_codes[],
  blocking_class, resolution_state
- **ConflictSet**: set_id, manifest_id, set_hash, artifact_contract_hash, items[]
- **CanonicalFact**: canonical_fact_id, manifest_id, fact_family, value_payload_ref, promotion_state,
  source_strength_tier, freshness_state, supporting_evidence_refs[], partition_scope
- **CanonicalFactSet**: set_id, manifest_id, set_hash, artifact_contract_hash, items[]
- **InputFreeze**: input_freeze_id, manifest_id, artifact_type, source_plan_ref, collection_boundary_ref, input_policy_ref,
  source_window_ref, read_cutoff_at, provider_environment_refs[], provider_api_versions[],
  provider_schema_versions[], connector_profile_ref, connector_build_id, cursor_checkpoint_refs[],
  request_audit_refs[], late_data_policy_bindings[], source_record_refs[], evidence_item_refs[],
  candidate_fact_refs[], canonical_fact_refs[], conflict_refs[], exclusion_refs[],
  missing_source_declarations[], stale_source_declarations[], normalization_context_ref,
  normalization_context_hash, artifact_contract_refs[], artifact_contract_hash, input_set_hash, contract
- **AuthorityOperation**: operation_id, manifest_id, operation_family, authority_name, authority_product_profile,
  requested_scope[], runtime_scope[], business_partitions[], period, target_obligation_ref, basis_type
- **AuthorityBinding**: authority_binding_id, manifest_id, authority_link_ref, token_binding_ref, subject_ref,
  acting_party_ref, authority_scope, provider_environment, provider_api_version
- **AuthorityRequestEnvelope**: request_id, operation_id, http_method, resource_template, resolved_path_params{{...}},
  query_params{{...}}, canonical_path, canonical_query, header_profile_refs[], request_body_hash,
  payload_ref, access_binding_hash, idempotency_key, request_hash, transmit_policy_ref
- **AuthorityResponseEnvelope**: response_id, request_id, received_at, http_status, response_headers_ref,
  response_body_ref, authority_reference, response_class, retry_class
- **AuthorityInteractionRecord**: interaction_id, manifest_id, operation_id, request_id, response_id,
  submission_record_ref, audit_refs[], provenance_refs[]
- **RetentionTag**: retention_tag_id, retention_class, anchor_event, anchor_timestamp, minimum_expiry_at,
  policy_expiry_at, legal_hold_state, erasure_eligibility, pseudonymisation_mode, limitation_behavior, retention_basis_ref
- **Snapshot**: snapshot_id, manifest_id, artifact_type, execution_mode, analysis_only,
  non_compliance_config_refs[], counterfactual_basis, lifecycle_state, source_record_set_ref,
  evidence_item_set_ref, candidate_fact_set_ref, canonical_fact_set_ref, conflict_set_ref,
  quality{{...}}, completeness{{...}}, created_at, contract
- **ComputeResult**: compute_id, manifest_id, rule_version_ref, totals{{...}}, assumptions{{...}}
- **ForecastSet**: forecast_id, manifest_id, point_forecasts{{...}}, scenarios{{...}}, seeds, created_at
- **RiskReport**: risk_id, manifest_id, risk_score, feature_scores{{...}}, flags[],
  unresolved_material_blocking_risk_flag, created_at
- **ParityResult**: parity_id, manifest_id, deltas{{...}}, parity_score, comparison_coverage,
  weighted_parity_pressure, classification, cause_hypotheses[]
- **GateDecisionRecord**: gate_decision_id, manifest_id, gate_code, decision, severity, reason_codes[],
  metrics{{...}}, overrideability, required_override_scope, next_action_codes[], policy_version_ref, decided_at
- **TrustSummary**: trust_id, manifest_id, lifecycle_state, trust_band, trust_score, trust_level,
  automation_level, filing_readiness, required_human_steps[], reason_codes[], support_refs[],
  synthesized_at
- **EvidenceGraph**: graph_id, manifest_id, nodes_ref, edges_ref, critical_paths_ref, confidence_summary,
  supersession_summary, quality{{...}}
- **EnquiryPack**: enquiry_pack_id, manifest_id, target_ref, critical_paths_ref, supporting_evidence_refs[],
  config_refs[], override_refs[], authority_refs[], limitation_notes[], audit_refs[]
- **TwinView**: twin_id, manifest_id, timeline_ref, cross_source_deltas_ref, readiness{{...}}
- **FilingPacket**: packet_id, manifest_id, lifecycle_state, payload_ref, payload_hash, manifest_binding_hash, declared_basis, disclaimers[], created_at
- **SubmissionRecord**: submission_id, manifest_id, lifecycle_state, authority_reference, request_hash, response_ref,
  correlation_refs[], baseline_type
- **DriftRecord**: drift_id, manifest_id, baseline_manifest_id, comparison_manifest_id, baseline_type,
  drift_scope, field_deltas[], tax_delta_abs, tax_delta_rel, drift_pressure, amendment_pressure,
  critical_field_delta_count, cause_codes[], materiality_class, amendment_recommendation,
  basis_limitations[]
- **ErrorRecord**: error_id, manifest_id, root_manifest_id, error_family, error_code, error_title,
  error_description_template, severity, blocking_class, retry_class, remediation_class,
  remediation_owner_type, reason_codes[], affected_object_refs[], source_object_refs[], caused_by_error_id,
  originating_activity_ref, actor_ref, service_ref, authority_operation_ref, customer_visibility_class,
  operator_visibility_class, opened_at, resolved_at, resolution_state, resolution_notes_ref
- **CompensationRecord**: compensation_id, error_id, compensation_mode, target_object_refs[],
  compensation_status, compensation_steps_ref, compensated_at, verification_ref
- **AuditEvent**: audit_event_id, event_type, event_time, tenant_id, client_id, manifest_id, actor_ref,
  service_ref, object_refs[], reason_codes[], event_payload_hash, prev_event_hash, visibility_class,
  retention_class, signature_ref
- **ErasureProof**: erasure_proof_id, manifest_id, target_ref, erasure_action_ref, proof_hash, created_at

## Key principle
A **RunManifest** is the spine. Everything else attaches to it. All "explain why" questions begin by reading the manifest
and walking the provenance links from outputs back to inputs and evidence.
For intake-boundary and intake-data artifacts, authoritative status requires a recorded contract envelope
(`schema_id`, `semantic_version`, `content_hash`) tied to the frozen schema bundle.

Northbound command receipts, session cursors, release provenance, schema migration ledgers, secret
versions, and recovery checkpoints are first-class operational control objects. They SHALL be persisted
with the same rigor as manifest-adjacent state whenever they gate duplicate suppression, stale-view
protection, release promotion, rollback, or restore safety.

Formal lifecycle and transition semantics for these objects are defined in `state_machines.md`.
