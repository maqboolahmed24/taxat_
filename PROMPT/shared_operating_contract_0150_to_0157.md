# Shared Operating Contract for `pc_0150` to `pc_0157`

This contract governs the workflow projection tranche that turns workflow/domain truth into route-safe staff and client read models, formalizes customer-safe and visibility-partition enforcement, establishes the first durable failure-lineage workspace, stamps same-object cross-device continuity metadata, computes quantitative queue-health posture, and introduces the first northbound command-edge receipt boundary.

## Read this first

1. Re-read `../AGENT.md` and the exact checklist rows for `pc_0150` through `pc_0157`.
2. Consume the already-authored cards that this tranche depends on, especially `pc_0145` through `pc_0149`.
3. Treat the Taxat algorithm corpus as the source of truth. Browser previews, debug harnesses, and convenient DTOs are downstream only.
4. Do not collapse workflow truth, authority truth, projection truth, and transport truth into one object.
5. Every persisted artifact introduced in this tranche MUST validate against its canonical schema before it is treated as accepted output.

## Canonical reading order for this tranche

1. Workflow foundations already established in earlier cards:
   - `pc_0145` `WorkflowItem`
   - `pc_0146` routing / queue scoring / assignment recommendations
   - `pc_0147` collaboration thread / entry persistence
   - `pc_0148` request-info / attachment / participant models
   - `pc_0149` work-item notification and same-object notification-open continuity

2. Core Taxat corpus:
   - `README.md`
   - `core_engine.md`
   - `modules.md`
   - `data_model.md`
   - `state_machines.md`
   - `constraint_coverage_index.md`
   - `contract_integrity_requirements.md`
   - `invariant_enforcement_and_fail_closed_contract.md`
   - `replay_and_reproducibility_contract.md`
   - `observability_and_audit_contract.md`
   - `error_model_and_remediation_model.md`
   - `audit_and_provenance.md`

3. Task-specific contracts for this tranche:
   - `collaboration_workspace_contract.md`
   - `customer_client_portal_experience_contract.md`
   - `frontend_shell_and_interaction_law.md`
   - `low_noise_experience_contract.md`
   - `semantic_selector_and_accessibility_contract.md`
   - `semantic_selector_and_accessibility_regression_pack_contract.md`
   - `cross_device_continuity_and_restoration_contract.md`
   - `focus_restoration_and_return_target_harness_contract.md`
   - `cache_isolation_and_secure_reuse_contract.md`
   - `failure_lifecycle_dashboard_and_lineage_contract.md`
   - `failure_resolution_ownership_and_closure_contract.md`
   - `retention_error_and_observability_contract.md`
   - `compute_parity_and_trust_formulas.md`
   - `northbound_api_and_session_contract.md`
   - `admin_governance_console_architecture.md`
   - `UIUX_DESIGN_SKILL.md`
   - `PATCH_RESOLUTION_INDEX.md`
   - `AUDIT_FINDINGS.md`
   - `test_vectors.md`

4. Authoritative executable artifacts:
   - every relevant file under `Algorithm/schemas/`
   - `scripts/validate_contracts.py`
   - `tools/forensic_contract_guard.py`
   Treat schema rules and validator-enforced invariants as authoritative.
   Human-readable docs, example payloads, previews, and charts are secondary.

5. External implementation guidance that may sharpen technique but never override Taxat semantics:
   - current Playwright guidance for semantic locators, auto-waiting, actionability-safe interactions, traces, and API-level contract testing;
   - current Apple HIG and Material guidance for typography hierarchy, readable layout width, restrained motion, and accessible color roles when this tranche introduces browser-visible preview surfaces.

## Package and implementation placement rules

- `pc_0150` through `pc_0156` belong in the workflow domain package selected by `pc_0028`.
  If it does not exist, create `packages/backend-workflow` and emit `ASSUMPTION_BACKEND_WORKFLOW_PACKAGE_CREATED`.

