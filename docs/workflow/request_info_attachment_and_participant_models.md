# Request Info, Attachment, and Participant Persistence

`pc_0148` adds command-side workflow artifacts for request-for-info identity,
collaboration attachment publication, and participant/watch posture. These records are durable
coordination state only; they do not manufacture authority truth.

## Request Info Records

`RequestInfoRecord` freezes the exact customer request identity:

- `OPEN` is always `request_state_version = 1` with response and closure lineage cleared.
- `RESPONDED` is always `request_state_version = 2` and requires the full response quartet:
  `response_entry_ref`, `response_body_ref`, `responded_by_ref`, and `responded_at`.
- `CLOSED + CUSTOMER_REPLY_ACCEPTED` is always `request_state_version = 3` and preserves response
  lineage.
- `CLOSED + CANCELLED` or `CLOSED + SUPERSEDED` is always `request_state_version = 2` and clears
  response lineage.

`createRequestInfoRecord` allocates the next immutable ordinal from the workflow item, binds the
prompt entry/body refs, due date, opened notifications, and open audit ref, then returns the
workflow item advanced to `WAITING_ON_CLIENT`. `recordRequestInfoResponse` requires the exact
`request_info_id` and prompt entry binding, so replies cannot float to the nearest open request.

## Attachments

`CollaborationAttachment` separates upload staging from governed publication. `storage_ref` only
proves staged bytes exist; downloadability is derived from publication plus malware posture:

- pending scan: `publication_state = PENDING_SCAN`, `download_state = PENDING`, no `download_ref`
- clean scan: `publication_state = AVAILABLE`, `download_state = DOWNLOADABLE`, non-null
  `download_ref`
- quarantined scan: `publication_state = QUARANTINED`, `download_state = UNAVAILABLE`, typed
  `unavailable_reason_code = QUARANTINED_BY_MALWARE_SCAN`

Customer-safe copy and derivative publication require `CUSTOMER_VISIBLE` visibility plus explicit
`source_attachment_ref`. Internal-only attachments are limited to `DIRECT_UPLOAD` so they cannot
accidentally acquire customer-safe posture.

## Participants

`WorkItemParticipant` keeps staff watch posture separate from customer participant posture:

- customer-facing roles always use `watch_state = CUSTOMER_PARTICIPANT`
- customer participants always clear `last_read_internal_sequence`
- `PRIMARY_OWNER` remains limited to staff owner roles
- internal-only workflow items reject new customer participant rows and remove retained customer
  rows during sync

Customer-visible projections should call `validateCustomerParticipantMapping` with
`scope = CUSTOMER_VISIBLE_PROJECTION` so only lawful customer participants are serialized.

## Persistence

The migration `phase03_0148_request_info_attachment_and_participant_models.sql` mirrors the schema
and validator invariants with table checks for state-version progression, response-lineage
quartets, attachment scan/download truth tables, customer-safe copy posture, and participant role
mapping.
