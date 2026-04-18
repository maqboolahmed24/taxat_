# ADR-006 Comparison Notes

This comparison expands the weighted scorecard that supports ADR-006.

## Ranking

| Rank | Alternative | Weighted Score | Leading Strengths |
| --- | --- | --- | --- |
| 1 | Shared TypeScript/React web platform with two deployables | 91.4 | Preserves portal deployable isolation while keeping one shared contract spine., Allows calm-shell and governance surfaces to share the internal session and route runtime without shipping that bundle to portal users. |
| 2 | One single mega web application containing all shell families and audiences | 61.2 | Simplifies some deployment plumbing and can make local development feel more centralized., Keeps all shells under one runtime process and one build graph. |
| 3 | Micro-frontend decomposition by route family, shell, or feature slice | 56.3 | Can isolate ownership aggressively and shrink individual feature bundles., Looks attractive when many teams want independent shipping cadence. |

## Criteria and Weights

| Criterion | Priority | Weight | Source Grounding |
| --- | --- | --- | --- |
| Shell-law fidelity | HARD_REQUIREMENT | 14 | Algorithm/frontend_shell_and_interaction_law.md::L19[1._Shell_families_and_object_ownership], Algorithm/low_noise_experience_contract.md::L122[Default_visible_shell], Algorithm/customer_client_portal_experience_contract.md::L15[Experience_thesis], Algorithm/admin_governance_console_architecture.md::L35[2._Profile_boundary_and_shell_contract] |
| Cross-shell code sharing without semantic drift | HARD_REQUIREMENT | 10 | Algorithm/cross_shell_design_token_and_interaction_layer_foundation_contract.md::L50[Required_family_mappings], Algorithm/UIUX_DESIGN_SKILL.md::L27[Interface_families_and_profile_boundaries] |
| Deployable isolation between operator/governance and portal surfaces | HARD_REQUIREMENT | 12 | Algorithm/customer_client_portal_experience_contract.md::L15[Experience_thesis], Algorithm/admin_governance_console_architecture.md::L35[2._Profile_boundary_and_shell_contract], Algorithm/northbound_api_and_session_contract.md::L709[8._Session_browser_and_native-client_rules] |
| Route continuity and deep-link stability | HARD_REQUIREMENT | 10 | Algorithm/frontend_shell_and_interaction_law.md::L49[2._Route_continuity_and_shell_stability], Algorithm/cross_device_continuity_and_restoration_contract.md::L42[Required_rules], Algorithm/focus_restoration_and_return_target_harness_contract.md::L26[Required_rules] |
| Auth/session integration fit | HARD_REQUIREMENT | 8 | Algorithm/frontend_shell_and_interaction_law.md::L524[7._Artifact_preview_export_print_and_browser_handoff], Algorithm/northbound_api_and_session_contract.md::L709[8._Session_browser_and_native-client_rules] |
| Customer-safe separation | HARD_REQUIREMENT | 12 | Algorithm/customer_client_portal_experience_contract.md::L479[Read-model_and_API_translation_requirements], Algorithm/collaboration_workspace_contract.md::L1953[12._Playwright_scenarios] |
| Performance and bundle isolation | STRONG_PREFERENCE | 9 | Algorithm/admin_governance_console_architecture.md::L661[7._Frontend_systems_architecture], Algorithm/customer_client_portal_experience_contract.md::L388[Responsive_fallback_rules] |
| Design-token and selector reuse | HARD_REQUIREMENT | 8 | Algorithm/cross_shell_design_token_and_interaction_layer_foundation_contract.md::L50[Required_family_mappings], Algorithm/semantic_selector_and_accessibility_contract.md::L45[Surface_mapping], Algorithm/semantic_selector_and_accessibility_regression_pack_contract.md::L54[Coverage_requirements] |
| Testability with Playwright | HARD_REQUIREMENT | 7 | Algorithm/frontend_shell_and_interaction_law.md::L644[10._Automation_anchors_and_UI_observability_fencing], Algorithm/UIUX_DESIGN_SKILL.md::L716[Playwright-first_XCUITest-first_design_expectation] |
| Evolvability for later phase-05 implementation tasks | STRONG_PREFERENCE | 5 | Algorithm/UIUX_DESIGN_SKILL.md::L885[Deliverable_template_for_future_UI_UX_proposals], docs/architecture/adr/ADR-006-web-frontend-topology.md::planned_topology[ADR-006 implementation seam doctrine] |
| Operational simplicity and blast-radius control | TRADEOFF | 5 | Algorithm/northbound_api_and_session_contract.md::L15[1._Core_principles], Algorithm/UIUX_DESIGN_SKILL.md::L27[Interface_families_and_profile_boundaries] |

## Coverage Summary

