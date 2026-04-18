#!/usr/bin/env python3
from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any, Iterable


ROOT = Path(__file__).resolve().parents[2]
ALGORITHM_DIR = ROOT / "Algorithm"
DATA_ANALYSIS_DIR = ROOT / "data" / "analysis"
DOCS_ARCH_ADR_DIR = ROOT / "docs" / "architecture" / "adr"
DIAGRAMS_ANALYSIS_DIR = ROOT / "diagrams" / "analysis"

MANIFEST_PATH = ALGORITHM_DIR / "manifest_and_config_freeze_contract.md"
REPLAY_PATH = ALGORITHM_DIR / "replay_and_reproducibility_contract.md"
OBSERVABILITY_PATH = ALGORITHM_DIR / "observability_and_audit_contract.md"
PROVENANCE_PATH = ALGORITHM_DIR / "provenance_graph_semantics.md"
RETENTION_PATH = ALGORITHM_DIR / "retention_and_privacy.md"
RETENTION_LIMIT_PATH = (
    ALGORITHM_DIR
    / "retention_limited_explainability_and_audit_sufficiency_contract.md"
)
RETENTION_ERROR_PATH = ALGORITHM_DIR / "retention_error_and_observability_contract.md"
DEPLOYMENT_PATH = ALGORITHM_DIR / "deployment_and_resilience_contract.md"
RECOVERY_PATH = (
    ALGORITHM_DIR / "recovery_tier_checkpoint_and_fail_forward_governance_contract.md"
)
AUTHORITY_PATH = ALGORITHM_DIR / "authority_interaction_protocol.md"
NORTHBOUND_PATH = ALGORITHM_DIR / "northbound_api_and_session_contract.md"
COLLAB_PATH = ALGORITHM_DIR / "collaboration_workspace_contract.md"
PORTAL_PATH = ALGORITHM_DIR / "customer_client_portal_experience_contract.md"

ADR_PATH = DOCS_ARCH_ADR_DIR / "ADR-002-storage-and-eventing-topology.md"
COMPARISON_PATH = (
    DOCS_ARCH_ADR_DIR / "ADR-002-storage-and-eventing-topology-comparison.md"
)
SCORECARD_PATH = (
    DOCS_ARCH_ADR_DIR / "ADR-002-storage-and-eventing-topology-scorecard.json"
)
STORE_MATRIX_PATH = DATA_ANALYSIS_DIR / "storage_artifact_to_store_matrix.json"
EVENT_FLOW_PATH = DATA_ANALYSIS_DIR / "event_flow_and_delivery_contracts.json"
REBUILD_PATH = DATA_ANALYSIS_DIR / "rebuild_restore_and_replay_topology.json"
MERMAID_PATH = DIAGRAMS_ANALYSIS_DIR / "ADR-002-storage-eventing-topology.mmd"

HEADING_RE = re.compile(r"^(#{2,4})\s+(.*)$")
TODAY = "2026-04-17"
TRUTH_CLASSES = {
    "SYSTEM_OF_RECORD",
    "APPEND_ONLY_EVIDENCE",
    "DERIVED_PROJECTION",
    "TRANSPORT_ONLY",
    "CACHE_ONLY",
}
STORE_IDS = {
    "PRIMARY_CONTROL_STORE",
    "APPEND_ONLY_AUDIT_STORE",
    "IMMUTABLE_OBJECT_STORE",
    "PROJECTION_STORE",
    "QUEUE_BROKER",
    "CACHE_RESUME_STORE",
}


