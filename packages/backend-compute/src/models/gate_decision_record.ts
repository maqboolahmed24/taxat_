import {
  normalizeStringSet,
  requireTrimmedString,
  type CanonicalScopeToken,
} from "../../../backend-access/src/services/principal_context_normalizer.ts";
import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";
import {
  buildGateDecisionExplainability,
  defaultGateReasonForDecision,
  orderGateReasonCodes,
  plainGateExplanation,
} from "../services/build_gate_decision_explainability.ts";
import { buildGateSemanticsContract, severityForGateDecision } from "../services/build_gate_semantics_contract.ts";
import {
  canonicalizeGateEffectiveScope,
  getGateStageProfileByCode,
} from "../services/get_canonical_gate_stage_profile.ts";
import { validatePersistedGateDecisionExplainabilityAlignment } from "../services/validate_persisted_decision_explainability_alignment.ts";

export type GateCode =
  | "MANIFEST_GATE"
  | "ARTIFACT_CONTRACT_GATE"
  | "INPUT_BOUNDARY_GATE"
  | "DATA_QUALITY_GATE"
  | "RETENTION_EVIDENCE_GATE"
  | "PARITY_GATE"
  | "TRUST_GATE"
  | "AMENDMENT_GATE"
  | "FILING_GATE"
  | "SUBMISSION_GATE";

export type GateDecision =
  | "PASS"
  | "PASS_WITH_NOTICE"
  | "MANUAL_REVIEW"
  | "OVERRIDABLE_BLOCK"
  | "HARD_BLOCK";
export type GateSeverity = "INFO" | "NOTICE" | "WARNING" | "ERROR" | "CRITICAL";
export type GateBlockingClass = "NON_BLOCKING" | "REVIEW_REQUIRED" | "BLOCKED";
export type GateProgressionSemantics =
  | "AUTOMATED_CONTINUE"
  | "AUTOMATED_CONTINUE_WITH_NOTICE"
  | "REVIEW_ONLY"
  | "BLOCKED";
export type GateOverrideability =
  | "NONE"
  | "SCOPED_OVERRIDE_ALLOWED"
  | "SCOPED_OVERRIDE_REQUIRED"
  | "NON_OVERRIDEABLE";
export type GateOverrideResolutionState =
  | "NOT_APPLICABLE"
  | "NO_VALID_OVERRIDE"
  | "VALID_OVERRIDE_ACTIVE";
export type GateOverrideDependencyState =
  | "OVERRIDE_INDEPENDENT"
  | "VALID_OVERRIDE_GOVERNED"
  | "OVERRIDE_REQUIRED_MISSING"
  | "OVERRIDE_FORBIDDEN";

export type GateSemanticsContract = {
  blocking_class: GateBlockingClass;
  contract_version: "GATE_SEMANTICS_CONTRACT_V1";
  decision_rank: 0 | 1 | 2 | 3 | 4;
  evaluation_order_profile_code: "NON_ACCESS_GATE_ORDER_V1";
  override_dependency_state: GateOverrideDependencyState;
  progression_rank: 0 | 1 | 2;
  progression_semantics: GateProgressionSemantics;
  reason_order_profile_code: "NON_ACCESS_GATE_REASON_PRIORITY_V1";
  severity_profile_code: "NON_ACCESS_GATE_SEVERITY_V1";
};

export type DecisionExplainabilityContract = {
  action_projection_state:
    | "NONE"
    | "NEXT_ACTIONS_INCLUDED"
    | "PRIMARY_ACTION_INCLUDED"
    | "NO_SAFE_ACTION_DISCLOSED";
  artifact_family: "GATE_DECISION_RECORD" | "TRUST_SUMMARY" | "DECISION_BUNDLE";
  compressed_reason_codes: string[];
  compression_policy: "PREFIX_COMPRESS_ORDERED_REASON_CODES_WITH_SUPPRESSED_COUNT";
  compression_reason_cap: 3;
  contract_version: "DECISION_EXPLAINABILITY_V1";
  dominant_reason_code: string;
  dominant_reason_selection_policy: "FIRST_ORDERED_REASON_IS_DOMINANT";
  grammar_profile_code: "LOW_NOISE_DECISION_GRAMMAR_V1";
  ordered_reason_codes: string[];
  plain_text_character_limit: 200;
  plain_text_field_name: "plain_explanation" | "plain_summary" | "plain_reason";
  reason_order_policy: "DOMINANT_REASON_FIRST_CANONICAL_PRIORITY";
  semantic_qualifiers: (
    | "AUTHORITY_STATE"
    | "LIMITATION_STATE"
    | "OVERRIDE_STATE"
    | "ACTIONABILITY_STATE"
  )[];
  summary_source_policy: "READ_SURFACES_MUST_USE_PERSISTED_FIELDS";
  suppressed_reason_count: number;
};

