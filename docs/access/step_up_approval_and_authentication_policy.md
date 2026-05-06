# Step-Up, Approval, And Authentication Policy

`pc_0092` moves sensitive-action posture into three governed policy artifacts and five executable services:

- `config/access/authentication_level_policy.json`
- `config/access/approval_requirement_resolution.json`
- `config/access/non_delegable_action_family_catalog.json`
- `packages/backend-access/src/services/authentication_level_policy_service.ts`
- `packages/backend-access/src/services/step_up_policy_service.ts`
- `packages/backend-access/src/services/approval_capability_resolver.ts`
- `packages/backend-access/src/services/approval_resolution_policy_service.ts`
- `packages/backend-access/src/services/session_challenge_rotation_service.ts`

## Source Of Truth

The policy split is deliberate:

- `authentication_level_policy.json` decides required authentication level, fresh-step-up windows, session-client transition rules, and which artifact kinds are invalidated after successful step-up completion.
- `non_delegable_action_family_catalog.json` marks action families that remain human-only, non-delegable, or exceptional-authority-sensitive even when other policy inputs might otherwise allow machine execution.
- `approval_requirement_resolution.json` decides tuple approval posture, governance approval posture, approver capability mapping, and requester-approver separation of duties.

No controller or route handler is expected to restate these rules. `AuthorizeService` and command-admission flows consume the services directly.

## Action Mapping

Sensitive action families now resolve through explicit policy rows:

| Resource class | Action family | Human-only | Authn requirement | Approval requirement | Notes |
| --- | --- | --- | --- | --- | --- |
| `SubmissionRecord` | `SUBMIT_TO_AUTHORITY` | Yes | Fresh `STEP_UP` | None from tuple policy | Authority-integrated submission remains non-delegable. |
| `Override` | `CREATE_OVERRIDE` | Yes | No extra authn row | `SINGLE_APPROVER` | Approval is frozen even when step-up is not required. |
| `Override` | `APPROVE_OVERRIDE` | Yes | Fresh `STEP_UP` | None from tuple policy | Approval actor must still satisfy segregation-of-duties rules. |
| `ConfigChangeRequest` | `APPROVE_CONFIG` | Yes | Fresh `STEP_UP` | None from tuple policy | Used by governance/config approval surfaces. |
| `ConnectorBinding` | `LINK_AUTHORITY_SOFTWARE` | Yes | Fresh `STEP_UP` | `SINGLE_APPROVER` | Step-up surfaces before approval; approval remains frozen afterward. |
| `ConnectorBinding` | `UNLINK_AUTHORITY_SOFTWARE` | Yes | Fresh `STEP_UP` | `DUAL_APPROVER` | Unlinking keeps stronger approval posture than linking. |
| `RetentionAction` | `EXECUTE_RETENTION` | Yes | Fresh `STEP_UP` | `DUAL_APPROVER` | Retention execution remains human-gated. |
| `RetentionAction` | `EXECUTE_ERASURE` | Yes | Fresh `STEP_UP` | `SECURITY_REVIEW` | Erasure additionally routes through security review posture. |

Unmasked evidence export and comparable high-trust operations are expected to consume the same policy services rather than inventing local gating logic.

## Frozen Approval And Step-Up Precedence

The authorizer now resolves approval and step-up separately:

- `StepUpPolicyService` decides whether the tuple requires `MFA` or `STEP_UP`, whether a principal class can ever satisfy the requirement, and whether the frozen principal context currently satisfies it.
- `ApprovalResolutionPolicyService` decides required approvals and whether governance posture may convert a preview into an approval-gated commit.
- `AuthorizationTupleEvaluator` gives `REQUIRE_STEP_UP` precedence over `REQUIRE_APPROVAL`, but preserves `pending_required_approvals` and `pending_approval_requirement` in the blocked response.

That means a request such as `ConnectorBinding::LINK_AUTHORITY_SOFTWARE` can resolve in two stages without recomputing approval loosely:

1. Pre-step-up: `REQUIRE_STEP_UP` with frozen pending approvals.
2. Post-step-up with a rebuilt principal context: `REQUIRE_APPROVAL` with the same approval vector.

## Session Challenge Rotation

`SessionChallengeRotationService` wraps `SessionLifecycleService.completeStepUp(...)` and keeps post-step-up replay invalidation explicit:

- successful step-up rotates `ActorSession.session_binding_hash`
- append-only session transition records retain the `STEP_UP_SATISFIED` lineage
- pre-step-up artifacts tied to the old binding hash are invalidated
- invalidation is policy-driven through `authentication_level_policy.json`
- stale command tokens, resume tokens, and upload-control artifacts are rejected after rotation

`assertFreshStepUp(...)` centralizes the freshness check for execution-time admission. It rejects both expired proof windows and device-invalidated sessions.

## Actor-Class Restrictions

The authn/step-up services also codify allowed session posture transitions:

- browser human sessions may complete step-up and must rotate the binding hash afterward
- native human sessions may complete step-up and are invalidated if the device binding is revoked
- automation sessions for `SERVICE` and `EXTERNAL` principals remain `BASIC` only and cannot complete human step-up
- requester self-approval is rejected even when the approver technically holds the required capability

## Governance Coupling

Governance simulation outputs now flow through the same approval service. In particular:

- `APPROVAL_GATED` governance posture can surface approval requirements
- `BOUNDED_SAFE` governance posture remains non-approval
- `PREVIEW_ONLY` governance posture is terminal for authorization and cannot be converted into commit authority by adding approvals

That keeps governance preview semantics aligned with the mutation simulator instead of drifting into workflow-specific approval shortcuts.
