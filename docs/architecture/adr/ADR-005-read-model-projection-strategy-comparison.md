# ADR-005 Comparison Notes

This comparison expands the weighted scorecard that supports ADR-005.

## Ranking

| Rank | Alternative | Weighted Score | Leading Strengths |
| --- | --- | --- | --- |
| 1 | Server-authored per-surface typed read models and deltas | 92.35 | Best fit for the corpus's named route-level projections such as calm-shell frames, collaboration snapshots/deltas, portal workspaces, and governance snapshots., Preserves customer-safe boundaries and stale/recovery posture as server-authored contracts instead of client heuristics. |
| 2 | Thin backend plus client-composed view models from granular APIs | 59.25 | Looks simpler initially because fewer dedicated server projections need to be maintained., Can reduce some duplicated server read-side code for small or highly local screens. |
| 3 | Large unified graph or mega-workspace model with client-heavy selection and composition | 45.35 | Promises fewer explicit route-specific envelopes and can simplify some bulk-fetch patterns., May look attractive for exploratory consoles that need broad graph traversal. |

## Criteria and Weights

| Criterion | Priority | Weight | Source Grounding |
| --- | --- | --- | --- |
| Legal truth separation | HARD_REQUIREMENT | 16 | Algorithm/authority_truth_and_internal_projection_separation_contract.md::L3[Purpose], Algorithm/authority_truth_and_internal_projection_separation_contract.md::L13[Governing_Model], Algorithm/authority_truth_and_internal_projection_separation_contract.md::L55[Required_Outcomes], Algorithm/authority_truth_and_internal_projection_separation_contract.md::L69[Surface_Rules] |
| Staff versus customer-safe visibility control | HARD_REQUIREMENT | 12 | Algorithm/customer_client_portal_experience_contract.md::L479[Read-model_and_API_translation_requirements], Algorithm/collaboration_workspace_contract.md::L971[7.3_Read_models], Algorithm/frontend_shell_and_interaction_law.md::L459[6._Empty_loading_and_partial-visibility_rules] |
| Same-object and same-shell continuity | HARD_REQUIREMENT | 10 | Algorithm/frontend_shell_and_interaction_law.md::L19[1._Shell_families_and_object_ownership], Algorithm/frontend_shell_and_interaction_law.md::L56[2.2_Stable_route_keys], Algorithm/customer_client_portal_experience_contract.md::L479[Read-model_and_API_translation_requirements], Algorithm/collaboration_workspace_contract.md::L1953[12._Playwright_scenarios] |
| Browser/native parity without duplicate business logic | HARD_REQUIREMENT | 10 | Algorithm/cross_shell_design_token_and_interaction_layer_foundation_contract.md::L50[Required_family_mappings], Algorithm/macos_native_operator_workspace_blueprint.md::L15[1._Architectural_thesis], Algorithm/macos_native_operator_workspace_blueprint.md::L134[4._Platform_translation_map], Algorithm/macos_native_operator_workspace_blueprint.md::L294[6._Data_flow_and_synchronization_model] |
| Stream delta and reconnect fitness | HARD_REQUIREMENT | 10 | Algorithm/northbound_api_and_session_contract.md::L646[7._Stream_and_reconnect_rules], Algorithm/collaboration_workspace_contract.md::L1778[9._Stream_events_and_notifications], Algorithm/macos_native_operator_workspace_blueprint.md::L294[6._Data_flow_and_synchronization_model] |
| Stale-view protection and rebase clarity | HARD_REQUIREMENT | 10 | Algorithm/northbound_api_and_session_contract.md::L621[6._Concurrency_and_stale-view_rules], Algorithm/customer_client_portal_experience_contract.md::L479[Read-model_and_API_translation_requirements], Algorithm/admin_governance_console_architecture.md::L661[7._Frontend_systems_architecture], Algorithm/collaboration_workspace_contract.md::L1640[8._Command_and_read_API_additions] |
| Rebuildability from durable truth | HARD_REQUIREMENT | 9 | Algorithm/authority_truth_and_internal_projection_separation_contract.md::L55[Required_Outcomes], Algorithm/northbound_api_and_session_contract.md::L15[1._Core_principles], Algorithm/modules.md::L1128[BUILD_SNAPSHOT_...], Algorithm/modules.md::L1214[EXTRACT_AUTHORITY_VIEWS_...] |
| Schema evolution and reader-window safety | HARD_REQUIREMENT | 8 | Algorithm/customer_client_portal_experience_contract.md::L479[Read-model_and_API_translation_requirements], Algorithm/collaboration_workspace_contract.md::L971[7.3_Read_models], Algorithm/admin_governance_console_architecture.md::L724[7.6_Minimum_route_read_models], Algorithm/macos_native_operator_workspace_blueprint.md::L580[FE-75_Native_Cache_Hydration_Purge_and_Rebase] |
| Performance and cache invalidation complexity | TRADEOFF | 6 | Algorithm/admin_governance_console_architecture.md::L661[7._Frontend_systems_architecture], Algorithm/customer_client_portal_experience_contract.md::L753[FE-25_Cache_Isolation], Algorithm/macos_native_operator_workspace_blueprint.md::L576[FE-25_Cache_Isolation], Algorithm/northbound_api_and_session_contract.md::L646[7._Stream_and_reconnect_rules] |
| Testing determinism and fixture friendliness | STRONG_PREFERENCE | 5 | Algorithm/customer_client_portal_experience_contract.md::L701[Playwright_validation_minimum], Algorithm/collaboration_workspace_contract.md::L1953[12._Playwright_scenarios], Algorithm/admin_governance_console_architecture.md::L868[9._Validation_plan], Algorithm/frontend_shell_and_interaction_law.md::L644[10._Automation_anchors_and_UI_observability_fencing] |
| Operational simplicity and debuggability | TRADEOFF | 4 | Algorithm/northbound_api_and_session_contract.md::L15[1._Core_principles], Algorithm/admin_governance_console_architecture.md::L661[7._Frontend_systems_architecture], Algorithm/modules.md::L2630[BUILD_LIVE_EXPERIENCE_FRAME_...], Algorithm/modules.md::L2737[BUILD_CLIENT_PORTAL_WORKSPACE_...], Algorithm/modules.md::L2805[BUILD_TENANT_GOVERNANCE_SNAPSHOT_...] |

