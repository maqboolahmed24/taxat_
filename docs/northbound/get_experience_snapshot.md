# GET /v1/manifests/{manifest_id}/experience/snapshot

`GET /v1/manifests/{manifest_id}/experience/snapshot` returns the latest materialized `LowNoiseExperienceFrame` for a manifest. It is a durable read-side projection surface: the endpoint loads the latest persisted frame by `manifest_id`, republishes only transport recovery material, and fails closed when frame markers or grouped contracts drift.

## Success

- Status: `200`
- Headers: `Cache-Control: no-store`
- Body: `LowNoiseExperienceFrame`

The response body preserves the persisted frame content and publishes a fresh `resume_token`, one `stability_contract`, and one `stream_recovery_contract`. The grouped stability contract uses this exact guard vector:

- `decision_bundle_hash_or_null = decision_bundle_hash`
- `shell_stability_token_or_null = shell_stability_token`
- `frame_epoch_or_null = frame_epoch`
- all non-manifest guard components are `null`

`guard_vector_hash` is the canonical hash of those components. `publication_generation` is inherited from the persisted frame's route stability contract and is rejected if the persisted generation is missing or malformed.

The stream recovery contract binds the route key, manifest subject, session, access binding, masking context, publication generation, frame epoch, sequence frontier, compaction floor, and raw resume-token binding. The raw `resume_token` is transport material only; clients must treat `stream_recovery_contract` as the authority for reconnect and rebase.

## Not Ready

When no materialized frame is visible, the endpoint returns a typed `ProblemEnvelope`:

- Status: `404`
- `problem_code = EXPERIENCE_SNAPSHOT_NOT_READY`
- `retryable = true`
- `latest_resume_token = null`
- `latest_stability_contract_or_null = null`

This is intentionally not `204`: callers must not infer shell readiness from an empty transport success.

## Corrupt Publication

If a stored frame cannot be safely published, the endpoint returns:

- Status: `500`
- `problem_code = EXPERIENCE_SNAPSHOT_CORRUPT`
- `retryable = false`

Corrupt cases include mixed-generation stability markers, route key drift, stale stream bindings, actionability/focus/detail mirror drift, stale/degraded frames that still expose mutation-capable actions, and row metadata that no longer matches the persisted frame.

## Cache And Continuity

Snapshot responses are `no-store`. Browser, native, and reconnect consumers can reuse the same manifest shell only by honoring the grouped stability and stream recovery contracts in the response, not by reconstructing continuity from route-local state or the raw token.
