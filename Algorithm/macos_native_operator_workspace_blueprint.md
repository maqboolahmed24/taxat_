# Native macOS Operator Workspace Architecture

## Purpose

This document defines the native macOS operator workspace as a signed, notarized, high-performance desktop embodiment built in Xcode without changing the legal or algorithmic authority of the server-side engine.

The native workspace is not a screen-for-screen restatement of a browser surface. It is a deliberate separation of concerns:

- keep `RunManifest`, gate logic, provenance, filing, authority interaction, and audit truth on the platform;
- place operator ergonomics, local projection caching, keyboard-first workflows, and high-density investigation tooling in a native desktop shell for manifest-centric decision work and staff collaboration/work-item handling;
- preserve the northbound command/read contract so the native client remains a projection-and-command surface rather than a second compliance engine.

`frontend_shell_and_interaction_law.md` remains authoritative for shell ownership, same-object continuity, artifact handling, accessibility, and disclosure fencing; this blueprint defines how those laws map onto native macOS primitives.

## 1. Architectural thesis

The strongest native embodiment is a **server-authoritative desktop client**:

1. the backend remains the source of legal truth;
2. the macOS app materializes cached projections of `DecisionBundle`, `ExperienceDelta`,
   `WorkspaceSnapshot`, `WorkspaceDelta`, audit, and enquiry surfaces;
3. user actions become typed commands carrying the same stale-view guards, durable
   `ApiCommandReceipt` semantics, and idempotency rules as the web product;
4. native-only state is restricted to view composition, local drafts that are explicitly non-legal,
  navigation history, search indices, and performance caches.

This preserves the invariant that native speed never outruns backend legality.

## 2. Architectural guardrails

- The app SHALL NOT re-implement filing, gate, trust, or amendment legality in Swift.
- Local persistence SHALL be disposable and rebuildable from platform truth.
- Cached hydration SHALL be compatibility-bound to the current tenant, principal/session lineage,
  masking-posture fingerprint, manifest/workspace identity, and supported contract window before any
  legal-posture surface is rendered.
- The app MAY optimistically show command acceptance or a pending receipt, but SHALL NOT fabricate
  legal terminal state before the backend publishes it.
- Offline or disconnected posture SHALL fail closed for filing-capable, approval-capable,
  authority-mutating, or otherwise legally material actions; only explicitly non-legal local drafts
  may survive without a live round-trip.
- Browser-specific constructs such as route stacks, cookie jars, and `localStorage` SHALL be translated into
  native constructs rather than mirrored literally.
- Embedded web content SHALL be treated as an exception surface for low-risk help or documentation,
  not as the primary runtime model.

## 3. Recommended Xcode workspace topology

Create an Xcode workspace named `InternalOperatorWorkspace.xcworkspace` with the following targets or
Swift packages:

### A. `Apps/InternalOperatorWorkspaceMac`
The shipping macOS app target.

Responsibilities:

- `@main` SwiftUI app lifecycle
- window and scene coordination
- menu commands, keyboard shortcuts, settings, and deep links
- environment bootstrapping, feature negotiation, and graceful upgrade prompts

### B. `Packages/OperatorDomain`
Pure Swift domain package aligned to existing contracts.

Responsibilities:

- typed identifiers and immutable view-state models
- command-intent structures that mirror northbound command envelopes
- manifest, gate, trust, evidence, workflow, collaboration, and authority presentation reducers
- typed `ApiCommandReceipt`, `ExperienceCursor`, `WorkspaceSnapshot`, and `WorkspaceDelta` models
- serialization rules for server-authored artifacts

### C. `Packages/OperatorPlatformSDK`
The boundary between desktop UI and platform services.

Responsibilities:

- `URLSession` command client
- ordered stream clients for `ExperienceDelta` and collaboration `WorkspaceDelta`
- snapshot hydration, resume, and rebase helpers
- stale-view guard helpers for bundle, shell, frame, and collaboration workspace versions
- auth/session adapters
- capability negotiation and API-version compatibility checks

### D. `Packages/OperatorPersistence`
Durable local cache and investigation state.

Responsibilities:

- SQLite/Core Data-backed storage for snapshots, bundles, workspace snapshots, receipt history,
  resume metadata, and pinned work
