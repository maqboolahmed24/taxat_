# Admin / Governance Console Architecture

## Purpose
This document defines the end-to-end frontend architecture for the broader product's
Admin/Governance Console.
It translates the engine's actor, authority, retention, audit, and northbound-command contracts into
an implementation-ready control-plane interface.
The goal is to give tenant administrators, auditors, compliance leads, and support operators a
high-control workspace for changing policy safely, verifying authority correctness, and reconstructing
governance history without collapsing everything into a generic settings dashboard.

## 1. Experience thesis
The Admin/Governance Console SHALL behave like a governed control plane, not a marketing-style
`settings area` and not a variant of the calm decision shell.
Users in this surface need to compare policy, identity, delegation, authority-link health,
retention posture, and audit evidence side by side.
The console is therefore allowed to be denser than the decision workspace, but it SHALL remain
low-noise through disciplined grouping, staged mutation, stable scope, and explicit blast-radius
communication.

The console should let an operator answer five questions in one short scan:

1. what tenant, client scope, and environment am I governing right now
2. which control object am I changing or inspecting
3. what legal or policy prerequisites gate that change
4. what downstream blast radius the change carries
5. what append-only audit evidence will prove the change later

## 2. Profile boundary and shell contract
The decision workspace uses the calm-shell profile from `low_noise_experience_contract.md`.
The Admin/Governance Console uses a distinct **governance-density profile** with five persistent
regions:

1. `GOVERNANCE_CONTEXT_BAR`
2. `SECTION_NAV`
3. `INVENTORY_RAIL`
4. `WORKSPACE_CANVAS`
5. `AUDIT_SIDECAR`

This profile differs from the calm shell in three critical ways:

- explicit `DENY`, `MASKED`, `STEP_UP`, and `APPROVAL_REQUIRED` states remain visible because the
  product is inspecting or editing policy itself
- dense tables, matrices, and split views are acceptable when paired with stable filters, strong row
  selection, and an always-available inspector/audit context
- mutation is never immediate for materially risky changes; every risky action is staged through a
  change basket, diff preview, and approval or step-up checkpoint

## 3. Primary operator roles and jobs

### A. `TENANT_ADMIN`
Needs to configure tenant-wide policy, manage principals, assign scoped roles, review authority-link
health, and stage changes for approval.

### B. `AUDITOR`
Needs immutable access to privilege history, authority-link events, retention actions, legal holds,
and exportable audit slices.
The auditor primarily investigates and exports; they do not routinely mutate live policy.

### C. `APPROVER` / compliance lead
Needs to review staged changes, compare before/after policy, inspect required rationale, satisfy
step-up, and approve or reject bounded exceptions.

### D. `SUPPORT_OPERATOR`
Needs read-mostly troubleshooting views: who can access what, which authority links are failing,
which retention actions are blocked, and which audit event explains the current posture.

### E. Service and external-actor reviewers
The console SHALL support inspection of `SERVICE` and `EXTERNAL` actors as first-class rows,
including service identity refs, tenant scoping, and emitted event history.

## 4. Information architecture and route map
At minimum, the console SHALL define these route families.
The route grammar may vary, but the semantic separation SHALL remain.

### 4.1 `/governance`
**Governance Overview**

Purpose:
- surface tenant-wide risk and pending action without forcing the user into a generic KPI dashboard

Layout:
- `GOVERNANCE_CONTEXT_BAR` pinned at top with tenant, environment, config mode, authn level, and
  pending-approval count
- `INVENTORY_RAIL` showing filters for environment, client scope, principal class, risk state, and
  change status
- `WORKSPACE_CANVAS` showing four bounded stacks: `Pending approvals`, `Authority-link risks`,
  `Retention exceptions`, and `Audit hotspots`
- `AUDIT_SIDECAR` showing the latest append-only governance events for the selected object

Key widgets:
- `GovernanceRiskLedger`
- `PendingChangeQueue`
- `AuthorityHealthStrip`
- `RetentionExceptionList`
- `AuditHotspotTape`

