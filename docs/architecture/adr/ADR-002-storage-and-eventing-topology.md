# ADR-002: Storage and Eventing Topology

- Status: Accepted
- Date: 2026-04-17
- Deciders: Phase 00 architecture analysis pack

## Context

Taxat needs one declared topology for where mutable truth lives, where append-only evidence lives, how large bodies are stored, how queues are used, and what is explicitly disposable. The corpus is unusually strict here: replay basis must stay reconstructable, authority ingress must checkpoint before legal mutation, read models must rebuild from durable truth, restore cannot reopen before privacy reconciliation, and queue loss must not become legal-state loss.

The previous phase-00 outputs already imply the needed building blocks: ADR-001 selected a TypeScript/Node product core with Python validators and Swift native, the dependency register separated relational store, object store, queue/broker, and cache/resume capabilities, and the governance pack made queue rebuild, replay, restore, and fail-forward posture explicit. ADR-002 turns those implied store roles into one chosen topology.

## Decision

Adopt a **relational-first topology with distinct logical store roles**:

- `PRIMARY_CONTROL_STORE` for mutable legal, workflow, manifest, receipt, retention, migration, and authority interaction state.
- `APPEND_ONLY_AUDIT_STORE` for immutable or append-only evidence such as audit events, provenance graph artifacts, authority envelopes, ingress receipts, replay attestations, restore evidence, and erasure proofs.
- `IMMUTABLE_OBJECT_STORE` for uploaded bytes, quarantined binaries, authority payload bodies, proof bundles, and export bodies referenced by immutable refs.
- `QUEUE_BROKER` for transport-only delivery, fed by a transactional outbox/inbox pattern and explicitly rebuildable from durable truth.
- `PROJECTION_STORE` for disposable read-side bundles, workspaces, and search/index helpers rebuilt from control truth plus append-only evidence.
- `CACHE_RESUME_STORE` for resumability, reconnect helpers, and disposable client/server cache state that can be invalidated or rehydrated safely.

Eventing posture under this decision:

- command-side mutations commit durable receipts and outbox/inbox rows in the same transaction as control-state change;
- broker loss is treated as delivery loss, not truth loss, because backlog can be rebuilt from durable outbox/inbox, interaction, workflow, and audit state;
- authority resend or recovery always reuses persisted request lineage, ingress checkpoints, and binding revalidation instead of replaying broker artifacts blindly;
- read models, snapshots, SSE deltas, notifications, and resume tokens are disposable and rebuildable;
- retention-limited projections degrade explicitly and never overwrite canonical evidence or basis hashes.

Logical separation is mandatory. Physical co-location may remain a later infrastructure decision only if append-only controls, backup posture, retention isolation, and operational boundaries remain explicit.

## Decision Drivers

| Driver | Priority | Weight | Why It Matters |
| --- | --- | --- | --- |
| Durable truth and legal-state integrity | HARD_REQUIREMENT | 14 | Legal workflow state, submission state, manifests, receipts, and migration control objects need one authoritative durable home instead of being inferred from transport or projections. |
| Replayability and deterministic reconstruction | HARD_REQUIREMENT | 12 | Exact replay, proof reconstruction, and restore verification depend on durable execution basis, graph lineage, and immutable artifact references that can be reloaded without transport guesswork. |
| Append-only evidence and lineage integrity | HARD_REQUIREMENT | 11 | Audit evidence, provenance edges, authority envelopes, and replay attestations must remain historically traversable even when read models rebuild or releases roll back. |
| Retention, erasure, and privacy reconciliation fit | HARD_REQUIREMENT | 10 | The topology has to preserve basis hashes, typed limitation posture, erasure proof, and post-restore privacy reconciliation without allowing limited projections to overwrite canonical evidence. |
| Read-model rebuildability and stream/reconnect support | HARD_REQUIREMENT | 10 | Portal, collaboration, and governance surfaces need fast live updates and resumability, but those surfaces must be explicitly rebuildable from durable command-side truth. |
| Authority idempotency, ingress, and resend safety | HARD_REQUIREMENT | 10 | Authority sends, callbacks, reconciliation, and recovery all depend on durable request identity, ingress checkpoints, and no-blind-resend guarantees even after queue loss or restore. |
| Large artifact, quarantine, and export handling | HARD_REQUIREMENT | 8 | Uploads, quarantined binaries, generated exports, response bodies, and proof bundles need immutable-body storage and scan-aware lifecycle handling that is distinct from transactional row state. |
| Migration, rollback, and fail-forward compatibility | HARD_REQUIREMENT | 9 | Schema evolution, reader windows, restore drills, and compensating releases all need a topology that supports expand-migrate-contract without corrupting in-flight truth or historical readability. |
| Restore speed, backup posture, and operability | STRONG_PREFERENCE | 8 | The chosen topology should keep Tier 0 truth restorable within the declared RPO/RTO targets while allowing projections, queues, and caches to recover in more mechanical ways. |
| Cost and operational simplicity | STRONG_PREFERENCE | 5 | The topology should remain comprehensible to the platform team and avoid introducing extra durable truth planes when the corpus only justifies distinct roles, not gratuitous services. |
| Scale and latency headroom under mixed workloads | DEFERRED_CONCERN | 3 | The system needs credible fanout, projection, and upload throughput, but phase 00 is still driven more by truth placement and replay safety than by peak scale optimization. |