- tenant-, principal-, session-, and masking-aware cache invalidation
- local search indexing for read-side artifacts
- migration and corruption-recovery rules for desktop persistence

### E. `Packages/OperatorUI`
The reusable native design system.

Responsibilities:

- calm-shell primitives (`CONTEXT_BAR`, `DECISION_SUMMARY`, `ACTION_STRIP`, `dominant_question`,
  `dominance_contract`, `settlement_state`, inspector surfaces)
- semantic badges, chips, timelines, and trust/gate components
- typography, spacing, color, and motion tokens aligned with `UIUX_DESIGN_SKILL.md`

### F. `Packages/OperatorDesktopKit`
Desktop-specific bridges where SwiftUI alone is not sufficient.

Responsibilities:

- AppKit interoperability through `NSViewRepresentable` / `NSViewControllerRepresentable`
- high-density tables, outline views, diff viewers, and text-heavy evidence inspectors
- window coordination for compare/audit/deep-investigation workflows
- Quick Look, drag/drop, print, and export helpers

### G. `Packages/OperatorDiagnostics`
Production diagnostics without data leakage.

Responsibilities:

- `OSLog` / signpost instrumentation
- redaction-safe debug bundle export
- correlation of local client events with server `correlation_id`
- crash and performance triage hooks

### H. `Packages/OperatorFeatureFlags`
Safe rollout controls.

Responsibilities:

- server-driven capability flags
- kill switches for experimental native flows
- minimum supported backend/client compatibility windows

## 4. Platform translation map

### Routing and navigation
Replace browser routes with native scene orchestration:

- browser route tree -> `NavigationSplitView`, `WindowGroup`, dedicated compare/audit windows
- tab duplication -> explicit multi-window or tabbed-window manifest workspaces
- modal chains -> inspectors, sheets, and detachable utility panels
- browser refresh recovery -> snapshot hydration + stream resume/rebase

### State management
Replace browser-global state containers with structured native ownership:

- SPA store -> feature-scoped `@Observable` models and actors
- ad hoc polling timers -> async stream consumption and server-published snapshots
- `localStorage` / session storage -> Keychain for credentials and a tenant-bound on-disk cache for
  disposable read models
- DOM event buses -> typed actions crossing actor boundaries

### Rendering model
Replace DOM-first rendering with a hybrid SwiftUI/AppKit model:

- SwiftUI for shell composition, forms, inspectors, onboarding, settings, and most decision surfaces
- AppKit for very large evidence tables, advanced diffing, text layout, and precision multi-column
  interactions
- native scenes SHALL render server-authored `dominant_question` and `settlement_state` from
  `LowNoiseExperienceFrame` and `WorkspaceSnapshot` instead of inventing native-only loader or
  badge grammar
- native scenes SHALL mirror the backing shell `dominance_contract`, keep `ACTION_STRIP` as the only authoritative action surface, and keep the trailing inspector support-only even when detached
- where the owning read model additionally publishes `shell_family`, `object_anchor_ref`, or
  `recovery_posture`, native scenes SHALL preserve and restore those fields alongside
  `dominant_question` and `settlement_state`; native route contracts SHALL therefore keep the same
  canonical `shell_family` and, when needed, add `surface_embodiment = NATIVE_OPERATOR` rather than
  deriving a separate desktop-only shell identity
- `NSViewRepresentable` bridges only where profiling proves SwiftUI is not the right tool

## 5. Preferred window and scene architecture

### Primary workspace window
Use a three-region native shell:

1. leading sidebar for manifest/work queue selection
2. center content area for the calm shell
3. trailing inspector for `DETAIL_DRAWER` depth and support context

The inspector is the scene's single promoted support region by default.
The operator should be able to collapse or detach the inspector without losing decision context,
dominant question, or action posture.
That primary window contract SHALL be serialized as `NativeOperatorWorkspaceScene` and validated
against `schemas/native_operator_workspace_scene.schema.json` so the three-region order, mounted
object continuity, inspector posture, restoration envelope, and native shortcut grammar stay
machine-checkable instead of prose-only.
It SHALL additionally serialize the shared `OperatorInteractionLayer` so mounted-content
preservation, inline refresh, explicit rebase posture, low-noise delta coalescing, notification
mirroring, detached preview preference, current-first history posture, and fail-closed degraded
actions stay machine-checkable rather than implementation-local.
That shared operator layer SHALL additionally carry
`foundation_contract = InteractionLayerFoundationContract` so native wrappers reuse the same
calm-shell density, spacing, support-spacing, redock, motion, preview, and support-window token
bindings as browser calm-shell routes.
That interaction layer is the server-authored contract boundary for native translation; scene
wrappers MAY only vary the embodiment surfaces already named by the published contract and SHALL
NOT introduce native-only loader, badge, restore, or second-workspace grammar for the same object.

