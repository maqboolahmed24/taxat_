# ADR-007: Native macOS Delivery Strategy

- Status: Accepted
- Date: 2026-04-18
- Deciders: Phase 00 architecture analysis pack

## Context

Taxat already carries a strong native direction in the source corpus: the macOS workspace is described as a signed, notarized, server-authoritative desktop embodiment, not a browser wrapper. What was still missing was one central ADR that chose the delivery shape, scoped the native product, fixed the SwiftUI versus AppKit split, summarized FE-25 and FE-75 cache legality, and bound browser-owned auth or authority handoffs back to concrete native scene law.

The prior phase-00 outputs already resolved the surrounding constraints: ADR-003 fixed system-browser auth plus Keychain-backed native session posture, ADR-005 fixed server-authored projection doctrine, ADR-006 fixed the browser topology and confirmed `client-portal-web` stays a separate browser deployable, and the earlier native atlas normalized `7` governed native scene or boundary records. ADR-007 closes the remaining gap by selecting how Taxat actually ships the macOS product.

## Decision

Adopt a **signed and notarized Xcode-native internal macOS operator workspace**:

- `InternalOperatorWorkspace.xcworkspace` is the native delivery unit.
- `Apps/InternalOperatorWorkspaceMac` is the shipping app target.
- SwiftUI owns shell composition, most scene layout, settings, keyboard-first command surfaces, and accessibility-rich interface semantics.
- AppKit is used selectively for evidence tables, provenance explorers, diff viewers, and other dense surfaces only where profiling shows SwiftUI is not the right tool.
- Product sign-in, step-up, and browser-owned authority checkpoints stay system-browser-managed through `ASWebAuthenticationSession` or the default browser.
- Keychain stores only product-session artifacts; structured local persistence remains tenant-bound, disposable, redaction-safe, and fail-closed under FE-25 and FE-75 invalidation.
- Native delivery scope is the internal operator workspace. The client portal remains browser-only, and browser-owned auth/help/authority checkpoints remain browser-owned even when launched from native scenes.

## Decision Drivers

| Driver | Priority | Weight | Why It Matters |
| --- | --- | --- | --- |
| Shell-law fidelity across native embodiment | HARD_REQUIREMENT | 14 | Native delivery must preserve the same object, shell, support-region, and recovery law instead of inventing a fourth desktop-only shell. |
| Server-authoritative legality | HARD_REQUIREMENT | 12 | The desktop app must remain a projection-and-command client rather than a second compliance engine. |
| Performance for large tables, diffs, and investigations | HARD_REQUIREMENT | 11 | Native delivery is only worth the cost if it materially outperforms the browser on high-density operator work. |
| Auth/session safety and system-browser handoff quality | HARD_REQUIREMENT | 11 | Native sign-in and step-up must use system-browser-managed flows with safe return-target continuity and no raw authority credentials on device. |
| Cache isolation and invalidation integrity | HARD_REQUIREMENT | 10 | Native speed is lawful only when FE-25 and FE-75 boundaries are explicit, exact, and fail closed on drift. |
| Scene/window coherence and restoration behavior | HARD_REQUIREMENT | 10 | Primary scenes, detached support windows, and restoration rules must stay concrete enough that later native work does not drift. |
| Native ergonomics and OS integration | HARD_REQUIREMENT | 10 | A macOS product should use menu commands, keyboard-first flows, Quick Look, state restoration, and multi-window deep work instead of mimicking browser habits. |
| Release, signing, notarization, and compatibility operability | STRONG_PREFERENCE | 8 | Native delivery needs a sane operational model for signing, hardened runtime, kill switches, compatibility windows, and browser fallback. |
| Implementation velocity and long-term maintainability | TRADEOFF | 7 | The chosen strategy must be implementable by a native team without locking the product into a permanently costly abstraction mistake. |
| Testing strategy fit across native and browser-owned handoffs | HARD_REQUIREMENT | 7 | The architecture must pair XCUITest and native preview coverage with Playwright over browser-owned handoff surfaces. |

