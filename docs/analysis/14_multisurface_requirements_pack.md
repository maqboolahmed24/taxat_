# 14 Multisurface Requirements Pack

This pack consolidates the authoritative surface law for Taxat across collaboration, portal, governance, and native operator embodiments.
It is intentionally route- and scene-specific so later frontend, backend, native, and QA work can bind to one stable semantic atlas.

## Summary

- Surface families: `4`
- Route or scene records: `30`
- Selector anchors: `79`
- Component inventory rows: `75`
- Opened or carried-forward gaps: `6`

## Laws That Never Change

| Law | Meaning | Source grounding |
| --- | --- | --- |
| SAME_OBJECT_SAME_SHELL | A stable object keeps the same shell family or embodiment frame across refresh, reconnect, and deep-link return. | `Algorithm/frontend_shell_and_interaction_law.md` -> 1. Shell families and object ownership<br>`Algorithm/macos_native_operator_workspace_blueprint.md` -> 4. Platform translation map |
| ONE_PROMOTED_SUPPORT_REGION | Each mounted route or scene gets at most one promoted support region by default, even when dense detail or audit context is present. | `Algorithm/frontend_shell_and_interaction_law.md` -> 3. Layout topology and support-region promotion<br>`Algorithm/admin_governance_console_architecture.md` -> 6. Shared interaction and mutation rules |
| APPEND_ONLY_TRUTH_WITH_INLINE_RECOVERY | Previously valid content stays mounted while stale, reconnect, or limited-read posture is explained inline and mutation surfaces fail closed. | `Algorithm/empty_state_limitation_and_recovery_taxonomy_contract.md` -> Shared shell freshness and recovery vocabulary<br>`Algorithm/collaboration_workspace_contract.md` -> 9. Stream events and notifications |
| COMMAND_AND_READ_SEPARATION | All durable product mutations travel through `POST /v1/commands`, except governed upload-session allocation for raw bytes, while route reads stay role-filtered projections. | `Algorithm/northbound_api_and_session_contract.md` -> Command surface<br>`Algorithm/customer_client_portal_experience_contract.md` -> Read-model and API translation requirements |
| VISIBILITY_BOUNDARIES_ARE_HARD | Internal-only collaboration activity, masked governance slices, customer-safe portal projections, and native cached state remain explicitly partitioned and never inferred across surfaces. | `Algorithm/collaboration_workspace_contract.md` -> 1. Core invariants<br>`Algorithm/cache_isolation_and_secure_reuse_contract.md` -> Cache identity envelope |
| FOCUS_RETURN_IS_SERIALIZED | Detail drawers, support panels, modals, detached windows, and external handoffs restore focus to a serialized parent anchor rather than forcing rediscovery. | `Algorithm/focus_restoration_and_return_target_harness_contract.md` -> Return targets<br>`Algorithm/macos_native_operator_workspace_blueprint.md` -> 5. Preferred window and scene architecture |

## Collaboration Workspace

- Surface family: `COLLABORATION`
- Shell families: `CALM_SHELL`, `CLIENT_PORTAL_SHELL`
- Route/scene count: `8`
- Interaction signature: Queue -> workspace -> thread/module focus with inline rebase and append-only activity.
- Support-region law: DETAIL_DRAWER in staff surfaces; contextual support panel in customer-safe request views.

| Route / Scene | Pattern | Shell | Actors | Dominant question | Promoted support | Selector profile |
| --- | --- | --- | --- | --- | --- | --- |
| Staff work inbox | /work | CALM_SHELL | STAFF_OPERATOR | Which work item needs action now, and why? | DETAIL_DRAWER | COLLABORATION_STAFF_QUEUE_V1 |
| Staff work-item workspace | /work/items/{item_id} | CALM_SHELL | STAFF_OPERATOR | What is the safest next decision on this work item? | DETAIL_DRAWER | COLLABORATION_WORKSPACE_V1 |
| Staff customer-visible activity module | /work/items/{item_id}?module=customer-activity | CALM_SHELL | STAFF_OPERATOR | What has the customer seen, and what reply is safe now? | DETAIL_DRAWER | COLLABORATION_WORKSPACE_V1 |
| Staff internal-only activity module | /work/items/{item_id}?module=internal-activity | CALM_SHELL | STAFF_OPERATOR | What internal context, constraints, or reasoning must stay staff-only? | DETAIL_DRAWER | COLLABORATION_WORKSPACE_V1 |
| Staff files module | /work/items/{item_id}?module=files | CALM_SHELL | STAFF_OPERATOR | Which artifact is current, historical, quarantined, or not safely downloadable? | DETAIL_DRAWER | COLLABORATION_WORKSPACE_V1 |
| Manifest route with workflow focus jump | /manifests/{manifest_id}?focus=workflow:{item_id} | CALM_SHELL | STAFF_OPERATOR | How does this workflow item affect the current manifest decision? | DETAIL_DRAWER | COLLABORATION_WORKSPACE_V1 |
| Customer request list | /portal/requests | CLIENT_PORTAL_SHELL | CLIENT_CONTRIBUTOR | Which request needs a reply, upload, approval, or simply waiting? | SUPPORT_PANEL | COLLABORATION_CUSTOMER_V1 |
| Customer request workspace | /portal/requests/{item_id} | CLIENT_PORTAL_SHELL | CLIENT_CONTRIBUTOR | What exactly is being asked of the client, and what is the safe next step? | SUPPORT_PANEL | COLLABORATION_CUSTOMER_V1 |

