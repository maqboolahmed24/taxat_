# Frontend Shell and Interaction Law

## Purpose
This document defines the cross-platform shell, route, artifact, accessibility, and disclosure law for all browser and native product surfaces built on the Taxat platform.
It closes the gap between domain-truth contracts and profile-specific UI blueprints by defining what every shell MUST preserve before any local variation is allowed.

This law governs:

- shell ownership by object family and viewer capability
- same-object continuity across route, reload, reconnect, and deep-link entry
- dominant-action hierarchy and support-region promotion
- state, freshness, visibility, and recovery presentation
- artifact preview, export, print, and external handoff posture
- accessibility, automation anchors, motion, and UI telemetry fencing

This document is authoritative for cross-platform frontend behavior.
`low_noise_experience_contract.md`, `customer_client_portal_experience_contract.md`, `admin_governance_console_architecture.md`, `collaboration_workspace_contract.md`, and `macos_native_operator_workspace_blueprint.md` MAY tighten this law for their own shells, but SHALL NOT contradict it.

## 1. Shell families and object ownership

### 1.1 Canonical shell families
The platform SHALL use the following shell families:

- `CALM_SHELL` for manifest-scoped decision work, filing preparation, authority progression, drift/amendment review, and staff collaboration routes that reuse the low-noise four-surface shell
- `CLIENT_PORTAL_SHELL` for customer/client task completion, document exchange, approvals, onboarding, contextual request detail, and contextual help flows
- `GOVERNANCE_DENSITY_SHELL` for tenant policy, access control, authority-link governance, retention/privacy governance, and audit investigation

Native windows and scenes are embodiments of those same shell families rather than a fourth shell family.
When route-visible native delivery must be serialized explicitly, the contract MAY additionally
publish `surface_embodiment = NATIVE_OPERATOR`.

### 1.2 Same object, same shell
For the same viewer capability profile, visibility class, and object family, the same canonical object SHALL reopen in the same shell family.
The platform SHALL NOT remap an object into a different shell merely because a deep link, notification, or local implementation convenience made a different route easier to mount.

Rules:

- manifest-scoped objects such as `RunManifest`, `DecisionBundle`, `TwinView`, filing artifacts, authority interaction records, and amendment/drift artifacts SHALL remain in `CALM_SHELL`
- staff `WorkflowItem` and collaboration workspaces SHALL remain in the staff low-noise shell family even when reached from a manifest, queue, notification, or native scene restoration path
- client request, upload, approval, onboarding, and help objects SHALL remain in `CLIENT_PORTAL_SHELL`
- governance objects such as tenant policy snapshots, principal access views, authority-link inventory, retention frames, and audit investigation frames SHALL remain in `GOVERNANCE_DENSITY_SHELL`
- a different shell family MAY present the same underlying business object only when a dedicated read model exists for a different viewer capability or visibility class, for example `WorkspaceSnapshot` for staff and `ClientPortalWorkspace` for client-safe projection

### 1.3 External authority and identity steps
Provider-owned sign-in, authority-owned confirmation, and system-auth-session checkpoints are not independent product shells.
They are temporary governed handoffs away from an owning shell.
When such a handoff is required, the user SHALL return to the same owning shell family and same object context after completion, rejection, cancellation, or timeout.

## 2. Route continuity and shell stability

### 2.1 Route ownership
Each shell family SHALL own its route grammar, object headers, context surfaces, and return-path semantics.
Within a shell family, route changes SHALL preserve shell identity and update the object context in place.
The platform SHALL avoid full-document remounts for ordinary in-shell navigation.

### 2.2 Stable route keys
The renderer SHALL treat `shell_route_key`, `workspace_route_key`, `route_context`, `shell_stability_token`, `workspace_version`, `view_guard_ref`, `policy_snapshot_hash`, `approval_pack_hash`, `request_version_ref`, route-stable `active_filters`, `focus_anchor_ref`, and the grouped `stability_contract` as route-stability primitives rather than as optional implementation detail.
A route may change its visible module, filter, or focus anchor without changing shell family, but it SHALL NOT silently detach from its current object identity or stale-view basis.
Where a route-visible read model publishes `stability_contract{{ publication_generation, guard_vector_hash, guard_vector_components{{...}}, resume_capability }}`, the frontend SHALL treat that contract as the authoritative generation boundary for cache hydration, reconnect, rebase, and stale-mutation posture. The client MAY mirror individual markers for UX and command formation, but it SHALL NOT accept a mixed-generation set of markers whose grouped contract no longer matches backend truth.
Every route-visible shell or native scene that survives refresh, reconnect, resize, deep-link open, or restoration SHALL additionally publish one `cross_device_continuity_contract{{ continuity_scope, canonical_object_ref, route_identity_ref, parent_context_ref_or_null, focus_anchor_ref_or_null, return_focus_anchor_ref_or_null, dominant_action_state_or_null, stability_guard_hash_or_null, access_scope_hash_or_null, masking_scope_fingerprint_or_null, session_scope_ref_or_null, visibility_cache_partition_key_or_null, allowed_embodiments[], same_object_policy, same_shell_policy, narrow_layout_policy, deep_link_return_policy, action_posture_policy, hydration_compatibility_policy, compatibility_basis_class, restoration_mode_policy, secondary_window_policy, supported_invalidation_reason_codes[] }}`. Browser, narrow, and native renderers SHALL reuse that grouped envelope as the same-object continuity boundary instead of inferring restoration, parent return, or mutation posture locally.
Every route-visible shell or native scene that exposes governed landmarks, focus order, or test and
assistive-technology anchors SHALL additionally publish one `semantic_accessibility_contract{{
contract_version, shell_family, selector_profile, required_anchor_codes[],
semantic_focus_order[], announced_change_kinds[] }}` so browser `data-testid`, native
`accessibilityIdentifier`, landmark/heading structure, focus movement, live-region posture, and
reduced-motion semantics stay server-authored rather than renderer-local.
Every route-visible shell family and native scene family that publishes that semantic contract
SHALL additionally participate in one deterministic `semantic_accessibility_regression_pack{{
contract_version, suite_profile, run_mode, deterministic_seed, cases[] }}` regression pack. That
pack SHALL bind Playwright and XCUITest coverage to the exact shell-specific anchor inventory and
prove keyboard-only traversal, screen-reader traversal, polite versus assertive live announcements,
non-modal support-surface dismissal, reduced-motion parity, and return-path control stability
through responsive restack, rebase, reconnect, support-region collapse, and secondary-window
return.
Every route-visible shell family and native scene family SHALL also be covered by one deterministic
`shell_continuity_fuzz_harness{{ contract_version, suite_profile, run_mode, deterministic_seed,
cases[] }}` regression pack that perturbs rebase, reconnect, resize, responsive collapse, stream
catch-up, frame-epoch advance, and native restoration while the same governed object remains
lawful. That harness SHALL assert shell family, route identity, object anchor, dominant question,
settlement or recovery posture, active context, focus anchor, return focus anchor, and dominant
meaning before and after each perturbation. When `truth_change_detected = false`, inline recovery
SHALL preserve those identities and SHALL NOT remount a different shell, object, module, or safe
next-action meaning.
Governance routes SHALL additionally preserve one explicit `interaction_layer` payload carrying the
current chip echo, compaction mode, auxiliary-surface presentation, focus-trap posture, selection
continuity policy, receipt/problem-driven feedback truth policy, and the route-specific preserved
comparison or draft context that survives resize, reconnect, and rebase.

