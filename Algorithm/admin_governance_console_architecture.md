# Admin / Governance Console Architecture

## Purpose
This document defines the end-to-end frontend architecture for the broader product's
Admin/Governance Console.
It translates the engine's actor, authority, retention, audit, and northbound-command contracts into
an implementation-ready control-plane interface.
`frontend_shell_and_interaction_law.md` remains authoritative for cross-platform shell ownership, route continuity, artifact handling, accessibility, and disclosure fencing; this document specializes those rules for the governance-density profile.
The goal is to give tenant administrators, auditors, compliance leads, and support operators a
high-control workspace for changing policy safely, verifying authority correctness, and reconstructing
governance history without collapsing everything into a generic settings dashboard.
Any exported or mirrored projection that crosses out of this staff surface SHALL remain customer-safe.
The governance interaction layer SHALL additionally carry
`foundation_contract = InteractionLayerFoundationContract` so dense-workspace tokens, auxiliary
surface spacing, redocked compaction, motion, and contextual history posture stay explicit across
overview, policy, access, retention, and audit routes.

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

`AUDIT_SIDECAR` is the default promoted support region for this shell family.
`BlastRadiusPanel`, `EventDiffInspector`, `ExportEligibilityPanel`, or simulation explanation panels MAY replace it for the current object, but the console SHALL NOT promote more than one such support region at a time unless compare or blocker posture makes a second explanatory region necessary.
When two support regions are visible, only one MAY contain writable controls.

### Constrained and embedded console posture

The five-region governance-density profile is for wide workspaces.
On narrow browser widths, embedded support tools, or reduced side-by-side availability, the console
SHALL collapse `SECTION_NAV`, `INVENTORY_RAIL`, and the promoted sidecar region into one auxiliary
region at a time while preserving the selected governance object, current diff, and change basket.

Rules:

- `WORKSPACE_CANVAS` remains the dominant question-and-action region at every breakpoint
- deep links from overview counts, notifications, or approval requests SHALL open the same object
  inside the same section shell rather than a standalone inspector product
- every `TenantGovernanceSnapshot` SHALL emit `cross_device_continuity_contract` with
  `continuity_scope = GOVERNANCE_ROUTE`, `compatibility_basis_class = ROUTE_GUARD_ONLY`, and
  `policy_snapshot_hash` as the route/restoration guard so resize, reconnect, and deep-link recovery
  preserve the same selected governance object and dominant action posture
- wide-to-narrow transitions SHALL preserve row selection, filter state, open diff focus, audit
  pivot, and change-basket contents
- `ChangeBasket` and blast-radius context SHALL remain reachable without forcing parallel sidecars or
  modal chains that discard the current comparison context
- audit, export, and approval sidecars MAY temporarily replace one another as the promoted auxiliary
  region, but SHALL NOT become competing persistent chrome on constrained layouts

### 2.1 Cross-route shell identity

Governance routes remain one `GOVERNANCE_DENSITY_SHELL` family even when overview, policy edit,
principal access, retention, or audit investigation differ in density.
Every route-visible governance projection SHALL therefore preserve:

- `shell_family = GOVERNANCE_DENSITY_SHELL`
- `object_anchor_ref`
- `dominant_question`
- `settlement_state`
- `recovery_posture`

Rules:

- while the same selected governance object still resolves, deep links, filter changes, responsive
  collapse, reconnect, and rebase SHALL preserve the same shell family rather than switching to a
  different settings grammar
- each route SHALL keep one dominant question inside `WORKSPACE_CANVAS`; dense comparison is
  allowed, but the operator SHALL still know which object is being changed or inspected first
- at most one promoted support region may compete with `WORKSPACE_CANVAS` at a time: either
  `AUDIT_SIDECAR` or the route-specific blast-radius, diff, export, or approval sidecar that
  currently explains the selected object

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
- `WORKSPACE_CANVAS` showing `OVERVIEW_ATTENTION_SUMMARY` followed by five bounded supporting
  stacks: `Pending approvals`, `Configuration drift`, `Authority-link risks`, `Retention
  exceptions`, and `Audit hotspots`
- `AUDIT_SIDECAR` showing the latest append-only governance events for the selected object

Key widgets:
- `OverviewAttentionSummary`
- `GovernanceRiskLedger`
- `PendingChangeQueue`
- `AuthorityHealthStrip`
- `RetentionExceptionList`
- `AuditHotspotTape`

State rules:
- `OVERVIEW_ATTENTION_SUMMARY` SHALL promote one dominant question, one dominant worklist or action,
  and one concise explanation at a time
- the route SHALL also publish one `dominance_contract` that keeps `ATTENTION_SUMMARY` authoritative, demotes risk ledgers and worklists to supplemental posture, and marks audit/diff escalation explicit before any support sidecar can compete for attention
- `OverviewAttentionSummary` SHALL additionally expose `why now`, `affected scope`, and one explicit
  `next legal action` label for the promoted family; non-calm summaries SHALL mirror the promoted
  risk-ledger row rather than inventing a second action grammar
- `GovernanceRiskLedger` SHALL serialize all five governance families with the promoted family first
  and the supporting families following in canonical queue order; every ledger row SHALL retain its
  exact filtered `worklist_ref`, visible count, affected-scope label, and next-action label so the
  widget never degrades into a count-only status bar
