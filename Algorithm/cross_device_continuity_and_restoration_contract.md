# Cross-Device Continuity and Restoration Contract

## Purpose
This contract freezes the authoritative same-object continuity boundary for route-visible browser shells,
narrow stacked layouts, and native macOS scene restoration.
It prevents client-local hydration, resize, deep-link entry, and scene restoration from reopening the
wrong object, the wrong shell family, the wrong parent return target, or a broader action/visibility
posture than the server currently authorizes.

## Contract boundary
Every route-visible shell or native scene that can survive refresh, reconnect, resize, deep-link open,
or restoration SHALL serialize one `cross_device_continuity_contract` validated by
`schemas/cross_device_continuity_contract.schema.json`.

That contract is authoritative for:

- the scoped continuity family (`continuity_scope`) that distinguishes manifest, workspace, portal,
  notification, governance, and native restoration surfaces
- the canonical governed object ref that must stay mounted
- the active route or scene identity ref for the current embodiment
- the explicit parent context plus return focus anchor, when the mounted surface is contextual or detached
- the dominant-action posture, grouped route or policy guard hash, and the access, masking, session,
  and cache-partition compatibility refs that bound safe cache hydration and restoration
- the compatibility-basis class that declares which of those guards are authoritative for the
  current surface
- the allowed device embodiments for the same governed object
- the server-authored continuity, recovery, and action-posture policies that renderers must reuse
- the supported invalidation reasons that must be handled explicitly instead of guessed locally

Every release or regression pack that claims cross-device continuity closure SHALL additionally
serialize one `shell_continuity_fuzz_harness` validated by
`schemas/shell_continuity_fuzz_harness.schema.json`.
That harness is not a second continuity source of truth.
It is the deterministic perturbation proof that replays this contract under rebase, reconnect,
resize, responsive collapse, stream catch-up, frame-epoch advance, and native restoration.
Packs that additionally claim focus-restore and return-target closure SHALL serialize one
`focus_restore_return_target_harness` validated by
`schemas/focus_restore_return_target_harness.schema.json`.
That paired harness proves close, back, help-return, stale-fallback, and secondary-window
dismissal against the same serialized anchors instead of local history heuristics.

## Required rules
- Resize from wide to narrow SHALL stack within the same shell family instead of remounting an alternate flow.
- Deep-link entry SHALL preserve the exact parent context and return focus target when the mounted
  surface is contextual or detached.
- Hydration SHALL remain bound to tenant, access scope, masking posture, and session lineage wherever
  those dimensions are published; clients SHALL invalidate or rebase rather than widening visibility.
- Native restoration SHALL keep one explicit carry-forward or rebase posture; it SHALL not silently
  reattach stale scenes to a different tenant, privilege envelope, or masking posture.
- Dominant question, dominant action, settlement posture, and recovery posture SHALL remain
  server-authored; clients SHALL not infer a different action posture from layout or embodiment.
- Support-only windows and detached inspectors SHALL stay parent-bound and SHALL inherit the same
  invalidation envelope as the owning object.
- The paired fuzz harness SHALL prove same-object same-shell continuity with shrinkable failure
  cases; browser coverage SHALL include rebase, reconnect, resize or responsive collapse, and
  stream catch-up or frame-epoch advance, while native coverage SHALL include primary-scene or
  secondary-window restoration.

## Surface mapping
- `LowNoiseExperienceFrame` binds the contract to `manifest_id`, `shell_route_key`, and
  `focus_anchor_ref`.
- `WorkspaceSnapshot` binds the contract to `item_id`, `workspace_route_key`, `route_context`,
  `access_binding_hash`, and `masking_posture_fingerprint`.
- `ClientPortalWorkspace` binds the contract to the mounted portal object, contextual `route_context`,
  and the customer-safe `visibility_partition`.
- `WorkItemNotification` binds the contract to notification-open target route, parent return route,
  focus anchors, and the notification visibility partition so web and native entry reopen the same
  governed object.
- `NativeOperatorWorkspaceScene` and `NativeOperatorSecondaryWindowScene` bind the contract to the
  scene identity envelope plus native restoration invalidation posture.
- `TenantGovernanceSnapshot` binds the contract to the selected governance object, policy snapshot
  posture, and the active governance route identity.

## Failure modes closed
- narrow layouts forking into a mobile-only shell for the same object
- request/approval deep links losing the parent route and return focus anchor
- cache hydration restoring a broader access scope or masked detail after session drift
- native scene restoration reopening stale tenant, privilege, or masking context
- detached inspectors or support windows surviving after their parent context becomes invalid
- layout-specific clients guessing a different dominant action than the server-authored shell posture
