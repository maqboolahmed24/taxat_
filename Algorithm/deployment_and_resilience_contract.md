# Deployment and Resilience Contract

## Purpose

The blueprint defines the engine's logical flow and internal correctness properties, but a production
system also needs an explicit runtime topology, promotion model, migration strategy, and disaster
recovery posture. This contract defines those broader-product requirements.

## 1. Reference runtime topology

The recommended production topology contains the following bounded components:

1. **Operator access layer** - signed/notarized macOS workspace and/or browser surfaces plus the
   northbound API / session gateway; receives operator/service commands, serves read surfaces, and
   governs reconnect-safe session restore.
2. **Manifest orchestrator** - the single durable command-side control plane per manifest.
3. **Stage workers** - stateless workers for collection, normalization, graph, projection, and
   authority-adjacent tasks.
4. **Controlled authority gateway** - isolates provider-specific transport and callback handling.
5. **Read-side projector / stream broker** - materializes `DecisionBundle`, `ExperienceDelta`, and
   other disposable projections.
6. **Primary control store** - relational/transactional source of truth for manifests, gate records,
   receipts, and workflow state.
7. **Append-only audit store** - immutable or append-only evidence for compliance-significant events.
8. **Object store** - payload/evidence/artifact bodies referenced by immutable refs.
9. **Queue / broker** - delivery fabric for outbox and worker coordination.
10. **Token vault + KMS/HSM** - isolated secret, token, and key management boundary.
11. **Desktop release/update channel** - staged distribution, compatibility policy, and emergency
    pin/rollback control for the macOS workspace.

Topology rules:

- the queue/broker SHALL NOT be the system of record for legal truth;
- read models and caches SHALL be disposable and rebuildable from persisted truth;
- desktop caches SHALL be disposable and rebuildable from persisted truth after revocation,
  corruption, or schema drift;
- the outbox/inbox pattern means queue loss is recoverable from durable stores;
- audit evidence SHALL remain append-only even when read models are rebuilt or releases roll back.

## 2. Promotion pipeline

Every release SHALL pass through explicit promotion stages:

1. build, sign, and notarize `BuildArtifact` outputs, including the macOS workspace where shipped
2. verify schema-bundle compatibility and migration plan
3. run deterministic test, contract, sandbox, security, and restore gates
4. verify server/API compatibility across the supported native desktop client window
5. deploy to pre-production with production-like secrets/network policy
6. run canary promotion against a bounded slice of traffic/workers and operator clients
7. promote globally only if health gates remain green
8. preserve rollback/fail-forward instructions as part of the `DeploymentRelease` record

A release SHALL never rely on "deploy and see" as the first compatibility check.

## 3. Schema and datastore migration rules

The broader product SHALL support change without corrupting in-flight manifests.

- schema and datastore changes SHALL use an **expand -> migrate/backfill -> contract** pattern;
- new writers SHALL remain compatible with the previous reader window until rollback is no longer
  needed;
- sealed or in-progress manifests SHALL continue under their frozen `schema_bundle_hash` and config
  references even if the default live bundle advances;
- destructive contracts, dropped columns, or meaning-changing rewrites SHALL NOT occur while manifests
  that depend on the older shape may still replay or reconcile;
- backfills SHALL be idempotent and recorded in `SchemaMigrationLedger`;
- rollback is allowed only when compatibility guarantees still hold; otherwise the system SHALL use a
  forward fix while preserving prior truth.

## 4. Recovery tiers and targets

Default broader-product recovery classes, unless a stricter tenant/compliance profile overrides them:

- **Tier 0** - manifest control data, authority interaction records, command receipts, audit evidence,
  token-vault metadata: target `RPO <= 15 minutes`, `RTO <= 60 minutes`
- **Tier 1** - workflow state, read-side projections, derived indices: target `RPO <= 4 hours`,
  `RTO <= 4 hours`
- **Tier 2** - disposable caches, CDN artifacts, temporary staging data: best-effort `RPO`,
  `RTO <= 24 hours`

If a platform cannot meet a tier target, the gap SHALL be explicit and SHALL block claims of
production readiness for the affected workload class.

## 5. Backup, restore, and DR rules

The broader product SHALL treat restore as a rehearsed capability, not a theoretical option.

- `RecoveryCheckpoint` SHALL be created and inventory-linked on a scheduled cadence by tier;
- restore drills SHALL verify control store, audit store, object store, and secret metadata recovery;
- queues MAY be rebuilt from outbox/inbox truth rather than snapshotted as primary assets;
- restore SHALL include validation of audit-hash continuity, manifest replayability, and enquiry-pack
  limitation propagation;
- restore of environments containing previously erased data SHALL trigger a privacy reconciliation pass
  before normal user access is reopened;
- failover and failback SHALL be auditable events with explicit operator ownership.

## 6. Rollout, rollback, and fail-forward posture

The broader product SHALL distinguish code rollback from legal/compliance rollback.

- application release rollback MAY occur only when datastore and schema compatibility allow it;
- legal authority truth, audit history, and submitted artifacts SHALL never be "rolled back" by
  deleting evidence;
- where schema or external state makes code rollback unsafe, the sanctioned path is fail-forward with a
  compensating release and explicit operator runbook;
- canary aborts SHALL preserve the prior release as the serving baseline and SHALL not leave the queue,
  stream broker, or migration state half-promoted.

## 7. Minimum operational runbooks

At minimum, production SHALL maintain rehearsed runbooks for:

- authority-provider degradation or prolonged `UNKNOWN`/`PENDING` states
- queue backlog and outbox drain failure
- stream broker resume-token corruption or frame-epoch rebase storm
- desktop cache corruption, forced rebase storm, or local persistence migration failure
- secret/key rotation emergency
- canary abort and global rollback/fail-forward
- backup restore and DR failover/failback
- post-restore privacy reconciliation
- schema migration halt/retry/recover

## 8. Release and resilience invariants

1. no production promotion without a recorded `DeploymentRelease`
2. no migration without a reversible or fail-forward-compatible plan
3. no queue dependency that makes durable truth unrecoverable after broker loss
4. no restore declared successful until audit continuity and privacy reconciliation are verified
5. no rollback that rewrites or obscures already-persisted legal/compliance evidence
6. no desktop rollout without a documented compatibility window and emergency disable/pin path

## 9. One-sentence summary

The deployment and resilience contract makes the algorithm operable by defining how releases, schema
change, rollback, and disaster recovery work without violating manifest, audit, or privacy guarantees.
