# Schema Drift And Migration Readiness

This repo treats schema drift, migration evidence, generated bindings, samples, and support docs as one release-admission problem.
`pc_0080` closes the gap by producing a deterministic `schema_drift_report` plus an optional `schema_bundle_compatibility_gate` materialization from the same offline analysis pass.

## Comparison Basis

- `baseline` is the currently imported contracts-core bundle recorded in `config/migrations/schema_bundle_version_catalog.json`.
- `candidate` is the current workspace schema bundle materialized from `packages/contracts-core`, bundled samples, docs references, and generated binding coverage.
- `historical protected window` comes from `config/migrations/schema_reader_window_baseline.json` and defines which older readers and frozen manifests still constrain destructive change.

The tool does not require live cloud state. It reads repo-owned artifacts only, fails closed on ambiguous inputs, and emits stable JSON suitable for CI diffing and promotion evidence.

## Drift Classes

- `ADDITIVE`: widening or new optional surfaces that preserve current readers by default.
- `NARROWING`: changes that can reject formerly valid values or break supported clients.
- `DESTRUCTIVE`: removals, re-typing, or sealed-manifest path changes.
- `DOC_DRIFT`: schema, sample, and support-doc parity problems.
- `BINDING_DRIFT`: generated Python, Swift, or TypeScript artifacts no longer match the bundle.
- `MIGRATION_GAP`: migration ledger, backfill, reader-window, or supported-client posture is incomplete.

## Verdicts

- `ROLLBACK_SAFE`: admissible and still inside a rollback-safe window.
- `FAIL_FORWARD_ONLY`: admissible only after the reader window closes, meaning rollback is no longer promised.
- `BLOCKED_PENDING_MIGRATION_LEDGER`: schema drift needs a numbered migration plan first.
- `BLOCKED_PENDING_BACKFILL`: backfill evidence is missing or incomplete.
- `BLOCKED_PENDING_READER_WINDOW`: destructive or narrowing drift is still inside an open compatibility window.
- `BLOCKED_PENDING_DOC_SYNC`: docs or bundled samples drift from the canonical schema.
- `BLOCKED_PENDING_BINDING_REGEN`: generated bindings are stale.
- `BLOCKED_PENDING_CLIENT_WINDOW`: candidate identity does not match the governed supported-client window.

## Commands

Generate or refresh the artifacts:

```bash
node --experimental-strip-types ./scripts/contracts/generate_migration_readiness_report.ts --emit
```

Verify the checked-in artifacts are still current:

```bash
node --experimental-strip-types ./scripts/contracts/generate_migration_readiness_report.ts --check
```

Fail the current run if schema drift is not admissible:

```bash
node --experimental-strip-types ./scripts/contracts/check_schema_drift.ts
```

## Outputs

- `data/contracts/schema_drift_report.json`
- `data/contracts/schema_bundle_compatibility_gate.materialized.json`
- `apps/operator-web/public/internal/schema-compatibility-atlas/data/schema-compatibility-atlas.json`
- `schemas/schema_drift_report.schema.json`

The atlas route is read-only. It renders from generated data and does not re-scan source at request time.

## Operational Notes

- A migration ledger without a completed backfill contract still blocks release evidence.
- Destructive changes on sealed-manifest paths become `FAIL_FORWARD_ONLY` only after the compatibility window closes.
- Docs-only edits are not automatically benign. If schema tokens, headings, or bundled samples drift, the report blocks until parity is restored.
- Generated bindings are evidence-bearing artifacts here; stale downstream code is a release blocker, not a warning to ignore.