## Alternatives Considered

| Alternative | Weighted Score | Rank |
| --- | --- | --- |
| Relational-first control store with append-only audit ledger, object store, broker, and cache/resume store | 90.9 | 1 |
| Document-store-centric operational truth with change-feed projections and blob attachments | 72.0 | 2 |
| Event-stream-first log promoted toward primary truth with downstream materialized views | 68.2 | 3 |

The winning option is **Relational-first control store with append-only audit ledger, object store, broker, and cache/resume store** with a weighted score of `90.9`.

## Why This Option Wins

- It is the only option that cleanly preserves the corpus distinction between mutable legal truth, append-only evidence, immutable blob bodies, transport-only delivery, and disposable projections.
- It makes queue loss recoverable without promoting the broker into legal truth, which is a direct requirement of the deployment and recovery contracts.
- It gives authority dispatch, ingress, reconciliation, and restore a durable control plane for request identity, resend legality, and binding revalidation.
- It keeps read models, caches, live streams, and notification fanout fast while still treating them as derived, rebuildable surfaces rather than as the system of record.

## Artifact Truth Classes

| Truth Class | Examples | Chosen Store | Posture |
| --- | --- | --- | --- |
| SYSTEM_OF_RECORD | RunManifest, SubmissionRecord, AuthorityInteractionRecord, ArtifactRetention | PRIMARY_CONTROL_STORE | Mutable legal and control truth; direct backup required |
| APPEND_ONLY_EVIDENCE | AuditEvent, provenance edges, AuthorityRequestEnvelope, AuthorityIngressReceipt | APPEND_ONLY_AUDIT_STORE or IMMUTABLE_OBJECT_STORE | Immutable evidence and blob bodies; direct backup required |
| DERIVED_PROJECTION | DecisionBundle, workspace snapshot, client portal workspace | PROJECTION_STORE | Disposable and rebuildable from durable truth |
| TRANSPORT_ONLY | queue messages, worker claims, live fanout envelopes | QUEUE_BROKER | Delivery fabric only; rebuild from durable truth |
| CACHE_ONLY | resume tokens, route cursors, disposable scene caches | CACHE_RESUME_STORE | Invalidate or rehydrate; never authoritative truth |

## Guardrails on the Decision

- The queue/broker SHALL NOT become the system of record for legal truth, authority settlement, manifests, or retention control.
- Durable command receipts and outbox/inbox rows SHALL be committed transactionally with command-side state changes.
- No async provider payload SHALL mutate legal state before a canonical ingress receipt is durable.
- Read models, snapshots, caches, and live deltas SHALL be rebuildable from durable truth and SHALL NOT be copied back into truth during repair.
- Restore SHALL remain blocked until privacy reconciliation, audit continuity, queue rebuild, authority rebuild, and authority binding revalidation all pass.
- Large artifact bodies SHALL live behind immutable refs in object storage; metadata, request binding, and publication state remain in durable structured stores.