- `pc_0150`, `pc_0151`, `pc_0154`, `pc_0155`, and `pc_0156` MAY add thin read-only preview / inspection harnesses when that is the fastest way to verify projector semantics in a real browser shell.
  Use:
  - `apps/admin-console-web` for staff / operator previews
  - `apps/client-portal-web` for portal previews
  - `packages/shared-ui` for shared presentational primitives only
  Do not expand a preview into a second product or dashboard system.

- `pc_0152` may introduce shared projection-boundary helpers inside `packages/backend-workflow/src/contracts` or a narrowly-scoped shared package, but it MUST preserve one canonical implementation and MUST NOT fork one “portal-safe” helper per route family.

- `pc_0153` and `pc_0154` belong in `packages/backend-workflow`; if reusable failure-resolution helpers are more broadly useful, place them in a shared failure submodule within that package rather than a new top-level package.

- `pc_0157` belongs in the northbound/control-plane package chosen by `pc_0028`.
  If it does not exist, create `packages/backend-northbound` and emit `ASSUMPTION_BACKEND_NORTHBOUND_PACKAGE_CREATED`.

- Reuse generated schema bindings and contract helpers from `pc_0061`, exact-config / hash / id helpers from `pc_0064` through `pc_0069`, stream / continuity helpers from `pc_0070` through `pc_0077`, access-control helpers from `pc_0086` through `pc_0093`, session / stale-guard helpers from `pc_0094` through `pc_0101`, and manifest / collection / compute / authority / workflow outputs from `pc_0102` through `pc_0149` whenever those outputs exist.
  There must be one canonical implementation for schema validation, exact ordering, queue basis hashing, customer-safe boundary binding, route continuity, focus restoration, stale-guard handling, and command receipt hashing.

- Respect tranche boundaries.
  This block may complete:
  - workflow read-model projectors;
  - customer-safe / visibility-partition enforcement;
  - remediation / compensation / accepted-risk / investigation / failure-dashboard artifacts;
  - cross-device continuity and focus-return metadata persistence for workflow-owned surfaces;
  - quantitative queue-health services;
  - the first `POST /v1/commands` endpoint and durable `ApiCommandReceipt` store.
  It MUST NOT silently absorb later northbound GET endpoints, later SSE surfaces, or future portal/detail implementation cards except for the smallest shared helper or preview harness required to keep these tasks executable.

## Shared design contract for browser-visible surfaces in this block

This tranche is mostly backend-first, but several cards materialize route-owned read models or read-only preview harnesses.
Whenever you need a browser-visible surface for verification, keep it consistent with the following language.

### Surface families in scope

- `WorkspaceSnapshot` preview / verification surface in `CALM_SHELL`
- `CustomerRequestListSnapshot` preview / verification surface in `CLIENT_PORTAL_SHELL`
- `WorkInboxSnapshot` preview / verification surface in `CALM_SHELL`
- `FailureLifecycleDashboard` read-only operator inspection surface
- continuity / route-anchor inspectors for `cross_device_continuity_contract` and focus-return metadata
- optional command-receipt inspector only if a diagnostic browser surface is the fastest verification path for `pc_0157`

### Visual language

- Overall posture: minimalist premium, quiet, typography-led, no generic dashboard walls
- Background: `#F7F5F0`
- Primary surface: `#FFFFFF`
- Secondary surface: `#F1F5F3`
- Elevated surface: `#FCFCFB`
- Primary ink: `#171717`
- Secondary text: `#667085`
- Calm accent: `#0F766E`
- Portal-safe accent: `#1D4ED8`
- Warning: `#B7791F`
- Danger: `#C2410C`
- Borders: `rgba(23,23,23,0.08)`
- Shadow: `0 8px 24px rgba(23,23,23,0.06)` maximum
- Typography stack: `Inter`, `SF Pro Text`, `Segoe UI`, sans-serif
- Monospace stack: `ui-monospace`, `SFMono-Regular`, `Consolas`, monospace

