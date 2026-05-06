import {
  normalizeStringSet,
  requireTrimmedString,
} from "../../../backend-access/src/services/principal_context_normalizer.ts";
import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";
import { DecisionBundleSchemaLineage } from "../../../generated-models/src/generated/typescript/decisioning-and-nightly.ts";
import type { SchemaBundleArtifactContract } from "../../../generated-models/src/generated/typescript/manifest-and-release.ts";
import { buildDecisionExplainabilityContract } from "../services/build_decision_explainability_contract.ts";
import {
  buildTerminalReasonSummary,
  type TerminalReasonSummaryInput,
} from "../services/build_terminal_reason_summary.ts";
import { validatePersistedDecisionBundleExplainabilityAlignment } from "../services/validate_persisted_decision_explainability_alignment.ts";
import type {
  CommandTruthBoundaryContract,
  DecisionExplainabilityContract,
} from "./gate_decision_record.ts";
import type { ExecutionModeBoundaryContract } from "./trust_summary.ts";

export type DecisionBundleExecutionMode = "COMPLIANCE" | "ANALYSIS";
export type DecisionBundleDecisionStatus = "COMPLETED" | "BLOCKED" | "REVIEW_REQUIRED";
export type DecisionBundleOutcomeClass =
  | "FINAL_SUCCESS"
  | "FINAL_BLOCKED"
  | "HUMAN_REVIEW"
  | "APPROVAL_PENDING"
  | "AUTHORITY_PENDING"
  | "AUTHORITY_UNKNOWN"
  | "LATE_DATA_PENDING"
  | "OUT_OF_BAND_REVIEW";
export type DecisionBundleWaitingOn = "NONE" | "HUMAN" | "APPROVAL" | "AUTHORITY" | "LATE_DATA";
export type DecisionBundleCheckpointState =
  | "NONE"
  | "SOURCE_COLLECTION"
  | "PROJECTION_PENDING"
  | "HUMAN_REVIEW"
  | "APPROVAL_PENDING"
  | "AUTHORITY_PREFLIGHT"
  | "TRANSMIT_PENDING"
  | "PENDING_ACK"
  | "RECONCILIATION_PENDING"
  | "LATE_DATA_PENDING"
  | "CONFIRMED"
  | "REJECTED"
  | "UNKNOWN"
  | "OUT_OF_BAND";
export type DecisionBundleTruthState =
  | "LOCAL_INTENT_ONLY"
  | "PERSISTED_INTERNAL"
  | "AUTHORITY_PENDING"
  | "AUTHORITY_CONFIRMED"
  | "AUTHORITY_REJECTED"
  | "AUTHORITY_UNKNOWN"
  | "AUTHORITY_OUT_OF_BAND";
export type DecisionBundleActionabilityState = "ACTION_AVAILABLE" | "NO_SAFE_ACTION";
export type DecisionBundleDetailSurfaceCode =
  | "EVIDENCE_TIDE"
  | "PACKET_FORGE"
  | "AUTHORITY_TUNNEL"
  | "DRIFT_FIELD"
  | "FOCUS_LENS"
  | "TWIN_PANEL";
export type DecisionBundleAuthorityPosture =
  | "CONFIRMED"
  | "REJECTED"
  | "UNKNOWN"
  | "OUT_OF_BAND"
  | "PENDING"
  | "AUTHORITY_CONFIRMED"
  | "AUTHORITY_REJECTED"
  | "AUTHORITY_UNKNOWN"
  | "AUTHORITY_OUT_OF_BAND"
  | "AUTHORITY_PENDING";

export type { DecisionExplainabilityContract, ExecutionModeBoundaryContract };

export type DecisionBundleRecord = {
  actionability_state: DecisionBundleActionabilityState;
  active_detail_surface_code: DecisionBundleDetailSurfaceCode | null;
  amendment_case_id?: string | null;
  analysis_only: boolean;
  artifact_type: "DecisionBundle";
  blocked_action_codes: string[];
  checkpoint_state: DecisionBundleCheckpointState;
  compute_id?: string | null;
  contract: SchemaBundleArtifactContract;
  counterfactual_basis: string | null;
  decision_bundle_id: string;
  decision_explainability_contract: DecisionExplainabilityContract;
  decision_reason_codes: string[];
  decision_status: DecisionBundleDecisionStatus;
  dominant_reason_code: string;
  execution_mode: DecisionBundleExecutionMode;
  execution_mode_boundary_contract: ExecutionModeBoundaryContract;
  filing_case_id?: string | null;
  filing_packet_id?: string | null;
  focus_anchor_ref: string | null;
  forecast_id?: string | null;
  graph_id?: string | null;
  manifest_id: string;
  next_action_codes: string[];
  next_checkpoint_at: string | null;
  no_safe_action_reason_code: string | null;
  non_compliance_config_refs: string[];
  outcome_class: DecisionBundleOutcomeClass;
  parity_id?: string | null;
  persisted_at: string;
  plain_reason: string;
  primary_action_code: string | null;
  primary_proof_bundle_ref: string | null;
  reason_codes: string[];
  replay_attestation_ref?: string | null;
  risk_id?: string | null;
  snapshot_id?: string | null;
  submission_record_id?: string | null;
  suggested_detail_surface_code: DecisionBundleDetailSurfaceCode | null;
  trust_id?: string | null;
  truth_boundary_contract: CommandTruthBoundaryContract;
  truth_state: DecisionBundleTruthState;
  twin_id?: string | null;
  waiting_on: DecisionBundleWaitingOn;
  workflow_item_refs: string[];
};

export type DecisionBundleWorkflowItemRefInput =
  | string
  | {
      ref: string;
      state?: "OPEN" | "PENDING" | "ACTIVE" | "RESOLVED" | "CLOSED" | "CANCELLED";
    };

