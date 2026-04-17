# Collaboration Workspace Contract

## Purpose

This contract extends the workflow, remediation, low-noise shell, northbound API, and audit contracts to define the staff/customer collaboration workspace used to resolve `WorkflowItem`s and linked `RemediationTask`s.

It preserves the role model from `actor_and_authority_model.md`, the calm-shell rules from `low_noise_experience_contract.md`, the command/read and stale-view rules from `northbound_api_and_session_contract.md`, the cross-platform shell and artifact law from `frontend_shell_and_interaction_law.md`, and the append-only audit requirements from `observability_and_audit_contract.md`.

The collaboration workspace is workflow-adjacent product truth. It SHALL NOT fabricate authority truth, submission truth, or override truth.

This workspace sits between the staff decision workspace and the customer portal. It MAY expose customer collaboration routes such as `/portal/requests/{item_id}`, but those routes SHALL remain contextual routes inside the portal information architecture rather than becoming additional permanent top-level customer navigation destinations.

## 1. Core invariants

1. A customer-shared work item SHALL expose two separate activity lanes:
   - `CUSTOMER_VISIBLE`
   - `INTERNAL_ONLY`
2. The two lanes SHALL be stored and streamed as separate ordered append-only threads. They SHALL NOT be merged into one mixed chronology in any customer-facing surface.
3. `INTERNAL_ONLY` content SHALL never appear in customer-visible screens, customer-visible exports, customer notifications, or customer SSE payloads.
4. Published comments, notes, status events, assignment events, escalation events, and published attachments SHALL be append-only. Correction happens by new entries or redaction events, never by silent in-place rewrite.
5. All workflow-changing or collaboration-changing mutations SHALL travel through `POST /v1/commands` with idempotency and stale-view guards. Binary upload staging MAY use a separate blob transport, but publication into a workspace thread SHALL remain command-driven.
6. The workspace SHALL update live in place through snapshot + SSE catch-up. No full-page refresh, hard route reset, or client-side state reconstruction is allowed for ordinary activity changes.
7. Customer-visible status is a projection of internal workflow posture. It SHALL NOT be treated as a separate legal state and SHALL NOT outrank authority-of-record truth.
8. Existing masking rules still apply. A masked user may see that content exists but is limited; hidden content SHALL render as `LIMITED`, not as silent absence.
9. Assignment, reassignment, escalation, due-date changes, and notification delivery SHALL create audit events even when no customer-visible activity entry is emitted.
10. A customer-shared work item MAY link to internal evidence, gates, and remediation objects, but only customer-safe summaries, customer-safe attachments, and customer-safe status projections may cross into the customer-visible lane.
11. Collaboration snapshots, resume tokens, file downloads, and notifications SHALL be bound to the
    current tenant/client scope, delegation/access binding, and masking posture. Revocation or scope
    reduction SHALL invalidate those artifacts rather than allowing best-effort continuation.
12. Customer-visible concurrency SHALL be visibility-scoped. Internal-only mutations SHALL NOT stale
    a customer-visible route or leak hidden activity merely because staff-only state advanced.
13. Each request-for-info SHALL have an immutable request identity. Customer replies, staff closure,
    and notification copy SHALL bind to that exact request rather than to a floating "current open
    request" concept.
14. Every accepted collaboration command SHALL resolve to one immutable semantic action family. Safe
    retries SHALL replay the same receipt and side-effect refs rather than minting duplicate activity,
    duplicate notifications, or duplicate audit lineage.
15. Every collaboration shell SHALL preserve one `dominant_question`, one settlement-aware actionability
    posture, one `dominance_contract`, and at most one promoted detail/support module at a time; staff and customer
    embodiments MAY differ in visibility, but SHALL NOT differ in shell identity for the same work
    item.
16. Queue ordering, assignment recommendation, and escalation recommendation SHALL be derived from
    persisted collaboration metrics and frozen routing formulas rather than from client-local
    heuristics, notification timing, or websocket arrival order.
17. Visibility-scoped stale-view protection SHALL compare only the caller-visible lane heads plus
    request-state lineage, access binding, and masking posture; hidden-lane movement SHALL neither
    stale the wrong audience nor be omitted from a lane that can see it.
18. Response lineage SHALL be causal, not proximity-based: a reply SHALL bind to the exact open
    `request_info_ref` and, when applicable, the exact parent entry it answers rather than to the
    nearest preceding visible event.
19. `WorkspaceSnapshot`, `WorkspaceStreamEvent`, and persisted `WorkspaceCursor` artifacts SHALL
    publish the shared `stream_recovery_contract` so resume tokens, epoch/frontier continuity,
    compaction floors, access binding, and masking posture remain machine-bound rather than UI-local
    hints.
20. Collaboration catch-up SHALL complete before live delivery is treated as current. Sequence
    application SHALL remain strictly monotonic and gap-free within one `frame_epoch`, and duplicate
    delivery SHALL remain idempotent by `(WORKSPACE, item_id, frame_epoch, workspace_sequence)`.

## 2. Screen map

| Persona | Route | Purpose | Notes |
|---|---|---|---|
| Staff | `/work` | Work inbox / queue | Low-noise list of assigned, unassigned, escalated, overdue, and waiting items. |
| Staff | `/work/items/{item_id}` | Primary collaboration workspace | Same shell shape as the calm manifest workspace: context, summary, action strip, detail drawer. |
| Staff | `/work/items/{item_id}?module=customer-activity|internal-activity|files|linked-context|audit` | Deep link into a module | Route change SHALL stay in SPA shell and preserve scroll/draft state where legal. |
| Staff | `/manifests/{manifest_id}?focus=workflow:{item_id}` | Jump from manifest posture into linked work item | No full refresh; linked context opens targeted workspace route. |
| Customer | `/portal/requests` | Customer request list | Shows only `CUSTOMER_SHARED` items visible to the authenticated customer or delegate and SHALL remain reachable from the existing portal IA rather than as a sixth permanent top-level nav destination. |
| Customer | `/portal/requests/{item_id}` | Customer collaboration workspace | Same low-noise shell, but only customer-safe modules and actions are mounted. |
| Customer | notification deep link to `/portal/requests/{item_id}` | Jump directly into required action | The route SHALL open the correct module and focus anchor without exposing internal thread state. |

### 2.1 Shell continuity, support budget, and constrained layouts

The collaboration workspace SHALL obey the cross-platform law of same object, same shell.
The same work item opened from `/work`, `/portal/requests`, a notification deep link, or a stale-view
rebase SHALL preserve the same shell grammar for the same audience scope rather than remount a new
conversation metaphor.
The customer-visible work-item detail route is therefore a contextual detail derivative inside
`CLIENT_PORTAL_SHELL`, not a second competing portal grammar. `WorkspaceSnapshot` is the
authoritative detail projection for both audience scopes, but its `shell_family`, route context,
and return-path metadata SHALL keep the customer route anchored to the owning portal shell while
the staff route remains anchored to `CALM_SHELL`.

Rules:

- the collaboration shell SHALL preserve the canonical four-surface order `CONTEXT_BAR ->
  DECISION_SUMMARY -> ACTION_STRIP -> DETAIL_DRAWER` for both staff and customer routes
- `dominance_contract` SHALL pin `DECISION_SUMMARY` as the dominant-question surface and `ACTION_STRIP` as the dominant-action surface for both audience scopes so reply/upload/request flows cannot split away from the mounted workspace question
- every `WorkspaceSnapshot` SHALL emit `cross_device_continuity_contract` with
  `continuity_scope = WORKSPACE_ROUTE`, exact parent return/focus anchors, and
  `compatibility_basis_class = ROUTE_GUARD_AND_VISIBILITY` so refresh, reconnect, narrow restack,
  and native calm-shell restoration reuse one work-item identity and one visibility-bound action
  posture instead of inferring continuity from client-local cache state
- the workspace MAY promote only one support region beyond the primary summary/action stack at a
  time: `DETAIL_DRAWER`; live badges, limitation notices, and draft warnings SHALL mount inside the
  existing shell rather than as parallel persistent rails
- on narrow or embedded layouts, activity, files, linked context, and audit surfaces SHALL collapse
  into one promoted drawer or sheet at a time while preserving the same module order,
  `expanded_module_code`, and `focus_anchor_ref`
- customer-visible routes SHALL preserve the same shell hierarchy while omitting or nulling
  staff-only context and decision fields rather than serializing those fields and relying on the
  renderer to hide them later
- file and attachment views SHALL render the current requested or available artifact summary first,
  with pending, quarantined, rejected, replaced, and historical attachments explicitly separated so
  history never masquerades as the current handoff target

### 2.2 Stream recovery, catch-up, and cursor continuity

The collaboration workspace SHALL use the same recovery grammar as the manifest low-noise shell.
`WorkspaceSnapshot`, `WorkspaceStreamEvent`, and `WorkspaceCursor` SHALL all carry one grouped
`stream_recovery_contract` validated by `schemas/stream_recovery_contract.schema.json`.

Rules:

- `resume_token` is a transport handle only; the grouped `stream_recovery_contract` is the
  authoritative binding for `workspace_route_key`, `item_id`, `shell_stability_token`,
  `session_ref`, `session_binding_hash`, `access_binding_hash`, `masking_posture_fingerprint`,
  `publication_generation`, `frame_epoch`, `last_published_sequence`, and
  `compaction_floor_sequence_or_null`
- persisted collaboration resume state SHALL validate as `WorkspaceCursor`, which keeps the hashed
  resume binding, current `stability_contract`, current `stream_recovery_contract`, and any
  replacement snapshot or replacement stability contract explicit when rebase occurs
- a live cursor or mounted stream SHALL remain legal only while
  `delivery_window_state = LIVE_RESUMABLE`; history compaction, frame-epoch advance, shell-stability
  drift, or route-context drift SHALL move recovery to `REBASE_REQUIRED`
- session-binding drift, access-binding drift, masking-posture drift, or schema incompatibility
  SHALL move recovery to `ACCESS_REBIND_REQUIRED`; collaboration clients SHALL fail closed instead
  of replaying cached internal or customer-visible deltas across the new visibility basis
- if `compaction_floor_sequence_or_null` is non-null and the last acknowledged sequence is smaller,
  the server SHALL require rebase rather than fabricating missed thread history
- customer-visible recovery SHALL remain visibility-scoped: customer cursors SHALL never regain
  internal thread lineage, internal unread counts, or internal sequence heads by replaying a stale
  staff cursor or mixed-audience resume token

## 3. Page layouts

### 3.1 Staff work inbox

The inbox is the triage surface for staff.

It SHALL provide:

- one row per active `WorkflowItem`
- unread badges for `CUSTOMER_VISIBLE` and `INTERNAL_ONLY` activity independently
- visible columns for title, client, period, internal lifecycle, customer status projection, assignee, waiting-on actor, due state, and last activity time
- filter chips for `mine`, `unassigned`, `escalated`, `waiting on customer`, `overdue`, `blocked`, and `resolved recently`
- live row updates in place when assignment, status, due state, or unread counts change
- no forced row reorder while keyboard focus is inside a row action menu; defer reorder until focus leaves the row

Additional inbox rules:

- row hierarchy SHALL preserve three bands in this order:
  1. identity band: title, client, period
  2. triage signal band: `waiting_on_actor`, due state, split unread badges, escalation state
  3. action band: one dominant quick action plus at most two subordinate quick actions
- split unread badges SHALL remain separate for `CUSTOMER_VISIBLE` and `INTERNAL_ONLY`; the inbox
  SHALL NOT collapse them into one blended unread count because that would hide which lane actually
  changed
- filter chips SHALL be route-stable, keyboard reachable, and backed by one authoritative
  `active_filters` object rather than renderer-local interpretation of row content
- row quick actions SHALL be derived from the same legality and stale-view basis as the workspace
  action strip; a quick action that is illegal in the workspace SHALL not stay visually live in the
  inbox
- every quick-action surface SHALL additionally publish one explicit `authoritative_action{
  basis_hash, projection_route_key, projection_version, actionability_state,
  primary_action_code_or_null, secondary_action_codes[], available_action_codes[],
  blocked_action_codes[], blocking_reason_code_or_null, machine_reason_codes[],
  suggested_module_code_or_null, recovery_route_ref_or_null, recovery_focus_anchor_ref_or_null }`
  contract so cached menus, responsive collapse, and reopen flows reuse backend legality rather
  than renderer-local button heuristics
- live updates SHALL mutate badges, last-activity stamps, and row signals in place without stealing
  focus; if a focused row would change sort position or leave the active filter set, the row SHALL
  remain mounted as a pending reorder or pending removal placeholder until focus leaves or the row
  action completes
- keyboard navigation SHALL support a deterministic list path: filter chip tray -> row -> row quick
  actions -> open row workspace, with row focus anchored by the row's stable focus anchor rather
  than by transient DOM index
- the inbox SHALL inherit the shared `OperatorInteractionLayer` rather than invent route-local
  selector, recovery, motion, or current-versus-history behavior; recovery notices and
  notifications stay inline and preview posture stays bound to the same low-noise support path
- the inbox and workspace SHALL therefore also inherit
  `interaction_layer.foundation_contract = InteractionLayerFoundationContract` so calm-shell
  spacing, density, support-spacing, preview posture, and support-window semantics cannot fork away
  from the rest of the operator family

The inbox SHALL be backed by a dedicated `WorkInboxSnapshot` plus `WorkInboxDelta` contract rather
than by ad hoc client joins across per-item workspace snapshots.

Selecting a row SHALL transition into `/work/items/{item_id}` inside the existing shell without a hard refresh.

### 3.2 Staff work item workspace

The staff workspace SHALL reuse the four-surface low-noise shell shape.
It SHALL answer one dominant question at a time and SHALL promote only one detail/support module by
default.

#### A. `CONTEXT_BAR`

The context bar SHALL show, at minimum:

- work-item title and stable item ID
- client identity
- period / obligation context
- internal lifecycle state
- customer status projection
- current assignee or explicit `UNASSIGNED`
- escalation badge when active
- `waiting_on_actor`
- due/SLA badge
- freshness / reconnect state

#### B. `DECISION_SUMMARY`

The summary surface SHALL answer:

- what the issue/request is
- who owes the next action
- whether the item is waiting on customer, staff, authority, or system work
- the next relevant due date
- whether the visible customer state differs from the internal state

The summary SHALL keep reason copy bounded and SHALL not dump full audit or gate detail.
The published summary contract SHALL therefore keep the issue summary separate from explicit
`next_actor_summary_ref`, `due_summary_ref`, and when staff-visible divergence exists
`customer_state_summary_ref` so the renderer never reconstructs who acts next, which deadline
matters, or whether the customer view lags from one unbounded prose blob.

#### C. `ACTION_STRIP`

The action strip SHALL expose one primary action and at most two secondary actions based on policy, state, and thread visibility.

Typical staff actions are:

- `Assign to me`
- `Reassign`
- `Escalate`
- `Request info`
- `Reply to customer`
- `Add internal note`
- `Mark in progress`
- `Resolve`

Illegal or unavailable actions SHALL be omitted rather than shown disabled.

#### D. `DETAIL_DRAWER`

The detail drawer SHALL expose these modules for staff:

- `CUSTOMER_ACTIVITY`
- `INTERNAL_ACTIVITY`
- `FILES`
- `LINKED_CONTEXT`
- `AUDIT_TRAIL`

