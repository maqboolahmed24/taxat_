# ADR-005: Read-Model Projection Strategy

- Status: Accepted
- Date: 2026-04-18
- Deciders: Phase 00 architecture analysis pack

## Context

Taxat already names the route-level projection surfaces that matter: calm-shell manifest frames, collaboration queue and workspace snapshots with deltas, customer-safe portal workspaces, governance snapshots, and native mirrors that hydrate from the same northbound contracts. What the corpus did not previously choose in one place was the architectural doctrine behind those surfaces: whether clients should consume typed server-authored projections, compose their own route meaning from granular APIs, or operate from one giant graph payload.

The prior analysis packs normalized `45` read-model records, `31` browser/native surfaces, `10` customer-safe boundary rows, and `7` stream or refresh contracts. ADR-005 closes the remaining gap by choosing one projection strategy that keeps legal truth, customer-safe redaction, stale-view protection, and browser/native parity explicit at the server boundary.

## Decision

Adopt **server-authored, per-surface typed read models and deltas** as the default projection doctrine for Taxat:

- Each major route or scene consumes a named server-authored projection contract rather than composing legal posture from granular fragments.
- Projections remain disposable caches. Durable truth continues to live in manifest, workflow, authority, governance, receipt, and audit artifacts.
- Typed deltas are used where the corpus already defines them (`ExperienceDelta`, `WorkInboxDelta`, `WorkspaceDelta` and companions). Other surfaces prefer receipt-driven snapshot refresh over client-composed meaning.
- Customer-safe boundaries are enforced before serialization. Portal and customer-visible collaboration routes may only consume customer-safe projections and may never infer staff-only meaning from hidden fields.
- Native clients hydrate from the same northbound projections and stale/recovery contracts as browser routes; they do not define a separate business-logic stack.

## Decision Drivers

| Driver | Priority | Weight | Why It Matters |
| --- | --- | --- | --- |
| Legal truth separation | HARD_REQUIREMENT | 16 | Projection architecture must preserve the separation between authority truth, internal workflow truth, and customer-safe mirrors so no client cache or UI fragment can become legal meaning. |
| Staff versus customer-safe visibility control | HARD_REQUIREMENT | 12 | The architecture must enforce customer-safe projection boundaries before serialization so portal and customer-visible collaboration routes cannot infer staff-only context. |
| Same-object and same-shell continuity | HARD_REQUIREMENT | 10 | Rebase, reconnect, notification-open, and responsive collapse must preserve the same object and shell identity where the object still resolves. |
| Browser/native parity without duplicate business logic | HARD_REQUIREMENT | 10 | Web and native clients must share projection semantics and interaction-layer contracts rather than reimplementing business logic independently. |
| Stream delta and reconnect fitness | HARD_REQUIREMENT | 10 | The chosen projection strategy must fit monotonic deltas, resume tokens, duplicate idempotency, and typed catch-up rules. |
| Stale-view protection and rebase clarity | HARD_REQUIREMENT | 10 | Stale-view rejection, rebase, and recovery must remain explicit server-authored contracts so clients do not guess what changed. |
| Rebuildability from durable truth | HARD_REQUIREMENT | 9 | Streams, caches, and native hydrators must remain disposable and fully rebuildable from durable truth without hidden heuristics. |
| Schema evolution and reader-window safety | HARD_REQUIREMENT | 8 | Projection contracts need stable versioning and reader-window rules so web, native, and tests can survive additive change while failing closed on incompatible drift. |
| Performance and cache invalidation complexity | TRADEOFF | 6 | Projection design must keep cache invalidation explicit and affordable without pushing semantic composition or truth leakage to the clients. |
| Testing determinism and fixture friendliness | STRONG_PREFERENCE | 5 | Stable read-model envelopes and selectors make Playwright, API, and native tests deterministic and easier to fixture. |
| Operational simplicity and debuggability | TRADEOFF | 4 | The projection doctrine should be explainable in production incidents without hiding critical semantics inside client code or one giant graph query. |

## Projection Ownership

