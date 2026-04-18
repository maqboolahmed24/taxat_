# Frontend Shell Route And Interaction Layer Requirements

## Summary
- Shell families modeled: `3`
- Route records modeled: `21`
- Calm-shell routes: `5`
- Portal routes: `6`
- Governance routes: `10`
- Native overlays modeled without inventing a fourth shell family: `2`

## Shell Families
### CALM_SHELL
- Label: Calm decision workspace
- Ownership rule: Manifest-scoped operator surfaces and staff collaboration workspaces stay inside the calm shell family.
- Continuity contract: `SAME_OBJECT_SAME_SHELL_INLINE_RECOVERY`
- Selector profile: `OPERATOR_SEMANTIC_SELECTORS_V1`
- Default surface order: `CONTEXT_BAR`, `DECISION_SUMMARY`, `ACTION_STRIP`, `DETAIL_DRAWER`
- Support-region law: Only one promoted support region is mounted by default; compare and audit surfaces require explicit entry.

### CLIENT_PORTAL_SHELL
- Label: Client-safe task portal
- Ownership rule: Customer request, upload, approval, onboarding, and help flows stay in the client-safe portal shell.
- Continuity contract: `SAME_SHELL_CONTEXTUAL_RETURN`
- Selector profile: `PORTAL_SEMANTIC_SELECTORS_V1`
- Default surface order: `PORTAL_HEADER`, `STATUS_HERO`, `PRIMARY_ACTION`, `PROMOTED_SUPPORT_REGION`, `SUPPORTING_DETAIL`
- Support-region law: One promoted support region maximum outside the dedicated Help route.

### GOVERNANCE_DENSITY_SHELL
- Label: Governance density workspace
- Ownership rule: Governance objects, administrative mutation work, and policy inspection stay inside the governance density shell.
- Continuity contract: `SAME_OBJECT_SAME_SHELL_CONTEXT_RETENTION`
- Selector profile: `GOVERNANCE_SEMANTIC_SELECTORS_V1`
- Default surface order: `SECTION_NAV`, `PRIMARY_WORKLIST`, `WORKSPACE_HEADER`, `ATTENTION_SUMMARY`, `PROMOTED_AUXILIARY_SURFACE`
- Support-region law: One promoted auxiliary surface by default; additional density requires explicit audit, compare, or contradiction states.

## Route Matrix
| Route ID | Pattern | Shell | Owning Object | Dominant Question |
| --- | --- | --- | --- | --- |
| `calm_manifest_workspace` | `/manifests/{manifest_id}` | `CALM_SHELL` | RunManifest | What is the current authoritative decision posture for this manifest? |
| `calm_manifest_workflow_focus` | `/manifests/{manifest_id}?focus=workflow:{item_id}` | `CALM_SHELL` | RunManifest + WorkflowItem focus | What workflow issue attached to this manifest requires operator attention now? |
| `calm_work_inbox` | `/work` | `CALM_SHELL` | WorkflowItem queue | Which workflow item requires intervention next? |
| `calm_work_item` | `/work/items/{item_id}` | `CALM_SHELL` | WorkflowItem | What is the next lawful action for this workflow item? |
| `calm_work_item_module` | `/work/items/{item_id}?module={module_code}` | `CALM_SHELL` | WorkflowItem module focus | Which workflow module is in focus, and what action remains lawful from that focus? |
| `portal_home` | `/portal` | `CLIENT_PORTAL_SHELL` | ClientPortalWorkspace | What is the client's current required next step? |
| `portal_documents` | `/portal/documents` | `CLIENT_PORTAL_SHELL` | DocumentRequest workspace | What document or upload action must the client complete next? |
| `portal_approvals` | `/portal/approvals` | `CLIENT_PORTAL_SHELL` | ApprovalPack workspace | What approval decision does the client need to make right now? |
| `portal_onboarding` | `/portal/onboarding` | `CLIENT_PORTAL_SHELL` | Client onboarding flow | What onboarding step must the client complete next? |
| `portal_help` | `/portal/help` | `CLIENT_PORTAL_SHELL` | Client help workspace | Which help path or support handoff best resolves the client's current blocker? |
| `portal_request_detail` | `/portal/requests/{item_id}` | `CLIENT_PORTAL_SHELL` | Customer request workspace | What request-specific action, artifact, or clarification should the client address next? |
| `governance_overview` | `/governance` | `GOVERNANCE_DENSITY_SHELL` | TenantGovernanceSnapshot | Which governance risk, configuration drift, or policy task requires attention first? |
| `governance_tenant` | `/governance/tenant` | `GOVERNANCE_DENSITY_SHELL` | Tenant configuration workspace | What tenant configuration change is being staged, and what blast radius does it carry? |
| `governance_access_principals` | `/governance/access/principals` | `GOVERNANCE_DENSITY_SHELL` | Principal directory workspace | Which principal's effective access posture requires review or change? |
| `governance_access_roles` | `/governance/access/roles` | `GOVERNANCE_DENSITY_SHELL` | Role matrix workspace | What role policy or matrix change is under review? |
| `governance_access_simulator` | `/governance/access/simulator` | `GOVERNANCE_DENSITY_SHELL` | Policy simulation workspace | How would the current policy basis evaluate a governed access request? |
| `governance_authority_links` | `/governance/authority-links` | `GOVERNANCE_DENSITY_SHELL` | AuthorityLink workspace | Which authority binding or handshake posture requires intervention? |
| `governance_retention_policies` | `/governance/retention/policies` | `GOVERNANCE_DENSITY_SHELL` | Retention policy workspace | Which retention policy requires review or change? |
| `governance_retention_legal_holds` | `/governance/retention/legal-holds` | `GOVERNANCE_DENSITY_SHELL` | Legal hold workspace | Which legal hold requires action, review, or release? |
| `governance_retention_erasure` | `/governance/retention/erasure` | `GOVERNANCE_DENSITY_SHELL` | Erasure workspace | Which erasure request or exception posture needs resolution? |
| `governance_audit` | `/governance/audit` | `GOVERNANCE_DENSITY_SHELL` | Audit workbench | Which audit event, diff, or neighborhood comparison needs investigation? |

