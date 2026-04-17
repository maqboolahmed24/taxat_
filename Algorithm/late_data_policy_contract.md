# Late-Data Policy Contract

This contract defines the durable artifact surface for the late-data-policy layer.

The late-data-policy layer covers frozen per-source late-data bindings, post-cutoff indicators,
policy-resolved findings, and the aggregate monitor result consumed by filing-capable gates.

## Late-data artifacts

`LateDataPolicyBinding` SHALL validate against `schemas/late_data_policy_binding.schema.json`.

It freezes:

- the source domain and optional source-class narrowing
- partition and runtime-scope narrowing
- the ordered precedence of the binding
- the exact late-data policy applied after seal

`LateDataIndicator` SHALL validate against `schemas/late_data_indicator.schema.json`.

It freezes:

- the specific post-cutoff drift or discovery signal
- the detection basis and evidence anchor
- the affected source and runtime scope
- the policy-implied severity before aggregation

`LateDataIndicatorSet` SHALL validate against `schemas/late_data_indicator_set.schema.json`.

It freezes:

- the exact ordered indicator population seen for one monitoring pass
- the runtime-scope context used to classify those indicators
- deterministic set identity and production timing

`LateDataFinding` SHALL validate against `schemas/late_data_finding.schema.json`.

It freezes:

- the policy-resolved outcome for one affected late-data binding
- the active-manifest effect
- any spawned child manifest or workflow item linkage
- supersession or resolution timing

`LateDataMonitorResult` SHALL validate against `schemas/late_data_monitor_result.schema.json`.

It freezes:

- the aggregate `late_data_status` passed into filing-capable gates
- counts by exclusion, review, and child-manifest outcome
- the exact indicator set and finding refs behind that status
- the downstream child-manifest or workflow refs created from those findings

## Persistence rule

After a manifest has sealed, any late-data check SHALL persist:

- the ordered `LateDataPolicyBinding[]` applicable to the current runtime scope
- a `LateDataIndicatorSet`
- zero or more `LateDataFinding` artifacts
- a `LateDataMonitorResult`

before child-manifest spawn, manual-review routing, or `FILING_GATE` evaluation depends on the
result. This keeps late-data handling replay-safe and prevents filing-capable gates from inferring
late-data posture ad hoc from raw connector deltas.

The same freeze boundary SHALL also keep required-domain omission explicit. If a required source
domain was excluded, absent, or stale at pre-seal intake time, that posture SHALL already be
materialized in `InputFreeze.exclusion_refs[]`, `missing_source_declarations[]`, or
`stale_source_declarations[]`; late-data monitoring SHALL NOT reinterpret an undeclared intake
omission as if the domain had simply produced no late data.

Where a newly persisted `LateDataFinding` or `LateDataMonitorResult` changes the filing-capable
posture after trust was synthesized, the engine SHALL invalidate the affected filing case's current
trust-currency posture before any packet approval or submission can continue. At minimum, the
control plane SHALL persist `trust_currency_state = RECALC_REQUIRED`, `trust_invalidated_at`, and
machine reason codes referencing the late-data artifacts, and any `READY_TO_SUBMIT` filing case
SHALL transition back to review posture until trust has been resynthesized against the new
post-seal facts.

## Post-filing late-data interaction

If a late-data finding touches a scope that already has a confirmed filed, amended, or
authority-corrected baseline, the engine SHALL also:

- link the finding to the affected legal baseline or `SubmissionRecord`
- trigger persisted `RetroactiveImpactAnalysis` before any amendment recommendation is reused
- forbid in-place mutation of the historical filed position
- either spawn a bounded continuation/replay manifest or open review/escalation workflow

A late-data artifact SHALL therefore be able to explain whether it is:

- current-working only
- post-finalisation explanation-only
- amendment-triggering for the current exact scope
- replay-triggering for one or more prior filed positions

Late-data handling MUST remain scope-sliced. Evidence arriving for one partition SHALL NOT reopen
unrelated partitions or periods without an explicit retroactive-impact artifact naming those scopes.

## Temporal interpretation of late-data indicators

Late-data policy SHALL distinguish when the engine learned about a thing from when the thing became
true or legally operative. Discovery time alone SHALL NOT decide whether a post-cutoff indicator is
benign, retroactive, or amendment-relevant.

For each `LateDataIndicator` or `LateDataFinding` `i`, derive:

- `t_cutoff = collection_boundary.read_cutoff_at`
- `t_effective_i =` earliest proved business-effective or authority-effective time of the underlying
  item
- `t_visible_i =` earliest proved time the source or authority made that item retrievable under the
  frozen source plan
- `t_discovered_i = LateDataIndicator.discovered_at`
- `temporal_certainty_i = 1` iff `t_effective_i` and the required visibility basis are present and
  non-contradictory; otherwise `0`

Where a filed, amended, or authority-corrected legal baseline exists, classify
`late_temporal_class_i` in the following precedence order:

- `TEMPORALLY_UNPROVED` if `temporal_certainty_i = 0`
- `AUTHORITY_POSTING_LAG` if the source is authority-originated,
  `t_effective_i <= selected_legal_baseline.baseline_effective_at`, and `t_visible_i > t_cutoff`
- `TRUE_POST_BASELINE_EVENT` if `t_effective_i > selected_legal_baseline.baseline_effective_at`
- `PRE_CUTOFF_PREEXISTING_LATE_ARRIVAL` if `t_effective_i <= t_cutoff` and `t_visible_i <= t_cutoff`
- `POST_CUTOFF_DISCOVERY_PRE_BASELINE_FACT` otherwise

