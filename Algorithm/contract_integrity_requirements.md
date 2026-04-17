# Contract Integrity Requirements

This document states standing integrity requirements for the Algorithm corpus. Each item names a prohibited ambiguity that the architecture SHALL close so implementations remain deterministic, replay-safe, and contract-complete.

## Foundation spine integrity

The shared blueprint spine SHALL remain canonical before any feature-family contract specializes it.

- The architecture SHALL close the following ambiguity: the foundation docs did not centralize the canonical shell-family, route-stability, settlement/recovery, and visibility-class vocabulary. This closes the risk that frontend, backend, portal, governance, and operator surfaces could begin from different object grammars.
- The architecture SHALL close the following ambiguity: `state_machines.md` referred to `ExperienceFrame` even though the canonical route-stable staff shell contract is `LowNoiseExperienceFrame`. This closes the risk that attention and recovery semantics could bind to a stale object family.
- The architecture SHALL close the following ambiguity: `workspace_version`, `view_guard_ref`, and `shell_stability_token` could be treated as local implementation detail instead of shared stale-view anchors. This closes the risk that portal, collaboration, browser, and native clients could diverge on rebase and reconnect semantics.
- The architecture SHALL close the following ambiguity: visibility class language was only implied across feature-specific contracts instead of named as shared-spine vocabulary. This closes the risk that customer-safe, internal-only, governance, and authority-facing projections could leak or silently widen across surfaces.
- The architecture SHALL close the following ambiguity: `AUDIT_FINDINGS.md` could drift away from `PATCH_RESOLUTION_INDEX.md` and the standing integrity corpus. This closes the risk that historical material defects could appear unresolved or unowned even after the contracts, validators, and guards are repaired.

## Manifest, lineage, and gate integrity

The manifest envelope, continuation lineage, and gate artifacts SHALL remain self-describing, deterministic, and replay-safe.

1. The architecture SHALL close the following ambiguity: `requested_scope` allowed `amendment_intent` / `amendment_submit` without `year_end`. This closes the risk that amendment flows could be instantiated against an invalid reporting basis.
2. The architecture SHALL close the following ambiguity: `submit` could appear without `prepare_submission`. This closes the risk that live filing could skip packet-preparation invariants and preflight checks.
3. The architecture SHALL close the following ambiguity: `mode = ANALYSIS` was not contractually barred from `prepare_submission`, `submit`, or amendment-transmit scopes. This closes the risk that counterfactual runs could be mistaken for live-ready runs.
4. The architecture SHALL close the following ambiguity: `replay_class` could be present on non-`REPLAY` manifests. This closes the risk that audit lineage and live execution semantics could blur.
5. The architecture SHALL close the following ambiguity: replay manifests were not forbidden from `submit` or `amendment_submit`. This closes the risk that a replay implementation could accidentally mutate an authority.
6. The architecture SHALL close the following ambiguity: `provider_environment_refs[]` had no conditional minimum size. This closes the risk that live or amendment-capable manifests could be frozen without the target environment.
7. The architecture SHALL close the following ambiguity: `config_inheritance_mode` existed only as prose. This closes the risk that child-manifest config lineage could drift silently across retries or replays.
8. The architecture SHALL close the following ambiguity: the model did not require the projection fields to mirror nested lineage values. This closes the risk that two incompatible ancestry views could exist for the same manifest.
9. The architecture SHALL close the following ambiguity: `gateDecision` had no `gate_decision_id`. This closes the risk that gate outcomes could not be safely deduplicated or audited.
10. The architecture SHALL close the following ambiguity: `gateDecision.manifest_id` was absent. This closes the risk that detached gate records could be replayed or misattributed across runs.
11. The architecture SHALL close the following ambiguity: `gate_code` accepted null. This closes the risk that downstream policy analytics could lose the exact blocking or review source.
12. The architecture SHALL close the following ambiguity: severity was optional in practice. This closes the risk that workflow prioritization and observability would degrade under partially populated gate records.
13. The architecture SHALL close the following ambiguity: override posture was not a required invariant. This closes the risk that a block could be impossible to distinguish from a review or pass-with-notice in downstream systems.
14. The architecture SHALL close the following ambiguity: `policy_version_ref` was not mandatory. This closes the risk that operators could not prove which frozen policy made the decision.
15. The architecture SHALL close the following ambiguity: `decided_at` was not required. This closes the risk that ordering, replayability, and incident reconstruction would become unreliable.
16. The architecture SHALL close the following ambiguity: `reason_codes[]` defaulted to empty. This closes the risk that hard blocks and manual review paths could be emitted without an explainable cause.
17. The architecture SHALL close the following ambiguity: `next_action_codes[]` stayed optional even for `MANUAL_REVIEW`, `OVERRIDABLE_BLOCK`, and `HARD_BLOCK`. This closes the risk that remediations would be non-deterministic and UI guidance incomplete.
18. The architecture SHALL close the following ambiguity: `HARD_BLOCK` allowed any overrideability value. This closes the risk that clients could surface illegal override affordances.
19. The architecture SHALL close the following ambiguity: `required_override_scope` was optional even when the decision required scoped override. This closes the risk that approval systems would not know what authority to request.