- `PendingChangeQueue` SHALL remain worklist-backed and SHALL expose concrete `pending_change_refs[]`
  plus a queue-level `worklist_ref`; it SHALL not collapse pending governance edits into a badge-only
  indicator
- `AuthorityHealthStrip`, `RetentionExceptionList`, and `AuditHotspotTape` SHALL each retain bounded
  visible object refs for the items they preview plus their full filtered `worklist_ref`, so each
  widget opens the same governance object in the same shell rather than a generic overview reroute
- overview filter chips for environment, client scope, principal class, risk family, and change
  status SHALL remain serialized as route-stable `active_filters` rather than browser-local guesses
- the selected row or hotspot mounted in `WORKSPACE_CANVAS` SHALL remain explicit as
  `selected_canvas_object_ref`; any in-object scroll or drawer target SHALL remain explicit as
  `focus_anchor_ref`
- when `AUDIT_SIDECAR` or another promoted support region is active, its selected object SHALL stay
  aligned with the current canvas object rather than opening a parallel authority
- the dominant worklist SHALL be selected by `family_score(f) = family_base(f) + 25*critical_open_count(f) + 6*min(open_count(f), 9) + 4*oldest_age_bucket(f) + 10*requires_operator_action(f) + 8*1[f = previous_primary_family] - 8*noise_penalty(f)`
- `family_base(Pending approvals)=500`, `family_base(Configuration drift)=420`, `family_base(Authority-link risks)=380`, `family_base(Retention exceptions)=340`, and `family_base(Audit hotspots)=300`
- `oldest_age_bucket(f) = min(floor(oldest_open_age_hours(f) / 8), 6)` and `noise_penalty(f) = 1` when the family changed only through non-material count churn since the previous published snapshot, else `0`
- when the leading family does not exceed the prior still-live family by at least `20`, the prior family SHALL remain dominant so overview prominence does not thrash
- if more than one issue family is live, non-primary families SHALL collapse into supporting stacks
  or an additional-issues count rather than competing hero cards
- counts SHALL always link to a concrete filtered worklist
- one queue SHALL be promoted as the dominant worklist for the current state; all other risk stacks
  remain visible but secondary
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

Workspace rules:
- `TenantConfigWorkspace` SHALL preserve the fixed section order `Tenant profile ->
  Security posture -> Authority and environments -> Connector policy -> Approval and change control
  -> Notifications & evidence`
- the semantic reading path for this route SHALL remain `SECTION_NAV -> CONFIG_FORM ->
  INLINE_POLICY_HELP -> BLAST_RADIUS_PANEL -> CHANGE_BASKET -> APPROVAL_COMPOSER ->
  CONFIG_HISTORY_TIMELINE`, even when responsive collapse redocks those surfaces
- inline policy help SHALL stay inside the active form context rather than hiding in tooltip-only or
  detached documentation affordances
- `ConfigHistoryTimeline` SHALL keep the latest material policy change and the selected historical
  anchor visible beside current staged diffs so stale rebase and audit comparison stay same-object
- direct submission SHALL remain disabled until the mounted `ChangeBasket` is simulation-atomic on
  one live `simulation_basis_hash` / `dependency_topology_hash` pair, one
  `mutation_basis_contract.basis_contract_hash`, and the visible `BlastRadiusPanel` still matches
  that exact reviewed basis

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
- the semantic reading path for this route SHALL remain `PRINCIPAL_DIRECTORY -> WORKSPACE_CANVAS ->
  ACCESS_INSPECTOR -> AUTHORITY_CHAIN_PANEL -> POLICY_SIMULATOR`, even when responsive collapse
  redocks those surfaces
- `PrincipalAccessView` SHALL preserve `access_workspace{ surface_order, workspace_mode,
  active_filters, selected_principal_ref, selected_role_template_ref, selected_cell_ref,
  focus_anchor_ref, grid_navigation_model, inspector_state, promoted_support_surface,
  latest_simulation_ref, role_editor_pending_change_refs[] }` so the directory, grid, inspector,
  authority chain, and simulator stay same-shell and same-object across collapse, rebase, and
  keyboard navigation
- `RoleTemplateMatrix` SHALL preserve `policy_snapshot_hash`, `version_hash`,
  `role_matrix_workspace{ surface_order, active_filters, selected_role_template_ref,
  selected_cell_ref, grid_navigation_model, inspector_state, promoted_support_surface,
  latest_simulation_ref, role_editor_pending_change_refs[] }`, one `focus_anchor_ref`, grouped
  `matrix_rows[]`, grouped `matrix_columns[]`, `matrix_cells[]`, and the mounted
  `selected_action_detail` so `/governance/access/roles/{role_id}` can refresh inline without
  losing the selected role cell, the pending staged edit context, or the exact stale-view basis
- every `action_matrix[]` cell and the mounted `selected_action_detail` SHALL preserve one ordered
  `authority_chain_layers[]` stack in this exact sequence:
  `SESSION_AUTHN_POSTURE -> TENANT_OPERATIONAL_AUTHORITY -> CLIENT_DELEGATION_COVERAGE ->
  EXTERNAL_AUTHORITY_LINK_READINESS`, with optional
  `AUTHORITY_OF_RECORD_OUTCOME` as a fifth layer when contradiction or authority-of-record truth is
  material