export type DecisionBundleBuildInput = Partial<
  Omit<
    DecisionBundleRecord,
    | "artifact_type"
    | "contract"
    | "decision_explainability_contract"
    | "decision_reason_codes"
    | "dominant_reason_code"
    | "plain_reason"
    | "reason_codes"
    | "truth_boundary_contract"
  >
> &
  TerminalReasonSummaryInput & {
    authority_posture?: DecisionBundleAuthorityPosture | null;
    schema_bundle_hash?: string;
    workflow_item_refs?: readonly DecisionBundleWorkflowItemRefInput[];
    writer_build_id?: string;
  };

export const DECISION_BUNDLE_TRUTH_BOUNDARY_CONTRACT: CommandTruthBoundaryContract = {
  artifact_role: "READ_SIDE_PROJECTION",
  authoritative_record_families: [
    "RUN_MANIFEST",
    "GATE_DECISION_RECORD",
    "WORKFLOW_ITEM",
    "AUTHORITY_INTERACTION_RECORD",
    "AUDIT_EVENT",
  ],
  authoritative_source_policy: "MIRROR_DURABLE_COMMAND_RECORDS_ONLY",
  contract_version: "COMMAND_TRUTH_BOUNDARY_V1",
  durable_writeback_policy: "NO_DURABLE_STATE_WRITEBACK",
  observable_projection_families: [],
  projection_input_policy: "NO_PROJECTION_INPUTS",
  recovery_basis_policy: "REBUILD_FROM_DURABLE_RECORDS_ONLY",
};

export class DecisionBundleModelError extends Error {
  readonly code:
    | "DECISION_BUNDLE_ACTIONABILITY_INVALID"
    | "DECISION_BUNDLE_BOUNDARY_INVALID"
    | "DECISION_BUNDLE_CONTRACT_INVALID"
    | "DECISION_BUNDLE_EXPLAINABILITY_INVALID"
    | "DECISION_BUNDLE_FIELD_REQUIRED"
    | "DECISION_BUNDLE_OUTCOME_INVALID"
    | "DECISION_BUNDLE_REASON_INVALID"
    | "DECISION_BUNDLE_REF_INVALID";

  constructor(code: DecisionBundleModelError["code"], detail: string) {
    super(`${code}: ${detail}`);
    this.name = "DecisionBundleModelError";
    this.code = code;
  }
}

function requireString(label: string, value: unknown) {
  try {
    return requireTrimmedString(label, value);
  } catch (error) {
    throw new DecisionBundleModelError(
      "DECISION_BUNDLE_FIELD_REQUIRED",
      error instanceof Error ? error.message : `${label} must be a non-empty string`,
    );
  }
}

function normalizeNullableString(label: string, value: unknown): string | null {
  if (value == null) {
    return null;
  }
  return requireString(label, value);
}

function normalizeOrderedStringSet(
  label: string,
  values: readonly string[] | undefined,
  options: { maxItems?: number; minItems?: number } = {},
) {
  const seen = new Set<string>();
  const normalized = (values ?? []).map((value) => requireString(label, value)).filter((value) => {
    if (seen.has(value)) {
      throw new DecisionBundleModelError(
        "DECISION_BUNDLE_FIELD_REQUIRED",
        `${label} must not contain duplicates`,
      );
    }
    seen.add(value);
    return true;
  });
  if (normalized.length < (options.minItems ?? 0)) {
    throw new DecisionBundleModelError(
      "DECISION_BUNDLE_FIELD_REQUIRED",
      `${label} must contain at least ${options.minItems} item(s)`,
    );
  }
  if (options.maxItems !== undefined && normalized.length > options.maxItems) {
    throw new DecisionBundleModelError(
      "DECISION_BUNDLE_FIELD_REQUIRED",
      `${label} must contain at most ${options.maxItems} item(s)`,
    );
  }
  return normalized;
}

function normalizeStringSetWithLimit(
  label: string,
  values: readonly string[] | undefined,
  options: { maxItems?: number; minItems?: number } = {},
) {
  const normalized = normalizeStringSet(label, values ?? [], {
    minItems: options.minItems,
  });
  if (options.maxItems !== undefined && normalized.length > options.maxItems) {
    throw new DecisionBundleModelError(
      "DECISION_BUNDLE_FIELD_REQUIRED",
      `${label} must contain at most ${options.maxItems} item(s)`,
    );
  }
  return normalized;
}

function stableEqual(left: unknown, right: unknown) {
  return stableJsonHash(left) === stableJsonHash(right);
}

function decisionStatusForOutcome(outcomeClass: DecisionBundleOutcomeClass): DecisionBundleDecisionStatus {
  switch (outcomeClass) {
    case "FINAL_SUCCESS":
      return "COMPLETED";
    case "FINAL_BLOCKED":
      return "BLOCKED";
    case "HUMAN_REVIEW":
    case "APPROVAL_PENDING":
    case "AUTHORITY_PENDING":
    case "AUTHORITY_UNKNOWN":
    case "LATE_DATA_PENDING":
    case "OUT_OF_BAND_REVIEW":
      return "REVIEW_REQUIRED";
  }
}

function defaultOutcomeForDecisionStatus(status: DecisionBundleDecisionStatus): DecisionBundleOutcomeClass {
  switch (status) {
    case "COMPLETED":
      return "FINAL_SUCCESS";
    case "BLOCKED":
      return "FINAL_BLOCKED";
    case "REVIEW_REQUIRED":
      return "HUMAN_REVIEW";
  }
}