## Client Portal

- Surface family: `PORTAL`
- Shell families: `CLIENT_PORTAL_SHELL`
- Route/scene count: `5`
- Interaction signature: Single-column primary task flow with contextual history, help, and artifact handoff kept subordinate.
- Support-region law: Exactly one support region outside Help; help route itself may foreground support context.

| Route / Scene | Pattern | Shell | Actors | Dominant question | Promoted support | Selector profile |
| --- | --- | --- | --- | --- | --- | --- |
| Portal home | /portal | CLIENT_PORTAL_SHELL | CLIENT_VIEWER \| CLIENT_CONTRIBUTOR \| CLIENT_SIGNATORY | What changed, what matters now, and what should the client do next? | SUPPORT_PANEL | PORTAL_SHELL_V1 |
| Portal documents | /portal/documents | CLIENT_PORTAL_SHELL | CLIENT_CONTRIBUTOR | Which document request is active, and what is the exact upload posture? | SUPPORT_PANEL | PORTAL_SHELL_V1 |
| Portal approvals | /portal/approvals | CLIENT_PORTAL_SHELL | CLIENT_SIGNATORY | What is being approved, and is sign-off safe right now? | SUPPORT_PANEL | PORTAL_SHELL_V1 |
| Portal onboarding | /portal/onboarding | CLIENT_PORTAL_SHELL | CLIENT_CONTRIBUTOR | Which onboarding step is active, what is saved, and what still needs completion? | SUPPORT_PANEL | PORTAL_SHELL_V1 |
| Portal help | /portal/help | CLIENT_PORTAL_SHELL | CLIENT_VIEWER \| CLIENT_CONTRIBUTOR \| CLIENT_SIGNATORY | What help path matches the current problem without losing route context? | SUPPORT_PANEL | PORTAL_SHELL_V1 |

## Governance Console

- Surface family: `GOVERNANCE`
- Shell families: `GOVERNANCE_DENSITY_SHELL`
- Route/scene count: `10`
- Interaction signature: Context bar + section nav + inventory rail + workspace canvas + audit sidecar, with staged mutation baskets and approval posture.
- Support-region law: AUDIT_SIDECAR is the default promoted support region unless a route-local support window temporarily supersedes it.

| Route / Scene | Pattern | Shell | Actors | Dominant question | Promoted support | Selector profile |
| --- | --- | --- | --- | --- | --- | --- |
| Governance overview | /governance | GOVERNANCE_DENSITY_SHELL | TENANT_ADMIN \| AUDITOR \| APPROVER \| SUPPORT_OPERATOR | Where is governance attention required right now? | AUDIT_SIDECAR | GOVERNANCE_SEMANTIC_SELECTORS_V1 |
| Tenant configuration workspace | /governance/tenant | GOVERNANCE_DENSITY_SHELL | TENANT_ADMIN \| APPROVER | What tenant-wide change is proposed, and what is its blast radius? | AUDIT_SIDECAR | GOVERNANCE_SEMANTIC_SELECTORS_V1 |
| Principal access directory | /governance/access/principals | GOVERNANCE_DENSITY_SHELL | TENANT_ADMIN \| SUPPORT_OPERATOR | Who currently has access, and how was it granted? | AUDIT_SIDECAR | GOVERNANCE_SEMANTIC_SELECTORS_V1 |
| Role template matrix | /governance/access/roles | GOVERNANCE_DENSITY_SHELL | TENANT_ADMIN \| APPROVER | What does each role grant, and how would a change alter effective authority? | AUDIT_SIDECAR | GOVERNANCE_SEMANTIC_SELECTORS_V1 |
| Access simulator | /governance/access/simulator | GOVERNANCE_DENSITY_SHELL | TENANT_ADMIN \| APPROVER \| AUDITOR | What would authorization do under the exact current basis and topology? | AUDIT_SIDECAR | GOVERNANCE_SEMANTIC_SELECTORS_V1 |
| Authority link inventory | /governance/authority-links | GOVERNANCE_DENSITY_SHELL | TENANT_ADMIN \| SUPPORT_OPERATOR \| AUDITOR | Which authority links are healthy, mismatched, drifting, or missing delegation? | AUDIT_SIDECAR | GOVERNANCE_SEMANTIC_SELECTORS_V1 |
| Retention policy matrix | /governance/retention/policies | GOVERNANCE_DENSITY_SHELL | TENANT_ADMIN \| APPROVER \| AUDITOR | Which retention minimums and exceptions govern this tenant right now? | AUDIT_SIDECAR | GOVERNANCE_SEMANTIC_SELECTORS_V1 |
| Legal hold register | /governance/retention/legal-holds | GOVERNANCE_DENSITY_SHELL | TENANT_ADMIN \| APPROVER \| AUDITOR | Which legal holds are active, and what do they block or override? | AUDIT_SIDECAR | GOVERNANCE_SEMANTIC_SELECTORS_V1 |
| Erasure queue | /governance/retention/erasure | GOVERNANCE_DENSITY_SHELL | TENANT_ADMIN \| APPROVER \| AUDITOR | Which erasure requests are eligible, blocked, or irreversible? | AUDIT_SIDECAR | GOVERNANCE_SEMANTIC_SELECTORS_V1 |
| Audit investigation workbench | /governance/audit | GOVERNANCE_DENSITY_SHELL | AUDITOR \| SUPPORT_OPERATOR \| TENANT_ADMIN | What happened, when, why, and what evidence is export-eligible now? | AUDIT_SIDECAR | GOVERNANCE_SEMANTIC_SELECTORS_V1 |

