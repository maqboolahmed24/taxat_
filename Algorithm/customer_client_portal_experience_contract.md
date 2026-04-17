# Customer/Client Portal Experience Contract

## Purpose
This contract defines the dedicated customer/client portal interface for Taxat. It exists because the staff observatory, even in low-noise form, is still too expert-coded for customers who simply need to know what is happening, what is needed from them, and what will happen next.

The client portal SHALL therefore feel like a secure guided workspace rather than a compliance cockpit. It must reduce anxiety, minimize jargon, and convert internal workflow complexity into a small number of trustworthy, plain-language tasks.
`frontend_shell_and_interaction_law.md` remains authoritative for shell ownership, same-object continuity, artifact handling, accessibility, and disclosure fencing; this contract specializes those rules for client-safe routes.
The portal interaction layer is the stable server-authored interaction contract for these routes.
It SHALL additionally carry `foundation_contract = InteractionLayerFoundationContract` so task
density, stack spacing, support spacing, responsive stacking, motion, history posture, and
recovery grammar remain governed token bindings instead of renderer-local style choices.

---

## Experience thesis
In one short scan, a client user should be able to answer all of the following:

1. what needs my attention now;
2. what has already been received or completed; and
3. what happens next and when.

The portal SHALL answer these questions without exposing manifest lineage, gate taxonomies, trust formulas, or operator-first investigative surfaces as first-view content.

---

## Audience profiles
The portal SHALL support three client-facing capability profiles:

- `CLIENT_VIEWER` - can see status, deadlines, document history, and completed approvals
- `CLIENT_CONTRIBUTOR` - can upload documents, answer intake questions, and complete onboarding tasks
- `CLIENT_SIGNATORY` - can acknowledge declarations and sign approval packs after any required step-up

A session SHALL always resolve to one effective client-facing capability profile before UI composition or command authorization.
The portal SHALL also resolve one frozen client context before first render. `PORTAL_HEADER`, dominant actions,
confirmation dialogs, and receipts SHALL name the active client or business, the acting capacity when the user is
acting on someone else's behalf, and the relevant tax year or period so no customer-safe action can land against an
ambiguous account.

---

## Core design principles

### 1. Task language over system language
The portal SHALL say `Upload your bank statement`, `Review your summary`, or `We are waiting for HMRC` instead of exposing raw engine terms such as gate classes, manifest phases, or internal reason-code families.

### 2. One dominant next step
Every route SHALL expose one dominant primary action at a time. The interface may show supporting context or upcoming tasks, but it SHALL NOT present competing primary calls to action.

### 3. Reassurance before detail
The first view must reassure the client that the case is understood and progressing. For this reason, current status, due point, and what happens next outrank technical provenance, workflow internals, or authority transport details.

### 4. Progressive disclosure with plain-language defaults
Detail remains available, but only after the client has seen a short explanation and a concrete next step. Deep legal text, change logs, or evidence detail SHALL sit behind clearly named secondary disclosure, never ahead of the task itself.

### 5. Route stability across devices
A client who starts on mobile and resumes on desktop SHALL return to the same pending task, upload draft, or approval pack state without having to rediscover their place in the journey.
Reconnect-safe draft state SHALL preserve entered answers, selected files, and the last focused request, approval, or
onboarding step. If the underlying request, onboarding step, or approval pack has rebased, the preserved draft MAY be
used only as carry-forward context and the portal SHALL require review of the latest governed surface before allowing
any mutating command.

### 6. Accessibility is not an enhancement
The portal SHALL be fully usable with keyboard-only navigation, screen readers, reduced-motion preferences, high zoom, and coarse touch input. Any design that depends on hover, color alone, or dense enterprise table layouts is non-compliant.

### 7. Visible limits over silent omission
If content is masked, withheld, role-restricted, or still awaiting authority confirmation, the portal SHALL show a
plain-language limitation notice instead of silently dropping the content. Missing detail SHALL never be allowed to
look like no issue, no document, or no change exists.

### 8. Freshness and recovery must stay visible
The portal SHALL keep the last calm view mounted during reconnect or route-specific rebase, but it
SHALL surface one inline freshness or review notice when the client is no longer looking at the
latest governable workspace. Unsafe mutation SHALL be downgraded to a safe `Review latest` or
`Refresh` path before submission, sign-off, or onboarding completion can continue.

---

## Navigation contract
The global navigation SHALL expose at most five destinations:

1. `Home`
2. `Documents`
3. `Approvals`
4. `Onboarding` (only while onboarding is still active)
5. `Help`

Rules:

- inactive destinations SHALL be omitted rather than disabled
- serialized top-level tabs SHALL keep the canonical labels `Home`, `Documents`, `Approvals`,
  `Onboarding`, and `Help`; collapsed or overflow presentation SHALL preserve those destinations
  rather than renaming them or synthesizing a sixth route
- `Home` SHALL always exist and SHALL always summarize the current status hero plus the next required task
- `Home` and `Help` SHALL never carry numeric badges
- `Documents` and `Approvals` SHALL show count badges only when action is required
- `Onboarding` SHALL disappear once onboarding is complete and its content SHALL collapse into normal `Home`, `Documents`, and `Approvals` flows
- no client-facing route may require knowledge of internal subsystem names in order to navigate
- shared request or issue-detail routes such as `/portal/requests/{item_id}` MAY exist as contextual collaboration routes, but they SHALL be reachable from the existing portal information architecture or notification deep links and SHALL NOT become a sixth permanent top-level destination
- contextual routes SHALL preserve the active top-level tab, expose a clear return path, and focus the exact request,
  approval, or support item named by the deep link rather than opening a generic list view

---

## Route architecture

### `Home`
The home route is the default landing surface and SHALL contain four stacked regions: `PORTAL_HEADER`, `STATUS_HERO`, `TASK_QUEUE`, and `RECENT_ACTIVITY`.

Rules:

- `PORTAL_HEADER` shows account identity, tax year/period label where relevant, and a concise reassurance line
- `PORTAL_HEADER` SHALL also show acting-for context whenever the session is delegated or otherwise acting on behalf of
  another person or business
- `STATUS_HERO` shows current overall state, due point, primary CTA, and a short `what happens next` explanation
- the dominant `STATUS_HERO` CTA on `Home` SHALL align to one explicit task in `TASK_QUEUE`
  through `home_primary_task_ref` so the hero and queue never advertise competing next moves
