# Playwright Accessibility And Continuity Validation Plan

## Test Suite Structure
- `frontend_contract_atlas.spec.ts`: render integrity, tab navigation, shell-page coverage, and screenshot baselines.
- `frontend_contract_atlas.continuity.spec.ts`: continuity lab scenarios, focus-return demo, back/forward route history, and reduced-motion parity.
- `frontend_contract_atlas.accessibility.spec.ts`: keyboard tab flow, semantic anchor visibility, aria-live posture, and heading/landmark integrity.

## Selector Profiles
| Profile | Shell | Selector Count |
| --- | --- | --- |
| `OPERATOR_SEMANTIC_SELECTORS_V1` | `CALM_SHELL` | `38` |
| `PORTAL_SEMANTIC_SELECTORS_V1` | `CLIENT_PORTAL_SHELL` | `12` |
| `GOVERNANCE_SEMANTIC_SELECTORS_V1` | `GOVERNANCE_DENSITY_SHELL` | `24` |

Shared selectors validated across shells: `9`

## Continuity Scenarios
| Scenario | Trigger | Recovery Mode | Live Region |
| --- | --- | --- | --- |
| `refresh_preserves_same_object` | Full browser refresh or view reload without truth change. | `PRESERVED` | `polite` |
| `reconnect_stream_catch_up` | Live stream reconnect with monotonic catch-up or visibility re-entry. | `INLINE_RECOVERY` | `polite` |
| `publication_or_epoch_rebase` | Frame epoch drift, shell-stability drift, route-context drift, or compaction that invalidates the current surface basis. | `REBASE_REQUIRED` | `assertive` |
| `access_rebind_after_scope_change` | Session, access binding, masking, or schema compatibility drift. | `ACCESS_REBIND_REQUIRED` | `assertive` |
| `deep_link_entry_and_restore` | Direct deep-link entry from browser address bar, notification, or in-app jump. | `PRESERVED` | `polite` |
| `notification_open_preserves_slice` | Notification click or inbox/open-from-alert event. | `PRESERVED` | `polite` |
| `narrow_screen_collapse_preserves_order` | Responsive collapse from desktop to tablet or mobile. | `PRESERVED` | `polite` |
| `browser_back_and_return` | Browser back, route return, or explicit back control. | `PRESERVED` | `polite` |
| `native_scene_restoration` | macOS scene restoration or cached workspace hydration on app relaunch. | `PRESERVED` | `polite` |
| `secondary_window_return` | Closing a native or browser support window such as compare, audit, Quick Look, export, or packet review. | `PRESERVED` | `polite` |
| `reduced_motion_semantic_equivalence` | Reduced-motion preference is enabled. | `PRESERVED` | `polite` |
| `cache_hydration_purge_and_rebase` | Native or browser cache hydration on mismatched tenant, masking, or contract basis. | `ACCESS_REBIND_REQUIRED` | `assertive` |

## Mandatory Harness Concepts
- `shell_continuity_fuzz_harness`
- `semantic_accessibility_regression_pack`
- `stream_resume_and_catch_up_ordering_contract`
- `native_cache_hydration_purge_and_rebase_contract`
- `focus_restoration_and_return_target_harness`
- `cross_device_continuity_contract`

## Browser And Accessibility Expectations
- Use role-based locators for tabs, tab panels, buttons, and headings first.
- Reserve `data-testid` for stable domain anchors such as semantic selectors, summary cards, and the continuity support demo.
- Verify reduced-motion parity explicitly through `document.documentElement.dataset.motion`.
- Keep screenshot baselines to overview and continuity pages so visual regressions stay high-signal rather than noisy.
