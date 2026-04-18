#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import build_control_plane_governance_pack as builder


REQUIRED_OUTPUTS = [
    builder.ARTIFACT_INVENTORY_PATH,
    builder.REPLAY_CLASS_MATRIX_PATH,
    builder.REPLAY_COMPARISON_MATRIX_PATH,
    builder.CLAIM_BRANCH_MATRIX_PATH,
    builder.NIGHTLY_SELECTION_MATRIX_PATH,
    builder.NIGHTLY_POLICY_MATRIX_PATH,
    builder.RECOVERY_REOPEN_MATRIX_PATH,
    builder.RESEND_RECOVERY_MATRIX_PATH,
    builder.RELEASE_GATE_MATRIX_PATH,
    builder.ROLLBACK_MATRIX_PATH,
    builder.REQUIREMENTS_DOC_PATH,
    builder.FAILURE_DOC_PATH,
    builder.LIFECYCLE_MERMAID_PATH,
    builder.TOPOLOGY_MERMAID_PATH,
]


def fail(message: str) -> None:
    raise SystemExit(message)


def load_json(path: Path) -> Any:
    return json.loads(path.read_text())


def compare_json(path: Path, expected: Any, label: str) -> None:
    actual = load_json(path)
    if actual != expected:
        fail(f"{label} drifted from the canonical builder output.")


def compare_text(path: Path, expected: str, label: str) -> None:
    actual = path.read_text()
    if actual != expected:
        fail(f"{label} drifted from the canonical builder render.")


def unique_values(rows: list[dict[str, Any]], key: str) -> set[Any]:
    return {row[key] for row in rows}