## Coverage Summary

- Read models covered: `45`
- Route or scene bindings covered: `31`
- Route-bound read models covered: `29`
- Customer-safe boundary rows covered: `10`
- Blocked customer-safe internal families: `10`
- Stream or refresh contracts covered: `7`
- Version/staleness surfaces covered: `30`

## Legal truth separation

- Priority: `HARD_REQUIREMENT`
- Weight: `16`
- Rationale: Projection architecture must preserve the separation between authority truth, internal workflow truth, and customer-safe mirrors so no client cache or UI fragment can become legal meaning.

| Alternative | Raw Score | Weighted Contribution | Reason |
| --- | --- | --- | --- |
| Server-authored per-surface typed read models and deltas | 4.75 | 15.2 | Best match for the truth-separation contract because projections stay disposable and subordinate to durable truth surfaces. |
| Thin backend plus client-composed view models from granular APIs | 2.75 | 8.8 | Truth separation can be preserved in principle, but route meaning is more likely to drift once clients compose posture from fragments. |
| Large unified graph or mega-workspace model with client-heavy selection and composition | 2.25 | 7.2 | A mega-model exposes too much adjacent state to the client and makes it easier to treat hidden graph context as user-facing truth. |

## Staff versus customer-safe visibility control

- Priority: `HARD_REQUIREMENT`
- Weight: `12`
- Rationale: The architecture must enforce customer-safe projection boundaries before serialization so portal and customer-visible collaboration routes cannot infer staff-only context.

| Alternative | Raw Score | Weighted Contribution | Reason |
| --- | --- | --- | --- |
| Server-authored per-surface typed read models and deltas | 4.75 | 11.4 | Customer-safe redaction happens at projection build time, before any browser or native serialization boundary. |
| Thin backend plus client-composed view models from granular APIs | 2.5 | 6.0 | Customer-safe boundaries become harder to enforce because clients must know which granular fields are forbidden to combine. |
| Large unified graph or mega-workspace model with client-heavy selection and composition | 2.0 | 4.8 | Customer-safe and staff-only lanes are hardest to police when one large payload contains broad mixed visibility state. |