If the server marks the current scene with non-`NONE` `recovery_posture`, the native client SHALL
keep the same anchored object mounted and downgrade mutation-capable affordances inline rather than
opening a detached recovery window or discarding the current compare or diff context.

When the window width, Stage Manager layout, or split-view allocation cannot safely support three
simultaneous regions, the app SHALL preserve the same object identity and calm-shell order while
collapsing support surfaces to one promoted auxiliary pane at a time. Resizing, sidebar collapse,
or inspector detachment SHALL NOT swap the current manifest/work-item route for a different shell,
remount a separate product metaphor, or relocate the dominant action beneath unrelated detail.

Detached compare, audit, Quick Look, print-preview, export, and filing-packet windows SHALL carry
the same object identity header as the parent workspace and SHALL open on a summary-first current
artifact card before any historical lineage, superseded revision, or raw payload view.
Those secondary scenes SHALL serialize as `NativeOperatorSecondaryWindowScene` and validate against
`schemas/native_operator_secondary_window_scene.schema.json` so parent-scene binding,
secondary-window kind, identity-header order, summary-first loading posture, and close-return focus
handoff stay machine-checkable instead of implementation-local.
Their `interaction_layer` SHALL keep recovery messaging in `IDENTITY_HEADER`, leave notification
ownership with the parent context bar, prefer `SECONDARY_WINDOW_BODY` for current artifact preview,
and keep historical/raw access explicitly secondary. The same shared layer SHALL also pin
`selector_profile = OPERATOR_SEMANTIC_SELECTORS_V1`,
`shell_continuity_policy = SAME_OBJECT_SAME_SHELL_INLINE_RECOVERY`,
`investigation_presentation_policy = SUMMARY_FIRST_PLAIN_LANGUAGE_MODULES`, and
`secondary_window_policy = SUPPORT_ONLY_PARENT_BOUND_CLOSE_RETURNS_FOCUS` so detached windows stay
parent-bound support surfaces rather than a second writable workspace.

Each workspace scene SHALL bind to a stable identity envelope including at minimum:

- `tenant_id`
- principal class / session lineage
- `manifest_id` or work-item identity
- compatible `frame_epoch` or `workspace_version`
- `access_binding_hash_or_null` whenever the backing scene is work-item visibility scoped
- masking-posture fingerprint
- route/detail selection refs

Scene restoration through `NSUserActivity` or native state restoration SHALL be invalidated on tenant
switch, privilege downgrade, revocation, masking change, or schema incompatibility rather than
silently reattaching a stale scene to a new legal context.
Each native scene SHALL additionally emit `cross_device_continuity_contract`; primary windows use
`compatibility_basis_class = SESSION_MASKING_AND_ROUTE_GUARD`, secondary windows use
`compatibility_basis_class = SESSION_MASKING_AND_PARENT_SCENE`, and workspace-backed scenes SHALL
invalidate on `ACCESS_BINDING_CHANGE` rather than trusting cached visibility after session or
tenant drift.

### Secondary windows
Create dedicated scenes for:

- manifest lineage comparison
- work inbox and linked work-item collaboration
- audit trail and provenance exploration
- filing packet review / export
- authority interaction review
- drift/amendment comparison

This maps better to desktop deep work than stacking browser tabs and nested drawers.

Rules:

- secondary windows SHALL remain support-only; they MAY expose print, export, or close affordances,
  but SHALL NOT publish a second authoritative action strip for the same writable object
- every secondary window SHALL preserve the same parent object anchor, session/masking lineage, and
  shell ownership as the window that launched it rather than silently remounting a different
  manifest, work item, or detached shell family