export type CommandTruthBoundaryContract = {
  artifact_role: "COMMAND_REQUEST" | "COMMAND_SIDE_AUTHORITY" | "BOUNDARY_RECEIPT" | "READ_SIDE_PROJECTION";
  authoritative_record_families: string[];
  authoritative_source_policy:
    | "TARGET_DURABLE_IDS_ONLY"
    | "DURABLE_COMMAND_RECORDS_ONLY"
    | "DURABLE_COMMAND_RESULTS_ONLY"
    | "MIRROR_DURABLE_COMMAND_RECORDS_ONLY";
  contract_version: "COMMAND_TRUTH_BOUNDARY_V1";
  durable_writeback_policy:
    | "NO_DIRECT_STATE_WRITEBACK"
    | "AUTHORITATIVE_STATE_TRANSITIONS_ALLOWED"
    | "APPEND_ONLY_BOUNDARY_EVIDENCE"
    | "NO_DURABLE_STATE_WRITEBACK";
  observable_projection_families: string[];
  projection_input_policy:
    | "STALE_GUARDS_ONLY"
    | "FORBIDDEN_AS_AUTHORITY"
    | "STALE_GUARDS_AND_RECOVERY_MIRRORS_ONLY"
    | "NO_PROJECTION_INPUTS";
  recovery_basis_policy:
    | "DURABLE_IDS_AND_RECEIPTS_ONLY"
    | "MANIFEST_AND_DURABLE_RECORDS_ONLY"
    | "RECEIPT_PLUS_DURABLE_RESULTS_ONLY"
    | "REBUILD_FROM_DURABLE_RECORDS_ONLY";
};

export type GateDecisionRecord = {
  active_override_refs: string[];
  artifact_type: "GateDecisionRecord";
  blocking_dependency_refs: string[];
  decided_at: string;
  decision: GateDecision;
  decision_basis_ref: string;
  decision_explainability_contract: DecisionExplainabilityContract;
  dominant_reason_code: string;
  effective_scope: CanonicalScopeToken[];
  gate_class: "NON_ACCESS";
  gate_code: GateCode;
  gate_decision_id: string;
  gate_semantics_contract: GateSemanticsContract;
  gate_stage_index: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  input_artifact_refs: string[];
  manifest_id: string;
  metrics: Record<string, unknown>;
  next_action_codes: string[];
  override_resolution_state: GateOverrideResolutionState;
  overrideability: GateOverrideability;
  plain_explanation: string;
  policy_version_ref: string;
  prerequisite_gate_refs: string[];
  reason_codes: string[];
  required_override_scope: string | null;
  severity: GateSeverity;
  truth_boundary_contract: CommandTruthBoundaryContract;
};

export type GateDecisionRecordBuildInput = {
  active_override_refs?: readonly string[];
  blocking_dependency_refs?: readonly string[];
  decided_at?: string;
  decision?: GateDecision;
  decision_basis_ref?: string;
  dominant_reason_code?: string;
  effective_scope: readonly string[];
  gate_code: GateCode;
  gate_decision_id?: string;
  input_artifact_refs?: readonly string[];
  manifest_id: string;
  metrics?: Record<string, unknown>;
  next_action_codes?: readonly string[];
  override_resolution_state?: GateOverrideResolutionState;
  overrideability?: GateOverrideability;
  plain_explanation?: string;
  policy_version_ref?: string;
  prerequisite_gate_refs?: readonly string[];
  reason_codes?: readonly string[];
  required_override_scope?: string | null;
};

export const GATE_TRUTH_BOUNDARY_CONTRACT: CommandTruthBoundaryContract = {
  artifact_role: "COMMAND_SIDE_AUTHORITY",
  authoritative_record_families: ["RUN_MANIFEST", "GATE_DECISION_RECORD", "AUDIT_EVENT"],
  authoritative_source_policy: "DURABLE_COMMAND_RECORDS_ONLY",
  contract_version: "COMMAND_TRUTH_BOUNDARY_V1",
  durable_writeback_policy: "AUTHORITATIVE_STATE_TRANSITIONS_ALLOWED",
  observable_projection_families: [],
  projection_input_policy: "FORBIDDEN_AS_AUTHORITY",
  recovery_basis_policy: "MANIFEST_AND_DURABLE_RECORDS_ONLY",
};