- the final cell decision SHALL remain the most restrictive visible layer outcome rather than a
  generic synthesized pass/fail badge
- `focus_anchor_ref` SHALL remain pinned to the selected matrix cell so roving-cell keyboard
  navigation can survive responsive compaction, reconnect, and stale-view rebase without losing the
  operator's place
- `workspace_mode = PRINCIPALS` SHALL keep the selected principal mounted in the same shell,
  `workspace_mode = ROLES` SHALL keep one `selected_role_template_ref` plus any
  `role_editor_pending_change_refs[]` visible in-shell, and `workspace_mode = SIMULATOR` SHALL keep
  the latest simulator result mounted without discarding the selected access tuple

Policy simulator rules:
- the simulator SHALL accept a proposed principal, target resource, client scope, requested action,
  requested scope tokens, and any staged governance diff that would change live control-plane state
- for mutation-capable governance actions, the simulator SHALL run both `AUTHORIZE(...)` and
  `SIMULATE_GOVERNANCE_MUTATION(...)` on the same frozen snapshot cut; it SHALL NOT show nominal ABAC
  allowability without also showing the hazard overlay that determines whether the write is formally
  bounded
- the result SHALL validate as `GovernanceAccessSimulation`, showing both machine output and human
  explanation together with nested `authorization_decision{{...}}`,
  `mutation_hazard.hazard_contract_hash`, `mutation_hazard.simulation_basis_hash`,
  `mutation_hazard.dependency_topology_hash`,
  `mutation_hazard.impact_radius_lower_score`, `mutation_hazard.impact_radius_upper_score`, classed
  impacted counts, `mutation_hazard.privilege_gain_score`,
  `mutation_hazard.scope_expansion_score`, `mutation_hazard.masking_relaxation_score`,
  `mutation_hazard.policy_risk_score`, `mutation_hazard.approval_requirement`,
  `mutation_hazard.commit_authority_posture`,
  `mutation_hazard.simulation_confidence_score`, `mutation_hazard.predictability_score`, and the
  structured explanation arrays `mutation_hazard.risk_driver_codes[]`,
  `mutation_hazard.approval_trigger_codes[]`,
  `mutation_hazard.confidence_limiter_codes[]`, and
  `mutation_hazard.bounded_safety_blocker_codes[]`
- blast radius SHALL render as a bounded interval, not as one unqualified scalar; when the upper and
  lower bounds differ by more than the frozen uncertainty guard band, the UI SHALL label the mutation
  `uncertain blast radius` and SHALL not style it as directly committable
- `policy_risk_score` SHALL be derived only from privilege gain, scope expansion, masking
  relaxation, and the blast-radius upper bound; `approval_trigger_codes[]` SHALL reflect only the
  typed approval posture rather than separate ad hoc trigger booleans
- `approval_requirement = NOT_REQUIRED` SHALL appear only when `bounded_safe_mutation = 1`; every other
  governance mutation SHALL stage through visible approval ceremony
- a result with `simulation_confidence_score < 80` or `predictability_score < 75` SHALL remain
  advisory-only and SHALL permit save-for-review but SHALL NOT present immediate commit styling
- simulation SHALL never mutate live grants or authority links
- `GovernanceAccessSimulation` SHALL additionally preserve ordered `authority_chain_layers[]` plus
  one explicit `simulator_posture`:
  `READ_ONLY_DECISION`, `ADVISORY_ONLY`, `APPROVAL_GATED`, or `BOUNDED_SAFE`
- `simulator_posture = READ_ONLY_DECISION` applies only when no governance mutation hazard is in
  scope; `ADVISORY_ONLY` applies when confidence or predictability falls below the frozen threshold;
  `APPROVAL_GATED` applies when mutation remains approval-bounded; and `BOUNDED_SAFE` applies only
  when the same frozen preview is high-confidence and `bounded_safe_mutation = 1`
- every staged basket, approval composer, blast-radius panel, and commit path SHALL preserve the
  same `mutation_hazard.hazard_contract_hash` through `mutation_basis_contract.hazard_contract_hash`
  so reviewed risk cannot be silently recomputed or narrowed before commit
- the authority-chain explanation rendered in the simulator SHALL use the same ordered layer stack as
  the selected grid cell so the simulator does not invent a second policy-explanation grammar

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
The semantic reading order SHALL remain `INVENTORY_RAIL -> WORKSPACE_CANVAS -> AUDIT_SIDECAR`
through responsive collapse, reconnect, and stale-view rebase.

Interaction model:
- link or relink flows SHALL use a guided handshake stepper with explicit preflight checks rather than
  a raw credential form
- unlink flows SHALL require blast-radius preview showing affected clients, blocked authority
  operations, and any pending filings or reconciliations
- token/client mismatch, missing delegation, or environment drift SHALL render as first-class states
  in the list and detail view, not only as buried event text
- the selected link, keyboard focus anchor, and mounted handshake step SHALL survive reconnect,
  stream rebase, and sidecar collapse while the same link remains mounted