- compare windows SHALL remain typed `Twin Lens` or `Drift Ripple Field` embodiments, audit windows
  SHALL remain typed `Audit Echo Panel` embodiments, and detached evidence windows SHALL remain
  typed `Evidence Prism` embodiments rather than ad hoc browser-like document tabs
- the default reading order inside a secondary window SHALL remain
  `IDENTITY_HEADER -> SUMMARY_CARD -> DETAIL_BODY`; detail panes MAY continue loading, but the
  current object header and summary card SHALL render first and historical/raw content SHALL stay
  secondary until the operator explicitly asks for it
- every secondary window that can preview or export artifact material SHALL publish
  `artifact_affordance{...}` so the visible header posture, current-versus-history label, and
  default preview target remain aligned when Quick Look, print, or detached evidence detail opens
- close, reopen, and keyboard handoff SHALL restore focus to the parent focus anchor that launched
  the secondary window unless restoration has been explicitly invalidated

### Commands and menus
Promote high-frequency actions into native command surfaces:

- manifest search
- toggle inspector
- focus sidebar, primary canvas, or inspector
- detach inspector
- open lineage / audit / compare windows
- rebase or refresh current manifest
- copy manifest identifiers, hashes, or evidence coordinates
- start step-up, review, or packet preparation actions where policy allows

The primary workspace scene SHALL keep one governed shortcut vocabulary at minimum:
`TOGGLE_SIDEBAR`, `TOGGLE_INSPECTOR`, `DETACH_INSPECTOR`, `FOCUS_SIDEBAR`,
`FOCUS_PRIMARY_CANVAS`, `FOCUS_INSPECTOR`, and `REFRESH_CURRENT_SCENE`.
Those shortcuts SHALL mirror visible controls and menu commands, SHALL restore focus to the same
mounted object rather than a shell root, and SHALL distinguish docked from detached inspector focus
instead of heuristically jumping to a different manifest or work item.

## 6. Data flow and synchronization model

The manifest-shell read path SHOULD be:

1. load the last compatible `DecisionBundle`, snapshot frame, and `ExperienceCursor` from local persistence;
2. render immediately in a clearly marked cached posture;
3. fetch `GET /v1/manifests/{manifest_id}/experience/snapshot`;
4. capture `decision_bundle_hash`, `frame_epoch`, `shell_stability_token`,
   `last_published_sequence`, a fresh `resume_token`, the grouped `stability_contract`, and the
   grouped `stream_recovery_contract`;
5. reconcile local cache with the server snapshot rather than guessing missed transitions;
6. attach to `GET /v1/manifests/{manifest_id}/experience/stream?resume_token=...`;
7. apply typed events idempotently by `(MANIFEST_EXPERIENCE, manifest_id, frame_epoch, experience_sequence)`;
8. treat catch-up as incomplete until every sequence gap below `last_published_sequence` is filled;
9. if the server returns `409 REBASE_REQUIRED`, `409 ACCESS_REBIND_REQUIRED`, or the cursor moves to
   `REBASED`/`REVOKED`, fetch a new snapshot and successor cursor rather than replaying invented
   deltas.

Step 1 compatibility is strict.
The cached envelope SHALL match at minimum:

- `tenant_id`
- principal class / session lineage
- `manifest_id`
- `frame_epoch`
- masking-posture fingerprint
- supported contract or schema window

If any of those bindings are incompatible, the app SHALL discard the cached shell before first paint
rather than render stale-but-plausible legal posture.

The staff collaboration/work-item read path SHOULD mirror that contract:

1. load the last compatible `WorkspaceSnapshot`, `workspace_version`, and `WorkspaceCursor` from local persistence;
2. fetch `GET /v1/work-items/{item_id}/workspace/snapshot`;
3. capture `frame_epoch`, `workspace_version`, `shell_stability_token`,
   `last_published_sequence`, `resume_token`, the grouped `stability_contract`, and the grouped
   `stream_recovery_contract`;
4. attach to `GET /v1/work-items/{item_id}/workspace/stream?resume_token=...`;
5. apply `WorkspaceDelta` idempotently by `(WORKSPACE, item_id, frame_epoch, workspace_sequence)`;
6. treat catch-up as incomplete until every sequence gap below `last_published_sequence` is filled;
7. on `409 REBASE_REQUIRED` or `409 ACCESS_REBIND_REQUIRED`, replace the local workspace frame from
   the fresh snapshot instead of merging stale thread state heuristically.

