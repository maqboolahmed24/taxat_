import type { PresealGateEvaluationContract } from "../../../generated-models/src/generated/typescript/domain-workflow-and-filing.ts";
import { sortSetLikeStrings } from "../../../domain-kernel/src/primitives/hash.ts";
import {
  PRESEAL_REQUIRED_GATE_CODES,
  type RunManifestGateDecisionRecord,
  type RunManifestRecord,
} from "../models/run_manifest.ts";

export type PresealGateCode = (typeof PRESEAL_REQUIRED_GATE_CODES)[number];

export type PresealGateChainValidation = {
  blocking_gate_codes: PresealGateCode[];
  preseal_gate_records: RunManifestGateDecisionRecord[];
  reason_codes: string[];
  valid: boolean;
};

export type PresealGateChainValidationErrorCode =
  | "PRESEAL_GATE_CHAIN_EVALUATION_MISMATCH"
  | "PRESEAL_GATE_CHAIN_PREFIX_REWRITE"
  | "PRESEAL_GATE_CHAIN_REQUIRED_ORDER_MISMATCH";

export class PresealGateChainValidationError extends Error {
  readonly code: PresealGateChainValidationErrorCode;
  readonly reason_codes: string[];

  constructor(
    code: PresealGateChainValidationErrorCode,
    detail: string,
    reasonCodes: string[],
  ) {
    super(`${code}: ${detail}`);
    this.name = "PresealGateChainValidationError";
    this.code = code;
    this.reason_codes = [...reasonCodes];
  }
}

function asJson(value: unknown) {
  return JSON.stringify(value);
}

function arraysEqual(left: readonly unknown[], right: readonly unknown[]) {
  return asJson(left) === asJson(right);
}

function authorizedScope(manifest: RunManifestRecord) {
  return manifest.access_decision?.effective_scope ?? manifest.scope_execution_binding.executable_scope;
}

export function isPresealGateCode(value: string): value is PresealGateCode {
  return (PRESEAL_REQUIRED_GATE_CODES as readonly string[]).includes(value);
}

export function isBlockingPresealGateDecision(gate: RunManifestGateDecisionRecord) {
  return (
    gate.decision === "OVERRIDABLE_BLOCK" ||
    gate.decision === "HARD_BLOCK" ||
    gate.gate_semantics_contract.blocking_class === "BLOCKED"
  );
}

function validateCompletePrefix(input: {
  gate_records: RunManifestGateDecisionRecord[];
  manifest: RunManifestRecord;
  reason_codes: string[];
}) {
  const prefix = input.gate_records.slice(0, PRESEAL_REQUIRED_GATE_CODES.length);
  if (prefix.length !== PRESEAL_REQUIRED_GATE_CODES.length) {
    input.reason_codes.push("PRESEAL_GATE_CHAIN_LENGTH_MISMATCH");
    return prefix;
  }

  const seenIds = new Set<string>();
  for (const [index, expectedGateCode] of PRESEAL_REQUIRED_GATE_CODES.entries()) {
    const gate = prefix[index];
    if (!gate) {
      input.reason_codes.push("PRESEAL_GATE_CHAIN_LENGTH_MISMATCH");
      continue;
    }
    if (gate.gate_code !== expectedGateCode) {
      input.reason_codes.push("PRESEAL_GATE_CHAIN_ORDER_MISMATCH");
    }
    if (gate.gate_stage_index !== index + 1) {
      input.reason_codes.push("PRESEAL_GATE_STAGE_INDEX_MISMATCH");
    }
    if (gate.manifest_id !== input.manifest.manifest_id) {
      input.reason_codes.push("PRESEAL_GATE_MANIFEST_ID_MISMATCH");
    }
    if (seenIds.has(gate.gate_decision_id)) {
      input.reason_codes.push("PRESEAL_GATE_DECISION_ID_DUPLICATE");
    }
    seenIds.add(gate.gate_decision_id);

    const expectedPrerequisites = prefix
      .slice(0, index)
      .map((priorGate) => priorGate.gate_decision_id);
    if (!arraysEqual(gate.prerequisite_gate_refs, sortSetLikeStrings(expectedPrerequisites))) {
      input.reason_codes.push("PRESEAL_GATE_PREREQUISITE_CHAIN_MISMATCH");
    }
    if (!arraysEqual(gate.effective_scope, authorizedScope(input.manifest))) {
      input.reason_codes.push("PRESEAL_GATE_AUTHORIZED_SCOPE_MISMATCH");
    }
  }

  return prefix;
}

