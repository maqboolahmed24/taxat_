# Taxat Python Validators

This boundary keeps Python tooling first-class inside the monorepo instead of treating the existing validator corpus as a temporary sidecar.

## Purpose

- host stable entrypoints for contract validation, forensic guards, and offline analysis helpers
- consume canonical schemas and generated fixtures without inventing a second model hierarchy
- remain runnable without Node-based transpilation or browser-only tooling assumptions

## Entry Points

- `python3 -m taxat_validators contracts`
- `python3 -m taxat_validators forensic`
- `python3 Algorithm/scripts/validate_contracts.py --self-test`
- `python3 Algorithm/tools/forensic_contract_guard.py`

## Layout

- `src/taxat_validators/cli.py`: lightweight bootstrap CLI that routes to the authoritative repo scripts
- `src/taxat_validators/__main__.py`: `python -m` entrypoint
- `pyproject.toml`: Python packaging and script metadata

The authoritative validator logic still lives under `Algorithm/` today. Future phase work can move shared Python helpers here without changing the public invocation surface.