function defaultBridgeForOutcome(outcomeClass: DecisionBundleOutcomeClass): {
  checkpoint_state: DecisionBundleCheckpointState;
  truth_state: DecisionBundleTruthState;
  waiting_on: DecisionBundleWaitingOn;
} {
  switch (outcomeClass) {
    case "FINAL_SUCCESS":
      return { checkpoint_state: "NONE", truth_state: "PERSISTED_INTERNAL", waiting_on: "NONE" };
    case "FINAL_BLOCKED":
      return { checkpoint_state: "NONE", truth_state: "PERSISTED_INTERNAL", waiting_on: "NONE" };
    case "HUMAN_REVIEW":
      return { checkpoint_state: "HUMAN_REVIEW", truth_state: "PERSISTED_INTERNAL", waiting_on: "HUMAN" };
    case "APPROVAL_PENDING":
      return { checkpoint_state: "APPROVAL_PENDING", truth_state: "PERSISTED_INTERNAL", waiting_on: "APPROVAL" };
    case "AUTHORITY_PENDING":
      return { checkpoint_state: "PENDING_ACK", truth_state: "AUTHORITY_PENDING", waiting_on: "AUTHORITY" };
    case "AUTHORITY_UNKNOWN":
      return { checkpoint_state: "UNKNOWN", truth_state: "AUTHORITY_UNKNOWN", waiting_on: "AUTHORITY" };
    case "LATE_DATA_PENDING":
      return { checkpoint_state: "LATE_DATA_PENDING", truth_state: "PERSISTED_INTERNAL", waiting_on: "LATE_DATA" };
    case "OUT_OF_BAND_REVIEW":
      return { checkpoint_state: "OUT_OF_BAND", truth_state: "AUTHORITY_OUT_OF_BAND", waiting_on: "AUTHORITY" };
  }
}

function normalizeAuthorityPosture(
  posture: DecisionBundleAuthorityPosture | DecisionBundleTruthState | DecisionBundleCheckpointState | null | undefined,
) {
  if (posture == null) {
    return null;
  }
  switch (posture) {
    case "CONFIRMED":
    case "AUTHORITY_CONFIRMED":
      return "CONFIRMED" as const;
    case "REJECTED":
    case "AUTHORITY_REJECTED":
      return "REJECTED" as const;
    case "UNKNOWN":
    case "AUTHORITY_UNKNOWN":
      return "UNKNOWN" as const;
    case "OUT_OF_BAND":
    case "AUTHORITY_OUT_OF_BAND":
      return "OUT_OF_BAND" as const;
    case "PENDING":
    case "AUTHORITY_PENDING":
    case "PENDING_ACK":
    case "TRANSMIT_PENDING":
    case "RECONCILIATION_PENDING":
      return "PENDING" as const;
    default:
      return null;
  }
}

function bridgeForAuthorityPosture(
  posture: Exclude<ReturnType<typeof normalizeAuthorityPosture>, null>,
): {
  checkpoint_state: DecisionBundleCheckpointState;
  decision_status: DecisionBundleDecisionStatus;
  outcome_class: DecisionBundleOutcomeClass;
  truth_state: DecisionBundleTruthState;
  waiting_on: DecisionBundleWaitingOn;
} {
  switch (posture) {
    case "CONFIRMED":
      return {
        checkpoint_state: "CONFIRMED",
        decision_status: "COMPLETED",
        outcome_class: "FINAL_SUCCESS",
        truth_state: "AUTHORITY_CONFIRMED",
        waiting_on: "NONE",
      };
    case "REJECTED":
      return {
        checkpoint_state: "REJECTED",
        decision_status: "BLOCKED",
        outcome_class: "FINAL_BLOCKED",
        truth_state: "AUTHORITY_REJECTED",
        waiting_on: "NONE",
      };
    case "UNKNOWN":
      return {
        checkpoint_state: "UNKNOWN",
        decision_status: "REVIEW_REQUIRED",
        outcome_class: "AUTHORITY_UNKNOWN",
        truth_state: "AUTHORITY_UNKNOWN",
        waiting_on: "AUTHORITY",
      };
    case "OUT_OF_BAND":
      return {
        checkpoint_state: "OUT_OF_BAND",
        decision_status: "REVIEW_REQUIRED",
        outcome_class: "OUT_OF_BAND_REVIEW",
        truth_state: "AUTHORITY_OUT_OF_BAND",
        waiting_on: "AUTHORITY",
      };
    case "PENDING":
      return {
        checkpoint_state: "PENDING_ACK",
        decision_status: "REVIEW_REQUIRED",
        outcome_class: "AUTHORITY_PENDING",
        truth_state: "AUTHORITY_PENDING",
        waiting_on: "AUTHORITY",
      };
  }
}

function defaultSuggestedDetailSurface(outcomeClass: DecisionBundleOutcomeClass) {
  switch (outcomeClass) {
    case "AUTHORITY_PENDING":
    case "AUTHORITY_UNKNOWN":
    case "OUT_OF_BAND_REVIEW":
      return "AUTHORITY_TUNNEL" as const;
    case "HUMAN_REVIEW":
      return "EVIDENCE_TIDE" as const;
    case "APPROVAL_PENDING":
      return "PACKET_FORGE" as const;
    case "LATE_DATA_PENDING":
      return "DRIFT_FIELD" as const;
    case "FINAL_BLOCKED":
    case "FINAL_SUCCESS":
      return "FOCUS_LENS" as const;
  }
}

function defaultNoSafeReason(outcomeClass: DecisionBundleOutcomeClass) {
  switch (outcomeClass) {
    case "FINAL_SUCCESS":
      return "TERMINAL_COMPLETE_NO_ACTION";
    case "FINAL_BLOCKED":
      return "TERMINAL_BLOCKED_NO_SAFE_ACTION";
    default:
      return "TERMINAL_REVIEW_NO_SAFE_ACTION";
  }
}

export function filterOpenWorkflowItemRefs(
  refs: readonly DecisionBundleWorkflowItemRefInput[] | undefined,
) {
  return normalizeStringSetWithLimit(
    "decision_bundle.workflow_item_refs",
    (refs ?? [])
      .filter((entry) => {
        if (typeof entry === "string") {
          return true;
        }
        return !["RESOLVED", "CLOSED", "CANCELLED"].includes(entry.state ?? "OPEN");
      })
      .map((entry) => (typeof entry === "string" ? entry : entry.ref)),
  );
}

export function decisionBundleRef(record: Pick<DecisionBundleRecord, "decision_bundle_id">) {
  return `decision-bundle://${record.decision_bundle_id}`;
}