def repo_rel(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def ordered_unique(values: Iterable[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for value in values:
        if value in seen:
            continue
        seen.add(value)
        result.append(value)
    return result


def json_write(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n")


def text_write(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text)


def find_heading_line(path: Path, heading_text: str) -> int:
    for line_number, line in enumerate(path.read_text().splitlines(), 1):
        match = HEADING_RE.match(line)
        if match and match.group(2).strip() == heading_text:
            return line_number
    raise ValueError(f"Heading `{heading_text}` not found in {path}")


def find_line_containing(path: Path, needle: str) -> int:
    for line_number, line in enumerate(path.read_text().splitlines(), 1):
        if needle in line:
            return line_number
    raise ValueError(f"Text `{needle}` not found in {path}")


def line_ref(path: Path, line_number: int, label: str) -> str:
    safe_label = re.sub(r"[^A-Za-z0-9_.-]+", "_", label).strip("_") or "line"
    return f"{repo_rel(path)}::L{line_number}[{safe_label}]"


def heading_ref(path: Path, heading_text: str, label: str | None = None) -> str:
    return line_ref(path, find_heading_line(path, heading_text), label or heading_text)


def text_ref(path: Path, needle: str, label: str | None = None) -> str:
    return line_ref(path, find_line_containing(path, needle), label or needle)


def md_escape(value: Any) -> str:
    if isinstance(value, list):
        value = ", ".join(str(item) for item in value)
    return str(value).replace("|", "\\|").replace("\n", " ").strip()


def markdown_table(headers: list[str], rows: list[list[Any]]) -> str:
    header_line = "| " + " | ".join(headers) + " |"
    divider_line = "| " + " | ".join("---" for _ in headers) + " |"
    body_lines = [
        "| " + " | ".join(md_escape(cell) for cell in row) + " |"
        for row in rows
    ]
    return "\n".join([header_line, divider_line, *body_lines])


def build_criteria() -> list[dict[str, Any]]:
    return [
        {
            "criterion_id": "durable_truth_and_legal_state_integrity",
            "label": "Durable truth and legal-state integrity",
            "weight": 14,
            "priority": "HARD_REQUIREMENT",
            "rationale": "Legal workflow state, submission state, manifests, receipts, and migration control objects need one authoritative durable home instead of being inferred from transport or projections.",
            "source_refs": [
                heading_ref(DEPLOYMENT_PATH, "1. Reference runtime topology"),
                text_ref(
                    DEPLOYMENT_PATH,
                    "- the queue/broker SHALL NOT be the system of record for legal truth;",
                    "queue_not_system_of_record",
                ),
                heading_ref(AUTHORITY_PATH, "9.10 Submission-state write rules"),
                text_ref(
                    NORTHBOUND_PATH,
                    "1. no manifest-adjacent mutation without a durable command receipt",
                    "durable_command_receipt_invariant",
                ),
            ],
        },
        {
            "criterion_id": "replayability_and_deterministic_reconstruction",
            "label": "Replayability and deterministic reconstruction",
            "weight": 12,
            "priority": "HARD_REQUIREMENT",
            "rationale": "Exact replay, proof reconstruction, and restore verification depend on durable execution basis, graph lineage, and immutable artifact references that can be reloaded without transport guesswork.",
            "source_refs": [
                heading_ref(REPLAY_PATH, "Execution-basis freeze contract"),
                heading_ref(REPLAY_PATH, "Exact replay preconditions"),
                heading_ref(REPLAY_PATH, "Implementation shape"),
                heading_ref(PROVENANCE_PATH, "11.14D Replay-safe proof reconstruction"),
            ],
        },
        {
            "criterion_id": "append_only_evidence_and_lineage_integrity",
            "label": "Append-only evidence and lineage integrity",
            "weight": 11,
            "priority": "HARD_REQUIREMENT",
            "rationale": "Audit evidence, provenance edges, authority envelopes, and replay attestations must remain historically traversable even when read models rebuild or releases roll back.",
            "source_refs": [
                heading_ref(OBSERVABILITY_PATH, "14.2 Separation of concerns"),
                heading_ref(OBSERVABILITY_PATH, "14.5 Audit event contract"),
                text_ref(
                    DEPLOYMENT_PATH,
                    "- audit evidence SHALL remain append-only even when read models are rebuilt or releases roll back.",
                    "audit_append_only_under_rebuild_and_rollback",
                ),
                text_ref(
                    PROVENANCE_PATH,
                    "and legal-state transition SHALL have at least one `ED_AUDITED_BY` edge to an `EN_AUDIT_EVENT` node",
                    "gate_and_audit_anchoring_rule",
                ),
            ],
        },
        {
            "criterion_id": "retention_erasure_and_privacy_reconciliation_fit",
            "label": "Retention, erasure, and privacy reconciliation fit",
            "weight": 10,
            "priority": "HARD_REQUIREMENT",
            "rationale": "The topology has to preserve basis hashes, typed limitation posture, erasure proof, and post-restore privacy reconciliation without allowing limited projections to overwrite canonical evidence.",
            "source_refs": [
                heading_ref(RETENTION_PATH, "Artifact retention contract"),
                heading_ref(RETENTION_PATH, "Proof-bundle retention semantics"),
                heading_ref(RETENTION_PATH, "Basis-preserving retention for replay"),
                heading_ref(RECOVERY_PATH, "Restore privacy reconciliation law"),
            ],
        },
        {
            "criterion_id": "read_model_rebuildability_and_stream_support",
            "label": "Read-model rebuildability and stream/reconnect support",
            "weight": 10,
            "priority": "HARD_REQUIREMENT",
            "rationale": "Portal, collaboration, and governance surfaces need fast live updates and resumability, but those surfaces must be explicitly rebuildable from durable command-side truth.",
            "source_refs": [
                text_ref(
                    DEPLOYMENT_PATH,
                    "- read models and caches SHALL be disposable and rebuildable from persisted truth;",
                    "read_models_and_caches_disposable",
                ),
                text_ref(
                    DEPLOYMENT_PATH,
                    "- the read-side projector / stream broker SHALL derive `DecisionBundle`, `ExperienceDelta`,",
                    "projector_derives_disposable_surfaces",
                ),
                heading_ref(NORTHBOUND_PATH, "7. Stream and reconnect rules"),
                heading_ref(COLLAB_PATH, "9. Stream events and notifications"),
            ],
        },
        {
            "criterion_id": "authority_idempotency_and_resend_safety",
            "label": "Authority idempotency, ingress, and resend safety",
            "weight": 10,
            "priority": "HARD_REQUIREMENT",
            "rationale": "Authority sends, callbacks, reconciliation, and recovery all depend on durable request identity, ingress checkpoints, and no-blind-resend guarantees even after queue loss or restore.",
            "source_refs": [
                heading_ref(AUTHORITY_PATH, "9.8 Request hashing and idempotency"),
                heading_ref(AUTHORITY_PATH, "9.9A Inbound authority ingress protocol"),
                heading_ref(AUTHORITY_PATH, "9.12 Duplicate and pending-state rules"),
                heading_ref(RECOVERY_PATH, "Queue and authority recovery law"),
            ],
        },
        {
            "criterion_id": "large_artifact_and_quarantine_handling",
            "label": "Large artifact, quarantine, and export handling",
            "weight": 8,
            "priority": "HARD_REQUIREMENT",
            "rationale": "Uploads, quarantined binaries, generated exports, response bodies, and proof bundles need immutable-body storage and scan-aware lifecycle handling that is distinct from transactional row state.",
            "source_refs": [
                text_ref(
                    DEPLOYMENT_PATH,
                    "8. **Object store** - payload/evidence/artifact bodies referenced by immutable refs.",
                    "object_store_payload_evidence_artifact_bodies",
                ),
                heading_ref(PORTAL_PATH, "Secure document-upload flow"),
                heading_ref(COLLAB_PATH, "8.2 Upload staging"),
                heading_ref(RETENTION_PATH, "Proof-bundle retention semantics"),
            ],
        },
        {
            "criterion_id": "migration_and_fail_forward_compatibility",
            "label": "Migration, rollback, and fail-forward compatibility",
            "weight": 9,
            "priority": "HARD_REQUIREMENT",
            "rationale": "Schema evolution, reader windows, restore drills, and compensating releases all need a topology that supports expand-migrate-contract without corrupting in-flight truth or historical readability.",
            "source_refs": [
                heading_ref(DEPLOYMENT_PATH, "3. Schema and datastore migration rules"),
                heading_ref(DEPLOYMENT_PATH, "6. Rollout, rollback, and fail-forward posture"),
                heading_ref(RECOVERY_PATH, "Rollback and fail-forward law"),
            ],
        },
        {
            "criterion_id": "restore_speed_and_operability",
            "label": "Restore speed, backup posture, and operability",
            "weight": 8,
            "priority": "STRONG_PREFERENCE",
            "rationale": "The chosen topology should keep Tier 0 truth restorable within the declared RPO/RTO targets while allowing projections, queues, and caches to recover in more mechanical ways.",
            "source_refs": [
                heading_ref(DEPLOYMENT_PATH, "4. Recovery tiers and targets"),
                heading_ref(DEPLOYMENT_PATH, "5. Backup, restore, and DR rules"),
                heading_ref(RECOVERY_PATH, "Recovery checkpoint law"),
            ],
        },
        {
            "criterion_id": "cost_and_operational_simplicity",
            "label": "Cost and operational simplicity",
            "weight": 5,
            "priority": "STRONG_PREFERENCE",
            "rationale": "The topology should remain comprehensible to the platform team and avoid introducing extra durable truth planes when the corpus only justifies distinct roles, not gratuitous services.",
            "source_refs": [
                heading_ref(DEPLOYMENT_PATH, "1. Reference runtime topology"),
                heading_ref(DEPLOYMENT_PATH, "7. Minimum operational runbooks"),
            ],
        },
        {
            "criterion_id": "scale_and_latency_headroom",
            "label": "Scale and latency headroom under mixed workloads",
            "weight": 3,
            "priority": "DEFERRED_CONCERN",
            "rationale": "The system needs credible fanout, projection, and upload throughput, but phase 00 is still driven more by truth placement and replay safety than by peak scale optimization.",
            "source_refs": [
                heading_ref(NORTHBOUND_PATH, "7. Stream and reconnect rules"),
                heading_ref(COLLAB_PATH, "9. Stream events and notifications"),
                heading_ref(DEPLOYMENT_PATH, "1. Reference runtime topology"),
            ],
        },
    ]


def build_alternatives() -> list[dict[str, Any]]:
    return [
        {
            "alternative_id": "relational_first_with_audit_object_broker_and_cache",
            "label": "Relational-first control store with append-only audit ledger, object store, broker, and cache/resume store",
            "summary": "Keep mutable legal truth in a transactional relational control store, append-only evidence in a distinct audit ledger, immutable bodies in object storage, transport in a queue/broker, and resumability in disposable cache stores. Use transactional outbox/inbox ledgers so broker loss is recoverable from durable truth.",
            "strengths": [
                "Best fit for the corpus distinction between durable legal truth, append-only evidence, disposable projections, and transport-only delivery.",
                "Supports no-blind-resend authority recovery because request identity, ingress receipts, and interaction control stay durable outside the broker.",
                "Lets projections, caches, and SSE fanout rebuild from receipts, manifests, audit events, and object refs instead of becoming accidental truth.",
            ],
            "risks": [
                "Needs discipline around transactional outbox/inbox, append-only audit boundaries, and projection rebuild tooling.",
                "Requires the team to operate multiple logical store roles instead of collapsing everything into one database or one stream.",
            ],
            "criterion_scores": {
                "durable_truth_and_legal_state_integrity": {
                    "raw_score": 4.75,
                    "note": "Strongest alignment with the explicit control-store and append-only-evidence split in the corpus, while keeping mutable legal truth out of transport and cache layers.",
                },
                "replayability_and_deterministic_reconstruction": {
                    "raw_score": 4.5,
                    "note": "Supports exact replay and proof reconstruction well because manifests, freezes, hash sets, and evidence refs stay durable and queryable under one transactional spine.",
                },
                "append_only_evidence_and_lineage_integrity": {
                    "raw_score": 4.5,
                    "note": "Fits append-only audit and provenance semantics naturally without promoting the audit ledger into the only mutable system-of-record plane.",
                },
                "retention_erasure_and_privacy_reconciliation_fit": {
                    "raw_score": 4.5,
                    "note": "Separates mutable retention control from immutable evidence and blob bodies, which makes limitation notes, tombstones, and compensating re-erasure easier to preserve lawfully.",
                },
                "read_model_rebuildability_and_stream_support": {
                    "raw_score": 4.75,
                    "note": "Explicitly treats read models, queues, and caches as disposable while still supporting reconnect-safe SSE and route-scoped recovery.",
                },
                "authority_idempotency_and_resend_safety": {
                    "raw_score": 4.75,
                    "note": "Best fit for durable request envelopes, ingress receipts, interaction control records, and resend legality because those facts live outside the transport layer.",
                },
                "large_artifact_and_quarantine_handling": {
                    "raw_score": 4.75,
                    "note": "Object storage for immutable bodies and relational metadata for staging, request binding, and publish-time state cleanly match the upload and proof-bundle contracts.",
                },
                "migration_and_fail_forward_compatibility": {
                    "raw_score": 4.5,
                    "note": "The expand-migrate-contract posture maps well onto relational truth plus rebuildable projections and outbox-mediated fanout.",
                },
                "restore_speed_and_operability": {
                    "raw_score": 4.25,
                    "note": "Tiered backup posture is straightforward: directly back up control, audit, and authoritative blob stores; rebuild queues, projections, and caches from them.",
                },
                "cost_and_operational_simplicity": {
                    "raw_score": 4.0,
                    "note": "Not the cheapest single-service design, but it avoids more dangerous complexity from conflating truth, evidence, and delivery.",
                },
                "scale_and_latency_headroom": {
                    "raw_score": 4.0,
                    "note": "Good fit for the expected mixed workload, with room to scale projection and delivery paths independently without moving truth into the broker.",
                },
            },
        },
        {
            "alternative_id": "document_store_centric_with_change_feed_projections",
            "label": "Document-store-centric operational truth with change-feed projections and blob attachments",
            "summary": "Store most mutable operational state in a document database, keep large bodies in object storage, project read models from change feeds, and use queue/broker infrastructure for asynchronous work and notifications.",
            "strengths": [
                "Keeps the number of durable state systems lower than a full event-log-first design.",
                "Handles hierarchical read models and blob references comfortably for product-facing surfaces.",
                "Can scale fanout and change-feed-driven projections reasonably well.",
            ],
            "risks": [
                "Weaker fit for relational integrity around submission state, idempotency buckets, migration ledgers, and audit-link-heavy truth classes.",
                "Makes replay, historical reader windows, and append-only evidence boundaries harder to explain cleanly than a relational-first control spine.",
            ],
            "criterion_scores": {
                "durable_truth_and_legal_state_integrity": {
                    "raw_score": 3.0,
                    "note": "Can hold operational truth, but it is a weaker fit for the corpus's structured legal-state, receipt, and migration-control relationships than a transactional relational core.",
                },
                "replayability_and_deterministic_reconstruction": {
                    "raw_score": 3.25,
                    "note": "Replay is workable, but hash-bound basis and cross-artifact historical readability require more bespoke discipline than the relational-first option.",
                },
                "append_only_evidence_and_lineage_integrity": {
                    "raw_score": 3.75,
                    "note": "Append-only evidence can be modeled, but keeping immutable audit lineage distinct from mutable document updates is less natural.",
                },
                "retention_erasure_and_privacy_reconciliation_fit": {
                    "raw_score": 3.5,
                    "note": "Blob/body separation still works, but lifecycle and tombstone semantics become more subtle when mutable documents and evidence history coexist in one operational plane.",
                },
                "read_model_rebuildability_and_stream_support": {
                    "raw_score": 4.0,
                    "note": "Change feeds help projection fanout, though the system still needs explicit rebuild rules for compacted or superseded history.",
                },
                "authority_idempotency_and_resend_safety": {
                    "raw_score": 3.25,
                    "note": "Durable request identity and ingress proof can be preserved, but the authority lineage model fits less cleanly than in a relational control store with explicit append-only tables.",
                },
                "large_artifact_and_quarantine_handling": {
                    "raw_score": 4.5,
                    "note": "Blob attachments plus document metadata work well for uploads, exports, and proof bodies.",
                },
                "migration_and_fail_forward_compatibility": {
                    "raw_score": 3.5,
                    "note": "Schema change is often easier operationally, but the corpus explicitly needs stronger reader-window and historical-bundle guarantees than schemaless drift tolerates comfortably.",
                },
                "restore_speed_and_operability": {
                    "raw_score": 3.75,
                    "note": "Restore can be decent, but proving audit continuity, replay-safe historical reads, and migration chronology is less direct.",
                },
                "cost_and_operational_simplicity": {
                    "raw_score": 4.0,
                    "note": "Simpler than the event-log-first option, but still not as normatively aligned as the relational-first control plane.",
                },
                "scale_and_latency_headroom": {
                    "raw_score": 4.25,
                    "note": "Good read-side scaling characteristics, especially for denormalized route-facing state.",
                },
            },
        },
        {
            "alternative_id": "event_stream_first_with_materialized_views",
            "label": "Event-stream-first log promoted toward primary truth with downstream materialized views",
            "summary": "Promote the event stream or broker log toward primary persistence, model transactional state primarily through immutable events, and derive read models plus legal-state projections downstream from the stream.",
            "strengths": [
                "Excellent append history and fanout characteristics.",
                "Strong fit for high-volume projection pipelines and reprocessing mechanics when the stream is the central axis.",
                "Can make derived analytical timelines and materialized views feel very natural.",
            ],
            "risks": [
                "Directly fights the corpus requirement that the queue/broker not become the system of record for legal truth.",
                "Harder to satisfy no-blind-resend authority recovery, explicit ingestion checkpoints, and restore reopen gating without introducing a second durable control plane anyway.",
            ],
            "criterion_scores": {
                "durable_truth_and_legal_state_integrity": {
                    "raw_score": 2.25,
                    "note": "Conflicts with the explicit rule that broker/log transport must not become legal truth for manifests, workflow state, or authority settlement.",
                },
                "replayability_and_deterministic_reconstruction": {
                    "raw_score": 3.5,
                    "note": "Event replay is naturally strong, but the corpus needs more than event reprocessing: it needs stable basis hashes, request envelopes, blob refs, and historical reader-window guarantees.",
                },
                "append_only_evidence_and_lineage_integrity": {
                    "raw_score": 4.75,
                    "note": "Very strong on append-only history, which is the main advantage of this topology.",
                },
                "retention_erasure_and_privacy_reconciliation_fit": {
                    "raw_score": 3.25,
                    "note": "Erasure, tombstones, and proof-preserving limitation posture are possible, but retention-limited lifecycle rules become materially harder once the stream is treated as primary truth.",
                },
                "read_model_rebuildability_and_stream_support": {
                    "raw_score": 4.75,
                    "note": "Strongest fanout and projection story on paper, but it solves the easiest part of the problem better than the hardest part.",
                },
                "authority_idempotency_and_resend_safety": {
                    "raw_score": 2.25,
                    "note": "Authority sends and ingress checkpoints still need durable control records outside the broker, otherwise recovery drifts toward blind replay and ambiguous reconciliation.",
                },
                "large_artifact_and_quarantine_handling": {
                    "raw_score": 4.0,
                    "note": "Blob bodies still land in object storage, though their operational metadata tends to collapse back into a non-stream control store anyway.",
                },
                "migration_and_fail_forward_compatibility": {
                    "raw_score": 2.75,
                    "note": "Schema evolution on a canonical event log is possible, but the reader-window and restore guarantees become much harder to keep simple and provable.",
                },
                "restore_speed_and_operability": {
                    "raw_score": 3.5,
                    "note": "Can recover projections quickly, but durable reopen safety still requires reconstructed control truth and explicit privacy plus authority gates.",
                },
                "cost_and_operational_simplicity": {
                    "raw_score": 2.75,
                    "note": "The operational burden is high once event compatibility, log retention, materialized views, blob refs, and legal correction flows all need first-class governance.",
                },
                "scale_and_latency_headroom": {
                    "raw_score": 4.75,
                    "note": "Best theoretical headroom for high-throughput fanout, but that is not the dominant phase-00 constraint.",
                },
            },
        },
    ]


def compute_results(
    criteria: list[dict[str, Any]], alternatives: list[dict[str, Any]]
) -> list[dict[str, Any]]:
    criterion_map = {criterion["criterion_id"]: criterion for criterion in criteria}
    results: list[dict[str, Any]] = []
    for alternative in alternatives:
        breakdown: list[dict[str, Any]] = []
        total = 0.0
        for criterion in criteria:
            score_entry = alternative["criterion_scores"][criterion["criterion_id"]]
            weighted = round(score_entry["raw_score"] * criterion["weight"] / 5, 2)
            total = round(total + weighted, 2)
            breakdown.append(
                {
                    "criterion_id": criterion["criterion_id"],
                    "label": criterion["label"],
                    "priority": criterion["priority"],
                    "weight": criterion["weight"],
                    "raw_score": score_entry["raw_score"],
                    "weighted_score": weighted,
                    "note": score_entry["note"],
                }
            )
        results.append(
            {
                "alternative_id": alternative["alternative_id"],
                "label": alternative["label"],
                "summary": alternative["summary"],
                "strengths": alternative["strengths"],
                "risks": alternative["risks"],
                "criterion_breakdown": breakdown,
                "weighted_total": total,
            }
        )
    results.sort(key=lambda item: (-item["weighted_total"], item["label"]))
    for rank, item in enumerate(results, 1):
        item["rank"] = rank
    return results


def build_store_catalog() -> list[dict[str, Any]]:
    return [
        {
            "store_id": "PRIMARY_CONTROL_STORE",
            "label": "Primary control store",
            "role": "Transactional system of record for mutable legal, workflow, control-plane, and idempotency state.",
            "durability_posture": "Direct backup required; Tier 0 for control-plane legal truth.",
            "rebuildability": "Not rebuildable from projections or transport.",
        },
        {
            "store_id": "APPEND_ONLY_AUDIT_STORE",
            "label": "Append-only audit store",
            "role": "Immutable or append-only evidence ledger for audit events, provenance, envelopes, ingress checkpoints, replay attestations, and erasure proofs.",
            "durability_posture": "Direct backup required; Tier 0 for compliance-significant evidence.",
            "rebuildability": "Not rebuildable from projections; only derivable from preserved evidence itself.",
        },
        {
            "store_id": "IMMUTABLE_OBJECT_STORE",
            "label": "Immutable object store",
            "role": "Blob storage for uploaded bytes, quarantined binaries, exports, proof bodies, response bodies, and other large immutable payloads referenced by durable refs.",
            "durability_posture": "Direct backup or inventory-linked replication required for non-regenerable bodies.",
            "rebuildability": "Some generated exports can be regenerated; authoritative uploaded or authority-returned bodies cannot.",
        },
        {
            "store_id": "PROJECTION_STORE",
            "label": "Projection store",
            "role": "Disposable read-side materializations for route-facing bundles, snapshots, workspace views, and search/index helpers.",
            "durability_posture": "Tier 1 rebuildable; direct backup optional.",
            "rebuildability": "Rebuild from control truth, append-only evidence, and immutable object refs.",
        },
        {
            "store_id": "QUEUE_BROKER",
            "label": "Queue or broker",
            "role": "Transport-only delivery fabric for worker coordination, outbox drain, reconciliation jobs, notifications, and live fanout.",
            "durability_posture": "Transport loss tolerated if outbox/inbox truth survives.",
            "rebuildability": "Rebuildable from durable outbox, inbox, receipt, interaction, workflow, and audit truth.",
        },
        {
            "store_id": "CACHE_RESUME_STORE",
            "label": "Cache and resume store",
            "role": "Ephemeral resumability, route cursor, session-adjacent cache, and reconnect helpers.",
            "durability_posture": "Tier 2 disposable; best-effort backup only.",
            "rebuildability": "Rehydratable from authoritative snapshots, receipts, and projection state.",
        },
    ]


def build_artifact_matrix() -> dict[str, Any]:
    rows = [
        {
            "artifact_family_id": "manifest_and_execution_basis",
            "label": "Manifest and execution-basis artifacts",
            "examples": [
                "RunManifest",
                "ConfigFreeze",
                "InputFreeze",
                "HashSet",
                "ContinuationSet",
                "FrozenExecutionBinding",
            ],
            "truth_class": "SYSTEM_OF_RECORD",
            "canonical_store": "PRIMARY_CONTROL_STORE",
            "rebuildability": "DIRECT_BACKUP_REQUIRED",
            "backup_posture": "Tier 0 direct backup; exact replay cannot reconstruct these from projections.",
            "retention_posture": "Basis-preserving replay retention applies through the full lawful review window.",
            "eventing_posture": "Changes append outbox records and append-only outcome references; never inferred from broker history.",
            "privacy_reconciliation_required_before_reopen": False,
            "rationale": "These artifacts are the canonical execution and lineage spine and therefore remain transactional source-of-truth rather than append-only viewer cache or stream payload.",
            "source_refs": [
                heading_ref(MANIFEST_PATH, "5.3 `RunManifest` required field groups"),
                heading_ref(MANIFEST_PATH, "5.4 `ConfigFreeze` contract"),
                heading_ref(MANIFEST_PATH, "5.8 Input freeze contract"),
                heading_ref(MANIFEST_PATH, "5.9 Hash contract"),
                heading_ref(REPLAY_PATH, "Execution-basis freeze contract"),
            ],
        },
        {
            "artifact_family_id": "release_migration_and_recovery_control",
            "label": "Release, migration, and recovery control objects",
            "examples": [
                "DeploymentRelease",
                "SchemaMigrationLedger",
                "RecoveryCheckpoint",
                "ClientCompatibilityMatrix",
                "ReleaseVerificationManifest",
            ],
            "truth_class": "SYSTEM_OF_RECORD",
            "canonical_store": "PRIMARY_CONTROL_STORE",
            "rebuildability": "DIRECT_BACKUP_REQUIRED",
            "backup_posture": "Tier 0 direct backup; release and restore governance cannot be reconstructed from CI dashboards or deploy logs.",
            "retention_posture": "Governed by release/resilience proof retention and historical reader-window protection.",
            "eventing_posture": "Promotion, rollback, and restore gates may publish events, but governance truth remains in persisted control objects.",
            "privacy_reconciliation_required_before_reopen": True,
            "rationale": "These records freeze schema-reader windows, restore evidence, and rollback-vs-fail-forward posture, so they must stay in the same durable control plane as other legal truth.",
            "source_refs": [
                heading_ref(DEPLOYMENT_PATH, "3. Schema and datastore migration rules"),
                heading_ref(DEPLOYMENT_PATH, "5. Backup, restore, and DR rules"),
                heading_ref(DEPLOYMENT_PATH, "6. Rollout, rollback, and fail-forward posture"),
                heading_ref(RECOVERY_PATH, "Recovery checkpoint law"),
            ],
        },
        {
            "artifact_family_id": "workflow_filing_and_submission_state",
            "label": "Workflow, filing, and submission state",
            "examples": [
                "WorkflowItem",
                "FilingCase",
                "SubmissionRecord",
                "ObligationMirror",
                "AmendmentCase",
            ],
            "truth_class": "SYSTEM_OF_RECORD",
            "canonical_store": "PRIMARY_CONTROL_STORE",
            "rebuildability": "DIRECT_BACKUP_REQUIRED",
            "backup_posture": "Tier 0 direct backup for authority-facing settlement and workflow control.",
            "retention_posture": "Retention-controlled mutable state with linked append-only evidence refs.",
            "eventing_posture": "Mutations emit durable receipts, outbox work, audit events, and projection refreshes.",
            "privacy_reconciliation_required_before_reopen": True,
            "rationale": "The corpus explicitly forbids inferring settled legal posture from UI or transport, so these mutable entities belong in the transactional system of record.",
            "source_refs": [
                heading_ref(AUTHORITY_PATH, "9.10 Submission-state write rules"),
                heading_ref(COLLAB_PATH, "6. State transitions"),
                heading_ref(DEPLOYMENT_PATH, "1. Reference runtime topology"),
            ],
        },
        {
            "artifact_family_id": "durable_command_receipts_and_outbox_inbox",
            "label": "Durable command receipts and outbox/inbox ledgers",
            "examples": [
                "ApiCommandReceipt",
                "command receipt refs",
                "transactional outbox rows",
                "durable inbox rows",
                "dispatch refs",
            ],
            "truth_class": "SYSTEM_OF_RECORD",
            "canonical_store": "PRIMARY_CONTROL_STORE",
            "rebuildability": "DIRECT_BACKUP_REQUIRED",
            "backup_posture": "Tier 0 backup because queue rebuild and client recovery anchor on these records.",
            "retention_posture": "Receipts may age out of fast paths, but durable recovery anchors remain queryable for their governed window.",
            "eventing_posture": "Queue drains from these ledgers; queue loss is recoverable from them.",
            "privacy_reconciliation_required_before_reopen": False,
            "rationale": "The northbound and resilience contracts require durable receipts and outbox/inbox truth before transport or reconnect can be trusted.",
            "source_refs": [
                heading_ref(NORTHBOUND_PATH, "4. Command receipt"),
                text_ref(
                    NORTHBOUND_PATH,
                    "1. no manifest-adjacent mutation without a durable command receipt",
                    "durable_command_receipt_invariant",
                ),
                text_ref(
                    DEPLOYMENT_PATH,
                    "- the outbox/inbox pattern means queue loss is recoverable from durable stores;",
                    "outbox_inbox_queue_loss_recoverable",
                ),
            ],
        },
        {
            "artifact_family_id": "authority_interaction_control",
            "label": "Authority interaction control records",
            "examples": [
                "AuthorityInteractionRecord",
                "reconciliation budget state",
                "resend legality state",
                "dispatch refs",
            ],
            "truth_class": "SYSTEM_OF_RECORD",
            "canonical_store": "PRIMARY_CONTROL_STORE",
            "rebuildability": "DIRECT_BACKUP_REQUIRED",
            "backup_posture": "Tier 0 direct backup because legal resend and reconciliation posture depend on these records.",
            "retention_posture": "Regulated control objects with durable lineage to request/response evidence.",
            "eventing_posture": "Queue jobs and callbacks update from these records; they are never reconstructed from broker timing alone.",
            "privacy_reconciliation_required_before_reopen": True,
            "rationale": "Authority recovery law requires resend and reconciliation control to survive queue loss and restore independently of transport artifacts.",
            "source_refs": [
                text_ref(
                    AUTHORITY_PATH,
                    "### E. `AuthorityInteractionRecord`",
                    "AuthorityInteractionRecord",
                ),
                heading_ref(AUTHORITY_PATH, "9.13 Reconciliation protocol"),
                heading_ref(RECOVERY_PATH, "Queue and authority recovery law"),
            ],
        },
        {
            "artifact_family_id": "retention_control_objects",
            "label": "Retention and privacy control objects",
            "examples": [
                "RetentionTag",
                "ArtifactRetention",
                "RestorePrivacyReconciliationContract",
            ],
            "truth_class": "SYSTEM_OF_RECORD",
            "canonical_store": "PRIMARY_CONTROL_STORE",
            "rebuildability": "DIRECT_BACKUP_REQUIRED",
            "backup_posture": "Tier 0 direct backup when retention posture gates reopen or legal visibility.",
            "retention_posture": "This is the retention-control layer itself.",
            "eventing_posture": "Retention transitions emit append-only events and proofs, but current lifecycle state stays mutable here.",
            "privacy_reconciliation_required_before_reopen": True,
            "rationale": "Retention tags, artifact-retention state, and privacy-reconciliation outcomes are mutable governance truth, not derived views.",
            "source_refs": [
                heading_ref(RETENTION_PATH, "Retention tag contract"),
                heading_ref(RETENTION_PATH, "Artifact retention contract"),
                heading_ref(RECOVERY_PATH, "Restore privacy reconciliation law"),
            ],
        },
        {
            "artifact_family_id": "authority_request_and_response_evidence",
            "label": "Authority request and response envelope evidence",
            "examples": [
                "AuthorityRequestEnvelope",
                "AuthorityResponseEnvelope",
                "request identity contract",
                "response correlation lineage",
            ],
            "truth_class": "APPEND_ONLY_EVIDENCE",
            "canonical_store": "APPEND_ONLY_AUDIT_STORE",
            "rebuildability": "DIRECT_BACKUP_REQUIRED",
            "backup_posture": "Tier 0 direct backup; request and response bodies plus identity hashes are replay and forensics evidence.",
            "retention_posture": "Regulated records with explicit body refs and lineage preservation.",
            "eventing_posture": "Workers may dispatch or normalize from them, but the envelopes themselves remain immutable append-only artifacts.",
            "privacy_reconciliation_required_before_reopen": True,
            "rationale": "Sealed authority envelopes are evidence-bearing append-only artifacts linked from mutable interaction control records rather than mutable state in their own right.",
            "source_refs": [
                text_ref(
                    AUTHORITY_PATH,
                    "### C. `AuthorityRequestEnvelope`",
                    "AuthorityRequestEnvelope",
                ),
                text_ref(
                    AUTHORITY_PATH,
                    "### D. `AuthorityResponseEnvelope`",
                    "AuthorityResponseEnvelope",
                ),
                heading_ref(AUTHORITY_PATH, "9.8 Request hashing and idempotency"),
            ],
        },
        {
            "artifact_family_id": "authority_ingress_receipts",
            "label": "Authority ingress receipts and duplicate-suppression checkpoints",
            "examples": [
                "AuthorityIngressReceipt",
                "authority ingress proof contract",
                "canonical ingress receipt refs",
            ],
            "truth_class": "APPEND_ONLY_EVIDENCE",
            "canonical_store": "APPEND_ONLY_AUDIT_STORE",
            "rebuildability": "DIRECT_BACKUP_REQUIRED",
            "backup_posture": "Tier 0 direct backup because restore and no-blind-resend posture depend on first-seen ingress checkpoints.",
            "retention_posture": "Regulated ingress evidence with explicit dedupe and quarantine posture.",
            "eventing_posture": "Callbacks, polls, and recovery reads may create more receipts, but canonical receipts stay immutable.",
            "privacy_reconciliation_required_before_reopen": True,
            "rationale": "The ingress protocol treats receipts as durable checkpoints that must exist before legal-state mutation or duplicate suppression.",
            "source_refs": [
                heading_ref(AUTHORITY_PATH, "9.9A Inbound authority ingress protocol"),
                text_ref(
                    AUTHORITY_PATH,
                    "No provider-originated payload SHALL update legal posture directly from transport memory alone.",
                    "no_transport_memory_only_mutation",
                ),
            ],
        },
        {
            "artifact_family_id": "audit_event_ledger",
            "label": "Audit event ledger",
            "examples": [
                "AuditEvent",
                "Manifest lifecycle events",
                "Submission audit events",
                "Retention and privacy events",
            ],
            "truth_class": "APPEND_ONLY_EVIDENCE",
            "canonical_store": "APPEND_ONLY_AUDIT_STORE",
            "rebuildability": "DIRECT_BACKUP_REQUIRED",
            "backup_posture": "Tier 0 direct backup; audit continuity is a reopen gate.",
            "retention_posture": "Payloads may limit or tombstone, but object, reason, and lineage minimums must survive.",
            "eventing_posture": "Append-only writes only; projections or queries read from this ledger.",
            "privacy_reconciliation_required_before_reopen": True,
            "rationale": "Audit evidence is explicitly distinct from mutable operational state and must remain append-only under rebuild, rollback, and retention pressure.",
            "source_refs": [
                heading_ref(OBSERVABILITY_PATH, "14.5 Audit event contract"),
                heading_ref(OBSERVABILITY_PATH, "14.10 Audit versus telemetry retention"),
                heading_ref(RETENTION_LIMIT_PATH, "Artifact Rules"),
            ],
        },
        {
            "artifact_family_id": "provenance_graph_evidence",
            "label": "Provenance graph evidence",
            "examples": [
                "provenance entity nodes",
                "provenance activity nodes",
                "provenance edges",
                "path closure semantics",
            ],
            "truth_class": "APPEND_ONLY_EVIDENCE",
            "canonical_store": "APPEND_ONLY_AUDIT_STORE",
            "rebuildability": "DIRECT_BACKUP_REQUIRED",
            "backup_posture": "Tier 0 direct backup for decisive-path replay and explainability.",
            "retention_posture": "Retention-limited placeholders remain explicit instead of removing path segments.",
            "eventing_posture": "Graph evidence appends alongside audit events; read-side graph views are disposable.",
            "privacy_reconciliation_required_before_reopen": True,
            "rationale": "The provenance contract requires causally ordered, partitioned, append-only evidence paths rather than ephemeral graph cache reconstruction.",
            "source_refs": [
                heading_ref(PROVENANCE_PATH, "11.6 Construction rules"),
                heading_ref(PROVENANCE_PATH, "11.14D Replay-safe proof reconstruction"),
                heading_ref(PROVENANCE_PATH, "11.14E Explainability output contract"),
            ],
        },
        {
            "artifact_family_id": "replay_attestations_and_erasure_proofs",
            "label": "Replay attestations, restore drill evidence, and erasure proofs",
            "examples": [
                "ReplayAttestation",
                "RestoreDrillResult",
                "ErasureProof",
                "ReleaseVerificationManifest evidence refs",
            ],
            "truth_class": "APPEND_ONLY_EVIDENCE",
            "canonical_store": "APPEND_ONLY_AUDIT_STORE",
            "rebuildability": "DIRECT_BACKUP_REQUIRED",
            "backup_posture": "Tier 0 direct backup because audit claims and DR claims rely on bound historical evidence.",
            "retention_posture": "Proof-bearing evidence with retention-limited explainability semantics where needed.",
            "eventing_posture": "Produced by replay, restore, and privacy workflows; consumed by audit queries and release gates.",
            "privacy_reconciliation_required_before_reopen": True,
            "rationale": "These artifacts prove replay, restore, and erasure outcomes and therefore belong in append-only evidence storage rather than mutable control rows.",
            "source_refs": [
                heading_ref(REPLAY_PATH, "Replay attestation artifact"),
                heading_ref(DEPLOYMENT_PATH, "5. Backup, restore, and DR rules"),
                text_ref(
                    RETENTION_PATH,
                    "`RetentionTag`, `ArtifactRetention`, and `ErasureProof` SHALL validate against their dedicated JSON",
                    "retention_tag_artifact_retention_erasure_proof_schemas",
                ),
            ],
        },
        {
            "artifact_family_id": "upload_session_metadata",
            "label": "Upload session and attachment metadata",
            "examples": [
                "ClientUploadSession",
                "CollaborationAttachment metadata",
                "upload request binding contract",
                "current upload refs",
            ],
            "truth_class": "SYSTEM_OF_RECORD",
            "canonical_store": "PRIMARY_CONTROL_STORE",
            "rebuildability": "DIRECT_BACKUP_REQUIRED",
            "backup_posture": "Tier 0 or Tier 1 depending attachment criticality; metadata is authoritative even when blob bodies live elsewhere.",
            "retention_posture": "Governed by request-binding, scan, publication, and replacement lifecycle rules.",
            "eventing_posture": "Scan transitions, publication commands, and read-side updates derive from this metadata plus object-store refs.",
            "privacy_reconciliation_required_before_reopen": True,
            "rationale": "The product must preserve request binding, lane identity, and publish-time state durably even though the uploaded bytes live in object storage.",
            "source_refs": [
                heading_ref(PORTAL_PATH, "Secure document-upload flow"),
                heading_ref(COLLAB_PATH, "8.2 Upload staging"),
            ],
        },
        {
            "artifact_family_id": "immutable_upload_and_quarantine_bodies",
            "label": "Immutable upload, quarantine, and authority body blobs",
            "examples": [
                "uploaded file bodies",
                "quarantined binaries",
                "response body refs",
                "request payload refs",
            ],
            "truth_class": "APPEND_ONLY_EVIDENCE",
            "canonical_store": "IMMUTABLE_OBJECT_STORE",
            "rebuildability": "DIRECT_BACKUP_REQUIRED_FOR_AUTHORITATIVE_BLOBS",
            "backup_posture": "Inventory-linked backup or replication required for authoritative or non-regenerable blob bodies.",
            "retention_posture": "Blob bodies may age into tombstones or masked placeholders, but durable refs remain explicit.",
            "eventing_posture": "Blob create/scan/publish notifications are transport or projection concerns; the bodies themselves are immutable objects.",
            "privacy_reconciliation_required_before_reopen": True,
            "rationale": "The corpus explicitly places payload, evidence, and artifact bodies in object storage referenced by immutable refs rather than inside transactional rows or queues.",
            "source_refs": [
                text_ref(
                    DEPLOYMENT_PATH,
                    "8. **Object store** - payload/evidence/artifact bodies referenced by immutable refs.",
                    "object_store_payload_evidence_artifact_bodies",
                ),
                heading_ref(PORTAL_PATH, "Secure document-upload flow"),
                heading_ref(AUTHORITY_PATH, "9.9 Response classes"),
            ],
        },
        {
            "artifact_family_id": "generated_exports_and_proof_bundle_bodies",
            "label": "Generated export and proof-bundle bodies",
            "examples": [
                "ProofBundle body",
                "EnquiryPack export",
                "rendered filing artifacts",
                "customer export packages",
            ],
            "truth_class": "APPEND_ONLY_EVIDENCE",
            "canonical_store": "IMMUTABLE_OBJECT_STORE",
            "rebuildability": "SOME_REGENERABLE_SOME_DIRECT_BACKUP",
            "backup_posture": "Direct backup for filed or authority-linked artifacts; regenerable exports may rebuild from authoritative refs if policy allows.",
            "retention_posture": "Retention-limited explainability rules determine whether bundles remain filing-capable, review-only, or tombstoned.",
            "eventing_posture": "Rendered artifacts may trigger notifications or downloads, but the bodies remain immutable objects referenced from truth stores.",
            "privacy_reconciliation_required_before_reopen": True,
            "rationale": "Proof and export bodies are too large and too versioned for the primary control store, but still need immutable refs and retention-aware lifecycle handling.",
            "source_refs": [
                heading_ref(RETENTION_PATH, "Proof-bundle retention semantics"),
                heading_ref(PROVENANCE_PATH, "11.14E Explainability output contract"),
                text_ref(
                    PORTAL_PATH,
                    "## Artifact, print, and browser-handoff rules",
                    "artifact_print_and_browser_handoff_rules",
                ),
            ],
        },
        {
            "artifact_family_id": "derived_read_models_and_snapshots",
            "label": "Derived read models and snapshots",
            "examples": [
                "DecisionBundle",
                "ExperienceDelta",
                "LowNoiseExperienceFrame",
                "ClientPortalWorkspace",
                "WorkspaceSnapshot",
            ],
            "truth_class": "DERIVED_PROJECTION",
            "canonical_store": "PROJECTION_STORE",
            "rebuildability": "REBUILD_FROM_CONTROL_AND_EVIDENCE",
            "backup_posture": "Tier 1 rebuildable; direct backup optional.",
            "retention_posture": "Retention-limited projections must degrade explicitly and never overwrite evidence.",
            "eventing_posture": "Refreshed by projectors from durable truth and then fanned out to clients.",
            "privacy_reconciliation_required_before_reopen": False,
            "rationale": "The deployment contract explicitly marks route-facing bundles and workspaces as derived disposable projections rather than command-side truth.",
            "source_refs": [
                text_ref(
                    DEPLOYMENT_PATH,
                    "- the read-side projector / stream broker SHALL derive `DecisionBundle`, `ExperienceDelta`,",
                    "projector_derives_disposable_surfaces",
                ),
                heading_ref(PORTAL_PATH, "Read-model and API translation requirements"),
                heading_ref(COLLAB_PATH, "7.3 Read models"),
            ],
        },
        {
            "artifact_family_id": "resume_tokens_and_route_cursors",
            "label": "Resume tokens, route cursors, and server-side reconnect helpers",
            "examples": [
                "ExperienceCursor",
                "workspace resume tokens",
                "latest snapshot refs",
                "last published sequence frontiers",
            ],
            "truth_class": "CACHE_ONLY",
            "canonical_store": "CACHE_RESUME_STORE",
            "rebuildability": "REHYDRATE_FROM_SNAPSHOTS_AND_RECEIPTS",
            "backup_posture": "Best-effort only; loss forces rebase or fresh snapshot issuance, not legal-state loss.",
            "retention_posture": "Short-lived resumability aids with explicit invalidation and expiry semantics.",
            "eventing_posture": "Feeds reconnect and stale-view handling; never authorizes legal mutation on its own.",
            "privacy_reconciliation_required_before_reopen": False,
            "rationale": "Cursors and resume tokens are durable enough for reconnect ergonomics but explicitly not authoritative truth.",
            "source_refs": [
                heading_ref(NORTHBOUND_PATH, "7. Stream and reconnect rules"),
                heading_ref(COLLAB_PATH, "2.2 Stream recovery, catch-up, and cursor continuity"),
            ],
        },
        {
            "artifact_family_id": "queue_messages_and_worker_claims",
            "label": "Queue messages, broker envelopes, and worker claims",
            "examples": [
                "outbox-delivered jobs",
                "projector work items",
                "reconciliation jobs",
                "notification jobs",
            ],
            "truth_class": "TRANSPORT_ONLY",
            "canonical_store": "QUEUE_BROKER",
            "rebuildability": "REBUILD_FROM_OUTBOX_INBOX_AND_CONTROL_TRUTH",
            "backup_posture": "No primary backup dependency; transport loss is acceptable when durable truth survives.",
            "retention_posture": "Short-lived transport retention only.",
            "eventing_posture": "Primary role is delivery; legal mutation and history remain anchored elsewhere.",
            "privacy_reconciliation_required_before_reopen": True,
            "rationale": "The queue or broker is explicitly transport-only and must be rebuildable from durable outbox, inbox, receipt, interaction, workflow, and audit truth.",
            "source_refs": [
                text_ref(
                    DEPLOYMENT_PATH,
                    "- the queue/broker SHALL NOT be the system of record for legal truth;",
                    "queue_not_system_of_record",
                ),
                text_ref(
                    DEPLOYMENT_PATH,
                    "- queues MAY be rebuilt from outbox/inbox truth rather than snapshotted as primary assets;",
                    "queues_rebuilt_from_outbox_inbox_truth",
                ),
                heading_ref(RECOVERY_PATH, "Queue and authority recovery law"),
            ],
        },
        {
            "artifact_family_id": "live_stream_and_notification_fanout",
            "label": "Live SSE frames and notification fanout",
            "examples": [
                "experience.delta",
                "workspace.delta",
                "notification.badge",
                "heartbeat",
            ],
            "truth_class": "TRANSPORT_ONLY",
            "canonical_store": "QUEUE_BROKER",
            "rebuildability": "REISSUE_FROM_PROJECTION_AND_CURSOR_STATE",
            "backup_posture": "No direct backup required; clients rebase to snapshots when history compacts or fanout is lost.",
            "retention_posture": "Ephemeral fanout only; durable snapshots live elsewhere.",
            "eventing_posture": "Idempotent-by-sequence client delivery with explicit rebase on compacted history or epoch change.",
            "privacy_reconciliation_required_before_reopen": False,
            "rationale": "The stream contracts make live events reconnect-safe and typed, but still derived from snapshots and durable refs rather than canonical truth.",
            "source_refs": [
                heading_ref(NORTHBOUND_PATH, "7. Stream and reconnect rules"),
                text_ref(
                    COLLAB_PATH,
                    "### 9.1 SSE event types",
                    "collaboration_sse_event_types",
                ),
            ],
        },
        {
            "artifact_family_id": "client_side_disposable_scene_caches",
            "label": "Client-side disposable scene and route caches",
            "examples": [
                "native scene cache",
                "browser route cache",
                "masked view cache",
                "local relaunch snapshots",
            ],
            "truth_class": "CACHE_ONLY",
            "canonical_store": "CACHE_RESUME_STORE",
            "rebuildability": "RELOAD_FROM_SERVER_TRUTH",
            "backup_posture": "No backup dependence; invalidate on revocation, masking change, tenant switch, or schema incompatibility.",
            "retention_posture": "Strictly disposable runtime cache posture.",
            "eventing_posture": "Hydrated from authoritative snapshots and invalidated by session or schema events.",
            "privacy_reconciliation_required_before_reopen": False,
            "rationale": "The browser and native session contracts permit local persistence only for derivable state and explicitly forbid it from becoming legal truth.",
            "source_refs": [
                heading_ref(NORTHBOUND_PATH, "8. Session, browser, and native-client rules"),
                text_ref(
                    DEPLOYMENT_PATH,
                    "- desktop caches SHALL be disposable and rebuildable from persisted truth after revocation,",
                    "desktop_caches_disposable_and_rebuildable",
                ),
            ],
        },
    ]

    return {
        "truth_class_enum": sorted(TRUTH_CLASSES),
        "store_catalog": build_store_catalog(),
        "rows": rows,
    }


def build_event_flows() -> dict[str, Any]:
    return {
        "delivery_semantics_enum": [
            "AT_LEAST_ONCE_TRANSPORT_WITH_IDEMPOTENT_CONSUMERS",
            "DURABLE_RECEIPT_PLUS_OUTBOX",
            "REBASE_ON_COMPACTED_HISTORY",
            "NO_BLIND_RESEND",
            "APPEND_ONLY_EVIDENCE_WRITE",
        ],
        "event_flows": [
            {
                "flow_id": "command_acceptance_to_outbox_and_projection",
                "producer": "northbound command handler",
                "canonical_truth_artifacts": [
                    "workflow_filing_and_submission_state",
                    "durable_command_receipts_and_outbox_inbox",
                ],
                "source_of_truth_store": "PRIMARY_CONTROL_STORE",
                "transport_channel": "transactional outbox -> queue/broker -> projector and workers",
                "delivery_semantics": "DURABLE_RECEIPT_PLUS_OUTBOX",
                "ordering_scope": "manifest_id or item_id plus shell/frame generation",
                "idempotency_basis": "command_id, idempotency_key, durable receipt, stale-view guards",
                "rebuild_source": "receipts, outbox rows, and current control truth",
                "retention_replay_posture": "Receipts remain durable recovery anchors; queue transport is disposable.",
                "user_visible_surface_impact": "Supports durable rebase, duplicate-safe retries, and fresh snapshots after lost POST responses.",
                "source_refs": [
                    heading_ref(NORTHBOUND_PATH, "3. Command envelope"),
                    heading_ref(NORTHBOUND_PATH, "4. Command receipt"),
                    text_ref(
                        DEPLOYMENT_PATH,
                        "- the outbox/inbox pattern means queue loss is recoverable from durable stores;",
                        "outbox_inbox_queue_loss_recoverable",
                    ),
                ],
            },
            {
                "flow_id": "upload_staging_scan_and_publication",
                "producer": "upload session service and publish command handlers",
                "canonical_truth_artifacts": [
                    "upload_session_metadata",
                    "immutable_upload_and_quarantine_bodies",
                ],
                "source_of_truth_store": "PRIMARY_CONTROL_STORE",
                "transport_channel": "upload staging API -> scan workers -> publish command -> projection refresh",
                "delivery_semantics": "AT_LEAST_ONCE_TRANSPORT_WITH_IDEMPOTENT_CONSUMERS",
                "ordering_scope": "tenant_id, client_id, request_version_ref or item_id, upload_session_id",
                "idempotency_basis": "upload_session_id plus frozen request/item visibility binding",
                "rebuild_source": "upload session metadata plus immutable blob refs and scan outcomes",
                "retention_replay_posture": "Rejected, quarantined, and superseded uploads remain explicit history rather than disappearing.",
                "user_visible_surface_impact": "Clients can resume, retry, or replace in the same governed request lane without rebinding older bytes silently.",
                "source_refs": [
                    heading_ref(PORTAL_PATH, "Secure document-upload flow"),
                    heading_ref(COLLAB_PATH, "8.2 Upload staging"),
                ],
            },
            {
                "flow_id": "authority_request_dispatch",
                "producer": "authority gateway dispatch worker",
                "canonical_truth_artifacts": [
                    "authority_interaction_control",
                    "authority_request_and_response_evidence",
                ],
                "source_of_truth_store": "PRIMARY_CONTROL_STORE",
                "transport_channel": "durable outbox -> queue/broker -> authority gateway -> provider API",
                "delivery_semantics": "NO_BLIND_RESEND",
                "ordering_scope": "duplicate_meaning_key and binding_lineage_ref",
                "idempotency_basis": "request_hash, duplicate_meaning_key, idempotency_key, request_identity_contract",
                "rebuild_source": "AuthorityInteractionRecord plus sealed AuthorityRequestEnvelope, not broker replay",
                "retention_replay_posture": "Request identity and exact sealed envelopes remain durable for audit, resend legality, and reconciliation.",
                "user_visible_surface_impact": "Prevents duplicate legal mutations and keeps pending or unknown authority posture explainable after retries or recovery.",
                "source_refs": [
                    heading_ref(AUTHORITY_PATH, "9.8 Request hashing and idempotency"),
                    text_ref(
                        AUTHORITY_PATH,
                        "### E. `AuthorityInteractionRecord`",
                        "AuthorityInteractionRecord",
                    ),
                    heading_ref(RECOVERY_PATH, "Queue and authority recovery law"),
                ],
            },
            {
                "flow_id": "authority_ingress_checkpoint_and_normalization",
                "producer": "callback handlers, poll workers, and recovery readers",
                "canonical_truth_artifacts": [
                    "authority_ingress_receipts",
                    "authority_request_and_response_evidence",
                    "authority_interaction_control",
                    "workflow_filing_and_submission_state",
                ],
                "source_of_truth_store": "APPEND_ONLY_AUDIT_STORE",
                "transport_channel": "provider callback or poll -> ingress checkpoint -> normalized response -> control-store mutation",
                "delivery_semantics": "AT_LEAST_ONCE_TRANSPORT_WITH_IDEMPOTENT_CONSUMERS",
                "ordering_scope": "delivery_dedupe_key and bound_interaction_ref",
                "idempotency_basis": "delivery_dedupe_key, canonical_ingress_receipt_ref, request-lineage correlation contract",
                "rebuild_source": "persisted ingress receipts, response envelopes, interaction records, and submission records",
                "retention_replay_posture": "Async provider payloads remain durable ingress evidence before any legal-state mutation.",
                "user_visible_surface_impact": "Quarantines ambiguous or duplicate provider deliveries instead of mutating UI state from transport memory alone.",
                "source_refs": [
                    heading_ref(AUTHORITY_PATH, "9.9A Inbound authority ingress protocol"),
                    heading_ref(AUTHORITY_PATH, "9.9 Response classes"),
                    heading_ref(AUTHORITY_PATH, "9.10 Submission-state write rules"),
                ],
            },
            {
                "flow_id": "authority_reconciliation_and_recovery",
                "producer": "reconciliation workers and restore controllers",
                "canonical_truth_artifacts": [
                    "authority_interaction_control",
                    "authority_ingress_receipts",
                    "workflow_filing_and_submission_state",
                ],
                "source_of_truth_store": "PRIMARY_CONTROL_STORE",
                "transport_channel": "scheduled queue work and manual investigation surfaces",
                "delivery_semantics": "NO_BLIND_RESEND",
                "ordering_scope": "interaction_id and duplicate_meaning_key",
                "idempotency_basis": "resend_legality_state, reconciliation_control_contract, binding revalidation",
                "rebuild_source": "SubmissionRecord, AuthorityInteractionRecord, AuthorityIngressReceipt, and inbox truth",
                "retention_replay_posture": "Outstanding authority work resumes from durable control packets, not worker memory or recent broker logs.",
                "user_visible_surface_impact": "Recovered environments reopen only after authority rebuild and binding revalidation are proven.",
                "source_refs": [
                    heading_ref(AUTHORITY_PATH, "9.12 Duplicate and pending-state rules"),
                    heading_ref(AUTHORITY_PATH, "9.13 Reconciliation protocol"),
                    heading_ref(RECOVERY_PATH, "Queue and authority recovery law"),
                ],
            },
            {
                "flow_id": "projection_rebuild_and_live_stream_fanout",
                "producer": "read-side projector and stream broker",
                "canonical_truth_artifacts": [
                    "derived_read_models_and_snapshots",
                    "resume_tokens_and_route_cursors",
                    "live_stream_and_notification_fanout",
                ],
                "source_of_truth_store": "PROJECTION_STORE",
                "transport_channel": "projector -> projection store -> SSE or notification fanout",
                "delivery_semantics": "REBASE_ON_COMPACTED_HISTORY",
                "ordering_scope": "manifest_id or item_id plus frame_epoch and sequence frontier",
                "idempotency_basis": "experience_sequence or workspace_sequence plus resume-token binding",
                "rebuild_source": "primary control truth, append-only evidence, and latest immutable refs",
                "retention_replay_posture": "Live deltas are disposable; snapshots and cursors can be regenerated or invalidated safely.",
                "user_visible_surface_impact": "Preserves ordered live updates while letting clients rebase to fresh snapshots after compaction or visibility drift.",
                "source_refs": [
                    heading_ref(NORTHBOUND_PATH, "7. Stream and reconnect rules"),
                    heading_ref(COLLAB_PATH, "9. Stream events and notifications"),
                    text_ref(
                        DEPLOYMENT_PATH,
                        "- read-side rebuild or cache repair SHALL replay persisted manifests, workflow items, gate records,",
                        "read_side_rebuild_replays_persisted_truth",
                    ),
                ],
            },
            {
                "flow_id": "audit_and_provenance_append",
                "producer": "all compliance-significant mutation paths",
                "canonical_truth_artifacts": [
                    "audit_event_ledger",
                    "provenance_graph_evidence",
                ],
                "source_of_truth_store": "APPEND_ONLY_AUDIT_STORE",
                "transport_channel": "append-only evidence write plus query indexes or projections",
                "delivery_semantics": "APPEND_ONLY_EVIDENCE_WRITE",
                "ordering_scope": "manifest_id plus event chronology and graph partition contract",
                "idempotency_basis": "event family identity, payload hash, originating activity ref",
                "rebuild_source": "append-only evidence itself plus immutable blob refs when bodies are externalized",
                "retention_replay_posture": "Audit and provenance survive payload limitation through explicit tombstones or lineage minimums.",
                "user_visible_surface_impact": "Enquiry, audit, and replay views can explain legal decisions from one traversable evidence graph.",
                "source_refs": [
                    heading_ref(OBSERVABILITY_PATH, "14.5 Audit event contract"),
                text_ref(
                    PROVENANCE_PATH,
                    "and legal-state transition SHALL have at least one `ED_AUDITED_BY` edge to an `EN_AUDIT_EVENT` node",
                    "gate_and_audit_anchoring_rule",
                ),
                    heading_ref(PROVENANCE_PATH, "11.14D Replay-safe proof reconstruction"),
                ],
            },
            {
                "flow_id": "retention_and_erasure_lifecycle",
                "producer": "retention engine and privacy workflows",
                "canonical_truth_artifacts": [
                    "retention_control_objects",
                    "replay_attestations_and_erasure_proofs",
                    "immutable_upload_and_quarantine_bodies",
                    "generated_exports_and_proof_bundle_bodies",
                ],
                "source_of_truth_store": "PRIMARY_CONTROL_STORE",
                "transport_channel": "policy evaluation jobs -> control updates -> append-only proofs -> projection degradation",
                "delivery_semantics": "AT_LEAST_ONCE_TRANSPORT_WITH_IDEMPOTENT_CONSUMERS",
                "ordering_scope": "artifact_ref and retention_scope_class",
                "idempotency_basis": "retention_id, erasure_request_ref, erasure_action_ref",
                "rebuild_source": "RetentionTag, ArtifactRetention, ErasureProof, limitation notes, and surviving blob refs",
                "retention_replay_posture": "Expired or erased evidence remains explicit as typed limitation posture instead of disappearing from proof and audit render paths.",
                "user_visible_surface_impact": "Surviving proof, audit, and customer-safe projections degrade deterministically under retention pressure.",
                "source_refs": [
                    heading_ref(RETENTION_PATH, "Artifact retention contract"),
                    heading_ref(RETENTION_PATH, "Erasure and legal-hold workflow"),
                    heading_ref(RETENTION_LIMIT_PATH, "Required Outcomes"),
                    heading_ref(RETENTION_ERROR_PATH, "15.5 Erasure, legal-hold, and proof-preservation invariants"),
                ],
            },
            {
                "flow_id": "restore_replay_and_rebuild",
                "producer": "restore controller, replay orchestrator, and recovery operators",
                "canonical_truth_artifacts": [
                    "manifest_and_execution_basis",
                    "release_migration_and_recovery_control",
                    "authority_interaction_control",
                    "authority_ingress_receipts",
                    "audit_event_ledger",
                    "provenance_graph_evidence",
                ],
                "source_of_truth_store": "PRIMARY_CONTROL_STORE",
                "transport_channel": "restore drill -> rebuild jobs -> projection/cursor refresh -> reopen gate",
                "delivery_semantics": "NO_BLIND_RESEND",
                "ordering_scope": "checkpoint_id, manifest_id, interaction_id",
                "idempotency_basis": "checkpoint inventory, restore_verification_hash, execution_basis_hash",
                "rebuild_source": "control store, append-only audit store, immutable object store, and durable outbox/inbox truth",
                "retention_replay_posture": "Exact replay fails closed if basis is unreadable; restore fails closed until audit continuity, privacy reconciliation, queue rebuild, and authority revalidation pass.",
                "user_visible_surface_impact": "Reopened environments remain blocked until every typed restore gate is satisfied; clients rebase from reconstructed snapshots rather than stale caches.",
                "source_refs": [
                    heading_ref(DEPLOYMENT_PATH, "5. Backup, restore, and DR rules"),
                    heading_ref(RECOVERY_PATH, "Recovery checkpoint law"),
                    heading_ref(REPLAY_PATH, "Exact replay preconditions"),
                ],
            },
        ],
    }


def build_rebuild_topology() -> dict[str, Any]:
    return {
        "chosen_topology_id": "relational_first_with_audit_object_broker_and_cache",
        "topology_summary": "Relational-first control truth, append-only evidence, immutable object bodies, transport-only broker, rebuildable projection store, and disposable cache/resume store.",
        "store_roles": build_store_catalog(),
        "store_recovery_plan": [
            {
                "store_id": "PRIMARY_CONTROL_STORE",
                "direct_backup_required": True,
                "rebuildable_without_backup": False,
                "recovery_tier_class": "TIER_0_CONTROL_PLANE",
                "contains_artifact_families": [
                    "manifest_and_execution_basis",
                    "release_migration_and_recovery_control",
                    "workflow_filing_and_submission_state",
                    "durable_command_receipts_and_outbox_inbox",
                    "authority_interaction_control",
                    "retention_control_objects",
                    "upload_session_metadata",
                ],
                "notes": [
                    "This is the authoritative mutable control plane.",
                    "Restore success is not lawful unless privacy, audit, queue, and authority gates all pass.",
                ],
            },
            {
                "store_id": "APPEND_ONLY_AUDIT_STORE",
                "direct_backup_required": True,
                "rebuildable_without_backup": False,
                "recovery_tier_class": "TIER_0_CONTROL_PLANE",
                "contains_artifact_families": [
                    "authority_request_and_response_evidence",
                    "authority_ingress_receipts",
                    "audit_event_ledger",
                    "provenance_graph_evidence",
                    "replay_attestations_and_erasure_proofs",
                ],
                "notes": [
                    "Append-only evidence remains queryable across rebuild, rollback, and retention limitation.",
                ],
            },
            {
                "store_id": "IMMUTABLE_OBJECT_STORE",
                "direct_backup_required": True,
                "rebuildable_without_backup": False,
                "recovery_tier_class": "TIER_0_CONTROL_PLANE_FOR_AUTHORITATIVE_BLOBS",
                "contains_artifact_families": [
                    "immutable_upload_and_quarantine_bodies",
                    "generated_exports_and_proof_bundle_bodies",
                ],
                "notes": [
                    "Generated exports may be regenerable, but authoritative uploads, provider payloads, and filed proof artifacts are not assumed regenerable.",
                ],
            },
            {
                "store_id": "PROJECTION_STORE",
                "direct_backup_required": False,
                "rebuildable_without_backup": True,
                "recovery_tier_class": "TIER_1_REBUILDABLE",
                "contains_artifact_families": [
                    "derived_read_models_and_snapshots",
                ],
                "notes": [
                    "Projection rebuild must replay persisted manifests, workflow items, gate records, authority interaction records, receipts, and audit evidence.",
                ],
            },
            {
                "store_id": "QUEUE_BROKER",
                "direct_backup_required": False,
                "rebuildable_without_backup": True,
                "recovery_tier_class": "TRANSPORT_ONLY",
                "contains_artifact_families": [
                    "queue_messages_and_worker_claims",
                    "live_stream_and_notification_fanout",
                ],
                "notes": [
                    "Broker loss is transport loss, not truth loss.",
                    "No reopen path may blindly replay authority mutations from transport artifacts alone.",
                ],
            },
            {
                "store_id": "CACHE_RESUME_STORE",
                "direct_backup_required": False,
                "rebuildable_without_backup": True,
                "recovery_tier_class": "TIER_2_DISPOSABLE",
                "contains_artifact_families": [
                    "resume_tokens_and_route_cursors",
                    "client_side_disposable_scene_caches",
                ],
                "notes": [
                    "Loss forces rebase or relaunch hydration, not legal-state reconstruction.",
                ],
            },
        ],
        "rebuild_paths": [
            {
                "target": "derived_read_models_and_snapshots",
                "rebuild_from": [
                    "manifest_and_execution_basis",
                    "workflow_filing_and_submission_state",
                    "durable_command_receipts_and_outbox_inbox",
                    "authority_interaction_control",
                    "audit_event_ledger",
                    "provenance_graph_evidence",
                    "immutable_upload_and_quarantine_bodies",
                ],
                "rebuild_rule": "Replay persisted control and evidence truth through the projector; never copy state back out of stale projection tables.",
            },
            {
                "target": "resume_tokens_and_route_cursors",
                "rebuild_from": [
                    "derived_read_models_and_snapshots",
                    "durable_command_receipts_and_outbox_inbox",
                    "workflow_filing_and_submission_state",
                ],
                "rebuild_rule": "Issue fresh snapshots and resume tokens; route-cursor loss is handled by typed rebase rather than state inference.",
            },
            {
                "target": "queue_messages_and_worker_claims",
                "rebuild_from": [
                    "durable_command_receipts_and_outbox_inbox",
                    "authority_interaction_control",
                    "workflow_filing_and_submission_state",
                    "audit_event_ledger",
                ],
                "rebuild_rule": "Rehydrate transport backlog from durable outbox, inbox, receipt, interaction, workflow, and audit truth only.",
            },
            {
                "target": "authority_recovery_work",
                "rebuild_from": [
                    "authority_interaction_control",
                    "authority_ingress_receipts",
                    "authority_request_and_response_evidence",
                    "workflow_filing_and_submission_state",
                ],
                "rebuild_rule": "Reconstruct unresolved authority work from persisted request lineage, ingress checkpoints, response history, and resend legality state; never from broker retry logs alone.",
            },
            {
                "target": "proof_and_enquiry_render_paths",
                "rebuild_from": [
                    "provenance_graph_evidence",
                    "audit_event_ledger",
                    "generated_exports_and_proof_bundle_bodies",
                    "immutable_upload_and_quarantine_bodies",
                ],
                "rebuild_rule": "Reconstruct proof deterministically from recorded path ordering, decisive edge refs, retained object refs, and typed limitation notes.",
            },
            {
                "target": "exact_replay_or_restore_validation",
                "rebuild_from": [
                    "manifest_and_execution_basis",
                    "release_migration_and_recovery_control",
                    "audit_event_ledger",
                    "immutable_upload_and_quarantine_bodies",
                ],
                "rebuild_rule": "Exact replay and restore validation load the frozen basis, verify hash stability, check reader-window compatibility, and fail closed on unreadable or replaced artifacts.",
            },
        ],
        "restore_reopen_blockers": [
            "RESTORE_EVIDENCE_BOUND",
            "PRIVACY_RECONCILIATION_BOUND",
            "AUDIT_CONTINUITY_VERIFIED",
            "QUEUE_REBUILD_VERIFIED",
            "AUTHORITY_REBUILD_VERIFIED",
            "AUTHORITY_BINDING_REVALIDATED",
        ],
        "restore_reopen_blocker_source_refs": [
            heading_ref(RECOVERY_PATH, "Recovery checkpoint law"),
            heading_ref(RECOVERY_PATH, "Restore privacy reconciliation law"),
        ],
        "no_blind_resend_rules": [
            {
                "rule_id": "queue_loss_is_transport_loss_not_truth_loss",
                "rule": "Queue or broker loss must be resolved by rebuilding from durable truth, not by replaying transport artifacts as if they were legal truth.",
                "source_ref": heading_ref(RECOVERY_PATH, "Queue and authority recovery law"),
            },
            {
                "rule_id": "authority_reopen_requires_lineage_and_binding_revalidation",
                "rule": "Recovered authority work requires request-lineage comparison and binding revalidation before any resend or mutation.",
                "source_ref": text_ref(
                    DEPLOYMENT_PATH,
                    "7. no disaster-recovery or queue rebuild path may re-send a live authority mutation without",
                    "no_disaster_recovery_resend_without_lineage_and_binding",
                ),
            },
            {
                "rule_id": "ingress_checkpoint_before_mutation",
                "rule": "No async provider payload may mutate legal state before a canonical AuthorityIngressReceipt is durable.",
                "source_ref": heading_ref(AUTHORITY_PATH, "9.9A Inbound authority ingress protocol"),
            },
            {
                "rule_id": "projections_and_caches_never_reopen_as_truth",
                "rule": "Read-side rebuild and cache repair must replay persisted truth rather than copying projection tables or client caches back into control state.",
                "source_ref": text_ref(
                    DEPLOYMENT_PATH,
                    "- read-side rebuild or cache repair SHALL replay persisted manifests, workflow items, gate records,",
                    "read_side_rebuild_replays_persisted_truth",
                ),
            },
        ],
        "deferred_decisions": [
            "exact relational engine, audit-ledger physical deployment, and whether control plus audit share one managed platform or separate clusters",
            "exact projection-store technology for search-heavy or analytics-heavy read models",
            "exact broker product and partitioning strategy",
            "object lifecycle tiering and archive-class transitions for very old or large evidence bodies",
            "whether any hot-path projection indexes need additional search infrastructure beyond the base projection store",
        ],
    }


def validate_inputs(
    criteria: list[dict[str, Any]],
    alternatives: list[dict[str, Any]],
    store_matrix: dict[str, Any],
    event_flows: dict[str, Any],
    rebuild_topology: dict[str, Any],
) -> None:
    if len(alternatives) < 3:
        raise ValueError("ADR-002 requires at least three serious alternatives.")
    if sum(criterion["weight"] for criterion in criteria) != 100:
        raise ValueError("Criterion weights must sum to 100.")

    criterion_ids = {criterion["criterion_id"] for criterion in criteria}
    for alternative in alternatives:
        if set(alternative["criterion_scores"]) != criterion_ids:
            raise ValueError(
                f"Alternative `{alternative['alternative_id']}` must score every criterion exactly once."
            )
        for score in alternative["criterion_scores"].values():
            if not (1.0 <= score["raw_score"] <= 5.0):
                raise ValueError("Raw scores must remain within 1..5.")

    for row in store_matrix["rows"]:
        if row["truth_class"] not in TRUTH_CLASSES:
            raise ValueError(f"Unknown truth class: {row['truth_class']}")
        if row["canonical_store"] not in STORE_IDS:
            raise ValueError(f"Unknown store id: {row['canonical_store']}")

    for flow in event_flows["event_flows"]:
        if flow["source_of_truth_store"] not in STORE_IDS:
            raise ValueError(f"Unknown event flow store: {flow['source_of_truth_store']}")

    expected_winner = "relational_first_with_audit_object_broker_and_cache"
    results = compute_results(criteria, alternatives)
    if results[0]["alternative_id"] != expected_winner:
        raise ValueError("Weighted results no longer pick the intended ADR-002 winner.")

    if rebuild_topology["chosen_topology_id"] != expected_winner:
        raise ValueError("Rebuild topology must align with the chosen ADR-002 topology.")


def build_scorecard_payload(
    criteria: list[dict[str, Any]], results: list[dict[str, Any]]
) -> dict[str, Any]:
    return {
        "decision_id": "ADR-002",
        "decision_title": "Storage and eventing topology",
        "decision_date": TODAY,
        "criteria": criteria,
        "alternatives": results,
        "winner": results[0],
    }


def write_scorecard(criteria: list[dict[str, Any]], results: list[dict[str, Any]]) -> None:
    json_write(SCORECARD_PATH, build_scorecard_payload(criteria, results))


def write_store_matrix(store_matrix: dict[str, Any]) -> None:
    json_write(STORE_MATRIX_PATH, store_matrix)


def write_event_flows(event_flows: dict[str, Any]) -> None:
    json_write(EVENT_FLOW_PATH, event_flows)


def write_rebuild_topology(rebuild_topology: dict[str, Any]) -> None:
    json_write(REBUILD_PATH, rebuild_topology)


def write_mermaid() -> None:
    text_write(
        MERMAID_PATH,
        "\n".join(
            [
                "flowchart LR",
                '  api["Northbound APIs and command handlers"]',
                '  control["Primary control store"]',
                '  audit["Append-only audit store"]',
                '  object["Immutable object store"]',
                '  outbox["Durable outbox / inbox ledgers"]',
                '  broker["Queue / broker"]',
                '  auth["Authority gateway"]',
                '  projector["Read-side projector"]',
                '  projection["Projection store"]',
                '  cache["Cache / resume store"]',
                '  live["SSE / notification fanout"]',
                '  clients["Browser and native clients"]',
                '  recovery["Replay / restore controller"]',
                "  api --> control",
                "  control --> outbox",
                "  control --> audit",
                "  control --> object",
                "  outbox --> broker",
                "  broker --> auth",
                "  broker --> projector",
                "  auth --> audit",
                "  auth --> control",
                "  auth --> object",
                "  projector --> projection",
                "  projector --> audit",
                "  projection --> cache",
                "  projection --> live",
                "  live --> clients",
                "  cache --> clients",
                "  recovery --> control",
                "  recovery --> audit",
                "  recovery --> object",
                "  recovery --> broker",
                "  recovery --> projection",
                "  recovery --> cache",
                "  classDef truth fill:#E6FFFA,stroke:#2C7A7B,color:#234E52;",
                "  classDef evidence fill:#FFF5F5,stroke:#C53030,color:#742A2A;",
                "  classDef transport fill:#EBF8FF,stroke:#3182CE,color:#2A4365;",
                "  classDef client fill:#F7FAFC,stroke:#4A5568,color:#2D3748;",
                "  class control truth;",
                "  class audit,object evidence;",
                "  class outbox,broker,projection,cache,live,auth,projector transport;",
                "  class api,clients,recovery client;",
                "",
            ]
        ),
    )


def write_adr(criteria: list[dict[str, Any]], results: list[dict[str, Any]]) -> None:
    winner = results[0]
    criteria_rows = [
        [criterion["label"], criterion["priority"], criterion["weight"], criterion["rationale"]]
        for criterion in criteria
    ]
    alt_rows = [
        [item["label"], item["weighted_total"], item["rank"]]
        for item in results
    ]
    sections = [
        "# ADR-002: Storage and Eventing Topology",
        "",
        "- Status: Accepted",
        f"- Date: {TODAY}",
        "- Deciders: Phase 00 architecture analysis pack",
        "",
        "## Context",
        "",
        "Taxat needs one declared topology for where mutable truth lives, where append-only evidence lives, how large bodies are stored, how queues are used, and what is explicitly disposable. The corpus is unusually strict here: replay basis must stay reconstructable, authority ingress must checkpoint before legal mutation, read models must rebuild from durable truth, restore cannot reopen before privacy reconciliation, and queue loss must not become legal-state loss.",
        "",
        "The previous phase-00 outputs already imply the needed building blocks: ADR-001 selected a TypeScript/Node product core with Python validators and Swift native, the dependency register separated relational store, object store, queue/broker, and cache/resume capabilities, and the governance pack made queue rebuild, replay, restore, and fail-forward posture explicit. ADR-002 turns those implied store roles into one chosen topology.",
        "",
        "## Decision",
        "",
        "Adopt a **relational-first topology with distinct logical store roles**:",
        "",
        "- `PRIMARY_CONTROL_STORE` for mutable legal, workflow, manifest, receipt, retention, migration, and authority interaction state.",
        "- `APPEND_ONLY_AUDIT_STORE` for immutable or append-only evidence such as audit events, provenance graph artifacts, authority envelopes, ingress receipts, replay attestations, restore evidence, and erasure proofs.",
        "- `IMMUTABLE_OBJECT_STORE` for uploaded bytes, quarantined binaries, authority payload bodies, proof bundles, and export bodies referenced by immutable refs.",
        "- `QUEUE_BROKER` for transport-only delivery, fed by a transactional outbox/inbox pattern and explicitly rebuildable from durable truth.",
        "- `PROJECTION_STORE` for disposable read-side bundles, workspaces, and search/index helpers rebuilt from control truth plus append-only evidence.",
        "- `CACHE_RESUME_STORE` for resumability, reconnect helpers, and disposable client/server cache state that can be invalidated or rehydrated safely.",
        "",
        "Eventing posture under this decision:",
        "",
        "- command-side mutations commit durable receipts and outbox/inbox rows in the same transaction as control-state change;",
        "- broker loss is treated as delivery loss, not truth loss, because backlog can be rebuilt from durable outbox/inbox, interaction, workflow, and audit state;",
        "- authority resend or recovery always reuses persisted request lineage, ingress checkpoints, and binding revalidation instead of replaying broker artifacts blindly;",
        "- read models, snapshots, SSE deltas, notifications, and resume tokens are disposable and rebuildable;",
        "- retention-limited projections degrade explicitly and never overwrite canonical evidence or basis hashes.",
        "",
        "Logical separation is mandatory. Physical co-location may remain a later infrastructure decision only if append-only controls, backup posture, retention isolation, and operational boundaries remain explicit.",
        "",
        "## Decision Drivers",
        "",
        markdown_table(
            ["Driver", "Priority", "Weight", "Why It Matters"],
            criteria_rows,
        ),
        "",
        "## Alternatives Considered",
        "",
        markdown_table(["Alternative", "Weighted Score", "Rank"], alt_rows),
        "",
        f"The winning option is **{winner['label']}** with a weighted score of `{winner['weighted_total']}`.",
        "",
        "## Why This Option Wins",
        "",
        "- It is the only option that cleanly preserves the corpus distinction between mutable legal truth, append-only evidence, immutable blob bodies, transport-only delivery, and disposable projections.",
        "- It makes queue loss recoverable without promoting the broker into legal truth, which is a direct requirement of the deployment and recovery contracts.",
        "- It gives authority dispatch, ingress, reconciliation, and restore a durable control plane for request identity, resend legality, and binding revalidation.",
        "- It keeps read models, caches, live streams, and notification fanout fast while still treating them as derived, rebuildable surfaces rather than as the system of record.",
        "",
        "## Artifact Truth Classes",
        "",
        markdown_table(
            ["Truth Class", "Examples", "Chosen Store", "Posture"],
            [
                [
                    "SYSTEM_OF_RECORD",
                    "RunManifest, SubmissionRecord, AuthorityInteractionRecord, ArtifactRetention",
                    "PRIMARY_CONTROL_STORE",
                    "Mutable legal and control truth; direct backup required",
                ],
                [
                    "APPEND_ONLY_EVIDENCE",
                    "AuditEvent, provenance edges, AuthorityRequestEnvelope, AuthorityIngressReceipt",
                    "APPEND_ONLY_AUDIT_STORE or IMMUTABLE_OBJECT_STORE",
                    "Immutable evidence and blob bodies; direct backup required",
                ],
                [
                    "DERIVED_PROJECTION",
                    "DecisionBundle, workspace snapshot, client portal workspace",
                    "PROJECTION_STORE",
                    "Disposable and rebuildable from durable truth",
                ],
                [
                    "TRANSPORT_ONLY",
                    "queue messages, worker claims, live fanout envelopes",
                    "QUEUE_BROKER",
                    "Delivery fabric only; rebuild from durable truth",
                ],
                [
                    "CACHE_ONLY",
                    "resume tokens, route cursors, disposable scene caches",
                    "CACHE_RESUME_STORE",
                    "Invalidate or rehydrate; never authoritative truth",
                ],
            ],
        ),
        "",
        "## Guardrails on the Decision",
        "",
        "- The queue/broker SHALL NOT become the system of record for legal truth, authority settlement, manifests, or retention control.",
        "- Durable command receipts and outbox/inbox rows SHALL be committed transactionally with command-side state changes.",
        "- No async provider payload SHALL mutate legal state before a canonical ingress receipt is durable.",
        "- Read models, snapshots, caches, and live deltas SHALL be rebuildable from durable truth and SHALL NOT be copied back into truth during repair.",
        "- Restore SHALL remain blocked until privacy reconciliation, audit continuity, queue rebuild, authority rebuild, and authority binding revalidation all pass.",
        "- Large artifact bodies SHALL live behind immutable refs in object storage; metadata, request binding, and publication state remain in durable structured stores.",
        "",
        "## Consequences",
        "",
        "Positive consequences:",
        "",
        "- The platform gets a crisp artifact-to-store contract before implementation starts.",
        "- Restore runbooks become mechanically explainable: directly restore control, audit, and authoritative blob stores; rebuild projections, queues, and caches.",
        "- The outbox pattern and projection rebuild model give browser and native surfaces fast live behavior without granting legal authority to transport layers.",
        "- Retention and privacy workflows can degrade projections explicitly while leaving evidence, basis, and erasure proof intact.",
        "",
        "Negative consequences and tradeoffs:",
        "",
        "- The platform must operate multiple logical persistence roles rather than one generic database or one generic stream.",
        "- Engineers need stronger discipline around append-only tables, immutable refs, rebuild tooling, and restore rehearsal than in a simpler CRUD application.",
        "- Some physically convenient implementations are ruled out because they blur truth, transport, or evidence boundaries the corpus requires to stay distinct.",
        "",
        "## Risks and Mitigations",
        "",
        markdown_table(
            ["Risk", "Why It Matters", "Mitigation"],
            [
                [
                    "Outbox/inbox drift from control truth",
                    "Would reintroduce queue dependence as accidental truth.",
                    "Persist receipts, state changes, and outbox/inbox rows in one transaction and verify rebuild drills regularly.",
                ],
                [
                    "Append-only evidence polluted by mutable updates",
                    "Breaks audit continuity and replay proof.",
                    "Use explicit append-only schemas or ledgers and reject in-place rewrite semantics for evidence-bearing artifacts.",
                ],
                [
                    "Projection or cache repair writes back guessed legal state",
                    "Violates rebuild-from-truth rules and can corrupt authority or workflow posture.",
                    "Treat projections and caches as disposable only; rebuild from control plus evidence stores.",
                ],
                [
                    "Restore reopens before privacy or authority gates pass",
                    "Creates unlawful visibility and no-blind-resend failures.",
                    "Keep typed reopen blockers in RecoveryCheckpoint and gate environment reopen on them explicitly.",
                ],
            ],
        ),
        "",
        "## Restore and Replay Posture",
        "",
        "- `PRIMARY_CONTROL_STORE`, `APPEND_ONLY_AUDIT_STORE`, and authoritative `IMMUTABLE_OBJECT_STORE` classes are directly backed up and verified.",
        "- `PROJECTION_STORE` rebuilds from persisted manifests, workflow items, receipts, authority interaction records, audit evidence, provenance, and immutable refs.",
        "- `QUEUE_BROKER` rebuilds from durable outbox/inbox, interaction, workflow, and audit truth; broker history is never treated as legal history.",
        "- `CACHE_RESUME_STORE` and client-local caches rehydrate from authoritative snapshots and are invalidated on revocation, masking change, tenant switch, or schema incompatibility.",
        "- Exact replay fails closed on unreadable or substituted basis artifacts; it does not silently recollect live data or substitute projection state.",
        "",
        "## Deferred Decisions",
        "",
        "- exact database, broker, projection-store, and object-store products",
        "- whether the append-only audit store is physically co-located with the primary control store or deployed separately",
        "- exact search/index strategy for projection-heavy or analytics-heavy read models",
        "- object lifecycle tiering and archival policy for very old evidence bodies",
        "- any specialized hot-path fanout infrastructure beyond the baseline broker plus projector model",
        "",
        "## References",
        "",
        f"- Store matrix: [{STORE_MATRIX_PATH.name}]({STORE_MATRIX_PATH})",
        f"- Event flow contract: [{EVENT_FLOW_PATH.name}]({EVENT_FLOW_PATH})",
        f"- Rebuild, restore, and replay topology: [{REBUILD_PATH.name}]({REBUILD_PATH})",
        f"- Scorecard: [{SCORECARD_PATH.name}]({SCORECARD_PATH})",
        f"- Comparison notes: [{COMPARISON_PATH.name}]({COMPARISON_PATH})",
        f"- Decision diagram: [{MERMAID_PATH.name}]({MERMAID_PATH})",
        "",
    ]
    text_write(ADR_PATH, "\n".join(sections))


def write_comparison(criteria: list[dict[str, Any]], results: list[dict[str, Any]]) -> None:
    sections = [
        "# ADR-002 Comparison Notes",
        "",
        "This comparison expands the weighted scorecard that supports ADR-002.",
        "",
        "## Ranking",
        "",
        markdown_table(
            ["Rank", "Alternative", "Weighted Score", "Leading Strengths"],
            [
                [
                    item["rank"],
                    item["label"],
                    item["weighted_total"],
                    "; ".join(item["strengths"][:2]),
                ]
                for item in results
            ],
        ),
        "",
        "## Criteria and Weights",
        "",
        markdown_table(
            ["Criterion", "Priority", "Weight", "Source Grounding"],
            [
                [
                    criterion["label"],
                    criterion["priority"],
                    criterion["weight"],
                    criterion["source_refs"],
                ]
                for criterion in criteria
            ],
        ),
        "",
        "## Criterion-By-Criterion Scoring",
        "",
    ]

    criterion_map = {criterion["criterion_id"]: criterion for criterion in criteria}
    for criterion in criteria:
        row_values = []
        for result in results:
            score = next(
                item
                for item in result["criterion_breakdown"]
                if item["criterion_id"] == criterion["criterion_id"]
            )
            row_values.append(
                [
                    result["label"],
                    score["raw_score"],
                    score["weighted_score"],
                    score["note"],
                ]
            )
        sections.extend(
            [
                f"### {criterion['label']}",
                "",
                f"- Priority: `{criterion['priority']}`",
                f"- Weight: `{criterion['weight']}`",
                f"- Rationale: {criterion['rationale']}",
                "",
                markdown_table(
                    ["Alternative", "Raw Score", "Weighted Contribution", "Reason"],
                    row_values,
                ),
                "",
            ]
        )

    sections.extend(
        [
            "## Why The Runner-Up Options Lost",
            "",
            f"- `{results[1]['label']}` handles projections and blob-heavy surfaces reasonably well, but it is still weaker on legal-state integrity, replay readability, and append-only evidence boundaries than the chosen relational-first control topology.",
            f"- `{results[2]['label']}` is strongest on stream-centric fanout, but it conflicts too directly with the corpus rule that queues or brokers must not become legal truth and therefore would reintroduce a second hidden control plane anyway.",
            "",
        ]
    )
    text_write(COMPARISON_PATH, "\n".join(sections))


def main() -> None:
    criteria = build_criteria()
    alternatives = build_alternatives()
    store_matrix = build_artifact_matrix()
    event_flows = build_event_flows()
    rebuild_topology = build_rebuild_topology()

    validate_inputs(criteria, alternatives, store_matrix, event_flows, rebuild_topology)
    results = compute_results(criteria, alternatives)

    write_scorecard(criteria, results)
    write_store_matrix(store_matrix)
    write_event_flows(event_flows)
    write_rebuild_topology(rebuild_topology)
    write_mermaid()
    write_adr(criteria, results)
    write_comparison(criteria, results)

    print(
        json.dumps(
            {
                "status": "PASS",
                "alternative_count": len(alternatives),
                "criteria_weight_sum": sum(criterion["weight"] for criterion in criteria),
                "winner": results[0]["alternative_id"],
                "winner_score": results[0]["weighted_total"],
                "artifact_family_count": len(store_matrix["rows"]),
                "event_flow_count": len(event_flows["event_flows"]),
                "rebuild_path_count": len(rebuild_topology["rebuild_paths"]),
            },
            indent=2,
            sort_keys=True,
        )
    )


if __name__ == "__main__":
    main()
