# ADR-007 Comparison Notes

This comparison expands the weighted scorecard that supports ADR-007.

## Ranking

| Rank | Alternative | Weighted Score | Leading Strengths |
| --- | --- | --- | --- |
| 1 | Signed/notarized Xcode-native macOS client with SwiftUI-first delivery and targeted AppKit acceleration | 93.0 | Best fit for system-browser auth, Keychain session posture, multi-window deep work, and high-density operator investigation., Preserves server-authoritative legality while still giving the desktop product real native advantages over the browser. |
| 2 | Electron, Tauri, or browser-wrapper desktop delivery | 53.25 | Faster initial implementation because web surfaces can be reused aggressively., Can centralize some browser and desktop development around one shared rendering stack. |
| 3 | Browser-only delivery with no first-class native desktop product | 50.85 | Operationally simpler because no signed native product, update channel, or Xcode workspace is required., Maintains one rendering stack and one test surface. |

## Criteria and Weights

| Criterion | Priority | Weight | Source Grounding |
| --- | --- | --- | --- |
| Shell-law fidelity across native embodiment | HARD_REQUIREMENT | 14 | Algorithm/frontend_shell_and_interaction_law.md::L19[1._Shell_families_and_object_ownership], Algorithm/macos_native_operator_workspace_blueprint.md::L170[5._Preferred_window_and_scene_architecture] |
| Server-authoritative legality | HARD_REQUIREMENT | 12 | Algorithm/macos_native_operator_workspace_blueprint.md::L15[1._Architectural_thesis], Algorithm/macos_native_operator_workspace_blueprint.md::L29[2._Architectural_guardrails] |
| Performance for large tables, diffs, and investigations | HARD_REQUIREMENT | 11 | Algorithm/macos_native_operator_workspace_blueprint.md::L428[9._SwiftUI_versus_AppKit_decision_matrix], Algorithm/macos_native_operator_workspace_blueprint.md::L502[12._Performance_strategy] |
| Auth/session safety and system-browser handoff quality | HARD_REQUIREMENT | 11 | Algorithm/macos_native_operator_workspace_blueprint.md::L372[7._Authentication_and_session_strategy], Algorithm/northbound_api_and_session_contract.md::L709[8._Session_browser_and_native-client_rules] |
| Cache isolation and invalidation integrity | HARD_REQUIREMENT | 10 | Algorithm/cache_isolation_and_secure_reuse_contract.md::L3[Purpose], Algorithm/native_cache_hydration_purge_and_rebase_contract.md::L45[Required_rules] |
| Scene/window coherence and restoration behavior | HARD_REQUIREMENT | 10 | Algorithm/macos_native_operator_workspace_blueprint.md::L170[5._Preferred_window_and_scene_architecture], Algorithm/macos_native_operator_workspace_blueprint.md::L540[14._Acceptance_criteria] |
| Native ergonomics and OS integration | HARD_REQUIREMENT | 10 | Algorithm/macos_native_operator_workspace_blueprint.md::L449[10._Native_UX_opportunities_that_should_replace_browser_habits], Algorithm/UIUX_DESIGN_SKILL.md::L195[Core_design_language] |
| Release, signing, notarization, and compatibility operability | STRONG_PREFERENCE | 8 | Algorithm/macos_native_operator_workspace_blueprint.md::L473[11._Security_and_runtime_posture_for_the_desktop_client], Algorithm/macos_native_operator_workspace_blueprint.md::L516[13._Delivery_sequencing] |
| Implementation velocity and long-term maintainability | TRADEOFF | 7 | Algorithm/macos_native_operator_workspace_blueprint.md::L46[3._Recommended_Xcode_workspace_topology], Algorithm/macos_native_operator_workspace_blueprint.md::L516[13._Delivery_sequencing] |
| Testing strategy fit across native and browser-owned handoffs | HARD_REQUIREMENT | 7 | Algorithm/macos_native_operator_workspace_blueprint.md::L540[14._Acceptance_criteria], Algorithm/UIUX_DESIGN_SKILL.md::L716[Playwright-first_XCUITest-first_design_expectation] |

## Coverage Summary

- Native scenes and windows normalized: `7`
- Cache or security boundaries declared: `7`
- Browser handoff rules carried into the strategy: `5`
- Native scene scenarios declared: `8`

## Shell-law fidelity across native embodiment

- Priority: `HARD_REQUIREMENT`
- Weight: `14`
- Rationale: Native delivery must preserve the same object, shell, support-region, and recovery law instead of inventing a fourth desktop-only shell.

