# ADR-002 Comparison Notes

This comparison expands the weighted scorecard that supports ADR-002.

## Ranking

| Rank | Alternative | Weighted Score | Leading Strengths |
| --- | --- | --- | --- |
| 1 | Relational-first control store with append-only audit ledger, object store, broker, and cache/resume store | 90.9 | Best fit for the corpus distinction between durable legal truth, append-only evidence, disposable projections, and transport-only delivery.; Supports no-blind-resend authority recovery because request identity, ingress receipts, and interaction control stay durable outside the broker. |
| 2 | Document-store-centric operational truth with change-feed projections and blob attachments | 72.0 | Keeps the number of durable state systems lower than a full event-log-first design.; Handles hierarchical read models and blob references comfortably for product-facing surfaces. |
| 3 | Event-stream-first log promoted toward primary truth with downstream materialized views | 68.2 | Excellent append history and fanout characteristics.; Strong fit for high-volume projection pipelines and reprocessing mechanics when the stream is the central axis. |

## Criteria and Weights

| Criterion | Priority | Weight | Source Grounding |
| --- | --- | --- | --- |
| Durable truth and legal-state integrity | HARD_REQUIREMENT | 14 | Algorithm/deployment_and_resilience_contract.md::L9[1._Reference_runtime_topology], Algorithm/deployment_and_resilience_contract.md::L33[queue_not_system_of_record], Algorithm/authority_interaction_protocol.md::L854[9.10_Submission-state_write_rules], Algorithm/northbound_api_and_session_contract.md::L751[durable_command_receipt_invariant] |
| Replayability and deterministic reconstruction | HARD_REQUIREMENT | 12 | Algorithm/replay_and_reproducibility_contract.md::L109[Execution-basis_freeze_contract], Algorithm/replay_and_reproducibility_contract.md::L227[Exact_replay_preconditions], Algorithm/replay_and_reproducibility_contract.md::L738[Implementation_shape], Algorithm/provenance_graph_semantics.md::L617[11.14D_Replay-safe_proof_reconstruction] |
| Append-only evidence and lineage integrity | HARD_REQUIREMENT | 11 | Algorithm/observability_and_audit_contract.md::L24[14.2_Separation_of_concerns], Algorithm/observability_and_audit_contract.md::L154[14.5_Audit_event_contract], Algorithm/deployment_and_resilience_contract.md::L42[audit_append_only_under_rebuild_and_rollback], Algorithm/provenance_graph_semantics.md::L253[gate_and_audit_anchoring_rule] |
| Retention, erasure, and privacy reconciliation fit | HARD_REQUIREMENT | 10 | Algorithm/retention_and_privacy.md::L58[Artifact_retention_contract], Algorithm/retention_and_privacy.md::L218[Proof-bundle_retention_semantics], Algorithm/retention_and_privacy.md::L240[Basis-preserving_retention_for_replay], Algorithm/recovery_tier_checkpoint_and_fail_forward_governance_contract.md::L86[Restore_privacy_reconciliation_law] |
| Read-model rebuildability and stream/reconnect support | HARD_REQUIREMENT | 10 | Algorithm/deployment_and_resilience_contract.md::L34[read_models_and_caches_disposable], Algorithm/deployment_and_resilience_contract.md::L35[projector_derives_disposable_surfaces], Algorithm/northbound_api_and_session_contract.md::L646[7._Stream_and_reconnect_rules], Algorithm/collaboration_workspace_contract.md::L1778[9._Stream_events_and_notifications] |
| Authority idempotency, ingress, and resend safety | HARD_REQUIREMENT | 10 | Algorithm/authority_interaction_protocol.md::L621[9.8_Request_hashing_and_idempotency], Algorithm/authority_interaction_protocol.md::L792[9.9A_Inbound_authority_ingress_protocol], Algorithm/authority_interaction_protocol.md::L952[9.12_Duplicate_and_pending-state_rules], Algorithm/recovery_tier_checkpoint_and_fail_forward_governance_contract.md::L113[Queue_and_authority_recovery_law] |
| Large artifact, quarantine, and export handling | HARD_REQUIREMENT | 8 | Algorithm/deployment_and_resilience_contract.md::L25[object_store_payload_evidence_artifact_bodies], Algorithm/customer_client_portal_experience_contract.md::L293[Secure_document-upload_flow], Algorithm/collaboration_workspace_contract.md::L1673[8.2_Upload_staging], Algorithm/retention_and_privacy.md::L218[Proof-bundle_retention_semantics] |
| Migration, rollback, and fail-forward compatibility | HARD_REQUIREMENT | 9 | Algorithm/deployment_and_resilience_contract.md::L72[3._Schema_and_datastore_migration_rules], Algorithm/deployment_and_resilience_contract.md::L177[6._Rollout_rollback_and_fail-forward_posture], Algorithm/recovery_tier_checkpoint_and_fail_forward_governance_contract.md::L127[Rollback_and_fail-forward_law] |
| Restore speed, backup posture, and operability | STRONG_PREFERENCE | 8 | Algorithm/deployment_and_resilience_contract.md::L112[4._Recovery_tiers_and_targets], Algorithm/deployment_and_resilience_contract.md::L133[5._Backup_restore_and_DR_rules], Algorithm/recovery_tier_checkpoint_and_fail_forward_governance_contract.md::L44[Recovery_checkpoint_law] |
| Cost and operational simplicity | STRONG_PREFERENCE | 5 | Algorithm/deployment_and_resilience_contract.md::L9[1._Reference_runtime_topology], Algorithm/deployment_and_resilience_contract.md::L211[7._Minimum_operational_runbooks] |
| Scale and latency headroom under mixed workloads | DEFERRED_CONCERN | 3 | Algorithm/northbound_api_and_session_contract.md::L646[7._Stream_and_reconnect_rules], Algorithm/collaboration_workspace_contract.md::L1778[9._Stream_events_and_notifications], Algorithm/deployment_and_resilience_contract.md::L9[1._Reference_runtime_topology] |