### 2.2A Interaction-layer boundary
Each shell family SHALL expose one server-authored interaction model that survives browser reload,
native restoration, responsive collapse, reconnect resume, and stale-view rebase for the same
governed object.
`OperatorInteractionLayer`, `PortalInteractionLayer`, and `GovernanceInteractionLayer` are the
contract boundary between route-visible read models and platform-specific rendering.
Each of those family-specific layers SHALL additionally publish one grouped
`foundation_contract = InteractionLayerFoundationContract` so design-token bindings for density,
spacing, support spacing, responsive compaction, selector grammar, motion posture, history
posture, preview posture, notification posture, recovery posture, and secondary-window posture stay
explicit instead of being inferred from local theme or platform defaults.
In support and traceability material, the same contracts may be described as the operator interaction
layer, portal interaction layer, and governance interaction layer. The published shell continuity
state SHALL also preserve `dominant_question` for the same governed object.

Rules:

- platform translation MAY change only embodiment carrier state already named by the published
  interaction layer, such as operator `recovery_notice_surface`, `notification_surface`, and
  `artifact_preview_surface`, portal stacked-vs-inline support placement, or governance
  `compaction_mode` and `auxiliary_surface_presentation`
- platform translation SHALL NOT change same-object same-shell continuity, receipt/problem-driven
  feedback truth, current-versus-history posture, one-promoted-support-region budgeting, or
  focus/selection restoration semantics for the same governed object
- browser refresh, native snapshot hydration, reconnect catch-up, stale-view rebase, and resize
  collapse SHALL therefore reuse the published interaction layer rather than inventing loader,
  banner, drawer, tray, or detached-window grammar locally
- detached native windows, compact trays, contextual detail stacks, and redocked sidecars remain
  support embodiments of the owning shell; they SHALL not become second authoritative workspaces or
  alternate recovery flows for the same object

### 2.3 Deep-link restoration
Deep links SHALL land on the named object, module, and focus anchor when those remain valid.
Client portal contextual detail routes SHALL additionally serialize both the in-detail focus anchor
and the parent-route return focus anchor plus one grouped
`focus_restoration{ requested_focus_anchor_ref_or_null, resolved_focus_anchor_ref_or_null,
restoration_disposition, restoration_reason_code_or_null }` contract so detail-to-list restoration
does not depend on browser history guesswork or UI-local focus heuristics.
If the exact focus anchor is no longer valid, the shell SHALL degrade deterministically in this order:

1. the same object and same module with a remapped or null focus anchor
2. the owning route's primary object summary with the most relevant support region opened
3. the owning route's default list or queue with the target object highlighted and a visible recovery explanation

The shell SHALL NOT land the user on a generic home/dashboard surface when a more specific governed route remains lawful and recoverable.

### 2.4 Back/return behavior
Back, close, and return actions SHALL preserve the last lawful list filters, selection, scroll anchor, draft state, and focused request/item/object whenever those states remain compatible with current visibility and versioning constraints.
If a return target has become stale or invisible, the shell SHALL route to the narrowest surviving parent list and explain why the prior target cannot be reopened directly.
For `CLIENT_PORTAL_SHELL` contextual detail routes, that return contract SHALL stay anchored to an
explicit parent-route focus target; reopening a generic portal home/dashboard surface is not a
lawful substitute when the same tab still has a narrower governed target.
Collaboration detail routes SHALL publish an explicit route-context envelope carrying the active
detail route ref, mounted module code, current focus anchor, one grouped `focus_restoration`
outcome, the lawful parent return route, lawful parent return focus anchor, and one predeclared
fallback route/focus pair for recovery. Browser back, notification-open, refresh, reconnect,
narrow-screen collapse, and native scene restoration SHALL all use that same route-context envelope
instead of inferring return behavior from transient history stack shape, prior DOM position, or
shell-local cache state.
Regression packs that claim this behavior SHALL additionally serialize one
`focus_restore_return_target_harness` proving keyboard-first return, help-handoff return,
live-update focus preservation, and native secondary-window close against the same serialized
anchors.

### 2.5 Queue and inbox continuity
Queue and inbox routes are still shell states, not disposable tables.
When a shell family exposes a governed list or queue surface, the renderer SHALL treat
route-stable filters, selected row, row-focus anchor, and split unread badges as part of the same
continuity contract as the mounted object view.

Rules:

- live updates MAY refresh badges, due posture, and row legality in place, but SHALL NOT reorder or
  remove a currently focused row until focus leaves or the active row action resolves
- row removal from an active filter set SHALL be explicit rather than inferred from a missing row
- mixed visibility unread counts SHALL remain split when the underlying lanes are split; staff inbox
  routes SHALL not collapse customer-visible and internal-only unread state into one ambiguous badge
- filter chips, row quick actions, and row-open actions SHALL be fully keyboard operable and SHALL
  restore focus to the narrowest lawful row anchor after reflow, refresh, or rebase