function validateEvaluation(input: {
  blocking_gate_codes: PresealGateCode[];
  evaluation: PresealGateEvaluationContract;
  manifest: RunManifestRecord;
  prefix: RunManifestGateDecisionRecord[];
  reason_codes: string[];
}) {
  const expectedCompletionState =
    input.blocking_gate_codes.length > 0
      ? "COMPLETE_BLOCKED_PRESTART"
      : "COMPLETE_READY_TO_SEAL";
  if (input.evaluation.manifest_id !== input.manifest.manifest_id) {
    input.reason_codes.push("PRESEAL_EVALUATION_MANIFEST_ID_MISMATCH");
  }
  if (input.evaluation.execution_basis_hash !== input.manifest.hash_set?.execution_basis_hash) {
    input.reason_codes.push("PRESEAL_EVALUATION_EXECUTION_BASIS_HASH_MISMATCH");
  }
  if (input.evaluation.access_binding_hash !== input.manifest.access_binding_hash) {
    input.reason_codes.push("PRESEAL_EVALUATION_ACCESS_BINDING_HASH_MISMATCH");
  }
  if (!arraysEqual(input.evaluation.authorized_scope as unknown[], authorizedScope(input.manifest))) {
    input.reason_codes.push("PRESEAL_EVALUATION_AUTHORIZED_SCOPE_MISMATCH");
  }
  if (!arraysEqual(input.evaluation.required_gate_codes, PRESEAL_REQUIRED_GATE_CODES)) {
    input.reason_codes.push("PRESEAL_EVALUATION_REQUIRED_GATE_ORDER_MISMATCH");
  }
  if (!arraysEqual(input.evaluation.evaluated_gate_codes, PRESEAL_REQUIRED_GATE_CODES)) {
    input.reason_codes.push("PRESEAL_EVALUATION_EVALUATED_GATE_ORDER_MISMATCH");
  }
  if (
    !arraysEqual(
      input.evaluation.ordered_gate_decision_ids,
      input.prefix.map((gate) => gate.gate_decision_id),
    )
  ) {
    input.reason_codes.push("PRESEAL_EVALUATION_GATE_ID_PREFIX_MISMATCH");
  }
  if (input.evaluation.completion_state !== expectedCompletionState) {
    input.reason_codes.push("PRESEAL_EVALUATION_COMPLETION_STATE_MISMATCH");
  }
  if (!arraysEqual(input.evaluation.blocking_gate_codes, input.blocking_gate_codes)) {
    input.reason_codes.push("PRESEAL_EVALUATION_BLOCKING_GATE_CODES_MISMATCH");
  }
  if (input.evaluation.missing_prerequisite_refs.length !== 0) {
    input.reason_codes.push("PRESEAL_EVALUATION_COMPLETE_STATE_HAS_MISSING_PREREQUISITES");
  }
}