Rules:

- only one module may be expanded at a time by default
- `CUSTOMER_ACTIVITY` and `INTERNAL_ACTIVITY` SHALL be separate modules with separate unread counts
- customer-visible and internal composers SHALL be separate controls and SHALL never share the same default visibility
- a `Preview customer view` toggle MAY hide internal-only modules and render the exact customer-safe projection, but it SHALL NOT mutate visibility or publish anything by itself
- if live activity arrives in a non-expanded module, the UI SHALL increment the module badge and show a non-disruptive new-activity affordance rather than auto-switching modules
- `WorkspaceSnapshot.detail_drawer.modules[]` SHALL publish `module_badge_count`,
  `new_activity_marker_ref_or_null`, and `visibility_partition` for every mounted module so unread
  state, live-update affordances, and lane boundaries survive reconnect, refresh, and rebase without
  renderer inference
- `WorkspaceSnapshot.detail_drawer.composer_layer` SHALL publish the active append-command family,
  default append-command family, explicit composer visibility, draft/rebase posture,
  attachment-picker visibility inheritance, and publish-confirmation state so the renderer never
  infers whether a draft is internal-only, customer-visible, rebase-blocked, or ready to send
- `CUSTOMER_ACTIVITY` SHALL use `visibility_partition = CUSTOMER_VISIBLE_ONLY`;
  `INTERNAL_ACTIVITY`, `LINKED_CONTEXT`, and `AUDIT_TRAIL` SHALL use
  `visibility_partition = INTERNAL_ONLY_ONLY`
- `new_activity_marker_ref_or_null` MAY appear only on a non-expanded module and SHALL indicate that
  fresh activity exists behind the current drawer focus rather than forcing promotion or expansion
- staff routes SHALL serialize drawer modules in the canonical low-noise order
  `CUSTOMER_ACTIVITY -> INTERNAL_ACTIVITY -> FILES -> LINKED_CONTEXT -> AUDIT_TRAIL`; customer
  routes SHALL serialize `CUSTOMER_ACTIVITY -> FILES`
- only one drawer module may be promoted at a time through `promoted_module_code`; when
  `actionability_state = NO_SAFE_ACTION`, `promoted_module_code`, `expanded_module_code`, and the
  action strip's `suggested_module_code` SHALL converge on the same investigation path so reconnect
  and rebase do not invent a second support hierarchy
- `AUDIT_TRAIL` and `LINKED_CONTEXT` SHALL not become the default promoted module in an ordinary
  writable steady/freshening staff state; they are promoted only for blocked, recovery, or explicit
  investigation pivots

### 3.3 Customer request list

The customer list is the low-noise queue for open requests and shared issue threads.

It SHALL show:

- request title
- customer-visible status
- next customer due date, if present
- unread badge
- last staff update time
- whether files are requested

The customer list SHALL NOT show internal lifecycle names, internal assignee names where policy hides staff identity, escalation state, or internal notes.

Additional customer-list rules:

- rows SHALL preserve one explicit three-band hierarchy in this order:
  1. request identity: title plus stable request/work-item reference
  2. customer-safe status and due posture: plain-language status, due label, unread, and file-request signal
  3. one customer-safe next move: `Reply`, `Upload file`, `Answer request`, or explicit `NO_SAFE_ACTION`
- the mounted queue SHALL keep the status-family hierarchy
  `ACTION_REQUIRED -> IN_REVIEW -> WAITING_ON_US -> WAITING_ON_AUTHORITY -> COMPLETED`; due posture MAY refine
  order inside a status family, but SHALL NOT allow waiting or completed rows to outrank items that currently
  require customer action
- status copy SHALL remain coarse and literal. The queue SHALL not leak internal lifecycle, gate, escalation,
  or stale-view taxonomies through row labels, chips, or tooltips
- every visible due point SHALL publish one explicit customer-safe date or due label rather than requiring the
  client to infer urgency from a color state alone
- each row SHALL expose at most one dominant customer-safe action. If no action is safe, the queue SHALL render an
  explicit `NO_SAFE_ACTION` explanation rather than leaving an inert row with hidden blockers
- each row SHALL preserve current-versus-historical artifact posture explicitly so a historical upload or
  superseded shared file cannot masquerade as the current handoff target from the queue itself
- the request list SHALL inherit the shared `PortalInteractionLayer` rather than invent route-local
  spacing, selector grammar, same-shell return behavior, current-versus-history artifact treatment,
  or motion that diverges from the rest of the portal

### 3.4 Customer collaboration workspace

The customer workspace SHALL use the same four-surface shell, but with a reduced module set.
It SHALL preserve the same dominant-question and settlement grammar as the staff workspace even
though the visible modules and actions are narrower.

#### Mounted surfaces

- `CONTEXT_BAR` with request title, customer-visible status, due date, and freshness
- `DECISION_SUMMARY` with plain-language explanation of what is needed or what is happening
- `ACTION_STRIP` with customer-safe actions such as `Reply`, `Upload file`, `Answer request`, or explicit `NO_SAFE_ACTION`
- `DETAIL_DRAWER` with only:
  - `CUSTOMER_ACTIVITY`
  - `FILES`

Rules:

- no internal thread, internal assignee controls, escalation controls, or audit trail is visible
- customer-visible staff identity MAY be shown as an individual name only when tenant policy allows; otherwise show a role label such as `Taxat reviewer`
- customer-visible status language SHALL stay coarse and literal; do not leak internal gate language such as `BLOCKED`, `STALE`, or `OVERRIDABLE_BLOCK`
- if the customer is currently required to act, the primary action SHALL remain visible above the thread without forcing them to scroll through historical messages first
- the detail route SHALL serialize one explicit customer-safe status family, one explicit due label when a due point
  exists, and one customer-safe primary-action label so responsive embodiments never infer them from staff-only
  fields or hidden command vocabulary
- customer-safe primary actions SHALL remain limited to `Reply`, `Upload file`, and `Answer request`; if none is
  safe, the action strip SHALL render explicit `NO_SAFE_ACTION` explanation plus one investigation path into either
  `CUSTOMER_ACTIVITY` or `FILES`
- the `FILES` module SHALL keep current shared artifacts ahead of historical artifacts and SHALL preserve typed
  history posture (`CURRENT_ONLY`, `CURRENT_PLUS_HISTORY`, `HISTORY_ONLY`, or `LIMITED`) so a rejected, replaced,
  or masked file never becomes the default download target
- request-detail routes SHALL preserve a visible return path to the request list, home task queue,
  approval context, or help context that launched them, and SHALL serialize the exact parent-route
  focus anchor needed to restore that target rather than a generic tab-level fallback
- request-detail routes SHALL not expand into a generic document center, help surface, or empty
  portal home fallback while the same work item remains lawful and visible; when the focused item
  disappears after rebase, the portal SHALL either open the latest visible lawful object or return
  to that serialized parent-route focus anchor with explicit recovery copy
- if the customer escalates into the portal Help route from `/portal/requests/{item_id}`, the help handoff SHALL carry the exact `item_id`, any open `request_info_ref`, the current customer-safe focus anchor, and current file/status context into `PortalHelpRequest` and the help-route case-context panel rather than forcing a blank restatement

## 4. Key components

### 4.1 Queue and shell components

- `WorkItemRow` - `data-testid="work-item-row-{item_id}"`
- `StatusPill` - `data-testid="status-pill"`
- `CustomerStatusPill` - `data-testid="customer-status-pill"`
- `AssigneeChip` - `data-testid="assignee-chip"`
- `SlaBadge` - `data-testid="sla-badge"`
- `EscalationBadge` - `data-testid="escalation-badge"`
- `ModuleBadge` - unread count for each drawer module
- `DominantQuestion` - `data-testid="workspace-dominant-question"`
- `SettlementPosture` - `data-testid="workspace-settlement-posture"`
- `NoSafeAction` - `data-testid="workspace-no-safe-action"`
- `ProblemBanner` - `data-testid="problem-banner"`

### 4.2 Activity thread components

- `CustomerActivityThread` - `data-testid="thread-customer"`
- `InternalActivityThread` - `data-testid="thread-internal"`
- `ActivityItem` - `data-testid="activity-item-{entry_id}"`
- `AttachmentChip` - `data-testid="attachment-chip-{attachment_id}"`
- `CurrentAttachmentChip` - `data-testid="attachment-chip-current"`
- `HistoricalAttachmentChip` - `data-testid="attachment-chip-historical"`
- `PendingAttachmentChip` - `data-testid="attachment-chip-pending"`
- `UnavailableAttachmentChip` - `data-testid="attachment-chip-unavailable"`
- `NewActivityMarker` - `data-testid="new-activity-marker"`

Each `ActivityItem` SHALL render:

- actor label
- absolute timestamp on focus/hover and relative timestamp by default
- event kind label such as `Comment`, `Internal note`, `Requested info`, `Status changed`, `Assignment changed`, or `Escalated`
- visibility badge rendered as text, not color alone
- body text or status summary
- attachment chips

### 4.3 Composer components

- `InternalNoteComposer` - `data-testid="composer-internal"`
- `CustomerCommentComposer` - `data-testid="composer-customer-visible"`
- `RequestInfoComposer` - `data-testid="composer-request-info"`
- `AttachmentPicker` - `data-testid="attachment-picker"`

Composer rules:

- staff route defaults to `InternalNoteComposer`; publishing to the customer-visible lane requires an explicit switch into `CustomerCommentComposer` or `RequestInfoComposer`
- the customer-visible composer SHALL display a prominent `Shared with customer` label before publish
- `RequestInfoComposer` SHALL require question text and MAY require a customer due date by policy
- attachments inherit the composer lane visibility at publish time; users SHALL confirm visibility before final publish
- drafts are local until publish; once published, entries are immutable
- if a stale-view rebase is required while a draft exists, the draft SHALL be preserved locally, the publish action SHALL be blocked, and the user SHALL be asked to rebase before send
- the canonical composer reading order SHALL remain `COMPOSER_SWITCHER -> DRAFT_EDITOR ->
  ATTACHMENT_PICKER -> PUBLISH_CONFIRMATION`; responsive collapse MAY stack those surfaces but SHALL
  NOT reorder them
- `WorkspaceSnapshot.detail_drawer.composer_layer` SHALL therefore serialize:
  `surface_order[]`, `available_append_command_codes[]`,
  `default_append_command_code_or_null`, `selected_append_command_code_or_null`,
  `composer_visibility_class_or_null`, `visibility_label_ref_or_null`,
  `target_request_info_ref_or_null`, `draft_state`, `draft_ref_or_null`,
  `draft_last_saved_at_or_null`, `rebase_target_snapshot_ref_or_null`,
  `publish_block_reason_codes[]`, `attachment_picker{ picker_state, staged_upload_refs[],
  inherited_visibility_class_or_null, visibility_confirmation_required,
  visibility_confirmed }`, and `publish_confirmation{ confirmation_state,
  publish_action_code_or_null, confirmation_message_ref_or_null }`
- `selected_append_command_code_or_null` SHALL use the durable collaboration command families
  `ADD_INTERNAL_NOTE`, `ADD_CUSTOMER_COMMENT`, `REQUEST_CUSTOMER_INFO`, and when an open request is
  being answered `RESPOND_TO_REQUEST_INFO`; `ADD_INTERNAL_NOTE` SHALL remain the staff default
- `draft_state in {REBASED, STALE_REVIEW_REQUIRED}` SHALL retain the same `draft_ref_or_null`,
  surface a non-null `rebase_target_snapshot_ref_or_null`, and force
  `publish_confirmation.confirmation_state = BLOCKED_BY_REBASE` until the user explicitly rebases
- `RESPOND_TO_REQUEST_INFO` SHALL target the exact open `RequestInfoRecord.request_info_id`; the
  composer SHALL not degrade that reply path into a floating generic comment draft
- customer-visible publish affordances SHALL remain explicit: a customer-visible draft or staged
  customer-visible attachment SHALL not expose a live publish action until visibility confirmation
  is satisfied

### 4.4 File and context components

- `FilesModule` - `data-testid="module-files"`
- `LinkedContextPanel` - `data-testid="module-linked-context"`
- `AuditTape` - `data-testid="module-audit"`

`FilesModule` SHALL segment files by visibility:

- `Shared with customer`
- `Internal only`

Additional file rules:

- every file row SHALL show visibility, publish state, malware/validation posture when relevant, and whether the file is the current artifact or historical context
- the `FILES` module SHALL publish `file_segments[]`, `current_shared_file_refs[]`,
  `historical_shared_file_refs[]`, and `internal_only_file_refs[]` so the renderer never blends the
  shared lane, shared history, and internal-only lane into one unlabeled file list
- customer request detail and attachment reads SHALL additionally publish one explicit
  `artifact_selection` contract plus route-level `artifact_focus_*` posture so current, historical,
  and limited file focus survives refresh, reconnect, and responsive restacking without reopening the
  wrong artifact
- those same customer-visible file surfaces SHALL additionally publish one explicit
  `artifact_affordance` contract so summary headers, visible primary file slots, explicit history
  disclosure, and default preview/download targets stay aligned to the governed current file rather
  than a stale or rejected historical row
- staff routes SHALL serialize `file_segments[] = [SHARED_WITH_CUSTOMER, INTERNAL_ONLY]`; customer
  routes SHALL serialize only `[SHARED_WITH_CUSTOMER]`
- `current_shared_file_refs[]` and `historical_shared_file_refs[]` SHALL remain disjoint so the
  active customer-visible artifact never collapses into unlabeled history
- preview SHOULD stay inside the owning shell first when policy and format support allow; download-only fallback SHALL explain why inline preview is unavailable
- customer-facing file rows SHALL therefore publish one explicit preview posture and typed
  unavailability or downgrade reason rather than reconstructing safe-open behavior from transfer,
  masking, or policy fields alone
- pending, quarantined, masked, or policy-limited files SHALL never open a live external preview target; they SHALL render an unavailable or limited state with typed reason copy instead
- customer routes SHALL default to the current customer-visible artifact for each request and keep superseded or rejected uploads behind explicitly labeled history affordances

`LINKED_CONTEXT` SHALL show references to related manifests, errors, remediation tasks, evidence, and submission context, but customer routes SHALL receive only customer-safe summaries or nothing.

`AUDIT_TRAIL` SHALL be staff/auditor-only, read-only, append-only, and ordered.

## 5. Permissions

The collaboration workspace SHALL preserve the role model already defined in `actor_and_authority_model.md`.

### 5.1 View permissions

- `CLIENT_VIEWER`, `CLIENT_CONTRIBUTOR`, `CLIENT_SIGNATORY`, `SUBJECT_SELF`, and `SUBJECT_REPRESENTATIVE` MAY access only the customer-visible workspace for `WorkflowItem.collaboration_visibility = CUSTOMER_SHARED` where delegation and client scope permit access. `CLIENT_USER` remains a legacy umbrella only; runtime policy SHALL resolve the session to the effective client-facing role before view composition or mutation checks.
- `PREPARER`, `REVIEWER`, `APPROVER`, `SUPPORT_OPERATOR`, and `TENANT_ADMIN` MAY access the staff workspace within authorized tenant/client scope.
- `AUDITOR` MAY access staff workspace modules read-only, including `INTERNAL_ACTIVITY` and `AUDIT_TRAIL`, but SHALL have no mutation controls.
- A session with `ALLOW_MASKED` access MAY open the workspace, but any masked content SHALL be rendered as `LIMITED`; file names, body text, or linked-context snippets may be suppressed by policy.

