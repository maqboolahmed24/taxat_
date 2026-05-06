# Task Runner And Agent Entrypoints

`pc_0082` defines one canonical command grammar for the repository. The authoritative public
surface is `make`. The machine-readable substrate is:

- `scripts/tasks/task_catalog.json`
- `scripts/tasks/task_graph.py`
- `scripts/agent/bootstrap_agent_workspace.sh`
- `scripts/agent/run_card_task.sh`
- `scripts/agent/verify_card_evidence.sh`
- `scripts/agent/resolve_environment_profile.py`

The point is not to hide the underlying scripts. The point is to stop humans, CI jobs, and
autonomous agents from guessing which script chain is authoritative for bootstrap, validation,
local-runtime work, ephemeral environments, docs generation, drift checks, and evidence capture.

## Authority

- Public interface: `make`
- Dependency resolution, alias handling, and dry-run planning: `python3 scripts/tasks/task_graph.py`
- Agent-safe non-interactive wrappers: `scripts/agent/*`

Do not invent a second task grammar in READMEs, CI YAML, or prompt cards. If a workflow matters, it
must be representable through the catalog and reachable through the Makefile.

## Namespace Grammar

- `bootstrap.*`
  Workspace bootstrap and install posture.
- `validate.*`
  Contract validators and repo quality gates.
- `docs.*`
  Contract observatory generation and sync checks.
- `drift.*`
  Schema-drift and migration-readiness posture.
- `local.*`
  Governed local runtime planning, bootstrap, and resets.
- `ephemeral.*`
  Ephemeral environment bootstrap, reset, and destroy.
- `test.*`
  Repository task-surface unit, integration, and smoke checks.
- `release.*`
  Aggregated readiness gates.
- `agent.*`
  Card-aware agent wrappers and evidence verification.

## Common Flags

Top-level `make` variables:

- `PROFILE`
  Environment profile. Defaults to `ci-validation`.
- `DRY_RUN=1`
  Resolve dependencies and commands without mutating resources.
- `VERBOSE=1`
  Preserve command stdout/stderr instead of summarizing only the plan/result files.
- `KEEP_GOING=1`
  Continue after a failing task instead of fail-fast behavior.
- `JSON=1`
  Emit pure JSON instead of machine-event lines.
- `ACK_TOKEN=...`
  Required for destructive tasks.
- `PARAMS="key=value ..."`
  Structured task params for ephemeral workflows or card-aware runs.
- `CARD_ID=pc_####`
  Required for `make agent.run-card` and `make agent.verify-evidence`.

Task graph CLI equivalents:

```bash
python3 ./scripts/tasks/task_graph.py --json list
python3 ./scripts/tasks/task_graph.py --json resolve --task-ref docs.generate --profile ci-validation
python3 ./scripts/tasks/task_graph.py --json run --task-ref release.readiness --profile ci-validation --dry-run
```

## Environment Profiles

- `local`
  Maps to `env_local_authoring` with runtime profile `local`.
- `devcontainer`
  Maps to `env_local_authoring` with runtime profile `devcontainer`.
- `local-provisioning`
  Maps to `env_local_provisioning_workstation` with runtime profile `local-provisioning`.
- `ci-validation`
  Maps to `env_ci_ephemeral_validation`; validation-only for destructive posture.
- `preview-review`
  Maps to `env_ephemeral_review_preview`; validation-only for destructive posture.
- `local-high-fidelity`
  Maps to `env_local_authoring` with `LOCAL_HIGH_FIDELITY_SHARD` semantics.

Profile resolution is explicit. The resolver combines `task_catalog.json`,
`config/runtime/local/provider_overrides.json`, `config/runtime/provider_environment_matrix.json`,
and `infra/test/ephemeral_environment_catalog.json`. It fails closed when:

- the profile does not support the task
- a destructive task is attempted from a validation-only profile
- a typed confirmation token is missing for a destructive task
- runtime profile to environment mapping has drifted from the authoritative runtime contracts

