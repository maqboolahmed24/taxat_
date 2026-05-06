# Contract Integrity And Traceability CI Gate

This gate turns the live Algorithm contract validator and forensic guard into one merge-blocking path for local development and GitHub Actions.

## Source Of Truth

- Local entrypoint: [scripts/ci/run_contract_integrity_gate.sh](../../scripts/ci/run_contract_integrity_gate.sh)
- CI workflow: [.github/workflows/contract-integrity.yml](../../.github/workflows/contract-integrity.yml)
- Package script: `pnpm run contract-integrity`
- Validator: [Algorithm/scripts/validate_contracts.py](../../Algorithm/scripts/validate_contracts.py)
- Forensic guard: [Algorithm/tools/forensic_contract_guard.py](../../Algorithm/tools/forensic_contract_guard.py)
- Live register: [Algorithm/constraint_traceability_register.json](../../Algorithm/constraint_traceability_register.json)
- Human index: [Algorithm/constraint_coverage_index.md](../../Algorithm/constraint_coverage_index.md)
- Register schema: [Algorithm/schemas/constraint_traceability_register.schema.json](../../Algorithm/schemas/constraint_traceability_register.schema.json)

## Blocking Policy

The GitHub workflow runs on every pull request, every push to `main`, every push to `release/**`, and manual dispatch. The job is blocking in all of those modes; there is no advisory-only contract-integrity lane.

The workflow installs only the validator dependencies from [Algorithm/requirements-dev.txt](../../Algorithm/requirements-dev.txt), then invokes the same shell entrypoint contributors run locally. The gate itself does not fetch internet resources and only reads repository truth.

## Local Command

Run:

```sh
pnpm run contract-integrity
```

For a fast wiring check without executing the validators:

```sh
pnpm run contract-integrity:dry-run
```

The wrapper prefers `./.venv/bin/python3` when present and otherwise falls back to `python3`. It sets `PYTHONDONTWRITEBYTECODE=1`, `PYTHONHASHSEED=0`, and `PYTHONUTF8=1` so local and CI runs do not leave bytecode artifacts or depend on hash randomization.

## Enforced Coherence

The gate fails closed through the validator and forensic guard when:

- `constraint_id` rows in the live register are duplicated or out of order
- the live register omits required traceability spine fields
- enforcement refs omit `scripts/validate_contracts.py` or `tools/forensic_contract_guard.py`
- required terms are absent from any traced authoritative, downstream, example, or historical path
- live constraint names drift into stale-defect phrasing
- [Algorithm/README.md](../../Algorithm/README.md) advertises bare non-runnable validator or forensic guard paths
- [Algorithm/constraint_coverage_index.md](../../Algorithm/constraint_coverage_index.md) no longer mirrors [Algorithm/constraint_traceability_register.json](../../Algorithm/constraint_traceability_register.json)

Historical forensic records stay in [Algorithm/AUDIT_FINDINGS.md](../../Algorithm/AUDIT_FINDINGS.md), [Algorithm/PATCH_RESOLUTION_INDEX.md](../../Algorithm/PATCH_RESOLUTION_INDEX.md), and [Algorithm/contract_integrity_requirements.md](../../Algorithm/contract_integrity_requirements.md). They are not live constraint rows.

## Same-Change-Set Rule

[Algorithm/architecture_coherence_guardrails.md](../../Algorithm/architecture_coherence_guardrails.md) requires live named constraint changes to move with the register, the human index, and every listed downstream surface. The CI gate enforces that mechanically because any partial update produces register/index path-set drift, missing terms, or unresolved traceability refs.

## Failure Output

The wrapper prints the exact failing validator or forensic-guard output. In GitHub Actions it also emits a job annotation with the first failing rule so reviewers can jump from the summary to the grouped log.
