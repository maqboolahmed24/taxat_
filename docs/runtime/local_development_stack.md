# Local Development Stack

`pc_0078` defines one governed local runtime for Taxat. The objective is not "Docker works on my
machine"; it is one repeatable local topology that preserves the repo's durable-versus-disposable
law, deterministic seed basis, and smoke-ready bootstrap order.

## Canonical command

```bash
./scripts/local/bootstrap_local_stack.sh
```

The bootstrap script:

1. Starts the durable and disposable substrate services from `infra/local/compose.yaml`.
2. Waits for base-process health.
3. Runs the one-shot bootstrap helpers that create the local databases, buckets, queues, DLQs, and
   cache namespace sentinels.
4. Seeds the deterministic local runtime state from `config/runtime/local/local_seed_profiles.json`
   and `fixtures/synthetic/deterministic_golden_pack_seed.json`.
5. Runs semantic smoke and authoritative validators by default.
6. Verifies semantic readiness before host-run app and worker processes may start.

## Runtime profiles

- `local`
  Maps to `env_local_authoring`.
  Use this for repo-local authoring, replay-safe inspection, and deterministic fixture work.
- `devcontainer`
  Also maps to `env_local_authoring`.
  Use this when the repo runs inside a local containerized workstation but still stays provider-free.
- `local-provisioning`
  Maps to `env_local_provisioning_workstation`.
  Use this only when you intentionally need sandbox-profile runtime resolution for provisioning-side
  tooling.

Anything else fails closed.

## Durable versus disposable

Durable local truth:

- PostgreSQL `taxat_control`
- PostgreSQL `taxat_audit`
- MinIO buckets for upload staging, retained evidence, authority payloads, quarantine, previews,
  exports, and restore archives

Disposable local acceleration:

- RabbitMQ queues and DLQs
- Redis cache and resume namespaces

Protected reset rules:

- `--reset-disposable`
  Purges RabbitMQ and Redis volumes only.
- `--full-reset --confirm-durable-reset`
  Also purges PostgreSQL and MinIO volumes.
  This is intentionally noisy because deleting durable local truth must never look like a harmless
  cache clear.

## Bootstrap helpers

- `scripts/local/wait_for_local_stack_ready.py`
  Evaluates base or semantic readiness from compose status plus the local state manifest.
- `scripts/local/seed_local_runtime.py`
  Writes the deterministic local state manifest and imports the reviewed fixture basis.
- `scripts/local/smoke_local_runtime.py`
  Exercises northbound receipt, queue, object-store, cache, and append-only audit foundations, then
  runs authoritative validators by default.

The state manifest lives outside the repo by default at `$HOME/.taxat/local-runtime`.

## Semantic readiness

Semantic readiness requires more than open ports. The health contract in
`infra/local/service_health_contract.json` proves:

- current schema bundle alignment
- audit appendability
- bucket presence
- queue namespace presence
- cache namespace presence
- seed profile application
- validator status
- smoke-path success

Until those markers are present, `APP` and `WORKERS` remain blocked host-process gates.

## Provider posture

The local stack uses governed compatibility layers instead of pretending cloud providers are locally
available:

- PostgreSQL remains PostgreSQL locally.
- MinIO is the explicit S3-compatible local emulation.
- RabbitMQ quorum queues are the explicit local broker emulation.
- Redis is the explicit local cache/resume emulation.
- Optional OTLP export remains disabled by default behind `feature.local.optional-otel`.

Live HMRC or production credentials never belong in compose or seed files.

## Focused commands

Plan only:

```bash
./scripts/local/bootstrap_local_stack.sh --plan-only
```

Seed only:

```bash
python3 ./scripts/local/seed_local_runtime.py --runtime-profile local --state-dir "$HOME/.taxat/local-runtime"
```

Smoke without authoritative validators:

```bash
python3 ./scripts/local/smoke_local_runtime.py --state-dir "$HOME/.taxat/local-runtime" --skip-authoritative-validators
```

Semantic readiness from a live compose stack:

```bash
python3 ./scripts/local/wait_for_local_stack_ready.py --readiness-class SEMANTIC --state-dir "$HOME/.taxat/local-runtime"
```

## Internal observatory

- Route metadata: `apps/operator-web/src/routes/internal/local-runtime-observatory.tsx`
- Static viewer: `apps/operator-web/public/internal/local-runtime-observatory/index.html`
- Generated data: `apps/operator-web/public/internal/local-runtime-observatory/data/local-runtime-observatory.json`

The observatory is read-only. It explains service class, provider posture, persistence class,
bootstrap dependencies, readiness codes, and rebuild guidance without exposing secrets or container
controls.
