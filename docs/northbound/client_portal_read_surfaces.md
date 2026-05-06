# Client Portal Read Surfaces

## Routes

The customer portal northbound read family exposes five GET surfaces:

- `GET /v1/client-portal/workspace`
- `GET /v1/client-portal/documents`
- `GET /v1/client-portal/approvals`
- `GET /v1/client-portal/onboarding`
- `GET /v1/client-portal/activity`

Each route returns the full canonical `ClientPortalWorkspace` artifact, not a thin derivative
envelope. Route-specific reads constrain the top-level `route`, dominant question, one active
`navigation_tabs[]` entry, contextual `route_context`, reliability flow, and route-specific shell
posture while preserving the same top-level `CLIENT_PORTAL_SHELL` spine.

## Stability And Cache Semantics

Every successful response emits:

- `Cache-Control: no-store`
- `ETag: <workspace_version>`

`If-None-Match` is evaluated against the exact decimal `workspace_version`. Strong quoted or
unquoted matches return `304` with no body. Weak validators are ignored because portal reads must
not treat weak cache identity as a route-stability proof.

The response body always keeps:

- `workspace_version`
- `view_guard_ref`
- grouped `stability_contract`
- `freshness_state`
- `settlement_state`
- `recovery_posture`
- delegated `identity_context`
- customer-safe `content_limitations`

## Route Context

Route-specific endpoints reuse the existing portal shell grammar. They do not create a sixth tab or
a second route family.

Documents can carry contextual request focus with:

- `context_object_ref`
- `artifact_focus_bucket`
- `artifact_focus_subject_ref`
- `focus_anchor_ref`
- `return_focus_anchor_ref`

When contextual focus is present, `route_context.context_route` becomes `REQUEST_DETAIL`, the
workspace `object_anchor_ref` becomes the visible request object, and cross-device continuity binds
back to the active top-level `DOCUMENTS` route. Activity reads remain a HOME projection with a
server-authored activity timeline.

## Customer-Safe Projection

Portal reads fail closed before serialization when:

- the actor tenant or client scope does not match the requested portal client
- a staff-only or unknown principal class requests a customer portal route
- the visibility partition is not `CLIENT_PORTAL_WORKSPACE` and `CUSTOMER_VISIBLE`
- customer-safe projection does not mirror access binding, masking posture, and cache partition
- staff-only fields such as gate state, staff reason codes, audit lineage, or internal activity are
  present in route-visible sections

## Exact Projection Rules

The backend owns all count and current/history semantics:

- `navigation_tabs[]` contains exactly one active tab matching `route`
- `document_center.open_request_count` equals serialized open request cards
- `current_upload_ref` points to an upload inside the same request card
- `approval_center.outstanding_count` equals serialized approval packs requiring client attention
- `latest_pack_ref` resolves to a serialized approval pack
- `STEP_UP_REQUIRED` packs keep `requires_step_up = true`
- onboarding completion counts are arithmetically valid
- activity events are unique and newest-first

Current-versus-history artifact posture is expressed through `artifact_selection` and
`artifact_affordance`, never through renderer list position.