## Native Scope And Scene Topology

| Scene | Kind | Role | Shell Family |
| --- | --- | --- | --- |
| native_primary_manifest_scene | PRIMARY_WORKSPACE | Daily manifest decision workspace | CALM_SHELL |
| native_primary_work_item_scene | PRIMARY_WORKSPACE | Daily collaboration and work-item workspace | CALM_SHELL |
| native_secondary_compare_window | SECONDARY_SUPPORT_WINDOW | Detached comparison and drift investigation | CALM_SHELL |
| native_secondary_audit_window | SECONDARY_SUPPORT_WINDOW | Detached audit and provenance investigation | CALM_SHELL |
| native_secondary_filing_packet_window | SECONDARY_SUPPORT_WINDOW | Filing-packet review, preview, and export surface | CALM_SHELL |
| native_secondary_authority_review_window | SECONDARY_SUPPORT_WINDOW | Authority review and reconciliation support surface | CALM_SHELL |
| native_settings_and_utility_scene | UTILITY_SUPPORT_SCENE | Settings, diagnostics, and compatibility utility flow | NO_NEW_LEGAL_SHELL |

The ADR chooses one primary native product for **internal operators**, not a universal desktop wrapper for every audience. Two primary calm-shell scenes handle manifest and work-item daily work; detached support windows handle compare, audit, filing-packet, and authority review depth; settings remain utility support rather than a new legal shell. Browser-owned auth or authority checkpoints return to the same object and focus anchor, but they do not themselves become native scenes.

## Shell Coverage Across Embodiments

| Shell Family | Coverage | Native Surfaces | Rule |
| --- | --- | --- | --- |
| CALM_SHELL | PRIMARY_NATIVE_EMBODIMENT | native_primary_manifest_scene, native_primary_work_item_scene, all detached support windows | Native scenes preserve same-object and same-shell continuity rather than introducing a desktop-only legal shell. |
| GOVERNANCE_DENSITY_SHELL | SELECTIVE_NATIVE_INVESTIGATION_AND_DENSE_REVIEW | audit and provenance investigation windows, authority review support surfaces | Governance density obligations carry into native dense review surfaces, but the ADR does not choose full browser-console parity as a day-zero native requirement. |
| CLIENT_PORTAL_SHELL | BROWSER_ONLY_RETAINED | browser retained | Portal remains browser-delivered; the native macOS product is the internal operator workspace, not a universal desktop wrapper for every audience. |

The calm shell is the primary native embodiment. Governance density rules carry into dense audit or authority review surfaces as needed, but ADR-007 does not claim full browser-console parity on day zero. The client portal stays browser-delivered.

## SwiftUI Versus AppKit Split

- SwiftUI stays the default for shell composition, inspectors, settings, forms, commands, and accessibility semantics.
- AppKit is reserved for virtualized tables, attributed diff viewers, complex outline views, and print or export fidelity where profiling justifies the bridge.
- AppKit bridges remain inside SwiftUI-managed scene law. They do not create a second navigation model, a second action strip, or a second shell identity.
- The burden of proof is explicit: if profiling does not justify an AppKit bridge, the feature stays in SwiftUI.

## Cache, Session, And Security Boundary

