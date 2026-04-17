# Test vectors (scenarios)

These vectors map one-to-one with the embodiment set in `embodiments_and_examples.md`.
Taken together, they are also the scenario-side closure set for the current end-to-end system objective rather than a loose append-only list.
`constraint_traceability_register.json` is the live machine-checkable map from named constraints to
their authoritative refs and vector coverage; this file supplies the scenario evidence referenced by
that register.

- `TV-01..TV-12` cover core engine, authority, amendment, retention, and multi-product embodiments.
- `TV-13..TV-25` cover low-noise shell continuity, northbound recovery, release, cache isolation,
  and replay-safe lifecycle behavior.
- `TV-26..TV-31` cover client portal shell, uploads, approvals, onboarding, and contextual recovery.
- `TV-32..TV-39A` cover collaboration, work inbox, customer request list, governance routes, and
  responsive same-shell continuity.
- `TV-40..TV-50` cover replay exactness, recovery children, twin-state comparison, and
  authority-reconciliation edge cases.
- `TV-51..TV-54` cover nightly recovery, digest publication, and operator escalation posture.
- `TV-55..TV-62` cover trust, proof closure, filing-readiness invalidation, and explanation-failure
  safeguards.
- `TV-63..TV-70` cover amendment freshness, supersession, duplicate-send suppression, delayed
  acknowledgement handling, and authority-ingress quarantine posture.
- `TV-71..TV-78` cover scope-binding proof, branch-selection proof, pre-seal gate tape closure,
  start-claim race closure, schema-evolution reader-window governance, and release-candidate
  evidence binding.
- `TV-79..TV-79D` cover recovery-tier governance, checkpoint reopen gating, broker-loss rebuild
  safety, post-restore privacy and audit closure, canary abort posture, and fail-forward ownership.
- `TV-80..TV-80C` cover schema-bundle compatibility gate binding across reader-window,
  native-client, and rollback controls.
- `TV-81..TV-81D` cover release-verification manifest automation, canonical gate assembly,
  companion evidence binding, and explicit approval or supersession lineage.
- `TV-79E..TV-79I` cover provenance graph partition contracts, explicit continuation/replay/recovery/
  supersession lineage hops, and proof-boundary non-flattening.

## Prompt-stage ownership by range

- `TV-01..TV-12` are primarily closed by `BE-12..BE-17`, `BE-22`, `BE-23`, `SYS-01`, and `SYS-04`.
- `TV-13..TV-25` are primarily closed by `FE-19..FE-29`, `FE-32`, `FE-33`, `BE-03`, `BE-18..BE-25`, `SYS-01`, and `SYS-04`.
- `TV-26..TV-31` are primarily closed by `FE-01..FE-10`, `FE-30`, `FE-33`, `BE-01..BE-05`, `BE-21`, `BE-23`, `BE-25`, `SYS-01`, and `SYS-04`.
- `TV-32..TV-39A` are primarily closed by `FE-11..FE-18`, `FE-22..FE-24`, `FE-31..FE-33`, `BE-05`, `BE-11`, `BE-17`, `BE-21`, `BE-23`, `BE-24`, `BE-25`, `SYS-01`, and `SYS-04`.
- `TV-40..TV-70` are primarily closed by `BE-07`, `BE-09`, `BE-10`, `BE-14`, `BE-16`, `BE-18..BE-25`, `FE-25`, `FE-26`, `FE-29`, `FE-32`, `SYS-01`, `SYS-02`, and `SYS-04`.
- `TV-71..TV-78` are primarily closed by `BE-10`, `BE-11`, `BE-12`, `BE-13`, `BE-48`, `FE-25`,
  `SYS-01`, and `SYS-04`.
- `TV-79..TV-79D` are primarily closed by `BE-49`, `BE-48`, `BE-25`, `SYS-01`, and `SYS-04`.
- `TV-80..TV-80C` are primarily closed by `BE-48`, `BE-49`, `BE-25`, `SYS-01`, and `SYS-04`.
- `TV-81..TV-81D` are primarily closed by `BE-48`, `BE-49`, `BE-25`, `SYS-01`, and `SYS-04`.
- `TV-79E..TV-79I` are primarily closed by `BE-25`, `BE-49`, `SYS-01`, and `SYS-04`.

## TV-01: Direct-subject quarterly update from structured records
- Embodiment ID: `EMB-01`
- Given `SUBJECT_SELF` with valid authority link and one clean business partition
- When a periodic compliance run is executed from structured records
- Then the run produces a sealed manifest, compute result, trust summary, filing packet, submission record, and obligation update

## TV-02: Agent-led quarterly update across multiple business partitions
- Embodiment ID: `EMB-02`
- Given an authorized agent acting for a client with two business partitions
- When the engine computes and submits partition-aware obligations
- Then partition integrity is preserved and outputs remain separated by business/obligation scope

## TV-03: In-year correction carried into the next quarterly update
- Embodiment ID: `EMB-03`
- Given a previously submitted quarterly update and newly corrected source facts before final declaration
- When a new working-state manifest is created
- Then the correction is carried into later periodic/year-end processing without opening an amendment case

## TV-04: End-of-year final declaration with authority calculation
- Embodiment ID: `EMB-04`
- Given year-end data sufficient for finalisation and a valid final-declaration provider profile
- When the engine triggers and retrieves the authority calculation and then submits final declaration
- Then the filed baseline is calculation-linked and authority-reconciled

## TV-05: Final declaration blocked by material parity divergence
- Embodiment ID: `EMB-05`
- Given authority comparison is available and a critical material difference exists
- When parity and trust are evaluated
- Then filing progression is capped at review or blocked until approved scoped remediation exists

## TV-05A: Threshold-edge parity equality stays material across runtimes
- Given a comparable field whose exact-decimal breach ratio is exactly `1.0` under the frozen
  threshold profile
- When `EVALUATE_PARITY(...)` runs on different workers, languages, or replay environments
- Then the field is always classified `MATERIAL_DIFFERENCE`, the aggregate result does not flip to
  `MINOR_DIFFERENCE`, and `dominant_reason_code` remains byte-stable

## TV-05B: Critical-field materiality outranks dilute aggregate pressure
- Given one `CRITICAL` field is materially breached while many non-critical fields remain exact
  matches
- When aggregate parity classification is computed
- Then the result remains `MATERIAL_DIFFERENCE` or `BLOCKING_DIFFERENCE` according to the decisive
  critical field, and low average pressure does not demote the case to `MINOR_DIFFERENCE`

## TV-05C: Invalid comparison set fails closed instead of degrading to match
- Given parity construction encounters duplicate field codes, non-positive weights, or other frozen
  comparison-set integrity failures
- When `ParityResult` is persisted and `PARITY_GATE(...)` evaluates it
- Then the artifact records `comparison_set_state = INVALID`,
  `parity_classification = NOT_COMPARABLE`, `parity_score = 0`, and the gate blocks or reviews the
  case according to the frozen comparison requirement instead of advertising a soft match

## TV-06: Post-finalisation material drift leading to amendment
- Embodiment ID: `EMB-06`
- Given a confirmed final-declaration baseline and new material facts within the amendment window
- When drift is classified and amendment eligibility is evaluated
- Then the engine follows the intent-to-amend / confirm-amendment path before promoting a new baseline

## TV-07: Out-of-band filing discovered by authority reconciliation
- Embodiment ID: `EMB-07`
- Given a working case but authority state already exists outside the active packet chain
- When reconciliation reads the authority-held status
- Then submission state becomes `OUT_OF_BAND` and the engine opens review rather than duplicate filing

## TV-08: Authority correction observed after filing
- Embodiment ID: `EMB-08`
- Given a confirmed filed baseline and a later authority-exposed correction
- When authority reconciliation detects the changed position
- Then the engine records `AUTHORITY_CORRECTION`, rebuilds parity/trust, and routes to review

## TV-09: Retention-limited replay and enquiry defense
- Embodiment ID: `EMB-09`
- Given some upstream evidence is expired or pseudonymised but downstream artifacts remain retained
- When provenance replay or enquiry-pack generation is requested
- Then the graph remains structurally valid and returns limitation/tombstone notes rather than silent gaps

## TV-10: Analysis-only counterfactual run
- Embodiment ID: `EMB-10`
- Given an approved compliance manifest and a draft/candidate config profile
- When a child manifest is run in `ANALYSIS` mode
- Then outputs remain explicitly `analysis_only` and do not contaminate compliance truth

## TV-11: Degraded-data review path with no filing
- Embodiment ID: `EMB-11`
- Given a critical domain is missing or critical evidence has been erased
- When limited compute and trust evaluation run
- Then filing is blocked, trust degrades to `INSUFFICIENT_DATA` or `RED`, and remediation tasks are opened

## TV-12: Multi-product compatible chain
- Embodiment ID: `EMB-12`
- Given one logical case spanning bank import, bookkeeping data, document capture, and authority submission across multiple products
- When the engine freezes and canonicalizes the combined source chain
- Then product-of-origin and transformation lineage remain preserved inside one manifest-scoped decision bundle

## TV-13: Pre-manifest step-up uses the same decision grammar
- Given access policy returns `REQUIRE_STEP_UP` before manifest allocation
- When the client renders the access-blocked response
- Then the response preserves `attention_state`, explicit `actionability_state`, plain reason text, and the same ordered detail entry grammar used by the mounted low-noise shell

## TV-14: Reconnect restores no-safe-action posture and drawer focus
- Given a blocked or waiting manifest with `actionability_state = NO_SAFE_ACTION`, an active detail module, and a live `focus_anchor_ref`
- When the client reloads from `ExperienceDelta` catch-up or terminal bundle reload
- Then the shell restores the same detail module, keeps focus on the surviving object, and does not invent a fallback primary action

## TV-15: Low-noise frame emits only four peer shell surfaces
- Given `experience_profile = LOW_NOISE` and a manifest whose richer observatory read models are all materialized
- When `BUILD_LIVE_EXPERIENCE_FRAME(...)` emits a reconnect-safe frame or `ExperienceDelta`
- Then the top-level surface order contains only `CONTEXT_BAR`, `DECISION_SUMMARY`, `ACTION_STRIP`, and `DETAIL_DRAWER`, while richer observatory surfaces remain accessible only as drawer modules or explicit compare/audit payloads

## TV-16: Verbose source text is trimmed without losing legal meaning
- Given authority, drift, or audit inputs whose raw prose exceeds the low-noise shell copy budget
- When summary, context, action, and detail-entry microcopy are built
- Then the shell retains machine-stable reason and action codes, trims visible copy to budget, and routes surplus detail into the relevant drawer module instead of overflowing the primary shell

## TV-17: Multiple simultaneous issues collapse to one dominant posture
- Given a manifest with a hard block, a masking limitation, and a late-data notice at the same time
- When `DERIVE_ATTENTION_POLICY(...)` ranks visible concerns for the low-noise shell
- Then one dominant primary issue is surfaced, remaining concerns collapse into `secondary_notice_count`, and the shell does not render parallel competing primary panels

## TV-17A: Calm-shell publication emits one budget audit and no duplicate posture grammar
- Given a published `LowNoiseExperienceFrame` with context, summary, action, and detail surfaces
- When `BUILD_LOW_NOISE_BUDGET_AUDIT(...)` materializes `low_noise_budget_audit`
- Then `rendered_surface_order[]` stays `CONTEXT_BAR -> DECISION_SUMMARY -> ACTION_STRIP -> DETAIL_DRAWER`, `scan_load` matches the frozen formula, and `duplicate_posture_codes[]` is empty

## TV-17B: Low-noise secondary actions remain non-mutating
- Given a manifest whose ranked action candidates include one mutation-capable action and additional lawful inspect or refresh actions
- When `FILTER_VISIBLE_ACTIONS(...)` selects the default calm-shell action set
- Then only the dominant action may be mutation-capable and `secondary_mutation_action_count = 0`

## TV-17C: Non-material refresh coalesces before visible attention reorders
- Given a non-material manifest refresh whose raw delta would swap the dominant issue or safe next move without a material truth transition
- When the calm shell evaluates refresh publication
- Then `low_noise_budget_audit.refresh_budget_state` records coalescing, visible changes stay within the frozen burst budget, and the mounted dominant question and primary action do not churn

## TV-18: Duplicate command retry returns one durable receipt
- Given a browser or operator client times out after posting a filing-capable command but retries with the same `command_id` and `idempotency_key`
- When the northbound API re-evaluates the request
- Then it returns the original `ApiCommandReceipt`, does not enqueue duplicate side effects, and the manifest emits at most one legal transition for that command

## TV-19: Authority-pending terminal bundle keeps checkpoint and follow-up work
- Given a transmitted submission whose terminal `DecisionBundle` resolves to `decision_status = REVIEW_REQUIRED` and `outcome_class = AUTHORITY_PENDING`
- When `FINALIZE_TERMINAL_OUTCOME(...)` persists the bundle
- Then `waiting_on = AUTHORITY`, `truth_state = AUTHORITY_PENDING`, `workflow_item_refs[]` is non-empty, `submission_record_id` is populated, and `next_checkpoint_at` is populated so reload, queueing, and reconciliation polling all target the same durable checkpoint

## TV-19A: Terminal bundle explainability stays compressed and action-preserving
- Given a persisted `DecisionBundle` with more than three ordered terminal reason codes and one safe
  next action
- When the bundle's backend explainability packet is persisted
- Then `decision_reason_codes[]` equals the first three ordered reasons, `dominant_reason_code`
  equals the first emitted reason, `decision_explainability_contract.suppressed_reason_count`
  reflects the exact hidden tail, and the safe next action remains visible instead of being displaced
  by verbose reason text

## TV-20: Completed terminal bundle drops resolved authority trackers
- Given authority reconciliation resolves a submission to a durable completed posture and no other post-terminal review work remains open
- When terminal workflow refs are normalized before `DecisionBundle` persistence
- Then the persisted bundle excludes stale transmit/reconciliation tracker refs and terminal reload does not resurrect already-resolved authority work

## TV-21: Experience stream rebase rejects stale-action approval
- Given an open client session resumes from a stale `resume_token` after `frame_epoch` has advanced and a user attempts an approval against an old summary
- When the client reconnects and submits the command with stale-view guards
- Then the stream returns `REBASE_REQUIRED`, the command fails with `VIEW_STALE`, and the user is forced onto a fresh snapshot before any approval or override is accepted

## TV-21A: Grouped stability contract rejects mixed-generation manifest markers
- Given a browser tab or native scene holds `decision_bundle_hash`, `shell_stability_token`, and `frame_epoch` from different route generations because cache hydration or catch-up ordering drifted
- When the client compares the rendered frame against the published `stability_contract.guard_vector_hash`
- Then the shell fails closed into explicit refresh or rebase posture, clears mutation-safe posture, and does not treat the mixed marker set as current or resumable

## TV-21B: Focus restoration contract distinguishes exact restore from lawful degradation
- Given a deep link, refresh, reconnect, or notification-open requests a specific focus anchor and backend truth can only remap that anchor, fall back to object summary, or invalidate restoration entirely
- When the client renders the returned `focus_restoration` contract
- Then recovery posture follows `restoration_disposition` and `restoration_reason_code_or_null` explicitly instead of guessing from a null focus anchor or browser-history state

## TV-21C: Mutation affordance bindings fail closed on stale quick actions
- Given an inbox quick action, action-strip mutation, or cached toast action still renders after the underlying route has rebased or its visibility scope has narrowed
- When the client submits a command whose guard fields do not exactly match the affordance's declared `mutation_precondition_binding`
- Then the backend rejects the write, the durable receipt/problem echoes the same precondition profile plus the authoritative stale guard family, and the client must refresh before reissuing intent

## TV-21D: Manifest compaction floor forces explicit rebase instead of replaying missing history
- Given an `ExperienceCursor` last acknowledged sequence `12` and a later snapshot publishes `stream_recovery_contract.compaction_floor_sequence_or_null = 20`
- When the client attempts to resume from the old cursor or token hash
- Then `delivery_window_state = REBASE_REQUIRED`, `rebase_reason_code_or_null = HISTORY_COMPACTED`, and the client must fetch a fresh snapshot instead of inventing deltas `13..19`

## TV-21E: Catch-up delivery completes before live manifest deltas become current
- Given a reconnecting manifest stream is missing `experience_sequence = 42` and a newer live delta for sequence `43` arrives first
- When the client processes the stream
- Then sequence `43` remains pending until sequence `42` is applied, the visible frame stays bound to the older complete frontier, and no current-state mutation affordance advances from out-of-order arrival time

## TV-22: Authority token rotation during pending transmit preserves subject binding
- Given an authority transmit or reconciliation attempt is pending while the subject-specific token set rotates
- When the gateway resumes delivery or polling
- Then the operation rebinds through the governed token vault, preserves the same subject/client binding, and never leaks or reuses the wrong token across clients

## TV-23: Additive schema migration does not corrupt in-flight manifests
- Given a release introduces a new schema bundle and datastore migration while older manifests remain sealed or in progress
- When the deployment promotes the new build
- Then existing manifests continue under their frozen schema/config bundle, new manifests allocate under the new bundle, and rollback never rewrites historical artifact meaning