Resume tokens SHALL be treated as governed cursor material, not UI hints.
Native stream clients SHALL:

- bind resume metadata to the exact tenant, principal/session lineage, manifest/work-item identity,
  masking posture, compatible contract window, `stability_contract.publication_generation` /
  `guard_vector_hash`, and the current `stream_recovery_contract` binding fields
- treat `stream_recovery_contract.compaction_floor_sequence_or_null` as the earliest lawful resume
  point for the mounted cursor; if local acknowledgement is older, the client SHALL rebase instead
  of replaying cached gaps
- require strict monotonic, gap-free apply within one epoch and complete catch-up before treating
  live delivery as current
- revoke or discard resume state on tenant switch, privilege downgrade, masking change, session
  invalidation, or schema incompatibility
- require a fresh snapshot/rebase before destructive or filing-capable action after any such
  invalidation
- never replay cached delta sequences across revoked or incompatible cursor lineage

The command path SHOULD be:

1. operator triggers a typed intent;
2. the app captures the relevant stale-view guards from the currently rendered surface:
   `if_match_decision_bundle_hash`, `if_match_shell_stability_token`, and `if_match_frame_epoch` for manifest work, or `if_match_work_item_version` plus the correct thread-head sequence for collaboration work;
3. the app emits `POST /v1/commands` with stable `command_id` and `idempotency_key`;
4. the UI renders only receipt-pending posture until a durable `ApiCommandReceipt` returns;
5. `REJECTED_STALE_VIEW`, `REJECTED_POLICY`, and `REJECTED_INVALID` receipts update the UI inline as typed failures and SHALL NOT be disguised as accepted async work;
6. terminal legality changes still arrive from the backend read side, not from local mutation guesses.

If the app is offline, cursor-invalid, or cannot prove a live bound session plus compatible snapshot
lineage, command-capable workflows SHALL degrade to read-only or local-draft posture.
Authority-facing commands, approvals, override approvals, and other legal mutations SHALL NOT queue
for blind later send from disconnected state.
Local drafts MAY capture notes, compare selections, or preparatory form input, but they SHALL be
explicitly non-legal and SHALL reacquire stale-view guards before later command emission.

## 7. Authentication and session strategy

Use platform-native authentication primitives rather than embedded credential UX.

Recommended posture:

- product authentication and step-up through `ASWebAuthenticationSession` or equivalent
  system-browser-managed flows
- Keychain-backed storage for product session material
- no raw authority credentials on device
- explicit tenant/account switching that also purges incompatible local caches
- session restoration only when the local cache, resume metadata, and the server session all remain valid
- step-up completion SHALL rotate the effective session challenge state so pre-step-up commands and cursors cannot be replayed blindly afterward
- session revocation or binding invalidation SHALL revoke outstanding resume tokens and block future command acceptance until re-authentication

Authority-owned or HMRC-online-services-only tasks should open in the default system browser, not an
unrestricted in-app web shell.

## 8. Persistence model

Persist only what improves speed, continuity, and investigation quality without challenging backend
authority.

Persist locally:

- cached `DecisionBundle`, `ExperienceDelta`, `WorkspaceSnapshot`, and `WorkspaceDelta` projections
- durable `ApiCommandReceipt` history and reconnect-safe resume metadata such as `frame_epoch`, `workspace_version`, `shell_stability_token`, `last_published_sequence`, and route keys
- non-legal workspace state such as pinned evidence, compare selections, expanded inspectors, and
  recent manifest/work-item lists
- redaction-safe search indices
- queued diagnostics for later export

Every persisted cache row or blob SHALL be bound to a cache envelope containing at minimum:

- `tenant_id`
- principal class
- masking-posture fingerprint
- manifest/work-item identity
- contract or schema compatibility version
- recorded-at timestamp

Cache eviction SHALL be selective and immediate on revocation, tenant switch, privilege downgrade,
masking change, or contract incompatibility.

Do not persist locally as authoritative truth:

- raw authority access tokens
- unsent filing legality decisions
- client-generated workflow conclusions
- pre-acceptance command mutations that lack a durable receipt
- unbounded copies of regulated payload bodies where a referenced artifact is sufficient

