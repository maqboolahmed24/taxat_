# Data Model (canonical entities + compliance control objects)

This section defines the minimal entities needed to implement the core engine in a reproducible, auditable way.
It deliberately separates **mutable operational state** from **compliance control objects and append-only artifacts**.

## Mutable operational entities (state)
- **Tenant**: tenant_id, name, policy_profile_id, default_retention_profile_id
- **User**: user_id, tenant_id, roles, attributes, MFA_state
- **ActorSession**: artifact_type, session_id, tenant_id, principal_ref, principal_class,
  session_client_class, authn_level, step_up_state, session_binding_hash, csrf_ref,
  device_binding_state, issued_at, expires_at, revoked_at, revocation_reason,
  step_up_completed_at, last_seen_at
  `ActorSession` is the authenticated product-session control object. It SHALL preserve browser
  anti-CSRF posture, native device binding, step-up rotation state, and explicit revocation lineage
  rather than leaving those controls implicit in cookies, Keychain rows, or bearer credentials.
  Interactive browser and native sessions SHALL remain human-scoped, invalidated device bindings
  SHALL surface as revoked sessions, and lifecycle timestamps SHALL remain monotonic.
- **PrincipalContext**: artifact_type, principal_id, principal_type, effective_role_set[], tenant_id,
  client_scope[], requested_scope[], partition_scope_refs[], authn_level,
  subject_identity_assurance_level, session_id, service_identity_ref, delegation_basis,
  authorization_evaluated_at, policy_snapshot_hash, access_binding_hash,
  delegation_snapshot_refs[], authority_link_refs[], authority_link_snapshot_refs[],
  masking_scope, approval_capabilities[], client_portal_capabilities[], run_kind_capabilities[]
  `PrincipalContext` is the sealed actor-and-scope binding for one live command or run. It SHALL
  preserve the exact authorization basis used so replay, continuation, and stale-view checks do not
  depend on caller-local reconstruction. Service principal contexts SHALL stay machine-scoped
  (`BASIC`, `UNVERIFIED`, system-style delegation, no human portal or approval capabilities), while
  client-acting delegation bases and authority-link lineage remain explicit and frozen. Requested
  reporting scopes SHALL remain in canonical scope order, and `partition_scope_refs[]` SHALL remain
  in canonical sorted order so access-binding hashes do not drift on replay-equivalent contexts.
- **AuthorizationDecision**: artifact_type, decision_id, principal_context_ref, resource_class,
  action_family, decision, reason_codes[], effective_scope[], effective_partition_scope_refs[],
  masking_rules[], required_approvals[], required_authn_level, policy_snapshot_hash,
  access_binding_hash, dependency_topology_hash, simulation_basis_hash,
  delegation_snapshot_refs[], authority_link_snapshot_refs[], authority_layer_boundary{{...}},
  bounded_safe_mutation, approval_requirement, evaluated_at
  `AuthorizationDecision` is the authoritative `AUTHORIZE(...)` output contract. It SHALL keep
  masking, step-up, approval, and denial semantics distinct, preserve governance mutation bounded-safe
  posture where applicable, and SHALL freeze the exact `access_binding_hash` consumed by downstream
  command, manifest, and authority flows. `effective_partition_scope_refs[]` SHALL stay canonically
  ordered, and governance mutation-capable decisions SHALL retain the exact
  `dependency_topology_hash` / `simulation_basis_hash` pair whose hazard model was bound into the
  decision.
- **AuthorityLayerBoundaryContract**: contract_version, binding_scope_class,
  integration_capability, active_principal_class, tenant_permission_state,
  client_delegation_state, delegation_basis, delegation_freshness_state,
  authority_link_state, exceptional_authority_state, human_gate_requirement,
  human_gate_resolution_state, authority_truth_precedence_policy,
  tenant_permission_substitution_policy, link_delegation_independence_policy,
  exceptional_scope_policy, service_human_gate_satisfaction_permitted,
  exceptional_authority_may_substitute_for_delegation,
  exceptional_authority_may_override_authority_truth,
  exceptional_authority_may_widen_client_scope,
  exceptional_authority_may_widen_partition_scope
  `AuthorityLayerBoundaryContract` is the shared FE-52 layer-separation packet bound into
  authorization and authority-transport artifacts. It SHALL keep tenant permission, client
  delegation, imported freshness, authority-link readiness, exceptional authority, human-gate
  evidence, and authority-of-record truth as distinct machine-checkable layers instead of letting
  any one layer impersonate another.
- **GovernanceMutationBasisContract**: contract_version, basis_contract_hash, policy_snapshot_hash,
  access_binding_hash, dependency_topology_hash, simulation_basis_hash,
  commit_authority_posture, approval_requirement, bounded_safe_mutation, required_approvals[],
  simulation_confidence_score, predictability_score
  `GovernanceMutationBasisContract` is the frozen preview-to-write legality boundary for governance
  mutations. It SHALL bind the exact authorization slice, hazard basis, approval path, and
  preview-confidence posture that justified the staged change so blast-radius review,
  approval staging, command commit, and stale receipts can all compare one deterministic
  `basis_contract_hash` instead of re-deriving legality from UI-local state.
- **Client**: client_id, tenant_id, external_ids, relationship_state, erasure_state
- **ConnectorBinding**: artifact_type, binding_id, tenant_id, client_id, provider,
  provider_environment, provider_api_version, subject_ref, scopes[], partition_scope_refs[],
  token_ref, token_version_ref, binding_lineage_ref, lifecycle_state, health_state,
  delegation_state, client_binding_state, last_validated_at, expires_at, revoked_at,
  superseded_by_binding_id, blocked_reason_codes[], source_evidence_refs[]
- **ConfigVersion**: artifact_type, version_id, config_type, lifecycle_state,
  state_transition_contract{{...}}, content_hash, effective_scope[], approvals[],
  verification_evidence_ref_or_null, approved_at_or_null, superseded_by_version_id_or_null,
  revocation_reason_code_or_null, retired_at_or_null, state_changed_at, created_at, audit_refs[],
  provenance_refs[]
  `ConfigVersion` is the immutable config-release control object. It SHALL validate against
  `schemas/config_version.schema.json` so draft, candidate, verified, approved, deprecated, revoked,
  and retired posture cannot collapse into ad hoc status flips without named transition, approval,
  or supersession lineage.
- **DelegationGrant**: artifact_type, delegation_grant_id, tenant_id, reporting_subject_ref,
  delegate_ref, delegate_class, authority_scope_refs[], partition_scope_refs[], basis_type,
  basis_evidence_refs[], effective_from, expires_at, revoked_at, superseded_by_grant_id,
  lifecycle_state, last_validated_at, imported_evidence_fresh_until, limitation_reason_codes[]
  `DelegationGrant` is a client-authority artifact only. It SHALL encode client-granted,
  imported-self-assessment, or digital-handshake bases; internal tenant/service authority SHALL stay
  in `PrincipalContext` / `AuthorizationDecision`, not in delegation grants.
- **AuthorityLink**: artifact_type, authority_link_id, tenant_id, client_id, reporting_subject_ref,
  authority_name, authority_scope, provider_environment, provider_api_version, authorised_party_ref,
  delegation_grant_ref, partition_scope_refs[], token_binding_profile_ref, validated_at, expires_at,
  revoked_at, superseded_by_link_id, lifecycle_state, binding_health, delegation_state,
  token_client_binding_state, source_evidence_refs[], blocked_reason_codes[],
  last_binding_check_at
- **ExceptionalAuthorityGrant**: artifact_type, exceptional_grant_id, incident_ref,
  target_action_family, tenant_id, client_id, partition_scope_refs[], requesting_principal_ref,
  requesting_principal_class, approving_principal_ref, approving_principal_class, activated_at,
  expires_at, revoked_at, usage_limit, remaining_uses, rationale, compensating_control_refs[],
  lifecycle_state, approval_step_up_state, approval_step_up_evidence_ref, self_approved,
  authority_acknowledgement_override_permitted, delegation_substitution_permitted,
  silent_client_widening_permitted,
  declaration_sign_without_signatory_basis_permitted,
  truth_confirmation_override_permitted, silent_partition_widening_permitted
- **AuthorityOperationProfile**: artifact_type, profile_id, operation_family, authority_name,
  authority_product_profile, provider_environment, provider_api_version, transport_rules,
  required_scopes, fraud_header_profile_ref, fraud_header_exemption_reason, idempotency_strategy,
  success_response_rules, pending_unknown_rules, reconciliation_rules, legal_state_rules
  `ConnectorBinding`, `DelegationGrant`, `AuthorityLink`, `ExceptionalAuthorityGrant`, and
  `AuthorityOperationProfile` are the schema-backed connector/delegation control objects. They SHALL
  validate against `schemas/connector_binding.schema.json`, `schemas/delegation_grant.schema.json`,
  `schemas/authority_link.schema.json`, `schemas/exceptional_authority_grant.schema.json`, and
  `schemas/authority_operation_profile.schema.json` so provider credential lineage, delegated client
  authority, bounded exceptions, and provider contract profiles remain machine-checkable.
  `ConnectorBinding` and `AuthorityLink` SHALL keep client, subject, provider, and token-lineage
  identity explicit and inseparable; `DelegationGrant` SHALL keep imported freshness and scope basis
  explicit; `ExceptionalAuthorityGrant` SHALL stay bounded-use, non-self-approved, and incapable of
  widening client or partition lineage; and `AuthorityOperationProfile` SHALL keep fraud-header and
  idempotency posture explicit instead of letting send-time code infer them. Unresolved
  `pending_unknown_rules.retry_class` SHALL remain reconciliation-owned or manual-review-owned,
  never `SAFE_RETRY` or `REBUILD_THEN_RETRY`, so timeout/no-body ambiguity cannot reopen blind
  mutation resend through profile drift.
- **SourceCollectionRun**: artifact_type, collection_run_id, manifest_id, lifecycle_state,
  state_transition_contract{{...}}, source_window_ref, fetch_audit_refs[], partial_gap_refs[],
  failure_reason_code_or_null, abandoned_reason_code_or_null, started_at_or_null,
  completed_at_or_null, state_changed_at, audit_refs[], provenance_refs[]
  `SourceCollectionRun` is the manifest-bound collection control object. It SHALL validate against
  `schemas/source_collection_run.schema.json` so fetching, partial, failed, and abandoned outcomes
  retain named-transition lineage, typed gap/failure reasons, and no partial-write lifecycle drift.
- **WorkflowItem**: artifact_type, item_id, tenant_id, client_id, period, type, lifecycle_state,
  state_transition_contract{{...}}, priority,
  due_at, context_refs[], title, collaboration_visibility, customer_status_projection,
  authority_truth_state,
  current_assignee_ref, assignment_state, escalation_target_ref, routing_queue_ref,
  routing_contract{{ contract_version, routing_scope, routing_profile_code, routing_profile_hash,
  routing_queue_ref, basis_hash, canonical_sort_key{{ collaboration_priority_score, escalation_rank,
  effective_due_at_or_null, resolution_confidence_score, queue_entered_at, item_id }},
  assignment_efficiency_score, ownership_confidence_score, sla_pressure_score,
  escalation_pressure_score, escalation_pressure_threshold, reassignment_gain_threshold,
  resolution_confidence_score, resolution_confidence_floor, queue_health_score,
  queue_pressure_score, queue_health_floor, queue_health_state, escalation_rank,
  collaboration_priority_score, assignment_recommendation_state, recommended_assignee_ref_or_null,
  escalation_recommendation_state, recommended_escalation_target_ref_or_null,
  recommended_action_code_or_null, focused_row_reorder_state, draft_safety_state,
  ordering_reason_codes[], recommendation_reason_codes[] }}, waiting_on_actor,
  sla_policy_ref, sla_due_at, customer_due_at, due_state, queue_entered_at, last_assignment_at,
  waiting_since_at, reassignment_count_30d, ownership_confidence_score,
  assignment_efficiency_score, sla_pressure_score, escalation_pressure_score,
  collaboration_priority_score, resolution_confidence_score, customer_thread_ref, internal_thread_ref,
  staff_workspace_version, customer_workspace_version, active_request_info_ref,
  next_request_info_ordinal, truth_boundary_contract{{ contract_version, artifact_role,
  authoritative_source_policy, projection_input_policy, durable_writeback_policy,
  recovery_basis_policy, authoritative_record_families[], observable_projection_families[] }},
  authority_truth_contract{{ contract_version, boundary_scope, truth_surface_role,
  surface_specific_binding_policy, authority_confirmation_policy, non_confirming_state_policy,
  normalization_gate_policy, mirror_projection_policy, unresolved_projection_policy,
  override_confirmation_policy, correction_propagation_policy }},
  last_customer_activity_at, last_internal_activity_at,
  last_customer_visible_event_ref, last_internal_event_ref, dedupe_key, closed_at
  `WorkflowItem` is the deterministic module-planned work contract. It SHALL validate against
  `schemas/workflow_item.schema.json` so lifecycle, customer projection, assignment, request-for-info
  posture, paired activity markers, staff/customer workspace-version ordering, and explicit
  authority-versus-internal truth separation stay aligned. Workflow completion and customer
  projection SHALL remain subordinate to `authority_truth_state`; internal queue progress SHALL not
  confirm pending, unknown, partial, rejected, or out-of-band authority posture.
- **CollaborationThread**: thread_id, item_id, visibility_class, head_sequence, lifecycle_state,
  participant_refs[], last_entry_ref
- **CollaborationEntry**: entry_id, item_id, thread_id, thread_sequence, entry_type, visibility_class,
  causal_parent_entry_ref, body_ref, attachment_refs[], actor_ref, created_at, command_id,
  semantic_action_id, command_receipt_ref, audit_event_ref, request_info_ref, redaction_state
- **CollaborationAttachment**: artifact_type, attachment_id, item_id, published_entry_ref,
  current_state_entry_ref, state_audit_event_ref, visibility_class, request_info_ref,
  upload_session_id, publish_copy_mode, source_attachment_ref, filename, media_type, byte_size,
  checksum, storage_ref, download_ref, malware_scan_state, publication_state, download_state,
  unavailable_reason_code, uploaded_by_ref, uploaded_at, published_at, state_changed_at,
  scan_completed_at, semantic_action_id, retention_class
  `CollaborationAttachment` is the governed published-file contract. It SHALL preserve staged upload
  lineage, monotonic publish-state timing, customer-safe derivation lineage, explicit
  downloadability, and quarantine-state audit pointers rather than letting raw storage presence
  imply availability.
- **RequestInfoRecord**: artifact_type, request_info_id, item_id, visibility_class,
  request_info_ordinal, lifecycle_state, request_state_version, prompt_entry_ref, prompt_body_ref,
  requested_by_ref, customer_due_at, opened_notification_refs[], opened_at, response_entry_ref,
  response_body_ref, responded_by_ref, responded_at, closure_entry_ref, closed_by_ref,
  closure_reason_code, closed_at, audit_event_refs[]
- **WorkItemParticipant**: artifact_type, participant_ref, item_id, participant_role, watch_state,
  last_read_customer_sequence, last_read_internal_sequence, notification_preferences_ref
  `RequestInfoRecord` and `WorkItemParticipant` are the durable customer-request and watcher-posture
  artifacts for shared workspaces. They SHALL validate against
  `schemas/request_info_record.schema.json` and `schemas/work_item_participant.schema.json` so
  request numbering, due-date lineage, customer reply linkage, non-empty audit lineage, distinct
  prompt-vs-response refs, exact request-state-version progression, ownership posture,
  customer-participant role mapping, and unread cursors remain machine-checkable.
- **WorkItemNotification**: notification_id, item_id, recipient_ref, visibility_class,
  notification_type, delivery_channel, dedupe_key, semantic_action_id,
  visibility_partition{{ partition_scope, audience_class, allowed_visibility_classes[],
  access_binding_hash, masking_posture_fingerprint, cache_partition_key,
  badge_counter_policy, ordering_side_channel_policy, limited_state_presentation,
  export_scope_policy, fallback_discovery_policy }}, access_binding_hash,
  customer_safe_projection,
  cross_device_continuity_contract{{ continuity_scope, canonical_object_ref, route_identity_ref,
  parent_context_ref_or_null, focus_anchor_ref_or_null, return_focus_anchor_ref_or_null,
  dominant_action_state_or_null, stability_guard_hash_or_null, access_scope_hash_or_null,
  masking_scope_fingerprint_or_null, session_scope_ref_or_null,
  visibility_cache_partition_key_or_null, compatibility_basis_class,
  allowed_embodiments[], secondary_window_policy, supported_invalidation_reason_codes[] }},
  queue_projection{{ projection_scope, basis_hash, routing_contract{{ contract_version,
  routing_scope, routing_profile_code, routing_profile_hash, routing_queue_ref, basis_hash,
  canonical_sort_key{{ collaboration_priority_score, escalation_rank, effective_due_at_or_null,
  resolution_confidence_score, queue_entered_at, item_id }}, assignment_efficiency_score,
  ownership_confidence_score, sla_pressure_score, escalation_pressure_score,
  escalation_pressure_threshold, reassignment_gain_threshold, resolution_confidence_score,
  resolution_confidence_floor, queue_health_score, queue_pressure_score, queue_health_floor,
  queue_health_state, escalation_rank, collaboration_priority_score,
  assignment_recommendation_state, recommended_assignee_ref_or_null,
  escalation_recommendation_state, recommended_escalation_target_ref_or_null,
  recommended_action_code_or_null, focused_row_reorder_state, draft_safety_state,
  ordering_reason_codes[], recommendation_reason_codes[] }}, latest_change_lane_or_null,
  customer_unread_count, internal_unread_count_or_null,
  customer_activity_module_badge_count, internal_activity_module_badge_count_or_null,
  canonical_sort_key{{ collaboration_priority_score, escalation_rank,
  effective_due_at_or_null, resolution_confidence_score, queue_entered_at, item_id }},
  focus_continuity_state, filter_membership_state, notification_target_module_code_or_null }},
  shell_family, object_anchor_ref, target_route_ref, target_module_code, focus_anchor_ref,
  focus_restoration{{ requested_focus_anchor_ref_or_null, resolved_focus_anchor_ref_or_null,
  restoration_disposition, restoration_reason_code_or_null }}, return_route_ref,
  return_focus_anchor_ref, fallback_route_ref, fallback_focus_anchor_ref,
  fallback_reason_code_or_null,
  workspace_version_at_queue, request_info_ref, queued_at, delivered_at, read_at,
  suppressed_reason_codes[]
  `WorkItemNotification` SHALL preserve one grouped same-object continuity envelope alongside the
  notification-open routing fields so browser and native entry stay bound to the same shell family,
  object anchor, visibility partition, and parent return target.
- **WorkInboxSnapshot**: artifact_type, tenant_id, shell_family, inbox_route_key,
  dominant_question, settlement_state, recovery_posture, interaction_layer{{ mounted_content_policy, refresh_presentation,
  recovery_presentation, recovery_notice_surface, delta_promotion_mode, selector_profile,
  shell_continuity_policy, activity_partition_policy, investigation_presentation_policy,
  secondary_window_policy, notification_surface, artifact_preview_surface, history_presentation,
  motion_profile, unsafe_action_policy, feedback_truth_policy }}, viewer_mode, active_filters{{ assignee_scope, lifecycle_states[],
  waiting_on_actors[], due_states[], customer_status_projections[], selected_filter_chips[],
  escalation_only, include_resolved_recently }}, queue_health_score, queue_health_contract{{
  contract_version, queue_scope, routing_profile_code, routing_profile_hash, queue_route_key,
  basis_hash, queue_health_score, queue_pressure_score, queue_health_floor, queue_health_state,
  intervention_recommendation_state, ordering_policy, focus_safe_live_update_policy,
  reason_codes[] }}, inbox_version,
  visibility_partition{{ partition_scope, audience_class, allowed_visibility_classes[],
  access_binding_hash, masking_posture_fingerprint, cache_partition_key,
  badge_counter_policy, ordering_side_channel_policy, limited_state_presentation,
  export_scope_policy, fallback_discovery_policy }},
  last_published_sequence, resume_token, access_binding_hash, masking_posture_fingerprint,
  rows[]{ item_id, focus_anchor_ref, sort_key{{ collaboration_priority_score, escalation_rank,
  effective_due_at, resolution_confidence_score, queue_entered_at, item_id }},
  queue_projection{{ projection_scope, basis_hash, routing_contract{{ contract_version,
  routing_scope, routing_profile_code, routing_profile_hash, routing_queue_ref, basis_hash,
  canonical_sort_key{{ collaboration_priority_score, escalation_rank, effective_due_at_or_null,
  resolution_confidence_score, queue_entered_at, item_id }}, assignment_efficiency_score,
  ownership_confidence_score, sla_pressure_score, escalation_pressure_score,
  escalation_pressure_threshold, reassignment_gain_threshold, resolution_confidence_score,
  resolution_confidence_floor, queue_health_score, queue_pressure_score, queue_health_floor,
  queue_health_state, escalation_rank, collaboration_priority_score,
  assignment_recommendation_state, recommended_assignee_ref_or_null,
  escalation_recommendation_state, recommended_escalation_target_ref_or_null,
  recommended_action_code_or_null, focused_row_reorder_state, draft_safety_state,
  ordering_reason_codes[], recommendation_reason_codes[] }}, latest_change_lane_or_null,
  customer_unread_count, internal_unread_count_or_null,
  customer_activity_module_badge_count, internal_activity_module_badge_count_or_null,
  canonical_sort_key{{ collaboration_priority_score, escalation_rank,
  effective_due_at_or_null, resolution_confidence_score, queue_entered_at, item_id }},
  focus_continuity_state, filter_membership_state, notification_target_module_code_or_null }},
  title, client_label, period_label, internal_lifecycle_state, customer_status_projection, assignee_label,
  waiting_on_actor, due_state, effective_due_at, last_activity_at, customer_unread_count,
  internal_unread_count, escalation_active, collaboration_priority_score, escalation_rank,
  resolution_confidence_score, sla_pressure_score, queue_entered_at,
  row_actions{{ actionability_state, primary_action_code, secondary_action_codes[],
  available_action_codes[], blocked_action_codes[], available_action_bindings[]{{
  action_code, mutation_precondition_binding_or_null }}, authoritative_action{{
  projection_scope, basis_hash, projection_route_key, projection_version,
  access_binding_hash, visibility_cache_partition_key, customer_safe_projection,
  actionability_state, primary_action_code_or_null, secondary_action_codes[],
  available_action_codes[], blocked_action_codes[], blocking_reason_code_or_null,
  machine_reason_codes[], suggested_module_code_or_null, recovery_route_ref_or_null,
  recovery_focus_anchor_ref_or_null }} }} }, selected_item_ref,
  selected_focus_anchor_ref_or_null
  `WorkInboxSnapshot` is the reconnect-safe staff triage read model. It SHALL preserve deterministic
  row order, split unread lane counts, queue-projection badge and sort mirrors, route-stable filter
  chips, quick-action legality, and row focus restore anchors so browser and native inboxes do not
  drift under live updates or stale-view rebases. It SHALL also carry explicit top-level
  `settlement_state` and `recovery_posture` plus the shared operator `interaction_layer` so inbox
  selectors, inline-recovery posture, subtle motion, and current-first artifact treatment stay
  aligned with the rest of the staff/operator bucket. It SHALL validate against
  `schemas/work_inbox_snapshot.schema.json`.
- **WorkInboxDelta**: artifact_type, tenant_id, inbox_sequence, delivery_class, inbox_route_key,
  inbox_version, visibility_partition{{ partition_scope, audience_class, allowed_visibility_classes[],
  access_binding_hash, masking_posture_fingerprint, cache_partition_key,
  badge_counter_policy, ordering_side_channel_policy, limited_state_presentation,
  export_scope_policy, fallback_discovery_policy }}, causal_semantic_action_id, row_upserts[]{ item_id, row, order_changed,
  defer_reorder_until_focus_exit, queue_projection_basis_hash }, row_removals[]{ item_id, removal_cause,
  preserve_until_focus_exit, queue_projection_basis_hash }, badge_updates[]{ item_id, basis_hash,
  customer_unread_count, internal_unread_count, customer_activity_module_badge_count,
  internal_activity_module_badge_count_or_null, latest_change_lane_or_null }, occurred_at
  `WorkInboxDelta` is the idempotent live-update patch contract for the staff inbox. It SHALL make
  row removals explicit, keep split unread-badge updates separate, bind every badge or reorder
  outcome to one shared queue-projection basis, and signal deferred reorder or removal semantics
  when a focused row would otherwise jump or disappear mid-triage. It SHALL validate against
  `schemas/work_inbox_delta.schema.json`.
- **WorkspaceSnapshot**: artifact_type, item_id, tenant_id, shell_family, object_anchor_ref,
  workspace_route_key, experience_profile, viewer_scope, dominant_question, dominance_contract,
  cross_device_continuity_contract{{ continuity_scope, canonical_object_ref, route_identity_ref,
  parent_context_ref_or_null, focus_anchor_ref_or_null, return_focus_anchor_ref_or_null,
  dominant_action_state_or_null, stability_guard_hash_or_null, access_scope_hash_or_null,
  masking_scope_fingerprint_or_null, session_scope_ref_or_null,
  visibility_cache_partition_key_or_null, allowed_embodiments[], same_object_policy,
  same_shell_policy, narrow_layout_policy, deep_link_return_policy, action_posture_policy,
  hydration_compatibility_policy, compatibility_basis_class, restoration_mode_policy,
  secondary_window_policy, supported_invalidation_reason_codes[] }},
  cache_isolation_contract{{ cache_scope_class, tenant_id, principal_class, session_binding_hash,
  access_binding_hash_or_null, masking_posture_fingerprint_or_null, route_identity_ref,
  canonical_object_ref, projection_version_ref, cache_partition_ref }},
  native_cache_hydration_contract{{ hydration_scope_class, tenant_id, principal_class,
  session_binding_hash, session_lineage_ref_or_null, access_binding_hash_or_null,
  masking_posture_fingerprint, route_identity_ref, canonical_object_ref, shell_family,
  schema_compatibility_ref, projection_guard_ref, resume_binding_ref_or_null,
  restoration_anchor_ref_or_null, preview_subject_ref_or_null, compatibility_dimensions[],
  purge_trigger_reason_codes[], regulated_local_artifact_classes[] }},
  semantic_accessibility_contract{{ contract_version, shell_family, selector_profile,
  required_anchor_codes[], semantic_focus_order[], announced_change_kinds[] }},
  settlement_state,
  recovery_posture, interaction_layer{{ mounted_content_policy, refresh_presentation,
  recovery_presentation, recovery_notice_surface, delta_promotion_mode, selector_profile,
  shell_continuity_policy, activity_partition_policy, investigation_presentation_policy,
  secondary_window_policy, notification_surface, artifact_preview_surface,
  history_presentation, motion_profile, unsafe_action_policy, feedback_truth_policy }},
  frame_epoch, workspace_version, customer_head_sequence, internal_head_sequence_or_null,
  active_request_info_ref_or_null, request_state_version_or_null, shell_stability_token,
  last_published_sequence, resume_token, stability_contract{{ route_scope_class,
  publication_generation, guard_vector_hash, guard_vector_components{{...}},
  last_published_sequence_or_null, resume_token_or_null, resume_capability }},
  stream_recovery_contract{{ contract_version, stream_scope_class, route_key, subject_ref,
  shell_stability_token, session_ref, session_binding_hash, access_binding_hash,
  masking_context_hash, publication_generation, frame_epoch, last_published_sequence,
  compaction_floor_sequence_or_null, resume_binding_representation,
  resume_binding_ref_or_null, delivery_window_state, rebase_reason_code_or_null,
  resume_token_binding_mode, sequence_application_policy, duplicate_delivery_policy,
  catch_up_policy, rebase_trigger_policy }},
  visibility_partition{{ partition_scope, audience_class, allowed_visibility_classes[],
  access_binding_hash, masking_posture_fingerprint, cache_partition_key,
  badge_counter_policy, ordering_side_channel_policy, limited_state_presentation,
  export_scope_policy, fallback_discovery_policy }},
  access_binding_hash, masking_posture_fingerprint, queue_projection{{ projection_scope, basis_hash,
  latest_change_lane_or_null, customer_unread_count, internal_unread_count_or_null,
  customer_activity_module_badge_count, internal_activity_module_badge_count_or_null,
  canonical_sort_key{{ collaboration_priority_score, escalation_rank,
  effective_due_at_or_null, resolution_confidence_score, queue_entered_at, item_id }},
  focus_continuity_state, filter_membership_state, notification_target_module_code_or_null }},
  route_context{{ entry_surface, active_route_ref, active_module_code, focus_anchor_ref_or_null,
  artifact_focus_bucket_or_null, artifact_focus_subject_ref_or_null,
  focus_restoration{{ requested_focus_anchor_ref_or_null, resolved_focus_anchor_ref_or_null,
  restoration_disposition, restoration_reason_code_or_null }}, return_route_ref,
  return_focus_anchor_ref, fallback_route_ref, fallback_focus_anchor_ref, fallback_reason_code }},
  surface_order[], context_bar{{ title, item_id, client_label, period_label,
  customer_status_projection, waiting_on_actor, due_state, freshness_state,
  freshness_notice_ref_or_null, recovery_notice_ref_or_null, internal_lifecycle_state,
  assignee_label, escalation_active }}, decision_summary{{ summary_ref, next_actor,
  next_actor_summary_ref, due_summary_ref, customer_state_differs, customer_state_summary_ref,
  reason_codes[] }}, action_strip{{ actionability_state, primary_action_code,
  secondary_action_codes[], available_action_codes[], blocked_action_codes[], ownership_posture,
  ownership_label, waiting_on_label, blocking_reason, machine_reason_codes[],
  suggested_module_code, authoritative_action{{ projection_scope, basis_hash,
  projection_route_key, projection_version, access_binding_hash,
  visibility_cache_partition_key, customer_safe_projection, actionability_state,
  primary_action_code_or_null, secondary_action_codes[], available_action_codes[],
  blocked_action_codes[], blocking_reason_code_or_null, machine_reason_codes[],
  suggested_module_code_or_null, recovery_route_ref_or_null,
  recovery_focus_anchor_ref_or_null }} }}, detail_drawer{{ modules[], promoted_module_code, expanded_module_code,
  focus_anchor_ref, fallback_reason_code, composer_layer{{ surface_order[],
  available_append_command_codes[], default_append_command_code_or_null,
  selected_append_command_code_or_null, composer_visibility_class_or_null,
  visibility_label_ref_or_null, target_request_info_ref_or_null, draft_state, draft_ref_or_null,
  draft_last_saved_at_or_null, rebase_target_snapshot_ref_or_null,
  publish_block_reason_codes[], attachment_picker{{ picker_state, staged_upload_refs[],
  inherited_visibility_class_or_null, visibility_confirmation_required,
  visibility_confirmed }}, publish_confirmation{{ confirmation_state,
  publish_action_code_or_null, confirmation_message_ref_or_null }} }} }}, modules[]{{ module_code, content_state,
  limitation_reason_codes[], placeholder_refs[], module_badge_count,
  new_activity_marker_ref_or_null, visibility_partition, file_segments[],
  current_shared_file_refs[], historical_shared_file_refs[], internal_only_file_refs[] }},
  permissions{{...}}, participants[], customer_request_workspace{{ surface_order[],
  status_code, status_label_ref, due_label_ref_or_null, action_order[],
  visible_action_codes[], primary_action_label_ref_or_null,
  no_safe_action_reason_ref_or_null, authoritative_action{{ projection_scope, basis_hash,
  projection_route_key, projection_version, access_binding_hash,
  visibility_cache_partition_key, customer_safe_projection, actionability_state,
  primary_action_code_or_null, secondary_action_codes[], available_action_codes[],
  blocked_action_codes[], blocking_reason_code_or_null, machine_reason_codes[],
  suggested_module_code_or_null, recovery_route_ref_or_null,
  recovery_focus_anchor_ref_or_null }}, artifact_history_state,
  current_artifact_ref_or_null, historical_artifact_refs[], artifact_selection{{ selection_scope,
  presentation_mode, primary_subject_refs[], authoritative_subject_refs[],
  historical_subject_refs[], limited_history_state, limited_history_count_or_null,
  default_preview_target_ref_or_null, default_download_target_ref_or_null,
  default_print_target_ref_or_null }}, artifact_affordance{{ affordance_scope,
  primary_subject_role, visible_primary_subject_ref_or_null, header_posture,
  history_affordance_state, preview_open_policy, default_preview_target_ref_or_null,
  default_download_target_ref_or_null, default_print_target_ref_or_null }} }} or `null`
  `WorkspaceSnapshot` is the visibility-scoped collaboration workspace contract. It SHALL preserve
  route-visible versioning, dominant-question continuity, settlement and recovery posture, dual-lane
  activity boundaries, explicit no-safe-action posture, permission-backed visible action legality,
  mounted-module coherence, split module badging, non-disruptive new-activity affordances,
  machine-readable composer visibility and draft/rebase posture, explicit publish-confirmation
  state, the shared `interaction_layer` for inline refresh/rebase/notification/preview behavior,
  selector continuity, visibility-scoped lane partitioning, summary-first investigation posture,
  and current-vs-history file separation without leaking internal-only posture or staff
  participants into customer-visible routes. It SHALL additionally keep one explicit
  `visibility_partition` contract so access-binding, masking, cache-key, badge, ordering, export,
  and fallback semantics stay frozen across hydration and stream replay. It SHALL also keep shell ownership explicit
  through `shell_family`, `object_anchor_ref`, `route_context{...}`, and
  `cross_device_continuity_contract{...}` so refresh, reconnect,
  notification open, browser back, and native relaunch all restore the same work-item detail route,
  module, grouped focus-restoration outcome, and parent return target instead of remounting a
  generic queue or portal shell. `stream_recovery_contract{...}` SHALL additionally freeze the
  authoritative workspace stream binding, published frontier, compaction floor, and
  access/masking/session recovery posture so the raw `resume_token` never acts as a free-floating
  cache hint. On
  customer-visible request-detail routes it SHALL also publish one explicit
  `customer_request_workspace{ language_contract, ... }` block so plain-language status family,
  due label, visible action ordering, explicit no-safe-action explanation, and
  current-versus-history artifact posture remain machine-readable instead of being reconstructed
  from staff-first fields.