- the route SHALL publish one `dominance_contract` so `STATUS_HERO`, `TASK_QUEUE`, limitation notices, draft resume, and help posture cannot advertise competing primary actions
- `TASK_QUEUE` groups tasks under `Do now`, `Coming up`, and `Done`
- `TASK_QUEUE` SHALL preserve that literal bucket order, SHOULD omit empty buckets, and SHALL keep
  `OPEN` tasks in `Do now`, `WAITING` tasks in `Coming up`, and `DONE` tasks in `Done`
- `RECENT_ACTIVITY` shows recent uploads, review results, approvals, and submissions
- `RECENT_ACTIVITY` SHALL stay summary-first and bounded to the latest six customer-safe events on
  `Home`
- the `Home` route SHALL publish `home_surface_order = [PORTAL_HEADER, STATUS_HERO, TASK_QUEUE,
  RECENT_ACTIVITY]` as the canonical one-column reading order for browser, native, and responsive
  embodiments
- the home route SHALL NOT show expert modules, audit streams, manifest identifiers, or complex side-by-side comparison layouts by default

### `Documents`
The documents route SHALL contain `DOCUMENT_INBOX`, `UPLOAD_PANEL`, `UPLOAD_STATUS_LIST`, and `DOCUMENT_HISTORY`.
The canonical first-view reading order for the route SHALL be
`[DOCUMENT_INBOX, UPLOAD_PANEL, UPLOAD_STATUS_LIST, DOCUMENT_HISTORY]`.

Rules:

- request cards SHALL explain what is needed, why it matters, and when it is due
- each request card SHALL carry one explicit `why_requested_label` and one explicit `due_label` so
  the first scan answers `what is this for?` and `when do I need it?` without opening a detail route
- upload controls SHALL support drag/drop, browse, and camera capture against governed upload sessions
- the documents surface SHALL serialize `upload_affordances = [BROWSE, DRAG_DROP, CAMERA_CAPTURE]`
  as the governed affordance set so responsive embodiments do not silently drop a lawful upload path
- upload status SHALL distinguish transfer, scan, validation, acceptance, rejection, and retry posture
- the route SHALL serialize
  `status_phase_order = [TRANSFER, SCAN, VALIDATION, ACCEPTANCE, REJECTION, RETRY]` so
  `UPLOAD_STATUS_LIST` stays phase-based instead of collapsing progress, review, and recovery into
  one ambiguous badge
- history SHALL keep accepted, rejected, and superseded uploads in one traceable place
- each request SHALL identify the in-flight or review-target `current_upload_ref` separately from
  the current downloadable `current_artifact_upload_ref` so retry/replacement flows never relabel a
  rejected or superseded upload as the active client artifact
- each request SHALL additionally publish one explicit `artifact_selection` contract so primary
  request focus, authoritative current artifact, visible history, limited-history disclosure, and
  default preview/download/print targets do not depend on row ordering or cached local state
- each request SHALL additionally publish one explicit `artifact_affordance` contract so the
  visible primary slot, header posture, secondary-history disclosure, and invocation-time default
  preview/download/print targets stay aligned to the same governed current-versus-history state
- visible upload rows SHALL publish one explicit customer-facing `history_state` label so the route
  never infers current-versus-history posture from visual grouping alone
- visible upload rows SHALL also publish one explicit `preview_posture` plus typed
  `preview_reason_code` whenever inline preview is downgraded or unavailable, so file-opening
  behavior never has to be guessed from transfer status alone
- downloadable files SHALL be labeled as current or historical so an older upload can never
  masquerade as the active client-facing artifact

### `Approvals`
The approvals route SHALL contain `APPROVAL_SUMMARY`, `CHANGE_DIGEST`, `DECLARATION_PANEL`, and `SIGN_OFF_PANEL`.

Rules:

- the mounted review order SHALL remain exactly `APPROVAL_SUMMARY -> CHANGE_DIGEST -> DECLARATION_PANEL -> SIGN_OFF_PANEL`
- `APPROVAL_SUMMARY` states in plain language what the client is being asked to review
- `CHANGE_DIGEST` highlights material changes since the last reviewed or signed state and SHALL keep one compact summary plus a detail handle even when no material changes exist
- `DECLARATION_PANEL` presents the legal text in readable, previewable, downloadable, printable form
- `SIGN_OFF_PANEL` handles acknowledgement, step-up, signature, and receipt states without route-breaking detours and SHALL keep its current stage explicit
- current review materials, declaration downloads, and final receipts SHALL remain clearly separated from superseded or
  expired approval packs
- each approval pack SHALL additionally publish one explicit `artifact_selection` contract so stale,
  superseded, or signed receipt posture cannot masquerade as the current declaration or signing target
- each approval pack SHALL additionally publish one explicit `artifact_affordance` contract so the
  mounted header posture and default declaration-versus-receipt targets remain explicit across
  preview, download, print, and stale reopen paths

### `Onboarding`
The onboarding route SHALL exist only while the client has unfinished onboarding requirements and SHALL contain `WELCOME_PANEL`, `ONBOARDING_STEPPER`, `STEP_WORKSPACE`, and `SUPPORT_PANEL`.

Rules:

- the mounted reading order SHALL remain exactly `WELCOME_PANEL -> ONBOARDING_STEPPER -> STEP_WORKSPACE -> SUPPORT_PANEL`
- only one required onboarding step may be primary at a time
- completed steps SHALL collapse into a progress summary rather than remain as an always-open wizard stack
- `ONBOARDING_STEPPER` SHALL keep one explicit active step, bounded completed-step summaries, and any reconfirmation-required steps without reopening multiple writable steps at once
- `STEP_WORKSPACE` SHALL render one explicit mode at a time: active-step work, reconfirmation review, stale-review recovery, completion summary, or terminal exit/support handling
- save-and-return SHALL preserve the current step, entered answers, and any in-progress upload sessions
- save-and-return posture SHALL remain explicit through route-stable resume state and resume step context; the portal SHALL not guess whether the client is resuming live work, reconfirming rebased answers, or reviewing stale carry-forward state
- once onboarding is complete, expired, or abandoned, the portal SHALL remove the dedicated onboarding tab and transition the user back into normal `Home`, `Documents`, `Approvals`, or support flows rather than preserving a permanent wizard shell

### `Help`
The help route SHALL contain `HELP_OPTIONS`, `TOP_QUESTIONS`, and `CASE_CONTEXT_PANEL` so clients can get support without restating their whole case.

Rules:

- the mounted reading order SHALL remain exactly `HELP_OPTIONS -> TOP_QUESTIONS -> CASE_CONTEXT_PANEL`
- `HELP_OPTIONS` SHALL expose a small, bounded set of support channels plus one recommended escalation path rather than a long unordered directory
- `TOP_QUESTIONS` SHALL stay bounded to the most likely client-safe questions for the current portal context instead of expanding into a generic FAQ wall
- `CASE_CONTEXT_PANEL` SHALL summarize the active case context, carry the exact focus anchor and any linked request-for-info lineage into support, and SHALL explicitly avoid asking the client to restate already-governed context
- outside the dedicated `Help` route, the portal MAY expose one focused support region, but SHALL NOT mount the full `HELP_OPTIONS -> TOP_QUESTIONS -> CASE_CONTEXT_PANEL` stack or promote generic top questions above the task itself

### Contextual request-detail routes
Routes such as `/portal/requests/{item_id}` SHALL behave as focused detail surfaces inside the existing portal shell,
not as standalone products.

Rules:

- the contextual request-list and request-detail experience SHALL preserve the queue hierarchy
  `ACTION_REQUIRED -> IN_REVIEW -> WAITING_ON_US -> WAITING_ON_AUTHORITY -> COMPLETED`, with explicit due labels
  and one customer-safe next move per visible request row
- a contextual request-detail route SHALL open with the parent top-level tab still active
- the route SHALL restore the request, approval, or support focus named by the deep link rather than forcing the client
  back through a generic queue
- the route SHALL show only customer-safe request context, latest upload posture, corrective feedback, and support
  actions relevant to that item
- request-detail status language SHALL stay literal and customer-safe; labels such as `Blocked by gate`,
  `Stale`, `Escalated`, `Overrideable block`, or staff assignment state are forbidden
- when a due point exists, the route SHALL expose one explicit due label near the dominant status/action region
  rather than burying timing solely in thread history
- reply, upload, and answer-request actions SHALL remain visibly distinct, ordered, and explicit; if none is safe,
  the route SHALL render a clear `No action needed from you right now` explanation instead of an empty action strip
- current shared files and historical shared files SHALL remain explicitly labeled in the same request context so a
  superseded or historical upload cannot become the default customer artifact by accident
- the route SHALL preserve a clear return path to the originating task queue, documents list, approval list, or help
  surface, including the exact parent-route focus anchor to restore rather than a generic tab-level back target
- if the named request, approval, or support object rebases or disappears, the route SHALL keep the
  parent tab active, explain the fallback, and return the client to the latest valid object or
  exact parent-route focus target rather than an unscoped home screen
- on narrow screens, the route SHALL remain stacked inside the same `CLIENT_PORTAL_SHELL` with the
  same header and return grammar rather than opening a detached modal, alternate shell, or generic
  portal list
- the route SHALL NOT expose staff-only chronology, internal workflow identifiers, or expert investigative notes

---

## Shell continuity, support budget, and constrained layouts

The portal SHALL obey the cross-platform law of same object, same shell.
A request-detail deep link, approval-detail link, onboarding-step restore, or help-context entry
SHALL keep the parent top-level tab, header identity, status/task grammar, and return path mounted
for the same client object rather than opening a different product shell.

Rules:

- the read-side workspace SHALL freeze `shell_family = CLIENT_PORTAL_SHELL`, one
  `object_anchor_ref`, and one `dominant_question` for the mounted portal surface so browser,
  native, and responsive variants do not infer shell ownership heuristically
- every `ClientPortalWorkspace` SHALL emit `cross_device_continuity_contract` with
  `continuity_scope = CLIENT_PORTAL_ROUTE`, `compatibility_basis_class = ROUTE_GUARD_AND_VISIBILITY`,
  browser-only embodiments, and explicit parent return/focus anchors for contextual request,
  approval, onboarding, or help detail routes so device changes and reconnect recovery preserve the
  same client object and same return path instead of reopening a generic portal tab
- outside the dedicated `Help` route, the portal SHALL promote at most one support region at a
  time; that promoted region may be a draft-resume notice, a limitation notice, or a focused support
  panel, but not a stack of parallel help or warning cards competing with the task itself
- when draft carry-forward, rebased review, or degraded connection posture exists, the route SHALL
  keep the current request, approval pack, or onboarding step mounted and replace mutating controls
  with one explicit review/recovery region rather than dropping the client back to a generic list or
  blank state
- on narrow screens, every route SHALL stack in this order: `PORTAL_HEADER` -> dominant status or
  focused-item summary -> primary action -> one promoted support region -> supporting history/detail
- current documents, approval packs, receipts, and uploaded files SHALL render summary-first with
  visible status, date, and primary actions such as `Download current copy`, `Upload replacement`, or
  `Review latest pack`; historical or superseded artifacts SHALL remain available but visually
  subordinate
- contextual request-detail routes SHALL preserve the same primary action, same focus object, and
  same return target when the device changes, the page reconnects, or the workspace rebases

---

## Simplified status visualization contract
The portal SHALL use a small literal status vocabulary for `STATUS_HERO`: `ACTION_REQUIRED`, `IN_REVIEW`, `WAITING_ON_US`, `WAITING_ON_AUTHORITY`, `READY_TO_SIGN`, `COMPLETED`, and `ONBOARDING_REQUIRED`.

Rules:

- the headline SHALL be plain-language and action-oriented
- the supporting sentence SHALL explain why the status exists in one or two short sentences
- the route SHALL expose one dominant CTA tied to the current status
- on `Home`, only `ACTION_REQUIRED`, `READY_TO_SIGN`, and `ONBOARDING_REQUIRED` MAY anchor
  `home_primary_task_ref` or coexist with a `Do now` task bucket
- progress SHALL be shown as discrete named steps, not as an ornamental percentage unless the percentage is truly deterministic
- deadline information SHALL use literal client-safe phrasing: `Due ...` or `Overdue ...` with an
  explicit date when a governed due point exists, otherwise `No deadline yet`

---

## Secure document-upload flow
The document-upload flow SHALL prioritize confidence, clarity, and recoverability. The end-to-end path is: open request -> explain requirements -> upload via browse/drag/drop/camera -> transfer through governed `ClientUploadSession` -> show transfer + scan + validation state -> confirm attachment to the correct request -> render reviewer feedback inline on the same request card.

Required UX rules:

- every request SHALL state accepted file types and size limits before file selection
- the client SHALL always know whether a file is uploading, scanning, accepted, rejected, or requires replacement
- request-card copy SHALL make replacement-vs-retry posture explicit: rejected uploads require
  `UPLOAD_REPLACEMENT`, failed transfers require `RETRY_UPLOAD`, and resumed transfers SHALL remain
  visibly in the same request lane rather than reappearing as fresh uploads
