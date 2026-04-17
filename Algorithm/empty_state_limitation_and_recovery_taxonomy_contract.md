# Empty-State, Limitation, and Recovery Taxonomy Contract

This document defines the FE-38 shell truth boundary for empty, partial, limited, stale, degraded,
and recovery-required presentation.

## Contract boundary

Every shell family that can surface domain truth to a user SHALL publish one
`state_taxonomy_contract` bound to
`schemas/shell_state_taxonomy_contract.schema.json`. The contract is authoritative for:

- the one active shell-level empty-state code when a mounted primary or promoted support surface is
  rendering absence or limitation
- the exact shell `settlement_state` and `recovery_posture` reflected into the renderer
- whether mounted context is preserved inline, preserved read-only, inline-recovered, or superseded
- the renderer policies that forbid generic empty placeholders, route-wide spinner replacement, and
  profile-local vocabulary drift

## Shared taxonomy

The shared empty-state vocabulary is:

- `NOT_REQUESTED`
- `NOT_YET_MATERIALIZED`
- `LIMITED`
- `NOT_APPLICABLE`

These states SHALL remain machine-distinct. They SHALL not collapse into one generic `No data`,
generic loading spinner, or generic warning banner.

The shared shell freshness and recovery vocabulary is:

- `settlement_state in {STEADY, RECEIPT_PENDING, FRESHENING, STALE_REVIEW_REQUIRED, DEGRADED_READ_ONLY, RECOVERY_REQUIRED}`
- `recovery_posture in {NONE, INLINE_RECONNECT, INLINE_REBASE, READ_ONLY_LIMITED, OBJECT_SUPERSEDED, ACCESS_REBIND_REQUIRED}`

## Surface obligations

- `LIMITED` SHALL retain explicit `limitation_reason_codes[]`.
- `NOT_REQUESTED`, `NOT_YET_MATERIALIZED`, and `NOT_APPLICABLE` SHALL retain typed
  `state_reason_code_or_null` bindings so profile-specific wording still maps back to one canonical
  meaning.
- Previously valid content SHALL remain mounted during `FRESHENING`, stale review, degraded
  read-only posture, and inline recovery.
- Recovery SHALL preserve the current object and focus anchor unless
  `recovery_posture = OBJECT_SUPERSEDED`.
- Shells with mutation-capable action strips SHALL fail closed to `NO_SAFE_ACTION` during stale,
  degraded, or recovery-required posture.

## Shell-family bindings

- `LowNoiseExperienceFrame` binds the contract to `DECISION_SUMMARY` or the active `DETAIL_DRAWER`
  entry when one of those surfaces is publishing typed empty or limited posture.
- `WorkspaceSnapshot` binds the contract to the promoted collaboration `DETAIL_DRAWER` module when
  that module is non-populated or limited.
- `ClientPortalWorkspace` binds the contract to `LIMITATION_NOTICE` when the portal promotes a
  blocking limitation surface; otherwise it still publishes settlement, recovery, and mounted
  context posture through the same contract.
- `TenantGovernanceSnapshot` and `NativeOperatorWorkspaceScene` SHALL publish the same contract so
  recovery, stale review, and mounted-context preservation cannot drift from the shared shell law,
  even when they do not currently expose one active empty-state surface.