## Decision artifacts, evidence, and data-model integrity

Decision bundles, snapshots, facts, evidence, and conflict artifacts SHALL remain closed, attributable, and provenance-bearing.

20. The architecture SHALL close the following ambiguity: no `$id` was declared. This closes the risk that schema bundle resolution and validator caching could become ambiguous.
21. The architecture SHALL close the following ambiguity: `artifact_type` and `contract` were absent. This closes the risk that the artifact could not be verified against the frozen schema bundle.
22. The architecture SHALL close the following ambiguity: missing `additionalProperties: false`. This closes the risk that ungoverned fields could creep into a supposedly deterministic artifact.
23. The architecture SHALL close the following ambiguity: `execution_mode`, `analysis_only`, `non_compliance_config_refs[]`, and `counterfactual_basis` were not modeled. This closes the risk that analysis-mode trust summaries could be mistaken for compliance outputs.
24. The architecture SHALL close the following ambiguity: `lifecycle_state` was absent from the snapshot contract despite the state-machine dependency. This closes the risk that consumers could accept invalid or transient snapshots as final.
25. The architecture SHALL close the following ambiguity: schema lagged behind the common derived-artifact model. This closes the risk that modeled or non-live snapshots could contaminate compliance decisions.
26. The architecture SHALL close the following ambiguity: no `artifact_type` or `contract` fields. This closes the risk that persisted terminal outcomes could not be integrity-checked.
27. The architecture SHALL close the following ambiguity: terminal artifacts were not marked as compliance or analysis outputs. This closes the risk that downstream orchestration could confuse modeled and live pathways.
28. The architecture SHALL close the following ambiguity: only `manifest_id` was present. This closes the risk that idempotent reloads and downstream references had to overload the manifest key.
29. The architecture SHALL close the following ambiguity: only lower-level gate chains encoded reasons. This closes the risk that every consumer would need to replay all gates to understand why the run ended.
30. The architecture SHALL close the following ambiguity: examples were stale. This closes the risk that integrators would implement against an invalid artifact shape.
31. The architecture SHALL close the following ambiguity: common derived-artifact fields were missing. This closes the risk that provisional analysis facts could be confused with compliance facts.
32. The architecture SHALL close the following ambiguity: `supporting_evidence_refs[]` had no conditional minimum for `PROVISIONAL` or `CANONICAL`. This closes the risk that fact promotion could bypass provenance.
33. The architecture SHALL close the following ambiguity: contract lagged behind the shared artifact model. This closes the risk that analysis-derived canonical facts could leak into compliance compute.
34. The architecture SHALL close the following ambiguity: no evidence minimum when `promotion_state = CANONICAL`. This closes the risk that authoritative facts could exist without provenance.
35. The architecture SHALL close the following ambiguity: `source_strength_tier` remained nullable even for canonical state. This closes the risk that trust and parity scoring would lack evidence-quality input.
36. The architecture SHALL close the following ambiguity: `freshness_state` stayed nullable for canonical records. This closes the risk that stale data could masquerade as current during compute or filing.
37. The architecture SHALL close the following ambiguity: `lineage_refs[]` was optional. This closes the risk that extracted evidence could not be traced back to source transformations.
38. The architecture SHALL close the following ambiguity: `retention_tag` was nullable. This closes the risk that erasure, legal-hold, and retention handling would become unenforceable.
39. The architecture SHALL close the following ambiguity: `involved_fact_refs[]` had no minimum cardinality. This closes the risk that single-fact “conflicts” could pollute the reconciliation pipeline.
40. The architecture SHALL close the following ambiguity: `reason_codes[]` had no minimum cardinality. This closes the risk that blocking conflicts would not explain why promotion was halted.

