# Remediation, Accepted Risk, and Compensation Models

This note records the executable failure companion boundary introduced for `pc_0153`.

## Artifacts

- `RemediationTask` is the durable owned follow-up object for material failures that need human, workflow, or scheduled action.
- `CompensationRecord` is the auditable settlement object for already-progressed state that must be preserved, limited, reverted, reconciled, verified, or superseded.
- `AcceptedRiskApproval` is the only lawful bounded-exception object for accepted-risk posture.

Each artifact carries `failure_resolution_contract` with `contract_version = FAILURE_RESOLUTION_V1`.
The role-specific policies are:

- `REMEDIATION_TASK`: `TASK_CLOSURE_DECLARES_EFFECT_ON_ERROR`
- `COMPENSATION_RECORD`: `COMPENSATION_RETAINS_OWNER_VERIFICATION_AND_CLOSURE`
- `ACCEPTED_RISK_APPROVAL`: `APPROVAL_RETAINS_SCOPE_EXPIRY_AND_AUTHORIZATION_BASIS`

## Remediation Task Matrix

Allowed transitions:

| From | To |
| --- | --- |
| `OPEN` | `ASSIGNED`, `IN_PROGRESS`, `CANCELLED`, `SUPERSEDED` |
| `ASSIGNED` | `IN_PROGRESS`, `WAITING`, `CANCELLED`, `SUPERSEDED` |
| `IN_PROGRESS` | `WAITING`, `COMPLETED`, `CANCELLED`, `SUPERSEDED` |
| `WAITING` | `IN_PROGRESS`, `COMPLETED`, `CANCELLED`, `SUPERSEDED` |
| `COMPLETED` | terminal |
| `CANCELLED` | terminal |
| `SUPERSEDED` | terminal |

`OPEN` and `ASSIGNED` tasks must keep `started_at`, `completed_at`, `closure_outcome`, `resolution_basis_ref`, `closure_evidence_refs[]`, and `accepted_risk_approval_ref` empty, with `error_resolution_effect = ERROR_REMAINS_OPEN`.

`IN_PROGRESS` and `WAITING` tasks require `started_at`, keep closure fields empty, and may only carry `ERROR_REMAINS_OPEN` or `ERROR_MOVES_TO_IN_PROGRESS`.

`COMPLETED`, `CANCELLED`, and `SUPERSEDED` tasks require `completed_at`, `resolution_basis_ref`, non-empty `closure_evidence_refs[]`, and audit refs. `COMPLETED` must declare a lawful `error_resolution_effect`; accepted-risk closure additionally requires `closure_outcome = ACCEPTED_RISK`, `accepted_risk_approval_ref`, and `ERROR_MOVES_TO_ACCEPTED_RISK`.

`CHECK_RETENTION_HOLD` forces `blocking_class = BLOCKS_ERASURE`, non-null `retention_class`, non-null `artifact_retention_ref`, and `workflow_item_id`.

## Compensation Status Rules

Allowed transitions:

| From | To |
| --- | --- |
| `PLANNED` | `IN_PROGRESS`, `APPLIED`, `FAILED`, `CANCELLED`, `SUPERSEDED` |
| `IN_PROGRESS` | `APPLIED`, `FAILED`, `CANCELLED`, `SUPERSEDED` |
| `APPLIED` | `VERIFIED`, `SUPERSEDED` |
| `VERIFIED` | terminal |
| `FAILED` | terminal |
| `CANCELLED` | terminal |
| `SUPERSEDED` | terminal |

`PLANNED` and `IN_PROGRESS` compensation must not carry `compensated_at`, `verification_ref`, `resolution_basis_ref`, `closure_evidence_refs[]`, or `superseded_by_compensation_id`.

`APPLIED` and `VERIFIED` require `compensated_at >= created_at`, `resolution_basis_ref`, and non-empty closure evidence. `VERIFIED` additionally requires `verification_ref`; `verification_ref` is forbidden in every other status.

`FAILED`, `CANCELLED`, and `SUPERSEDED` require closure basis and evidence. `SUPERSEDED` requires `superseded_by_compensation_id` and forbids self-reference.

`PRESERVE_AND_LIMIT` requires `retention_class` and `artifact_retention_ref`. `OPEN_RECONCILIATION` and `REQUIRE_MANUAL_SETTLEMENT` require `workflow_item_id`.

## Accepted-Risk Approval Rules

Allowed transitions:

| From | To |
| --- | --- |
| `ACTIVE` | `EXPIRED`, `REVOKED`, `SUPERSEDED` |
| `EXPIRED` | terminal |
| `REVOKED` | terminal |
| `SUPERSEDED` | terminal |

Every approval requires non-empty `bounded_scope_refs[]`, `rationale_ref`, `audit_refs[]`, and `provenance_refs[]`.

`expires_at` must be later than `approved_at`. `revoked_at` must not predate `approved_at`. `superseded_by_approval_id` must not self-reference.

`EXPLICIT_APPROVAL` requires `approver_type` of `APPROVER`, `TENANT_ADMIN`, or `SECURITY_OPERATOR`, a non-null `approver_ref`, and null `policy_basis_ref`.

`POLICY_BASIS` requires `approver_type = SYSTEM_POLICY`, null `approver_ref`, and non-null `policy_basis_ref`.

## Linkage Rules

All three artifacts bind `error_id`, `manifest_id`, `root_manifest_id`, `audit_refs[]`, and `provenance_refs[]`. `workflow_item_id` is nullable except where the mode or task type requires governed follow-up.

Non-null `retention_class` and `artifact_retention_ref` must appear together. This prevents retention/privacy failure posture from drifting away from the exact surviving or limited artifact retention anchor.

Repositories normalize records before persistence, reject illegal transitions, preserve immutable identity fields, and make terminal objects immutable. Services are the intended write path for creation, advancement, verification, supersession, expiry, and revocation.
