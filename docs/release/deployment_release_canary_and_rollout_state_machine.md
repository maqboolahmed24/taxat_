# Deployment Release, Canary, and Rollout State Machine

`DeploymentRelease` is the release runtime state authority. Rollout state is written through the backend-release state machine and is not reconstructed from CI jobs, deploy provider labels, dashboards, or canary prose.

## Candidate-Bound Canary Evidence

`CanaryHealthSummary` is an immutable evidence snapshot. Every summary stores the top-level `candidate_identity_hash` and the full nested `candidate_identity_contract`, and the summary top-level environment, build artifact, and artifact digest must mirror that contract before persistence.

The canary budget mapping is deterministic:

- latency and error budgets both `WITHIN_BUDGET` => `health_gate_state = GREEN`, `abort_recommended = false`
- exactly one budget `BREACHED` => `health_gate_state = AMBER`, `abort_recommended = false`
- exactly one budget `BREACHED` plus an explicit abort recommendation => `health_gate_state = RED`, `abort_recommended = true`
- both budgets `BREACHED` => `health_gate_state = RED`, `abort_recommended = true`

Repository writes validate `canary_health_summary` against the contract schema before storing it. Reusing a `canary_summary_id` with a different payload is rejected.

## Rollout State Machine

`DeploymentRelease.state_transition_contract` uses `object_family = DEPLOYMENT_RELEASE`, `machine_code = DEPLOYMENT_RELEASE_ROLLOUT_V1`, and `state_field_name = rollout_state`. The backend model accepts only the validator-backed transitions:

| From | Event | To |
| --- | --- | --- |
| `null` | `release_planned` | `PLANNED` |
| `PLANNED` | `canary_start` | `CANARY` |
| `PLANNED` | `emergency_promote_with_override` | `PROMOTED` |
| `CANARY` | `promote` | `PROMOTED` |
| `CANARY` | `abort` | `ABORTED` |
| `PROMOTED` | `rollback` | `ROLLED_BACK` |
| `PROMOTED` | `rollback_unsafe_fail_forward_required` | `FAILED_FORWARD` |
| `PROMOTED` | `emergency_pin` | `PINNED` |
| `FAILED_FORWARD` | `emergency_pin` | `PINNED` |
| `PROMOTED`, `FAILED_FORWARD`, `PINNED`, `ABORTED`, `ROLLED_BACK` | `supersede` | `SUPERSEDED` |

Every transition writes the current state mirror into `state_transition_contract.current_state`, retains the previous state, names the event, normalizes the transition timestamp, and records an audit ref. Illegal transitions fail before persistence.

## Rollback And Fail-Forward Boundary

Release records carry both `rollback_boundary_state` and a nested `schema_bundle_compatibility_gate_contract`. The gate hash is derived from the canonical compatibility tuple, including candidate identity, writer bundle, reader-window state, migration posture, supported client window, protected historical bundles, and rollback boundary.

Open reader-window states keep `rollback_boundary_state = ROLLBACK_ALLOWED`. Once `schema_reader_window_contract.window_state = CONTRACT_ELIGIBLE_WINDOW_CLOSED`, the release must persist `rollback_boundary_state = FAIL_FORWARD_ONLY`; `ROLLED_BACK` is rejected and the legal path is `FAILED_FORWARD`.

`FAILED_FORWARD` requires:

- `rollout_strategy = FAIL_FORWARD_COMPENSATING`
- `rollback_boundary_state = FAIL_FORWARD_ONLY`
- `compensating_release_id_or_null` set to a different release lineage
- `fail_forward_owner_ref_or_null` set to an accountable owner
- `rollback_of_release_id = null`
- non-green health posture

Rollback self-reference is rejected: `rollback_of_release_id` cannot equal `release_id`.

## Emergency Overrides

Emergency override refs are scoped to `rollout_strategy = EMERGENCY_PROMOTE`. Emergency promotions carry no canary fraction, must retain `emergency_override_ref`, and must retain `emergency_override_expires_at`. When `deployed_at` is present, the override expiry must be later than the deployment timestamp. The override does not bypass candidate identity, schema compatibility, recovery governance, or signed-build evidence requirements.

## Persistence Contract

`DeploymentReleaseRepository` validates these payloads before writing:

- `state_transition_contract`
- `deployment_release`
- `canary_health_summary` when a transition carries canary evidence

Release writes are compare-and-swap guarded by row version. Retried deployment signals with the same transition event and audit ref are idempotent; conflicting writes or stale row versions fail without a partial state mutation.
