# Client Upload Session Identity Freeze And Rebase

`pc_0181` makes upload-session meaning backend-authored for the portal.

## Binding Contract

Every governed `ClientUploadSession` publishes one `upload_request_binding_contract`.
The frozen binding scope is:

`tenant_id|client_id|request_id|frozen_request_version_ref`

`request_identity_ref` mirrors `request_id`. This matches the canonical validator and prevents a
second weak identity from drifting away from the request lane.

## Binding States

- `ORIGINAL_CURRENT`: frozen request version still matches the live request version.
- `RECONFIRMATION_REQUIRED`: the live request version advanced while the upload remains frozen to
  the original request version.
- `RECONFIRMED_CURRENT`: the client explicitly reconfirmed the frozen upload against the live
  request version.
- `SUPERSEDED`: the upload is retained as stale history and cannot satisfy the current request.

In-flight rebases preserve `upload_session_id`, `storage_ref`, and `request_version_ref`. They update
only the live request version and binding posture, so bytes are never silently rebound to the new
request meaning.

## Confidence And Recovery

`deriveUploadConfidenceScore(...)` implements the frozen formula from
`compute_parity_and_trust_formulas.md`, including zero-confidence integrity and quarantine
overrides, superseded confidence caps, and the attached-session confidence floor.

`deriveUploadRecoveryPostureAndNextAction(...)` derives `next_action_code`, `recovery_posture`,
`attachment_state`, and `dominant_hazard_code` from durable blocker state. UI and route layers do
not infer whether to resume, retry, reconfirm, restart, or contact support.

## Completion Boundary

`ATTACHED` requires verified bytes, clean scan, accepted validation, current or reconfirmed binding,
`upload_confidence_score >= 85`, an attached document ref, and no recovery blocker.

Accepted stale uploads move to `REBIND_REQUIRED` with `RECONFIRM_REQUEST`; in-flight stale uploads
stay `STAGED` and resumable until transfer settles.

## Northbound Use

Upload allocation, duplicate retry, blob progress, status rebase, and attachment confirmation now
consume the portal upload binding and posture services instead of rebuilding those fields locally.
The later upload recovery harness consumes these same projected sessions rather than becoming a
second runtime truth source.
