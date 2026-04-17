# Northbound API and Session Contract

## Purpose

The core algorithm defines command-side truth (`RunManifest`, workflow items, gate records,
authority interaction records, append-only audit evidence) and read-side projections
(`DecisionBundle`, `ExperienceDelta`, calm-shell frames, workspace snapshots), but production delivery also requires a
first-class contract between product clients and the platform control plane. Without that contract,
duplicate commands, stale-view approvals, reconnect drift, inconsistent client-side inference, and
desktop-cache divergence can reintroduce correctness bugs above an otherwise sound engine.

This contract defines the product-facing command/read surfaces, session rules, stale-view protection,
and reconnect-safe stream behavior.

## 1. Core principles

1. **Command/read separation**. Product clients SHALL issue commands through a command surface and
   SHALL read progress/state through disposable read surfaces such as `DecisionBundle`,
   `ExperienceDelta`, audit, and enquiry-pack projections. No client may infer legal state from a
   partially successful command call, and no server write path may treat those projections as the
   authoritative source of legality, workflow state, or authority truth.
2. **Duplicate suppression at the edge**. Client retries are normal. Duplicate POSTs, mobile
   reconnects, browser refreshes, macOS app relaunch/retry, and operator double-clicks SHALL collapse
   onto one durable command receipt and one legal state transition.
3. **Stale-view protection**. Any command whose legality depends on the state the user saw SHALL carry
   explicit stale-view guards (`if_match_decision_bundle_hash`, `if_match_shell_stability_token`,
   `if_match_frame_epoch`) so the backend can reject approvals or submissions formed from obsolete
   posture.
4. **Read-side determinism**. `ExperienceDelta` remains read-side only. Clients SHALL NOT synthesize
   hidden workflow, trust, or filing states by combining deltas heuristically, and projector or
   repair routines SHALL rebuild read surfaces from durable command-side records rather than
   promoting read-side fields back into truth.
5. **Reconnect safety**. A dropped connection SHALL recover through resume or rebase, not through
   client-side recreation of missing transitions.
6. **Typed failure surfaces**. Every user-visible API failure SHALL return a typed, machine-readable
   problem envelope aligned with existing reason-code families.
7. **Shell continuity metadata**. Where a route-visible read model defines `shell_family`,
   `object_anchor_ref`, `dominant_question`, `settlement_state`, `recovery_posture`, or
   `interaction_layer`, the same metadata SHALL remain stable across browser reload, native
   restoration, stream rebase, and inline refresh so the client does not invent a second shell or
   interaction grammar locally.

## 2. Required northbound surfaces

At minimum, the broader product SHALL expose these surfaces:

- `POST /v1/commands`
- `GET /v1/commands/{command_id}`
- `GET /v1/manifests/{manifest_id}/decision-bundle`
- `GET /v1/manifests/{manifest_id}/experience/snapshot`
- `GET /v1/manifests/{manifest_id}/experience/stream?resume_token=...`
- `GET /v1/manifests/{manifest_id}/audit-trail`
- `GET /v1/manifests/{manifest_id}/enquiry-pack?target_ref=...`
- `GET /v1/client-portal/workspace`
- `GET /v1/client-portal/documents`
- `GET /v1/client-portal/approvals`
- `GET /v1/client-portal/onboarding`
- `GET /v1/client-portal/activity`
- `POST /v1/uploads/sessions`
- `PUT /v1/uploads/sessions/{upload_session_id}/blob`
- `GET /v1/uploads/sessions/{upload_session_id}`

Implementation notes:

- `POST /v1/commands` is the only product-facing write surface for manifest-adjacent truth. It MAY
  dispatch domain-specific command handlers internally, but the external contract SHALL remain
  receipt-based and idempotent.
- `GET /v1/commands/{command_id}` SHALL return the latest durable `ApiCommandReceipt` for the
  client-generated command, including the freshest authoritative object refs needed for replay-safe
  recovery after lost POST responses, app relaunch, browser refresh, or automation polling. That
  receipt SHALL preserve the original `command_id`, `request_hash`, and `idempotency_key`, and
  expired success projections SHALL keep the same recovery-anchor family they exposed before expiry
  rather than degrading into a transport-only timeout marker.
- `GET /decision-bundle` SHALL return the latest persisted `DecisionBundle` when one exists and SHALL
  include `ETag = decision_bundle_hash`.
- `GET /experience/snapshot` SHALL return the latest materialized frame plus `decision_bundle_hash`,
  `frame_epoch`, `shell_stability_token`, `last_published_sequence`, a fresh `resume_token`, and
  one grouped `stability_contract{{ publication_generation, guard_vector_hash, guard_vector_components{{ decision_bundle_hash_or_null, shell_stability_token_or_null, frame_epoch_or_null }}, last_published_sequence_or_null, resume_token_or_null, resume_capability }}`. Where defined by
  the snapshot schema, the same payload SHALL also preserve `shell_family`, `object_anchor_ref`,
  `dominant_question`, `settlement_state`, `recovery_posture`, and `interaction_layer`. The same
  snapshot contract SHALL support browser reload, native desktop cold start, and cache rebase
  without changing legal-state or interaction semantics or permitting mixed-generation marker
  reuse. The manifest experience transport spine SHALL additionally keep
  `shell_route_key = manifest_id` across snapshots, deltas, stream events, and persisted cursors so
  reconnect cannot remount the same manifest under a client-local route alias. The same snapshot
  SHALL additionally publish one grouped `stream_recovery_contract{{ contract_version,
  stream_scope_class, route_key, subject_ref, shell_stability_token, session_ref,
  session_binding_hash, access_binding_hash, masking_context_hash, publication_generation,
  frame_epoch, last_published_sequence, compaction_floor_sequence_or_null,
  resume_binding_representation, resume_binding_ref_or_null, delivery_window_state,
  rebase_reason_code_or_null, resume_token_binding_mode, sequence_application_policy,
  duplicate_delivery_policy, catch_up_policy, rebase_trigger_policy }}`. The raw `resume_token` is
  transport material only; the grouped `stream_recovery_contract` is the authoritative binding for
  route, subject, session, access scope, masking posture, epoch, published frontier, compaction
  floor, and rebase semantics.
- the manifest experience snapshot SHALL validate against `schemas/low_noise_experience_frame.schema.json`,
  with its published `CONTEXT_BAR`, `DECISION_SUMMARY`, `ACTION_STRIP`, and `DETAIL_DRAWER` payloads
  validating against their dedicated surface schemas in `schemas/`
