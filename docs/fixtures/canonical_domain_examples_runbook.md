# Canonical Domain Examples Runbook

`pc_0077` introduces a generator-owned synthetic-fixture cabinet under `fixtures/synthetic/`.
The goal is to keep embodiments, deterministic seeds, mirrored sample payloads, and deterministic-golden-pack inputs aligned in one reviewed source instead of scattering scenario logic across tests and docs.

## Source Of Truth

- Edit [`tools/fixtures/build_deterministic_fixture_pack.ts`](/Users/test/Code/taxat_/tools/fixtures/build_deterministic_fixture_pack.ts:1).
- Do not hand-edit files under [`fixtures/synthetic`](/Users/test/Code/taxat_/fixtures/synthetic:1).
- The operator atlas reads generated data from [`apps/operator-web/public/internal/canonical-domain-example-atlas/data/canonical-domain-example-atlas.json`](/Users/test/Code/taxat_/apps/operator-web/public/internal/canonical-domain-example-atlas/data/canonical-domain-example-atlas.json:1).

## Regeneration

Run:

```bash
node --experimental-strip-types ./tools/fixtures/build_deterministic_fixture_pack.ts --emit
```

Sync verification:

```bash
node --experimental-strip-types ./tools/fixtures/build_deterministic_fixture_pack.ts --check
```

## Change Rules

- Keep the minimum embodiment set `EMB-01` through `EMB-12` intact unless the corpus changes.
- Preserve privacy-safe posture: no real names, addresses, tax identifiers, credentials, or live timestamps.
- Use mirrored contract samples from `packages/contracts-core/samples` for schema-valid artifact anchors.
- When adding or changing a golden-pack participant, update both the seed material and the materialized pack logic in the generator.
- Keep traceability explicit:
  - embodiment -> test vectors
  - embodiment variant -> constraint refs
  - sample artifact -> schema ref
- Prefer version bumps to silent seed drift. If deterministic seed meaning changes, change the seed ref/version and record the new expected hash.

## Review Checklist

- The generated seed catalog is byte-stable across repeated runs.
- Every embodiment bundle still contains narrative, sample artifacts, expected gate outcomes, expected artifact refs, expected timeline, and expected query expectations.
- The generated seed material still produces a schema-valid `DeterministicGoldenPack`.
- The atlas still shows only synthetic content and remains read-only.

## Verification Commands

```bash
pnpm exec tsc --noEmit -p tsconfig.quality.json
node --experimental-strip-types ./tools/repository/verify_code_quality_coverage.ts --check
pnpm exec playwright test --config=playwright.config.ts --project=unit tests/unit/fixtures/deterministic_fixture_pack.spec.ts
pnpm exec playwright test --config=tests/integration/playwright.config.ts tests/integration/fixtures/embodiment_and_golden_pack_validation.spec.ts
pnpm exec playwright test --config=playwright.config.ts --project=browser tests/playwright/internal/canonical_domain_example_atlas.spec.ts
```