## Criterion-By-Criterion Scoring

### Durable truth and legal-state integrity

- Priority: `HARD_REQUIREMENT`
- Weight: `14`
- Rationale: Legal workflow state, submission state, manifests, receipts, and migration control objects need one authoritative durable home instead of being inferred from transport or projections.

| Alternative | Raw Score | Weighted Contribution | Reason |
| --- | --- | --- | --- |
| Relational-first control store with append-only audit ledger, object store, broker, and cache/resume store | 4.75 | 13.3 | Strongest alignment with the explicit control-store and append-only-evidence split in the corpus, while keeping mutable legal truth out of transport and cache layers. |
| Document-store-centric operational truth with change-feed projections and blob attachments | 3.0 | 8.4 | Can hold operational truth, but it is a weaker fit for the corpus's structured legal-state, receipt, and migration-control relationships than a transactional relational core. |
| Event-stream-first log promoted toward primary truth with downstream materialized views | 2.25 | 6.3 | Conflicts with the explicit rule that broker/log transport must not become legal truth for manifests, workflow state, or authority settlement. |

### Replayability and deterministic reconstruction

- Priority: `HARD_REQUIREMENT`
- Weight: `12`
- Rationale: Exact replay, proof reconstruction, and restore verification depend on durable execution basis, graph lineage, and immutable artifact references that can be reloaded without transport guesswork.

| Alternative | Raw Score | Weighted Contribution | Reason |
| --- | --- | --- | --- |
| Relational-first control store with append-only audit ledger, object store, broker, and cache/resume store | 4.5 | 10.8 | Supports exact replay and proof reconstruction well because manifests, freezes, hash sets, and evidence refs stay durable and queryable under one transactional spine. |
| Document-store-centric operational truth with change-feed projections and blob attachments | 3.25 | 7.8 | Replay is workable, but hash-bound basis and cross-artifact historical readability require more bespoke discipline than the relational-first option. |
| Event-stream-first log promoted toward primary truth with downstream materialized views | 3.5 | 8.4 | Event replay is naturally strong, but the corpus needs more than event reprocessing: it needs stable basis hashes, request envelopes, blob refs, and historical reader-window guarantees. |

### Append-only evidence and lineage integrity

- Priority: `HARD_REQUIREMENT`
- Weight: `11`
- Rationale: Audit evidence, provenance edges, authority envelopes, and replay attestations must remain historically traversable even when read models rebuild or releases roll back.

| Alternative | Raw Score | Weighted Contribution | Reason |
| --- | --- | --- | --- |
| Relational-first control store with append-only audit ledger, object store, broker, and cache/resume store | 4.5 | 9.9 | Fits append-only audit and provenance semantics naturally without promoting the audit ledger into the only mutable system-of-record plane. |
| Document-store-centric operational truth with change-feed projections and blob attachments | 3.75 | 8.25 | Append-only evidence can be modeled, but keeping immutable audit lineage distinct from mutable document updates is less natural. |
| Event-stream-first log promoted toward primary truth with downstream materialized views | 4.75 | 10.45 | Very strong on append-only history, which is the main advantage of this topology. |