- Browser routes covered: `24`
- Deployables covered: `2`
- Shared packages declared: `8`
- Typed deployable-route gaps carried forward: `4`

## Shell-law fidelity

- Priority: `HARD_REQUIREMENT`
- Weight: `14`
- Rationale: The topology must preserve the three shell families and their distinct layout grammars without collapsing them into one generic dashboard.

| Alternative | Raw Score | Weighted Contribution | Reason |
| --- | --- | --- | --- |
| Shared TypeScript/React web platform with two deployables | 4.75 | 13.3 | Best fit because it keeps shell grammars distinct in code and deployables while still sharing contract infrastructure. |
| One single mega web application containing all shell families and audiences | 3.0 | 8.4 | It can preserve shell law in theory, but one runtime increases pressure to normalize all shells into one dashboard grammar. |
| Micro-frontend decomposition by route family, shell, or feature slice | 2.25 | 6.3 | Route-level seams and cross-bundle composition make exact shell continuity and support-region law harder to preserve. |

## Cross-shell code sharing without semantic drift

- Priority: `HARD_REQUIREMENT`
- Weight: `10`
- Rationale: The shared web platform must reuse contracts, tokens, selector grammar, and continuity logic without forcing one shell grammar onto another.

| Alternative | Raw Score | Weighted Contribution | Reason |
| --- | --- | --- | --- |
| Shared TypeScript/React web platform with two deployables | 4.5 | 9.0 | Shared packages cover the contract spine, while separate apps keep portal and internal shell composition from collapsing together. |
| One single mega web application containing all shell families and audiences | 3.25 | 6.5 | Code sharing is easy, but the same convenience makes semantic bleed between portal and internal shells more likely. |
| Micro-frontend decomposition by route family, shell, or feature slice | 2.5 | 5.0 | Each micro-frontend wants its own primitives and runtime conventions, which weakens the shared shell law spine. |

## Deployable isolation between operator/governance and portal surfaces

- Priority: `HARD_REQUIREMENT`
- Weight: `12`
- Rationale: Internal operator/governance code and customer portal code need clear deployable boundaries for audience safety, bundle isolation, and blast-radius control.

| Alternative | Raw Score | Weighted Contribution | Reason |
| --- | --- | --- | --- |
| Shared TypeScript/React web platform with two deployables | 4.75 | 11.4 | Portal stays physically separate from internal operator/governance bundles and session posture. |
| One single mega web application containing all shell families and audiences | 2.0 | 4.8 | Portal and internal code inevitably co-reside, making audience isolation weaker and blast radius wider. |
| Micro-frontend decomposition by route family, shell, or feature slice | 4.0 | 9.6 | Isolation is strong, which is the main appeal of this option. |

## Route continuity and deep-link stability

- Priority: `HARD_REQUIREMENT`
- Weight: `10`
- Rationale: Refresh, deep link, back/return, and notification open must preserve the same owned shell and object context where the corpus requires it.

| Alternative | Raw Score | Weighted Contribution | Reason |
| --- | --- | --- | --- |
| Shared TypeScript/React web platform with two deployables | 4.5 | 9.0 | One shared route runtime can preserve same-object continuity across both deployables without route-family seams inside a page. |
| One single mega web application containing all shell families and audiences | 4.0 | 8.0 | A single runtime can preserve route history well, which is its strongest point. |
| Micro-frontend decomposition by route family, shell, or feature slice | 2.0 | 4.0 | Deep-link restore, browser back, and support-region focus return are hardest when route ownership crosses runtime seams. |

## Auth/session integration fit

- Priority: `HARD_REQUIREMENT`
- Weight: `8`
- Rationale: Browser handoff, step-up, and session posture must map cleanly to the chosen deployable split.

| Alternative | Raw Score | Weighted Contribution | Reason |
| --- | --- | --- | --- |
| Shared TypeScript/React web platform with two deployables | 4.5 | 7.2 | Separate deployables let portal and internal sessions enforce different browser posture while still using the same IdP and handoff contracts. |
| One single mega web application containing all shell families and audiences | 3.0 | 4.8 | One mega app has to juggle materially different audience/session postures inside one runtime envelope. |
| Micro-frontend decomposition by route family, shell, or feature slice | 2.75 | 4.4 | Browser handoff and session transitions become more complex when many runtimes can own the same user journey. |

## Customer-safe separation

- Priority: `HARD_REQUIREMENT`
- Weight: `12`
- Rationale: Portal surfaces must remain physically and semantically isolated from staff-only semantics and hidden internal context.

