# Invariants & Gates (what must always be true)

These invariants are what makes the engine defensible and "production safe" in regulated contexts.

## Global invariants
1. **Determinism**: Given the same manifest inputs (facts refs, config refs, code build) the engine produces byte-identical outputs
   for deterministic modules, and statistically reproducible outputs for stochastic modules (seeded from the frozen `deterministic_seed`
   plus module-local seed scope and profile identity, never from `manifest_id` alone).
2. **Idempotency**: Re-running the same operation for the same (tenant, client, period, scope) and same manifest returns the existing decision outcome, reuses the same still-sealed pre-start manifest, or continues through a lineage-linked recovery manifest after a started/failed run, without duplicating artifacts.
3. **Mode separation**: "Analysis" runs never contaminate "Compliance" runs. Artifacts are tagged with `mode` and cannot be mixed across modes.
4. **Explicit uncertainty**: Missing domains, inferred values, and provisional assumptions are always surfaced in outputs and UI payloads.
5. **Authority precedence**: Legal submission state is derived from authority acknowledgements, not from internal assumptions.
6. **Audit completeness**: Every gate decision, override, submission attempt, and state transition emits an auditable event with enough context to replay.
7. **Retention compliance**: Every artifact has a retention tag; erasure and expiry actions are applied consistently and are themselves auditable.
8. **Least privilege**: All actions are authorized by policy (ABAC-style attributes), including automated actions.
9. **Manifest seal**: Compliance artifacts, filing packets, and submissions may be created only under one sealed manifest with frozen config and input boundaries.
10. **State-machine legality**: Material artifacts transition only through named events and allowed lifecycle states; illegal transitions fail closed.
11. **Authority protocol validity**: Authority-facing operations require a bound authority context, request hashes, idempotency, and normalized response handling; dispatch alone never proves legal success.
12. **Baseline precedence**: Drift and amendment logic must compare against the highest-precedence available baseline, preferring authority-corrected or amended truth over older filed or working states.
13. **Provenance completeness**: Filing-capable and trust-capable artifacts require a graph address and at least one traversable critical path back to facts, evidence, or authority responses.
14. **Observability correlation**: Blocking errors, authority interactions, retention actions, and gate decisions must emit audit and telemetry signals with shared manifest-safe correlation keys.
15. **Structured failure handling**: No blocking or review-relevant failure exists without an `ErrorRecord`, and no material remediation path exists without an owner type or owner-resolution rule.
16. **Audit sufficiency**: No filing-critical action, authority mutation, step-up event, override approval, or erasure action may occur without append-only audit evidence.
17. **Collection-boundary freeze**: Source completeness contract and collection boundary are frozen before canonicalization; canonical facts cannot be promoted from unfrozen intake.
18. **Late-data discipline**: Records discovered after the frozen `read_cutoff_at` are either out-of-scope for the active manifest or handled via child-manifest branching per late-data policy.
19. **Gate enum separation**: Access decisions and non-access gate decisions use distinct enums and are never mixed in one decision type.
20. **Artifact-contract enforcement**: No intake-boundary or intake-data artifact becomes authoritative unless validated against the frozen schema bundle with recorded contract refs and artifact contract hashes.

## Standard gates (examples)
- **Access Gate**: principal allowed to act on (tenant, client, period, scope)?
- **Data Quality Gate**: snapshot completeness + validation status sufficient for compute?
- **Parity Gate**: internal vs authority delta within policy thresholds?
- **Trust Gate**: composite trust sufficient for automation / filing?
- **Override Gate**: does an override exist and is it approved + unexpired + scoped correctly?
- **Retention Gate**: is required evidence still available? if expired, outputs must mark limitations.

Detailed gate ordering, decision tables, and reason-code families are defined in
`exact_gate_logic_and_decision_tables.md`.

## Error classification
- **Data-health errors**: missing/invalid data, schema conflicts, connector failures.
- **Policy/gating blocks**: access denied, filing blocked, automation blocked.
- **Authority failures**: authority unavailable, rejected submission, pending/unknown acknowledgement.
- **System faults**: timeouts, corrupted payloads, storage faults.

Each error class must map to a distinct remediation experience.