| Alternative | Raw Score | Weighted Contribution | Reason |
| --- | --- | --- | --- |
| Signed/notarized Xcode-native macOS client with SwiftUI-first delivery and targeted AppKit acceleration | 4.75 | 13.3 | It is the only option that cleanly treats native as an embodiment of the governed shell law rather than a browser imitation. |
| Electron, Tauri, or browser-wrapper desktop delivery | 2.25 | 6.3 | A wrapper runtime makes it too easy to re-skin browser metaphors instead of building real native scene law. |
| Browser-only delivery with no first-class native desktop product | 1.75 | 4.9 | It avoids desktop drift only by refusing to solve native embodiment at all. |

## Server-authoritative legality

- Priority: `HARD_REQUIREMENT`
- Weight: `12`
- Rationale: The desktop app must remain a projection-and-command client rather than a second compliance engine.

| Alternative | Raw Score | Weighted Contribution | Reason |
| --- | --- | --- | --- |
| Signed/notarized Xcode-native macOS client with SwiftUI-first delivery and targeted AppKit acceleration | 4.75 | 11.4 | The source blueprint explicitly frames this as a server-authoritative projection-and-command client, which the native Xcode approach matches directly. |
| Electron, Tauri, or browser-wrapper desktop delivery | 3.0 | 7.2 | It can stay server-authoritative, but browser-local habits and wrapper shortcuts make client-local drift more tempting. |
| Browser-only delivery with no first-class native desktop product | 4.25 | 10.2 | Browser-only delivery can keep legality centralized, which is its strongest attribute. |

## Performance for large tables, diffs, and investigations

- Priority: `HARD_REQUIREMENT`
- Weight: `11`
- Rationale: Native delivery is only worth the cost if it materially outperforms the browser on high-density operator work.

| Alternative | Raw Score | Weighted Contribution | Reason |
| --- | --- | --- | --- |
| Signed/notarized Xcode-native macOS client with SwiftUI-first delivery and targeted AppKit acceleration | 4.5 | 9.9 | SwiftUI plus targeted AppKit bridges can outperform the browser meaningfully on dense audit, diff, and evidence workflows. |
| Electron, Tauri, or browser-wrapper desktop delivery | 2.75 | 6.05 | It helps a little with packaging, but it still inherits many browser rendering limits on the exact workloads native is meant to improve. |
| Browser-only delivery with no first-class native desktop product | 1.5 | 3.3 | It leaves the heaviest operator workflows stuck with browser constraints that the native blueprint exists to overcome. |

## Auth/session safety and system-browser handoff quality

- Priority: `HARD_REQUIREMENT`
- Weight: `11`
- Rationale: Native sign-in and step-up must use system-browser-managed flows with safe return-target continuity and no raw authority credentials on device.

| Alternative | Raw Score | Weighted Contribution | Reason |
| --- | --- | --- | --- |
| Signed/notarized Xcode-native macOS client with SwiftUI-first delivery and targeted AppKit acceleration | 4.75 | 10.45 | System-browser auth, Keychain-backed session artifacts, and native return-target control are first-class here. |
| Electron, Tauri, or browser-wrapper desktop delivery | 2.25 | 4.95 | System-browser and embedded-wrapper boundaries become blurrier and harder to keep exact. |
| Browser-only delivery with no first-class native desktop product | 3.25 | 7.15 | Browser auth is familiar, but it gives up the safer system-browser-plus-Keychain posture for the operator desktop product. |

## Cache isolation and invalidation integrity

- Priority: `HARD_REQUIREMENT`
- Weight: `10`
- Rationale: Native speed is lawful only when FE-25 and FE-75 boundaries are explicit, exact, and fail closed on drift.

| Alternative | Raw Score | Weighted Contribution | Reason |
| --- | --- | --- | --- |
| Signed/notarized Xcode-native macOS client with SwiftUI-first delivery and targeted AppKit acceleration | 4.75 | 9.5 | A dedicated native architecture can encode FE-25 and FE-75 exactly rather than adapting browser cache assumptions. |
| Electron, Tauri, or browser-wrapper desktop delivery | 2.5 | 5.0 | Wrapper-local persistence and browser-style caches make FE-25 and FE-75 discipline harder to keep sharp. |
| Browser-only delivery with no first-class native desktop product | 2.5 | 5.0 | Browser cache isolation can be good, but it does not solve native restoration or OS-artifact control because there is no native product. |

## Scene/window coherence and restoration behavior

- Priority: `HARD_REQUIREMENT`
- Weight: `10`
- Rationale: Primary scenes, detached support windows, and restoration rules must stay concrete enough that later native work does not drift.

