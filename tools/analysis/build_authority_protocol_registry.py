#!/usr/bin/env python3
from __future__ import annotations

import csv
import json
import re
from pathlib import Path
from typing import Any, Iterable


ROOT = Path(__file__).resolve().parents[2]
ALGORITHM_DIR = ROOT / "Algorithm"
DATA_ANALYSIS_DIR = ROOT / "data" / "analysis"
DOCS_ANALYSIS_DIR = ROOT / "docs" / "analysis"
DIAGRAMS_ANALYSIS_DIR = ROOT / "diagrams" / "analysis"

ACTOR_AUTHORITY_PATH = ALGORITHM_DIR / "actor_and_authority_model.md"
AUTHORITY_PROTOCOL_PATH = ALGORITHM_DIR / "authority_interaction_protocol.md"
AUTHORITY_TRUTH_PATH = ALGORITHM_DIR / "authority_truth_and_internal_projection_separation_contract.md"
CALCULATION_CONTRACT_PATH = ALGORITHM_DIR / "authority_calculation_contract.md"
CONNECTOR_CONTRACT_PATH = ALGORITHM_DIR / "connector_delegation_contract.md"
NORTHBOUND_CONTRACT_PATH = ALGORITHM_DIR / "northbound_api_and_session_contract.md"
MODULES_PATH = ALGORITHM_DIR / "modules.md"
TEST_VECTORS_PATH = ALGORITHM_DIR / "test_vectors.md"

MODULE_CATALOG_PATH = DATA_ANALYSIS_DIR / "module_catalog.json"
GATE_REGISTRY_PATH = DATA_ANALYSIS_DIR / "gate_registry.json"

SCHEMAS_DIR = ALGORITHM_DIR / "schemas"
AUTHORITY_OPERATION_SCHEMA_PATH = SCHEMAS_DIR / "authority_operation.schema.json"
AUTHORITY_BINDING_SCHEMA_PATH = SCHEMAS_DIR / "authority_binding.schema.json"
AUTHORITY_REQUEST_ENVELOPE_SCHEMA_PATH = SCHEMAS_DIR / "authority_request_envelope.schema.json"
AUTHORITY_RESPONSE_ENVELOPE_SCHEMA_PATH = SCHEMAS_DIR / "authority_response_envelope.schema.json"
AUTHORITY_INTERACTION_RECORD_SCHEMA_PATH = SCHEMAS_DIR / "authority_interaction_record.schema.json"
AUTHORITY_INGRESS_RECEIPT_SCHEMA_PATH = SCHEMAS_DIR / "authority_ingress_receipt.schema.json"
AUTHORITY_INGRESS_PROOF_SCHEMA_PATH = SCHEMAS_DIR / "authority_ingress_proof_contract.schema.json"
AUTHORITY_INGRESS_CORRELATION_SCHEMA_PATH = SCHEMAS_DIR / "authority_ingress_correlation_contract.schema.json"
AUTHORITY_OPERATION_PROFILE_SCHEMA_PATH = SCHEMAS_DIR / "authority_operation_profile.schema.json"
AUTHORITY_RECONCILIATION_CONTROL_SCHEMA_PATH = SCHEMAS_DIR / "authority_reconciliation_control_contract.schema.json"
AUTHORITY_TRUTH_SCHEMA_PATH = SCHEMAS_DIR / "authority_truth_contract.schema.json"
SUBMISSION_RECORD_SCHEMA_PATH = SCHEMAS_DIR / "submission_record.schema.json"
OBLIGATION_MIRROR_SCHEMA_PATH = SCHEMAS_DIR / "obligation_mirror.schema.json"

REQUIREMENTS_DOC_PATH = DOCS_ANALYSIS_DIR / "12_authority_interaction_and_reconciliation_requirements.md"
SEQUENCE_DOC_PATH = DOCS_ANALYSIS_DIR / "12_authority_sequence_and_boundary_matrix.md"
EDGE_CASE_DOC_PATH = DOCS_ANALYSIS_DIR / "12_pending_duplicate_and_out_of_band_handling.md"
MERMAID_PATH = DIAGRAMS_ANALYSIS_DIR / "12_authority_handshake_sequence.mmd"

OPERATION_CATALOG_PATH = DATA_ANALYSIS_DIR / "authority_operation_catalog.json"
SEQUENCE_STEPS_PATH = DATA_ANALYSIS_DIR / "authority_sequence_steps.jsonl"
REQUEST_IDENTITY_PATH = DATA_ANALYSIS_DIR / "request_identity_and_idempotency_rules.json"
RECONCILIATION_MATRIX_PATH = DATA_ANALYSIS_DIR / "reconciliation_decision_matrix.csv"
TRUTH_PROJECTION_PATH = DATA_ANALYSIS_DIR / "authority_truth_vs_internal_projection_map.json"
RESPONSE_CLASS_PATH = DATA_ANALYSIS_DIR / "response_class_registry.json"
GAPS_PATH = DATA_ANALYSIS_DIR / "unresolved_protocol_gaps.json"

HEADING_RE = re.compile(r"^(#{2,4})\s+(.*)$")

AUDIT_EVENTS = [
    "AuthorityOperationPlanned",
    "AuthorityRequestBuilt",
    "AuthorityRequestSent",
    "AuthorityResponseReceived",
    "AuthorityStatusNormalized",
    "AuthorityReconciliationAttempted",
    "AuthorityReconciliationResolved",
    "AuthorityReconciliationEscalated",
]
AUDIT_FIELDS = [
    "manifest_id",
    "operation_id",
    "request_hash",
    "idempotency_key",
    "authority_link_ref",
    "token_binding_ref",
    "client_id",
    "tenant_id",
]
REQUEST_IDENTITY_FIELDS = [
    "identity_profile_version",
    "tenant_id",
    "client_id",
    "manifest_id",
    "attempt_lineage_manifest_id",
    "operation_family",
    "authority_name",
    "authority_product_profile",
    "provider_environment",
    "provider_api_version",
    "authority_scope",
    "http_method",
    "canonical_path",
    "canonical_query",
    "header_profile_refs[]",
    "business_partitions[]",
    "normalized_obligation_ref",
    "normalized_basis_type",
    "access_binding_hash",
    "policy_snapshot_hash",
    "authority_binding_ref",
    "authority_link_ref",
    "delegation_grant_ref",
    "binding_lineage_ref",
    "subject_ref",
    "acting_party_ref",
    "request_body_hash",
    "identity_namespace_hash",
    "duplicate_meaning_key",
    "request_hash",
    "idempotency_key",
]
SEALED_IDENTITY_EXCLUSIONS = [
    "token_version_ref",
]
RECONCILIATION_INPUTS = [
    "SubmissionRecord",
    "ObligationMirror",
    "authority_reference",
    "calculation_or_submission_correlation_keys",
    "provider_operation_profile",
]
RECONCILIATION_OUTPUTS = [
    "RECONCILED_CONFIRMED",
    "RECONCILED_REJECTED",
    "RECONCILED_STILL_PENDING",
    "RECONCILED_OUT_OF_BAND",
    "RECONCILED_UNRESOLVED",
]
PRECHECK_DEFINITIONS = [
    {
        "check_id": "AUTHORIZE_ACTION",
        "description": "Re-run AUTHORIZE(...) for the live authority action and freeze the authorization decision.",
    },
    {
        "check_id": "CHECK_MANIFEST_STATE",
        "description": "Require RunManifest.lifecycle_state in {SEALED, IN_PROGRESS} for compliance-capable live authority work.",
    },
    {
        "check_id": "RESOLVE_OPERATION_PROFILE",
        "description": "Resolve one AuthorityOperationProfile with explicit transport, scope, fraud-header, idempotency, and reconciliation rules.",
    },
    {
        "check_id": "RESOLVE_AUTHORITY_BINDING",
        "description": "Select one ConnectorBinding / DelegationGrant / AuthorityLink lineage that exactly matches the operation tuple.",
    },
    {
        "check_id": "FINALIZE_AUTHORITY_OPERATION",
        "description": "Freeze AuthorityOperation with requested_scope[] and authorized runtime_scope[].",
    },
    {
        "check_id": "VERIFY_TOKEN_CLIENT_BINDING",
        "description": "Fail closed on token-to-client mismatch instead of surfacing a generic gateway error.",
    },
    {
        "check_id": "VERIFY_STEP_UP_AND_APPROVAL",
        "description": "Require any step-up and approval evidence before a sendable envelope exists.",
    },
    {
        "check_id": "CANONICALIZE_REQUEST_MATERIAL",
        "description": "Produce canonical path, query, payload bytes, and ordered header-profile refs from the frozen operation and binding.",
    },
    {
        "check_id": "DERIVE_REQUEST_BODY_HASH",
        "description": "Hash canonical payload bytes with the explicit <NONE> sentinel only when payload_ref is null.",
    },
    {
        "check_id": "DERIVE_REQUEST_IDENTITY_HASHES",
        "description": "Compute identity_namespace_hash, duplicate_meaning_key, request_hash, and idempotency_key from canonical material plus access binding.",
    },
    {
        "check_id": "BUILD_REQUEST_ENVELOPE",
        "description": "Materialize AuthorityRequestEnvelope and grouped request_identity_contract only after all identity fields are populated.",
    },
    {
        "check_id": "BEGIN_REQUEST_LINEAGE",
        "description": "Persist the request-backed settlement or interaction lineage before any live bytes leave the process.",
    },
    {
        "check_id": "CHECK_DUPLICATE_PENDING_BUCKET",
        "description": "Consult duplicate_meaning_key, open interactions, and stronger external truth before transmit.",
    },
    {
        "check_id": "ATTACH_FRAUD_HEADERS",
        "description": "Bind explicit fraud-prevention profile or exemption refs; this is a validity requirement, not optional metadata.",
    },
    {
        "check_id": "ACQUIRE_EXCLUSIVE_SEND_CLAIM",
        "description": "Take a compare-and-swap send claim on the persisted exchange identity before any live mutation send.",
    },
    {
        "check_id": "RUN_SEND_TIME_REVALIDATION",
        "description": "Re-check binding lineage, client/subject/scope, approvals, duplicate occupancy, and stronger truth immediately before transmit.",
    },
    {
        "check_id": "TRANSMIT_VIA_CONTROLLED_GATEWAY",
        "description": "Send the sealed envelope through the controlled gateway and move resend legality into recovery-only or read-only posture.",
    },
]