- the workspace canvas SHALL keep the fixed detail-module order
  `AuthorityLinkIdentityCard -> BindingHealthTimeline -> HandshakeHistory -> AffectedOperationList -> PreflightChecklist`

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
- the matrix reading order SHALL remain `RetentionPolicyMatrix -> RetentionImpactPreview` inside the
  mounted policy workspace, with sticky row and column headers so operators can compare one artifact
  class against the same statutory and tenant controls without horizontal or vertical context loss
- any override below statutory minimum SHALL be impossible to save and SHALL explain the blocking
  basis inline
- any change that increases erasure scope or shortens retention SHALL require stronger warning copy,
  step-up or approval where policy requires, and a visible blast-radius count
- blocked rows SHALL publish explicit blocker refs in the same matrix row rather than hiding the
  statutory basis in a sidecar-only explanation

Legal-hold rules:
- legal holds SHALL be searchable and filterable by client, object ref, hold reason, and release
  eligibility
- release actions SHALL always show the blocked erasure items that would become eligible afterward
- selecting a legal hold SHALL keep one mounted register row, one release preview, and one focus
  anchor stable across responsive collapse, refresh, or rebase while the same hold still resolves

Erasure-workbench rules:
- the workbench SHALL show eligibility, blocked reasons, affected artifact counts, expected
  pseudonymisation actions, and projected provenance limitations before execution
- irreversible actions SHALL route through the `ChangeBasket` / `ApprovalComposer` flow rather than a
  one-click delete control
- the workbench SHALL keep queue sections visibly split into eligible, blocked, and staged-review
  subsets so destructive readiness, legal blockers, and pending approvals never collapse into one
  undifferentiated deletion list
- when an erasure candidate is selected, `RetentionImpactPreview` SHALL become the promoted support
  region until the operator either stages the action or leaves the destructive path

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
- print and export SHALL bind to the active filtered slice, visible limitation posture, and current export eligibility at invocation time; they SHALL NOT bypass governance policy through hidden direct URLs or stale background cache
- the semantic reading order for this route SHALL remain
  `INVENTORY_RAIL -> WORKSPACE_CANVAS -> EVENT_DIFF_INSPECTOR -> AUDIT_SIDECAR`, even when
  constrained layouts redock the diff or export surface into drawers or inspectors
- `WORKSPACE_CANVAS` SHALL keep the internal module order
  `AuditTape -> ObjectNeighborhood`; timeline selection, neighborhood reconstruction, and the
  mounted diff target SHALL stay bound to one explicit `selected_event_ref`
- `EventDiffInspector` SHALL stay summary-first, expose changed-field nuclei before any raw payload
  affordance, and treat raw JSON as a secondary inspection path rather than the default entry state
- when export is anything other than `FULL_ALLOWED`, `ExportEligibilityPanel` SHALL become the
  promoted support surface and SHALL mirror the active filtered slice rather than a detached
  background export context

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
Imported or handshake-derived delegation SHALL show explicit freshness state rather than reading as
evergreen client authority.

### D. `AuthorityLink`
Render as inventory objects with lifecycle state, scope, provider environment, token-binding health,
last validation, and affected client scope.
A healthy role assignment SHALL not visually imply a healthy authority link.
Where the product exposes underlying provider credentials, `ConnectorBinding` SHALL appear as a
separate bound-object surface showing scope ceiling, client-binding state, delegation readiness,
expiry posture, and token lineage rather than collapsing those checks into the `AuthorityLink` row.

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
The basket is the active mutation-time support region, rendered as a persistent drawer, side panel,
or bounded sheet depending on breakpoint. It replaces rather than stacks on another promoted
support region unless an explicit compare or approval checkpoint requires a second bounded
comparison surface. The basket:
- groups pending changes by object type and reviewed `mutation_basis_contract.basis_contract_hash`
- summarizes `impact_radius_lower_score .. impact_radius_upper_score` plus classed impacted counts
- shows required step-up, approval, and bounded-safe posture states
- preserves the reviewed `mutation_basis_contract{ access_binding_hash, simulation_basis_hash,
  dependency_topology_hash, approval_requirement, required_approvals[], commit_authority_posture }`
  and invalidates direct submission when any of those commit-basis fields no longer match the latest
  read cut
- blocks mixed-scope submission when policy requires separate approval paths or when staged mutations
  are justified by different simulation bases that cannot be committed atomically

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
The composer SHALL remain inside the same route shell with the diff and blast-radius context still
visible. The composer SHALL also retain the exact reviewed `mutation_basis_contract` and SHALL
stale-reject when approval scope or commit basis no longer matches the active basket. The mutation
remains staged until the backend returns a durable receipt.

### 6.5 Blast-radius communication
Every risky mutation SHALL show who or what is affected using the bounded output of
`SIMULATE_GOVERNANCE_MUTATION(...)`:
- `impact_radius_lower_score .. impact_radius_upper_score`
- direct vs transitive principal counts
- direct vs transitive client counts
- authority operations affected
- workflows opened or blocked
- retention or export limitations introduced
- privilege expansion, masking relaxation, and segregation-of-duties violations introduced

