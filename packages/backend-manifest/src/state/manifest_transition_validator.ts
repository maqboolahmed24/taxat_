import type { RunManifestRecord, RunManifestTransitionEventCode } from "../models/run_manifest.ts";
import {
  buildRunManifestInvariantEnforcementContract,
  buildRunManifestStartClaimContract,
  buildRunManifestStateTransitionContract,
  buildRunManifestPresealGateEvaluation,
} from "../models/run_manifest.ts";
import { getNextRunManifestLifecycleState } from "./run_manifest_lifecycle_machine.ts";

export type ValidateRunManifestTransitionInput = {
  current_manifest: RunManifestRecord;
  event_code: RunManifestTransitionEventCode;
  next_manifest: RunManifestRecord;
};

type RunManifestTransitionValidationErrorCode =
  | "RUN_MANIFEST_IMMUTABLE_ENVELOPE_MUTATION"
  | "RUN_MANIFEST_INVALID_TRANSITION_PAYLOAD";

export class RunManifestTransitionValidationError extends Error {
  readonly code: RunManifestTransitionValidationErrorCode;

  constructor(code: RunManifestTransitionValidationErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "RunManifestTransitionValidationError";
    this.code = code;
  }
}

const IMMUTABLE_FIELDS = [
  "manifest_id",
  "root_manifest_id",
  "parent_manifest_id",
  "continuation_of_manifest_id",
  "replay_of_manifest_id",
  "supersedes_manifest_id",
  "manifest_generation",
  "tenant_id",
  "client_id",
  "period",
  "requested_scope",
  "mode",
  "run_kind",
  "principal_context_ref",
  "access_binding_hash",
  "environment_ref",
  "provider_environment_refs",
  "code_build_id",
  "code_commit_sha",
  "container_image_digest",
  "schema_bundle_hash",
  "feature_flag_snapshot_hash",
  "deterministic_seed",
  "idempotency_key",
  "continuation_basis",
  "continuation_set",
  "manifest_branch_decision",
  "manifest_lineage_trace_refs",
  "scope_execution_binding",
  "access_decision",
  "truth_boundary_contract",
  "schema_reader_window_contract",
  "created_at",
  "non_deterministic_module_allowlist",
  "replay_class",
  "nightly_window_key",
  "nightly_batch_run_ref",
  "authority_context_ref",
  "business_partitions",
  "income_source_partitions",
  "delegation_basis",
  "authority_link_refs",
  "approval_refs",
  "override_refs",
] as const satisfies ReadonlyArray<keyof RunManifestRecord>;

function assertSameImmutableEnvelope(
  currentManifest: RunManifestRecord,
  nextManifest: RunManifestRecord,
) {
  for (const field of IMMUTABLE_FIELDS) {
    if (JSON.stringify(currentManifest[field]) !== JSON.stringify(nextManifest[field])) {
      throw new RunManifestTransitionValidationError(
        "RUN_MANIFEST_IMMUTABLE_ENVELOPE_MUTATION",
        `${field} may not change across lifecycle transitions`,
      );
    }
  }
}

function assertCondition(condition: unknown, detail: string): asserts condition {
  if (!condition) {
    throw new RunManifestTransitionValidationError(
      "RUN_MANIFEST_INVALID_TRANSITION_PAYLOAD",
      detail,
    );
  }
}

