# Invariants & Gates (what must always be true)

These invariants are what makes the engine defensible and "production safe" in regulated contexts.

## Global invariants
1. **Determinism**: Given the same manifest inputs (facts refs, config refs, code build) the engine produces byte-identical outputs
   for deterministic modules, and statistically reproducible outputs for stochastic modules (seeded from the frozen `deterministic_seed`
   plus module-local seed scope and profile identity, never from `manifest_id` alone).
2. **Idempotency**: Re-running the same operation for the same (tenant, client, period, scope) and same manifest returns the existing decision outcome, reuses the same still-sealed pre-start manifest, or continues through a lineage-linked recovery manifest after a started/failed run, without duplicating artifacts.
3. **Mode separation**: Analysis runs never contaminate compliance runs. Persisted artifacts SHALL carry `execution_mode` and `analysis_only`; analysis artifacts SHALL also carry `non_compliance_config_refs[]` and `counterfactual_basis`. Compliance-grade trust, filing, submission, and amendment progression SHALL NOT consume analysis-only artifacts except through explicitly labeled counterfactual or reviewer-only views.
4. **Explicit uncertainty**: Missing domains, inferred values, and provisional assumptions are always surfaced in outputs and UI payloads.
5. **Authority precedence**: Legal submission state and filing baseline are derived from authority acknowledgements and authority calculation context, not from internal assumptions. `baseline_submission_state` SHALL be frozen before trust/filing progression, and unresolved authority state (`UNKNOWN` or `OUT_OF_BAND_UNRECONCILED`) SHALL cap live progression at review/not-ready rather than being treated as matched or filed truth.
6. **Audit completeness**: Every gate decision, override, submission attempt, and state transition emits an auditable event with enough context to replay.
7. **Retention compliance**: Every artifact has a retention tag; erasure and expiry actions are applied consistently and are themselves auditable.
8. **Least privilege**: All actions are authorized by policy (ABAC-style attributes), including automated actions.
9. **Manifest seal**: Compliance artifacts, filing packets, and submissions may be created only under one sealed manifest with frozen config and input boundaries.
10. **State-machine legality**: Material artifacts transition only through named events and allowed lifecycle states; illegal transitions fail closed. When a material invariant violation drives the terminalization, the manifest and bound error object SHALL both carry `invariant_enforcement_contract{...}` so pre-start faults become `BLOCKED`, post-start faults become `FAILED`, and impossible-state normalization remains illegal.
11. **Authority protocol validity**: Authority-facing operations require a bound authority context, request hashes, idempotency, and normalized response handling; dispatch alone never proves legal success.
12. **Baseline precedence**: Drift and amendment logic must compare against the highest-precedence available baseline, preferring authority-corrected or amended truth over older filed or working states.
13. **Provenance completeness**: Filing-capable and trust-capable artifacts require a graph address, a deterministic `primary_path_ref`, and at least one admissible critical path back to facts, evidence, or authority responses. Missing, erased, or non-admissible critical support SHALL surface as retention/trust limitations or blocking posture rather than as silent score degradation.
14. **Observability correlation**: Blocking errors, authority interactions, retention actions, and gate decisions must emit audit and telemetry signals with shared manifest-safe correlation keys.
15. **Structured failure handling**: No blocking or review-relevant failure exists without an `ErrorRecord`, and no material remediation path exists without an owner type or owner-resolution rule.
16. **Audit sufficiency**: No filing-critical action, authority mutation, step-up event, override approval, or erasure action may occur without append-only audit evidence.
17. **Collection-boundary freeze**: Source completeness contract and collection boundary are frozen before canonicalization; canonical facts cannot be promoted from unfrozen intake.
18. **Late-data discipline**: Records discovered after the frozen `read_cutoff_at` are either out-of-scope for the active manifest or handled via child-manifest branching per late-data policy.
19. **Gate enum separation**: Access decisions and non-access gate decisions use distinct enums and are never mixed in one decision type.
20. **Artifact-contract enforcement**: No intake-boundary or intake-data artifact becomes authoritative unless validated against the frozen schema bundle with recorded contract refs and artifact contract hashes.
21. **Gate-chain ordering**: Compliance-capable gates SHALL emit `GateDecisionRecord`s in the canonical order defined by the gate tables once each gate's prerequisites exist. Later gates may append post-seal, but they SHALL NOT reorder earlier gate records, read live action tokens from raw `requested_scope[]`, or downgrade an earlier `HARD_BLOCK`.
22. **Override dependence**: Override validation is gate-scoped and subordinate, not a peer progression gate. Only a gate that produced `OVERRIDABLE_BLOCK` may consult override state, and no override may legalize missing prerequisites, bypass required later gates, or convert a `HARD_BLOCK` into progress.
23. **Trust-input admissibility**: Trust and filing-capable decisions may reuse only manifest-consistent, unsuperseded, in-scope inputs. Missing, contradictory, or superseded trust dependencies SHALL surface as explicit `INCOMPLETE`, `CONTRADICTED`, or recalculation-required posture rather than being silently carried forward.
24. **Threshold-edge fail-safe**: Trust policy SHALL freeze guard bands around every filing-critical threshold. Any trust score, risk, completeness, or graph-quality value inside that guard band SHALL degrade to review/not-ready posture rather than straight-through automation.
25. **Trust currentness before filing**: `FILING_GATE`, packet approval, and live submission SHALL require current trust. Any late data, authority correction, override lifecycle change, or dependency supersession after trust synthesis SHALL invalidate filing-capable reuse until trust is resynthesized.
26. **Override governance**: Only valid, in-scope, unexpired, usage-available exceptional authority may satisfy an override-dependent posture. Override-dependent filing progression SHALL always remain explicit in gate reason codes and audit actions and SHALL never outrank authority-of-record truth.
27. **Proof-path closure**: Every filing-capable figure, filing field, filing packet, submission meaning, and authority-sensitive decision SHALL have a target-level support assessment and a `ProofBundle` whose decisive path either closes back to admissible retained evidence or authority basis, or explicitly fails closed as `UNSUPPORTED`, `CONTRADICTED`, `STALE`, or `OPEN`.
28. **Contradiction isolation**: Conflicting evidence, superseded facts, authority divergence, and stale support SHALL be isolated as first-class contradiction records and SHALL never be silently averaged into one apparently healthy decisive path.
29. **Replay-safe explainability**: A reviewer-visible explanation, enquiry pack, or filing-artifact justification SHALL be reconstructible from retained graph artifacts, deterministic path selection rules, and frozen config or policy refs without depending on transient cache order or live connector availability.
30. **Bounded uncertainty exposure**: Inference, retention limitation, stale evidence, missing authority basis, explanation-render failure, or incomplete graph slices SHALL surface as explicit reason codes, limitation entries, and support-state degradation rather than hidden confidence discounting.
31. **Graph freshness invalidation**: Late data, amendment activity, authority correction, or supersession touching any decisive node, edge, or target assessment SHALL move the affected graph or proof bundle to `STALE` or `REBUILD_REQUIRED` until recalculation completes.
32. **Frozen baseline envelopes**: Every drift or amendment comparison SHALL reference one persisted `DriftBaselineEnvelope`; downstream modules SHALL not recompute baseline identity ad hoc from live state once comparison has begun.
33. **One active exact-scope amendment chain**: For any one `(tenant, client, period, exact_scope_key)`, at most one non-superseded `AmendmentCase` may be active at a time. Newer same-scope work SHALL supersede earlier internal cases without deleting them.
34. **Bounded retroactivity**: Late evidence or changed authority truth may only reopen periods, partitions, or submission chains that are explicitly named by persisted `RetroactiveImpactAnalysis`; no rule may widen retroactive scope implicitly.
35. **Freshness-safe amendment reuse**: `intent-to-amend`, calculation-basis, and user-confirmation artifacts may be reused for amendment submission only while their frozen freshness predicates still hold against the current baseline envelope, delta vector, retroactive-impact artifact, and provider profile.
36. **Authority-accepted supersession integrity**: If an earlier amendment is authority-confirmed and later internally superseded, the earlier authority-accepted state SHALL remain queryable and auditable while the newer case becomes the active chain head.