A single count without an uncertainty interval SHALL NOT be treated as sufficient blast-radius review
for a mutation-capable governance write.
The visible `BlastRadiusPanel` SHALL always remain bound to the same
`mutation_basis_contract.basis_contract_hash` as the active basket before submission is enabled.

### 6.6 Masked and limited views
`ALLOW_MASKED` and retention-limited states SHALL show that the view is intentionally narrowed.
Hidden data SHALL never be represented as negative data.
The user must be able to tell whether information is absent, masked, not yet materialized, or not
applicable.

### 6.7 Governance interaction layer
Every governance route SHALL additionally publish one shared `GovernanceInteractionLayer` contract so
filter chips, drawers, inspectors, compaction, and preserved comparison context remain
machine-checkable instead of browser-local convention.
That governance interaction layer SHALL also preserve the customer-safe boundary for any mirrored
portal/customer-visible slice, export, or authority-link handoff that governance routes inspect or
approve; governance density SHALL not silently widen a customer-safe projection into staff-only
detail during redraw, export, or return-from-handoff flows.

The interaction layer SHALL preserve:

- `density_profile = GOVERNANCE_DENSITY_PROFILE_V1` so every governance route keeps the same
  explicit dense-control-plane posture instead of inventing route-local spacing rules
- `inventory_filter_grammar = CANONICAL_ROUTE_FILTER_GRAMMAR` so inventory rails, trays, and chip
  echoes describe the same slice in one frozen dimension grammar
- `support_surface_policy = ONE_PROMOTED_SUPPORT_SURFACE_MAX` so diff, audit, blast-radius, export,
  and approval surfaces still compete for one promoted support slot by default
- `diff_basket_policy = STAGED_DIFF_AND_BASKET_RETAIN_CONTEXT` so staged diffs, change baskets,
  role-editor edits, erasure review, and other mutation context remain same-object and same-shell
- `export_binding_policy = ACTIVE_FILTERED_SLICE_GOVERNS_EXPORT` so export posture always binds to
  the current filtered slice rather than detached background scope
- `externalization_governance_contract{...}` SHALL be the shared FE-57 delivery boundary for audit
  export and authority-link browser handoff so masking, limitation, approval, and return
  validation remain machine-checkable instead of living in route-local button handlers; its
  invocation-time tenant/security mirrors and `delivery_binding_hash` SHALL therefore stay aligned
  with the mounted slice before any signed URL, browser handoff, or export worker starts
- `keyboard_focus_policy = RETURN_FOCUS_ANCHOR_OR_ROVING_SELECTION` so row, cell, and sidecar focus
  survive responsive compaction, reconnect, and rebase under one frozen keyboard rule
- `selector_profile = GOVERNANCE_SEMANTIC_SELECTORS_V1` so browser `data-testid` anchors,
  accessibility labels, and any native embodiment mirror the same governance meaning instead of
  naming dense controls by visual arrangement
- `feedback_truth_policy = DURABLE_RECEIPT_AND_TYPED_FAILURE_DRIVEN` so pending propagation,
  awaiting approval, stale-view rejection, and rebase-required notices always remain sourced from
  durable `ApiCommandReceipt` or typed `ProblemEnvelope` truth
- `selected_filter_chip_refs[]` as the exact chip echo for the mounted route in canonical
  filter-dimension order
- `compaction_mode` as the current wide vs redocked embodiment
- `auxiliary_surface_presentation` as the current sidecar/drawer/inspector/tray embodiment of the
  promoted auxiliary region
- `focus_trap_mode`, which SHALL remain `NON_MODAL` for ordinary governance drawers and inspectors
  so the console does not create modal chains that erase comparison context
- `selection_persistence_mode = PRESERVE_WHILE_OBJECT_RESOLVES`
- route-specific `preserved_context_codes[]` so resize, reconnect, and stale-view rebase keep the
  same active filters, selected object, focus anchor, promoted support surface, and any staged diff
  or guided-flow context that still resolves lawfully

Rules:

- wide layouts MAY render the auxiliary region as `SIDECAR` or `INSPECTOR`; compact layouts MAY
  redock it as `DRAWER` or `TRAY`, but a compact route SHALL NOT pretend it is still a wide
  sidecar
- `ChangeBasket`, role-editor staged changes, erasure-review context, and guided handshake progress
  SHALL survive responsive compaction and stale-view rebase while their governing object still
  resolves
- filter-chip summary order SHALL stay canonical for each route family so saved views, keyboard
  users, and support handoffs do not see the same slice described in drifting chip grammar
- `GovernanceInteractionLayer` is the cross-client contract boundary for
  `GOVERNANCE_DENSITY_SHELL`; browser or native control-plane embodiments MAY change only
  `compaction_mode` and `auxiliary_surface_presentation`, and SHALL NOT drop selection, focus
  anchor, staged diff/basket context, promoted support-surface budgeting, or receipt/problem-driven
  recovery semantics while the same governed object still resolves

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
`if_match_policy_snapshot_hash` and, when the operator relied on a simulation or blast-radius review,
`dependency_topology_hash` / `simulation_basis_hash` or equivalent current object-version tokens.
A governance mutation SHALL be considered stale not only when the visible policy snapshot changes, but
also when the dependency topology, impacted approval path, or authoritative inventory slice used by the
simulation changes.
On stale-view rejection, the console SHALL keep the current diff mounted, explain what changed, and
offer a rebase action rather than discarding the operator's reasoning work.