## TV-24: Restore drill preserves audit chain and re-applies erasure limitations
- Given the primary stores are restored from a recovery checkpoint after prior erasure and retention actions
- When audit reconstruction and replay-safe enquiry-pack generation are executed
- Then audit hash continuity remains provable, missing evidence is surfaced as an explicit limitation, and any restore-resurrected personal data is queued for compensating re-erasure under audit

## TV-25: Cross-tenant and cross-mask cache keys cannot bleed experience state
- Given two tenants or two principals with different masking posture open the same logical client/period route
- When the read model, experience snapshot, or CDN/cache layer serves the response
- Then cache keys include tenant, principal class, masking fingerprint, and manifest identity, and no full-data or cross-tenant surface leaks into the other session

## TV-26: Client portal home compresses expert posture into one guided action
- Given a client has one overdue document request, one completed review, and one pending approval pack
- When `BUILD_CLIENT_PORTAL_WORKSPACE(...)` renders the home experience for `CLIENT_CONTRIBUTOR`
- Then the first view shows one status hero, grouped tasks, plain-language deadlines, and no raw gate codes, manifest lineage, or expert surface names

## TV-27: Resumable upload survives a mobile reconnect without duplicate files
- Given a client begins a governed `ClientUploadSession` on mobile, loses connectivity mid-transfer, and later resumes
- When the client reloads upload-session status and continues the transfer
- Then the same upload session is resumed, duplicate files are not created, scanner state remains visible, the document request stays attached to the upload, and `upload_confidence_score` rises monotonically with verified byte progress without promoting a completion CTA before the threshold is met

## TV-27A: Request rebase does not let stale bytes satisfy the current request
- Given a client has an in-flight `ClientUploadSession` frozen to request version `R1` and the same
  document request later rebases to live request version `R2`
- When the portal reloads the request card and upload history before the client explicitly
  reconfirms the upload
- Then the upload row remains visible with `upload_request_binding_contract.frozen_request_version_ref = R1`,
  `live_request_version_ref = R2`, and `request_binding_state = RECONFIRMATION_REQUIRED`, while
  `ClientDocumentRequest.current_request_upload_ref_or_null = null` and any request-satisfied copy
  or default preview remains withheld

## TV-27B: Reconfirmed upload becomes current without rewriting chronology
- Given a request previously rebased away from an upload's frozen request version and the client
  explicitly reconfirms that upload for the current request version
- When the portal and upload-session read models are rebuilt
- Then `upload_request_binding_contract.request_binding_state = RECONFIRMED_CURRENT`,
  `binding_resolution_basis = EXPLICIT_RECONFIRMATION`, `latest_upload_ref` stays chronological,
  and `current_request_upload_ref_or_null` alone identifies the upload that now lawfully satisfies
  the current request

## TV-27C: Duplicate allocation retry reuses the existing governed upload session
- Given a reconnect, retry, or transport retry path attempts to allocate a second upload session
  for the same frozen tenant/client/request/request-version tuple and the same staged bytes
- When the upload recovery layer resolves the retry
- Then the existing `upload_session_id` and `storage_ref` are reused, duplicate session/storage
  creation stays explicitly false, and the next-action posture remains resume or retry instead of a
  fresh silent session

## TV-27D: Full byte transfer still fails closed while checksum, scan, or validation is pending
- Given an upload has `bytes_transferred = byte_count` but scanner or validation posture is still
  pending
- When the client reloads upload-session status
- Then the session remains not-current, not-attached, and not-request-satisfied, and no completion
  claim appears merely because bytes finished transferring

## TV-27E: Attachment confirmation is distinct from accepted transfer
- Given an upload has already passed transfer, checksum, scanner, and validation and now waits on
  explicit attachment confirmation
- When the client confirms the attachment
- Then the upload transitions from `CONFIRMATION_REQUIRED` to `ATTACHED`, `next_action_code`
  clears to `NONE`, and only then may the request surface current-request satisfaction

## TV-27F: In-flight request rebase preserves resumability without silent rebinding
- Given a request rebases while its governed upload session is still queued, uploading, or scanning
- When the portal and upload-session reads are rebuilt before transfer settles
- Then the same upload session and storage lineage remain visible, the frozen request version does
  not change, `attachment_state` stays `STAGED`, and `RECONFIRM_REQUEST` does not appear early

## TV-27G: Cross-device continuation resumes the same governed upload
- Given a client starts an upload on one device and resumes it on another while resumability is
  still lawful
- When the second device reloads the upload-session read surface
- Then the same governed `upload_session_id`, `storage_ref`, frozen request identity, and resume
  token lineage remain in force instead of minting a second upload session

## TV-28: Approval-pack stale view blocks outdated sign-off
- Given a client viewed approval pack version A and version B later supersedes it before signing
- When the client submits `CLIENT_PORTAL_SIGN_APPROVAL_PACK` with the stale `approval_pack_hash` from version A
- Then the command fails `VIEW_STALE`, version A is `SUPERSEDED`, `approval_readiness_score` for version A falls below signable threshold, and the client is routed to the new summary before any sign-off is accepted

## TV-29: Onboarding reveals one required step at a time
- Given an invited client must verify identity, connect authority access, and upload mandatory documents
- When the portal renders `ClientOnboardingJourney`
- Then only the current required step is primary, completed steps collapse into progress summary, and save-and-return restores the same step without reopening the whole journey

## TV-30: Keyboard-only client portal flow remains fully operable
- Given a `CLIENT_SIGNATORY` uses keyboard-only navigation at 200 percent zoom
- When they move from the home status hero to a document request and then to an approval pack sign-off flow
- Then all primary actions, file-selection alternatives, disclosure panels, and sign-off confirmations remain reachable in semantic focus order without hover-only dependencies

## TV-31: Client portal promotes only one support region while preserving the mounted object
- Given a client has a rebased upload draft, a role-based content limitation, and Help availability at the same time
- When `BUILD_CLIENT_PORTAL_WORKSPACE(...)` composes the portal read model for the affected request
- Then `workspace_posture.promoted_support_region` selects exactly one explicit support posture, the current request remains mounted in the same shell, and the dominant action stays review-or-recover rather than silently continuing stale mutation

## TV-31A: Home copy rejects jargon and competing first-view CTAs
- Given `ClientPortalWorkspace.language_contract = PortalLanguageContract` and a `HOME` route that would otherwise serialize manifest, workflow, stale, audit, assignment, or staff-role wording
- When `dominant_question`, `status_hero`, or home-task copy is derived
- Then the first view keeps one dominant question, one dominant action, `status_hero.secondary_action = null`, literal due-label grammar, and no banned internal vocabulary

## TV-31B: Documents request cards stay literal and bounded
- Given a `DOCUMENTS` route with open requests, upload guidance, and retry or recovery posture
- When request-card title, why-requested, due, and help copy are serialized
- Then each visible card stays within the governed portal copy budgets, explains the task in client-safe language, and does not expose queue, gate, manifest, override, or workflow metaphors

## TV-31C: Approval summaries and change digests stay summary-first and client-safe
- Given an `APPROVALS` route with one current pack, one pending-settlement receipt, and historical packs in the background
- When summary, change-digest, sign-off, and receipt-next-step copy are serialized
- Then the current pack keeps one dominant sign-off or review action, the copy stays within the bounded approval budgets, and pending-versus-settled posture is explained without audit, operator, or stale-view jargon

## TV-31D: Onboarding copy stays one-step-at-a-time and within budget
- Given an `ONBOARDING` route with live resume, reconfirmation, or stale-review posture
- When current-step, next-action, and save-and-return copy are serialized
- Then only one step remains primary, the visible labels stay within the governed onboarding/action budgets, and the wording stays client-safe instead of reflecting internal workflow or reassignment state

## TV-31E: Request-list and contextual request-detail wording stay bounded and customer-safe
- Given `CustomerRequestListSnapshot` rows and customer-visible `WorkspaceSnapshot.customer_request_workspace` projections for the same request
- When row titles, no-safe-action explanations, and request-detail status projection are serialized
- Then list and detail views share `PortalLanguageContract`, stay within the bounded request-list/request-detail budgets, keep current-versus-history posture explicit, and reject manifest, workflow, escalation, assignment, audit, or staff-only wording

## TV-32: Customer-visible workspace snapshot nulls staff-only posture
- Given the same collaboration work item is rendered for `STAFF_FULL` and `CUSTOMER_VISIBLE`
- When `WorkspaceSnapshot` is serialized for each audience
- Then `surface_order` remains `CONTEXT_BAR -> DECISION_SUMMARY -> ACTION_STRIP -> DETAIL_DRAWER` for both, but the customer-visible snapshot sets `context_bar.internal_lifecycle_state`, `context_bar.assignee_label`, `context_bar.escalation_active`, and `decision_summary.customer_state_differs` to `null`

## TV-33: No-safe-action collaboration posture remains explicit through reconnect and rebase
- Given a work item is waiting on an external authority and no operator-safe command is currently permitted
- When the workspace reconnects after missed deltas or rebases to a newer snapshot
- Then `action_strip.actionability_state = NO_SAFE_ACTION`, `blocking_reason` and `machine_reason_codes[]` remain populated, no fallback primary action is invented, and `suggested_module_code` points the operator to the most relevant support module

## TV-33A: Workspace cursor fails closed on compaction or visibility drift
- Given a persisted `WorkspaceCursor` for a customer-visible session and a newer workspace snapshot either advances the compaction floor past `last_ack_sequence` or changes `access_binding_hash` / `masking_posture_fingerprint`
- When the client attempts to resume the workspace stream
- Then the cursor no longer remains `LIVE`, the recovery posture becomes `REBASE_REQUIRED` or `ACCESS_REBIND_REQUIRED`, and customer-visible replay does not revive stale internal lane history

## TV-33B: Duplicate collaboration deltas stay idempotent across reconnect
- Given a workspace reconnect receives the same semantic delta twice with identical `(WORKSPACE, item_id, frame_epoch, workspace_sequence)`
- When the client applies the delivery stream
- Then unread counts, badge counts, queue ordering, notification routing, and thread lineage change exactly once and no duplicate semantic side effect is introduced by the second copy

## TV-34: Current artifact stays primary while historical lineage remains available
- Given a customer has one current accepted upload, one rejected upload, and one superseded upload for the same request, plus a superseded approval pack in history
- When the portal and collaboration surfaces render artifact handoff controls
- Then the current upload and current approval pack remain the default summary-first targets, while rejected, superseded, and prior-signature artifacts stay accessible only as clearly labeled secondary history or recovery detail
- And each mounted surface also publishes `artifact_affordance{ visible_primary_subject_ref_or_null, header_posture, history_affordance_state, default_preview_target_ref_or_null, default_download_target_ref_or_null, default_print_target_ref_or_null }` so rendered headers and invoked targets stay aligned
- And the serialized `artifact_selection` contract and contextual `artifact_focus_*` route state keep preview, download, print, and reopen behavior bound to that same current-versus-history posture after refresh, reconnect, or responsive collapse

## TV-34A: Visibility partition freezes customer caches and stream replay to the visible lane only
- Given a customer-visible collaboration route, portal workspace, request list, and queued notification all publish the same `visibility_partition{ audience_class, allowed_visibility_classes[], access_binding_hash, masking_posture_fingerprint, cache_partition_key, ... }`
- When hidden internal-only activity occurs, masking posture changes, or a cached payload is restored under a different access-binding or masking basis
- Then customer-visible hydration and stream replay reject the stale partition basis, keep `allowed_visibility_classes = [CUSTOMER_VISIBLE]`, keep `internal_thread_head_or_null = null`, and never surface `audit.appended`, split internal badges, or fallback discovery that depends on hidden staff-only objects

## TV-34B: Customer preview uses visibility-scoped collaboration projections rather than staff payload concealment
- Given a customer-visible collaboration snapshot, activity slice, attachment slice, and workspace stream event all publish aligned `customer_safe_projection{ boundary_scope, projection_audience, access_binding_hash, masking_posture_fingerprint, visibility_cache_partition_key, module_projection_policy, attachment_visibility_policy, live_update_visibility_policy, draft_placeholder_policy, ... }`
- When an operator toggles preview mode, hidden internal-only activity lands, or a staff-only draft attachment exists beside the same work item
- Then the previewed customer-safe surfaces stay bound to `[CUSTOMER_VISIBLE]` delivery only, exclude internal module metadata and internal badge posture, exclude pending placeholder posture from attachment previews, and preserve current-versus-history labels without reconstructing them from staff-only fields

## TV-34C: Portal language budgets keep first-view copy literal, singular, and role-correct
- Given `ClientPortalWorkspace`, `CustomerRequestListSnapshot`, and standalone portal artifacts all publish the same `language_contract = PortalLanguageContract`
- When `HOME`, `DOCUMENTS`, `APPROVALS`, `ONBOARDING`, `HELP`, or contextual request-detail copy is assembled for first view
- Then the mounted route keeps one dominant question, one dominant action, explicit due/current/history/settlement wording, and stays within the route-specific first-view budget
- And limitation or recovery narratives do not repeat across `STATUS_HERO`, limitation notices, or promoted support regions, and row/detail CTA language clears whenever the current client role cannot lawfully take that action

## TV-35: Low-noise shell keeps the same four surfaces across narrow-screen collapse
- Given a mounted `LOW_NOISE` experience with an open detail entry point and a live `focus_anchor_ref`
- When the viewport collapses from desktop to narrow width and the detail area redocks as a sheet or drawer
- Then the shell preserves `CONTEXT_BAR`, `DECISION_SUMMARY`, `ACTION_STRIP`, and `DETAIL_DRAWER`, keeps the same dominant action, and restores focus to the invoking control when the disclosure closes

## TV-35A: Authoritative action legality stays aligned across strip, quick actions, and customer CTA
- Given a work inbox row, mounted collaboration workspace, and customer request CTA all publish aligned `authoritative_action{ basis_hash, projection_route_key, projection_version, actionability_state, primary_action_code_or_null, available_action_codes[], blocked_action_codes[], blocking_reason_code_or_null, recovery_route_ref_or_null, recovery_focus_anchor_ref_or_null }`
- When the route rebases, visibility narrows, permissions change, or a stale cache tries to reuse an older action list
- Then every surface either keeps the same dominant legal action or fails closed to `NO_SAFE_ACTION`, and the recovery path stays explicit instead of inventing a contradictory fallback CTA

## TV-35B: Collaboration queue projection keeps badges, ordering, and focus continuity aligned
- Given a work inbox row, mounted collaboration workspace, live stream event, and queued notification all publish the same `queue_projection{ basis_hash, latest_change_lane_or_null, customer_unread_count, internal_unread_count_or_null, customer_activity_module_badge_count, internal_activity_module_badge_count_or_null, canonical_sort_key{...}, focus_continuity_state, filter_membership_state, notification_target_module_code_or_null }`
- When customer-visible activity, internal-only activity, delayed delta delivery, reconnect, or a focused-row filter exit occurs
- Then split lane badges stay separate, drawer badge counts mirror the row, canonical ordering stays tied to the serialized sort basis instead of arrival timing, and any deferred reorder or removal survives reconnect until focus leaves the row

## TV-35C: Quantitative routing recommendations stay persisted and cross-surface consistent
- Given a `WorkflowItem.routing_contract`, inbox-row `queue_projection.routing_contract`, mounted workspace `queue_projection.routing_contract`, and `queue_health_contract` all share one routing profile hash and basis hash family
- When queue health degrades, escalation pressure crosses the frozen threshold, a better assignee becomes available, or a focused row still has an active draft lock
- Then browser, native, stream, notification, and automation consumers keep the same canonical row order, publish the same recommended action code and explanation codes, defer reorder while focus is held, and avoid transferring ownership or escalation implicitly until the persisted continuity guard clears

## TV-36: Portal workspace stale-view rejection keeps client context and points to the latest workspace
- Given a client resumes an onboarding or contextual request route from `workspace_version = A` and version B later supersedes it
- When the client submits a portal mutation carrying the stale workspace version from A
- Then the command fails closed, returns `latest_client_portal_workspace_ref`, preserves carry-forward draft context, and reopens the latest governed portal workspace before any mutation is accepted

## TV-36A: Portal refresh cannot reuse a view-guard from a different publication generation
- Given a mobile or browser portal client restores `workspace_version`, `view_guard_ref`, and local draft context from storage
- When the server returns a newer `stability_contract.publication_generation` or a different `guard_vector_hash`
- Then the portal keeps the same shell and task context mounted, marks the route stale or freshening inline, and blocks mutation until the latest workspace generation is rendered

## TV-36B: Portal contextual detail preserves governed parent return when exact focus cannot reopen
- Given a client restores a request-detail route from storage or a notification with a requested detail focus anchor and a serialized parent return anchor
- When that exact anchor is no longer visible but the contextual route or parent route still remains lawful
- Then `focus_restoration` distinguishes same-route remap from governed parent return, and the client preserves the same contextual shell instead of reopening `HOME` or inferring recovery from browser history