### Type scale

- page title: `32/38`, semibold
- section title: `20/28`, semibold
- panel title: `16/24`, semibold
- label / eyebrow: `12/16`, medium, `0.04em` tracking
- body: `14/22`, regular
- helper / timestamp / reason text: `12/18`, regular
- ids / hashes / route refs / anchor refs: `12/18`, medium monospace

### Layout rules

- portal max width: `1180px`
- internal preview max width: `1440px`
- outer padding: `24px` mobile, `32px` desktop
- gutters: `20px`
- radius: `18px` to `20px`
- one dominant column plus at most one restrained contextual rail
- avoid metric mosaics, donut charts, speedometers, and three-column dashboard walls
- row and panel groups must preserve the route-visible semantic order from the governing shell contracts

### Motion and interaction

- allow only opacity / translate / height disclosure motion
- duration band: `140ms` to `180ms`
- no bounce, parallax, looped decorative animation, or semantic-priority-changing motion
- reduced-motion support is mandatory
- focus order MUST follow visible semantic order
- live updates MUST never steal focus from active composers, pickers, or compare controls

### Charts / diagrams / logos

Use a diagram only when it clarifies a contract faster than prose.
Preferred forms in this tranche:
- one compact route / focus / fallback map;
- one queue-health band or tiny pressure strip;
- one lineage ribbon for failure posture;
- one reason matrix or ordered evidence table.

Do NOT use decorative logos, donut charts, heatmaps without numeric legends, or theatrical analytics treatments.

## Non-negotiable interpretation rules

- `WorkflowItem` is coordination truth. `WorkspaceSnapshot`, `CustomerRequestListSnapshot`, `WorkInboxSnapshot`, `WorkInboxDelta`, `CollaborationActivitySlice`, and `FailureLifecycleDashboard` are read models only.
  They MUST be rebuilt from persisted domain truth, not promoted back into truth.

- `customer_safe_projection` and `visibility_partition` are explicit contracts, not inferred privacy hints.
  Customer-safe rows, detail routes, activity slices, attachments, notifications, and portal surfaces MUST remain bound to the exact access-binding hash, masking-posture fingerprint, and visibility cache partition that produced them.

- `WorkspaceSnapshot`, `CustomerRequestListSnapshot`, `WorkItemNotification`, and any contextual request-detail or portal derivative MUST preserve same-object same-shell continuity.
  Route identity, parent return, focus anchors, fallback order, and invalidation posture are server-authored.
  Browser history guesses do not count as continuity.

- `WorkInboxSnapshot` and `WorkInboxDelta` MUST consume the persisted routing and queue-health contracts.
  Queue order, badge updates, reorder deferral, escalation posture, and recommendation copy MUST NOT be recomputed from unread counts, websocket arrival order, or local client heuristics.

- `FailureLifecycleDashboard` MUST be built from typed lifecycle objects, workflow state, audit refs, and provenance refs only.
  Logs, message copy, and free-text notes may explain behavior, but they cannot define lifecycle truth.

- `AcceptedRiskApproval` expiry and accountable owner are first-class state.
  Active accepted-risk posture without a future expiry and a current owner is invalid.

- `ApiCommandReceipt` is durable command-edge evidence.
  It MUST preserve the true command target, the exact mutation precondition binding, duplicate-suppression lineage, and at least one authoritative recovery anchor for every success-class receipt.
  `latest_projection_ref` is an observational mirror only and is never sufficient on its own.

- `POST /v1/commands` is the only product-facing write edge for manifest-adjacent, work-item, and governance truth.
  Upload bytes are explicitly out of scope for that endpoint.

- Typed stale-view guard families remain scope-specific.
  Manifest-shell guards, workspace/version guards, request-state guards, portal workspace guards, and governance simulation guards MUST NOT drift across command families.