export function validateRunManifestTransition(input: ValidateRunManifestTransitionInput) {
  const expectedState = getNextRunManifestLifecycleState(
    input.current_manifest.lifecycle_state,
    input.event_code,
  );
  assertSameImmutableEnvelope(input.current_manifest, input.next_manifest);
  assertCondition(
    input.next_manifest.lifecycle_state === expectedState,
    `lifecycle_state must transition to ${expectedState}`,
  );
  assertCondition(
    input.next_manifest.state_transition_contract.current_state === expectedState,
    "state_transition_contract.current_state must mirror lifecycle_state",
  );
  assertCondition(
    input.next_manifest.state_transition_contract.previous_state_or_null ===
      input.current_manifest.lifecycle_state,
    "state_transition_contract.previous_state_or_null must mirror the prior lifecycle state",
  );
  assertCondition(
    input.next_manifest.state_transition_contract.transition_event_code === input.event_code,
    "state_transition_contract.transition_event_code must mirror the applied event",
  );

  switch (input.event_code) {
    case "freeze_success":
      assertCondition(
        input.next_manifest.frozen_at !== null,
        "freeze_success requires frozen_at",
      );
      assertCondition(
        input.next_manifest.config_freeze != null &&
          input.next_manifest.input_freeze != null &&
          input.next_manifest.hash_set != null &&
          input.next_manifest.frozen_execution_binding != null &&
          input.next_manifest.append_only_outcome_projection != null &&
          input.next_manifest.preseal_gate_evaluation != null,
        "freeze_success requires the full frozen execution envelope plus a typed preseal placeholder",
      );
      break;
    case "freeze_blocked":
      assertCondition(
        input.next_manifest.opened_at === null && input.next_manifest.sealed_at === null,
        "freeze_blocked must remain pre-start",
      );
      break;
    case "seal_success":
      assertCondition(
        input.next_manifest.sealed_at !== null,
        "seal_success requires sealed_at",
      );
      assertCondition(
        input.next_manifest.opened_at === null,
        "seal_success must remain pre-start",
      );
      assertCondition(
        input.next_manifest.preseal_gate_evaluation?.completion_state ===
          "COMPLETE_READY_TO_SEAL",
        "seal_success requires a seal-ready preseal gate evaluation",
      );
      assertCondition(
        input.next_manifest.manifest_start_claim?.claim_state === "UNCLAIMED_SEALED",
        "seal_success requires an UNCLAIMED_SEALED start-claim placeholder",
      );
      break;
    case "seal_blocked":
      assertCondition(
        input.next_manifest.opened_at === null,
        "seal_blocked must remain pre-start",
      );
      assertCondition(
        input.next_manifest.preseal_gate_evaluation?.completion_state ===
          "COMPLETE_BLOCKED_PRESTART",
        "seal_blocked requires a blocked pre-start gate evaluation",
      );
      break;
    case "run_started":
      assertCondition(
        input.next_manifest.opened_at !== null,
        "run_started requires opened_at",
      );
      assertCondition(
        input.next_manifest.manifest_start_claim?.claim_state === "ACTIVE_LEASED" ||
          input.next_manifest.manifest_start_claim?.claim_state ===
            "STALE_RECLAIM_REQUIRED",
        "run_started requires an active or reclaimable start claim",
      );
      break;
    case "run_completed":
      assertCondition(
        input.next_manifest.completed_at !== null,
        "run_completed requires completed_at",
      );
      assertCondition(
        input.next_manifest.manifest_start_claim?.claim_state ===
          "TERMINAL_RESULT_RECORDED",
        "run_completed requires terminal result capture on manifest_start_claim",
      );
      break;
    case "gate_block":
      assertCondition(
        input.next_manifest.opened_at !== null,
        "gate_block only applies to started manifests",
      );
      assertCondition(
        input.next_manifest.manifest_start_claim?.claim_state ===
          "TERMINAL_RESULT_RECORDED",
        "gate_block requires terminal result capture on manifest_start_claim",
      );
      break;
    case "system_fault":
      if (input.current_manifest.lifecycle_state === "IN_PROGRESS") {
        assertCondition(
          input.next_manifest.invariant_enforcement_contract.failure_stage_or_null ===
            "POSTSTART",
          "post-start system faults must remain POSTSTART invariant failures",
        );
      } else {
        assertCondition(
          input.next_manifest.invariant_enforcement_contract.failure_stage_or_null ===
            "PRESTART",
          "pre-start system faults must remain PRESTART invariant failures",
        );
      }
      break;
    case "superseded_by_new_manifest":
      assertCondition(
        input.next_manifest.superseded_at !== null,
        "superseded_by_new_manifest requires superseded_at",
      );
      assertCondition(
        input.next_manifest.manifest_start_claim?.claim_state ===
          "TERMINAL_RESULT_RECORDED",
        "superseded manifests must keep terminal start-claim posture",
      );
      break;
    case "replay_designation":
      assertCondition(
        input.next_manifest.manifest_start_claim?.claim_state ===
          "TERMINAL_RESULT_RECORDED",
        "replay_only manifests must keep terminal start-claim posture",
      );
      break;
    case "retention_expiry":
      assertCondition(
        input.next_manifest.retired_at !== null,
        "retention_expiry requires retired_at",
      );
      break;
    default:
      break;
  }
}