### Retention, erasure, and privacy reconciliation fit

- Priority: `HARD_REQUIREMENT`
- Weight: `10`
- Rationale: The topology has to preserve basis hashes, typed limitation posture, erasure proof, and post-restore privacy reconciliation without allowing limited projections to overwrite canonical evidence.

| Alternative | Raw Score | Weighted Contribution | Reason |
| --- | --- | --- | --- |
| Relational-first control store with append-only audit ledger, object store, broker, and cache/resume store | 4.5 | 9.0 | Separates mutable retention control from immutable evidence and blob bodies, which makes limitation notes, tombstones, and compensating re-erasure easier to preserve lawfully. |
| Document-store-centric operational truth with change-feed projections and blob attachments | 3.5 | 7.0 | Blob/body separation still works, but lifecycle and tombstone semantics become more subtle when mutable documents and evidence history coexist in one operational plane. |
| Event-stream-first log promoted toward primary truth with downstream materialized views | 3.25 | 6.5 | Erasure, tombstones, and proof-preserving limitation posture are possible, but retention-limited lifecycle rules become materially harder once the stream is treated as primary truth. |

### Read-model rebuildability and stream/reconnect support

- Priority: `HARD_REQUIREMENT`
- Weight: `10`
- Rationale: Portal, collaboration, and governance surfaces need fast live updates and resumability, but those surfaces must be explicitly rebuildable from durable command-side truth.

| Alternative | Raw Score | Weighted Contribution | Reason |
| --- | --- | --- | --- |
| Relational-first control store with append-only audit ledger, object store, broker, and cache/resume store | 4.75 | 9.5 | Explicitly treats read models, queues, and caches as disposable while still supporting reconnect-safe SSE and route-scoped recovery. |
| Document-store-centric operational truth with change-feed projections and blob attachments | 4.0 | 8.0 | Change feeds help projection fanout, though the system still needs explicit rebuild rules for compacted or superseded history. |
| Event-stream-first log promoted toward primary truth with downstream materialized views | 4.75 | 9.5 | Strongest fanout and projection story on paper, but it solves the easiest part of the problem better than the hardest part. |

### Authority idempotency, ingress, and resend safety

- Priority: `HARD_REQUIREMENT`
- Weight: `10`
- Rationale: Authority sends, callbacks, reconciliation, and recovery all depend on durable request identity, ingress checkpoints, and no-blind-resend guarantees even after queue loss or restore.

| Alternative | Raw Score | Weighted Contribution | Reason |
| --- | --- | --- | --- |
| Relational-first control store with append-only audit ledger, object store, broker, and cache/resume store | 4.75 | 9.5 | Best fit for durable request envelopes, ingress receipts, interaction control records, and resend legality because those facts live outside the transport layer. |
| Document-store-centric operational truth with change-feed projections and blob attachments | 3.25 | 6.5 | Durable request identity and ingress proof can be preserved, but the authority lineage model fits less cleanly than in a relational control store with explicit append-only tables. |
| Event-stream-first log promoted toward primary truth with downstream materialized views | 2.25 | 4.5 | Authority sends and ingress checkpoints still need durable control records outside the broker, otherwise recovery drifts toward blind replay and ambiguous reconciliation. |

### Large artifact, quarantine, and export handling

- Priority: `HARD_REQUIREMENT`
- Weight: `8`
- Rationale: Uploads, quarantined binaries, generated exports, response bodies, and proof bundles need immutable-body storage and scan-aware lifecycle handling that is distinct from transactional row state.

| Alternative | Raw Score | Weighted Contribution | Reason |
| --- | --- | --- | --- |
| Relational-first control store with append-only audit ledger, object store, broker, and cache/resume store | 4.75 | 7.6 | Object storage for immutable bodies and relational metadata for staging, request binding, and publish-time state cleanly match the upload and proof-bundle contracts. |
| Document-store-centric operational truth with change-feed projections and blob attachments | 4.5 | 7.2 | Blob attachments plus document metadata work well for uploads, exports, and proof bodies. |
| Event-stream-first log promoted toward primary truth with downstream materialized views | 4.0 | 6.4 | Blob bodies still land in object storage, though their operational metadata tends to collapse back into a non-stream control store anyway. |

### Migration, rollback, and fail-forward compatibility

