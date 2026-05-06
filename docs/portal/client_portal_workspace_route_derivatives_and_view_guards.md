# Client Portal Workspace Route Derivatives And View Guards

`packages/backend-portal` is the canonical projector package for `ClientPortalWorkspace`.
It was introduced under `ASSUMPTION_BACKEND_PORTAL_PACKAGE_CREATED` because the shared
pc0174-pc0181 operating contract named `packages/backend-portal`, but the package did not
exist in this workspace.

## Projection Spine

- `buildClientPortalWorkspace(...)` emits the root `ClientPortalWorkspace` with
  `shell_family = CLIENT_PORTAL_SHELL`.
- Route-specific reads call `deriveClientPortalRouteWorkspace(...)` and still return the full
  workspace artifact. They do not publish thin derivative envelopes.
- `route` remains the active top-level tab. Contextual detail is carried only in `route_context`.
- `object_anchor_ref` stays at `workspace_id` for top-level routes and switches to
  `route_context.context_object_ref` for contextual routes.
- `view_guard_ref`, `workspace_version`, and `stability_contract.guard_vector_hash` are emitted as
  one grouped route guard so clients do not mix stale markers.

## Contextual Routes

`deriveClientPortalRouteContext(...)` serializes the detail focus contract:

- `context_route`
- `context_object_ref`
- `focus_anchor_ref`
- `artifact_focus_bucket_or_null`
- `artifact_focus_subject_ref_or_null`
- `focus_restoration`
- `return_route`
- `return_focus_anchor_ref_or_null`
- `fallback_target`
- `fallback_object_ref_or_null`
- `fallback_reason_ref_or_null`
- `narrow_screen_mode = STACKED_SAME_SHELL`

`applyContextualRouteFallbackRules(...)` first keeps the exact contextual target when it is still
visible, then falls to the latest visible contextual object, and only then returns to the parent
route focus anchor. It never falls back to a generic portal home route while a narrower parent
target remains lawful.

## Cache And Continuity

`deriveClientPortalCacheIsolationContract(...)` binds customer-safe cache reuse to the exact
tenant, client, principal/session binding, access binding, masking fingerprint, route identity,
canonical object, workspace version, and visibility partition. For contextual routes,
`route_identity_ref` becomes the contextual route code and `canonical_object_ref` becomes the
contextual object.

The root projector also emits `cross_device_continuity_contract` with browser-wide and
browser-narrow embodiments only, `compatibility_basis_class = ROUTE_GUARD_AND_VISIBILITY`, and
portal invalidation reasons:

- `ACCESS_BINDING_CHANGE`
- `MASKING_CHANGE`
- `VIEW_GUARD_CHANGE`
- `OBJECT_GONE`

## Validation Notes

The focused tests validate complete `ClientPortalWorkspace` payloads against the JSON schema and
validate embedded `cache_isolation_contract`, `cross_device_continuity_contract`,
`portal_interaction_layer`, and `semantic_accessibility_contract` through the shared custom
contract validators. The full workspace custom validator is not used for the whole payload because
the current Python custom workspace validator still retains a legacy semantic-anchor expectation
that differs from the JSON schema-backed portal semantic inventory.