## Compute, trust, and amendment logic integrity

Compute formulas, trust synthesis, parity evaluation, and amendment semantics SHALL remain numerically stable and semantically aligned.

41. The architecture SHALL close the following ambiguity: `error_budget_d` was used directly in the validation formula. This closes the risk that validation scoring could explode or become undefined.
42. The architecture SHALL close the following ambiguity: `Σw` was assumed positive. This closes the risk that completeness and quality scores could become NaN and poison trust synthesis.
43. The architecture SHALL close the following ambiguity: reporting scope was derived from `requested_scope[]`. This closes the risk that access masking or scope reduction could be bypassed in compute.
44. The architecture SHALL close the following ambiguity: the formulas only stated canonical facts without analysis-specific policy. This closes the risk that provisional facts might be used inconsistently across implementations.
45. The architecture SHALL close the following ambiguity: `RuleEvaluation(...)` consumed `annual_adjusted_totals` without a deterministic construction rule. This closes the risk that engines could invent incompatible intermediate structures.
46. The architecture SHALL close the following ambiguity: Monte Carlo seeding allowed `manifest_id`. This closes the risk that identical frozen inputs could yield different forecasts after recovery or replay.
47. The architecture SHALL close the following ambiguity: `K` had no dedupe or deterministic ordering rule. This closes the risk that parity scores could vary across runtimes or collection order.
48. The architecture SHALL close the following ambiguity: weights, thresholds, and floors allowed invalid values. This closes the risk that division-by-zero, negative pressure, or silent threshold disablement could occur.
49. The architecture SHALL close the following ambiguity: denominator used `abs_floor_k` without enforcing positivity or minimum relative floor. This closes the risk that zero-ish comparisons could generate infinite breach ratios.
50. The architecture SHALL close the following ambiguity: there was no invalid-input path for non-finite values. This closes the risk that a single bad field could corrupt aggregate parity results.
51. The architecture SHALL close the following ambiguity: field classes used `MINOR`, `MATERIAL`, and `BLOCKING` while aggregate rules referenced `*_DIFFERENCE`. This closes the risk that downstream classification logic could mis-map field states.
52. The architecture SHALL close the following ambiguity: `Σw` was overloaded from earlier sections. This closes the risk that readers and implementations could use the wrong denominator.
53. The architecture SHALL close the following ambiguity: no rule covered the `Σw = 0` parity case. This closes the risk that runs could falsely appear comparable.
54. The architecture SHALL close the following ambiguity: trust synthesis ignored unresolved baseline submission state when live progression was requested. This closes the risk that the system could mark a run submission-ready without authoritative reconciliation.
55. The architecture SHALL close the following ambiguity: automation caps did not account for `UNKNOWN` or `OUT_OF_BAND_UNRECONCILED` baseline states. This closes the risk that live automation could proceed under legal uncertainty.
56. The architecture SHALL close the following ambiguity: readiness permitted `LIMITED` automation and ignored unresolved baseline state. This closes the risk that operators could be told to submit when reconciliation posture was not safe.
57. The architecture SHALL close the following ambiguity: `DQ_INVALID_ERROR_BUDGET`, `DQ_WEIGHT_PROFILE_INVALID`, and `PARITY_COMPARISON_SET_INVALID` were absent. This closes the risk that hardened failures would have no stable machine-readable explanation.
58. The architecture SHALL close the following ambiguity: `and`/`or` conditions were written as free text. This closes the risk that two compliant implementations could make opposite decisions on the same inputs.
59. The architecture SHALL close the following ambiguity: state-machine labels used `MATERIAL_CHANGE` / `AMENDMENT_RECOMMENDED` while other docs used different terms. This closes the risk that UI, workflow, and policy surfaces could drift out of sync.