### 7.4A Settlement-aware mutation posture

Governance change flows SHALL keep pending, settled, and recovery posture explicit without
destroying comparison context.

Rules:

- receipt acceptance SHALL surface first as inline pending propagation, awaiting approval, or
  equivalent settlement-aware posture on the mounted control object rather than as immediate
  completed-policy styling
- post-command settlement SHALL keep the same object, diff, and blast-radius context visible long
  enough for the operator to verify what changed
- stale-view rejection, superseded selection, read-only limitation, and access rebinding SHALL
  render through explicit `recovery_posture` while preserving current diff context and rationale
  text whenever doing so remains lawful
- stale-view and pending-settlement feedback SHALL remain receipt/problem-driven; when the backend
  publishes `stale_guard_family` and `latest_stale_guard_value`, the mounted governance route SHALL
  surface that exact typed basis instead of paraphrasing a route-local guess
- export, print, and audit handoff flows SHALL preserve whether the slice is current, historical,
  masked, or limited; a historical slice SHALL never inherit the default posture reserved for the
  current governed object

### 7.5 Live update model
The overview, authority-link, and audit routes SHOULD support inline refresh or stream-based updates
for event arrival, approval completion, validation results, and retention job completion.
Updates SHALL preserve row selection, scroll anchor, and open inspector state whenever the selected
object still exists.

### 7.6 Minimum route read models
The following read models SHOULD back the primary routes.
The backend MAY shape them differently, but the UI shall preserve the same semantic groupings.
`TenantGovernanceSnapshot`, `GovernancePolicySnapshot`, `PrincipalAccessView`,
`RoleTemplateMatrix`, `AuthorityLinkInventoryItem`, `RetentionGovernanceFrame`, and
`AuditInvestigationFrame` SHALL additionally validate against their dedicated JSON schemas in
`schemas/`: `tenant_governance_snapshot.schema.json`, `governance_policy_snapshot.schema.json`,
`principal_access_view.schema.json`, `role_template_matrix.schema.json`,
`authority_link_inventory_item.schema.json`, `retention_governance_frame.schema.json`, and
`audit_investigation_frame.schema.json`.
`TenantGovernanceSnapshot` SHALL additionally freeze `shell_family`, `object_anchor_ref`,
`dominant_question`, `dominance_contract`, `settlement_state`, `recovery_posture`, `primary_queue_code`,
`primary_worklist_ref`, `active_filters`, `selected_canvas_object_ref`, `focus_anchor_ref`, and
`support_region_state` so Governance Overview never degrades into a dead-end KPI strip or ambiguous
sidecar state.

- `TenantGovernanceSnapshot` with `tenant_id`, `shell_family`, `object_anchor_ref`,
  `environment_ref`, `policy_snapshot_hash`, `dominant_question`, `settlement_state`,
  `recovery_posture`, `primary_queue_code`, `primary_worklist_ref`, `active_filters`,
  `selected_canvas_object_ref`, `focus_anchor_ref`,
  `pending_approval_count`, `risky_configuration_drift_count`, `expiring_authority_link_count`,
  `retention_exception_count`, `pending_approval_worklist_ref`, `configuration_drift_worklist_ref`,
  `authority_link_risk_worklist_ref`, `retention_exception_worklist_ref`,
  `audit_hotspot_worklist_ref`, `pending_change_worklist_ref`, `attention_summary{
  attention_family, headline, supporting_text, primary_worklist_ref, primary_action_label,
  why_now_label, affected_scope_label, next_legal_action_label, secondary_issue_count }`,
  `risk_ledger_entries[]{ queue_code, headline, open_count, worklist_ref, affected_scope_label,
  next_action_label }`, `support_region_state`, `authority_link_risk_refs[]`,
  `retention_exception_refs[]`, `audit_hotspot_refs[]`, `recent_change_refs[]`,
  `pending_change_refs[]`, and `updated_at`