| Projection Family | Representative Read Models | Generation Mode | Owning Boundary |
| --- | --- | --- | --- |
| Manifest calm-shell projections | ActionStripState, ContextBarState, DecisionBundle, DecisionSummaryState, DetailDrawerState ... | PRECOMPUTED_FRAME_WITH_STREAM_COMPANION | MANIFEST_READ_MODEL_BOUNDARY |
| Collaboration queue and notification projections | WorkInboxDelta, WorkInboxSnapshot, WorkItemNotification | PRECOMPUTED_QUEUE_ROWS_WITH_MONOTONIC_DELTA | COLLABORATION_QUEUE_PROJECTION_BOUNDARY |
| Collaboration workspace and customer-request projections | CollaborationActivitySlice, CollaborationAttachmentSlice, CustomerRequestListSnapshot, WorkspaceCursor, WorkspaceDelta ... | PRECOMPUTED_WORKSPACE_WITH_PAGED_SUPPORT_SLICES | COLLABORATION_WORKSPACE_PROJECTION_BOUNDARY |
| Portal customer-safe projections | ClientApprovalPack, ClientDocumentRequest, ClientOnboardingJourney, ClientPortalWorkspace, ClientTimelineEvent ... | PRECOMPUTED_ROUTE_SNAPSHOT_WITH_RECEIPT_DRIVEN_REHYDRATION | PORTAL_CUSTOMER_SAFE_PROJECTION_BOUNDARY |
| Governance read models and simulation projections | AuditInvestigationFrame, AuthorityLinkInventoryItem, GovernanceAccessSimulation, GovernancePolicySnapshot, GovernanceRiskLedger ... | PRECOMPUTED_ROUTE_SNAPSHOTS_WITH_ON_DEMAND_SIMULATION | GOVERNANCE_PROJECTION_BOUNDARY |
| Native cached mirrors | NativeOperatorSecondaryWindowScene, NativeOperatorWorkspaceScene | ON_DEMAND_HYDRATION_WITH_TYPED_RESUME | NATIVE_CACHE_HYDRATION_BOUNDARY |
| Ops and analytics projections | AuthorityIngressInvestigationSnapshot, AuthorityReconciliationAnalyticsSnapshot, FailureLifecycleDashboard, OperatorMorningDigest | BATCH_OR_ON_DEMAND_DERIVATION | OPS_ANALYTICS_PROJECTION_BOUNDARY |

The decisive pattern is consistent across families: durable truth settles first, a named server-side projector translates that truth into a route-safe projection, typed refresh or delta contracts deliver it, and browser/native clients limit themselves to local view-state composition such as selection, scroll position, drawer state, or draft continuation.

## Route And Shell Binding

| Representative Surface | Shell Family | Projection Contract | Primary Read Models |
| --- | --- | --- | --- |
| Calm Manifest Workspace | CALM_SHELL | SERVER_AUTHORED_CALM_SHELL_SNAPSHOT_AND_DELTA | DecisionBundle, LowNoiseExperienceFrame, ExperienceCursor, ExperienceDelta, ExperienceStreamEvent |
| Staff work-item workspace | CALM_SHELL | SERVER_AUTHORED_WORKSPACE_SNAPSHOT_AND_DELTA | WorkspaceSnapshot, WorkspaceDelta |
| Portal home | CLIENT_PORTAL_SHELL | SERVER_AUTHORED_CUSTOMER_SAFE_ROUTE_PROJECTION | ClientPortalWorkspace, ClientTimelineEvent |
| Governance overview | GOVERNANCE_DENSITY_SHELL | SERVER_AUTHORED_GOVERNANCE_SNAPSHOT | TenantGovernanceSnapshot |
| Primary work-item scene | CALM_SHELL | SERVER_AUTHORED_NORTHBOUND_SNAPSHOT_WITH_DISPOSABLE_NATIVE_CACHE | WorkspaceSnapshot, WorkspaceDelta, WorkspaceCursor |

This is the operational reason the doctrine wins. Same-object and same-shell continuity only stays trustworthy when the mounted route already carries the exact projection, stale-guard, visibility, and return-path contract the client needs. Taxat's shell law does not want the browser or native layer reconstructing that from unrelated APIs.