Desktop-local search indices, pinned artifacts, and detached evidence previews SHALL inherit the same
masking/export posture as the underlying server object.
The app SHALL NOT keep a broader local copy merely because desktop storage is available.

## 9. SwiftUI versus AppKit decision matrix

Use **SwiftUI by default** for:

- the calm shell
- inspector/detail flows
- settings and preferences
- lightweight forms and command launchers
- menu commands and keyboard shortcuts
- accessibility-rich semantic components

Use **AppKit selectively** for:

- evidence and audit tables that need aggressive virtualization
- multi-column outline views with complex disclosure behavior
- side-by-side attributed diff viewers
- text editing or annotation surfaces with advanced selection/search behavior
- export/print surfaces that need mature desktop fidelity

This is not a philosophical compromise; it is a performance and operability strategy.

## 10. Native UX opportunities that should replace browser habits

The macOS app should deliberately adopt native affordances:

- multi-window deep work rather than tab sprawl
- command menus and shortcuts rather than hover-only controls
- inspector panels instead of nested browser drawers where appropriate
- Quick Look previews for evidence artifacts
- drag-and-drop for safe, typed evidence intake
- state restoration through scenes and `NSUserActivity`
- system notifications for long-running review or authority callbacks

These features improve operator throughput without altering engine semantics.

Native affordances SHALL still remain policy-bounded:

- Quick Look, print, export, and drag-out operations SHALL check masking/export posture before
  materializing bytes into OS-managed temporary files
- `NSUserActivity`, local indexing, and notification text SHALL remain redaction-safe and SHALL NOT
  expose hidden evidence content, identifiers, or legal conclusions beyond the user’s current
  masking posture
- long-running authority callbacks or review notifications SHALL use redacted status copy unless the
  current session and policy explicitly allow richer content

## 11. Security and runtime posture for the desktop client

The app should ship with:

- code signing and notarization
- hardened runtime
- least-privilege entitlements and sandbox posture where compatible with product needs
- Keychain-only credential storage
- tenant-aware cache partitioning
- redaction-safe logging
- remote feature kill switches
- forced re-auth plus cursor/cache invalidation on revocation, privilege downgrade, masking-posture change, or schema incompatibility

Additionally:

- scene-restoration payloads, `NSUserActivity`, preview caches, and temporary export files SHALL be
  treated as regulated local artifacts and purged or invalidated under the same revocation/masking
  conditions as the structured cache
- native scene-restoration payloads SHALL preserve one grouped `focus_restoration` outcome alongside
  the route key, object anchor, and resume token lineage so window relaunch, detached-window close,
  and reconnect recover to the same lawful focus target or surface explicit invalidation instead of
  silently reopening a shell root
- native scene-restoration payloads SHALL also preserve the grouped
  `cross_device_continuity_contract` so primary scenes and secondary support windows keep the same
  object anchor, route or parent-scene identity, masking posture, session lineage, and support-only
  window policy instead of reattaching under a different shell or a broader visibility basis
- diagnostic bundles SHALL include contract/version identifiers and correlation refs, but SHALL
  remain redaction-safe by default and require explicit governed export posture for richer payloads

## 12. Performance strategy

To outperform the browser meaningfully, optimize these paths:

- snapshot decode and projection on background actors
- incremental stream application rather than full-window rerender
- list/table virtualization for large audit and evidence datasets
- lazy document preview loading
- stable identity keys for manifest/gate/evidence collections
- aggressive profiling of diff-heavy or text-heavy AppKit bridges

Native performance wins should come from better state locality and rendering control, not from moving
core compliance logic onto the client.

## 13. Delivery sequencing

### Sequence 0 - Contract freeze and capability negotiation
Stabilize the northbound snapshot/stream/receipt contracts, define compatibility windows, and add
server capability flags for native rollout.
This phase SHALL also freeze the desktop cache envelope, cursor invalidation triggers, and
masking/export-policy bindings for OS-integrated affordances before native state restoration ships.

### Sequence 1 - Read-only native shell
Ship a signed internal macOS app that can authenticate, hydrate snapshots, stream live state, and
render the calm shell, work inbox, work-item collaboration workspace, and investigation windows.

### Sequence 2 - Command-capable native workflows
Add safe command flows for review, override initiation, packet preparation, work-item assignment,
internal/customer collaboration actions, and other typed actions that already exist northbound.