### 5.2 Mutation permissions

#### Assignment and reassignment

- `PREPARER` MAY assign an unassigned item to self and MAY reassign to a peer only when queue policy explicitly allows peer reassignment.
- `REVIEWER`, `APPROVER`, `SUPPORT_OPERATOR`, and `TENANT_ADMIN` MAY reassign across allowed queues and teams.
- `AUDITOR` and customer roles SHALL NOT assign or reassign.

#### Escalation

- `PREPARER` MAY escalate to a permitted reviewer/approver/support queue but SHALL NOT clear or downgrade an active escalation owned by another role.
- `REVIEWER`, `APPROVER`, and `TENANT_ADMIN` MAY escalate, transfer ownership during escalation, and clear an escalation.
- `SUPPORT_OPERATOR` MAY escalate only within support-owned workflows unless broader policy is granted.
- customer roles and `AUDITOR` SHALL NOT escalate.

#### Internal notes and customer-visible comments

- `PREPARER`, `REVIEWER`, `APPROVER`, `SUPPORT_OPERATOR`, and `TENANT_ADMIN` MAY add internal notes.
- `CLIENT_VIEWER`, `CLIENT_CONTRIBUTOR`, `CLIENT_SIGNATORY`, `SUBJECT_SELF`, and `SUBJECT_REPRESENTATIVE` SHALL never see or publish internal notes.
- the same staff roles MAY publish customer-visible comments only on `CUSTOMER_SHARED` items.
- `CLIENT_CONTRIBUTOR`, `CLIENT_SIGNATORY`, `SUBJECT_SELF`, and `SUBJECT_REPRESENTATIVE` MAY reply only on the `CUSTOMER_VISIBLE` thread.
- `CLIENT_VIEWER` is read-only in the collaboration workspace and SHALL NOT publish replies, upload shared attachments, or answer request-for-info prompts.

#### Request-for-info

- staff roles listed above MAY send `REQUEST_CUSTOMER_INFO` only when the item is customer-shared and the summary plus any attachments are customer-safe.
- `CLIENT_CONTRIBUTOR`, `CLIENT_SIGNATORY`, `SUBJECT_SELF`, and `SUBJECT_REPRESENTATIVE` MAY answer an open request-for-info and upload shared attachments.
- a customer reply SHALL NOT grant permission to change internal workflow beyond the allowed response transition.

#### Status, due dates, and files

- staff roles MAY change workflow status only through legal transitions defined below.
- customer roles SHALL NOT directly set internal workflow status, but a customer reply MAY move an item from `WAITING_ON_CLIENT` to `IN_PROGRESS` through the response command.
- only staff with queue ownership, reviewer/admin rights, or explicit support policy MAY set `sla_due_at`.
- only staff MAY set `customer_due_at`.
- internal attachments are staff-only.
- shared attachments MAY be uploaded by staff or customer roles on shared items.
- attachment visibility is immutable after publish. To share an internal file externally, the system SHALL require a new publish action using a customer-safe derivative or customer-safe copy.

### 5.3 Non-expansion rule

Collaboration permissions SHALL NOT silently grant any of the following:

- filing permission
- override approval permission
- authority submission permission
- authority truth mutation
- unmasked access beyond the existing actor/access model

## 6. State transitions

### 6.1 Authoritative workflow lifecycle

The workspace SHALL use `WorkflowItem.lifecycle_state` as the authoritative internal status.
It SHALL honor the legal transition set already defined in `state_machines.md` rather than silently inventing a parallel lifecycle.

Collaboration-relevant transitions are:

- `OPEN --assign|pick_up--> IN_PROGRESS`
- `IN_PROGRESS --request_info_sent--> WAITING_ON_CLIENT`
- `WAITING_ON_CLIENT --customer_reply_recorded--> IN_PROGRESS`
- `IN_PROGRESS --waiting_on_authority--> WAITING_ON_AUTHORITY`
- `WAITING_ON_AUTHORITY --authority_response_recorded--> IN_PROGRESS`
- `IN_PROGRESS --blocked_condition--> BLOCKED`
- `IN_PROGRESS --resolved--> DONE`
- `OPEN --cancelled_or_no_longer_relevant--> CANCELLED`
- `OPEN --superseded_by_new_context--> STALE`

Rules:

- `DONE`, `CANCELLED`, and `STALE` items are terminal for ordinary collaboration. A fresh issue SHALL create a new work item rather than silently reopening the old one.
- a `REQUEST_CUSTOMER_INFO` command SHALL also set `waiting_on_actor = CUSTOMER`
- a customer response SHALL clear `waiting_on_actor = CUSTOMER` and set it to `STAFF` unless another explicit downstream wait state applies
- a response or closure action SHALL target the exact open `request_info_ref`; it SHALL NOT apply to a
  different numbered request that happened to become current later
- if a product action implies a broader human flow than the current authoritative lifecycle allows, the implementation SHALL decompose that action into one or more existing legal transitions or allocate a fresh item rather than invent a hidden direct edge

### 6.2 Assignment projection

Assignment is an append-only event stream with a current projection.

Projection states are:

- `UNASSIGNED`
- `ASSIGNED`
- `ESCALATED`

Allowed projection transitions are:

- `UNASSIGNED --assign--> ASSIGNED`
- `ASSIGNED --reassign--> ASSIGNED`
- `ASSIGNED --escalate_without_transfer--> ESCALATED`
- `ASSIGNED|ESCALATED --escalate_with_transfer--> ASSIGNED`
- `ESCALATED --clear_escalation--> ASSIGNED`

Rules:

- `current_assignee_ref` is derived from the latest accepted assignment or escalation-with-transfer event
- `routing_queue_ref` is derived from the latest accepted queue-bearing assignment, reassignment, or escalation event and SHALL remain stable between such events
- escalation without transfer SHALL preserve `current_assignee_ref`
- reassignment and escalation SHALL emit internal system activity entries plus audit events

### 6.2A Quantitative routing, escalation, and queue order

The staff inbox, assignment recommender, escalation surfacing, and operator digest SHALL use the
frozen workflow-orchestration formulas in `compute_parity_and_trust_formulas.md`.

At minimum the engine SHALL persist or deterministically re-derive:

- `sla_pressure_score`
- `escalation_pressure_score`
- `assignment_efficiency_score`
- `ownership_confidence_score`
- `resolution_confidence_score`
- `collaboration_priority_score`
- `queue_health_score` per active queue/view

Rules:

- staff inbox order SHALL be the stable priority tuple `(collaboration_priority_score desc, escalation_rank desc, effective_due_at asc nulls last, resolution_confidence_score asc, queue_entered_at asc, item_id asc)`
- the tuple SHALL be frozen per snapshot and SHALL NOT be perturbed by unread counter changes, SSE delivery race order, client-local refetch timing, or browser tab focus
- escalation SHALL be recommended when `escalation_pressure_score` breaches the frozen policy threshold or when the current assignee's `assignment_efficiency_score` falls below the frozen continuation threshold while a higher-confidence eligible owner exists
- reassignment recommendation SHALL preserve draft safety: an active customer or internal composer SHALL never silently transfer ownership, clear a draft, or reorder the mounted item out from under the user without an accepted command
- queue-health degradation SHALL feed queue banners, digest summaries, and routing policy before raw backlog count alone is used as the operator signal

### 6.3 Request-for-info projection

Each workspace MAY carry one active customer request-for-info projection.

States are:

- `NONE`
- `OPEN`
- `RESPONDED`
- `CLOSED`

Allowed transitions are:

- `NONE --request_sent--> OPEN`
- `OPEN --customer_reply_recorded--> RESPONDED`
- `RESPONDED --staff_accept_reply--> CLOSED`
- `OPEN --cancel_request--> CLOSED`

Rules:

- while request-for-info state is `OPEN`, the internal lifecycle SHOULD be `WAITING_ON_CLIENT`
- each `REQUEST_CUSTOMER_INFO` acceptance SHALL allocate an immutable `request_info_ref` and
  monotonic `request_info_ordinal`
- the durable request block SHALL also materialize a `RequestInfoRecord` validated by
  `schemas/request_info_record.schema.json`; workspace projections MAY summarize it but SHALL NOT
  replace it
- `RESPOND_TO_REQUEST_INFO` and any close/cancel action SHALL reference the exact open
  `request_info_ref` they apply to
- a second open request-for-info SHALL be rejected unless policy explicitly allows multiple numbered
  requests and the UI presents them as separate request blocks keyed by `request_info_ref`
- if policy allows multiple numbered requests, each open request SHALL retain separate due date,
  unread, closure, and audit lineage rather than collapsing into one shared projection

### 6.4 Customer status projection

The customer-facing status SHALL be derived from internal posture as follows:

| Internal posture | Customer-visible projection |
|---|---|
| `OPEN` | `UNDER_REVIEW` |
| `IN_PROGRESS` | `UNDER_REVIEW` |
| `BLOCKED` | `UNDER_REVIEW` unless policy exposes a customer-actionable hold |
| `WAITING_ON_CLIENT` | `ACTION_REQUIRED` |
| `WAITING_ON_AUTHORITY` | `WAITING_ON_CONFIRMATION` |
| `DONE` | `RESOLVED` |
| `CANCELLED` | `CLOSED` |
| `STALE` | `CLOSED` or hidden by policy |

Rules:

- assignment, reassignment, and escalation SHALL NOT change customer status by themselves
- a staff status change MAY optionally publish a customer-visible system entry when the customer projection changes
- customer-visible copy SHALL remain plain-language and SHALL NOT expose internal severity or gate jargon
- `customer_status_projection` is a derived read-side field; northbound collaboration filters and
  command payloads SHALL use explicit names such as `lifecycle_state` and
  `customer_status_projection` rather than a bare `status` token that could mean either
  authoritative workflow state or customer-facing projection

### 6.5 Rejection rules

The backend SHALL reject collaboration commands when:

- the target item is terminal and the command would append new ordinary collaboration state
- `if_match_work_item_version` or `if_match_shell_stability_token` is stale
- a customer role attempts to access or mutate the internal thread
- a customer-visible publish references internal-only attachments or internal-only linked context
- a status transition is not legal from the current authoritative lifecycle state

## 7. Data model and schema additions

### 7.1 `WorkflowItem` additions

The base `WorkflowItem` artifact SHALL validate against `schemas/workflow_item.schema.json`; this
section defines the collaboration-specific fields and projections that the schema freezes.

`WorkflowItem` SHALL be extended with at minimum:

- `title`
- `collaboration_visibility in {INTERNAL_ONLY, CUSTOMER_SHARED}`
- `customer_status_projection`
- `current_assignee_ref`
- `assignment_state in {UNASSIGNED, ASSIGNED, ESCALATED}`
- `escalation_target_ref`
- `routing_queue_ref`
- `waiting_on_actor in {NONE, CUSTOMER, STAFF, AUTHORITY, SYSTEM}`
- `sla_policy_ref`
- `sla_due_at`
- `customer_due_at`
- `due_state in {ON_TRACK, DUE_SOON, OVERDUE, BREACHED}`
- `queue_entered_at`
- `last_assignment_at`
- `waiting_since_at`
- `reassignment_count_30d`
- `ownership_confidence_score in [0,100]`
- `assignment_efficiency_score in [0,100]`
- `sla_pressure_score in [0,100]`
- `escalation_pressure_score in [0,100]`
- `collaboration_priority_score in [0,100]`
- `resolution_confidence_score in [0,100]`
- `customer_thread_ref`
- `internal_thread_ref`
- `staff_workspace_version`
- `customer_workspace_version`
- `active_request_info_ref`
- `next_request_info_ordinal`
- `last_customer_activity_at`
- `last_internal_activity_at`
- `last_customer_visible_event_ref`
- `last_internal_event_ref`

Rules:

- `staff_workspace_version` SHALL increment on every accepted collaboration mutation and on every
  projection change that materially affects staff actionability
- `customer_workspace_version` SHALL increment only on customer-visible mutations or customer-visible
  projection changes that materially affect customer actionability
- `customer_workspace_version` SHALL never exceed `staff_workspace_version` because every
  customer-visible mutation is also visible on the staff route
- customer routes and customer-capable commands SHALL compare against `customer_workspace_version`;
  staff routes SHALL compare against `staff_workspace_version`
- `queue_entered_at` SHALL remain stable across ordinary edits and SHALL reset only when the item
  leaves the active operational queue set and later re-enters through a fresh open state or a
  superseding replacement item
- `waiting_since_at` SHALL update exactly when `waiting_on_actor` changes and SHALL otherwise remain
  stable
- quantitative routing scores SHALL be recomputed whenever due dates, waiting actor, assignment,
  visible freshness, request state, or linked gate/trust posture materially changes
- hidden internal-only mutations SHALL NOT force customer stale-view failure by themselves
- `collaboration_visibility = INTERNAL_ONLY` SHALL suppress customer routes, customer notifications, and customer stream subscription entirely
- `WAITING_ON_CLIENT` and any non-null `customer_due_at` SHALL be legal only on `CUSTOMER_SHARED`
  items because internal-only work cannot wait on a hidden customer lane
- `last_customer_activity_at` and `last_customer_visible_event_ref` SHALL move together, as SHALL
  `last_internal_activity_at` and `last_internal_event_ref`

### 7.2 New append-only collaboration artifacts

`RequestInfoRecord`, `CollaborationThread`, `CollaborationEntry`, `CollaborationAttachment`,
`WorkItemParticipant`, `WorkItemNotification`, `WorkspaceSnapshot`, `CollaborationActivitySlice`,
and `CollaborationAttachmentSlice` SHALL validate against dedicated JSON schemas in `schemas/`.

#### `RequestInfoRecord`

Fields:

- `request_info_id`
- `item_id`
- `visibility_class in {CUSTOMER_VISIBLE}`
- `request_info_ordinal`
- `lifecycle_state in {OPEN, RESPONDED, CLOSED}`
- `request_state_version`
- `prompt_entry_ref`
- `prompt_body_ref`
- `requested_by_ref`
- `customer_due_at`
- `opened_notification_refs[]`
- `opened_at`
- `response_entry_ref`
- `response_body_ref`
- `responded_by_ref`
- `responded_at`
- `closure_entry_ref`
- `closed_by_ref`
- `closure_reason_code in {CUSTOMER_REPLY_ACCEPTED, CANCELLED, SUPERSEDED, null}`
- `closed_at`
- `audit_event_refs[]`

Rules:

- request numbering SHALL be immutable within a work item once allocated
- `request_state_version` SHALL increment on every accepted open/respond/close transition and SHALL
  participate in stale-view protection for response commands
- the persisted `request_state_version` SHALL remain exact for the request's current terminal or
  intermediate posture: `OPEN -> 1`, `RESPONDED -> 2`, `CLOSED + CUSTOMER_REPLY_ACCEPTED -> 3`,
  and `CLOSED + {CANCELLED, SUPERSEDED} -> 2`
- a response or closure SHALL retain the exact collaboration-entry and audit lineage that explains
  the transition rather than only mutating the projected request block
- `audit_event_refs[]` SHALL never be empty because open, response, and closure transitions must
  remain audit-traceable
