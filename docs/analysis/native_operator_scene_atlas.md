# Native Operator Scene Atlas

This atlas turns ADR-007 into concrete scene and window law for later native implementers.

## Product Posture

- Signed and notarized internal macOS operator workspace.
- SwiftUI-first scene composition with targeted AppKit acceleration.
- System-browser or `ASWebAuthenticationSession` ownership for sign-in, step-up, and browser-owned checkpoints.
- Tenant-bound, disposable persistence governed by FE-25 and FE-75.

## Window Budgets

| Window Role | Default Size | Minimum Size | Support Rule |
| --- | --- | --- | --- |
| Daily manifest decision workspace | 1560 × 980 | 1280 × 820 | The trailing inspector is the single promoted support surface. It may collapse or detach but never becomes a second writable action strip. |
| Daily collaboration and work-item workspace | 1560 × 980 | 1280 × 820 | Inspector, detached previews, and support windows remain subordinate to the work-item action posture and never replace the dominant question. |
| Detached comparison and drift investigation | 1320 × 840 | 960 × 720 | Support-only detached window; may print or export but never publishes a competing primary action strip for the same object. |
| Detached audit and provenance investigation | 960 × 720 | 960 × 720 | Audit detail stays summary-first and parent-bound; it enriches the parent investigation rather than becoming a separate legal workspace. |
| Filing-packet review, preview, and export surface | 960 × 720 | 960 × 720 | Quick Look, print, and export remain governed support affordances subject to masking and preview-subject legality. |
| Authority review and reconciliation support surface | 960 × 720 | 960 × 720 | Authority review stays parent-bound and may launch system-browser authority tasks, but completion is never inferred locally. |
| Settings, diagnostics, and compatibility utility flow | 820 × 620 | 760 × 560 | Utility flows do not introduce a fourth shell family; they remain non-legal support surfaces tied to the current operator session. |

## Scene Inventory

| Scene | Kind | Shell Family | SwiftUI Default | AppKit Escalation |
| --- | --- | --- | --- | --- |
| native_primary_manifest_scene | PRIMARY_WORKSPACE | CALM_SHELL | NavigationSplitView shell composition, context bar and decision summary, inspector orchestration | very large evidence tables, precision diff or attributed-text viewers |
| native_primary_work_item_scene | PRIMARY_WORKSPACE | CALM_SHELL | workspace shell composition, assignment and activity modules, command surfaces | multi-column activity timelines, dense attachment or provenance lists |
| native_secondary_compare_window | SECONDARY_SUPPORT_WINDOW | CALM_SHELL | window coordination, header and summary shell | side-by-side diff viewer, complex evidence comparison tables |
| native_secondary_audit_window | SECONDARY_SUPPORT_WINDOW | CALM_SHELL | window frame and inspector shell | virtualized audit tables, multi-column provenance explorers |
| native_secondary_filing_packet_window | SECONDARY_SUPPORT_WINDOW | CALM_SHELL | preview shell, export posture indicators | print fidelity, document preview integration |
| native_secondary_authority_review_window | SECONDARY_SUPPORT_WINDOW | CALM_SHELL | review shell, binding-health summary | dense reconciliation lists, long-form detail panes |
| native_settings_and_utility_scene | UTILITY_SUPPORT_SCENE | NO_NEW_LEGAL_SHELL | settings panes, diagnostic posture, feature and compatibility notices | none by default |

## Browser Handoff Boundary

- System surface: `ASWebAuthenticationSession or default system browser`
- Return rule: Return to the correct object, shell, and focus anchor; pending language persists until the governed parent read model refreshes.
- Owned use cases: product sign-in, step-up completion, authority-owned HMRC or help tasks

## Restoration Identity Envelope

- `tenant_id`
- `principal_class`
- `session_binding_hash`
- `session_lineage_ref`
- `masking_posture_fingerprint`
- `shell_family`
- `route_or_parent_scene_identity`
- `canonical_object_ref`
- `access_binding_hash_or_null`
- `projection_guard_or_shell_stability_token`
- `supported_contract_window`
- `preview_subject_ref_or_null_for_secondary_windows`

## Invalidation Triggers

- tenant switch
- privilege downgrade
- masking change
- session revocation
- device binding invalidation
- schema incompatibility
- access binding drift
- preview subject mismatch

## Command Surface Vocabulary

| Command Surface | Role |
| --- | --- |
| TOGGLE_SIDEBAR | menu command or keyboard-targetable surface |
| TOGGLE_INSPECTOR | menu command or keyboard-targetable surface |
| DETACH_INSPECTOR | menu command or keyboard-targetable surface |
| FOCUS_SIDEBAR | menu command or keyboard-targetable surface |
| FOCUS_PRIMARY_CANVAS | menu command or keyboard-targetable surface |
| FOCUS_INSPECTOR | menu command or keyboard-targetable surface |
| REFRESH_CURRENT_SCENE | menu command or keyboard-targetable surface |
| OPEN_COMPARE_WINDOW | menu command or keyboard-targetable surface |
| OPEN_AUDIT_WINDOW | menu command or keyboard-targetable surface |
| OPEN_AUTHORITY_REVIEW_WINDOW | menu command or keyboard-targetable surface |
| COPY_IDENTIFIERS | menu command or keyboard-targetable surface |

## Cache And Session Boundary