State rules:
- counts SHALL always link to a concrete filtered worklist
- any critical item SHALL expose `why now`, `affected scope`, and `next legal action`
- no overview card may become a dead-end summary tile

### 4.2 `/governance/tenant`
**Tenant Configuration**

Purpose:
- manage tenant profile, security posture, environment binding, approval policy, connector
  governance, and authority defaults

Workspace architecture:
- left sub-nav inside `WORKSPACE_CANVAS` for `Tenant profile`, `Security posture`, `Authority and
  environments`, `Connector policy`, `Approval and change control`, and `Notifications & evidence`
- center form panel with section-based editing and inline policy help
- right `BlastRadiusPanel` summarizing affected principals, clients, authority flows, and required
  approvals before commit

Interaction model:
- every mutable field stages into a `ChangeBasket`; no high-risk setting writes immediately on blur
- each staged change shows `before`, `after`, `reason required?`, `step-up required?`, and
  `approval required?`
- submitting the basket creates a command receipt and an audit-linked change request instead of
  pretending the change is complete immediately

Critical surfaces:
- `TenantConfigWorkspace`
- `ChangeBasket`
- `ApprovalComposer`
- `BlastRadiusPanel`
- `ConfigHistoryTimeline`

### 4.3 `/governance/access`
**Access & Roles**

Purpose:
- manage principals, role templates, scoped grants, and policy simulation without conflating internal
  permission with delegation or authority-link state

Route subdivisions:
- `/governance/access/principals`
- `/governance/access/roles`
- `/governance/access/simulator`

Primary layout:
- `INVENTORY_RAIL` = principal directory with filters for `principal_type`, status, role set,
  delegated clients, and recent change owner
- `WORKSPACE_CANVAS` = selected principal detail or role template matrix
- `AUDIT_SIDECAR` = recent grant changes, approval history, and object-neighborhood events

Core design requirement:
The access workspace SHALL separate four layers in one visible stack for any selected action:

1. `Session / authn posture`
2. `Tenant operational authority`
3. `Client delegation coverage`
4. `External authority-link readiness`

Where authority-of-record truth also matters, a fifth layer SHALL appear:

5. `Authority-of-record outcome / contradiction`

This stack prevents the UI from collapsing distinct legal concepts into one pass/fail icon.

Role and policy matrix rules:
- rows SHALL group by resource class
- columns SHALL group by action family
- each cell SHALL render one of `ALLOW`, `ALLOW_MASKED`, `REQUIRE_STEP_UP`,
  `REQUIRE_APPROVAL`, or `DENY`
- selecting a cell opens an inspector with reason codes, effective scope, masking rules, required
  approvals, and the exact policy path that produced the result
- `DENY` and `MASKED` states remain visible in this workspace because they are governance facts, not
  default-shell clutter

Policy simulator rules:
- the simulator SHALL accept a proposed principal, target resource, client scope, requested action,
  and requested scope tokens
- the result SHALL show both machine output and human explanation
- simulation SHALL never mutate live grants or authority links

Critical surfaces:
- `PrincipalDirectory`
- `PrincipalAccessGrid`
- `RoleTemplateEditor`
- `AuthorityChainPanel`
- `PolicySimulator`

### 4.4 `/governance/authority-links`
**Authority Links**

Purpose:
- manage the external-authority edge explicitly: link, relink, unlink, validate binding, inspect
  preflight health, and trace handshake history

Primary layout:
- `INVENTORY_RAIL` = authority-link inventory filtered by authority scope, client, provider
  environment, lifecycle state, binding health, and expiry risk
- `WORKSPACE_CANVAS` = selected link detail with `Identity`, `Client scope`, `Token binding`,
  `Provider/environment`, `Validation history`, and `Affected operations`
- `AUDIT_SIDECAR` = `AuthorityLinked`, `AuthorityRelinked`, `AuthorityBindingMismatchDetected`,
  validation, and unlink events

Interaction model:
- link or relink flows SHALL use a guided handshake stepper with explicit preflight checks rather than
  a raw credential form