- response lineage SHALL remain distinct from prompt lineage: `response_entry_ref` SHALL NOT equal
  `prompt_entry_ref`, and `response_body_ref` SHALL NOT equal `prompt_body_ref`
- `closure_reason_code = CUSTOMER_REPLY_ACCEPTED` SHALL retain the full response-lineage quartet
  (`response_entry_ref`, `response_body_ref`, `responded_by_ref`, `responded_at`) because accepted
  reply closure is not a response-free terminal path
- request chronology SHALL remain monotonic: `opened_at <= responded_at <= closed_at` whenever the
  later timestamps exist

#### `CollaborationThread`

Fields:

- `thread_id`
- `item_id`
- `visibility_class in {CUSTOMER_VISIBLE, INTERNAL_ONLY}`
- `head_sequence`
- `lifecycle_state in {OPEN, CLOSED, LIMITED}`
- `participant_refs[]`
- `last_entry_ref`

#### `CollaborationEntry`

Fields:

- `entry_id`
- `item_id`
- `thread_id`
- `thread_sequence`
- `entry_type in {COMMENT, NOTE, STATUS_CHANGE, ASSIGNMENT_CHANGE, ESCALATION, REQUEST_INFO, REQUEST_INFO_RESPONSE, ATTACHMENT_ONLY, SYSTEM}`
- `visibility_class in {CUSTOMER_VISIBLE, INTERNAL_ONLY}`
- `causal_parent_entry_ref`
- `body_ref`
- `attachment_refs[]`
- `actor_ref`
- `created_at`
- `command_id`
- `semantic_action_id`
- `command_receipt_ref`
- `audit_event_ref`
- `request_info_ref`
- `redaction_state in {NONE, REDACTED}`

Rules:

- `thread_sequence` SHALL be strictly monotonic within a thread
- body text and attachment refs are immutable once published
- all side effects emitted from one accepted semantic collaboration action SHALL share the same
  `semantic_action_id`
- `REQUEST_INFO` and `REQUEST_INFO_RESPONSE` entries SHALL carry the exact `request_info_ref` they
  open or answer
- `REQUEST_INFO_RESPONSE` SHALL also set `causal_parent_entry_ref = RequestInfoRecord.prompt_entry_ref`;
  other reply-style entries MAY set `causal_parent_entry_ref` when they are semantically answering a
  specific prior entry
- reply lineage SHALL be resolved from `causal_parent_entry_ref`, never from nearest-preceding-time
  heuristics
- raw `ASSIGNMENT_CHANGE` and `ESCALATION` entries SHALL remain `INTERNAL_ONLY`; if the customer lane
  needs an update, it SHALL receive a customer-safe `SYSTEM` or `STATUS_CHANGE` entry instead
- any redaction SHALL create a new redaction event and SHALL preserve audit linkage to the original entry

#### `CollaborationAttachment`

Fields:

- `attachment_id`
- `item_id`
- `published_entry_ref`
- `current_state_entry_ref`
- `state_audit_event_ref`
- `visibility_class in {CUSTOMER_VISIBLE, INTERNAL_ONLY}`
- `request_info_ref`
- `upload_session_id`
- `publish_copy_mode in {DIRECT_UPLOAD, CUSTOMER_SAFE_COPY, CUSTOMER_SAFE_DERIVATIVE}`
- `source_attachment_ref`
- `filename`
- `media_type`
- `byte_size`
- `checksum`
- `storage_ref`
- `download_ref`
- `malware_scan_state in {PENDING, CLEAN, QUARANTINED}`
- `publication_state in {PENDING_SCAN, AVAILABLE, QUARANTINED}`
- `download_state in {PENDING, DOWNLOADABLE, UNAVAILABLE}`
- `unavailable_reason_code`
- `uploaded_by_ref`
- `uploaded_at`
- `published_at`
- `state_changed_at`
- `scan_completed_at`
- `semantic_action_id`
- `retention_class`

Rules:

- an attachment SHALL NOT become downloadable until `malware_scan_state = CLEAN` and
  `publication_state = AVAILABLE`; client-facing downloadability SHALL be represented by
  `download_state = DOWNLOADABLE` and a non-null `download_ref`, never by raw `storage_ref` alone
- customer-visible attachments MAY appear as pending placeholders while scan is incomplete, but the
  system SHALL NOT issue customer-downloadable links, attachment-complete email copy, or customer
  export material for them until they are `AVAILABLE`
- if scan later yields `QUARANTINED`, the system SHALL append a typed system entry, emit audit
  lineage, suppress customer download, and preserve the placeholder with an explicit unavailable
  reason rather than silently removing the attachment
- quarantined files SHALL remain auditable and SHALL render as unavailable with a typed reason
- the persisted attachment SHALL retain `upload_session_id`, optional `request_info_ref`, and a
  distinct `published_at` separate from `uploaded_at` so governed staging lineage and publish timing
  remain replay-safe
- attachment chronology SHALL remain monotonic: `uploaded_at <= published_at <= state_changed_at`,
  `scan_completed_at` SHALL NOT predate `uploaded_at`, and any terminal `AVAILABLE` or
  `QUARANTINED` state SHALL keep `state_changed_at >= scan_completed_at`
- `current_state_entry_ref` and `state_audit_event_ref` SHALL point to the entry and audit event
  that explain the attachment's current publish state; for a later quarantine this SHALL be the
  appended typed system entry rather than the original publish entry only
- if a customer-visible attachment is produced from an internal-only attachment, the persisted object
  SHALL record `publish_copy_mode` and `source_attachment_ref` so customer-safe copy or derivative
  lineage is explicit rather than inferred
- `publication_state = QUARANTINED` SHALL therefore keep `current_state_entry_ref` distinct from
  `published_entry_ref` so the current state cannot collapse back onto the original publish event

#### `WorkItemParticipant`

Fields:

- `participant_ref`
- `item_id`
- `participant_role`
- `watch_state in {PRIMARY_OWNER, WATCHER, CUSTOMER_PARTICIPANT}`
- `last_read_customer_sequence`
- `last_read_internal_sequence`
- `notification_preferences_ref`

Rules:

- `CUSTOMER_PARTICIPANT` rows SHALL never retain internal unread state
- `PRIMARY_OWNER` SHALL remain limited to staff owner roles rather than customer-visible participants
- customer-facing participant roles SHALL always project as `watch_state = CUSTOMER_PARTICIPANT`
- `CUSTOMER_PARTICIPANT` rows SHALL keep `last_read_internal_sequence = null` rather than carrying
  stale internal-lane cursors forward

#### `WorkItemNotification`

Fields:

- `notification_id`
- `item_id`
- `recipient_ref`
- `visibility_class`
- `notification_type`
- `delivery_channel in {IN_APP, EMAIL, PUSH}`
- `dedupe_key`
- `semantic_action_id`
- `access_binding_hash`
- `target_route_ref`
- `target_module_code`
- `focus_anchor_ref`
- `workspace_version_at_queue`
- `request_info_ref`
- `queued_at`
- `delivered_at`
- `read_at`
- `suppressed_reason_codes[]`

Rules:

- queue and delivery decisions SHALL be revalidated against the recipient's current delegation/access
  binding and masking posture; if access has narrowed or been revoked, the notification SHALL be
  suppressed and the suppression reason recorded
- `queued_at <= delivered_at <= read_at` whenever later timestamps are present
- attachment-bearing customer notifications SHALL not claim attachment availability until every
  referenced customer-visible attachment is `AVAILABLE`
- target route, module, and focus anchor SHALL already be valid for the recipient's visibility class
  at queue time and SHALL be rechecked again at open time
- notifications SHALL additionally carry the current `queue_projection` so notification-open and
  inbox refresh reuse the same lane badge, canonical sort, and focus-lock posture as the mounted
  row and workspace
- customer notifications SHALL never target `INTERNAL_ACTIVITY`, `LINKED_CONTEXT`, or
  `AUDIT_TRAIL`; if a previously queued target becomes unavailable, the client SHALL fall back to the
  canonical `/portal/requests/{item_id}` route with an explicit context-updated explanation rather
  than exposing hidden module refs or failing open

### 7.3 Read models

#### `WorkInboxSnapshot`

The staff work inbox SHALL have its own reconnect-safe read model.

Minimum fields:

- `artifact_type = WorkInboxSnapshot`
- `tenant_id`
- `shell_family = CALM_SHELL`
- `inbox_route_key`
- `dominant_question`
- `settlement_state in {STEADY, RECEIPT_PENDING, FRESHENING, STALE_REVIEW_REQUIRED, DEGRADED_READ_ONLY, RECOVERY_REQUIRED}`
- `recovery_posture in {NONE, INLINE_RECONNECT, INLINE_REBASE, READ_ONLY_LIMITED, OBJECT_SUPERSEDED, ACCESS_REBIND_REQUIRED}`
- `interaction_layer{ mounted_content_policy, refresh_presentation, recovery_presentation,
  recovery_notice_surface, delta_promotion_mode, selector_profile,
  shell_continuity_policy, activity_partition_policy,
  investigation_presentation_policy, secondary_window_policy, notification_surface,
  artifact_preview_surface, history_presentation, motion_profile, unsafe_action_policy,
  feedback_truth_policy }`
- `active_filters{ assignee_scope, lifecycle_states[], waiting_on_actors[], due_states[],
  customer_status_projections[], selected_filter_chips[], escalation_only, include_resolved_recently }`
- `viewer_mode in {STAFF_MUTATING, STAFF_READ_ONLY}`
- `queue_health_score`
- `queue_health_contract{ contract_version, queue_scope, routing_profile_code, routing_profile_hash,
  queue_route_key, basis_hash, queue_health_score, queue_pressure_score, queue_health_floor,
  queue_health_state, intervention_recommendation_state, ordering_policy,
  focus_safe_live_update_policy, reason_codes[] }`
- `inbox_version`
- `last_published_sequence`
- `resume_token`
- `visibility_partition{ partition_scope, audience_class, allowed_visibility_classes[],
  access_binding_hash, masking_posture_fingerprint, cache_partition_key,
  badge_counter_policy, ordering_side_channel_policy, limited_state_presentation,
  export_scope_policy, fallback_discovery_policy }`
- `access_binding_hash`
- `masking_posture_fingerprint`
- `rows[]{ item_id, focus_anchor_ref, sort_key{ collaboration_priority_score, escalation_rank,
  effective_due_at, resolution_confidence_score, queue_entered_at, item_id }, queue_projection{
  projection_scope, basis_hash, routing_contract{ contract_version, routing_scope,
  routing_profile_code, routing_profile_hash, routing_queue_ref, basis_hash, canonical_sort_key{...},
  assignment_efficiency_score, ownership_confidence_score, sla_pressure_score,
  escalation_pressure_score, escalation_pressure_threshold, reassignment_gain_threshold,
  resolution_confidence_score, resolution_confidence_floor, queue_health_score,
  queue_pressure_score, queue_health_floor, queue_health_state, escalation_rank,
  collaboration_priority_score, assignment_recommendation_state, recommended_assignee_ref_or_null,
  escalation_recommendation_state, recommended_escalation_target_ref_or_null,
  recommended_action_code_or_null, focused_row_reorder_state, draft_safety_state,
  ordering_reason_codes[], recommendation_reason_codes[] }, latest_change_lane_or_null, customer_unread_count,
  internal_unread_count_or_null, customer_activity_module_badge_count,
  internal_activity_module_badge_count_or_null, canonical_sort_key{
  collaboration_priority_score, escalation_rank, effective_due_at_or_null,
  resolution_confidence_score, queue_entered_at, item_id }, focus_continuity_state,
  filter_membership_state, notification_target_module_code_or_null }, title, client_label,
  period_label, internal_lifecycle_state, customer_status_projection_or_null, assignee_label_or_null,
  waiting_on_actor, due_state_or_null, effective_due_at_or_null, last_activity_at,
  customer_unread_count, internal_unread_count, escalation_active, collaboration_priority_score,
  escalation_rank, resolution_confidence_score, sla_pressure_score, queue_entered_at,
  row_actions{ actionability_state, primary_action_code, secondary_action_codes[],
  available_action_codes[], blocked_action_codes[], available_action_bindings[]{
  action_code, mutation_precondition_binding_or_null }, authoritative_action{
  projection_scope, basis_hash, projection_route_key, projection_version,
  access_binding_hash, visibility_cache_partition_key, customer_safe_projection,
  actionability_state, primary_action_code_or_null, secondary_action_codes[],
  available_action_codes[], blocked_action_codes[], blocking_reason_code_or_null,
  machine_reason_codes[], suggested_module_code_or_null, recovery_route_ref_or_null,
  recovery_focus_anchor_ref_or_null } } }`
- `selected_item_ref`
- `selected_focus_anchor_ref_or_null`

Rules:

- every row SHALL expose a deterministic `sort_key` plus the persisted `collaboration_priority_score`,
  `resolution_confidence_score`, and `sla_pressure_score` used to derive it so browser and native
  clients render the same order for the same snapshot
- `rows[].queue_projection.routing_contract{...}` SHALL be the one persisted source for queue order,
  assignment recommendation, escalation recommendation, recommendation explanation, and draft/focus
  continuity posture; row fields, workspace action surfaces, stream events, and notifications SHALL
  mirror that contract rather than recomputing from raw counts or client-local state
- `sort_key` SHALL mirror the row's own persisted ordering fields exactly rather than recomputing
  from renderer-local clocks or badges
- `rows[].queue_projection{...}` SHALL be the shared queue-truth envelope for split lane unread
  counts, drawer badge mirrors, canonical sort basis, deferred reorder/removal posture, and
  lane-targeted notification reopening; row-local counts and live updates SHALL mirror that
  contract exactly rather than deriving queue state from delivery timing
- `queue_health_score` SHALL be derived from the frozen queue-health formula rather than from raw
  backlog size alone, and `queue_health_contract{...}` SHALL carry the persisted health score,
  intervention recommendation, and canonical ordering policy for the mounted inbox view
- `inbox_version` SHALL advance only when a route-visible row, badge, or filter-membership outcome
  changes for the requesting viewer
- `visibility_partition` SHALL freeze the staff inbox cache key, split-lane badge semantics, and
  canonical list-order side-channel policy so reconnect and live delta playback cannot widen a
  downgraded or remasked inbox from stale local state
- `selected_filter_chips[]` SHALL be an exact route-visible summary of `active_filters{...}` so the
  chip tray and the actual filter membership cannot drift apart
- every mutation-capable quick action exposed through `row_actions.available_action_codes[]` SHALL
  publish one aligned `available_action_bindings[]` entry so cached menus, reconnect recovery, and
  automation clients know the exact stale-write profile before they fire a command
- `row_actions.authoritative_action{...}` SHALL be the one legality source for row quick actions;
  the visible `primary_action_code`, visible secondary actions, blocked set, and no-safe-action
  recovery route SHALL all mirror that contract exactly
- if a focused row would reorder or leave the filter set because of a live update, the row SHALL
  remain mounted as a pending reorder/removal placeholder until focus leaves or the user completes
  the active row action
- `selected_item_ref` and `selected_focus_anchor_ref_or_null` SHALL preserve the currently
  selected row and its keyboard focus restore target across reconnect, refresh, and narrow-layout
  reflow; when no row is selected, both fields SHALL be `null`