## Customer-Safe Boundary Summary

| Read Model | Surface Scope | Blocked Internal Families | First Forbidden Inference |
| --- | --- | --- | --- |
| ClientPortalWorkspace | PORTAL_WORKSPACE | ASSIGNMENT_STATE, ESCALATION_LOGIC, RAW_GATE_STATE, STAFF_REASON_CODES, ... | No derivation from staff-only notes, assignee posture, escalation reasoning, or raw gate explanations. |
| CustomerRequestListSnapshot | PORTAL_REQUEST_LIST | ASSIGNMENT_STATE, ESCALATION_LOGIC, RAW_GATE_STATE, STAFF_REASON_CODES, ... | No list reordering from hidden staff activity or internal unread counts. |
| WorkspaceSnapshot | CUSTOMER_VISIBLE_COLLABORATION_DETAIL | ASSIGNMENT_STATE, ESCALATION_LOGIC, RAW_GATE_STATE, STAFF_REASON_CODES, ... | No customer-visible workspace route may point at internal activity, linked context, or audit trail. |
| CollaborationActivitySlice | COLLABORATION_ACTIVITY_SLICE | ASSIGNMENT_STATE, ESCALATION_LOGIC, RAW_GATE_STATE, STAFF_REASON_CODES, ... | No hidden internal thread activity or unread counts may leak through paging or return cursors. |
| CollaborationAttachmentSlice | COLLABORATION_ATTACHMENT_SLICE | ASSIGNMENT_STATE, ESCALATION_LOGIC, RAW_GATE_STATE, STAFF_REASON_CODES, ... | No customer-visible attachment read may expose pending internal placeholders or internal-only attachment metadata. |

Customer-safe projection is not a UI preference; it is a projection boundary. The server must block `ASSIGNMENT_STATE, ESCALATION_LOGIC, RAW_GATE_STATE, STAFF_REASON_CODES, AUDIT_LINEAGE, INTERNAL_ACTIVITY, INTERNAL_ATTACHMENTS, INTERNAL_PARTICIPANTS, INTERNAL_COUNTS, STAFF_ROUTE_CONTEXT` at the projection source, flatten internal workflow posture into customer-safe language, and keep authority certainty explicit rather than optimistic.

## Generation And Rebuild Posture

- Manifest and collaboration routes use precomputed snapshots plus typed deltas or cursors, because those surfaces need strong reconnect, rebase, and same-shell continuity guarantees.
- Portal routes use server-authored customer-safe snapshots with receipt-driven refresh because customer-safe posture, stale-view protection, and continuity are more important than exposing raw internal deltas.
- Governance routes use server-authored snapshots and simulation outputs keyed by basis hashes so stale policy meaning never lives in local UI state.
- Native scenes hydrate the same northbound snapshots and deltas but treat local persistence as disposable; purge and rehydrate wins over local truth invention.

## Alternatives Considered

| Alternative | Weighted Score | Rank |
| --- | --- | --- |
| 1 | Server-authored per-surface typed read models and deltas | 92.35 |
| 2 | Thin backend plus client-composed view models from granular APIs | 59.25 |
| 3 | Large unified graph or mega-workspace model with client-heavy selection and composition | 45.35 |

The winning option is **Server-authored per-surface typed read models and deltas** with a weighted score of `92.35`.

## Why This Option Wins

- It is the only option that makes the named Taxat route models first-class rather than incidental. The corpus already behaves as if these projections exist; ADR-005 formalizes that doctrine.
- It keeps customer-safe redaction at the projection source, where it can be tested and audited, instead of treating redaction as a client coding convention.
- It preserves same-object continuity because route-level projections can carry the exact shell stability tokens, stale guards, and fallback anchors required for rebase.
- It gives browser and native clients one shared business meaning while still allowing each embodiment to restack or present support surfaces differently.
- It keeps restore, replay, and cache invalidation tractable because streams, browser caches, and native caches remain disposable and rebuildable from durable truth.

## Guardrails On The Decision