- governed upload sessions SHALL freeze tenant, client, request, and request-version identity so a resumed or replayed upload cannot silently drift into the wrong request lane
- every visible upload row SHALL publish one grouped `upload_request_binding_contract` so browser,
  mobile, and desktop recovery all reuse the same machine-readable binding, rebase, duplicate-session,
  and stale-completion posture instead of inferring it from local transfer history
- upload-session state SHALL surface request-binding posture, resumability posture, attachment-confirmation posture, and the current next action as separate facts rather than implying them from transfer status alone
- the current request card SHALL surface its governed `request_version_ref`, and each visible upload row SHALL preserve the upload's own frozen `request_version_ref` so rebased requests can require explicit reconfirmation instead of silently rebinding older bytes
- `ClientDocumentRequest.latest_upload_ref` SHALL remain chronology-only, while
  `current_request_upload_ref_or_null` SHALL be the only client-safe pointer that says which upload,
  if any, still satisfies the current governed request version
- `upload_confidence_score in [0,100]` SHALL be recomputed from verified byte progress, resumability,
  expiry buffer, request-binding currentness, integrity, scanner or validation state, and retry
  burden; the dominant CTA SHALL remain recover or continue and SHALL NOT imply completion while the
  score is below the frozen submission threshold
- `recovery_posture` and `dominant_hazard_code` SHALL remain explicit whenever the session is not
  already safely attached so weak-connectivity reconnect flows never guess whether the client
  should resume, retry, reconfirm, or seek help
- rejected uploads SHALL show a plain-language reason plus the next corrective action
- failed, quarantined, and replacement-required uploads SHALL carry typed reason and recovery posture so reconnect and support flows do not guess what the client must do next
- same-shell file preview SHALL stay explicit on each upload row: accepted customer artifacts MAY use
  `SAME_SHELL_PREVIEW` or `DOWNLOAD_ONLY`, while in-progress, retry-required, replacement-required,
  quarantined, or policy-limited rows SHALL stay `NOT_AVAILABLE` with a typed `preview_reason_code`
- mobile capture SHALL support retry without losing request context
- upload success SHALL never be implied by transfer success alone; scanner or validation completion,
  integrity verification, and current request binding must all be explicit before the route can
  present a completion posture
- a request MAY retain an accepted `current_artifact_upload_ref` while a new `current_upload_ref`
  is transferring or awaiting review, but rejected, failed, and superseded uploads SHALL remain
  history-only and SHALL never become the default preview/download target
- if a request or upload session rebases while the client is mid-flow, the portal SHALL preserve the prior selection as
  draft context but SHALL require explicit confirmation against the latest governed request before final submission
- stale, superseded, rejected, and replacement-only upload history SHALL remain visible as labeled
  recovery context, but those rows SHALL never populate `current_upload_ref`,
  `current_artifact_upload_ref`, default preview state, or request-satisfied copy for the current
  request card

---

## Approval and sign-off flow
Approval journeys SHALL feel deliberate, understandable, and safe. The route SHALL answer four questions in order: `What am I reviewing?`, `What changed?`, `What am I declaring?`, and `How do I sign and what happens after that?`

Rules:

- the summary view SHALL be readable without legal expertise
- material changes SHALL be surfaced as a compact digest before the declaration text
- legal declaration text SHALL remain accessible, previewable, downloadable, and printable from the current approval pack
- stale-view protection SHALL prevent signing a superseded approval pack
- `approval_readiness_score in [0,100]` SHALL be recomputed from current pack freshness, current
  `view_guard_ref`, material-change acknowledgement, declaration acknowledgement, and step-up
  freshness; `Sign now` SHALL NOT become the dominant action while the score is below the frozen
  sign threshold
- the sign-off flow SHALL keep acknowledgement progress, contained step-up checkpoint posture,
  signature submission posture, and receipt settlement posture explicit instead of collapsing them
  into one generic `Sign now` state
- `stale_protection_state`, `recovery_posture`, and any step-up expiry SHALL stay explicit whenever
  the pack is not safely signable so stale-pack recovery remains contained and understandable on
  both mobile and desktop
- step-up, when required, SHALL appear as a contained checkpoint inside the sign-off flow rather than as a route-breaking detour
- the dominant approval action and any step-up continuation SHALL keep the user anchored to the same `Approvals` route and the same approval-pack context
- command acceptance after signature capture SHALL render as pending language tied to a durable
  command receipt and SHALL NOT unlock final receipt copy, receipt downloads, or completion language
  until governed settlement confirms the signed pack
- successful sign-off SHALL end with a clear receipt state, timestamp, printable or downloadable receipt posture, and next-step explanation
- if an approval pack rebases after view or acknowledgement, the portal SHALL preserve review progress only as read-only
  carry-forward context and SHALL redirect the signing action to the latest pack

---

## Onboarding flow
The onboarding journey SHALL be a guided sequence rather than a form dump. The default sequence is: invite acceptance and secure access creation -> basic profile confirmation -> identity verification or equivalent assurance step -> authority-link setup when relevant -> required document collection -> completion and `what happens next` confirmation.

Rules:

- only the current required step may be primary at a time
- completed steps SHALL collapse into a short summary with the option to review
- `save and return later` SHALL be available whenever the current step is not legally irreversible
- save-and-return posture SHALL be explicit as live resume, rebased reconfirmation-required carry-forward, or stale-review-required carry-forward; it SHALL NOT be inferred from missing draft blobs alone
- onboarding copy SHALL explain why each step exists and what happens after it is done
- completed onboarding SHALL end with a clear completion summary, timestamp, and `what happens next` explanation rather than dropping the client silently into the normal shell
- expired or abandoned onboarding journeys SHALL preserve explicit exit timestamps and, for abandonment, an explicit reason code so restart or support flows do not guess why the journey stopped
- once onboarding is completed, expired, or abandoned, the portal SHALL transition the user back into normal `Home`, `Documents`, `Approvals`, and support flows without preserving a permanent wizard shell
- if onboarding requirements change while a saved draft exists, the portal SHALL restore the draft into the latest valid
  step context and SHALL explicitly identify any answers that require client reconfirmation

---

## Responsive fallback rules
The portal SHALL remain one-column, task-first, and same-object stable across breakpoints.