| Alternative | Raw Score | Weighted Contribution | Reason |
| --- | --- | --- | --- |
| Signed/notarized Xcode-native macOS client with SwiftUI-first delivery and targeted AppKit acceleration | 4.75 | 9.5 | WindowGroup, scene restoration, and detached support surfaces map directly to the blueprint's scene law. |
| Electron, Tauri, or browser-wrapper desktop delivery | 2.75 | 5.5 | Detached support windows and restoration are possible, but the model still pulls toward tabbed web thinking. |
| Browser-only delivery with no first-class native desktop product | 1.0 | 2.0 | There is no true answer for scene restoration, detached support windows, or native multi-window continuity because the product never ships them. |

## Native ergonomics and OS integration

- Priority: `HARD_REQUIREMENT`
- Weight: `10`
- Rationale: A macOS product should use menu commands, keyboard-first flows, Quick Look, state restoration, and multi-window deep work instead of mimicking browser habits.

| Alternative | Raw Score | Weighted Contribution | Reason |
| --- | --- | --- | --- |
| Signed/notarized Xcode-native macOS client with SwiftUI-first delivery and targeted AppKit acceleration | 4.75 | 9.5 | It unlocks true menu commands, Quick Look, native notifications, keyboard flows, and deep multi-window work. |
| Electron, Tauri, or browser-wrapper desktop delivery | 2.5 | 5.0 | Some desktop APIs are available, but the product remains semantically browser-first rather than native-first. |
| Browser-only delivery with no first-class native desktop product | 1.0 | 2.0 | It forfeits Quick Look, native menus, rich keyboard flows, and deep multi-window investigation altogether. |

## Release, signing, notarization, and compatibility operability

- Priority: `STRONG_PREFERENCE`
- Weight: `8`
- Rationale: Native delivery needs a sane operational model for signing, hardened runtime, kill switches, compatibility windows, and browser fallback.

| Alternative | Raw Score | Weighted Contribution | Reason |
| --- | --- | --- | --- |
| Signed/notarized Xcode-native macOS client with SwiftUI-first delivery and targeted AppKit acceleration | 4.5 | 7.2 | This is the only option that fully embraces signing, notarization, hardened runtime, and kill-switch posture as native product concerns. |
| Electron, Tauri, or browser-wrapper desktop delivery | 3.25 | 5.2 | Desktop packaging exists, but hardened-runtime and entitlement posture are weaker fits than a true Xcode-native app. |
| Browser-only delivery with no first-class native desktop product | 4.5 | 7.2 | Operationally simpler because there is no native signing or notarization surface to run. |

## Implementation velocity and long-term maintainability

- Priority: `TRADEOFF`
- Weight: `7`
- Rationale: The chosen strategy must be implementable by a native team without locking the product into a permanently costly abstraction mistake.

| Alternative | Raw Score | Weighted Contribution | Reason |
| --- | --- | --- | --- |
| Signed/notarized Xcode-native macOS client with SwiftUI-first delivery and targeted AppKit acceleration | 4.25 | 5.95 | The Xcode-native path costs more upfront, but it gives the clearest long-term ownership seams and avoids wrapper debt. |
| Electron, Tauri, or browser-wrapper desktop delivery | 3.0 | 4.2 | Short-term velocity is real, but long-term wrapper debt and performance compromises accumulate quickly. |
| Browser-only delivery with no first-class native desktop product | 3.75 | 5.25 | It is cheaper upfront, though that savings comes from declining the native product requirement. |

## Testing strategy fit across native and browser-owned handoffs

- Priority: `HARD_REQUIREMENT`
- Weight: `7`
- Rationale: The architecture must pair XCUITest and native preview coverage with Playwright over browser-owned handoff surfaces.

| Alternative | Raw Score | Weighted Contribution | Reason |
| --- | --- | --- | --- |
| Signed/notarized Xcode-native macOS client with SwiftUI-first delivery and targeted AppKit acceleration | 4.5 | 6.3 | It supports a clean XCUITest plus Playwright split instead of forcing all behavior through one compromised runtime. |
| Electron, Tauri, or browser-wrapper desktop delivery | 2.75 | 3.85 | The automation split is muddier because the product never cleanly commits to native or browser ownership. |
| Browser-only delivery with no first-class native desktop product | 2.75 | 3.85 | One browser stack is easier to test, but it leaves the native handoff and restoration problem unsolved rather than solved well. |

## Why The Runner-Up Options Lost

- `Electron, Tauri, or browser-wrapper desktop delivery` lost because encourages a browser-wrapper mindset, weakens true native scene/window design, and makes system-browser/session boundaries easier to blur.
- `Browser-only delivery with no first-class native desktop product` lost because rejects the product requirement for keyboard-first, multi-window, high-density native investigation work and leaves browser limits in place.