export function deriveDecisionBundleContentHash(record: Omit<DecisionBundleRecord, "contract">) {
  return `decision-bundle-content-hash://${stableJsonHash({
    artifact_family: "DECISION_BUNDLE_CONTENT",
    payload: record,
  })}`;
}

export function buildDecisionBundleContract(input: {
  decision_bundle_content_hash: string;
  decision_bundle_id: string;
  schema_bundle_hash?: string;
  writer_build_id?: string;
}): SchemaBundleArtifactContract {
  return {
    allowed_upgrade_kinds: ["PATCH_BACKWARD"],
    artifact_content_hash: requireString(
      "decision_bundle.contract.artifact_content_hash",
      input.decision_bundle_content_hash,
    ),
    artifact_id: decisionBundleRef({ decision_bundle_id: input.decision_bundle_id }),
    artifact_type: "DecisionBundle",
    compatibility_class: "STRICT_APPEND_ONLY",
    content_hash: DecisionBundleSchemaLineage.sourceHash,
    dialect_ref: "json-schema-draft-2020-12",
    schema_bundle_hash: requireString(
      "decision_bundle.contract.schema_bundle_hash",
      input.schema_bundle_hash ?? "schema.bundle.hash.compute.default",
    ),
    schema_id: DecisionBundleSchemaLineage.schemaId,
    semantic_version: "1.0.0",
    supersedes_schema_id: null,
    writer_build_id: requireString(
      "decision_bundle.contract.writer_build_id",
      input.writer_build_id ?? "build.taxat.compute.0127",
    ),
    writer_min_reader_version: "1.0.0",
  };
}

export function buildDecisionBundleExecutionModeBoundaryContract(input: {
  analysis_only?: boolean;
  counterfactual_basis?: string | null;
  execution_mode: DecisionBundleExecutionMode;
  non_compliance_config_refs?: readonly string[];
  replay_class_or_null?: ExecutionModeBoundaryContract["replay_class_or_null"];
  run_kind?: ExecutionModeBoundaryContract["run_kind"];
}): ExecutionModeBoundaryContract {
  const executionMode = input.execution_mode;
  const analysisOnly = input.analysis_only ?? executionMode === "ANALYSIS";
  const runKind = input.run_kind ?? "INTERACTIVE";
  const replayClass =
    runKind === "REPLAY" ? input.replay_class_or_null ?? "STANDARD_REPLAY" : null;
  const executionPosture =
    runKind === "REPLAY"
      ? replayClass === "COUNTERFACTUAL_ANALYSIS"
        ? "REPLAY_COUNTERFACTUAL"
        : "REPLAY_COMPLIANCE"
      : executionMode === "COMPLIANCE"
        ? "LIVE_COMPLIANCE"
        : "LIVE_ANALYSIS";
  const legalEffectBoundary =
    executionPosture === "LIVE_COMPLIANCE"
      ? "COMPLIANCE_CAPABLE"
      : executionPosture === "LIVE_ANALYSIS"
        ? "MODELED_READ_ONLY"
        : executionPosture === "REPLAY_COUNTERFACTUAL"
          ? "COUNTERFACTUAL_REPLAY_READ_ONLY"
          : "HISTORICAL_REPLAY_READ_ONLY";
  const disclosureReasonCodes =
    legalEffectBoundary === "COMPLIANCE_CAPABLE"
      ? []
      : legalEffectBoundary === "MODELED_READ_ONLY"
        ? ["ANALYSIS_ONLY_POSTURE"]
        : legalEffectBoundary === "COUNTERFACTUAL_REPLAY_READ_ONLY"
          ? ["COUNTERFACTUAL_REPLAY_POSTURE"]
          : ["REPLAY_NON_LIVE_POSTURE"];
  const payload = {
    analysis_only: analysisOnly,
    contract_version: "EXECUTION_MODE_BOUNDARY_V1" as const,
    counterfactual_basis:
      executionMode === "ANALYSIS"
        ? normalizeNullableString(
            "decision_bundle.counterfactual_basis",
            input.counterfactual_basis ?? "analysis-boundary://decision-bundle",
          )
        : null,
    disclosure_reason_codes: disclosureReasonCodes,
    execution_mode: executionMode,
    execution_posture: executionPosture,
    legal_effect_boundary: legalEffectBoundary,
    non_compliance_config_refs:
      executionMode === "COMPLIANCE"
        ? []
        : normalizeStringSetWithLimit(
            "decision_bundle.non_compliance_config_refs",
            input.non_compliance_config_refs ?? ["analysis-config://decision-bundle"],
          ),
    replay_class_or_null: replayClass,
    run_kind: runKind,
  };
  return {
    ...payload,
    boundary_hash: stableJsonHash(payload),
  };
}

function enforceReasonBridge(record: DecisionBundleRecord) {
  if (record.reason_codes.length < 1 || record.reason_codes.length > 8) {
    throw new DecisionBundleModelError(
      "DECISION_BUNDLE_REASON_INVALID",
      "reason_codes must contain between 1 and 8 ordered codes",
    );
  }
  const compressed = record.reason_codes.slice(0, 3);
  if (!stableEqual(record.decision_reason_codes, compressed)) {
    throw new DecisionBundleModelError(
      "DECISION_BUNDLE_REASON_INVALID",
      "decision_reason_codes must exactly mirror the first three reason_codes",
    );
  }
  if (record.dominant_reason_code !== record.reason_codes[0]) {
    throw new DecisionBundleModelError(
      "DECISION_BUNDLE_REASON_INVALID",
      "dominant_reason_code must be the first ordered reason code",
    );
  }
}