def main() -> int:
    for path in REQUIRED_OUTPUTS:
        if not path.exists():
            fail(f"Missing required artifact: {path}")

    outputs = builder.build_outputs()

    compare_json(builder.ARTIFACT_INVENTORY_PATH, outputs["artifact_inventory"], "control_plane_artifact_inventory.json")
    compare_json(builder.REPLAY_CLASS_MATRIX_PATH, outputs["replay_class_matrix"], "replay_class_and_precondition_matrix.json")
    compare_json(
        builder.REPLAY_COMPARISON_MATRIX_PATH,
        outputs["replay_comparison_matrix"],
        "replay_comparison_and_attestation_matrix.json",
    )
    compare_json(
        builder.CLAIM_BRANCH_MATRIX_PATH,
        outputs["claim_branch_matrix"],
        "manifest_start_claim_and_branch_selection_matrix.json",
    )
    compare_json(
        builder.NIGHTLY_SELECTION_MATRIX_PATH,
        outputs["nightly_selection_matrix"],
        "nightly_selection_disposition_matrix.json",
    )
    compare_json(
        builder.NIGHTLY_POLICY_MATRIX_PATH,
        outputs["nightly_policy_matrix"],
        "nightly_unattended_policy_matrix.json",
    )
    compare_json(
        builder.RECOVERY_REOPEN_MATRIX_PATH,
        outputs["recovery_matrix"],
        "recovery_checkpoint_reopen_matrix.json",
    )
    compare_json(
        builder.RESEND_RECOVERY_MATRIX_PATH,
        outputs["resend_matrix"],
        "no_blind_resend_and_authority_recovery_rules.json",
    )
    compare_json(
        builder.RELEASE_GATE_MATRIX_PATH,
        outputs["release_gate_matrix"],
        "release_candidate_and_compatibility_gate_matrix.json",
    )
    compare_json(
        builder.ROLLBACK_MATRIX_PATH,
        outputs["rollback_matrix"],
        "rollback_fail_forward_boundary_matrix.json",
    )

    compare_text(
        builder.REQUIREMENTS_DOC_PATH,
        outputs["docs"][0] + "\n",
        "15_replay_recovery_nightly_release_governance.md",
    )
    compare_text(
        builder.FAILURE_DOC_PATH,
        outputs["docs"][1] + "\n",
        "15_control_plane_failure_and_promotion_rules.md",
    )
    compare_text(
        builder.LIFECYCLE_MERMAID_PATH,
        outputs["mermaids"][0],
        "15_control_plane_lifecycle.mmd",
    )
    compare_text(
        builder.TOPOLOGY_MERMAID_PATH,
        outputs["mermaids"][1],
        "15_nightly_recovery_release_topology.mmd",
    )

    payloads = [
        outputs["artifact_inventory"],
        outputs["replay_class_matrix"],
        outputs["replay_comparison_matrix"],
        outputs["claim_branch_matrix"],
        outputs["nightly_selection_matrix"],
        outputs["nightly_policy_matrix"],
        outputs["recovery_matrix"],
        outputs["resend_matrix"],
        outputs["release_gate_matrix"],
        outputs["rollback_matrix"],
    ]
    for payload in payloads:
        builder.assert_required_record_fields(payload["rows"])

    artifact_inventory = outputs["artifact_inventory"]
    artifact_names = unique_values(artifact_inventory["artifacts"], "artifact_name")
    required_artifacts = {
        "RunManifest",
        "ConfigFreeze",
        "InputFreeze",
        "HashSet",
        "ContinuationSet",
        "FrozenExecutionBinding",
        "preseal_gate_evaluation",
        "manifest_start_claim",
        "ManifestLineageTrace",
        "ReplayAttestation",
        "NightlyBatchIdentityContract",
        "NightlyBatchRun",
        "NightlySelectionEntry",
        "OperatorMorningDigest",
        "RecoveryGovernanceContract",
        "RecoveryCheckpoint",
        "RestorePrivacyReconciliationContract",
        "AuthorityInteractionRecord",
        "ReleaseCandidateIdentityContract",
        "SchemaBundleCompatibilityGateContract",
        "ReleaseVerificationManifest",
        "DeploymentRelease",
    }
    missing_artifacts = required_artifacts - artifact_names
    if missing_artifacts:
        fail(f"Artifact inventory is missing required control-plane artifacts: {sorted(missing_artifacts)}")

    replay_matrix = outputs["replay_class_matrix"]
    replay_classes = unique_values(replay_matrix["replay_classes"], "replay_class")
    if replay_classes != set(builder.REPLAY_CLASS_ENUM):
        fail(f"Replay class coverage drifted: expected {sorted(builder.REPLAY_CLASS_ENUM)}, got {sorted(replay_classes)}")
    precondition_codes = unique_values(replay_matrix["exact_replay_preconditions"], "precondition_code")
    expected_precondition_codes = {code for code, _ in builder.REPLAY_PRECONDITION_SPECS}
    if precondition_codes != expected_precondition_codes:
        fail(
            "Replay precondition coverage drifted. "
            f"Expected {sorted(expected_precondition_codes)}, got {sorted(precondition_codes)}"
        )
    mutation_postures = {row["mutation_posture"] for row in replay_matrix["replay_classes"]}
    if "ANALYSIS_ONLY_NO_AUTHORITY_MUTATION" not in mutation_postures:
        fail("Counterfactual replay mutation isolation posture is missing.")

    comparison_matrix = outputs["replay_comparison_matrix"]
    if unique_values(comparison_matrix["comparison_modes"], "comparison_mode") != set(builder.COMPARISON_MODE_ENUM):
        fail("Replay comparison mode coverage drifted.")
    if unique_values(comparison_matrix["basis_validation_states"], "basis_validation_state") != set(builder.BASIS_VALIDATION_ENUM):
        fail("Basis validation state coverage drifted.")
    if unique_values(comparison_matrix["basis_identity_verdicts"], "basis_identity_verdict") != set(builder.BASIS_IDENTITY_ENUM):
        fail("Basis identity verdict coverage drifted.")
    if (
        unique_values(comparison_matrix["deterministic_equivalence_verdicts"], "deterministic_equivalence_verdict")
        != set(builder.EQUIVALENCE_ENUM)
    ):
        fail("Deterministic equivalence verdict coverage drifted.")
    if unique_values(comparison_matrix["outcome_classes"], "outcome_class") != set(builder.OUTCOME_CLASS_ENUM):
        fail("Replay outcome class coverage drifted.")
    if unique_values(comparison_matrix["variance_taxonomy"], "variance_class") != set(builder.REPLAY_VARIANCE_TAXONOMY):
        fail("Replay variance taxonomy coverage drifted.")
    if unique_values(comparison_matrix["attestation_confidence_bands"], "attestation_confidence_band") != set(
        builder.ATTESTATION_CONFIDENCE_BANDS
    ):
        fail("Replay attestation confidence-band coverage drifted.")

    claim_branch_matrix = outputs["claim_branch_matrix"]
    if unique_values(claim_branch_matrix["claim_outcomes"], "claim_outcome") != set(builder.CLAIM_OUTCOMES):
        fail("Manifest start-claim outcome coverage drifted.")
    if unique_values(claim_branch_matrix["branch_actions"], "branch_action") != set(builder.BRANCH_ACTIONS):
        fail("Manifest branch action coverage drifted.")
    if unique_values(claim_branch_matrix["branch_reason_codes"], "branch_reason_code") != set(builder.BRANCH_REASON_CODES):
        fail("Manifest branch reason coverage drifted.")
    if unique_values(claim_branch_matrix["frozen_identity_inputs"], "frozen_identity_input") != set(builder.FROZEN_IDENTITY_INPUTS):
        fail("Frozen branch identity input coverage drifted.")

    nightly_selection_matrix = outputs["nightly_selection_matrix"]
    if unique_values(nightly_selection_matrix["trigger_classes"], "trigger_class") != set(builder.NIGHTLY_TRIGGER_ENUM):
        fail("Nightly trigger class coverage drifted.")
    if unique_values(nightly_selection_matrix["selection_dispositions"], "selection_disposition") != set(
        builder.SELECTION_DISPOSITION_ENUM
    ):
        fail("Nightly selection disposition coverage drifted.")
    if unique_values(
        nightly_selection_matrix["terminal_result_reuse_states"], "terminal_result_reuse_state"
    ) != set(builder.TERMINAL_REUSE_ENUM):
        fail("Nightly terminal-result reuse-state coverage drifted.")
    if unique_values(
        nightly_selection_matrix["active_attempt_resolution_states"], "active_attempt_resolution_state"
    ) != set(builder.ACTIVE_ATTEMPT_RESOLUTION_ENUM):
        fail("Nightly active-attempt resolution-state coverage drifted.")
    if unique_values(nightly_selection_matrix["recovery_resume_states"], "recovery_resume_state") != set(
        builder.NIGHTLY_RESUME_ENUM
    ):
        fail("Nightly recovery-resume state coverage drifted.")
    if unique_values(nightly_selection_matrix["shard_failure_states"], "shard_state") != set(
        builder.NIGHTLY_SHARD_FAILURE_ENUM
    ):
        fail("Nightly shard-state coverage drifted.")
    if unique_values(nightly_selection_matrix["quiescence_outcome_buckets"], "outcome_bucket") != set(
        builder.NIGHTLY_OUTCOME_BUCKET_ENUM
    ):
        fail("Nightly outcome-bucket coverage drifted.")

    nightly_policy_matrix = outputs["nightly_policy_matrix"]
    expected_policy_cells = {
        (stage_family, policy_value)
        for stage_family in builder.NIGHTLY_STAGE_FAMILIES
        for policy_value in builder.UNATTENDED_POLICY_VALUES
    }
    actual_policy_cells = {
        (row["stage_family"], row["policy_value"]) for row in nightly_policy_matrix["policy_cells"]
    }
    if actual_policy_cells != expected_policy_cells:
        fail("Nightly unattended policy-cell coverage drifted.")
    if unique_values(nightly_policy_matrix["hard_boundaries"], "hard_boundary") != set(builder.NIGHTLY_HARD_BOUNDARIES):
        fail("Nightly hard-boundary coverage drifted.")
    if unique_values(
        nightly_policy_matrix["safe_customer_visible_requirements"], "safe_customer_visible_requirement"
    ) != set(builder.SAFE_CUSTOMER_VISIBLE_REQUIREMENTS):
        fail("Safe customer-visible automation coverage drifted.")
    if unique_values(nightly_policy_matrix["retry_classes"], "retry_class") != set(builder.NIGHTLY_RETRY_CLASSES):
        fail("Nightly retry-class coverage drifted.")
    if unique_values(nightly_policy_matrix["global_stop_conditions"], "global_stop_condition") != set(
        builder.NIGHTLY_STOP_CONDITIONS
    ):
        fail("Nightly global stop-condition coverage drifted.")

    recovery_matrix = outputs["recovery_matrix"]
    if unique_values(recovery_matrix["recovery_tier_mappings"], "protected_workload_class") != set(
        builder.RECOVERY_WORKLOAD_CLASS_ENUM
    ):
        fail("Recovery workload-class coverage drifted.")
    if unique_values(recovery_matrix["reopen_readiness_states"], "reopen_readiness_state") != set(
        builder.REOPEN_READINESS_ENUM
    ):
        fail("Recovery reopen-readiness coverage drifted.")
    if unique_values(recovery_matrix["privacy_reconciliation_states"], "privacy_reconciliation_state") != set(
        builder.PRIVACY_RECONCILIATION_ENUM
    ):
        fail("Restore privacy reconciliation coverage drifted.")

    resend_matrix = outputs["resend_matrix"]
    if unique_values(resend_matrix["resend_legality_rules"], "resend_legality_state") != set(
        builder.RECONCILIATION_RESEND_STATES
    ):
        fail("No-blind-resend legality-state coverage drifted.")

    release_gate_matrix = outputs["release_gate_matrix"]
    if unique_values(release_gate_matrix["candidate_identity_fields"], "candidate_identity_field") != set(
        builder.RELEASE_CANDIDATE_REQUIRED
    ):
        fail("Release candidate identity field coverage drifted.")
    if unique_values(release_gate_matrix["compatibility_gate_fields"], "compatibility_gate_field") != set(
        builder.COMPATIBILITY_GATE_REQUIRED
    ):
        fail("Compatibility gate field coverage drifted.")
    required_evidence_artifacts = {
        "VerificationSuiteResult",
        "GateAdmissibilityRecord",
        "CanaryHealthSummary",
        "RestoreDrillResult",
        "ClientCompatibilityMatrix",
        "ReleaseVerificationManifest",
        "DeploymentRelease",
    }
    if unique_values(release_gate_matrix["evidence_bindings"], "evidence_artifact") != required_evidence_artifacts:
        fail("Release evidence-binding coverage drifted.")

    rollback_matrix = outputs["rollback_matrix"]
    if unique_values(rollback_matrix["rollback_boundary_states"], "rollback_boundary_state") != set(
        builder.ROLLBACK_BOUNDARY_ENUM
    ):
        fail("Rollback-boundary state coverage drifted.")
    rollout_pairs = {
        (row["rollout_strategy"], row["rollout_state"]) for row in rollback_matrix["rollout_strategy_state_alignment"]
    }
    required_rollout_pairs = {
        ("STANDARD_CANARY", "CANARY"),
        ("STANDARD_CANARY", "ABORTED"),
        ("PIN_BASELINE", "PINNED"),
        ("FAIL_FORWARD_COMPENSATING", "FAILED_FORWARD"),
        ("STANDARD_CANARY", "ROLLED_BACK"),
        ("EMERGENCY_PROMOTE", "PROMOTED"),
    }
    if rollout_pairs != required_rollout_pairs:
        fail("Rollout strategy/state alignment coverage drifted.")

    gap_ids = {gap["gap_id"] for gap in artifact_inventory["explicit_gaps"]}
    required_gap_ids = {
        "manifest_lineage_trace_schema_missing",
        "legal_claim_outcomes_prose_only",
        "branch_reason_codes_prose_only",
        "tenant_specific_unattended_defaults_not_canonicalized",
        "shared_operating_contract_reference_missing_for_pc_0015",
    }
    if gap_ids != required_gap_ids:
        fail(f"Explicit gap register drifted: expected {sorted(required_gap_ids)}, got {sorted(gap_ids)}")

    summary = {
        "status": "PASS",
        "artifact_count": artifact_inventory["summary"]["artifact_count"],
        "replay_class_count": len(replay_matrix["replay_classes"]),
        "claim_outcome_count": len(claim_branch_matrix["claim_outcomes"]),
        "nightly_disposition_count": len(nightly_selection_matrix["selection_dispositions"]),
        "policy_cell_count": len(nightly_policy_matrix["policy_cells"]),
        "recovery_tier_count": len(recovery_matrix["recovery_tier_mappings"]),
        "resend_legality_state_count": len(resend_matrix["resend_legality_rules"]),
        "release_candidate_field_count": len(release_gate_matrix["candidate_identity_fields"]),
        "compatibility_gate_field_count": len(release_gate_matrix["compatibility_gate_fields"]),
        "gap_count": len(gap_ids),
    }
    print(json.dumps(summary, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
