# Append-Only Audit Writer Runbook

## Purpose

`packages/audit` is the governed boundary for append-only audit event publication. It makes stream partitioning, one-based sequencing, hash chaining, signature reservation, and retention-limited reconstruction explicit instead of leaving those behaviors implicit in storage adapters or caller-specific helpers.

## Operating rules

1. Build every audit row through `createAuditEventDraft()` and `AppendOnlyAuditWriter.append()`. Callers should not hand-assemble `audit_event` payloads.
2. Sequence is per stream, starts at `1`, and uses `prev_event_hash = null` only for the first row.
3. Duplicate publication handling is scoped to `audit_stream_ref + publicationRef`. Identical semantic payloads reuse the existing row; divergent payloads fail closed.
4. Signature failure never rewrites a published row. Families with signing posture reserve `signature_ref` before append, then batch success or failure is recorded beside the row.
5. Retention-limited audit rows must preserve typed `reason_codes`, `object_refs`, `lineage_refs`, and `limitation_reason_codes`.

## Stream partition precedence

1. Nightly batch and nightly window
2. Authority operation
3. Manifest
4. Workflow item
5. Family fallback

This precedence keeps the strict continuity anchor as specific as possible before dropping to broader narrative rails.

## Verification commands

Run the package generator and checks:

```bash
node --experimental-strip-types ./packages/audit/src/build_audit_stream_atlas.ts --emit
node --experimental-strip-types ./packages/audit/src/build_audit_stream_atlas.ts --check
```

Run the focused validation suites:

```bash
./node_modules/.bin/playwright test --config=playwright.config.ts --project=unit ./tests/unit/audit/audit_writer_foundation.spec.ts
./node_modules/.bin/playwright test --config=tests/integration/playwright.config.ts ./tests/integration/audit/append_only_hash_chain_flow.spec.ts
./node_modules/.bin/playwright test --config=playwright.config.ts --project=browser ./tests/playwright/internal/audit_stream_atlas.spec.ts
```