export function applyRunManifestTransitionDefaults(input: {
  current_manifest: RunManifestRecord;
  event_code: RunManifestTransitionEventCode;
  transition_applied_at: string;
  transition_audit_ref: string;
  next_manifest: RunManifestRecord;
}) {
  const expectedState = getNextRunManifestLifecycleState(
    input.current_manifest.lifecycle_state,
    input.event_code,
  );
  input.next_manifest.lifecycle_state = expectedState;
  input.next_manifest.state_transition_contract = buildRunManifestStateTransitionContract({
    current_state: expectedState,
    previous_state_or_null: input.current_manifest.lifecycle_state,
    transition_event_code: input.event_code,
    transition_applied_at: input.transition_applied_at,
    transition_audit_ref: input.transition_audit_ref,
  });
  input.next_manifest.audit_refs = Array.from(
    new Set([...(input.next_manifest.audit_refs ?? []), input.transition_audit_ref]),
  ).sort((left, right) => left.localeCompare(right));
  if (input.next_manifest.append_only_outcome_projection != null) {
    input.next_manifest.append_only_outcome_projection.audit_refs = Array.from(
      new Set([
        ...(input.next_manifest.append_only_outcome_projection.audit_refs ?? []),
        input.transition_audit_ref,
      ]),
    ).sort((left, right) => left.localeCompare(right));
  }

  if (input.event_code === "freeze_success" && input.next_manifest.preseal_gate_evaluation == null) {
    input.next_manifest.preseal_gate_evaluation = buildRunManifestPresealGateEvaluation({
      manifest_id: input.next_manifest.manifest_id,
      execution_basis_hash:
        input.next_manifest.hash_set?.execution_basis_hash ?? "hash.execution_basis.missing",
      access_binding_hash: input.next_manifest.access_binding_hash,
      authorized_scope:
        input.next_manifest.access_decision?.effective_scope ??
        input.next_manifest.scope_execution_binding.executable_scope,
      completion_state: "PENDING_PREREQUISITES",
    });
  }

  if (input.event_code === "seal_success" && input.next_manifest.manifest_start_claim == null) {
    input.next_manifest.manifest_start_claim = buildRunManifestStartClaimContract({
      manifest_id: input.next_manifest.manifest_id,
      manifest_hash: input.next_manifest.hash_set?.manifest_hash ?? "hash.manifest.missing",
      execution_basis_hash:
        input.next_manifest.hash_set?.execution_basis_hash ?? "hash.execution_basis.missing",
      access_binding_hash: input.next_manifest.access_binding_hash,
      claim_state: "UNCLAIMED_SEALED",
    });
  }

  if (input.event_code === "system_fault") {
    input.next_manifest.invariant_enforcement_contract =
      buildRunManifestInvariantEnforcementContract({
        invariant_failure_state: "TRIGGERED",
        invariant_class_or_null: "LIFECYCLE_TRANSITION",
        failure_stage_or_null:
          input.current_manifest.lifecycle_state === "IN_PROGRESS"
            ? "POSTSTART"
            : "PRESTART",
      });
  }
}