- **CustomerRequestListSnapshot**: artifact_type, tenant_id, client_id, shell_family,
  request_list_route_key, object_anchor_ref, dominant_question, language_contract, settlement_state, recovery_posture,
  interaction_layer{{ navigation_model, spacing_profile, status_language_profile, selector_profile,
  support_region_policy, route_continuity_policy, focus_restoration_policy,
  artifact_hierarchy_policy, responsive_detail_policy, motion_profile, feedback_truth_policy }}, row_band_order[],
  queue_group_order[], active_filters{{ status_codes[], due_states[], unread_only,
  files_requested_only }}, list_version, last_published_sequence, resume_token,
  visibility_partition{{ partition_scope, audience_class, allowed_visibility_classes[],
  access_binding_hash, masking_posture_fingerprint, cache_partition_key,
  badge_counter_policy, ordering_side_channel_policy, limited_state_presentation,
  export_scope_policy, fallback_discovery_policy }},
  access_binding_hash, masking_posture_fingerprint, customer_safe_projection, rows[]{ item_id, focus_anchor_ref,
  title, status_code, status_label_ref, due_state, due_at_or_null, due_label_ref_or_null,
  unread_count, last_staff_update_at_or_null, files_requested, primary_action_code_or_null,
  primary_action_label_ref_or_null, no_safe_action_reason_ref_or_null,
  authoritative_action{{ projection_scope, basis_hash, projection_route_key, projection_version,
  access_binding_hash, visibility_cache_partition_key, customer_safe_projection,
  actionability_state, primary_action_code_or_null, secondary_action_codes[],
  available_action_codes[], blocked_action_codes[], blocking_reason_code_or_null,
  machine_reason_codes[], suggested_module_code_or_null, recovery_route_ref_or_null,
  recovery_focus_anchor_ref_or_null }},
  artifact_history_state, current_artifact_ref_or_null, historical_artifact_refs[] },
  selected_item_ref_or_null, selected_focus_anchor_ref_or_null, updated_at
  `CustomerRequestListSnapshot` is the reconnect-safe queue contract for `/portal/requests`. It
  SHALL preserve the customer-safe queue hierarchy, explicit due posture, bounded next-action
  vocabulary, explicit no-safe-action rows, focus continuity, and current-versus-history artifact
  posture without leaking internal lifecycle, assignee, escalation, or audit state into the
  customer-visible queue. It SHALL also carry explicit top-level `settlement_state` and
  `recovery_posture`, shared `language_contract`, and shared portal `interaction_layer` so the queue keeps the same
  task-first spacing, same-shell contextual return, semantic selectors, and subtle motion as the
  rest of the portal. Its `rows[].focus_anchor_ref` and
  `selected_focus_anchor_ref_or_null` SHALL remain lawful return anchors for portal contextual
  request-detail routes.
- **CollaborationActivitySlice**: artifact_type, item_id, workspace_route_key, viewer_scope,
  thread_visibility_class, workspace_version, shell_stability_token,
  visibility_partition{{ partition_scope, audience_class, allowed_visibility_classes[],
  access_binding_hash, masking_posture_fingerprint, cache_partition_key,
  badge_counter_policy, ordering_side_channel_policy, limited_state_presentation,
  export_scope_policy, fallback_discovery_policy }}, access_binding_hash,
  masking_posture_fingerprint, customer_safe_projection,
  active_filters{{ thread_visibility_class, request_info_ref_or_null,
  include_system_entries, before_sequence_or_null }}, head_sequence,
  newest_returned_sequence_or_null, oldest_returned_sequence_or_null, next_before_sequence_or_null,
  has_more_before, focus_anchor_ref_or_null, entry_refs[], latest_workspace_snapshot_ref,
  returned_at
  `CollaborationActivitySlice` is the northbound paginated activity-read contract for one visible
  collaboration lane. It SHALL preserve the same route-visible guard spine as the mounted workspace
  together with explicit thread filters, one aligned `customer_safe_projection` contract for
  customer-visible reads, and backward-pagination posture so inline updates and history paging
  cannot leak internal thread state or silently jump the caller to a different lane.
- **CollaborationAttachmentSlice**: artifact_type, item_id, workspace_route_key, viewer_scope,
  visibility_class, workspace_version, shell_stability_token,
  visibility_partition{{ partition_scope, audience_class, allowed_visibility_classes[],
  access_binding_hash, masking_posture_fingerprint, cache_partition_key,
  badge_counter_policy, ordering_side_channel_policy, limited_state_presentation,
  export_scope_policy, fallback_discovery_policy }}, access_binding_hash,
  masking_posture_fingerprint, customer_safe_projection,
  active_filters{{ visibility_class, request_info_ref_or_null,
  include_history, include_pending_placeholders }}, focus_anchor_ref_or_null,
  current_attachment_refs[], historical_attachment_refs[], artifact_selection{{ selection_scope,
  presentation_mode, primary_subject_refs[], authoritative_subject_refs[],
  historical_subject_refs[], limited_history_state, limited_history_count_or_null,
  default_preview_target_ref_or_null, default_download_target_ref_or_null,
  default_print_target_ref_or_null }}, artifact_affordance{{ affordance_scope,
  primary_subject_role, visible_primary_subject_ref_or_null, header_posture,
  history_affordance_state, preview_open_policy, default_preview_target_ref_or_null,
  default_download_target_ref_or_null, default_print_target_ref_or_null }},
  latest_workspace_snapshot_ref, returned_at
  `CollaborationAttachmentSlice` is the visibility-scoped northbound attachment-read contract. It
  SHALL preserve explicit current-versus-history partitioning, route-visible guard posture, one
  aligned `customer_safe_projection` contract for customer-visible reads, and request-for-info
  visibility filters so collaboration file reads remain customer-safe and inline refresh cannot
  blend internal-only, draft-placeholder, pending, or superseded files into one unlabeled list.
- **OperatorMorningDigest**: artifact_type, digest_id, tenant_id, coverage_date,
  source_batch_run_refs[], derivation_contract{{...}}, covered_selection_entry_refs[],
  summary_counts{{...}}, outcome_entry_refs{{...}}, queue_summaries[],
  highlighted_client_outcomes[], waiting_on_authority_refs[], late_data_hold_refs[],
  backlog_pressure, portfolio_tail_risk, stability_state, published_workflow_item_refs[],
  published_notification_refs[], generated_by_principal_ref, generated_at, published_at,
  supersedes_digest_id
  `OperatorMorningDigest` is the overnight operator handoff read model. It SHALL be derived only
  from persisted batch, manifest, decision, workflow, authority, late-data, drift, and error truth
  so next-morning triage does not require log reconstruction or inference from queue side effects.
  It SHALL validate against `schemas/operator_morning_digest.schema.json` so queue grouping, summary
  counts, highlighted outcomes, batch stability indicators, and digest supersession remain
  machine-checkable. `derivation_contract{...}` SHALL freeze the source batch set, single-window
  basis, workflow/notification publication completion, exact outcome/queue/highlight/workflow/
  notification/waiting/late-data QA hashes, and monotonic supersession lineage so the morning
  digest stays a first-class handoff artifact rather than a dashboard summary.
  `covered_selection_entry_refs[]` SHALL equal the exact union of `outcome_entry_refs{...}`, and
  `queue_summaries[].source_basis`, `queue_summaries[].item_refs[]`, highlighted
  `selection_entry_ref`, highlighted `work_item_ref`, and highlighted `entry_loss_score` SHALL all
  remain replayable from persisted workflow and selection truth. `publication_qa_completed_at`
  SHALL not predate settled workflow or notification publication, and digest publication timestamps
  SHALL remain monotonic so the digest never implies queue truth that was not yet published.
- **NightlyPortfolioWhatIfSimulation**: artifact_type, simulation_id, tenant_id,
  nightly_window_key, execution_mode_boundary_contract{{...}}, basis_contract{{...}},
  baseline_digest_ref_or_null, baseline_summary_counts{{...}}, simulated_summary_counts{{...}},
  baseline_backlog_pressure, simulated_backlog_pressure, baseline_portfolio_tail_risk,
  simulated_portfolio_tail_risk, baseline_stability_state, simulated_stability_state,
  baseline_highlighted_selection_entry_refs[], simulated_highlighted_selection_entry_refs[],
  entry_diffs[], highlight_diffs[], simulated_by_principal_ref, simulated_at
  `NightlyPortfolioWhatIfSimulation` is the FE-88 non-mutating overnight comparison artifact. It
  SHALL validate against `schemas/nightly_portfolio_what_if_simulation.schema.json` so alternate
  unattended policy, capacity, retry, release, and authority scenarios remain grounded in one
  frozen nightly source-batch basis instead of ad hoc live queue queries. Its `basis_contract{...}`
  SHALL freeze the exact source batch set, covered selection-entry partition, baseline release and
  schema identity, and declared counterfactual knobs, while `entry_diffs[]` and `highlight_diffs[]`
  SHALL explain every simulated bucket, ordering, and digest-highlight change with explicit
  reason-code diffs.
- **RemediationTask**: task_id, error_id, manifest_id, root_manifest_id, task_type, owner_type,
  owner_ref, failure_resolution_contract{{...}}, due_at, priority, task_state,
  remediation_steps_ref, blocking_class, retention_class, artifact_retention_ref,
  workflow_item_id, superseded_by_task_id, closure_outcome, resolution_basis_ref,
  closure_evidence_refs[], error_resolution_effect, created_at, started_at, completed_at,
  accepted_risk_approval_ref, investigation_ref, audit_refs[], provenance_refs[]
  `RemediationTask` is the governed operator follow-up object for a material failure. It SHALL
  retain one lawful owner, the shared `failure_resolution_contract`, the exact closure basis and
  evidence, and an explicit `error_resolution_effect` so task completion cannot silently diverge
  from the source `ErrorRecord`. Accepted-risk and investigation-backed closure paths SHALL keep
  their approval or investigation linkage explicit rather than degrading into free-text resolution.
- **Override**: override_id, tenant_id, scope, decision_type, rationale, approver_id, expires_at
- **ConfigChangeRequest**: artifact_type, ccr_id, tenant_id, lifecycle_state,
  state_transition_contract{{...}}, diff_ref, risk_assessment_ref, approvals[],
  rejected_reason_code_or_null, implemented_release_ref_or_null,
  rolled_back_release_ref_or_null, state_changed_at, created_at, audit_refs[], provenance_refs[]
  `ConfigChangeRequest` is the governed configuration mutation lane. It SHALL validate against
  `schemas/config_change_request.schema.json` so review, test, approval, implementation, and
  rollback posture remain bound to named transitions and release lineage rather than queue-local
  status text.
- **ApiCommandReceipt**: receipt_id, tenant_id, client_id, principal_ref, session_ref, command_id,
  command_type, target_scope_class, manifest_id, work_item_id, governance_target_ref, request_hash,
  dependency_topology_hash, simulation_basis_hash, latest_mutation_basis_contract_or_null,
  idempotency_key, acceptance_state,
  original_acceptance_state, duplicate_of_receipt_id,
  projection_stream_class, latest_projection_sequence, latest_projection_ref, semantic_action_id,
  truth_boundary_contract{{ contract_version, artifact_role, authoritative_source_policy,
  projection_input_policy, durable_writeback_policy, recovery_basis_policy,
  authoritative_record_families[], observable_projection_families[] }}, mutation_precondition_binding,
  stale_guard_family, latest_stale_guard_value, activity_refs[], audit_event_refs[],
  notification_refs[], result_ref, reason_codes[], accepted_at, expires_at
  `ApiCommandReceipt` is the durable command-edge contract. It SHALL preserve duplicate-suppression,
  stale-view rejection, and typed acceptance posture instead of collapsing retries into transport-only
  acknowledgements. Success-class receipts SHALL retain at least one recovery anchor, duplicate
  lineage shall never self-point, expired success projections SHALL preserve the same recovery-anchor
  family they exposed before expiry, and stale-view guard families SHALL stay aligned with the true
  command target. That family SHALL remain rich enough to distinguish manifest shell, approval-pack,
  portal workspace, request-info state, collaboration thread/workspace, and governance simulation
  stale guards instead of flattening all stale rejections into one generic conflict. Governance
  receipts SHALL additionally mirror the current `GovernanceMutationBasisContract`, including
  `basis_contract_hash`, so stale rejection can prove whether the reviewed commit basis itself
  drifted. Wherever a stale
  guard is present, `latest_stale_guard_value` SHALL echo the current authoritative hash, token,
  version, or sequence that caused the rejection so clients and automation do not infer live guard
  state from projection refs alone.
- **ExperienceCursor**: artifact_type, cursor_scope_class, cursor_id, tenant_id, principal_ref,
  manifest_id, shell_route_key, shell_stability_token, session_ref, session_binding_hash,
  access_binding_hash, truth_boundary_contract{{ contract_version, artifact_role,
  authoritative_source_policy, projection_input_policy, durable_writeback_policy,
  recovery_basis_policy, authoritative_record_families[], observable_projection_families[] }},
  frame_epoch, last_ack_sequence, last_published_sequence,
  latest_snapshot_ref, resume_token_hash, stream_recovery_contract,
  native_cache_hydration_contract{{ hydration_scope_class, tenant_id, principal_class,
  session_binding_hash, session_lineage_ref_or_null, access_binding_hash_or_null,
  masking_posture_fingerprint, route_identity_ref, canonical_object_ref,
  schema_compatibility_ref, projection_guard_ref, resume_binding_ref_or_null }},
  stability_contract,
  replacement_stability_contract_or_null, cursor_state, principal_class, masking_posture_hash,
  schema_compatibility_ref, replacement_snapshot_ref, invalidation_reason_code, invalidated_at,
  last_seen_at, expires_at
  `ExperienceCursor` is the reconnect-safe stream cursor contract. It SHALL preserve session-bound
  resume posture, route/shell lineage, the current and replacement route-stability contracts, the
  current shared `stream_recovery_contract`, the FE-75 native hydration legality envelope, rebase
  state, masking/schema binding, and expiry or revocation without leaving resume semantics
  implicit. A cursor SHALL not acknowledge past the published frontier, remain live below the
  published compaction floor, rebase onto the same snapshot it is replacing, or invalidate before
  it was last seen. `shell_route_key` SHALL remain the stable manifest-experience route key for
  that stream lineage and SHALL therefore stay equal to `manifest_id`.
- **WorkspaceCursor**: artifact_type, cursor_scope_class, cursor_id, tenant_id, principal_ref,
  principal_class, item_id, workspace_route_key, session_visibility_class,
  shell_stability_token, session_ref, session_binding_hash, access_binding_hash,
  masking_posture_fingerprint, frame_epoch, workspace_version, customer_head_sequence,
  internal_head_sequence_or_null, request_state_version_or_null, last_ack_sequence,
  last_published_sequence, latest_snapshot_ref, resume_token_hash, stream_recovery_contract,
  native_cache_hydration_contract{{ hydration_scope_class, tenant_id, principal_class,
  session_binding_hash, session_lineage_ref_or_null, access_binding_hash_or_null,
  masking_posture_fingerprint, route_identity_ref, canonical_object_ref,
  schema_compatibility_ref, projection_guard_ref, resume_binding_ref_or_null }},
  stability_contract, replacement_stability_contract_or_null, cursor_state,
  schema_compatibility_ref, replacement_snapshot_ref, invalidation_reason_code, invalidated_at,
  last_seen_at, expires_at
  `WorkspaceCursor` is the reconnect-safe collaboration-stream cursor contract. It SHALL preserve
  hashed resume-token lineage, visibility-scoped route identity, staff-vs-customer lane heads, the
  current and replacement workspace stability contracts, the current shared
  `stream_recovery_contract`, and the FE-75 native hydration legality envelope so recovery does not
  infer catch-up legality from cache-local thread state or stale local cache posture. A workspace
  cursor SHALL not acknowledge past the published frontier, remain live below the compaction floor,
  or rebind hidden internal-only lane history into a customer-visible session.
- **ObligationMirror**: artifact_type, obligation_mirror_id, tenant_id, client_id,
  income_source_partition, period, lifecycle_state, authority_refs[], due_at, current_submission_ref,
  last_confirmed_submission_ref, ready_manifest_ref, blocked_reason_codes[],
  last_authority_sync_at, authority_status_ref, authority_truth_state,
  reconciliation_control_contract_or_null{{...}},
  authority_ingress_proof_contract{{...}},
  authority_truth_contract{{ contract_version, boundary_scope, truth_surface_role,
  surface_specific_binding_policy, authority_confirmation_policy, non_confirming_state_policy,
  normalization_gate_policy, mirror_projection_policy, unresolved_projection_policy,
  override_confirmation_policy, correction_propagation_policy }}
  `ObligationMirror` is the internal obligation view derived from authority evidence. It SHALL keep
  pending packet lineage (`current_submission_ref`), confirmed legal settlement
  (`last_confirmed_submission_ref`), pre-submit readiness (`ready_manifest_ref`), and explicit
  `authority_truth_state` as distinct machine-readable anchors rather than collapsing them into one
  status pointer or letting the mirror become the legal source of truth. When authority-backed
  mirror state is published, `authority_ingress_proof_contract{...}` SHALL name the canonical
  ingress receipt and exact lineage proof that authorized the latest authority-status mutation.
  Pending, unknown, and out-of-band mirrors SHALL also retain
  `reconciliation_control_contract_or_null{...}` so resend legality, unresolved posture,
  escalation ownership, and replay-resume budget math remain durable even when the mirror is
  reissued long after the originating interaction.
- **FilingCase**: artifact_type, filing_case_id, tenant_id, client_id, period, lifecycle_state,
  state_transition_contract{{...}},
  current_manifest_ref, current_trust_ref, current_parity_ref, current_submission_ref,
  current_submission_state, current_packet_ref, packet_state, controlling_proof_bundle_ref,
  proof_closure_state, calculation_basis_ref, authority_calculation_ref, amendment_case_ref,
  calculation_request_ref, calculation_id, calculation_type, calculation_hash,
  readiness_context_ref,
  trust_currency_state, trust_invalidated_at, trust_invalidation_reason_codes[],
  trust_invalidation_dependency_refs[],
  user_confirmation_ref, last_transition_at
  `ObligationMirror` and `FilingCase` SHALL validate against `schemas/obligation_mirror.schema.json`
  and `schemas/filing_case.schema.json` so readiness, legal completion, packet lineage, trust-currentness,
  and amendment posture are machine-checkable. `FilingCase.current_packet_ref` SHALL remain the
  durable packet-legality anchor for filing progression; case state SHALL not reconstruct packet-local
  approval, declaration-basis acknowledgement, or notice resolution from portal or workflow read
  models.
- **AmendmentCase**: artifact_type, amendment_case_id, filing_case_id, client_id, period,
  current_manifest_ref, scope_key, lifecycle_state, baseline_ref, baseline_envelope_ref, drift_ref,
  baseline_frozen_hash, retroactive_impact_ref, retroactive_impact_hash, current_bundle_ref,
  supersedes_amendment_case_id, active_chain_key, intent_ref, amendment_window_ref,
  amendment_window_evaluation_hash, authority_operation_profile_ref, calculation_request_ref,
  calculation_id, calculation_type, calculation_hash, calculation_basis_ref, user_confirmation_ref,
  readiness_context_ref, amendment_eligibility_contract{{...}}, freshness_state,
  freshness_invalidation_reason_codes[], review_state, escalation_state, validation_outcome,
  superseded_at
- **DriftBaselineEnvelope**: artifact_type, baseline_envelope_id, manifest_id, client_id, period,
  baseline_ref, baseline_manifest_id, baseline_type, baseline_scope_refs[], baseline_basis_ref,
  authority_basis_refs[], baseline_submission_state, truth_origin, baseline_effective_at,
  selection_reason_codes[], selection_contract{{selection_contract_hash, scope_resolution_state,
  same_scope_truth_resolution_state, automation_ceiling, review_recommendation_floor,
  amendment_progression_ceiling, benign_drift_eligibility_state, ...}}, frozen_hash,
  supersedes_baseline_frozen_hash_or_null,
  superseded_by_baseline_envelope_id, superseded_at
- **DriftBaselineSelectionVisualization**: artifact_type, visualization_id,
  execution_mode_boundary_contract{{...}},
  basis_contract{{basis_contract_hash, active_exact_scope_key, target_scope_refs[],
  candidate_refs[], candidate_universe_hash, prior_active_baseline_envelope_ref_or_null,
  prior_active_baseline_frozen_hash_or_null, selection_profile_code,
  dominance_key_profile_code, ...}}, visualization_outcome, selected_candidate_ref,
  selected_selection_contract{{selection_contract_hash, ...}}, selected_selection_reason_codes[],
  selected_baseline_envelope_ref, selected_baseline_frozen_hash, candidate_results[]{{display_rank,
  candidate_ref, candidate_baseline_type, candidate_submission_state,
  candidate_scope_compatibility_state, candidate_scope_match_class_or_null,
  candidate_dominance_key_or_null{{...}}, loss_reason_codes[],
  selection_reason_codes_if_selected[], candidate_supersession_state, ...}},
  candidate_count, exact_scope_candidate_count, compatible_candidate_count,
  rejected_candidate_count, same_scope_envelope_lineage[]{{lineage_rank, baseline_envelope_ref,
  baseline_frozen_hash, selection_contract_hash, lineage_disposition, ...}},
  superseded_lineage_count, visualized_by_principal_ref, visualized_at, visualization_hash
- **AmendmentWindowContext**: artifact_type, amendment_window_context_id, manifest_id,
  baseline_envelope_ref, window_anchor_basis, scope_refs[], statutory_filing_deadline,
  final_declaration_confirmed_at, window_opens_at, window_closes_at, window_state,
  provider_profile_ref, authority_basis_ref, eligible_scope_refs[], blocked_scope_refs[],
  reason_codes[], evaluated_at, stale_after_at, evaluation_hash
- **RetroactiveImpactAnalysis**: artifact_type, retroactive_impact_id, manifest_id, drift_ref,
  baseline_envelope_ref, impacted_scope_refs[], impacted_submission_refs[],
  earliest_affected_effective_at, latest_affected_effective_at, bounded_retroactivity_class,
  late_data_interaction_class, replay_requirement, restatement_required,
  restatement_scope_refs[], reason_codes[], analyzed_at, analysis_hash
- **AmendmentBundle**: artifact_type, amendment_bundle_id, manifest_id, amendment_case_ref,
  drift_ref, baseline_envelope_ref, baseline_frozen_hash, retroactive_impact_ref,
  retroactive_impact_hash, amendment_window_context_ref, amendment_window_evaluation_hash,
  calculation_basis_ref, calculation_basis_hash, user_confirmation_ref,
  authority_operation_profile_ref, affected_scope_refs[], packet_ref, payload_hash,
  bundle_identity_hash, bundle_state, supersedes_bundle_id, created_at, superseded_at
  `AmendmentCase`, `DriftBaselineEnvelope`, `DriftBaselineSelectionVisualization`, `AmendmentWindowContext`,
  `RetroactiveImpactAnalysis`, and `AmendmentBundle` SHALL validate against
  `schemas/amendment_case.schema.json`, `schemas/drift_baseline_envelope.schema.json`,
  `schemas/drift_baseline_selection_visualization.schema.json`,
  `schemas/amendment_window_context.schema.json`,
  `schemas/retroactive_impact_analysis.schema.json`, and
  `schemas/amendment_bundle.schema.json` so amendment lineage, baseline freeze,
  retroactive replay posture, candidate-universe explanation, and authority-facing bundle identity remain machine-checkable.
  Baseline type and submission state SHALL remain aligned, exact-scope window eligibility SHALL stay
  classification-complete and chronological, baseline envelopes SHALL retain hashed selector lineage
  plus predecessor frozen-hash supersession linkage, retroactive analysis SHALL keep replay/restatement
  posture bounded to explicit impacted scope and a persisted `analysis_hash`, ready-to-amend or stale
  cases SHALL retain the exact frozen baseline/window/retroactive freshness inputs plus invalidation
  reasons when freshness breaks, and active amendment bundles SHALL retain their frozen
  authority-facing payload basis together with a non-recomputable `bundle_identity_hash`.
- **AuthorityCalculationRequest**: artifact_type, calculation_request_id, manifest_id, tenant_id,
  client_id, calculation_type, authority_scope, provider_environment, operation_profile_ref,
  authority_operation_ref, target_obligation_ref, runtime_scope[], scope_execution_binding{{...}},
  access_binding_hash, request_state, live_authority_call_executed, request_envelope_ref, authority_interaction_ref, reason_codes[],
  requested_at
- **AuthorityCalculationResult**: artifact_type, calculation_id, calculation_request_ref, manifest_id,
  calculation_type, result_state, validation_outcome, reason_codes[], live_authority_call_executed,
  calculation_hash, retrieved_payload_ref, authority_response_ref, retrieved_at, superseded_at
- **CalculationBasis**: artifact_type, calculation_basis_id, calculation_id, calculation_request_ref,
  manifest_id, calculation_type, basis_type, basis_status, basis_payload_ref, basis_hash,
  parity_reusable, filing_reusable, user_confirmation_ref, reason_codes[], captured_at,
  confirmed_at, superseded_at
- **CalculationUserConfirmation**: artifact_type, user_confirmation_id, calculation_id,
  calculation_basis_ref, manifest_id, actor_ref, actor_role, confirmation_state, presentation_ref,
  confirmed_basis_hash, reason_codes[], confirmed_at, declined_at
- **AuthorityCalculationReadinessContext**: artifact_type, calculation_readiness_context_id,
  context_scope, manifest_id, owner_artifact_type, owner_artifact_ref, calculation_request_ref,
  calculation_id, calculation_type, request_state, result_state, calculation_hash,
  calculation_basis_ref, basis_status, basis_hash, user_confirmation_ref, confirmation_state,
  parity_reusable, filing_reusable, validation_outcome, reason_codes[],
  live_authority_call_executed, persisted_at
  `AuthorityCalculationRequest`, `AuthorityCalculationResult`, `CalculationBasis`,
  `CalculationUserConfirmation`, and `AuthorityCalculationReadinessContext` SHALL validate against
  `schemas/authority_calculation_request.schema.json`,
  `schemas/authority_calculation_result.schema.json`, `schemas/calculation_basis.schema.json`,
  `schemas/calculation_user_confirmation.schema.json`, and
  `schemas/authority_calculation_readiness_context.schema.json` so filing and amendment journeys do
  not rely on loose calculation refs without a typed request, result, basis, confirmation, and
  gate-visible readiness context behind them. `FilingCase` and `AmendmentCase` SHALL therefore keep
  the exact readiness-context ref that gate logic consumed, rather than reconstructing readiness
  from loose calculation fields alone. Modeled requests SHALL clear live-operation lineage,
  calculation runtime scope SHALL stay canonical and non-submit, modeled results SHALL remain
  non-`PASS`, every selected basis SHALL retain a non-null `basis_hash`, basis reusability SHALL
  stay exclusive to `CONFIRMED`, active readiness contexts SHALL reject superseded
  request/result/basis posture, and confirmation decline reasons SHALL remain exclusive to
  `DECLINED`.
- **ArtifactRetention**: artifact_type, retention_scope_class, retention_id, tenant_id, artifact_ref,
  retention_tag_ref, retention_class, lifecycle_state, minimum_expiry_at, policy_expiry_at,
  effective_expiry_at, state_changed_at, last_evaluated_at, hold_ref, next_checkpoint_at,
  workflow_item_refs[], limitation_behavior, limitation_reason_codes[], erasure_request_ref,
  erasure_action_ref, erasure_proof_ref
  `ArtifactRetention` is the typed retention lifecycle control object. It SHALL preserve limitation,
  legal-hold, expiry basis, bounded pending follow-up, pseudonymisation semantics, and erasure-proof
  linkage as explicit state rather than passive notes. Pending checkpoint/workflow refs SHALL stay
  limited to `LEGAL_HOLD` or `ERASURE_PENDING`, limitation refs SHALL stay limited to `LIMITED` or
  `PSEUDONYMISED`, and limited or pseudonymised states SHALL clear pending-only
  checkpoint/workflow refs rather than leaking stale hold/erasure follow-up. Erasure
  request/action/proof refs SHALL stay limited to erasure-bearing states, and expiry/evaluation
  timestamps SHALL remain forward-only.
