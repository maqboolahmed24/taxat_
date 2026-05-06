# Client Timeline Event Projection And Activity Compression

`pc_0185` adds one backend-owned path for client-visible recent activity:

1. `buildClientTimelineEvent(...)` projects a schema-valid `ClientTimelineEvent`.
2. `compressClientActivityTimeline(...)` filters and compresses projected events deterministically.
3. `buildClientPortalWorkspace(...)` serializes the compressed activity rows into `activity_timeline[]`.

The workspace row shape remains the `ClientPortalWorkspace` contract shape, while the full
`ClientTimelineEvent` artifact carries `authority_truth_state`, `authority_truth_contract`, and the
timeline-scoped `customer_safe_projection`.

## Event Vocabulary Mapping

The projector accepts internal event families only through a bounded mapping:

| Internal family examples | Client event kind |
| --- | --- |
| `UPLOAD_RECEIVED`, `DOCUMENT_UPLOAD_RECEIVED`, `DOCUMENT_UPLOAD_ACCEPTED` | `UPLOAD_RECEIVED` |
| `UPLOAD_REJECTED`, `DOCUMENT_UPLOAD_REJECTED` | `UPLOAD_REJECTED` |
| `APPROVAL_READY`, `APPROVAL_PACK_READY` | `APPROVAL_READY` |
| `APPROVAL_SIGNED` | `APPROVAL_SIGNED` |
| `ONBOARDING_STEP_COMPLETED` | `ONBOARDING_STEP_COMPLETED` |
| `SUBMISSION_SENT` | `SUBMISSION_SENT` |
| `AUTHORITY_STATUS_*`, `AUTHORITY_OUTCOME_*`, `SUBMISSION_CONFIRMED`, `SUBMISSION_REJECTED`, `OUT_OF_BAND_DISCOVERY` | `STATUS_UPDATED` |

Staff-only or noisy internal families such as `ASSIGNMENT_CHANGED`, `AUDIT_EVENT_APPENDED`,
`ESCALATION_ADDED`, `GATE_REEVALUATED`, `QUEUE_REORDERED`, `STAFF_NOTE_ADDED`, and
`WORKFLOW_STATE_CHANGED` are filtered before projection.

## Authority Truth Posture

Non-authority event kinds always emit `authority_truth_state = NOT_APPLICABLE`:
`UPLOAD_RECEIVED`, `UPLOAD_REJECTED`, `APPROVAL_READY`, `APPROVAL_SIGNED`, and
`ONBOARDING_STEP_COMPLETED`.

`SUBMISSION_SENT` always emits `authority_truth_state = PENDING_ACK`, even if a caller supplies a
stronger state. Confirmed, rejected, unknown, partial, or out-of-band authority movement is emitted
as a later `STATUS_UPDATED` event.

`STATUS_UPDATED` derives authority truth from explicit authority truth state, submission lifecycle
state, or the mapped internal event family. If none is available, it emits `UNKNOWN` rather than
inventing confirmation.

## Headline Policy

Authority-related headlines are generated server-side and gated against overstatement:

- pending submission: `Submission sent, awaiting acknowledgement`
- confirmed authority state: `Authority confirmed the submission`
- rejected authority state: `Authority rejected the submission`
- unknown authority state: `Authority outcome needs review`
- out-of-band authority state: `External authority state needs review`

`Status updated` is permitted only for non-authority `STATUS_UPDATED` posture. It is rejected for
pending, unknown, rejected, partial, or out-of-band authority states. Confirming words such as
`confirmed`, `complete`, `filed`, `accepted`, or `settled` are rejected unless
`authority_truth_state = CONFIRMED`.

## Compression Rules

Compression is deterministic and idempotent:

- sort by `occurred_at` newest-first, then event-kind priority, then `event_id`
- drop duplicate `event_id`s after the first sorted occurrence
- compress repetitive upload churn by `(event_kind, related_object_ref)`
- compress status churn by `(STATUS_UPDATED, related_object_ref, authority_truth_state)`
- preserve real authority transitions, so `SUBMISSION_SENT` and later confirmed/rejected/out-of-band
  `STATUS_UPDATED` events can coexist
- cap Home activity rows to six and all other workspace rows to twelve

Workspace row details are generated or resolved from `detail_ref`, clamped to the 180-character
timeline detail budget, and checked for forbidden internal vocabulary before serialization.

## Route Consumption

`ClientPortalWorkspace` no longer hardcodes recent activity rows. It builds default timeline inputs
through `ClientTimelineEvent`, compresses them through `compressClientActivityTimeline(...)`, and
publishes only the schema-approved workspace row shape. The `/v1/client-portal/activity` route
therefore reuses the same backend-authored Home activity rail and keeps newest-first ordering under
APIRequestContext coverage.

## Verification

Coverage added:

- direct schema/custom validation for `ClientTimelineEvent`
- authority copy gating for pending, confirmed, rejected, unknown, and out-of-band states
- deterministic compression under duplicate and reordered reconnect-style input
- Home workspace activity cap and newest-first workspace serialization
- APIRequestContext checks for `/v1/client-portal/activity` ordering and non-confirming submission copy