| Alternative | Raw Score | Weighted Contribution | Reason |
| --- | --- | --- | --- |
| Shared TypeScript/React web platform with two deployables | 4.75 | 11.4 | This is the cleanest way to keep portal copy, selectors, and bundles customer-safe by default. |
| One single mega web application containing all shell families and audiences | 2.25 | 5.4 | Customer-safe separation depends too heavily on runtime branching and discipline rather than build-level isolation. |
| Micro-frontend decomposition by route family, shell, or feature slice | 3.5 | 8.4 | Portal can be isolated, but the cost is more cross-app contract stitching for shared customer-request flows. |

## Performance and bundle isolation

- Priority: `STRONG_PREFERENCE`
- Weight: `9`
- Rationale: The browser topology should allow route-level code splitting and avoid shipping internal operator/governance code to portal users.

| Alternative | Raw Score | Weighted Contribution | Reason |
| --- | --- | --- | --- |
| Shared TypeScript/React web platform with two deployables | 4.5 | 8.1 | Each audience ships only the shell families it needs, with route-level splitting inside each deployable. |
| One single mega web application containing all shell families and audiences | 2.5 | 4.5 | Portal users are more exposed to unnecessary internal code and styling churn even with code splitting. |
| Micro-frontend decomposition by route family, shell, or feature slice | 3.75 | 6.75 | Bundle isolation can be good, though runtime orchestration overhead offsets some of that benefit. |

## Design-token and selector reuse

- Priority: `HARD_REQUIREMENT`
- Weight: `8`
- Rationale: Shared tokens, semantic selectors, and interaction-layer bindings need one platform spine so later implementation does not drift.

| Alternative | Raw Score | Weighted Contribution | Reason |
| --- | --- | --- | --- |
| Shared TypeScript/React web platform with two deployables | 4.5 | 7.2 | Shared token and selector packages keep browser implementation consistent without forcing identical visual grammar. |
| One single mega web application containing all shell families and audiences | 4.0 | 6.4 | One app does make shared tokens and selectors easy to centralize. |
| Micro-frontend decomposition by route family, shell, or feature slice | 2.25 | 3.6 | Selector grammar and token discipline are the first things to drift in a micro-frontend layout. |

## Testability with Playwright

- Priority: `HARD_REQUIREMENT`
- Weight: `7`
- Rationale: The topology should encourage semantic locators, deterministic shells, and stable browser automation contracts.

| Alternative | Raw Score | Weighted Contribution | Reason |
| --- | --- | --- | --- |
| Shared TypeScript/React web platform with two deployables | 4.5 | 6.3 | Two deployables plus one selector grammar keeps tests deterministic and clear about audience boundaries. |
| One single mega web application containing all shell families and audiences | 3.5 | 4.9 | Tests stay in one runtime, but audience-specific regressions become more coupled and noisy. |
| Micro-frontend decomposition by route family, shell, or feature slice | 2.5 | 3.5 | End-to-end tests become more brittle once shell continuity crosses multiple independently mounted runtimes. |

## Evolvability for later phase-05 implementation tasks

- Priority: `STRONG_PREFERENCE`
- Weight: `5`
- Rationale: The chosen topology must give later web implementation tasks stable package seams, deployable seams, and testing seams.

| Alternative | Raw Score | Weighted Contribution | Reason |
| --- | --- | --- | --- |
| Shared TypeScript/React web platform with two deployables | 4.5 | 4.5 | Later teams get clean app/package seams and can implement shells without re-deriving deployable doctrine. |
| One single mega web application containing all shell families and audiences | 3.25 | 3.25 | Later teams get a simpler repo picture, but fewer safe boundaries for independent implementation and rollout. |
| Micro-frontend decomposition by route family, shell, or feature slice | 2.5 | 2.5 | Ownership looks flexible, but later implementation has to solve shell drift and continuity tax repeatedly. |

## Operational simplicity and blast-radius control

- Priority: `TRADEOFF`
- Weight: `5`
- Rationale: The deployable split should stay operationally coherent while still limiting blast radius between internal and portal surfaces.

| Alternative | Raw Score | Weighted Contribution | Reason |
| --- | --- | --- | --- |
| Shared TypeScript/React web platform with two deployables | 4.0 | 4.0 | Two deployables add some operational work, but the blast-radius and bundle safety payoff is high. |
| One single mega web application containing all shell families and audiences | 4.25 | 4.25 | Operationally simple on paper because there is only one browser deployable. |
| Micro-frontend decomposition by route family, shell, or feature slice | 2.25 | 2.25 | Many deployables and seams increase operational overhead significantly. |

## Why The Runner-Up Options Lost

- `One single mega web application containing all shell families and audiences` lost because weakens portal isolation and makes bundle/code leakage harder to control.
- `Micro-frontend decomposition by route family, shell, or feature slice` lost because shell continuity, selector grammar, and focus restoration become materially harder to keep exact across seams.