- `GET /experience/stream` SHALL use a reconnect-safe streaming transport. Server-Sent Events (SSE)
  is the default profile because the flow is primarily server-to-client and ordered by
  `experience_sequence`. Native macOS clients MAY consume the same ordered stream through
  `URLSession` or an equivalent platform transport, but they SHALL preserve exactly the same resume
  and rebase semantics. Resume tokens SHALL bind to the exact route, mounted manifest, session,
  access binding, and masking posture published by `stream_recovery_contract`; sequence application
  SHALL remain strictly monotonic and gap-free within one `frame_epoch`; duplicate delivery SHALL
  remain idempotent by `(MANIFEST_EXPERIENCE, manifest_id, frame_epoch, experience_sequence)`; and
  catch-up delivery SHALL complete before live delivery is treated as current. The server SHALL fail
  closed with `REBASE_REQUIRED` on epoch advance, shell or route drift, or history compaction, and
  with `ACCESS_REBIND_REQUIRED` on session, access-binding, masking, or schema drift.
- audit and enquiry-pack surfaces SHALL be read-only and SHALL never mutate workflow or compliance
  truth as a side effect of retrieval.

### 2.1 Admin/Governance Console read and simulation surfaces

The broader product SHALL also expose read surfaces for the Admin/Governance Console.
These are still northbound product contracts even though they are not manifest-run screens.
At minimum, provide:

- `GET /v1/governance/tenants/{tenant_id}/overview` returning a `TenantGovernanceSnapshot` with
  one dominant attention summary plus pending approvals, risky configuration drift,
  authority-link health counts, retention exceptions, audit hotspots, and route-stable worklist
  refs
- `GET /v1/governance/tenants/{tenant_id}/policy-snapshot` returning the current tenant policy,
  security posture, step-up requirements, environment bindings, and a stable
  `policy_snapshot_hash` for stale-view protection
- `GET /v1/governance/tenants/{tenant_id}/principals` returning human, service, and external actors
  with effective roles, authn posture, delegation summary, and last material change refs
- `GET /v1/governance/tenants/{tenant_id}/roles/{role_id}` returning a `RoleTemplateMatrix` with
  grouped resource rows, grouped action columns, one `policy_snapshot_hash`, one role
  `version_hash`, route-stable filters, selected-cell/focus-anchor continuity, pending role-editor
  change refs, and the exact reason-code / masking / authn / approval posture used by the access UI
- `POST /v1/governance/tenants/{tenant_id}/access-simulations` as a non-mutating simulation surface
  for evaluating `AUTHORIZE(...)` and, for mutation-capable governance writes,
  `SIMULATE_GOVERNANCE_MUTATION(...)` against a proposed principal/resource/action tuple without
  mutating live grants; the response SHALL validate as `GovernanceAccessSimulation`, carrying a
  nested reusable `authorization_decision{{...}}` plus, when the target is mutation-capable
  governance scope, `mutation_hazard{{ simulation_basis_hash, dependency_topology_hash,
  impact_radius_lower_score, impact_radius_upper_score, classed impacted counts,
  privilege_gain_score, scope_expansion_score, masking_relaxation_score, policy_risk_score,
  approval_necessity_score, approval_requirement, commit_authority_posture,
  simulation_confidence_score, predictability_score, bounded_safe_mutation,
  risk_driver_codes[], approval_trigger_codes[], confidence_limiter_codes[],
  bounded_safety_blocker_codes[], required_approvals[], reason_codes[] }}` plus
  `mutation_basis_contract{ basis_contract_hash, access_binding_hash, commit_authority_posture, ... }`
  so clients do not infer commit safety from a bare allow/deny result and low-confidence previews do
  not surface commit-ready commands
- `GET /v1/governance/tenants/{tenant_id}/authority-links` returning link inventory grouped by client,
  authority scope, provider environment, binding health, and last validation outcome
- `GET /v1/governance/tenants/{tenant_id}/retention` returning policy matrices, legal-hold registers,
  erasure queue summaries, limitation counts, and statutory-baseline vs tenant-override comparisons
- `GET /v1/governance/tenants/{tenant_id}/audit-investigations` returning append-only event slices,
  correlation neighborhoods, and export eligibility for governance investigators

These read surfaces SHALL support route-stable filters, cursor pagination, and immutable object refs so
that dense control-plane screens can update inline without losing selection context.
`TenantGovernanceSnapshot`, `GovernancePolicySnapshot`, `PrincipalAccessView`, `RoleTemplateMatrix`,
`AuthorityLinkInventoryItem`, `RetentionGovernanceFrame`, and `AuditInvestigationFrame` SHALL
validate against their dedicated JSON schemas in `schemas/`
(`tenant_governance_snapshot.schema.json`, `governance_policy_snapshot.schema.json`,
`principal_access_view.schema.json`, `role_template_matrix.schema.json`,
`authority_link_inventory_item.schema.json`, `retention_governance_frame.schema.json`, and
`audit_investigation_frame.schema.json`) so browser and native clients share one
machine-readable control-plane contract. The route-visible governance projections SHALL
additionally preserve `shell_family`, `object_anchor_ref`, `dominant_question`,
`settlement_state`, `recovery_posture`, and `interaction_layer` so rebase, responsive collapse, and
diff recovery do not silently remount the selected object in a different shell grammar or local
interaction model. Access-route detail projections
(`PrincipalAccessView` and `RoleTemplateMatrix`) SHALL additionally keep `policy_snapshot_hash`,
route-stable `active_filters`, the mounted `selected_cell_ref`, one `focus_anchor_ref`, and any
live `latest_simulation_ref` or pending change refs explicit so inline refresh does not discard the
selected matrix cell or the stale-view basis that justified the current inspector.
`GovernanceAccessSimulation` SHALL validate against `schemas/governance_access_simulation.schema.json`
so policy-simulator previews keep the nested `AuthorizationDecision`, blast-radius basis, and
approval-confidence posture machine-readable rather than reconstructing them from UI-local state.

Any mutation-capable governance simulation SHALL be bound to exactly one `simulation_basis_hash`
and one `dependency_topology_hash`. A client MAY cache and compare those hashes for UX continuity,
but it SHALL NOT treat them as durable commit authority: any write formed from a rendered simulation
MUST still prove that the same basis hashes or stricter current-equivalent version tokens are active
at commit time. The durable northbound preview-to-write carrier is
`mutation_basis_contract.basis_contract_hash`; governance writes SHALL preserve that exact basis or
fail as stale.