## TV-37: Governance overview emits one dominant attention summary and survives responsive collapse
- Given a tenant has pending approvals, one authority-link risk, and recent audit hotspots at the same time
- When `BUILD_TENANT_GOVERNANCE_SNAPSHOT(...)` emits the overview projection and the console collapses from wide to narrow layout
- Then `attention_summary` selects one dominant worklist by deterministic ranking, secondary issue families remain visible only as supporting stacks, and the selected object plus any open `ChangeBasket` survive the collapse

## TV-38: Collaboration recovery posture keeps the same item mounted while mutation fails closed
- Given a staff or customer collaboration route has mounted `/work/items/{item_id}` and a later update forces stale-view recovery
- When the user attempts a mutation from the stale shell
- Then `WorkspaceSnapshot.recovery_posture != NONE`, the same `item_id` remains mounted with the draft or thread context preserved, and mutation-capable permissions stay false until a fresh safe snapshot is loaded

## TV-38A: Collaboration detail route preserves explicit parent return target through refresh and back
- Given a staff inbox row or portal request row opens a work-item detail route with a serialized parent return route and focus anchor
- When the page refreshes, reconnects, or the user triggers the governed in-app back action
- Then the same `object_anchor_ref` and detail route remain mounted while current, and if the item can no longer reopen the shell returns to the serialized parent route/focus instead of a generic home, queue, or dashboard

## TV-38B: Notification deep link reopens the same work item in the same shell grammar
- Given an in-app collaboration notification targets a work item with a module code, focus anchor, shell family, and serialized parent return target
- When the recipient opens the notification on web or native and later dismisses or recovers from the detail route
- Then the product mounts the same `object_anchor_ref` in the target shell family, opens the named module/focus anchor, and preserves the same governed parent return path across recovery

## TV-39: Cross-device continuity contract prevents same-object reopen drift across browser, narrow, notification, and native embodiments
- Given a manifest route, collaboration detail route, portal contextual route, work-item notification, and native scene all publish `cross_device_continuity_contract{ continuity_scope, canonical_object_ref, route_identity_ref, parent_context_ref_or_null, dominant_action_state_or_null, stability_guard_hash_or_null, access_scope_hash_or_null, masking_scope_fingerprint_or_null, session_scope_ref_or_null, visibility_cache_partition_key_or_null, compatibility_basis_class, allowed_embodiments[] }`
- When refresh, reconnect, deep-link reopen, narrow-screen restack, notification-open, or native restoration occurs under a different route guard, visibility cache partition, masking posture, or session lineage
- Then the client either reopens the same governed object in the same shell family with the same parent-return posture and dominant action state, or it fails closed with one explicit invalidation reason instead of widening visibility, remounting a different route grammar, or reviving stale mutation posture

## TV-39: Governance read models preserve shell identity through inline recovery
- Given a governance operator has a selected tenant object, an open diff or sidecar, and a newer policy snapshot supersedes the current view
- When the control-plane route rebases or reattaches after reconnect
- Then the refreshed governance projection preserves `shell_family = GOVERNANCE_DENSITY_SHELL`, the same `object_anchor_ref`, explicit `recovery_posture`, and the same dominant question instead of remounting a generic settings route

## TV-39A: Reversible low-completion portal flow demotes irreversible CTA under weak connectivity
- Given a mobile client on a weak connection has a reversible document task with save-and-return available
- When the workspace reliability model yields `completion_probability < 0.40`
- Then the dominant CTA becomes save, recover, or help posture, the selected request and file context remain mounted, and no irreversible submit action is promoted until the probability and recovery posture improve

## TV-39B: Semantic selectors and accessibility anchors stay stable across browser, native, and reduced-motion embodiments
- Given a calm-shell workspace, portal route, governance route, native primary scene, and native secondary window all publish `semantic_accessibility_contract{ shell_family, selector_profile, required_anchor_codes[], semantic_focus_order[], announced_change_kinds[] }`
- When layout compaction, responsive restack, native translation, keyboard-only traversal, screen-reader navigation, or reduced-motion rendering occurs
- Then browser `data-testid` hooks and native `accessibilityIdentifier` values still name the same semantic anchors, focus order remains identical to the visible semantic order, promoted support/detail regions stay keyboard reachable and dismissible, and live updates announce meaningful change without stealing active input focus

## TV-39C: Manifest-shell fuzz case preserves same route and inline recovery posture during rebase
- Given a `LowNoiseExperienceFrame` case in `shell_continuity_fuzz_harness` perturbs `REBASE` and `FRAME_EPOCH_ADVANCE` while the same manifest object remains lawful
- When the deterministic harness records `truth_change_detected = false`
- Then `shell_family`, `route_identity_ref`, `canonical_object_ref`, `dominant_question`, `active_context_ref_or_null`, `focus_anchor_ref_or_null`, and `dominant_meaning_ref_or_null` remain unchanged, and any degradation is typed `INLINE_RECOVERY` instead of a shell remount

## TV-39D: Collaboration reconnect and catch-up fuzz case keeps the same item, module, and focus
- Given a `WorkspaceSnapshot` case in `shell_continuity_fuzz_harness` perturbs `RECONNECT` and `STREAM_CATCH_UP`
- When the same work item still resolves under the published access and masking scope
- Then the harness proves the same `canonical_object_ref`, active collaboration context, focus anchor, and return posture survive instead of reopening a generic inbox or clearing the mounted module

## TV-39E: Portal responsive-collapse fuzz case does not change shell metaphor or dominant action meaning
- Given a contextual `ClientPortalWorkspace` case in `shell_continuity_fuzz_harness` perturbs `RESPONSIVE_COLLAPSE`
- When the same request or approval object remains lawful on narrow layout
- Then the harness preserves `shell_family = CLIENT_PORTAL_SHELL`, the same parent return route and focus anchor, and the same dominant meaning instead of remounting `HOME` or changing the promoted action for the same object

## TV-39F: Governance reconnect or resize fuzz case keeps the selected object and support context
- Given a `TenantGovernanceSnapshot` case in `shell_continuity_fuzz_harness` perturbs reconnect or resize while a diff basket or audit sidecar is open
- When no truth change invalidates the selected governance object
- Then the harness preserves the same `route_identity_ref`, selected object anchor, active context, and governed support posture instead of reopening a different section shell

## TV-39G: Native primary-scene restoration fuzz case keeps same-object continuity with typed recovery
- Given a `NativeOperatorWorkspaceScene` case in `shell_continuity_fuzz_harness` perturbs `NATIVE_SCENE_RESTORE`
- When restoration is lawful but requires revalidation of freshness or stream position
- Then the harness allows only typed `INLINE_RECOVERY`, keeps the same canonical object and route identity, and rejects scene revival that widens scope or remounts a different workspace

## TV-39H: Native secondary-window restoration fuzz case preserves parent return anchor
- Given a `NativeOperatorSecondaryWindowScene` case in `shell_continuity_fuzz_harness` perturbs `SECONDARY_WINDOW_RESTORE`
- When the detached support window is restored and later closed
- Then both `pre_state.return_focus_anchor_ref_or_null` and `post_state.return_focus_anchor_ref_or_null` remain non-null and equal, so the restored window returns focus to the parent launch anchor instead of orphaning the user in a generic shell

## TV-39I: Support-region close restores keyboard focus to the serialized invoker
- Given a `WorkspaceSnapshot` case in `focus_restore_return_target_harness` closes a drawer or inspector with `object_loss_state = EXACT_TARGET_VISIBLE`
- When the invoking control and governing object still remain lawful on the same route
- Then the harness restores focus to `pre_state.return_focus_anchor_ref_or_null`, keeps browser identifiers mirrored to the serialized anchor, and rejects fallback to inbox root or another broad route

## TV-39J: Portal back navigation returns to the serialized parent route and anchor
- Given a `ClientPortalWorkspace` case in `focus_restore_return_target_harness` exercises `BACK_NAVIGATION` from a contextual detail route
- When the parent route still resolves under the same customer-safe visibility posture
- Then the harness reopens `pre_state.return_route_or_scene_ref_or_null`, restores focus to `pre_state.return_focus_anchor_ref_or_null`, and rejects a generic portal-home or tab-root bounce

## TV-39K: Help handoff return restores the source anchor instead of a generic support root
- Given a portal help-route case in `focus_restore_return_target_harness` exercises `HELP_HANDOFF_RETURN`
- When the user closes or exits help back to the originating request or task context
- Then the harness requires `support_surface_kind_or_null = HELP_ROUTE`, restores the serialized source anchor, and rejects return to a broad help landing page or unrelated task list

## TV-39L: Stale recovery falls back to the narrowest surviving list target
- Given a contextual detail case in `focus_restore_return_target_harness` exercises `STALE_REBASE_RECOVERY` with `object_loss_state = PARENT_STALE_NARROW_LIST_LAWFUL`
- When the exact detail route cannot reopen after rebase or stale rejection
- Then the harness reopens `pre_state.fallback_route_or_scene_ref_or_null`, restores `pre_state.fallback_focus_anchor_ref_or_null`, and rejects generic `/home`, dashboard, or broad queue fallback

## TV-39M: Governance live updates preserve active compare or picker focus
- Given a `TenantGovernanceSnapshot` case in `focus_restore_return_target_harness` exercises `LIVE_UPDATE_DURING_ACTIVE_INPUT`
- When the selected governance object remains lawful and the operator is still focused inside a compare control, picker, or composer
- Then `active_focus_lock_kind_or_null` remains typed, `active_focus_lock_ref_or_null` survives unchanged, and the harness rejects any update that steals focus to headings, notices, or refreshed table cells

## TV-39N: Native secondary-window close restores the parent scene anchor
- Given a `NativeOperatorSecondaryWindowScene` case in `focus_restore_return_target_harness` exercises `SECONDARY_WINDOW_CLOSE`
- When the detached compare window is dismissed under keyboard-only flow
- Then the harness restores focus to `pre_state.return_focus_anchor_ref_or_null`, mirrors that anchor through native accessibility identifiers, and rejects parent-scene return that lands nowhere actionable

## TV-39O: Focus-restore harness proves close, help-return, stale fallback, and live-update focus law
- Given one `focus_restore_return_target_harness` publishes keyboard-first cases for low-noise support regions, collaboration detail routes, portal contextual detail, help handoff, governance compare controls, and native secondary-window close
- When the harness exercises close, back, help-return, stale-rebase recovery, responsive restack, live-update interference, and secondary-window dismissal under browser `data-testid` and native `accessibilityIdentifier` parity
- Then each case restores focus to the serialized invoker or parent-return anchor when lawful, otherwise falls back only to the narrowest surviving governed target, and no live update steals focus from an active composer, picker, or compare control

## TV-39P: Semantic accessibility regression pack binds every governed shell to exact selector and announcement contracts
- Given one `semantic_accessibility_regression_pack` publishes cases for `LowNoiseExperienceFrame`, `WorkspaceSnapshot`, `ClientPortalWorkspace`, `TenantGovernanceSnapshot`, `NativeOperatorWorkspaceScene`, and `NativeOperatorSecondaryWindowScene`
- When the pack is validated
- Then each case reuses the exact shell-specific `required_anchor_codes[]`, `semantic_focus_order[]`, and `announced_change_kinds[]` from the authoritative `semantic_accessibility_contract` instead of inventing test-local selector or announcement grammars

## TV-39Q: Browser and native identifier mirrors cannot drift from semantic anchor refs
- Given a browser or native semantic accessibility regression case declares `anchor_bindings[]{ anchor_code, semantic_anchor_ref, browser_identifier_or_null, native_identifier_or_null }`
- When Playwright or XCUITest reads the machine-authored identifiers
- Then browser identifiers equal `semantic_anchor_ref` on browser cases, native identifiers equal `semantic_anchor_ref` on native cases, and any cross-platform naming drift is rejected as a contract failure

## TV-39R: Keyboard and screen-reader paths stay aligned with support and return-path semantics
- Given a semantic accessibility regression case serializes `focus_entry_anchor_ref`, `keyboard_path_anchor_refs[]`, `screen_reader_anchor_codes_in_order[]`, `support_surface_kind_or_null`, and `return_path_anchor_code_or_null`
- When support regions collapse, contextual routes recover, or detached support windows return
- Then keyboard traversal reaches the dominant action, the support surface, and any lawful `RETURN_PATH_CONTROL`, while screen-reader traversal begins at `DOMINANT_QUESTION` and keeps the same support and return-path anchors addressable

## TV-39S: Live-update regression cases keep activity polite and decisive failures assertive
- Given a semantic accessibility regression case includes `transition_classes[]` containing `LIVE_UPDATE`
- When the case publishes `live_update_change_kind_or_null` and `live_region_mode_or_null`
- Then `ACTIVITY_DELTA` and `BADGE_DELTA` remain polite, `COMMAND_FAILURE` or `RECOVERY_NOTICE` remain assertive, no excessive announcement noise is emitted, and active input focus is not stolen

## TV-39T: Reduced-motion regression cases preserve the same semantic recovery story
- Given a semantic accessibility regression case is executed under `REDUCED_MOTION`
- When the same shell rebases, reconnects, restacks, or returns from a support surface
- Then `reduced_motion_semantics_preserved = true` and `reduced_motion_recovery_story_matches_default = true`, so the same dominant action and recovery meaning remain observable without ornamental motion

## TV-39U: Native secondary-window semantic regression keeps parent return control addressable
- Given a `NativeOperatorSecondaryWindowScene` case in `semantic_accessibility_regression_pack` covers `SECONDARY_WINDOW_RETURN`
- When the detached support window is dismissed under keyboard-only and screen-reader traversal
- Then the case retains `RETURN_PATH_CONTROL` in both semantic bindings and traversal paths, and the pack rejects any secondary-window flow that loses the parent return anchor or turns the support surface modal

## TV-39V: Cross-shell interaction foundation prevents token and behavior drift
- Given `OperatorInteractionLayer`, `PortalInteractionLayer`, and `GovernanceInteractionLayer` each publish `foundation_contract = InteractionLayerFoundationContract`
- When a browser route, collaboration workspace, governance route, or native scene reuses the same shell family
- Then layout-density tokens, surface-spacing tokens, support-spacing tokens, responsive-compaction tokens, selector profiles, motion posture, history posture, preview posture, notification posture, recovery posture, and secondary-window posture remain the exact shell-family mapping instead of drifting through route-local theme overrides or platform-local wrappers

## TV-40: Exact replay reuses frozen config, frozen input, and frozen post-seal basis
- Given a completed compliance manifest with persisted `ConfigFreeze`, `InputFreeze`, and an
  `append_only_outcome_projection.post_seal_basis{...}` packet that records the historical
  authority and late-data lineage actually used
- When a `STANDARD_REPLAY` child is executed
- Then the child reuses the historical frozen basis, reloads the stored post-seal basis instead of
  performing fresh source collection or live authority reads, and persists a `ReplayAttestation`
  showing matching `execution_basis_hash` and `deterministic_outcome_hash`

## TV-41: Exact replay fails closed on corrupt inherited input basis
- Given a replay target whose referenced `InputFreeze` artifact is missing, corrupt, or schema-incompatible
- When an exact replay child is requested
- Then replay preflight fails closed with a typed replay-basis reason code and no fresh collection is substituted

## TV-42: Counterfactual replay declares expected difference instead of silent mismatch
- Given a replay child in `COUNTERFACTUAL_ANALYSIS` mode that intentionally uses a superseding rule profile
- When the run completes
- Then the persisted `ReplayAttestation` records `comparison_mode = COUNTERFACTUAL_DECLARED`, an expected or limited difference outcome class, and the specific basis-drift reason codes

## TV-43: Historical amendment replay ignores newer authority corrections
- Given an original manifest that evaluated amendment posture before a later authority correction arrived
- When an exact replay of the original manifest is executed after the correction exists
- Then the replay binds to the original baseline and historical authority basis, and the later correction is not smuggled into the exact replay result

## TV-44: Recovery child preserves exact execution basis
- Given a started manifest that crashes after seal but before terminalization
- When a same-attempt recovery child is created
- Then the child uses `RECOVERY_EXACT` for both config and input, preserves the parent `execution_basis_hash`, and emits no fresh collection or fresh authority-read side effects

## TV-44D: Hidden live replay reads fail exact-match posture
- Given a replay worker performs a live authority read, late-data rescan, or fresh connector-backed collection while claiming standard or audit replay
- When `ReplayAttestation` persists `basis_integrity_contract`
- Then the contract records the executed live-read class, exact-match posture is rejected, and the replay cannot serialize as `EXACT_HASH_MATCH`

## TV-44E: Replay outcome hash waits for attestation and persisted outcome material
- Given a replay child computes a candidate outcome surface before attestation persistence or while one material outcome component is not yet persisted or transactionally staged
- When the manifest and replay attestation are validated
- Then `deterministic_outcome_hash` cannot publish as replay-visible truth, `replay_attestation_ref` must remain absent or the non-persisted component class must be explicit, and no exact or expected replay claim is exposed

