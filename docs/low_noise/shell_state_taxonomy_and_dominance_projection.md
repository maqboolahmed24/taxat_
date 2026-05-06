# Shell State Taxonomy And Dominance Projection

The low-noise backend now publishes shell salience through reusable server-side projectors instead of renderer-local hierarchy rules.

## Authoritative Input

The canonical projector input is the durable shell posture: shell family, optional portal route, settlement state, recovery posture, actionability state, primary action code or no-safe-action reason, active support surface, explicit compare/audit mode, and typed empty or limitation candidates. Copy, visual order, client sorting, and route-local salience hints are not inputs.

## Dominance Mapping

`CALM_SHELL` maps the dominant question to `DECISION_SUMMARY` and the dominant action to `ACTION_STRIP`. `DETAIL_DRAWER` is the only calm-shell support surface and remains `SUBORDINATE`, `INVESTIGATION`, or `RECOVERY`.

`CLIENT_PORTAL_SHELL` uses the route table from the portal contract: `HOME -> STATUS_HERO`, `DOCUMENTS -> DOCUMENT_CENTER`, `APPROVALS -> APPROVAL_CENTER`, `ONBOARDING -> STEP_WORKSPACE`, and `HELP -> SUPPORT_PANEL`. On `HOME`, `TASK_QUEUE` is either a primary-action mirror or secondary to the primary action. On `HELP`, `SUPPORT_PANEL` is primary, not a sidecar.

## Safe Action State

`NO_SAFE_ACTION` is a published posture, not just an absent button. Recovery postures `ACCESS_REBIND_REQUIRED` and `READ_ONLY_LIMITED` force `NO_SAFE_ACTION`. Stale, degraded, and recovery low-noise frames already fail closed in the action-strip builder, then the dominance projector mirrors that actionability exactly.

## Empty And Limitation State

`ShellStateTaxonomyContract` selects one active absence or limitation state from ordered typed candidates. `LIMITED` requires non-empty `limitation_reason_codes[]`; non-limited empty states must not carry limitation reasons. When no active empty state exists, both `current_empty_state_or_null` and `current_empty_surface_code_or_null` clear.

## Frame Integration

`buildLowNoiseExperienceFrame` now calls `projectShellDominanceContract` and `projectShellStateTaxonomyContract`. `validateLowNoiseFramePublication` reprojects the expected contracts from the mounted frame surfaces and rejects drift before publication.