- **TelemetryResource**: resource_id, service_name, environment_ref, build_ref, deployment_identity
  `TelemetryResource` is the shared observability resource contract. It SHALL keep the runtime
  service/environment/build/deployment tuple stable across traces, metrics, logs, and correlated audit evidence.
  Its shared `correlation_context{...}` SHALL also carry nightly-batch identity and replay-comparison
  keys whenever those observability families are emitted.
- **TraceSpan**: artifact_type, span_scope_class, trace_id, span_id, parent_span_id, manifest_id,
  resource_ref, span_code, sampling_class, retention_class, started_at, ended_at, status_code,
  correlation_context{{...}}, span_attributes{{...}}
  `TraceSpan` is the manifest-rooted trace contract. It SHALL preserve the required filing-grade child-span
  taxonomy, keep root-span versus child-span semantics machine-checkable, and freeze the minimum
  sampling/retention and lineage correlation needed for replay-safe forensic reconstruction. Nightly
  run roots SHALL retain nightly batch/window identity and replay run roots SHALL retain `replay_class`.
- **MetricEvent**: metric_event_id, metric_family, instrument_kind, resource_ref, observed_at, value,
  unit, dimensions{{...}}, correlation_context{{...}}
  `MetricEvent` is the structured metric-sample contract. It SHALL freeze the minimum reliability,
  quality, operational, and security/privacy metric families used for runtime observability, including
  nightly batch outcomes, nightly selection dispositions, operator digest publication latency, and
  masked-vs-full sensitive-view posture.
- **LogRecord**: artifact_type, log_record_id, timestamp, severity, log_family, access_tier,
  retention_class, service_name, environment_ref, resource_ref, event_code,
  correlation_context{{...}}, message_template, structured_fields{{...}}
  `LogRecord` is the structured application-log contract. It SHALL preserve correlation-safe event
  logging without allowing general log payloads to degrade into secret-bearing raw dumps.
- **BuildArtifact**: build_id, vcs_ref, artifact_digest, sbom_ref, provenance_ref, signature_ref,
  artifact_registry_ref, release_channel, build_time, distribution_targets[],
  desktop_notarization_ref, hardened_runtime_attestation_ref
  `BuildArtifact` keeps distribution targets in canonical order so release identity hashes remain
  stable, requires desktop notarization and hardened-runtime evidence whenever `MACOS_DESKTOP` is a
  shipped target, and clears those desktop-only refs off non-desktop candidates.
- **DeploymentRelease**: release_id, environment_ref, build_id, candidate_identity_hash,
  candidate_identity_contract{{...}}, schema_bundle_compatibility_gate_contract{{...}},
  recovery_governance_contract{{...}}, schema_bundle_hash, config_bundle_hash,
  schema_reader_window_contract{{...}}, rollout_strategy, rollout_state,
  state_transition_contract{{...}}, rollback_boundary_state, canary_fraction, health_gate_state,
  release_verification_manifest_ref, supported_client_window_ref, deployed_at,
  rollback_of_release_id, compensating_release_id_or_null, rollback_runbook_ref,
  fail_forward_runbook_ref, fail_forward_owner_ref_or_null, emergency_override_ref,
  emergency_override_expires_at
  `DeploymentRelease` SHALL keep strategy/state posture coherent, record deployment time for terminal
  served states, reject self-rollback lineage, keep emergency overrides scoped to emergency
  promotions with a post-deploy expiry, retain queryable top-level candidate hash plus nested
  candidate tuple, retain the shared schema compatibility boundary through
  `schema_bundle_compatibility_gate_contract{...}`, retain explicit rollback-vs-fail-forward posture
  through `rollback_boundary_state`, require named compensating-release and owner lineage for
  `FAILED_FORWARD`, and fail closed on rollback posture once
  `schema_reader_window_contract.window_state = CONTRACT_ELIGIBLE_WINDOW_CLOSED`.
- **SchemaBundleCompatibilityGateContract**: compatibility_gate_hash, candidate_identity_hash,
  candidate_identity_contract{{...}}, schema_bundle_hash, compatibility_window_ref,
  reader_window_state, schema_reader_window_contract{{...}}, migration_plan_ref_or_null,
  migration_ledger_refs[], supported_client_window_ref_or_null, historical_manifest_guard_state,
  replay_restore_guard_state, native_client_window_state, migration_chronology_state,
  destructive_contract_state, rollback_boundary_state, reason_codes[]
  `SchemaBundleCompatibilityGateContract` is the shared schema-safety release boundary. It SHALL
  freeze the exact writer bundle identity together with reader-window state, protected historical
  manifests, replay/restore readability, migration chronology, supported native client window
  posture, destructive-contract posture, and rollback-vs-fail-forward boundary so schema
  compatibility cannot be reused after the safety window changes.
- **ReleaseVerificationManifestAssemblyContract**: contract_version, assembly_contract_hash,
  candidate_identity_hash, compatibility_gate_hash, enabled_provider_profile_refs[],
  executed_test_run_identifiers[], gate_bindings[]{ gate_name, suite_family, result_ref,
  admissibility_ref, candidate_identity_hash, compatibility_gate_hash_or_null, status,
  admissibility_state, quarantine_state, manual_waiver_state, executed_at }, migration_mode,
  migration_plan_ref_or_null, migration_ledger_refs[], supported_client_window_ref,
  canary_summary_ref_or_null, restore_drill_ref_or_null, restore_checkpoint_ref_or_null,
  client_compatibility_matrix_ref_or_null, decision_state, approval_ref_or_null,
  deployment_release_ref_or_null, superseded_by_verification_manifest_ref_or_null
  `ReleaseVerificationManifestAssemblyContract` is the deterministic release-assembly tape. It
  SHALL freeze the canonical blocking-gate order, the exact result/admissibility evidence pair for
  each gate, companion canary or restore or client-matrix refs, and approval or supersession
  posture so promotion evidence cannot be manually restitched after the fact.
- **SchemaMigrationLedger**: migration_id, datastore_ref, target_version, target_schema_bundle_hash,
  compatibility_window_ref, contract_phase_required, phase_state, state_transition_contract{{...}},
  schema_reader_window_contract{{...}}, backfill_execution_contract{{...}}, applied_at, verified_at, rollback_class, verification_ref,
  halted_subphase, compatibility_window_closed_at, failure_ref
  `SchemaMigrationLedger` preserves explicit phase chronology, keeps halt/failure evidence tied to
  legal states only, prevents optional-contract migrations from drifting into contract phases, and
  keeps reader-window closure and idempotent backfill completion explicit before destructive
  contract begins.
- **SecretVersion**: artifact_type, secret_version_id, secret_class, store_ref, key_version_ref,
  policy_profile_ref, lineage_ref, issued_at, expires_at, rotation_state, last_attested_at,
  attestation_ref, activated_at, rotation_started_at, retired_at, revoked_at,
  revocation_reason_code, historical_read_window_until, superseded_by_secret_version_id
  `SecretVersion` is the governed secret/key-version contract. It SHALL preserve attestation,
  activation, cutover, retirement, and revocation posture so secret rotation never leaves version
  binding ambiguous for runtime use or historical decryptability.
- **RestorePrivacyReconciliationContract**: contract_version, reconciliation_contract_hash,
  checkpoint_ref, restore_drill_ref, reconciliation_scope_policy, resurrected_data_posture,
  resurrected_subject_count_or_null, privacy_reconciliation_state, privacy_reconciliation_outcome_ref,
  compensating_re_erasure_state, compensating_re_erasure_workflow_ref_or_null,
  compensating_re_erasure_audit_ref_or_null, legal_hold_ref_or_null,
  proof_preservation_basis_ref_or_null, authority_ambiguity_ref_or_null,
  audit_chain_continuity_state, audit_chain_continuity_ref, replay_limitation_state,
  enquiry_limitation_state, reopen_access_state, reconciliation_decided_at_or_null,
  re_erasure_completed_at_or_null
  `RestorePrivacyReconciliationContract` is the first-class restore-plus-privacy legality boundary.
  It keeps resurrected restricted data detection, compensating cleanup lineage, blocker posture,
  audit continuity, and replay/enquiry limitation safety explicit before reopen or promotion.
- **RecoveryCheckpoint**: checkpoint_id, datastore_ref, recovery_governance_contract{{...}},
  backup_ref, checkpoint_inventory_ref, snapshot_time, restore_tested_at,
  restore_verification_hash, rpo_class, rto_class, checkpoint_state, state_transition_contract{{...}},
  restore_drill_ref, privacy_reconciliation_contract{{...}}, audit_continuity_verified, queue_rebuild_verified,
  authority_rebuild_verified, authority_binding_revalidation_verified,
  privacy_reconciliation_outcome_ref, reopen_readiness_state, quarantine_reason_code
  `RecoveryCheckpoint` keeps restore evidence and reopen gating explicit: verified checkpoints
  require bound restore-drill evidence plus final privacy reconciliation, audit, queue, authority,
  and limitation-safety verification, while
  non-verified checkpoints retain a typed `reopen_readiness_state` instead of silently implying that
  a restored environment is ready for access.
- **VerificationSuiteResult**: suite_result_id, suite_family, candidate_environment_ref,
  build_artifact_ref, artifact_digest, candidate_identity_hash, candidate_identity_contract{{...}},
  schema_bundle_compatibility_gate_contract{{...}}, schema_bundle_hash,
  schema_reader_window_contract{{...}}, config_bundle_hash, migration_plan_ref,
  enabled_provider_profile_refs[], authority_sandbox_coverage_contract_or_null,
  supported_client_window_ref, test_run_identifiers[],
  result_state, result_summary_ref, executed_at
  `VerificationSuiteResult` keeps provider-profile and test-run identifier sets in canonical order,
  migration-verification suites SHALL retain the concrete `migration_plan_ref` they validated,
  authority-sandbox suites SHALL retain the enabled provider-profile set they exercised plus one
  candidate-bound `authority_sandbox_coverage_contract_or_null` that proves exact operation-family
  breadth and controlled-edge fail-closed coverage,
  operator-client suites SHALL retain the supported client window they judged, and the nested
  candidate contract SHALL hash the exact promotion tuple those suites certify. Schema,
  migration-verification, and operator-client suite results SHALL additionally retain the shared
  `schema_bundle_compatibility_gate_contract{...}` so the result proves the exact reader-window,
  historical-manifest, replay/restore, native-client, and rollback boundary it certified.
- **GateAdmissibilityRecord**: admissibility_id, suite_result_ref, suite_family,
  candidate_environment_ref, artifact_digest, candidate_identity_hash,
  candidate_identity_contract{{...}}, schema_bundle_compatibility_gate_contract{{...}},
  schema_bundle_hash, schema_reader_window_contract{{...}}, migration_plan_ref,
  supported_client_window_ref, candidate_identity_match, freshness_verified,
  contract_window_consistent, rerun_scope_preserved, quarantine_state, admissibility_state,
  evaluated_at, reason_codes[]
  `GateAdmissibilityRecord` forces failed admissibility dimensions, waiver/quarantine posture, and
  reason codes back into explicit inadmissible state, while migration and operator-client suites keep
  their plan/window bindings, the exact candidate hash they judged, and the exact schema
  compatibility boundary they deemed admissible.
- **CanaryHealthSummary**: canary_summary_id, candidate_environment_ref, build_artifact_ref,
  artifact_digest, candidate_identity_hash, candidate_identity_contract{{...}}, canary_fraction,
  slo_profile_ref, error_budget_profile_ref, latency_budget_state, error_budget_state,
  health_gate_state, abort_recommended, summary_ref, evaluated_at
  `CanaryHealthSummary` makes the reverse health mapping explicit: both budgets within budget imply
  `GREEN`, dual breaches imply `RED` plus abort, `AMBER` requires at least one breached budget, and
  canary evidence stays bound to the exact promotion candidate.
- **RestoreDrillResult**: restore_drill_id, checkpoint_ref, candidate_environment_ref, drill_scope,
  build_artifact_ref, artifact_digest, candidate_identity_hash,
  candidate_identity_contract{{...}}, schema_bundle_hash, schema_reader_window_contract{{...}},
  config_bundle_hash, migration_plan_ref, enabled_provider_profile_refs[], executed_at, outcome,
  audit_continuity_verified, privacy_reconciliation_verified, queue_rebuild_verified,
  authority_rebuild_verified, authority_binding_revalidation_verified,
  privacy_reconciliation_contract{{...}}, drill_report_ref, failure_reason_codes[]
  `RestoreDrillResult` rejects non-passed outcomes that still claim every verification basis succeeded,
  keeps failure-reason codes and enabled-provider-profile refs in canonical order, retains the exact
  candidate-bound runtime tuple used by release and DR evidence, and proves that passed restore
  evidence also closed the privacy-reconciliation and compensating re-erasure boundary.
- **VerificationSuiteResult**: suite_result_id, suite_family, candidate_environment_ref,
  build_artifact_ref, artifact_digest, candidate_identity_hash, candidate_identity_contract{{...}},
  schema_bundle_compatibility_gate_contract{{...}}, schema_bundle_hash,
  schema_reader_window_contract{{...}}, config_bundle_hash, migration_plan_ref,
  enabled_provider_profile_refs[], authority_sandbox_coverage_contract_or_null,
  supported_client_window_ref, restore_drill_ref,
  restore_checkpoint_ref, test_run_identifiers[], result_state, result_summary_ref, executed_at
  `VerificationSuiteResult` preserves exact suite-family identity posture. Migration suites retain
  their migration plan, authority-sandbox suites retain the exercised provider-profile set plus one
  exact sandbox coverage contract,
  operator-client suites retain their client-compatibility window, and restore-drill suites retain
  both the exact drill and checkpoint lineage they judged. Schema, migration-verification, and
  operator-client suites also retain the exact compatibility gate boundary they judged.
- **GateAdmissibilityRecord**: admissibility_id, suite_result_ref, suite_family,
  candidate_environment_ref, artifact_digest, candidate_identity_hash,
  candidate_identity_contract{{...}}, schema_bundle_compatibility_gate_contract{{...}},
  schema_bundle_hash, schema_reader_window_contract{{...}}, migration_plan_ref,
  authority_sandbox_coverage_contract_or_null,
  supported_client_window_ref, restore_drill_ref, restore_checkpoint_ref, candidate_identity_match,
  freshness_verified, contract_window_consistent, rerun_scope_preserved, quarantine_state,
  admissibility_state, evaluated_at, reason_codes[]
  `GateAdmissibilityRecord` binds suite-family-specific admissibility dimensions. Restore-drill
  admissibility therefore echoes the exact drill and checkpoint lineage that the admissibility
  decision certifies as release-eligible, and schema-sensitive admissibility retains the exact
  compatibility gate boundary it certifies. Authority-sandbox admissibility additionally retains the
  exact sandbox coverage contract whose hash is echoed by release-gate rows.
- **ClientCompatibilityMatrix**: compatibility_matrix_id, candidate_environment_ref,
  build_artifact_ref, candidate_identity_hash, candidate_identity_contract{{...}},
  schema_bundle_compatibility_gate_contract{{...}}, supported_client_window_ref, browser_rows[],
  macos_rows[], matrix_state, evaluated_at
  `ClientCompatibilityMatrix` preserves canonical row order, forbids duplicate platform/scenario
  rows, requires both compatibility scenarios for every tested client family, allows `RED` only
  when an incompatible row is actually present, keeps the compatibility window candidate-bound, and
  mirrors the shared schema compatibility boundary so green client posture cannot outlive a blocked
  native-reader window.
- **ReleaseVerificationManifest**: verification_manifest_id, candidate_environment_ref,
  build_artifact_ref, artifact_digest, candidate_identity_hash,
  candidate_identity_contract{{...}}, manifest_assembly_contract{{...}},
  schema_bundle_compatibility_gate_contract{{...}},
  schema_bundle_hash, schema_reader_window_contract{{...}}, config_bundle_hash, migration_mode,
  migration_plan_ref, enabled_provider_profile_refs[], executed_test_run_identifiers[],
  blocking_gates{{ candidate_identity_hash, compatibility_gate_hash_or_null, authority_sandbox_coverage_hash_or_null, ... }},
  migration_ledger_refs[],
  canary_summary_ref, restore_drill_ref, restore_checkpoint_ref, supported_client_window_ref,
  client_compatibility_matrix_ref, decision_state, state_transition_contract{{...}}, approval_ref, deployment_release_ref,
  superseded_by_verification_manifest_ref, decision_changed_at, created_at
  `ReleaseVerificationManifest` is the promotion-evidence root contract. It SHALL bind each
  blocking gate to first-class suite-family and admissibility evidence plus explicit waiver or
  quarantine posture, canary, restore-drill and restore-checkpoint lineage, and supported-client
  compatibility artifacts for the candidate being approved or superseded. Each gate row SHALL also
  echo the manifest candidate hash so mixed-candidate gate binding fails closed. Schema,
  migration-verification, and operator-client rows SHALL additionally echo
  `compatibility_gate_hash_or_null` from the shared
  `schema_bundle_compatibility_gate_contract{...}` so stale reader-window or native-client
  compatibility evidence cannot survive reuse. The authority-sandbox row SHALL also echo
  `authority_sandbox_coverage_hash_or_null` from the shared sandbox coverage contract so sandbox
  breadth cannot collapse into a generic green bit. Its bound `manifest_assembly_contract{...}` SHALL
  mirror the canonical gate list, companion evidence refs, and decision posture so the promotion
  root stays machine-assembled. Green gates therefore stay admissible and unwaived, restore drill
  and checkpoint refs travel together, decision timestamps stay later than the evidence they depend
  on, and candidate-identity arrays stay in canonical order.
- **StateTransitionContract**: contract_version, object_family, machine_code, state_field_name,
  current_state, previous_state_or_null, transition_event_code, transition_applied_at,
  transition_audit_ref, transition_application_policy, illegal_transition_policy,
  concurrency_guard_policy, terminal_reentry_policy, recovery_supersession_policy,
  audit_evidence_policy, typed_rejection_family
  `StateTransitionContract` is the FE-46 shared lifecycle-governance packet for mutable backend
  control objects that advance in place. It SHALL freeze one named transition event, one mirrored
  current-state value, one audit-evidence ref, and the fail-closed policies that forbid ad hoc
  state mutation, terminal-state reentry, recovery reinterpretation in place, or partial writes on
  illegal transition attempts.
- **SchemaReaderWindowContract**: contract_version, compatibility_window_ref,
  writer_schema_bundle_hash, supported_reader_schema_bundle_hashes[],
  protected_historical_schema_bundle_hashes[], window_state, historical_manifest_policy,
  destructive_change_policy, rollback_boundary_policy, fail_forward_policy,
  replay_restore_policy
  `SchemaReaderWindowContract` is the FE-47 grouped compatibility-window law. It freezes which
  schema bundles may lawfully read historical truth, which older bundles remain protected during the
  open window, when destructive contract is allowed, when rollback remains safe, when fail-forward
  becomes mandatory, and how replay/restore judge historical readability.
- **BackfillExecutionContract**: contract_version, migration_id, target_version,
  target_schema_bundle_hash, execution_requirement, execution_state, idempotency_policy,
  meaning_preservation_policy, lineage_recording_policy, retry_safety_policy,
  affected_artifact_types[], backfill_audit_refs[]
  `BackfillExecutionContract` is the FE-47 grouped migration-backfill law. It freezes whether
  backfill is required, the exact target bundle it evolves toward, the lawful execution states, and
  the idempotent append-or-derive lineage rules so expand/migrate/contract never depends on
  ad hoc batch-job assumptions.

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
- `ReplayAttestation`
- `EvidenceGraph`
- `TwinView`
- `BaselineSelectionContract`
- `DriftRecord`
- `DriftBaselineEnvelope`
- `AmendmentEligibilityContract`
- `AmendmentWindowContext`
- `RetroactiveImpactAnalysis`
- `FilingCase`
- `AmendmentCase`
- `AmendmentBundle`
- `FilingPacket`
- `AuthorityOperation`
- `AuthorityBinding`
- `AuthorityRequestEnvelope`
- `AuthorityResponseEnvelope`
- `AuthorityInteractionRecord`
- `SubmissionRecord`

`RunManifest.continuation_set{...}` SHALL always record both `config_inheritance_mode` and
`input_inheritance_mode`; use `null` only for root manifests and same-manifest pre-start reuse, and
otherwise use the frozen continuation classifications `{FRESH_CHILD_RESOLUTION, REPLAY_EXACT,
RECOVERY_EXACT, HISTORICAL_EXPLICIT}` for config and `{FRESH_CHILD_COLLECTION, REPLAY_EXACT,
RECOVERY_EXACT, HISTORICAL_EXPLICIT}` for input so child-manifest lineage is explicit even when no
parent freeze or input boundary is reused. Root manifests SHALL bind `continuation_basis =
NEW_MANIFEST`, `root_manifest_id = manifest_id`, and `manifest_generation = 0`; child manifests
SHALL bind non-null `root_manifest_id`, non-null `parent_manifest_id`, and
`continuation_set.parent_manifest_hash_at_branch` to the parent's sealed `hash_set.manifest_hash`.
Replay children SHALL bind `parent_manifest_id = replay_of_manifest_id`.

Where the top-level lineage projection fields on `RunManifest` (`root_manifest_id`,
`parent_manifest_id`, `continuation_of_manifest_id`, `replay_of_manifest_id`,
`supersedes_manifest_id`, `manifest_generation`) are materialized in addition to
`continuation_set{...}`, they SHALL be exact mirrors of the nested values and SHALL NOT diverge.

- **RunManifest**: manifest_id, root_manifest_id, parent_manifest_id, continuation_of_manifest_id, replay_of_manifest_id,
  supersedes_manifest_id, manifest_generation, continuation_basis, manifest_schema_version, tenant_id, client_id, period,
  requested_scope[], scope_execution_binding{{ binding_scope_class, execution_mode_or_null, requested_scope_family,
  executable_scope_family, requested_scope[], executable_scope[], executable_partition_scope_refs[],
  access_decision, reduction_posture, mutation_atomicity, masking_rules[], required_approvals[],
  required_authn_level, access_binding_hash, reason_codes[] }}, run_kind, mode, nightly_batch_run_ref, nightly_window_key, principal_context_ref,
  access_binding_hash, truth_boundary_contract{{ contract_version, artifact_role,
  authoritative_source_policy, projection_input_policy, durable_writeback_policy,
  recovery_basis_policy, authoritative_record_families[], observable_projection_families[] }},
  invariant_enforcement_contract{{ contract_version, boundary_scope,
  boundary_specific_binding_policy, invariant_failure_state, invariant_class_or_null,
  error_family_or_null, error_code_or_null, failure_stage_or_null,
  terminal_manifest_state_or_null, transition_event_code_or_null,
  terminal_audit_event_type_or_null, error_record_ref_or_null, typed_error_policy,
  partial_write_policy, audit_evidence_policy, lifecycle_mapping_policy,
  assertion_conversion_policy, normalization_rejection_policy }},
  environment_ref, code_build_id, code_commit_sha, container_image_digest,
  schema_bundle_hash, schema_reader_window_contract{{ compatibility_window_ref, writer_schema_bundle_hash,
  supported_reader_schema_bundle_hashes[], protected_historical_schema_bundle_hashes[], window_state,
  historical_manifest_policy, destructive_change_policy, rollback_boundary_policy,
  fail_forward_policy, replay_restore_policy }}, feature_flag_snapshot_hash,
  deterministic_seed, idempotency_key, manifest_branch_decision{{ branch_action, idempotency_key, access_binding_hash, requested_scope[],
  run_kind, replay_class_or_null, nightly_window_key_or_null, prior_manifest_id_or_null,
  prior_manifest_hash_at_decision_or_null, prior_manifest_lifecycle_state_or_null,
  selected_manifest_continuation_basis, root_manifest_id, parent_manifest_id_or_null,
  continuation_of_manifest_id_or_null, replay_of_manifest_id_or_null, supersedes_manifest_id_or_null,
  selected_manifest_generation, config_inheritance_mode_or_null, input_inheritance_mode_or_null,
  returned_decision_bundle_hash_or_null }}, manifest_lineage_trace_refs[], lifecycle_state, state_transition_contract{{...}}, created_at, frozen_at, opened_at, sealed_at,
  completed_at, superseded_at, retired_at, config_freeze{{...}}, input_freeze{{...}}, hash_set{{...}},
  frozen_execution_binding{{...}}, preseal_gate_evaluation{{ contract_class, execution_basis_hash,
  required_gate_codes[], evaluated_gate_codes[], ordered_gate_decision_ids[], completion_state,
  durability_boundary, reuse_policy, post_seal_interpretation_policy }}, manifest_start_claim{{ contract_class,
  manifest_id, manifest_hash, execution_basis_hash, access_binding_hash, attempt_lineage_ref,
  claim_state, claim_status_code, claim_epoch, claim_holder_ref_or_null, claim_token_or_null,
  claim_acquired_at_or_null, claim_expires_at_or_null, claim_released_at_or_null,
  claim_release_reason_code_or_null, stale_reclaim_reason_code_or_null, publication_state,
  stage_dag_ref_or_null, outbox_batch_ref_or_null, first_publication_committed_at_or_null,
  concurrency_policy, claim_publication_atomicity, stale_reclaim_policy, recovery_child_policy,
  nightly_reclaim_policy }}, continuation_set{{...}}, access_decision{{...}},
  append_only_outcome_projection{{...}}, gating_decisions[], output_refs{{...}}, audit_refs[], submission_refs[],
  drift_refs[], decision_bundle_hash, deterministic_outcome_hash, replay_attestation_ref
  `RunManifest` is a special stateful control object: lifecycle_state, gate summaries, output refs, decision-bundle hash,
  audit refs, submission refs, and drift refs may advance only through named transitions and append-only audit evidence; the frozen
  execution envelope itself is never silently rewritten. It SHALL also preserve the exact executable-access binding used
  to derive manifest identity and idempotency, keep `hash_set.execution_basis_hash` stable across exact replays and
  same-attempt recovery, and record the terminal `deterministic_outcome_hash` plus optional replay attestation reference
  once outcome comparison has completed. `manifest_branch_decision{...}` is the authoritative
  request-time branch proof; top-level lineage fields SHALL remain byte-identical mirrors of
  `continuation_set{...}` and the selected lineage mirror inside `manifest_branch_decision{...}`.
  Append-only `manifest_lineage_trace_refs[]` SHALL link the manifest to every persisted
  `ManifestLineageTrace` that selected, reused, or returned it so operator tooling can follow
  explicit branch history without reconstructing reuse from adjacent manifests.
  `invariant_enforcement_contract{...}` is the machine-bound fail-closed bridge for material
  invariant failures. It SHALL remain `NOT_TRIGGERED` on lawful runs and SHALL otherwise freeze
  invariant class, typed error family/code, pre-start versus post-start terminal posture, terminal
  audit event type, and the primary `error_record_ref_or_null`.
  `frozen_execution_binding{...}` is the authoritative worker-facing
  frozen ref/hash envelope derived from the manifest, config freeze, input freeze, and hash set, and
  it SHALL keep `config_surface_hash`, `config_resolution_basis`, and `config_consumption_mode =
  FROZEN_CONFIG_ONLY` explicit so workers cannot silently fall back to live config resolution. It
  SHALL also mirror `continuation_of_manifest_id`, `parent_manifest_hash_at_branch`,
  `config_inheritance_mode`, `input_inheritance_mode`, `inherited_config_freeze_ref`,
  `fresh_resolution_reason_code`, `inherited_input_freeze_ref`, and `fresh_collection_reason_code`
  so worker-side lineage and reuse logic never reconstructs child-branch causality from
  `continuation_set{...}` plus adjacent freeze objects,
  while
  its nested `scope_execution_binding{...}` is the authoritative raw-versus-executable scope contract for workers, while
  `preseal_gate_evaluation{...}` is the immutable pre-seal tape witness that records which gate ids
  formed the canonical pre-seal prefix and whether that prefix ended blocked-prestart or seal-ready,
  while `manifest_start_claim{...}` is the authoritative single-writer start record that binds
  `opened_at` to one claim token, one attempt-lineage ref, and one durable first-publication proof
  or stale-reclaim posture,
  while
  `append_only_outcome_projection{...}` is the authoritative append-only carrier for historical post-seal
  basis, gate tape, and terminal refs; the legacy top-level outcome fields remain mirrors only.
  `output_refs{...}` inside that projection SHALL be a structured `output_link_entry` map that
  preserves linkage role, produced-by-manifest identity, artifact hash, and proof/twin/replay
  dependency refs instead of collapsing to alias-to-ref strings.
  Its bound `schema_reader_window_contract{...}` SHALL keep frozen-manifest readability,
  replay/restore compatibility, and rollback-vs-fail-forward posture explicit instead of delegating
  those checks to ambient deployment state.
  `truth_boundary_contract{...}` SHALL keep that distinction machine-readable by freezing
  `artifact_role = COMMAND_SIDE_AUTHORITY`, durable-source-only legality, and zero observable
  projection families for the manifest itself.
  A manifest that remains `SEALED` SHALL still be pre-start only: `opened_at` remains null and no
  outcome refs, submission refs, drift refs, decision-bundle hash, deterministic outcome hash, or
  replay attestation ref may appear until the single-writer start claim succeeds, and
  `manifest_start_claim.claim_state` SHALL remain `UNCLAIMED_SEALED`.
  Ordered `gating_decisions[]` entries SHALL remain manifest-bound and persist the same authorized
  executable scope used by the manifest itself. The embedded `access_decision{...}` is the
  manifest-scoped post-authorization projection, so it SHALL remain limited to `ALLOW` or
  `ALLOW_MASKED` and SHALL preserve the canonical ordered executable scope. It SHALL also keep build/schema/feature-flag lineage
  explicit rather than inferring it from a later deployment surface. For `run_kind = NIGHTLY`,
  `nightly_batch_run_ref` and `nightly_window_key` are frozen identity fields so same-window
  duplicate suppression and cross-window continuity do not depend on scheduler memory alone.