- `interaction_layer{...}` SHALL be serialized on every `WorkInboxSnapshot` so the staff inbox
  inherits the same mounted-content preservation, inline recovery, semantic selector grammar,
  current-primary-history-secondary artifact posture, subtle motion, and fail-closed unsafe-action
  policy as the rest of the operator bucket rather than inventing route-local queue chrome
- top-level `settlement_state` and `recovery_posture` SHALL keep queue refresh, receipt-pending,
  and recovery posture explicit on the mounted inbox route instead of forcing clients to infer that
  posture from badge churn, row movement, or filter state alone
- `interaction_layer.recovery_notice_surface` and `interaction_layer.notification_surface` SHALL
  remain `CONTEXT_BAR`, and `interaction_layer.artifact_preview_surface` SHALL remain
  `DETAIL_DRAWER`
- `interaction_layer.feedback_truth_policy` SHALL remain
  `DURABLE_RECEIPT_AND_TYPED_FAILURE_DRIVEN` so inbox refresh, recovery, and settlement notices
  stay derived from durable `ApiCommandReceipt` or typed `ProblemEnvelope` truth rather than badge
  deltas or renderer-local timers
- the inbox SHALL NOT be reconstructed by the client from independently fetched workspaces because
  that would make unread counts, filter membership, and ordering nondeterministic under live change
- `resume_token` SHALL be bound to `tenant_id`, `inbox_route_key`, `active_filters`,
  `access_binding_hash`, and `masking_posture_fingerprint`

#### `WorkInboxDelta`

Minimum fields:

- `artifact_type = WorkInboxDelta`
- `tenant_id`
- `inbox_sequence`
- `delivery_class in {LIVE, CATCH_UP, SNAPSHOT}`
- `inbox_route_key`
- `inbox_version`
- `visibility_partition{ partition_scope, audience_class, allowed_visibility_classes[],
  access_binding_hash, masking_posture_fingerprint, cache_partition_key,
  badge_counter_policy, ordering_side_channel_policy, limited_state_presentation,
  export_scope_policy, fallback_discovery_policy }`
- `causal_semantic_action_id_or_null`
- `row_upserts[]{ item_id, row{...}, order_changed, defer_reorder_until_focus_exit,
  queue_projection_basis_hash }`
- `row_removals[]{ item_id, removal_cause, preserve_until_focus_exit, queue_projection_basis_hash }`
- `badge_updates[]{ item_id, basis_hash, customer_unread_count, internal_unread_count,
  customer_activity_module_badge_count, internal_activity_module_badge_count_or_null,
  latest_change_lane_or_null }`
- `occurred_at`

Rules:

- `inbox_sequence` SHALL be strictly monotonic within `(tenant_id, inbox_route_key)`
- duplicate delta delivery is legal and SHALL be idempotent by sequence number
- `visibility_partition` SHALL stay aligned with the mounted `WorkInboxSnapshot` basis so a delta
  cannot be replayed into a cache with different access binding, masking posture, or lane-count
  semantics
- row removal from the active filter set SHALL be explicit in `row_removals[]`; clients SHALL NOT
  infer disappearance from a missing upsert
- `order_changed = true` on a row upsert SHALL require `defer_reorder_until_focus_exit = true` so
  focused-row continuity remains possible in browser and native embodiments
- `removal_cause = FILTER_EXIT` SHALL require `preserve_until_focus_exit = true` so a focused row
  can remain mounted as a pending-removal placeholder until the user leaves it
- deferred `FILTER_EXIT` removal SHALL additionally serialize one overlapping `row_upserts[]`
  placeholder carrying the same `queue_projection_basis_hash` and
  `focus_continuity_state = PENDING_REMOVAL_UNTIL_FOCUS_EXIT` so reconnect and rebase preserve the
  same row until focus release
- `badge_updates[]` SHALL preserve split lane counts; a live update that changes only one visibility
  lane SHALL not overwrite the other badge through a collapsed unread total
- `row_upserts[].queue_projection_basis_hash` and `badge_updates[].basis_hash` SHALL mirror the
  upserted row `queue_projection.basis_hash` so badge, order, and focus continuity cannot mix
  generations after delayed delivery or cache hydration
- inbox deltas SHALL preserve focused-row continuity and deferred reorder semantics from the snapshot
  contract

#### `WorkspaceSnapshot`

The collaboration workspace SHALL have its own reconnect-safe read model.

Minimum fields:

- `artifact_type = WorkspaceSnapshot`
- `item_id`
- `tenant_id`
- `shell_family in {CALM_SHELL, CLIENT_PORTAL_SHELL}`
- `object_anchor_ref`
- `workspace_route_key`
- `experience_profile = LOW_NOISE`
- `viewer_scope in {STAFF_FULL, CUSTOMER_VISIBLE}`
- `dominant_question`
- `settlement_state in {STEADY, RECEIPT_PENDING, FRESHENING, STALE_REVIEW_REQUIRED, DEGRADED_READ_ONLY, RECOVERY_REQUIRED}`
- `recovery_posture in {NONE, INLINE_RECONNECT, INLINE_REBASE, READ_ONLY_LIMITED, OBJECT_SUPERSEDED, ACCESS_REBIND_REQUIRED}`
- `frame_epoch`
- `workspace_version`
- `customer_head_sequence`
- `internal_head_sequence_or_null`
- `active_request_info_ref_or_null`
- `request_state_version_or_null`
- `shell_stability_token`
- `last_published_sequence`
- `resume_token`
- `visibility_partition{ partition_scope, audience_class, allowed_visibility_classes[],
  access_binding_hash, masking_posture_fingerprint, cache_partition_key,
  badge_counter_policy, ordering_side_channel_policy, limited_state_presentation,
  export_scope_policy, fallback_discovery_policy }`
- `access_binding_hash`
- `masking_posture_fingerprint`
- `route_context{ entry_surface, active_route_ref, active_module_code, focus_anchor_ref_or_null,
  artifact_focus_bucket_or_null, artifact_focus_subject_ref_or_null,
  focus_restoration{ requested_focus_anchor_ref_or_null, resolved_focus_anchor_ref_or_null,
  restoration_disposition, restoration_reason_code_or_null }, return_route_ref,
  return_focus_anchor_ref, fallback_route_ref, fallback_focus_anchor_ref, fallback_reason_code }`
- `surface_order[]`
- `context_bar{ title, item_id, client_label, period_label, customer_status_projection, waiting_on_actor,
  due_state, freshness_state, freshness_notice_ref_or_null, recovery_notice_ref_or_null,
  internal_lifecycle_state_or_null, assignee_label_or_null, escalation_active_or_null }`
- `decision_summary{ summary_ref, next_actor, next_actor_summary_ref, due_summary_ref,
  customer_state_differs_or_null, customer_state_summary_ref_or_null, reason_codes[] }`
- `action_strip{ actionability_state, primary_action_code, secondary_action_codes[],
  available_action_codes[], blocked_action_codes[], ownership_posture, ownership_label,
  waiting_on_label, blocking_reason, machine_reason_codes[], suggested_module_code,
  authoritative_action{ projection_scope, basis_hash, projection_route_key, projection_version,
  access_binding_hash, visibility_cache_partition_key, customer_safe_projection,
  actionability_state, primary_action_code_or_null, secondary_action_codes[],
  available_action_codes[], blocked_action_codes[], blocking_reason_code_or_null,
  machine_reason_codes[], suggested_module_code_or_null, recovery_route_ref_or_null,
  recovery_focus_anchor_ref_or_null }, primary_action{ mutation_precondition_binding_or_null }, secondary_actions[]{
  mutation_precondition_binding_or_null } }`
- `detail_drawer{ modules[], promoted_module_code_or_null, expanded_module_code, focus_anchor_ref,
  fallback_reason_code }`
- `queue_projection{ projection_scope, basis_hash, latest_change_lane_or_null,
  customer_unread_count, internal_unread_count_or_null,
  customer_activity_module_badge_count, internal_activity_module_badge_count_or_null,
  canonical_sort_key{ collaboration_priority_score, escalation_rank,
  effective_due_at_or_null, resolution_confidence_score, queue_entered_at, item_id },
  focus_continuity_state, filter_membership_state, notification_target_module_code_or_null }`
- `permissions{...}`
- `participants[]`
- `customer_request_workspace{ surface_order[], status_code, status_label_ref, due_label_ref_or_null,
  action_order[], visible_action_codes[], primary_action_label_ref_or_null,
  no_safe_action_reason_ref_or_null, authoritative_action{ projection_scope, basis_hash,
  projection_route_key, projection_version, access_binding_hash,
  visibility_cache_partition_key, customer_safe_projection, actionability_state,
  primary_action_code_or_null, secondary_action_codes[], available_action_codes[],
  blocked_action_codes[], blocking_reason_code_or_null, machine_reason_codes[],
  suggested_module_code_or_null, recovery_route_ref_or_null,
  recovery_focus_anchor_ref_or_null }, artifact_history_state, current_artifact_ref_or_null,
  historical_artifact_refs[], artifact_selection{ selection_scope, presentation_mode,
  primary_subject_refs[], authoritative_subject_refs[], historical_subject_refs[],
  limited_history_state, limited_history_count_or_null, default_preview_target_ref_or_null,
  default_download_target_ref_or_null, default_print_target_ref_or_null } }` or `null`

Allowed drawer module codes are:

- `CUSTOMER_ACTIVITY`
- `INTERNAL_ACTIVITY`
- `FILES`
- `LINKED_CONTEXT`
- `AUDIT_TRAIL`

Rules:

- staff routes MAY mount all five modules
- customer routes SHALL mount only `CUSTOMER_ACTIVITY` and `FILES`
- the shell SHALL preserve the same low-noise budgets: one primary action, bounded reasons, and one expanded module by default
- `shell_family` SHALL be `CALM_SHELL` when `viewer_scope = STAFF_FULL` and
  `CLIENT_PORTAL_SHELL` when `viewer_scope = CUSTOMER_VISIBLE`; the audience scope changes visible
  capability, not the governing object anchor
- `object_anchor_ref` SHALL stay equal to the mounted `item_id` so refresh, reconnect, rebase,
  notification deep-link entry, browser back, and native relaunch all preserve the same work-item
  identity rather than re-opening a generic queue, tab, or dashboard shell
- `dominant_question` SHALL freeze the one question the mounted workspace is answering for the
  current viewer scope
- `settlement_state` SHALL keep async freshness, receipt-pending, and recovery posture visible
  without replacing the mounted shell
- any non-`NONE` `recovery_posture` SHALL fail closed for mutation-capable collaboration actions
  until a fresh safe snapshot is mounted
- every mutation-capable action in the mounted action strip SHALL carry a non-null
  `mutation_precondition_binding_or_null`; non-mutation affordances such as refresh, investigate,
  compare, export, or request-review SHALL clear that field
- `interaction_layer{ mounted_content_policy, refresh_presentation, recovery_presentation,
  recovery_notice_surface, delta_promotion_mode, selector_profile,
  shell_continuity_policy, activity_partition_policy,
  investigation_presentation_policy, secondary_window_policy, notification_surface,
  artifact_preview_surface, history_presentation, motion_profile, unsafe_action_policy,
  feedback_truth_policy }` SHALL be
  serialized on every `WorkspaceSnapshot` so stale/rebase recovery, inline refresh, low-noise
  delta playback, selector grammar, visibility-scoped collaboration lanes, summary-first
  investigation posture, native support-window discipline, notification mounting, preview
  embodiment, and current-vs-history separation do not depend on route-local heuristics
- `surface_order[]` SHALL always serialize `CONTEXT_BAR`, `DECISION_SUMMARY`, `ACTION_STRIP`, and
  `DETAIL_DRAWER` in that order so reconnect, resize, and native/browser embodiments share one shell
  contract
- `workspace_version` in the snapshot SHALL always be the route-visible version for the requesting
  principal: `staff_workspace_version` for staff routes and `customer_workspace_version` for
  customer routes
- `queue_projection{...}` SHALL mirror the current `CUSTOMER_ACTIVITY` and
  `INTERNAL_ACTIVITY` drawer badge counts plus the canonical inbox sort basis for the mounted item,
  so workspaces, inbox rows, and notification-open recovery reuse one backend-authored queue truth
  instead of inferring badge or reorder posture from arrival order
- `customer_head_sequence`, `internal_head_sequence_or_null`, `active_request_info_ref_or_null`,
  and `request_state_version_or_null` SHALL surface the exact visibility-scoped compare set needed
  for mutation guards; customer routes SHALL serialize `internal_head_sequence_or_null = null`
- `visibility_partition` SHALL freeze the audience class, visible-lane set, access binding, masking
  posture, cache partition key, badge semantics, ordering-side-channel policy, export scope, and
  cross-partition fallback ban for the mounted route so customer-visible hydration never depends on
  client-side concealment alone
- `shell_stability_token` SHALL be derived from the visibility-scoped guard vector
  `(workspace_version, customer_head_sequence, internal_head_sequence_or_null,
  active_request_info_ref_or_null, request_state_version_or_null, access_binding_hash,
  masking_posture_fingerprint)` rather than from a generic remount token
- `resume_token` SHALL be bound to `tenant_id`, `item_id`, `viewer_scope`, `access_binding_hash`,
  and `masking_posture_fingerprint`; any change SHALL force reattachment from a fresh snapshot
- `route_context.active_route_ref` SHALL stay `/work/items/{item_id}` for staff routes and
  `/portal/requests/{item_id}` for customer routes so the same work item is not remounted through
  duplicate detail grammars
- `route_context.active_module_code` and `route_context.focus_anchor_ref_or_null` SHALL mirror the
  mounted drawer module and live focus anchor so deep links, notifications, refresh, and responsive
  redraw reuse one explicit route state instead of reconstructing it from transient UI state
- `route_context.artifact_focus_bucket_or_null` and `route_context.artifact_focus_subject_ref_or_null`
  SHALL remain explicit whenever the active route is focused on the current artifact, labeled
  history, or a limited-history notice inside `FILES`; outside that posture they SHALL clear so the
  shell never guesses preview or download targets from whichever row happened to render first
- `route_context.focus_restoration` SHALL publish the requested focus anchor, the anchor actually
  restored now, one explicit restoration disposition, and one explicit recovery reason whenever
  exact focus cannot be reopened after deep-link entry, refresh, reconnect, notification-open,
  responsive collapse, or native scene restoration
- `cross_device_continuity_contract{ continuity_scope, canonical_object_ref, route_identity_ref,
  parent_context_ref_or_null, focus_anchor_ref_or_null, return_focus_anchor_ref_or_null,
  dominant_action_state_or_null, stability_guard_hash_or_null, access_scope_hash_or_null,
  masking_scope_fingerprint_or_null, visibility_cache_partition_key_or_null,
  compatibility_basis_class, allowed_embodiments[], ... }` SHALL bind the mounted work item to one
  grouped same-object continuity basis so browser, narrow, notification-open, and native shells
  cannot reopen the same `item_id` with a different shell family, broader visibility cache, or
  stale action posture
- `route_context.return_route_ref` and `route_context.return_focus_anchor_ref` SHALL carry the
  exact parent route and focus target to restore after close, back, notification handoff, or stale
  rebase recovery; that contract SHALL remain explicit even for direct links so governed in-app
  return behavior never falls back to browser-history guesswork