| Boundary | Allowed Storage | Forbidden Storage |
| --- | --- | --- |
| Interactive native human session boundary | Keychain-backed product-session artifacts, resume metadata, redaction-safe local preferences | raw authority credentials on device, embedded webview-owned primary sign-in state |
| Structured projection and receipt cache boundary | DecisionBundle, ExperienceDelta, WorkspaceSnapshot, WorkspaceDelta, ApiCommandReceipt history, resume metadata, pinned evidence, compare selections, recent lists | unsent filing legality decisions, client-generated workflow conclusions, pre-acceptance mutation state without durable receipt |
| Scene restoration and resume lineage boundary | scene restoration payloads, NSUserActivity, focus restoration outcome, cross_device_continuity_contract | restoration under invalid tenant, masking, or session lineage, reopening stale objects after access or compatibility drift |
| Regulated previews, exports, and local index boundary | preview caches, temporary exports, Quick Look staging, redaction-safe local search indices | broader preview reuse across subject drift, masked or revoked material left in temp storage |
| System-browser handoff return boundary | return target, focused object anchor, focus restoration anchor | local completion inference from browser return alone, scope widening from deep-link or handoff context alone |
| Authority token and secret boundary | vault-held authority token lineage, vault-held IdP client secrets or private keys | raw authority access or refresh tokens in Keychain, cache, queues, or read models, mixed storage of IdP admin material with general application persistence |
| Disconnected and cache-only fail-closed boundary | local drafts, compare selections, read-only compatible projections | blind queued filing sends, blind queued approval or authority mutations |

The combined FE-25 and FE-75 rule is strict:

- native caches may reuse compatible state for speed
- native caches may not outrun tenant, session lineage, access binding, masking posture, object identity, or compatibility-window legality
- cache-only restoration may reopen compatible read state, but mutation-capable or filing-capable posture stays blocked until a fresh snapshot or rebase re-establishes legality
- raw authority credentials, IdP secret material, and blind disconnected sends remain outside the device boundary entirely

## Rollout Strategy

| Sequence | Rollout Class | Objective |
| --- | --- | --- |
| Contract freeze and capability negotiation | FOUNDATION_ONLY | Freeze northbound snapshot, stream, receipt, cache-envelope, and compatibility-window contracts before native state restoration ships. |
| Read-only native shell | INTERNAL_DOGFOOD | Ship a signed internal macOS app that authenticates, hydrates snapshots, streams live state, and renders the calm shell plus investigation windows. |
| Command-capable native workflows | GUARDED_INTERNAL_DEFAULT | Add safe native command paths for review, override initiation, packet preparation, assignment, and collaboration actions that already exist northbound. |
| AppKit acceleration surfaces | PERFORMANCE_TARGETED | Promote the heaviest diff, audit, provenance, and table surfaces onto AppKit-backed components only where profiling justifies the bridge. |
| Workflow consolidation | PRIMARY_OPERATOR_TOOL | Retire browser-only operator dependencies where native is mature, while retaining browser ownership only for low-risk fallback or browser-owned auth/help surfaces. |

This yields a pragmatic progression: contract freeze first, then read-only native shell, then command-capable workflows, then AppKit acceleration where measurement justifies it, and only then consolidation away from browser-only operator dependencies.

## Browser-Owned Handoffs And Testing

- Browser-owned surfaces remain explicit: system-browser sign-in, step-up, authority checkpoints, and low-risk help/documentation.
- Native verification uses SwiftUI preview contracts, XCUITest scene flows, and persistence-fixture coverage for FE-75.
- Playwright still owns browser handoff verification and must prove return-to-object, return-to-focus, and “return does not imply settlement” behavior.
- Accessibility and reduced-motion semantics remain aligned with the shared interaction-layer and semantic-contract outputs rather than diverging into native-only identifiers.

## Alternatives Considered

    | Rank | Alternative | Weighted Score |
| --- | --- | --- |
| 1 | Signed/notarized Xcode-native macOS client with SwiftUI-first delivery and targeted AppKit acceleration | 93.0 |
| 2 | Electron, Tauri, or browser-wrapper desktop delivery | 53.25 |
| 3 | Browser-only delivery with no first-class native desktop product | 50.85 |

The winning option is **Signed/notarized Xcode-native macOS client with SwiftUI-first delivery and targeted AppKit acceleration** with a weighted score of `93.0`.

## Why This Option Wins

