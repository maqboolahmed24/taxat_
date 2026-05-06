# Retention Governance Frame And Erasure Review

`pc_0193` adds the authoritative read-side projector for
`GET /v1/governance/tenants/{tenant_id}/retention` at
`packages/backend-governance/src/projectors/build_retention_governance_frame.ts`.
The projector emits one schema-valid `RetentionGovernanceFrame` from durable retention policy rows,
legal-hold rows, and erasure candidates. It is a review surface only; destructive mutation remains
outside the projector and is always staged through a change basket.

## Policy Matrix

- `statutory_minimum_ref` is always the floor. A tenant override with fewer retained days than the
  statutory minimum is published as `override_state = BLOCKED_BY_STATUTORY_MINIMUM`, keeps
  `effective_minimum_ref = statutory_minimum_ref`, and adds a visible statutory blocker.
- Missing overrides are represented by `override_state = NONE`, `tenant_override_ref = null`, and
  `staged_change_ref_or_null = null`.
- Applied tenant overrides may become the effective minimum only when their duration is at or above
  the statutory floor.
- Pending overrides publish `warning_posture = APPROVAL_OR_STEP_UP_REQUIRED` and retain a staged
  change ref so the route cannot imply immediate mutation.
- The matrix column order is fixed as
  `ARTIFACT_CLASS -> STATUTORY_BASELINE -> TENANT_OVERRIDE -> EFFECTIVE_MINIMUM -> LIMITATION_BEHAVIOR -> PSEUDONYMISATION_MODE -> EXPORT_POSTURE`.
- `editing_posture = EXPLICIT_STAGE_ONLY`, `sticky_header_mode = ROW_AND_COLUMN_HEADERS`, and
  `inline_blocker_visibility = ALWAYS_VISIBLE` are fixed route semantics.

## Legal Holds

- The legal-hold register column order is fixed as
  `CLIENT -> OBJECT_REF -> HOLD_REASON -> RELEASE_ELIGIBILITY -> BLOCKED_ERASURE_COUNT -> LAST_CHANGED_AT`.
- `release_action_posture = NONE_SELECTED` forces both `selected_hold_ref_or_null` and
  `release_preview_ref_or_null` to null.
- `PREVIEW_ONLY` and `CHANGE_BASKET_REQUIRED` require a selected hold and a release preview ref.
- A selected releasable hold publishes `CHANGE_BASKET_REQUIRED`; a selected blocked hold remains
  `PREVIEW_ONLY`.
- Hold release preview uses the selected hold's blocked erasure refs, projected provenance limitation
  refs, affected artifact count, and pseudonymisation count so newly eligible erasure consequences are
  visible before staging.

## Erasure Queue

- Erasure readiness is partitioned into the fixed section order
  `ELIGIBLE -> BLOCKED -> PENDING_REVIEW`.
- The queue never collapses blocked and pending-review candidates into one list.
- `destructive_flow_mode = CHANGE_BASKET_ONLY` is fixed for every frame.
- If `primary_blocker_ref_or_null` is populated, it points to one item in `blocked_item_refs[]`.
- Blocked erasure candidates publish impact `action_posture = BLOCKED`, keep destructive actions
  unavailable, and retain explicit `blocked_reason_refs[]`.
- Pending-review candidates require approval or step-up posture; eligible candidates still stage
  through the change basket rather than executing inline.

## Workspace And Preview

- The workspace surface order is fixed as
  `INVENTORY_RAIL -> WORKSPACE_CANVAS -> RETENTION_IMPACT_PREVIEW -> AUDIT_SIDECAR`.
- `POLICIES` mode pins `object_anchor_ref` and `focus_anchor_ref` to the selected policy row.
- `LEGAL_HOLDS` mode pins both anchors to the selected hold and binds the impact preview subject to
  the release preview ref.
- `ERASURE` mode pins both anchors to the selected erasure candidate and promotes
  `RETENTION_IMPACT_PREVIEW` until the operator stages or exits destructive review.
- Active filter chips follow validator order:
  `artifact_class`, `retention_class`, `client`, `legal_hold_state`, `release_eligibility`,
  `erasure_readiness`.

## Route Adapter Status

The local route search found no existing retention or privacy governance read route to patch. Current
work therefore publishes the backend-governance projector and schema-backed tests that a future
northbound adapter can consume as a thin wrapper.