function enforceActionability(record: DecisionBundleRecord) {
  const blocked = new Set(record.blocked_action_codes);
  for (const next of record.next_action_codes) {
    if (blocked.has(next)) {
      throw new DecisionBundleModelError(
        "DECISION_BUNDLE_ACTIONABILITY_INVALID",
        "next_action_codes and blocked_action_codes must be disjoint",
      );
    }
  }
  if (record.actionability_state === "ACTION_AVAILABLE") {
    if (
      record.primary_action_code === null ||
      record.next_action_codes.length === 0 ||
      !record.next_action_codes.includes(record.primary_action_code) ||
      blocked.has(record.primary_action_code) ||
      record.no_safe_action_reason_code !== null ||
      record.suggested_detail_surface_code !== null
    ) {
      throw new DecisionBundleModelError(
        "DECISION_BUNDLE_ACTIONABILITY_INVALID",
        "ACTION_AVAILABLE requires a primary action included in next actions and absent from blocked actions",
      );
    }
    return;
  }
  if (
    record.next_action_codes.length !== 0 ||
    record.primary_action_code !== null ||
    record.no_safe_action_reason_code === null ||
    record.suggested_detail_surface_code === null
  ) {
    throw new DecisionBundleModelError(
      "DECISION_BUNDLE_ACTIONABILITY_INVALID",
      "NO_SAFE_ACTION requires an explicit reason, suggested detail surface, and no next action",
    );
  }
}

function enforceOutcomeBridge(record: DecisionBundleRecord) {
  const expectedStatus = decisionStatusForOutcome(record.outcome_class);
  if (record.decision_status !== expectedStatus) {
    throw new DecisionBundleModelError(
      "DECISION_BUNDLE_OUTCOME_INVALID",
      "decision_status must mirror outcome_class",
    );
  }
  if (record.checkpoint_state === "CONFIRMED" || record.truth_state === "AUTHORITY_CONFIRMED") {
    if (
      record.decision_status !== "COMPLETED" ||
      record.outcome_class !== "FINAL_SUCCESS" ||
      record.waiting_on !== "NONE" ||
      record.checkpoint_state !== "CONFIRMED" ||
      record.truth_state !== "AUTHORITY_CONFIRMED" ||
      record.submission_record_id == null
    ) {
      throw new DecisionBundleModelError(
        "DECISION_BUNDLE_OUTCOME_INVALID",
        "authority confirmed posture must resolve to completed final success with submission_record_id",
      );
    }
    return;
  }
  if (record.checkpoint_state === "REJECTED" || record.truth_state === "AUTHORITY_REJECTED") {
    if (
      record.decision_status !== "BLOCKED" ||
      record.outcome_class !== "FINAL_BLOCKED" ||
      record.waiting_on !== "NONE" ||
      record.checkpoint_state !== "REJECTED" ||
      record.truth_state !== "AUTHORITY_REJECTED" ||
      record.submission_record_id == null
    ) {
      throw new DecisionBundleModelError(
        "DECISION_BUNDLE_OUTCOME_INVALID",
        "authority rejected posture must resolve to blocked final outcome with submission_record_id",
      );
    }
    return;
  }
  const expectedBridge = defaultBridgeForOutcome(record.outcome_class);
  if (record.outcome_class === "AUTHORITY_PENDING") {
    if (
      record.waiting_on !== "AUTHORITY" ||
      !["TRANSMIT_PENDING", "PENDING_ACK", "RECONCILIATION_PENDING"].includes(
        record.checkpoint_state,
      ) ||
      record.truth_state !== "AUTHORITY_PENDING"
    ) {
      throw new DecisionBundleModelError(
        "DECISION_BUNDLE_OUTCOME_INVALID",
        "AUTHORITY_PENDING must keep authority waiting, checkpoint, and truth posture",
      );
    }
  } else if (
    record.waiting_on !== expectedBridge.waiting_on ||
    record.checkpoint_state !== expectedBridge.checkpoint_state ||
    record.truth_state !== expectedBridge.truth_state
  ) {
    throw new DecisionBundleModelError(
      "DECISION_BUNDLE_OUTCOME_INVALID",
      "waiting_on, checkpoint_state, and truth_state must mirror outcome_class",
    );
  }
  if (record.waiting_on === "NONE" && record.next_checkpoint_at !== null) {
    throw new DecisionBundleModelError(
      "DECISION_BUNDLE_OUTCOME_INVALID",
      "waiting_on NONE requires next_checkpoint_at null",
    );
  }
  if (
    ["APPROVAL_PENDING", "AUTHORITY_PENDING", "AUTHORITY_UNKNOWN", "LATE_DATA_PENDING"].includes(
      record.outcome_class,
    ) &&
    record.next_checkpoint_at === null
  ) {
    throw new DecisionBundleModelError(
      "DECISION_BUNDLE_OUTCOME_INVALID",
      `${record.outcome_class} requires next_checkpoint_at`,
    );
  }
  if (
    ["HUMAN_REVIEW", "APPROVAL_PENDING", "AUTHORITY_PENDING", "AUTHORITY_UNKNOWN", "LATE_DATA_PENDING", "OUT_OF_BAND_REVIEW"].includes(
      record.outcome_class,
    ) &&
    record.workflow_item_refs.length === 0
  ) {
    throw new DecisionBundleModelError(
      "DECISION_BUNDLE_OUTCOME_INVALID",
      `${record.outcome_class} requires at least one open workflow item ref`,
    );
  }
  if (
    ["AUTHORITY_PENDING", "AUTHORITY_UNKNOWN"].includes(record.outcome_class) &&
    record.submission_record_id == null
  ) {
    throw new DecisionBundleModelError(
      "DECISION_BUNDLE_OUTCOME_INVALID",
      `${record.outcome_class} requires submission_record_id`,
    );
  }
  if (
    ["CONFIRMED", "REJECTED", "UNKNOWN", "OUT_OF_BAND"].includes(record.checkpoint_state) &&
    record.submission_record_id == null
  ) {
    throw new DecisionBundleModelError(
      "DECISION_BUNDLE_OUTCOME_INVALID",
      `${record.checkpoint_state} requires submission_record_id`,
    );
  }
}

