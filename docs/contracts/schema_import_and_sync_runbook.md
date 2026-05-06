# Schema Import And Sync Runbook

## Purpose

`packages/contracts-core` is the canonical in-repo mirror of the authoritative `Algorithm/` contract bundle.
This is a mirrored import, not a schema rewrite.
The package preserves exact upstream schemas and bundled samples byte-for-byte, records source and destination hashes for every imported artifact, and keeps the Python validator entrypoints executable from inside the workspace.

The phase-02 bootstrap previously fixed the shared-contracts boundary as `packages/contracts-core`.
This runbook therefore records the explicit override `packages/contracts -> packages/contracts-core` instead of silently renaming the package back to a generic starter label.

## Imported Surfaces

- Schemas: `packages/contracts-core/schemas/*.schema.json`
- Samples: `packages/contracts-core/samples/sample_*.json`
- Mirrored validator entrypoints:
  - `packages/contracts-core/python/validate_contracts.py`
  - `packages/contracts-core/python/forensic_contract_guard.py`
- Machine-readable lineage:
  - `packages/contracts-core/data/schema_source_map.json`
  - `packages/contracts-core/data/sample_binding_map.json`
- TypeScript catalog:
  - `packages/contracts-core/src/schemaCatalog.ts`
- Internal reviewer surface:
  - `apps/operator-web/public/internal/schema-catalog-atlas/`

## Import Strategy

- Schemas and samples are copied directly from `Algorithm/schemas/` without normalization or filename changes.
- Source hashes and destination hashes are captured for every schema, sample, and validator artifact.
- The validator mirrors keep upstream logic authoritative and use only path-level adaptation:
  - imported schemas resolve from `packages/contracts-core/schemas`
  - imported samples resolve from `packages/contracts-core/samples`
  - README and contract-coherence checks still resolve against the source `Algorithm/` bundle
- Sample binding stays explicit through filename convention:
  `sample_<schema_stem>.json -> <schema_stem>.schema.json`

## Commands

- Emit or refresh the mirrored bundle:

```bash
node --experimental-strip-types tools/contracts/import_algorithm_contracts.ts --emit
```

- Verify stored source and destination hashes still match the filesystem:

```bash
python3 tools/contracts/sync_contract_hashes.py --check
```

- Run the imported validator self-test with the installed validator dependencies:

```bash
./.venv/bin/python3 packages/contracts-core/python/validate_contracts.py --self-test
```

- Run the imported forensic guard directly:

```bash
./.venv/bin/python3 packages/contracts-core/python/forensic_contract_guard.py
```

## Review Workflow

1. Re-run the importer.
2. Review `schema_source_map.json` for changed source hashes, schema ids, logical-family placement, or validator artifact hashes.
3. Review `sample_binding_map.json` for changed sample bindings or missing inferred schemas.
4. Run the hash checker and the imported validator self-test.
5. Inspect `/apps/operator-web/public/internal/schema-catalog-atlas/index.html` when you need a visual review of schema identity, hashes, samples, and validator entrypoints.

## Drift Rules

- Do not hand-edit files under `packages/contracts-core/schemas/` or `packages/contracts-core/samples/`.
- Upstream changes must be detected through source-hash drift or an importer diff, not by human memory.
- Duplicate schema ids, missing inferred schema bindings, and out-of-sync validator mirrors are treated as failures, not advisory warnings.
- Downstream TypeScript or codegen tasks should consume `@taxat/contracts-core` and its generated `schemaCatalog.ts` instead of reaching back into ad hoc `Algorithm/` paths.
