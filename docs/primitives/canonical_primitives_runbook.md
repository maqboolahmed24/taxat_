# Canonical Primitives Runbook

## Purpose

The canonical primitives layer gives the repo one shared implementation for:

- identifier branding
- canonical hashing
- exact-decimal parsing and arithmetic
- time normalization

This layer exists so later services, workers, generated binding adapters, viewers, and validation tools do not silently re-derive these rules from memory.

## Source Of Truth

Machine-readable profiles live in:

- `config/primitives/identifier_family_catalog.json`
- `config/primitives/hash_profile.json`
- `config/primitives/decimal_profile.json`
- `config/primitives/time_profile.json`

The TypeScript runtime helpers live in:

- `packages/domain-kernel/src/primitives/identifier.ts`
- `packages/domain-kernel/src/primitives/hash.ts`
- `packages/domain-kernel/src/primitives/decimal.ts`
- `packages/domain-kernel/src/primitives/time.ts`

Python parity lives in:

- `python/validators/src/taxat_validators/primitives.py`

The read-only inspection surface lives in:

- `apps/operator-web/public/internal/canonical-primitives-atlas/`

## Family Rules

### Identifiers

- IDs, refs, hashes, and route tokens stay contract-shaped strings.
- The shared layer only rejects empty or non-string input.
- Do not add regex folklore such as “must be UUID” or “must be slug-safe” unless a specific schema requires it.

### Hashes

- Canonical digests use SHA-256 over canonical JSON.
- Strings normalize to Unicode NFC before hashing.
- Object keys sort lexicographically.
- Arrays preserve declared order by default.
- Set-like arrays must be sorted explicitly by the caller before hashing.
- Optional identity values use the sentinel `"<NONE>"` when absent.

### Exact Decimals

- Canonical decimal input must be a string.
- Exponent notation is forbidden.
- Locale separators are forbidden.
- Negative-zero serialization is forbidden.
- Runtime representation is unscaled integer plus explicit scale.
- Numeric equality and representational equality are intentionally different checks.

### Time

- Canonical instants must include `Z` or an explicit offset.
- Canonical instant output is always UTC and uses `YYYY-MM-DDTHH:MM:SS[.mmm]Z`.
- Business dates stay plain `YYYY-MM-DD` strings.
- Business periods stay typed as `CALENDAR_MONTH`, `CALENDAR_QUARTER`, or `TAX_YEAR`.
- Human display formatting must always provide explicit `locale` and `timeZone`.

## Forbidden Helper Patterns

- Do not coerce numbers into identifiers.
- Do not hash pretty-printed JSON, locale-formatted strings, or unstable object traversal.
- Do not convert exact decimals to JS numbers or Python floats for contract truth.
- Do not accept timezone-free instants in canonical helpers.
- Do not use ambient locale or ambient machine timezone as a display default.

## Atlas Generation

Emit the atlas payload:

```bash
node --experimental-strip-types ./packages/domain-kernel/src/primitives/build_canonical_primitives_atlas.ts --emit
```

Verify the committed payload is in sync:

```bash
node --experimental-strip-types ./packages/domain-kernel/src/primitives/build_canonical_primitives_atlas.ts --check
```

The generator:

- validates the primitive profile schemas
- verifies example vectors against the shared TypeScript primitives
- checks cross-language parity against `taxat_validators.primitives`
- checks authority hash parity against `Algorithm/scripts/validate_contracts.py`
- emits `apps/operator-web/public/internal/canonical-primitives-atlas/data/canonical-primitives-atlas.json`

## Validation

Run the targeted checks:

```bash
node --experimental-strip-types ./packages/domain-kernel/src/primitives/build_canonical_primitives_atlas.ts --check
node --check ./apps/operator-web/public/internal/canonical-primitives-atlas/app.js
./.venv/bin/python3 -m py_compile ./python/validators/src/taxat_validators/primitives.py
pnpm exec pyright --project pyrightconfig.json
./node_modules/.bin/playwright test --config=playwright.config.ts --project=unit ./tests/unit/primitives/hash_decimal_time.spec.ts
./node_modules/.bin/playwright test --config=tests/integration/playwright.config.ts ./tests/integration/primitives/cross_language_parity.spec.ts
./node_modules/.bin/playwright test --config=playwright.config.ts --project=browser ./tests/playwright/internal/canonical_primitives_atlas.spec.ts
```

## Operational Guidance

- Prefer the shared helpers over package-local utility functions.
- If a schema needs stricter identifier grammar, add that rule in the schema-specific boundary rather than here.
- If a later authority hash formula changes, update the shared hash helpers and re-run parity checks against the validator oracle immediately.
- If a later viewer needs primitive examples, read the generated atlas payload instead of copying literals into another hand-maintained data file.
