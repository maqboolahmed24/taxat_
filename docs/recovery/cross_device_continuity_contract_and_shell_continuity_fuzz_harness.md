# Cross Device Continuity Contract And Shell Continuity Fuzz Harness

`packages/backend-recovery/src/services/build_cross_device_continuity_contract.ts` is the shared, side-effect-free builder for every route-visible shell and native scene that can survive reconnect, refresh, resize, or restoration. It fails closed when a publisher tries to widen a scope, omit a required anchor, publish an unlawful embodiment list, or invent invalidation reasons outside the scope vocabulary.

## Scope Mapping

| Surface | Continuity scope | Compatibility basis | Shell |
| --- | --- | --- | --- |
| `LowNoiseExperienceFrame` | `MANIFEST_ROUTE` | `ROUTE_GUARD_ONLY` | `CALM_SHELL` |
| `WorkspaceSnapshot` | `WORKSPACE_ROUTE` | `ROUTE_GUARD_AND_VISIBILITY` | `CALM_SHELL` or `CLIENT_PORTAL_SHELL` |
| `ClientPortalWorkspace` | `CLIENT_PORTAL_ROUTE` | `ROUTE_GUARD_AND_VISIBILITY` | `CLIENT_PORTAL_SHELL` |
| `WorkItemNotification` | `WORK_ITEM_NOTIFICATION` | `VISIBILITY_ONLY` | `CALM_SHELL` or `CLIENT_PORTAL_SHELL` |
| `TenantGovernanceSnapshot` | `GOVERNANCE_ROUTE` | `ROUTE_GUARD_ONLY` | `GOVERNANCE_DENSITY_SHELL` |
| `NativeOperatorWorkspaceScene` | `NATIVE_PRIMARY_SCENE` | `SESSION_MASKING_AND_ROUTE_GUARD` | `CALM_SHELL` |
| `NativeOperatorSecondaryWindowScene` | `NATIVE_SECONDARY_WINDOW` | `SESSION_MASKING_AND_PARENT_SCENE` | `CALM_SHELL` |

Browser embodiments are always ordered `BROWSER_WIDE`, then `BROWSER_NARROW_STACKED`. Parent-bound support surfaces add `NATIVE_PRIMARY_SCENE` and `NATIVE_SUPPORT_WINDOW` in that order. Browser-only client portal routes keep `secondary_window_policy = NOT_APPLICABLE`.

## Anchor Serialization

Contextual routes and native secondary windows must serialize both `parent_context_ref_or_null` and `return_focus_anchor_ref_or_null`. If a parent context is present without a return focus anchor, the shared builder rejects the contract. If no parent context is present, the return anchor must clear. Focus anchors stay nullable because some lawful route entries target the object summary rather than an exact module.

## Invalidation Reasons

The invalidation vocabulary is derived from scope, notification visibility, and native object family. Manifest and governance routes use route-guard-only reasons. Workspace routes carry tenant, privilege, access, masking, session, schema, and object invalidations. Client portal routes carry access, masking, view guard, and object invalidations. Native secondary windows add `PARENT_WINDOW_CLOSED`.

## Publisher Coverage

The shared builder is now used by the low-noise frame, workflow workspace/request-list/notification continuity builders, the client portal workspace, and tenant governance snapshots. Native primary and secondary scene wrappers are exported from backend recovery for native automation and restoration layers.

## Fuzz Harness

`buildShellContinuityFuzzHarness()` emits one deterministic `SHELL_CONTINUITY_FUZZ_HARNESS_V1` payload. It covers browser and native continuity, preserved and inline-recovery outcomes, rebase, reconnect, resize/collapse, stream catch-up/frame epoch advance, native scene restore, and secondary-window parent-return-anchor restoration.

The harness asserts the full continuity spine for every case: shell family, route identity, object anchor, dominant question, settlement state, active context, focus anchor, return focus anchor, and dominant meaning. When `truth_change_detected = false`, those fields must remain stable. `INLINE_RECOVERY` may change only the typed recovery posture; it may not silently remount another shell, route, or object. Shrink sequences are enforced as strict non-empty subsets of the injected perturbations.
