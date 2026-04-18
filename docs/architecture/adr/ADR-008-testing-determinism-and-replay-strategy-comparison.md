# ADR-008 Comparison

## Weighted Criteria

| Criterion | Weight | Priority | Rationale |
| --- | --- | --- | --- |
| Determinism and replay fidelity | 16 | HARD_REQUIREMENT | The winning doctrine must preserve exact-decimal outputs, stable basis hashes, deterministic outcome hashes, and explicit replay verdicts instead of tolerating broad pass/fail ambiguity. |
| Coverage across engine, API, browser, native, and authority edges | 14 | HARD_REQUIREMENT | Coverage must stay balanced so deterministic engine confidence does not hide browser, native, or authority regressions, and rich UI coverage does not hide core-state blind spots. |
| Candidate-bound evidence quality | 13 | HARD_REQUIREMENT | Promotion evidence must bind to one canonical candidate tuple, one compatibility boundary, and the exact suite artifacts or coverage contracts that actually proved the release safe. |
| Flake resistance and quarantine manageability | 10 | HARD_REQUIREMENT | The test strategy must keep blocking suites deterministic by default, permit only tightly-scoped reruns, and keep quarantine or waiver posture out of green promotion evidence. |
| Cost and runtime of the suite portfolio | 8 | TRADEOFF | The portfolio must be expensive in the right places only, with deterministic fast lanes below slower browser, native, and restore suites. |
| Local developer ergonomics | 7 | STRONG_PREFERENCE | Fast deterministic fixtures, stable seeds, and predictable acceptance harnesses need to be runnable in development without forcing full end-to-end sandboxes for every change. |
| Failure diagnosability | 10 | HARD_REQUIREMENT | When a suite fails, the evidence model must tell the team what drifted, where, which candidate was involved, and whether the failure was product, environment, or admissibility noise. |
| Coverage of recovery, restore, and migration risks | 9 | HARD_REQUIREMENT | Testing cannot stop at green request flows; it must cover stale reclaim, restore privacy reconciliation, queue loss, broker loss, and compatibility-window safety during release and rollback decisions. |
| Accessibility and shell-continuity coverage | 7 | HARD_REQUIREMENT | Browser and native acceptance are not complete unless keyboard paths, reduced motion, semantic anchors, same-object continuity, and focus return remain contractually stable. |
| Ability to scale with later roadmap tasks | 6 | STRONG_PREFERENCE | The doctrine should give later release, migration, QA, surface, and platform tasks a stable vocabulary of suite families, artifacts, and boundaries rather than forcing each task to invent its own harness taxonomy. |

## Alternative Totals

| Alternative | Weighted Total | Strength Count | Risk Count | Summary |
| --- | --- | --- | --- | --- |
| Layered, contract-first, candidate-bound portfolio | 92.25 | 3 | 2 | Use validators and deterministic fixture packs as the foundation, then add model-based, API, browser, native, authority-sandbox, replay or restore, security, and canary layers, all bound to release-candidate evidence artifacts. |
| Narrow unit-heavy or property-heavy strategy with limited acceptance coverage | 63.45 | 2 | 2 | Invest heavily in deterministic unit, formula, and model-based suites, while keeping API, browser, native, authority, and restore coverage intentionally light. |
| End-to-end-heavy browser or system-level strategy | 49.5 | 2 | 2 | Lean primarily on browser, native, or full-system sandboxes, using broad scenario tests as the main confidence signal and keeping unit or contract suites comparatively thin. |

## Layered, contract-first, candidate-bound portfolio

- Weighted total: `92.25`
- Summary: Use validators and deterministic fixture packs as the foundation, then add model-based, API, browser, native, authority-sandbox, replay or restore, security, and canary layers, all bound to release-candidate evidence artifacts.
- Strengths: Matches the corpus's explicit test-family law and release admissibility boundary., Keeps fast deterministic suites below slower UI and resilience suites., Produces machine-readable evidence that promotion and replay can reuse later.
- Risks: Largest initial implementation surface because multiple harness families must exist together., Requires disciplined fixture maintenance to keep golden packs and replay packs trustworthy.

| Criterion | Weight | Raw | Weighted | Why |
| --- | --- | --- | --- | --- |
| Determinism and replay fidelity | 16 | 4.75 | 15.2 | Frozen basis law, deterministic golden packs, replay attestations, and restore evidence all fit one doctrine cleanly. |
| Coverage across engine, API, browser, native, and authority edges | 14 | 4.75 | 13.3 | Every mandated family has an explicit home, so browser, native, and authority edges cannot silently disappear. |
| Candidate-bound evidence quality | 13 | 4.75 | 12.35 | The strategy is built around candidate hashes, compatibility hashes, and first-class gate artifacts rather than dashboard snapshots. |
| Flake resistance and quarantine manageability | 10 | 4.5 | 9.0 | Fast deterministic suites catch most drift before slower harnesses run, and blocking green posture remains unquarantined by design. |
| Cost and runtime of the suite portfolio | 8 | 3.75 | 6.0 | It is not the cheapest portfolio, but layered sequencing contains cost better than making every question an end-to-end run. |
| Local developer ergonomics | 7 | 4.5 | 6.3 | Most changes can be validated in seed-backed deterministic packs before reaching sandboxes, browser, or native devices. |
| Failure diagnosability | 10 | 4.75 | 9.5 | Each family emits typed artifacts, making candidate drift, admissibility failures, and product regressions easier to distinguish. |
| Coverage of recovery, restore, and migration risks | 9 | 4.75 | 8.55 | Replay, restore, migration, queue rebuild, and fail-forward concerns are first-class, not incidental afterthoughts. |
| Accessibility and shell-continuity coverage | 7 | 4.75 | 6.65 | Browser and native UI coverage is explicit and anchored to semantic, continuity, focus, and reduced-motion contracts. |
| Ability to scale with later roadmap tasks | 6 | 4.5 | 5.4 | Later QA, platform, migration, and release tasks can extend named families without redefining the test vocabulary. |
## Narrow unit-heavy or property-heavy strategy with limited acceptance coverage