## TV-44F: Deterministic golden pack freezes ordered null slots and exact-decimal strings
- Given the blocking deterministic and state-machine suite persists `DeterministicGoldenPack.module_fixtures[]`
- When one fixture records a material payload hash, `expected_null_field_paths[]`, and `expected_decimal_fields[]`
- Then null-slot paths stay explicitly present and canonically ordered, decimal values stay serialized as canonical decimal strings without locale/exponent drift, and the pack hash changes on any omission or reordering

## TV-44G: Deterministic golden pack freezes named lifecycle transitions
- Given `DeterministicGoldenPack.state_transition_fixtures[]` contains a named transition fixture
- When the fixture binds `state_transition_contract{ object_family, previous_state_or_null, current_state, transition_event_code }`
- Then the fixture fails closed if the persisted contract changes tuple, event code, or machine identity, and release evidence does not rely on logs to prove the transition

## TV-44H: Deterministic golden pack freezes replay hashes and cadence without jitter
- Given `DeterministicGoldenPack` retains `replay_fixtures[]` and `cadence_fixtures[]`
- When replay proof or reconciliation scheduling is validated for a green deterministic gate
- Then exact replay fixtures keep the expected `execution_basis_hash` and `deterministic_outcome_hash`, and cadence fixtures keep `jitter_policy = NONE` plus deterministic `expected_cadence_seconds` so retry timing cannot drift by runtime randomness

## TV-44A: Post-seal worker rejects manifest-bound hash drift
- Given an authority transmit or late-data monitoring worker receives a task whose `manifest_hash` or
  `execution_basis_hash` no longer matches the sealed manifest's `frozen_execution_binding{...}`
- When the worker attempts to execute
- Then the worker fails closed, records the mismatch, and does not substitute live config, live
  input, or replacement lineage from ambient state

## TV-44B: Fresh child config resolution stays distinguishable from historical reuse
- Given a continuation child that intentionally re-resolves current config and happens to land on the
  same config versions and hashes as a prior manifest
- When the child is frozen
- Then `continuation_set.config_inheritance_mode = FRESH_CHILD_RESOLUTION`,
  `ConfigFreeze.config_resolution_basis = DIRECT_REQUEST_RESOLUTION`, and all
  `source_config_*` lineage fields remain null

## TV-44C: Historical explicit config reuse cannot masquerade as fresh
- Given a non-replay continuation child that intentionally reuses a historical frozen config surface
- When the child is allocated and frozen
- Then `continuation_set.config_inheritance_mode = HISTORICAL_EXPLICIT`,
  `ConfigFreeze.config_resolution_basis = HISTORICAL_EXPLICIT_REUSE`, and the active
  `config_freeze_hash` plus `config_surface_hash` exactly match the recorded `source_config_*`
  lineage hashes

## TV-45: Partial authority acknowledgement keeps twin in reconciliation posture
- Given a submission packet is accepted for transport but the authority only acknowledges part of the expected legal state
- When `BUILD_TWIN_VIEW(...)` classifies the mirrored internal and authority lanes
- Then at least one `TwinDeltaArc` is `ACK_PARTIAL`, `comparability_state = PARTIALLY_COMPARABLE`,
  `TwinReconciliationState.lifecycle_state` is not `NOT_REQUIRED`, and the twin does not collapse
  the case into match or simple pending

## TV-46: Stale authority snapshot removes safe mutation-capable action
- Given internal posture is fresh enough for filing but the authority lane is beyond the safe comparison horizon
- When `DERIVE_TWIN_READINESS(...)` evaluates the twin
- Then the twin emits `STALE_COMPARISON`, `comparability_state = NON_COMPARABLE`,
  `safe_action_state` is `REFRESH_REQUIRED` or `NO_SAFE_ACTION`,
  `usefulness_cap_reason_codes[]` is non-empty, and the UI does not present live authority-affecting
  action as the dominant next step

## TV-47: Contradictory authority components surface as one explicit mismatch class
- Given an authority acknowledgement implies confirmed state while a contemporaneous obligation mirror or status read remains incompatible
- When `ASSEMBLE_TWIN_STATE_SNAPSHOT(...)` builds the authority lane and `COMPUTE_TWIN_DELTA_SET(...)` runs
- Then the authority snapshot enters `CONTRADICTORY`, `non_comparable_subject_count >= 1`, the twin
  emits `ACK_CONTRADICTORY` or `STATUS_MISMATCH` with explicit contradiction posture, and the
  renderer does not silently choose one authority component over the other

## TV-48: Missing legal baseline blocks post-finalisation twin equivalence
- Given new post-finalisation facts arrive but the legal filed or amended baseline cannot be proved for the exact scope
- When the twin is rebuilt
- Then `baseline_state = MISSING`, at least one delta is `BASELINE_MISSING` with
  `comparability_state = NON_COMPARABLE`, and the twin remains decision-limited rather than
  claiming internal/authority equivalence

## TV-49: Amended baseline supersedes prior filed-baseline mismatches
- Given a post-finalisation amendment is confirmed and a new amended baseline now exists for the same scope
- When the next twin build runs
- Then comparison occurs against the amended baseline chain, historical filed-baseline mismatches no longer appear as live open discrepancies, and the prior twin is marked stale or superseded

## TV-49A: Canonical twin comparison key stays stable across lane-local ordering noise
- Given internal and authority lanes publish the same semantic subject with different raw component order, replay lineage wrappers, or equivalent normalization-only value forms
- When `COMPUTE_TWIN_DELTA_SET(...)` derives the comparison universe
- Then both lanes emit the same canonical `comparison_key`, exactly one terminal `TwinDeltaArc` is produced for that subject, and the key depends only on the frozen identity-and-scope tuple

## TV-49B: Subject-key collision stays explicit instead of silently collapsing one component
- Given one lane assembles two components that normalize to the same comparison key but remain semantically incompatible
- When `ASSEMBLE_TWIN_STATE_SNAPSHOT(...)` persists the lane snapshot
- Then `assembly_state = CONTRADICTORY`, `subject_key_collision_refs[]` remains populated, limitation posture is explicit, and the twin build does not silently discard one colliding subject

## TV-49C: Twin mismatch ranking is replay-safe and iteration-order independent
- Given the same persisted mismatch set is replayed with a different raw delta iteration order
- When `SUMMARIZE_TWIN_MISMATCHES(...)` rebuilds `TwinMismatchSummary`
- Then `top_ranked_mismatches[]`, `top_mismatch_refs[]`, and `highest_priority_rank` remain unchanged because ranking is sorted only by `priority_rank desc`, `last_compared_at desc`, then `comparison_key asc`

## TV-49D: Dominant interpretation meaning survives low-noise rendering
- Given the leading unresolved twin issue is waiting, reconciliation-required, non-comparable, out-of-band, or contradictory
- When `BUILD_TWIN_INTERPRETATION_STATE(...)` persists the panel posture
- Then `summary_priority_mode` is not `AUDIT_FIRST`, `dominant_attention_state` is explicit, and the
  dominant delta or reconciliation ref is retained instead of hidden behind `ALL_MISMATCHES`

## TV-50: Portfolio summary ranks clients by twin attention without expanding every delta
- Given a portfolio scope contains ready, review-required, waiting-on-authority, reconciliation-required, and blocked twins
- When `BUILD_TWIN_PORTFOLIO_SUMMARY(...)` renders the rollup
- Then the summary groups twins by readiness class, collapses matched twins into counts, and orders `top_twin_refs[]` by portfolio attention rank rather than alphabetical client order

## TV-51: Duplicate nightly scheduler delivery reuses one batch and one same-window manifest
- Given the same tenant, `nightly_window_key`, release-verification manifest, and unattended-policy snapshot are delivered twice by the scheduler
- When `RUN_NIGHTLY_AUTOPILOT(...)` allocates the batch and selects a client that is otherwise executable
- Then the second delivery reuses the same `NightlyBatchRun`, same-window duplicate suppression prevents a second `run_kind = NIGHTLY` manifest for that client-period scope, and the batch records explicit reuse rather than silent omission

## TV-52: Stale nightly shard reclaim recovers attempt state before any resend
- Given a nightly shard owner dies after persisting an authority-attempt checkpoint but before acknowledging broker completion
- When a successor worker reclaims the stale shard after heartbeat expiry
- Then it reloads durable attempt state, records successor linkage, and either resumes or escalates without blindly resending the live authority mutation

## TV-52A: Same-window active attempt never allocates an unlinked duplicate manifest
- Given a nightly candidate already has a same-window active attempt or a stale reclaimable attempt
- When selection resolves the candidate under the frozen nightly batch
- Then the row persists `DEFER_ACTIVE_ATTEMPT` or `EXECUTE_CONTINUATION_CHILD` with explicit reclaim lineage, and no second unlinked same-window manifest is allocated

## TV-53: Partial nightly portfolio failure still yields a complete morning digest
- Given one selected client auto-completes, one waits on authority with a checkpoint, one is deferred by retry window, and one fails non-retryably
- When batch aggregation reaches quiescence
- Then `NightlyBatchRun.lifecycle_state = COMPLETED_WITH_FAILURES`, every selected entry is explicitly counted, workflow items are published before the digest, and `OperatorMorningDigest` summarizes all four postures without log reconstruction

## TV-53B: Digest publication QA freezes exact handoff partitions
- Given a quiesced nightly batch publishes a morning digest with unresolved workflow handoff, highlights, authority waits, and no customer notifications
- When `OperatorDigestDerivationContract` is persisted for that publication
- Then it retains exact set hashes for covered selection entries, outcome partitions, queue groupings, highlight order, published workflow refs, published notification refs, waiting-on-authority refs, and late-data holds, and `publication_qa_completed_at` does not predate settled publication

## TV-53C: Published-complete digest state requires quiescence-safe nightly state
- Given a nightly batch is still `RUNNING` or has not assigned every selected entry one explicit `outcome_bucket`
- When the control plane attempts `operator_digest_publication_state = PUBLISHED_COMPLETE`
- Then validation fails closed because morning handoff publication cannot race unfinished nightly accounting or incomplete queue generation

## TV-53A: Isolated shard failure does not erase unrelated nightly dispositions
- Given one shard enters `FAILED_ISOLATED` with explicit blocked entries and failure reasons while another shard finishes normally
- When the batch reaches quiescence and publishes its digest
- Then blocked entries remain explicitly attributable to the failed shard, unaffected entries keep their own persisted `outcome_bucket`, and explainability does not depend on reconstructing worker logs

## TV-54: Authority-unknown nightly candidate escalates instead of auto-progressing
- Given a client is otherwise ready to submit but the latest authority truth is `UNKNOWN` or `OUT_OF_BAND_UNRECONCILED`
- When nightly selection and unattended-boundary checks run
- Then the candidate resolves to `ESCALATE_ONLY` or review-required continuation according to frozen policy, no autonomous submission is attempted, and the next-morning digest surfaces the operator checkpoint explicitly

## TV-54A: Every nightly candidate receives one persisted disposition
- Given the frozen nightly candidate universe contains executable, deferred, escalated, and ineligible clients
- When `SELECT_NIGHTLY_PORTFOLIO(...)` completes
- Then `selection_universe_count` equals the number of persisted `selection_entries[]`, every candidate has exactly one `selection_disposition`, and omission is illegal state rather than a log gap

## TV-54B: Terminal-result reuse is decided before fresh nightly manifest allocation
- Given a client-period has a lawful unsuperseded terminal result that still satisfies the current nightly window
- When selection runs for the same `nightly_window_key`
- Then `terminal_result_reuse_state = REUSED_TERMINAL_RESULT`, `selection_disposition = REUSE_EXISTING_TERMINAL_RESULT`, and no fresh manifest is allocated

## TV-54C: Recovery batch resumes predecessor lineage instead of starting fresh
- Given a stale nightly predecessor batch is formally abandoned after persisted selection and shard state already exist
- When a successor `RECOVERY_RECLAIM_WINDOW` batch is allocated
- Then `reclaimed_predecessor_batch_run_ref` is non-null, `recovery_resume_state` proves predecessor reuse, and the successor continues durable lineage instead of rebuilding the portfolio from scratch

## TV-54D: Terminal nightly batches keep explicit outcomes for unrelated candidates after shard failure
- Given one nightly shard fails while unrelated candidates were already selected in other shards
- When the batch reaches `FAILED`, `BLOCKED`, `ABANDONED`, or `COMPLETED_WITH_FAILURES`
- Then every persisted `selection_entries[]` row still carries a non-null `outcome_bucket`, shard coverage remains explicit, and no unrelated client disappears into null outcome state

## TV-54E: Morning digest only publishes after workflow and notification publication settle
- Given a nightly batch has reached quiescence with unresolved waiting, deferred, or blocked outcomes
- When the morning digest is assembled
- Then `operator_digest_publication_state` does not advance to published until workflow publication and notification publication have each reached a persisted settled timestamp, and the digest keeps those timestamps in `derivation_contract`

## TV-54F: Initial morning digest freezes one exact unresolved handoff partition
- Given the tenant morning digest includes every major unresolved outcome bucket `{WAITING_ON_AUTHORITY, WAITING_ON_LATE_DATA, REVIEW_REQUIRED, REQUEST_CLIENT_INFO, BLOCKED_INTERNAL, FAILED_RETRYABLE, FAILED_NON_RETRYABLE, DEFERRED}`
- When the initial digest is published
- Then `covered_selection_entry_refs[]` equals the exact union of `outcome_entry_refs{...}`, `summary_counts{...}` replays from that partition, `queue_summaries[].source_basis = PUBLISHED_WORKFLOW_ITEMS`, and highlights keep `selection_entry_ref`, `highlight_rank`, and `entry_loss_score`

## TV-54G: Recovery morning digest supersedes incomplete publication without losing lineage
- Given an earlier digest for the same coverage date was incomplete and a later recovery batch finishes the lawful handoff publication
- When the replacement digest is published
- Then `derivation_contract.supersession_state = RECOVERY_SUPERSESSION`, `publication_generation` advances, `supersession_root_digest_id` preserves the original lineage anchor, `supersedes_digest_id` points to the replaced digest, and `supersession_reason_codes[]` explains the recovery publication

## TV-54F: Morning digest queue summaries partition persisted workflow handoff items exactly
- Given the digest publishes unresolved operator work from one nightly window
- When `queue_summaries[]` and `published_workflow_item_refs[]` are serialized
- Then the queue summaries partition the full published workflow set without duplication or omission, and every unresolved outcome bucket is covered exactly once without consulting ephemeral queue state

## TV-54G: Recovery digest supersession preserves earlier publication lineage
- Given an earlier morning digest published before recovery completed and a later recovery batch finishes for the same coverage date
- When the successor digest supersedes the earlier publication
- Then `publication_generation` increases, `supersession_root_digest_id` preserves the earlier lineage, `supersedes_digest_id` points to the earlier digest, and supersession reason codes explain why the newer handoff replaced the older one

## TV-91: Authority sandbox gate proves exact enabled provider-profile and operation-family breadth
- Given a release candidate enables one ordered provider-profile set and one ordered authority operation-family set for sandbox verification
- When `VerificationSuiteResult` and `GateAdmissibilityRecord` persist `authority_sandbox_coverage_contract_or_null`
- Then the coverage contract mirrors the candidate hash, schema bundle, compatibility gate, migration plan, client window, enabled provider-profile refs, exercised operation-family refs, and one canonical request-identity namespace hash rather than a loose green summary

## TV-91A: Authority sandbox coverage fails closed on the required controlled-edge matrix
- Given an authority sandbox suite claims green readiness for the candidate
- When any required case `{ TOKEN_ROTATION, BINDING_LINEAGE_INVALIDATION, AMBIGUOUS_INGRESS_QUARANTINE, DUPLICATE_BUCKET_CHANGE, FRAUD_HEADER_VALIDATION, RECONCILIATION_BUDGET_EXHAUSTION }` is missing or drifts off the exercised request/binding/interaction/ingress lineage
- Then validation rejects the suite evidence, admissibility cannot remain green, and the authority-sandbox gate cannot serialize a lawful `authority_sandbox_coverage_hash_or_null`

## TV-88: Nightly what-if simulation replays one frozen portfolio basis without mutating live truth
- Given one persisted nightly window with replayable `selection_entries[]`, a published `OperatorMorningDigest`, and an exact baseline release identity
- When `SIMULATE_NIGHTLY_PORTFOLIO_WHAT_IF(...)` runs with a reduced concurrency profile plus an authority-ambiguity counterfactual
- Then the result remains `execution_mode = ANALYSIS`, reads only the persisted source batch set, preserves authority ambiguity as blocking rather than executable, and emits `entry_diffs[]` plus `highlight_diffs[]` with explicit reason-code movement

## TV-88A: Release-admissibility what-if requires exact counterfactual release identity binding
- Given an operator wants to compare the same nightly portfolio against a different admissible release candidate
- When the nightly what-if basis declares `counterfactual_release_verification_manifest_ref_or_null`
- Then the basis also carries one exact `counterfactual_release_candidate_identity_contract_or_null`, keeps the same nightly environment, and rejects partial release what-if identity