- unlink flows SHALL require blast-radius preview showing affected clients, blocked authority
  operations, and any pending filings or reconciliations
- token/client mismatch, missing delegation, or environment drift SHALL render as first-class states
  in the list and detail view, not only as buried event text

Required detail modules:
- `AuthorityLinkIdentityCard`
- `BindingHealthTimeline`
- `HandshakeHistory`
- `AffectedOperationList`
- `PreflightChecklist`

### 4.5 `/governance/retention`
**Retention & Privacy**

Purpose:
- manage retention profiles, legal holds, erasure actions, and limitation impact without turning
  privacy operations into hidden back-office jobs

Route subdivisions:
- `/governance/retention/policies`
- `/governance/retention/legal-holds`
- `/governance/retention/erasure`

Primary layout:
- `INVENTORY_RAIL` = artifact class / retention class / client / hold-state filters
- `WORKSPACE_CANVAS` = either the retention policy matrix, the legal-hold register, or the erasure
  workbench
- `AUDIT_SIDECAR` = `RetentionApplied`, `RetentionLimited`, `LegalHoldApplied`,
  `LegalHoldReleased`, `ErasureRequested`, and `ErasureCompleted` events

Policy matrix rules:
- rows SHALL represent artifact or evidence classes
- columns SHALL show statutory baseline, tenant override, minimum expiry, limitation behavior,
  pseudonymisation mode, and export posture
- any override below statutory minimum SHALL be impossible to save and SHALL explain the blocking
  basis inline
- any change that increases erasure scope or shortens retention SHALL require stronger warning copy,
  step-up or approval where policy requires, and a visible blast-radius count

Legal-hold rules:
- legal holds SHALL be searchable and filterable by client, object ref, hold reason, and release
  eligibility
- release actions SHALL always show the blocked erasure items that would become eligible afterward

Erasure-workbench rules:
- the workbench SHALL show eligibility, blocked reasons, affected artifact counts, expected
  pseudonymisation actions, and projected provenance limitations before execution
- irreversible actions SHALL route through the `ChangeBasket` / `ApprovalComposer` flow rather than a
  one-click delete control

Critical surfaces:
- `RetentionPolicyMatrix`
- `LegalHoldRegister`
- `ErasureQueue`
- `RetentionImpactPreview`

### 4.6 `/governance/audit`
**Audit & Investigations**

Purpose:
- reconstruct governance-significant history across policy, access, authority-link, retention, and
  override activity

Primary layout:
- `INVENTORY_RAIL` = filters for actor, service, event family, client, manifest, authority
  operation, object ref, time window, and retention class
- `WORKSPACE_CANVAS` = append-only timeline plus selected event neighborhood / object timeline / diff
- `AUDIT_SIDECAR` = integrity markers, correlation keys, export eligibility, and active saved-view
  metadata

Audit requirements:
- the event list SHALL preserve append-only order and make event-family distinctions visible
- selecting an event SHALL reveal both upstream and downstream neighbors, not just the single record
- privilege, authority-link, retention, and override changes SHALL expose before/after payload nuclei
  without forcing the user into raw JSON first
- export controls SHALL state whether the slice is masked, full, pending approval, or denied

Critical surfaces:
- `AuditInvestigationWorkbench`
- `AuditTape`
- `ObjectNeighborhood`
- `EventDiffInspector`
- `ExportEligibilityPanel`

## 5. Domain translation rules from engine contracts to UI
The following engine concepts SHALL map directly into visible frontend constructs.

### A. `PrincipalContext`
Render as a persistent session badge stack in `GOVERNANCE_CONTEXT_BAR`:
- principal identity
- principal class
- effective role set
- current authn level
- active tenant and client scope

### B. `AUTHORIZE(...)`
Render as the canonical action-eligibility state for buttons, matrix cells, preview drawers, and
simulation results.
The UI SHALL never invent its own permission enum.

### C. `DelegationGrant`
Render as client-scope coverage, expiration, and basis type in access and authority-link detail.
A missing delegation grant SHALL appear separately from missing tenant permission.