export class GateDecisionRecordModelError extends Error {
  readonly code:
    | "GATE_DECISION_ARTIFACT_TYPE_INVALID"
    | "GATE_DECISION_BOUNDARY_INVALID"
    | "GATE_DECISION_EXPLAINABILITY_INVALID"
    | "GATE_DECISION_FIELD_REQUIRED"
    | "GATE_DECISION_NUMERIC_INVALID"
    | "GATE_DECISION_POSTURE_INVALID"
    | "GATE_DECISION_SCOPE_INVALID"
    | "GATE_DECISION_SEMANTICS_INVALID"
    | "GATE_DECISION_STAGE_INVALID";

  constructor(code: GateDecisionRecordModelError["code"], detail: string) {
    super(`${code}: ${detail}`);
    this.name = "GateDecisionRecordModelError";
    this.code = code;
  }
}

function requireString(label: string, value: unknown) {
  try {
    return requireTrimmedString(label, value);
  } catch (error) {
    throw new GateDecisionRecordModelError(
      "GATE_DECISION_FIELD_REQUIRED",
      error instanceof Error ? error.message : `${label} must be a non-empty string`,
    );
  }
}

function requirePlainText(label: string, value: unknown) {
  const normalized = requireString(label, value);
  if (normalized.length > 200) {
    return normalized.slice(0, 200);
  }
  return normalized;
}

function normalizeStringSetWithLimit(
  label: string,
  values: readonly string[] | undefined,
  options?: { maxItems?: number; minItems?: number },
) {
  const normalized = normalizeStringSet(label, values ?? [], {
    minItems: options?.minItems,
  });
  if (options?.maxItems !== undefined && normalized.length > options.maxItems) {
    throw new GateDecisionRecordModelError(
      "GATE_DECISION_FIELD_REQUIRED",
      `${label} must contain at most ${options.maxItems} item(s)`,
    );
  }
  return normalized;
}

function normalizeOrderedStringSet(
  label: string,
  values: readonly string[] | undefined,
  options?: { maxItems?: number; minItems?: number },
) {
  const seen = new Set<string>();
  const normalized = (values ?? []).map((value) => requireString(label, value)).filter((value) => {
    if (seen.has(value)) {
      throw new GateDecisionRecordModelError(
        "GATE_DECISION_FIELD_REQUIRED",
        `${label} must not contain duplicates`,
      );
    }
    seen.add(value);
    return true;
  });
  if (normalized.length < (options?.minItems ?? 0)) {
    throw new GateDecisionRecordModelError(
      "GATE_DECISION_FIELD_REQUIRED",
      `${label} must contain at least ${options?.minItems} item(s)`,
    );
  }
  if (options?.maxItems !== undefined && normalized.length > options.maxItems) {
    throw new GateDecisionRecordModelError(
      "GATE_DECISION_FIELD_REQUIRED",
      `${label} must contain at most ${options.maxItems} item(s)`,
    );
  }
  return normalized;
}

function normalizeMetrics(value: Record<string, unknown> | undefined) {
  const metrics = value ?? {};
  if (metrics === null || Array.isArray(metrics) || typeof metrics !== "object") {
    throw new GateDecisionRecordModelError(
      "GATE_DECISION_FIELD_REQUIRED",
      "gate_decision.metrics must be an object",
    );
  }
  return structuredClone(metrics);
}

function stableEqual(left: unknown, right: unknown) {
  return stableJsonHash(left) === stableJsonHash(right);
}

function defaultNextActionCodes(decision: GateDecision) {
  switch (decision) {
    case "MANUAL_REVIEW":
      return ["REVIEW_GATE_DECISION"];
    case "OVERRIDABLE_BLOCK":
      return ["RESOLVE_SCOPED_OVERRIDE"];
    case "HARD_BLOCK":
      return ["RESOLVE_HARD_BLOCK"];
    case "PASS":
    case "PASS_WITH_NOTICE":
      return [];
  }
}

