# Generated Contract Observatory

## Purpose

`apps/operator-web/public/internal/contracts-observatory/` is the canonical internal contract library for Taxat.
It does not replace the authoritative corpus.
Instead, it synthesizes the authoritative `Algorithm/` markdown corpus, support runbooks, imported schema mirror, workspace-local schemas, bundled samples, validator entrypoints, generated binding coverage, schema-drift readiness, and roadmap task traceability into one read-only inspection surface.

The observatory exists to answer questions like:

- what is authoritative for this concept
- which schema and sample back this heading
- which validator or binding family consumes this schema
- which cards or runbooks touch this artifact
- whether current release-readiness posture is in sync with the schema surface

## Generated Inputs

The generator reads from:

- `config/docs/contracts_site_manifest.json`
- `config/docs/contracts_navigation_schema.json`
- `Algorithm/*.md`
- `docs/**/*.md`
- active and completed `PROMPT/CARDS/pc_*.md`
- `packages/contracts-core/schemas/*.schema.json`
- `packages/contracts-core/samples/sample_*.json`
- `packages/contracts-core/python/*.py`
- `schemas/*.schema.json`
- `config/**/*.schema.json`
- `packages/contracts-core/data/schema_source_map.json`
- `data/contracts/binding_coverage_report.json`
- `data/contracts/schema_drift_report.json`

## Generated Outputs

The generator materializes:

- `apps/operator-web/public/internal/contracts-observatory/data/site-manifest.json`
- `apps/operator-web/public/internal/contracts-observatory/data/navigation-index.json`
- `apps/operator-web/public/internal/contracts-observatory/data/search-index.json`
- `apps/operator-web/public/internal/contracts-observatory/data/schema-crosslink-graph.json`
- `apps/operator-web/public/internal/contracts-observatory/data/binding-catalog.json`
- `apps/operator-web/public/internal/contracts-observatory/data/artifacts/*.json`

The authored shell lives beside those payloads:

- `apps/operator-web/public/internal/contracts-observatory/index.html`
- `apps/operator-web/public/internal/contracts-observatory/styles.css`
- `apps/operator-web/public/internal/contracts-observatory/app.js`

## Commands

Emit or refresh the observatory payload:

```bash
node --experimental-strip-types packages/contracts-docs/src/generate_contract_observatory.ts --emit
```

Verify the checked-in payload stays in sync:

```bash
node --experimental-strip-types packages/contracts-docs/src/generate_contract_observatory.ts --check
```

Open the internal browser surface during local review:

```text
/apps/operator-web/public/internal/contracts-observatory/index.html
```

## Validation Posture

The generator fails closed when authoritative `Algorithm/` documents introduce:

- broken relative links
- unresolved schema tokens
- orphan sample-to-schema bindings
- stale binding coverage relative to the importer-recorded schema source map hash

Prompt cards remain traceability inputs instead of build-blocking authoritative docs.
Their links and planned future schema tokens are surfaced for search and cross-reference without blocking the observatory build.

Repeated heading text inside one file is normalized into deterministic suffixed anchor slugs rather than collapsing or silently overwriting anchors.

## Review Workflow

1. Run the observatory generator with `--emit`.
2. Run the targeted integration and browser tests.
3. Inspect command search, source-truth stack, and one schema-with-sample deep link in the browser.
4. Re-run `--check` before closing the task so the generated payload remains byte-stable.