## Authority interaction integrity

Authority-facing requests and authority-derived legal state SHALL remain canonical, namespaced, and non-replayable outside their frozen lineage.

60. The architecture SHALL close the following ambiguity: request path, query, header ordering, and Unicode normalization were not frozen precisely. This closes the risk that identical semantic requests could hash differently and break dedupe or audit replay.
61. The architecture SHALL close the following ambiguity: preflight rules did not state that replay runs must never perform live mutation. This closes the risk that a recovery/replay code path could accidentally transmit.
62. The architecture SHALL close the following ambiguity: `request_hash` and `idempotency_key` did not include authority/environment/operation-family scoping. This closes the risk that unrelated requests could collide under the same hash or idempotency surface.

## Experience and presentation contract integrity

Low-noise shell contracts, presentation defaults, and UX-supporting vocabularies SHALL remain deterministic and bounded across read, replay, and reconnect surfaces.

63. The architecture SHALL close the following ambiguity: dominant issue/action posture existed only as loose top-level convenience fields without ordered rationale or default detail-module selection. This closes the risk that clients could rank issues differently, reintroduce competing primaries, and drift back into clutter.
64. The architecture SHALL close the following ambiguity: surface, reason, warning, secondary-action, and detail-entry limits were not frozen in a contract artifact. This closes the risk that incremental UI changes could silently erode the calm-shell guarantee.
65. The architecture SHALL close the following ambiguity: `surface_updates[].payload` accepted arbitrary objects even for `CONTEXT_BAR`, `DECISION_SUMMARY`, `ACTION_STRIP`, and `DETAIL_DRAWER`. This closes the risk that implementations could produce incompatible summary/action/drawer semantics while still passing envelope validation.
66. The architecture SHALL close the following ambiguity: the contract bounded primary actions but did not explicitly forbid disabled-control clutter. This closes the risk that users could still face noisy action strips full of unavailable affordances.
67. The architecture SHALL close the following ambiguity: `detail_entry_points[]` had no ordered default-module rule or bounded cardinality. This closes the risk that the expert drawer could become another cluttered navigation surface.
68. The architecture SHALL close the following ambiguity: reconnect guidance preserved the shell generally but did not persist an explicit `focus_anchor_ref` or shell stability token. This closes the risk that live refreshes could disorient users by shifting the object they were reading.
69. The architecture SHALL close the following ambiguity: the contract described empty states in prose but did not classify them formally. This closes the risk that users could not reliably tell whether data was absent, still materializing, policy-hidden, or irrelevant.
70. The architecture SHALL close the following ambiguity: `UIUX_DESIGN_SKILL.md` continued to favor prismatic, cinematic, multi-region observatory language even though `low_noise_experience_contract.md` defines a calm-shell production profile. This closes the risk that design and frontend teams could reintroduce split attention, metaphor overhead, and unnecessary ornament.
71. The architecture SHALL close the following ambiguity: `ExperienceDelta` and `experienceFrame` still accepted rich observatory surfaces as peer top-level updates under `experience_profile = LOW_NOISE`. This closes the risk that clients could validate and render a cluttered shell while still appearing contract-compliant.
72. The architecture SHALL close the following ambiguity: context, summary, action, and detail-entry labels had no bounded low-noise copy budget. This closes the risk that verbose authority payloads or long reason chains could displace the primary action and turn the calm shell into a scrolling spec dump.
73. The architecture SHALL close the following ambiguity: rich observatory modules were still described as if they could coexist as ordinary first-view regions rather than progressive-disclosure depth. This closes the risk that teams could ship investigator complexity in first view, increasing learning cost and slowing expert throughput.
74. The architecture SHALL close the following ambiguity: the mode guard excluded live filing and amendment transmit tokens but still allowed `amendment_intent`. This closes the risk that non-live runs could enter amendment workflow posture and blur compliance boundaries.
75. The architecture SHALL close the following ambiguity: many refs and reason/action arrays were modeled as unconstrained lists instead of canonical sets. This closes the risk that hashes, audits, workflow rollups, and replay-safe lineage could drift under semantically identical inputs.
76. The architecture SHALL close the following ambiguity: outcome-class, truth/checkpoint posture, plain reason, action bridge, and supporting arrays were not all mandatory on the persisted artifact, and legacy next-action rules could contradict `NO_SAFE_ACTION`. This closes the risk that terminal reload could still fall back to client inference or contradictory shell states.
77. The architecture SHALL close the following ambiguity: the schema did not fully encode the documented relationship between `automation_level`, `trust_band`, `trust_level`, `filing_readiness`, and `required_human_steps[]`. This closes the risk that integrators could validate contradictory trust artifacts such as `ALLOWED` automation without a truly ready-to-submit posture.
78. The architecture SHALL close the following ambiguity: the tier ladder was still described as recommended prose rather than enforced as a closed contract vocabulary. This closes the risk that parity pressure, trust synthesis, and source ordering could drift across implementations.
79. The architecture SHALL close the following ambiguity: set-style envelopes such as `SourceRecordSet`, `EvidenceItemSet`, `CandidateFactSet`, `CanonicalFactSet`, and `ConflictSet` did not require unique `items[]`. This closes the risk that `set_hash` values and replay artifacts could change under duplicated but semantically identical content.
80. The architecture SHALL close the following ambiguity: `surface_updates[]` had a four-item cap but no per-surface uniqueness rule. This closes the risk that a single delta could carry contradictory updates for the same mounted shell region and break stable reconnect-safe rendering.

