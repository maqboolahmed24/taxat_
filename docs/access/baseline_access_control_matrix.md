# Baseline Access Control Matrix

`pc_0083` establishes a governed baseline access-control substrate for the governance access workspace. The baseline does not infer permission from shell presence. Instead it compiles four explicit inputs into one sparse, fail-closed matrix:

- `config/access/resource_action_catalog.json`
- `config/access/default_roles.json`
- `config/access/step_up_policy.json`
- `config/access/approval_policy.json`

## Baseline posture

The access model keeps five layers separate:

- role-template permission
- live principal authentication posture
- client delegation coverage
- external authority-link readiness
- approval or review requirements

This separation matters because the same tuple can move between `ALLOW`, `REQUIRE_STEP_UP`, `REQUIRE_APPROVAL`, and `DENY` depending on which layer fails. The simulator therefore replays one compiled tuple plus one `PrincipalContext` instead of pretending that the role matrix alone is authoritative.

## Default roles

The baseline seeds four roles:

- `TENANT_ADMIN`
- `APPROVER`
- `AUDITOR`
- `SUPPORT_OPERATOR`

The seeds are intentionally sparse. Missing tuples stay `DENY`. If a principal accumulates multiple roles, merge posture stays fail closed: `DENY` outranks approval, step-up, masked allow, and plain allow.

## Materialized output

`packages/access-control/src/emit_baseline_access_artifacts.ts` materializes `config/access/access_control_matrix.json`. That file contains:

- the compiled role templates
- the policy snapshot hash
- the principal access preview
- the role template matrix preview
- the governance simulator scenarios

The public governance pages under `apps/operator-web/public/governance/access` read this emitted bundle directly, so the browser surface cannot drift into a hand-authored fork.

## Simulator rules

The baseline simulator is intentionally `READ_ONLY_DECISION`.

- It never commits or stages live mutations.
- It may narrow a role-allowed tuple to `DENY` when delegation or authority-link truth is missing.
- It may convert `REQUIRE_STEP_UP` to `ALLOW` only when frozen step-up evidence is present.
- It keeps service-principal denial explicit for human-only actions.

## Verification

Recommended verification flow for the baseline access slice:

1. `node --experimental-strip-types ./packages/access-control/src/emit_baseline_access_artifacts.ts --emit`
2. `node --experimental-strip-types ./packages/access-control/src/emit_baseline_access_artifacts.ts --check`
3. `node --experimental-strip-types ./tools/repository/verify_code_quality_coverage.ts --check`
4. Run the unit, integration, and browser tests for `tests/unit/access`, `tests/integration/access`, and `tests/playwright/governance`.