Collaboration detail drawers inherit the same continuity contract.
Module badges, `new_activity_marker_ref_or_null`, and module visibility partitions are route-stable
state rather than client-local decoration.
Fresh activity in a non-expanded collaboration module SHALL update that module's badge and marker in
place and SHALL NOT auto-promote or auto-expand a different module.
File modules SHALL keep explicit `Shared with customer` versus `Internal only` segments plus explicit
current-versus-historical customer-visible file buckets instead of collapsing them into one
attachment ribbon.
Collaboration composer state is route-stable as well: selected append-command family, explicit
visibility lane, draft identity, staged attachments, and confirmation posture SHALL survive
refresh, reconnect, and lawful rebase without silently switching the user from `Internal only` into
`Shared with customer` or discarding an unsent draft.
Standalone queue and list read models are not exempt from the same-shell contract. `WorkInboxSnapshot`
SHALL serialize top-level `settlement_state` and `recovery_posture` plus `OperatorInteractionLayer`
with `recovery_notice_surface = CONTEXT_BAR`, `notification_surface = CONTEXT_BAR`, and
`artifact_preview_surface = DETAIL_DRAWER`, and `CustomerRequestListSnapshot` SHALL serialize
top-level `settlement_state`, `recovery_posture`, and `PortalInteractionLayer`, so route-visible
inbox and request-list surfaces inherit the same selector grammar, subtle motion,
current-primary-history-secondary artifact posture, and focus-safe return behavior as the rest of
their owning buckets rather than inventing route-local variants.

## 3. Layout topology and support-region promotion

### 3.1 One dominant question, one dominant action
Every mounted shell state SHALL answer one dominant user question and present one dominant safe next move.
Supporting context may exist, but it SHALL remain visibly subordinate to the primary summary and primary action.
Every shell-family read model SHALL therefore serialize one `dominance_contract` bound to `schemas/shell_dominance_contract.schema.json` so dominant-question ownership, dominant-action ownership, support-surface subordination, explicit compare/audit multi-focus, responsive collapse, and detached-support posture stay machine-readable.

### 3.2 Promoted support regions
A promoted support region is any auxiliary region whose purpose is explanation, comparison, audit, preview, help, blast-radius analysis, export eligibility, or bounded assistance.
Navigation rails, list filters, and structural headers do not count as promoted support regions.

Rules:

- by default, a shell SHALL promote at most one support region at a time
- blocker, compare, contradiction, or audit-investigation states MAY promote a second support region when one region alone cannot explain the safe next move
- when two promoted support regions are visible, only one may contain writable controls for the current object
- compare-driven and audit-driven support-region escalation SHALL be explicit, mutually exclusive
  modes for one mounted shell state unless a shell-specific contract names a lawful combined mode
- support regions SHALL NOT compete with the dominant action, restate the same status in louder form, or introduce a parallel writable posture
- support regions SHALL collapse before the primary summary or dominant action does when viewport width contracts