- `Home`, `Documents`, `Approvals`, `Onboarding`, and contextual request-detail routes SHALL preserve one dominant task region at every breakpoint
- on desktop, supporting history, help, or recent activity MAY appear beneath or behind the dominant task region, but SHALL not compete as a second writable rail
- on tablet, contextual request or approval detail SHALL take full content width when active; navigation MAY collapse into tabs, segmented controls, or an overflow menu without changing route ownership
- on mobile, the active request, upload card, approval pack, or onboarding step SHALL take the full viewport width; history and help SHALL collapse behind explicit disclosure rather than splitting the screen
- sticky upload, reply, or sign-off controls SHALL remain visible without covering the latest governing explanation, reviewer feedback, or most recent submitted item

---

## Artifact, print, and browser-handoff rules
Portal artifacts SHALL remain current-safe, client-safe, and same-shell first.

- document requests, uploaded files, approval summaries, declaration text, signed receipts, and onboarding confirmations SHOULD open in same-shell preview first when policy and format support allow
- preview headers SHALL state whether the artifact is current, historical, superseded, rejected, expired, or awaiting replacement so the client never confuses history with the current required item
- the default preview and default download target SHALL always be the current client-facing artifact for the current task; historical items SHALL remain secondary and explicitly labeled
- document requests and approval packs SHALL bind that same visible target through
  `artifact_affordance{ primary_subject_role, visible_primary_subject_ref_or_null, header_posture,
  history_affordance_state, default_preview_target_ref_or_null,
  default_download_target_ref_or_null, default_print_target_ref_or_null }` so rendered headers and
  invoked targets cannot drift apart
- each document request and approval pack SHALL additionally publish
  `externalization_governance_contract{...}` so preview, download, print, and browser handoff
  remain bound to the mounted current-vs-history posture, masking/limitation state, and any live
  approval gate instead of resolving through detached URLs or background cache
- contextual request-detail and approval-detail routes SHALL also retain explicit `artifact_focus_bucket_or_null` and `artifact_focus_subject_ref_or_null` state so refresh, reconnect, notification-open, and stacked narrow-screen recovery reopen the same current-or-history posture instead of guessing from the rendered list order
- downloadable or printable declaration text and receipts SHALL preserve acting-for context, timestamp, limitation notices, and current/historical posture
- identity- or authority-owned checkpoints MAY hand off to the system browser or auth session, but the portal SHALL explain what is happening externally, keep the same request or approval context reserved locally, and restore the client to the same route and focused item afterward
- return from external handoff SHALL not imply completion until `ClientPortalWorkspace`, `ClientApprovalPack`, or the relevant governed read model confirms settlement

---

## Content and copy rules
The portal SHALL use plain English and avoid unexplained legal or operator jargon.

`ClientPortalWorkspace`, `CustomerRequestListSnapshot`, and customer-visible request-detail
projections SHALL publish `language_contract = PortalLanguageContract` as the governing copy
boundary. That contract freezes plain literal task language, direct-text or governed text-ref
serialization only, one dominant question plus one dominant primary action, one promoted support
region subordinate to the task, explicit due/current/history/settlement wording, the banned
internal vocabulary families, and the bounded copy budgets for `Home`, `Documents`, `Approvals`,
`Onboarding`, `Help`, request-list, and contextual request-detail routes.
The same contract SHALL additionally pin route-level first-view budgets and SHALL forbid repeating
the same limitation or recovery narrative across `STATUS_HERO`, limitation notices, and promoted
support regions.

- headlines SHOULD stay under 90 visible characters
- primary CTA labels SHOULD stay under 36 visible characters
- task descriptions SHOULD explain the outcome, not just the data requested
- deadlines SHOULD prefer concrete dates where they exist
- review feedback SHALL explain what needs to change, not merely say that something failed
- limitation notices SHALL explain what is hidden or unavailable and whether the client needs to wait, upload a
  replacement, or ask for help
- the `STATUS_HERO` SHALL keep `secondary_action = null` so the route never publishes a competing
  first-view CTA beside the dominant task

The copy tone SHALL be calm, respectful, and literal. It SHALL avoid alarmist wording, decorative metaphors, or ambiguity about who must act next.

---

## Accessibility and interaction rules
The client portal SHALL satisfy all of the following:

- every core flow is fully keyboard operable
- every color-coded state also includes text and icon semantics
- focus order follows the visible reading order
- all primary controls remain usable at 200 percent zoom
- upload and sign-off flows remain operable with reduced motion enabled
- screen-reader labels describe meaning and outcome, not only visual styling
- touch targets are large enough for coarse pointer input
- narrow-screen and desktop layouts SHALL preserve the same route family and one dominant CTA;
  secondary panels may collapse into accordions or sheets, but the task model SHALL NOT fork into a
  separate mobile-only flow
- no essential state depends on hover-only disclosure

---

## Security and trust moments
The portal SHALL reinforce trust without surfacing internal complexity.

- explicit confirmation when an upload is securely received
- visible validation / scanner state for uploaded files
- visible step-up checkpoint before high-trust sign-off when required
- receipt states for signed approvals and completed onboarding
- help pathways that preserve context rather than forcing the client to start over

The portal MAY reference authority waiting states, but it SHALL do so in client language such as `We have sent this and are waiting for confirmation` rather than transport jargon.

---

## Read-model and API translation requirements
The client portal SHALL be powered by a dedicated read model, `ClientPortalWorkspace`. That workspace SHALL carry at
minimum: `shell_family`, `object_anchor_ref`, `dominant_question`, `language_contract`,
`dominance_contract`, `identity_context`, `settlement_state`, `recovery_posture`,
`workspace_posture`, `route_context`, `workspace_version`,
`freshness_state`, `view_guard_ref`, `navigation_tabs[]`, `interaction_layer`, `status_hero`,
`reliability_summary`, `task_groups[]`,
`home_surface_order`, `home_primary_task_ref`, `draft_resume`, `content_limitations[]`, `document_center`, `approval_center`,
`onboarding_journey`, `support_panel`, and `activity_timeline[]`.
`ClientDocumentRequest`, `ClientUploadSession`, `ClientApprovalPack`, `ClientOnboardingJourney`,
`ClientTimelineEvent`, and `PortalHelpRequest` SHALL additionally validate against their dedicated
JSON schemas in `schemas/`:
`client_document_request.schema.json`, `client_upload_session.schema.json`,
`client_approval_pack.schema.json`, `client_onboarding_journey.schema.json`,
`client_timeline_event.schema.json`, and `portal_help_request.schema.json`.

Rules:

- the workspace SHALL flatten internal workflow and gate posture into client-safe language
- role filtering SHALL happen before serialization so a `CLIENT_VIEWER` never sees upload or sign-off affordances they cannot use
- upload bytes SHALL move through `ClientUploadSession`, while legal attachment / finalization remains a typed command
- approval packs SHALL carry a stale-view hash so the UI cannot sign a superseded summary
- `shell_family` SHALL be fixed to `CLIENT_PORTAL_SHELL`; `object_anchor_ref` SHALL identify the
  exact mounted workspace or contextual object, and `dominant_question` SHALL state the one client
  question the current route is answering
- top-level `settlement_state` and `recovery_posture` SHALL remain the canonical shared-shell
  posture for the mounted portal route; `workspace_posture` and `freshness_state` add portal-local
  detail but SHALL NOT replace that shared spine
- `workspace_posture` SHALL remain the authoritative portal-local posture family for connection
  state, interaction posture, one promoted support region, and the notice text that explains
  whether mutation is live, review-required, or temporarily limited
- `identity_context` SHALL freeze the active client/business label, acting capacity, period label,
  and the concise reassurance line used by `PORTAL_HEADER` for portal rendering and command
  confirmation
- `workspace_version` and `view_guard_ref` SHALL provide the route-stable rebase anchor for the
  currently visible portal workspace so reconnect and stale-view recovery do not depend on client
  inference
- `visibility_partition` SHALL freeze the portal audience class, allowed visibility lanes,
  access-binding hash, masking-posture fingerprint, cache partition key, badge semantics, ordering
  side-channel policy, export scope, and fallback discovery policy so browser/native hydration never
  widens customer-safe caches from route path alone
- `customer_safe_projection` SHALL be the shared FE-41 boundary contract for
  `ClientPortalWorkspace`, `CustomerRequestListSnapshot`, contextual collaboration detail,
  `ClientDocumentRequest`, `ClientApprovalPack`, `ClientOnboardingJourney`,
  `ClientTimelineEvent`, and customer-visible `WorkItemNotification`; it SHALL freeze
  `status_derivation_policy = CUSTOMER_SAFE_BLOCKS_ONLY`,
  `staff_field_dependency_policy = EXCLUDE_STAFF_FIELDS_AT_PROJECTION_SOURCE`, literal
  customer-safe action and status vocabulary, explicit limitation and recovery notices, explicit
  current-versus-history artifact posture, `hidden_activity_policy = NO_HIDDEN_ACTIVITY_DERIVATION`,
  `notification_navigation_policy = PORTAL_SAME_SHELL_AND_VISIBILITY_ONLY`, and
  `export_visibility_policy = CUSTOMER_VISIBLE_EXPORTS_ONLY`, and it SHALL block
  `ASSIGNMENT_STATE`, `ESCALATION_LOGIC`, `RAW_GATE_STATE`, `STAFF_REASON_CODES`,
  `AUDIT_LINEAGE`, `INTERNAL_ACTIVITY`, `INTERNAL_ATTACHMENTS`, `INTERNAL_PARTICIPANTS`,
  `INTERNAL_COUNTS`, and `STAFF_ROUTE_CONTEXT`
- authority-derived client activity SHALL additionally remain bound to FE-50
  `authority_truth_contract{...}`. `ClientTimelineEvent.authority_truth_state` SHALL stay explicit,
  and portal copy SHALL not render `PENDING_ACK`, `UNKNOWN`, `REJECTED`, `OUT_OF_BAND`, or a
  correction-in-flight posture as confirmed or finally resolved
- `cross_device_continuity_contract` SHALL freeze the same contextual request or approval object,
  the active route or contextual detail route, the parent-return anchor, the dominant client-safe
  action posture, the grouped route guard hash, and the customer-safe cache partition key so
  refresh, reconnect, notification-open, and stacked narrow-screen recovery keep the same portal
  object mounted instead of reopening `HOME`, widening visibility, or reviving a stale CTA
- request-list rows and contextual request-detail routes SHALL publish one shared
  `authoritative_action{...}` contract so dominant CTA legality, no-safe-action posture, and
  recovery routing remain identical across list, detail, reconnect, and notification-open entry
- `interaction_layer` SHALL freeze the shared portal interaction layer contract
  (`PortalInteractionLayer`):
  `navigation_model = TOP_LEVEL_TABS_CONTEXTUAL_DETAIL`, `spacing_profile = COMFORTABLE_TASK_FIRST`,
  `status_language_profile = PLAIN_LITERAL_CLIENT_SAFE`,
  `selector_profile = PORTAL_SEMANTIC_SELECTORS_V1`,
  `support_region_policy = ONE_PROMOTED_REGION_MAX`,
  `route_continuity_policy = SAME_SHELL_CONTEXTUAL_RETURN`,
  `focus_restoration_policy = RETURN_FOCUS_ANCHOR_THEN_LATEST_VISIBLE`,
  `artifact_hierarchy_policy = CURRENT_PRIMARY_HISTORY_SECONDARY`,
  `responsive_detail_policy = STACK_SUPPORT_BELOW_PRIMARY`, and
  `motion_profile = SUBTLE_CAUSAL_ONLY`, and
  `feedback_truth_policy = DURABLE_RECEIPT_AND_TYPED_FAILURE_DRIVEN` so browser, native,
  responsive, and automation embodiments do not fork their own portal spacing, warning-stack,
  selector, or recovery behavior
- `interaction_layer` is the cross-client contract boundary for `CLIENT_PORTAL_SHELL`; browser,
  mobile, and any native portal embodiment MAY restack the same support/detail surfaces, but they
  SHALL NOT create detached recovery branches, duplicate promoted support regions, or reinterpret
  stale, pending, or current-versus-history posture outside that published contract
- when `route = HOME`, `home_surface_order` SHALL remain exactly
  `[PORTAL_HEADER, STATUS_HERO, TASK_QUEUE, RECENT_ACTIVITY]`, and `home_primary_task_ref` SHALL
  name the one dominant first-view task whenever `STATUS_HERO` is asking the client to act
- `dominance_contract.dominant_question_surface_code` and `dominant_action_surface_code` SHALL follow the mounted route grammar: `STATUS_HERO` on `HOME`, `DOCUMENT_CENTER` on `DOCUMENTS`, `APPROVAL_CENTER` on `APPROVALS`, `STEP_WORKSPACE` on `ONBOARDING`, and `SUPPORT_PANEL` on `HELP`
- the one active `navigation_tabs[]` entry SHALL always match the top-level `route`; contextual
  detail focus SHALL live in `route_context`, not in a second competing active tab
- `navigation_tabs[]` SHALL keep the canonical route labels and badge discipline from the
  navigation contract: `Home` and `Help` stay badge-free, `Documents` and `Approvals` badges mirror
  current action-required counts, and contextual routes never materialize as a sixth permanent tab
