# Collaboration Thread And Entry Persistence

`CollaborationThread` and `CollaborationEntry` are the append-only substrate for staff and customer
workspace activity. They are coordination artifacts only; they do not manufacture authority truth.

## Thread Creation

Thread bootstrap is deterministic from `WorkflowItem.collaboration_visibility`:

- `CUSTOMER_SHARED` items require a `CUSTOMER_VISIBLE` thread and an `INTERNAL_ONLY` thread.
- `INTERNAL_ONLY` items require only an `INTERNAL_ONLY` thread and must not retain a customer lane.

The thread ids mirror the refs already carried by `WorkflowItem`:

- customer lane: `WorkflowItem.customer_thread_ref`
- internal lane: `WorkflowItem.internal_thread_ref`

Each thread keeps `head_sequence`, `lifecycle_state`, `participant_refs[]`, and `last_entry_ref`.
An empty thread must be `OPEN`, have `head_sequence = 0`, and clear `last_entry_ref`.

## Append Protocol

Appending an entry requires:

- one existing `OPEN` thread
- an exact `expected_thread_head_sequence`
- one `command_id`
- one `command_receipt_ref`
- one `semantic_action_id`
- one `audit_event_ref`

The service allocates `thread_sequence = head_sequence + 1`, validates visibility and causal
lineage, persists the immutable entry, then projects the thread head to the new sequence. Duplicate
safe retries are keyed by `command_id` and replay the original entry without allocating another
sequence.

`validateCollaborationThreadSequence` verifies that a thread is monotonic, gap-free, visibility
scoped, and that `last_entry_ref` points to the highest-sequence entry.

## Entry Type Semantics

Entry types are schema-backed:

- `COMMENT`: lane-specific comment with a body.
- `NOTE`: staff-only body entry.
- `STATUS_CHANGE`: lane-safe status entry.
- `ASSIGNMENT_CHANGE`: internal-only assignment activity.
- `ESCALATION`: internal-only escalation activity.
- `REQUEST_INFO`: customer-visible request prompt with exact `request_info_ref`.
- `REQUEST_INFO_RESPONSE`: customer-visible reply with exact `request_info_ref`.
- `ATTACHMENT_ONLY`: attachment-only event with no body.
- `SYSTEM`: lane-safe system event, including redaction events.

`NOTE`, `ASSIGNMENT_CHANGE`, and `ESCALATION` are always `INTERNAL_ONLY`.
`REQUEST_INFO` and `REQUEST_INFO_RESPONSE` are always `CUSTOMER_VISIBLE`.

## Causal Reply Rules

`causal_parent_entry_ref` must resolve to an existing entry when supplied. Customer-visible entries
may only point at customer-visible parents. `REQUEST_INFO_RESPONSE` must additionally prove that its
`causal_parent_entry_ref` equals the exact `RequestInfoRecord.prompt_entry_ref`; no nearest-visible
or latest-open request heuristic is allowed.

Attachment refs may be checked with an attachment visibility lookup. A customer-visible entry fails
closed if it points to an internal-only attachment.

## Redaction

Redaction is not an in-place body edit. `redactCollaborationEntry` appends a new `SYSTEM` entry in
the same lawful lane, sets `redaction_state = REDACTED`, points `causal_parent_entry_ref` at the
original entry, and preserves the original entry unchanged.