- **ManifestLineageTrace**: lineage_trace_id, contract_version, binding_scope,
  explorer_binding_policy, operator_rendering_policy, mirror_consistency_policy,
  nightly_context_policy, idempotency_key, request_identity_hash, access_binding_hash,
  requested_scope[], effective_scope[], mode, run_kind, replay_class_or_null,
  nightly_window_key_or_null, selected_branch_action, selected_branch_reason_code,
  selected_manifest_id, selected_manifest_continuation_basis, selected_manifest_generation,
  root_manifest_id, parent_manifest_id_or_null, continuation_of_manifest_id_or_null,
  replay_of_manifest_id_or_null, supersedes_manifest_id_or_null, prior_manifest_id_or_null,
  prior_manifest_hash_at_decision_or_null, prior_manifest_lifecycle_state_or_null,
  config_inheritance_mode_or_null, input_inheritance_mode_or_null,
  returned_decision_bundle_hash_or_null, candidate_evaluations[]{ candidate_action,
  evaluation_state, compared_manifest_id_or_null, compared_manifest_hash_or_null,
  compared_manifest_lifecycle_state_or_null, disqualifier_reason_codes[] },
  mirror_consistency_state, mirror_sources[], nightly_predecessor_batch_run_ref_or_null,
  nightly_predecessor_manifest_id_or_null, nightly_predecessor_manifest_hash_or_null,
  nightly_context_reason_code_or_null, branch_decision_audit_refs[],
  branch_decision_trace_span_refs[].
  `ManifestLineageTrace` is the request-time explorer artifact for branch selection. It SHALL keep
  `selected_branch_action` distinct from the selected manifest's persisted continuation basis so
  bundle return and same-manifest sealed reuse remain explicit without rewriting the manifest's own
  frozen lineage contract. `candidate_evaluations[]` SHALL cover the full canonical branch-action
  vocabulary with one selected candidate and typed rejection reasons for every rejected candidate.
  `mirror_sources[]` SHALL prove that selected-manifest lineage mirrors were checked rather than
  guessed from nearby manifests, and nightly traces SHALL preserve predecessor batch context when
  same-lineage continuation advanced to a later nightly window.
- **NightlyBatchRun**: artifact_type, batch_run_id, tenant_id, nightly_window_key, trigger_class,
  reclaimed_predecessor_batch_run_ref, lifecycle_state, state_transition_contract{{...}}, identity_contract{{...}}, scheduler_dedupe_key, scheduled_for, trigger_observed_at,
  initiating_principal_context_ref, policy_snapshot_hash, autopilot_policy_hash,
  release_verification_manifest_ref, schema_bundle_hash, schema_reader_window_contract{{...}}, code_build_id, environment_ref,
  global_concurrency_profile{{...}}, selection_universe_hash, selection_universe_count, recovery_resume_state, selection_entries[], shard_plan[],
  backlog_pressure, portfolio_tail_risk, stability_state, selected_count, execution_count,
  reused_result_count, deferred_count, escalated_count, skipped_count,
  waiting_on_authority_count, waiting_on_late_data_count, completed_count,
  completed_with_failures_count, failed_count, selection_started_at, selection_completed_at,
  started_at, last_heartbeat_at, quiesced_at, completed_at, abandoned_at,
  successor_batch_run_ref, operator_digest_publication_state,
  operator_digest_derivation_contract_or_null{{...}}, operator_digest_ref, audit_refs[],
  provenance_refs[]
  `NightlyBatchRun` is the tenant-scoped overnight control object. It freezes the scheduler window,
  portfolio-selection envelope, shard/concurrency profile, explicit non-executed dispositions,
  heartbeat/recovery posture, and aggregated overnight outcomes so the batch can be replayed,
  recovered, and audited without reconstructing state from queues. `identity_contract{...}` SHALL
  mirror the structured scheduler dedupe tuple, `selection_universe_count` SHALL equal the number
  of persisted entries, and `recovery_resume_state` SHALL prove whether a successor reclaim resumed
  predecessor shard ownership or re-used predecessor selection under lawful resharing. Its
  `selection_entries[]` SHALL also retain `candidate_identity_hash`, `selection_basis_hash`,
  `terminal_result_reuse_state`, `active_attempt_resolution_state`, and
  `predecessor_selection_entry_ref_or_null`, and SHALL also persist replayable ranking terms such
  as `priority_tuple`, `priority_score`, expected service time, continuous pressure terms, retry
  economics, and fairness-group identity for execution-capable entries rather than forcing later
  readers or what-if simulators to infer why one item outranked another. `shard_plan[]` SHALL retain `shard_state`, `blocked_entry_refs[]`, and
  `failure_reason_codes[]` so isolated shard failure remains explainable without log reconstruction.
  It SHALL validate against
  `schemas/nightly_batch_run.schema.json` so batch lifecycle, selection dispositions, shard
  ownership, batch-stability posture, and aggregated counters remain machine-checkable.
  It SHALL also retain the same `schema_reader_window_contract{...}` used by the selected writer
  bundle so historical overnight batches remain replayable under the correct reader window.
  Recovery-triggered batches SHALL freeze `reclaimed_predecessor_batch_run_ref`, abandoned
  predecessors SHALL retain `successor_batch_run_ref`, `selected_count` SHALL equal the number of
  persisted `selection_entries[]`, `execution_count` SHALL count only entries that actually invoked
  `RUN_ENGINE(...)`, `escalated_count` SHALL cover `{REVIEW_REQUIRED, REQUEST_CLIENT_INFO,
  BLOCKED_INTERNAL}`, and `failed_count` SHALL cover `{FAILED_RETRYABLE, FAILED_NON_RETRYABLE}`.
  Once selection is complete, quiescing, terminal, blocked, failed, and abandoned nightly batches
  SHALL retain one explicit `outcome_bucket` per entry. `operator_digest_publication_state` SHALL
  make workflow publication, notification publication, and final digest publication explicit rather
  than inferred from `completed_at` or `operator_digest_ref` alone.
- **DecisionBundle**: decision_bundle_id, manifest_id, artifact_type, execution_mode, analysis_only,
  non_compliance_config_refs[], counterfactual_basis, decision_status, decision_reason_codes[],
  dominant_reason_code, decision_explainability_contract{{...}}, workflow_item_refs[], snapshot_id,
  compute_id, forecast_id, risk_id, parity_id, trust_id, graph_id, primary_proof_bundle_ref,
  twin_id, filing_packet_id, submission_record_id, outcome_class,
  waiting_on, checkpoint_state, truth_state, plain_reason, reason_codes[], next_action_codes[],
  blocked_action_codes[], actionability_state, primary_action_code, no_safe_action_reason_code,
  suggested_detail_surface_code, active_detail_surface_code, focus_anchor_ref,
  next_checkpoint_at, filing_case_id, amendment_case_id, replay_attestation_ref,
  truth_boundary_contract{{ contract_version, artifact_role, authoritative_source_policy,
  projection_input_policy, durable_writeback_policy, recovery_basis_policy,
  authoritative_record_families[], observable_projection_families[] }}, persisted_at, contract
  `DecisionBundle` is a persisted terminal/review projection keyed by `RunManifest.decision_bundle_hash`; same-manifest
  idempotent retries reload this object instead of regenerating artifacts. The outcome-bridge fields
  exist so terminal reload, notification, and queue surfaces can restore the user's next legal step
  without rerunning the whole evidence and gate chain. It SHALL also preserve a compact top-level
  reason summary (`decision_reason_codes[]`) instead of forcing every consumer to reconstruct
  terminal posture by replaying the full gate chain. `decision_reason_codes[]` SHALL remain the
  canonical compressed prefix of the persisted `reason_codes[]`, `dominant_reason_code` SHALL equal
  the first emitted summary reason, and `decision_explainability_contract{...}` SHALL remain the
  authoritative backend-authored explanation packet for queue and shell reload. When
  `actionability_state = ACTION_AVAILABLE`,
  `primary_action_code` SHALL appear in `next_action_codes[]` and SHALL NOT appear in
  `blocked_action_codes[]`. Resolved authority checkpoint/truth postures such as `CONFIRMED`,
  `REJECTED`, `UNKNOWN`, `OUT_OF_BAND`, `AUTHORITY_CONFIRMED`, `AUTHORITY_REJECTED`,
  `AUTHORITY_UNKNOWN`, and `AUTHORITY_OUT_OF_BAND` SHALL themselves determine the only legal
  `decision_status`, `outcome_class`, `waiting_on`, and durable `submission_record_id` posture so
  terminal reload never depends on client-side reconstruction of the authority consequence rail. A
  non-null `primary_proof_bundle_ref` SHALL imply a non-null `graph_id`, and a non-null `twin_id`
  SHALL imply non-null `graph_id` plus non-null `parity_id` so top-level proof and twin refs remain
  reloadable from persisted bundle identity alone.
- **ReplayAttestation**: replay_attestation_id, manifest_id, replay_of_manifest_id, artifact_type,
  execution_mode, analysis_only, non_compliance_config_refs[], counterfactual_basis, replay_class,
  comparison_mode, basis_validation_state, basis_identity_verdict,
  deterministic_equivalence_verdict, outcome_class, basis_integrity_contract{{...}},
  expected_execution_basis_hash,
  actual_execution_basis_hash, expected_deterministic_outcome_hash,
  actual_deterministic_outcome_hash, basis_dimension_results[], outcome_component_results[],
  basis_coverage, basis_match_ratio, outcome_coverage, outcome_match_ratio,
  material_outcome_coverage, material_outcome_match_ratio, difference_reason_codes[],
  limitation_codes[], mismatch_inventory[], signature_verification_state,
  attestation_envelope_ref, verification_material_refs[], attestation_confidence_score,
  attestation_confidence_band, plain_summary, operator_summary_ref, auditor_summary_ref,
  compared_at, contract
  `ReplayAttestation` is the durable replay-comparison artifact keyed by `RunManifest.replay_attestation_ref`; it SHALL explain
  whether an exact replay matched, whether a counterfactual difference or equivalence was expected,
  or whether the historical basis was incomplete, corrupt, or retention-limited. It SHALL preserve
  ordered per-dimension and per-component comparison results plus an attestation-confidence posture
  rather than reducing replay explanation to root-hash equality alone. `STANDARD_REPLAY` and
  `AUDIT_REPLAY` attestations SHALL retain compliance posture, `COUNTERFACTUAL_ANALYSIS`
  attestations SHALL retain analysis posture plus non-null `counterfactual_basis`, and
  `basis_integrity_contract{...}` SHALL freeze whether config, input, pre-seal tape, authority
  basis, and late-data basis were historically reused or substituted, whether any live reads or
  rescans executed, and whether non-persisted outcome material would have polluted root-hash
  comparison.
- **DeterministicGoldenPack**: golden_pack_id, artifact_type, contract_version, golden_pack_hash,
  candidate_identity_hash, candidate_identity_contract{{...}}, schema_bundle_hash,
  config_bundle_hash, canonical_serialization_policy, exact_decimal_policy, null_slot_policy,
  replay_comparison_policy, state_transition_policy, cadence_policy, module_fixtures[],
  state_transition_fixtures[], replay_fixtures[], cadence_fixtures[]
  `DeterministicGoldenPack` is the durable fixture boundary for the blocking deterministic and
  state-machine suite. It SHALL retain the byte-stable module payload hashes, explicit null-slot
  coverage, canonical exact-decimal strings, named state-machine tuples, replay-hash expectations,
  and deterministic cadence fixtures that release evidence relies on when the deterministic gate is
  green.
  Observable or corrupt outcome-component rows,
  `LIMITED_COMPARABLE` / `BASIS_INCOMPLETE` outcomes SHALL carry explicit `limitation_codes[]`
  instead of implying exactness from partial evidence. Observable or corrupt outcome-component rows,
  and artifact-backed mismatch inventory entries, SHALL retain non-null `component_ref` linkage for
  the compared persisted artifact rather than collapsing comparison identity into hashes alone.
- **ExperienceDelta**: manifest_id, experience_sequence, frame_epoch, delivery_class, shell_route_key,
  posture_state, semantic_motion, cause_ref, connection_state, activity_state, truth_state,
  checkpoint_state, truth_origin, experience_profile, attention_state, primary_object_ref,
  actionability_state, primary_action_code, no_safe_action_reason_code, secondary_notice_count,
  detail_entry_points[], suggested_detail_surface_code, active_detail_surface_code,
  truth_boundary_contract{{ contract_version, artifact_role, authoritative_source_policy,
  projection_input_policy, durable_writeback_policy, recovery_basis_policy,
  authoritative_record_families[], observable_projection_families[] }},
  attention_policy{{ policy_version, attention_state, primary_surface_code, primary_object_ref,
  actionability_state, primary_action_code, no_safe_action_reason_code, secondary_notice_count,
  detail_entry_points[], suggested_detail_surface_code, ranking_basis[], default_detail_module_code,
  visible_warning_count, primary_rank_score, runner_up_rank_score, dominance_margin }},
  cognitive_budget{{ persistent_surface_limit, concurrent_primary_limit, primary_reason_limit,
  secondary_action_limit, visible_warning_limit, detail_entry_point_limit,
  expanded_detail_module_limit, visibility_budget_units, prominent_motion_limit,
  issue_dominance_min_margin, action_dominance_min_margin, primary_rank_hysteresis,
  non_material_rank_swap_limit, non_material_continuity_cost_limit,
  refresh_coalescing_window_ms, refresh_burst_visible_change_limit }},
  focus_anchor_ref, shell_stability_token, affected_object_refs[], affected_surface_codes[],
  occurred_at, surface_updates[]
  `ExperienceDelta` is a reconnect-safe calm-shell experience patch envelope. It is UX-critical and
  machine-validated, but it is never the legal record of submission, approval, or authority state.
  The scalar attention fields are convenience projections and MUST be exact mirrors of
  `attention_policy{{...}}` so clients do not invent divergent primary issues, action hierarchies,
  or detail-entry ordering. `shell_route_key` SHALL remain the stable manifest route key and SHALL
  therefore stay equal to `manifest_id` across live, catch-up, and snapshot-rebase delivery.
- **CommandEnvelope**: artifact_type, command_id, command_type, idempotency_key, actor_session_ref,
  target_scope_class, tenant_id, client_id, manifest_id, work_item_id, governance_target_ref,
  period, requested_scope[], mutation_precondition_binding{{ profile_code, target_scope_classes[],
  required_guard_fields[], stale_guard_families[], requires_live_freshness,
  invalidates_on_visibility_shift }}, if_match_decision_bundle_hash, if_match_shell_stability_token,
  if_match_frame_epoch, if_match_work_item_version, if_match_internal_head_sequence,
  if_match_customer_head_sequence, if_match_request_state_version, if_match_approval_pack_hash,
  if_match_client_portal_workspace_version, if_match_policy_snapshot_hash,
  if_match_dependency_topology_hash, simulation_basis_hash, mutation_basis_contract,
  truth_boundary_contract{{ contract_version, artifact_role, authoritative_source_policy,
  projection_input_policy, durable_writeback_policy, recovery_basis_policy,
  authoritative_record_families[], observable_projection_families[] }}, payload{{...}}, requested_at
- **ProblemEnvelope**: artifact_type, problem_code, title, detail, reason_codes[], retryable,
  correlation_id, manifest_id, latest_decision_bundle_ref, latest_workspace_snapshot_ref,
  latest_approval_pack_ref, latest_client_portal_workspace_ref, latest_upload_session_ref,
  latest_policy_snapshot_ref, latest_command_receipt_ref, mutation_precondition_binding_or_null,
  truth_boundary_contract{{ contract_version, artifact_role, authoritative_source_policy,
  projection_input_policy, durable_writeback_policy, recovery_basis_policy,
  authoritative_record_families[], observable_projection_families[] }}, stale_guard_family,
  latest_stale_guard_value, latest_resume_token, latest_stability_contract_or_null,
  rebase_required, actionability_state, suggested_detail_surface_code
- **ExperienceStreamEvent**: artifact_type, stream_scope_class, manifest_id, shell_route_key,
  experience_sequence, frame_epoch, shell_stability_token, resume_token, stability_contract,
  stream_recovery_contract, event_type, snapshot_ref, delta_ref, terminal_bundle_ref, occurred_at
- **WorkspaceStreamEvent**: artifact_type, stream_scope_class, item_id, shell_family,
  object_anchor_ref, workspace_route_key, session_visibility_class, workspace_sequence,
  frame_epoch, workspace_version, shell_stability_token,
  visibility_partition{{ partition_scope, audience_class, allowed_visibility_classes[],
  access_binding_hash, masking_posture_fingerprint, cache_partition_key,
  badge_counter_policy, ordering_side_channel_policy, limited_state_presentation,
  export_scope_policy, fallback_discovery_policy }}, access_binding_hash,
  customer_safe_projection,
  masking_posture_fingerprint, resume_token, stability_contract, stream_recovery_contract, event_type, snapshot_ref, delta_ref, activity_ref, audit_ref,
  notification_ref, occurred_at
  `CommandEnvelope`, `ProblemEnvelope`, `ExperienceStreamEvent`, and `WorkspaceStreamEvent` are the
  northbound transport contracts. They SHALL validate against `schemas/command_envelope.schema.json`,
  `schemas/problem_envelope.schema.json`, `schemas/experience_stream_event.schema.json`, and
  `schemas/workspace_stream_event.schema.json` so command intent, typed failure recovery, and
  reconnect-safe event delivery do not diverge across browser, native, and automation clients. The
  command envelope SHALL additionally keep collaboration-lane stale guards, portal pack/workspace
  guards, request-info state guards, manifest-only `manifest_id` targeting, and governance target
  families aligned with the command family, while problem envelopes keep one recovery family at a time, publish only the
  narrowest portal recovery ref for the failing object class, and preserve client-safe recovery
  surfaces for portal flows. Manifest experience events SHALL keep `shell_route_key = manifest_id`,
  and collaboration workspace events SHALL surface the current `shell_stability_token` and
  `access_binding_hash` so clients can detect route-visible stale-guard drift without rebuilding the
  guard vector locally. All route-visible snapshots, stream events, stale failures, and native
  scenes SHALL additionally publish grouped `RouteStabilityContract` lineage so clients can move one
  coherent route generation at a time. Customer-visible `WorkspaceStreamEvent` payloads SHALL also
  carry one aligned `customer_safe_projection` contract so replay, reconnect, and hydration cannot
  reinterpret staff-only deltas as customer-safe continuity. `ExperienceStreamEvent` and `WorkspaceStreamEvent` SHALL
  additionally keep the shared `stream_recovery_contract` aligned with their route-stability
  posture so raw resume tokens, compaction floors, and delivery-window states cannot drift apart
  across manifest and collaboration streams. Both stream families SHALL therefore apply events
  strictly monotonically within one epoch, treat duplicates as idempotent by
  `(stream_scope_class, subject_ref, frame_epoch, sequence)`, and complete catch-up before live
  delivery is treated as current. `ProblemEnvelope` and `ApiCommandReceipt` SHALL both publish the
  authoritative stale-guard family plus the current guard value whenever a rebase is required so
  command truth, read-side truth, and retry-safe recovery remain aligned across browser, native, and
  automation consumers. `CommandEnvelope`, `RunManifest`, `WorkflowItem`,
  `AuthorityInteractionRecord`, `ApiCommandReceipt`, `ProblemEnvelope`, `DecisionBundle`,
  `ExperienceDelta`, `ExperienceCursor`, and `LowNoiseExperienceFrame` SHALL all carry
  `truth_boundary_contract{...}` so the control plane can prove which artifacts are durable command
  truth, which are boundary receipts, and which are disposable read-side projections.
- **LowNoiseExperienceFrame**: artifact_type, frame_id, manifest_id, decision_bundle_ref,
  decision_bundle_hash, trust_summary_ref, experience_profile, shell_family, object_anchor_ref,
  shell_route_key, dominant_question, dominance_contract{{ contract_version, summary_action_alignment_policy,
  dominant_question_surface_code, dominant_action_surface_code, dominant_action_ref_or_null,
  safe_action_state, promoted_support_surface_code_or_null, support_surface_role,
  supplemental_queue_policy, parallel_primary_posture, explicit_multifocus_mode,
  renderer_salience_policy, responsive_collapse_policy, detached_support_policy }},
  cross_device_continuity_contract{{ continuity_scope, canonical_object_ref, route_identity_ref,
  parent_context_ref_or_null, focus_anchor_ref_or_null, return_focus_anchor_ref_or_null,
  dominant_action_state_or_null, stability_guard_hash_or_null, access_scope_hash_or_null,
  masking_scope_fingerprint_or_null, session_scope_ref_or_null,
  visibility_cache_partition_key_or_null, allowed_embodiments[], same_object_policy,
  same_shell_policy, narrow_layout_policy, deep_link_return_policy, action_posture_policy,
  hydration_compatibility_policy, compatibility_basis_class, restoration_mode_policy,
  secondary_window_policy, supported_invalidation_reason_codes[] }},
  semantic_accessibility_contract{{ contract_version, shell_family, selector_profile,
  required_anchor_codes[], semantic_focus_order[], announced_change_kinds[] }},
  frame_epoch, last_published_sequence, shell_stability_token,
  resume_token, truth_boundary_contract{{ contract_version, artifact_role,
  authoritative_source_policy, projection_input_policy, durable_writeback_policy,
  recovery_basis_policy, authoritative_record_families[], observable_projection_families[] }},
  stability_contract, stream_recovery_contract,
  connection_state, truth_state, checkpoint_state, truth_origin, settlement_state,
  recovery_posture, interaction_layer{{ mounted_content_policy, refresh_presentation,
  recovery_presentation, recovery_notice_surface, delta_promotion_mode, selector_profile,
  shell_continuity_policy, activity_partition_policy, investigation_presentation_policy,
  secondary_window_policy, notification_surface, artifact_preview_surface, history_presentation,
  motion_profile, unsafe_action_policy, feedback_truth_policy }},
  attention_policy{{ policy_version, attention_state, primary_surface_code,
  primary_object_ref, actionability_state, primary_action_code, no_safe_action_reason_code,
  secondary_notice_count, detail_entry_points[], suggested_detail_surface_code, ranking_basis[],
  default_detail_module_code, visible_warning_count, primary_rank_score,
  runner_up_rank_score, dominance_margin }},
  cognitive_budget{{ persistent_surface_limit, concurrent_primary_limit, primary_reason_limit,
  secondary_action_limit, visible_warning_limit, detail_entry_point_limit,
  expanded_detail_module_limit, visibility_budget_units, prominent_motion_limit,
  issue_dominance_min_margin, action_dominance_min_margin, primary_rank_hysteresis,
  non_material_rank_swap_limit, non_material_continuity_cost_limit,
  refresh_coalescing_window_ms, refresh_burst_visible_change_limit }},
  copy_budget{{...}}, low_noise_budget_audit{{ contract_version, audit_scope,
  rendered_surface_order[], persistent_surface_count, concurrent_primary_count,
  dominant_issue_count, primary_mutation_action_count, secondary_mutation_action_count,
  visible_reason_count, collapsed_reason_count, visible_warning_count, visible_action_count,
  visible_detail_entry_count, visible_shell_char_count, prominent_motion_count, scan_load,
  copy_budget_state, surface_budget_state, attention_budget_state, semantic_coverage_state,
  duplicate_posture_codes[], duplicate_posture_cluster_count, rank_swap_count_or_null,
  continuity_cost_or_null, visible_change_count_in_window_or_null, coalesced_change_count_or_null,
  refresh_budget_state, detail_fallback_state }}, surface_order[], context_bar, decision_summary,
  action_strip, detail_drawer, active_detail_surface_code, focus_anchor_ref, rendered_at
- **ContextBarState**: artifact_type, surface_code, manifest_label, period_label, scope_label,
  source_module_code, phase_label, freshness_state, truth_origin, connection_state, owner_handoff_posture, owner_label,
  mode_posture, limitation_statement, full_text_ref
- **DecisionSummaryState**: artifact_type, surface_code, source_module_codes[], headline, primary_issue_ref, attention_state,
  visible_warning_count, visible_reasons[], additional_reason_count, plain_explanation,
  uncertainty_statement, limitation_state, state_reason_code_or_null, limitation_reason_codes[],
  limitation_statement, blocking_reason, machine_reason_codes[], full_text_ref
- **ActionStripState**: artifact_type, surface_code, source_module_code, actionability_state, mode_safety_posture,
  primary_action, secondary_actions[], available_action_codes[], blocked_action_codes[],
  ownership_posture, ownership_label, waiting_on_label, blocking_reason, no_safe_action_reason_code,
  machine_reason_codes[], investigation_entry_point, suggested_detail_surface_code,
  active_detail_surface_code, focus_anchor_ref, primary_action_score, runner_up_action_score,
  dominance_margin, suppressed_secondary_count, primary_action.mutation_precondition_binding_or_null,
  secondary_actions[].mutation_precondition_binding_or_null, full_text_ref
- **LowNoiseBudgetAudit**: contract_version, shell_family, audit_scope, rendered_surface_order[],
  persistent_surface_count, concurrent_primary_count, dominant_issue_count,
  primary_mutation_action_count, secondary_mutation_action_count, visible_reason_count,
  collapsed_reason_count, visible_warning_count, visible_action_count,
  visible_detail_entry_count, visible_shell_char_count, prominent_motion_count, scan_load,
  copy_budget_state, surface_budget_state, attention_budget_state, semantic_coverage_state,
  duplicate_posture_codes[], duplicate_posture_cluster_count, rank_swap_count_or_null,
  continuity_cost_or_null, visible_change_count_in_window_or_null, coalesced_change_count_or_null,
  refresh_budget_state, detail_fallback_state
- **LowNoiseBudgetAuditPack**: contract_version, pack_id, deterministic_seed, suite_profile,
  run_mode, dominant_story_policy, posture_deduplication_policy, coalescing_policy,
  copy_budget_policy, cases[]{ case_id, scenario_class, frame_ref, mode_posture,
  actionability_state, audit, dominant_question_changed, primary_action_changed,
  active_detail_surface_code_or_null, expected_coalescing_outcome, expected_fallback_state }
- **DetailDrawerState**: artifact_type, surface_code, entry_points[], expanded_module_code,
  expanded_content_state, focus_anchor_ref, fallback_reason_code, compare_mode_explicit,
  audit_mode_explicit, full_text_ref where each `entry_points[]` row freezes `module_code`,
  user-facing `entry_label`, `semantic_view_kind`, `plain_language_summary`, `content_state`,
  `state_reason_code_or_null`, `limitation_reason_codes[]`, and `anchorable_object_refs[]`
- **ShellStateTaxonomyContract**: contract_version, current_empty_state_or_null,
  current_empty_surface_code_or_null, limitation_reason_codes[], current_settlement_state,
  current_recovery_posture, mounted_context_state, generic_placeholder_policy, loading_strategy,
  limitation_reason_policy, stale_action_policy, recovery_navigation_policy, profile_copy_policy
  `LowNoiseExperienceFrame`, `LowNoiseBudgetAudit`, `LowNoiseBudgetAuditPack`,
  `ContextBarState`, `DecisionSummaryState`, `ActionStripState`, and `DetailDrawerState` are the
  authoritative low-noise shell contracts. They SHALL validate against
  `schemas/low_noise_experience_frame.schema.json`, `schemas/low_noise_budget_audit.schema.json`,
  `schemas/low_noise_budget_audit_pack.schema.json`, `schemas/context_bar_state.schema.json`,
  `schemas/decision_summary_state.schema.json`, `schemas/action_strip_state.schema.json`, and
  `schemas/detail_drawer_state.schema.json` so snapshot reload, reconnect rebase,
  dominant-question continuity, frozen dominance metrics, refresh-budget posture, and calm-shell
  rendering do not rely on prose-only builder behavior. Frame-level `connection_state`,
  `truth_origin`, `active_detail_surface_code`, and `focus_anchor_ref` SHALL stay mirrored into the
  mounted shell surfaces, mutation-capable primary actions SHALL target the mounted
  `object_anchor_ref`, visible secondary actions SHALL stay non-mutating when the primary action is
  mutation-capable, and compare-vs-audit support-region escalation SHALL remain explicit and
  mutually exclusive. `ContextBarState.source_module_code` SHALL stay pinned to
  `MANIFEST_RIBBON`, `DecisionSummaryState.source_module_codes[]` SHALL stay pinned to the exact
  ordered trio `DECISION_CONSTELLATION -> GATE_LATTICE -> TRUST_PRISM`, and
  `ActionStripState.source_module_code` SHALL stay pinned to `WORKFLOW_CHOREOGRAPHER` so the
  production calm shell preserves the FE-25 decision-module lineage without remounting those
  modules as extra first-view peer surfaces. `Scope Composer` remains a pre-manifest or explicit
  composition-route module; once a `manifest_id` exists, its frozen output SHALL persist through
  `scope_label`, `object_anchor_ref`, and the mounted action posture rather than reopening as a
  parallel shell surface. `DetailDrawerState.entry_points[]` SHALL also freeze the user-facing
  module grammar `Evidence Prism`, `Packet Forge`, `Authority Handshake Tunnel`, `Drift Ripple
  Field`, `Audit Echo Panel`, and `Twin Lens`; `FOCUS_LENS` remains the machine binding for the
  visible `Audit Echo Panel`. Compare mode SHALL therefore remain limited to `Twin Lens` or `Drift
  Ripple Field`, audit mode SHALL remain limited to `Audit Echo Panel`, and every module SHALL
  serialize one plain-language interpretation summary instead of relying on visual topology alone.
  `shell_route_key` SHALL remain the stable manifest-experience route key and SHALL therefore stay
  equal to `manifest_id`. `stream_recovery_contract{...}` SHALL additionally freeze the
  authoritative manifest stream binding, published frontier, compaction floor,
  resume-binding representation, and delivery-window state so the raw `resume_token` cannot be
  reused outside the lawful route/session/access/masking context. The shared `interaction_layer`
  SHALL freeze mounted-content preservation,
  inline refresh and rebase presentation, coalesced non-material delta handling, operator semantic
  selectors, same-shell inline recovery continuity, visibility-scoped collaboration partitions when
  collaboration is mounted, summary-first investigation posture, context-bar notifications,
  detail-drawer preview preference, current-first history posture, subtle causal motion, and
  fail-closed unsafe-action posture. `cross_device_continuity_contract{...}` SHALL additionally
  freeze the manifest route identity, same-shell narrow-layout posture, route-guard restoration
  basis, and browser-plus-native calm-shell embodiments so resize and restoration cannot reopen a
  different manifest shell. All route-visible browser shells and native scenes that publish this
  continuity envelope SHALL additionally participate in `shell_continuity_fuzz_harness` cases that
  serialize pre-state, post-state, asserted invariants, and shrink sequences for rebase,
  reconnect, resize, catch-up, and restoration perturbations. Contextual routes, support regions,
  help handoffs, and parent-bound windows SHALL additionally participate in
  `focus_restore_return_target_harness` cases that serialize active focus anchors, return anchors,
  fallback anchors, browser/native identifier mirrors, live-update focus locks, and the lawful
  return or fallback target selected after close, back, stale recovery, or secondary-window
  dismissal. The same route-visible shells and native scenes SHALL additionally participate in
  `semantic_accessibility_regression_pack` cases that bind their exact selector profile, landmark
  and heading structure, keyboard path, screen-reader path, live announcement mode, reduced-motion
  parity, and support-surface dismissal law to deterministic Playwright or XCUITest evidence.
