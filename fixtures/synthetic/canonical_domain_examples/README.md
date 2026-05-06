# Canonical Domain Examples

This directory is generator-owned. Edit `tools/fixtures/build_deterministic_fixture_pack.ts` and rerun:

```bash
node --experimental-strip-types ./tools/fixtures/build_deterministic_fixture_pack.ts --emit
```

The emitted examples turn the roadmap corpus into privacy-safe, deterministic, machine-checkable scenario bundles.

## Included Embodiments

- `EMB-01` Direct-subject quarterly update from structured records: Baseline submission path (STANDARD_REPLAY)
- `EMB-02` Agent-led quarterly update across multiple business partitions: Delegated partition queue retry (LIVE_COMPLIANCE)
- `EMB-03` In-year correction carried into the next quarterly update: Working-state correction lineage (LIVE_COMPLIANCE)
- `EMB-04` End-of-year final declaration with authority calculation: Authority calculation submission (LIVE_COMPLIANCE)
- `EMB-05` Final declaration blocked by material parity divergence: Material parity divergence (LIVE_COMPLIANCE)
- `EMB-06` Post-finalisation material drift leading to amendment: Amendment lineage and historical replay (STANDARD_REPLAY)
- `EMB-07` Out-of-band filing discovered by authority reconciliation: Out-of-band reconciliation review (LIVE_COMPLIANCE)
- `EMB-08` Authority correction observed after filing: Authority correction reopens trust (AUDIT_REPLAY)
- `EMB-09` Retention-limited replay and enquiry defense: Retention-limited enquiry replay (LIMITED_HISTORICAL_COMPARISON)
- `EMB-10` Analysis-only counterfactual run: Analysis-only counterfactual (COUNTERFACTUAL_ANALYSIS); Schema-bundle evolution window (LIVE_READER_WINDOW_REVIEW)
- `EMB-11` Degraded-data review path with no filing: Degraded-data compensating review (LIMITED_HISTORICAL_COMPARISON)
- `EMB-12` Multi-product compatible chain: Multi-product chain (LIVE_COMPLIANCE); Upload request rebase and reconfirmation (LIVE_REQUEST_REBASE); Stream rebase and cross-device continuity (STREAM_REBASE)

## Stability Rules

- Seed values are deterministic and versioned.
- Sample artifacts must remain mirrored from `packages/contracts-core/samples`.
- Golden-pack expectations are reviewed through `fixtures/synthetic/deterministic_golden_pack_seed.json`.
- No example may include real customer data, live timestamps, or provider secrets.