### 2.2 Customer/Client portal and upload-session surfaces

The broader product SHALL also expose dedicated surfaces for the customer/client portal.
At minimum:

- client portal read surfaces SHALL return plain-language, role-filtered projections (`ClientPortalWorkspace` and route-specific derivatives) and SHALL NOT leak internal-only reason codes, expert surface codes, or raw audit hashes into first-view content
- portal workspace and route-scoped portal responses SHALL return `ETag = workspace_version` plus
  explicit `freshness_state`, `view_guard_ref`, and one grouped
  `stability_contract{{ publication_generation, guard_vector_hash, guard_vector_components{{ client_portal_workspace_version_or_null, view_guard_ref_or_null }}, resume_capability = SNAPSHOT_ONLY }}` so browser and mobile clients can rebase calmly
  without inventing freshness posture locally or reviving stale route generations from cache
- route-visible portal responses SHALL additionally preserve `shell_family = CLIENT_PORTAL_SHELL`,
  one `object_anchor_ref`, one `dominant_question`, one top-level `settlement_state`, one top-level
  `recovery_posture`, and one `interaction_layer` so deep links, responsive collapse, and
  reconnect recovery do not remount the same client object under a second local shell or
  interaction grammar or force clients to infer shell posture from portal-local freshness alone
- document-route portal responses SHALL additionally surface the current request's
  `request_version_ref` and SHALL mirror each upload row's frozen `request_version_ref`,
  `request_binding_state`, `resumability_state`, and `attachment_state` so request rebases and
  reconnect recovery do not infer binding posture locally
- `POST /v1/uploads/sessions` is the governed binary-transfer exception to the generic command surface: it allocates a resumable `ClientUploadSession` for file bytes, while request attachment/finalization remains a typed command through `POST /v1/commands`
- upload-session allocation SHALL freeze `tenant_id`, `client_id`, `request_id`, and `request_version_ref` so staged bytes cannot silently drift across customer or request boundaries after reconnect or replay
- upload-session allocation and every later read SHALL also publish one grouped
  `upload_request_binding_contract{ frozen_tenant_id, frozen_client_id, frozen_request_id,
  request_identity_ref, frozen_request_version_ref, live_request_version_ref,
  request_binding_state, binding_resolution_basis, resume_identity_policy,
  duplicate_session_policy, duplicate_file_policy, inflight_rebase_policy,
  stale_completion_policy, attachment_authority_policy, next_action_authority_policy,
  cross_device_resume_policy, frozen_binding_scope_hash, rebase_detected_at_or_null }`
- upload-session allocation SHALL fail closed when the supplied request identity or request version is
  stale, missing, cross-client, or cross-tenant rather than rebinding an existing session in place
- upload session reads SHALL expose scanner state, checksum posture, validation outcome, request-binding posture, attachment-confirmation posture, next-action posture, and resumability metadata so mobile reconnect does not duplicate files or misstate request completion
- `GET /v1/uploads/sessions/{upload_session_id}` SHALL preserve the original frozen `tenant_id`,
  `client_id`, `request_id`, and `request_version_ref` from allocation time; request rebases SHALL
  change `request_binding_state` and recovery posture rather than mutating the session onto a newer
  request version silently
- in-flight request rebases SHALL preserve the same governed upload session and storage lineage
  until transfer settles; only accepted stale uploads may surface `next_action_code = RECONFIRM_REQUEST`
  and `attachment_state = REBIND_REQUIRED`
- portal document-request reads SHALL keep `latest_upload_ref` as chronological history only and
  SHALL expose `current_request_upload_ref_or_null` separately so read models cannot claim current
  request satisfaction from a stale, superseded, or replacement-only upload lineage
- deterministic upload recovery SHALL validate against
  `schemas/upload_session_recovery_harness.schema.json` so mobile reconnect, browser reload, stale
  request rebase, duplicate allocation, checksum/scanner delay, attachment confirmation, and
  cross-device continuation remain machine-checkable
- `ClientDocumentRequest`, `ClientUploadSession`, `ClientApprovalPack`, `ClientOnboardingJourney`, `ClientTimelineEvent`, and `PortalHelpRequest` SHALL validate against their dedicated JSON schemas in `schemas/` so browser and mobile clients share one machine-readable portal contract

### 2.3 Collaboration workspace surfaces

The broader product SHALL also expose read surfaces for the shared staff/customer collaboration workspace.
At minimum:

- `GET /v1/work-items?assignee=...&status=...&waiting_on=...&due_state=...`
- `GET /v1/work-items/{item_id}/workspace/snapshot`
- `GET /v1/work-items/{item_id}/workspace/stream?resume_token=...`
- `GET /v1/work-items/{item_id}/activity?thread=customer|internal&before_sequence=...`
  returning a `CollaborationActivitySlice`
- `GET /v1/work-items/{item_id}/attachments?visibility=customer|internal`
  returning a `CollaborationAttachmentSlice`
- `GET /v1/work-items/{item_id}/audit-trail` returning a staff-only audit slice rooted in durable
  audit-event truth

Rules:

- all collaboration reads SHALL remain scope-aware and visibility-aware
- customer sessions SHALL never receive internal thread metadata, internal unread counts, internal
  file refs, or internal audit refs
- collaboration snapshot responses SHALL include `ETag = workspace_version`
- collaboration snapshot responses SHALL preserve the current route-stable reconnect spine:
  `workspace_version`, `shell_stability_token`, `last_published_sequence`, `resume_token`,
  `access_binding_hash`, and `masking_posture_fingerprint`
- collaboration snapshot responses SHALL additionally publish one grouped
  `stability_contract{{ publication_generation, guard_vector_hash, guard_vector_components{{ work_item_version_or_null, customer_thread_head_or_null, internal_thread_head_or_null, request_state_version_or_null, shell_stability_token_or_null, frame_epoch_or_null }}, last_published_sequence_or_null, resume_token_or_null, resume_capability }}` so browser, portal, and native clients can prove that their visible workspace version, lane-head guards, shell token, and frame epoch belong to the same current route generation