- `route_context.fallback_route_ref` and `route_context.fallback_focus_anchor_ref` SHALL stay bound
  to the same lawful parent target as `return_route_ref` / `return_focus_anchor_ref`, and
  `route_context.fallback_reason_code` SHALL remain explicit so if the focused work item can no
  longer be reopened the shell returns to the narrowest surviving governed parent target instead of
  a generic home or dashboard surface
- `context_bar.freshness_state` SHALL remain an explicit bounded state, and customer-visible routes
  SHALL serialize `internal_lifecycle_state = null`, `assignee_label = null`, and
  `escalation_active = null` rather than leaking internal posture into a hidden branch
- `context_bar.freshness_notice_ref_or_null` SHALL be non-null whenever freshness is anything other
  than `FRESH`, and `context_bar.recovery_notice_ref_or_null` SHALL be non-null whenever settlement
  or recovery posture requires reconnect, rebase, stale review, or read-only recovery messaging
- `interaction_layer.recovery_notice_surface` and `interaction_layer.notification_surface` SHALL
  remain `CONTEXT_BAR`, `interaction_layer.artifact_preview_surface` SHALL remain `DETAIL_DRAWER`,
  and `interaction_layer.history_presentation` SHALL remain
  `CURRENT_PRIMARY_HISTORY_SECONDARY` so collaboration routes keep mounted current artifacts ahead
  of history, superseded files, or low-noise notifications
- `interaction_layer.selector_profile` SHALL remain `OPERATOR_SEMANTIC_SELECTORS_V1`,
  `interaction_layer.shell_continuity_policy` SHALL remain
  `SAME_OBJECT_SAME_SHELL_INLINE_RECOVERY`, `interaction_layer.activity_partition_policy` SHALL
  remain `VISIBILITY_SCOPED_LANES_WITH_CURRENT_FIRST_ARTIFACTS`, and
  `interaction_layer.investigation_presentation_policy` SHALL remain
  `SUMMARY_FIRST_PLAIN_LANGUAGE_MODULES` so collaboration routes do not invent blended activity
  lanes, renderer-local selectors, or raw-detail-first drawer behavior
- `interaction_layer.feedback_truth_policy` SHALL remain
  `DURABLE_RECEIPT_AND_TYPED_FAILURE_DRIVEN` so mounted recovery and settlement cues use durable
  receipt/problem truth, including typed stale-guard echoes when present, instead of workspace-only
  heuristics
- `decision_summary.customer_state_differs` SHALL be populated only for staff routes; customer
  routes SHALL serialize it as `null`
- `decision_summary.next_actor_summary_ref` and `due_summary_ref` SHALL always be explicit,
  bounded refs; `customer_state_summary_ref` SHALL be populated only for staff routes when
  `customer_state_differs = true`, and SHALL otherwise serialize `null`
- `action_strip` SHALL never rely on `primary_action_code = null` alone to imply waiting or blocked
  posture; `actionability_state`, `blocking_reason`, `machine_reason_codes[]`, and
  `suggested_module_code` SHALL make `NO_SAFE_ACTION` explicit
- `action_strip.authoritative_action{...}` SHALL be the one backend-authored legality basis for the
  mounted workspace; the visible action strip SHALL mirror it exactly, and `NO_SAFE_ACTION` SHALL
  additionally publish one recovery route plus focus anchor so stale/rebased shells do not improvise
  their own fallback CTA
- when `actionability_state = ACTION_AVAILABLE`, the primary action SHALL appear in
  `available_action_codes[]` and SHALL NOT appear in `blocked_action_codes[]`
- visible staff actions SHALL stay permission-backed: assign/reassign actions require
  `permissions.can_assign`, escalation requires `permissions.can_escalate`, request-for-info
  requires `permissions.can_publish_request_info`, customer-reply actions require
  `permissions.can_reply_customer_visible`, internal notes require `permissions.can_add_internal_note`,
  and status-progress / resolve actions require `permissions.can_change_status`
- any non-`NONE` `recovery_posture`, stale/degraded freshness, or read-only settlement posture
  SHALL fail closed to `NO_SAFE_ACTION`; the workspace SHALL not leave a writable-looking action
  strip mounted while the summary says the shell must reconnect, rebase, or review stale truth
- `suggested_module_code`, when present, SHALL reference a mounted drawer module and SHALL never
  point customer-visible routes at `INTERNAL_ACTIVITY`, `LINKED_CONTEXT`, or `AUDIT_TRAIL`
- every `detail_drawer.modules[]` entry SHALL expose `content_state in {POPULATED, NOT_REQUESTED,
  NOT_YET_MATERIALIZED, LIMITED, NOT_APPLICABLE}`, typed
  `state_reason_code_or_null` for non-limited non-populated states, optional
  `limitation_reason_codes[]`, and optional `placeholder_refs[]`
- any `LIMITED` module SHALL retain at least one `limitation_reason_codes[]` value so masked or
  policy-hidden content remains explicit rather than collapsing into generic emptiness
- any non-populated module SHALL retain `placeholder_refs[]`, and `WorkspaceSnapshot` SHALL mirror
  the promoted shell-level taxonomy through `state_taxonomy_contract` rather than forcing clients to
  infer whether the drawer is not requested, not yet materialized, limited, or not applicable
- `WorkspaceSnapshot.semantic_accessibility_contract` SHALL additionally freeze the workspace's
  domain anchor set, focus order, live-update announcement kinds, and browser/native identifier
  parity so customer-visible and staff-visible collaboration routes do not drift semantically
- `WorkspaceSnapshot` SHALL additionally participate in `semantic_accessibility_regression_pack`
  cases that prove collaboration keyboard traversal, screen-reader traversal, polite activity
  announcements, reconnect recovery notices, reduced-motion parity, and lawful return-path anchors
  against the frozen workspace selector inventory
- masked content, retention-limited content, quarantined attachments, and policy-hidden linked
  context SHALL render through the low-noise limitation taxonomy rather than disappearing silently
- customer routes SHALL treat staff-only modules as `NOT_APPLICABLE` or omit them entirely by route
  policy; they SHALL NOT remap staff-only modules into generic empty states
- `context_bar.item_id` and every `participants[].item_id` SHALL mirror the snapshot `item_id`, and
  customer-visible snapshots SHALL expose only customer participants with customer read posture
- file and attachment modules SHALL present the current upload or download target before historical,
  quarantined, rejected, or superseded attachments so the handoff target remains unambiguous
- customer-visible snapshots SHALL additionally publish one machine-readable
  `customer_request_workspace{...}` block rather than forcing renderers to derive customer-safe status
  wording, due-label presence, visible action ordering, `NO_SAFE_ACTION` explanation, or
  current-versus-history artifact posture from staff-first fields
- `customer_request_workspace.action_order[]` SHALL remain
  `[REPLY, UPLOAD_FILE, RESPOND_TO_REQUEST_INFO]`; `visible_action_codes[]` SHALL be a subset of that
  order, and `primary_action_label_ref_or_null` SHALL remain explicit whenever a customer-safe action is available
- `customer_request_workspace.authoritative_action{...}` SHALL mirror the customer-visible subset of
  the mounted `action_strip.authoritative_action{...}` exactly; detail CTA copy MAY differ by
  surface, but legality, blocked-state reasoning, and no-safe-action recovery targets SHALL NOT drift
- `customer_request_workspace.artifact_history_state` SHALL remain explicit and SHALL align with the `FILES`
  module's current-versus-history shared file refs so the detail route never guesses which artifact is current
- `customer_request_workspace.artifact_selection` SHALL mirror that same current-versus-history
  partition plus the default preview/download target so masked or historical files cannot become the
  implicit current handoff path

#### `CustomerRequestListSnapshot`

The customer queue SHALL have its own reconnect-safe list read model.

Minimum fields:

- `artifact_type = CustomerRequestListSnapshot`
- `tenant_id`
- `client_id`
- `shell_family = CLIENT_PORTAL_SHELL`
- `request_list_route_key`
- `object_anchor_ref`
- `dominant_question`
- `settlement_state in {STEADY, RECEIPT_PENDING, FRESHENING, STALE_REVIEW_REQUIRED, DEGRADED_READ_ONLY, RECOVERY_REQUIRED}`
- `recovery_posture in {NONE, INLINE_RECONNECT, INLINE_REBASE, READ_ONLY_LIMITED, OBJECT_SUPERSEDED, ACCESS_REBIND_REQUIRED}`
- `interaction_layer{ navigation_model, spacing_profile, status_language_profile, selector_profile,
  support_region_policy, route_continuity_policy, focus_restoration_policy,
  artifact_hierarchy_policy, responsive_detail_policy, motion_profile, feedback_truth_policy }`
- `row_band_order[]`
- `queue_group_order[]`
- `active_filters{ status_codes[], due_states[], unread_only, files_requested_only }`
- `list_version`
- `last_published_sequence`
- `resume_token`
- `visibility_partition{ partition_scope, audience_class, allowed_visibility_classes[],
  access_binding_hash, masking_posture_fingerprint, cache_partition_key,
  badge_counter_policy, ordering_side_channel_policy, limited_state_presentation,
  export_scope_policy, fallback_discovery_policy }`
- `access_binding_hash`
- `masking_posture_fingerprint`
- `rows[]{ item_id, focus_anchor_ref, title, status_code, status_label_ref, due_state,
  due_at_or_null, due_label_ref_or_null, unread_count, last_staff_update_at_or_null,
  files_requested, primary_action_code_or_null, primary_action_label_ref_or_null,
  no_safe_action_reason_ref_or_null, authoritative_action{ projection_scope, basis_hash,
  projection_route_key, projection_version, access_binding_hash,
  visibility_cache_partition_key, customer_safe_projection, actionability_state,
  primary_action_code_or_null, secondary_action_codes[], available_action_codes[],
  blocked_action_codes[], blocking_reason_code_or_null, machine_reason_codes[],
  suggested_module_code_or_null, recovery_route_ref_or_null,
  recovery_focus_anchor_ref_or_null }, artifact_history_state, current_artifact_ref_or_null,
  historical_artifact_refs[] }`
- `selected_item_ref_or_null`
- `selected_focus_anchor_ref_or_null`
- `updated_at`

Rules:

- `row_band_order[]` SHALL remain exactly
  `[REQUEST_IDENTITY, STATUS_AND_DUE, REQUEST_ACTION]`
- `queue_group_order[]` SHALL remain exactly
  `[ACTION_REQUIRED, IN_REVIEW, WAITING_ON_US, WAITING_ON_AUTHORITY, COMPLETED]`
- rows SHALL appear in non-decreasing queue-group order, with due-state urgency refining order only inside the
  same status family
- row action posture SHALL remain customer-safe and bounded to `REPLY`, `UPLOAD_FILE`,
  `RESPOND_TO_REQUEST_INFO`, or explicit `NO_SAFE_ACTION`
- every customer request row SHALL publish `authoritative_action{...}` so list rows, contextual
  detail routes, and notification-open recovery share one backend-authored CTA legality basis
- if a row has no safe action, it SHALL keep `primary_action_code_or_null = null`,
  `primary_action_label_ref_or_null = null`, and a non-empty `no_safe_action_reason_ref_or_null`
- row due posture SHALL remain explicit: `due_state = NONE` SHALL clear due date/label, and any other due state
  SHALL retain at least one customer-safe due label
- row artifact history posture SHALL remain explicit and SHALL prevent current, historical, superseded, masked,
  or unavailable shared files from collapsing into one unlabeled file indicator
- `interaction_layer{...}` SHALL remain identical to the shared portal-shell interaction contract so
  request-list spacing, selector grammar, same-shell contextual return, current-primary-history-secondary
  artifact treatment, stacked responsive detail, and subtle motion stay aligned with the rest of
  the portal
- top-level `settlement_state` and `recovery_posture` SHALL keep route-visible freshness and
  recovery posture explicit on `/portal/requests` instead of collapsing that state into row-group
  labels or list-local empty/loading chrome
- `interaction_layer.feedback_truth_policy` SHALL remain
  `DURABLE_RECEIPT_AND_TYPED_FAILURE_DRIVEN` so request-list recovery and no-safe-action messaging
  stays aligned with durable portal receipt/problem truth rather than route-local approximation
- `rows[].focus_anchor_ref` and `selected_focus_anchor_ref_or_null` SHALL remain the lawful
  parent-route anchors that `ClientPortalWorkspace.route_context.return_focus_anchor_ref_or_null`
  restores after a contextual request-detail close, back action, resize, or recovery fallback
- customer request-list payloads SHALL stay customer-safe and SHALL NOT serialize internal assignee controls,
  escalation posture, audit refs, or internal lifecycle labels
- customer-visible collaboration detail, customer request-list rows, and customer-visible
  notifications SHALL mirror one aligned `customer_safe_projection` contract keyed to the same
  access-binding hash, masking posture fingerprint, and customer-safe cache partition basis so
  status, action, limitation, recovery, and timeline language cannot be re-derived from internal
  assignment, escalation, gate, audit, or staff-route-context fields
- `visibility_partition` SHALL keep customer request-list caches bound to one customer-safe
  audience/masking basis so hidden internal churn cannot perturb unread counts, ordering, or
  fallback discovery in `/portal/requests`

#### `WorkspaceDelta`

Minimum fields:

- `item_id`
- `workspace_sequence`
- `frame_epoch`
- `delivery_class in {LIVE, CATCH_UP, SNAPSHOT}`
- `workspace_route_key`
- `viewer_scope in {STAFF_FULL, CUSTOMER_VISIBLE}`
- `workspace_version`
- `shell_stability_token`
- `access_binding_hash`
- `causal_semantic_action_id`
- `affected_surface_codes[]`
- `affected_module_codes[]`
- `surface_updates[]`
- `occurred_at`

Rules:

- `workspace_sequence` SHALL be strictly monotonic within `(item_id, frame_epoch)`
- duplicate delta delivery is legal and SHALL be idempotent by sequence number
- the collaboration route SHALL preserve `focus_anchor_ref`, unread counts, and draft text across non-conflicting updates
- `workspace_version` in a delta SHALL follow the same route-visible scope rule as the snapshot
- internal-only changes SHALL not be emitted as customer-route version bumps or stale-view triggers
- a delta that changes only module limitation posture, scan posture, or retention placeholder state
  SHALL preserve existing focus anchors and update only the affected module state rather than
  remounting the whole shell

#### `CollaborationActivitySlice`

The activity-read surface SHALL have its own visibility-scoped paging contract.

Minimum fields:

- `artifact_type = CollaborationActivitySlice`
- `item_id`
- `workspace_route_key`
- `viewer_scope in {STAFF_FULL, CUSTOMER_VISIBLE}`
- `thread_visibility_class in {CUSTOMER_VISIBLE, INTERNAL_ONLY}`
- `workspace_version`
- `shell_stability_token`
- `visibility_partition{ partition_scope, audience_class, allowed_visibility_classes[],
  access_binding_hash, masking_posture_fingerprint, cache_partition_key,
  badge_counter_policy, ordering_side_channel_policy, limited_state_presentation,
  export_scope_policy, fallback_discovery_policy }`
- `access_binding_hash`
- `masking_posture_fingerprint`
- `customer_safe_projection` or `null`
- `active_filters{ thread_visibility_class, request_info_ref_or_null, include_system_entries, before_sequence_or_null }`
- `head_sequence`
- `newest_returned_sequence_or_null`
- `oldest_returned_sequence_or_null`
- `next_before_sequence_or_null`
- `has_more_before`
- `focus_anchor_ref_or_null`
- `entry_refs[]`
- `latest_workspace_snapshot_ref`
- `returned_at`