## TV-88B: Successor recovery what-if stays inside one nightly window
- Given a stale nightly predecessor was superseded by a successor recovery batch in the same nightly window
- When a what-if simulation reuses that recovery chain as its source batch set
- Then `source_batch_recovery_state = SUCCESSOR_RECOVERY_CHAIN`, the basis remains single-window, and baseline versus simulated digest impact still replays from the exact covered `selection_entry_ref` set rather than requerying live queues

## TV-55: Green score with filing-critical override is capped to review
- Given a trust synthesis run whose numeric `trust_score` is above the green threshold but one valid filing-critical override remains active
- When score band and cap band are combined
- Then `trust_band` resolves to `AMBER`, `automation_level` is not `ALLOWED`, and the case cannot reach `READY_TO_SUBMIT`

## TV-56: Near-threshold trust instability forces edge review
- Given trust, risk, completeness, or graph metrics land inside the frozen guard band around a filing threshold
- When trust synthesis emits threshold-stability state
- Then `threshold_stability_state = EDGE_REVIEW`, `TRUST_THRESHOLD_EDGE_REVIEW` is emitted, and filing progression remains review-only rather than green-pass

## TV-56A: Upstream review cap cannot be outranked by a green trust score
- Given a trust synthesis run whose numeric `trust_score` lands in the green range while an earlier
  non-access gate still caps legal progression at review
- When `TrustSummary` is persisted
- Then `upstream_gate_cap = REVIEW_ONLY`, `cap_band = AMBER`, `trust_band` is not `GREEN`,
  `automation_level` is not `ALLOWED`, and `blocking_dependency_refs[]` remains populated
  so downstream action surfaces cannot advertise submit-capable posture

## TV-56B: Trust input basis ceiling prevents stale or authority-limited inputs from masquerading as green automation
- Given a trust synthesis run whose score-only inputs land in the green range but the persisted
  trust-input basis is stale or authority-limited
- When `TrustSummary` is persisted
- Then `trust_input_basis_contract.trust_input_state` stays explicit, its
  `automation_ceiling` / `filing_readiness_ceiling` cap the final posture, its
  `input_reason_codes[]` are preserved in `reason_codes[]`, and every non-dominant basis reason also
  remains in `decision_constraint_codes[]`

## TV-56C: Trust explainability discloses authority and limitation posture without replay
- Given a `TrustSummary` whose authority progression is `REVIEW_LIMITED` and whose automation level
  is `LIMITED`
- When the shared explainability packet is persisted
- Then `decision_explainability_contract.compressed_reason_codes[]` stays a prefix of
  `reason_codes[]`, `semantic_qualifiers[]` includes `AUTHORITY_STATE` and `LIMITATION_STATE`, and
  workflow or shell consumers do not need to recompute explanation from trust scores

## TV-56D: Trust sensitivity contract freezes score-versus-cap divergence and guard-band triggers
- Given a `TrustSummary` whose numeric `score_band = GREEN` but whose final `cap_band = AMBER`
  because threshold fragility or non-score posture still limits automation
- When `trust_sensitivity_analysis_contract` is persisted
- Then it carries `score_cap_alignment_state = CAP_STRICTER_THAN_SCORE`, non-empty
  `cap_driver_reason_codes[]`, the exact active `edge_trigger_codes[]`, and the persisted trust and
  authority margins without requiring local recomputation

## TV-56E: Trust sensitivity contract uses the canonical six perturbation probes only
- Given a persisted `TrustSummary`
- When `trust_sensitivity_analysis_contract.projected_case_results[]` is serialized
- Then it contains exactly `TRUST_SCORE_MINUS_ONE`, `TRUST_SCORE_PLUS_ONE`,
  `RISK_SCORE_PLUS_ONE`, `AUTHORITY_UNCERTAINTY_PLUS_ONE`, `FRESHNESS_INVALIDATED`, and
  `INVALID_OVERRIDE_RELIED_UPON` in canonical order, with no extra safer/riskier or baseline-local
  probe variants

## TV-56F: Freshness invalidation and invalid override probes fail closed
- Given a persisted `TrustSummary` with a current admissibility posture
- When the analyzer projects `FRESHNESS_INVALIDATED` or `INVALID_OVERRIDE_RELIED_UPON`
- Then the freshness probe adds `TRUST_INPUT_STALE` plus `TRUST_RECALCULATION_REQUIRED`, and the
  invalid-override probe collapses to contradicted or insufficient-data posture with blocked
  automation and `TRUST_OVERRIDE_INVALID`

## TV-56G: Live authority review guard band forces edge review before automation
- Given a live-progression trust synthesis run with `authority_uncertainty_score` just below the
  review ceiling
- When `TrustSummary` and `trust_sensitivity_analysis_contract` are persisted
- Then `threshold_stability_state = EDGE_REVIEW`,
  `trust_sensitivity_analysis_contract.edge_trigger_codes[]` includes
  `AUTHORITY_REVIEW_GUARD_BAND`, the persisted contract retains
  `authority_review_margin_or_null`, and `automation_level` stays below `ALLOWED`

## TV-57: Late data after packet preparation invalidates filing readiness
- Given a prepared packet and a previously current trust summary
- When a persisted `LateDataMonitorResult` changes filing posture after seal
- Then `trust_currency_state` becomes `RECALC_REQUIRED`, the filing case leaves `READY_TO_SUBMIT`,
  `trust_invalidation_reason_codes[]` and `trust_invalidation_dependency_refs[]` both remain
  populated, and `FILING_GATE` blocks progression until trust is resynthesized

## TV-58: Authority correction reverses amendment-era trust readiness
- Given a filing case was review-ready or submit-ready against a known amendment baseline
- When authority reconciliation discovers a corrected or out-of-band baseline that changes the comparison anchor
- Then the prior trust summary is treated as stale, a new parity/trust cycle is required, and packet/submission reuse is prevented until recalculation completes

## TV-59: Filing-critical contradiction prevents proof closure and blocks filing
- Given a filing-capable target has two materially different decisive paths and the contradiction remains unresolved
- When `BUILD_EVIDENCE_GRAPH(...)`, `RETENTION_EVIDENCE_GATE`, and `FILING_GATE` evaluate the current posture
- Then the target is classified `CONTRADICTED`, the controlling proof bundle records the rejected competing path, and filing progression fails closed

## TV-60: Decisive late data stales the controlling proof bundle
- Given a current filing case and proof bundle bind a decisive filing path
- When a persisted `LateDataFinding` touches a source or fact on that decisive path after seal
- Then the affected target assessment becomes `STALE`, the controlling proof bundle becomes `STALE` or `SUPERSEDED`, and the graph moves to `STALE` or `REBUILD_REQUIRED`

## TV-60A: Authority posting lag does not masquerade as a true post-baseline event
- Given late data is discovered after cutoff but the authority publication clearly lags a pre-cutoff effective fact
- When the indicator and finding are persisted
- Then `temporal_classification_contract.temporal_classification = AUTHORITY_POSTING_LAG`, the event does not serialize as `TRUE_POST_BASELINE_EVENT`, and any downstream review or retroactivity is driven by baseline touch rather than discovery time

## TV-60B: Temporally unproved decisive late data blocks automation
- Given late data touches a filing-critical baseline but the engine cannot prove whether the legal effect was pre-cutoff or post-baseline
- When the finding and monitor result are persisted
- Then the temporal contract records `TEMPORALLY_UNPROVED`, `temporal_consequence_summary.highest_legal_consequence = TEMPORAL_UNCERTAINTY_BLOCK`, trust becomes non-reusable, and straight-through progression stays blocked

## TV-60C: Stale proof replay preserves historical late-data lineage
- Given a decisive filing path is invalidated by persisted late data after seal
- When the stale proof bundle and graph target assessment are written
- Then both retain `staleness_dependency_refs[]`, and historical replay uses those persisted late-data refs instead of refreshing stale posture from live late-data scans

## TV-60D: Counterfactual late-data simulator keeps the canonical five temporal classes and outcome buckets
- Given one `late_data_retroactive_impact_simulation_basis_contract` freezes the historical cutoff,
  baseline, covered exact scope, covered submission chain, persisted monitor result, finding refs,
  temporal-propagation refs, and proof refs
- When `LateDataRetroactiveImpactSimulation` is materialized under
  `execution_mode_boundary_contract{ run_kind = REPLAY, replay_class_or_null = COUNTERFACTUAL_ANALYSIS,
  execution_mode = ANALYSIS, legal_effect_boundary = COUNTERFACTUAL_REPLAY_READ_ONLY }`
- Then the artifact emits exactly one ordered scenario for each of
  `PRE_CUTOFF_PREEXISTING_LATE_ARRIVAL`,
  `POST_CUTOFF_DISCOVERY_PRE_BASELINE_FACT`,
  `AUTHORITY_POSTING_LAG`,
  `TRUE_POST_BASELINE_EVENT`, and
  `TEMPORALLY_UNPROVED`, and the only allowed outcome classes are `CURRENT_ONLY`,
  `EXPLANATION_ONLY`, `AMENDMENT_TRIGGERING`, `REPLAY_TRIGGERING`, and `REVIEW_BLOCKED`

## TV-60E: Counterfactual late-data simulator stays partition-bounded and replay-safe
- Given a historical late-data simulator basis covers one exact scope and one prior submission chain
- When a simulated scenario touches late data from that historical slice
- Then `impacted_scope_refs[]`, `impacted_submission_refs[]`, and `restatement_scope_refs[]` stay
  within the declared covered sets, discovery time alone cannot promote retroactive replay, and the
  simulator cannot widen into unrelated partitions, perform live rescans, or mutate prior filed
  state in place

## TV-60F: Temporally unproved decisive late data forces blocked simulation posture
- Given a simulated late-data scenario touches a decisive proof path but cannot prove whether the
  legal effect was pre-cutoff or post-baseline
- When `LateDataRetroactiveImpactSimulation` is persisted
- Then the `TEMPORALLY_UNPROVED` scenario records `highest_legal_consequence = TEMPORAL_UNCERTAINTY_BLOCK`,
  `trust_currency_state = RECALC_REQUIRED`, `proof_effect = STALE_REVALIDATION_REQUIRED`,
  `amendment_effect = RECONCILE_FIRST`, and `simulation_outcome_class = REVIEW_BLOCKED`

## TV-61: Historical proof bundle remains queryable but not controlling after supersession
- Given a later graph version supersedes an earlier controlling proof bundle for the same filing-capable target
- When a reviewer requests historical replay and the live filing flow requests current posture
- Then the historical proof bundle remains reconstructible for replay, but only the non-superseded bundle may control current filing readiness or submission posture

## TV-61A: Closed proof posture cannot survive replay-closure failure
- Given a filing-capable target still has a recorded primary path but one decisive or rejected path ref is missing from the bundle replay recipe
- When `ProofBundle` and the target assessment are rebuilt
- Then `proof_closure_contract.replay_closed = false`, `closure_state = OPEN`, the target does not remain `SUPPORTED` or `PARTIALLY_SUPPORTED`, and the graph does not advertise the stale bundle as controlling

## TV-61B: Rejected-path ordering remains explicit and deterministic
- Given two non-primary candidate paths materially differ from the chosen primary path
- When the controlling `ProofBundle` is persisted
- Then `rejected_path_refs[]`, `rejected_path_entries[]`, and `replay_recipe.path_ref_order[]` all preserve the same deterministic primary-plus-rejected order and the rejection basis for each non-primary path

## TV-61C: Silent limitation ambiguity fails closed instead of degrading to partial support
- Given the best available decisive path still depends on an unrecorded or silent limitation ambiguity
- When the target assessment and proof bundle are classified
- Then `proof_closure_contract.silent_limitation_ambiguity_present = true`, `support_state = UNSUPPORTED`, `closure_state = OPEN`, and the failure reason remains explicit

## TV-62: Explanation render failure stays explicit without pretending the proof is whole
- Given the proof bundle can still be reconstructed but reviewer or filing-artifact rendering fails
- When an enquiry pack or audit-provenance export is generated
- Then the rendered artifact records `explanation_status = FAILED`, emits explicit omissions or limitations, and does not present a silently partial explanation as complete

## TV-62A: Retention-limited decisive proof degrades explanation instead of disappearing
- Given the controlling proof survives only through a tombstoned, pseudonymised, or otherwise limited decisive artifact
- When the `ProofBundle`, `EvidenceGraph`, and `EnquiryPack` are persisted
- Then each carries `retention_limited_explainability_contract`, the affected decisive refs stay present in `limitation_notes[]`, and no surface advertises `explanation_status = AVAILABLE`

## TV-62B: Enquiry export cannot hide retention loss behind a seemingly complete pack
- Given an enquiry pack depends on a retention-limited primary path or controlling proof bundle
- When the pack is rendered for operator or reviewer export
- Then `retention_binding`, `limitation_notes[]`, and `omission_entries[]` all remain present and point at the affected critical refs

## TV-62C: Audit events remain reconstructible after payload expiry
- Given a compliance-significant audit payload expires and only hash or tombstone posture survives
- When the `AuditEvent` is retained
- Then `retained_context.payload_availability_state` degrades from `FULL`, `audit_sufficiency_state = LIMITED`, and object, reason, and lineage minimums remain queryable

## TV-63: Late evidence widens into prior filed position
- Given a confirmed filed baseline and a later-arriving source that changes a previously filed liability-bearing total
- When post-finalisation drift evaluation runs
- Then the engine persists `RetroactiveImpactAnalysis`, identifies the impacted prior submission refs, and opens bounded continuation/replay rather than mutating the old filed state in place

## TV-64: Ready-to-amend state becomes stale before confirm-amendment
- Given an `AmendmentCase` already in `READY_TO_AMEND`
- When new authority state or new filing-critical evidence changes the baseline envelope or retroactive-impact artifact before submission
- Then the engine emits `AmendmentFreshnessInvalidated`, moves the case back to intent/review posture, and blocks straight-through amendment submission

## TV-64A: Exact-scope legal truth beats broader client-period baseline
- Given a broader client-period baseline and an exact-scope legal baseline both survive candidate collection
- When `SELECT_DRIFT_BASELINE(...)` computes the dominance key and persists `selection_contract`
- Then the chosen envelope records `scope_match_class = EXACT_SCOPE_MATCH`,
  `scope_resolution_state = EXACT_SCOPE_SELECTED`, and the broader client-period baseline is not
  allowed to win

## TV-64B: External authority truth does not masquerade as internal chain continuity
- Given the selected baseline is `AUTHORITY_CORRECTED` or `OUT_OF_BAND`
- When `DriftBaselineEnvelope` is persisted
- Then `selection_contract.continuity_class` stays external,
  `same_scope_truth_resolution_state` stays external-truth-owned, internal chain continuity remains
  false, and the envelope does not imply same-chain amendment continuity

## TV-64C: Trigger persists when live amendment is not yet legal
- Given drift is material enough to open amendment-aware workflow but the amendment window is closed, the baseline is unreconciled, or authority prerequisites are unproved
- When `DriftRecord` and `AmendmentCase` persist `amendment_eligibility_contract`
- Then `trigger_state = TRIGGERED` survives while `eligibility_state` stays non-eligible,
  `baseline_progression_ceiling_or_null` preserves the baseline-derived cap, and the workflow routes
  to review or reconciliation instead of downgrading to benign drift

## TV-64D: Window expiry clears active readiness before submission
- Given an `AmendmentCase` already persisted a reusable intent-to-amend basis
- When the governing `AmendmentWindowContext` closes or its evaluation hash changes before confirm-amendment submission
- Then `amendment_eligibility_contract.readiness_reuse_state` becomes `STALE` or `NOT_APPLICABLE`, `eligibility_state` no longer remains `ELIGIBLE_NOW`, and submission progression is blocked pending fresh intent or review

## TV-64DA: Same-scope unresolved out-of-band truth blocks weaker internal filed lineage
- Given an exact-scope internal filed baseline and later exact-scope external evidence proves unresolved out-of-band legal truth for that same scope
- When `SELECT_DRIFT_BASELINE(...)` freezes the winning baseline contract
- Then the selected baseline becomes `OUT_OF_BAND`,
  `same_scope_truth_resolution_state = OUT_OF_BAND_EXTERNAL_TRUTH_BLOCKS_INTERNAL_LINEAGE`,
  `automation_ceiling = BLOCKED`, and amendment progression remains `RECONCILE_FIRST`

## TV-64DB: Superseding baseline writes a new immutable envelope instead of mutating the old one
- Given an existing exact-scope `DriftBaselineEnvelope` has already been used by drift or amendment workflow
- When later authority reconciliation finds a better same-scope baseline
- Then the engine writes a new envelope with a new `frozen_hash`, records
  `supersedes_baseline_frozen_hash_or_null` back to the older envelope, and never rewrites the older
  envelope in place

## TV-64DB1: Baseline visualizer persists losing-path explanations
- Given exact-scope authority-corrected, exact-scope filed, and broader out-of-band candidates all survive candidate collection
- When `SELECT_DRIFT_BASELINE(...)` persists `DriftBaselineSelectionVisualization`
- Then `candidate_results[]` lists every candidate with deterministic display rank, candidate dominance tuple, scope compatibility, loss reasons for every rejected candidate, and selected reason codes only on the winner

