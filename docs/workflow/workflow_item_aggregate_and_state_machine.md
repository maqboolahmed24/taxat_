# Workflow Item Aggregate And State Machine

`WorkflowItem` is the durable command-side aggregate for work coordination. It is authoritative for workflow lifecycle, assignment, queue routing, workspace versions, and request-for-info posture. It is not authority truth: every item carries `authority_truth_state` plus the `AUTHORITY_TRUTH_V1` contract so internal and customer projections cannot imply confirmation while authority evidence remains pending, unknown, partial, or out-of-band.

## Lifecycle Matrix

The implementation follows `Algorithm/state_machines.md` for `WORKFLOW_ITEM_LIFECYCLE_V1`:

| From | Event | To |
|---|---|---|
| `OPEN` | `picked_up` | `IN_PROGRESS` |
| `IN_PROGRESS` | `needs_client_input` | `WAITING_ON_CLIENT` |
| `IN_PROGRESS` | `needs_authority_response` | `WAITING_ON_AUTHORITY` |
| `IN_PROGRESS` | `blocked_condition` | `BLOCKED` |
| `WAITING_ON_CLIENT` | `client_response` | `IN_PROGRESS` |
| `WAITING_ON_AUTHORITY` | `authority_response` | `IN_PROGRESS` |
| `IN_PROGRESS` | `resolved` | `DONE` |
| `OPEN` | `no_longer_relevant` | `CANCELLED` |
| `OPEN` | `superseded_by_new_context` | `STALE` |

Documented product aliases such as `request_info_sent`, `customer_reply_recorded`, and `authority_response_recorded` are accepted at the service boundary and canonicalized into the machine event names above.

## Derived State Rules

`customer_status_projection` is derived, not free text. `INTERNAL_ONLY` items must keep it `null`; `CUSTOMER_SHARED` items derive `UNDER_REVIEW`, `ACTION_REQUIRED`, `WAITING_ON_CONFIRMATION`, `RESOLVED`, or `CLOSED` from lifecycle.

`WAITING_ON_CLIENT` requires `CUSTOMER_SHARED`, `waiting_on_actor=CUSTOMER`, and a non-null `active_request_info_ref`. A client response must target that exact request ref before the item can return to `IN_PROGRESS`.

`WAITING_ON_AUTHORITY` requires `waiting_on_actor=AUTHORITY` and authority truth in `UNKNOWN`, `PENDING_ACK`, or `PARTIAL_ACK`. Customer-shared authority waits project as `WAITING_ON_CONFIRMATION`.

`DONE`, `CANCELLED`, and `STALE` require `closed_at` and `waiting_on_actor=NONE`; non-terminal items must keep `closed_at=null`. Terminal records are immutable in the repository.

## Dedupe And Versions

Active uniqueness is keyed by `tenant_id:client_id:period:type:dedupe_key` while lifecycle is one of `OPEN`, `IN_PROGRESS`, `WAITING_ON_CLIENT`, `WAITING_ON_AUTHORITY`, or `BLOCKED`.

`openOrReuseWorkflowItem` returns the active item for that key if one exists. Once an item is terminal, the same dedupe key may be used by a successor item.

`staff_workspace_version` increments on accepted collaboration mutations. `customer_workspace_version` increments only for customer-visible mutations or projection changes and must never exceed the staff version. Internal-only items keep customer version `0`.

## Files

- `packages/backend-workflow/src/models/workflow_item.ts`
- `packages/backend-workflow/src/repositories/workflow_item_repository.ts`
- `packages/backend-workflow/src/services/*workflow_item*.ts`
- `db/migrations/phase03_0145_workflow_item_aggregate_and_state_machine.sql`
- `tests/unit/backend_workflow/*`
- `tests/integration/backend_workflow/workflow_item_lifecycle_flow.spec.ts`