- `GovernancePolicySnapshot` with `snapshot_id`, `tenant_id`, `shell_family`, `object_anchor_ref`,
  `dominant_question`, `settlement_state`, `recovery_posture`, `policy_snapshot_hash`,
  `environment_bindings[]`, `session_security_posture`, `step_up_rules[]`, `approval_rules[]`,
  `masking_defaults[]`, `last_material_change_ref`,
  `tenant_config_workspace{ surface_order, section_nav_order, active_section_code,
  visible_form_section_refs[], inline_policy_help{ help_mode, help_refs[] } }`,
  `change_basket{ basket_state, simulation_atomicity, submission_enabled,
  active_simulation_basis_hash, active_dependency_topology_hash,
  active_mutation_basis_contract_or_null, step_up_pending, approval_requirement,
  bounded_safe_mutation, required_approvals[],
  staged_change_groups[]{ object_type, simulation_basis_hash, dependency_topology_hash,
  mutation_basis_contract,
  impact_radius_lower_score, impact_radius_upper_score, impacted_principal_count,
  impacted_client_count, impacted_authority_operation_count, impacted_workflow_count,
  impacted_limitation_count, policy_risk_score, simulation_confidence_score,
  predictability_score, approval_requirement, bounded_safe_mutation, required_approvals[],
  reason_codes[], staged_changes[]{ change_ref, field_ref, current_value_label,
  proposed_value_label, effective_scope_label, reason_required, approval_required,
  audit_event_families[], input_commit_mode } } }`,
  `approval_composer{ composer_state, requested_approver_scope[], related_object_refs[],
  rationale_required, rationale_ref, expires_at, mutation_basis_contract_or_null }`,
  `blast_radius_panel{ panel_state, simulation_basis_hash, dependency_topology_hash,
  impact_radius_lower_score, impact_radius_upper_score, impacted_principal_count,
  impacted_client_count, impacted_authority_operation_count, impacted_workflow_count,
  impacted_limitation_count, policy_risk_score, simulation_confidence_score,
  predictability_score, mutation_basis_contract_or_null, approval_requirement,
  bounded_safe_mutation, reason_codes[] }`,
  `config_history_timeline{ timeline_state, latest_change_ref, selected_change_ref,
  visible_change_refs[] }`, and `captured_at`
- `PrincipalAccessView` with `principal_id`, `principal_type`, `shell_family`,
  `object_anchor_ref`, `dominant_question`, `settlement_state`, `recovery_posture`,
  `effective_role_set[]`, `delegation_summaries[]`, `authn_level`, `approval_capabilities[]`,
  `run_kind_capabilities[]`, `action_matrix[]`, `last_step_up_at`, and `last_modified_at`
- `RoleTemplateMatrix` with `role_id`, `role_label`, `policy_snapshot_hash`, `version_hash`,
  `focus_anchor_ref`, `role_matrix_workspace{ surface_order, active_filters,
  selected_role_template_ref, selected_cell_ref, grid_navigation_model, inspector_state,
  promoted_support_surface, latest_simulation_ref, role_editor_pending_change_refs[] }`,
  grouped resource rows, grouped action columns, cell decisions, and one mounted
  `selected_action_detail`
- `AuthorityLinkInventoryItem` with `authority_link_id`, `client_id`, `shell_family`,
  `object_anchor_ref`, `dominant_question`, `settlement_state`, `recovery_posture`,
  `authority_scope`, `provider_environment`, `lifecycle_state`, `binding_health`,
  `delegation_state`, `token_client_binding_state`, `last_validated_at`, `focus_anchor_ref`,
  `authority_link_workspace{ surface_order, active_filters, selected_authority_link_ref,
  detail_module_order, guided_flow_mode, promoted_support_surface, prominent_issue_ref_or_null }`,
  `guided_handshake_stepper{ flow_state, step_order, current_step_code, completed_step_codes[],
  credential_capture_mode, external_handoff_ref_or_null, preflight_blocking_check_refs[] }`,
  `binding_health_timeline{ current_binding_health, current_delegation_state,
  current_token_client_binding_state, promoted_issue_ref_or_null, event_refs[] }`,
  `handshake_history{ attempt_refs[], selected_attempt_ref_or_null, latest_attempt_state,
  latest_failure_ref_or_null }`,
  `affected_operation_list{ section_order, preflight_refs[], submission_refs[],
  reconciliation_refs[], amendment_refs[], primary_blocked_operation_ref_or_null }`,
  `preflight_checklist{ check_order, checks[]{ check_ref, check_code, check_state, reason_refs[] },
  blocking_check_refs[], last_run_at_or_null }`, affected-operation counts, and
  `externalization_governance_contract{...}`
- `RetentionGovernanceFrame` with `shell_family`, `object_anchor_ref`, `dominant_question`,
  `settlement_state`, `recovery_posture`, `policy_snapshot_hash`, `focus_anchor_ref`,
  `retention_workspace{ surface_order, workspace_mode, active_filters, selected_policy_row_ref,
  selected_legal_hold_ref, selected_erasure_item_ref, promoted_support_surface, warning_posture }`,
  `retention_policy_matrix{ column_order, row_refs[], selected_row_ref, editing_posture,
  sticky_header_mode, inline_blocker_visibility }`, `legal_hold_register{ column_order, hold_refs[],
  selected_hold_ref_or_null, blocking_hold_refs[], release_candidate_hold_refs[],
  release_preview_ref_or_null, release_action_posture }`, `erasure_queue{ section_order,
  eligible_item_refs[], blocked_item_refs[], pending_review_item_refs[], selected_item_ref_or_null,
  destructive_flow_mode, primary_blocker_ref_or_null }`, `retention_impact_preview{ panel_mode,
  preview_subject_ref_or_null, preview_mode, warning_posture, blocked_reason_refs[],
  projected_provenance_limitation_refs[], affected_artifact_count, affected_client_count,
  projected_pseudonymisation_count, action_posture }`, and artifact-class rows carrying statutory
  minimums, tenant overrides, legal-hold counts, erasure-queue counts, and limitation counts
