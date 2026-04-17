# Late-Data, Authority-Correction, and Replay Propagation Contract

This contract defines the shared post-seal propagation model for late-data findings, authority
corrections, and out-of-band discoveries.

The fix closes one specific failure mode: a post-seal event updates whichever boundary noticed it
first, such as late-data workflow, authority mirror state, or a current comparison view, but fails
to carry the same decision into trust currency, proof staleness, exact-scope baseline selection,
retroactive-impact analysis, or replay basis.

## Governing contract

`TemporalPropagationEvent` SHALL validate against
`schemas/temporal_propagation_event.schema.json`.

It freezes:

- which manifest and exact scope emitted the post-seal decision
- whether the trigger is late data, authority correction, out-of-band discovery, or temporal
  uncertainty
- the exact affected scope slice
- the source late-data, authority, baseline, and drift anchors that justified the event
- whether trust, proof, baseline, retroactive analysis, amendment readiness, replay, and mirror
  posture changed
- whether exact replay or exact recovery must reuse the persisted historical event instead of live
  reclassification

## Propagation rules

### Late data

When `LateDataMonitorResult` records a post-seal event:

- `temporal_consequence_summary` SHALL not be the only downstream invalidation artifact
- the result SHALL carry non-empty `temporal_propagation_event_refs[]` whenever the result is
  invalidating
- any trust invalidation SHALL retain explicit `invalidated_filing_case_refs[]`
- any proof invalidation SHALL retain explicit event-linked stale proof lineage
- any baseline rebuild SHALL retain explicit `affected_baseline_envelope_refs[]`
- any retroactive consequence SHALL retain explicit `retroactive_impact_refs[]`

### Authority correction and out-of-band truth

When `SubmissionRecord` becomes `AUTHORITY_CORRECTED` or `OUT_OF_BAND` truth:

- the correction SHALL retain non-empty `temporal_propagation_event_refs[]`
- corrected or out-of-band truth SHALL reopen trust and proof reuse instead of only updating
  `ObligationMirror`
- the submission SHALL point to the exact rebuilt baseline envelopes, filing cases, proof bundles,
  and retroactive analyses it invalidated or reopened
- out-of-band truth SHALL not flatten into a general current state; it SHALL route through
  scope-sliced baseline envelopes and explicit reconciliation posture

### Baseline and retroactive analysis

`DriftBaselineEnvelope` and `RetroactiveImpactAnalysis` SHALL each retain the same propagation
event linkage so exact-scope baseline rebuild and prior-position replay posture stay
machine-authored, not inferred from UI or workflow state.

### Proof

`ProofBundle`, `TrustSummary`, `EvidenceGraph`, and `ParityResult` SHALL each retain
`temporal_propagation_event_refs[]` when decisive post-seal invalidation is still material. If a
post-seal event forces staleness, those artifacts SHALL make that posture explicit instead of
remaining authoritative by accident.

### Replay and recovery

Exact replay and exact same-attempt recovery SHALL reuse the persisted post-seal lineage that drove
the historical decision, including late-data results, rebuilt baseline envelopes, and retroactive
impact analysis when those artifacts were material. `ReplayBasisIntegrityContract` SHALL classify
authority basis, baseline basis, late-data basis, and temporal propagation events as separate
post-seal dimensions. If those historical artifacts are missing, exact replay SHALL fail closed or
downgrade into explicitly declared counterfactual handling; it SHALL NOT silently substitute live
rescans, fresh baseline logic, or newly inferred temporal meaning.
