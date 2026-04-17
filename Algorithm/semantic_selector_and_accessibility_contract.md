# Semantic Selector and Accessibility Contract

## Purpose
This contract freezes the machine-readable semantic and accessibility boundary for every governed
shell and native scene. It prevents browser `data-testid` hooks, native `accessibilityIdentifier`
values, landmarks, headings, keyboard traversal, focus restoration, live-region announcements, and
reduced-motion behavior from drifting into layout-local or style-driven variants.

## Contract boundary
Every route-visible shell or native scene that already publishes shell identity, state taxonomy, or
cross-device continuity SHALL also publish one `semantic_accessibility_contract` validated by
`schemas/semantic_accessibility_contract.schema.json`.

That contract is authoritative for:

- the selector profile shared by browser automation and native automation
- the policy that identifiers describe domain meaning rather than visual styling
- the landmark and heading structure for dominant summary, dominant action, promoted support
  region, and limitation or recovery notices
- the visible semantic focus order, focus-entry posture, and focus-restore posture
- keyboard completeness for governed actions and support modules
- live-update announcement posture and the ban on background focus theft
- reduced-motion behavior that preserves meaning without depending on motion
- the required semantic anchor set that automation and assistive technology may rely on

## Required rules
- Browser `data-testid` values and native `accessibilityIdentifier` values SHALL mirror the same
  semantic anchor codes.
- Semantic anchors SHALL name domain meaning such as object anchor, dominant question, dominant
  action, support region, artifact handoff, or return-path control; they SHALL NOT name color,
  size, position, or other visual styling.
- Focus order SHALL follow visible semantic order. Route, module, or notice changes SHALL focus the
  requested anchor, primary heading, or explicit limitation/recovery notice rather than a renderer-
  invented wrapper node.
- Live updates SHALL never steal focus from an active composer, editor, file picker, or equivalent
  governed input. Activity and badge changes remain polite announcements; command failure and hard
  invalidation may be assertive.
- Promoted support regions and detail modules SHALL remain keyboard reachable, keyboard dismissible,
  and assistive-technology addressable.
- Current and historical artifact targets SHALL remain separately addressable so preview, print, and
  download automation never confuses history with the current governed handoff target.
- Reduced-motion mode SHALL preserve the same settled meaning, action posture, and recovery
  semantics with minimal or no spatial displacement.

## Surface mapping
- `LowNoiseExperienceFrame` and `WorkspaceSnapshot` use the calm-shell semantic focus order
  `CONTEXT_BAR -> DECISION_SUMMARY -> ACTION_STRIP -> DETAIL_DRAWER`.
- `ClientPortalWorkspace` uses the portal shell task-first order
  `PORTAL_HEADER -> STATUS_HERO -> PRIMARY_ACTION -> PROMOTED_SUPPORT_REGION -> SUPPORTING_DETAIL`.
- `TenantGovernanceSnapshot` uses the governance order
  `SECTION_NAV -> PRIMARY_WORKLIST -> WORKSPACE_HEADER -> ATTENTION_SUMMARY -> PROMOTED_AUXILIARY_SURFACE`.
- `NativeOperatorWorkspaceScene` uses the native primary-window order
  `LEADING_SIDEBAR -> PRIMARY_CANVAS -> TRAILING_INSPECTOR`.
- `NativeOperatorSecondaryWindowScene` uses the secondary-window order
  `IDENTITY_HEADER -> SUMMARY_CARD -> DETAIL_BODY`.

## Failure modes closed
- selectors bound to styling or breakpoint-specific wrappers instead of governed meaning
- browser and native automation naming different concepts for the same shell element
- focus order drifting from visible reading order during restack, rebase, or restoration
- background activity stealing focus from active input or picker flows
- missing machine-readable anchors for dominant question, dominant action, limitation/recovery
  notices, artifact handoff, or lawful return controls
- support modules reachable by pointer but not by keyboard or assistive technology