- It is the only option that fully matches the corpus posture of a signed, notarized, server-authoritative desktop workspace.
- It gives native real product value: menu commands, keyboard-first flows, scene restoration, Quick Look, detached compare windows, and better density handling than the browser.
- It keeps system-browser auth, Keychain session storage, and vault-only authority credentials exact rather than approximate.
- It avoids the browser-wrapper trap, where a desktop package exists but the product still behaves like a re-skinned browser tab.
- It gives later native teams exact scene, cache, session, and testing doctrine before implementation begins.

## Guardrails On The Decision

- Native delivery SHALL remain an embodiment of governed shell law, not a fourth legal shell.
- Client-local state SHALL remain disposable and rebuildable from platform truth.
- System-browser or platform-auth-session ownership SHALL remain the authority for sign-in and step-up.
- Detached support windows SHALL remain support-only and SHALL NOT publish a second authoritative action strip for the same object.
- Offline posture SHALL fail closed for filing-capable, approval-capable, or authority-mutating actions.
- AppKit SHALL be introduced only where density or performance evidence justifies it.
- Client portal surfaces SHALL remain browser-delivered under ADR-007.

## Consequences

Positive consequences:

- Native implementation gets a clear target: an internal operator workspace with explicit scene law, cache law, and rollout law.
- Security posture is sharper because the ADR fixes system-browser auth, Keychain-only product-session storage, and vault-only raw authority secrets.
- High-density operator workflows finally have a lawful path beyond browser constraints.

Negative consequences and tradeoffs:

- Native delivery requires real Xcode workspace ownership, signing, notarization, and compatibility governance.
- Browser and native teams must coordinate on handoff, return, and stale-view parity instead of treating those as implementation-local concerns.
- AppKit bridge discipline must stay tight so performance work does not fracture shell or accessibility law.

## Rollback Posture

- Browser internal surfaces remain the fallback path while native rollout advances through the declared sequences.
- Native kill switches and capability negotiation can disable scene families or command-capable flows without invalidating the broader operator product.
- If signing, compatibility, or FE-75 restoration posture becomes unsafe, the product falls back to browser internal surfaces rather than attempting permissive degraded native behavior.

## Deferred Decisions

- Exact persistence implementation choice inside `OperatorPersistence` such as SQLite wrapper versus Core Data.
- Exact update-distribution mechanism such as MDM-only, direct signed distribution, or Sparkle-like updater.
- Exact entitlement and sandbox posture details once export, Quick Look, and diagnostics integrations are finalized.
- Exact scope and timing for promoting more governance-density workflows into native scenes.
- Exact browser fallback retirement date once sequence-4 consolidation proves stable in production.

## References

- Scene and window topology: [native_scene_and_window_topology.json](/Users/test/Code/taxat_/data/analysis/native_scene_and_window_topology.json)
- Platform translation map: [native_platform_translation_map.json](/Users/test/Code/taxat_/data/analysis/native_platform_translation_map.json)
- Cache, session, and security boundary: [native_cache_session_and_security_boundary.json](/Users/test/Code/taxat_/data/analysis/native_cache_session_and_security_boundary.json)
- Rollout sequence: [native_feature_rollout_sequence.json](/Users/test/Code/taxat_/data/analysis/native_feature_rollout_sequence.json)
- Handoff and test strategy: [native_handoff_and_test_strategy.json](/Users/test/Code/taxat_/data/analysis/native_handoff_and_test_strategy.json)
- Native scene atlas: [native_operator_scene_atlas.md](/Users/test/Code/taxat_/docs/analysis/native_operator_scene_atlas.md)
- Scorecard: [ADR-007-native-macos-delivery-strategy-scorecard.json](/Users/test/Code/taxat_/docs/architecture/adr/ADR-007-native-macos-delivery-strategy-scorecard.json)
- Comparison notes: [ADR-007-native-macos-delivery-strategy-comparison.md](/Users/test/Code/taxat_/docs/architecture/adr/ADR-007-native-macos-delivery-strategy-comparison.md)
- Diagram: [ADR-007-native-macos-delivery-strategy.mmd](/Users/test/Code/taxat_/diagrams/analysis/ADR-007-native-macos-delivery-strategy.mmd)