- collaboration snapshot responses SHALL additionally publish one grouped
  `stream_recovery_contract{{ contract_version, stream_scope_class, route_key, subject_ref,
  shell_stability_token, session_ref, session_binding_hash, access_binding_hash,
  masking_context_hash, publication_generation, frame_epoch, last_published_sequence,
  compaction_floor_sequence_or_null, resume_binding_representation, resume_binding_ref_or_null,
  delivery_window_state, rebase_reason_code_or_null, resume_token_binding_mode,
  sequence_application_policy, duplicate_delivery_policy, catch_up_policy,
  rebase_trigger_policy }}` so resume, catch-up, compaction rebase, and access rebinding remain
  machine-bound instead of being inferred from `resume_token` alone
- collaboration snapshot responses SHALL additionally preserve `shell_family`,
  `object_anchor_ref`, and one explicit `route_context` carrying the active detail route,
  mounted module, live focus anchor, lawful parent return target, and predeclared fallback target
  so browser, portal, and native clients do not remount the same work item through duplicate route
  grammars or generic recovery pages
- collaboration activity and attachment read responses SHALL preserve the same route-visible guard
  spine (`workspace_route_key`, `workspace_version`, `shell_stability_token`,
  `access_binding_hash`, `masking_posture_fingerprint`, and `latest_workspace_snapshot_ref`)
  together with explicit `active_filters` so inline paging and refresh never reconstruct visibility
  posture, request-for-info scope, or current-versus-history file partitioning locally
- collaboration stream delivery and persisted workspace cursors SHALL obey the same recovery
  grammar as manifest experience streams: exact route/session/access/masking binding, strictly
  monotonic gap-free apply within one epoch, idempotent duplicate handling by
  `(WORKSPACE, item_id, frame_epoch, workspace_sequence)`, catch-up-before-live ordering, explicit
  `REBASE_REQUIRED` on compaction or epoch drift, and explicit `ACCESS_REBIND_REQUIRED` on
  session/access/masking/schema drift
- customer sessions SHALL only receive `CollaborationActivitySlice.thread_visibility_class =
  CUSTOMER_VISIBLE` and `CollaborationAttachmentSlice.visibility_class = CUSTOMER_VISIBLE`; internal
  thread, internal attachment, and audit-trail reads SHALL remain staff-only even when the same item
  has a customer-visible workspace route
- `WorkspaceSnapshot`, `CollaborationActivitySlice`, `CollaborationAttachmentSlice`, and
  `WorkspaceStreamEvent` SHALL validate against their dedicated JSON schemas in `schemas/` so
  collaboration snapshots, inline activity paging, file lists, and stream delivery share one
  machine-readable northbound contract
- persisted collaboration resume state SHALL validate as `WorkspaceCursor` so hashed resume
  bindings, replacement snapshots, replacement stability contracts, and current
  `stream_recovery_contract` posture remain governed server artifacts rather than opaque native or
  browser cache state

## 3. Command envelope

Every northbound command SHALL carry a stable envelope. Minimum fields:

- `command_id`
- `command_type`
- `idempotency_key`
- `actor_session_ref`
- `manifest_id` where an existing manifest is targeted, else `null`
- `tenant_id`
- `client_id`
- `period` where applicable
- `requested_scope[]` where applicable
- `mutation_precondition_binding{ profile_code, target_scope_classes[], required_guard_fields[],
  stale_guard_families[], requires_live_freshness, invalidates_on_visibility_shift }`
- `if_match_decision_bundle_hash` where the action depends on the currently viewed terminal bundle
- `if_match_shell_stability_token` where the action is initiated from the live shell
- `if_match_frame_epoch` where the action depends on live streamed posture
- `if_match_work_item_version` where the action depends on the current collaboration workspace state
- `if_match_internal_head_sequence` where the action appends to the internal-only collaboration lane
- `if_match_customer_head_sequence` where the action appends to the customer-visible collaboration lane
- `if_match_approval_pack_hash` where the action depends on the exact approval pack the client reviewed
- `if_match_client_portal_workspace_version` where the action depends on the currently visible
  portal workspace or contextual client route
- `if_match_policy_snapshot_hash` where the action depends on a governance snapshot, role matrix,
  retention policy frame, or authority-link inventory state
- `if_match_dependency_topology_hash` where the action depends on a previously rendered governance
  simulation, blast-radius estimate, or approval-threshold computation
- `simulation_basis_hash` where the action depends on the exact previously rendered governance
  simulation basis
- `mutation_basis_contract` where the action commits a previously reviewed governance simulation
- `payload{}`
- `requested_at`

Rules:

- `command_id` SHALL be client-generated and stable across safe retries of the same intent.
- `idempotency_key` SHALL bind to actor/session, semantic command target, and command payload. A new
  human intent MUST use a new key even if the manifest target is the same.
- `payload{}` SHALL contain only domain inputs required for the command. It SHALL NOT embed authority
  tokens, raw audit signatures, or client-derived legal-state flags.
- every command SHALL declare exactly one `mutation_precondition_binding` whose
  `required_guard_fields[]` and `stale_guard_families[]` match the true mutation family; the backend
  SHALL reject envelopes that omit one required guard, carry an unrelated stale guard, or mix guard
  fields from multiple profiles
- every command SHALL additionally publish one
  `truth_boundary_contract{ artifact_role = COMMAND_REQUEST, authoritative_source_policy = TARGET_DURABLE_IDS_ONLY, projection_input_policy = STALE_GUARDS_ONLY, durable_writeback_policy = NO_DIRECT_STATE_WRITEBACK, recovery_basis_policy = DURABLE_IDS_AND_RECEIPTS_ONLY, authoritative_record_families[], observable_projection_families[] }`
  so legality, retry, and recovery semantics stay bound to durable command-side ids and receipts
  rather than to read-side projection identity
- commands that alter tenant-wide policy, role grants, authority links, retention policy, legal holds,
  or erasure posture SHALL carry `if_match_policy_snapshot_hash` and, when the command is based on a
  prior governance simulation, the matching `if_match_dependency_topology_hash` / `simulation_basis_hash`
  plus the exact reviewed `mutation_basis_contract` so the backend can reject writes formed from
  stale control-plane state, superseded blast-radius assumptions, or changed approval posture
- governance simulation-commit commands SHALL be rejected when
  `mutation_basis_contract.commit_authority_posture = PREVIEW_ONLY`; low-confidence preview styling
  SHALL never outrun backend legality
- commands that acknowledge or sign client approval content SHALL carry
  `if_match_decision_bundle_hash`, `if_match_shell_stability_token`, `if_match_frame_epoch`, and
  `if_match_approval_pack_hash`; stale or omitted pack or render-frame binding SHALL fail closed
  rather than allowing sign-off against a derived or superseded summary
