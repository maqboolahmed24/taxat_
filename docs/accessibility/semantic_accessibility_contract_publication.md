# Semantic Accessibility Contract Publication

`packages/backend-low-noise` publishes one server-authored
`semantic_accessibility_contract` per governed route-visible surface. The contract is the source for
selector profile, semantic anchor inventory, visible focus order, announcement kinds, identifier
parity, artifact handoff semantics, reduced-motion posture, and support-region access rules.

## Governed Surface Matrix

| Surface | Route variant | Shell family | Selector profile | Return path |
| --- | --- | --- | --- | --- |
| `LowNoiseExperienceFrame` | `LOW_NOISE_FRAME` | `CALM_SHELL` | `OPERATOR_SEMANTIC_SELECTORS_V1` | Not required |
| `WorkspaceSnapshot` | `COLLABORATION_WORKSPACE` | `CALM_SHELL` | `OPERATOR_SEMANTIC_SELECTORS_V1` | Required |
| `ClientPortalWorkspace` | `PORTAL_WORKSPACE` / `PORTAL_CONTEXTUAL_ROUTE` | `CLIENT_PORTAL_SHELL` | `PORTAL_SEMANTIC_SELECTORS_V1` | Required |
| `TenantGovernanceSnapshot` | `GOVERNANCE_OVERVIEW` | `GOVERNANCE_DENSITY_SHELL` | `GOVERNANCE_SEMANTIC_SELECTORS_V1` | Not required |
| `NativeOperatorWorkspaceScene` | `NATIVE_OPERATOR_PRIMARY` | `CALM_SHELL` | `OPERATOR_SEMANTIC_SELECTORS_V1` | Not required |
| `NativeOperatorSecondaryWindowScene` | `NATIVE_OPERATOR_SECONDARY` | `CALM_SHELL` | `OPERATOR_SEMANTIC_SELECTORS_V1` | Required |

The TypeScript inventories in `get_shell_anchor_inventory.ts` mirror the canonical validator surface
bindings where they are also valid under `semantic_accessibility_contract.schema.json`. The schema
currently treats portal `STATUS_HERO` as a focus region rather than an anchor code, so it remains in
`semantic_focus_order[]` and is not emitted in `required_anchor_codes[]`. Portal contextual routes
deliberately reuse the base `ClientPortalWorkspace` selector profile and anchor inventory; the
contextual distinction lives in route context and focus restoration data, not in a second selector
grammar.

## Anchor Rules

All governed contracts include shell root, shell family, object anchor, dominant question,
settlement posture, and recovery posture anchors. `DOMINANT_ACTION` and `PRIMARY_ACTION` are
included where the surface exposes governed action posture; support-only native secondary windows do
not publish a dominant action anchor.

Limitation and recovery notices are addressable whenever the canonical surface inventory includes
them. Artifact handoff anchors keep current and history semantics distinct through either
`CURRENT_ARTIFACT` plus `HISTORY_LIST`, or through `ARTIFACT_HANDOFF` plus
`ARTIFACT_STATE_LABEL` for currentness-first low-noise/native surfaces. `RETURN_PATH_CONTROL` is
required for collaboration workspaces, portal workspaces, portal contextual routes, and native
secondary windows.

## Identifier Parity

Browser `data-testid` and future native `accessibilityIdentifier` values mirror the same
`semantic_anchor_ref` values from the anchor inventory. The parity model is meaning-first:
identifiers are derived from semantic anchors, not from layout, visual styling, or browser-only
nicknames. Low-noise and portal inventories retain the documented user-facing selector names such as
`low-noise-shell`, `dominant-question`, `portal-route-tabs`, and `portal-request-focus`; portal
`STATUS_HERO` is a focus-region code until the schema admits it as an anchor. Native embodiments
mirror the same semantic refs in `accessibilityIdentifier`.

## Focus And Announcement Rules

`semantic_focus_order[]` is the visible semantic traversal order:

- Low-noise and collaboration: `CONTEXT_BAR -> DECISION_SUMMARY -> ACTION_STRIP -> DETAIL_DRAWER`
- Portal: `PORTAL_HEADER -> STATUS_HERO -> PRIMARY_ACTION -> PROMOTED_SUPPORT_REGION -> SUPPORTING_DETAIL`
- Governance: `SECTION_NAV -> PRIMARY_WORKLIST -> WORKSPACE_HEADER -> ATTENTION_SUMMARY -> PROMOTED_AUXILIARY_SURFACE`
- Native primary: `LEADING_SIDEBAR -> PRIMARY_CANVAS -> TRAILING_INSPECTOR`
- Native secondary: `IDENTITY_HEADER -> SUMMARY_CARD -> DETAIL_BODY`

`ACTIVITY_DELTA` and `BADGE_DELTA` are polite. `COMMAND_FAILURE`, `RECOVERY_NOTICE`, and
`TERMINAL_SETTLEMENT` are assertive and must not steal active input focus. `LIMITATION_NOTICE`
remains a contextual notice kind; the contract keeps it addressable without reclassifying it as
routine live-update noise.

## Service Entry Points

- `projectSemanticAccessibilityContract(...)` emits the schema contract.
- `getShellAnchorInventory(...)` exposes exact anchors, focus order, return-path requirements, and
  identifier parity refs for later Playwright/XCUITest suites.
- `getShellAnnouncementProfile(...)` exposes polite/assertive live-region classification.
- `validateSemanticAccessibilityContract(...)` fails closed on selector, anchor, focus-order,
  return-path, artifact-handoff, or announcement drift.
- `publishSemanticAccessibilityContractIntoReadModels(...)` attaches the contract to an existing
  route-visible read model while checking shell-family alignment.