- `AuditInvestigationFrame` with `shell_family`, `object_anchor_ref`, `dominant_question`,
  `query_contract_code`, `query_anchor_ref`, `ordering_basis`, `settlement_state`,
  `recovery_posture`, `focus_anchor_ref`, ordered event refs, supporting trace/log refs,
  correlation keys, integrity-chain posture, export posture, active filters,
  `audit_workspace{ surface_order, workspace_mode, active_filters, selected_event_ref,
  selected_object_ref_or_null, promoted_support_surface }`,
  `audit_tape{ timeline_mode, rows[]{ event_ref, family_ref, actor_or_service_ref_or_null,
  primary_object_ref_or_null, diff_available }, selected_event_ref }`,
  `object_neighborhood{ neighborhood_mode, object_refs[], selected_object_ref_or_null,
  upstream_event_refs[], selected_event_ref, downstream_event_refs[] }`,
  `event_diff_inspector{ panel_mode, baseline_event_ref_or_null,
  comparison_event_ref_or_null, summary_ref_or_null, changed_field_refs[],
  raw_payload_posture }`, `export_eligibility_panel{ panel_mode, state, reason_codes[],
  active_slice_scope_ref, masked_preview_ref_or_null, approval_requirement_ref_or_null,
  invocation_posture }`, and object-neighborhood refs

## 8. Accessibility and responsive requirements
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

Responsive and density fallback rules:

- wide desktop (`>= 1440px`) MAY show all five structural regions when the selected object benefits from a persistent sidecar
- standard desktop and tablet (`1024px - 1439px`) SHALL keep `WORKSPACE_CANVAS` primary, collapse `AUDIT_SIDECAR` into a tabbed inspector or drawer, and preserve `ChangeBasket` and diff state without route reset
- narrow widths (`< 1024px`) SHALL move `SECTION_NAV` into a compact tab or menu control, collapse `INVENTORY_RAIL` into a filter-and-selection tray, and show only one promoted support region at a time beside the primary canvas
- responsive collapse SHALL preserve `SECTION_NAV`, `INVENTORY_RAIL`, and `AUDIT_SIDECAR`
  semantics even when they redock as drawers, tabs, or in-canvas disclosures
- breakpoint changes SHALL preserve the selected object, dominant question, current primary
  worklist, `active_filters`, `focus_anchor_ref`, and promoted sidecar mode rather than sending the
  operator back to a generic overview
- the console SHALL NOT fork into a separate mobile-only route family that breaks object continuity
  or stages policy edits through disconnected mini-flows
- no required governance task may depend on horizontal scrolling through both the editable canvas and a second writable sidecar simultaneously
- responsive compaction SHALL preserve selected object, active filters, pending rationale text, and stale-view basis tokens rather than rebuilding them from scratch

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
13. verify responsive compaction from wide desktop to tablet/mobile preserves the selected object,
    diff context, change basket, active filters, pending rationale text, and export/sidecar posture
    without changing shell family
14. verify Governance Overview exposes one dominant worklist plus explicit settlement and support
    posture so risk counts never degrade into dead-end KPI tiles or ambiguous sidecar chrome
15. Governance Overview renders one `overview-attention-summary` with a live worklist or action and
    demotes remaining issue families to supporting stacks rather than competing hero tiles
16. verify stale-view rejection, pending propagation, and settled governance mutation posture remain
    inline on the mounted control object and keep diff or blast-radius context visible
17. verify audit, export, and print handoff flows keep current, historical, masked, and limited
    slices visibly distinct instead of restoring the last viewed historical slice as the default

## 10. Minimum semantic selectors
Recommended `data-testid` values:

- `governance-context-bar`
- `governance-shell-family`
- `governance-object-anchor`
- `governance-dominant-question`
- `governance-settlement-posture`
- `governance-recovery-posture`
- `governance-section-nav`
- `governance-primary-worklist`
- `governance-workspace-header`
- `overview-attention-summary`
- `governance-risk-ledger`
- `governance-support-sidecar`
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
The Admin/Governance Console is a dense but disciplined control plane with one dominant worklist and
one promoted support region at a time, keeping tenant policy, actor authority, authority-link
correctness, retention governance, and append-only audit evidence in one stable workspace so
operators can make high-risk changes safely and explain them later.
Governance overview shells SHALL publish `state_taxonomy_contract` so stale review, degraded
read-only posture, and recovery-required preservation semantics stay aligned with the shared shell
law even when the active governance sidecar is investigative rather than empty.
They SHALL additionally publish `semantic_accessibility_contract` so governance filter/worklist
navigation, attention-summary anchoring, promoted support-region reachability, and browser/native
selector parity stay machine-readable instead of being reconstructed from dense layout structure.
They SHALL additionally participate in `semantic_accessibility_regression_pack` cases so Playwright
coverage proves dense governance shells keep the same headings, landmarks, support-sidecar
reachability, live failure announcements, and reduced-motion behavior through support collapse and
live-update churn.
## FE-25 Cache Isolation

Governance overview, policy, principal-access, and role-matrix surfaces now carry `cache_isolation_contract` with governance-only posture. These scopes clear access-binding, masking, and visibility-partition fields and fail closed on any attempt to collapse governance cache identity into customer-visible or visibility-partitioned cache envelopes.