function defaultOverrideability(decision: GateDecision): GateOverrideability {
  switch (decision) {
    case "OVERRIDABLE_BLOCK":
      return "SCOPED_OVERRIDE_REQUIRED";
    case "HARD_BLOCK":
      return "NON_OVERRIDEABLE";
    case "MANUAL_REVIEW":
    case "PASS":
    case "PASS_WITH_NOTICE":
      return "NONE";
  }
}

function defaultOverrideResolutionState(decision: GateDecision): GateOverrideResolutionState {
  return decision === "OVERRIDABLE_BLOCK" ? "NO_VALID_OVERRIDE" : "NOT_APPLICABLE";
}

function enforceStage(record: GateDecisionRecord) {
  const profile = getGateStageProfileByCode(record.gate_code);
  if (record.gate_stage_index !== profile.gate_stage_index) {
    throw new GateDecisionRecordModelError(
      "GATE_DECISION_STAGE_INVALID",
      `${record.gate_code} requires gate_stage_index ${profile.gate_stage_index}`,
    );
  }
  if (record.gate_code === "MANIFEST_GATE") {
    if (record.prerequisite_gate_refs.length !== 0) {
      throw new GateDecisionRecordModelError(
        "GATE_DECISION_STAGE_INVALID",
        "MANIFEST_GATE is the only gate that may have no prerequisites and must keep prerequisite_gate_refs empty",
      );
    }
    return;
  }
  if (record.prerequisite_gate_refs.length === 0) {
    throw new GateDecisionRecordModelError(
      "GATE_DECISION_STAGE_INVALID",
      `${record.gate_code} requires at least one prerequisite gate ref`,
    );
  }
}

function enforcePosture(record: GateDecisionRecord) {
  if (!record.reason_codes.includes(record.dominant_reason_code)) {
    throw new GateDecisionRecordModelError(
      "GATE_DECISION_POSTURE_INVALID",
      "dominant_reason_code must be included in reason_codes",
    );
  }
  if (record.dominant_reason_code !== record.reason_codes[0]) {
    throw new GateDecisionRecordModelError(
      "GATE_DECISION_POSTURE_INVALID",
      "dominant_reason_code must be the first ordered reason code",
    );
  }
  if (
    (record.decision === "PASS" || record.decision === "PASS_WITH_NOTICE") &&
    record.blocking_dependency_refs.length !== 0
  ) {
    throw new GateDecisionRecordModelError(
      "GATE_DECISION_POSTURE_INVALID",
      `${record.decision} must not carry blocking dependencies`,
    );
  }
  if (record.decision === "PASS" && record.next_action_codes.length !== 0) {
    throw new GateDecisionRecordModelError(
      "GATE_DECISION_POSTURE_INVALID",
      "PASS must not carry next actions",
    );
  }
  if (
    (record.decision === "MANUAL_REVIEW" ||
      record.decision === "OVERRIDABLE_BLOCK" ||
      record.decision === "HARD_BLOCK") &&
    record.next_action_codes.length === 0
  ) {
    throw new GateDecisionRecordModelError(
      "GATE_DECISION_POSTURE_INVALID",
      `${record.decision} requires at least one next action`,
    );
  }
  if (record.override_resolution_state === "NO_VALID_OVERRIDE") {
    if (
      record.decision !== "OVERRIDABLE_BLOCK" ||
      record.required_override_scope === null ||
      record.active_override_refs.length !== 0 ||
      (record.overrideability !== "SCOPED_OVERRIDE_ALLOWED" &&
        record.overrideability !== "SCOPED_OVERRIDE_REQUIRED")
    ) {
      throw new GateDecisionRecordModelError(
        "GATE_DECISION_POSTURE_INVALID",
        "NO_VALID_OVERRIDE is reserved exactly for OVERRIDABLE_BLOCK without active overrides",
      );
    }
  }
  if (record.override_resolution_state === "VALID_OVERRIDE_ACTIVE") {
    if (
      record.decision === "OVERRIDABLE_BLOCK" ||
      record.decision === "HARD_BLOCK" ||
      record.overrideability !== "NONE" ||
      record.required_override_scope !== null ||
      record.active_override_refs.length === 0
    ) {
      throw new GateDecisionRecordModelError(
        "GATE_DECISION_POSTURE_INVALID",
        "VALID_OVERRIDE_ACTIVE requires PASS, PASS_WITH_NOTICE, or MANUAL_REVIEW with active overrides",
      );
    }
  }
  if (
    (record.override_resolution_state === "NOT_APPLICABLE" ||
      record.override_resolution_state === "NO_VALID_OVERRIDE") &&
    record.active_override_refs.length !== 0
  ) {
    throw new GateDecisionRecordModelError(
      "GATE_DECISION_POSTURE_INVALID",
      `${record.override_resolution_state} must not carry active overrides`,
    );
  }
  if (
    (record.decision === "PASS" ||
      record.decision === "PASS_WITH_NOTICE" ||
      record.decision === "MANUAL_REVIEW") &&
    (record.overrideability !== "NONE" || record.required_override_scope !== null)
  ) {
    throw new GateDecisionRecordModelError(
      "GATE_DECISION_POSTURE_INVALID",
      `${record.decision} must be overrideability NONE with required_override_scope null`,
    );
  }
  if (
    record.decision === "OVERRIDABLE_BLOCK" &&
    (record.required_override_scope === null ||
      (record.overrideability !== "SCOPED_OVERRIDE_ALLOWED" &&
        record.overrideability !== "SCOPED_OVERRIDE_REQUIRED"))
  ) {
    throw new GateDecisionRecordModelError(
      "GATE_DECISION_POSTURE_INVALID",
      "OVERRIDABLE_BLOCK requires a scoped override posture",
    );
  }
  if (
    record.decision === "HARD_BLOCK" &&
    (record.overrideability !== "NON_OVERRIDEABLE" ||
      record.override_resolution_state !== "NOT_APPLICABLE" ||
      record.required_override_scope !== null)
  ) {
    throw new GateDecisionRecordModelError(
      "GATE_DECISION_POSTURE_INVALID",
      "HARD_BLOCK requires NON_OVERRIDEABLE and NOT_APPLICABLE override posture",
    );
  }
}