Policy consequences:

- `PRE_CUTOFF_PREEXISTING_LATE_ARRIVAL`, `POST_CUTOFF_DISCOVERY_PRE_BASELINE_FACT`, and
  `AUTHORITY_POSTING_LAG` touching any tax-bearing, filing-critical, authority-critical, or
  replay-boundary field SHALL trigger persisted `RetroactiveImpactAnalysis`; they SHALL NOT be
  silently attached only to the current working state
- `TRUE_POST_BASELINE_EVENT` SHALL remain current-scope or future-scope only unless cumulative
  provider rules or a persisted retroactive-impact analysis prove dependency on a prior legal
  position
- `TEMPORALLY_UNPROVED` touching a decisive field SHALL cap downstream recommendation at review or
  reconciliation and SHALL invalidate reuse of any previously synthesized trust or
  amendment-readiness basis
- policy-resolved indicator severity (`NOTICE`, `MANUAL_REVIEW`, `CHILD_MANIFEST_REQUIRED`) is not
  the final legal consequence surface; same-scope legal-baseline touch and temporal ambiguity may
  escalate downstream review/replay handling even when the raw binding policy is otherwise low
  severity

## Graph invalidation rule

Late-data handling SHALL explicitly invalidate the defensible filing graph when new information
touches a decisive filing path.

For every `LateDataFinding` that touches a source, evidence item, fact, total, filing field, or
submission meaning that is part of a decisive current proof path:

- the affected target assessment SHALL move to `STALE`;
- the affected controlling proof bundle SHALL move to `STALE` or `SUPERSEDED`;
- the current `EvidenceGraph.lifecycle_state` SHALL move to `STALE` or `REBUILD_REQUIRED` when any
  filing-critical target remains stale after aggregation.

A late-data monitor result SHALL therefore be able to explain not only filing-gate posture but also
whether the current graph or proof bundle can still be used as a filing defence artifact.

## Replay and historical-basis rule

For `STANDARD_REPLAY`, `AUDIT_REPLAY`, and exact same-attempt recovery, the engine SHALL reuse the
persisted `LateDataMonitorResult`, `LateDataIndicatorSet`, and `LateDataFinding` lineage from the
source manifest. It SHALL NOT perform a fresh post-cutoff scan, rebind the late-data policy to a
newer policy version, silently reinterpret historical indicators against a new cutoff boundary, or
reclassify a historical indicator's temporal meaning from newer authority or baseline knowledge
without emitting a new continuation or retroactive-impact artifact.

If historical late-data artifacts are missing, corrupt, or unavailable under retention policy, the
replay path SHALL fail closed or emit an explicitly limited replay-attestation outcome; it SHALL NOT
replace the missing historical basis with a fresh connector query and still call the result an exact
replay.

## Counterfactual retroactive-impact simulator

Late-data replay SHALL also support one analysis-only, persisted counterfactual simulator so
reviewers can inspect historical retroactivity without mutating prior legal state. The simulator
SHALL bind one immutable
`late_data_retroactive_impact_simulation_basis_contract{ source_manifest_hash,
source_execution_basis_hash, source_collection_boundary_ref, source_input_freeze_ref,
source_baseline_envelope_ref, covered_scope_refs[], covered_submission_refs[],
source_late_data_monitor_ref, source_late_data_finding_refs[],
source_temporal_propagation_event_refs[], source_proof_bundle_refs[] }` to one
`LateDataRetroactiveImpactSimulation`.

That simulator SHALL:

- run only under `execution_mode_boundary_contract{ run_kind = REPLAY,
  replay_class_or_null = COUNTERFACTUAL_ANALYSIS, execution_mode = ANALYSIS,
  legal_effect_boundary = COUNTERFACTUAL_REPLAY_READ_ONLY }`
- reuse only persisted baseline, late-data, proof, and prior retroactive-impact artifacts from the
  frozen basis contract
- evaluate exactly the canonical five temporal classes:
  `PRE_CUTOFF_PREEXISTING_LATE_ARRIVAL`, `POST_CUTOFF_DISCOVERY_PRE_BASELINE_FACT`,
  `AUTHORITY_POSTING_LAG`, `TRUE_POST_BASELINE_EVENT`, and `TEMPORALLY_UNPROVED`
- emit only the canonical consequence buckets `CURRENT_ONLY`, `EXPLANATION_ONLY`,
  `AMENDMENT_TRIGGERING`, `REPLAY_TRIGGERING`, and `REVIEW_BLOCKED`
- keep `impacted_scope_refs[]`, `impacted_submission_refs[]`, and any
  `restatement_scope_refs[]` bounded to the basis contract's declared covered scope and submission
  chain
- invalidate trust, proof, and amendment readiness immediately whenever the simulated scenario
  touches a decisive proof path or remains temporally unproved

The simulator SHALL NOT:

- classify retroactivity from discovery time alone
- reopen unrelated partitions or periods outside the declared covered sets
- mutate historical filed, amended, or authority-corrected state in place
- refresh historical late-data posture from live connector rescans or newer baseline knowledge and
  still call the result historical replay

The simulator therefore acts as the explicit proof surface showing whether a persisted late-data
artifact is current-only, explanation-only, amendment-triggering, replay-triggering, or blocked on
temporal uncertainty.