- approval-pack acknowledgement and signature commands SHALL target `MANIFEST` scope and SHALL retain
  the non-null `manifest_id` for the pack they are signing or acknowledging; collaboration, portal
  help/upload, and governance commands SHALL NOT overload `manifest_id` as a secondary lineage hint
- commands formed from a client portal route, resumable draft, or contextual client-detail view
  SHALL carry `if_match_client_portal_workspace_version` unless they already bind to a stricter
  object-level stale guard such as `if_match_approval_pack_hash` or a governed request/upload
  version token
- `if_match_client_portal_workspace_version` is a portal-route guard, not a generic concurrency
  integer. It SHALL appear only on portal route-mutation command families such as onboarding
  completion, upload finalization, or contextual help; approval-pack acknowledgement and signature
  commands SHALL rely on the stricter `if_match_approval_pack_hash` instead of carrying both guards
- `if_match_request_state_version` is the durable request-for-info concurrency anchor. It SHALL
  appear only on command families that mutate or answer the current `RequestInfoRecord`, with
  `RESPOND_TO_REQUEST_INFO` as the baseline required caller
- collaboration command families SHALL keep their scope family and stale guards aligned: state
  mutations bind `if_match_work_item_version` plus `if_match_shell_stability_token`, internal append
  commands bind `if_match_work_item_version`, the internal head, and the shell token, and
  customer-visible append commands bind `if_match_work_item_version`, the customer head, and the
  shell token without crossing lanes
- governance command families SHALL target `GOVERNANCE` scope, and client-portal command families
  SHALL retain a non-null `client_id` and SHALL NOT target governance scope
- Commands that merely change local view state (drawer open/close, compare pin, sort order, filter
  chips, reduced-motion preference) SHALL remain local and SHALL NOT traverse this API.

`CommandEnvelope` SHALL validate against `schemas/command_envelope.schema.json` so client-generated
idempotency, target scoping, and stale-view guard bindings remain machine-readable before they become
durable `ApiCommandReceipt`s.

### 3.1 Governance command families

The Admin/Governance Console SHALL still write through `POST /v1/commands`.
At minimum, support command types equivalent to:

- `ADMIN_UPDATE_TENANT_SETTINGS`
- `ADMIN_STAGE_POLICY_CHANGE`
- `ADMIN_ASSIGN_PRINCIPAL_ROLE`
- `ADMIN_REMOVE_PRINCIPAL_ROLE`
- `ADMIN_SET_PRINCIPAL_ATTRIBUTES`
- `ADMIN_LINK_AUTHORITY`
- `ADMIN_RELINK_AUTHORITY`
- `ADMIN_UNLINK_AUTHORITY`
- `ADMIN_APPLY_RETENTION_POLICY`
- `ADMIN_APPLY_LEGAL_HOLD`
- `ADMIN_RELEASE_LEGAL_HOLD`
- `ADMIN_EXECUTE_ERASURE`
- `ADMIN_EXPORT_AUDIT_SLICE`

Rules:

- commands that widen access, change step-up posture, alter retention minimums, or relink authority
  scope SHALL require step-up or explicit approval according to the actor/authority model
- unmasked audit export and irreversible retention actions SHALL never be accepted from a stale
  governance view
- governance commands SHALL produce ordinary durable command receipts rather than bespoke admin-only
  transport acknowledgements

### 3.2 Client portal command families

Client portal command families SHALL at minimum include:

- `CLIENT_PORTAL_COMPLETE_ONBOARDING_STEP`
- `CLIENT_PORTAL_FINALIZE_UPLOAD`
- `CLIENT_PORTAL_ACKNOWLEDGE_APPROVAL_PACK`
- `CLIENT_PORTAL_SIGN_APPROVAL_PACK`
- `CLIENT_PORTAL_REQUEST_HELP`

Portal command rules:

- sign and acknowledgement commands SHALL carry stale-view guards plus `if_match_approval_pack_hash`
  for the pack the client actually saw
- onboarding completion, contextual help, and other portal mutations that depend on the current
  route projection SHALL carry `if_match_client_portal_workspace_version` or a stricter object-level
  version token so stale portal views fail closed
- sign-off commands SHALL include fresh step-up proof whenever the approval pack or frozen policy marks step-up as required
- finalize-upload commands SHALL reference an existing governed `upload_session_id`; raw file bytes SHALL NOT traverse `POST /v1/commands`
- `CLIENT_PORTAL_REQUEST_HELP` SHALL allocate a durable `PortalHelpRequest`; when the request targets
  a live shared work item it SHALL also allocate the linked immutable `RequestInfoRecord` used by
  collaboration surfaces

### 3.3 Collaboration command families

Collaboration commands SHALL continue to use `POST /v1/commands`.
At minimum, support command types equivalent to:

- `ASSIGN_WORK_ITEM`
- `REASSIGN_WORK_ITEM`
- `ESCALATE_WORK_ITEM`
- `ADD_INTERNAL_NOTE`
- `ADD_CUSTOMER_COMMENT`
- `REQUEST_CUSTOMER_INFO`
- `RESPOND_TO_REQUEST_INFO`
- `CHANGE_WORK_ITEM_STATUS`
- `SET_WORK_ITEM_DUE_DATES`

Rules:

- collaboration commands SHALL use `if_match_work_item_version` for state-changing mutations and the correct thread-head sequence guard for append operations
- `ADD_CUSTOMER_COMMENT`, `REQUEST_CUSTOMER_INFO`, and `RESPOND_TO_REQUEST_INFO` SHALL be rejected on `INTERNAL_ONLY` items
- collaboration commands SHALL return ordinary durable command receipts and SHALL NOT produce duplicate activity or duplicate audit events under safe retry

## 4. Command receipt

Every accepted or duplicate-replayed command SHALL produce a durable `ApiCommandReceipt`. Minimum
fields:

- `artifact_type = ApiCommandReceipt`
- `receipt_id`
- `tenant_id`
- `client_id`
- `principal_ref`
- `session_ref`
- `command_id`
- `command_type`
- `target_scope_class in {MANIFEST, WORK_ITEM, GOVERNANCE}`
- `manifest_id`
- `work_item_id`
- `governance_target_ref`
- `request_hash`
- `dependency_topology_hash`
- `simulation_basis_hash`
- `latest_mutation_basis_contract_or_null`
- `idempotency_key`
- `acceptance_state in {ACCEPTED, DUPLICATE_REPLAY, REJECTED_STALE_VIEW, REJECTED_POLICY, REJECTED_INVALID, EXPIRED}`
- `original_acceptance_state` when the receipt is retained as an expired projection
- `duplicate_of_receipt_id`
- `projection_stream_class in {MANIFEST_EXPERIENCE, WORKSPACE, NONE}`
- `latest_projection_sequence`
- `latest_projection_ref`
- `semantic_action_id`
- `reason_codes[]`
- `mutation_precondition_binding`
- `stale_guard_family` where the rejection is a stale-view failure
- `latest_stale_guard_value` where the rejection is a stale-view failure
- `activity_refs[]`, `audit_event_refs[]`, and `notification_refs[]` where downstream side effects were published
- `result_ref`
- `accepted_at`
- `expires_at`

Receipt rules:

- the receipt SHALL be persisted before downstream side effects are published;
- safe retries with equivalent `request_hash` and `idempotency_key` SHALL return the original
  receipt rather than enqueueing duplicate work;
- `ACCEPTED` and `DUPLICATE_REPLAY` are success classes;
- the receipt SHALL preserve the true command target. Manifest, collaboration, and governance
  commands SHALL NOT be collapsed onto one overloaded `manifest_id` field;
- `semantic_action_id` plus any published activity/audit/notification refs SHALL remain replay-safe
  so duplicate replays can prove they returned the same downstream side effects;
- every receipt SHALL preserve the exact `mutation_precondition_binding` from the accepted or rejected
  command so browser, native, and automation clients can audit which stale-write profile governed the
  attempt;
- every receipt SHALL additionally publish one
  `truth_boundary_contract{ artifact_role = BOUNDARY_RECEIPT, authoritative_source_policy = DURABLE_COMMAND_RESULTS_ONLY, projection_input_policy = STALE_GUARDS_AND_RECOVERY_MIRRORS_ONLY, durable_writeback_policy = APPEND_ONLY_BOUNDARY_EVIDENCE, recovery_basis_policy = RECEIPT_PLUS_DURABLE_RESULTS_ONLY, authoritative_record_families[], observable_projection_families[] }`
  so recovery logic can distinguish durable command-result evidence from observational projection
  mirrors;
- success-class receipts SHALL retain at least one authoritative recovery anchor such as
  `result_ref`, `latest_projection_ref`, or published side-effect refs so `GET /commands/{command_id}`
  can recover meaningfully after a lost POST response;
- `latest_projection_ref` is an observational read-side mirror only and SHALL NOT be the sole
  recovery basis for a success-class receipt; if a projection ref is published, at least one durable
  recovery anchor such as `result_ref` or `audit_event_refs[]` SHALL also be present
- expired receipts whose original acceptance posture was `ACCEPTED` or `DUPLICATE_REPLAY` SHALL
  preserve the same recovery-anchor family rather than collapsing into a bare expiry marker;
- `duplicate_of_receipt_id` SHALL never point back to the receipt itself;
- `REJECTED_STALE_VIEW` SHALL identify the stale guard family, the current authoritative
  `latest_stale_guard_value`, and the latest projection ref the client must rebase against so retry,
  audit, and automation flows do not have to dereference a second artifact just to discover the live
  guard value;
- `REJECTED_STALE_VIEW` SHALL additionally publish `latest_stability_contract_or_null` so the client
  receives one grouped current marker generation rather than reassembling recovery state from stale
  guard echoes, projection refs, and transport-local cache;
- governance receipts that preserve `dependency_topology_hash` / `simulation_basis_hash` SHALL also
  preserve `latest_mutation_basis_contract_or_null`, and
  `stale_guard_family = MUTATION_BASIS_CONTRACT_HASH` SHALL mirror
  `latest_mutation_basis_contract_or_null.basis_contract_hash`
- `stale_guard_family` SHALL stay aligned with the true command target: manifest-shell and approval
  pack guards bind manifest receipts, request-info state guards bind the current request-info
  mutation family, portal-route guards bind only client-portal route mutations, collaboration head
  or workspace guards bind work-item receipts, and policy guards bind governance receipts;
- `latest_projection_sequence` SHALL reflect the relevant projection stream for the target:
  manifest experience, collaboration workspace, or `NONE` for commands that do not advance a live
  read stream;
- receipts SHALL remain queryable by `command_id` until at least `expires_at`, even when the original
  POST response was lost or the client reconnects later;
- `EXPIRED` is a terminal receipt projection, not a separate success class, and SHALL remain
  retention-visible for audit and duplicate-suppression analysis while still preserving the original
  acceptance posture that expired;
- stale-view, policy, and shape failures SHALL remain typed failures and SHALL NOT be disguised as
  accepted async work.

`ApiCommandReceipt` SHALL validate against `schemas/api_command_receipt.schema.json` so command
retries, duplicate replays, and stale-view failures share one machine-readable contract across
browser, native, and automation clients.

## 5. Problem response contract

Every non-successful response SHALL emit a machine-readable problem envelope with at minimum:

- `problem_code`
- `title`
- `detail`
- `reason_codes[]`
- `retryable`
- `correlation_id`
- `manifest_id` where applicable
- `latest_decision_bundle_ref` where applicable
- `latest_workspace_snapshot_ref` where applicable
- `latest_approval_pack_ref` where applicable
- `latest_client_portal_workspace_ref` where applicable
- `latest_upload_session_ref` where applicable
- `latest_policy_snapshot_ref` where applicable
- `latest_command_receipt_ref` where applicable
- `mutation_precondition_binding_or_null` where the failure is a stale-view or supersession rebase
- `stale_guard_family` where the failure is a stale-view or supersession rebase
- `latest_stale_guard_value` where the failure is a stale-view or supersession rebase
- `latest_resume_token` or `rebase_required = true` where applicable
- `actionability_state`
- `suggested_detail_surface_code`

This is the transport-layer counterpart to the error/remediation model: it is user-consumable, but it
must remain derivable from typed backend truth rather than free-form prose alone.

Problem-envelope rules:

- stale, superseded, expired, or replay-related failures SHALL include the narrowest authoritative
  recovery ref for the affected object class rather than only a generic message;
- where the failure is caused by stale view state, the problem envelope SHALL additionally echo the
  exact `stale_guard_family` plus the current authoritative `latest_stale_guard_value` so clients
  can rebase and reissue intent from one typed failure object instead of guessing the current guard
  basis from a follow-up fetch;
