import { sortSetLikeStrings } from "../../../domain-kernel/src/primitives/hash.ts";
import { normalizeScopeSequence } from "../../../backend-access/src/services/principal_context_normalizer.ts";
import {
  buildRunManifestPresealGateEvaluation,
  type RunManifestGateDecisionRecord,
  type RunManifestRecord,
} from "../models/run_manifest.ts";
import type { PresealGateResult } from "../types/preseal_gate_result.ts";
import {
  assertPresealGateChain,
  isBlockingPresealGateDecision,
  type PresealGateCode,
} from "./preseal_gate_chain_validator.ts";

export type BuildPresealGateEvaluationErrorCode =
  | "PRESEAL_GATE_EVALUATION_EXECUTION_BASIS_MISSING"
  | "PRESEAL_GATE_EVALUATION_PARTIAL_TAPE";

export class BuildPresealGateEvaluationError extends Error {
  readonly code: BuildPresealGateEvaluationErrorCode;

  constructor(code: BuildPresealGateEvaluationErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "BuildPresealGateEvaluationError";
    this.code = code;
  }
}

function missingPrerequisites(manifest: RunManifestRecord, explicitRefs: readonly string[]) {
  const missing = [...explicitRefs];
  if (manifest.config_freeze == null) {
    missing.push(`config-freeze://${manifest.manifest_id}`);
  }
  if (manifest.input_freeze == null) {
    missing.push(`input-freeze://${manifest.manifest_id}`);
  }
  if (manifest.hash_set?.execution_basis_hash == null) {
    missing.push(`hash-set://${manifest.manifest_id}/execution_basis_hash`);
  }
  if (manifest.frozen_execution_binding == null) {
    missing.push(`frozen-execution-binding://${manifest.manifest_id}`);
  }
  if (missing.length === 0) {
    missing.push(`gate-tape://${manifest.manifest_id}/preseal`);
  }
  return sortSetLikeStrings(missing);
}

function requireExecutionBasisHash(manifest: RunManifestRecord) {
  if (!manifest.hash_set?.execution_basis_hash) {
    throw new BuildPresealGateEvaluationError(
      "PRESEAL_GATE_EVALUATION_EXECUTION_BASIS_MISSING",
      "pre-seal evaluation requires hash_set.execution_basis_hash",
    );
  }
  return manifest.hash_set.execution_basis_hash;
}

export function buildPresealGateEvaluation(input: {
  gate_records?: RunManifestGateDecisionRecord[];
  manifest: RunManifestRecord;
  missing_prerequisite_refs?: string[];
}): PresealGateResult {
  const gateRecords = structuredClone(input.gate_records ?? []);
  const executionBasisHash = requireExecutionBasisHash(input.manifest);
  const authorizedScope = normalizeScopeSequence(
    "preseal_gate_evaluation.authorized_scope",
    input.manifest.access_decision?.effective_scope ??
      input.manifest.scope_execution_binding.executable_scope,
  );

  if (gateRecords.length === 0) {
    const prerequisiteRefs = missingPrerequisites(
      input.manifest,
      input.missing_prerequisite_refs ?? [],
    );
    const evaluation = buildRunManifestPresealGateEvaluation({
      manifest_id: input.manifest.manifest_id,
      execution_basis_hash: executionBasisHash,
      access_binding_hash: input.manifest.access_binding_hash,
      authorized_scope: authorizedScope,
      completion_state: "PENDING_PREREQUISITES",
      missing_prerequisite_refs: prerequisiteRefs,
    });
    return {
      completion_state: "PENDING_PREREQUISITES",
      preseal_gate_evaluation: evaluation,
      gate_records: [],
      blocking_gate_codes: [],
      missing_prerequisite_refs: prerequisiteRefs,
      reason_codes: ["PRESEAL_PREREQUISITES_PENDING"],
    };
  }

  if (gateRecords.length < 4) {
    throw new BuildPresealGateEvaluationError(
      "PRESEAL_GATE_EVALUATION_PARTIAL_TAPE",
      "pre-seal gate evaluation may publish either no tape or the complete canonical four-gate tape",
    );
  }

  const validation = assertPresealGateChain({
    manifest: input.manifest,
    gate_records: gateRecords,
  });
  const blockingGateCodes = validation.preseal_gate_records
    .filter(isBlockingPresealGateDecision)
    .map((gate) => gate.gate_code as PresealGateCode);
  const completionState =
    blockingGateCodes.length > 0 ? "COMPLETE_BLOCKED_PRESTART" : "COMPLETE_READY_TO_SEAL";
  const evaluation = buildRunManifestPresealGateEvaluation({
    manifest_id: input.manifest.manifest_id,
    execution_basis_hash: executionBasisHash,
    access_binding_hash: input.manifest.access_binding_hash,
    authorized_scope: authorizedScope,
    completion_state: completionState,
    ordered_gate_decision_ids: validation.preseal_gate_records.map(
      (gate) => gate.gate_decision_id,
    ),
    blocking_gate_codes: blockingGateCodes,
  });
  assertPresealGateChain({
    manifest: input.manifest,
    gate_records: validation.preseal_gate_records,
    evaluation,
  });

  return {
    completion_state: completionState,
    preseal_gate_evaluation: evaluation,
    gate_records: validation.preseal_gate_records,
    blocking_gate_codes: blockingGateCodes,
    missing_prerequisite_refs: [],
    reason_codes:
      completionState === "COMPLETE_BLOCKED_PRESTART"
        ? ["PRESEAL_BLOCKED_PRESTART"]
        : ["PRESEAL_READY_TO_SEAL"],
  };
}