### 3.3 Shell-family topology
`CALM_SHELL` SHALL preserve the ordered reading path `CONTEXT_BAR -> DECISION_SUMMARY -> ACTION_STRIP -> DETAIL_DRAWER`.
When the staff/operator product uses the richer decision-observatory module family, `MANIFEST_RIBBON`
SHALL collapse into `CONTEXT_BAR`, `DECISION_CONSTELLATION` plus `GATE_LATTICE` plus `TRUST_PRISM`
SHALL collapse into `DECISION_SUMMARY`, and `WORKFLOW_CHOREOGRAPHER` SHALL collapse into
`ACTION_STRIP`; those modules MAY reopen as focus views or explicit investigation routes, but SHALL
NOT remount as additional first-view peer regions in the calm shell. `SCOPE_COMPOSER` remains a
pre-manifest composition route or explicit re-scope mode, not a lawful post-manifest fifth surface.
Its `DETAIL_DRAWER` SHALL keep the user-facing module grammar `Evidence Prism`, `Packet Forge`,
`Authority Handshake Tunnel`, `Drift Ripple Field`, `Audit Echo Panel`, and `Twin Lens`; the
machine code `FOCUS_LENS` is lawful only as the internal binding for `Audit Echo Panel`, not as the
visible drawer label. Every drawer entry SHALL expose a plain-language interpretation summary before
any prism, tunnel, ripple, timeline, or trace-heavy rendering, compare mode SHALL stay explicit and
limited to `Twin Lens` or `Drift Ripple Field`, and audit mode SHALL stay explicit and limited to
`Audit Echo Panel`. Every published calm-shell frame SHALL additionally carry
`low_noise_budget_audit{...}` so four-surface discipline, one-story dominance, aggregate copy
budget, duplicate-posture compression, and non-material refresh coalescing stay server-authored and
machine-checkable rather than renderer-local. Release and regression evidence for that shell family
SHALL publish `low_noise_budget_audit_pack`.
`CLIENT_PORTAL_SHELL` SHALL preserve one primary content column with contextual detail, history, and help attached beneath or behind the primary task rather than beside it as a competing rail.
It SHALL additionally serialize one shared `interaction_layer` payload that freezes task-first
spacing density, literal client-safe status language, semantic selector profile, one-promoted-support-region
discipline, same-shell contextual return, current-primary-history-secondary artifact hierarchy,
stacked-below-primary responsive detail, and subtle causal motion so portal embodiments do not
invent route-local chrome, warning stacks, or detached mobile recovery branches.
It SHALL additionally serialize one shared `language_contract = PortalLanguageContract` so literal
client-safe wording, banned internal vocabulary families, explicit due/current/history/settlement
grammar, and bounded portal copy budgets stay server-authored instead of drifting in route-local
component composition. That contract SHALL also freeze per-route first-view budgets and SHALL
prevent the same limitation or recovery narrative from being promoted in more than one visible
portal region at a time.
That shared contract SHALL additionally pin `feedback_truth_policy =
DURABLE_RECEIPT_AND_TYPED_FAILURE_DRIVEN` so pending-settlement, stale-view, and degraded-state
copy stays derived from durable `ApiCommandReceipt` or typed `ProblemEnvelope` truth rather than
renderer-local inference.
For the `Home` route, that primary column SHALL keep the fixed reading order
`PORTAL_HEADER -> STATUS_HERO -> TASK_QUEUE -> RECENT_ACTIVITY`.
Its first-view task/status grammar SHALL keep `STATUS_HERO` as the one dominant CTA, SHALL keep
`TASK_QUEUE` in the literal bucket order `Do now -> Coming up -> Done`, and SHALL NOT serialize a
second promoted warning/help band alongside a promoted draft-resume or limitation region.
When `HOME` is asking the client to act, `TASK_QUEUE` SHALL mirror the same dominant action identified by `STATUS_HERO` through the shared `dominance_contract`; it SHALL not advertise a competing first move.
Reconnect, stale, degraded, and other recovery states SHALL remain inside that same mounted portal
route with one explicit support/recovery region rather than degrading into blank fallback pages or
stacked warning surfaces.
For the `Onboarding` route, that primary column SHALL keep the fixed reading order
`WELCOME_PANEL -> ONBOARDING_STEPPER -> STEP_WORKSPACE -> SUPPORT_PANEL`; only one onboarding step
may be writable at a time, and terminal completion or exit states SHALL collapse the wizard shell
back into normal portal routes rather than keeping onboarding as a permanent destination.
Its contextual collaboration request-list and request-detail routes SHALL preserve customer-safe
queue and detail grammar inside that same shell: queue rows SHALL keep one identity band, one
status-and-due band, and one action band; request detail SHALL keep one literal status family, one
explicit due label when present, one dominant customer-safe action or explicit `NO_SAFE_ACTION`
explanation, and explicit current-versus-history shared-file posture without leaking internal
lifecycle, assignee, escalation, or audit data.
Those queue and request-detail surfaces SHALL also inherit the same shared
`language_contract = PortalLanguageContract`, so list-row titles, no-safe-action explanations,
status projections, and subordinate help or limitation copy stay bounded and jargon-free instead of
reconstructing copy policy from staff payloads.
Those customer-visible portal routes and notifications SHALL render status, action, limitation,
recovery, timeline, history, and export/navigation posture only from the published
`customer_safe_projection` contract; they SHALL NOT derive those surfaces from assignee,
escalation, raw gate, audit, internal-count, internal-participant, or staff-route-context fields.
Customer-visible collaboration detail, collaboration activity and attachment reads, and
customer-visible workspace stream delivery SHALL follow the same rule: preview mode is a strict
visibility-scoped read model, not a hide/show treatment over a staff payload.
On narrow screens, those contextual detail routes SHALL remain stacked inside the same portal shell
and keep the same parent-tab return grammar rather than remounting as a detached overlay or
fallback list shell.
`GOVERNANCE_DENSITY_SHELL` MAY use multiple structural regions, but only one promoted support region may be open by default; audit, blast-radius, diff, and export sidecars SHALL compete for that slot instead of multiplying continuously.
Its shared governance interaction layer SHALL keep filter chips, inspectors, drawers, and
compaction machine-checkable: route chips must mirror the exact active filters in canonical
dimension order, ordinary governance inspectors and drawers must remain non-modal, and compaction
or rebase must not drop the current selection, focus anchor, promoted support surface, or staged
comparison context while the same governed object still resolves. It SHALL additionally pin
`density_profile = GOVERNANCE_DENSITY_PROFILE_V1`,
`inventory_filter_grammar = CANONICAL_ROUTE_FILTER_GRAMMAR`,
`support_surface_policy = ONE_PROMOTED_SUPPORT_SURFACE_MAX`,
`diff_basket_policy = STAGED_DIFF_AND_BASKET_RETAIN_CONTEXT`,
`export_binding_policy = ACTIVE_FILTERED_SLICE_GOVERNS_EXPORT`, and
`keyboard_focus_policy = RETURN_FOCUS_ANCHOR_OR_ROVING_SELECTION`, and
`feedback_truth_policy = DURABLE_RECEIPT_AND_TYPED_FAILURE_DRIVEN` so density, filter grammar,
staged mutation context, export posture, keyboard-focus restoration, and receipt/problem-driven
recovery feedback stay shared across overview, tenant configuration, access, authority-link,
retention, and audit routes.
Its overview route SHALL keep one promoted attention summary plus worklist-backed supporting widget
stacks; counts, strips, tapes, and exception lists SHALL retain concrete same-shell queue or object
targets instead of degrading into dead-end KPI tiles.
Its access-and-roles route SHALL keep the semantic reading order
`PRINCIPAL_DIRECTORY -> WORKSPACE_CANVAS -> ACCESS_INSPECTOR -> AUTHORITY_CHAIN_PANEL ->
POLICY_SIMULATOR`; matrix-cell selection, `focus_anchor_ref`, and simulator tuple context SHALL
survive responsive collapse, reconnect, and rebase without falling back to a generic permission
table or losing the selected access subject.
Its tenant-configuration route SHALL keep the semantic reading order
`SECTION_NAV -> CONFIG_FORM -> INLINE_POLICY_HELP -> BLAST_RADIUS_PANEL -> CHANGE_BASKET ->
APPROVAL_COMPOSER -> CONFIG_HISTORY_TIMELINE`; high-risk settings MAY capture local draft edits, but
they SHALL stage into explicit before/after diffs rather than commit on blur.
Its authority-links route SHALL keep the semantic reading order
`INVENTORY_RAIL -> WORKSPACE_CANVAS -> AUDIT_SIDECAR`; the selected link, `focus_anchor_ref`, and
promoted issue state SHALL survive responsive collapse, reconnect, and rebase while the same link
remains mounted. Link and relink flows SHALL use a guided handshake stepper with explicit
preflight checks, not a raw credential form, and the workspace canvas SHALL keep the module order
`AuthorityLinkIdentityCard -> BindingHealthTimeline -> HandshakeHistory -> AffectedOperationList -> PreflightChecklist`.
Token/client mismatch, delegation gaps, and environment drift SHALL render as first-class status
surfaces in the rail and workspace, not only as buried audit-event text.
Its audit-and-investigations route SHALL keep the semantic reading order
`INVENTORY_RAIL -> WORKSPACE_CANVAS -> EVENT_DIFF_INSPECTOR -> AUDIT_SIDECAR`; the selected event,
`focus_anchor_ref`, active query slice, and promoted support surface SHALL survive responsive
collapse, reconnect, and rebase while the same filtered slice remains lawful. The workbench canvas
SHALL keep the module order `AuditTape -> ObjectNeighborhood`; the neighborhood SHALL expose both
upstream and downstream context around the selected event, `EventDiffInspector` SHALL stay
summary-first rather than raw-JSON-first, and `ExportEligibilityPanel` SHALL mirror the active
filtered slice instead of becoming detached export chrome.
Whenever portal, governance, or operator shells surface pending propagation, awaiting approval,
stale-view rejection, or rebase-required posture, the mounted shell SHALL use durable
`ApiCommandReceipt` or typed `ProblemEnvelope` truth as the explanation source; when the backend
publishes `stale_guard_family` and `latest_stale_guard_value`, the frontend SHALL preserve and
display that typed basis instead of paraphrasing a route-local guess.
Mutation-capable affordances in action strips, inbox quick-action menus, drawers, notifications, or
automation surfaces SHALL therefore carry one explicit `mutation_precondition_binding` profile that
matches the backend command family. A shell MAY hide or disable unsafe actions during degraded
posture, but it SHALL NOT rely on visual disabling alone; any launched mutation MUST still roundtrip
the exact declared guard bundle and fail closed if the route generation or visibility scope has
shifted.
Native primary workspace delivery SHALL serialize each primary calm-shell window as one
`NativeOperatorWorkspaceScene` with `shell_family = CALM_SHELL`,
`surface_embodiment = NATIVE_OPERATOR`, and the fixed region order
`LEADING_SIDEBAR -> PRIMARY_CANVAS -> TRAILING_INSPECTOR`, a single mounted object family
(`MANIFEST` or `WORK_ITEM`), one scene-identity envelope, one restoration posture, and one native
shortcut/focus contract.
Its leading sidebar SHALL keep the mounted manifest or work-item selection anchored to the same
object as the primary canvas, the primary canvas SHALL keep `ACTION_STRIP` as the only
authoritative action surface for the mounted object, and the trailing inspector SHALL remain a
support-only region whether docked, collapsed, or detached.
Detached surfaces MAY reopen the inspector in a second window, but they SHALL remain bound to the
same object and SHALL NOT create a second authoritative action strip for the same writable object.
Detached compare, audit, evidence, and diff windows SHALL serialize as
`NativeOperatorSecondaryWindowScene`, SHALL keep the same parent-scene object anchor and shell
ownership, SHALL preserve the reading order `IDENTITY_HEADER -> SUMMARY_CARD -> DETAIL_BODY`, and
SHALL restore focus to the parent focus anchor on close unless restoration has been explicitly
invalidated. Historical, superseded, masked, or raw-detail panes SHALL remain secondary to the
summary-first current artifact or comparison card when the window first opens.
Scene restoration SHALL therefore preserve the same object anchor, dominant question, settlement
posture, route key, masking/session lineage, and grouped `focus_restoration` outcome or invalidate
restoration explicitly instead of reopening the wrong tenant, manifest, or work item.