function enforceReferenceImplications(record: DecisionBundleRecord) {
  if (record.primary_proof_bundle_ref !== null && record.graph_id == null) {
    throw new DecisionBundleModelError(
      "DECISION_BUNDLE_REF_INVALID",
      "primary_proof_bundle_ref requires graph_id",
    );
  }
  if (record.twin_id != null && (record.graph_id == null || record.parity_id == null)) {
    throw new DecisionBundleModelError(
      "DECISION_BUNDLE_REF_INVALID",
      "twin_id requires graph_id and parity_id",
    );
  }
  if (record.focus_anchor_ref !== null && record.active_detail_surface_code === null) {
    throw new DecisionBundleModelError(
      "DECISION_BUNDLE_REF_INVALID",
      "focus_anchor_ref requires active_detail_surface_code",
    );
  }
}

function enforceExecutionBoundary(record: DecisionBundleRecord) {
  const boundary = record.execution_mode_boundary_contract;
  if (
    boundary.execution_mode !== record.execution_mode ||
    boundary.analysis_only !== record.analysis_only ||
    !stableEqual(boundary.non_compliance_config_refs, record.non_compliance_config_refs) ||
    boundary.counterfactual_basis !== record.counterfactual_basis
  ) {
    throw new DecisionBundleModelError(
      "DECISION_BUNDLE_BOUNDARY_INVALID",
      "execution_mode_boundary_contract must mirror top-level execution fields",
    );
  }
  if (record.execution_mode === "COMPLIANCE") {
    if (
      record.analysis_only ||
      record.counterfactual_basis !== null ||
      record.non_compliance_config_refs.length !== 0
    ) {
      throw new DecisionBundleModelError(
        "DECISION_BUNDLE_BOUNDARY_INVALID",
        "COMPLIANCE bundles must not carry analysis-only execution fields",
      );
    }
  } else {
    if (
      !record.analysis_only ||
      record.counterfactual_basis === null ||
      record.filing_packet_id != null ||
      record.submission_record_id != null ||
      record.primary_proof_bundle_ref !== null ||
      record.waiting_on === "AUTHORITY" ||
      ["AUTHORITY_PENDING", "AUTHORITY_UNKNOWN", "OUT_OF_BAND_REVIEW"].includes(
        record.outcome_class,
      )
    ) {
      throw new DecisionBundleModelError(
        "DECISION_BUNDLE_BOUNDARY_INVALID",
        "ANALYSIS bundles must remain read-only and non-authority",
      );
    }
  }
  if (boundary.legal_effect_boundary !== "COMPLIANCE_CAPABLE") {
    if (
      record.waiting_on === "AUTHORITY" ||
      ["APPROVAL_PENDING", "AUTHORITY_PENDING", "AUTHORITY_UNKNOWN"].includes(
        record.outcome_class,
      ) ||
      ["AUTHORITY_PENDING", "AUTHORITY_CONFIRMED", "AUTHORITY_REJECTED", "AUTHORITY_UNKNOWN", "AUTHORITY_OUT_OF_BAND"].includes(
        record.truth_state,
      ) ||
      record.submission_record_id != null ||
      record.filing_packet_id != null ||
      !record.reason_codes.includes("NON_LIVE_EXECUTION_BOUNDARY")
    ) {
      throw new DecisionBundleModelError(
        "DECISION_BUNDLE_BOUNDARY_INVALID",
        "non-live execution bundles must disclose NON_LIVE_EXECUTION_BOUNDARY and clear live authority refs",
      );
    }
  }
}

function enforceContracts(record: DecisionBundleRecord) {
  if (!stableEqual(record.truth_boundary_contract, DECISION_BUNDLE_TRUTH_BOUNDARY_CONTRACT)) {
    throw new DecisionBundleModelError(
      "DECISION_BUNDLE_BOUNDARY_INVALID",
      "truth_boundary_contract must be the DecisionBundle read-side projection contract",
    );
  }
  const expectedExplainability = buildDecisionExplainabilityContract({
    actionability_state: record.actionability_state,
    blocked_action_codes: record.blocked_action_codes,
    checkpoint_state: record.checkpoint_state,
    dominant_reason_code: record.dominant_reason_code,
    outcome_class: record.outcome_class,
    plain_reason: record.plain_reason,
    reason_codes: record.reason_codes,
    truth_state: record.truth_state,
    waiting_on: record.waiting_on,
  });
  if (!stableEqual(record.decision_explainability_contract, expectedExplainability)) {
    throw new DecisionBundleModelError(
      "DECISION_BUNDLE_EXPLAINABILITY_INVALID",
      "decision_explainability_contract must mirror ordered reasons, compression, and actionability",
    );
  }
  try {
    validatePersistedDecisionBundleExplainabilityAlignment(record);
  } catch (error) {
    throw new DecisionBundleModelError(
      "DECISION_BUNDLE_EXPLAINABILITY_INVALID",
      error instanceof Error
        ? error.message
        : "decision_explainability_contract failed persisted alignment validation",
    );
  }
  if (
    record.contract.artifact_id !== decisionBundleRef(record) ||
    record.contract.artifact_type !== "DecisionBundle" ||
    record.contract.schema_id !== DecisionBundleSchemaLineage.schemaId
  ) {
    throw new DecisionBundleModelError(
      "DECISION_BUNDLE_CONTRACT_INVALID",
      "contract must bind the DecisionBundle artifact",
    );
  }
}