- stale or rebase-required problem envelopes SHALL additionally publish
  `latest_stability_contract_or_null` so snapshot, stream, and cache recovery can move to the same
  grouped marker generation in one step;
- stale or rebase-required problem envelopes SHALL additionally publish
  `mutation_precondition_binding_or_null` so retry flows, quick actions, and automation clients can
  recover the exact guard bundle that must be refreshed before reissuing intent;
- every problem envelope SHALL additionally publish one
  `truth_boundary_contract{ artifact_role = BOUNDARY_RECEIPT, authoritative_source_policy = DURABLE_COMMAND_RESULTS_ONLY, projection_input_policy = STALE_GUARDS_AND_RECOVERY_MIRRORS_ONLY, durable_writeback_policy = APPEND_ONLY_BOUNDARY_EVIDENCE, recovery_basis_policy = RECEIPT_PLUS_DURABLE_RESULTS_ONLY, authoritative_record_families[], observable_projection_families[] }`
  so typed failure recovery remains anchored to durable receipt truth rather than to whichever
  projection happened to be visible when the problem surfaced;
- manifest-shell failures SHALL prefer `latest_decision_bundle_ref` and/or `latest_resume_token`;
- collaboration failures SHALL prefer `latest_workspace_snapshot_ref`;
- client portal route or contextual-detail failures SHALL prefer `latest_client_portal_workspace_ref`;
- client sign-off failures SHALL prefer `latest_approval_pack_ref`;
- upload-session control failures SHALL prefer `latest_upload_session_ref`;
- portal recovery SHALL publish the narrowest authoritative portal ref for the failing object class:
  one of `latest_client_portal_workspace_ref`, `latest_approval_pack_ref`, or
  `latest_upload_session_ref`, never multiple portal object refs in the same envelope;
- one problem envelope SHALL publish at most one non-manifest recovery family among collaboration,
  portal, and governance refs so the client does not guess which shell to rebase
- projection recovery refs are observational only; if a problem envelope publishes any
  `latest_decision_bundle_ref`, `latest_workspace_snapshot_ref`, `latest_client_portal_workspace_ref`,
  `latest_approval_pack_ref`, `latest_upload_session_ref`, or `latest_policy_snapshot_ref`, it
  SHALL also publish at least one durable `latest_command_receipt_ref`
- manifest `latest_resume_token` recovery SHALL remain manifest-only and SHALL NOT be mixed with
  collaboration, portal, or governance recovery refs
- portal-facing recovery hints SHALL keep `suggested_detail_surface_code` within customer-safe
  surfaces rather than pointing browser or mobile clients at expert-only modules
- duplicate-suppression or ambiguous transport failures MAY include `latest_command_receipt_ref` so
  clients can resume from the durable receipt instead of replaying intent blindly.

`ProblemEnvelope` SHALL validate against `schemas/problem_envelope.schema.json` so typed recovery
refs, rebase posture, and failure actionability stay stable across browser, native, and automation
clients.

## 6. Concurrency and stale-view rules

The backend SHALL reject stale or conflicting commands rather than guessing user intent.

1. Commands that approve, override, submit, or materially change remediation state SHALL require at
   least one stale-view guard.
2. If the currently viewed `DecisionBundle` is stale, the backend SHALL return `409 VIEW_STALE` with
   the latest bundle reference plus the current stale-guard value and SHALL NOT auto-rebase the
   action.
3. If the live shell posture changed such that the primary object/action is no longer valid, the
   backend SHALL reject using `if_match_shell_stability_token`.
4. `frame_epoch` changes SHALL force client rebase before any destructive or filing-capable action is
   accepted.
5. governance mutations formed from an outdated `policy_snapshot_hash`, outdated
   `dependency_topology_hash` / `simulation_basis_hash`, stale authority-link version, or stale
   retention frame SHALL be rejected with a typed stale-view error rather than merged heuristically.
6. client approval and sign-off commands SHALL fail closed when `if_match_approval_pack_hash` has
   been superseded or when the visible summary no longer matches the current legal pack.
7. portal mutations formed from an outdated `workspace_version` SHALL fail closed with a typed
   stale-view response that includes `latest_client_portal_workspace_ref` plus the current
   `CLIENT_PORTAL_WORKSPACE_VERSION` unless a stricter object-level rebase target is available.
8. collaboration mutations formed from an outdated `workspace_version` or wrong thread-head sequence SHALL fail closed with a typed stale-view response rather than being merged heuristically.
9. Duplicate safe retries SHALL win over race conditions; incompatible concurrent intents SHALL fail
   closed and open a fresh review path when needed.

## 7. Stream and reconnect rules

The stream contract SHALL preserve ordered, reconnect-safe delivery.

- `experience_sequence` SHALL be strictly monotonic within `(manifest_id, frame_epoch)`.
- `resume_token` SHALL bind to `manifest_id`, `shell_route_key`, `shell_stability_token`,
  `frame_epoch`, the last acknowledged sequence, the last published sequence frontier, masking
  posture, schema compatibility, and the authenticated session/access-binding context.
- the manifest stream SHALL additionally publish one `stability_contract` on snapshots, live events,
  and cursors; its `publication_generation` SHALL advance whenever displayed truth or mutation
  safety changes materially, and its `guard_vector_hash` SHALL change whenever any governing stale-
  view marker changes even if the shell family remains mounted
- reuse of a `resume_token` from the wrong session, tenant, or principal class SHALL fail closed.
- the stream SHALL emit typed events at minimum for `experience.delta`, `experience.snapshot`,
  `terminal.bundle`, and `heartbeat`.
- duplicate delta delivery is legal; clients SHALL treat delivery as idempotent by sequence number.
- if history has compacted or `frame_epoch` advanced, the server SHALL return `409 REBASE_REQUIRED`
  plus a fresh snapshot reference instead of inventing missing deltas.
- persisted manifest cursors SHALL retain `latest_snapshot_ref`, `last_published_sequence`,
  `session_binding_hash`, and `access_binding_hash` so reconnect can distinguish ordinary rebase from
  privilege, masking, or step-up lineage drift.
- non-live cursor states SHALL be explicit. `REBASED`, `REVOKED`, `EXPIRED`, and `CLOSED` cursors
  SHALL carry `invalidated_at` and `invalidation_reason_code`; `REBASED` SHALL additionally carry
  the replacement snapshot reference required for recovery.