### 3.4 Responsive fallback
Responsive fallback SHALL preserve semantic order before preserving side-by-side density.
When width contracts:

- primary headers, dominant summaries, and dominant actions remain visible first
- promoted support regions collapse into drawers, inspectors, sheets, or secondary routes before primary content collapses into hidden tabs
- inventory rails become trays, pickers, or list-first routes before the shell invents horizontal scroll as the only path to meaning
- when rails, trays, or inspectors redock, the shell SHALL preserve the active filter state,
  selected object, and focus anchor instead of reopening the family root without context
- compare and audit views may remain explicit modes, but SHALL not trap the user in a wider-only layout to complete a required action

## 4. Dominant-action hierarchy and writable posture

### 4.1 Dominant-action law
A shell state SHALL expose one dominant action, at most two clearly subordinate secondary actions, or explicit `NO_SAFE_ACTION`.
A surface SHALL never present two visually equivalent primary mutations for the same object.

### 4.2 No contradictory writable posture
Writable controls SHALL remain aligned with current legality, visibility, freshness, and settlement posture.
The UI SHALL remove or downgrade actions when the underlying stale-view or visibility basis is no longer valid.
It SHALL not leave a visually live action in place merely because the prior route still has local state.

Examples:

- stale `DecisionBundle`, `shell_stability_token`, `workspace_version`, `policy_snapshot_hash`, `approval_pack_hash`, or `request_version_ref` SHALL invalidate the prior mutation posture
- analysis-only, replay-only, masked-beyond-actionability, frozen, superseded, and limited-detail states SHALL not advertise live filing, signing, approval, export, or authority-mutation actions
- acceptance of a write command SHALL not be rendered as settled success while authoritative read-side settlement is still pending
- tenant-configuration edits whose blast-radius, approval, or stale-view basis would change SHALL not
  auto-commit on blur; the shell SHALL keep them in staged-diff posture until explicit submit,
  discard, or rebase
- collaboration composer layers SHALL keep internal-only and customer-visible publish paths as
  separate explicit states; staff shells SHALL default to the internal lane, and customer-visible
  publish SHALL require an explicit visible confirmation step before send

### 4.3 Settlement-aware feedback
The UI SHALL distinguish at minimum:

- local intent captured
- durable command receipt accepted
- pending propagation or approval
- authority pending or reconciliation pending
- authoritative settlement reflected in the owning read model

Language such as `Done`, `Submitted successfully`, `Signed`, `Linked`, `Erased`, or `Completed` SHALL appear only when the authoritative object-of-record for that action reflects the settled outcome.
Receipt acceptance SHALL instead use pending language tied to the command receipt, checkpoint, or waiting-on posture.

## 5. State, freshness, visibility, and recovery presentation

### 5.1 Canonical state axes
Every shell family SHALL present current posture using canonical read-side and command-side axes rather than local UI-only enums.
At minimum, the shell SHALL preserve and render the applicable combination of:

- identity and scope context
- `truth_state` or equivalent settlement origin
- `checkpoint_state` or equivalent workflow/transport checkpoint
- `freshness_state` or `updated_at`/`captured_at` freshness marker
- `connection_state` and reconnect posture when stream- or upload-backed
- limitation or visibility posture such as `NOT_REQUESTED`, `NOT_YET_MATERIALIZED`, `LIMITED`, or `NOT_APPLICABLE`
- ownership or `waiting_on` posture when the next move depends on another actor

