# Problem Envelope And Precondition Rules

`pc_0167` centralizes northbound stale-view and HTTP precondition behavior in `packages/backend-northbound`.

## Failure Mapping

- Domain stale-view conflicts use `409 VIEW_STALE` when the client supplied a command-side stale guard that no longer matches the authoritative route guard.
- Route, shell, frame-epoch, or grouped stability drift uses `409 REBASE_REQUIRED`.
- Pure HTTP `If-Match` validator mismatch uses `412 PRECONDITION_FAILED` and does not execute the guarded mutation.
- Hidden or unauthorized objects do not publish recovery refs.

## Recovery Families

One `ProblemEnvelope` may publish only one non-manifest recovery family:

- collaboration: `latest_workspace_snapshot_ref`
- portal: exactly one of `latest_client_portal_workspace_ref`, `latest_approval_pack_ref`, or `latest_upload_session_ref`
- governance: `latest_policy_snapshot_ref`
- manifest: `latest_decision_bundle_ref` and/or manifest `latest_resume_token`

Projection recovery refs require a durable `latest_command_receipt_ref`; otherwise the mapper rejects the envelope before publication.

## ETags And If-Match

`deriveAuthoritativeEtag(...)` derives transport validators from authoritative guard values or grouped `RouteStabilityContract` hashes. It does not hash pretty-printed response JSON.

`validateIfMatchAgainstAuthoritativeGuard(...)` uses strong validator matching: weak validators are rejected for guarded mutation paths, quoted and unquoted strong tags are normalized, `*` only passes when a current representation exists, and mismatches return a typed `ProblemEnvelope` with `Cache-Control: no-store` plus the current `ETag`.

## Portal Safety

Portal-facing problem envelopes clamp `suggested_detail_surface_code` to `CUSTOMER_ACTIVITY`, `FILES`, or `null`. Staff-only surfaces such as `AUDIT_TRAIL` are never suggested to portal clients.