- Projections SHALL NOT become legal truth.
- Portal and other customer-safe surfaces SHALL NOT serialize hidden staff context, internal notes, internal queue posture, or stronger authority certainty than the truth contract permits.
- Clients MAY preserve local view state, drafts, and focus anchors, but SHALL NOT derive assignment, escalation, gate posture, or settlement legality from hidden fragments.
- Stream deltas, browser caches, and native caches SHALL remain disposable and rebuildable from durable truth.
- Rebase after stale-view rejection SHALL preserve the same object, shell, and dominant meaning where the object still resolves.
- Historical and current artifact posture SHALL remain distinct wherever the route contract requires it.

## Consequences

Positive consequences:

- Backend, web, and native teams now share one projection doctrine: named route surfaces, explicit redaction rules, typed stale/recovery posture, and disposable caches.
- Tests become easier to author because projections and selectors are more deterministic than multi-API client composition.
- Production debugging improves because each surface has a declared owner, invalidation basis, and rebuild source.

Negative consequences and tradeoffs:

- The server owns more read-side contracts and must keep them versioned and disciplined.
- Projection sprawl becomes a real maintenance concern if later teams add surfaces without reusing the named family rules in this ADR.
- Some routes will refresh whole projections rather than exposing finer-grained client composition, which is the deliberate tradeoff for correctness and clarity.

## Deferred Decisions

- PORTAL_READ_PATH_LITERALS_NOT_FULLY_ENUMERATED: The portal contract fully enumerates route semantics and read models, but does not publish every literal northbound path per route.
- PORTAL_COMMAND_ENUMS_NORMALIZED_FROM_PROSE: Portal flow documents describe upload, approval, onboarding, and support action families more strongly than a literal complete command enum.
- GOVERNANCE_MUTATION_ENUMS_NORMALIZED_FROM_PROSE: Governance routes define staged mutations, basis hashes, and approval posture explicitly, but not a complete per-route mutation enum.
- MANIFEST_FOCUS_ROUTE_NORMALIZED: The collaboration contract explicitly names `/manifests/{manifest_id}?focus=workflow:{item_id}`, but other manifest route literals are distributed across the corpus rather than centralized.
- NATIVE_WINDOWS_ARE_ROUTELESS_SUPPORT_OVERLAYS: Detached native support windows are not browser routes and must not be treated as a fourth shell family.

These are deferred because ADR-005 is choosing projection doctrine, not locking exact URL literals, vendor cache products, or every future route/module split.

## References

- Read-model catalog: [read_model_catalog_and_owner_map.json](/Users/test/Code/taxat_/data/analysis/read_model_catalog_and_owner_map.json)
- Route and shell map: [read_model_to_route_and_shell_map.json](/Users/test/Code/taxat_/data/analysis/read_model_to_route_and_shell_map.json)
- Generation and rebuild policy: [projection_generation_and_rebuild_policy.json](/Users/test/Code/taxat_/data/analysis/projection_generation_and_rebuild_policy.json)
- Customer-safe boundary matrix: [customer_safe_projection_boundary_matrix.json](/Users/test/Code/taxat_/data/analysis/customer_safe_projection_boundary_matrix.json)
- Stream and refresh contracts: [projection_stream_delta_contracts.json](/Users/test/Code/taxat_/data/analysis/projection_stream_delta_contracts.json)
- Version and staleness policy: [projection_version_and_staleness_policy.json](/Users/test/Code/taxat_/data/analysis/projection_version_and_staleness_policy.json)
- Scorecard: [ADR-005-read-model-projection-strategy-scorecard.json](/Users/test/Code/taxat_/docs/architecture/adr/ADR-005-read-model-projection-strategy-scorecard.json)
- Comparison notes: [ADR-005-read-model-projection-strategy-comparison.md](/Users/test/Code/taxat_/docs/architecture/adr/ADR-005-read-model-projection-strategy-comparison.md)
- Decision diagram: [ADR-005-read-model-projection-strategy.mmd](/Users/test/Code/taxat_/diagrams/analysis/ADR-005-read-model-projection-strategy.mmd)