export function normalizeDecisionBundleRecord(input: DecisionBundleRecord): DecisionBundleRecord {
  const normalized: DecisionBundleRecord = {
    ...structuredClone(input),
    actionability_state: input.actionability_state,
    active_detail_surface_code: input.active_detail_surface_code ?? null,
    amendment_case_id: normalizeNullableString(
      "decision_bundle.amendment_case_id",
      input.amendment_case_id,
    ),
    analysis_only: input.analysis_only,
    artifact_type: "DecisionBundle",
    blocked_action_codes: normalizeStringSetWithLimit(
      "decision_bundle.blocked_action_codes",
      input.blocked_action_codes,
      { maxItems: 8 },
    ),
    checkpoint_state: input.checkpoint_state,
    compute_id: normalizeNullableString("decision_bundle.compute_id", input.compute_id),
    counterfactual_basis: normalizeNullableString(
      "decision_bundle.counterfactual_basis",
      input.counterfactual_basis,
    ),
    decision_bundle_id: requireString(
      "decision_bundle.decision_bundle_id",
      input.decision_bundle_id,
    ),
    decision_reason_codes: normalizeOrderedStringSet(
      "decision_bundle.decision_reason_codes",
      input.decision_reason_codes,
      { maxItems: 3, minItems: 1 },
    ),
    decision_status: input.decision_status,
    dominant_reason_code: requireString(
      "decision_bundle.dominant_reason_code",
      input.dominant_reason_code,
    ),
    execution_mode: input.execution_mode,
    filing_case_id: normalizeNullableString(
      "decision_bundle.filing_case_id",
      input.filing_case_id,
    ),
    filing_packet_id: normalizeNullableString(
      "decision_bundle.filing_packet_id",
      input.filing_packet_id,
    ),
    focus_anchor_ref: normalizeNullableString(
      "decision_bundle.focus_anchor_ref",
      input.focus_anchor_ref,
    ),
    forecast_id: normalizeNullableString("decision_bundle.forecast_id", input.forecast_id),
    graph_id: normalizeNullableString("decision_bundle.graph_id", input.graph_id),
    manifest_id: requireString("decision_bundle.manifest_id", input.manifest_id),
    next_action_codes: normalizeStringSetWithLimit(
      "decision_bundle.next_action_codes",
      input.next_action_codes,
      { maxItems: 3 },
    ),
    next_checkpoint_at:
      input.next_checkpoint_at == null
        ? null
        : normalizeUtcInstantString(input.next_checkpoint_at),
    no_safe_action_reason_code: normalizeNullableString(
      "decision_bundle.no_safe_action_reason_code",
      input.no_safe_action_reason_code,
    ),
    non_compliance_config_refs: normalizeStringSetWithLimit(
      "decision_bundle.non_compliance_config_refs",
      input.non_compliance_config_refs,
    ),
    outcome_class: input.outcome_class,
    parity_id: normalizeNullableString("decision_bundle.parity_id", input.parity_id),
    persisted_at: normalizeUtcInstantString(input.persisted_at),
    plain_reason: requireString("decision_bundle.plain_reason", input.plain_reason).slice(0, 200),
    primary_action_code: normalizeNullableString(
      "decision_bundle.primary_action_code",
      input.primary_action_code,
    ),
    primary_proof_bundle_ref: normalizeNullableString(
      "decision_bundle.primary_proof_bundle_ref",
      input.primary_proof_bundle_ref,
    ),
    reason_codes: normalizeOrderedStringSet("decision_bundle.reason_codes", input.reason_codes, {
      maxItems: 8,
      minItems: 1,
    }),
    replay_attestation_ref: normalizeNullableString(
      "decision_bundle.replay_attestation_ref",
      input.replay_attestation_ref,
    ),
    risk_id: normalizeNullableString("decision_bundle.risk_id", input.risk_id),
    snapshot_id: normalizeNullableString("decision_bundle.snapshot_id", input.snapshot_id),
    submission_record_id: normalizeNullableString(
      "decision_bundle.submission_record_id",
      input.submission_record_id,
    ),
    suggested_detail_surface_code: input.suggested_detail_surface_code ?? null,
    trust_id: normalizeNullableString("decision_bundle.trust_id", input.trust_id),
    truth_state: input.truth_state,
    twin_id: normalizeNullableString("decision_bundle.twin_id", input.twin_id),
    waiting_on: input.waiting_on,
    workflow_item_refs: normalizeStringSetWithLimit(
      "decision_bundle.workflow_item_refs",
      input.workflow_item_refs,
    ),
  };
  enforceReasonBridge(normalized);
  enforceActionability(normalized);
  enforceOutcomeBridge(normalized);
  enforceReferenceImplications(normalized);
  enforceExecutionBoundary(normalized);
  enforceContracts(normalized);
  return normalized;
}

export function withRefreshedDecisionBundleContract(input: {
  decision_bundle: Omit<DecisionBundleRecord, "contract">;
  schema_bundle_hash?: string;
  writer_build_id?: string;
}) {
  const contentHash = deriveDecisionBundleContentHash(input.decision_bundle);
  return normalizeDecisionBundleRecord({
    ...input.decision_bundle,
    contract: buildDecisionBundleContract({
      decision_bundle_content_hash: contentHash,
      decision_bundle_id: input.decision_bundle.decision_bundle_id,
      schema_bundle_hash: input.schema_bundle_hash,
      writer_build_id: input.writer_build_id,
    }),
  });
}