- `freshness_state` SHALL be one of `FRESH`, `STALE_REVIEW_REQUIRED`, or `DEGRADED`; when it is not
  `FRESH`, the workspace SHALL publish a matching limitation notice and a safe review or refresh
  path before any mutating command
- `workspace_posture.connection_state in {RECONNECTING, CATCHING_UP}` SHALL align with
  `settlement_state = FRESHENING` and `recovery_posture = INLINE_RECONNECT`; `freshness_state =
  STALE_REVIEW_REQUIRED` SHALL align with `settlement_state = STALE_REVIEW_REQUIRED` and
  `recovery_posture = INLINE_REBASE`; `freshness_state = DEGRADED` SHALL align with
  `settlement_state = DEGRADED_READ_ONLY` and `recovery_posture = READ_ONLY_LIMITED`; and
  `freshness_state = FRESH` plus `workspace_posture.connection_state = CONNECTED` SHALL align with
  `settlement_state = STEADY` and `recovery_posture = NONE`
- stale-review, degraded, signature-pending-settlement, and similar portal feedback SHALL remain
  derived from durable `ApiCommandReceipt` or typed `ProblemEnvelope` truth; when stale recovery is
  active, the mounted route SHALL preserve the backend-provided `stale_guard_family` and
  `latest_stale_guard_value` rather than restating a local guess about what changed
- `ClientPortalWorkspace.state_taxonomy_contract` SHALL publish the shared shell settlement,
  recovery, and mounted-context posture on every route and SHALL publish `current_empty_state_or_null
  = LIMITED` only when `workspace_posture.promoted_support_region = LIMITATION_NOTICE`
- `ClientPortalWorkspace.semantic_accessibility_contract` SHALL freeze route-safe semantic anchors,
  portal focus order, limitation/recovery notice addressability, current-vs-history artifact
  anchors, and browser/native identifier parity so responsive/detail routes remain same-shell for
  keyboard, automation, and assistive-technology users
- when `route = HOME` and `home_primary_task_ref` names an actionable task, the first view SHALL
  expose one clear due point through `status_hero.due_label` and/or that task's `due_at`
- `route_context` SHALL carry contextual deep-link focus and return-path data without turning contextual routes into new
  top-level destinations; it SHALL publish the in-detail `focus_anchor_ref`, one grouped
  `artifact_focus_bucket_or_null`, one grouped `artifact_focus_subject_ref_or_null`, one grouped
  `focus_restoration{ requested_focus_anchor_ref_or_null, resolved_focus_anchor_ref_or_null,
  restoration_disposition, restoration_reason_code_or_null }`, the parent-route
  `return_focus_anchor_ref_or_null`, one explicit `fallback_target`, optional
  `fallback_object_ref_or_null`, one explicit `fallback_reason_ref_or_null`, and one
  `narrow_screen_mode` so responsive clients do not invent return or recovery behavior locally
- when `route_context.context_route != NONE`, `object_anchor_ref` SHALL switch to that contextual
  object while `route_context.return_route` preserves the parent top-level tab; otherwise
  `object_anchor_ref` SHALL remain the workspace-level anchor
- when `route_context.context_route = REQUEST_DETAIL`, `route_context.return_route` SHALL remain one
  of `HOME`, `DOCUMENTS`, `APPROVALS`, or `HELP`, `return_focus_anchor_ref_or_null` SHALL name the
  lawful parent task/row/context anchor, `fallback_target` SHALL remain `LATEST_VISIBLE_OBJECT` or
  `RETURN_FOCUS_ANCHOR`, and `narrow_screen_mode` SHALL remain `STACKED_SAME_SHELL`
- contextual request-detail restoration SHALL use `focus_restoration.restoration_disposition` to
  distinguish exact anchor restore, same-route anchor remap, governed parent return, and explicit
  invalidation rather than forcing the client to infer those cases from null focus values alone
- `draft_resume` SHALL preserve the dominant resumable upload, approval, or onboarding draft and SHALL distinguish live
  resume from rebased or stale-review-required carry-forward state
- active drafts SHALL promote `DRAFT_RESUME` unless a blocking limitation or terminal support
  posture is more action-constraining
- `reliability_summary` SHALL surface `flow_stability_score`, `risk_weighted_friction_score`,
  `completion_probability`, `recovery_posture`, and `dominant_abort_hazard_code` for the current
  dominant flow so the shell can degrade safely under weak connectivity, stale view, or
  high-abandonment conditions without inventing local heuristics
- outside `Help`, the workspace SHALL expose at most one promoted support region at a time; if both
  draft-resume and limitation posture exist, the blocking or more action-constraining posture wins
  and the other collapses into secondary detail
- `content_limitations[]` SHALL describe any masked, withheld, role-restricted, stale-review, or
  degraded portal content in client-safe language instead of relying on silent omission
- empty, reconnecting, stale, degraded, and other recovery states SHALL stay in the same mounted
  shell through `workspace_posture`, `reliability_summary`, `content_limitations[]`, and one
  promoted support region rather than parallel warning stacks or blank fallback pages
- document and approval projections SHALL distinguish current artifacts from historical ones and SHALL carry the
  receipt or replacement lineage needed to keep downloads and signed records unambiguous
- that distinction SHALL be serialized through shared `artifact_selection` contracts instead of
  being reconstructed from status chips, list grouping, or the previously focused row alone
- `document_center.open_request_count` and `approval_center.outstanding_count` SHALL be exact
  projections of the serialized request and approval cards rather than approximate badges
- those counts and any request-detail reopen state SHALL stay inside the published
  `visibility_partition` basis so hidden staff-only activity cannot perturb customer counts,
  ordering, or fallback discovery
- document-route request cards SHALL carry the current governed `request_version_ref`, and upload
  rows SHALL mirror `request_version_ref`, `request_binding_state`, `resumability_state`, and
  `attachment_state`, SHALL use `history_state` as the customer-visible current-versus-history
  label, and SHALL keep `preview_posture`/`preview_reason_code` explicit so stale request rebases,
  reconnect recovery, file-opening safety, and explicit rebind posture stay client-visible without
  exposing internal-only review detail
- every request card with `current_upload_ref` SHALL point to one upload in the same request card,
  and that current upload SHALL preserve status-compatible transfer posture
- `approval_center.surface_order` SHALL remain exactly
  `[APPROVAL_SUMMARY, CHANGE_DIGEST, DECLARATION_PANEL, SIGN_OFF_PANEL]`