- **NativeOperatorWorkspaceScene**: artifact_type, scene_id, tenant_id, shell_family,
  surface_embodiment, backing_read_model_type, backing_read_model_ref, object_family,
  object_anchor_ref, dominant_question, dominance_contract, settlement_state, recovery_posture,
  cross_device_continuity_contract{{ continuity_scope, canonical_object_ref, route_identity_ref,
  parent_context_ref_or_null, focus_anchor_ref_or_null, return_focus_anchor_ref_or_null,
  dominant_action_state_or_null, stability_guard_hash_or_null, access_scope_hash_or_null,
  masking_scope_fingerprint_or_null, session_scope_ref_or_null,
  visibility_cache_partition_key_or_null, allowed_embodiments[], same_object_policy,
  same_shell_policy, narrow_layout_policy, deep_link_return_policy, action_posture_policy,
  hydration_compatibility_policy, compatibility_basis_class, restoration_mode_policy,
  secondary_window_policy, supported_invalidation_reason_codes[] }},
  semantic_accessibility_contract{{ contract_version, shell_family, selector_profile,
  required_anchor_codes[], semantic_focus_order[], announced_change_kinds[] }},
  interaction_layer{{ mounted_content_policy, refresh_presentation, recovery_presentation,
  recovery_notice_surface, delta_promotion_mode, selector_profile, shell_continuity_policy,
  activity_partition_policy, investigation_presentation_policy, secondary_window_policy,
  notification_surface, artifact_preview_surface, history_presentation, motion_profile,
  unsafe_action_policy, feedback_truth_policy }},
  surface_order[],
  leading_sidebar{{ selection_family, sidebar_collapse_state, selected_object_ref,
  selected_focus_anchor_ref_or_null }}, primary_canvas{{ surface_order[],
  authoritative_action_surface_code, mounted_object_ref, focused_surface_code_or_null }},
  trailing_inspector{{ presentation_mode, support_surface_code, bound_object_ref_or_null,
  focus_anchor_ref_or_null, detached_scene_ref_or_null, authoritative_action_strip_present }},
  scene_identity{{ principal_session_lineage_ref, masking_posture_fingerprint,
  access_binding_hash_or_null, schema_compatibility_ref, stability_contract,
  shell_stability_token, route_key, frame_epoch, workspace_version_or_null, manifest_id_or_null,
  work_item_id_or_null, focus_anchor_ref_or_null }},
  scene_restoration{{ restoration_state, invalid_reason_codes[], restoration_anchor_ref_or_null,
  focus_restoration{{ requested_focus_anchor_ref_or_null, resolved_focus_anchor_ref_or_null,
  restoration_disposition, restoration_reason_code_or_null }}, resume_token_ref_or_null }},
  shortcut_posture{{ available_shortcut_codes[], focused_region,
  menu_command_surface_state, focus_restore_policy }}, rendered_at
  `NativeOperatorWorkspaceScene` is the machine-readable primary-window contract for the signed
  macOS operator app. It SHALL wrap one mounted `LowNoiseExperienceFrame` or `WorkspaceSnapshot`,
  preserve the fixed region order `LEADING_SIDEBAR -> PRIMARY_CANVAS -> TRAILING_INSPECTOR`, keep
  the sidebar, canvas, and inspector bound to the same manifest or work-item object anchor, keep
  `ACTION_STRIP` as the only authoritative action surface, and serialize grouped focus-restoration
  outcome plus restoration invalidation posture instead of reopening stale
  tenant/session/masking lineage heuristically. It SHALL
  validate against `schemas/native_operator_workspace_scene.schema.json` so detached inspectors stay
  support-only, focus/shortcut behavior remains explicit, and scene restoration cannot reopen the
  wrong object family after tenant switch, privilege downgrade, masking change, or schema
  incompatibility. Its route-visible shell identity SHALL therefore keep the same canonical
  `shell_family = CALM_SHELL` and publish `surface_embodiment = NATIVE_OPERATOR` separately. Its
  `interaction_layer` SHALL additionally freeze inline recovery presentation, system-notification
  mirroring, operator selector continuity, parent-bound support-window policy, detached-preview
  preference, current-first history posture, and subtle causal motion instead of relying on
  platform-local heuristics. `cross_device_continuity_contract{...}` SHALL bind the native scene to
  the same mounted object, route guard hash, session/masking lineage, and explicit restoration mode;
  workspace-backed scenes SHALL keep access-binding drift explicit through
  `scene_identity.access_binding_hash_or_null`. `native_cache_hydration_contract{...}` SHALL be the
  pre-paint and pre-restore legality boundary so cache-only restoration cannot silently reopen stale
  tenant/session/masking/schema context or preserve mutation-capable posture without live rebase.
- **NativeOperatorSecondaryWindowScene**: artifact_type, scene_id, tenant_id, shell_family,
  surface_embodiment, secondary_window_kind, source_module_code, parent_scene_ref,
  parent_backing_read_model_type, parent_object_family, parent_object_anchor_ref,
  parent_focus_anchor_ref, dominant_question,
  cross_device_continuity_contract{{ continuity_scope, canonical_object_ref, route_identity_ref,
  parent_context_ref_or_null, focus_anchor_ref_or_null, return_focus_anchor_ref_or_null,
  dominant_action_state_or_null, stability_guard_hash_or_null, access_scope_hash_or_null,
  masking_scope_fingerprint_or_null, session_scope_ref_or_null,
  visibility_cache_partition_key_or_null, allowed_embodiments[], same_object_policy,
  same_shell_policy, narrow_layout_policy, deep_link_return_policy, action_posture_policy,
  hydration_compatibility_policy, compatibility_basis_class, restoration_mode_policy,
  secondary_window_policy, supported_invalidation_reason_codes[] }},
  cache_isolation_contract{{ cache_scope_class, tenant_id, principal_class, session_binding_hash,
  access_binding_hash_or_null, masking_posture_fingerprint_or_null, route_identity_ref,
  canonical_object_ref, projection_version_ref, cache_partition_ref, preview_subject_ref_or_null,
  delivery_binding_hash, delivery_revalidation_policy, temporary_artifact_policy }},
  native_cache_hydration_contract{{ hydration_scope_class, tenant_id, principal_class,
  session_binding_hash, session_lineage_ref_or_null, access_binding_hash_or_null,
  masking_posture_fingerprint, route_identity_ref, canonical_object_ref, shell_family,
  schema_compatibility_ref, projection_guard_ref, resume_binding_ref_or_null,
  restoration_anchor_ref_or_null, preview_subject_ref_or_null, compatibility_dimensions[],
  purge_trigger_reason_codes[], regulated_local_artifact_classes[] }},
  semantic_accessibility_contract{{ contract_version, shell_family, selector_profile,
  required_anchor_codes[], semantic_focus_order[], announced_change_kinds[] }},
  interaction_layer{{ mounted_content_policy,
  refresh_presentation, recovery_presentation, recovery_notice_surface, delta_promotion_mode,
  selector_profile, shell_continuity_policy, activity_partition_policy,
  investigation_presentation_policy, secondary_window_policy, notification_surface,
  artifact_preview_surface, history_presentation, motion_profile, unsafe_action_policy,
  feedback_truth_policy }}, artifact_affordance{{ affordance_scope, primary_subject_role,
  visible_primary_subject_ref_or_null, header_posture, history_affordance_state,
  preview_open_policy, default_preview_target_ref_or_null,
  default_download_target_ref_or_null, default_print_target_ref_or_null }},
  window_surface_order[],
  identity_header{{ parent_object_ref, mounted_artifact_ref, headline, status_label,
  currentness_state, lineage_summary_ref }}, summary_loading{{ summary_card_ref, summary_state,
  detail_state, default_revision_posture, historical_navigation_state }}, focus_handoff{{
  launch_focus_anchor_ref, window_focus_target, close_return_focus_anchor_ref,
  parent_focus_restore_policy }}, scene_identity{{ principal_session_lineage_ref,
  masking_posture_fingerprint, access_binding_hash_or_null, schema_compatibility_ref,
  stability_contract, shell_stability_token, route_key, frame_epoch, workspace_version_or_null,
  manifest_id_or_null, work_item_id_or_null, focus_anchor_ref_or_null }}, scene_restoration{{ restoration_state, invalid_reason_codes[],
  restoration_anchor_ref_or_null, focus_restoration{{ requested_focus_anchor_ref_or_null,
  resolved_focus_anchor_ref_or_null, restoration_disposition, restoration_reason_code_or_null }},
  resume_token_ref_or_null }}, support_only_window, rendered_at
  `NativeOperatorSecondaryWindowScene` is the machine-readable detached-window contract for native
  macOS compare, audit, evidence, and diff workflows. It SHALL remain bound to the same parent
  manifest or work-item shell, preserve the fixed reading order
  `IDENTITY_HEADER -> SUMMARY_CARD -> DETAIL_BODY`, keep the window support-only, keep summary-first
  current-artifact or current-comparison posture explicit while historical/raw detail stays
  secondary, and serialize focus handoff plus grouped focus-restoration outcome so closing the
  window returns the operator to the same parent anchor rather than a shell root or unrelated
  object. Its route-visible shell identity SHALL therefore keep the same canonical
  `shell_family = CALM_SHELL` and publish `surface_embodiment = NATIVE_OPERATOR` separately. Its
  `interaction_layer` SHALL freeze identity-header recovery notices, parent-owned notifications,
  operator selector continuity, parent-bound support-only window policy, secondary-window preview
  posture, current-first history separation, and subtle causal motion.
  `native_cache_hydration_contract{...}` SHALL additionally bind preview identity, restoration
  anchor, schema window, and purge inventory so detached windows cannot reopen stale preview
  context or leave `NSUserActivity` or export artifacts behind after masking drift or revocation.
- **ClientPortalWorkspace**: workspace_id, tenant_id, client_id, manifest_id, viewer_role,
  shell_family, object_anchor_ref, dominant_question, language_contract, dominance_contract,
  cross_device_continuity_contract{{ continuity_scope, canonical_object_ref, route_identity_ref,
  parent_context_ref_or_null, focus_anchor_ref_or_null, return_focus_anchor_ref_or_null,
  dominant_action_state_or_null, stability_guard_hash_or_null, access_scope_hash_or_null,
  masking_scope_fingerprint_or_null, session_scope_ref_or_null,
  visibility_cache_partition_key_or_null, allowed_embodiments[], same_object_policy,
  same_shell_policy, narrow_layout_policy, deep_link_return_policy, action_posture_policy,
  hydration_compatibility_policy, compatibility_basis_class, restoration_mode_policy,
  secondary_window_policy, supported_invalidation_reason_codes[] }},
  semantic_accessibility_contract{{ contract_version, shell_family, selector_profile,
  required_anchor_codes[], semantic_focus_order[], announced_change_kinds[] }},
  settlement_state, recovery_posture,
  identity_context{{...}},
  workspace_posture{{ connection_state, interaction_posture,
  promoted_support_region, notice_headline, notice_detail, full_text_ref }}, route,
  route_context{{ context_route, context_object_ref, return_route, focus_anchor_ref,
  artifact_focus_bucket_or_null, artifact_focus_subject_ref_or_null,
  focus_restoration{{ requested_focus_anchor_ref_or_null, resolved_focus_anchor_ref_or_null,
  restoration_disposition, restoration_reason_code_or_null }},
  return_focus_anchor_ref_or_null, fallback_target, fallback_object_ref_or_null,
  fallback_reason_ref_or_null, narrow_screen_mode }}, workspace_version, freshness_state,
  view_guard_ref, stability_contract{{ route_scope_class, publication_generation, guard_vector_hash,
  guard_vector_components{{...}}, last_published_sequence_or_null, resume_token_or_null,
  resume_capability }}, visibility_partition{{ partition_scope, audience_class,
  allowed_visibility_classes[], access_binding_hash, masking_posture_fingerprint,
  cache_partition_key, badge_counter_policy, ordering_side_channel_policy,
  limited_state_presentation, export_scope_policy, fallback_discovery_policy }},
  customer_safe_projection, navigation_tabs[],
  interaction_layer{{ navigation_model, spacing_profile, status_language_profile,
  selector_profile, support_region_policy, route_continuity_policy,
  focus_restoration_policy, artifact_hierarchy_policy, responsive_detail_policy,
  motion_profile, feedback_truth_policy }},
  status_hero{{...}}, reliability_summary{{ surface_class, network_posture,
  dominant_flow_kind, flow_stability_score, risk_weighted_friction_score,
  completion_probability, recovery_posture, dominant_abort_hazard_code }}, task_groups[],
  home_surface_order[], home_primary_task_ref,
  draft_resume{{...}}, content_limitations[],
  document_center{{ summary_label, surface_order[], upload_affordances[], status_phase_order[],
  open_request_count, requests[]{ request_id, request_version_ref, category, title,
  why_requested_label, due_at, due_label, accepted_file_types[], max_file_size_mb,
  uploads[]{ upload_session_id, request_version_ref, request_binding_state,
  resumability_state, attachment_state, history_state, preview_posture,
  preview_reason_code, ... }, current_upload_ref, current_artifact_upload_ref,
  artifact_selection{{ selection_scope, presentation_mode, primary_subject_refs[],
  authoritative_subject_refs[], historical_subject_refs[], limited_history_state,
  limited_history_count_or_null, default_preview_target_ref_or_null,
  default_download_target_ref_or_null, default_print_target_ref_or_null }},
  artifact_affordance{{ affordance_scope, primary_subject_role,
  visible_primary_subject_ref_or_null, header_posture, history_affordance_state,
  preview_open_policy, default_preview_target_ref_or_null,
  default_download_target_ref_or_null, default_print_target_ref_or_null }} },
  last_uploaded_at }}, approval_center{{ surface_order[],
  outstanding_count, latest_pack_ref, packs[]{ approval_pack_id, title, due_at, summary,
  change_highlight_count, change_digest_summary, change_highlights_ref,
  stale_protection_state, requires_step_up, declaration_text_ref, declaration_download_ref,
  declaration_print_ref, change_digest_acknowledged, declaration_acknowledged,
  approval_acknowledged, sign_off_state, step_up_surface, step_up_checkpoint_state,
  approval_readiness_score, recovery_posture, dominant_hazard_code, primary_action,
  sign_command_receipt_ref, receipt_state, settlement_pending_label, receipt_ref,
  receipt_download_ref, receipt_print_ref, receipt_issued_at, receipt_next_step_label,
  superseded_by_pack_ref, artifact_selection{{ selection_scope, presentation_mode,
  primary_subject_refs[], authoritative_subject_refs[], historical_subject_refs[],
  limited_history_state, limited_history_count_or_null, default_preview_target_ref_or_null,
  default_download_target_ref_or_null, default_print_target_ref_or_null }},
  artifact_affordance{{ affordance_scope, primary_subject_role,
  visible_primary_subject_ref_or_null, header_posture, history_affordance_state,
  preview_open_policy, default_preview_target_ref_or_null,
  default_download_target_ref_or_null, default_print_target_ref_or_null }} } }},
  onboarding_journey{{...}}, support_panel{{ help_headline, contact_options[]{...},
  secure_message_allowed, faq_refs[], surface_order[], case_context_panel{{ context_summary_ref,
  carried_context_refs[], linked_request_info_ref, linked_object_ref, focus_anchor_ref,
  restate_required, recommended_channel_code }} }}, activity_timeline[], updated_at
  `ClientPortalWorkspace` is a read-side projection optimized for the customer/client portal. It SHALL
  flatten gate, workflow, and authority posture into literal status, deadline, task, and confirmation
  language, SHALL preserve one explicit `visibility_partition` contract so customer-safe cache,
  badge, ordering, export, and fallback semantics stay server-authored, SHALL publish one aligned
  `customer_safe_projection` contract across portal workspace, request-detail, document, approval,
  onboarding, timeline, and notification surfaces so status/action/recovery/history wording stays
  blocked from staff-only derivation, SHALL publish one shared `language_contract` so plain
  wording, jargon bans, due/current/history/settlement grammar, and bounded portal copy budgets
  stay server-authored, with explicit first-view route budgets and no duplicated limitation/recovery
  narratives across competing visible regions, and SHALL preserve explicit portal shell ownership through `shell_family`, one mounted
  `object_anchor_ref`, one `dominant_question`, top-level `settlement_state`, top-level
  `recovery_posture`, delegated acting context, contextual deep-link focus, and explicit reconnect
  or limitation posture, while `workspace_posture` and `freshness_state` remain portal-specific
  detail and `workspace_version`, `view_guard_ref`, and the shared shell posture fields provide the
  route-stable stale-view anchors. It SHALL additionally publish a shared `interaction_layer` contract for
  task-first spacing, literal client-safe status language, selector profile, support-region
  promotion, same-shell return grammar, current-vs-history artifact hierarchy, responsive stacking,
  and low-amplitude motion. It SHALL additionally publish governed reliability posture for the dominant
  client flow, keep the active top-level tab aligned with `route`, keep canonical route labels and
  action-required badge counts aligned with top-level navigation truth, maintain exact request and
  approval count projections, preserve status-compatible current upload and latest-pack refs, keep
  onboarding completion math coherent, and keep the client activity timeline newest-first. On the
  `Home` route it SHALL additionally freeze the one-column first-view reading order through
  `home_surface_order = [PORTAL_HEADER, STATUS_HERO, TASK_QUEUE, RECENT_ACTIVITY]`, carry the
  concise `PORTAL_HEADER` reassurance line inside `identity_context`, bind the dominant hero CTA to
  `home_primary_task_ref`, keep `status_hero.status_code` in the literal portal vocabulary
  `ACTION_REQUIRED | IN_REVIEW | WAITING_ON_US | WAITING_ON_AUTHORITY | READY_TO_SIGN | COMPLETED |
  ONBOARDING_REQUIRED`, keep `status_hero.secondary_action = null`, keep `task_groups[]` in the ordered literal buckets `Do now`, `Coming up`,
  and `Done` with status-aligned tasks, surface one clear due point through the hero and/or that
  task using explicit `Due ...`/`Overdue ...` dates or `No deadline yet`, deterministically promote
  `draft_resume` versus blocking `content_limitations[]` through `workspace_posture`, and cap
  recent activity to the latest six customer-safe events. On the `Documents` route it SHALL freeze
  the first-view sequence through `document_center.surface_order =
  [DOCUMENT_INBOX, UPLOAD_PANEL, UPLOAD_STATUS_LIST, DOCUMENT_HISTORY]`, preserve the governed
  upload affordances `BROWSE`, `DRAG_DROP`, and `CAMERA_CAPTURE`, publish the upload-status phase
  ladder `[TRANSFER, SCAN, VALIDATION, ACCEPTANCE, REJECTION, RETRY]`, keep one explicit
  `why_requested_label` and `due_label` on each request card, preserve the request's governed
  `request_version_ref`, mirror each upload row's `request_version_ref`, `request_binding_state`,
  `resumability_state`, and `attachment_state`, use each upload row's `history_state` as the
  explicit current-versus-history label, publish one explicit `preview_posture` plus typed
  `preview_reason_code` whenever same-shell preview is downgraded or blocked, and separate the
  active `current_upload_ref` from the default downloadable `current_artifact_upload_ref` so
  rejected or superseded uploads never read as the current client artifact and request rebases
  require explicit reconfirmation instead of silent rebinding. Each document request SHALL also
  publish one explicit `artifact_selection` contract so primary request focus, authoritative current
  artifact, visible history, limited-history disclosure, and default preview/download/print posture
  remain server-authored through refresh, reconnect, and narrow-screen recovery. On the `Approvals` route it SHALL
  freeze the first-view sequence through `approval_center.surface_order =
  [APPROVAL_SUMMARY, CHANGE_DIGEST, DECLARATION_PANEL, SIGN_OFF_PANEL]`, carry one compact
  `change_digest_summary` plus `change_highlights_ref`, preserve readable declaration text through
  `declaration_text_ref` with distinct `declaration_download_ref` and `declaration_print_ref`,
  mirror durable acknowledgement progress through `change_digest_acknowledged`,
  `declaration_acknowledged`, and `approval_acknowledged`, keep one explicit `sign_off_state`,
  `step_up_surface`, `step_up_checkpoint_state`, and `receipt_state` so inline review, stale
  rebase, contained step-up, signature-submitted pending settlement, and final receipt issuance
  stay legible, keep approval actions anchored to the `APPROVALS` route and the current
  `approval_pack_id`, expose `sign_command_receipt_ref` plus `settlement_pending_label` whenever a
  sign command has been accepted but the final receipt has not yet settled, and separate
  declaration export affordances from receipt refs, printable receipts, receipt timestamps, and
  next-step labels so stale or historical packs never masquerade as the current signing target. Each
  approval pack SHALL also publish one explicit `artifact_selection` contract, and contextual portal
  `route_context{ artifact_focus_bucket_or_null, artifact_focus_subject_ref_or_null, ... }` SHALL
  preserve whether the client was focused on the current artifact, explicit history, or limitation
  notice when the route is restored. On
  the `Onboarding` route it SHALL freeze the first-view
  sequence through `onboarding_journey.surface_order =
  [WELCOME_PANEL, ONBOARDING_STEPPER, STEP_WORKSPACE, SUPPORT_PANEL]`, preserve one
  `current_step_code`, one `step_workspace_state`, explicit `resume_state` and `resume_step_code`,
  explicit `save_return_state`, and any `save_and_return_action` so live resume, reconfirmation,
  stale review, completion summary, and terminal exit/support states never blur together; terminal
  onboarding states SHALL remove the dedicated onboarding route rather than preserving a permanent
  wizard shell. On the `Help` route it SHALL freeze the first-view sequence through
  `support_panel.surface_order = [HELP_OPTIONS, TOP_QUESTIONS, CASE_CONTEXT_PANEL]`, keep
  `faq_refs[]` as the bounded `TOP_QUESTIONS` set, keep `case_context_panel` machine-readable with
  one `context_summary_ref`, one non-empty `carried_context_refs[]` set, exact focus-anchor
  lineage, optional linked request or object refs, one recommended help channel, and
  `restate_required = false`, and clear those help-only fields off non-`HELP` routes so support
  does not overtake task-first portal shells elsewhere. It SHALL NOT expose internal-only reason
  codes or expert-only surface taxonomies as first-view content. When
  `route_context.context_route = REQUEST_DETAIL`, it SHALL additionally preserve one explicit
  parent-route return focus anchor, one explicit fallback target and reason, optional latest-visible
  fallback object ref, and `narrow_screen_mode = STACKED_SAME_SHELL` so request-detail recovery
  never degrades into a generic portal-home bounce.
- **InteractionLayerFoundationContract**: contract_version, shell_family,
  design_token_binding_policy, layout_density_token, surface_spacing_token,
  support_surface_spacing_token, responsive_compaction_token, selector_profile,
  support_surface_policy, continuity_policy, recovery_surface_policy,
  history_presentation_policy, preview_surface_policy, notification_surface_policy,
  secondary_window_policy, motion_profile, motion_token, feedback_truth_policy,
  platform_parity_policy
  `InteractionLayerFoundationContract` is the shared cross-shell design-token and interaction
  foundation for `OperatorInteractionLayer`, `PortalInteractionLayer`, and
  `GovernanceInteractionLayer`. It SHALL make density, spacing, responsive-compaction, selector,
  motion, preview, history, notification, recovery, and secondary-window posture explicit instead
  of letting those semantics leak through route-local theme defaults or platform-local wrappers.
- **PortalInteractionLayer**: foundation_contract, navigation_model, spacing_profile, status_language_profile,
  selector_profile, support_region_policy, route_continuity_policy, focus_restoration_policy,
  artifact_hierarchy_policy, responsive_detail_policy, motion_profile, feedback_truth_policy
  `PortalInteractionLayer` is the shared interaction contract for all `CLIENT_PORTAL_SHELL`
  routes. It SHALL freeze task-first spacing, literal client-safe status language, semantic
  selector grammar, one promoted support region, same-shell contextual return, focus restoration,
  current-primary-history-secondary artifact posture, stacked responsive detail, subtle causal
  motion, and durable receipt/problem-driven feedback across browser, mobile, responsive, and
  native portal embodiments through one grouped `foundation_contract = InteractionLayerFoundationContract`.
  That grouped foundation SHALL carry the explicit portal token bindings for comfortable task
  density, primary stack spacing, inline support spacing, and stacked-below-primary responsive
  compaction so portal routes cannot invent local spacing or recovery grammar.
  Those embodiments MAY restack or redock the same support/detail
  surfaces, but they SHALL NOT create detached recovery branches, duplicate promoted support
  regions, or remount a different product metaphor for the same object. `cross_device_continuity_contract{...}`
  SHALL additionally freeze the contextual parent return route, focus anchor, visibility cache basis,
  and browser-only embodiment set so portal detail recovery stays same-object and same-shell.
  Route-visible portal shells that publish those parent-return and fallback anchors SHALL
  additionally participate in `focus_restore_return_target_harness` cases for `BACK_NAVIGATION`,
  `HELP_HANDOFF_RETURN`, and stale fallback so contextual return never degrades into generic portal
  home or tab-root bounce. They SHALL additionally participate in
  `semantic_accessibility_regression_pack` cases so responsive restack and reconnect keep portal
  selector anchors, request focus, support-panel reachability, and return-path control stable.
- **OperatorInteractionLayer**: foundation_contract, mounted_content_policy, refresh_presentation,
  recovery_presentation, recovery_notice_surface, delta_promotion_mode, selector_profile,
  shell_continuity_policy, activity_partition_policy, investigation_presentation_policy,
  secondary_window_policy, notification_surface, artifact_preview_surface, history_presentation,
  motion_profile, unsafe_action_policy, feedback_truth_policy
  `OperatorInteractionLayer` is the shared interaction contract for all `CALM_SHELL` read models
  and native calm-shell scene wrappers. It SHALL freeze mounted-content preservation, inline
  refresh and rebase posture, semantic selector grammar, same-object same-shell continuity,
  visibility-scoped activity partitioning, summary-first investigation posture, support-only
  secondary windows, current-primary-history-secondary artifact posture, subtle causal motion,
  fail-closed degraded-action posture, and durable receipt/problem-driven feedback. Its grouped
  `foundation_contract = InteractionLayerFoundationContract` SHALL carry the explicit calm-shell
  token bindings for four-surface density, four-surface spacing, detail-drawer support spacing,
  and calm-shell support redock behavior so collaboration, inbox, and native calm-shell surfaces
  cannot drift into route-local density or preview variants. Native scene
  wrappers MAY vary only the embodiment surfaces already named by the owning read model, such as
  where recovery notices, notifications, or preview bodies render; they SHALL NOT derive a second
  operator interaction grammar for the same mounted object. Calm-shell routes and native detached
  support scenes that publish invoker anchors, fallback anchors, or secondary-window parent-return
  anchors SHALL additionally participate in `focus_restore_return_target_harness` cases for
  support-region close, responsive restack, stale rebase recovery, live-update focus-lock
  preservation, and `SECONDARY_WINDOW_CLOSE`. They SHALL additionally participate in
  `semantic_accessibility_regression_pack` cases so browser and native calm-shell embodiments keep
  the same semantic anchor refs, support-surface semantics, live announcement posture, and
  reduced-motion recovery story.
- **GovernanceInteractionLayer**: foundation_contract, density_profile, inventory_filter_grammar,
  support_surface_policy, diff_basket_policy, export_binding_policy, keyboard_focus_policy,
  selector_profile, selected_filter_chip_refs[], compaction_mode, auxiliary_surface_presentation,
  focus_trap_mode, selection_persistence_mode, preserved_context_codes[], motion_profile,
  feedback_truth_policy
  `GovernanceInteractionLayer` is the shared interaction contract for all
  `GOVERNANCE_DENSITY_SHELL` routes. It SHALL freeze one canonical density profile, one canonical
  inventory/filter grammar, one governed semantic selector profile, one promoted-support-surface
  policy, one staged diff/basket continuity policy, one active-slice export-binding policy, one
  keyboard/focus restoration policy, one subtle-causal motion policy, and one durable
  receipt/problem-driven feedback policy across all governance routes. Its grouped
  `foundation_contract = InteractionLayerFoundationContract` SHALL carry the explicit governance
  token bindings for dense workspace spacing, auxiliary-surface spacing, and redocked auxiliary
  compaction so governance routes cannot encode density or support-surface behavior implicitly.
  It SHALL
  additionally serialize the exact active chip echo, the current wide-vs-redocked embodiment,
  whether the promoted auxiliary surface is a sidecar/drawer/inspector/tray, the
  non-modal-vs-explicit-modal focus posture, and the route-specific context that must survive
  resize, reconnect, and stale-view rebase while the same governed object still resolves. Browser
  and native governance embodiments MAY change only compaction or auxiliary-surface embodiment; they
  SHALL NOT drop selection, focus anchor, promoted support-surface budgeting, staged diff/basket
  context, or receipt/problem-driven recovery semantics for the same governed object. Governance
  routes that serialize compare/diff focus locks or support-route return anchors SHALL additionally
  participate in `focus_restore_return_target_harness` cases so live updates and support-surface
  close behavior preserve the same governed selection and keyboard target. They SHALL additionally
  participate in `semantic_accessibility_regression_pack` cases so dense governance shells keep the
  same landmark, heading, live-announcement, and support-sidecar semantics across browser and
  native embodiments.
- **TenantGovernanceSnapshot**: snapshot_id, tenant_id, shell_family, object_anchor_ref,
  environment_ref, policy_snapshot_hash, dominant_question, dominance_contract,
  cross_device_continuity_contract{{ continuity_scope, canonical_object_ref, route_identity_ref,
  parent_context_ref_or_null, focus_anchor_ref_or_null, return_focus_anchor_ref_or_null,
  dominant_action_state_or_null, stability_guard_hash_or_null, access_scope_hash_or_null,
  masking_scope_fingerprint_or_null, session_scope_ref_or_null,
  visibility_cache_partition_key_or_null, allowed_embodiments[], same_object_policy,
  same_shell_policy, narrow_layout_policy, deep_link_return_policy, action_posture_policy,
  hydration_compatibility_policy, compatibility_basis_class, restoration_mode_policy,
  secondary_window_policy, supported_invalidation_reason_codes[] }},
  semantic_accessibility_contract{{ contract_version, shell_family, selector_profile,
  required_anchor_codes[], semantic_focus_order[], announced_change_kinds[] }},
  settlement_state, recovery_posture,
  interaction_layer{{ density_profile, inventory_filter_grammar, support_surface_policy,
  diff_basket_policy, export_binding_policy, keyboard_focus_policy,
  selected_filter_chip_refs[], compaction_mode, auxiliary_surface_presentation,
  focus_trap_mode, selection_persistence_mode, preserved_context_codes[],
  feedback_truth_policy }},
  primary_queue_code, primary_worklist_ref, active_filters{{ environment_ref, client_refs[],
  principal_classes[], risk_families[], change_states[] }}, selected_canvas_object_ref,
  focus_anchor_ref,
  pending_approval_count, risky_configuration_drift_count, expiring_authority_link_count,
  retention_exception_count, pending_approval_worklist_ref, configuration_drift_worklist_ref,
  authority_link_risk_worklist_ref, retention_exception_worklist_ref, audit_hotspot_worklist_ref,
  pending_change_worklist_ref, attention_summary{{ attention_family, headline, supporting_text,
  primary_worklist_ref, primary_action_label, why_now_label, affected_scope_label,
  next_legal_action_label, secondary_issue_count }}, risk_ledger_entries[]{ queue_code, headline,
  open_count, worklist_ref, affected_scope_label, next_action_label }, support_region_state{{ mode,
  selected_object_ref, reason_code }}, authority_link_risk_refs[], retention_exception_refs[],
  audit_hotspot_refs[], recent_change_refs[], pending_change_refs[], updated_at
  `TenantGovernanceSnapshot` is the read-side governance overview contract. It SHALL carry one
  dominant attention summary plus concrete worklist references for each top-level count, one
  dominant queue, one explicit support-sidecar mode, route-stable inventory filters, one selected
  canvas object, and one focus anchor so overview cards, filter trays, and hotspot tapes never
  become dead-end summaries or lose the active object on responsive collapse. The promoted
  `attention_summary` SHALL expose `why now`, `affected scope`, and one `next legal action`, while
  `risk_ledger_entries[]`, `pending_change_worklist_ref`, `authority_link_risk_refs[]`,
  `retention_exception_refs[]`, and `audit_hotspot_refs[]` keep the supporting overview widgets
  worklist-backed and object-anchored. Dominant queue selection SHALL follow the frozen family-score
  and hysteresis policy rather than a fixed hard-coded family order. `cross_device_continuity_contract{...}`
  SHALL additionally freeze the governance object anchor, focus anchor, policy snapshot guard, and
  browser continuity basis so responsive collapse and reconnect do not reopen a different section shell.
