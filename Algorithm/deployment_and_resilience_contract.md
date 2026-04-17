# Deployment and Resilience Contract

## Purpose

The core architecture defines the engine's logical flow and internal correctness properties, but a production
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
- the read-side projector / stream broker SHALL derive `DecisionBundle`, `ExperienceDelta`,
  `LowNoiseExperienceFrame`, portal workspaces, and other UX surfaces from durable command-side
  artifacts only; it SHALL NOT upgrade lifecycle, gate, workflow, or authority posture from prior
  projections, caches, or repair-time heuristics
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

`BuildArtifact`, `DeploymentRelease`, `SchemaMigrationLedger`, `RecoveryCheckpoint`, and
`ReleaseVerificationManifest` SHALL validate against dedicated JSON schemas in `schemas/`. Promotion
evidence SHALL be bound to the exact candidate through `ReleaseVerificationManifest`; it SHALL NOT be
assembled ad hoc from mixed suite outputs after the fact.
Promotion identity arrays (`distribution_targets[]`, enabled provider-profile refs, executed test-run
identifiers, and migration-ledger refs) SHALL use a canonical frozen order so candidate hashes and
promotion manifests remain byte-stable across reruns and replay.
Suite-family identity dimensions SHALL remain explicit inside that candidate evidence:
authority-sandbox verification SHALL retain the enabled provider-profile set it exercised,
operator-client verification SHALL retain the supported client window it judged, and desktop
notarization or hardened-runtime evidence SHALL appear only when the candidate actually ships the
macOS target.

A release SHALL never rely on "deploy and see" as the first compatibility check.

## 3. Schema and datastore migration rules

The broader product SHALL support change without corrupting in-flight manifests.

- schema and datastore changes SHALL use an **expand -> migrate/backfill -> contract** pattern;
- new writers SHALL remain compatible with the previous reader window until rollback is no longer
  needed;
- the active writer bundle, supported-reader set, protected historical bundle set, destructive
  contract posture, rollback boundary, fail-forward posture, and replay/restore readability SHALL be
  persisted as `schema_reader_window_contract{...}` on schema bundles, manifests, migration ledgers,
  releases, verification evidence, restore drills, and release-verification manifests;
- release-verification evidence, gate-admissibility evidence, client-compatibility evidence, release
  manifests, and `DeploymentRelease` SHALL also embed one shared
  `schema_bundle_compatibility_gate_contract{...}` plus its canonical `compatibility_gate_hash` so
  candidate-bound proof includes reader-window state, historical-manifest protection,
  replay/restore safety, migration chronology, supported native client window posture, and
  rollback-vs-fail-forward posture rather than only the static writer bundle hash;
- `ReleaseVerificationManifest` SHALL additionally persist one
  `manifest_assembly_contract{...}` so blocking gate rows, test-run sets, migration-ledger sets,
  restore pairing, canary evidence, client-compatibility evidence, and approval or supersession
  posture are all assembled from first-class evidence under one deterministic contract instead of
  reconstructed from deploy-time logs;
- sealed or in-progress manifests SHALL continue under their frozen `schema_bundle_hash` and config
  references even if the default live bundle advances;
- destructive contracts, dropped columns, or meaning-changing rewrites SHALL NOT occur while manifests
  that depend on the older shape may still replay or reconcile;
- backfills SHALL be idempotent and recorded in `SchemaMigrationLedger.backfill_execution_contract{...}`;
- `SchemaMigrationLedger` SHALL retain `target_schema_bundle_hash`, one shared
  `schema_reader_window_contract{...}`, and one shared `backfill_execution_contract{...}` so expand,
  verify, contract, rollback-safe, and fail-forward posture are machine-readable rather than
  operationally assumed;
- migration ledgers SHALL preserve phase chronology and explicit halt/failure posture; optional
  contract phases SHALL never drift into `CONTRACTING` or `CONTRACTED`, and verified timestamps
  SHALL remain bound to post-verification phases only;
- server-side schema promotion SHALL include the supported native client window as part of the
  blocking compatibility boundary; a `ClientCompatibilityMatrix` or operator-client gate cannot
  remain green once the shared compatibility gate records `native_client_window_state = BLOCKED`;
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

`RecoveryCheckpoint` and `DeploymentRelease` SHALL both embed the shared
`recovery_governance_contract{...}` so workload criticality, tier class, and rollback or reopen
policy are frozen in the persisted control objects instead of being inferred from prose or runbook
defaults. `CONTROL_PLANE_LEGAL_TRUTH` SHALL therefore remain pinned to
`TIER_0_CONTROL_PLANE`, `RPO_15M`, and `RTO_60M`; control-plane artifacts SHALL NOT serialize a
weaker class.

## 5. Backup, restore, and DR rules

The broader product SHALL treat restore as a rehearsed capability, not a theoretical option.

- `RecoveryCheckpoint` SHALL be created and inventory-linked on a scheduled cadence by tier;
- restore drills SHALL verify control store, audit store, object store, and secret metadata recovery;
- restore drills used for promotion or DR claims SHALL record the exact checkpoint, outcome, and
  verification basis through `RecoveryCheckpoint`, `RestoreDrillResult`, and
  `ReleaseVerificationManifest`; `RestoreDrillResult` SHALL therefore retain the exact tested
  build/runtime boundary tuple (`build_artifact_ref`, `artifact_digest`, `schema_bundle_hash`,
  `config_bundle_hash`, `schema_reader_window_contract{...}`, `migration_plan_ref`,
  `enabled_provider_profile_refs[]`, and `candidate_identity_hash`) through the shared
  `release_candidate_identity_contract`, and the promotion manifest SHALL persist both
  `restore_drill_ref` and `restore_checkpoint_ref`;