function enforceContracts(record: GateDecisionRecord) {
  const expectedSemantics = buildGateSemanticsContract({
    decision: record.decision,
    override_resolution_state: record.override_resolution_state,
  });
  if (record.severity !== severityForGateDecision(record.decision)) {
    throw new GateDecisionRecordModelError(
      "GATE_DECISION_SEMANTICS_INVALID",
      "severity must mirror the decision enum",
    );
  }
  if (!stableEqual(record.gate_semantics_contract, expectedSemantics)) {
    throw new GateDecisionRecordModelError(
      "GATE_DECISION_SEMANTICS_INVALID",
      "gate_semantics_contract must mirror decision severity, rank, progression, and override posture",
    );
  }
  if (!stableEqual(record.truth_boundary_contract, GATE_TRUTH_BOUNDARY_CONTRACT)) {
    throw new GateDecisionRecordModelError(
      "GATE_DECISION_BOUNDARY_INVALID",
      "truth_boundary_contract must be the command-side gate authority contract",
    );
  }
  const expectedExplainability = buildGateDecisionExplainability({
    active_override_refs: record.active_override_refs,
    blocking_dependency_refs: record.blocking_dependency_refs,
    decision: record.decision,
    next_action_codes: record.next_action_codes,
    override_resolution_state: record.override_resolution_state,
    plain_explanation: record.plain_explanation,
    reason_codes: record.reason_codes,
  });
  if (!stableEqual(record.decision_explainability_contract, expectedExplainability)) {
    throw new GateDecisionRecordModelError(
      "GATE_DECISION_EXPLAINABILITY_INVALID",
      [
        "decision_explainability_contract must mirror ordered reasons,",
        "dominant reason, compression, and action projection",
      ].join(" "),
    );
  }
  try {
    validatePersistedGateDecisionExplainabilityAlignment(record);
  } catch (error) {
    throw new GateDecisionRecordModelError(
      "GATE_DECISION_EXPLAINABILITY_INVALID",
      error instanceof Error
        ? error.message
        : "decision_explainability_contract failed persisted alignment validation",
    );
  }
}

export function deriveGateDecisionId(input: { gate_code: GateCode; manifest_id: string }) {
  return `gate.${requireString("gate_decision.manifest_id", input.manifest_id)}.${input.gate_code.toLowerCase()}`;
}

export function gateDecisionRef(record: Pick<GateDecisionRecord, "gate_decision_id">) {
  return `gate-decision://${record.gate_decision_id}`;
}

export function deriveGateDecisionContentHash(record: GateDecisionRecord) {
  return `gate-decision-content-hash://${stableJsonHash({
    artifact_family: "GATE_DECISION_RECORD_CONTENT",
    payload: record,
  })}`;
}