Freshness, visibility, and settlement SHALL never be conveyed by color, motion, or iconography alone.

### 5.2 Presentation posture families
The shell MAY group canonical fields into user-facing posture families, but those groupings SHALL remain derivable from authoritative fields and SHALL NOT replace them.
At minimum, the user-visible treatment SHALL distinguish the following:

#### Pending posture
Pending posture means a durable transition exists but authoritative settlement has not yet completed.
The shell SHALL show who or what is being waited on, the current checkpoint, the latest authoritative timestamp, and what remains safe to inspect or do.
Pending posture SHALL not borrow completion styling.
Inline freshening or receipt-pending updates SHALL preserve the mounted object anchor, dominant
question, dominant action posture, and active support-region focus whenever the underlying object
still exists.

#### Settled posture
Settled posture means the owning authoritative read model has absorbed the latest durable transition for the current object.
The shell SHALL expose the settlement timestamp or latest authoritative update and, where relevant, the exact receipt, version, or pack/hash lineage that proved settlement.

#### Stale posture
Stale posture means the user is viewing an obsolete summary, workspace, policy frame, upload/request binding, or approval pack.
The shell SHALL keep the prior reasoning context visible, explain what changed, and offer a deterministic rebase path.
It SHALL not discard drafts or collapse to a generic landing screen.

#### Frozen posture
Frozen posture means the object is sealed, historical, approval-held, policy-frozen, or otherwise not writable from the current shell state.
Frozen posture SHALL read as intentionally read-only, not as a broken button set.
Where a successor object exists, the shell SHALL identify it explicitly.

#### Blocked posture
Blocked posture means the user's desired move is currently illegal because of gate, authority, approval, masking, retention, or policy constraints.
The shell SHALL identify the blocking cause, impacted action family, and safest investigation or escalation path.
Blocked posture SHALL not be represented by disabled clutter alone.

#### Degraded posture
Degraded posture means the shell is still usable but one or more supporting conditions are limited, for example reconnect lag, partial hydration, upload scan pending, masked detail, or unavailable preview.
The shell SHALL preserve the last valid mental model and annotate the limitation in place.

#### Recovery posture
Recovery posture means the user is rebasing after a stale-view rejection, resuming after disconnect, returning from an external handoff, replaying a durable receipt, or reopening a route after privilege/session change.
Recovery posture SHALL keep object identity, prior action context, and the narrowest lawful next step visible.
If an unsent collaboration draft exists, recovery posture SHALL preserve that draft locally,
surface the required rebase target, and block publish until the user explicitly accepts the rebase.

## 6. Empty, loading, and partial-visibility rules

### 6.1 Explicit empty-state taxonomy
All shells SHALL distinguish at minimum:

- `NOT_REQUESTED`
- `NOT_YET_MATERIALIZED`
- `LIMITED`
- `NOT_APPLICABLE`

These states SHALL not share one placeholder template or one generic `No data` label.
Every shell family SHALL additionally publish `state_taxonomy_contract` bound to
`schemas/shell_state_taxonomy_contract.schema.json` so the renderer receives one machine-readable
answer for the mounted empty-state code, settlement posture, recovery posture, mounted-context
preservation state, and the ban on generic placeholders.

### 6.2 Loading without semantic loss
If previously valid content exists, loading and catch-up states SHALL preserve it in place and add freshness or recovery labeling.
Skeletons and pending placeholders SHALL preserve stable dimensions and reading order so the shell does not jump while the user is reading.
The UI SHALL prefer inline hydration over route-wide spinners.
Mounted truth SHALL remain in place through `FRESHENING`, `STALE_REVIEW_REQUIRED`,
`DEGRADED_READ_ONLY`, and inline recovery; only `OBJECT_SUPERSEDED` may replace the mounted object.

Low-noise staff/operator surfaces and their native embodiments SHALL additionally publish one shared
`OperatorInteractionLayer` contract that freezes mounted-content preservation, inline refresh,
explicit rebase presentation, coalesced non-material delta promotion, notification surface,
preview surface, current-vs-history posture, subtle causal motion, and fail-closed unsafe-action
behavior. Implementations SHALL NOT override that contract with route-wide remount loaders, blind
background mutation affordances, or history-first preview behavior.
Portal-visible and customer-safe surfaces SHALL additionally publish one shared
`PortalInteractionLayer` contract that freezes task-first navigation, same-shell contextual return,
focus restoration, current-primary-history-secondary artifact posture, subtle causal motion, and
receipt- or typed-failure-driven feedback truth. Implementations SHALL NOT fork portal warning
stacks, restore behavior, selector grammar, or history posture into route-local mobile or browser
variants that bypass the shared portal interaction layer.

### 6.3 Partial visibility
When some detail is hidden by masking, retention, missing preview support, or policy-limited history, the shell SHALL show that the view is partial.
It SHALL not imply that hidden data never existed or that a missing preview means the artifact is invalid.
Count summaries, history lists, and compare views SHALL include explicit hidden/limited markers where policy allows the user to know that more exists.
Every reconnect-safe read model, stream event, inbox delta, and notification that can reopen or
update a governed route SHALL additionally publish one explicit `visibility_partition` contract
carrying audience class, allowed visibility lanes, access-binding hash, masking-posture
fingerprint, cache partition key, badge policy, ordering side-channel policy, export scope policy,
and fallback discovery policy. Clients SHALL segment caches and hydration by that contract rather
than by route path or object id alone.
Customer-visible and portal-visible transports SHALL therefore keep
`allowed_visibility_classes = [CUSTOMER_VISIBLE]`, SHALL NOT advance stale guards or reorder visible
surfaces because of hidden internal-only activity alone, and SHALL NOT surface audit-only event
families as if they were part of the customer's visible continuity basis.
Customer-visible collaboration activity and attachment reads SHALL additionally keep one aligned
`customer_safe_projection` contract, and customer-visible attachment reads SHALL exclude pending
placeholder posture so internal drafts cannot influence current-versus-history preview state.
Every action strip, inbox quick-action set, and customer CTA surface SHALL additionally publish one
explicit `authoritative_action` contract keyed to the route-visible projection version, access
binding, and visibility cache partition. Clients SHALL mirror legality from that contract rather
than deriving action enablement from null checks, route freshness badges, or locally filtered action
lists.
Every collaboration inbox row, mounted collaboration workspace, badge-bearing stream event, and
notification that can reopen a work item SHALL additionally publish one explicit `queue_projection`
contract carrying split lane unread counts, drawer badge mirrors, canonical sort basis, deferred
focus-lock posture, and lane-targeted reopen semantics. Clients SHALL preserve queue continuity from
that contract rather than deriving reorder or badge meaning from websocket arrival order, missing-row
inference, or merged unread totals.

