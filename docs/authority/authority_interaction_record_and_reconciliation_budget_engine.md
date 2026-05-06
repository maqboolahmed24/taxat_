# Authority Interaction Record And Reconciliation Budget Engine

`pc_0140` implements `AuthorityInteractionRecord` as the durable runtime ledger for one authority exchange. It cross-checks:

- `PROMPT/CARDS/pc_0140.md`
- `PROMPT/shared_operating_contract_0134_to_0141.md`
- `Algorithm/schemas/authority_interaction_record.schema.json`
- `Algorithm/schemas/authority_reconciliation_control_contract.schema.json`
- `Algorithm/schemas/authority_truth_contract.schema.json`
- `Algorithm/schemas/command_truth_boundary_contract.schema.json`
- `Algorithm/data_model.md` AuthorityInteractionRecord section
- `Algorithm/state_machines.md` AuthorityInteractionRecord lifecycle
- `Algorithm/modules.md` `RECORD_AUTHORITY_INTERACTION`, `PERSIST_AUTHORITY_RECONCILIATION_CONTROL`, `RECONCILE_AUTHORITY_STATE`, and `EMIT_AUTHORITY_RECONCILIATION_ANALYTICS`
- `Algorithm/authority_interaction_protocol.md` reconciliation budget rules
- `Algorithm/test_vectors.md` TV-70F through TV-70V

## Lifecycle Matrix

The transition guard in `validate_authority_interaction_transition.ts` permits only:

| From | Event | To |
| --- | --- | --- |
| `REQUEST_REGISTERED` | `dispatch_materialized` | `DISPATCH_READY` |
| `DISPATCH_READY` | `exclusive_gateway_claim_and_send_begin` | `TRANSMIT_IN_FLIGHT` |
| `DISPATCH_READY` | `duplicate_bucket_changed_before_send` | `ABANDONED` |
| `DISPATCH_READY` | `binding_invalidated_before_send` | `ABANDONED` |
| `TRANSMIT_IN_FLIGHT` | `provider_response_captured` | `RESPONSE_CAPTURED` |
| `TRANSMIT_IN_FLIGHT` | `timeout_envelope_recorded` | `RESPONSE_CAPTURED` |
| `TRANSMIT_IN_FLIGHT` | `exchange_superseded_or_quarantined` | `ABANDONED` |
| `RESPONSE_CAPTURED` | `reconciliation_begin` | `RECONCILING` |
| `RESPONSE_CAPTURED` | `response_terminal_without_reconciliation` | `RESOLVED` |
| `RECONCILING` | `resolution_reached` | `RESOLVED` |

`RESOLVED` and `ABANDONED` are terminal in place. New attempts must allocate new lineage.

## Response Meaning

`response_history_ids[]` is append-only and ordered. `active_response_id` is not “latest response”; it is the currently admissible authority meaning and must already exist in the history.

`resolution_basis` is null until `RESOLVED`. A direct terminal response resolves as `TERMINAL_RESPONSE`; a selected response after reconciliation resolves as `RECONCILIATION_RESULT`. `abandonment_reason_code` is legal only in `ABANDONED`.

## Budget Packet

`reconciliation_control_contract{...}` is the persisted budget authority. It carries:

- budget state and attempt count
- cadence, deadline, next follow-up time
- unresolved posture and reason codes
- resend legality and resend reason codes
- escalation owner, workflow, evidence, due time, and state
- replay policy `RESUME_PERSISTED_BUDGET_ONLY`
- analytics outcome class

Restore, replay, and continuation read this grouped packet and never infer fresh automatic retry economics from queue-worker state.

## Resend Legality

`IDEMPOTENT_RECOVERY_ONLY` is legal only while `TRANSMIT_IN_FLIGHT`, where a queue rebuild may recover the same sealed request lineage but must not blindly resend as a new mutation.

`FOLLOW_UP_READ_ONLY` is legal only while the reconciliation budget is `ACTIVE`, and only for read-after-write or poll style follow-up.

`BLOCKED_BY_RECONCILIATION` is used when the budget is exhausted, the deadline expired, or contradictory authority evidence blocks resend before budget math.

`BLOCKED_BY_ESCALATION` is used only with durable escalation owner/workflow/evidence/due time.

`CLOSED_NO_RESEND` is the terminal posture for resolved or abandoned interactions.

## Persistence

`db/migrations/phase03_0140_authority_interaction_record_and_reconciliation_budget.sql` adds indexes by request hash, duplicate meaning, manifest, lifecycle state, budget state, and next reconciliation time.