export function buildDecisionBundleRecord(input: DecisionBundleBuildInput): DecisionBundleRecord {
  const manifestId = requireString("decision_bundle.manifest_id", input.manifest_id);
  const persistedAt = normalizeUtcInstantString(
    input.persisted_at ?? new Date("2026-04-28T00:00:00.000Z").toISOString(),
  );
  const executionMode = input.execution_mode ?? "COMPLIANCE";
  const executionBoundary =
    input.execution_mode_boundary_contract ??
    buildDecisionBundleExecutionModeBoundaryContract({
      analysis_only: input.analysis_only,
      counterfactual_basis: input.counterfactual_basis,
      execution_mode: executionMode,
      non_compliance_config_refs: input.non_compliance_config_refs,
    });
  const nonLiveReason =
    executionBoundary.legal_effect_boundary === "COMPLIANCE_CAPABLE"
      ? []
      : ["NON_LIVE_EXECUTION_BOUNDARY"];
  const posture = normalizeAuthorityPosture(
    input.authority_posture ?? input.truth_state ?? input.checkpoint_state,
  );
  const postureBridge = posture == null ? null : bridgeForAuthorityPosture(posture);
  const outcomeClass =
    postureBridge?.outcome_class ??
    input.outcome_class ??
    defaultOutcomeForDecisionStatus(input.decision_status ?? "COMPLETED");
  const status =
    postureBridge?.decision_status ?? input.decision_status ?? decisionStatusForOutcome(outcomeClass);
  const defaultBridge = defaultBridgeForOutcome(outcomeClass);
  const checkpointState =
    input.checkpoint_state ?? postureBridge?.checkpoint_state ?? defaultBridge.checkpoint_state;
  const waitingOn = input.waiting_on ?? postureBridge?.waiting_on ?? defaultBridge.waiting_on;
  const truthState = input.truth_state ?? postureBridge?.truth_state ?? defaultBridge.truth_state;
  const reasonSummary = buildTerminalReasonSummary({
    decision_status: status,
    gate_records: input.gate_records,
    outcome_class: outcomeClass,
    plain_reason: input.plain_reason,
    reason_codes: [...(input.reason_codes ?? []), ...nonLiveReason],
  });
  const nextActionCodes = normalizeStringSetWithLimit(
    "decision_bundle.next_action_codes",
    input.next_action_codes,
    { maxItems: 3 },
  );
  const actionability =
    input.actionability_state ?? (nextActionCodes.length > 0 ? "ACTION_AVAILABLE" : "NO_SAFE_ACTION");
  const primaryActionCode =
    actionability === "ACTION_AVAILABLE"
      ? normalizeNullableString(
          "decision_bundle.primary_action_code",
          input.primary_action_code ?? nextActionCodes[0],
        )
      : null;
  const blockedActionCodes = normalizeStringSetWithLimit(
    "decision_bundle.blocked_action_codes",
    input.blocked_action_codes,
    { maxItems: 8 },
  );
  const noSafeReason =
    actionability === "NO_SAFE_ACTION"
      ? normalizeNullableString(
          "decision_bundle.no_safe_action_reason_code",
          input.no_safe_action_reason_code ?? defaultNoSafeReason(outcomeClass),
        )
      : null;
  const suggestedDetail =
    actionability === "NO_SAFE_ACTION"
      ? input.suggested_detail_surface_code ?? defaultSuggestedDetailSurface(outcomeClass)
      : null;
  const workflowRefs = filterOpenWorkflowItemRefs(input.workflow_item_refs);
  const nextCheckpointAt =
    waitingOn === "NONE"
      ? null
      : input.next_checkpoint_at == null
        ? persistedAt
        : normalizeUtcInstantString(input.next_checkpoint_at);
  const bundleWithoutContract: Omit<DecisionBundleRecord, "contract"> = {
    actionability_state: actionability,
    active_detail_surface_code:
      input.active_detail_surface_code ??
      (waitingOn === "NONE" ? null : defaultSuggestedDetailSurface(outcomeClass)),
    amendment_case_id: input.amendment_case_id ?? null,
    analysis_only: executionBoundary.analysis_only,
    artifact_type: "DecisionBundle",
    blocked_action_codes: blockedActionCodes,
    checkpoint_state: checkpointState,
    compute_id: input.compute_id ?? null,
    counterfactual_basis: executionBoundary.counterfactual_basis,
    decision_bundle_id: input.decision_bundle_id ?? `decision-bundle.${manifestId}`,
    decision_explainability_contract: buildDecisionExplainabilityContract({
      actionability_state: actionability,
      blocked_action_codes: blockedActionCodes,
      checkpoint_state: checkpointState,
      dominant_reason_code: reasonSummary.dominant_reason_code,
      outcome_class: outcomeClass,
      plain_reason: reasonSummary.plain_reason,
      reason_codes: reasonSummary.reason_codes,
      truth_state: truthState,
      waiting_on: waitingOn,
    }),
    decision_reason_codes: reasonSummary.decision_reason_codes,
    decision_status: status,
    dominant_reason_code: reasonSummary.dominant_reason_code,
    execution_mode: executionBoundary.execution_mode,
    execution_mode_boundary_contract: executionBoundary,
    filing_case_id: input.filing_case_id ?? null,
    filing_packet_id: input.filing_packet_id ?? null,
    focus_anchor_ref: input.focus_anchor_ref ?? null,
    forecast_id: input.forecast_id ?? null,
    graph_id: input.graph_id ?? null,
    manifest_id: manifestId,
    next_action_codes: nextActionCodes,
    next_checkpoint_at: nextCheckpointAt,
    no_safe_action_reason_code: noSafeReason,
    non_compliance_config_refs: executionBoundary.non_compliance_config_refs,
    outcome_class: outcomeClass,
    parity_id: input.parity_id ?? null,
    persisted_at: persistedAt,
    plain_reason: reasonSummary.plain_reason,
    primary_action_code: primaryActionCode,
    primary_proof_bundle_ref: input.primary_proof_bundle_ref ?? null,
    reason_codes: reasonSummary.reason_codes,
    replay_attestation_ref: input.replay_attestation_ref ?? null,
    risk_id: input.risk_id ?? null,
    snapshot_id: input.snapshot_id ?? null,
    submission_record_id: input.submission_record_id ?? null,
    suggested_detail_surface_code: suggestedDetail,
    trust_id: input.trust_id ?? null,
    truth_boundary_contract: DECISION_BUNDLE_TRUTH_BOUNDARY_CONTRACT,
    truth_state: truthState,
    twin_id: input.twin_id ?? null,
    waiting_on: waitingOn,
    workflow_item_refs: workflowRefs,
  };
  return withRefreshedDecisionBundleContract({
    decision_bundle: bundleWithoutContract,
    schema_bundle_hash: input.schema_bundle_hash,
    writer_build_id: input.writer_build_id,
  });
}

export function cloneDecisionBundleRecord(record: DecisionBundleRecord) {
  return structuredClone(record);
}
