# Semantic Selector and Accessibility Regression Pack Contract

## Purpose
This contract turns semantic selector and accessibility stability into a deterministic regression
artifact instead of a best-effort testing convention.
It proves that browser `data-testid` anchors, native `accessibilityIdentifier` values, landmarks,
headings, keyboard traversal, screen-reader traversal, live-update announcements, reduced-motion
behavior, and support-surface dismissal stay aligned with the shared semantic contract across calm
shells, collaboration workspaces, portal routes, governance routes, and native operator scenes.

## Authoritative artifact
Every release or regression suite that claims semantic-selector and accessibility closure SHALL
serialize one `semantic_accessibility_regression_pack` validated by
`schemas/semantic_accessibility_regression_pack.schema.json`.

That artifact is authoritative for:

- the exact shell and native surface inventory covered by semantic and accessibility regression
- the selector profile, anchor inventory, focus order, and announcement kinds copied from the
  authoritative `semantic_accessibility_contract`
- Playwright coverage for shipped browser surfaces and XCUITest coverage for native operator scenes
- keyboard-only traversal, screen-reader traversal, and reduced-motion parity for every case
- stable semantic anchor bindings for dominant question, dominant action, promoted support region,
  limitation and recovery notices, artifact handoff, and lawful return-path controls
- the live-update announcement rules that distinguish polite activity from decisive assertive
  recovery or failure notices without stealing active focus
- the non-modal support-surface rules for drawers, inspectors, promoted support regions, and
  parent-bound secondary windows
- the transition matrix that keeps semantic anchors stable through responsive restack, rebase,
  reconnect, live-update churn, support-region collapse, and secondary-window return

## Required rules
- Every case SHALL bind to the exact `shell_family`, `selector_profile`, `required_anchor_codes[]`,
  `semantic_focus_order[]`, and `announced_change_kinds[]` already frozen by the corresponding
  `semantic_accessibility_contract`.
- Browser cases SHALL mirror every semantic anchor through `browser_identifier_or_null`; native
  cases SHALL mirror every semantic anchor through `native_identifier_or_null`. Identifier drift is
  a contract failure, not a test-only warning.
- Every case SHALL include keyboard-only, screen-reader, and reduced-motion coverage. Pointer-only
  smoke coverage is not a substitute for this pack.
- Every case SHALL keep support surfaces keyboard reachable, keyboard dismissible, and explicitly
  non-modal unless the owning shell contract already authorizes a true modal flow.
- `DOMINANT_QUESTION` SHALL remain the first heading in the announced reading order, and landmark
  plus heading inventories SHALL mirror the visible shell structure rather than breakpoint-specific
  wrappers.
- Live updates SHALL keep `ACTIVITY_DELTA` and `BADGE_DELTA` polite, while decisive
  `COMMAND_FAILURE`, `RECOVERY_NOTICE`, or `TERMINAL_SETTLEMENT` updates SHALL be assertive without
  stealing active input focus.
- Reduced-motion runs SHALL preserve the same dominant action meaning, recovery story, and return
  path as default-motion runs.
- Contextual and detached support flows SHALL keep `RETURN_PATH_CONTROL` addressable whenever the
  underlying shell contract exposes a lawful return path.

## Coverage requirements
The regression pack SHALL cover all governed shell families and native scene families:

- `LowNoiseExperienceFrame`
- `WorkspaceSnapshot`
- `ClientPortalWorkspace`
- `TenantGovernanceSnapshot`
- `NativeOperatorWorkspaceScene`
- `NativeOperatorSecondaryWindowScene`

The suite SHALL also include at minimum:

- one `REBASE` case
- one `RECONNECT` case
- one `RESPONSIVE_RESTACK` case
- one `SUPPORT_REGION_COLLAPSE` case
- one `LIVE_UPDATE` case with polite activity announcement
- one `LIVE_UPDATE` case with assertive decisive announcement
- one `SECONDARY_WINDOW_RETURN` case

## Failure modes closed
- semantic anchors missing for dominant action, limitation notice, recovery notice, or return-path
  control
- browser and native automation naming the same meaning differently
- headings or landmarks drifting away from the visible shell hierarchy
- keyboard traps in inspectors, drawers, or promoted support regions
- live updates announcing too much noise or stealing focus from active input
- reduced-motion runs observing a weaker or different recovery story than default-motion runs
- responsive restack, rebase, reconnect, or secondary-window return changing the semantic anchor
  grammar for the same governed object