## Dangerous Task Acknowledgement

Dry-run mode is always safe and non-mutating, even for destructive tasks:

```bash
make local.reset.full PROFILE=local DRY_RUN=1 JSON=1
```

Real destructive execution requires both a supported profile and the exact typed acknowledgement:

- `ALLOW_DISPOSABLE_LOCAL_RESET`
- `ALLOW_DURABLE_LOCAL_RESET`
- `ALLOW_EPHEMERAL_RESET`
- `ALLOW_EPHEMERAL_DESTROY`

Example:

```bash
make local.reset.full PROFILE=local ACK_TOKEN=ALLOW_DURABLE_LOCAL_RESET
```

## Canonical Commands

Workspace bootstrap:

```bash
make bootstrap.workspace PROFILE=ci-validation DRY_RUN=1
make agent.bootstrap PROFILE=ci-validation DRY_RUN=1 JSON=1
```

Authoritative validator reachability:

```bash
make validate.contracts
make validate.repo
```

Contract observatory and drift:

```bash
make docs.generate PROFILE=ci-validation DRY_RUN=1
make docs.check PROFILE=ci-validation
make drift.report PROFILE=ci-validation
make drift.check PROFILE=ci-validation
make release.readiness PROFILE=ci-validation DRY_RUN=1
```

Local runtime:

```bash
make local.plan PROFILE=local
make local.bootstrap PROFILE=local
make local.reset.disposable PROFILE=local ACK_TOKEN=ALLOW_DISPOSABLE_LOCAL_RESET
make local.reset.full PROFILE=local ACK_TOKEN=ALLOW_DURABLE_LOCAL_RESET
```

Ephemeral environments:

```bash
make ephemeral.bootstrap PROFILE=ci-validation \
  PARAMS="environment_id=env-ephemeral-ci-001 owner_ref=ci.run.repo shard_ref=shard-a state_dir=.tmp/ephemeral"

make ephemeral.reset PROFILE=local-high-fidelity \
  ACK_TOKEN=ALLOW_EPHEMERAL_RESET \
  PARAMS="environment_id=env-ephemeral-local-001 state_dir=.tmp/ephemeral reset_scope=FULL_TEST_ISOLATION"

make ephemeral.destroy PROFILE=local-high-fidelity \
  ACK_TOKEN=ALLOW_EPHEMERAL_DESTROY \
  PARAMS="environment_id=env-ephemeral-local-001 state_dir=.tmp/ephemeral"
```

Card-aware agent workflows:

```bash
make agent.run-card CARD_ID=pc_0082 PROFILE=ci-validation DRY_RUN=1 JSON=1
make agent.verify-evidence CARD_ID=pc_0082 JSON=1
```

## Output Layout

The task runner writes deterministic plan and result files under `.tmp/task-runner`:

- `plans/<task-ref>.json`
- `results/<task-ref>.json`
- `logs/stdout/<task-ref>.log`
- `logs/stderr/<task-ref>.log`

This layout is stable on purpose so later automation can consume "last plan" and "last result"
without scraping terminal output.

## Preconditions

Tasks that operate on ephemeral environments require a semantically healthy local substrate. The
task graph checks `$TAXAT_LOCAL_STATE_DIR/local_runtime_state.json` or
`$HOME/.taxat/local-runtime/local_runtime_state.json` unless `PARAMS` provides
`local_state_dir=...`.

The precondition is strict:

- `validator_status` must be `PASSED`
- smoke paths `command_path`, `queue_path`, `object_store_path`, `cache_path`, and `audit_path`
  must all be `PASS`

Missing or stale local readiness is a hard stop, not a warning.

## Card Bindings

`task_catalog.json` contains `cardBindings` for the current roadmap block. A card binding maps:

- execution task families
- verification task families
- evidence globs
- checklist states the wrapper may inspect

Unknown card IDs fail closed. This is intentional: agents should never guess a task family from a
card slug when the catalog can say so explicitly.