- a checkpoint SHALL not claim `VERIFIED` posture without bound restore evidence, privacy
  reconciliation evidence, audit continuity verification, durable queue rebuild verification,
  authority rebuild plus binding revalidation, and forward-only snapshot-to-drill chronology;
- `RecoveryCheckpoint` SHALL therefore retain `checkpoint_inventory_ref`,
  `audit_continuity_verified`, `queue_rebuild_verified`, `authority_rebuild_verified`,
  `authority_binding_revalidation_verified`, and one typed `reopen_readiness_state`; until those
  gates all pass, reopen posture SHALL remain blocked by the specific missing gate rather than
  silently reopening an environment after restore;
- queues MAY be rebuilt from outbox/inbox truth rather than snapshotted as primary assets;
- read-side rebuild or cache repair SHALL replay persisted manifests, workflow items, gate records,
  authority interaction records, receipts, and audit evidence rather than copying state back out of
  projection tables
- restore SHALL include validation of audit-hash continuity, manifest replayability, and enquiry-pack
  limitation propagation;
- restore of authority-integrated workloads SHALL rebuild outstanding transmit and reconciliation work
  from persisted `AuthorityIngressReceipt`, `AuthorityInteractionRecord`, `SubmissionRecord`, and inbox truth rather than
  blindly replaying broker messages, and SHALL respect `canonical_ingress_receipt_ref` so duplicate
  callback, poll, or recovery deliveries do not regenerate legal-state mutation; restore SHALL also
  rebuild `response_history_ids[]`, `active_response_id`, and `meaning_resolution_state` so timeout
  placeholders, corroborating observations, and reconciliation-required source conflicts are not
  collapsed during recovery; request-backed authority recovery SHALL therefore reuse persisted
  `authority_ingress_proof_contract{...}` packets rather than re-correlating ingress from transport
  timestamps or nearest-recent request heuristics; outstanding unresolved authority work SHALL also
  resume from the persisted `reconciliation_control_contract{...}` packet rather than recomputing
  attempt budget, cadence, deadline, ambiguity, or escalation posture from live worker memory,
  newer profile settings, or transport retry logs;
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
- `DeploymentRelease` SHALL therefore retain explicit `rollback_boundary_state`,
  `compensating_release_id_or_null`, and `fail_forward_owner_ref_or_null`; closed schema reader
  windows SHALL force `rollback_boundary_state = FAIL_FORWARD_ONLY`, and `FAILED_FORWARD` posture
  is unlawful without a named compensating release and operator owner;
- `DeploymentRelease`, `ReleaseVerificationManifest`, `VerificationSuiteResult`,
  `GateAdmissibilityRecord`, and `ClientCompatibilityMatrix` SHALL all mirror the same shared
  `schema_bundle_compatibility_gate_contract{...}` so destructive-contract state, migration
  chronology, native-client compatibility, historical-manifest protection, replay-safe readability,
  and rollback boundary are frozen once for the release decision rather than inferred separately
  from suite-local prose or bundle-local metadata;
- rollback, approval, and supersession logic SHALL read the durable
  `ReleaseVerificationManifest.manifest_assembly_contract{...}` plus the enclosing
  `ReleaseVerificationManifest` instead of deriving release truth from CI, deploy, or canary
  dashboards;
- rollout strategy and rollout state SHALL remain semantically aligned: baseline pins serialize as
  `PIN_BASELINE` / `PINNED`, compensating releases serialize as
  `FAIL_FORWARD_COMPENSATING` / `FAILED_FORWARD`, and canary aborts serialize as
  `STANDARD_CANARY` / `ABORTED` with the actual aborted canary fraction, red health posture, and
  explicit `rollback_boundary_state = ROLLBACK_ALLOWED` while the prior baseline remains the safe
  serving posture;
- emergency override refs SHALL only appear on `EMERGENCY_PROMOTE` releases, and the override expiry
  SHALL remain later than the deployment timestamp it governs;
- canary aborts SHALL preserve the prior release as the serving baseline and SHALL not leave the queue,
  stream broker, or migration state half-promoted.

## 7. Minimum operational runbooks

At minimum, production SHALL maintain rehearsed runbooks for:

- authority-provider degradation or prolonged `UNKNOWN`/`PENDING` states
- binding-lineage invalidation or token-rotation failure during queued authority transmit
- queue backlog and outbox drain failure
- unbound or ambiguous authority callback/inbox payload quarantine
- weak-bind authority ingress (`BOUND_WITH_AUTHORITY_REFERENCE_ONLY`) or canonical-receipt collision investigation
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
7. no disaster-recovery or queue rebuild path may re-send a live authority mutation without
   request-lineage comparison, idempotency verification, send-time binding revalidation, and the
   persisted `AuthorityInteractionRecord.reconciliation_control_contract{...}` permitting that
   exact action

## 9. One-sentence summary

The deployment and resilience contract makes the algorithm operable by defining how releases, schema
change, rollback, and disaster recovery work without violating manifest, audit, or privacy guarantees.