- **GovernancePolicySnapshot**: artifact_type, snapshot_id, tenant_id, shell_family,
  object_anchor_ref, dominant_question, settlement_state, recovery_posture, policy_snapshot_hash,
  interaction_layer{{ density_profile, inventory_filter_grammar, support_surface_policy,
  diff_basket_policy, export_binding_policy, keyboard_focus_policy,
  selected_filter_chip_refs[], compaction_mode, auxiliary_surface_presentation,
  focus_trap_mode, selection_persistence_mode, preserved_context_codes[],
  feedback_truth_policy }},
  environment_bindings[], session_security_posture{{...}}, step_up_rules[], approval_rules[],
  masking_defaults[], last_material_change_ref,
  tenant_config_workspace{{ surface_order, section_nav_order, active_section_code,
  visible_form_section_refs[], inline_policy_help{{ help_mode, help_refs[] }} }},
  change_basket{{ basket_state, simulation_atomicity, submission_enabled,
  active_simulation_basis_hash, active_dependency_topology_hash,
  active_mutation_basis_contract_or_null, step_up_pending, approval_requirement,
  bounded_safe_mutation, required_approvals[],
  staged_change_groups[]{ object_type, simulation_basis_hash, dependency_topology_hash,
  mutation_basis_contract,
  impact_radius_lower_score, impact_radius_upper_score, impacted_principal_count,
  impacted_client_count, impacted_authority_operation_count, impacted_workflow_count,
  impacted_limitation_count, policy_risk_score, simulation_confidence_score,
  predictability_score, approval_requirement, bounded_safe_mutation, required_approvals[],
  reason_codes[], staged_changes[]{ change_ref, field_ref, current_value_label,
  proposed_value_label, effective_scope_label, reason_required, approval_required,
  audit_event_families[], input_commit_mode } } }},
  approval_composer{{ composer_state, requested_approver_scope[], related_object_refs[],
  rationale_required, rationale_ref, expires_at, mutation_basis_contract_or_null }},
  blast_radius_panel{{ panel_state, simulation_basis_hash, dependency_topology_hash,
  impact_radius_lower_score, impact_radius_upper_score, impacted_principal_count,
  impacted_client_count, impacted_authority_operation_count, impacted_workflow_count,
  impacted_limitation_count, policy_risk_score, simulation_confidence_score,
  predictability_score, mutation_basis_contract_or_null, approval_requirement,
  bounded_safe_mutation, reason_codes[] }},
  config_history_timeline{{ timeline_state, latest_change_ref, selected_change_ref,
  visible_change_refs[] }}, captured_at
  `GovernancePolicySnapshot` is the control-plane stale-view anchor for tenant policy changes. It
  SHALL preserve the exact policy hash, environment binding posture, and step-up or approval rules
  that northbound governance commands must match. It additionally acts as the machine-readable
  tenant-configuration workspace contract: the fixed section-nav and in-form help posture, the
  staged diff basket, the approval-composer readiness state, the visible blast-radius review, and
  the current-vs-historical config timeline SHALL remain explicit so high-risk settings cannot read
  as committed-on-blur or lose the reviewed `GovernanceMutationBasisContract` before submission.
- **PrincipalAccessView**: tenant_id, shell_family, object_anchor_ref, dominant_question,
  settlement_state, recovery_posture, principal_id, principal_type, effective_role_set[],
  interaction_layer{{ density_profile, inventory_filter_grammar, support_surface_policy,
  diff_basket_policy, export_binding_policy, keyboard_focus_policy,
  selected_filter_chip_refs[], compaction_mode, auxiliary_surface_presentation,
  focus_trap_mode, selection_persistence_mode, preserved_context_codes[],
  feedback_truth_policy }},
  delegation_summaries[], authn_level, approval_capabilities[], run_kind_capabilities[],
  action_matrix[]{ cell_ref, resource_class, action_family, decision, reason_codes[],
  effective_scope[], masking_rules[], required_approvals[], required_authn_level, policy_path_ref,
  authority_chain_layers[]{ layer_code, layer_outcome, reason_codes[] } }, focus_anchor_ref,
  access_workspace{{ surface_order, workspace_mode, active_filters{{ principal_types[],
  principal_states[], role_refs[], delegated_client_refs[], recent_change_owner_refs[] }},
  selected_principal_ref, selected_role_template_ref, selected_cell_ref, grid_navigation_model,
  inspector_state, promoted_support_surface, latest_simulation_ref,
  role_editor_pending_change_refs[] }}, selected_action_detail{{ panel_mode, cell_ref,
  resource_class, action_family, decision, reason_codes[], effective_scope[], masking_rules[],
  required_approvals[], required_authn_level, policy_path_ref,
  authority_chain_layers[]{ layer_code, layer_outcome, reason_codes[] } }} or `null`,
  last_step_up_at, last_modified_at
  `PrincipalAccessView` is the governance access-detail contract. It SHALL preserve the exact
  `AUTHORIZE(...)` decision vocabulary and SHALL never collapse masking, step-up, approval, and deny
  outcomes into a local UI-only permission enum. It additionally acts as the machine-readable access
  workspace contract: the fixed route reading order, current submode, stable directory filters,
  selected principal or role template, selected matrix cell, keyboard focus anchor, mounted
  inspector state, promoted support surface, and ordered authority-chain explanation SHALL remain
  explicit so the route cannot degrade into a generic permission matrix or lose same-shell focus.
- **RoleTemplateMatrix**: artifact_type, tenant_id, shell_family, object_anchor_ref,
  dominant_question, settlement_state, recovery_posture, role_id, role_label,
  policy_snapshot_hash, version_hash, interaction_layer{{ density_profile,
  inventory_filter_grammar, support_surface_policy, diff_basket_policy,
  export_binding_policy, keyboard_focus_policy, selected_filter_chip_refs[],
  compaction_mode, auxiliary_surface_presentation, focus_trap_mode,
  selection_persistence_mode, preserved_context_codes[], feedback_truth_policy }}, focus_anchor_ref,
  role_matrix_workspace{{ surface_order, active_filters{{ resource_classes[], action_families[],
  decision_outcomes[] }}, selected_role_template_ref, selected_cell_ref, grid_navigation_model,
  inspector_state, promoted_support_surface, latest_simulation_ref,
  role_editor_pending_change_refs[] }}, matrix_rows[]{ resource_class, row_label, cell_refs[] },
  matrix_columns[]{ action_family, column_label }, matrix_cells[]{ cell_ref, resource_class,
  action_family, decision, reason_codes[], effective_scope[], masking_rules[],
  required_approvals[], required_authn_level, policy_path_ref, pending_change_ref_or_null },
  selected_action_detail{{ panel_mode, cell_ref, resource_class, action_family, decision,
  reason_codes[], effective_scope[], masking_rules[], required_approvals[],
  required_authn_level, policy_path_ref, pending_change_ref_or_null }} or `null`, captured_at
  `RoleTemplateMatrix` is the governance role-template read contract for
  `/v1/governance/.../roles/{role_id}`. It SHALL preserve the exact policy-snapshot basis,
  versioned role matrix, grouped row/column layout, route-stable filters, mounted selected cell,
  focus anchor, pending role-editor change refs, and latest simulator linkage so inline access-route
  refresh does not discard the selected role cell or the stale-view basis that justified the
  inspector state.
- **GovernanceAccessSimulation**: artifact_type, simulation_id, tenant_id, policy_snapshot_hash,
  principal_context_ref, governance_target_ref, resource_class, action_family, requested_scope[],
  requested_partition_scope_refs[], authorization_decision{{...}},
  authority_chain_layers[]{ layer_code, layer_outcome, reason_codes[] }, simulator_posture,
  mutation_basis_contract{{ basis_contract_hash, policy_snapshot_hash, access_binding_hash,
  dependency_topology_hash, simulation_basis_hash, hazard_contract_hash,
  commit_authority_posture, approval_requirement, bounded_safe_mutation, required_approvals[],
  simulation_confidence_score, predictability_score }} or `null`,
  mutation_hazard{{ hazard_contract_hash, policy_snapshot_hash, access_binding_hash,
  simulation_basis_hash, dependency_topology_hash, count_class_profile_code,
  commit_authority_posture, impact_radius_lower_score, impact_radius_upper_score,
  impacted_principal_count, impacted_principal_count_class, impacted_client_count,
  impacted_client_count_class, impacted_authority_operation_count,
  impacted_authority_operation_count_class, impacted_workflow_count,
  impacted_workflow_count_class, impacted_limitation_count,
  impacted_limitation_count_class, privilege_gain_score, scope_expansion_score,
  masking_relaxation_score, policy_risk_score, approval_necessity_score, approval_requirement,
  bounded_safe_mutation, required_approvals[], simulation_confidence_score, predictability_score,
  risk_driver_codes[], approval_trigger_codes[], confidence_limiter_codes[],
  bounded_safety_blocker_codes[], reason_codes[] }} or `null`,
  simulated_at
  `GovernanceAccessSimulation` is the non-mutating control-plane preview contract for
  `/v1/governance/.../access-simulations`. It SHALL preserve the exact `AuthorizationDecision`
  rendered for the proposed tuple and, when the target is mutation-capable governance scope, the
  frozen topology/simulation basis plus bounded blast-radius, approval, and confidence posture that
  justified the preview. The nested authorization result, ordered `authority_chain_layers[]`, and
  `simulator_posture` SHALL remain explanation-aligned, `mutation_hazard{{...}}` SHALL remain
  hash-aligned and SHALL NOT disagree about bounded-safe or approval posture, and
  `mutation_basis_contract.hazard_contract_hash` SHALL point back to the exact reviewed hazard
  packet later reused by the basket, approval, panel, and command path. Policy risk is derived only
  from privilege gain, scope expansion, masking relaxation, and the blast-radius upper bound; low
  confidence or low predictability SHALL force `commit_authority_posture = PREVIEW_ONLY`.
- **AuthorityLinkInventoryItem**: tenant_id, shell_family, object_anchor_ref, dominant_question,
  settlement_state, recovery_posture, authority_link_id, client_id, authority_scope,
  provider_environment, lifecycle_state, interaction_layer{{ density_profile,
  inventory_filter_grammar, support_surface_policy, diff_basket_policy,
  export_binding_policy, keyboard_focus_policy, selected_filter_chip_refs[],
  compaction_mode, auxiliary_surface_presentation, focus_trap_mode,
  selection_persistence_mode, preserved_context_codes[], feedback_truth_policy }}, binding_health, delegation_state, token_client_binding_state,
  last_validated_at, expires_at, blocked_reason_codes[], focus_anchor_ref,
  authority_link_workspace{{ surface_order, active_filters{{ authority_scopes[], client_refs[],
  provider_environments[], lifecycle_states[], binding_health_states[], expiry_risk_bands[] }},
  selected_authority_link_ref, detail_module_order, guided_flow_mode, promoted_support_surface,
  prominent_issue_ref_or_null }},
  guided_handshake_stepper{{ flow_state, step_order, current_step_code, completed_step_codes[],
  credential_capture_mode, external_handoff_ref_or_null, preflight_blocking_check_refs[] }},
  binding_health_timeline{{ current_binding_health, current_delegation_state,
  current_token_client_binding_state, promoted_issue_ref_or_null, event_refs[],
  next_validation_due_at_or_null }},
  handshake_history{{ attempt_refs[], selected_attempt_ref_or_null, latest_attempt_state,
  latest_failure_ref_or_null }},
  affected_operation_list{{ section_order, preflight_refs[], submission_refs[],
  reconciliation_refs[], amendment_refs[], primary_blocked_operation_ref_or_null }},
  preflight_checklist{{ check_order, checks[]{ check_ref, check_code, check_state, reason_refs[] },
  blocking_check_refs[], last_run_at_or_null }}, affected_operation_counts{{...}},
  externalization_governance_contract{{...}}
  `AuthorityLinkInventoryItem` is the governance authority-edge inventory contract. It SHALL keep
  internal delegation gaps, token/client mismatch, and authority-link lifecycle distinct rather than
  flattening them into one generic health flag. It additionally acts as the machine-readable
  authority-links workspace contract: the fixed route reading order, current guided flow mode,
  selected link, focus anchor, promoted issue state, ordered handshake detail modules, guided
  handshake stepper, binding-health timeline, handshake history, affected-operation drill-down, and
  explicit preflight checklist SHALL remain serialized so the route cannot degrade into a raw
  credential form, generic audit log, or dead-end status table.
- **RetentionGovernanceFrame**: frame_id, tenant_id, shell_family, object_anchor_ref,
  dominant_question, settlement_state, recovery_posture, policy_snapshot_hash, focus_anchor_ref,
  interaction_layer{{ density_profile, inventory_filter_grammar, support_surface_policy,
  diff_basket_policy, export_binding_policy, keyboard_focus_policy,
  selected_filter_chip_refs[], compaction_mode, auxiliary_surface_presentation,
  focus_trap_mode, selection_persistence_mode, preserved_context_codes[],
  feedback_truth_policy }},
  artifact_rows[], legal_hold_count, erasure_queue_count, limitation_count,
  legal_hold_register_ref, erasure_queue_ref, retention_workspace{{ surface_order, workspace_mode,
  active_filters{{ artifact_classes[], retention_classes[], client_refs[], legal_hold_states[],
  release_eligibility_states[], erasure_readiness_states[] }}, selected_policy_row_ref,
  selected_legal_hold_ref, selected_erasure_item_ref, promoted_support_surface, warning_posture }},
  retention_policy_matrix{{ column_order, row_refs[], selected_row_ref, editing_posture,
  sticky_header_mode, inline_blocker_visibility }}, legal_hold_register{{ column_order, hold_refs[],
  selected_hold_ref_or_null, blocking_hold_refs[], release_candidate_hold_refs[],
  release_preview_ref_or_null, release_action_posture }}, erasure_queue{{ section_order,
  eligible_item_refs[], blocked_item_refs[], pending_review_item_refs[], selected_item_ref_or_null,
  destructive_flow_mode, primary_blocker_ref_or_null }}, retention_impact_preview{{ panel_mode,
  preview_subject_ref_or_null, preview_mode, warning_posture, blocked_reason_refs[],
  projected_provenance_limitation_refs[], affected_artifact_count, affected_client_count,
  projected_pseudonymisation_count, action_posture }}, updated_at
  `RetentionGovernanceFrame` is the governance retention read model. It SHALL preserve the comparison
  between statutory baseline, tenant override, effective minimum, and export/limitation posture for
  each governed artifact class. It additionally acts as the machine-readable retention/privacy
  workspace contract: the fixed shell order, explicit mode, route-stable filters, selected matrix
  row / legal hold / erasure candidate, promoted impact preview posture, readable matrix headers,
  visible blocker refs, and staged-only destructive flow semantics SHALL remain serialized so the
  route cannot degrade into a generic settings table, hidden legal-hold queue, or one-click erase
  workflow.
- **AuditInvestigationFrame**: frame_id, tenant_id, shell_family, object_anchor_ref,
  dominant_question, query_contract_code, query_anchor_ref, ordering_basis, settlement_state,
  recovery_posture, interaction_layer{{ density_profile, inventory_filter_grammar,
  support_surface_policy, diff_basket_policy, export_binding_policy,
  keyboard_focus_policy, selected_filter_chip_refs[], compaction_mode,
  auxiliary_surface_presentation, focus_trap_mode, selection_persistence_mode,
  preserved_context_codes[], feedback_truth_policy }}, focus_anchor_ref, ordered_event_refs[], supporting_trace_span_refs[],
  supporting_log_record_refs[], correlation_keys[], integrity_chain_posture,
  export_posture{{...}}, active_filters{{...}},
  audit_workspace{{ surface_order, workspace_mode, active_filters, selected_event_ref,
  selected_object_ref_or_null, promoted_support_surface }},
  audit_tape{{ timeline_mode, rows[]{ event_ref, family_ref, actor_or_service_ref_or_null,
  primary_object_ref_or_null, diff_available }, selected_event_ref }},
  object_neighborhood{{ neighborhood_mode, object_refs[], selected_object_ref_or_null,
  upstream_event_refs[], selected_event_ref, downstream_event_refs[] }},
  event_diff_inspector{{ panel_mode, baseline_event_ref_or_null,
  comparison_event_ref_or_null, summary_ref_or_null, changed_field_refs[],
  raw_payload_posture }}, export_eligibility_panel{{ panel_mode, state, reason_codes[],
  active_slice_scope_ref, masked_preview_ref_or_null, approval_requirement_ref_or_null,
  invocation_posture }}, object_neighborhood_refs[], next_cursor, updated_at
  `AuditInvestigationFrame` is the governance investigation read model. It SHALL keep append-only
  ordering, filter state, export posture, and neighborhood pivots stable across browser reload,
  native hydration, and stream rebase. The frame SHALL make the originating query contract and
  ordering basis explicit so merged timelines and ledgers do not infer order locally from raw wall
  clocks or adjacent telemetry. It SHALL additionally freeze one selected event, one explicit focus
  anchor, the workbench surface order, summary-first diff posture, upstream/downstream neighborhood
  reconstruction, and active-slice export eligibility so the governance audit route cannot degrade
  into a raw-JSON viewer, a detached export panel, or a contextless single-record inspector. It
  SHALL additionally publish `externalization_governance_contract{...}` so masked export, approval
  gating, integrity-limited preview, and audit handoff remain bound to the active filtered slice at
  invocation time.
- **ClientDocumentRequest**: request_id, tenant_id, client_id, manifest_id, category, title, description_ref,
  requested_file_types[], due_at, lifecycle_state, required_count, request_version_ref,
  upload_refs[], latest_upload_ref, current_request_upload_ref_or_null, review_outcome,
  assistance_mode, customer_safe_projection, externalization_governance_contract{{...}}
  `ClientDocumentRequest` is the governed client-document workflow contract. It SHALL preserve request
  category, requested file types, lifecycle posture, the current governed `request_version_ref`,
  chronology of all linked uploads, and the separate current-request-satisfaction pointer without
  exposing internal-only evidence or audit internals in first-view client flows. `latest_upload_ref`
  is history-order lineage only; `current_request_upload_ref_or_null` is the only field that may
  say the current request is presently backed by a current or explicitly reconfirmed upload. Its
  `externalization_governance_contract{...}` SHALL preserve whether the downloadable artifact is
  current-only or current-with-history-explicit, SHALL mirror the active `customer_safe_projection`
  tenant/access/masking/visibility basis, and SHALL block detached or broader download scope.
- **ClientUploadSession**: upload_session_id, tenant_id, client_id, manifest_id, request_id,
  request_version_ref, upload_request_binding_contract, request_binding_state, initiated_by,
  storage_ref, filename, media_type, byte_count, checksum, surface_class, capture_mode,
  bytes_transferred, retry_count, resume_attempt_count, resume_success_count, integrity_state,
  transfer_state, malware_scan_state, validation_state, resumability_state, resume_token_ref,
  attachment_state, attached_document_ref, outcome_reason_code, next_action_code, submitted_at,
  transfer_started_at, last_activity_at, scan_completed_at, validation_completed_at, finalized_at,
  attachment_confirmed_at, reconfirmed_at, state_changed_at, expires_at, upload_confidence_score,
  recovery_posture, dominant_hazard_code
  `ClientUploadSession` is the governed binary-transfer contract for client uploads. It SHALL keep
  transfer, scanner, validation, request-binding, resumability, integrity, and
  attachment-confirmation posture distinct so transfer success is never mistaken for accepted
  attachment completion. The grouped `upload_request_binding_contract` freezes request identity,
  frozen-versus-live request version lineage, duplicate-session prevention, duplicate-file reuse,
  in-flight rebase continuity, stale-completion prohibition, next-action authority, cross-device
  resume reuse, and attachment authority so reconnect or rebase cannot silently move staged bytes
  into a different request meaning. Those distinctions SHALL remain rich enough for the portal read
  side to serialize one explicit documents-route phase ladder, to keep in-flight stale uploads
  resumable until transfer settles, and to keep retry/replacement and stale-history uploads
  separate from the current client-facing artifact target.
- **UploadSessionRecoveryHarness**: contract_version, harness_id, deterministic_seed,
  suite_profile, run_mode, identity_policy, resume_policy, rebase_policy, completion_policy,
  duplicate_policy, recovery_action_policy, cases[]
  `UploadSessionRecoveryHarness` is the deterministic FE-87 recovery proof artifact. It SHALL
  serialize governed pre/post upload snapshots plus request-projection mirrors for mobile
  reconnect, browser reload, stale request rebase, duplicate allocation retry, checksum/scanner
  delay, attachment confirmation, and cross-device continuation so validator and forensic guard
  checks can reject duplicate session/storage creation, frozen-identity drift, silent stale
  rebinding, and premature completion claims.
- **ClientApprovalPack**: approval_pack_id, tenant_id, client_id, manifest_id, title, summary_ref,
  change_highlights_ref, declaration_text_ref, approval_pack_hash, view_guard_ref,
  stale_protection_state, lifecycle_state, requires_step_up, viewed_at,
  change_digest_acknowledged_at, declaration_acknowledged_at, acknowledged_at,
  step_up_verified_at, step_up_expires_at, signed_at, state_changed_at,
  approval_readiness_score, recovery_posture, dominant_hazard_code, supersedes_pack_ref,
  customer_safe_projection, externalization_governance_contract{{...}}
  `ClientApprovalPack` is the client sign-off contract. It SHALL preserve the current
  approval-pack hash, stale-view safety, approval-readiness scoring, and contained step-up posture
  for portal acknowledgement and signing flows. Its `externalization_governance_contract{...}`
  SHALL freeze whether the active target is declaration text or issued receipt, whether inline
  approval or step-up is still required, and whether preview/download/print is currently lawful
  under the same invocation-time tenant/access/masking/visibility basis as the mounted
  `customer_safe_projection`.
- **ClientOnboardingJourney**: journey_id, tenant_id, client_id, lifecycle_state, current_step_code,
  required_steps[], completed_steps[], verification_state, authority_link_requirement,
  authority_link_state, document_request_refs[], help_channel_ref, resume_state, resume_step_code,
  draft_upload_session_refs[], reconfirmation_step_codes[], invited_at, state_changed_at,
  completed_at, completion_summary_ref, completion_timeline_event_ref, expires_at, expired_at,
  abandoned_at, abandonment_reason_code, customer_safe_projection
  `ClientOnboardingJourney` is the guided onboarding contract. It SHALL preserve one-primary-step semantics,
  save-and-return continuity, and completion integrity without degrading into a free-form wizard state bag.
- **ClientTimelineEvent**: event_id, tenant_id, client_id, manifest_id, event_kind, headline, detail_ref,
  occurred_at, visible_to_client, related_object_ref, customer_safe_projection,
  authority_truth_state, authority_truth_contract{{ contract_version, boundary_scope,
  truth_surface_role, surface_specific_binding_policy, authority_confirmation_policy,
  non_confirming_state_policy, normalization_gate_policy, mirror_projection_policy,
  unresolved_projection_policy, override_confirmation_policy, correction_propagation_policy }}
  `ClientTimelineEvent` is the client-visible activity contract. It SHALL keep the timeline in a bounded,
  plain-language event vocabulary suitable for first-view portal rendering and explicit customer-safe
  boundary enforcement. Authority-related timeline copy SHALL remain compatible with
  `authority_truth_state`; pending, unknown, rejected, out-of-band, and corrected authority posture
  SHALL stay explicit instead of being flattened into generic reassurance.
- **PortalHelpRequest**: artifact_type, help_request_id, tenant_id, client_id, manifest_id, item_id,
  request_info_ref, source_focus_anchor_ref, source_route, support_channel, reason_family,
  subject_line, body_ref, case_context_refs[], opened_by_ref, lifecycle_state, opened_at,
  acknowledged_at, response_ref, responded_at, closed_at
  `PortalHelpRequest` is the context-preserving client-help artifact. It SHALL keep route context,
  exact focus-anchor lineage, non-empty `case_context_refs[]`, linked request-for-info lineage, and
  acknowledgement or response timing explicit so portal help does not degrade into unbound
  free-text tickets. Contextual request help SHALL retain `request_info_ref`, general portal help
  SHALL remain anchored to the `HELP` route, and route-specific help reasons SHALL stay aligned
  with the source route they came from.
- **ConfigFreeze**: config_freeze_id, manifest_id, artifact_type, entries[], config_freeze_hash, approval_snapshot_ref,
  schema_bundle_hash, feature_flag_snapshot_hash, config_surface_hash,
  config_completeness_state, config_resolution_basis, source_config_freeze_ref, source_config_freeze_hash,
  source_config_surface_hash, config_consumption_mode,
  materiality_profile_ref, amendment_materiality_profile_ref, retention_profile_ref, provider_contract_profile_ref,
  workflow_policy_ref, override_policy_ref, masking_export_policy_ref, canonicalization_rules_ref,
  connector_mapping_rules_ref, parity_threshold_profile_ref, trust_threshold_profile_ref,
  risk_threshold_profile_ref, evidence_confidence_policy_ref, computation_rules_ref,
  required_config_types_present[]
- **SchemaBundle**: schema_bundle_hash, schema_reader_window_contract{{...}}, entries[], published_at, compatibility_profile_ref
- **SchemaBundleEntry**: schema_id, artifact_type, semantic_version, content_hash, dialect_ref,
  compatibility_class, supersedes_schema_id, writer_min_reader_version, allowed_upgrade_kinds[]
- **SourcePlan**: source_plan_id, manifest_id, source_plan_hash, required_domains[], planned_sources[] where each planned source freezes
  source_domain, source_class, provider_binding_ref, partition_scope_refs[], query_basis_ref,
  cursor_strategy_ref, read_model, late_data_policy_ref, completeness_expectation_ref,
  freshness_slo_ref, required_schema_refs[]
- **SourceWindow**: source_window_id, manifest_id, source_plan_ref, collection_started_at,
  collection_completed_at, read_cutoff_at, source_window_hash, cutoff_enforcement_state,
  post_cutoff_observation_mode
- **CollectionBoundary**: collection_boundary_id, manifest_id, source_plan_ref, source_window_id,
  read_cutoff_at, connector_profile_ref, connector_build_id, collection_boundary_hash,
  boundary_coverage_state, source_boundaries[] where each boundary freezes source_domain,
  source_class, partition_scope_refs[], runtime_scope_refs[], provider_environment_ref,
  provider_api_version, provider_schema_version, cursor_checkpoint_ref, revision_ref,
  request_audit_refs[], page_request_audit_refs[], completeness_expectation_ref,
  late_data_policy_ref, boundary_disposition
- **LateDataPolicyBinding**: binding_id, source_domain, source_class, partition_scope_refs[],
  runtime_scope_refs[], late_data_policy_ref, binding_scope, precedence_rank
- **NormalizationContext**: normalization_context_id, manifest_id, mapping_rules_ref, evidence_rules_ref,
  promotion_rules_ref, normalization_rules_ref, transformation_version_set, normalization_context_hash,
  produced_at
- **SourceRecord**: source_record_id, manifest_id, collection_boundary_ref, source_class, provider,
  provider_account_ref, capture_method, captured_at, effective_period, tenant_id, client_id,
  business_partition, raw_hash, raw_payload_ref, ingestion_run_ref, source_strength_tier, freshness_state,
  retention_tag, erasure_state
- **SourceRecordSet**: set_id, manifest_id, item_identity_hash, set_hash, artifact_contract_hash,
  produced_at, items[]
- **EvidenceItem**: evidence_item_id, manifest_id, source_record_id, evidence_kind, content_ref,
  extraction_method, extraction_confidence, source_strength_tier, freshness_state, lineage_refs[],
  retention_tag, erasure_state, business_partition, period_partition
- **EvidenceItemSet**: set_id, manifest_id, item_identity_hash, set_hash, artifact_contract_hash,
  produced_at, items[]
- **CandidateFact**: candidate_fact_id, manifest_id, fact_family, value_payload_ref, confidence,
  source_strength_tier, promotion_state, collection_boundary_ref, normalization_context_ref,
  source_record_refs[], source_record_lineage_hash, supporting_evidence_refs[], evidence_lineage_hash,
  partition_scope, partition_scope_refs[], partition_isolation_state, visibility_basis,
  candidate_identity_hash, dedupe_key, conflict_membership_refs[], promotion_readiness{{...}},
  adjustment_binding{{ applicable_reporting_scopes[], quarterly_basis_profile, time_window_basis,
  window_start_date_or_null, window_end_date_or_null, partition_application, analysis_mode_treatment }}
- **CandidateFactSet**: set_id, manifest_id, item_identity_hash, set_hash, artifact_contract_hash,
  produced_at, items[]
- **ConflictRecord**: conflict_id, manifest_id, conflict_type, involved_fact_refs[], severity, reason_codes[],
  blocking_class, resolution_state
- **ConflictSet**: set_id, manifest_id, item_identity_hash, unresolved_conflict_hash, set_hash,
  artifact_contract_hash, normalization_context_ref, conflict_detection_policy_ref,
  business_partition_refs[], items[], open_conflict_ids[], blocking_conflict_ids[],
  resolution_frontier, open_conflict_count, blocking_conflict_count, dominant_blocking_class,
  produced_at
- **CanonicalFact**: canonical_fact_id, manifest_id, fact_family, value_payload_ref, promotion_state,
  source_strength_tier, freshness_state, collection_boundary_ref, normalization_context_ref,
  source_record_refs[], source_record_lineage_hash, supporting_evidence_refs[], evidence_lineage_hash,
  retention_tag, erasure_state, partition_scope, partition_scope_refs[], partition_isolation_state,
  visibility_basis, promoted_from_candidate_fact_refs[], canonical_identity_hash, dedupe_key,
  conflict_membership_refs[], promotion_record{{...}}, adjustment_binding{{ applicable_reporting_scopes[],
  quarterly_basis_profile, time_window_basis, window_start_date_or_null, window_end_date_or_null,
  partition_application, analysis_mode_treatment }}