Rules:

- customer routes SHALL only receive `thread_visibility_class = CUSTOMER_VISIBLE`
- internal-lane activity reads SHALL remain staff-only even when the same item also has a
  customer-visible workspace route
- `active_filters.thread_visibility_class` SHALL mirror the top-level
  `thread_visibility_class` exactly so route state and payload state cannot drift
- activity paging SHALL preserve the same route-visible guard spine as the mounted workspace:
  `workspace_route_key`, `workspace_version`, `shell_stability_token`, `access_binding_hash`, and
  `masking_posture_fingerprint`
- `visibility_partition.allowed_visibility_classes[]` SHALL match the returned thread exactly so a
  customer-visible or staff-internal activity slice cannot be cached under the wrong lane key
- customer-visible activity reads SHALL additionally publish one aligned
  `customer_safe_projection` contract pinned to
  `boundary_scope = COLLABORATION_ACTIVITY_SLICE`; staff activity reads SHALL clear it
- `latest_workspace_snapshot_ref` SHALL remain explicit so a stale paged activity pane can rebase
  against the mounted collaboration shell without guessing a new route target
- empty slices SHALL clear the returned sequence range and the next-backward cursor rather than
  leaving stale paging state mounted after reconnect or filter change

#### `CollaborationAttachmentSlice`

The attachment-read surface SHALL have its own visibility-scoped list contract.

Minimum fields:

- `artifact_type = CollaborationAttachmentSlice`
- `item_id`
- `workspace_route_key`
- `viewer_scope in {STAFF_FULL, CUSTOMER_VISIBLE}`
- `visibility_class in {CUSTOMER_VISIBLE, INTERNAL_ONLY}`
- `workspace_version`
- `shell_stability_token`
- `visibility_partition{ partition_scope, audience_class, allowed_visibility_classes[],
  access_binding_hash, masking_posture_fingerprint, cache_partition_key,
  badge_counter_policy, ordering_side_channel_policy, limited_state_presentation,
  export_scope_policy, fallback_discovery_policy }`
- `access_binding_hash`
- `masking_posture_fingerprint`
- `customer_safe_projection` or `null`
- `active_filters{ visibility_class, request_info_ref_or_null, include_history, include_pending_placeholders }`
- `focus_anchor_ref_or_null`
- `current_attachment_refs[]`
- `historical_attachment_refs[]`
- `artifact_selection{ selection_scope, presentation_mode, primary_subject_refs[],
  authoritative_subject_refs[], historical_subject_refs[], limited_history_state,
  limited_history_count_or_null, default_preview_target_ref_or_null,
  default_download_target_ref_or_null, default_print_target_ref_or_null }`
- `artifact_affordance{ affordance_scope, primary_subject_role, visible_primary_subject_ref_or_null,
  header_posture, history_affordance_state, preview_open_policy,
  default_preview_target_ref_or_null, default_download_target_ref_or_null,
  default_print_target_ref_or_null }`
- `latest_workspace_snapshot_ref`
- `returned_at`

Rules:

- customer routes SHALL only receive `visibility_class = CUSTOMER_VISIBLE`
- internal-only attachment reads SHALL remain staff-only even when the same item also has
  customer-visible shared files
- `active_filters.visibility_class` SHALL mirror the top-level `visibility_class` exactly so a
  filter-chip change cannot silently remount the user onto a different file lane
- attachment reads SHALL preserve the same route-visible guard spine as the mounted workspace:
  `workspace_route_key`, `workspace_version`, `shell_stability_token`, `access_binding_hash`, and
  `masking_posture_fingerprint`
- `visibility_partition.allowed_visibility_classes[]` SHALL match the returned attachment lane so
  exports, previews, downloads, and reconnect recovery cannot widen from a customer-safe slice into
  an internal-only cache entry
- customer-visible attachment reads SHALL additionally publish one aligned
  `customer_safe_projection` contract pinned to
  `boundary_scope = COLLABORATION_ATTACHMENT_SLICE`; staff attachment reads SHALL clear it
- `current_attachment_refs[]` and `historical_attachment_refs[]` SHALL remain explicitly separated
  so inline refresh cannot blend the current handoff file with superseded or historical files
- when `include_history = false`, the read side SHALL clear `historical_attachment_refs[]` rather
  than leaving stale history refs mounted after reconnect or filter change
- customer-visible attachment reads SHALL keep `include_pending_placeholders = false` so internal
  or staff-only draft placeholders cannot influence customer-safe preview, current-vs-history
  posture, or summary copy
- `artifact_selection.primary_subject_refs[]`, `authoritative_subject_refs[]`, and
  `historical_subject_refs[]` SHALL mirror those same partitions so preview/download defaults stay
  explicit even when the client restores from cached route state
- `artifact_selection.default_preview_target_ref_or_null` and
  `default_download_target_ref_or_null` SHALL resolve only to the current authoritative attachment
  when one exists, and `default_print_target_ref_or_null` SHALL remain `null` for collaboration
  attachment reads so file-open, export, and print affordances cannot drift into historical or
  unsupported targets during reconnect or responsive redraw
- `artifact_affordance.visible_primary_subject_ref_or_null`, `header_posture`, and
  `default_preview_target_ref_or_null` SHALL mirror that same current-versus-history split so the
  mounted header and invoked file target cannot diverge under reconnect, filter change, or
  historical reopen

## 8. Command and read API additions

### 8.1 Read surfaces

The product SHALL add the following read surfaces:

- `GET /v1/work-items?assignee=...&lifecycle_state=...&waiting_on=...&due_state=...&customer_projection=...`
- `GET /v1/work-items/stream?resume_token=...`
- `GET /v1/work-items/{item_id}/workspace/snapshot`
- `GET /v1/work-items/{item_id}/workspace/stream?resume_token=...`
- `GET /v1/work-items/{item_id}/activity?thread=customer|internal&before_sequence=...`
- `GET /v1/work-items/{item_id}/attachments?visibility=customer|internal`
- `GET /v1/work-items/{item_id}/audit-trail`

Rules:

- all read responses SHALL remain scope-aware and visibility-aware
- customer routes SHALL never receive internal thread metadata, internal unread counts, internal file refs, or internal audit refs
- the inbox list response SHALL serialize a `WorkInboxSnapshot`, not a bare array
- `GET /v1/work-items/{item_id}/activity` SHALL serialize a `CollaborationActivitySlice`, not a
  bare array of entries
- `GET /v1/work-items/{item_id}/attachments` SHALL serialize a `CollaborationAttachmentSlice`, not
  a bare array of files
- bare `status` as a machine field or query parameter is forbidden on collaboration surfaces because
  it is ambiguous between authoritative lifecycle and customer projection
- snapshot responses SHALL include `ETag = workspace_version`
- activity and attachment reads SHALL preserve the mounted workspace guard spine plus explicit
  `active_filters` and `latest_workspace_snapshot_ref` so inline updates and backward paging do not
  reconstruct visibility or current-vs-history posture locally
- snapshot, stream-attach, and file-download surfaces SHALL re-evaluate current delegation/access
  binding and masking posture before serving data; if access is no longer valid, the server SHALL
  fail closed instead of honoring a previously issued resume token or file ref

### 8.2 Upload staging

Binary upload staging SHALL use the governed `/v1/uploads/sessions` family, preserving the same
durable upload-session semantics used elsewhere in the product even when the attachment is bound to a
collaboration workspace.

Publication into a workspace thread SHALL occur only through an accepted command that references
staged `upload_session_id`s.

Rules:

- upload-session allocation SHALL freeze `item_id`, `visibility_class`, optional `request_info_ref`,
  and the allocating session/access binding so staged bytes cannot be replayed into a different
  collaboration lane
- publication SHALL be rejected unless every referenced upload session is already bound to the same
  `item_id`, `visibility_class`, and when applicable the same `request_info_ref`
- the resulting `CollaborationAttachment` SHALL persist the exact `upload_session_id` used for
  publication so attachment provenance never depends on transient command logs alone
- staged upload IDs SHALL remain non-downloadable until malware scanning and publish-time visibility
  validation both succeed
- customer-visible publication MAY create a pending placeholder while scan is incomplete, but it
  SHALL NOT expose a downloadable link or claim final availability until the attachment becomes
  `AVAILABLE`
- `QUARANTINED`, failed-validation, or scope-mismatched upload sessions SHALL be rejected for
  publication and SHALL surface as typed unavailable placeholders or typed errors rather than
  disappearing silently

### 8.3 Command additions

Collaboration commands SHALL continue to use `POST /v1/commands`.

The following command types are required:

- `ASSIGN_WORK_ITEM`
  - payload: `item_id`, `assignee_ref`, optional `assignment_note`, optional `queue_ref`
  - guards: `if_match_work_item_version`, `if_match_shell_stability_token`
- `REASSIGN_WORK_ITEM`
  - payload: `item_id`, `assignee_ref`, optional `reason_code`, optional `assignment_note`
  - guards: `if_match_work_item_version`, `if_match_shell_stability_token`
- `ESCALATE_WORK_ITEM`
  - payload: `item_id`, `target_ref`, `reason_code`, `transfer_ownership`, optional `due_at`, optional `note_body`
  - guards: `if_match_work_item_version`, `if_match_shell_stability_token`
- `ADD_INTERNAL_NOTE`
  - payload: `item_id`, `body`, optional `attachment_upload_ids[]`
  - guards: `if_match_work_item_version`, `if_match_internal_head_sequence`, `if_match_shell_stability_token`
- `ADD_CUSTOMER_COMMENT`
  - payload: `item_id`, `body`, optional `attachment_upload_ids[]`
  - guards: `if_match_work_item_version`, `if_match_customer_head_sequence`, `if_match_shell_stability_token`
- `REQUEST_CUSTOMER_INFO`
  - payload: `item_id`, `question_body`, optional `customer_due_at`, optional `attachment_upload_ids[]`, optional `reason_codes[]`
  - guards: `if_match_work_item_version`, `if_match_customer_head_sequence`, `if_match_shell_stability_token`
- `RESPOND_TO_REQUEST_INFO`
  - payload: `item_id`, `request_info_ref`, `body`, optional `attachment_upload_ids[]`
  - guards: `if_match_work_item_version`, `if_match_customer_head_sequence`, `if_match_request_state_version`, `if_match_shell_stability_token`
- `CHANGE_WORK_ITEM_STATUS`
  - payload: `item_id`, `new_lifecycle_state`, optional `reason_code`, optional `customer_message`
  - guards: `if_match_work_item_version`, `if_match_shell_stability_token`
- `SET_WORK_ITEM_DUE_DATES`
  - payload: `item_id`, optional `sla_due_at`, optional `customer_due_at`, optional `reason_code`
  - guards: `if_match_work_item_version`, `if_match_shell_stability_token`

Rules:

- every accepted collaboration command SHALL return a durable `ApiCommandReceipt`
- every collaboration command SHALL declare one `mutation_precondition_binding` whose
  `required_guard_fields[]` exactly match the guard bundle listed above for that command family; the
  backend SHALL reject omitted, mixed-family, or visibility-misaligned guard sets even if a button
  remained visible in cached UI state
- `ADD_CUSTOMER_COMMENT`, `REQUEST_CUSTOMER_INFO`, and `RESPOND_TO_REQUEST_INFO` SHALL be rejected on `INTERNAL_ONLY` items
- `CHANGE_WORK_ITEM_STATUS` SHALL validate the current authoritative lifecycle state before accept
- accepted `REQUEST_CUSTOMER_INFO` receipts SHALL identify the allocated `request_info_ref` and
  `request_info_ordinal`
- `RESPOND_TO_REQUEST_INFO` SHALL be rejected unless the targeted `request_info_ref` is currently
  open and visible to the caller
- `if_match_work_item_version` SHALL be evaluated against the route-visible version for the caller,
  not against hidden state from a broader audience scope
- a command MAY create both an activity entry and a system projection change, but SHALL result in
  one accepted receipt and one ordered semantic action family keyed by `semantic_action_id`

### 8.4 Stale-view and concurrency rules

The collaboration workspace SHALL reuse the stale-view principles from the northbound API contract.

Additional rules:

- all commands that change assignment, escalation, due dates, or lifecycle state SHALL require `if_match_work_item_version`
- thread append commands SHALL additionally require the correct thread-head sequence guard
- `RESPOND_TO_REQUEST_INFO` SHALL additionally require `if_match_request_state_version` for the
  exact targeted `request_info_ref` so already-answered or superseded requests cannot receive a late
  reply by race
- the collaboration guard vector for staff-visible commands SHALL be `(staff_workspace_version,
  customer_head_sequence, internal_head_sequence, active_request_info_ref or null,
  request_state_version or 0, access_binding_hash, masking_posture_fingerprint)`
- the collaboration guard vector for customer-visible commands SHALL be `(customer_workspace_version,
  customer_head_sequence, active_request_info_ref or null, request_state_version or 0,
  access_binding_hash, masking_posture_fingerprint)`
- on `409 VIEW_STALE`, the response SHALL include the latest workspace snapshot ref and a fresh resume token
- `VIEW_STALE` SHALL be reserved for true conflicts inside the caller's visible concurrency scope;
  hidden internal-only changes SHALL not force customer routes to rebase by themselves
- if access binding, delegation, or masking posture has changed, reattach SHALL fail with the
  corresponding auth/scope error rather than masquerading as ordinary stale view
- the client SHALL preserve unsent draft text locally across rebase, but SHALL NOT auto-resubmit it
- duplicate safe retries SHALL replay the original receipt, `semantic_action_id`, activity refs,
  notification refs, and audit refs and SHALL NOT produce duplicate side effects

## 9. Stream events and notifications

### 9.1 SSE event types

The workspace stream SHALL emit, at minimum:

- `workspace.snapshot`
- `workspace.delta`
- `activity.appended`
- `audit.appended`
- `notification.badge`
- `heartbeat`

Rules:

- `workspace.snapshot` is the rebase and first-load envelope
- `workspace.delta` carries low-noise surface updates for summary, action strip, badges, and drawer module state while preserving the same item shell and fail-closed recovery posture during rebase or limited-read states
- every `WorkspaceStreamEvent` SHALL carry the same `shell_family` and `object_anchor_ref` as the
  mounted snapshot so catch-up or rebase never leaves the client guessing which shell owns the
  current work-item stream
- every `WorkspaceStreamEvent` SHALL additionally carry `masking_posture_fingerprint` plus one
  aligned `visibility_partition` contract so stream hydration cannot cross audience, masking, or
  cache-partition boundaries
- customer-visible `WorkspaceStreamEvent` payloads SHALL additionally carry one aligned
  `customer_safe_projection` contract pinned to `boundary_scope = WORKSPACE_STREAM_EVENT`; staff
  events SHALL clear it so preview-mode cache hydration and live-update replay cannot derive
  customer-safe badges, module state, or recovery posture from staff-only deltas
- `activity.appended` carries the newly appended entry for the affected thread and MAY be coalesced into `workspace.delta` for clients that consume only the delta envelope
- `audit.appended` is required only for staff/auditor sessions with access to audit state
- `workspace.delta`, `activity.appended`, and `notification.badge` SHALL additionally carry the
  current `queue_projection`; `workspace.snapshot`, `audit.appended`, and `heartbeat` SHALL clear
  it