## Replay and reproducibility integrity

Manifest-frozen replayability SHALL remain deterministic, explainable, and auditable across exact replay, recovery, retention limitation, and counterfactual analysis.

81. The architecture SHALL close the following ambiguity: `RunManifest.continuation_set` did not encode input inheritance alongside config inheritance. This closes the risk that child manifests could claim replay or recovery lineage while silently recollecting mutable inputs.
82. The architecture SHALL close the following ambiguity: the manifest hash set omitted a first-class `execution_basis_hash`. This closes the risk that exact replay could not prove byte-identical historical basis even when config and input hashes happened to match.
83. The architecture SHALL close the following ambiguity: terminal manifest state lacked a frozen `deterministic_outcome_hash`. This closes the risk that operators could not compare replay results against the normalized material outcome surface.
84. The architecture SHALL close the following ambiguity: replay comparison outcome existed only as logs or ad hoc prose instead of a durable artifact. This closes the risk that auditors could not reconstruct why a replay matched, differed, or failed under limitation.
85. The architecture SHALL close the following ambiguity: exact replay did not require historical post-seal basis reuse for authority context and late-data monitoring. This closes the risk that a replay could silently consult newer external state while still presenting itself as historical truth.
86. The architecture SHALL close the following ambiguity: corrupted or retention-limited historical basis had no typed failure or limitation path. This closes the risk that implementations could substitute fresh data or collapse basis loss into an unqualified mismatch.
87. The architecture SHALL close the following ambiguity: replay observability lacked mandatory comparison metadata and attestation events. This closes the risk that exact replay success or mismatch could not be defended as a traceable historical claim.