export function buildGateDecisionRecord(input: GateDecisionRecordBuildInput): GateDecisionRecord {
  const decision = input.decision ?? "PASS";
  const gateProfile = getGateStageProfileByCode(input.gate_code);
  const manifestId = requireString("gate_decision.manifest_id", input.manifest_id);
  const reasonCodes = orderGateReasonCodes(
    input.reason_codes ?? [defaultGateReasonForDecision(decision)],
    { maxItems: 8 },
  );
  const nextActionCodes = normalizeStringSetWithLimit(
    "gate_decision.next_action_codes",
    input.next_action_codes ?? defaultNextActionCodes(decision),
    { maxItems: 6 },
  );
  const overrideResolutionState =
    input.override_resolution_state ?? defaultOverrideResolutionState(decision);
  if (overrideResolutionState === "NO_VALID_OVERRIDE" && decision !== "OVERRIDABLE_BLOCK") {
    throw new GateDecisionRecordModelError(
      "GATE_DECISION_POSTURE_INVALID",
      "NO_VALID_OVERRIDE is reserved exactly for OVERRIDABLE_BLOCK",
    );
  }
  if (decision === "OVERRIDABLE_BLOCK" && overrideResolutionState !== "NO_VALID_OVERRIDE") {
    throw new GateDecisionRecordModelError(
      "GATE_DECISION_POSTURE_INVALID",
      "OVERRIDABLE_BLOCK requires NO_VALID_OVERRIDE",
    );
  }
  const plainExplanation =
    input.plain_explanation ??
    plainGateExplanation({
      decision,
      dominant_reason_code: input.dominant_reason_code ?? reasonCodes[0],
      gate_code: input.gate_code,
    });
  const record: GateDecisionRecord = {
    active_override_refs: normalizeStringSetWithLimit(
      "gate_decision.active_override_refs",
      input.active_override_refs,
      { maxItems: 8 },
    ),
    artifact_type: "GateDecisionRecord",
    blocking_dependency_refs: normalizeStringSetWithLimit(
      "gate_decision.blocking_dependency_refs",
      input.blocking_dependency_refs ??
        (decision === "MANUAL_REVIEW"
          ? [
              input.decision_basis_ref ??
                `decision-basis://${manifestId}/${input.gate_code.toLowerCase()}`,
            ]
          : []),
      { maxItems: 8 },
    ),
    decided_at: normalizeUtcInstantString(input.decided_at ?? "2026-04-28T00:00:00Z"),
    decision,
    decision_basis_ref: requireString(
      "gate_decision.decision_basis_ref",
      input.decision_basis_ref ?? `decision-basis://${manifestId}/${input.gate_code.toLowerCase()}`,
    ),
    decision_explainability_contract: buildGateDecisionExplainability({
      active_override_refs: normalizeStringSetWithLimit(
        "gate_decision.active_override_refs",
        input.active_override_refs,
        { maxItems: 8 },
      ),
      blocking_dependency_refs: normalizeStringSetWithLimit(
        "gate_decision.blocking_dependency_refs",
        input.blocking_dependency_refs ??
          (decision === "MANUAL_REVIEW"
            ? [
                input.decision_basis_ref ??
                  `decision-basis://${manifestId}/${input.gate_code.toLowerCase()}`,
              ]
            : []),
        { maxItems: 8 },
      ),
      decision,
      next_action_codes: nextActionCodes,
      override_resolution_state: overrideResolutionState,
      plain_explanation: plainExplanation,
      reason_codes: reasonCodes,
    }),
    dominant_reason_code: requireString(
      "gate_decision.dominant_reason_code",
      input.dominant_reason_code ?? reasonCodes[0],
    ),
    effective_scope: canonicalizeGateEffectiveScope(input.effective_scope),
    gate_class: "NON_ACCESS",
    gate_code: input.gate_code,
    gate_decision_id: requireString(
      "gate_decision.gate_decision_id",
      input.gate_decision_id ?? deriveGateDecisionId({ gate_code: input.gate_code, manifest_id: manifestId }),
    ),
    gate_semantics_contract: buildGateSemanticsContract({
      decision,
      override_resolution_state: overrideResolutionState,
    }),
    gate_stage_index: gateProfile.gate_stage_index,
    input_artifact_refs: normalizeStringSetWithLimit(
      "gate_decision.input_artifact_refs",
      input.input_artifact_refs ?? [`input-artifact://${manifestId}/${input.gate_code.toLowerCase()}`],
      { maxItems: 16, minItems: 1 },
    ),
    manifest_id: manifestId,
    metrics: normalizeMetrics(input.metrics),
    next_action_codes: nextActionCodes,
    override_resolution_state: overrideResolutionState,
    overrideability: input.overrideability ?? defaultOverrideability(decision),
    plain_explanation: requirePlainText("gate_decision.plain_explanation", plainExplanation),
    policy_version_ref: requireString(
      "gate_decision.policy_version_ref",
      input.policy_version_ref ?? `policy://${input.gate_code.toLowerCase()}/v1`,
    ),
    prerequisite_gate_refs: normalizeOrderedStringSet(
      "gate_decision.prerequisite_gate_refs",
      input.prerequisite_gate_refs,
      { maxItems: 9 },
    ),
    reason_codes: reasonCodes,
    required_override_scope:
      input.required_override_scope === undefined
        ? decision === "OVERRIDABLE_BLOCK"
          ? `${input.gate_code.toLowerCase()}.override_scope`
          : null
        : input.required_override_scope === null
          ? null
          : requireString("gate_decision.required_override_scope", input.required_override_scope),
    severity: severityForGateDecision(decision),
    truth_boundary_contract: structuredClone(GATE_TRUTH_BOUNDARY_CONTRACT),
  };
  return normalizeGateDecisionRecord(record);
}