### Sequence 3 - AppKit acceleration surfaces
Move the heaviest investigation views (audit, provenance, diffs, large tables) onto AppKit-backed
components where profiling justifies it.

### Sequence 4 - Workflow consolidation
Retire browser-only operator dependencies, preserve browser access only for low-risk fallback or
admin/help surfaces, and make the macOS workspace the primary operator tool.

## 14. Acceptance criteria

The native workspace SHALL satisfy all of the following acceptance criteria:

- desktop cold start to first meaningful shell is materially faster than the supported browser embodiment
- reconnect and rebase semantics match the northbound contract exactly
- stale-view rejection and duplicate suppression behave identically across browser and native clients
- manifest-shell and collaboration-workspace streams both preserve ordered, resume-safe, typed delta behavior
- native windows, inspectors, and handoff return paths preserve same-object same-shell behavior instead of reopening the wrong tenant, object family, or viewer context
- the same manifest or work item remains in the same scene identity, dominant question, and
  settlement posture across resize, reconnect, and restoration; detached inspectors never create an
  alternate shell contract
- command receipts, duplicate replays, and typed stale-view failures behave identically across browser and native clients
- evidence-heavy investigation flows remain responsive at production dataset sizes
- native authentication, cache handling, and diagnostics pass security review
- incompatible cached projections are discarded before first paint rather than rendered under the
  wrong tenant, masking posture, or contract window
- scene restoration never reopens a manifest or work-item context after tenant switch, privilege
  downgrade, masking change, or cursor revocation without a fresh compatible snapshot
- offline posture never queues blind filing-capable, approval-capable, or authority-mutating commands
- Quick Look, notifications, `NSUserActivity`, and local indexing stay within masking/export policy
- the macOS workspace can serve as a first-class daily operator tool without re-implementing engine legality on device

## 15. One-sentence summary

The native macOS operator workspace is a **SwiftUI-first, AppKit-accelerated, server-authoritative desktop workspace** that preserves the algorithmic contracts while providing a first-class desktop embodiment for decision work, collaboration, and investigation.
Native operator scenes SHALL mirror the shared `state_taxonomy_contract` from their backing shell so
inline refresh, read-only degraded posture, and supersession-driven recovery cannot drift between
the canonical calm-shell contracts and the macOS embodiment.
They SHALL also mirror `semantic_accessibility_contract` so `accessibilityIdentifier` values,
native focus order, support-region reachability, live-update announcements, and current-vs-history
artifact anchors stay aligned with the governing calm-shell semantics.
They SHALL additionally participate in `semantic_accessibility_regression_pack` cases so XCUITest
coverage proves primary scenes and detached secondary windows keep the same semantic anchor refs,
screen-reader path, reduced-motion recovery story, non-modal support behavior, and parent return
control.
## FE-25 Cache Isolation

Native operator primary and secondary scenes now bind `cache_isolation_contract` in addition to route continuity and restoration contracts. The primary scene must stay exact to tenant, access, masking, route, object, and guard hash; detached secondary windows also bind `preview_subject_ref_or_null` so evidence or compare previews cannot be replayed into a broader or different mounted context. The same cache boundary now carries one `delivery_binding_hash` plus temporary-artifact purge policy so Quick Look, print-preview, export staging, and drag-out helpers must discard any temp artifact whose invoking tenant, masking, or selected preview subject has drifted.

## FE-75 Native Cache Hydration, Purge, and Rebase

Native primary scenes, detached secondary windows, `ExperienceCursor`, and `WorkspaceCursor` now
also bind `native_cache_hydration_contract`. That shared contract freezes:

- the pre-paint legality envelope for tenant, principal, session lineage, masking, route, object,
  schema window, and projection guard
- the current lawful resume binding that may survive hydration
- whether restoration may reopen the same object in the same shell
- the regulated local-artifact purge inventory for structured cache, resume metadata,
  scene-restoration payloads, `NSUserActivity`, previews, temporary exports, and local indices

The native automation proof artifact is `native_cache_hydration_automation_pack`. It SHALL cover
compatible cold start, schema incompatibility, tenant switch, privilege downgrade, session
revocation, cache-only restore that still requires live rebase before mutation, and secondary-window
masking purge.