- Priority: `HARD_REQUIREMENT`
- Weight: `9`
- Rationale: Schema evolution, reader windows, restore drills, and compensating releases all need a topology that supports expand-migrate-contract without corrupting in-flight truth or historical readability.

| Alternative | Raw Score | Weighted Contribution | Reason |
| --- | --- | --- | --- |
| Relational-first control store with append-only audit ledger, object store, broker, and cache/resume store | 4.5 | 8.1 | The expand-migrate-contract posture maps well onto relational truth plus rebuildable projections and outbox-mediated fanout. |
| Document-store-centric operational truth with change-feed projections and blob attachments | 3.5 | 6.3 | Schema change is often easier operationally, but the corpus explicitly needs stronger reader-window and historical-bundle guarantees than schemaless drift tolerates comfortably. |
| Event-stream-first log promoted toward primary truth with downstream materialized views | 2.75 | 4.95 | Schema evolution on a canonical event log is possible, but the reader-window and restore guarantees become much harder to keep simple and provable. |

### Restore speed, backup posture, and operability

- Priority: `STRONG_PREFERENCE`
- Weight: `8`
- Rationale: The chosen topology should keep Tier 0 truth restorable within the declared RPO/RTO targets while allowing projections, queues, and caches to recover in more mechanical ways.

| Alternative | Raw Score | Weighted Contribution | Reason |
| --- | --- | --- | --- |
| Relational-first control store with append-only audit ledger, object store, broker, and cache/resume store | 4.25 | 6.8 | Tiered backup posture is straightforward: directly back up control, audit, and authoritative blob stores; rebuild queues, projections, and caches from them. |
| Document-store-centric operational truth with change-feed projections and blob attachments | 3.75 | 6.0 | Restore can be decent, but proving audit continuity, replay-safe historical reads, and migration chronology is less direct. |
| Event-stream-first log promoted toward primary truth with downstream materialized views | 3.5 | 5.6 | Can recover projections quickly, but durable reopen safety still requires reconstructed control truth and explicit privacy plus authority gates. |

### Cost and operational simplicity

- Priority: `STRONG_PREFERENCE`
- Weight: `5`
- Rationale: The topology should remain comprehensible to the platform team and avoid introducing extra durable truth planes when the corpus only justifies distinct roles, not gratuitous services.

| Alternative | Raw Score | Weighted Contribution | Reason |
| --- | --- | --- | --- |
| Relational-first control store with append-only audit ledger, object store, broker, and cache/resume store | 4.0 | 4.0 | Not the cheapest single-service design, but it avoids more dangerous complexity from conflating truth, evidence, and delivery. |
| Document-store-centric operational truth with change-feed projections and blob attachments | 4.0 | 4.0 | Simpler than the event-log-first option, but still not as normatively aligned as the relational-first control plane. |
| Event-stream-first log promoted toward primary truth with downstream materialized views | 2.75 | 2.75 | The operational burden is high once event compatibility, log retention, materialized views, blob refs, and legal correction flows all need first-class governance. |

### Scale and latency headroom under mixed workloads

- Priority: `DEFERRED_CONCERN`
- Weight: `3`
- Rationale: The system needs credible fanout, projection, and upload throughput, but phase 00 is still driven more by truth placement and replay safety than by peak scale optimization.

| Alternative | Raw Score | Weighted Contribution | Reason |
| --- | --- | --- | --- |
| Relational-first control store with append-only audit ledger, object store, broker, and cache/resume store | 4.0 | 2.4 | Good fit for the expected mixed workload, with room to scale projection and delivery paths independently without moving truth into the broker. |
| Document-store-centric operational truth with change-feed projections and blob attachments | 4.25 | 2.55 | Good read-side scaling characteristics, especially for denormalized route-facing state. |
| Event-stream-first log promoted toward primary truth with downstream materialized views | 4.75 | 2.85 | Best theoretical headroom for high-throughput fanout, but that is not the dominant phase-00 constraint. |

## Why The Runner-Up Options Lost

- `Document-store-centric operational truth with change-feed projections and blob attachments` handles projections and blob-heavy surfaces reasonably well, but it is still weaker on legal-state integrity, replay readability, and append-only evidence boundaries than the chosen relational-first control topology.
- `Event-stream-first log promoted toward primary truth with downstream materialized views` is strongest on stream-centric fanout, but it conflicts too directly with the corpus rule that queues or brokers must not become legal truth and therefore would reintroduce a second hidden control plane anyway.
