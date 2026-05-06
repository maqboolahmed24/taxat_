# Language Binding Generation Runbook

## Purpose

`packages/contracts-core` remains the canonical contract authority.
`tools/contracts/generate_language_bindings.ts` generates downstream TypeScript, Python, and selected Swift bindings so repo consumers do not hand-translate the JSON schema bundle.

## Generated Outputs

- `packages/generated-models/src/generated/typescript/`
- `python/generated_contract_models/src/taxat_generated_contract_models/generated/`
- `native/TaxatOperator/GeneratedContracts/Sources/GeneratedContracts/Generated/`
- `data/contracts/binding_coverage_report.json`
- `data/contracts/binding_gap_register.json`
- `apps/operator-web/public/internal/binding-coverage-atlas/data/binding-coverage-atlas.json`

These outputs are committed to source control.
They are downstream-only and must not accumulate business logic or manual semantic patches.

## Policy Sources

- `config/contracts/binding_generation_matrix.json`
- `config/contracts/binding_naming_and_decimal_policy.json`

The matrix declares family-by-language coverage, tool IDs, output roots, and whether a language posture is full-corpus, selected-subset, or not targeted.
The naming and decimal policy freezes exact-decimal aliases, date-time string posture, reserved-word handling, and manual-adapter boundaries.

## Generation Commands

Run the full contract pipeline:

```sh
npm run generate
```

Run only language binding generation:

```sh
node --experimental-strip-types ./tools/contracts/generate_language_bindings.ts --emit
```

Verify committed outputs are synchronized:

```sh
node --experimental-strip-types ./tools/contracts/generate_language_bindings.ts --check
```

## Coverage Posture

- `TYPESCRIPT`: full family coverage for repo runtime and product packages
- `PYTHON`: full family coverage for validator-adjacent tooling
- `SWIFT`: selected native subset only
- `GAP_REGISTRY`: typed ledger for generator limitations and non-targeted native families

Exact decimals remain string aliases in every generated language surface.
Runtime validation remains canonical in `packages/contracts-core` and the imported Python validator scripts.

## Manual Adapters

Manual wrappers belong outside generated directories:

- TypeScript wrappers belong in runtime or app packages
- Python wrappers belong in tooling or validator-adjacent packages
- Swift wrappers belong outside the `GeneratedContracts` target

If a generator cannot express a schema feature faithfully, record the posture in `data/contracts/binding_gap_register.json` instead of patching the generated file by hand.

## Verification

Representative verification commands:

```sh
node --experimental-strip-types ./tools/contracts/generate_language_bindings.ts --check
python3 -m py_compile python/generated_contract_models/src/taxat_generated_contract_models/generated/*.py
swift test --package-path native/TaxatOperator
playwright test --config=playwright.config.ts --project=browser tests/playwright/internal/binding_coverage_atlas.spec.ts
playwright test --config=tests/integration/playwright.config.ts tests/integration/contracts/generate_language_bindings.spec.ts
```
