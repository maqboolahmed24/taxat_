# GET /v1/manifests/{manifest_id}/decision-bundle

`GET /v1/manifests/{manifest_id}/decision-bundle` returns the latest persisted `DecisionBundle` for a manifest. It is a durable read surface, not a bundle assembly endpoint: it reads the compute package's decision-bundle repository and validates the stored bundle before returning it.

## Success Response

The response body is the current `DecisionBundle`. The endpoint sets:

- `ETag` exactly equal to the stored `decision_bundle_hash`
- `Cache-Control: no-store`

`COMPLETED`, `BLOCKED`, and `REVIEW_REQUIRED` bundles are all successful readback states when they have been durably persisted. Clients must use the bundle fields such as `decision_status`, `outcome_class`, `waiting_on`, `checkpoint_state`, `actionability_state`, and `primary_action_code` instead of inferring terminal posture from transport status.

## Conditional Requests

`If-None-Match` is evaluated only after authorization and bundle publication validation. `304 Not Modified` is returned only when the supplied value exactly matches the current `decision_bundle_hash`; wildcard and weak validators are not treated as a match. A stale hash returns the current `DecisionBundle` with the current `ETag`.

## Not Ready

If no persisted bundle exists for the manifest, the endpoint returns a typed `ProblemEnvelope`:

- `problem_code = DECISION_BUNDLE_NOT_READY`
- `status = 404`
- `retryable = true`
- `manifest_id = {manifest_id}`

This is not a `204` and not an empty success. The caller should continue through the command receipt, manifest snapshot, or stream recovery surface rather than infer readiness from unrelated manifest state.

## Publication Validation

Before a bundle is emitted, the endpoint validates that:

- `artifact_type = DecisionBundle`
- stored row identity matches `decision_bundle_id`, `manifest_id`, `decision_status`, and `outcome_class`
- stored `decision_bundle_hash` matches `contract.artifact_content_hash`
- `decision_reason_codes[]` is the compressed prefix of `reason_codes[]`
- `dominant_reason_code` is the first reason
- `primary_action_code`, when present, appears in `next_action_codes[]` and not in `blocked_action_codes[]`
- proof, twin, execution-mode, truth-boundary, and explainability contracts remain coherent

Schema-invalid or integrity-drifted rows fail closed with `DECISION_BUNDLE_CORRUPT` instead of serving partial bundle data.