## Interaction-Layer Foundations
| Shell | Interaction Layer | Selector Profile | Continuity Policy |
| --- | --- | --- | --- |
| `CALM_SHELL` | `OperatorInteractionLayer` | `OPERATOR_SEMANTIC_SELECTORS_V1` | `SAME_OBJECT_SAME_SHELL_INLINE_RECOVERY` |
| `CLIENT_PORTAL_SHELL` | `PortalInteractionLayer` | `PORTAL_SEMANTIC_SELECTORS_V1` | `SAME_SHELL_CONTEXTUAL_RETURN` |
| `GOVERNANCE_DENSITY_SHELL` | `GovernanceInteractionLayer` | `GOVERNANCE_SEMANTIC_SELECTORS_V1` | `SAME_OBJECT_SAME_SHELL_CONTEXT_RETENTION` |

Native overlays remain embodiments, not new shell families:
- `native_primary_operator_scene`: `CALM_SHELL` embodiment with `LEADING_SIDEBAR -> PRIMARY_CANVAS -> TRAILING_INSPECTOR`.
- `native_secondary_support_window`: parent-bound support overlay with `IDENTITY_HEADER -> SUMMARY_CARD -> DETAIL_BODY`.

## Shared Contract Requirements
- Every route-visible shell or scene that survives refresh, reconnect, resize, or deep-link restoration must publish `cross_device_continuity_contract`.
- Every route-visible shell or scene that exposes landmarks, focus order, or regression anchors must publish `semantic_accessibility_contract`.
- Browser and native surfaces remain subject to the same same-object / same-shell law, dominant-question law, and promoted-support-region budget.

## Assumptions And Risks
- `ASSUMPTION_MANIFEST_WORKSPACE_ROUTE_PATTERN`: The corpus names manifest-scoped operator surfaces without a single literal browser root path, so the atlas normalizes the primary manifest route as `/manifests/{manifest_id}` to align with the explicit workflow deep-link form.
- `ASSUMPTION_PORTAL_HOME_CANONICAL_ROOT_ROUTE`: The client portal contract enumerates the Home destination but does not require a `/portal/home` literal, so the atlas binds Home to the canonical root route `/portal`.
- `ASSUMPTION_RETENTION_ROUTE_FOCUS_ORDER_NORMALIZATION`: Retention policy, legal-hold, and erasure routes are enumerated explicitly, but their exact landmark order is less granular than the tenant/access/audit routes, so the atlas normalizes them through the shared governance reading-order law plus the named route-local workspaces.
- `RISK_NATIVE_SECONDARY_WINDOW_ROUTELESS_OVERLAY`: Native secondary windows are deliberate support overlays rather than a fourth shell family. They do not introduce route patterns, so the atlas models them as embodiment overlays on top of calm-shell continuity law.