## Standard gate chain (canonical families)
- **Access Gate**: principal allowed to act on the authorized `(tenant, client, period, runtime_scope[])`?
- **Manifest / Artifact Contract / Input Boundary Gates**: is the run sealed against the right schema bundle, collection boundary, and frozen intake contract before authoritative processing?
- **Data Quality Gate**: are completeness, validation posture, and structural scoring prerequisites sufficient for compute?
- **Retention Evidence Gate**: does filing-critical evidence still have admissible, closed, replayable support paths, proof-bundle coverage, and lawful retention posture?
- **Parity Gate**: does the internal result stay within the required or desirable authority-comparison policy for the requested scope?
- **Trust Gate**: is the composite trust posture sufficient for automation, review, filing readiness, and downstream progression?
- **Amendment Gate**: when amendment intent or amendment submission is requested, is the amendment basis legally and procedurally valid?
- **Filing Gate**: when filing-packet preparation or live filing progression is requested, do the trust, amendment, packet, proof-bundle, contradiction, and notice prerequisites support legal filing progression?
- **Submission Gate**: immediately before transmit, are the authority context, payload, idempotency, and acknowledgement prerequisites satisfied?

Override state is consulted only inside a gate's own `OVERRIDABLE_BLOCK` branch. It is not a standalone peer gate in the canonical progression chain.

Detailed gate ordering, decision tables, and reason-code families are defined in
`exact_gate_logic_and_decision_tables.md`.

## Error classification
- **Data-health errors**: missing/invalid data, schema conflicts, connector failures.
- **Policy/gating blocks**: access denied, filing blocked, automation blocked.
- **Authority failures**: authority unavailable, rejected submission, pending/unknown acknowledgement.
- **System faults**: timeouts, corrupted payloads, storage faults.

Each error class must map to a distinct remediation experience.
