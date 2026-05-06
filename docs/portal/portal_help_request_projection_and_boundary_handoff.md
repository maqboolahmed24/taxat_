# Portal Help Request Projection And Boundary Handoff

`pc_0186` adds one backend-owned help path for client support:

1. `buildPortalHelpRequest(...)` emits schema-valid `PortalHelpRequest` artifacts.
2. `trackPortalHelpBoundaryHandoff(...)` records the support-boundary handoff and preserves the
   same portal return target across acknowledgement, response, and closure.
3. `buildClientPortalWorkspace(...)` now uses `buildHelpCaseContextRefs(...)` for the Help route
   `CASE_CONTEXT_PANEL`, so the read model and durable artifact carry the same context refs.

## Route And Reason Binding

`deriveHelpRequestRouteAndReasonBinding(...)` derives defaults from the source route:

| Source route | Default channel | Default reason |
| --- | --- | --- |
| `HELP` | `PORTAL_HELP` | `GENERAL_HELP` |
| `DOCUMENTS` | `PORTAL_HELP` | `DOCUMENT_HELP` |
| `REQUEST_DETAIL` with `request_info_ref` | `CONTEXTUAL_REQUEST` | `DOCUMENT_HELP` |
| `APPROVALS` | `PORTAL_HELP` | `APPROVAL_HELP` |
| `ONBOARDING` | `PORTAL_HELP` | `ONBOARDING_HELP` |
| `HOME` | `PORTAL_HELP` | `STATUS_QUESTION` |

The projector fails closed when route-specific reasons drift: `DOCUMENT_HELP` may only come from
`DOCUMENTS` or `REQUEST_DETAIL`, `APPROVAL_HELP` from `APPROVALS`, `ONBOARDING_HELP` from
`ONBOARDING`, `ACCESS_HELP` from `HELP` or `ONBOARDING`, and `GENERAL_HELP` from `HELP`.

## Case Context Refs

`case_context_refs[]` are bounded to six refs by default because the Help route
`case_context_panel.carried_context_refs[]` has the same limit. The builder orders refs as:

- workspace ref
- source route ref
- exact focus anchor ref
- linked object or `item_id`
- linked `request_info_ref`
- manifest ref

Additional refs are appended after those core refs, deduplicated, and trimmed to the limit. Refs
containing staff-only, internal, audit, gate, queue, raw, privileged, token, or secret fragments are
rejected before serialization.

## Request-Info Linkage

`support_channel = CONTEXTUAL_REQUEST` requires `source_route = REQUEST_DETAIL`, non-null `item_id`,
non-null `request_info_ref`, and non-empty `source_focus_anchor_ref`. Any supplied
`request_info_ref` is also forced onto `REQUEST_DETAIL`, matching the collaboration request-for-info
lineage rather than turning support into a generic ticket.

## Lifecycle And Return Target

Lifecycle is derived from timestamps:

- no acknowledgement fields: `OPEN`
- `acknowledged_at` only: `ACKNOWLEDGED`
- `response_ref` plus `responded_at`: `RESPONDED`
- `closed_at` after response: `CLOSED`

The projector rejects backwards acknowledgement, response, or closure chronology. The handoff
tracker always returns the immutable target tuple `{ source_route, focus_anchor_ref, item_id,
request_info_ref }` from the current `PortalHelpRequest`, so support closure cannot erase the route
and focus anchor the client needs when reopening the task.

## Contract Grounding

The implementation was checked against:

- `Algorithm/schemas/portal_help_request.schema.json`
- `Algorithm/customer_client_portal_experience_contract.md`
- `Algorithm/northbound_api_and_session_contract.md`
- `Algorithm/data_model.md`
- `Algorithm/modules.md`
- `Algorithm/frontend_shell_and_interaction_law.md`
- `Algorithm/PATCH_RESOLUTION_INDEX.md`
- `Algorithm/test_vectors.md`
- `config/support/support_channel_policy.json`