## Consequences

Positive consequences:

- The platform gets a crisp artifact-to-store contract before implementation starts.
- Restore runbooks become mechanically explainable: directly restore control, audit, and authoritative blob stores; rebuild projections, queues, and caches.
- The outbox pattern and projection rebuild model give browser and native surfaces fast live behavior without granting legal authority to transport layers.
- Retention and privacy workflows can degrade projections explicitly while leaving evidence, basis, and erasure proof intact.

Negative consequences and tradeoffs:

- The platform must operate multiple logical persistence roles rather than one generic database or one generic stream.
- Engineers need stronger discipline around append-only tables, immutable refs, rebuild tooling, and restore rehearsal than in a simpler CRUD application.
- Some physically convenient implementations are ruled out because they blur truth, transport, or evidence boundaries the corpus requires to stay distinct.

## Risks and Mitigations

| Risk | Why It Matters | Mitigation |
| --- | --- | --- |
| Outbox/inbox drift from control truth | Would reintroduce queue dependence as accidental truth. | Persist receipts, state changes, and outbox/inbox rows in one transaction and verify rebuild drills regularly. |
| Append-only evidence polluted by mutable updates | Breaks audit continuity and replay proof. | Use explicit append-only schemas or ledgers and reject in-place rewrite semantics for evidence-bearing artifacts. |
| Projection or cache repair writes back guessed legal state | Violates rebuild-from-truth rules and can corrupt authority or workflow posture. | Treat projections and caches as disposable only; rebuild from control plus evidence stores. |
| Restore reopens before privacy or authority gates pass | Creates unlawful visibility and no-blind-resend failures. | Keep typed reopen blockers in RecoveryCheckpoint and gate environment reopen on them explicitly. |

## Restore and Replay Posture

- `PRIMARY_CONTROL_STORE`, `APPEND_ONLY_AUDIT_STORE`, and authoritative `IMMUTABLE_OBJECT_STORE` classes are directly backed up and verified.
- `PROJECTION_STORE` rebuilds from persisted manifests, workflow items, receipts, authority interaction records, audit evidence, provenance, and immutable refs.
- `QUEUE_BROKER` rebuilds from durable outbox/inbox, interaction, workflow, and audit truth; broker history is never treated as legal history.
- `CACHE_RESUME_STORE` and client-local caches rehydrate from authoritative snapshots and are invalidated on revocation, masking change, tenant switch, or schema incompatibility.
- Exact replay fails closed on unreadable or substituted basis artifacts; it does not silently recollect live data or substitute projection state.

## Deferred Decisions

- exact database, broker, projection-store, and object-store products
- whether the append-only audit store is physically co-located with the primary control store or deployed separately
- exact search/index strategy for projection-heavy or analytics-heavy read models
- object lifecycle tiering and archival policy for very old evidence bodies
- any specialized hot-path fanout infrastructure beyond the baseline broker plus projector model

## References

- Store matrix: [storage_artifact_to_store_matrix.json](/Users/test/Code/taxat_/data/analysis/storage_artifact_to_store_matrix.json)
- Event flow contract: [event_flow_and_delivery_contracts.json](/Users/test/Code/taxat_/data/analysis/event_flow_and_delivery_contracts.json)
- Rebuild, restore, and replay topology: [rebuild_restore_and_replay_topology.json](/Users/test/Code/taxat_/data/analysis/rebuild_restore_and_replay_topology.json)
- Scorecard: [ADR-002-storage-and-eventing-topology-scorecard.json](/Users/test/Code/taxat_/docs/architecture/adr/ADR-002-storage-and-eventing-topology-scorecard.json)
- Comparison notes: [ADR-002-storage-and-eventing-topology-comparison.md](/Users/test/Code/taxat_/docs/architecture/adr/ADR-002-storage-and-eventing-topology-comparison.md)
- Decision diagram: [ADR-002-storage-eventing-topology.mmd](/Users/test/Code/taxat_/diagrams/analysis/ADR-002-storage-eventing-topology.mmd)