export function normalizeGateDecisionRecord(input: GateDecisionRecord): GateDecisionRecord {
  if (input.artifact_type !== "GateDecisionRecord") {
    throw new GateDecisionRecordModelError(
      "GATE_DECISION_ARTIFACT_TYPE_INVALID",
      "artifact_type must be GateDecisionRecord",
    );
  }
  if (input.gate_class !== "NON_ACCESS") {
    throw new GateDecisionRecordModelError(
      "GATE_DECISION_POSTURE_INVALID",
      "gate_class must be NON_ACCESS",
    );
  }
  const normalized: GateDecisionRecord = {
    ...structuredClone(input),
    active_override_refs: normalizeStringSetWithLimit(
      "gate_decision.active_override_refs",
      input.active_override_refs,
      { maxItems: 8 },
    ),
    blocking_dependency_refs: normalizeStringSetWithLimit(
      "gate_decision.blocking_dependency_refs",
      input.blocking_dependency_refs,
      { maxItems: 8 },
    ),
    decided_at: normalizeUtcInstantString(input.decided_at),
    decision_basis_ref: requireString("gate_decision.decision_basis_ref", input.decision_basis_ref),
    dominant_reason_code: requireString(
      "gate_decision.dominant_reason_code",
      input.dominant_reason_code,
    ),
    effective_scope: canonicalizeGateEffectiveScope(input.effective_scope),
    gate_decision_id: requireString("gate_decision.gate_decision_id", input.gate_decision_id),
    input_artifact_refs: normalizeStringSetWithLimit(
      "gate_decision.input_artifact_refs",
      input.input_artifact_refs,
      { maxItems: 16, minItems: 1 },
    ),
    manifest_id: requireString("gate_decision.manifest_id", input.manifest_id),
    metrics: normalizeMetrics(input.metrics),
    next_action_codes: normalizeStringSetWithLimit(
      "gate_decision.next_action_codes",
      input.next_action_codes,
      { maxItems: 6 },
    ),
    plain_explanation: requirePlainText("gate_decision.plain_explanation", input.plain_explanation),
    policy_version_ref: requireString("gate_decision.policy_version_ref", input.policy_version_ref),
    prerequisite_gate_refs: normalizeOrderedStringSet(
      "gate_decision.prerequisite_gate_refs",
      input.prerequisite_gate_refs,
      { maxItems: 9 },
    ),
    reason_codes: normalizeOrderedStringSet("gate_decision.reason_codes", input.reason_codes, {
      maxItems: 8,
      minItems: 1,
    }),
    required_override_scope:
      input.required_override_scope === null
        ? null
        : requireString("gate_decision.required_override_scope", input.required_override_scope),
  };
  enforceStage(normalized);
  enforcePosture(normalized);
  enforceContracts(normalized);
  return normalized;
}

export function cloneGateDecisionRecord(record: GateDecisionRecord) {
  return structuredClone(record);
}