## Same-object and same-shell continuity

- Priority: `HARD_REQUIREMENT`
- Weight: `10`
- Rationale: Rebase, reconnect, notification-open, and responsive collapse must preserve the same object and shell identity where the object still resolves.

| Alternative | Raw Score | Weighted Contribution | Reason |
| --- | --- | --- | --- |
| Server-authored per-surface typed read models and deltas | 4.75 | 9.5 | Route-level envelopes can carry the exact shell, focus, and recovery anchors needed to preserve same-object continuity. |
| Thin backend plus client-composed view models from granular APIs | 2.75 | 5.5 | Continuity can be approximated, but route and shell identity depend on each client recomposing equivalent anchors. |
| Large unified graph or mega-workspace model with client-heavy selection and composition | 2.0 | 4.0 | Shell and route ownership blur when the client can pivot locally through a broad graph without explicit route contracts. |

## Browser/native parity without duplicate business logic

- Priority: `HARD_REQUIREMENT`
- Weight: `10`
- Rationale: Web and native clients must share projection semantics and interaction-layer contracts rather than reimplementing business logic independently.

| Alternative | Raw Score | Weighted Contribution | Reason |
| --- | --- | --- | --- |
| Server-authored per-surface typed read models and deltas | 4.5 | 9.0 | Typed projections let web and native share the same business semantics while differing only in embodiment. |
| Thin backend plus client-composed view models from granular APIs | 2.75 | 5.5 | Web and native inevitably duplicate more composition and recovery logic when the server does less shaping. |
| Large unified graph or mega-workspace model with client-heavy selection and composition | 2.25 | 4.5 | Both clients still need substantial local selection and derivation logic, so parity remains fragile. |

## Stream delta and reconnect fitness

- Priority: `HARD_REQUIREMENT`
- Weight: `10`
- Rationale: The chosen projection strategy must fit monotonic deltas, resume tokens, duplicate idempotency, and typed catch-up rules.

| Alternative | Raw Score | Weighted Contribution | Reason |
| --- | --- | --- | --- |
| Server-authored per-surface typed read models and deltas | 4.75 | 9.5 | Monotonic deltas, explicit cursors, and rebase contracts align directly with the named northbound and collaboration stream rules. |
| Thin backend plus client-composed view models from granular APIs | 2.75 | 5.5 | Granular APIs can stream, but reconnect semantics become harder once the client owns composition of many moving pieces. |
| Large unified graph or mega-workspace model with client-heavy selection and composition | 3.25 | 6.5 | A large graph can support streams, but fine-grained invalidation and rebase semantics become much harder to type and explain. |

## Stale-view protection and rebase clarity

- Priority: `HARD_REQUIREMENT`
- Weight: `10`
- Rationale: Stale-view rejection, rebase, and recovery must remain explicit server-authored contracts so clients do not guess what changed.

| Alternative | Raw Score | Weighted Contribution | Reason |
| --- | --- | --- | --- |
| Server-authored per-surface typed read models and deltas | 4.75 | 9.5 | The server can publish guard families, latest values, and typed rebase posture instead of leaving clients to infer them. |
| Thin backend plus client-composed view models from granular APIs | 2.5 | 5.0 | Clients need to combine many stale bases and can more easily guess at rebase causes or route fallbacks. |
| Large unified graph or mega-workspace model with client-heavy selection and composition | 2.25 | 4.5 | Clients see broad state drift without clear route-level stale guard families, making rebase posture murkier. |

## Rebuildability from durable truth

- Priority: `HARD_REQUIREMENT`
- Weight: `9`
- Rationale: Streams, caches, and native hydrators must remain disposable and fully rebuildable from durable truth without hidden heuristics.