def repo_rel(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def line_ref(path: str, line_number: int, label: str) -> str:
    safe_label = re.sub(r"[^A-Za-z0-9_.-]+", "_", label).strip("_") or "line"
    return f"{path}::L{line_number}[{safe_label}]"


def ordered_unique(values: Iterable[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for value in values:
        if not value or value in seen:
            continue
        seen.add(value)
        result.append(value)
    return result


def json_write(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n")


def jsonl_write(path: Path, rows: Iterable[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w") as handle:
        for row in rows:
            handle.write(json.dumps(row, sort_keys=True) + "\n")


def csv_write(path: Path, rows: list[dict[str, Any]], fieldnames: list[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow(row)


def load_json(path: Path) -> Any:
    return json.loads(path.read_text())


def schema_enum(path: Path, field_name: str) -> list[str]:
    schema = load_json(path)
    enum_values = schema["properties"][field_name]["enum"]
    return [str(value) for value in enum_values]


def find_heading_line(path: Path, heading_text: str) -> int:
    for line_number, line in enumerate(path.read_text().splitlines(), 1):
        match = HEADING_RE.match(line)
        if match and match.group(2).strip() == heading_text:
            return line_number
    raise ValueError(f"Heading `{heading_text}` not found in {path}")


def heading_ref(path: Path, heading_text: str, label: str | None = None) -> str:
    actual_label = label or heading_text
    return line_ref(repo_rel(path), find_heading_line(path, heading_text), actual_label)


def module_ref_map(module_catalog: dict[str, Any]) -> dict[str, str]:
    return {row["module_name"]: row["source_heading_or_logical_block"] for row in module_catalog["modules"]}


def find_gate_ref(gate_registry: dict[str, Any], gate_code: str) -> str:
    for row in gate_registry["gates"]:
        if row["gate_code"] == gate_code:
            return row["source_refs"][0]
    raise ValueError(f"Gate `{gate_code}` not found in gate registry.")


def build_refs(module_catalog: dict[str, Any], gate_registry: dict[str, Any]) -> dict[str, str]:
    module_refs = module_ref_map(module_catalog)
    return {
        "actor_core": heading_ref(ACTOR_AUTHORITY_PATH, "3.2 Core concepts", "actor_core_concepts"),
        "actor_layers": heading_ref(ACTOR_AUTHORITY_PATH, "3.4 Authority layers", "authority_layers"),
        "actor_relationships": heading_ref(ACTOR_AUTHORITY_PATH, "3.5 Actor-to-authority relationships", "actor_relationships"),
        "actor_principal_context": heading_ref(ACTOR_AUTHORITY_PATH, "3.6 Principal context schema", "principal_context"),
        "actor_action_families": heading_ref(ACTOR_AUTHORITY_PATH, "3.8 Action families", "action_families"),
        "actor_policy": heading_ref(ACTOR_AUTHORITY_PATH, "3.9 Policy decision model", "policy_decision_model"),
        "actor_delegation_rules": heading_ref(ACTOR_AUTHORITY_PATH, "3.10 Delegation rules", "delegation_rules"),
        "actor_exceptional": heading_ref(ACTOR_AUTHORITY_PATH, "Exceptional authority controls", "exceptional_authority_controls"),
        "actor_precedence": heading_ref(ACTOR_AUTHORITY_PATH, "3.12 Authority precedence rules", "authority_precedence_rules"),
        "actor_invariants": heading_ref(ACTOR_AUTHORITY_PATH, "3.14 Actor invariants", "actor_invariants"),
        "protocol_boundary": heading_ref(AUTHORITY_PROTOCOL_PATH, "9.1 Boundary rule", "authority_boundary_rule"),
        "protocol_scope": heading_ref(AUTHORITY_PROTOCOL_PATH, "9.2 Protocol scope", "authority_protocol_scope"),
        "protocol_core_objects": heading_ref(AUTHORITY_PROTOCOL_PATH, "9.3 Core protocol objects", "authority_core_objects"),
        "protocol_operation": heading_ref(AUTHORITY_PROTOCOL_PATH, "A. `AuthorityOperation`", "authority_operation_object"),
        "protocol_binding": heading_ref(AUTHORITY_PROTOCOL_PATH, "B. `AuthorityBinding`", "authority_binding_object"),
        "protocol_request_envelope": heading_ref(AUTHORITY_PROTOCOL_PATH, "C. `AuthorityRequestEnvelope`", "authority_request_envelope"),
        "protocol_response_envelope": heading_ref(AUTHORITY_PROTOCOL_PATH, "D. `AuthorityResponseEnvelope`", "authority_response_envelope"),
        "protocol_interaction_record": heading_ref(AUTHORITY_PROTOCOL_PATH, "E. `AuthorityInteractionRecord`", "authority_interaction_record"),
        "protocol_operation_profiles": heading_ref(AUTHORITY_PROTOCOL_PATH, "9.4 Operation profiles", "authority_operation_profiles"),
        "protocol_preflight": heading_ref(AUTHORITY_PROTOCOL_PATH, "9.5 Preflight sequence", "authority_preflight_sequence"),
        "protocol_binding_rule": heading_ref(AUTHORITY_PROTOCOL_PATH, "9.6 Token and client binding rule", "token_client_binding_rule"),
        "protocol_send_revalidation": heading_ref(AUTHORITY_PROTOCOL_PATH, "Send-time revalidation rule", "send_time_revalidation_rule"),
        "protocol_fraud_headers": heading_ref(AUTHORITY_PROTOCOL_PATH, "9.7 Fraud-prevention header rule", "fraud_prevention_header_rule"),
        "protocol_hashing": heading_ref(AUTHORITY_PROTOCOL_PATH, "9.8 Request hashing and idempotency", "request_hashing_and_idempotency"),
        "protocol_idempotency": heading_ref(AUTHORITY_PROTOCOL_PATH, "Idempotency rule", "idempotency_rule"),
        "protocol_collision": heading_ref(AUTHORITY_PROTOCOL_PATH, "Collision rule", "collision_rule"),
        "protocol_response_classes": heading_ref(AUTHORITY_PROTOCOL_PATH, "9.9 Response classes", "response_classes"),
        "protocol_default_normalization": heading_ref(AUTHORITY_PROTOCOL_PATH, "Default normalization rules", "default_normalization_rules"),
        "protocol_merge": heading_ref(AUTHORITY_PROTOCOL_PATH, "9.9B Multi-source response merge protocol", "multi_source_response_merge"),
        "protocol_ingress": heading_ref(AUTHORITY_PROTOCOL_PATH, "9.9A Inbound authority ingress protocol", "inbound_authority_ingress"),
        "protocol_write_rules": heading_ref(AUTHORITY_PROTOCOL_PATH, "9.10 Submission-state write rules", "submission_state_write_rules"),
        "protocol_allowed_write_rules": heading_ref(AUTHORITY_PROTOCOL_PATH, "Allowed write rules", "allowed_write_rules"),
        "protocol_calculation": heading_ref(AUTHORITY_PROTOCOL_PATH, "9.11 Calculation handshake protocol", "calculation_handshake_protocol"),
        "protocol_duplicates": heading_ref(AUTHORITY_PROTOCOL_PATH, "9.12 Duplicate and pending-state rules", "duplicate_and_pending_state_rules"),
        "protocol_duplicate_handling": heading_ref(AUTHORITY_PROTOCOL_PATH, "Duplicate handling", "duplicate_handling"),
        "protocol_reconciliation": heading_ref(AUTHORITY_PROTOCOL_PATH, "9.13 Reconciliation protocol", "reconciliation_protocol"),
        "protocol_reconciliation_inputs": heading_ref(AUTHORITY_PROTOCOL_PATH, "Reconciliation inputs", "reconciliation_inputs"),
        "protocol_reconciliation_outputs": heading_ref(AUTHORITY_PROTOCOL_PATH, "Reconciliation outputs", "reconciliation_outputs"),
        "protocol_reconciliation_budget": heading_ref(AUTHORITY_PROTOCOL_PATH, "9.13A Reconciliation budget and escalation rule", "reconciliation_budget_and_escalation"),
        "protocol_reconciliation_confidence": heading_ref(AUTHORITY_PROTOCOL_PATH, "9.13B Quantitative reconciliation confidence and ambiguity", "reconciliation_confidence_and_ambiguity"),
        "protocol_out_of_band": heading_ref(AUTHORITY_PROTOCOL_PATH, "9.14 Out-of-band and authority-correction semantics", "out_of_band_and_corrections"),
        "protocol_audit": heading_ref(AUTHORITY_PROTOCOL_PATH, "9.15 Audit invariants", "audit_invariants"),
        "truth_purpose": heading_ref(AUTHORITY_TRUTH_PATH, "Purpose", "truth_projection_purpose"),
        "truth_model": heading_ref(AUTHORITY_TRUTH_PATH, "Governing Model", "truth_projection_model"),
        "truth_vocabulary": heading_ref(AUTHORITY_TRUTH_PATH, "State Vocabulary", "truth_projection_vocabulary"),
        "truth_required_outcomes": heading_ref(AUTHORITY_TRUTH_PATH, "Required Outcomes", "truth_projection_required_outcomes"),
        "truth_surface_rules": heading_ref(AUTHORITY_TRUTH_PATH, "Surface Rules", "truth_projection_surface_rules"),
        "connector_artifacts": heading_ref(CONNECTOR_CONTRACT_PATH, "Connector and delegation artifacts", "connector_and_delegation_artifacts"),
        "connector_persistence": heading_ref(CONNECTOR_CONTRACT_PATH, "Persistence rule", "connector_persistence_rule"),
        "calculation_artifacts": heading_ref(CALCULATION_CONTRACT_PATH, "Calculation artifacts", "authority_calculation_artifacts"),
        "calculation_persistence": heading_ref(CALCULATION_CONTRACT_PATH, "Persistence rule", "authority_calculation_persistence"),
        "northbound_command_envelope": heading_ref(NORTHBOUND_CONTRACT_PATH, "3. Command envelope", "northbound_command_envelope"),
        "module_AUTHORITY_PREFLIGHT": module_refs["AUTHORITY_PREFLIGHT"],
        "module_RESOLVE_AUTHORITY_OPERATION": module_refs["RESOLVE_AUTHORITY_OPERATION"],
        "module_RESOLVE_AUTHORITY_BINDING": module_refs["RESOLVE_AUTHORITY_BINDING"],
        "module_CANONICALIZE_AUTHORITY_REQUEST": module_refs["CANONICALIZE_AUTHORITY_REQUEST"],
        "module_DERIVE_AUTHORITY_REQUEST_HASHES": module_refs["DERIVE_AUTHORITY_REQUEST_HASHES"],
        "module_BUILD_AUTHORITY_REQUEST_ENVELOPE": module_refs["BUILD_AUTHORITY_REQUEST_ENVELOPE"],
        "module_BEGIN_SUBMISSION_RECORD": module_refs["BEGIN_SUBMISSION_RECORD"],
        "module_TRANSITION_SUBMISSION_RECORD": module_refs["TRANSITION_SUBMISSION_RECORD"],
        "module_EXISTING_SUBMISSIONS": module_refs["EXISTING_SUBMISSIONS"],
        "module_RECOVER_SUBMISSION_ATTEMPT": module_refs["RECOVER_SUBMISSION_ATTEMPT"],
        "module_SUBMISSION_GATE": module_refs["SUBMISSION_GATE"],
        "module_SUBMIT_TO_AUTHORITY": module_refs["SUBMIT_TO_AUTHORITY"],
        "module_CHECKPOINT_AUTHORITY_INGRESS": module_refs["CHECKPOINT_AUTHORITY_INGRESS"],
        "module_PROJECT_AUTHORITY_INGRESS_INVESTIGATION": module_refs["PROJECT_AUTHORITY_INGRESS_INVESTIGATION"],
        "module_NORMALIZE_AUTHORITY_RESPONSE": module_refs["NORMALIZE_AUTHORITY_RESPONSE"],
        "module_MERGE_AUTHORITY_RESPONSE_OBSERVATION": module_refs["MERGE_AUTHORITY_RESPONSE_OBSERVATION"],
        "module_RECORD_AUTHORITY_INTERACTION": module_refs["RECORD_AUTHORITY_INTERACTION"],
        "module_PERSIST_AUTHORITY_RECONCILIATION_CONTROL": module_refs["PERSIST_AUTHORITY_RECONCILIATION_CONTROL"],
        "module_RECONCILE_AUTHORITY_STATE": module_refs["RECONCILE_AUTHORITY_STATE"],
        "module_UPSERT_OBLIGATION_MIRROR": module_refs["UPSERT_OBLIGATION_MIRROR"],
        "module_EMIT_AUTHORITY_RECONCILIATION_ANALYTICS": module_refs["EMIT_AUTHORITY_RECONCILIATION_ANALYTICS"],
        "gate_SUBMISSION_GATE": find_gate_ref(gate_registry, "SUBMISSION_GATE"),
        "vector_TV_68": heading_ref(TEST_VECTORS_PATH, "TV-68: Delayed acknowledgement resolves unknown without duplicate resend", "TV_68"),
        "vector_TV_69": heading_ref(TEST_VECTORS_PATH, "TV-69: Duplicate bucket changes before send abort the queued exchange", "TV_69"),
        "vector_TV_69A": heading_ref(TEST_VECTORS_PATH, "TV-69A: Drift sentinel freezes blocked send lineage instead of logging drift loosely", "TV_69A"),
        "vector_TV_69B": heading_ref(TEST_VECTORS_PATH, "TV-69B: Recovery and reconciliation reads reuse the same drift sentinel boundary", "TV_69B"),
        "vector_TV_70": heading_ref(TEST_VECTORS_PATH, "TV-70: Ambiguous ingress is quarantined instead of mutating legal state", "TV_70"),
        "vector_TV_70A": heading_ref(TEST_VECTORS_PATH, "TV-70A: Authority-reference-only ingress stays quarantined until stronger lineage proof exists", "TV_70A"),
        "vector_TV_70B": heading_ref(TEST_VECTORS_PATH, "TV-70B: Callback, poll, and recovery duplicates collapse to one canonical ingress receipt", "TV_70B"),
        "vector_TV_70C": heading_ref(TEST_VECTORS_PATH, "TV-70C: Callback and poll corroboration does not create a second legal-state mutation", "TV_70C"),
        "vector_TV_70D": heading_ref(TEST_VECTORS_PATH, "TV-70D: Timeout placeholder cannot be silently replaced by later recovery evidence", "TV_70D"),
        "vector_TV_70E": heading_ref(TEST_VECTORS_PATH, "TV-70E: Conflicting callback and poll observations force reconciliation instead of source precedence", "TV_70E"),
        "vector_TV_70F": heading_ref(TEST_VECTORS_PATH, "TV-70F: Recovery and continuation preserve the open reconciliation budget instead of resetting it", "TV_70F"),
        "vector_TV_70G": heading_ref(TEST_VECTORS_PATH, "TV-70G: Budget exhaustion blocks resend and opens explicit escalation ownership", "TV_70G"),
        "vector_TV_70H": heading_ref(TEST_VECTORS_PATH, "TV-70H: Contradictory authority evidence blocks resend before budget math can reopen transport", "TV_70H"),
        "vector_TV_70I": heading_ref(TEST_VECTORS_PATH, "TV-70I: Pending authority truth cannot render resolved workflow or client reassurance", "TV_70I"),
        "vector_TV_70J": heading_ref(TEST_VECTORS_PATH, "TV-70J: Rejected authority truth cannot be overwritten by internal completion", "TV_70J"),
        "vector_TV_70K": heading_ref(TEST_VECTORS_PATH, "TV-70K: Confirmed authority truth resolves downstream state only from authority evidence", "TV_70K"),
        "vector_TV_70L": heading_ref(TEST_VECTORS_PATH, "TV-70L: Unknown and out-of-band authority outcomes stay typed and non-confirming", "TV_70L"),
        "vector_TV_70M": heading_ref(TEST_VECTORS_PATH, "TV-70M: Late authority correction reopens previously resolved projections", "TV_70M"),
        "vector_TV_70N": heading_ref(TEST_VECTORS_PATH, "TV-70N: Override and accepted-risk posture remain internal annotations only", "TV_70N"),
        "vector_TV_70O": heading_ref(TEST_VECTORS_PATH, "TV-70O: Async authority observations must retain persisted ingress proof", "TV_70O"),
        "vector_TV_70P": heading_ref(TEST_VECTORS_PATH, "TV-70P: Weak or unbound ingress proof cannot drive settlement or mirror mutation", "TV_70P"),
        "vector_TV_70Q": heading_ref(TEST_VECTORS_PATH, "TV-70Q: Quarantined ingress remains explainable from persisted payload and correlation evidence", "TV_70Q"),
        "vector_TV_70R": heading_ref(TEST_VECTORS_PATH, "TV-70R: Unbound ingress distinguishes missing provider keys from no-match posture", "TV_70R"),
        "vector_TV_70S": heading_ref(TEST_VECTORS_PATH, "TV-70S: Duplicate-suppressed ingress investigation points back to the canonical receipt", "TV_70S"),
        "vector_TV_70T": heading_ref(TEST_VECTORS_PATH, "TV-70T: Restore and replay reuse the grouped reconciliation control contract", "TV_70T"),
        "vector_TV_70U": heading_ref(TEST_VECTORS_PATH, "TV-70U: Escalation handoff preserves owner, workflow, evidence, and due time", "TV_70U"),
        "vector_TV_70V": heading_ref(TEST_VECTORS_PATH, "TV-70V: Reconciliation analytics derive only from durable control contracts", "TV_70V"),
        "vector_TV_79P": heading_ref(TEST_VECTORS_PATH, "TV-79P: Authority preflight invariant blocks live send before transport mutation", "TV_79P"),
    }


def build_core_protocol_objects(refs: dict[str, str]) -> list[dict[str, Any]]:
    return [
        {
            "object_name": "AuthorityOperation",
            "schema_path": repo_rel(AUTHORITY_OPERATION_SCHEMA_PATH),
            "prose_owner_ref": refs["protocol_operation"],
            "truth_owner": "ENGINE_INTENT_AND_BOUNDARY_CONTROL",
            "operation_roles": [
                "freezes requested_scope[] and runtime_scope[]",
                "freezes tenant/client/attempt lineage",
                "freezes provider environment, API version, and authority scope",
                "freezes binding lineage and executable partition scope",
            ],
            "module_bindings": [
                refs["module_AUTHORITY_PREFLIGHT"],
                refs["module_RESOLVE_AUTHORITY_OPERATION"],
            ],
            "source_refs": [
                refs["protocol_core_objects"],
                refs["protocol_operation"],
                refs["protocol_scope"],
                refs["connector_artifacts"],
            ],
            "notes": [
                "requested_scope[] preserves caller intent while runtime_scope[] drives legality, duplicate handling, and request identity.",
            ],
        },
        {
            "object_name": "AuthorityBinding",
            "schema_path": repo_rel(AUTHORITY_BINDING_SCHEMA_PATH),
            "prose_owner_ref": refs["protocol_binding"],
            "truth_owner": "FROZEN_AUTHORITY_CONTEXT",
            "operation_roles": [
                "separates internal permission, delegation, authority-link readiness, and token/client binding",
                "freezes access_binding_hash and policy snapshot",
                "preserves step-up and approval evidence",
                "exposes typed failure posture before transport",
            ],
            "module_bindings": [
                refs["module_AUTHORITY_PREFLIGHT"],
                refs["module_RESOLVE_AUTHORITY_BINDING"],
            ],
            "source_refs": [
                refs["protocol_binding"],
                refs["protocol_binding_rule"],
                refs["protocol_send_revalidation"],
                refs["actor_policy"],
                refs["actor_delegation_rules"],
            ],
            "notes": [
                "Token rotation may advance token_version_ref only inside one binding_lineage_ref.",
                "A client, subject, authority-scope, or provider-contract change allocates a new binding instead of silently rebinding.",
            ],
        },
        {
            "object_name": "AuthorityRequestEnvelope",
            "schema_path": repo_rel(AUTHORITY_REQUEST_ENVELOPE_SCHEMA_PATH),
            "prose_owner_ref": refs["protocol_request_envelope"],
            "truth_owner": "SEALED_REQUEST_IDENTITY",
            "operation_roles": [
                "holds canonical path/query/payload identity",
                "holds request hashes and duplicate meaning",
                "holds fraud-header profile refs",
                "holds grouped request_identity_contract reused downstream",
            ],
            "module_bindings": [
                refs["module_CANONICALIZE_AUTHORITY_REQUEST"],
                refs["module_DERIVE_AUTHORITY_REQUEST_HASHES"],
                refs["module_BUILD_AUTHORITY_REQUEST_ENVELOPE"],
            ],
            "source_refs": [
                refs["protocol_request_envelope"],
                refs["protocol_hashing"],
                refs["protocol_idempotency"],
                refs["protocol_fraud_headers"],
            ],
            "notes": [
                "A sendable envelope cannot exist until all identity fields, approvals, and any step-up evidence are frozen.",
                "token_version_ref is intentionally excluded from the sealed request identity.",
            ],
        },
        {
            "object_name": "AuthorityResponseEnvelope",
            "schema_path": repo_rel(AUTHORITY_RESPONSE_ENVELOPE_SCHEMA_PATH),
            "prose_owner_ref": refs["protocol_response_envelope"],
            "truth_owner": "NORMALIZED_AUTHORITY_OBSERVATION",
            "operation_roles": [
                "normalizes provider outcomes into response classes",
                "retains correlation_status, derivation_posture, and legal_effect_posture",
                "retains ingress proof for async sources",
                "preserves conflicting, corroborating, and timeout lineage",
            ],
            "module_bindings": [
                refs["module_SUBMIT_TO_AUTHORITY"],
                refs["module_NORMALIZE_AUTHORITY_RESPONSE"],
                refs["module_MERGE_AUTHORITY_RESPONSE_OBSERVATION"],
            ],
            "source_refs": [
                refs["protocol_response_envelope"],
                refs["protocol_response_classes"],
                refs["protocol_merge"],
                refs["protocol_ingress"],
            ],
            "notes": [
                "AuthorityResponseEnvelope is an observation artifact, not the legal settlement ledger by itself.",
            ],
        },
        {
            "object_name": "AuthorityInteractionRecord",
            "schema_path": repo_rel(AUTHORITY_INTERACTION_RECORD_SCHEMA_PATH),
            "prose_owner_ref": refs["protocol_interaction_record"],
            "truth_owner": "AUTHORITY_RUNTIME_LEDGER",
            "operation_roles": [
                "links operation, request, responses, submission, and audit lineage",
                "persists active_response_id and complete response history",
                "persists grouped binding drift sentinel and reconciliation control",
                "persists resend legality and escalation ownership",
            ],
            "module_bindings": [
                refs["module_RECORD_AUTHORITY_INTERACTION"],
                refs["module_PERSIST_AUTHORITY_RECONCILIATION_CONTROL"],
                refs["module_RECONCILE_AUTHORITY_STATE"],
            ],
            "source_refs": [
                refs["protocol_interaction_record"],
                refs["protocol_merge"],
                refs["protocol_reconciliation_budget"],
                refs["truth_surface_rules"],
            ],
            "notes": [
                "The interaction record is a runtime ledger and may not by itself promote customer or workflow layers into confirmed legal truth.",
            ],
        },
        {
            "object_name": "AuthorityIngressReceipt",
            "schema_path": repo_rel(AUTHORITY_INGRESS_RECEIPT_SCHEMA_PATH),
            "prose_owner_ref": refs["protocol_ingress"],
            "truth_owner": "AUTHORITY_INGRESS_CHECKPOINT",
            "operation_roles": [
                "checkpoints authenticated provider payloads before mutation",
                "stores dedupe identity and correlation result",
                "anchors grouped ingress proof and correlation contracts",
                "retains response_body_ref for quarantine and investigation",
            ],
            "module_bindings": [
                refs["module_CHECKPOINT_AUTHORITY_INGRESS"],
                refs["module_PROJECT_AUTHORITY_INGRESS_INVESTIGATION"],
                refs["module_NORMALIZE_AUTHORITY_RESPONSE"],
            ],
            "source_refs": [
                refs["protocol_ingress"],
                refs["truth_surface_rules"],
                refs["truth_required_outcomes"],
            ],
            "notes": [
                "Ingress receipts are checkpoint truth only and cannot settle legal state until strong binding and normalization complete.",
            ],
        },
        {
            "object_name": "AuthorityOperationProfile",
            "schema_path": repo_rel(AUTHORITY_OPERATION_PROFILE_SCHEMA_PATH),
            "prose_owner_ref": refs["protocol_operation_profiles"],
            "truth_owner": "PROVIDER_CONTRACT_FREEZE",
            "operation_roles": [
                "freezes transport method and path behavior",
                "freezes required executable scope",
                "freezes fraud-header posture and idempotency strategy",
                "freezes success, pending, unknown, and reconciliation semantics",
            ],
            "module_bindings": [
                refs["module_AUTHORITY_PREFLIGHT"],
                refs["module_RESOLVE_AUTHORITY_OPERATION"],
            ],
            "source_refs": [
                refs["protocol_operation_profiles"],
                refs["connector_artifacts"],
                refs["connector_persistence"],
            ],
            "notes": [
                "AuthorityOperationProfile is the provider-contract seam later adapters must instantiate product-by-product.",
            ],
        },
        {
            "object_name": "SubmissionRecord",
            "schema_path": repo_rel(SUBMISSION_RECORD_SCHEMA_PATH),
            "prose_owner_ref": refs["protocol_write_rules"],
            "truth_owner": "AUTHORITY_SETTLEMENT_LEDGER",
            "operation_roles": [
                "is the only durable settlement ledger for authority truth",
                "holds the request-backed lifecycle for one meaning",
                "carries request_identity_contract on request-backed flows",
                "may carry out-of-band posture only from external truth or correction",
            ],
            "module_bindings": [
                refs["module_BEGIN_SUBMISSION_RECORD"],
                refs["module_TRANSITION_SUBMISSION_RECORD"],
                refs["module_RECONCILE_AUTHORITY_STATE"],
            ],
            "source_refs": [
                refs["protocol_write_rules"],
                refs["protocol_allowed_write_rules"],
                refs["truth_surface_rules"],
            ],
            "notes": [
                "No internal optimism, UI completion, override, or accepted-risk posture may write CONFIRMED.",
            ],
        },
        {
            "object_name": "ObligationMirror",
            "schema_path": repo_rel(OBLIGATION_MIRROR_SCHEMA_PATH),
            "prose_owner_ref": refs["truth_surface_rules"],
            "truth_owner": "INTERNAL_OBLIGATION_MIRROR",
            "operation_roles": [
                "keeps current_submission_ref distinct from last_confirmed_submission_ref",
                "projects authority truth into internal coordination form",
                "reopens when late authority corrections arrive",
                "stays subordinate to SubmissionRecord settlement truth",
            ],
            "module_bindings": [
                refs["module_RECONCILE_AUTHORITY_STATE"],
                refs["module_UPSERT_OBLIGATION_MIRROR"],
            ],
            "source_refs": [
                refs["protocol_reconciliation"],
                refs["truth_surface_rules"],
                refs["truth_required_outcomes"],
            ],
            "notes": [
                "ObligationMirror must not collapse pending, rejected, unknown, or out-of-band posture into a confirmed-looking anchor.",
            ],
        },
    ]


def build_submission_state_write_rules() -> list[dict[str, Any]]:
    return [
        {
            "rule_id": "WRITE_INTENT_ONLY_BEFORE_SEND",
            "allowed_states": ["INTENT_RECORDED", "TRANSMIT_PENDING", "TRANSMITTED"],
            "trigger_classes": ["REQUEST_BUILD", "SEND_GATE_CLEAR", "SEND_DISPATCHED"],
            "protected_surfaces": ["SubmissionRecord"],
            "prohibitions": [
                "Must freeze request_identity_contract before the request leaves the engine.",
            ],
        },
        {
            "rule_id": "WRITE_PENDING_ACK_ONLY_FROM_ACCEPTED_OR_PROFILED_RETRYABLE_OUTCOME",
            "allowed_states": ["PENDING_ACK"],
            "trigger_classes": ["ACK_ACCEPTED_PENDING", "ACK_RETRYABLE_FAILURE", "RECONCILED_STILL_PENDING"],
            "protected_surfaces": ["SubmissionRecord", "ObligationMirror"],
            "prohibitions": [
                "Pending posture must stay explicit and non-confirming.",
            ],
        },
        {
            "rule_id": "WRITE_CONFIRMED_ONLY_FROM_VALIDATED_AUTHORITY_EVIDENCE",
            "allowed_states": ["CONFIRMED"],
            "trigger_classes": ["ACK_SUCCESS", "RECONCILED_CONFIRMED"],
            "protected_surfaces": ["SubmissionRecord", "ObligationMirror", "ClientTimelineEvent"],
            "prohibitions": [
                "Internal optimism, workflow completion, override, and accepted-risk posture cannot confirm legal truth.",
            ],
        },
        {
            "rule_id": "WRITE_REJECTED_ONLY_FROM_VALIDATED_AUTHORITY_EVIDENCE",
            "allowed_states": ["REJECTED"],
            "trigger_classes": ["ACK_REJECTED_VALIDATION", "RECONCILED_REJECTED"],
            "protected_surfaces": ["SubmissionRecord", "ObligationMirror"],
            "prohibitions": [
                "Rejection must keep authority_evidence_ref.",
            ],
        },
        {
            "rule_id": "WRITE_UNKNOWN_ONLY_FROM_TIMEOUT_OR_UNRESOLVED_RECONCILIATION",
            "allowed_states": ["UNKNOWN"],
            "trigger_classes": ["ACK_TIMEOUT_OR_NO_RESOLUTION", "RECONCILED_UNRESOLVED"],
            "protected_surfaces": ["SubmissionRecord", "ObligationMirror", "WorkflowItem"],
            "prohibitions": [
                "Unknown posture cannot silently reopen blind resend or customer reassurance.",
            ],
        },
        {
            "rule_id": "WRITE_OUT_OF_BAND_ONLY_FROM_EXTERNAL_DISCOVERY_OR_CORRECTION",
            "allowed_states": ["OUT_OF_BAND"],
            "trigger_classes": ["ACK_EXTERNAL_STATE_DISCOVERED", "RECONCILED_OUT_OF_BAND"],
            "protected_surfaces": ["SubmissionRecord", "ObligationMirror", "ClientTimelineEvent"],
            "prohibitions": [
                "Out-of-band state must open reconciliation rather than being absorbed into the active manifest flow.",
            ],
        },
        {
            "rule_id": "REQUEST_BACKED_MUTATION_REQUIRES_PERSISTED_INGRESS_PROOF",
            "allowed_states": ["PENDING_ACK", "CONFIRMED", "REJECTED", "UNKNOWN", "OUT_OF_BAND"],
            "trigger_classes": ["ASYNC_NORMALIZATION", "RECONCILIATION_RESULT"],
            "protected_surfaces": ["SubmissionRecord", "ObligationMirror"],
            "prohibitions": [
                "Callback, poll, and recovery transport memory may not mutate legal state before AuthorityIngressReceipt is durable and correlated.",
            ],
        },
        {
            "rule_id": "FORBID_INTERNAL_OPTIMISTIC_CONFIRMATION",
            "allowed_states": [],
            "trigger_classes": ["ALL"],
            "protected_surfaces": ["SubmissionRecord", "ObligationMirror", "WorkflowItem", "ClientTimelineEvent"],
            "prohibitions": [
                "The protocol may never infer confirmation from dispatch alone, UI completion, workflow closure, override, or accepted-risk posture.",
            ],
        },
    ]


def build_operation_records(refs: dict[str, str], operation_families: list[str]) -> list[dict[str, Any]]:
    operation_specs: dict[str, dict[str, Any]] = {
        "AUTH_READ_REFERENCE": {
            "protocol_family": "authority_read",
            "scope_requirements": [
                "runtime_scope[] must exclude submit and amendment_submit tokens",
                "business_partitions[] may be empty only for account-level or global read posture",
                "target authority reference or correlation key must remain explicit",
            ],
            "idempotency_strategy": "REQUEST_HASH",
            "response_classes": [
                "ACK_SUCCESS",
                "ACK_REJECTED_AUTH",
                "ACK_RETRYABLE_FAILURE",
                "ACK_TIMEOUT_OR_NO_RESOLUTION",
                "ACK_AMBIGUOUS_CORRELATION",
                "ACK_INCONSISTENT_STATE",
            ],
            "submission_state_write_rules": [],
            "truth_owner": "AUTHORITY_SYSTEM via AuthorityIngressReceipt and AuthorityInteractionRecord",
            "projection_rules": [
                "May refresh read-side reference context only after authenticated, strongly bound ingress or inline response.",
                "Must not fabricate settlement truth or confirmed customer posture from reference reads.",
            ],
            "notes": [
                "Reference reads are authority-owned observations and remain subordinate to the authority-of-record boundary.",
            ],
            "module_bindings": [
                "AUTHORITY_PREFLIGHT",
                "RESOLVE_AUTHORITY_OPERATION",
                "RESOLVE_AUTHORITY_BINDING",
                "CANONICALIZE_AUTHORITY_REQUEST",
                "DERIVE_AUTHORITY_REQUEST_HASHES",
                "BUILD_AUTHORITY_REQUEST_ENVELOPE",
                "SUBMIT_TO_AUTHORITY",
                "NORMALIZE_AUTHORITY_RESPONSE",
                "MERGE_AUTHORITY_RESPONSE_OBSERVATION",
                "RECORD_AUTHORITY_INTERACTION",
            ],
            "source_refs": [
                refs["protocol_scope"],
                refs["protocol_operation"],
                refs["protocol_hashing"],
                refs["protocol_response_classes"],
                refs["protocol_ingress"],
            ],
        },
        "AUTH_READ_OBLIGATIONS": {
            "protocol_family": "authority_read",
            "scope_requirements": [
                "runtime_scope[] must exclude submit and amendment_submit tokens",
                "period and authority_scope must remain explicit",
                "obligation reads may surface stronger external truth but cannot directly confirm an active packet flow without reconciliation",
            ],
            "idempotency_strategy": "REQUEST_HASH",
            "response_classes": [
                "ACK_SUCCESS",
                "ACK_REJECTED_AUTH",
                "ACK_RETRYABLE_FAILURE",
                "ACK_TIMEOUT_OR_NO_RESOLUTION",
                "ACK_EXTERNAL_STATE_DISCOVERED",
                "ACK_AMBIGUOUS_CORRELATION",
                "ACK_INCONSISTENT_STATE",
            ],
            "submission_state_write_rules": [
                "WRITE_OUT_OF_BAND_ONLY_FROM_EXTERNAL_DISCOVERY_OR_CORRECTION",
                "REQUEST_BACKED_MUTATION_REQUIRES_PERSISTED_INGRESS_PROOF",
                "FORBID_INTERNAL_OPTIMISTIC_CONFIRMATION",
            ],
            "truth_owner": "AUTHORITY_SYSTEM via SubmissionRecord and ObligationMirror after reconciliation",
            "projection_rules": [
                "Obligations reads may move legal posture only through reconciliation-owned paths.",
                "Customer-safe projection must keep UNKNOWN, PENDING_ACK, and OUT_OF_BAND typed and non-confirming.",
            ],
            "notes": [
                "This family is a key read-after-write and out-of-band discovery surface.",
            ],
            "module_bindings": [
                "AUTHORITY_PREFLIGHT",
                "EXISTING_SUBMISSIONS",
                "CHECKPOINT_AUTHORITY_INGRESS",
                "NORMALIZE_AUTHORITY_RESPONSE",
                "RECONCILE_AUTHORITY_STATE",
                "UPSERT_OBLIGATION_MIRROR",
            ],
            "source_refs": [
                refs["protocol_scope"],
                refs["protocol_duplicates"],
                refs["protocol_reconciliation"],
                refs["protocol_out_of_band"],
                refs["truth_surface_rules"],
            ],
        },
        "AUTH_READ_CALCULATION": {
            "protocol_family": "authority_read",
            "scope_requirements": [
                "runtime_scope[] must exclude submit and amendment_submit tokens",
                "calculation lineage or basis target must remain explicit",
                "read-side calculation retrieval must preserve exact calculation hash linkage",
            ],
            "idempotency_strategy": "REQUEST_HASH",
            "response_classes": [
                "ACK_SUCCESS",
                "ACK_REJECTED_AUTH",
                "ACK_RETRYABLE_FAILURE",
                "ACK_TIMEOUT_OR_NO_RESOLUTION",
                "ACK_AMBIGUOUS_CORRELATION",
                "ACK_INCONSISTENT_STATE",
            ],
            "submission_state_write_rules": [],
            "truth_owner": "AUTHORITY_SYSTEM for calculation evidence; filing truth stays unsettled until a separate submission path confirms it",
            "projection_rules": [
                "Retrieved calculation artifacts remain separate from settlement truth.",
                "Read-side calculation results must not be confused with filing confirmation.",
            ],
            "notes": [
                "AUTH_READ_CALCULATION participates in the calculation handshake but does not itself confirm legal submission state.",
            ],
            "module_bindings": [
                "AUTHORITY_PREFLIGHT",
                "SUBMIT_TO_AUTHORITY",
                "NORMALIZE_AUTHORITY_RESPONSE",
                "RECORD_AUTHORITY_INTERACTION",
            ],
            "source_refs": [
                refs["protocol_scope"],
                refs["protocol_calculation"],
                refs["calculation_artifacts"],
                refs["calculation_persistence"],
            ],
        },
        "AUTH_CREATE_OR_AMEND_DATA": {
            "protocol_family": "authority_mutation",
            "scope_requirements": [
                "runtime_scope[] must remain mutation-capable but must not be widened after authorization",
                "business_partitions[] must be non-empty and match executable partition scope",
                "provider environment, API version, and authority scope must remain frozen for replay and duplicate handling",
            ],
            "idempotency_strategy": "REQUEST_HASH_AND_IDEMPOTENCY_KEY",
            "response_classes": [
                "ACK_SUCCESS",
                "ACK_ACCEPTED_PENDING",
                "ACK_REJECTED_VALIDATION",
                "ACK_REJECTED_AUTH",
                "ACK_RETRYABLE_FAILURE",
                "ACK_TIMEOUT_OR_NO_RESOLUTION",
                "ACK_EXTERNAL_STATE_DISCOVERED",
                "ACK_AMBIGUOUS_CORRELATION",
                "ACK_INCONSISTENT_STATE",
            ],
            "submission_state_write_rules": [
                "WRITE_INTENT_ONLY_BEFORE_SEND",
                "WRITE_PENDING_ACK_ONLY_FROM_ACCEPTED_OR_PROFILED_RETRYABLE_OUTCOME",
                "WRITE_REJECTED_ONLY_FROM_VALIDATED_AUTHORITY_EVIDENCE",
                "WRITE_UNKNOWN_ONLY_FROM_TIMEOUT_OR_UNRESOLVED_RECONCILIATION",
                "WRITE_OUT_OF_BAND_ONLY_FROM_EXTERNAL_DISCOVERY_OR_CORRECTION",
                "REQUEST_BACKED_MUTATION_REQUIRES_PERSISTED_INGRESS_PROOF",
                "FORBID_INTERNAL_OPTIMISTIC_CONFIRMATION",
            ],
            "truth_owner": "AUTHORITY_SYSTEM via SubmissionRecord settlement ledger",
            "projection_rules": [
                "Mutations open request-backed settlement lineage and may only settle through authority evidence.",
                "Read-side projections must mirror typed pending, unknown, rejected, or out-of-band posture instead of guessing success.",
            ],
            "notes": [
                "Safe recovery may reuse exact lineage; blind resend is blocked by collision, stronger truth, or exhausted reconciliation budget.",
            ],
            "module_bindings": [
                "AUTHORITY_PREFLIGHT",
                "BUILD_AUTHORITY_REQUEST_ENVELOPE",
                "BEGIN_SUBMISSION_RECORD",
                "SUBMISSION_GATE",
                "SUBMIT_TO_AUTHORITY",
                "RECONCILE_AUTHORITY_STATE",
            ],
            "source_refs": [
                refs["protocol_scope"],
                refs["protocol_duplicates"],
                refs["protocol_reconciliation_budget"],
                refs["module_SUBMISSION_GATE"],
                refs["gate_SUBMISSION_GATE"],
            ],
        },
        "AUTH_DELETE_DATA": {
            "protocol_family": "authority_mutation",
            "scope_requirements": [
                "runtime_scope[] must stay mutation-capable and partition-bound",
                "target authority reference must remain explicit",
                "binding lineage, authority scope, and environment freeze duplicate identity",
            ],
            "idempotency_strategy": "REQUEST_HASH_AND_IDEMPOTENCY_KEY",
            "response_classes": [
                "ACK_SUCCESS",
                "ACK_ACCEPTED_PENDING",
                "ACK_REJECTED_VALIDATION",
                "ACK_REJECTED_AUTH",
                "ACK_RETRYABLE_FAILURE",
                "ACK_TIMEOUT_OR_NO_RESOLUTION",
                "ACK_EXTERNAL_STATE_DISCOVERED",
                "ACK_AMBIGUOUS_CORRELATION",
                "ACK_INCONSISTENT_STATE",
            ],
            "submission_state_write_rules": [
                "WRITE_INTENT_ONLY_BEFORE_SEND",
                "WRITE_PENDING_ACK_ONLY_FROM_ACCEPTED_OR_PROFILED_RETRYABLE_OUTCOME",
                "WRITE_REJECTED_ONLY_FROM_VALIDATED_AUTHORITY_EVIDENCE",
                "WRITE_UNKNOWN_ONLY_FROM_TIMEOUT_OR_UNRESOLVED_RECONCILIATION",
                "REQUEST_BACKED_MUTATION_REQUIRES_PERSISTED_INGRESS_PROOF",
                "FORBID_INTERNAL_OPTIMISTIC_CONFIRMATION",
            ],
            "truth_owner": "AUTHORITY_SYSTEM via SubmissionRecord settlement ledger",
            "projection_rules": [
                "Deletion semantics remain authority-owned and cannot be inferred from local absence alone.",
                "Conflicting or out-of-band delete observations must route through reconciliation instead of local precedence.",
            ],
            "notes": [
                "Delete flows must never reopen transport after binding-lineage drift or request-body collision.",
            ],
            "module_bindings": [
                "AUTHORITY_PREFLIGHT",
                "BEGIN_SUBMISSION_RECORD",
                "SUBMISSION_GATE",
                "SUBMIT_TO_AUTHORITY",
                "RECONCILE_AUTHORITY_STATE",
            ],
            "source_refs": [
                refs["protocol_scope"],
                refs["protocol_send_revalidation"],
                refs["protocol_duplicate_handling"],
                refs["protocol_reconciliation"],
                refs["vector_TV_69"],
            ],
        },
        "AUTH_TRIGGER_CALCULATION": {
            "protocol_family": "authority_calculation",
            "scope_requirements": [
                "runtime_scope[] must carry prepare_submission or amendment_intent, never submit or amendment_submit",
                "basis_type must remain non-null",
                "business_partitions[] must be non-empty",
                "calculation_handshake_hash must be reverified before any dependent filing or amendment transmit",
            ],
            "idempotency_strategy": "REQUEST_HASH_AND_IDEMPOTENCY_KEY",
            "response_classes": [
                "ACK_SUCCESS",
                "ACK_ACCEPTED_PENDING",
                "ACK_REJECTED_VALIDATION",
                "ACK_REJECTED_AUTH",
                "ACK_RETRYABLE_FAILURE",
                "ACK_TIMEOUT_OR_NO_RESOLUTION",
                "ACK_AMBIGUOUS_CORRELATION",
                "ACK_INCONSISTENT_STATE",
            ],
            "submission_state_write_rules": [],
            "truth_owner": "AUTHORITY_SYSTEM for calculation evidence; filing truth remains separate",
            "projection_rules": [
                "Calculation readiness is a sealed gate-consumption object, not a proxy for settlement truth.",
                "Live_authority_call_executed=false forces modeled posture and clears reusable hashes.",
            ],
            "notes": [
                "Calculation trigger flows are authority-facing but must not widen into a submit scope.",
            ],
            "module_bindings": [
                "AUTHORITY_PREFLIGHT",
                "SUBMIT_TO_AUTHORITY",
                "NORMALIZE_AUTHORITY_RESPONSE",
                "RECORD_AUTHORITY_INTERACTION",
            ],
            "source_refs": [
                refs["protocol_scope"],
                refs["protocol_calculation"],
                refs["calculation_artifacts"],
                refs["calculation_persistence"],
            ],
        },
        "AUTH_SUBMIT_FINAL_DECLARATION": {
            "protocol_family": "authority_submission",
            "scope_requirements": [
                "runtime_scope[] must include year_end then submit",
                "basis_type must be non-null",
                "target_obligation_ref must be explicit",
                "business_partitions[] must be non-empty",
                "calculation_handshake_hash must be confirmed before packet build and again at send time",
            ],
            "idempotency_strategy": "REQUEST_HASH_AND_IDEMPOTENCY_KEY",
            "response_classes": [
                "ACK_SUCCESS",
                "ACK_ACCEPTED_PENDING",
                "ACK_REJECTED_VALIDATION",
                "ACK_REJECTED_AUTH",
                "ACK_RETRYABLE_FAILURE",
                "ACK_TIMEOUT_OR_NO_RESOLUTION",
                "ACK_EXTERNAL_STATE_DISCOVERED",
                "ACK_AMBIGUOUS_CORRELATION",
                "ACK_INCONSISTENT_STATE",
            ],
            "submission_state_write_rules": [
                "WRITE_INTENT_ONLY_BEFORE_SEND",
                "WRITE_PENDING_ACK_ONLY_FROM_ACCEPTED_OR_PROFILED_RETRYABLE_OUTCOME",
                "WRITE_CONFIRMED_ONLY_FROM_VALIDATED_AUTHORITY_EVIDENCE",
                "WRITE_REJECTED_ONLY_FROM_VALIDATED_AUTHORITY_EVIDENCE",
                "WRITE_UNKNOWN_ONLY_FROM_TIMEOUT_OR_UNRESOLVED_RECONCILIATION",
                "WRITE_OUT_OF_BAND_ONLY_FROM_EXTERNAL_DISCOVERY_OR_CORRECTION",
                "REQUEST_BACKED_MUTATION_REQUIRES_PERSISTED_INGRESS_PROOF",
                "FORBID_INTERNAL_OPTIMISTIC_CONFIRMATION",
            ],
            "truth_owner": "AUTHORITY_SYSTEM via SubmissionRecord settlement ledger",
            "projection_rules": [
                "Final declaration completion may not outrank pending, unknown, out-of-band, or corrected authority truth.",
                "Workflow and customer projection must reopen if later authority correction contradicts earlier resolution.",
            ],
            "notes": [
                "This family is the clearest embodiment of sent-does-not-mean-confirmed.",
            ],
            "module_bindings": [
                "AUTHORITY_PREFLIGHT",
                "BUILD_AUTHORITY_REQUEST_ENVELOPE",
                "BEGIN_SUBMISSION_RECORD",
                "SUBMISSION_GATE",
                "SUBMIT_TO_AUTHORITY",
                "RECONCILE_AUTHORITY_STATE",
                "UPSERT_OBLIGATION_MIRROR",
            ],
            "source_refs": [
                refs["protocol_scope"],
                refs["protocol_calculation"],
                refs["protocol_write_rules"],
                refs["protocol_reconciliation"],
                refs["vector_TV_70K"],
            ],
        },
        "AUTH_SUBMIT_PERIODIC_UPDATE": {
            "protocol_family": "authority_submission",
            "scope_requirements": [
                "runtime_scope[] must include quarterly_update then submit",
                "target_obligation_ref must be explicit",
                "business_partitions[] must be non-empty",
                "authorized runtime scope, not raw caller intent, governs duplicate handling and legality",
            ],
            "idempotency_strategy": "REQUEST_HASH_AND_IDEMPOTENCY_KEY",
            "response_classes": [
                "ACK_SUCCESS",
                "ACK_ACCEPTED_PENDING",
                "ACK_REJECTED_VALIDATION",
                "ACK_REJECTED_AUTH",
                "ACK_RETRYABLE_FAILURE",
                "ACK_TIMEOUT_OR_NO_RESOLUTION",
                "ACK_EXTERNAL_STATE_DISCOVERED",
                "ACK_AMBIGUOUS_CORRELATION",
                "ACK_INCONSISTENT_STATE",
            ],
            "submission_state_write_rules": [
                "WRITE_INTENT_ONLY_BEFORE_SEND",
                "WRITE_PENDING_ACK_ONLY_FROM_ACCEPTED_OR_PROFILED_RETRYABLE_OUTCOME",
                "WRITE_CONFIRMED_ONLY_FROM_VALIDATED_AUTHORITY_EVIDENCE",
                "WRITE_REJECTED_ONLY_FROM_VALIDATED_AUTHORITY_EVIDENCE",
                "WRITE_UNKNOWN_ONLY_FROM_TIMEOUT_OR_UNRESOLVED_RECONCILIATION",
                "WRITE_OUT_OF_BAND_ONLY_FROM_EXTERNAL_DISCOVERY_OR_CORRECTION",
                "REQUEST_BACKED_MUTATION_REQUIRES_PERSISTED_INGRESS_PROOF",
                "FORBID_INTERNAL_OPTIMISTIC_CONFIRMATION",
            ],
            "truth_owner": "AUTHORITY_SYSTEM via SubmissionRecord settlement ledger",
            "projection_rules": [
                "Pending acknowledgement and unknown postures must stay visible to workflow and client-safe projections.",
                "Recovery and read-after-write follow-up may continue, but blind resend is gated by persisted resend_legality_state.",
            ],
            "notes": [
                "Periodic update submission is the main duplicate-bucket and pending-state stress case.",
            ],
            "module_bindings": [
                "AUTHORITY_PREFLIGHT",
                "BEGIN_SUBMISSION_RECORD",
                "EXISTING_SUBMISSIONS",
                "SUBMISSION_GATE",
                "RECOVER_SUBMISSION_ATTEMPT",
                "SUBMIT_TO_AUTHORITY",
                "RECONCILE_AUTHORITY_STATE",
            ],
            "source_refs": [
                refs["protocol_scope"],
                refs["protocol_duplicates"],
                refs["protocol_reconciliation_budget"],
                refs["vector_TV_68"],
                refs["vector_TV_69"],
            ],
        },
        "AUTH_SUBMIT_POST_FINALISATION_AMENDMENT": {
            "protocol_family": "authority_submission",
            "scope_requirements": [
                "runtime_scope[] must include year_end then amendment_submit",
                "basis_type must be non-null",
                "target_obligation_ref must be explicit",
                "business_partitions[] must be non-empty",
                "amendment readiness and calculation basis must remain frozen before transmit",
            ],
            "idempotency_strategy": "REQUEST_HASH_AND_IDEMPOTENCY_KEY",
            "response_classes": [
                "ACK_SUCCESS",
                "ACK_ACCEPTED_PENDING",
                "ACK_REJECTED_VALIDATION",
                "ACK_REJECTED_AUTH",
                "ACK_RETRYABLE_FAILURE",
                "ACK_TIMEOUT_OR_NO_RESOLUTION",
                "ACK_EXTERNAL_STATE_DISCOVERED",
                "ACK_AMBIGUOUS_CORRELATION",
                "ACK_INCONSISTENT_STATE",
            ],
            "submission_state_write_rules": [
                "WRITE_INTENT_ONLY_BEFORE_SEND",
                "WRITE_PENDING_ACK_ONLY_FROM_ACCEPTED_OR_PROFILED_RETRYABLE_OUTCOME",
                "WRITE_CONFIRMED_ONLY_FROM_VALIDATED_AUTHORITY_EVIDENCE",
                "WRITE_REJECTED_ONLY_FROM_VALIDATED_AUTHORITY_EVIDENCE",
                "WRITE_UNKNOWN_ONLY_FROM_TIMEOUT_OR_UNRESOLVED_RECONCILIATION",
                "WRITE_OUT_OF_BAND_ONLY_FROM_EXTERNAL_DISCOVERY_OR_CORRECTION",
                "REQUEST_BACKED_MUTATION_REQUIRES_PERSISTED_INGRESS_PROOF",
                "FORBID_INTERNAL_OPTIMISTIC_CONFIRMATION",
            ],
            "truth_owner": "AUTHORITY_SYSTEM via SubmissionRecord settlement ledger",
            "projection_rules": [
                "Amendment truth depends on the authority-recognized final declaration and later authority evidence, not local amendment intent.",
                "Late corrections must reopen downstream projections even after earlier amendment resolution.",
            ],
            "notes": [
                "Amendment submission depends on a fresh amendment-intent calculation flow and explicit amendment bundle lineage.",
            ],
            "module_bindings": [
                "AUTHORITY_PREFLIGHT",
                "BEGIN_SUBMISSION_RECORD",
                "SUBMISSION_GATE",
                "SUBMIT_TO_AUTHORITY",
                "RECONCILE_AUTHORITY_STATE",
                "UPSERT_OBLIGATION_MIRROR",
            ],
            "source_refs": [
                refs["protocol_scope"],
                refs["protocol_calculation"],
                refs["calculation_persistence"],
                refs["protocol_reconciliation"],
                refs["vector_TV_70M"],
            ],
        },
        "AUTH_RECONCILE_STATUS": {
            "protocol_family": "authority_reconciliation",
            "scope_requirements": [
                "runtime_scope[] must exclude submit and amendment_submit tokens",
                "must target one exact duplicate_meaning_key or authority reference set",
                "reuses the same drift-sentinel boundary for reconciliation poll and recovery read",
            ],
            "idempotency_strategy": "REQUEST_HASH",
            "response_classes": [
                "ACK_SUCCESS",
                "ACK_ACCEPTED_PENDING",
                "ACK_RETRYABLE_FAILURE",
                "ACK_TIMEOUT_OR_NO_RESOLUTION",
                "ACK_EXTERNAL_STATE_DISCOVERED",
                "ACK_AMBIGUOUS_CORRELATION",
                "ACK_INCONSISTENT_STATE",
            ],
            "submission_state_write_rules": [
                "WRITE_PENDING_ACK_ONLY_FROM_ACCEPTED_OR_PROFILED_RETRYABLE_OUTCOME",
                "WRITE_CONFIRMED_ONLY_FROM_VALIDATED_AUTHORITY_EVIDENCE",
                "WRITE_REJECTED_ONLY_FROM_VALIDATED_AUTHORITY_EVIDENCE",
                "WRITE_UNKNOWN_ONLY_FROM_TIMEOUT_OR_UNRESOLVED_RECONCILIATION",
                "WRITE_OUT_OF_BAND_ONLY_FROM_EXTERNAL_DISCOVERY_OR_CORRECTION",
                "REQUEST_BACKED_MUTATION_REQUIRES_PERSISTED_INGRESS_PROOF",
                "FORBID_INTERNAL_OPTIMISTIC_CONFIRMATION",
            ],
            "truth_owner": "AUTHORITY_SYSTEM via SubmissionRecord and ObligationMirror after reconciliation",
            "projection_rules": [
                "Reconciliation may preserve PENDING_ACK or UNKNOWN while the automatic budget remains open.",
                "Escalation and resend blocking are part of authoritative protocol state, not queue-local behavior.",
            ],
            "notes": [
                "AUTH_RECONCILE_STATUS is the bounded read-only follow-up family that closes pending, unknown, conflicting, and out-of-band cases.",
            ],
            "module_bindings": [
                "RECOVER_SUBMISSION_ATTEMPT",
                "CHECKPOINT_AUTHORITY_INGRESS",
                "NORMALIZE_AUTHORITY_RESPONSE",
                "PERSIST_AUTHORITY_RECONCILIATION_CONTROL",
                "RECONCILE_AUTHORITY_STATE",
                "EMIT_AUTHORITY_RECONCILIATION_ANALYTICS",
            ],
            "source_refs": [
                refs["protocol_scope"],
                refs["protocol_reconciliation"],
                refs["protocol_reconciliation_budget"],
                refs["protocol_reconciliation_confidence"],
                refs["vector_TV_70T"],
            ],
        },
    }

    required_binding_fields = [
        "principal_context_ref",
        "authorization_decision_ref",
        "authority_link_ref",
        "delegation_grant_ref",
        "delegation_state",
        "authority_link_state",
        "partition_scope_refs[]",
        "token_binding_ref",
        "binding_lineage_ref",
        "subject_ref",
        "acting_party_ref",
        "authority_scope",
        "provider_environment",
        "provider_api_version",
        "access_binding_hash",
        "policy_snapshot_hash",
        "token_client_binding_state",
        "binding_health",
        "step_up_state",
        "approval_state",
        "authority_layer_boundary{...}",
    ]
    records: list[dict[str, Any]] = []
    for operation_family in operation_families:
        spec = operation_specs[operation_family]
        record = {
            "protocol_family": spec["protocol_family"],
            "operation_family": operation_family,
            "scope_requirements": spec["scope_requirements"],
            "required_binding_fields": required_binding_fields,
            "preflight_checks": [row["check_id"] for row in PRECHECK_DEFINITIONS],
            "request_identity_fields": REQUEST_IDENTITY_FIELDS,
            "idempotency_strategy": spec["idempotency_strategy"],
            "response_classes": spec["response_classes"],
            "submission_state_write_rules": spec["submission_state_write_rules"],
            "reconciliation_inputs": RECONCILIATION_INPUTS,
            "reconciliation_outputs": RECONCILIATION_OUTPUTS,
            "truth_owner": spec["truth_owner"],
            "projection_rules": spec["projection_rules"],
            "audit_requirements": AUDIT_FIELDS,
            "module_bindings": spec["module_bindings"],
            "source_refs": ordered_unique(spec["source_refs"]),
            "notes": spec["notes"],
        }
        records.append(record)
    return records


def build_sequence_steps(refs: dict[str, str]) -> list[dict[str, Any]]:
    rows = [
        {
            "step_index": 1,
            "step_id": "AUTHORITY_PREFLIGHT",
            "stage": "preflight",
            "module_name": "AUTHORITY_PREFLIGHT",
            "applies_to_families": ["ALL"],
            "description": "Re-authorize the action, check manifest state, and require a live authority-safe control posture before any canonical request work begins.",
            "artifacts_read": ["PrincipalContext", "AuthorizationDecision", "RunManifest", "AuthorityOperationProfile"],
            "artifacts_written": ["AuthorityBinding", "AuthorityOperationProfile"],
            "blocking_conditions": [
                "authorization deny",
                "manifest not sealed/in-progress",
                "missing delegation",
                "missing authority link",
                "token/client mismatch",
            ],
            "replay_rule": "The preflight result is a fail-closed control boundary and must not be downgraded to a transport error.",
            "source_refs": [refs["protocol_preflight"], refs["module_AUTHORITY_PREFLIGHT"], refs["vector_TV_79P"]],
        },
        {
            "step_index": 2,
            "step_id": "RESOLVE_AUTHORITY_OPERATION",
            "stage": "preflight",
            "module_name": "RESOLVE_AUTHORITY_OPERATION",
            "applies_to_families": ["ALL"],
            "description": "Freeze AuthorityOperation with requested_scope[], runtime_scope[], attempt lineage, provider contract, and executable partition scope.",
            "artifacts_read": ["AuthorityOperationProfile", "AuthorizationDecision"],
            "artifacts_written": ["AuthorityOperation"],
            "blocking_conditions": ["runtime scope illegal for family", "missing target obligation or basis where required"],
            "replay_rule": "Replay must reuse the sealed operation rather than re-deriving scope meaning from ambient caller context.",
            "source_refs": [refs["protocol_operation"], refs["module_RESOLVE_AUTHORITY_OPERATION"]],
        },
        {
            "step_index": 3,
            "step_id": "RESOLVE_AUTHORITY_BINDING",
            "stage": "preflight",
            "module_name": "RESOLVE_AUTHORITY_BINDING",
            "applies_to_families": ["ALL"],
            "description": "Resolve one concrete connector, delegation, authority-link, and token lineage that exactly matches the operation tuple.",
            "artifacts_read": ["ConnectorBinding", "DelegationGrant", "AuthorityLink", "ExceptionalAuthorityGrant"],
            "artifacts_written": ["AuthorityBinding"],
            "blocking_conditions": [
                "ambiguous token binding",
                "authority-link drift",
                "delegation gap",
                "provider environment drift",
            ],
            "replay_rule": "Later send-time logic may refresh only token version or validation timestamps inside the same binding_lineage_ref.",
            "source_refs": [refs["protocol_binding"], refs["module_RESOLVE_AUTHORITY_BINDING"], refs["connector_artifacts"]],
        },
        {
            "step_index": 4,
            "step_id": "CANONICALIZE_REQUEST",
            "stage": "request_identity",
            "module_name": "CANONICALIZE_AUTHORITY_REQUEST",
            "applies_to_families": ["ALL"],
            "description": "Render canonical path, query, payload bytes, and header profile refs from the frozen operation and binding.",
            "artifacts_read": ["AuthorityOperation", "AuthorityBinding"],
            "artifacts_written": ["canonical_request_material"],
            "blocking_conditions": ["projection masking would alter canonical bytes", "provider contract missing route material"],
            "replay_rule": "Canonical bytes are the only valid basis for request hashing and duplicate identity.",
            "source_refs": [refs["protocol_request_envelope"], refs["module_CANONICALIZE_AUTHORITY_REQUEST"]],
        },
        {
            "step_index": 5,
            "step_id": "DERIVE_REQUEST_HASHES",
            "stage": "request_identity",
            "module_name": "DERIVE_AUTHORITY_REQUEST_HASHES",
            "applies_to_families": ["ALL"],
            "description": "Compute request_body_hash, identity_namespace_hash, duplicate_meaning_key, request_hash, and idempotency_key.",
            "artifacts_read": ["canonical_request_material", "AuthorityBinding", "AuthorityOperation"],
            "artifacts_written": ["AuthorityRequestIdentityContract"],
            "blocking_conditions": ["body collision", "identity namespace collision"],
            "replay_rule": "request_hash remains the exact packet identity while duplicate_meaning_key remains the resend-vs-reconcile bucket.",
            "source_refs": [refs["protocol_hashing"], refs["protocol_collision"], refs["module_DERIVE_AUTHORITY_REQUEST_HASHES"]],
        },
        {
            "step_index": 6,
            "step_id": "BUILD_REQUEST_ENVELOPE",
            "stage": "request_identity",
            "module_name": "BUILD_AUTHORITY_REQUEST_ENVELOPE",
            "applies_to_families": ["ALL"],
            "description": "Create AuthorityRequestEnvelope and grouped request_identity_contract only after identity completion and human-gate satisfaction.",
            "artifacts_read": ["AuthorityOperation", "AuthorityBinding", "AuthorityRequestIdentityContract"],
            "artifacts_written": ["AuthorityRequestEnvelope"],
            "blocking_conditions": ["missing approval", "missing step-up evidence", "missing fraud-header profile"],
            "replay_rule": "Downstream recovery reuses request_identity_contract instead of rebuilding it from top-level envelope fields.",
            "source_refs": [refs["protocol_request_envelope"], refs["module_BUILD_AUTHORITY_REQUEST_ENVELOPE"]],
        },
        {
            "step_index": 7,
            "step_id": "BEGIN_REQUEST_LINEAGE",
            "stage": "settlement_pre_send",
            "module_name": "BEGIN_SUBMISSION_RECORD",
            "applies_to_families": [
                "AUTH_CREATE_OR_AMEND_DATA",
                "AUTH_DELETE_DATA",
                "AUTH_SUBMIT_FINAL_DECLARATION",
                "AUTH_SUBMIT_PERIODIC_UPDATE",
                "AUTH_SUBMIT_POST_FINALISATION_AMENDMENT",
            ],
            "description": "Persist initial SubmissionRecord in INTENT_RECORDED before the request leaves the process.",
            "artifacts_read": ["AuthorityRequestEnvelope", "proof_bundle"],
            "artifacts_written": ["SubmissionRecord"],
            "blocking_conditions": ["missing request identity contract", "missing proof bundle"],
            "replay_rule": "Request-backed settlement lineage is created before send and later reused for recovery or reconciliation.",
            "source_refs": [refs["protocol_write_rules"], refs["module_BEGIN_SUBMISSION_RECORD"]],
        },
        {
            "step_index": 8,
            "step_id": "CHECK_DUPLICATE_PENDING_BUCKET",
            "stage": "settlement_pre_send",
            "module_name": "EXISTING_SUBMISSIONS",
            "applies_to_families": [
                "AUTH_CREATE_OR_AMEND_DATA",
                "AUTH_DELETE_DATA",
                "AUTH_SUBMIT_FINAL_DECLARATION",
                "AUTH_SUBMIT_PERIODIC_UPDATE",
                "AUTH_SUBMIT_POST_FINALISATION_AMENDMENT",
            ],
            "description": "Load existing submission lineage for the same duplicate_meaning_key and route resend-versus-reconcile decisions before transmit.",
            "artifacts_read": ["SubmissionRecord", "AuthorityInteractionRecord"],
            "artifacts_written": ["duplicate_bucket_assessment"],
            "blocking_conditions": [
                "existing confirmed same meaning",
                "open pending or unknown interaction",
                "out-of-band legal state",
                "binding-lineage change",
            ],
            "replay_rule": "Duplicate suppression uses persisted meaning identity, not recomputed heuristics.",
            "source_refs": [refs["protocol_duplicates"], refs["protocol_duplicate_handling"], refs["module_EXISTING_SUBMISSIONS"], refs["vector_TV_69"]],
        },
        {
            "step_index": 9,
            "step_id": "SUBMISSION_GATE",
            "stage": "settlement_pre_send",
            "module_name": "SUBMISSION_GATE",
            "applies_to_families": [
                "AUTH_CREATE_OR_AMEND_DATA",
                "AUTH_DELETE_DATA",
                "AUTH_SUBMIT_FINAL_DECLARATION",
                "AUTH_SUBMIT_PERIODIC_UPDATE",
                "AUTH_SUBMIT_POST_FINALISATION_AMENDMENT",
            ],
            "description": "Block malformed, duplicate, pending, amendment-ineligible, or legally unsafe sends before transport mutation.",
            "artifacts_read": ["SubmissionRecord", "AuthorityInteractionRecord", "AuthorityRequestEnvelope", "AuthorityLink"],
            "artifacts_written": ["GateDecisionRecord"],
            "blocking_conditions": [
                "duplicate occupancy",
                "reconciliation budget exhausted",
                "resend legality blocked",
                "authority link invalid",
            ],
            "replay_rule": "Later continuation flows must honor the persisted gate posture and explicit reason codes.",
            "source_refs": [refs["module_SUBMISSION_GATE"], refs["gate_SUBMISSION_GATE"]],
        },
        {
            "step_index": 10,
            "step_id": "SEND_TIME_REVALIDATION",
            "stage": "transmit",
            "module_name": "SUBMIT_TO_AUTHORITY",
            "applies_to_families": [
                "AUTH_CREATE_OR_AMEND_DATA",
                "AUTH_DELETE_DATA",
                "AUTH_TRIGGER_CALCULATION",
                "AUTH_SUBMIT_FINAL_DECLARATION",
                "AUTH_SUBMIT_PERIODIC_UPDATE",
                "AUTH_SUBMIT_POST_FINALISATION_AMENDMENT",
            ],
            "description": "Take the exclusive send claim and re-check binding lineage, duplicate truth, approvals, and provider contract immediately before bytes leave the process.",
            "artifacts_read": ["AuthorityBinding", "AuthorityInteractionRecord", "SubmissionRecord"],
            "artifacts_written": ["binding_drift_sentinel_contract", "send_revalidation_state"],
            "blocking_conditions": [
                "newer stronger truth",
                "duplicate bucket occupancy",
                "authority link drift",
                "approval drift",
            ],
            "replay_rule": "The drift sentinel boundary is reused before RECONCILIATION_POLL and RECOVERY_READ as well.",
            "source_refs": [refs["protocol_send_revalidation"], refs["module_SUBMIT_TO_AUTHORITY"], refs["vector_TV_69A"], refs["vector_TV_69B"]],
        },
        {
            "step_index": 11,
            "step_id": "SUBMIT_TO_AUTHORITY",
            "stage": "transmit",
            "module_name": "SUBMIT_TO_AUTHORITY",
            "applies_to_families": ["ALL"],
            "description": "Transmit the sealed request through the controlled gateway and move resend posture into recovery-only or follow-up-read-only as appropriate.",
            "artifacts_read": ["AuthorityRequestEnvelope", "AuthorityBinding"],
            "artifacts_written": ["AuthorityResponseEnvelope", "AuthorityInteractionRecord"],
            "blocking_conditions": ["send blocked by drift sentinel"],
            "replay_rule": "Once bytes have left the process, recovery may reuse the exact request lineage but may not blind-resend it.",
            "source_refs": [refs["protocol_send_revalidation"], refs["module_SUBMIT_TO_AUTHORITY"]],
        },
        {
            "step_index": 12,
            "step_id": "CHECKPOINT_AUTHORITY_INGRESS",
            "stage": "ingress",
            "module_name": "CHECKPOINT_AUTHORITY_INGRESS",
            "applies_to_families": ["ALL"],
            "description": "Authenticate callback, poll, inbox, or recovery payloads, dedupe them, and persist AuthorityIngressReceipt before any legal-state mutation.",
            "artifacts_read": ["provider payload", "AuthorityRequestEnvelope", "AuthorityInteractionRecord"],
            "artifacts_written": ["AuthorityIngressReceipt", "AuthorityIngressProofContract", "AuthorityIngressCorrelationContract"],
            "blocking_conditions": ["failed channel authentication", "weak authority-reference-only match", "ambiguous multi-match", "unbound payload"],
            "replay_rule": "Duplicate deliveries point back to one canonical ingress receipt and cannot create a second mutation opportunity.",
            "source_refs": [refs["protocol_ingress"], refs["module_CHECKPOINT_AUTHORITY_INGRESS"], refs["vector_TV_70"], refs["vector_TV_70B"]],
        },
        {
            "step_index": 13,
            "step_id": "PROJECT_AUTHORITY_INGRESS_INVESTIGATION",
            "stage": "ingress",
            "module_name": "PROJECT_AUTHORITY_INGRESS_INVESTIGATION",
            "applies_to_families": ["ALL"],
            "description": "Build a read-only investigation snapshot for quarantined or duplicate-suppressed ingress without mutating legal truth.",
            "artifacts_read": ["AuthorityIngressReceipt", "AuthorityIngressProofContract", "AuthorityIngressCorrelationContract"],
            "artifacts_written": ["AuthorityIngressInvestigationSnapshot"],
            "blocking_conditions": [],
            "replay_rule": "Investigation snapshots are explainability-only surfaces and cannot bind legal state.",
            "source_refs": [refs["protocol_ingress"], refs["module_PROJECT_AUTHORITY_INGRESS_INVESTIGATION"], refs["vector_TV_70Q"], refs["vector_TV_70S"]],
        },
        {
            "step_index": 14,
            "step_id": "NORMALIZE_AUTHORITY_RESPONSE",
            "stage": "normalization",
            "module_name": "NORMALIZE_AUTHORITY_RESPONSE",
            "applies_to_families": ["ALL"],
            "description": "Normalize inline and async provider observations into protocol response classes with explicit correlation and legal-effect posture.",
            "artifacts_read": ["AuthorityResponseEnvelope", "AuthorityIngressReceipt", "SubmissionRecord"],
            "artifacts_written": ["normalized AuthorityResponseEnvelope", "SubmissionRecord"],
            "blocking_conditions": ["unknown response class", "weak or unbound async ingress", "timeout placeholder treated as success"],
            "replay_rule": "Async observations must retain ingress_receipt_ref and authority_ingress_proof_contract.",
            "source_refs": [refs["protocol_response_classes"], refs["module_NORMALIZE_AUTHORITY_RESPONSE"], refs["vector_TV_70O"], refs["vector_TV_70P"]],
        },
        {
            "step_index": 15,
            "step_id": "MERGE_AUTHORITY_RESPONSE_OBSERVATION",
            "stage": "normalization",
            "module_name": "MERGE_AUTHORITY_RESPONSE_OBSERVATION",
            "applies_to_families": ["ALL"],
            "description": "Append every normalized response to history, classify its derivation posture, and update active meaning only when legally admissible.",
            "artifacts_read": ["AuthorityInteractionRecord", "AuthorityResponseEnvelope"],
            "artifacts_written": ["AuthorityInteractionRecord"],
            "blocking_conditions": ["conflicting observation requires reconciliation", "timeout supersession requires reconciliation"],
            "replay_rule": "active_response_id means the current admissible meaning, not the freshest raw arrival.",
            "source_refs": [refs["protocol_merge"], refs["module_MERGE_AUTHORITY_RESPONSE_OBSERVATION"], refs["vector_TV_70C"], refs["vector_TV_70D"], refs["vector_TV_70E"]],
        },
        {
            "step_index": 16,
            "step_id": "RECORD_AUTHORITY_INTERACTION",
            "stage": "runtime_ledger",
            "module_name": "RECORD_AUTHORITY_INTERACTION",
            "applies_to_families": ["ALL"],
            "description": "Persist the runtime ledger linking operation, request, responses, submission lineage, drift sentinel, and reconciliation posture.",
            "artifacts_read": ["AuthorityOperation", "AuthorityRequestEnvelope", "AuthorityResponseEnvelope", "SubmissionRecord"],
            "artifacts_written": ["AuthorityInteractionRecord"],
            "blocking_conditions": [],
            "replay_rule": "Runtime ledger fields, not queue-local memory, govern resend legality and meaning resolution.",
            "source_refs": [refs["protocol_interaction_record"], refs["module_RECORD_AUTHORITY_INTERACTION"]],
        },
        {
            "step_index": 17,
            "step_id": "PERSIST_RECONCILIATION_CONTROL",
            "stage": "reconciliation",
            "module_name": "PERSIST_AUTHORITY_RECONCILIATION_CONTROL",
            "applies_to_families": [
                "AUTH_CREATE_OR_AMEND_DATA",
                "AUTH_DELETE_DATA",
                "AUTH_SUBMIT_FINAL_DECLARATION",
                "AUTH_SUBMIT_PERIODIC_UPDATE",
                "AUTH_SUBMIT_POST_FINALISATION_AMENDMENT",
                "AUTH_RECONCILE_STATUS",
            ],
            "description": "Persist grouped reconciliation budget, resend legality, deadline, escalation ownership, and analytics outcome class.",
            "artifacts_read": ["AuthorityInteractionRecord"],
            "artifacts_written": ["AuthorityInteractionRecord", "AuthorityReconciliationControlContract"],
            "blocking_conditions": [],
            "replay_rule": "Recovery must reuse the grouped reconciliation control contract instead of rebuilding budget state from timers or retry logs.",
            "source_refs": [refs["protocol_reconciliation_budget"], refs["module_PERSIST_AUTHORITY_RECONCILIATION_CONTROL"], refs["vector_TV_70T"], refs["vector_TV_70U"]],
        },
        {
            "step_index": 18,
            "step_id": "RECOVER_SUBMISSION_ATTEMPT",
            "stage": "reconciliation",
            "module_name": "RECOVER_SUBMISSION_ATTEMPT",
            "applies_to_families": [
                "AUTH_CREATE_OR_AMEND_DATA",
                "AUTH_DELETE_DATA",
                "AUTH_SUBMIT_FINAL_DECLARATION",
                "AUTH_SUBMIT_PERIODIC_UPDATE",
                "AUTH_SUBMIT_POST_FINALISATION_AMENDMENT",
                "AUTH_RECONCILE_STATUS",
            ],
            "description": "Reuse exact request/response lineage for safe idempotent recovery while honoring resend_legality_state and resend_control_reason_codes[].",
            "artifacts_read": ["AuthorityInteractionRecord", "SubmissionRecord"],
            "artifacts_written": ["recovery_basis"],
            "blocking_conditions": [
                "FOLLOW_UP_READ_ONLY",
                "BLOCKED_BY_RECONCILIATION",
                "BLOCKED_BY_ESCALATION",
                "CLOSED_NO_RESEND",
            ],
            "replay_rule": "Recovery never proves legal truth by itself; reconcile the authority state before emitting a resolved outcome.",
            "source_refs": [refs["module_RECOVER_SUBMISSION_ATTEMPT"], refs["protocol_reconciliation_budget"], refs["vector_TV_70F"]],
        },
        {
            "step_index": 19,
            "step_id": "RECONCILE_AUTHORITY_STATE",
            "stage": "reconciliation",
            "module_name": "RECONCILE_AUTHORITY_STATE",
            "applies_to_families": [
                "AUTH_READ_OBLIGATIONS",
                "AUTH_CREATE_OR_AMEND_DATA",
                "AUTH_DELETE_DATA",
                "AUTH_SUBMIT_FINAL_DECLARATION",
                "AUTH_SUBMIT_PERIODIC_UPDATE",
                "AUTH_SUBMIT_POST_FINALISATION_AMENDMENT",
                "AUTH_RECONCILE_STATUS",
            ],
            "description": "Resolve pending, unknown, out-of-band, and conflicting states from authenticated evidence, preserved response history, and quantitative thresholds.",
            "artifacts_read": ["SubmissionRecord", "ObligationMirror", "AuthorityInteractionRecord", "AuthorityResponseEnvelope"],
            "artifacts_written": ["SubmissionRecord", "ObligationMirror", "authority_state_summary"],
            "blocking_conditions": [
                "open ambiguous ingress",
                "open body collision",
                "open identity namespace collision",
                "confidence below threshold",
            ],
            "replay_rule": "Reconciliation can confirm only from validated authority evidence and must preserve current_submission_ref versus last_confirmed_submission_ref.",
            "source_refs": [refs["protocol_reconciliation"], refs["protocol_reconciliation_confidence"], refs["module_RECONCILE_AUTHORITY_STATE"], refs["vector_TV_70G"], refs["vector_TV_70H"]],
        },
        {
            "step_index": 20,
            "step_id": "UPSERT_OBLIGATION_MIRROR",
            "stage": "projection",
            "module_name": "UPSERT_OBLIGATION_MIRROR",
            "applies_to_families": [
                "AUTH_READ_OBLIGATIONS",
                "AUTH_SUBMIT_FINAL_DECLARATION",
                "AUTH_SUBMIT_PERIODIC_UPDATE",
                "AUTH_SUBMIT_POST_FINALISATION_AMENDMENT",
                "AUTH_RECONCILE_STATUS",
            ],
            "description": "Persist authority-grounded mirror state without collapsing pending, confirmed, unknown, rejected, or out-of-band posture into one anchor.",
            "artifacts_read": ["ObligationMirror", "SubmissionRecord"],
            "artifacts_written": ["ObligationMirror"],
            "blocking_conditions": [],
            "replay_rule": "The mirror is subordinate to SubmissionRecord and reopens on late authority corrections.",
            "source_refs": [refs["module_UPSERT_OBLIGATION_MIRROR"], refs["truth_surface_rules"], refs["vector_TV_70M"]],
        },
        {
            "step_index": 21,
            "step_id": "EMIT_RECONCILIATION_ANALYTICS",
            "stage": "analytics",
            "module_name": "EMIT_AUTHORITY_RECONCILIATION_ANALYTICS",
            "applies_to_families": ["AUTH_RECONCILE_STATUS"],
            "description": "Emit replay-safe tuning and escalation analytics only from persisted reconciliation control contracts.",
            "artifacts_read": ["AuthorityInteractionRecord", "AuthorityReconciliationControlContract"],
            "artifacts_written": ["AuthorityReconciliationAnalyticsSnapshot"],
            "blocking_conditions": [],
            "replay_rule": "Retry-worker and broker telemetry may help debugging but are not the authoritative budget source.",
            "source_refs": [refs["module_EMIT_AUTHORITY_RECONCILIATION_ANALYTICS"], refs["protocol_reconciliation_budget"], refs["vector_TV_70V"]],
        },
    ]
    return rows


def build_request_identity_registry(refs: dict[str, str]) -> dict[str, Any]:
    return {
        "contract_version": "AUTHORITY_REQUEST_IDENTITY_REGISTRY_V1",
        "identity_profile_version": "AUTHORITY_REQUEST_IDENTITY_V2",
        "request_identity_fields": REQUEST_IDENTITY_FIELDS,
        "sealed_identity_exclusions": SEALED_IDENTITY_EXCLUSIONS,
        "hash_derivation_steps": [
            {
                "step_index": 1,
                "hash_name": "request_body_hash",
                "formula": "hash(canonical_payload_bytes_or_<NONE>)",
                "purpose": "freezes exact payload identity under canonical byte rendering",
            },
            {
                "step_index": 2,
                "hash_name": "identity_namespace_hash",
                "formula": "hash(identity_profile_version | tenant_id | client_id | authority_name | authority_scope | provider_environment | provider_api_version | operation_family | normalized_obligation_ref | normalized_basis_type | business_partitions[] | access_binding_hash | canonical_path | canonical_query)",
                "purpose": "freezes the semantic request namespace for collision detection",
            },
            {
                "step_index": 3,
                "hash_name": "duplicate_meaning_key",
                "formula": "hash(identity_profile_version | authority_name | authority_scope | operation_family | normalized_obligation_ref | normalized_basis_type | business_partitions[] | access_binding_hash | attempt_lineage_manifest_id)",
                "purpose": "freezes the resend-versus-reconcile bucket for the same legal meaning",
            },
            {
                "step_index": 4,
                "hash_name": "request_hash",
                "formula": "hash(identity_namespace_hash | http_method | canonical_path | canonical_query | ordered_header_profile_refs[] | request_body_hash)",
                "purpose": "freezes the exact sealed request identity",
            },
            {
                "step_index": 5,
                "hash_name": "idempotency_key",
                "formula": "hash(identity_profile_version | duplicate_meaning_key)",
                "purpose": "freezes the provider-visible idempotency reuse key for the same semantic meaning",
            },
        ],
        "collision_rules": [
            {
                "rule_code": "BODY_COLLISION",
                "trigger": "same idempotency_key with different request_body_hash",
                "severity": "HARD_BLOCK",
                "required_action": "block send and persist explicit collision posture",
            },
            {
                "rule_code": "IDENTITY_NAMESPACE_COLLISION",
                "trigger": "same idempotency_key or request_hash with different frozen namespace tuple",
                "severity": "HARD_BLOCK",
                "required_action": "block send and require a new request identity",
            },
        ],
        "replay_and_recovery_rules": [
            "Safe recovery may reuse the exact request lineage only while resend_legality_state permits it.",
            "RECOVERY_READ and RECONCILIATION_POLL reuse the same grouped binding drift sentinel boundary.",
            "A newer token version may be used only when send-time revalidation approves rotation inside the same binding_lineage_ref.",
            "Replay never proves legal truth on its own; reconciliation must consume persisted authority evidence.",
        ],
        "unsafe_retry_conditions": [
            "binding_lineage_ref changed",
            "BODY_COLLISION open",
            "IDENTITY_NAMESPACE_COLLISION open",
            "duplicate bucket occupied by stronger authority truth",
            "authenticated ambiguous or unbound ingress remains unresolved",
            "reconciliation_budget_state in {EXHAUSTED, ESCALATED}",
            "resend_legality_state in {BLOCKED_BY_RECONCILIATION, BLOCKED_BY_ESCALATION, CLOSED_NO_RESEND}",
        ],
        "send_revalidation_checks": [
            "authority link state unchanged or lawfully rotated inside lineage",
            "same client, subject, acting party, and authority scope",
            "same provider environment and API version",
            "same access_binding_hash and policy_snapshot_hash posture",
            "required step-up and approval evidence still satisfied",
            "no newer stronger truth or duplicate occupancy blocks transmit",
            "exclusive send claim acquired on the persisted exchange identity",
        ],
        "fraud_prevention_rules": [
            "fraud-prevention header capture is protocol validity, not optional transport metadata",
            "profile refs, capture evidence, validation posture, and exemptions must persist explicitly",
            "redaction-safe logging must never emit raw secrets or raw fraud-header payloads",
        ],
        "source_refs": [
            refs["protocol_hashing"],
            refs["protocol_idempotency"],
            refs["protocol_collision"],
            refs["protocol_fraud_headers"],
            refs["protocol_send_revalidation"],
            refs["module_DERIVE_AUTHORITY_REQUEST_HASHES"],
            refs["module_BUILD_AUTHORITY_REQUEST_ENVELOPE"],
        ],
        "summary": {
            "request_identity_field_count": len(REQUEST_IDENTITY_FIELDS),
            "collision_rule_count": 2,
            "unsafe_retry_condition_count": 7,
            "send_revalidation_check_count": 7,
        },
    }


def build_response_registry(
    refs: dict[str, str],
    response_classes: list[str],
    submission_state_rules: list[dict[str, Any]],
) -> dict[str, Any]:
    response_rows_by_class = {
        "ACK_SUCCESS": {
            "correlation_statuses": ["BOUND"],
            "derivation_posture": "PRIMARY_OBSERVATION",
            "legal_effect_posture": "DIRECT_STATE_MUTATION",
            "default_submission_state_or_null": "CONFIRMED",
            "retry_class_floor": "NO_RETRY",
            "merge_behavior": "admissible meaning may become active_response_id",
            "notes": ["Success may still require reconciliation when it supersedes a timeout placeholder or conflicts with stronger authority evidence."],
        },
        "ACK_ACCEPTED_PENDING": {
            "correlation_statuses": ["BOUND"],
            "derivation_posture": "PRIMARY_OBSERVATION",
            "legal_effect_posture": "DIRECT_STATE_MUTATION",
            "default_submission_state_or_null": "PENDING_ACK",
            "retry_class_floor": "RECONCILE_THEN_RETRY",
            "merge_behavior": "opens bounded follow-up read posture instead of blind resend",
            "notes": ["Accepted transmit is not final settlement confirmation."],
        },
        "ACK_REJECTED_VALIDATION": {
            "correlation_statuses": ["BOUND"],
            "derivation_posture": "PRIMARY_OBSERVATION",
            "legal_effect_posture": "DIRECT_STATE_MUTATION",
            "default_submission_state_or_null": "REJECTED",
            "retry_class_floor": "REBUILD_THEN_RETRY",
            "merge_behavior": "admissible terminal rejection when bound to exact lineage",
            "notes": ["Payload or business validation rejection remains authority evidence and must retain authority_evidence_ref."],
        },
        "ACK_REJECTED_AUTH": {
            "correlation_statuses": ["BOUND"],
            "derivation_posture": "PRIMARY_OBSERVATION",
            "legal_effect_posture": "DIRECT_STATE_MUTATION",
            "default_submission_state_or_null": None,
            "retry_class_floor": "HUMAN_REVIEW_THEN_RETRY",
            "merge_behavior": "high-severity audit and no legal progression",
            "notes": ["Authentication or authorization rejection does not imply confirmed or rejected filing settlement."],
        },
        "ACK_RETRYABLE_FAILURE": {
            "correlation_statuses": ["BOUND"],
            "derivation_posture": "PRIMARY_OBSERVATION",
            "legal_effect_posture": "DIRECT_STATE_MUTATION",
            "default_submission_state_or_null": "PROFILE_DEPENDENT_PENDING_ACK_OR_UNKNOWN",
            "retry_class_floor": "SAFE_RETRY",
            "merge_behavior": "profile decides whether the immediate normalized settlement posture is pending or unknown",
            "notes": ["Retryable failure still remains bound authority evidence and feeds reconciliation policy."],
        },
        "ACK_TIMEOUT_OR_NO_RESOLUTION": {
            "correlation_statuses": ["UNSPECIFIED_TIMEOUT_PLACEHOLDER"],
            "derivation_posture": "TIMEOUT_PLACEHOLDER",
            "legal_effect_posture": "PROVISIONAL_STATE_MUTATION",
            "default_submission_state_or_null": "UNKNOWN",
            "retry_class_floor": "RECONCILE_THEN_RETRY",
            "merge_behavior": "placeholder may be superseded later but only through explicit reconciliation",
            "notes": ["Timeout and no-body outcomes must never be normalized as synthetic success."],
        },
        "ACK_EXTERNAL_STATE_DISCOVERED": {
            "correlation_statuses": ["BOUND"],
            "derivation_posture": "PRIMARY_OBSERVATION",
            "legal_effect_posture": "DIRECT_STATE_MUTATION",
            "default_submission_state_or_null": "OUT_OF_BAND",
            "retry_class_floor": "NO_RETRY",
            "merge_behavior": "opens reconciliation under out-of-band posture",
            "notes": ["External state discovery means authority truth exists outside the active packet flow."],
        },
        "ACK_AMBIGUOUS_CORRELATION": {
            "correlation_statuses": ["BOUND_WITH_AUTHORITY_REFERENCE_ONLY", "AMBIGUOUS", "UNBOUND"],
            "derivation_posture": "PRIMARY_OBSERVATION",
            "legal_effect_posture": "RECONCILIATION_ONLY",
            "default_submission_state_or_null": None,
            "retry_class_floor": "RECONCILE_THEN_RETRY",
            "merge_behavior": "quarantine and explicit ownership; no terminal or pending-success mutation",
            "notes": ["Weak or ambiguous binding may not mutate settlement or mirror truth."],
        },
        "ACK_INCONSISTENT_STATE": {
            "correlation_statuses": ["BOUND", "BOUND_WITH_AUTHORITY_REFERENCE_ONLY"],
            "derivation_posture": "CONFLICTING_OBSERVATION",
            "legal_effect_posture": "RECONCILIATION_ONLY",
            "default_submission_state_or_null": None,
            "retry_class_floor": "MANUAL_INTERVENTION_REQUIRED",
            "merge_behavior": "forces quantitative reconciliation instead of source precedence or last-writer-wins",
            "notes": ["Conflicting authority evidence blocks automatic resend and may escalate."],
        },
    }
    response_rows = []
    for response_class in response_classes:
        spec = response_rows_by_class[response_class]
        response_rows.append(
            {
                "response_class": response_class,
                "correlation_statuses": spec["correlation_statuses"],
                "derivation_posture": spec["derivation_posture"],
                "legal_effect_posture": spec["legal_effect_posture"],
                "default_submission_state_or_null": spec["default_submission_state_or_null"],
                "retry_class_floor": spec["retry_class_floor"],
                "merge_behavior": spec["merge_behavior"],
                "source_refs": [refs["protocol_response_classes"], refs["protocol_default_normalization"]],
                "notes": spec["notes"],
            }
        )
    return {
        "contract_version": "AUTHORITY_RESPONSE_CLASS_REGISTRY_V1",
        "response_classes": response_rows,
        "submission_state_write_rules": [
            {
                **row,
                "source_refs": [refs["protocol_write_rules"], refs["protocol_allowed_write_rules"]],
            }
            for row in submission_state_rules
        ],
        "merge_postures": [
            {
                "derivation_posture": "PRIMARY_OBSERVATION",
                "legal_effect_posture": "DIRECT_STATE_MUTATION",
                "required_follow_up": "may become active meaning when admissible",
            },
            {
                "derivation_posture": "CORROBORATING_OBSERVATION",
                "legal_effect_posture": "NO_STATE_MUTATION",
                "required_follow_up": "never create a second legal-state mutation",
            },
            {
                "derivation_posture": "SUPERSEDES_TIMEOUT_PLACEHOLDER",
                "legal_effect_posture": "RECONCILIATION_ONLY",
                "required_follow_up": "retain superseded timeout lineage and reconcile before changing legal truth",
            },
            {
                "derivation_posture": "CONFLICTING_OBSERVATION",
                "legal_effect_posture": "RECONCILIATION_ONLY",
                "required_follow_up": "enter RECONCILIATION_REQUIRED and block last-writer-wins behavior",
            },
            {
                "derivation_posture": "TIMEOUT_PLACEHOLDER",
                "legal_effect_posture": "PROVISIONAL_STATE_MUTATION",
                "required_follow_up": "retain provisional unknown posture until later reconciliation closes it",
            },
        ],
        "source_refs": [
            refs["protocol_response_classes"],
            refs["protocol_default_normalization"],
            refs["protocol_merge"],
            refs["protocol_write_rules"],
        ],
        "summary": {
            "response_class_count": len(response_rows),
            "submission_state_write_rule_count": len(submission_state_rules),
            "merge_posture_count": 5,
        },
    }


def build_reconciliation_matrix(refs: dict[str, str]) -> list[dict[str, Any]]:
    return [
        {
            "scenario_id": "RC-01",
            "scenario_name": "direct_confirmed_success",
            "trigger_posture": "strongly bound ACK_SUCCESS or reconciliation confidence winner CONFIRMED",
            "response_or_ingress_class": "ACK_SUCCESS / RECONCILED_CONFIRMED",
            "automatic_action": "write CONFIRMED, clear reconciliation deadline, set resolution_basis",
            "settlement_result": "CONFIRMED",
            "mirror_result": "advance last_confirmed_submission_ref and current submission pointer",
            "resend_legality_state": "CLOSED_NO_RESEND",
            "escalation_state": "NOT_REQUIRED",
            "customer_projection_posture": "may render confirmed only from authority-grounded evidence",
            "source_refs": " ; ".join([refs["protocol_response_classes"], refs["protocol_reconciliation"], refs["vector_TV_70K"]]),
            "vector_refs": refs["vector_TV_70K"],
            "notes": "Confirmed state may not come from dispatch alone.",
        },
        {
            "scenario_id": "RC-02",
            "scenario_name": "accepted_pending_or_retryable_follow_up",
            "trigger_posture": "ACK_ACCEPTED_PENDING or profile-routed retryable failure",
            "response_or_ingress_class": "ACK_ACCEPTED_PENDING / ACK_RETRYABLE_FAILURE",
            "automatic_action": "write PENDING_ACK, open ACTIVE budget, schedule next_reconciliation_at",
            "settlement_result": "PENDING_ACK",
            "mirror_result": "keep current_submission_ref without moving last_confirmed_submission_ref",
            "resend_legality_state": "FOLLOW_UP_READ_ONLY",
            "escalation_state": "NOT_REQUIRED",
            "customer_projection_posture": "show pending and non-confirming",
            "source_refs": " ; ".join([refs["protocol_default_normalization"], refs["protocol_reconciliation_budget"], refs["vector_TV_68"]]),
            "vector_refs": refs["vector_TV_68"],
            "notes": "Bounded follow-up read is legal; blind resend is not.",
        },
        {
            "scenario_id": "RC-03",
            "scenario_name": "timeout_or_no_resolution_unknown",
            "trigger_posture": "ACK_TIMEOUT_OR_NO_RESOLUTION with unresolved provider outcome",
            "response_or_ingress_class": "ACK_TIMEOUT_OR_NO_RESOLUTION",
            "automatic_action": "write UNKNOWN and open reconciliation budget if remaining window exists",
            "settlement_result": "UNKNOWN",
            "mirror_result": "keep unknown or pending anchor explicit and non-confirming",
            "resend_legality_state": "IDEMPOTENT_RECOVERY_ONLY -> FOLLOW_UP_READ_ONLY",
            "escalation_state": "NOT_REQUIRED",
            "customer_projection_posture": "must stay typed and cannot reassure as resolved",
            "source_refs": " ; ".join([refs["protocol_default_normalization"], refs["protocol_reconciliation_budget"], refs["vector_TV_70D"]]),
            "vector_refs": " ; ".join([refs["vector_TV_68"], refs["vector_TV_70D"]]),
            "notes": "Timeout placeholders cannot be silently replaced by later recovery evidence.",
        },
        {
            "scenario_id": "RC-04",
            "scenario_name": "duplicate_or_pending_bucket_blocks_resend",
            "trigger_posture": "existing confirmed, pending, unknown, out-of-band, or stronger-truth occupancy for same duplicate_meaning_key",
            "response_or_ingress_class": "duplicate bucket / open interaction state",
            "automatic_action": "route to reconciliation or amendment-safe progression, never blind resend",
            "settlement_result": "preserve existing authority-grounded posture",
            "mirror_result": "no new legal-state mutation until reconciliation or amendment-safe path succeeds",
            "resend_legality_state": "BLOCKED_BY_RECONCILIATION or CLOSED_NO_RESEND",
            "escalation_state": "NOT_REQUIRED",
            "customer_projection_posture": "must not present a duplicate as a fresh success path",
            "source_refs": " ; ".join([refs["protocol_duplicate_handling"], refs["module_SUBMISSION_GATE"], refs["vector_TV_69"]]),
            "vector_refs": refs["vector_TV_69"],
            "notes": "Duplicate_meaning_key is the semantic bucket; request_hash remains exact packet identity.",
        },
        {
            "scenario_id": "RC-05",
            "scenario_name": "ambiguous_callback_or_reference_only_ingress",
            "trigger_posture": "authenticated payload is BOUND_WITH_AUTHORITY_REFERENCE_ONLY, AMBIGUOUS, or UNBOUND",
            "response_or_ingress_class": "ACK_AMBIGUOUS_CORRELATION / quarantined ingress",
            "automatic_action": "persist AuthorityIngressReceipt, quarantine, and open reconciliation ownership",
            "settlement_result": "no settlement mutation",
            "mirror_result": "no mirror mutation",
            "resend_legality_state": "BLOCKED_BY_RECONCILIATION",
            "escalation_state": "READY_FOR_ESCALATION",
            "customer_projection_posture": "no user-visible confirmed or rejected projection",
            "source_refs": " ; ".join([refs["protocol_ingress"], refs["protocol_default_normalization"], refs["vector_TV_70"], refs["vector_TV_70A"]]),
            "vector_refs": " ; ".join([refs["vector_TV_70"], refs["vector_TV_70A"], refs["vector_TV_70P"]]),
            "notes": "Weak or unbound ingress proof cannot drive settlement or mirror mutation.",
        },
        {
            "scenario_id": "RC-06",
            "scenario_name": "out_of_band_or_authority_correction_discovered",
            "trigger_posture": "obligations or other authority evidence shows legal state outside the active packet flow",
            "response_or_ingress_class": "ACK_EXTERNAL_STATE_DISCOVERED / RECONCILED_OUT_OF_BAND",
            "automatic_action": "write OUT_OF_BAND and reopen downstream mirrors or projections if prior posture existed",
            "settlement_result": "OUT_OF_BAND",
            "mirror_result": "mirror stays explicit and subordinate to settlement truth",
            "resend_legality_state": "BLOCKED_BY_RECONCILIATION",
            "escalation_state": "NOT_REQUIRED",
            "customer_projection_posture": "show out-of-band or corrected truth explicitly",
            "source_refs": " ; ".join([refs["protocol_out_of_band"], refs["truth_required_outcomes"], refs["vector_TV_70L"], refs["vector_TV_70M"]]),
            "vector_refs": " ; ".join([refs["vector_TV_70L"], refs["vector_TV_70M"]]),
            "notes": "Late authority corrections reopen downstream state instead of leaving earlier resolved projections final.",
        },
        {
            "scenario_id": "RC-07",
            "scenario_name": "conflicting_authority_evidence_requires_quantitative_reconciliation",
            "trigger_posture": "ACK_INCONSISTENT_STATE or conflicting callback/poll/recovery observations",
            "response_or_ingress_class": "ACK_INCONSISTENT_STATE / CONFLICTING_OBSERVATION",
            "automatic_action": "append history, require quantitative reconciliation, and block last-writer-wins",
            "settlement_result": "remain unresolved until thresholds are met",
            "mirror_result": "hold prior defensible posture and keep contradiction visible",
            "resend_legality_state": "BLOCKED_BY_RECONCILIATION",
            "escalation_state": "READY_FOR_ESCALATION",
            "customer_projection_posture": "must stay typed and non-confirming",
            "source_refs": " ; ".join([refs["protocol_merge"], refs["protocol_reconciliation_confidence"], refs["vector_TV_70E"], refs["vector_TV_70H"]]),
            "vector_refs": " ; ".join([refs["vector_TV_70E"], refs["vector_TV_70H"]]),
            "notes": "A terminal reconciliation outcome requires confidence, ambiguity, and state-margin thresholds plus no open collision or ambiguous ingress.",
        },
        {
            "scenario_id": "RC-08",
            "scenario_name": "budget_exhausted_or_deadline_elapsed",
            "trigger_posture": "automatic reconciliation attempts exhausted or contradictory evidence persists past deadline",
            "response_or_ingress_class": "budget and deadline control posture",
            "automatic_action": "stop blind resend, preserve PENDING_ACK or UNKNOWN, and escalate",
            "settlement_result": "PENDING_ACK or UNKNOWN",
            "mirror_result": "keep unresolved posture explicit and assign escalation owner",
            "resend_legality_state": "BLOCKED_BY_ESCALATION",
            "escalation_state": "ESCALATED",
            "customer_projection_posture": "no resolved reassurance; handoff remains visible internally",
            "source_refs": " ; ".join([refs["protocol_reconciliation_budget"], refs["vector_TV_70G"], refs["vector_TV_70U"]]),
            "vector_refs": " ; ".join([refs["vector_TV_70G"], refs["vector_TV_70U"]]),
            "notes": "Recovery must reuse the persisted grouped control packet and may not reset the escalation clock.",
        },
    ]


def build_truth_projection_map(refs: dict[str, str], truth_surface_roles: list[str], boundary_scopes: list[str]) -> dict[str, Any]:
    surfaces = [
        {
            "boundary_scope": "AUTHORITY_INTERACTION_RECORD",
            "truth_surface_role": "AUTHORITY_RUNTIME_LEDGER",
            "artifact_name": "AuthorityInteractionRecord",
            "authoritative_source_policy": "RUNTIME_LEDGER_ONLY",
            "allowed_authority_states": ["NOT_REQUESTED", "UNKNOWN", "PENDING_ACK", "CONFIRMED", "REJECTED", "OUT_OF_BAND"],
            "projection_rules": [
                "Tracks active admissible meaning and response history but does not itself settle customer or workflow truth.",
                "Carries resend legality, reconciliation budget, and escalation posture as authoritative runtime control state.",
            ],
            "forbidden_promotions": [
                "must not be rendered as confirmed customer truth merely because a response exists",
            ],
            "source_refs": [refs["truth_model"], refs["truth_surface_rules"], refs["protocol_interaction_record"]],
        },
        {
            "boundary_scope": "AUTHORITY_INGRESS_RECEIPT",
            "truth_surface_role": "AUTHORITY_INGRESS_CHECKPOINT",
            "artifact_name": "AuthorityIngressReceipt",
            "authoritative_source_policy": "CHECKPOINT_ONLY",
            "allowed_authority_states": ["NOT_APPLICABLE", "UNKNOWN"],
            "projection_rules": [
                "May prove authenticated transport and correlation posture only.",
                "Must retain grouped ingress proof and correlation contract for later reuse.",
            ],
            "forbidden_promotions": [
                "cannot settle legal truth before strong binding and normalization complete",
            ],
            "source_refs": [refs["truth_surface_rules"], refs["protocol_ingress"]],
        },
        {
            "boundary_scope": "SUBMISSION_RECORD",
            "truth_surface_role": "AUTHORITY_SETTLEMENT_LEDGER",
            "artifact_name": "SubmissionRecord",
            "authoritative_source_policy": "AUTHORITY_SETTLEMENT_ONLY",
            "allowed_authority_states": ["UNKNOWN", "PENDING_ACK", "CONFIRMED", "REJECTED", "OUT_OF_BAND"],
            "projection_rules": [
                "The only durable settlement ledger for one meaning.",
                "Request-backed settlement changes require bound authority_ingress_proof_contract for async paths.",
            ],
            "forbidden_promotions": [
                "no internal optimism or workflow completion may write CONFIRMED",
            ],
            "source_refs": [refs["truth_surface_rules"], refs["protocol_write_rules"]],
        },
        {
            "boundary_scope": "OBLIGATION_MIRROR",
            "truth_surface_role": "INTERNAL_OBLIGATION_MIRROR",
            "artifact_name": "ObligationMirror",
            "authoritative_source_policy": "SUBORDINATE_TO_SUBMISSION_RECORD",
            "allowed_authority_states": ["NOT_REQUESTED", "UNKNOWN", "PENDING_ACK", "CONFIRMED", "REJECTED", "OUT_OF_BAND"],
            "projection_rules": [
                "Keeps pending lineage, confirmed lineage, and readiness anchors distinct.",
                "Reopens on late authority corrections instead of preserving stale resolved posture.",
            ],
            "forbidden_promotions": [
                "cannot reuse confirmed anchors for unknown, rejected, or out-of-band posture",
            ],
            "source_refs": [refs["truth_surface_rules"], refs["protocol_reconciliation"]],
        },
        {
            "boundary_scope": "WORKFLOW_ITEM",
            "truth_surface_role": "INTERNAL_WORKFLOW_COORDINATION",
            "artifact_name": "WorkflowItem",
            "authoritative_source_policy": "COORDINATION_ONLY",
            "allowed_authority_states": ["NOT_APPLICABLE", "UNKNOWN", "PENDING_ACK", "CONFIRMED", "REJECTED", "OUT_OF_BAND"],
            "projection_rules": [
                "Coordinates escalation and human review while exposing typed authority_truth_state.",
                "Escalation ownership and due time come from grouped reconciliation control packets.",
            ],
            "forbidden_promotions": [
                "workflow DONE may not imply resolved authority truth while settlement remains pending, unknown, or out-of-band",
            ],
            "source_refs": [refs["truth_surface_rules"], refs["protocol_reconciliation_budget"], refs["vector_TV_70U"]],
        },
        {
            "boundary_scope": "CLIENT_TIMELINE_EVENT",
            "truth_surface_role": "CUSTOMER_SAFE_STATUS_PROJECTION",
            "artifact_name": "ClientTimelineEvent",
            "authoritative_source_policy": "CUSTOMER_SAFE_PROJECTION_ONLY",
            "allowed_authority_states": ["NOT_APPLICABLE", "UNKNOWN", "PENDING_ACK", "CONFIRMED", "REJECTED", "OUT_OF_BAND"],
            "projection_rules": [
                "Customer-safe headlines must remain compatible with authority_truth_state.",
                "Authority-neutral events keep authority_truth_state = NOT_APPLICABLE.",
            ],
            "forbidden_promotions": [
                "cannot render pending, unknown, or out-of-band posture as resolved reassurance",
            ],
            "source_refs": [refs["truth_surface_rules"], refs["truth_required_outcomes"], refs["vector_TV_70I"]],
        },
    ]
    return {
        "contract_version": "AUTHORITY_TRUTH_PROJECTION_MAP_V1",
        "surfaces": surfaces,
        "northbound_command_constraints": [
            "payload{} SHALL NOT embed authority tokens, raw audit signatures, or client-derived legal-state flags",
            "truth and recovery semantics stay bound to durable ids and receipts rather than read-side projection identity",
            "projection input policy stays limited to stale guards rather than direct state writeback",
        ],
        "source_refs": [
            refs["truth_purpose"],
            refs["truth_model"],
            refs["truth_vocabulary"],
            refs["truth_required_outcomes"],
            refs["truth_surface_rules"],
            refs["northbound_command_envelope"],
        ],
        "summary": {
            "surface_count": len(surfaces),
            "truth_surface_roles_covered": [surface["truth_surface_role"] for surface in surfaces],
            "boundary_scopes_covered": [surface["boundary_scope"] for surface in surfaces],
            "schema_truth_surface_roles": truth_surface_roles,
            "schema_boundary_scopes": boundary_scopes,
        },
    }


def build_unresolved_gaps(refs: dict[str, str]) -> dict[str, Any]:
    gaps = [
        {
            "gap_id": "GAP-AUTH-001",
            "area": "provider_profile_instantiation",
            "severity": "medium",
            "current_state": "The protocol freezes AuthorityOperationProfile semantics, but product-specific transport paths, fraud-header templates, and provider-code mappings still require concrete adapter data.",
            "required_closure": "Instantiate authority product profiles per provider/environment and bind exact provider codes to the canonical response classes.",
            "source_refs": [refs["protocol_operation_profiles"], refs["connector_artifacts"]],
        },
        {
            "gap_id": "GAP-AUTH-002",
            "area": "weak_ingress_resolution",
            "severity": "medium",
            "current_state": "The prose fail-closes weak, ambiguous, and unbound ingress, but it does not fully enumerate the operator workflow for converting weak authority-reference-only evidence into strong lineage proof.",
            "required_closure": "Define the manual investigation and approval workflow for promoting quarantined ingress after stronger evidence is gathered.",
            "source_refs": [refs["protocol_ingress"], refs["vector_TV_70A"], refs["vector_TV_70Q"]],
        },
        {
            "gap_id": "GAP-AUTH-003",
            "area": "quantitative_weight_policy_binding",
            "severity": "medium",
            "current_state": "Section 9.13B defines the reconciliation scoring model and thresholds, but the source-family weighting policy it references lives outside the chapter and is not exported here as concrete per-source numbers.",
            "required_closure": "Bind reconciliation source-family weights to a versioned runtime policy artifact shared with the trust and authority uncertainty layers.",
            "source_refs": [refs["protocol_reconciliation_confidence"]],
        },
        {
            "gap_id": "GAP-AUTH-004",
            "area": "authority_correction_taxonomy",
            "severity": "low",
            "current_state": "The correction cause family is intentionally reserved, but concrete downstream workflow playbooks for each cause enum are not fully enumerated.",
            "required_closure": "Define operator, client-visible, and replay behavior for each authority correction cause before live provider support is enabled.",
            "source_refs": [refs["protocol_out_of_band"], refs["vector_TV_70M"]],
        },
        {
            "gap_id": "GAP-AUTH-005",
            "area": "reason_code_registry",
            "severity": "low",
            "current_state": "The protocol requires explicit resend_control_reason_codes[] and send_revalidation_reason_codes[], but this chapter does not publish a complete machine-readable enum of those reason codes.",
            "required_closure": "Publish a dedicated authority reason-code registry covering send-time blocks, resend refusals, escalation triggers, and correction causes.",
            "source_refs": [refs["protocol_send_revalidation"], refs["protocol_reconciliation_budget"]],
        },
    ]
    return {
        "contract_version": "AUTHORITY_PROTOCOL_GAP_REGISTER_V1",
        "gaps": gaps,
        "summary": {
            "gap_count": len(gaps),
            "high_severity_count": 0,
            "medium_severity_count": 3,
            "low_severity_count": 2,
        },
    }


def render_requirements_doc(operation_catalog: dict[str, Any], request_identity: dict[str, Any]) -> str:
    lines = [
        "# 12 Authority Interaction And Reconciliation Requirements",
        "",
        "## Scope",
        "",
        "- This pack exports the authority-facing protocol as implementation-grade data for preflight, request identity, response normalization, ingress checkpointing, and reconciliation.",
        f"- Canonical operation families indexed: `{operation_catalog['summary']['operation_family_count']}`.",
        f"- Core protocol objects indexed: `{operation_catalog['summary']['core_protocol_object_count']}`.",
        f"- Request identity fields frozen: `{request_identity['summary']['request_identity_field_count']}`.",
        "",
        "## Core Protocol Objects",
        "",
        "| Object | Truth owner | Schema | Primary seam |",
        "| --- | --- | --- | --- |",
    ]
    for row in operation_catalog["core_protocol_objects"]:
        lines.append(
            f"| `{row['object_name']}` | `{row['truth_owner']}` | `{row['schema_path']}` | `{row['module_bindings'][0]}` |"
        )
    lines.extend(
        [
            "",
            "## Operation Catalog",
            "",
            "| Operation family | Protocol family | Idempotency | Settlement write rules |",
            "| --- | --- | --- | --- |",
        ]
    )
    for row in operation_catalog["operation_records"]:
        rule_text = ", ".join(f"`{rule}`" for rule in row["submission_state_write_rules"]) or "`none`"
        lines.append(
            f"| `{row['operation_family']}` | `{row['protocol_family']}` | `{row['idempotency_strategy']}` | {rule_text} |"
        )
    lines.extend(
        [
            "",
            "## Shared Controls",
            "",
            "- Preflight remains a hard control boundary: authorization, manifest posture, operation profile, binding lineage, human-gate evidence, canonicalization, duplicate checks, fraud-header posture, exclusive send claim, and send-time drift revalidation all happen before live transport.",
            "- Request identity keeps `duplicate_meaning_key` and `request_hash` distinct so recovery can reuse exact lineage without confusing semantic duplicates with byte-identical packets.",
            "- The authority layer owns response normalization, legal-state interpretation, and reconciliation. Internal workflow, customer projection, override, and accepted-risk posture remain subordinate.",
            "",
            "## Audit Spine",
            "",
            "- Required audit events: " + ", ".join(f"`{event}`" for event in operation_catalog["shared_requirements"]["audit_events"]) + ".",
            "- Every authority audit event carries: " + ", ".join(f"`{field}`" for field in operation_catalog["shared_requirements"]["audit_fields"]) + ".",
        ]
    )
    return "\n".join(lines)


def render_sequence_doc(sequence_steps: list[dict[str, Any]], truth_projection: dict[str, Any]) -> str:
    lines = [
        "# 12 Authority Sequence And Boundary Matrix",
        "",
        "## Sequence Ledger",
        "",
        "| Step | Stage | Module | Purpose |",
        "| --- | --- | --- | --- |",
    ]
    for row in sequence_steps:
        lines.append(
            f"| `{row['step_id']}` | `{row['stage']}` | `{row['module_name']}` | {row['description']} |"
        )
    lines.extend(
        [
            "",
            "## Truth And Projection Boundaries",
            "",
            "| Surface role | Artifact | Allowed authority states | Forbidden promotion |",
            "| --- | --- | --- | --- |",
        ]
    )
    for row in truth_projection["surfaces"]:
        allowed = ", ".join(f"`{state}`" for state in row["allowed_authority_states"])
        lines.append(
            f"| `{row['truth_surface_role']}` | `{row['artifact_name']}` | {allowed} | {row['forbidden_promotions'][0]} |"
        )
    lines.extend(
        [
            "",
            "## Northbound Guardrails",
            "",
            "- Commands do not carry authority tokens, raw audit signatures, or client-derived legal-state flags.",
            "- Recovery and retry semantics stay bound to durable ids and receipts, not read-side projection identity.",
            "- Customer-safe surfaces may only render confirmed authority state from the settlement ledger or a downstream authority-grounded mirror update.",
        ]
    )
    return "\n".join(lines)


def render_edge_case_doc(
    response_registry: dict[str, Any],
    reconciliation_rows: list[dict[str, Any]],
    request_identity: dict[str, Any],
    gaps: dict[str, Any],
) -> str:
    lines = [
        "# 12 Pending Duplicate And Out-Of-Band Handling",
        "",
        "## Response Classes",
        "",
        "| Response class | Default state | Legal effect | Retry floor |",
        "| --- | --- | --- | --- |",
    ]
    for row in response_registry["response_classes"]:
        default_state = row["default_submission_state_or_null"] or "none"
        lines.append(
            f"| `{row['response_class']}` | `{default_state}` | `{row['legal_effect_posture']}` | `{row['retry_class_floor']}` |"
        )
    lines.extend(
        [
            "",
            "## Reconciliation Scenarios",
            "",
            "| Scenario | Result | Resend posture | Escalation |",
            "| --- | --- | --- | --- |",
        ]
    )
    for row in reconciliation_rows:
        lines.append(
            f"| `{row['scenario_name']}` | `{row['settlement_result']}` | `{row['resend_legality_state']}` | `{row['escalation_state']}` |"
        )
    lines.extend(
        [
            "",
            "## Request Identity Hazards",
            "",
            "- Collision rules: " + ", ".join(f"`{row['rule_code']}`" for row in request_identity["collision_rules"]) + ".",
            "- Unsafe retry conditions: " + ", ".join(f"`{row}`" for row in request_identity["unsafe_retry_conditions"]) + ".",
            "",
            "## Explicit Gaps",
            "",
            "| Gap | Area | Required closure |",
            "| --- | --- | --- |",
        ]
    )
    for row in gaps["gaps"]:
        lines.append(f"| `{row['gap_id']}` | `{row['area']}` | {row['required_closure']} |")
    return "\n".join(lines)


def render_mermaid() -> str:
    return "\n".join(
        [
            "sequenceDiagram",
            '    participant Run as "Run Engine"',
            '    participant Proto as "Authority Protocol"',
            '    participant Gateway as "Controlled Gateway"',
            '    participant Auth as "Authority System"',
            '    participant Ingress as "Ingress Checkpoint"',
            '    participant Recon as "Reconciliation Worker"',
            '    Run->>Proto: "AUTHORIZE + manifest check + profile freeze"',
            '    Proto->>Proto: "Resolve AuthorityOperation + AuthorityBinding"',
            '    Proto->>Proto: "Canonicalize request + derive request hashes"',
            '    Proto->>Proto: "Build AuthorityRequestEnvelope + request lineage"',
            '    Proto->>Gateway: "Duplicate checks + exclusive send claim + drift revalidation"',
            '    alt "clear to send"',
            '        Gateway->>Auth: "Transmit sealed request"',
            '        alt "inline provider response"',
            '            Auth-->>Gateway: "HTTP response"',
            '            Gateway->>Proto: "Normalize + merge response"',
            '        else "async or unresolved provider outcome"',
            '            Gateway-->>Proto: "timeout / accepted pending / retryable failure"',
            '            Auth-->>Ingress: "callback / poll / recovery payload"',
            '            Ingress->>Proto: "checkpoint ingress + normalize response"',
            '        end',
            '        Proto->>Recon: "open or continue reconciliation budget"',
            '        alt "defensible authority outcome"',
            '            Recon->>Proto: "RECONCILED_*"',
            '            Proto->>Run: "update SubmissionRecord / ObligationMirror / safe projections"',
            '        else "budget exhausted or contradictory evidence"',
            '            Recon->>Run: "escalate + block resend"',
            '        end',
            '    else "binding drift, collision, or stronger truth"',
            '        Gateway-->>Run: "blocked before send"',
            '    end',
            "",
        ]
    )


def build_operation_catalog(
    refs: dict[str, str],
    operation_families: list[str],
) -> dict[str, Any]:
    core_objects = build_core_protocol_objects(refs)
    operation_records = build_operation_records(refs, operation_families)
    return {
        "contract_version": "AUTHORITY_OPERATION_CATALOG_V1",
        "core_protocol_objects": core_objects,
        "preflight_check_definitions": PRECHECK_DEFINITIONS,
        "shared_requirements": {
            "request_identity_fields": REQUEST_IDENTITY_FIELDS,
            "reconciliation_inputs": RECONCILIATION_INPUTS,
            "reconciliation_outputs": RECONCILIATION_OUTPUTS,
            "audit_events": AUDIT_EVENTS,
            "audit_fields": AUDIT_FIELDS,
        },
        "operation_records": operation_records,
        "summary": {
            "core_protocol_object_count": len(core_objects),
            "operation_family_count": len(operation_records),
            "protocol_family_counts": {
                protocol_family: sum(1 for row in operation_records if row["protocol_family"] == protocol_family)
                for protocol_family in ordered_unique(row["protocol_family"] for row in operation_records)
            },
            "operation_families_covered": [row["operation_family"] for row in operation_records],
        },
    }


def build_outputs() -> dict[str, Any]:
    module_catalog = load_json(MODULE_CATALOG_PATH)
    gate_registry = load_json(GATE_REGISTRY_PATH)
    refs = build_refs(module_catalog, gate_registry)

    operation_families = schema_enum(AUTHORITY_OPERATION_SCHEMA_PATH, "operation_family")
    response_classes = schema_enum(AUTHORITY_RESPONSE_ENVELOPE_SCHEMA_PATH, "response_class")
    truth_surface_roles = schema_enum(AUTHORITY_TRUTH_SCHEMA_PATH, "truth_surface_role")
    boundary_scopes = schema_enum(AUTHORITY_TRUTH_SCHEMA_PATH, "boundary_scope")

    operation_catalog = build_operation_catalog(refs, operation_families)
    submission_state_rules = build_submission_state_write_rules()
    sequence_steps = build_sequence_steps(refs)
    request_identity = build_request_identity_registry(refs)
    reconciliation_rows = build_reconciliation_matrix(refs)
    truth_projection = build_truth_projection_map(refs, truth_surface_roles, boundary_scopes)
    response_registry = build_response_registry(refs, response_classes, submission_state_rules)
    gaps = build_unresolved_gaps(refs)
    docs = (
        render_requirements_doc(operation_catalog, request_identity),
        render_sequence_doc(sequence_steps, truth_projection),
        render_edge_case_doc(response_registry, reconciliation_rows, request_identity, gaps),
    )
    mermaid = render_mermaid()
    return {
        "operation_catalog": operation_catalog,
        "sequence_steps": sequence_steps,
        "request_identity": request_identity,
        "reconciliation_rows": reconciliation_rows,
        "truth_projection": truth_projection,
        "response_registry": response_registry,
        "gaps": gaps,
        "docs": docs,
        "mermaid": mermaid,
    }


def main() -> int:
    outputs = build_outputs()
    json_write(OPERATION_CATALOG_PATH, outputs["operation_catalog"])
    jsonl_write(SEQUENCE_STEPS_PATH, outputs["sequence_steps"])
    json_write(REQUEST_IDENTITY_PATH, outputs["request_identity"])
    csv_write(
        RECONCILIATION_MATRIX_PATH,
        outputs["reconciliation_rows"],
        [
            "scenario_id",
            "scenario_name",
            "trigger_posture",
            "response_or_ingress_class",
            "automatic_action",
            "settlement_result",
            "mirror_result",
            "resend_legality_state",
            "escalation_state",
            "customer_projection_posture",
            "source_refs",
            "vector_refs",
            "notes",
        ],
    )
    json_write(TRUTH_PROJECTION_PATH, outputs["truth_projection"])
    json_write(RESPONSE_CLASS_PATH, outputs["response_registry"])
    json_write(GAPS_PATH, outputs["gaps"])

    REQUIREMENTS_DOC_PATH.parent.mkdir(parents=True, exist_ok=True)
    REQUIREMENTS_DOC_PATH.write_text(outputs["docs"][0] + "\n")
    SEQUENCE_DOC_PATH.write_text(outputs["docs"][1] + "\n")
    EDGE_CASE_DOC_PATH.write_text(outputs["docs"][2] + "\n")
    MERMAID_PATH.parent.mkdir(parents=True, exist_ok=True)
    MERMAID_PATH.write_text(outputs["mermaid"])

    summary = {
        "status": "PASS",
        "operation_family_count": outputs["operation_catalog"]["summary"]["operation_family_count"],
        "sequence_step_count": len(outputs["sequence_steps"]),
        "response_class_count": outputs["response_registry"]["summary"]["response_class_count"],
        "reconciliation_scenario_count": len(outputs["reconciliation_rows"]),
        "gap_count": outputs["gaps"]["summary"]["gap_count"],
    }
    print(json.dumps(summary, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