- **CanonicalFactSet**: set_id, manifest_id, item_identity_hash, set_hash, artifact_contract_hash,
  produced_at, items[]
- **LateDataIndicator**: artifact_type, indicator_id, manifest_id, collection_boundary_ref,
  source_plan_ref, binding_ref, source_domain, source_class, partition_scope_refs[],
  runtime_scope_refs[], indicator_type, detection_basis, late_data_policy_ref, severity,
  temporal_classification_contract{{ classification_profile_code, temporal_classification,
  temporal_certainty_state, legal_effect_basis, baseline_scope_class,
  filing_critical_baseline_touch, t_cutoff, t_effective_or_null, t_visible_or_null, t_discovered,
  retroactive_impact_required, trust_invalidation_required, proof_staleness_required,
  amendment_reuse_invalidated, replay_lineage_policy, reason_codes[] }},
  discovered_at, request_audit_ref, source_record_ref, evidence_ref, indicator_hash, reason_codes[]
- **LateDataIndicatorSet**: set_id, manifest_id, artifact_type, collection_boundary_ref,
  source_plan_ref, runtime_scope_refs[], item_identity_hash, set_hash, artifact_contract_hash,
  produced_at, items[]
- **LateDataFinding**: artifact_type, finding_id, manifest_id, indicator_refs[], binding_ref,
  source_domain, source_class, partition_scope_refs[], runtime_scope_refs[], late_data_policy_ref,
  severity, temporal_classification_contract{{...}}, finding_state, active_manifest_effect,
  child_manifest_ref, workflow_item_ref, superseded_by_finding_ref, discovered_at, resolved_at,
  reason_codes[]
- **LateDataMonitorResult**: artifact_type, late_data_monitor_id, manifest_id, manifest_hash,
  execution_basis_hash,
  collection_boundary_ref, source_window_ref, input_freeze_ref, runtime_scope_refs[],
  latest_indicator_set_ref, finding_refs[], late_data_status, total_finding_count, excluded_count,
  review_required_count, child_manifest_required_count,
  temporal_consequence_summary{{ summary_profile_code, true_post_baseline_event_count,
  pre_cutoff_preexisting_late_arrival_count, post_cutoff_discovery_pre_baseline_fact_count,
  authority_posting_lag_count, temporally_unproved_count, highest_legal_consequence,
  retroactive_impact_required, trust_invalidation_required, proof_staleness_required,
  amendment_reuse_invalidated, blocking_temporal_uncertainty_present, replay_lineage_policy,
  reason_codes[] }}, child_manifest_refs[], workflow_item_refs[], classified_at, reason_codes[]
- **LateDataRetroactiveImpactSimulationBasisContract**: contract_version, basis_contract_hash,
  execution_mode_boundary_hash, source_manifest_id, source_manifest_hash,
  source_execution_basis_hash, source_collection_boundary_ref, source_source_window_ref,
  source_input_freeze_ref, source_cutoff_at, source_baseline_envelope_ref,
  source_baseline_effective_at, source_active_exact_scope_key, covered_scope_refs[],
  covered_submission_refs[], source_late_data_policy_refs[], source_late_data_monitor_ref,
  source_late_data_finding_refs[], source_temporal_propagation_event_refs[],
  source_retroactive_impact_ref_or_null, source_filing_case_ref_or_null,
  source_proof_bundle_refs[], source_evidence_graph_ref_or_null, required_temporal_classes[],
  required_outcome_classes[], truth_source_policy, historical_reuse_policy,
  scope_widening_policy, trust_invalidation_policy, proof_staleness_policy,
  historical_mutation_policy, simulation_case_policy
- **LateDataRetroactiveImpactSimulation**: artifact_type, simulation_id,
  execution_mode_boundary_contract{{...}}, basis_contract{{...}}, scenario_results[]{{
  scenario_case_code, t_effective_or_null, t_visible_or_null, t_discovered,
  baseline_scope_class, filing_critical_baseline_touch, decisive_proof_path_touch,
  legal_effect_basis, temporal_certainty_state, late_data_status, highest_legal_consequence,
  bounded_retroactivity_class, replay_requirement, restatement_required, impacted_scope_refs[],
  impacted_submission_refs[], restatement_scope_refs[], trust_currency_state, proof_effect,
  amendment_effect, historical_position_handling, simulation_outcome_class, reason_codes[] }},
  current_only_count, explanation_only_count, amendment_triggering_count,
  replay_triggering_count, review_blocked_count, simulated_by_principal_ref, simulated_at,
  simulation_hash
- **InputFreeze**: input_freeze_id, manifest_id, artifact_type, source_plan_ref, source_plan_hash,
  collection_boundary_ref, collection_boundary_hash, input_policy_ref, source_window_ref,
  source_window_hash, read_cutoff_at, provider_environment_refs[], provider_api_versions[],
  provider_schema_versions[], connector_profile_ref, connector_build_id, cursor_checkpoint_refs[],
  request_audit_refs[], late_data_policy_bindings[], source_record_refs[], evidence_item_refs[],
  candidate_fact_refs[], canonical_fact_refs[], conflict_refs[], open_conflict_count,
  blocking_conflict_count, resolution_frontier, dominant_blocking_class, exclusion_refs[],
  no_data_confirmed_declarations[], missing_source_declarations[], stale_source_declarations[],
  source_domain_postures[] where each posture freezes source_domain, source_class,
  partition_scope_refs[], runtime_scope_refs[], boundary_disposition, late_data_policy_ref, and
  per-artifact counts, normalization_context_ref, normalization_context_hash,
  artifact_contract_refs[], artifact_contract_hash, input_set_hash, input_consumption_mode,
  late_data_adoption_policy, contract
  `LateDataPolicyBinding`, `LateDataIndicator`, `LateDataIndicatorSet`, `LateDataFinding`, and
  `LateDataMonitorResult` are the schema-backed late-data control objects. The replay-safe
  counterfactual analysis artifacts `LateDataRetroactiveImpactSimulationBasisContract` and
  `LateDataRetroactiveImpactSimulation` extend that same late-data control plane. They SHALL validate
  against `schemas/late_data_policy_binding.schema.json`, `schemas/late_data_indicator.schema.json`,
  `schemas/late_data_indicator_set.schema.json`, `schemas/late_data_finding.schema.json`, and
  `schemas/late_data_monitor_result.schema.json`, together with
  `schemas/late_data_retroactive_impact_simulation_basis_contract.schema.json` and
  `schemas/late_data_retroactive_impact_simulation.schema.json`, so post-cutoff discovery,
  temporal meaning, downstream invalidation, replay-safe historical simulation, and gate-visible
  late-data status remain durable instead of being recomputed from raw connector drift.
  `SourcePlan`, `SourceWindow`, `CollectionBoundary`, `SourceRecord`, `EvidenceItem`,
  `CandidateFact`, `ConflictSet`, `CanonicalFact`, and `InputFreeze` form the schema-backed
  intake-boundary family. They SHALL preserve explicit required-domain coverage, non-null evidence
  and promotion lineage, explicit exclusion/confirmed-no-data/missing/stale declarations, explicit
  per-domain intake posture, and the frozen artifact-contract set used to validate the pre-seal
  intake pack so source omissions and support-free facts never pass as implicit assumptions.
- **AuthorityOperation**: artifact_type, operation_id, tenant_id, client_id, manifest_id, manifest_hash,
  execution_basis_hash,
  attempt_lineage_manifest_id, operation_family, authority_name, authority_product_profile,
  operation_profile_ref, provider_environment, provider_api_version, authority_scope,
  requested_scope[], runtime_scope[], scope_execution_binding{{...}}, access_binding_hash,
  policy_snapshot_hash, authority_binding_ref, authority_link_ref, delegation_grant_ref,
  binding_lineage_ref, token_binding_ref, subject_ref, acting_party_ref, business_partitions[],
  period, target_obligation_ref, basis_type, authority_layer_boundary{{...}}, contract
  `AuthorityOperation` is the frozen intent contract for one external authority exchange. It SHALL
  keep the canonical ordered executable scope, the authoritative raw-versus-executable
  `scope_execution_binding{...}`, manifest-bound hash identity, frozen authority-binding lineage,
  and business partitions
  that feed duplicate lookup, request hashing, and reconciliation identity instead of letting later
  transport code reconstruct them from packet or route context. Its
  `authority_layer_boundary{...}` SHALL make tenant permission, delegation, authority-link
  readiness, and any human-gate evidence explicit before queued or retried authority work can move.
- **AuthorityBinding**: artifact_type, authority_binding_id, tenant_id, client_id, manifest_id,
  principal_context_ref, authorization_decision_ref, authority_link_ref, delegation_grant_ref,
  delegation_state, authority_link_state, partition_scope_refs[], token_binding_ref,
  binding_lineage_ref, token_version_ref, subject_ref, acting_party_ref, authority_scope,
  provider_environment, provider_api_version, access_binding_hash, policy_snapshot_hash,
  token_client_binding_state, binding_health, last_validated_at, expires_at,
  blocked_reason_codes[], authority_layer_boundary{{...}}, step_up_state, step_up_evidence_ref,
  approval_state, approval_ref, binding_resolved_at
  `AuthorityBinding` is the sealed executable authority edge for one live operation. It SHALL keep
  principal-context and authorization lineage explicit, preserve typed `delegation_state` and
  `authority_link_state` alongside `binding_health`, keep partition and blocked-reason arrays
  canonical, require `token_client_binding_state = BOUND` for healthy or expiring bindings, require
  `MISMATCH` for client-binding mismatch health, preserve explicit expiry posture for expiring or
  expired bindings, and keep delegated acting context bound to `delegation_grant_ref`. The sealed
  `token_version_ref` is the preflight-selected anchor; if send-time revalidation later accepts
  lawful token rotation within the same `binding_lineage_ref`, that concrete send-authorized token
  version SHALL be preserved on `AuthorityInteractionRecord` rather than by mutating the binding.
- **AuthorityRequestEnvelope**: artifact_type, request_id, tenant_id, client_id, manifest_id, manifest_hash,
  request_identity_contract{{ contract_version, binding_scope_class, request_id, tenant_id, client_id,
  manifest_id, manifest_hash, execution_basis_hash, attempt_lineage_manifest_id, operation_id,
  authority_name, authority_product_profile, provider_environment, authority_scope,
  operation_family, operation_profile, provider_api_version, http_method, canonical_path,
  canonical_query, header_profile_refs[], identity_profile_version, identity_namespace_hash,
  normalized_obligation_ref, normalized_basis_type, obligation_ref_or_null, basis_type_or_null,
  request_body_hash, duplicate_meaning_key, request_hash, idempotency_key, access_binding_hash,
  policy_snapshot_hash, authority_binding_ref, authority_link_ref, delegation_grant_ref_or_null,
  subject_ref, acting_party_ref, token_binding_ref, binding_lineage_ref, business_partition_refs[] }},
  execution_basis_hash,
  attempt_lineage_manifest_id, operation_id, authority_name, authority_product_profile,
  provider_environment, authority_scope, operation_family, operation_profile, provider_api_version,
  http_method, resource_template, resolved_path_params{{...}}, query_params{{...}},
  canonical_path, canonical_query, identity_profile_version, identity_namespace_hash,
  normalized_obligation_ref, normalized_basis_type, duplicate_meaning_key, header_profile_refs[],
  request_body_hash, payload_ref,
  access_binding_hash, policy_snapshot_hash, authority_binding_ref, authority_link_ref,
  delegation_grant_ref, authority_layer_boundary{{...}}, subject_ref, acting_party_ref,
  token_binding_ref, binding_lineage_ref, business_partition_refs[], obligation_ref, basis_type,
  idempotency_key, request_hash, fraud_header_profile_ref,
  fraud_header_capture_ref, fraud_header_validation_ref, fraud_header_exemption_reason,
  transmit_policy_ref
  `AuthorityRequestEnvelope` is the sealed request identity. It SHALL preserve canonically ordered
  header-profile and partition arrays, sealed manifest-bound hash identity, frozen authority-binding
  lineage, explicit normalized obligation/basis sentinels, a collision-blocking
  `identity_namespace_hash`, a resend-vs-reconcile `duplicate_meaning_key`, and the `<NONE>`
  null-body sentinel so replay, dedupe, and collision detection do not depend on caller
  reconstruction. Its grouped `request_identity_contract{...}` is the byte-stable request-identity
  spine reused by `AuthorityInteractionRecord` and request-backed `SubmissionRecord` so downstream
  recovery or reconciliation does not rebuild request identity from adjacent `AuthorityOperation` or
  `AuthorityBinding` artifacts. Its `authority_layer_boundary{...}` SHALL prove that delegation,
  authority-link, human-gate, and truth-precedence boundaries were already frozen before transport.
- **AuthorityResponseEnvelope**: response_id, request_id, received_at, provider_received_at, http_status,
  response_headers_ref, response_body_ref, response_body_hash, authority_reference, response_source,
  provider_delivery_ref, inbox_receipt_ref, ingress_receipt_ref,
  authority_ingress_proof_contract{{...}}, derivation_posture,
  legal_effect_posture, supersedes_response_id, corroborates_response_ids[],
  conflicting_response_ids[], recovery_basis_response_id, correlation_status, response_class,
  retry_class
  `AuthorityResponseEnvelope` is the normalized provider-response contract. It SHALL distinguish
  inline versus ingress-driven delivery, preserve response chronology, and keep timeout/no-body and
  ambiguous-correlation posture explicit rather than allowing synthetic success interpretation.
  Asynchronous response envelopes SHALL therefore retain the canonical `ingress_receipt_ref` that
  proves the durable ingress checkpoint preceding normalization together with one
  `authority_ingress_proof_contract{...}` proving authenticated channel evidence and exact
  lineage-binding basis; `INLINE_HTTP` and `TRANSPORT_TIMEOUT` responses SHALL keep that proof
  contract null. The envelope also SHALL preserve multi-source derivation posture so timeout
  placeholders, corroborating callbacks, conflicting callback-versus-poll observations, and
  recovery reads derived from an earlier unresolved response do not collapse into one unlabeled
  “current response.”
- **AuthorityIngressReceipt**: artifact_type, ingress_receipt_id, provider_environment,
  provider_profile_ref, ingress_channel_class, provider_delivery_ref, response_body_ref, response_body_hash,
  ingress_channel_metadata_hash, delivery_dedupe_key, authority_reference, request_hash,
  idempotency_key, identity_namespace_hash, duplicate_meaning_key, bound_interaction_ref, correlation_status,
  authenticated_channel_state, receipt_state, received_at, persisted_at, quarantined_at,
  quarantine_reason_codes[], canonical_ingress_receipt_ref, reconciliation_owner_ref,
  normalized_response_ref, audit_event_refs[], authority_ingress_proof_contract{{...}},
  authority_ingress_correlation_contract{{ contract_version, bound_artifact_type,
  correlation_status, lineage_binding_basis, comparison_set_state, resolution_state,
  extracted_authority_reference_or_null, extracted_request_hash_or_null,
  extracted_idempotency_key_or_null, extracted_identity_namespace_hash_or_null,
  extracted_duplicate_meaning_key_or_null, candidate_lineages[], correlation_reason_codes[],
  request_lineage_comparison_policy, legal_mutation_policy }},
  authority_truth_contract{{ contract_version,
  boundary_scope, truth_surface_role, surface_specific_binding_policy,
  authority_confirmation_policy, non_confirming_state_policy, normalization_gate_policy,
  mirror_projection_policy, unresolved_projection_policy, override_confirmation_policy,
  correction_propagation_policy }}
- **AuthorityIngressInvestigationSnapshot**: artifact_type, investigation_id, ingress_receipt_ref,
  provider_environment, provider_profile_ref, ingress_channel_class, receipt_state,
  correlation_status, authenticated_channel_state, response_body_ref, response_body_hash,
  delivery_dedupe_key, authority_reference_or_null, bound_interaction_ref_or_null,
  normalized_response_ref_or_null, authority_ingress_proof_contract{{...}},
  authority_ingress_correlation_contract{{...}}, delivery_lineage{{...}},
  quarantine_explainability{{...}}, safe_next_action_codes[], investigation_source_policy,
  legal_mutation_policy, updated_at
- **AuthorityInteractionRecord**: interaction_id, manifest_id, operation_id, request_id,
  authority_operation_profile_ref,
  request_hash, idempotency_key, identity_namespace_hash, duplicate_meaning_key,
  request_identity_contract{{...}}, authority_ingress_proof_contract{{...}},
  reconciliation_control_contract{{...}},
  authority_binding_ref, authority_link_ref, binding_lineage_ref, access_binding_hash,
  policy_snapshot_hash, truth_boundary_contract{{ contract_version, artifact_role,
  authoritative_source_policy, projection_input_policy, durable_writeback_policy,
  recovery_basis_policy, authoritative_record_families[], observable_projection_families[] }},
  authority_truth_contract{{ contract_version, boundary_scope, truth_surface_role,
  surface_specific_binding_policy, authority_confirmation_policy, non_confirming_state_policy,
  normalization_gate_policy, mirror_projection_policy, unresolved_projection_policy,
  override_confirmation_policy, correction_propagation_policy }},
  binding_drift_sentinel_contract{{ contract_version, binding_scope_class, sentinel_contract_hash,
  binding_verification_policy, duplicate_truth_policy, lineage_reuse_policy,
  checked_action_class, decision_state, checked_at, tenant_id, client_id, authority_binding_ref,
  authority_link_ref, delegation_grant_ref_or_null, binding_lineage_ref, sealed_token_version_ref,
  checked_token_version_ref_or_null, subject_ref, acting_party_ref, authority_scope,
  provider_environment, provider_api_version, access_binding_hash, policy_snapshot_hash,
  duplicate_meaning_key, duplicate_truth_inputs_state, latest_submission_record_ref_or_null,
  latest_obligation_mirror_ref_or_null, latest_ingress_receipt_ref_or_null,
  exclusive_send_claim_state, pass_reason_code_or_null, block_reason_codes[] }},
  lifecycle_state, created_at, last_status_at, active_response_id,
  response_history_ids[], meaning_resolution_state, submission_record_ref, dispatch_ref, send_revalidation_state, send_revalidated_at,
  send_authorized_token_version_ref, send_revalidation_reason_codes[], reconciliation_method,
  max_auto_reconciliation_attempts, reconciliation_cadence_seconds, reconciliation_budget_state,
  next_reconciliation_at, reconciliation_attempt_count, reconciliation_deadline_at,
  reconciliation_escalated_at, reconciliation_workflow_item_ref, resend_legality_state,
  resend_control_reason_codes[], audit_refs[], provenance_refs[], resolution_basis,
  abandonment_reason_code
  `AuthorityOperation`, `AuthorityBinding`, `AuthorityRequestEnvelope`, `AuthorityResponseEnvelope`,
  `AuthorityIngressReceipt`, and `AuthorityInteractionRecord` are the sealed authority-exchange
  control contracts. They SHALL preserve frozen operation-profile lineage, binding lineage,
  access/policy binding identity, canonical request identity, duplicate-meaning identity,
  authenticated ingress posture, mandatory send-time revalidation outcome, and explicit resolution
  or abandonment basis rather than leaving those dimensions to transport-specific side tables or
  prose-only interpretation. Bound or normalized ingress receipts SHALL therefore retain the
  correlated `authority_reference`, `request_hash`, `idempotency_key`, `identity_namespace_hash`,
  `duplicate_meaning_key`, `bound_interaction_ref`, persisted `response_body_ref`, audit-event
  lineage, and one `authority_ingress_correlation_contract{...}` explaining what request-lineage
  candidates were compared and why the receipt remained bound, weak-bound, ambiguous, or unbound; weak
  `BOUND_WITH_AUTHORITY_REFERENCE_ONLY` ingress SHALL remain quarantine-owned rather than being
  treated as a normal success path; duplicate-suppressed ingress SHALL point to
  `canonical_ingress_receipt_ref` instead of generating a second normalized response; and
  quarantine timestamps or reason codes remain exclusive to `receipt_state = QUARANTINED`, where
  `reconciliation_owner_ref` is mandatory. `AuthorityInteractionRecord.active_response_id` SHALL
  mean the current legally admissible response meaning rather than the last source event seen, every
  normalized observation SHALL remain in `response_history_ids[]`, and
  `meaning_resolution_state` SHALL distinguish direct, corroborated, provisional-timeout, and
  reconciliation-required postures so downstream state machines do not infer transport precedence
  heuristically. `request_identity_contract{...}` SHALL stay byte-identical to the sealed request
  identity so transmit recovery and later ingress correlation do not rebuild that spine from the
  operation, binding, and envelope separately. When the interaction has an active non-timeout
  authority response, its `authority_ingress_proof_contract{...}` SHALL mirror the persisted ingress
  proof packet backing that current admissible meaning. `binding_drift_sentinel_contract{...}` SHALL
  be the reusable grouped pre-network safety boundary for transmit, reconciliation poll, and
  recovery read; it SHALL preserve the exact sealed-vs-checked token lineage, duplicate or
  stronger-truth consultation state, and transmit-claim ownership where applicable. `send_revalidation_state` SHALL distinguish queued-not-yet-checked,
  cleared-to-send, and blocked-before-send posture; `send_authorized_token_version_ref` SHALL prove
  the concrete send-authorized token version; and the FE-50 `authority_truth_contract{...}` SHALL
  keep ingress checkpoint truth, active response meaning, and later settlement truth distinct so
  runtime exchange memory cannot itself confirm legal state.
  `AuthorityIngressInvestigationSnapshot` is the read-side companion for quarantined or
  duplicate-suppressed ingress: it SHALL surface only persisted payload, auth evidence, candidate
  comparison, duplicate lineage, audit context, and non-mutating next actions, and it SHALL never
  act as a legal-state mutation object.
  whether the gateway reused the sealed token version or accepted lawful within-lineage rotation;
  and `send_revalidation_reason_codes[]` SHALL preserve either the single lawful pass reason or the
  explicit fail-closed block reasons for a stale, rebound, or duplicate send attempt.
  `reconciliation_method`, `max_auto_reconciliation_attempts`, and
  `reconciliation_cadence_seconds` SHALL freeze the profile-derived automatic follow-up budget on the
  interaction itself so recovery, continuation, or queue rebuild never re-read a newer profile and
  silently reset the budget. `reconciliation_budget_state`, `next_reconciliation_at`,
  `reconciliation_escalated_at`, `reconciliation_workflow_item_ref`, `resend_legality_state`, and
  `resend_control_reason_codes[]` SHALL therefore persist whether the exchange is still inside a
  bounded read-only reconciliation window, limited to idempotent recovery of an already-sent packet,
  blocked by exhausted or contradictory authority truth, escalated to operator ownership, or closed
  against any further resend under the same interaction lineage. The grouped
  `reconciliation_control_contract{...}` SHALL freeze that same budget, unresolved, resend, replay,
  escalation, and analytics posture in one hashed packet so unresolved `SubmissionRecord`,
  unresolved `ObligationMirror`, restore/replay flows, and tuning snapshots do not recompute it from
  runtime columns or retry logs.
- **AuthorityReconciliationAnalyticsSnapshot**: artifact_type, snapshot_id,
  authority_operation_profile_ref, provider_environment, operation_family, window_started_at,
  window_ended_at, interaction_refs[], total_interaction_count, budget_state_counts[],
  outcome_class_counts[], resend_refusal_reason_counts[], escalation_reason_counts[],
  unresolved_ambiguity_count, deadline_expiry_count, escalated_count,
  blind_resend_blocked_count, replay_resume_count, average_attempts_consumed,
  max_attempts_consumed, escalation_latency_seconds_p95_or_null,
  tuning_recommendation_codes[], source_policy, generated_at
  `AuthorityReconciliationAnalyticsSnapshot` is the replay-safe tuning and escalation rollup for one
  authority operation profile. It SHALL derive only from persisted
  `reconciliation_control_contract{...}` packets and referenced interaction lineage so budget
  exhaustion, resend refusal, escalation latency, and replay-resume counts remain auditable without
  promoting transport retry logs or worker-local timer state into source-of-truth.
- **RetentionTag**: artifact_type, retention_tag_id, retention_class, anchor_event, anchor_timestamp,
  minimum_expiry_at, policy_expiry_at, effective_expiry_at, legal_hold_state, legal_hold_ref,
  legal_hold_changed_at, erasure_eligibility, erasure_decided_at, erasure_reason_codes[],
  pseudonymisation_mode, limitation_behavior, limitation_reason_codes[], retention_basis_ref,
  proof_preservation_basis_ref, authority_ambiguity_ref
  `RetentionTag` is the canonical persisted retention/privacy tag. It SHALL carry the full expiry,
  legal-hold lineage, erasure-decision basis, limitation semantics, and proof or ambiguity blockers
  for an authoritative or evidence-bearing object. `anchor_timestamp` SHALL remain the earliest
  retention-control timestamp, legal-hold refs SHALL never appear under `legal_hold_state = NONE`,
  and proof-preservation or authority-ambiguity refs SHALL stay aligned with the matching blocked
  `erasure_eligibility`.
- **Snapshot**: snapshot_id, manifest_id, artifact_type, execution_mode, analysis_only,
  non_compliance_config_refs[], counterfactual_basis, lifecycle_state,
  state_transition_contract{{...}}, source_record_set_ref, source_record_set_hash,
  evidence_item_set_ref, evidence_item_set_hash, candidate_fact_set_ref, candidate_fact_set_hash,
  canonical_fact_set_ref, canonical_fact_set_hash, conflict_set_ref, conflict_set_hash,
  quality{{...}}, completeness{{...}}, superseded_by_snapshot_id_or_null,
  retention_limitation_ref_or_null, erasure_proof_ref_or_null, state_changed_at, created_at,
  audit_refs[], provenance_refs[], contract
  `Snapshot` SHALL validate against `schemas/snapshot.schema.json` so the persisted `BUILT` state,
  validation outcome, supersession lineage, retention limitation, erasure proof, and transition
  audit evidence remain machine-bound instead of being inferred from downstream artifacts.
- **ComputeResult**: compute_id, manifest_id, artifact_type, execution_mode, analysis_only,
  non_compliance_config_refs[], counterfactual_basis, lifecycle_state, rule_version_ref,
  reporting_scope, effective_partition_scope_refs[], basis_profile_ref_or_null,
  quarterly_basis_profile_or_null, adjustment_inclusion_policy, adjustment_scope_source,
  money_profile{{...}}, totals{{...}}, assumptions{{...}}, diagnostic_reason_codes[],
  diagnostic_artifact_refs[], computed_at, contract
- **ForecastSet**: forecast_id, manifest_id, artifact_type, execution_mode, analysis_only,
  non_compliance_config_refs[], counterfactual_basis, forecast_profile_ref, baseline_compute_ref,
  money_profile{{...}}, scenario_mode, point_forecasts[], scenarios[], seeds[], created_at, contract
- **RiskReport**: risk_id, manifest_id, artifact_type, execution_mode, analysis_only,
  non_compliance_config_refs[], counterfactual_basis, risk_threshold_profile_ref, risk_score,
  feature_scores[], flags[], unresolved_material_blocking_risk_flag,
  unresolved_blocking_risk_flag, created_at, contract
- **ParityResult**: parity_id, manifest_id, artifact_type, execution_mode, analysis_only,
  non_compliance_config_refs[], counterfactual_basis, lifecycle_state, comparison_basis_ref,
  comparison_requirement, parity_threshold_profile_ref, comparison_set_state, ordered_field_codes[],
  money_profile{{...}}, parity_classification, parity_score, comparison_coverage,
  weighted_parity_pressure, critical_blocking_field_count, critical_material_field_count,
  dominant_reason_code, reason_codes[], deltas{{...}}, cause_hypotheses[], evaluated_at, contract
  `ParityResult` SHALL persist the frozen threshold profile, one explicit comparison-set validity
  state, the deterministic field order, the decisive top-level reason ordering, and the per-field
  threshold/floor inputs used to derive breach ratios so parity classification stays replay-safe at
  edge thresholds and cannot be reinterpreted from local rounding behavior.
- **GateDecisionRecord**: artifact_type, gate_decision_id, manifest_id, gate_code, gate_stage_index,
  gate_class, decision, severity, gate_semantics_contract{{ contract_version,
  evaluation_order_profile_code, reason_order_profile_code, severity_profile_code, decision_rank,
  progression_rank, blocking_class, progression_semantics, override_dependency_state }},
  reason_codes[], dominant_reason_code, plain_explanation, decision_explainability_contract{{...}},
  metrics{{...}}, decision_basis_ref, input_artifact_refs[], prerequisite_gate_refs[],
  blocking_dependency_refs[], overrideability, override_resolution_state, active_override_refs[],
  required_override_scope, next_action_codes[], policy_version_ref, decided_at, effective_scope[]
  `ComputeResult`, `ForecastSet`, `RiskReport`, `ParityResult`, and `GateDecisionRecord` are the
  sealed decision-layer artifacts. They SHALL preserve execution context, calibrated scoring basis,
  parity meaning, ordered gate lineage, canonical execution scope, gate override posture, and
  operator-visible explanation fields as first-class contracts rather than as module-local
  conventions or loose maps. `dominant_reason_code` SHALL identify the first emitted reason from the
  decisive decision family, `severity` SHALL remain the deterministic projection of `decision`, and
  `gate_semantics_contract{...}` SHALL freeze the monotone progression rank and whether the current
  pass/review posture was override-independent or valid-override-governed, while
  `decision_explainability_contract{...}` SHALL freeze the compressed summary prefix,
  suppressed-reason tail count, semantic qualifiers, and action-projection posture needed by
  downstream read surfaces, and
  `override_resolution_state = NO_VALID_OVERRIDE` SHALL remain reserved for
  `decision = OVERRIDABLE_BLOCK` rather than leaking into pass, notice, or review records.
