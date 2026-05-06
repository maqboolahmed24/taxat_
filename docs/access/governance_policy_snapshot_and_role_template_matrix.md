# Governance Policy Snapshot And Role Template Matrix

`pc_0095` adds the first backend-access owned governance-policy snapshot and role-template matrix projector. The goal is not a second access-control implementation. The goal is one deterministic read-side contract that can be reopened, hashed, persisted, and compared without letting each client rebuild policy truth differently.

## Policy Snapshot Hash

`policy_snapshot_hash` is now derived from the committed policy slice only:

- provider-environment bindings projected from `config/runtime/provider_environment_matrix.json`
- session-security posture from the browser session, device-binding, and authentication-level policies
- step-up rules from `config/access/authentication_level_policy.json`
- approval rules from `config/access/approval_requirement_resolution.json`
- masking defaults derived from masked role grants in `config/access/default_roles.json`
- canonical role-template and resource/action catalog content
- sorted material config lineage hashes for those policy files

The hash explicitly excludes route-local state:

- active filters
- selected cell refs
- focus anchors
- latest simulation refs
- preview chips and motion state
- empty or draft-only shell continuity state such as the current inspector tab

This means operators can compare the exact committed policy slice they reviewed against the currently published slice without conflating it with temporary UI posture.

## Role Version Hash

`version_hash` is derived from:

- `policy_snapshot_hash`
- committed role matrix rows, columns, and cells
- the exact decision grammar for each cell
- effective scope, masking, authn, approval, and policy-path detail
- pending role-editor change refs that remain visible as governance facts

It explicitly excludes:

- selected-cell state
- active filters
- latest simulation refs
- stale-review comparison inputs

As a result, a role matrix can keep simulator continuity and selection continuity without drifting its committed version hash, while a visible pending edit changes the version hash because that pending posture is part of the published governance reading contract.

## Ordering Rules

The projectors normalize order before hashing:

- environment bindings by `environment_ref`
- step-up and approval rules by `action_family`
- role templates by `role_id`
- grant groups by `grant_group_ref`
- matrix rows by `resource_class`
- matrix columns by `action_family`
- matrix cells by `cell_ref`
- reason codes, approvals, scopes, and pending refs as sorted unique string sets

Equivalent logical inputs therefore replay to identical hashes even if source object order drifts.

## Projector Behavior

`GovernancePolicySnapshotProjector` publishes the route-stable shell contract for `/governance/.../policy-snapshot`, including:

- `policy_snapshot_hash`
- environment bindings
- session-security posture
- step-up and approval summaries
- masking defaults
- change basket / approval composer / blast-radius placeholders kept explicit even when empty

`RoleTemplateMatrixProjector` publishes the role workspace contract for `/governance/access/roles/{role_id}`, including:

- one mounted role template at a time
- full row and column coverage for the governed catalog
- explicit `ALLOW`, `ALLOW_MASKED`, `REQUIRE_STEP_UP`, `REQUIRE_APPROVAL`, and `DENY`
- combined step-up and approval visibility when both obligations exist
- pending change refs per cell and per workspace
- stale-review and filtered-selection recovery posture

The projector keeps the current role matrix aligned to the post-`pc_0092` policy pack, so `REQUIRE_APPROVAL` cells can still expose `required_authn_level = STEP_UP` when both obligations remain active.

## Persistence

Two append-only in-memory repositories persist the published records:

- `GovernancePolicySnapshotRepository`
- `RoleTemplateMatrixRepository`

Each stored publication keeps:

- the frozen read model
- `persisted_at`
- sorted `source_config_refs`
- sorted `material_config_hashes`

That provides stable reload and stale-view comparison basis for later governance query services without mutating the committed read model in place.