### D. `AuthorityLink`
Render as inventory objects with lifecycle state, scope, provider environment, token-binding health,
last validation, and affected client scope.
A healthy role assignment SHALL not visually imply a healthy authority link.

### E. `ConfigChangeRequest`
Render as a first-class staged change object with draft state, approval chain, rationale,
blast-radius summary, and audit refs.

### F. `RetentionTag` and `ArtifactRetention`
Render as matrix cells, legal-hold overlays, eligibility states, and projected limitation notes.
Retention status SHALL never be visible only after execution.

### G. `AuditEvent`
Render as append-only timeline entries with actor/service distinction, event family, object refs,
reason codes, integrity markers, and correlation pivots.

## 6. Shared interaction and mutation rules

### 6.1 Change basket
All materially risky mutations SHALL stage into a shared `ChangeBasket`.
The basket is a persistent drawer or side panel that:
- groups pending changes by object type
- summarizes blast radius counts
- shows required step-up or approval states
- blocks mixed-scope submission when policy requires separate approval paths

### 6.2 Diff-first mutation
No risky change may rely on a hidden before/after state.
Before the user submits, the console SHALL render:
- `current value`
- `proposed value`
- `effective scope`
- `reason required?`
- `approval required?`
- `audit event families that will be emitted`

### 6.3 Step-up inline
Step-up SHALL appear as an inline escalation checkpoint attached to the action or basket.
The console SHALL avoid modal chains that erase comparison context.
Once step-up succeeds, the diff and blast-radius context SHALL remain mounted.

### 6.4 Approval composer
Where approval is required, the UI SHALL provide an `ApprovalComposer` that captures rationale,
expiry, requested approver scope, and related object refs.
The mutation remains staged until the backend returns a durable receipt.

### 6.5 Blast-radius communication
Every risky mutation SHALL show who or what is affected:
- principal count
- client count
- authority operations affected
- workflows opened or blocked
- retention or export limitations introduced

### 6.6 Masked and limited views
`ALLOW_MASKED` and retention-limited states SHALL show that the view is intentionally narrowed.
Hidden data SHALL never be represented as negative data.
The user must be able to tell whether information is absent, masked, not yet materialized, or not
applicable.

## 7. Frontend systems architecture

### 7.1 State domains
A frontend implementation SHOULD separate state into these domains:
- `sessionGovernanceState`
- `tenantPolicyState`
- `principalDirectoryState`
- `roleMatrixState`
- `authorityLinkState`
- `retentionState`
- `auditInvestigationState`
- `changeBasketState`
- `uiPreferenceState`

### 7.2 Server-state handling
Server truth for policy snapshots, role matrices, authority-link inventory, retention frames, and
append-only audit slices SHOULD be managed as cacheable server state with route-keyed query identities.
Selection, filter chips, pending draft changes, and panel layout belong to local UI state.

### 7.3 Mutation handling
All writes SHALL flow through northbound command receipts.
The frontend SHALL optimistically update only local staging state, never legal or policy truth.
After receipt acceptance, the console may show `pending propagation` or `awaiting approval`, but it
SHALL NOT pretend the final policy is active until the relevant read surface reflects it.

### 7.4 Stale-view protection
Mutations formed from a policy or inventory view SHALL include the latest
`if_match_policy_snapshot_hash` or equivalent object-version token.
On stale-view rejection, the console SHALL keep the current diff mounted, explain what changed, and
offer a rebase action rather than discarding the operator's reasoning work.

### 7.5 Live update model
The overview, authority-link, and audit routes SHOULD support inline refresh or stream-based updates
for event arrival, approval completion, validation results, and retention job completion.
Updates SHALL preserve row selection, scroll anchor, and open inspector state whenever the selected
object still exists.

### 7.6 Minimum route read models
The following read models SHOULD back the primary routes.
The backend MAY shape them differently, but the UI shall preserve the same semantic groupings.

- `TenantGovernanceSnapshot` with `tenant_id`, `environment_ref`, `policy_snapshot_hash`,
  `pending_approval_count`, `expiring_authority_link_count`, `retention_exception_count`,
  `audit_hotspot_refs[]`, `recent_change_refs[]`, and `updated_at`