- each serialized approval pack SHALL carry one compact `change_digest_summary`, one
  `change_highlights_ref`, one readable `declaration_text_ref`, distinct
  `declaration_download_ref` and `declaration_print_ref`, explicit
  `change_digest_acknowledged`, `declaration_acknowledged`, and `approval_acknowledged` progress,
  one explicit `sign_off_state`, one `step_up_surface`, one `step_up_checkpoint_state`, one
  explicit `receipt_state`, optional `sign_command_receipt_ref`, optional
  `settlement_pending_label`, and receipt-specific refs or labels so declaration exports never
  masquerade as signed receipt actions and pending sign commands never masquerade as settled
  receipts
- `approval_center.latest_pack_ref` SHALL resolve to one serialized pack, and `STEP_UP_REQUIRED`
  packs SHALL keep both `requires_step_up = true` and `primary_action.requires_step_up = true`
- approval-pack `primary_action` SHALL remain anchored to the `APPROVALS` route and the current
  `approval_pack_id` context so review, inline step-up, and sign-off do not branch into a second
  shell
- `activity_timeline[]` SHALL remain newest-first by `occurred_at` with unique `event_id`s so
  reconnect and responsive rerender do not reshuffle recent activity
- `onboarding_journey.completed_step_count` SHALL stay within `total_step_count`, and completed
  journeys SHALL report all steps as completed
- context-preserving help submissions SHALL materialize `PortalHelpRequest` so route, reason family,
  linked request context, exact `source_focus_anchor_ref`, and acknowledgement or response posture
  survive portal reconnect and staff handoff
- contextual help requests from request-detail routes SHALL retain the linked `request_info_ref`,
  and route-specific help reasons such as approvals or onboarding SHALL stay aligned with the source
  route they came from
- on the dedicated `Help` route, `support_panel.surface_order` SHALL remain
  `[HELP_OPTIONS, TOP_QUESTIONS, CASE_CONTEXT_PANEL]`; `faq_refs[]` SHALL act as the bounded
  `TOP_QUESTIONS` set, and `case_context_panel` SHALL carry one `context_summary_ref`, one
  non-empty `carried_context_refs[]` set, one exact `focus_anchor_ref`, any linked object or
  request-for-info refs, one recommended channel choice, and `restate_required = false`
- outside `Help`, `support_panel.surface_order`, `case_context_panel`, and `TOP_QUESTIONS` content
  SHALL clear so contextual support remains available without overpromoting a generic help stack on
  task routes

---

## Minimum semantic selectors
Recommended `data-testid` values:

- `portal-shell`
- `portal-workspace-posture`
- `portal-status-hero`
- `portal-primary-action`
- `portal-support-entry`
- `portal-support-panel`
- `portal-route-tabs`
- `portal-inline-recovery`
- `portal-request-focus`
- `portal-artifact-handoff`
- `portal-current-artifact`
- `portal-history-list`

---

## Playwright validation minimum
`ClientPortalWorkspace` SHALL additionally participate in `semantic_accessibility_regression_pack`
cases so the portal selector profile, contextual return-path control, request-focus anchor,
support-panel reachability, live recovery notice posture, and reduced-motion task semantics remain
bound to the shared semantic contract through responsive restack and reconnect.

The client portal validation plan SHALL include at least:

1. home view shows one dominant status hero and one dominant CTA
2. open document request exposes accepted file types and size limits before upload
3. mobile upload reconnect resumes the same upload session rather than duplicating the file
4. rejected upload shows corrective guidance on the same request card
5. approval pack stale-view rejection routes the user to the latest pack before signing
6. step-up sign-off completes without losing declaration context
7. onboarding reveals one primary step at a time and preserves save-and-return state
8. keyboard-only navigation can complete upload and sign-off flows at 200 percent zoom
9. delegated sessions always show the correct acting-for identity in header, CTA, and receipt states
10. masked or withheld portal content renders an explicit limitation notice rather than disappearing silently
11. notification deep links into `/portal/requests/{item_id}` restore the correct request focus and return path
12. a rebased upload, approval, or onboarding draft preserves carry-forward context without allowing stale mutation
13. superseded uploads and approval packs remain available as historical artifacts but never become the default current
    download or signing target
14. printable or downloadable declaration text and receipts preserve acting-for context, limitation notices, and current vs historical posture
15. identity- or authority-owned browser handoff returns to the same route and focused request or approval item without implying completion before the governed read model settles
16. refresh, reconnect, or responsive collapse preserve the same artifact-focus bucket and subject so preview/download targets do not drift from current to historical posture
16. outside the Help route, draft-resume, limitation, and support surfaces never appear as more than
    one promoted support region at a time
17. reconnecting, stale, or rebased portal states keep the focused request, approval pack, or
    onboarding step mounted and switch mutation posture to explicit review/recovery language instead
    of dropping the user back to a generic queue
18. narrow-screen layouts preserve the same top-level tab, same primary action, and same return path
    while stacking support history below the dominant task
19. a contextual help request preserves the originating route, linked request context, and exact
    `focus_anchor_ref` so dismissal or staff follow-up returns the client to the same task without
    rediscovery
20. stale or degraded portal workspaces render one inline freshness notice and demote unsafe
    mutation to an explicit review or refresh action
21. resizing from desktop to narrow screen preserves the same active route, focused request or
    approval context, and return path rather than creating a mobile-only flow branch
22. weak-connectivity mobile upload never promotes a completion CTA while
    `upload_confidence_score < 70`, and reconnect recovery keeps the same request card, file
    selection, and next corrective action
23. a stale or expired approval pack never promotes `Sign now` while
    `approval_readiness_score < 85`, and the latest pack plus any required fresh step-up remain in
    the same contained sign-off flow
24. when a reversible portal task yields `completion_probability < 0.40`, the dominant CTA shifts
    to save, recover, or help posture instead of an irreversible submit or sign action

---

## One-sentence summary
The customer/client portal must transform the engine's expert semantics into a calm, secure, task-first workspace where clients can understand status instantly, provide the right information confidently, and complete approvals without friction.
## FE-25 Cache Isolation

Portal workspaces and request-list surfaces now publish `cache_isolation_contract` as the customer-safe cache boundary. Customer-safe reuse is allowed only inside the exact client, access-binding, masking, route, object, projection-version, and visibility-partition context, and preview/export reuse remains bound to the currently mounted route and selected subject only. Portal document and approval delivery also stay pinned to one invocation-time `externalization_governance_contract.delivery_binding_hash` that mirrors the active `customer_safe_projection`, so background refresh, stale tabs, or direct download URLs cannot widen the reviewed slice.
