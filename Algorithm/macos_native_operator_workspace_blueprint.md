# Native macOS Operator Workspace Blueprint

## Purpose

This blueprint defines how to migrate the existing web-based Internal Operator Workspace into a
signed, notarized, high-performance macOS application built in Xcode without changing the legal or
algorithmic authority of the server-side engine.

The migration goal is not a screen-for-screen port of the browser UI. It is a separation-of-concerns
move:

- keep `RunManifest`, gate logic, provenance, filing, authority interaction, and audit truth on the
  platform;
- move operator ergonomics, local projection caching, keyboard-first workflows, and high-density
  investigation tooling into a native desktop shell;
- preserve the northbound command/read contract so the native client remains a projection-and-command
  surface rather than a second compliance engine.

## 1. Architectural thesis

The strongest native embodiment is a **server-authoritative desktop client**:

1. the backend remains the source of legal truth;
2. the macOS app materializes cached projections of `DecisionBundle`, `ExperienceDelta`, audit, and
   enquiry surfaces;
3. user actions become typed commands carrying the same stale-view guards and idempotency semantics as
   the web product;
4. native-only state is restricted to view composition, local drafts that are explicitly non-legal,
   navigation history, search indices, and performance caches.

This preserves the invariant that native speed never outruns backend legality.

## 2. Migration guardrails

- The app SHALL NOT re-implement filing, gate, trust, or amendment legality in Swift.
- Local persistence SHALL be disposable and rebuildable from platform truth.
- The app MAY optimistically show command acceptance or a pending receipt, but SHALL NOT fabricate
  legal terminal state before the backend publishes it.
- Browser-era concepts such as route stacks, cookie jars, and `localStorage` SHALL be replaced by
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
- manifest, gate, trust, evidence, workflow, and authority presentation reducers
- serialization rules for server-authored artifacts

### C. `Packages/OperatorPlatformSDK`
The boundary between desktop UI and platform services.

Responsibilities:

- `URLSession` command client
- ordered stream client for `ExperienceDelta`
- snapshot hydration and rebase helpers
- auth/session adapters
- capability negotiation and API-version compatibility checks

### D. `Packages/OperatorPersistence`
Durable local cache and investigation state.

Responsibilities:

- SQLite/Core Data-backed storage for snapshots, bundles, resume metadata, and pinned work
- tenant- and masking-aware cache invalidation
- local search indexing for read-side artifacts
- migration and corruption-recovery rules for desktop persistence

### E. `Packages/OperatorUI`
The reusable native design system.

Responsibilities:

- calm-shell primitives (`CONTEXT_BAR`, `DECISION_SUMMARY`, `ACTION_STRIP`, inspector surfaces)
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

## 4. Web-to-native translation map

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
- `NSViewRepresentable` bridges only where profiling proves SwiftUI is not the right tool

## 5. Preferred window and scene architecture

### Primary workspace window
Use a three-region native shell:

1. leading sidebar for manifest/work queue selection
2. center content area for the calm shell
3. trailing inspector for `DETAIL_DRAWER` depth

The operator should be able to collapse or detach the inspector without losing decision context.

### Secondary windows
Create dedicated scenes for:

- manifest lineage comparison
- audit trail and provenance exploration
- filing packet review / export
- authority interaction review
- drift/amendment comparison

This maps better to desktop deep work than stacking browser tabs and nested drawers.

### Commands and menus
Promote high-frequency actions into native command surfaces:

- manifest search
- toggle inspector
- open lineage / audit / compare windows
- rebase or refresh current manifest
- copy manifest identifiers, hashes, or evidence coordinates
- start step-up, review, or packet preparation actions where policy allows

## 6. Data flow and synchronization model

The app should follow this read path:

1. load last compatible snapshot from local persistence;
2. render immediately in a clearly marked cached posture;
3. fetch `GET /v1/manifests/{manifest_id}/experience/snapshot`;
4. reconcile local cache with server snapshot;
5. attach to `GET /v1/manifests/{manifest_id}/experience/stream?resume_token=...`;
6. apply deltas by `experience_sequence`;
7. rebase when `frame_epoch` changes.

The command path should follow this write path:

1. operator triggers a typed intent;
2. the app captures stale-view guards from the current snapshot;
3. the app emits a northbound command with `command_id` and `idempotency_key`;
4. the UI shows only receipt-pending/post-submission posture;
5. terminal legality changes arrive from the backend read side, not from local mutation guesses.

## 7. Authentication and session strategy

Use platform-native authentication primitives rather than embedded credential UX.

Recommended posture:

- product authentication and step-up through `ASWebAuthenticationSession` or equivalent
  system-browser-managed flows
- Keychain-backed storage for product session material
- no raw authority credentials on device
- explicit tenant/account switching that also purges incompatible local caches
- session restoration only when both the local cache and the server session remain valid

Authority-owned or HMRC-online-services-only tasks should open in the default system browser, not an
unrestricted in-app web shell.

## 8. Persistence model

Persist only what improves speed, continuity, and investigation quality without challenging backend
authority.

Persist locally:

- cached `DecisionBundle` and `ExperienceDelta` snapshots
- non-legal workspace state such as pinned evidence, compare selections, expanded inspectors, and
  recent manifest lists
- redaction-safe search indices
- queued diagnostics for later export

Do not persist locally as authoritative truth:

- raw authority access tokens
- unsent filing legality decisions
- client-generated workflow conclusions
- unbounded copies of regulated payload bodies where a referenced artifact is sufficient

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

## 11. Security and runtime posture for the desktop client

The app should ship with:

- code signing and notarization
- hardened runtime
- least-privilege entitlements and sandbox posture where compatible with product needs
- Keychain-only credential storage
- tenant-aware cache partitioning
- redaction-safe logging
- remote feature kill switches
- forced re-auth and cache purge on revocation, privilege downgrade, or masking change

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

## 13. Phased migration plan

### Phase 0 - Contract freeze and capability negotiation
Stabilize the northbound snapshot/stream/receipt contracts, define compatibility windows, and add
server capability flags for native rollout.

### Phase 1 - Read-only native shell
Ship a signed internal macOS app that can authenticate, hydrate snapshots, stream live state, and
render the calm shell plus investigation windows.

### Phase 2 - Command-capable native workflows
Add safe command flows for review, override initiation, packet preparation, and other typed actions
that already exist northbound.

### Phase 3 - AppKit acceleration surfaces
Move the heaviest investigation views (audit, provenance, diffs, large tables) onto AppKit-backed
components where profiling justifies it.

### Phase 4 - Workflow consolidation
Retire browser-only operator dependencies, preserve browser access only for low-risk fallback or
admin/help surfaces, and make the macOS workspace the primary operator tool.

## 14. Acceptance criteria

The migration should be considered successful when all of the following are true:

- desktop cold start to first meaningful shell is materially faster than the browser baseline
- reconnect and rebase semantics match the northbound contract exactly
- stale-view rejection and duplicate suppression behave identically across browser and native clients
- evidence-heavy investigation flows remain responsive at production dataset sizes
- native authentication, cache handling, and diagnostics pass security review
- the macOS workspace can replace the browser for daily operator work without re-implementing engine
  legality on device

## 15. One-sentence summary

Build a native macOS operator client as a **SwiftUI-first, AppKit-accelerated, server-authoritative
desktop workspace** that preserves the existing algorithmic contracts while replacing browser-era
interaction, caching, and performance constraints with first-class desktop architecture.