- `last_ack_sequence` SHALL never exceed `last_published_sequence`, and a rebase cursor SHALL point
  at a replacement snapshot different from the last snapshot the client acknowledged.
- `invalidated_at` SHALL not predate `last_seen_at`; expired cursors SHALL invalidate on or after
  `expires_at`.
- catch-up and snapshot rebase SHALL preserve the core shell guarantees from
  `low_noise_experience_contract.md` and SHALL not require a destructive route reset.
- `workspace_sequence` SHALL be strictly monotonic within `(item_id, frame_epoch)` for collaboration
  workspace streams.
- collaboration `resume_token`s SHALL additionally bind to `item_id`, `workspace_route_key`,
  `workspace_version`, the last acknowledged workspace sequence, and the authenticated session context.
- every `WorkspaceStreamEvent` SHALL carry the current `shell_stability_token` and
  `access_binding_hash` alongside `workspace_version` and `resume_token` so collaboration clients can
  detect route-visible guard drift without reconstructing the guard vector locally.
- every `WorkspaceStreamEvent` SHALL additionally carry the grouped current `stability_contract` so
  `workspace_version`, lane-head guards, shell token, and frame epoch cannot be replayed as a mixed
  generation after reconnect, catch-up, or native restore.
- every `WorkspaceStreamEvent` SHALL additionally carry the current `shell_family` and
  `object_anchor_ref` so catch-up, rebase, and native restoration all remain pinned to the same
  work-item shell owner rather than inferring ownership from transport-local route strings.
- customer or delegate sessions SHALL never be able to resume staff-scoped workspace streams, internal
  threads, or internal audit channels by reusing a token from a different visibility posture.
- collaboration streams SHALL emit typed events at minimum for `workspace.delta`, `workspace.snapshot`,
  `activity.appended`, `notification.badge`, and `heartbeat`.
- `workspace.delta`, `activity.appended`, and `notification.badge` SHALL additionally carry one
  shared `queue_projection` envelope for split lane badge counts, canonical row-order basis, and
  deferred focus-lock posture; `workspace.snapshot`, `audit.appended`, and `heartbeat` SHALL clear it.
- if collaboration history has compacted, `frame_epoch` has advanced, or the route-scoped workspace
  visibility changed, the server SHALL return `409 REBASE_REQUIRED` plus a fresh workspace snapshot
  reference instead of inventing missing activity.

`ExperienceStreamEvent` and `WorkspaceStreamEvent` SHALL validate against
`schemas/experience_stream_event.schema.json` and `schemas/workspace_stream_event.schema.json` so
typed event kinds, route-scoped ordering, and authoritative payload refs remain reconnect-safe and
client-stable.

`ExperienceCursor` SHALL validate against `schemas/experience_cursor.schema.json` so resume-token
binding, route/shell lineage, rebase posture, and expiry or revocation semantics remain
machine-readable and client-stable.

## 8. Session, browser, and native-client rules

The broader product SHALL treat browser, native desktop, and session posture as governed security
boundaries.

- browser sessions SHALL use secure, `HttpOnly`, same-site session cookies plus an anti-CSRF binding,
  or an equivalent same-origin session mechanism with demonstrably equivalent protections;
- native macOS operator sessions SHALL authenticate through a system-browser or platform auth session,
  SHALL store only product-session artifacts in Keychain-class storage, and SHALL NOT persist raw
  authority credentials on device;
- interactive browser and native sessions SHALL resolve to human principals; machine or external
  automation SHALL not masquerade as an interactive product session;
- every authenticated session SHALL resolve to one effective principal class, client scope,
  delegation basis, and masking posture before route composition, stream issuance, upload-session
  allocation, or command acceptance; deep links and invite links SHALL narrow into that bound scope
  and SHALL NOT widen it;
- native clients MAY persist `DecisionBundle`, `ExperienceDelta` snapshots, view preferences, and
  resume metadata for fast relaunch, but all persisted state SHALL remain derivable from server truth
  and SHALL be invalidated on revocation, tenant switch, masking-posture change, or schema
  incompatibility;
- non-browser automation clients MAY use short-lived bearer credentials, but they SHALL still emit
  `command_id` and `idempotency_key`;
- embedded web views, if any, SHALL be limited to low-risk documentation/help content and SHALL NOT be
  trusted as the primary authority for sign-in, step-up completion, or HMRC-only task handoff;
- invite-link or emailed deep-link entry into the client portal SHALL upgrade into a normal authenticated session before document upload, acknowledgement, or sign-off actions are accepted;
- step-up completion SHALL rotate the effective session challenge state so a pre-step-up command cannot
  be replayed afterward without revalidation;
- session revocation SHALL invalidate outstanding resume tokens, upload-session control operations, and future command acceptance.
- an invalidated native device binding SHALL surface as a revoked session, and session timestamps
  (`issued_at`, `step_up_completed_at`, `last_seen_at`, `revoked_at`, `expires_at`) SHALL remain
  monotonic rather than implying time travel.

`ActorSession` and `PrincipalContext` SHALL validate against their dedicated schemas, and any
reusable backend-side `AUTHORIZE(...)` result carried across request boundaries SHALL validate
against `schemas/authorization_decision.schema.json`, so session posture and bound access scope stay
stable across browser refresh, native relaunch, and automation retries. Where the action is a
governance mutation, that reusable authorization result SHALL also preserve any non-null
`bounded_safe_mutation` / `approval_requirement` posture so commit safety does not devolve into a
transport-local guess.

## 9. Invariants

1. no manifest-adjacent mutation without a durable command receipt
2. no stale approval/override/submit command without explicit backend rejection
3. no reconnect path that depends on client-side reconstruction of legal transitions
4. no cache key for northbound read surfaces that omits tenant, principal class, masking posture,
   manifest identity, and session/client identity
5. no accepted write command that depends on untrusted client-derived legal-state flags
6. no session or command surface that emits raw authority tokens, secrets, or unredacted sensitive
   payloads

## 10. One-sentence summary

The northbound API and session contract turns the blueprint into a production-safe product surface by
making commands idempotent, views concurrency-safe, and reconnect/stream behavior deterministic.
## FE-25 Cache Isolation

Every reusable northbound read surface now carries `cache_isolation_contract` as the authoritative cache identity envelope. Shared-cache, browser-cache, native-cache, and hydration reuse is lawful only when tenant, session binding, access binding, masking posture, route identity, canonical object identity, projection version, and preview subject all remain identical to the mounted surface. See `cache_isolation_and_secure_reuse_contract.md`.