| Boundary | Allowed Storage | Live Session Requirement |
| --- | --- | --- |
| Interactive native human session boundary | Keychain-backed product-session artifacts, resume metadata, redaction-safe local preferences | Mutation-capable actions require a live bound session plus current actor-session validation. |
| Structured projection and receipt cache boundary | DecisionBundle, ExperienceDelta, WorkspaceSnapshot, WorkspaceDelta, ApiCommandReceipt history, resume metadata, pinned evidence, compare selections, recent lists | Cache-only restoration may render compatible read state, but filing-capable or mutation-capable actions stay blocked until live rebase re-establishes legality. |
| Scene restoration and resume lineage boundary | scene restoration payloads, NSUserActivity, focus restoration outcome, cross_device_continuity_contract | Restore proceeds only when local cache, resume metadata, and server session remain valid together. |
| Regulated previews, exports, and local index boundary | preview caches, temporary exports, Quick Look staging, redaction-safe local search indices | Materialization remains bound to current masking, export posture, and selected preview subject. |
| System-browser handoff return boundary | return target, focused object anchor, focus restoration anchor | The parent scene keeps pending posture until the governing read model refreshes and the target remains lawful. |
| Authority token and secret boundary | vault-held authority token lineage, vault-held IdP client secrets or private keys | Native flows may trigger authority work, but raw token material stays outside device storage boundaries. |
| Disconnected and cache-only fail-closed boundary | local drafts, compare selections, read-only compatible projections | Offline or disconnected posture degrades to read-only or local-draft mode for legally material actions. |

## Preview And Automation Contracts

SwiftUI preview or snapshot contracts:

| Preview Contract |
| --- |
| primary manifest scene |
| primary work-item scene |
| detached compare window |
| detached audit window |
| settings and utility flow |

Native scene automation scenarios:

- `primary_manifest_restore_same_object`: The same manifest reopens in the same primary scene identity after relaunch when the legality envelope still matches.
- `work_item_restore_same_object`: Work-item scene restore keeps the same work item, module anchor, and inspector posture when legal.
- `detached_window_close_returns_focus`: Closing a detached compare, audit, or filing-packet window returns focus to the invoking parent control.
- `resize_redock_preserves_shell_meaning`: Sidebar collapse, inspector detach, and compact redock preserve the same shell meaning and dominant question.
- `cache_only_restore_blocks_mutation`: Compatible cache-only restore may render read state, but mutation-capable actions remain blocked until live rebase completes.
- `schema_drift_purges_before_first_paint`: Incompatible cache envelopes purge before stale content becomes visible.
- `reduced_motion_keeps_semantic_order`: Reduced-motion mode keeps the same semantic ordering, focus targets, and recovery meaning.
- `appkit_bridge_keeps_support_only_policy`: AppKit-accelerated surfaces preserve support-only posture and do not publish a second authoritative action strip.

## Scaffolding Pseudocode

```swift
@main
struct InternalOperatorWorkspaceMacApp: App {
    var body: some Scene {
        WindowGroup(id: "manifest.workspace") {
            ManifestWorkspaceSceneView()
        }
        .defaultSize(width: 1560, height: 980)

        WindowGroup(id: "workitem.workspace") {
            WorkItemWorkspaceSceneView()
        }
        .defaultSize(width: 1560, height: 980)

        Settings {
            SettingsRootView()
        }
    }
}
```

```swift
struct ManifestWorkspaceSceneView: View {
    var body: some View {
        NavigationSplitView {
            ManifestSidebarView()
        } detail: {
            CalmWorkspaceCanvasView()
        }
        .inspector(isPresented: .constant(true)) {
            SupportInspectorView()
        }
    }
}
```

```swift
struct CompareWindowRoot: NSViewControllerRepresentable {
    func makeNSViewController(context: Context) -> CompareDiffController {
        CompareDiffController()
    }

    func updateNSViewController(_ controller: CompareDiffController, context: Context) {
        controller.applyLatestProjection()
    }
}
```

## Translation Notes

- route tree -> NavigationSplitView, WindowGroup, and parent-bound detached support windows: Native orchestration replaces browser tabs and nested drawers while preserving shell ownership and object continuity.
- browser refresh -> snapshot hydration plus stream resume or rebase: The client restores the same scene identity only after compatibility checks rather than reloading the whole shell blindly.
- localStorage or session storage -> Keychain for product-session artifacts plus tenant-bound structured persistence: Credential material stays in OS-protected storage while disposable projections and preferences stay purgeable.
- DOM event bus -> typed actions over observable models and actor boundaries: The native app keeps projection and command flows explicit instead of recreating a browser-style ambient event mesh.
- browser auth or help flow -> ASWebAuthenticationSession or default system browser return coordinator: System-browser ownership keeps sign-in, step-up, and authority-only tasks out of unrestricted embedded web shells.
- calm-shell support drawer -> trailing inspector or detached support window: Detached support still remains support-only and close-return focus stays parent-bound.
- large table or diff canvas -> AppKit bridge inside a SwiftUI-managed scene: Dense evidence, audit, and diff workloads justify AppKit only where profiling proves SwiftUI is not enough.
- hover-first browser affordance -> menu commands, keyboard shortcuts, Quick Look, print, and drag-out: Native ergonomics should replace browser habits without changing algorithmic meaning.
- browser cache identity -> combined FE-25 cache isolation plus FE-75 hydration legality envelope: Native restore and first paint must fail closed on tenant, masking, route, or compatibility drift.
