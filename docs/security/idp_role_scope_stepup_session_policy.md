# IdP Role, Scope, Step-up, and Session Policy

## Purpose

This pack freezes the coarse identity-provider posture required for Taxat human sign-in, machine bootstrap, MFA or step-up challenge posture, and session hygiene without turning the provider into the source of legal authorization truth.

The checked-in machine-readable sources are:

- `config/identity/idp_role_catalog.json`
- `config/identity/idp_scope_catalog.json`
- `config/identity/step_up_policy_matrix.json`
- `config/identity/session_policy_matrix.json`
- `data/provisioning/idp_policy_evidence.template.json`

## Source Backbone

The policy pack is grounded in the Taxat corpus sections named in `pc_0040`, especially:

- `Algorithm/actor_and_authority_model.md` for actor classes, action families, policy-decision boundaries, delegation rules, and non-delegable step-up actions.
- `Algorithm/northbound_api_and_session_contract.md` for command families and browser, native, machine, invite, and upload-session law.
- `Algorithm/security_and_runtime_hardening_contract.md` for identity, session, and hardening requirements.
- `Algorithm/admin_governance_console_architecture.md` and `Algorithm/low_noise_experience_contract.md` for access rendering, operator posture, and semantic inspection surfaces.

Current IdP vendor grounding was revalidated on `2026-04-18` against official Auth0 guidance:

- [RBAC](https://auth0.com/docs/manage-users/access-control/rbac)
- [Enable MFA](https://auth0.com/docs/secure/multi-factor-authentication/enable-mfa)
- [Step-up Authentication](https://auth0.com/docs/secure/multi-factor-authentication/step-up-authentication)
- [Configure Session Lifetime Settings](https://auth0.com/docs/manage-users/sessions/configure-session-lifetime-settings)
- [Manage User Sessions with the Management API](https://auth0.com/docs/manage-users/sessions/manage-user-sessions-with-auth0-management-api)
- [Configure Refresh Token Rotation](https://auth0.com/docs/secure/tokens/refresh-tokens/configure-refresh-token-rotation)
- [Application Settings](https://auth0.com/docs/get-started/applications/application-settings)

## Policy Decisions

### Roles

The provider only carries coarse entry posture:

- `8` roles total
- `6` human membership roles
- `2` service-grant roles

These roles deliberately stop short of encoding:

- per-client delegation truth
- `AuthorityLink` state
- authority-of-record outcome
- final approval legality
- masking or export legality

Those dimensions remain engine-owned and are called out explicitly in each role row under `engine_owned_dimensions`.

### Scopes

The scope catalog fixes `18` scopes:

- `9` baseline scopes for ordinary entry posture
- `9` elevated scopes that only request step-up-capable challenge posture

Elevated scopes are request-time hints for the IdP. They are not the final authorization result. The backend still decides whether the command is legal once current delegation, authority, approval-pack, and tenant-policy state are evaluated.

### Step-up and Approval

The step-up matrix normalizes `10` source-backed trigger rows:

- `8` `STEP_UP_OR_APPROVAL_REQUIRED`
- `1` `STEP_UP_REQUIRED`
- `1` authenticated-session-upgrade gate

Important invariants:

- `CLIENT_SIGNATORY` sign-off remains explicit and tied to `scope.elevated.client_signoff`.
- access-widening, authority-linking, retention-changing, governance mutation, and submission-adjacent actions stay visibly elevated.
- session invalidation after `STEP_UP_COMPLETED`, `TENANT_SWITCH`, `SESSION_REVOKED`, `LOGOUT`, authority rebinding drift, stale-view rebase, or invite expiry is recorded in one place instead of scattered prose.

### MFA and Session Posture

The chosen Auth0-compatible posture is:

- tenant-default MFA policy: `NEVER_WITH_ACTION_DRIVEN_STEP_UP`
- enabled independent factors: `webauthn_roaming`, `otp`
- enabled dependent factor: `recovery_code`
- step-up strategy: requested elevated scopes plus post-login Action challenge

The session matrix freezes `6` channel rows:

- browser operator
- browser portal user
- native macOS operator
- machine runtime
- browser invite or limited-entry upgrade
- governed upload transfer

Important consequences:

- browser, native, machine, and limited-entry posture stay distinct
- native uses rotating refresh tokens
- machine runtime never participates in human step-up semantics
- post-step-up rotation is explicit for human channels

## Viewer and Drift Detection

`automation/provisioning/report_viewer` now exposes the `access-stepup-matrix` route so later agents can inspect:

- coarse roles
- scopes
- session profiles
- action-family trigger rows
- exact source references
- the boundary between IdP posture and Taxat authorization truth

The provisioning flow fails closed when observed provider posture diverges from the checked-in policy pack. Drift is recorded in `idp_policy_evidence.template.json` as a structured register instead of being silently auto-healed.

## Known Gap

`PROMPT/shared_operating_contract_0038_to_0045.md` was still absent while this pack was implemented. That gap is recorded in the generated artifacts, so the pack grounded itself directly in the named algorithm contracts, prior card outputs, and current official Auth0 documentation.