- `PrincipalAccessView` with `principal_id`, `principal_type`, `effective_role_set[]`,
  `delegation_summaries[]`, `authn_level`, `approval_capabilities[]`, `run_kind_capabilities[]`,
  `action_matrix[]`, `last_step_up_at`, and `last_modified_at`
- `RoleTemplateMatrix` with `role_id`, grouped resource rows, grouped action columns, cell decisions,
  `version_hash`, and `pending_change_refs[]`
- `AuthorityLinkInventoryItem` with `authority_link_id`, `client_id`, `authority_scope`,
  `provider_environment`, `lifecycle_state`, `binding_health`, `delegation_state`,
  `token_client_binding_state`, `last_validated_at`, and affected-operation counts
- `RetentionGovernanceFrame` with `policy_snapshot_hash`, artifact-class rows, statutory minimums,
  tenant overrides, legal-hold counts, erasure-queue counts, and limitation counts
- `AuditInvestigationFrame` with ordered event refs, correlation keys, integrity-chain posture,
  export posture, active filters, and object-neighborhood refs

## 8. Accessibility requirements
The Admin/Governance Console SHALL meet the same accessibility bar as the decision workspace, with
extra care for dense control layouts.
At minimum:

- every matrix cell state SHALL be communicated by text, icon, and programmatic label
- inventory tables SHALL be keyboard navigable with stable row focus and sticky headers
- side panels and baskets SHALL trap focus only when intentionally modal; ordinary inspectors should
  remain non-modal and escapable
- diff views SHALL preserve readable before/after pairing at 200 percent zoom
- screen-reader labels SHALL describe governance meaning, for example `Requires approval for unmasked
  export`, rather than only color or position

## 9. Validation plan
Use Playwright for shipped web governance surfaces and XCUITest where the console or adjacent
operator tooling is embodied natively.
At minimum, validate these scenarios:

1. open Governance Overview and verify every risk count links to a filtered worklist
2. stage a tenant-security-policy change and confirm the `ChangeBasket` shows blast radius and
   approval requirement
3. simulate access for a service principal and verify `ALLOW_MASKED` explains view/export limits
4. edit a role-matrix cell from `DENY` to `REQUIRE_APPROVAL` and verify the diff remains visible after
   step-up
5. open an authority-link detail view and verify binding mismatch, delegation gap, and environment
   drift render as separate states
6. relink authority software and confirm the handshake stepper preserves audit context after
   completion
7. shorten a retention rule and verify statutory minimum protection blocks illegal values inline
8. release a legal hold and verify the erasure-eligibility preview appears before submission
9. execute an erasure request and confirm the UI waits for a command receipt instead of showing
   immediate completion
10. open Audit & Investigations, pivot from an `AuthorityRelinked` event to the affected object
    neighborhood, and export a masked audit slice
11. navigate the full console using only keyboard input
12. verify stale `policy_snapshot_hash` rejection keeps the diff mounted and offers rebase without
    losing rationale text

## 10. Minimum semantic selectors
Recommended `data-testid` values:

- `governance-context-bar`
- `governance-section-nav`
- `governance-workspace-header`
- `governance-risk-ledger`
- `tenant-config-workspace`
- `change-basket`
- `approval-composer`
- `principal-directory`
- `principal-access-grid`
- `authority-chain-panel`
- `policy-simulator`
- `authority-link-inventory`
- `authority-link-detail`
- `binding-health-timeline`
- `retention-policy-matrix`
- `legal-hold-register`
- `erasure-queue`
- `retention-impact-preview`
- `audit-investigation-workbench`
- `audit-tape`
- `event-diff-inspector`
- `export-eligibility-panel`

## 11. One-sentence summary
The Admin/Governance Console is a dense but disciplined control plane that keeps tenant policy,
actor authority, authority-link correctness, retention governance, and append-only audit evidence in
one stable workspace so operators can make high-risk changes safely and explain them later.