## TV-64DB2: Baseline visualizer must pick the lexicographic maximum compatible candidate
- Given two exact-scope compatible candidates where one has the stronger precedence and authority-resolution ranks
- When `DriftBaselineSelectionVisualization.selected_candidate_ref` and `selected_selection_contract` are persisted
- Then the selected candidate is the lexicographic maximum compatible dominance key, and a lower-ranked filed candidate cannot remain selected while the stronger exact-scope authority-corrected candidate is still lawful

## TV-64DB3: Same-scope lineage shows reuse versus successor replacement
- Given one exact-scope baseline envelope is currently active and a later same-scope selector run reuses it or supersedes it
- When `DriftBaselineSelectionVisualization.same_scope_envelope_lineage[]` is persisted
- Then there is exactly one active entry, superseded predecessors retain `superseded_at_or_null`, and the selected envelope ref plus frozen hash are visible without reloading mutable history

## TV-64DC: Trust keeps baseline-derived automation caps explicit
- Given trust inputs are otherwise current but the controlling baseline was selected with uncertainty or unresolved out-of-band posture
- When `ASSESS_TRUST_INPUT_STATE(...)` emits `trust_input_basis_contract`
- Then `baseline_selection_contract_hash_or_null` is retained, `baseline_automation_ceiling`
  reflects the persisted baseline limit, and trust does not rise above that ceiling even if score,
  risk, and freshness would otherwise allow it

## TV-64E: Projection rebuild cannot become command-side truth
- Given durable `RunManifest`, `WorkflowItem`, `GateDecisionRecord`, `AuthorityInteractionRecord`, `ApiCommandReceipt`, and append-only audit evidence already exist for a command attempt
- When `DecisionBundle`, `ExperienceDelta`, `LowNoiseExperienceFrame`, `ExperienceCursor`, or portal/workspace projections are rebuilt, reloaded, or used as recovery mirrors after cache loss, reconnect, or replay
- Then command legality, retry, stale-view recovery, and authority reconciliation still resolve from the durable records and receipts, projection refs remain observational only, and rebuilding the read side does not alter durable truth

## TV-64F: Frozen manifest worker envelope cannot reconstruct lineage from adjacent rows
- Given a child `RunManifest` persists `continuation_set{...}` plus frozen config/input lineage after replay, recovery, or fresh-child branching
- When the manifest is frozen and later reloaded for worker execution or replay validation
- Then `frozen_execution_binding{...}` retains the same continuation ids, branch hash, inheritance modes, inherited-freeze refs, and fresh-child reason codes as the authoritative manifest lineage, `output_refs{...}` remains structured with artifact hashes and dependency refs, and any mirror drift fails closed instead of being normalized from neighboring objects

## TV-64G: Request-backed authority artifacts share one grouped request identity
- Given an `AuthorityRequestEnvelope`, `AuthorityInteractionRecord`, and request-backed `SubmissionRecord` are persisted for one authority attempt
- When recovery, resend-legality checks, or reconciliation reload the lineage
- Then each request-backed artifact carries the same `request_identity_contract{...}`, the engine does not rebuild request identity from `AuthorityOperation` plus `AuthorityBinding`, and only `OUT_OF_BAND` settlement may clear the grouped request identity from `SubmissionRecord`

## TV-64H: Gate semantics contract must mirror the frozen decision posture
- Given a non-access `GateDecisionRecord` is persisted for any gate outcome
- When the record is validated or replayed
- Then `gate_semantics_contract.decision_rank`, `progression_rank`, `blocking_class`, and `progression_semantics` exactly match the frozen `decision`, and downstream consumers do not recompute those semantics from local enums

## TV-64I: Override-governed review or notice posture stays explicit
- Given a gate originally required scoped override and a valid approved override is active when the persisted outcome is `PASS`, `PASS_WITH_NOTICE`, or `MANUAL_REVIEW`
- When the gate record is written and later consumed by action filtering or audit replay
- Then `override_resolution_state = VALID_OVERRIDE_ACTIVE`, `active_override_refs[]` stays non-empty and canonically ordered, and `gate_semantics_contract.override_dependency_state = VALID_OVERRIDE_GOVERNED` so the progressed posture cannot be mistaken for override-independent passage

## TV-64J: Terminal control objects do not reopen in place
- Given a `DeploymentRelease`, `ReleaseVerificationManifest`, or other FE-46 governed control object is already persisted in a terminal state
- When recovery, replay, a background worker, or an operator action attempts to move that same object back into a live non-terminal state
- Then validation fails closed with `typed_rejection_family = ILLEGAL_STATE_TRANSITION`, no partial state mutation is written, and any continued work must allocate successor or superseding lineage instead of reopening the terminal object in place

## TV-64K: Historical manifest stays on the recorded bundle or a window-compatible reader
- Given a sealed `RunManifest`, `NightlyBatchRun`, or replay/restore evidence row already persists `schema_bundle_hash` plus `schema_reader_window_contract{...}`
- When a newer writer bundle is deployed and a historical manifest is reloaded for continuation, replay, or restore
- Then the runtime either loads the recorded bundle directly or proves the current reader is listed in `supported_reader_schema_bundle_hashes[]`, and it fails closed instead of silently deserializing historical truth through an incompatible reader

## TV-64L: Contract phase waits for closed reader window and complete backfill
- Given a `SchemaMigrationLedger` with `backfill_execution_contract.execution_requirement = IDEMPOTENT_BACKFILL_REQUIRED`
- When migration verification, contract, rollback-safe, or fail-forward posture is evaluated
- Then `VERIFIED` and later release evidence retain the same `schema_reader_window_contract{...}`, `CONTRACTING` is blocked until `backfill_execution_contract.execution_state = COMPLETE` and `schema_reader_window_contract.window_state = CONTRACT_ELIGIBLE_WINDOW_CLOSED`, and rollback stops being lawful once the closed-window fail-forward boundary is reached

## TV-64M: Externalized audit, portal, explanation, and authority-link slices stay bound to the reviewed posture
- Given `AuditInvestigationFrame`, `ClientDocumentRequest`, `ClientApprovalPack`, `EnquiryPack`, and `AuthorityLinkInventoryItem` each publish `externalization_governance_contract{ boundary_scope, tenant_id, shell_family_or_null, context_anchor_ref, slice_binding_ref, delivery_surface_kind, history_meaning_state, eligibility_state, approval_state, access_binding_hash_or_null, masking_state, masking_posture_fingerprint_or_null, limitation_state, visibility_cache_partition_key_or_null, delivery_binding_hash, preview_target_ref_or_null, download_target_ref_or_null, print_target_ref_or_null, external_handoff_target_ref_or_null, approval_requirement_token_or_null, blocking_context_tokens[], ... }`
- When masked export, limited explanation export, current-with-history download, approval-gated delivery, or external authority-link handoff is invoked, replayed, or reopened
- Then the active filtered slice, current-vs-history meaning, tenant/access/masking/visibility context, masking or limitation posture, approval posture, and external handoff target remain identical to the mounted governed context, and direct URL, signed URL, temp-file, or detached background scope bypass is rejected

## TV-64N: Authority layering stays explicit across delegation, link, exception, and human approval
- Given an authority-integrated authorization, binding, operation, or request is persisted for a client-affecting action
- When the engine freezes `authority_layer_boundary{...}` and validates the sendable artifact
- Then tenant permission, client delegation, imported freshness, authority-link readiness, exceptional authority, human-gate evidence, and authority-of-record precedence remain separate machine-checkable layers, service principals do not appear to have satisfied step-up or approval, imported or handshake delegation cannot stay live without current freshness, and exceptional authority cannot widen client or partition scope or substitute for delegation or authority truth

## TV-65: Same-scope overlapping amendments supersede deterministically
- Given one active amendment chain for an exact scope and a later manifest for the same exact scope with newer material drift
- When the later amendment case is persisted
- Then the earlier same-scope `DriftRecord`, `AmendmentCase`, and any frozen `AmendmentBundle` are superseded without deletion, and only one active chain head remains

## TV-65A: Governance mutation hazard stays identical from preview through basket and blast panel
- Given a mutation-capable governance preview persisted `mutation_hazard{ hazard_contract_hash, policy_snapshot_hash, access_binding_hash, dependency_topology_hash, simulation_basis_hash, count_class_profile_code, impact_radius_lower_score, impact_radius_upper_score, impacted_*_count_class, privilege_gain_score, scope_expansion_score, masking_relaxation_score, policy_risk_score, approval_necessity_score, approval_requirement, commit_authority_posture, bounded_safe_mutation, simulation_confidence_score, predictability_score, risk_driver_codes[], approval_trigger_codes[], confidence_limiter_codes[], bounded_safety_blocker_codes[] }`
- When the same change set is staged into `GovernancePolicySnapshot.change_basket`, reflected in `ApprovalComposer`, and rendered in `BlastRadiusPanel`
- Then `active_mutation_hazard_or_null.hazard_contract_hash`, each staged group's `mutation_hazard.hazard_contract_hash`, and `blast_radius_panel.mutation_hazard_or_null.hazard_contract_hash` remain identical, `mutation_basis_contract.hazard_contract_hash` mirrors that same reviewed hazard identity, and direct submission stays blocked whenever the preserved hazard posture is `PREVIEW_ONLY`

## TV-65B: Low-confidence governance previews remain advisory-only
- Given a mutation-capable governance preview whose frozen hazard has `simulation_confidence_score < 80` or `predictability_score < 75`
- When the preview is rendered in the simulator, staged basket, and approval composer
- Then `commit_authority_posture = PREVIEW_ONLY`, `confidence_limiter_codes[]` is non-empty, and the UI may save the preview for review but SHALL NOT expose direct commit styling or commit-capable commands

## TV-65C: Mixed governance hazard bases never collapse into one active basket hazard
- Given two staged governance change groups with different `hazard_contract_hash`, `basis_contract_hash`, `approval_requirement`, or `required_approvals[]`
- When they are collected into one `GovernancePolicySnapshot.change_basket`
- Then `simulation_atomicity != ATOMIC`, `active_mutation_hazard_or_null = null`, and `blast_radius_panel.mutation_hazard_or_null` remains null until one coherent reviewed hazard basis is selected

## TV-66: Authority-accepted amendment later internally superseded
- Given an amendment was authority-confirmed and a newer internal same-scope continuation later produces a different amendment path
- When the new case becomes the active chain head
- Then the historical authority-accepted case remains queryable, the new case links to it by supersession, and `AuthorityAcceptedStateInternallySuperseded` is emitted

## TV-67: Contradictory drift sources force escalation
- Given contradictory late-data and authority-correction signals imply incompatible affected scopes or incompatible filing-state deltas
- When drift classification and retroactive impact analysis run
- Then the engine sets review/escalation posture, emits `DriftReviewEscalated`, and prevents silent straight-through amendment progression

## TV-68: Delayed acknowledgement resolves unknown without duplicate resend
- Given a live authority mutation timed out into `SubmissionRecord = UNKNOWN`
- When a later bound callback or recovery read proves the same request lineage `CONFIRMED` or `REJECTED`
- Then the existing unknown lineage is resolved in place, the duplicate bucket remains closed to blind resend, and no second mutation packet leaves the gateway

## TV-69: Duplicate bucket changes before send abort the queued exchange
- Given a request is sealed and queued for send but a newer authority-grounded state or duplicate-bucket occupant appears before bytes leave the worker
- When send-time revalidation and exclusive-send claim execute
- Then the exchange is abandoned or routed to reconciliation, the non-send reason is persisted, and no stale transmit occurs

## TV-69A: Drift sentinel freezes blocked send lineage instead of logging drift loosely
- Given a queued live authority mutation reaches the pre-send safety boundary
- When token lineage, authority link, duplicate truth, and exclusive-send claim are rechecked
- Then `AuthorityInteractionRecord.binding_drift_sentinel_contract{...}` persists the exact checked binding identity, the checked action class, transmit-claim posture, duplicate-truth posture, and the named pass or block outcome before any send or abandonment transition is recorded

## TV-69B: Recovery and reconciliation reads reuse the same drift sentinel boundary
- Given an interaction later performs a live `RECOVERY_READ` or `RECONCILIATION_POLL` after an earlier transmit already cleared send-time revalidation
- When the worker rechecks binding lineage, subject or scope identity, provider contract, and newer duplicate or stronger truth before that live read
- Then the same `binding_drift_sentinel_contract{...}` vocabulary is reused with `checked_action_class in {RECOVERY_READ, RECONCILIATION_POLL}`, transmit-only claim reasons stay illegal, and the live read blocks fail-closed if the checked binding context drifted

## TV-70: Ambiguous ingress is quarantined instead of mutating legal state
- Given an authenticated callback or poll result cannot be bound to exactly one request lineage for the same legal meaning
- When ingress normalization classifies the provider payload
- Then the response is normalized as `ACK_AMBIGUOUS_CORRELATION`, terminal submission state is not mutated, and reconciliation or review owns the next step

## TV-70A: Authority-reference-only ingress stays quarantined until stronger lineage proof exists
- Given an authenticated callback or recovery payload matches a persisted `authority_reference` but does not carry corroborating `request_hash` or the exact `(idempotency_key, duplicate_meaning_key, identity_namespace_hash)` tuple for one interaction
- When the ingress checkpoint persists `AuthorityIngressReceipt`
- Then `correlation_status = BOUND_WITH_AUTHORITY_REFERENCE_ONLY`, `receipt_state = QUARANTINED`, `reconciliation_owner_ref` is non-null, and no success, pending, rejection, or out-of-band legal-state mutation is emitted

## TV-70B: Callback, poll, and recovery duplicates collapse to one canonical ingress receipt
- Given a provider delivers the same authenticated payload through callback first and later through poll or recovery with the same `provider_delivery_ref`, `response_body_hash`, and ingress metadata basis
- When the second delivery reaches the ingress checkpoint
- Then it persists `receipt_state = DUPLICATE_SUPPRESSED`, points `canonical_ingress_receipt_ref` at the first-seen receipt, emits no second normalized response, and does not mutate legal state a second time

## TV-70C: Callback and poll corroboration does not create a second legal-state mutation
- Given one bound callback already produced a normalized response and later a poll returns the same authority meaning for the same interaction
- When the second observation is merged into the interaction
- Then it is recorded in `response_history_ids[]` as `CORROBORATING_OBSERVATION`, `active_response_id` remains stable, and no duplicate success, pending, rejection, or out-of-band mutation is emitted

## TV-70D: Timeout placeholder cannot be silently replaced by later recovery evidence
- Given a transmit first normalizes as `ACK_TIMEOUT_OR_NO_RESOLUTION`
- When a later callback, poll, or recovery read indicates a concrete authority outcome for that same interaction
- Then the later response preserves `supersedes_response_id` back to the timeout placeholder, `meaning_resolution_state` becomes `RECONCILIATION_REQUIRED`, and legal truth changes only after explicit reconciliation

## TV-70E: Conflicting callback and poll observations force reconciliation instead of source precedence
- Given callback and poll observations for the same exact interaction imply incompatible authority meaning
- When the later observation is normalized
- Then it becomes `ACK_INCONSISTENT_STATE` with `derivation_posture = CONFLICTING_OBSERVATION`, the interaction preserves both response refs in history, and the protocol refuses to resolve the conflict by freshness or source-family priority alone

## TV-70O: Async authority observations must retain persisted ingress proof
- Given a callback, poll result, or recovery read normalizes into an `AuthorityResponseEnvelope`
- When the envelope is persisted and later reused to advance `SubmissionRecord`, `AuthorityInteractionRecord`, or `ObligationMirror`
- Then `authority_ingress_proof_contract{...}` is non-null, names the canonical `AuthorityIngressReceipt`, keeps authenticated-channel evidence and exact lineage-binding basis, and the downstream artifact does not reconstruct ingress legality from nearby request records alone

## TV-70P: Weak or unbound ingress proof cannot drive settlement or mirror mutation
- Given authenticated provider bytes are checkpointed with `correlation_status in {BOUND_WITH_AUTHORITY_REFERENCE_ONLY, AMBIGUOUS, UNBOUND}`
- When the system attempts to publish `SubmissionRecord = PENDING_ACK|CONFIRMED|REJECTED` or authority-backed `ObligationMirror.authority_truth_state`
- Then `authority_ingress_proof_contract.mutation_gate_state` remains quarantine-only or duplicate-suppressed, the legal-state mutation is rejected, and reconciliation ownership remains explicit

## TV-70Q: Quarantined ingress remains explainable from persisted payload and correlation evidence
- Given an authenticated callback is quarantined because one `authority_reference` matches more than one persisted request lineage
- When the system builds `AuthorityIngressInvestigationSnapshot`
- Then the snapshot retains `response_body_ref`, `authority_ingress_correlation_contract{ comparison_set_state = MULTI_MATCH, candidate_lineages[] }`, supporting audit refs, and only non-mutating safe next actions