- **TrustSummary**: trust_id, manifest_id, execution_mode, analysis_only, lifecycle_state,
  compute_result_ref, parity_result_ref, risk_report_ref, evidence_graph_ref, gate_decision_refs[],
  comparison_requirement, parity_classification, baseline_submission_state,
  live_authority_progression_requested, completeness_score, data_quality_score, parity_score,
  graph_quality_score, risk_score, trust_core_score, score_band, cap_band, trust_band,
  trust_score, trust_input_state, trust_input_basis_contract{contract_version, basis_contract_hash,
  input_presence_state, manifest_binding_state, lifecycle_binding_state, consistency_state,
  limitation_semantics_state, freshness_state, freshness_dependency_classes[],
  authority_progression_state, baseline_progression_state,
  baseline_selection_contract_hash_or_null, baseline_automation_ceiling,
  baseline_limitation_reason_codes[], late_data_invalidation_state, override_dependency_state,
  human_step_state, trust_input_state, automation_ceiling, filing_readiness_ceiling,
  input_reason_codes[], blocking_dependency_refs[], trust_fresh_until},
  trust_sensitivity_analysis_contract{contract_version, sensitivity_contract_hash,
  trust_input_basis_contract_hash, execution_mode_boundary_hash, score_cap_alignment_state,
  cap_driver_reason_codes[], edge_trigger_codes[], trust_green_margin, trust_amber_margin,
  risk_automation_margin, completeness_margin, graph_filing_margin_or_null,
  authority_review_margin_or_null, authority_block_margin_or_null, projected_case_results[]},
  threshold_stability_state, upstream_gate_cap,
  trust_green_margin, trust_amber_margin, risk_automation_margin,
  active_filing_critical_override_count, critical_retention_limited_count, override_penalty,
  retention_penalty, authority_uncertainty_score, authority_penalty, trust_level,
  automation_level, filing_readiness, dominant_reason_code, plain_summary,
  decision_explainability_contract{{...}},
  decision_constraint_codes[], required_human_steps[], reason_codes[], blocking_dependency_refs[],
  support_refs[],
  trust_fresh_until, synthesized_at, superseded_at, superseded_by_trust_id
  `TrustSummary` SHALL persist the frozen trust reason order itself rather than relying on
  recomputation: `dominant_reason_code` SHALL identify the first emitted decisive reason,
  `decision_constraint_codes[]` SHALL remain a non-dominant subset of `reason_codes[]`,
  `decision_explainability_contract{...}` SHALL freeze the compressed trust summary reason prefix,
  suppressed reason tail count, and any required authority/limitation/override qualifiers,
  `decision_constraint_codes[]` SHALL be empty when `trust_level = READY`, and
  `score_band`, `cap_band`, `upstream_gate_cap`, `trust_input_basis_contract`,
  `trust_sensitivity_analysis_contract`, and `blocking_dependency_refs[]` SHALL preserve the exact
  progression ceiling, threshold fragility, cap explanation, and dependency basis that limited or
  blocked automation.
- **ProvenanceNode**: node_id, graph_id, graph_address, manifest_id, tenant_id, client_id,
  business_partition, period_scope, node_class, node_family, object_ref, created_at,
  tombstone_state, limitation_codes[]
  Filing-proof capable graphs SHALL additionally support node families such as `EN_FILING_FIELD`,
  `EN_PROOF_BUNDLE`, `AC_VALIDATE_GRAPH`, `AC_RECONSTRUCT_PROOF`, and
  `AC_RENDER_EXPLANATION` so filing artifacts, proof reconstruction work, and reviewer-visible
  explanation steps are first-class graph objects rather than implicit viewer behavior.
- **ProvenanceEdge**: edge_id, graph_id, manifest_id, tenant_id, client_id, business_partition,
  period_scope, from_node_id, to_node_id, edge_type, originating_activity_ref, created_at,
  support_type, support_confidence, support_strength_tier, limitation_codes[], from_manifest_id,
  to_manifest_id, lineage_relation, decisive_support, admissibility_state,
  contradicted_by_refs[], stale_at
  Filing-proof capable graphs SHALL additionally support semantic edges such as `ED_REPORTS_AS` and
  `ED_CONTRADICTS` so fact-to-total, total-to-filing, and contradiction-isolation continuity is
  machine-checkable.
- **ProvenancePath**: path_id, graph_id, manifest_id, manifest_refs[], target_ref, path_class,
  partition_contract{{...}}, path_role, admissibility_state, closure_state, replayable, path_hash,
  anchor_ref, anchor_class, node_refs[], edge_refs[], decisive_edge_refs[],
  weakest_support_confidence,
  inferred_decisive_segment_present, retention_limited_segment_count, tombstoned_segment_count,
  stale_segment_count, contradiction_refs[], limitation_codes[], ranking_basis[],
  lineage_boundary_refs[], decisive_lineage_boundary_refs[], hop_count, generated_at
  `ProvenancePath` SHALL be able to prove whether a support path is merely present or actually
  closed, admissible, replayable, and contradiction-free for filing use. Cross-manifest paths SHALL
  begin `manifest_refs[]` with the owning `manifest_id` and preserve explicit decisive lineage
  boundaries rather than relying on caller-selected graph traversal.
- **ProofBundle**: artifact_type, proof_bundle_id, manifest_id, manifest_refs[], partition_contract{{...}},
  graph_ref, target_ref, target_class, bundle_purpose, lifecycle_state, support_state, admissibility_state, closure_state,
  proof_closure_contract{{...}}, primary_path_ref, decisive_path_refs[], rejected_path_refs[],
  rejected_path_entries[], decisive_evidence_refs[], authority_basis_refs[], config_basis_refs[],
  contradiction_refs[], stale_reason_codes[], staleness_dependency_refs[],
  lineage_boundary_refs[], decisive_lineage_boundary_refs[], replay_recipe{{...}},
  render_refs{{...}}, limitation_notes[], retention_limited_explainability_contract{{...}},
  retention_binding{{...}}, bundle_hash, superseded_by_bundle_ref, generated_at, contract
  `ProofBundle` is the decisive filing-proof artifact. It SHALL bind one filing-capable target to the
  chosen primary path, the rejected competing paths, replay instructions, render surfaces, and the
  retained evidence or authority basis needed for scrutiny-safe reconstruction. Any non-`UNSUPPORTED`
  bundle posture SHALL therefore preserve a non-null `primary_path_ref`, non-empty
  `decisive_path_refs[]`, a top-level `manifest_refs[]` set that begins with the owning
  `manifest_id`, and mirrored replay lineage metadata. `proof_closure_contract` SHALL make support closure, authority closure,
  contradiction isolation, replay closure, decisive-anchor presence, silent-limitation ambiguity,
  and staleness invalidation explicit. `replay_recipe.required_artifact_refs[]` SHALL additionally
  retain the controlling `graph_ref`, all decisive path refs, and all rejected path refs whenever
  they exist, while `replay_recipe.path_ref_order[]` SHALL preserve the primary-plus-rejected
  ordering used for deterministic reconstruction. `lineage_boundary_refs[]` SHALL mirror replay
  lineage and keep superseded/current proof segments visibly distinct. `retention_limited_explainability_contract`
  plus `limitation_notes[]` SHALL make decisive tombstone, pseudonymisation, and expiry posture
  explicit whenever `retention_binding.limitation_behavior != FULL`.
- **EvidenceGraph**: graph_id, manifest_id, manifest_refs[], partition_contract{{...}}, graph_version,
  lifecycle_state, build_scope[], nodes_ref, edges_ref, critical_paths_ref, primary_path_ref, path_ranking_basis[],
  target_assessments[], proof_bundle_refs[], lineage_boundaries[], limitation_notes[],
  retention_limited_explainability_contract{{...}}, confidence_summary, supersession_summary,
  integrity_summary{{...}}, quality{{...}}, graph_hash, built_at
  `EvidenceGraph` SHALL carry target-level support posture instead of only path-level quality so the
  engine can fail closed on unsupported, contradicted, stale, non-replayable, or explanation-failed
  filing targets. Each target assessment SHALL therefore preserve `proof_closure_contract{{...}}`,
  `rejected_path_refs[]`, `closure_failure_reason_codes[]`, `replayable`, and
  `explanation_status` in addition to support, closure, contradiction, and proof-bundle linkage. The
  graph root SHALL mirror current target posture exactly: `proof_bundle_refs[]` SHALL equal the
  non-null set of `target_assessments[].proof_bundle_ref`, and root `primary_path_ref` SHALL resolve
  only to a current closed, replayable supported or partially supported target assessment path.
  Each lineage boundary SHALL preserve `boundary_edge_ref`, exposed vs decisive path refs, and the
  exact tenant/client/scope partition metadata that licensed the cross-manifest hop. Critical
  retention-limited or erased posture SHALL remain present through `limitation_notes[]` and a
  degraded target `explanation_status`, not through silent path disappearance.
- **EnquiryPack**: enquiry_pack_id, manifest_id, manifest_refs[], partition_contract{{...}}, graph_ref, proof_bundle_ref,
  target_ref, target_class, explanation_status, retention_binding{{...}},
  retention_limited_explainability_contract{{...}}, render_contract{{...}}, primary_path_ref,
  critical_path_refs[], supporting_evidence_refs[], transformation_step_refs[], config_refs[],
  override_refs[], authority_refs[], limitation_notes[], audit_refs[], lineage_boundaries[],
  masking_posture, omission_entries[], human_readable_ref, machine_readable_ref,
  externalization_governance_contract{{...}}, generated_at
  `EvidenceGraph`, `ProofBundle`, and `EnquiryPack` are the durable provenance explanation artifacts.
  They SHALL bind deterministic node, edge, and path topology to explicit target support posture,
  lineage-boundary, omission, limitation, replay, and export posture rather than leaving those joins
  to caller inference. `EnquiryPack.primary_path_ref` SHALL remain one of
  `critical_path_refs[]`, lineage-boundary exposure SHALL stay limited to serialized pack paths, and
  `explanation_status` SHALL remain render-aligned across the operator, reviewer, and filing
  surfaces. `manifest_refs[]` SHALL begin with the owning `manifest_id`, and the pack-wide
  `partition_contract` SHALL match every serialized lineage boundary. Whenever decisive explanation is
  retention-limited, the pack SHALL preserve both `limitation_notes[]` and `omission_entries[]`
  bound to the affected path or proof refs, and `externalization_governance_contract{...}` SHALL
  preserve the limited-vs-full explanation posture through human-readable or machine-readable export.
- **TwinStateSnapshot**: artifact_type, twin_state_snapshot_id, twin_id, lane_code,
  assembly_state, snapshot_role, comparison_key_profile_code, comparison_basis_ref, baseline_ref,
  component_refs[], subject_count, comparable_subject_count, non_comparable_subject_count,
  subject_key_collision_refs[], contradictory_component_refs[], freshness_state, confidence_state,
  limitation_codes[], authority_truth_state, baseline_state, amendment_position,
  replay_authoritativeness, as_of, stale_after, generated_at
  `TwinStateSnapshot` is the frozen per-lane comparison input. It SHALL keep
  `subject_count = comparable_subject_count + non_comparable_subject_count`, and any
  `subject_key_collision_refs[]` or `contradictory_component_refs[]` SHALL remain subsets of
  `component_refs[]` so contradiction posture is explainable from persisted lane input. Any state
  other than `UNAVAILABLE` SHALL also retain `comparison_key_profile_code = TWIN_KEY_V1_SHA256`, a
  non-null `comparison_basis_ref`, and non-empty `component_refs[]`.
- **TwinView**: artifact_type, twin_id, manifest_id, lifecycle_state, comparison_key_profile_code,
  delta_precedence_profile_code, mismatch_ranking_profile_code, comparison_basis_ref,
  internal_state_ref, authority_state_ref, timeline_ref, cross_source_delta_refs[],
  mismatch_summary_ref, readiness_ref, reconciliation_state_ref, interpretation_state_ref,
  parity_result_ref, built_at, stale_at, superseded_at
  `TwinView` is the manifest-scoped twin root. It SHALL keep distinct internal and authority
  snapshot refs, distinct subordinate builder refs, frozen comparison/precedence/ranking profile
  codes, and monotonic lifecycle timestamps so the twin remains a root artifact rather than a
  renderer-local merge. Any built, stale, or superseded twin SHALL also retain non-empty
  `cross_source_delta_refs[]`.
- **TwinTimeline**: artifact_type, twin_timeline_id, twin_id, lifecycle_state,
  temporal_alignment_state, alignment_score, primary_anchor_ref, window_start_at,
  window_end_at, aligned_anchor_count, contradictory_anchor_count, unpaired_anchor_count,
  alignment_reason_codes[], lanes[]
- **TwinDeltaArc**: artifact_type, delta_arc_id, twin_id, timeline_ref, comparison_key,
  comparison_key_profile_code, subject_identity_code, reporting_scope_ref_or_null,
  authority_scope_ref_or_null, business_partition_ref_or_null, period_ref_or_null,
  basis_type_or_null, lineage_anchor_ref_or_null, left_lane_code, right_lane_code, subject_ref,
  subject_class, delta_class, comparability_state, comparability_reason_code,
  delta_precedence_rank, materiality_class, resolution_class, priority_rank, baseline_state,
  confidence_state, freshness_state, explanation_ref, parity_delta_ref,
  equivalence_reason_codes[], blocking_reason_codes[], left_subject_refs[], right_subject_refs[],
  contradiction_component_refs[], limitation_codes[], left_observed_at, right_observed_at,
  resolution_deadline_at, last_compared_at
- **TwinMismatchSummary**: artifact_type, mismatch_summary_id, twin_id, ranking_profile_code,
  total_subject_count, matched_count, mismatch_count, comparable_mismatch_count, waiting_count,
  partial_ack_count, non_comparable_count, contradictory_count, blocking_count, material_count,
  review_count, informational_count, limited_count, stale_count, out_of_band_count,
  highest_priority_rank, highest_materiality_class, top_mismatch_refs[],
  top_ranked_mismatches[]{delta_arc_ref, comparison_key, comparability_state,
  comparability_reason_code, priority_rank, last_compared_at, materiality_class},
  suppressed_match_count, generated_at
- **TwinReadinessState**: artifact_type, twin_readiness_id, twin_id, filing_readiness,
  twin_readiness_class, safe_action_state, decision_usefulness, trust_summary_ref,
  decision_bundle_ref, gate_decision_refs[], authority_posture, baseline_state,
  usefulness_cap_reason_codes[], blocking_reason_codes[], review_reason_codes[],
  unresolved_conflict_refs[], blocking_mismatch_refs[], review_mismatch_refs[],
  waiting_mismatch_refs[], reconciliation_mismatch_refs[], contradictory_mismatch_refs[],
  non_comparable_mismatch_refs[], out_of_band_mismatch_refs[],
  no_safe_action_reason_codes[], last_evaluated_at
- **TwinReconciliationState**: artifact_type, twin_reconciliation_state_id, twin_id,
  lifecycle_state, resolution_state, target_mismatch_refs[], blocking_mismatch_refs[],
  recommended_action_code, reconciliation_budget_state, workflow_item_refs[],
  primary_workflow_item_ref_or_null, auto_attempt_count, max_auto_attempts,
  reconciliation_deadline_at, next_action_owner, next_action_due_at, last_attempted_at,
  resolved_at, reason_codes[], generated_at
- **TwinInterpretationState**: artifact_type, twin_interpretation_state_id, twin_id,
  generated_from_surface, default_view_space, enabled_view_spaces[], compare_mode,
  pinned_object_ref, active_delta_arc_ref, focus_anchor_ref, show_confidence_overlay,
  show_freshness_overlay, preserve_focus_across_refresh, default_sort_mode,
  default_noise_filter, summary_priority_mode, dominant_attention_state,
  dominant_delta_arc_ref_or_null, dominant_reconciliation_state_ref_or_null,
  collapse_matches_by_default, suppress_informational_when_higher_severity_present,
  authority_first_summary
- **TwinPortfolioSummary**: artifact_type, twin_portfolio_summary_id, tenant_id, scope_ref,
  generated_at, total_twin_count, ready_count, review_required_count,
  waiting_on_authority_count, reconciliation_required_count, blocked_count,
  stale_twin_count, out_of_band_twin_count, highest_attention_rank, top_twin_refs[],
  top_mismatch_refs[]
  `TwinStateSnapshot`, `TwinView`, `TwinTimeline`, `TwinDeltaArc`, `TwinMismatchSummary`,
  `TwinReadinessState`, `TwinReconciliationState`, `TwinInterpretationState`, and
  `TwinPortfolioSummary` SHALL validate against `schemas/twin_state_snapshot.schema.json`,
  `schemas/twin_view.schema.json`, `schemas/twin_timeline.schema.json`,
  `schemas/twin_delta_arc.schema.json`, `schemas/twin_mismatch_summary.schema.json`,
  `schemas/twin_readiness_state.schema.json`,
  `schemas/twin_reconciliation_state.schema.json`,
  `schemas/twin_interpretation_state.schema.json`, and
  `schemas/twin_portfolio_summary.schema.json` so mirrored lane assembly, delta ranking,
  mismatch summarization, readiness overlays, reconciliation posture, interpretation or focus
  posture, and portfolio rollups remain deterministic across twin rendering, low-noise
  detail-drawer remounts, and manifest refresh.
- **FilingPacket**: artifact_type, packet_id, manifest_id, lifecycle_state, state_transition_contract{{...}}, payload_ref, payload_hash,
  manifest_binding_hash, declared_basis, disclaimers[], calculation_basis_ref,
  authority_calculation_ref, readiness_context_ref, user_confirmation_ref,
  controlling_proof_bundle_ref, proof_closure_state, approval_state,
  declared_basis_ack_state, notice_step_refs[], notice_resolution_ref, filing_gate_ref, created_at,
  approved_at, submitted_at, voided_at, superseded_at, state_changed_at
  `FilingPacket` SHALL validate against `schemas/filing_packet.schema.json` so the authority-facing
  payload hash, manifest binding, calculation lineage, proof-bundle posture, packet-phase approval
  state, declaration-basis acknowledgement state, notice resolution, and filing-gate decision remain
  explicit on the packet itself instead of being reconstructed from loose refs or presentation-only
  approval surfaces.
- **FilingNoticeStep**: artifact_type, notice_step_id, manifest_id, packet_id, step_code,
  lifecycle_state, reason_codes[], scope_refs[], packet_refs[], created_at, resolved_at
- **FilingNoticeResolution**: artifact_type, notice_resolution_id, manifest_id, packet_id,
  notice_step_refs[], notice_requirements_satisfied, approval_state, declared_basis_ack_state,
  notice_refs[], unresolved_reason_codes[], resolved_at
  `FilingNoticeStep` and `FilingNoticeResolution` SHALL validate against
  `schemas/filing_notice_step.schema.json` and `schemas/filing_notice_resolution.schema.json` so
  packet-local acknowledgement, disclaimer, and approval notice posture remain durable across gate,
  review, and promotion flows.
- **SubmissionRecord**: artifact_type, submission_id, manifest_id, client_id, provider_environment,
  authority_scope, operation_family, basis_type, attempt_lineage_manifest_id, obligation_ref,
  packet_ref, request_envelope_ref, idempotency_key, lifecycle_state, state_transition_contract{{...}}, authority_reference,
  request_hash, identity_namespace_hash, duplicate_meaning_key, request_identity_contract{{...}},
  authority_ingress_proof_contract{{...}}, reconciliation_control_contract_or_null{{...}}, response_ref, correlation_refs[], baseline_type, reconciliation_deadline_at,
  authority_evidence_ref, proof_bundle_ref, proof_bundle_hash, rejection_reason_codes[],
  superseded_by_submission_id, state_changed_at, authority_truth_contract{{ contract_version,
  boundary_scope, truth_surface_role, surface_specific_binding_policy,
  authority_confirmation_policy, non_confirming_state_policy, normalization_gate_policy,
  mirror_projection_policy, unresolved_projection_policy, override_confirmation_policy,
  correction_propagation_policy }}
  `SubmissionRecord` is the durable legal-settlement spine for one authority meaning. It SHALL keep
  exact-request identity, duplicate-meaning identity, proof-bundle lineage, reconciliation deadline,
  baseline classification, and supersession posture explicit so transmit, pending, rejected,
  confirmed, and out-of-band states do not blur together under UI or queue-local optimism.
  `INTENT_RECORDED` SHALL already freeze the bound `packet_ref`, `request_envelope_ref`,
  `request_hash`, `idempotency_key`, `identity_namespace_hash`, `duplicate_meaning_key`,
  `request_identity_contract{...}`,
  `proof_bundle_ref`, and `proof_bundle_hash`; only `OUT_OF_BAND` may later clear packet-origin
  transmit lineage. Request-backed submission states therefore SHALL retain the same grouped
  request-identity contract used by the envelope and interaction record instead of reconstructing
  that identity from neighboring protocol artifacts. Request-backed authority outcomes SHALL also
  retain `authority_ingress_proof_contract{...}` so pending, confirmed, rejected, or unknown
  settlement does not detach from the persisted authenticated ingress checkpoint that authorized the
  mutation. Pending, unknown, and out-of-band settlement SHALL additionally retain
  `reconciliation_control_contract_or_null{...}` so replay, restore, and downstream projections
  reuse the same unresolved budget and escalation packet rather than reconstructing it from the
  interaction at read time. `SubmissionRecord` is the only durable authority-settlement ledger in this path;
  mirrors, workflow items, customer projections, overrides, and accepted-risk annotations SHALL
  remain subordinate to its authority-grounded state.
- **DriftRecord**: artifact_type, drift_id, manifest_id, baseline_ref, baseline_envelope_ref,
  baseline_manifest_id, comparison_manifest_id, baseline_type, baseline_scope_refs[],
  drift_scope_refs[], active_exact_scope_key, baseline_basis_ref, authority_basis_refs[],
  drift_scope, difference_classes[], field_deltas[], money_profile{{...}},
  plane_pressures{{fact,total,filing,authority,explanation}},
  tax_delta_abs, tax_delta_rel, drift_pressure, amendment_pressure, critical_field_delta_count,
  cause_codes[], materiality_profile_ref, materiality_class, lifecycle_state,
  amendment_recommendation, amendment_eligibility_contract{{...}},
  amendment_window_context_ref, retroactive_impact_ref, late_data_indicator_refs[],
  source_contradiction_state, review_state, escalation_state, recommendation_cap, automation_cap,
  lineage_boundary_refs[], basis_limitations[], supersedes_drift_id, superseded_at
  `SubmissionRecord` and `DriftRecord` SHALL validate against `schemas/submission_record.schema.json`
  and `schemas/drift_record.schema.json` so request identity, reconciliation posture, exact-scope
  baseline lineage, retroactive impact, and trigger-versus-eligibility amendment posture remain
  durable across implementations.
- **ErrorRecord**: error_id, manifest_id, root_manifest_id, error_family, error_code, error_title,
  error_description_template, severity, blocking_class, blocking_effects[], retry_class,
  retry_attempt_count, retry_budget_class, next_retry_at, retry_precondition_refs[],
  retry_idempotency_scope_ref, remediation_class, remediation_owner_type,
  failure_resolution_contract{{ contract_version, lifecycle_role, role_specific_binding_policy,
  material_failure_policy, ownership_policy, next_action_policy, retry_policy, closure_policy,
  accepted_risk_policy, linkage_policy }}, invariant_enforcement_contract{{ contract_version,
  boundary_scope, boundary_specific_binding_policy, invariant_failure_state,
  invariant_class_or_null, error_family_or_null, error_code_or_null, failure_stage_or_null,
  terminal_manifest_state_or_null, transition_event_code_or_null,
  terminal_audit_event_type_or_null, error_record_ref_or_null, typed_error_policy,
  partial_write_policy, audit_evidence_policy, lifecycle_mapping_policy,
  assertion_conversion_policy, normalization_rejection_policy }}, remediation_owner_ref, reason_codes[],
  affected_object_refs[], source_object_refs[], caused_by_error_id, originating_activity_ref,
  actor_ref, service_ref, authority_operation_ref, retention_class, artifact_retention_ref,
  workflow_item_id, remediation_task_ref, failure_investigation_ref, compensation_record_ref,
  next_action_ref, customer_visibility_class, operator_visibility_class,
  opened_at, resolved_at, resolution_state, resolution_basis_ref, closure_evidence_refs[], resolved_by_task_id, accepted_risk_approval_ref,
  accepted_risk_expires_at, reopened_by_error_id, dedupe_key, dedupe_scope, first_seen_at,
  last_seen_at, occurrence_count, escalation_state, escalated_at, resolution_notes_ref,
  audit_refs[], provenance_refs[]
  `ErrorRecord.next_retry_at` SHALL be the output of deterministic backoff with phase offset, and
  automatic retry SHALL remain illegal unless the frozen retry-economics gate yields positive
  expected gain under current backlog and deadline pressure. Error chronology SHALL remain
  forward-only, non-blocking errors SHALL not carry blocked effects, accepted-risk lineage SHALL
  remain exclusive to `resolution_state = ACCEPTED_RISK`, and reconcile/rebuild retry posture SHALL
  retain explicit retry preconditions. Retention/privacy families SHALL also retain
  `artifact_retention_ref`, `retention_class`, and either `workflow_item_id` or
  `remediation_task_ref` so material failures stay machine-linked to the affected retention object
  and its owned follow-up. FE-45 also requires `remediation_owner_ref` for any non-system owner and
  one lawful open-path anchor via scheduled retry or `next_action_ref`.
  When `invariant_enforcement_contract.invariant_failure_state = TRIGGERED`, the error SHALL remain
  `CRITICAL`, `blocking_class = BLOCKS_RUN`, non-`SAFE_RETRY`, and mirror the contract's invariant
  class plus family-specific `error_code` exactly.
- **CompensationRecord**: compensation_id, error_id, manifest_id, root_manifest_id,
  failure_resolution_contract{{...}}, owner_type, owner_ref, compensation_mode, retention_class,
  artifact_retention_ref, workflow_item_id, target_object_refs[], compensation_status,
  compensation_steps_ref, compensated_at, verification_ref, resolution_basis_ref,
  closure_evidence_refs[], created_at, superseded_by_compensation_id, audit_refs[],
  provenance_refs[]
  `CompensationRecord` is the durable post-failure settlement object. It SHALL keep compensation
  timing monotonic and bind verification or supersession refs back to the matching
  `compensation_status` rather than leaving those outcomes implicit. `PRESERVE_AND_LIMIT`
  compensation SHALL retain `artifact_retention_ref` plus `retention_class`, and non-null
  `retention_class` SHALL never appear without that exact `artifact_retention_ref`. FE-45 also
  requires owner continuity plus closure basis/evidence once compensation stops being merely
  planned or in progress.
- **AcceptedRiskApproval**: accepted_risk_approval_id, error_id, manifest_id, root_manifest_id,
  failure_resolution_contract{{...}}, decision_basis, approval_state, approver_type, approver_ref,
  policy_basis_ref, retention_class, artifact_retention_ref, workflow_item_id, rationale_ref,
  bounded_scope_refs[], approved_at, expires_at, revoked_at, superseded_by_approval_id, audit_refs[],
  provenance_refs[]
  `AcceptedRiskApproval` SHALL preserve any retention-linked exception as an exact
  `artifact_retention_ref` plus `retention_class` pair; non-null `retention_class` SHALL never
  float without the governed retention object.
- **FailureInvestigation**: investigation_id, error_id, manifest_id, root_manifest_id,
  failure_resolution_contract{{...}}, investigation_class, retention_class, artifact_retention_ref, workflow_item_id, owner_type,
  owner_ref, priority, investigation_state, investigation_steps_ref, due_at, opened_at,
  last_activity_at, resolved_at, resolution_basis_ref, outcome, accepted_risk_approval_ref,
  superseded_by_investigation_id, closure_evidence_refs[], remediation_task_refs[], audit_refs[],
  provenance_refs[]
  `FailureInvestigation` SHALL keep retention/privacy exception posture anchored to the exact
  `artifact_retention_ref`; non-null `retention_class` SHALL therefore never appear without that
  object anchor. FE-45 additionally requires investigation ownership and closure evidence to stay
  in the same governed failure-resolution lifecycle.
- **FailureLifecycleDashboard**: artifact_type, dashboard_id, manifest_id, root_manifest_id,
  root_error_ref, current_error_ref, lineage_error_refs_in_order[], current_lineage_state,
  current_state_source{{ source_artifact_type, source_ref, state_code, state_changed_at }},
  current_owner{{ owner_type, owner_ref_or_null, source_artifact_type, source_ref }},
  next_legal_action{{ action_state, action_code_or_null, action_ref_or_null,
  source_artifact_type_or_null, due_at_or_null, waiting_on_actor_or_null, reason_codes[] }},
  blocking_scope{{ blocking_class, reason_codes[], affected_object_refs[],
  workflow_item_ref_or_null }}, first_opened_at, last_activity_at, remediation_summary{{...}},
  compensation_posture{{...}}, investigation_posture{{...}}, accepted_risk_posture{{...}},
  workflow_coordination{{...}}, closure_posture{{ resolution_state, resolution_basis_ref_or_null,
  closure_evidence_refs[], resolved_by_task_id_or_null, resolved_at_or_null }},
  lineage_refs{{ remediation_task_refs[], compensation_record_refs[],
  failure_investigation_refs[], accepted_risk_approval_refs[], workflow_item_refs[], audit_refs[],
  provenance_refs[] }}, underlying_error_visibility_policy, accepted_risk_owner_policy,
  data_source_policy, log_reconstruction_policy, updated_at
  `FailureLifecycleDashboard` is the authoritative persisted failure-lineage read model. It SHALL
  preserve the root-to-current error chain, keep compensation subordinate to visible underlying
  error lineage, keep accepted-risk expiry and accountable owner explicit, and expose the next legal
  action from typed lifecycle objects only. It SHALL validate against
  `schemas/failure_lifecycle_dashboard.schema.json`.
- **AuditEvent**: audit_event_id, event_type, event_time, recorded_at, audit_stream_ref, stream_sequence,
  tenant_id, client_id, manifest_id, actor_ref, service_ref, object_refs[], reason_codes[],
  correlation_context{{...}},
  event_payload_hash, prev_event_hash, visibility_class, retention_class, signature_ref,
  retention_limited_explainability_contract{{...}}, retained_context{{...}}
  `AuditEvent` is the append-only audit evidence contract. It SHALL preserve stream ordering, event-family
  taxonomy, and enough lineage or authority correlation to reconstruct compliance-significant history without
  out-of-band side tables. Remediation audit families SHALL retain both `error_id` and `task_id`;
  compensation audit families SHALL retain both `error_id` and `compensation_id`. Nightly
  control-plane families and replay-observability families SHALL keep their frozen batch or replay
  comparison correlation keys explicit. After payload expiry, `retained_context` SHALL still preserve
  payload-availability posture, lineage refs, and typed limitation reasons so the event remains
  reconstructible.
- **ErasureProof**: erasure_proof_id, manifest_id, target_ref, erasure_action_ref, proof_hash, created_at
  `ErasureProof` is the append-only proof-preservation artifact for completed erasure or pseudonymisation
  work. It SHALL survive the content-removal workflow it proves.

## Key principle
A **RunManifest** is the spine. Everything else attaches to it. All "explain why" questions begin by reading the manifest
and walking the provenance links from outputs back to inputs and evidence.
For intake-boundary and intake-data artifacts, authoritative status requires a recorded contract envelope
(`schema_id`, `semantic_version`, `content_hash`) tied to the frozen schema bundle.

Northbound command receipts, session cursors, release provenance, deployment releases, release
verification manifests, schema migration ledgers, secret versions, and recovery checkpoints are
first-class operational control objects. They SHALL be persisted with the same rigor as
manifest-adjacent state whenever they gate duplicate suppression, stale-view protection, release
promotion, rollback, or restore safety.

Formal lifecycle and transition semantics for these objects are defined in `state_machines.md`.
## FE-25 Cache Isolation

`CacheIsolationContract` is now a first-class shared artifact in the read-model contract corpus. It governs low-noise frames, collaboration workspaces, inbox projections, portal workspaces, request lists, governance surfaces, and native scenes with one exact reuse law across tenant, client, principal/session, access, masking, route, object, projection-version, and preview subject bindings.