function validatePendingEvaluation(input: {
  evaluation: PresealGateEvaluationContract;
  gate_records: RunManifestGateDecisionRecord[];
  manifest: RunManifestRecord;
  reason_codes: string[];
}) {
  if (input.gate_records.length > 0) {
    input.reason_codes.push("PRESEAL_PENDING_EVALUATION_HAS_PERSISTED_TAPE");
  }
  if (input.evaluation.manifest_id !== input.manifest.manifest_id) {
    input.reason_codes.push("PRESEAL_EVALUATION_MANIFEST_ID_MISMATCH");
  }
  if (!arraysEqual(input.evaluation.required_gate_codes, PRESEAL_REQUIRED_GATE_CODES)) {
    input.reason_codes.push("PRESEAL_EVALUATION_REQUIRED_GATE_ORDER_MISMATCH");
  }
  if (
    input.evaluation.evaluated_gate_codes.length !== 0 ||
    input.evaluation.ordered_gate_decision_ids.length !== 0 ||
    input.evaluation.blocking_gate_codes.length !== 0
  ) {
    input.reason_codes.push("PRESEAL_PENDING_EVALUATION_PUBLISHED_GATE_TAPE");
  }
  if (input.evaluation.missing_prerequisite_refs.length === 0) {
    input.reason_codes.push("PRESEAL_PENDING_EVALUATION_MISSING_PREREQUISITES_REQUIRED");
  }
}

export function validatePresealGateChain(input: {
  evaluation?: PresealGateEvaluationContract | null;
  gate_records: RunManifestGateDecisionRecord[];
  manifest: RunManifestRecord;
}): PresealGateChainValidation {
  const reasonCodes: string[] = [];
  const gateRecords = structuredClone(input.gate_records);
  const evaluation = input.evaluation ?? null;

  if (evaluation?.completion_state === "PENDING_PREREQUISITES") {
    validatePendingEvaluation({
      evaluation,
      gate_records: gateRecords,
      manifest: input.manifest,
      reason_codes: reasonCodes,
    });
    return {
      valid: reasonCodes.length === 0,
      reason_codes: [...new Set(reasonCodes)],
      blocking_gate_codes: [],
      preseal_gate_records: [],
    };
  }

  const prefix = validateCompletePrefix({
    gate_records: gateRecords,
    manifest: input.manifest,
    reason_codes: reasonCodes,
  });
  const blockingGateCodes = prefix
    .filter((gate) => isPresealGateCode(gate.gate_code) && isBlockingPresealGateDecision(gate))
    .map((gate) => gate.gate_code as PresealGateCode);

  if (evaluation !== null) {
    validateEvaluation({
      blocking_gate_codes: blockingGateCodes,
      evaluation,
      manifest: input.manifest,
      prefix,
      reason_codes: reasonCodes,
    });
  }

  return {
    valid: reasonCodes.length === 0,
    reason_codes: [...new Set(reasonCodes)],
    blocking_gate_codes: blockingGateCodes,
    preseal_gate_records: structuredClone(prefix),
  };
}

export function assertPresealGateChain(input: Parameters<typeof validatePresealGateChain>[0]) {
  const validation = validatePresealGateChain(input);
  if (!validation.valid) {
    throw new PresealGateChainValidationError(
      "PRESEAL_GATE_CHAIN_REQUIRED_ORDER_MISMATCH",
      `pre-seal gate tape does not match the canonical manifest prefix: ${validation.reason_codes.join(", ")}`,
      validation.reason_codes,
    );
  }
  return validation;
}

export function assertPresealPrefixUnchanged(input: {
  current_gate_records: RunManifestGateDecisionRecord[];
  next_gate_records: RunManifestGateDecisionRecord[];
}) {
  const currentPrefix = input.current_gate_records.slice(0, PRESEAL_REQUIRED_GATE_CODES.length);
  const nextPrefix = input.next_gate_records.slice(0, PRESEAL_REQUIRED_GATE_CODES.length);
  if (currentPrefix.length === 0) {
    return;
  }
  if (asJson(currentPrefix) !== asJson(nextPrefix)) {
    throw new PresealGateChainValidationError(
      "PRESEAL_GATE_CHAIN_PREFIX_REWRITE",
      "pre-seal gate prefix is immutable after publication",
      ["PRESEAL_GATE_PREFIX_REWRITE_ATTEMPT"],
    );
  }
}