- customer-visible stream events SHALL keep
  `stability_contract.guard_vector_components.internal_thread_head_or_null = null`; hidden
  internal-only activity SHALL not advance customer stale guards, reorder customer-visible surfaces,
  or surface as `audit.appended`
- if `frame_epoch` changes or history is compacted, the server SHALL return `409 REBASE_REQUIRED` rather than fabricating missed activity
- when the active module is not the changed module, the UI SHALL update badges in place and SHALL NOT steal focus or auto-scroll the user
- when the active module is the changed module and the user is pinned to the live edge, new entries SHALL append in place without full remount
- when the user is reviewing older history, new entries SHALL accumulate behind a `New activity` marker rather than snapping the scroll position

### 9.2 Notification rules

Notifications SHALL be low-noise and role-aware.

#### Staff notifications

Emit in-app notifications for:

- new assignment
- reassignment away from or to the current user
- escalation targeting the current user or current queue
- customer reply
- customer-visible due date change
- SLA due-soon / overdue / breached
- resolution or cancellation of an item the user owns or watches

Email MAY be sent for:

- new assignment when the assignee is offline by policy
- escalation
- overdue / breached state
- customer reply when policy marks the item as high urgency

#### Customer notifications

Emit in-app and optionally email notifications for:

- new request-for-info
- new staff customer-visible comment
- customer due date creation or change
- item resolved or closed

Never notify customers for:

- internal notes
- internal assignment changes
- internal escalation changes
- internal-only attachments
- audit-only events

#### Dedupe rule

Notifications SHALL be deduplicated by at least `(recipient_ref, item_id, notification_type, visibility_class, time_window)` so rapid successive system events do not create noise.
The delivery worker SHALL re-check current access/delegation and masking posture immediately before
send; revoked or narrowed scope SHALL suppress the notification rather than leaking stale visibility.
Every `WorkItemNotification` SHALL additionally publish the target shell family, the mounted
`object_anchor_ref`, the exact in-app detail route, and the lawful parent return route/focus pair
plus one grouped `focus_restoration` outcome and one explicit fallback route/focus pair so
notification-open flows land on the same work item in the same shell grammar and recover to the
same governed parent target instead of a generic portal or queue landing page.
Every `WorkItemNotification` SHALL additionally publish one grouped
`cross_device_continuity_contract` pinned to `continuity_scope = WORK_ITEM_NOTIFICATION`; internal
notifications MAY advertise parent-bound native support reopening, customer-visible notifications
SHALL remain browser-only, and both classes SHALL keep notification-open hydration bound to the
published visibility partition rather than to route text alone.
Customer-visible `WorkItemNotification` payloads SHALL additionally carry one
`customer_safe_projection` contract pinned to `boundary_scope = WORK_ITEM_NOTIFICATION` so opened
notifications, email copy, and inline portal follow-through cannot surface assignment, escalation,
gate, audit, or internal-activity meaning through route text or rendered plain-language labels.

## 10. Audit event model

This contract extends the workflow and audit families with collaboration-specific event types.

Required audit event types are:

- `WorkItemAssigned`
- `WorkItemReassigned`
- `WorkItemEscalated`
- `WorkItemEscalationCleared`
- `WorkItemStatusChanged`
- `InternalNoteAdded`
- `CustomerCommentAdded`
- `CustomerInfoRequested`
- `CustomerInfoReceived`
- `WorkItemDueDatesChanged`
- `WorkItemAttachmentPublished`
- `WorkItemAttachmentQuarantined`
- `WorkItemNotificationQueued`
- `WorkItemNotificationDelivered`

Each collaboration audit event SHALL include the base `AuditEvent` fields plus:

- `work_item_id`
- `thread_id` when applicable
- `thread_visibility_class` when applicable
- `thread_sequence` when applicable
- `workspace_version`
- `command_id`
- `semantic_action_id`
- `command_receipt_ref`
- `request_info_ref` where applicable
- `previous_status` and `new_status` where applicable
- `previous_assignee_ref` and `new_assignee_ref` where applicable
- `attachment_refs[]` where applicable
- `customer_visible_entry_ref` where applicable

Rules:

- every published activity entry SHALL link to exactly one originating audit event
- not every audit event needs a customer-visible activity entry
- append-only hash chaining SHALL remain intact; collaboration events SHALL participate in the same integrity chain policy as the wider audit stream
- all audit rows, activity rows, attachments, and notifications originating from one accepted command
  SHALL carry the same `semantic_action_id`
- the audit module SHALL expose ordered event rows, actor, event type, time, affected object refs, and integrity linkage, but SHALL remain read-only

## 11. Accessibility and responsive rules

### 11.1 Accessibility

The collaboration workspace SHALL satisfy all existing low-noise accessibility rules plus these specific rules:

1. `Internal only` and `Shared with customer` SHALL be rendered as visible text labels and announced to assistive technology.
2. Status, SLA, unread, and escalation state SHALL not depend on color alone.
3. `aria-live="polite"` SHALL announce new activity and badge changes without stealing focus.
4. `aria-live="assertive"` MAY be used only for command rejection, forced rebase, or a terminal state change that invalidates the current action.
5. Keyboard order SHALL remain: context bar -> summary -> action strip -> module picker -> thread history -> composer -> attachments.
6. Incoming SSE updates SHALL NOT move focus away from an active composer or file picker.
7. If a command is rejected as stale, focus SHALL move to the inline problem banner or dialog only after publish is attempted, not on background rebase hints.
8. File upload SHALL be operable by keyboard and screen reader, not drag-and-drop only.
9. Illegal actions SHALL be omitted rather than rendered as disabled controls.
10. Reduced-motion mode SHALL preserve all meaning without relying on animated insertion.

### 11.2 Responsive rules

- Desktop (`>= 1280px`): drawer module picker may render as a vertical tab list, but only one module may be expanded by default.
- Tablet (`768px - 1279px`): module picker SHOULD collapse into a segmented control.
- Mobile (`< 768px`): the active drawer module SHALL take the full content width; customer and internal threads SHALL never be shown side by side.
- On mobile, the composer SHALL remain sticky to the bottom of the viewport when active and SHALL NOT cover the most recent sent message.
- On narrow screens, module changes SHALL reuse the same route and shell identity; the active module
  MAY become a full-width sheet or stacked segment, but SHALL remain the single promoted support
  region.
- On all breakpoints, route changes between modules and between queue -> item -> queue SHALL stay inside the SPA shell and SHALL not trigger a full document reload.

## 12. Playwright scenarios

The following scenarios SHALL be treated as minimum acceptance coverage.

### 12.1 Assignment updates in place

Selectors:

- `data-testid="action-assign"`
- `data-testid="assign-dialog"`
- `data-testid="assignee-chip"`
- `data-testid="thread-internal"`
- `data-testid="module-audit"`

Scenario:

1. Open `/work/items/{item_id}` as a staff user on an unassigned item.
2. Trigger `Assign to me` from the action strip.
3. Assert the assignee chip updates in place without a page reload.
4. Assert an internal system entry appears in `thread-internal` describing the assignment.
5. Assert no new entry appears in the customer thread.
6. Open `module-audit` and assert a `WorkItemAssigned` event exists with the same actor and item ID.
7. Retry the same command with the same `command_id` and `idempotency_key`; assert no duplicate activity entry and no duplicate audit event are created.

### 12.2 Internal note vs customer-visible comment separation

Selectors:

- `data-testid="composer-internal"`
- `data-testid="composer-customer-visible"`
- `data-testid="thread-internal"`
- `data-testid="thread-customer"`
- `data-testid="module-files"`

Scenario:

1. As staff, publish an internal note with one attachment.
2. Assert the note appears only in `thread-internal`.
3. Assert the attachment appears only in the `Internal only` segment of `module-files`.
4. Open the same item as a customer user and assert neither the note nor the attachment is visible.
5. As staff, publish a customer-visible comment with one shared attachment.
6. Assert the comment appears in `thread-customer` for both staff and customer sessions via SSE.
7. Assert the shared attachment appears in the customer-visible file segment.
8. Open `module-audit` in the staff session and assert `InternalNoteAdded` and `CustomerCommentAdded` events exist with distinct visibility classes.

### 12.3 Escalation uses stale-view protection

Selectors:

- `data-testid="action-escalate"`
- `data-testid="escalation-dialog"`
- `data-testid="escalation-badge"`
- `data-testid="problem-banner"`

Scenario:

1. Open the same item in two staff sessions, A and B.
2. In session A, escalate the item to another staff member with `transfer_ownership = true`.
3. Assert the escalation badge appears and the assignee chip changes in place in session A.
4. Without rebasing session B, attempt a reassignment using the stale `workspace_version`.
5. Assert session B receives `VIEW_STALE` in an inline problem banner and the action is not applied.
6. Assert the customer-visible status pill does not change solely because of the escalation.
7. Assert the internal thread and audit module both contain one escalation event, not two.

### 12.4 Audit trail remains append-only

Selectors:

- `data-testid="module-audit"`
- `data-testid="audit-event-row"`
- `data-testid="audit-hash-link"`

Scenario:

1. Perform, in order: assignment, internal note, customer-visible comment, due-date change, and resolution.
2. Open `module-audit`.
3. Assert one ordered row exists for each semantic action.
4. Assert each row exposes event type, actor, timestamp, and integrity linkage.
5. Assert there are no edit or delete controls in the audit module.
6. Assert refreshing the stream connection replays no duplicate audit rows.
7. Assert every visible customer-thread entry links back to an originating audit event.

### 12.5 Internal-only activity does not stale a customer-visible route

Selectors:

- `data-testid="composer-internal"`
- `data-testid="composer-customer-visible"`
- `data-testid="problem-banner"`

Scenario:

1. Open the same `CUSTOMER_SHARED` item in one staff session and one customer session.
2. In the staff session, publish an internal note.
3. Assert the customer session does not receive a stale-view banner, forced rebase prompt, or route
   remount solely because of that internal-only activity.
4. From the customer session, publish a reply using the pre-existing visible `workspace_version`.
5. Assert the reply is accepted, appears in the customer thread, and does not expose the existence of
   the internal note.

### 12.6 Quarantined attachment never becomes customer-downloadable

Selectors:

- `data-testid="composer-customer-visible"`
- `data-testid="attachment-chip-pending"`
- `data-testid="attachment-chip-unavailable"`
- `data-testid="problem-banner"`

Scenario:

1. As staff, publish a customer-visible comment with one staged attachment whose malware scan is still
   pending.
2. Assert the customer thread renders a pending attachment placeholder rather than a live download.
3. Transition the scan result to `QUARANTINED`.
4. Assert the placeholder changes to an unavailable state with a typed reason and no download target.
5. Assert a `WorkItemAttachmentQuarantined` audit event exists and no customer notification claims the
   attachment is available.

### 12.7 Current versus historical shared attachment posture

Selectors:

- `data-testid="module-files"`
- `data-testid="attachment-chip-current"`
- `data-testid="attachment-chip-historical"`
- `data-testid="thread-customer"`

Scenario:

1. As staff, publish one customer-visible attachment that is later marked `REPLACED`, then publish a second accepted replacement attachment for the same request.
2. Open `module-files` as the customer and assert the replacement attachment is labeled current while the first attachment is labeled historical or replaced.
3. Assert the current attachment opens through same-shell preview when policy allows and does not redirect the user into an unrelated route.
4. Assert the historical attachment remains secondary and never becomes the default download or preview target for the request.
5. If either attachment is later masked or quarantined, assert the file row changes to a typed limited or unavailable posture rather than opening an external preview or stale download target.
6. Refresh or reconnect while the historical chip is focused and assert the route restores the same `artifact_focus_*` posture instead of reopening the replacement attachment as if history were primary.

### 12.8 Customer-visible workspace snapshot never serializes hidden staff context

Selectors:

- `data-testid="context-bar"`
- `data-testid="decision-summary"`
- `data-testid="action-strip"`

Scenario:

1. Open the same `CUSTOMER_SHARED` item as one staff user and one customer user.
2. Read the customer-visible `WorkspaceSnapshot` payload.
3. Assert `surface_order[]` is `CONTEXT_BAR`, `DECISION_SUMMARY`, `ACTION_STRIP`, `DETAIL_DRAWER`.
4. Assert `context_bar.internal_lifecycle_state`, `context_bar.assignee_label`, and
   `context_bar.escalation_active` are `null` in the customer snapshot.
5. Assert `decision_summary.customer_state_differs` is `null` in the customer snapshot.
6. Assert the visible customer shell still names the request, due state, freshness, and next safe
   action without requiring any hidden staff field.

### 12.9 Collaboration no-safe-action posture is explicit across rebase and reconnect

Selectors:

- `data-testid="action-strip"`
- `data-testid="problem-banner"`
- `data-testid="module-files"`

Scenario:

1. Open a work item that is waiting on authority and therefore offers no customer-safe or staff-safe
   primary action.
2. Assert the workspace snapshot serializes `actionability_state = NO_SAFE_ACTION`, a non-empty
   `blocking_reason`, non-empty `machine_reason_codes[]`, and a deterministic
   `suggested_module_code`.
3. Force a reconnect or snapshot rebase while keeping the same item selected.
4. Assert the remounted shell preserves the same `NO_SAFE_ACTION` posture and routes the user back to
   the same suggested investigation module rather than inventing a fallback primary action.

### 12.10 Dominant question and settlement posture survive inline refresh

Selectors:

- `data-testid="workspace-dominant-question"`
- `data-testid="workspace-settlement-posture"`
- `data-testid="module-files"`
- `data-testid="module-customer-activity"`
- `data-testid="workspace-no-safe-action"`

Scenario:

1. Open `/work/items/{item_id}` on a narrow-screen viewport where the active module occupies the full content width.
2. Capture the rendered `workspace-dominant-question` and assert only one drawer module is promoted.
3. Trigger a background refresh or reconnect transition that moves the workspace through `FRESHENING` and back to `STEADY`.
4. Assert `workspace-settlement-posture` updates inline without route remount, scroll reset, or loss of the captured dominant question.
5. Switch from `module-customer-activity` to `module-files` and assert the same route and shell identity remain mounted.
6. Force a `NO_SAFE_ACTION` posture and assert `workspace-no-safe-action` appears without introducing a second promoted support region.

### 12.11 Rebase preserves shell identity and local draft context

Selectors:

- `data-testid="composer-customer-visible"`
- `data-testid="problem-banner"`
- `data-testid="action-strip"`
- `data-testid="module-files"`

Scenario:

1. Open `/work/items/{item_id}` and start drafting a customer-visible reply.
2. Trigger an external update that advances `workspace_version` and invalidates the current publish guard.
3. Attempt to publish the draft.
4. Assert the draft text is preserved locally, the shell remains on the same `item_id`, and focus moves to the inline problem banner only after publish is attempted.
5. Assert `ACTION_STRIP` no longer exposes stale mutation posture until a fresh snapshot is mounted.
## FE-25 Cache Isolation

Collaboration workspace and inbox projections now bind `cache_isolation_contract` alongside visibility partitioning. The contract makes access binding, masking posture, visibility cache partition, route identity, canonical object identity, and workspace or inbox version part of one exact cache key, so staff/customer reuse, route hydration, and export/preview reuse cannot cross visibility or masking boundaries.