## 7. Artifact preview, export, print, and browser handoff

### 7.1 Same-shell preview first
Artifacts SHOULD preview inside the owning shell first whenever policy, format support, and device capability allow it.
This applies to evidence artifacts, collaboration attachments, client declarations, signed receipts, audit exports, and governance diff bundles.
A download-only fallback is acceptable only when inline preview is impossible or disallowed.

### 7.2 Artifact preview header contract
Every governed preview SHALL identify at minimum:

- artifact title or safe label
- artifact class
- current vs historical/superseded/expired/quarantined posture
- visibility/export posture
- authoritative timestamp or freshness marker
- version, receipt, or hash lineage when the artifact may be compared or signed against

### 7.3 Current versus historical artifacts
Current artifacts SHALL be visually and structurally separate from historical, rejected, superseded, or expired artifacts.
Historical artifacts may remain accessible when policy allows, but they SHALL never become the default signing target, current download target, or default preview target for a task that requires the current artifact.
Routes that expose artifacts SHALL therefore publish one explicit server-side artifact-selection contract for primary, authoritative, historical, limited, preview, download, and print posture, and contextual routes SHALL retain explicit artifact-focus bucket/ref state so refresh, reconnect, responsive collapse, and same-shell return do not reconstruct artifact truth from list order or cached local UI state.

### 7.4 Export and print
Export, download, and print actions SHALL evaluate current masking, retention, export, and approval posture at invocation time, not only when the button rendered.
The produced output SHALL preserve the same limitation notices, acting-for context, timestamps, and current/historical labels that justified the visible action.
Outputs SHALL not silently upgrade from masked to full content because the user opened the print or download route.

### 7.5 Browser and system handoff
External handoff is lawful only when the action is genuinely provider-owned, authority-owned, or system-browser-auth-session-owned.
Before handoff, the shell SHALL state:

- the destination class or trusted domain family
- what step is occurring externally
- which local object remains in progress
- how the user returns to the same object and shell

Rules:

- no hidden iframe, uncontrolled popup, or unrestricted embedded web surface may replace a governed handoff for risky external actions
- the owning shell SHALL remain the source of local progress truth before and after handoff
- return from handoff SHALL reopen the same object context or the narrowest lawful successor object with explicit recovery copy
- the shell SHALL not claim external completion until the authoritative read model or durable receipt confirms it

### 7.6 Shell-specific artifact specialization
`CALM_SHELL` previews SHALL prefer same-shell detail modules and governed export routes; authority-owned actions open the system browser and return to the same manifest or work-item context.
`CLIENT_PORTAL_SHELL` previews SHALL keep current document requests, declarations, receipts, and historical uploads distinct; identity or authority checkpoints MAY hand off externally, but upload, review, and receipt truth SHALL remain owned by the portal shell. Portal document routes SHALL preserve the canonical `DOCUMENT_INBOX -> UPLOAD_PANEL -> UPLOAD_STATUS_LIST -> DOCUMENT_HISTORY` order, SHALL keep `current_upload_ref` separate from `current_artifact_upload_ref` so retry/replacement flows cannot relabel rejected or superseded uploads as current artifacts, SHALL publish one explicit per-upload `preview_posture` plus typed `preview_reason_code` whenever same-shell preview is downgraded or blocked, and SHALL serialize one `artifact_selection` contract plus contextual `artifact_focus_*` route state so the current review/download target survives refresh, reconnect, and narrow-screen restacking without history becoming primary by accident. Portal approval routes SHALL preserve the canonical `APPROVAL_SUMMARY -> CHANGE_DIGEST -> DECLARATION_PANEL -> SIGN_OFF_PANEL` order, keep declaration preview/download/print actions bound to the current approval pack, keep acknowledgement progress, inline step-up checkpoint posture, signature-submitted pending settlement, and final receipt issuance explicit on the same `APPROVALS` route, and keep command-receipt-backed pending sign states distinct from settled receipts, declaration exports, or stale-pack history. Portal help routes SHALL preserve the canonical `HELP_OPTIONS -> TOP_QUESTIONS -> CASE_CONTEXT_PANEL` order, keep top questions bounded, keep contact actions anchored to the same portal shell, and keep contextual support anchored to the same case object and focus anchor rather than restarting the user in a blank support flow.
Responsive and native translations of those routes SHALL preserve the same `dominance_contract` instead of letting a detached drawer, sidecar, tray, or stacked support panel become a second primary.
`GOVERNANCE_DENSITY_SHELL` exports SHALL remain read-only, slice-bounded, and filter-bounded; audit and policy exports SHALL expose masked/full/pending-approval posture before bytes leave the shell. Retention/privacy routes inside this shell SHALL keep statutory blockers, legal-hold blockers, and destructive-review posture inline with the selected row or queue item, and irreversible erasure actions SHALL stay staged through the same shell rather than jumping to one-click destructive dialogs.
Native operator embodiments MAY use Quick Look, print panels, or detached preview windows, but
those affordances SHALL remain bound to current masking/export posture and SHALL not outlive
revocation or tenant/context change.
Primary native scenes SHALL serialize that preview preference through
`interaction_layer.artifact_preview_surface = SECONDARY_WINDOW_BODY`; detached compare, audit, and
preview windows SHALL serialize `interaction_layer.recovery_notice_surface = IDENTITY_HEADER`,
`interaction_layer.notification_surface = PARENT_CONTEXT_BAR`, and
`interaction_layer.history_presentation = CURRENT_PRIMARY_HISTORY_SECONDARY` so native support
windows stay summary-first and parent-bound.
Across the staff/operator bucket, `OperatorInteractionLayer` SHALL additionally pin
`selector_profile = OPERATOR_SEMANTIC_SELECTORS_V1`,
`shell_continuity_policy = SAME_OBJECT_SAME_SHELL_INLINE_RECOVERY`,
`activity_partition_policy = VISIBILITY_SCOPED_LANES_WITH_CURRENT_FIRST_ARTIFACTS`,
`investigation_presentation_policy = SUMMARY_FIRST_PLAIN_LANGUAGE_MODULES`, and
`secondary_window_policy = SUPPORT_ONLY_PARENT_BOUND_CLOSE_RETURNS_FOCUS` so calm-shell routes,
collaboration workspaces, investigation modules, and native detached windows keep one shared
selector/recovery/support grammar instead of route-local variants.
Across governance routes, `GovernanceInteractionLayer` SHALL additionally pin
`selector_profile = GOVERNANCE_SEMANTIC_SELECTORS_V1` so dense control-plane surfaces keep one
meaning-driven selector grammar for browser automation, accessibility labels, and any native
translation rather than naming chips, sidecars, or worklists by visual arrangement.
Staff collaboration workspaces in `CALM_SHELL` SHALL also keep freshness/reconnect notices inline,
action legality permission-backed, and routine promoted modules anchored to conversation/files
before audit-heavy support modules take over the default hierarchy.