| Alternative | Raw Score | Weighted Contribution | Reason |
| --- | --- | --- | --- |
| Server-authored per-surface typed read models and deltas | 4.75 | 8.55 | All caches and deltas remain disposable because route projections are rebuilt from durable truth rather than acting as primary state. |
| Thin backend plus client-composed view models from granular APIs | 3.25 | 5.85 | Durable truth still exists, but recreating the exact client-composed state requires reproducing more hidden client rules. |
| Large unified graph or mega-workspace model with client-heavy selection and composition | 2.0 | 3.6 | The client-side graph often accumulates hidden composition rules that are difficult to replay or rebuild deterministically. |

## Schema evolution and reader-window safety

- Priority: `HARD_REQUIREMENT`
- Weight: `8`
- Rationale: Projection contracts need stable versioning and reader-window rules so web, native, and tests can survive additive change while failing closed on incompatible drift.

| Alternative | Raw Score | Weighted Contribution | Reason |
| --- | --- | --- | --- |
| Server-authored per-surface typed read models and deltas | 4.5 | 7.2 | Versioned route envelopes give web, native, and tests one stable reader window for additive change. |
| Thin backend plus client-composed view models from granular APIs | 3.0 | 4.8 | Granular APIs can evolve independently, but the overall reader window is harder to reason about because view-model meaning is emergent. |
| Large unified graph or mega-workspace model with client-heavy selection and composition | 2.25 | 3.6 | A single mega-envelope increases blast radius for schema drift and widens the reader window problem. |

## Performance and cache invalidation complexity

- Priority: `TRADEOFF`
- Weight: `6`
- Rationale: Projection design must keep cache invalidation explicit and affordable without pushing semantic composition or truth leakage to the clients.

| Alternative | Raw Score | Weighted Contribution | Reason |
| --- | --- | --- | --- |
| Server-authored per-surface typed read models and deltas | 4.0 | 4.8 | More server read models exist, but invalidation stays explicit and local to named surfaces rather than exploding client-side. |
| Thin backend plus client-composed view models from granular APIs | 4.25 | 5.1 | This option can reduce some server projection work and allow narrower fetches, which is its strongest tradeoff. |
| Large unified graph or mega-workspace model with client-heavy selection and composition | 2.75 | 3.3 | Broad payloads and cross-cutting invalidation can quickly become expensive and opaque. |

## Testing determinism and fixture friendliness

- Priority: `STRONG_PREFERENCE`
- Weight: `5`
- Rationale: Stable read-model envelopes and selectors make Playwright, API, and native tests deterministic and easier to fixture.

| Alternative | Raw Score | Weighted Contribution | Reason |
| --- | --- | --- | --- |
| Server-authored per-surface typed read models and deltas | 4.5 | 4.5 | Dedicated read models, stable selectors, and typed deltas are easier to fixture and regression-test consistently. |
| Thin backend plus client-composed view models from granular APIs | 4.0 | 4.0 | Unit tests can cover some client composition logic, but end-to-end determinism suffers once many fragments must align at runtime. |
| Large unified graph or mega-workspace model with client-heavy selection and composition | 1.75 | 1.75 | Tests have to stand up a large shape and still reproduce local selection logic reliably. |

## Operational simplicity and debuggability

- Priority: `TRADEOFF`
- Weight: `4`
- Rationale: The projection doctrine should be explainable in production incidents without hiding critical semantics inside client code or one giant graph query.

| Alternative | Raw Score | Weighted Contribution | Reason |
| --- | --- | --- | --- |
| Server-authored per-surface typed read models and deltas | 4.0 | 3.2 | Projection ownership is explicit per surface family, making incident analysis clearer than multi-client composition rules. |
| Thin backend plus client-composed view models from granular APIs | 4.0 | 3.2 | Short-term service topology is simpler, though runtime reasoning becomes split across multiple clients and caches. |
| Large unified graph or mega-workspace model with client-heavy selection and composition | 2.0 | 1.6 | The runtime can appear centralized, but debugging which graph fragment produced which user-facing posture becomes difficult. |

## Why The Runner-Up Options Lost

- `Thin backend plus client-composed view models from granular APIs` lost because pushes stale-view logic, visibility fencing, and route continuity semantics into browser and native code.
- `Large unified graph or mega-workspace model with client-heavy selection and composition` lost because blurs route ownership, visibility lanes, and customer-safe boundaries because the client sees too much at once.