## TV-70R: Unbound ingress distinguishes missing provider keys from no-match posture
- Given one authenticated provider payload carries no usable authority reference, request hash, or idempotency tuple
- When the checkpoint persists `authority_ingress_correlation_contract{...}`
- Then it serializes `comparison_set_state = MISSING_PROVIDER_KEYS`, `resolution_state = UNBOUND_MISSING_IDENTITY_CLAIMS`, zero candidate lineages, and no legal-state mutation path

## TV-70S: Duplicate-suppressed ingress investigation points back to the canonical receipt
- Given a second authenticated provider delivery is deduped against an earlier canonical ingress receipt
- When the investigation snapshot is built for that duplicate-suppressed receipt
- Then `delivery_lineage.canonical_ingress_receipt_ref_or_self` points at the earlier canonical receipt, `REVIEW_CANONICAL_RECEIPT` is a safe next action, and direct legal mutation remains blocked

## TV-70F: Recovery and continuation preserve the open reconciliation budget instead of resetting it
- Given an interaction is already in `UNKNOWN` with persisted `reconciliation_attempt_count = 2`, non-null `next_reconciliation_at`, `reconciliation_budget_state = ACTIVE`, and `resend_legality_state = FOLLOW_UP_READ_ONLY`
- When a worker crashes, the queue is rebuilt, or a continuation manifest resumes the same exact authority meaning
- Then the resumed path reuses the persisted attempt count, next follow-up time, and resend posture, and it does not reopen a fresh mutation send under the same interaction lineage

## TV-70G: Budget exhaustion blocks resend and opens explicit escalation ownership
- Given an unresolved interaction reaches its final automatic reconciliation attempt or passes `reconciliation_deadline_at` without decisive authority truth
- When reconciliation control advances that interaction
- Then `reconciliation_budget_state` becomes `EXHAUSTED` or `ESCALATED`, `resend_legality_state` blocks further automatic resend, `reconciliation_workflow_item_ref` is opened when escalated, and the packet does not re-enter transport

## TV-70H: Contradictory authority evidence blocks resend before budget math can reopen transport
- Given remaining automatic reconciliation attempts still exist but the latest admissible authority observations are contradictory or prove an out-of-band state for the same exact meaning
- When duplicate suppression and reconciliation posture are evaluated
- Then the interaction moves to `BLOCKED_BY_RECONCILIATION` or `BLOCKED_BY_ESCALATION`, records explicit `resend_control_reason_codes[]`, and no automatic resend occurs despite unused nominal budget

## TV-70I: Pending authority truth cannot render resolved workflow or client reassurance
- Given a `SubmissionRecord` remains `PENDING_ACK` for one obligation and downstream `WorkflowItem` plus `ClientTimelineEvent` are recomputed
- When projection logic attempts to publish `lifecycle_state = DONE`, `customer_status_projection = RESOLVED`, or a confirming client headline
- Then validation fails closed unless the workflow stays in waiting posture, the timeline remains non-confirming, and `authority_truth_state = PENDING_ACK` stays explicit

## TV-70J: Rejected authority truth cannot be overwritten by internal completion
- Given authenticated authority evidence updates one `SubmissionRecord` to `REJECTED`
- When mirror, workflow, or customer projection updates run
- Then `ObligationMirror.authority_truth_state = REJECTED` remains explicit, confirmed anchors stay empty, and no internal completion, override, or accepted-risk annotation may republish the outcome as confirmed

## TV-70K: Confirmed authority truth resolves downstream state only from authority evidence
- Given a bound normalized response or reconciliation result proves one exact request lineage `CONFIRMED`
- When downstream mirror, workflow, and timeline artifacts are persisted
- Then `SubmissionRecord` carries the authority-grounded confirmation, `ObligationMirror.last_confirmed_submission_ref` becomes non-null, waiting-on-authority workflow posture clears, and the customer-safe projection may become resolved without inventing confirmation from internal state alone

## TV-70L: Unknown and out-of-band authority outcomes stay typed and non-confirming
- Given reconciliation returns `UNKNOWN` for one interaction or `OUT_OF_BAND` for one obligation meaning
- When `ObligationMirror`, `WorkflowItem`, and `ClientTimelineEvent` are republished
- Then each artifact keeps the explicit typed `authority_truth_state`, no confirmed submission anchor is reused, and generic success copy such as "Submission confirmed" or "Status updated" is rejected

## TV-70M: Late authority correction reopens previously resolved projections
- Given an earlier admissible authority result led to resolved workflow and customer-safe projection state
- When a later bound authority correction or contradictory corroborated observation reopens reconciliation and changes the legal outcome
- Then downstream workflow, mirror, and client timeline artifacts are reissued from the corrected authority truth, prior resolved projection posture is not treated as final, and the correction remains auditable through preserved response history

## TV-70N: Override and accepted-risk posture remain internal annotations only
- Given an operator accepts risk, records an override, or closes an internal workflow while authority truth is still `UNKNOWN`, `PENDING_ACK`, or `OUT_OF_BAND`
- When the system republishes settlement, mirror, and client-safe artifacts
- Then the override remains internal governance context only, `SubmissionRecord` does not become `CONFIRMED`, and customer-visible authority posture remains explicitly unresolved

## TV-70T: Restore and replay reuse the grouped reconciliation control contract
- Given an unresolved authority interaction already published `reconciliation_control_contract{ control_contract_hash, reconciliation_attempt_count = 2, next_reconciliation_at, replay_resume_policy = RESUME_PERSISTED_BUDGET_ONLY }`
- When restore, replay, or continuation resumes the same interaction lineage
- Then the resumed path reuses that exact grouped control packet, does not reopen attempt budget, and does not derive follow-up timing from worker-local retry memory or newer authority-operation profiles

## TV-70U: Escalation handoff preserves owner, workflow, evidence, and due time
- Given automatic reconciliation exhausts its budget or contradictory authority evidence forces escalation
- When `reconciliation_control_contract` enters `escalation_state = ESCALATED`
- Then escalation owner, workflow item, evidence refs, reason codes, due timestamp, and blocked resend posture all remain non-null and durable across interaction, submission, and mirror handoff

## TV-70V: Reconciliation analytics derive only from durable control contracts
- Given one profile window contains active, closed, exhausted, and escalated authority interactions
- When `AuthorityReconciliationAnalyticsSnapshot` is emitted
- Then `budget_state_counts[]`, `outcome_class_counts[]`, resend-refusal counts, escalation latency, and tuning recommendations derive from persisted grouped control contracts and referenced interaction refs rather than transport retry logs or ephemeral worker counters

## TV-71: Scope execution binding prevents ambiguous runtime reduction
- Given a caller requests a live-capable scope, authorization produces an executable scope, and downstream gates plus authority workers consume the published `scope_execution_binding{ requested_scope_family, executable_scope_family, requested_scope[], executable_scope[], reduction_posture, mutation_atomicity, access_binding_hash }`
- When analysis mode attempts to carry a live-capable family, a live-capable request would be silently narrowed, or a worker/runtime artifact drifts from the published binding
- Then validation fails closed, the executable scope identity changes when masking or partition coverage changes, and no downstream gate or authority artifact may reopen raw requested scope as executable meaning

## TV-72: Branch decision proof prevents reuse and continuation collisions
- Given a request can legally match a terminal result, a still-sealed manifest, or a child-allocation path depending on exact idempotent identity, nightly window, replay class, and inheritance posture
- When orchestration emits `manifest_branch_decision{...}` on the selected manifest and mirrors the same contract into trace/audit branch events
- Then `branch_action` remains distinct from persisted `continuation_basis`, same-window nightly reuse cannot collide with later-window child creation, replay and recovery cannot collapse into ordinary continuation, and lineage mirrors cannot drift from `continuation_set{...}`

## TV-72A: New manifest allocation emits one manifest lineage trace and selected-manifest link
- Given no reusable prior manifest exists for one exact request identity
- When branch selection allocates a root `RunManifest`
- Then one `ManifestLineageTrace` is persisted with `selected_branch_action = NEW_MANIFEST`, the trace carries exhaustive `candidate_evaluations[]`, and the selected manifest appends that trace into `manifest_lineage_trace_refs[]`

## TV-72B: Bundle return emits request-time trace without rewriting manifest-local continuation basis
- Given a terminal manifest already has a lawful `decision_bundle_hash`
- When the same exact request is retried and orchestration returns that existing bundle
- Then `ManifestLineageTrace.selected_branch_action = RETURN_EXISTING_BUNDLE`, `returned_decision_bundle_hash_or_null` remains explicit, the selected manifest's original `continuation_basis` is not rewritten, and operator tooling can explain the reuse from the trace instead of diffing adjacent manifests

## TV-72C: Sealed same-manifest reuse stays distinct from bundle return and child allocation
- Given a pre-start `SEALED` manifest still matches one exact request identity
- When orchestration reuses that manifest instead of allocating a child
- Then `ManifestLineageTrace.selected_branch_action = REUSE_SEALED_MANIFEST`, the trace proves exact idempotency, scope, run-kind, and access-binding match, rejected candidates retain typed disqualifier codes, and no worker or UI path infers the reuse from the manifest's original allocation branch alone

## TV-72D: Replay-child trace preserves exact replay basis and rejects ordinary continuation
- Given a replay request binds to one completed source manifest
- When orchestration allocates a replay child
- Then the trace keeps `selected_branch_action = REPLAY_CHILD`, exact replay inheritance modes, parent manifest hash, rejected continuation candidates, and explicit audit/span linkage for the replay decision

## TV-72E: Recovery-child trace proves same-attempt recovery instead of sealed reuse
- Given a manifest attempt started and later requires lawful recovery
- When orchestration allocates a recovery child
- Then the trace keeps `selected_branch_action = RECOVERY_CHILD`, exact recovery inheritance modes, prior manifest lifecycle `IN_PROGRESS`, typed rejection for sealed-reuse and bundle-return candidates, and mirror parity across selected-manifest lineage surfaces

## TV-72F: Amendment branch trace keeps request-identity change and inheritance posture explicit
- Given amendment execution requires a lawful child instead of same-request continuation
- When orchestration allocates that amendment child
- Then the trace preserves `selected_branch_action = NEW_REQUEST_CHILD` or `CONTINUATION_CHILD` as applicable, keeps request-identity and inheritance-mode reasoning explicit, and rejected same-request reuse candidates remain visible with typed disqualifiers

## TV-72G: Nightly continuation trace keeps predecessor batch and later-window distinction explicit
- Given nightly execution advances from one window into a later lawful window for the same lineage family
- When orchestration allocates the successor manifest
- Then `ManifestLineageTrace` retains `nightly_window_key_or_null`, predecessor batch ref, predecessor manifest id/hash, and `nightly_context_reason_code_or_null = WINDOW_ADVANCE_FROM_PREDECESSOR`, and validation fails closed if that predecessor context is missing

## TV-73: Pre-seal gate evaluation prevents skipped, reordered, or recomputed seal gating
- Given a manifest has frozen config/input basis and must run the canonical pre-seal chain `[MANIFEST_GATE, ARTIFACT_CONTRACT_GATE, INPUT_BOUNDARY_GATE, DATA_QUALITY_GATE]`
- When the engine publishes `preseal_gate_evaluation{ execution_basis_hash, evaluated_gate_codes[], ordered_gate_decision_ids[], completion_state, durability_boundary }`
- Then seal is legal only when that contract says `COMPLETE_READY_TO_SEAL`, blocked pre-start outcomes must persist `COMPLETE_BLOCKED_PRESTART`, same-manifest retry must reuse the persisted pre-seal tape, and any later post-seal gate append must remain strictly after the frozen pre-seal prefix

## TV-74: Concurrent start claims collapse to one active attempt and one durable rejection path
- Given two workers race to start the same `SEALED` manifest while a third scheduler replay tries to
  allocate a recovery child for the same attempt lineage
- When `CLAIM_MANIFEST_START(...)` executes under the single-writer claim protocol and the losers
  observe the committed `manifest_start_claim{...}` object
- Then exactly one outcome is `{CLAIM_GRANTED, RECLAIM_GRANTED}`, every losing path emits
  `RunStartClaimRejected` with typed claim posture, no second stage DAG or outbox batch is
  published, and recovery-child allocation remains blocked until the active lease becomes explicit
  `STALE_RECLAIM_REQUIRED`

## TV-75: Customer-safe projection blocks staff-only derivation leakage across portal surfaces
- Given portal workspace, request-list, contextual request detail, document request, approval pack,
  onboarding journey, timeline event, and customer-visible notification payloads are published for
  the same customer-visible object
- When assignment, escalation, gate, audit, internal-activity, or staff-route-context truth
  changes, or when refresh, reconnect, export, or notification-open recovery remounts the portal
  surface
- Then every customer-visible payload mirrors one aligned

## TV-75A: Open material failure cannot persist without lawful owner or next path
- Given a blocking `ErrorRecord` remains in `OPEN` or `IN_PROGRESS`
- When persistence omits `remediation_owner_ref` for a non-system owner or leaves the error with neither a scheduled retry path nor an object-backed `next_action_ref`
- Then validation fails closed and the failure cannot dissolve into log-only or orphaned open posture

## TV-75B: Remediation task closure must declare effect on source error with evidence
- Given a `RemediationTask` reaches `COMPLETED`, `CANCELLED`, or `SUPERSEDED`
- When it omits `resolution_basis_ref`, `closure_evidence_refs[]`, or a coherent `error_resolution_effect`
- Then validation fails closed and task closure cannot silently imply that the source error resolved

## TV-75C: Compensation settlement must retain owner and closure basis
- Given a `CompensationRecord` moves beyond `PLANNED` or `IN_PROGRESS`
- When it lacks non-system owner linkage, `resolution_basis_ref`, closure evidence, or workflow follow-up for manual settlement or reconciliation modes
- Then validation fails closed and partial rollback or preserve-and-limit posture cannot become an unowned side path

## TV-75D: Accepted-risk closure requires linked approval and bounded exception basis
- Given an `ErrorRecord` or `RemediationTask` closes as accepted risk
- When accepted-risk lineage, expiry, or approval scope is missing, or when the accepted-risk artifact is not bound into the shared failure-resolution contract
- Then validation fails closed and bounded exception posture cannot masquerade as ordinary resolution

## TV-75E: Investigation-owned branches remain typed until remediation or accepted-risk closure
- Given a failure enters an investigation branch
- When the error references `OPEN_INVESTIGATION` but omits `failure_investigation_ref`, or the investigation lacks owner linkage or evidence-backed closure
- Then validation fails closed and the forensic branch cannot degrade into free text or detached workflow

## TV-75F: Failure dashboard keeps root-to-current lineage instead of flattening reopen chains
- Given a persisted failure dashboard for a reopened or successor failure lineage
- When `lineage_error_refs_in_order[]` omits the current successor, starts somewhere other than `root_error_ref`, or ends somewhere other than `current_error_ref`
- Then validation fails closed and the dashboard cannot orphan prior closure evidence or current failure identity

## TV-75G: Failure dashboard keeps compensation subordinate to visible underlying failure
- Given a failure dashboard with non-`NONE` `compensation_posture.state`
- When the dashboard drops the current error chain or binds the active compensation ref outside `lineage_refs.compensation_record_refs[]`
- Then validation fails closed and compensation cannot masquerade as the failure itself

## TV-75H: Accepted-risk dashboard requires accountable owner and future expiry
- Given a failure dashboard with `accepted_risk_posture.state = ACTIVE`
- When expiry is already in the past at `updated_at`, or the accepted-risk accountable owner diverges from `current_owner`
- Then validation fails closed and accepted-risk follow-up cannot float without present accountability

## TV-75I: Failure dashboard next action must stay typed and object-backed
- Given a non-terminal failure dashboard
- When `next_legal_action` collapses to `NO_FURTHER_ACTION`, omits its action code, or points at a workflow/task/investigation/approval ref outside the serialized lineage refs
- Then validation fails closed and the dashboard cannot reconstruct actionability from logs, notes, or UI-local heuristics

## TV-76A: Config versions advance only through named lifecycle transitions
- Given a persisted `ConfigVersion` changes lifecycle posture
- When a payload jumps from `DRAFT` straight to `APPROVED`, or records `APPROVED` / `DEPRECATED` / `REVOKED` without the required approval, supersession, or revocation lineage
- Then validation fails closed and config rollout posture cannot be rewritten by loose status text

## TV-76B: Config change requests cannot implement or roll back without release lineage
- Given a `ConfigChangeRequest` reaches `IMPLEMENTED` or `ROLLED_BACK`
- When implementation or rollback release refs are absent, or the state tuple bypasses the legal CCR machine
- Then validation fails closed and operator or worker mutation paths cannot skip the formal CCR machine

## TV-76C: Source collection runs preserve partial, failed, and abandoned reasons
- Given a `SourceCollectionRun` leaves `FETCHING`
- When `PARTIAL` omits gap refs, `FAILED` omits a typed failure reason, `ABANDONED` omits a typed abandonment reason, or terminal timing runs backward
- Then validation fails closed and collection workers cannot partially mutate lifecycle state before rejection