## macOS Operator Workspace

- Surface family: `NATIVE_OPERATOR`
- Shell families: `CALM_SHELL (embodied natively)`
- Route/scene count: `7`
- Interaction signature: Primary split view scenes, parent-bound secondary windows, command-surface shortcuts, and cache-backed resume with fail-closed legality checks.
- Support-region law: Trailing inspector in primary scenes; parent-bound secondary windows for compare, audit, packet, and authority review.

| Route / Scene | Pattern | Shell | Actors | Dominant question | Promoted support | Selector profile |
| --- | --- | --- | --- | --- | --- | --- |
| Primary manifest scene | NativeOperatorWorkspaceScene(manifest) | CALM_SHELL | STAFF_OPERATOR | What is the current manifest decision state, and what support detail belongs in the inspector or a detached window? | TRAILING_INSPECTOR | NATIVE_OPERATOR_SELECTORS_V1 |
| Primary work-item scene | NativeOperatorWorkspaceScene(work-item) | CALM_SHELL | STAFF_OPERATOR | What is the safest next action on this work item from the native scene? | TRAILING_INSPECTOR | NATIVE_OPERATOR_SELECTORS_V1 |
| Detached compare window | NativeOperatorSecondaryWindowScene(compare) | CALM_SHELL | STAFF_OPERATOR | How do two evidence or decision states compare without collapsing the parent scene context? | PARENT_BOUND_SUPPORT_WINDOW | NATIVE_OPERATOR_SELECTORS_V1 |
| Detached audit window | NativeOperatorSecondaryWindowScene(audit) | CALM_SHELL | STAFF_OPERATOR \| AUDITOR | What audit or provenance detail supports the current scene without displacing it? | PARENT_BOUND_SUPPORT_WINDOW | NATIVE_OPERATOR_SELECTORS_V1 |
| Detached filing-packet window | NativeOperatorSecondaryWindowScene(filing-packet) | CALM_SHELL | STAFF_OPERATOR | What packet material is ready for review, export, or print under current masking posture? | PARENT_BOUND_SUPPORT_WINDOW | NATIVE_OPERATOR_SELECTORS_V1 |
| Detached authority review window | NativeOperatorSecondaryWindowScene(authority-review) | CALM_SHELL | STAFF_OPERATOR \| SUPPORT_OPERATOR | What authority interaction detail belongs in support context without widening the parent scene? | PARENT_BOUND_SUPPORT_WINDOW | NATIVE_OPERATOR_SELECTORS_V1 |
| Native browser auth handoff | ASWebAuthenticationSession(authority or step-up) | CALM_SHELL | STAFF_OPERATOR \| CLIENT_SIGNATORY | What external authority or identity task must complete before the parent scene can settle? | PARENT_BOUND_SUPPORT_WINDOW | NATIVE_OPERATOR_SELECTORS_V1 |

## Explicit Gaps And Normalizations

| Gap | Severity | Status | Summary |
| --- | --- | --- | --- |
| MISSING_SHARED_PROMPT_CONTRACT_0014_TO_0021 | warning | open | The card references `shared_operating_contract_0014_to_0021.md`, but that file is not present in the prompt directory. |
| PORTAL_READ_PATH_LITERALS_NOT_FULLY_ENUMERATED | note | open | The portal contract fully enumerates route semantics and read models, but does not publish every literal northbound path per route. |
| PORTAL_COMMAND_ENUMS_NORMALIZED_FROM_PROSE | note | open | Portal flow documents describe upload, approval, onboarding, and support action families more strongly than a literal complete command enum. |
| GOVERNANCE_MUTATION_ENUMS_NORMALIZED_FROM_PROSE | note | open | Governance routes define staged mutations, basis hashes, and approval posture explicitly, but not a complete per-route mutation enum. |
| MANIFEST_FOCUS_ROUTE_NORMALIZED | note | open | The collaboration contract explicitly names `/manifests/{manifest_id}?focus=workflow:{item_id}`, but other manifest route literals are distributed across the corpus rather than centralized. |
| NATIVE_WINDOWS_ARE_ROUTELESS_SUPPORT_OVERLAYS | note | open | Detached native support windows are not browser routes and must not be treated as a fourth shell family. |