## 8. Accessibility, focus, and motion

### 8.1 Structural accessibility
Each shell SHALL expose stable landmarks, headings, and focusable entry points for its primary summary, dominant action, promoted support region, limitation notices, and recovery notices.
Screen-reader labels SHALL describe meaning and outcome, not merely visual styling.
That structure SHALL be frozen through `semantic_accessibility_contract` so shell and native
embodiments do not diverge on the addressable meaning of those regions.

### 8.2 Focus law
Focus order SHALL follow the visible semantic order of the shell.
On route or module change, focus SHALL move to the new primary heading, explicit stale/recovery notice, or explicitly requested focus anchor.
Live updates SHALL not steal focus from an active composer, editor, file picker, or comparison control.
Closing a support region SHALL restore focus to the invoking control or the nearest lawful ancestor heading.
Contextual portal help entries SHALL land focus on the carried `CASE_CONTEXT_PANEL` anchor rather than forcing keyboard or assistive-technology users to traverse unrelated top questions first.
Governance drawers and inspectors SHALL trap focus only when an explicit modal checkpoint is
required by provider-owned handoff or equivalent high-risk ceremony; ordinary blast-radius, diff,
audit, matrix, and guided-link inspection surfaces remain non-modal so comparison context survives.

### 8.3 Keyboard law
Everything required to inspect, compare, export, upload, sign, assign, request info, and recover from stale/reconnect posture SHALL be keyboard operable.
Portal upload surfaces SHALL expose browse, drag/drop, and camera capture through explicit focusable controls; drag/drop alone is never a lawful upload affordance.
Keyboard shortcuts MAY accelerate frequent actions, but no critical action may depend exclusively on shortcut knowledge.

### 8.4 Motion law
Motion SHALL remain low-amplitude and semantic.
Only the object that changed may animate prominently.
Reconnect, resume, stale rebase, and inline refresh SHALL preserve layout identity and use subtle continuity cues rather than theatrical remount motion.
When reduced motion is requested, the shell SHALL preserve all state meaning with minimal or no spatial displacement.

## 9. Optional assistive companions and constrained channels

### 9.1 Optional assistive companions
If the product introduces an assistive companion, side-stage explainer, or bounded generative surface, it SHALL remain a same-shell companion rather than a competing rail or parallel shell.

Rules:

- only one assistive companion may be promoted at a time, and it counts as a promoted support region
- it may summarize, explain, draft non-authoritative text, or guide investigation using already-authorized data
- it SHALL NOT mint a parallel state vocabulary, a second dominant action, or a contradictory writable posture
- it SHALL NOT approve, sign, submit, relink, erase, or export on its own authority; all governed mutations MUST remain in the owning shell's typed action surfaces
- it SHALL inherit current masking, limitation, and export posture and SHALL not reveal hidden data through paraphrase or suggestion text

### 9.2 Constrained channels
Emails, notifications, invite links, and other constrained channels MAY communicate object identity, due date, coarse posture, and safe next-step language.
They SHALL NOT expose raw regulated payloads, internal-only notes, masked data, or detail that requires the full shell to interpret safely.
Every constrained-channel link SHALL resolve into the owning shell family and restore the named object, focus target, and lawful return path where possible.

## 10. Automation anchors and UI observability fencing

### 10.1 Automation-verifiable selectors
Browser surfaces SHALL expose stable semantic `data-testid` anchors.
Native surfaces SHALL mirror the same semantics through `accessibilityIdentifier` values.
Selectors SHALL describe domain meaning rather than visual styling.
The shared selector and accessibility boundary SHALL be published through
`semantic_accessibility_contract`, not inferred from layout structure.

At minimum, every shell family SHALL expose stable anchors for:

- shell root and shell family
- primary object header
- dominant summary
- dominant action
- promoted support region
- limitation notice or stale/recovery notice when present
- artifact preview header and artifact-state label when preview is available
- return-path control for contextual routes

### 10.2 UI telemetry and disclosure fencing
UI telemetry MAY record shell family, route family, experience profile, module codes, posture codes, action codes, recovery outcomes, performance timings, accessibility preference flags, and opaque object refs.
UI telemetry SHALL NOT record or derive from:

- free-form message bodies, request text, declaration text, evidence text, or audit-body content
- raw personal, tax, authority, health, or PHI-class values
- masked content or values that the current visibility policy suppresses
- uploaded file bytes, rendered screenshots, clipboard contents, keystroke streams, or DOM snapshots of regulated surfaces
- hidden internal-thread content, approval rationale, or authority secrets/tokens

Any client-side logging, analytics, crash capture, or session-replay technology used on regulated surfaces SHALL be redaction-safe by construction.
If full redaction cannot be proven for a surface, that capture mode SHALL be disabled on that surface.

## 11. One-sentence summary
The frontend shell and interaction law keeps every Taxat surface calm, continuous, settlement-aware, accessible, and disclosure-safe by making shell ownership, state presentation, artifact handling, and telemetry boundaries explicit across browser and native embodiments.