## TV-76D: Snapshots keep an auditable built-to-terminal lifecycle
- Given a persisted `Snapshot` advances from `BUILT` through validation, supersession, retention limitation, or erasure
- When the snapshot lacks the named transition contract, successor lineage, retention limitation ref, erasure proof, or transition audit evidence
- Then validation fails closed and snapshot lifecycle cannot be reinterpreted from downstream compute artifacts

## TV-76E: Illegal transition tuples are rejected across every governed machine family
- Given any governed machine publishes `previous_state_or_null`, `transition_event_code`, and `current_state`
- When the tuple is not the single legal initial event or one of the allowed transitions for that object family
- Then the shared `state_transition_contract` rejects the mutation with typed `ILLEGAL_STATE_TRANSITION` and no partial write

## TV-77: Schema evolution preserves historical-manifest continuity through expand, backfill, and contract
- Given a new writer bundle, an explicit compatibility window, and manifests sealed under older schema bundles
- When migrations and releases advance through expand, verify, backfill, restore, and promotion evidence
- Then schema evolution remains governed through `schema_reader_window_contract`, `backfill_execution_contract`, `SchemaMigrationLedger`, and release artifacts instead of operational assumption

## TV-77A: Expand-only phases keep previous readers open
- Given `backfill_execution_contract.execution_requirement = NO_BACKFILL_REQUIRED`
- When the migration is still in `PLANNED`, `APPLYING`, or `APPLIED`
- Then `schema_reader_window_contract.window_state` must stay `EXPAND_ONLY_PREVIOUS_READERS_SUPPORTED`

## TV-77B: Required backfill blocks verification and contract until completion
- Given `backfill_execution_contract.execution_requirement = IDEMPOTENT_BACKFILL_REQUIRED`
- When verification or contract is attempted before `execution_state = COMPLETE` with audit lineage
- Then validation fails closed and the migration cannot advance past the backfill window

## TV-77C: Closed compatibility windows force fail-forward posture
- Given `schema_reader_window_contract.window_state = CONTRACT_ELIGIBLE_WINDOW_CLOSED`
- When a migration or release attempts rollback posture after closure
- Then `rollback_class = FAIL_FORWARD_ONLY` is required and `DeploymentRelease.rollout_state = ROLLED_BACK` is rejected

## TV-77D: Release, restore, and suite evidence must mirror the candidate writer bundle
- Given runtime or release artifacts carry both `schema_bundle_hash` and `schema_reader_window_contract`
- When `schema_reader_window_contract.writer_schema_bundle_hash` drifts from the parent bundle identity
- Then validation fails closed and the artifact cannot misstate the schema identity it certifies

## TV-78: Mixed-candidate release evidence is rejected before promotion
- Given release evidence artifacts or manifest gate rows point at a different build digest, schema bundle, migration plan, provider-profile set, or supported-client window than the candidate being promoted
- When promotion evidence is validated
- Then the shared `release_candidate_identity_contract` and `candidate_identity_hash` reject the mixed-candidate assembly before any gate can satisfy release

## TV-78A: Candidate hash stays stable under canonical provider-profile ordering
- Given the same release candidate is serialized by different workers with provider profiles discovered in different order
- When `candidate_identity_hash` is derived from `release_candidate_identity_contract`
- Then the hash remains byte-stable because array members are canonically sorted before hashing, and unsorted serialized arrays are rejected

## TV-78B: Supported-client evidence cannot bind a different compatibility window
- Given `ClientCompatibilityMatrix` or operator-client gate evidence serializes a `supported_client_window_ref` that differs from the candidate contract
- When the artifact is validated or attached to promotion evidence
- Then validation fails closed and the operator-client gate cannot inherit a stale compatibility window

## TV-78C: Manifest gate rows must echo the manifest candidate hash
- Given a `ReleaseVerificationManifest` is assembled from first-class evidence objects but one gate row echoes a different `candidate_identity_hash`
- When the manifest is validated
- Then the manifest is rejected even if the gate otherwise looks green or structurally complete

## TV-79: Verified checkpoints require bound restore evidence and typed reopen gates
- Given a `RecoveryCheckpoint` is created for a restore-capable workload
- When restore evidence, checkpoint inventory linkage, privacy reconciliation, audit continuity, queue rebuild verification, or authority binding revalidation drift from the recorded state
- Then validation fails closed and `reopen_readiness_state` cannot claim `READY_FOR_REOPEN`

## TV-79A: Broker loss rebuilds authority work from durable truth instead of blind replay
- Given queue or broker state is lost while authority-integrated work is in flight
- When recovery attempts to reopen the environment by replaying transport artifacts without durable lineage and binding revalidation
- Then the recovery checkpoint cannot become `VERIFIED`, and authority recovery remains blocked until durable rebuild proof is recorded

## TV-79B: Post-restore access stays blocked until privacy and audit continuity clear
- Given a restore completes after prior erasure, masking narrowing, or other privacy-sensitive history
- When privacy reconciliation or audit continuity remains incomplete
- Then the checkpoint stays non-verified with the matching typed blocker instead of reopening normal access

## TV-79C: Canary abort preserves rollback-safe posture before window closure
- Given a release is aborted during canary while previous readers are still supported
- When the release record is persisted
- Then `rollback_boundary_state = ROLLBACK_ALLOWED` is required and fail-forward-only governance cannot be fabricated for the aborted candidate

## TV-79D: Closed rollback boundaries require explicit fail-forward owner and compensating release
- Given schema-window closure or equivalent rollback-unsafe posture makes rollback unlawful
- When a release enters fail-forward posture or attempts rollback anyway
- Then `rollback_boundary_state = FAIL_FORWARD_ONLY` is required, `ROLLED_BACK` is rejected, and `compensating_release_id_or_null` plus `fail_forward_owner_ref_or_null` are mandatory

## TV-79E: Restore-resurrected restricted data requires typed compensating re-erasure closure
- Given a restore drill rehydrates previously erased or pseudonymized personal data
- When the checkpoint or drill evidence omits a typed compensating re-erasure workflow or audit ref
- Then validation fails closed and neither `RecoveryCheckpoint` nor `RestoreDrillResult` can claim final verified posture

## TV-79F: Legal-hold or proof-preservation blockers keep reopen limited and explicit
- Given compensating cleanup is blocked by legal hold, proof preservation, or authority ambiguity
- When restore evidence attempts to serialize `READY_FOR_REOPEN` or a final reconciled privacy state anyway
- Then validation rejects the artifact and preserves the typed blocked state plus limited reopen posture

## TV-79G: Restore verification requires replay-safe and enquiry-safe limitation posture
- Given a restore drill rehydrates objects and passes object-availability checks
- When replay or enquiry limitation posture remains failed or unresolved after restore
- Then the privacy reconciliation contract, restore drill, and checkpoint all fail closed instead of treating restore as production-safe

## TV-80: Candidate-bound release proof still requires a schema compatibility gate boundary
- Given release evidence artifacts share one `candidate_identity_hash` but omit a shared `schema_bundle_compatibility_gate_contract`
- When schema compatibility, migration verification, or operator-client promotion evidence is validated
- Then validation fails closed because candidate identity alone does not prove reader-window safety, historical-manifest protection, replay readability, or native-client compatibility posture

## TV-80A: Reader-window change invalidates the prior compatibility gate hash
- Given a release candidate keeps the same build, config, migration plan, provider-profile set, and supported-client window
- When `schema_reader_window_contract.window_state`, historical-manifest protection, replay/restore guard posture, or migration chronology changes
- Then `compatibility_gate_hash` must change, and prior schema-compatibility evidence cannot be reused as current proof

## TV-80B: Green client compatibility evidence cannot coexist with a blocked native client window
- Given a `ClientCompatibilityMatrix` claims `matrix_state = GREEN`
- When the shared `schema_bundle_compatibility_gate_contract` records `native_client_window_state = BLOCKED`
- Then validation fails closed and the operator-client gate cannot inherit stale native compatibility proof

## TV-80C: Closed reader windows force fail-forward posture on the shared compatibility gate
- Given a release or migration is serialized after `reader_window_state = CONTRACT_ELIGIBLE_WINDOW_CLOSED`
- When the shared `schema_bundle_compatibility_gate_contract` is derived
- Then it must carry `rollback_boundary_state = FAIL_FORWARD_ONLY`, and any release artifact that mirrors `ROLLBACK_ALLOWED` is rejected

## TV-79E: Ordinary single-manifest proof stays home-manifest anchored and boundary-free
- Given a filing-capable proof path, proof bundle, evidence graph, and enquiry pack all resolve inside one manifest
- When the artifacts are validated or replayed
- Then `manifest_refs[]` begins with the owning `manifest_id`, `partition_contract` remains explicit, and no lineage-boundary refs or boundary objects are emitted

## TV-79F: Continuation chains surface the exact boundary edge instead of adjacent-object traversal
- Given a current manifest continues a prior manifest for the same tenant, client, and executable scope
- When provenance is queried or an enquiry pack is generated
- Then the cross-manifest hop is represented only through one explicit `ED_CONTINUES` boundary edge, the boundary repeats the same partition contract, and the path does not rely on neighboring objects or caller-selected defaults

## TV-79G: Replay chains require mirrored bundle lineage metadata
- Given a proof bundle reconstructs current proof from a replay source manifest
- When the bundle or replay recipe is validated
- Then top-level `manifest_refs[]` and `lineage_boundary_refs[]` exactly mirror the replay recipe, the owning manifest remains first, and reconstruction fails closed if that lineage is incomplete

## TV-79H: Recovery chains cannot widen tenant, client, or scope isolation
- Given a recovery manifest lawfully reuses proof lineage from an interrupted predecessor
- When graph or enquiry artifacts serialize the `ED_RECOVERS` hop
- Then every lineage boundary preserves the same `tenant_id`, `client_id`, `partition_scope_refs[]`, and `period_scope_ref_or_null` as the owning partition contract, and any widening attempt is rejected

## TV-79I: Supersession chains keep current and historical proof visibly separate
- Given a current proof bundle supersedes an earlier manifest's proof basis for the same exact scope
- When reviewer or regulator proof artifacts are rendered
- Then decisive lineage boundaries are explicit, current and superseded path segments remain distinguishable, and no output may flatten the chain into one apparent single-manifest proof path

## TV-79J: Scope-binding invariant becomes a typed pre-start block
- Given authorization yields an empty executable scope or a scope outside the request boundary before `RunStarted`
- When the manifest and error artifacts are persisted
- Then `invariant_enforcement_contract{ invariant_class_or_null = SCOPE_BINDING, failure_stage_or_null = PRESTART }` is required, `RunManifest.lifecycle_state = BLOCKED`, and the terminal audit event is `ManifestBlocked` with non-empty `reason_codes[]`

## TV-79K: Mutated sealed-manifest reuse cannot degrade into generic failure
- Given orchestration attempts same-manifest reuse on a `SEALED` manifest that already has outputs, submission refs, or other post-start evidence
- When the reuse path is rejected
- Then the failure remains typed as `MANIFEST_REUSE`, the manifest stays pre-start `BLOCKED` rather than silently reopening, and the bound `ErrorRecord` mirrors the same invariant class and fault code

## TV-79L: Pre-seal gate-chain mismatch fails closed instead of normalizing seal posture
- Given the frozen pre-seal gate tape no longer matches `preseal_gate_evaluation{ required_gate_codes[], ordered_gate_decision_ids[], execution_basis_hash }`
- When the manifest is validated or finalized
- Then the engine emits invariant class `PRESEAL_GATE_CHAIN`, rejects seal continuation, and persists durable error plus terminal audit evidence instead of recomputing or rewriting the gate prefix

## TV-79M: Lifecycle invariant preserves pre-start versus post-start fault posture
- Given one invariant failure occurs before `RunStarted` and another occurs after `RunStarted`
- When both runs are terminalized through the shared fail-closed path
- Then the pre-start case binds `failure_stage_or_null = PRESTART` and ends `BLOCKED`, while the post-start case binds `failure_stage_or_null = POSTSTART` and ends `FAILED`; neither path may collapse into one generic terminal state

## TV-79N: Filing-readiness invariant cannot degrade into review-only ambiguity
- Given filing notice, approval, or declared-basis acknowledgement linkage drifts after readiness is claimed
- When the filing-facing error is persisted
- Then invariant class `FILING_READINESS` is required, the bound `ErrorRecord.error_code` stays in the filing-specific invariant family, and the manifest cannot normalize the defect into ordinary review-required posture

## TV-79O: Replay-basis corruption forces failed terminal posture with typed audit evidence
- Given replay detects missing or corrupt frozen config/input/post-seal basis after `RunStarted`
- When the replay run is finalized
- Then invariant class `REPLAY_BASIS` is required, `RunManifest.lifecycle_state = FAILED`, the terminal audit event is `ManifestFailed`, and `ReplayBasisCorruptionDetected` retains non-empty `reason_codes[]`

## TV-79P: Authority preflight invariant blocks live send before transport mutation
- Given authority preflight finds an unready manifest, invalid binding, or missing approval/acknowledgement before request build or transmit
- When the preflight result is persisted
- Then invariant class `AUTHORITY_PREFLIGHT` is required, the authority path remains fail-closed with durable error/audit evidence, and no live authority request or side effect is emitted

## TV-81: Manifest assembly freezes the canonical gate-evidence basis
- Given a release candidate has one exact set of blocking suite results, admissibility records, canary evidence, restore evidence, client-compatibility evidence, and migration-ledger posture
- When `ReleaseVerificationManifest` is assembled
- Then `manifest_assembly_contract{...}` preserves the canonical gate order, the exact `result_ref` and `admissibility_ref` pair for each gate, the companion evidence refs, and the explicit decision posture instead of relying on dashboards or operator-entered summaries

## TV-81A: Top-level gate rows cannot drift from the manifest assembly contract
- Given a `ReleaseVerificationManifest` whose `blocking_gates.security.result_ref` differs from `manifest_assembly_contract.gate_bindings[]`
- When the manifest is validated
- Then validation fails closed because the top-level gate object and the deterministic manifest-assembly basis no longer describe the same promotion evidence

## TV-81B: Green supporting gates require their companion first-class evidence refs
- Given `manifest_assembly_contract.gate_bindings[]` marks `operator_client`, `performance_and_canary`, or `restore_drill` as `GREEN`
- When the manifest or assembly contract omits `client_compatibility_matrix_ref`, `canary_summary_ref`, or the restore drill/checkpoint pair
- Then validation fails closed and promotion cannot claim supporting evidence that was never durably bound

## TV-81C: Blocked manifests cannot preserve an all-green assembly basis
- Given `manifest_assembly_contract.decision_state = BLOCKED`
- When every gate binding still remains `GREEN`
- Then validation fails closed because blocked posture must preserve at least one blocking red gate instead of a manual or out-of-band release decision

## TV-81D: Approval and supersession posture must stay explicit inside the assembly basis
- Given a manifest is approved or superseded
- When `manifest_assembly_contract` omits `approval_ref_or_null`, `deployment_release_ref_or_null`, or `superseded_by_verification_manifest_ref_or_null` for the active decision posture
- Then validation fails closed and release approval or supersession cannot be inferred from deploy logs or rewritten in place

## FE-25 Cache Isolation

Regression coverage must include:

1. masking-tightening invalidation that purges broader cached variants
2. cross-tenant or cross-client cache replay attempts through shared object identifiers
3. browser or native local-cache reuse after session, access, or route drift
4. preview/export cache reuse outside the current mounted route and selected subject
5. stale hydration envelopes whose route, projection version, or preview identity no longer matches the mounted shell

## FE-75 Native Cache Hydration, Purge, and Rebase

Regression coverage must include:

1. compatible cold start where cached native content renders only after the full legality envelope matches
2. schema-incompatible cold start where cache, resume lineage, restoration payloads, `NSUserActivity`, previews, exports, and local index purge before first paint
3. tenant switch or privilege downgrade where stale scenes do not reopen and resume lineage clears into access rebind posture
4. session revocation where restoration is blocked and no cached mutation-capable posture survives locally
5. cache-only restoration where the same object may reopen read-only but mutation and filing stay blocked until live rebase completes
6. detached secondary-window masking drift where preview identity, restoration anchors, and local artifact derivatives purge with the broader cache envelope

## FE-51 Governance Simulation-to-Commit Continuity

Regression coverage must include:

1. mutation-capable `GovernanceAccessSimulation` responses whose `mutation_basis_contract.access_binding_hash` drifts from the nested `authorization_decision.access_binding_hash`
2. atomic `ChangeBasket` payloads whose staged groups and active basket reuse the same `simulation_basis_hash` / `dependency_topology_hash` pair but disagree on `mutation_basis_contract.basis_contract_hash`
3. `ApprovalComposer` or `BlastRadiusPanel` payloads whose visible reviewed basis does not match `change_basket.active_mutation_basis_contract_or_null`
4. `CommandEnvelope` governance commits that carry a lawful hash pair but a `mutation_basis_contract.commit_authority_posture = PREVIEW_ONLY`
5. `ApiCommandReceipt` stale rejections using `stale_guard_family = MUTATION_BASIS_CONTRACT_HASH` without a matching `latest_mutation_basis_contract_or_null`