- Weighted total: `63.45`
- Summary: Invest heavily in deterministic unit, formula, and model-based suites, while keeping API, browser, native, authority, and restore coverage intentionally light.
- Strengths: Fastest local loop and strongest raw determinism on compute-heavy paths., Lower infrastructure burden because fewer sandboxes and client harnesses are required.
- Risks: Cannot prove browser, native, authority, or restore posture to the standard the corpus requires., Leaves candidate-bound promotion evidence too dependent on inferred coverage rather than explicit acceptance artifacts.

| Criterion | Weight | Raw | Weighted | Why |
| --- | --- | --- | --- | --- |
| Determinism and replay fidelity | 16 | 4.5 | 14.4 | This option is strong on deterministic cores and property exploration for formulas, hashes, and state transitions. |
| Coverage across engine, API, browser, native, and authority edges | 14 | 2.0 | 5.6 | It under-serves browser, native, authority, and restore obligations that the corpus marks as mandatory. |
| Candidate-bound evidence quality | 13 | 2.25 | 5.85 | Unit evidence alone cannot satisfy promotion needs for authority breadth, client compatibility, or restore drills. |
| Flake resistance and quarantine manageability | 10 | 3.5 | 7.0 | Fast deterministic suites are reliable, but the option dodges rather than solves flake pressure in later acceptance layers. |
| Cost and runtime of the suite portfolio | 8 | 4.0 | 6.4 | The cheapest and fastest option because it intentionally keeps expensive acceptance and resilience layers thin. |
| Local developer ergonomics | 7 | 4.5 | 6.3 | Developers get the fastest local loop of the three alternatives. |
| Failure diagnosability | 10 | 4.0 | 8.0 | Core failures are well isolated, though cross-surface and cross-edge regressions are less visible. |
| Coverage of recovery, restore, and migration risks | 9 | 2.0 | 3.6 | Restore, replay, no-blind-resend, and client-window drift are too system-shaped to leave lightly tested. |
| Accessibility and shell-continuity coverage | 7 | 1.5 | 2.1 | Accessibility, focus, continuity, and native restore guarantees cannot be proven sufficiently with mostly unit or property suites. |
| Ability to scale with later roadmap tasks | 6 | 3.5 | 4.2 | The core harnesses scale, but later product and platform tracks would need to bolt on missing acceptance doctrine anyway. |
## End-to-end-heavy browser or system-level strategy

- Weighted total: `49.5`
- Summary: Lean primarily on browser, native, or full-system sandboxes, using broad scenario tests as the main confidence signal and keeping unit or contract suites comparatively thin.
- Strengths: Feels intuitive because it exercises wide slices of the system at once., Can expose some integration mismatches that narrower unit tests would miss.
- Risks: High flake pressure, slow feedback, and weak replayability when a run spans many mutable services., Poor fit for exact candidate-bound evidence because root-cause isolation is weaker and reruns are noisier.

| Criterion | Weight | Raw | Weighted | Why |
| --- | --- | --- | --- | --- |
| Determinism and replay fidelity | 16 | 2.25 | 7.2 | Wide system tests are the least stable place to assert byte-identical basis hashes or replay classifications. |
| Coverage across engine, API, browser, native, and authority edges | 14 | 3.75 | 10.5 | Broad flows can touch many edges, but they still blur where browser, native, or authority obligations actually live. |
| Candidate-bound evidence quality | 13 | 2.0 | 5.2 | A green scenario run is weaker promotion evidence than explicit suite-family artifacts with canonical hashes and scope. |
| Flake resistance and quarantine manageability | 10 | 1.75 | 3.5 | This is the noisiest option and would tempt quarantine-heavy release behavior the source law forbids. |
| Cost and runtime of the suite portfolio | 8 | 1.75 | 2.8 | Making wide sandboxes the main safety net is expensive and slow. |
| Local developer ergonomics | 7 | 2.25 | 3.15 | Routine development becomes dependent on running large environments or waiting on shared sandboxes. |
| Failure diagnosability | 10 | 2.5 | 5.0 | When a broad journey fails, isolating product drift from environment noise or stale fixtures is harder. |
| Coverage of recovery, restore, and migration risks | 9 | 2.75 | 4.95 | Some resilience cases can be exercised, but exact replay, reader-window, and restore evidence remain awkward to prove. |
| Accessibility and shell-continuity coverage | 7 | 3.0 | 4.2 | UI journeys can cover continuity, but without dedicated semantic packs they tend to under-specify accessibility invariants. |
| Ability to scale with later roadmap tasks | 6 | 2.5 | 3.0 | The portfolio scales poorly because each new capability tends to add more wide scenarios instead of reusable family doctrine. |
