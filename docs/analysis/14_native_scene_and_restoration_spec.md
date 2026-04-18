# 14 Native Scene And Restoration Spec

The native operator workspace is a server-authoritative macOS embodiment of existing shell law.
It adds multi-window depth, keyboard command surfaces, scene restoration, and cache-backed resume while staying subordinate to northbound truth.

## Workspace Topology

- Xcode workspace: `Apps/InternalOperatorWorkspaceMac`, `Packages/OperatorDomain`, `Packages/OperatorPlatformSDK`, `Packages/OperatorPersistence`, `Packages/OperatorUI`, `Packages/OperatorDesktopKit`, `Packages/OperatorDiagnostics`, `Packages/OperatorFeatureFlags`

## Primary Scenes

| Scene | Layout regions | Read models | Recovery and restore rules |
| --- | --- | --- | --- |
| Primary manifest scene | leading sidebar -> primary canvas -> trailing inspector | DecisionBundle, ExperienceCursor, WorkspaceSnapshot (linked focus when present) | Scene restoration never reopens a manifest after tenant switch, privilege downgrade, or masking drift.<br>Resize or inspector collapse must preserve the same manifest scene identity, dominant question, and settlement posture. |
| Primary work-item scene | leading sidebar -> primary canvas -> trailing inspector | WorkspaceSnapshot, WorkspaceDelta, WorkspaceCursor | Reconnect and rebase must match the browser collaboration contract.<br>Scene restoration keeps the same work item, dominant question, and settlement posture when still legal. |

## Secondary Windows

| Window | Window order | Parent-bound | Focus return |
| --- | --- | --- | --- |
| Detached compare window | IDENTITY_HEADER -> SUMMARY_CARD -> DETAIL_BODY | yes | Return to the exact parent compare trigger or selected evidence row. |
| Detached audit window | IDENTITY_HEADER -> SUMMARY_CARD -> DETAIL_BODY | yes | Return to the parent audit trigger or provenance row anchor. |
| Detached filing-packet window | IDENTITY_HEADER -> SUMMARY_CARD -> DETAIL_BODY | yes | Return to the parent packet review trigger or selected evidence row. |
| Detached authority review window | IDENTITY_HEADER -> SUMMARY_CARD -> DETAIL_BODY | yes | Return to the parent authority review trigger. |

## Command Surfaces

- `TOGGLE_SIDEBAR`, `TOGGLE_INSPECTOR`, `DETACH_INSPECTOR`, `FOCUS_SIDEBAR`, `FOCUS_PRIMARY_CANVAS`, `FOCUS_INSPECTOR`, `REFRESH_CURRENT_SCENE`, `OPEN_COMPARE_WINDOW`, `OPEN_AUDIT_WINDOW`, `OPEN_AUTHORITY_REVIEW_WINDOW`, `COPY_IDENTIFIERS`

## Auth Handoff

- Transport: `ASWebAuthenticationSession`
- Resume rule: Completion never implies settlement until the governed parent read model refreshes and the return target is still legal.

## Persistence And Purge

- Cached models: `DecisionBundle`, `ExperienceDelta`, `WorkspaceSnapshot`, `WorkspaceDelta`, `receipts and resume metadata`, `pinned evidence`, `compare selections`, `recent lists`
- Purge triggers: `tenant switch`, `privilege downgrade`, `masking drift`, `cache-envelope incompatibility`, `remote kill switch`, `preview subject mismatch`

## Browser-To-Native Translation Notes

- Browser routes become `NavigationSplitView`, `WindowGroup`, and dedicated support windows. Refresh becomes snapshot hydration plus stream resume/rebase rather than browser reload. Native support windows remain embodiments of calm-shell support law, not a new shell family.
