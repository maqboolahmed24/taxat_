import {
  type ExecutionModeBoundaryContract,
  cloneRecord,
  normalizeExecutionModeBoundaryContract,
  normalizeNullableString,
  normalizeSortedStringSet,
  normalizeTimestamp,
  requireString,
  TwinModelError,
} from "./twin_common.ts";

export type TwinFilingReadiness = "NOT_READY" | "READY_REVIEW" | "READY_TO_SUBMIT";
export type TwinReadinessClass =
  | "READY"
  | "REVIEW_REQUIRED"
  | "WAITING_ON_AUTHORITY"
  | "RECONCILIATION_REQUIRED"
  | "BLOCKED";
export type TwinSafeActionState =
  | "SAFE_TO_ACT"
  | "REVIEW_BEFORE_ACT"
  | "WAIT_ONLY"
  | "REFRESH_REQUIRED"
  | "NO_SAFE_ACTION";
export type TwinDecisionUsefulness = "HIGH" | "MEDIUM" | "LOW" | "NONE";
export type TwinReadinessAuthorityPosture =
  | "NOT_REQUESTED"
  | "CURRENT_MATCHED"
  | "CURRENT_MISMATCHED"
  | "PENDING"
  | "PARTIAL"
  | "STALE"
  | "UNKNOWN"
  | "OUT_OF_BAND";

export type TwinReadinessStateRecord = {
  artifact_type: "TwinReadinessState";
  authority_posture: TwinReadinessAuthorityPosture;
  baseline_state: "NOT_APPLICABLE" | "PROVED" | "PARTIAL" | "MISSING" | "STALE";
  blocking_mismatch_refs: string[];
  blocking_reason_codes: string[];
  contradictory_mismatch_refs: string[];
  decision_bundle_ref: string | null;
  decision_usefulness: TwinDecisionUsefulness;
  execution_mode_boundary_contract: ExecutionModeBoundaryContract;
  filing_readiness: TwinFilingReadiness;
  gate_decision_refs: string[];
  last_evaluated_at: string;
  no_safe_action_reason_codes: string[];
  non_comparable_mismatch_refs: string[];
  out_of_band_mismatch_refs: string[];
  reconciliation_mismatch_refs: string[];
  review_mismatch_refs: string[];
  review_reason_codes: string[];
  safe_action_state: TwinSafeActionState;
  trust_summary_ref: string;
  twin_id: string;
  twin_readiness_class: TwinReadinessClass;
  twin_readiness_id: string;
  unresolved_conflict_refs: string[];
  usefulness_cap_reason_codes: string[];
  waiting_mismatch_refs: string[];
};

export type TwinReadinessStateBuildInput = Partial<
  Omit<
    TwinReadinessStateRecord,
    | "artifact_type"
    | "execution_mode_boundary_contract"
    | "usefulness_cap_reason_codes"
    | "blocking_reason_codes"
    | "review_reason_codes"
    | "unresolved_conflict_refs"
    | "blocking_mismatch_refs"
    | "review_mismatch_refs"
    | "waiting_mismatch_refs"
    | "reconciliation_mismatch_refs"
    | "contradictory_mismatch_refs"
    | "non_comparable_mismatch_refs"
    | "out_of_band_mismatch_refs"
    | "no_safe_action_reason_codes"
  >
> & {
  execution_mode_boundary_contract: ExecutionModeBoundaryContract;
  last_evaluated_at: string;
  twin_id: string;
  blocking_mismatch_refs?: readonly string[];
  blocking_reason_codes?: readonly string[];
  contradictory_mismatch_refs?: readonly string[];
  no_safe_action_reason_codes?: readonly string[];
  non_comparable_mismatch_refs?: readonly string[];
  out_of_band_mismatch_refs?: readonly string[];
  reconciliation_mismatch_refs?: readonly string[];
  review_mismatch_refs?: readonly string[];
  review_reason_codes?: readonly string[];
  unresolved_conflict_refs?: readonly string[];
  usefulness_cap_reason_codes?: readonly string[];
  waiting_mismatch_refs?: readonly string[];
};

export function twinReadinessStateRef(readiness: Pick<TwinReadinessStateRecord, "twin_readiness_id"> | string) {
  return `twin-readiness-state://${typeof readiness === "string" ? requireString("twin_readiness_id", readiness) : readiness.twin_readiness_id}`;
}

function normalizeRefBucket(label: string, value: readonly string[] | undefined) {
  return normalizeSortedStringSet(label, value ?? []);
}

function hasAny(...buckets: readonly string[][]) {
  return buckets.some((bucket) => bucket.length > 0);
}

export function buildTwinReadinessStateRecord(input: TwinReadinessStateBuildInput): TwinReadinessStateRecord {
  const executionModeBoundaryContract = normalizeExecutionModeBoundaryContract(input.execution_mode_boundary_contract);
  const usefulnessCapReasonCodes = normalizeRefBucket(
    "usefulness_cap_reason_codes",
    input.usefulness_cap_reason_codes,
  );
  if (executionModeBoundaryContract.legal_effect_boundary !== "COMPLIANCE_CAPABLE") {
    usefulnessCapReasonCodes.push("NON_LIVE_EXECUTION_BOUNDARY");
    usefulnessCapReasonCodes.sort();
  }
  const record: TwinReadinessStateRecord = {
    artifact_type: "TwinReadinessState",
    authority_posture: input.authority_posture ?? "UNKNOWN",
    baseline_state: input.baseline_state ?? "NOT_APPLICABLE",
    blocking_mismatch_refs: normalizeRefBucket("blocking_mismatch_refs", input.blocking_mismatch_refs),
    blocking_reason_codes: normalizeRefBucket("blocking_reason_codes", input.blocking_reason_codes),
    contradictory_mismatch_refs: normalizeRefBucket(
      "contradictory_mismatch_refs",
      input.contradictory_mismatch_refs,
    ),
    decision_bundle_ref: normalizeNullableString("decision_bundle_ref", input.decision_bundle_ref),
    decision_usefulness: input.decision_usefulness ?? "LOW",
    execution_mode_boundary_contract: executionModeBoundaryContract,
    filing_readiness: input.filing_readiness ?? "NOT_READY",
    gate_decision_refs: normalizeRefBucket("gate_decision_refs", input.gate_decision_refs),
    last_evaluated_at: normalizeTimestamp("last_evaluated_at", input.last_evaluated_at),
    no_safe_action_reason_codes: normalizeRefBucket(
      "no_safe_action_reason_codes",
      input.no_safe_action_reason_codes,
    ),
    non_comparable_mismatch_refs: normalizeRefBucket(
      "non_comparable_mismatch_refs",
      input.non_comparable_mismatch_refs,
    ),
    out_of_band_mismatch_refs: normalizeRefBucket("out_of_band_mismatch_refs", input.out_of_band_mismatch_refs),
    reconciliation_mismatch_refs: normalizeRefBucket(
      "reconciliation_mismatch_refs",
      input.reconciliation_mismatch_refs,
    ),
    review_mismatch_refs: normalizeRefBucket("review_mismatch_refs", input.review_mismatch_refs),
    review_reason_codes: normalizeRefBucket("review_reason_codes", input.review_reason_codes),
    safe_action_state: input.safe_action_state ?? "NO_SAFE_ACTION",
    trust_summary_ref: requireString("trust_summary_ref", input.trust_summary_ref),
    twin_id: requireString("twin_id", input.twin_id),
    twin_readiness_class: input.twin_readiness_class ?? "BLOCKED",
    twin_readiness_id:
      input.twin_readiness_id ??
      `twin-readiness-state.${input.twin_id}.${normalizeTimestamp("last_evaluated_at", input.last_evaluated_at)}`,
    unresolved_conflict_refs: normalizeRefBucket("unresolved_conflict_refs", input.unresolved_conflict_refs),
    usefulness_cap_reason_codes: normalizeSortedStringSet(
      "usefulness_cap_reason_codes",
      usefulnessCapReasonCodes,
    ),
    waiting_mismatch_refs: normalizeRefBucket("waiting_mismatch_refs", input.waiting_mismatch_refs),
  };
  return normalizeTwinReadinessStateRecord(record);
}

export function normalizeTwinReadinessStateRecord(input: TwinReadinessStateRecord): TwinReadinessStateRecord {
  const record: TwinReadinessStateRecord = {
    ...input,
    artifact_type: "TwinReadinessState",
    blocking_mismatch_refs: normalizeRefBucket("blocking_mismatch_refs", input.blocking_mismatch_refs),
    blocking_reason_codes: normalizeRefBucket("blocking_reason_codes", input.blocking_reason_codes),
    contradictory_mismatch_refs: normalizeRefBucket(
      "contradictory_mismatch_refs",
      input.contradictory_mismatch_refs,
    ),
    decision_bundle_ref: normalizeNullableString("decision_bundle_ref", input.decision_bundle_ref),
    execution_mode_boundary_contract: normalizeExecutionModeBoundaryContract(input.execution_mode_boundary_contract),
    gate_decision_refs: normalizeRefBucket("gate_decision_refs", input.gate_decision_refs),
    last_evaluated_at: normalizeTimestamp("last_evaluated_at", input.last_evaluated_at),
    no_safe_action_reason_codes: normalizeRefBucket(
      "no_safe_action_reason_codes",
      input.no_safe_action_reason_codes,
    ),
    non_comparable_mismatch_refs: normalizeRefBucket(
      "non_comparable_mismatch_refs",
      input.non_comparable_mismatch_refs,
    ),
    out_of_band_mismatch_refs: normalizeRefBucket("out_of_band_mismatch_refs", input.out_of_band_mismatch_refs),
    reconciliation_mismatch_refs: normalizeRefBucket(
      "reconciliation_mismatch_refs",
      input.reconciliation_mismatch_refs,
    ),
    review_mismatch_refs: normalizeRefBucket("review_mismatch_refs", input.review_mismatch_refs),
    review_reason_codes: normalizeRefBucket("review_reason_codes", input.review_reason_codes),
    trust_summary_ref: requireString("trust_summary_ref", input.trust_summary_ref),
    twin_id: requireString("twin_id", input.twin_id),
    twin_readiness_id: requireString("twin_readiness_id", input.twin_readiness_id),
    unresolved_conflict_refs: normalizeRefBucket("unresolved_conflict_refs", input.unresolved_conflict_refs),
    usefulness_cap_reason_codes: normalizeRefBucket(
      "usefulness_cap_reason_codes",
      input.usefulness_cap_reason_codes,
    ),
    waiting_mismatch_refs: normalizeRefBucket("waiting_mismatch_refs", input.waiting_mismatch_refs),
  };

  const actionBucketOwner = new Map<string, string>();
  for (const [field, refs] of [
    ["blocking_mismatch_refs", record.blocking_mismatch_refs],
    ["review_mismatch_refs", record.review_mismatch_refs],
    ["waiting_mismatch_refs", record.waiting_mismatch_refs],
    ["reconciliation_mismatch_refs", record.reconciliation_mismatch_refs],
  ] as const) {
    for (const ref of refs) {
      const prior = actionBucketOwner.get(ref);
      if (prior && prior !== field) {
        throw new TwinModelError(
          "TWIN_CONTRACT_INVALID",
          `${ref} must not appear in multiple readiness action buckets`,
        );
      }
      actionBucketOwner.set(ref, field);
    }
  }

  if (record.twin_readiness_class === "READY") {
    if (
      record.filing_readiness !== "READY_TO_SUBMIT" ||
      record.safe_action_state !== "SAFE_TO_ACT" ||
      record.decision_usefulness !== "HIGH" ||
      record.decision_bundle_ref === null ||
      record.gate_decision_refs.length === 0 ||
      hasAny(
        record.usefulness_cap_reason_codes,
        record.blocking_reason_codes,
        record.review_reason_codes,
        record.unresolved_conflict_refs,
        record.blocking_mismatch_refs,
        record.review_mismatch_refs,
        record.waiting_mismatch_refs,
        record.reconciliation_mismatch_refs,
        record.contradictory_mismatch_refs,
        record.non_comparable_mismatch_refs,
        record.out_of_band_mismatch_refs,
        record.no_safe_action_reason_codes,
      )
    ) {
      throw new TwinModelError("TWIN_CONTRACT_INVALID", "READY readiness must clear all blocking and cap posture");
    }
  }
  if (record.safe_action_state === "SAFE_TO_ACT" && record.twin_readiness_class !== "READY") {
    throw new TwinModelError("TWIN_CONTRACT_INVALID", "SAFE_TO_ACT requires twin_readiness_class=READY");
  }
  if (record.decision_usefulness === "HIGH" && record.twin_readiness_class !== "READY") {
    throw new TwinModelError("TWIN_CONTRACT_INVALID", "HIGH decision usefulness requires READY");
  }
  if (record.twin_readiness_class === "WAITING_ON_AUTHORITY") {
    if (record.safe_action_state !== "WAIT_ONLY" || record.waiting_mismatch_refs.length === 0) {
      throw new TwinModelError("TWIN_CONTRACT_INVALID", "WAITING_ON_AUTHORITY requires WAIT_ONLY and waiting refs");
    }
  }
  if (record.twin_readiness_class === "RECONCILIATION_REQUIRED") {
    if (
      !["REVIEW_BEFORE_ACT", "NO_SAFE_ACTION"].includes(record.safe_action_state) ||
      record.reconciliation_mismatch_refs.length === 0
    ) {
      throw new TwinModelError(
        "TWIN_CONTRACT_INVALID",
        "RECONCILIATION_REQUIRED requires reconciliation refs and review/no-safe-action posture",
      );
    }
  }
  if (record.twin_readiness_class === "REVIEW_REQUIRED") {
    if (!["REVIEW_BEFORE_ACT", "REFRESH_REQUIRED"].includes(record.safe_action_state)) {
      throw new TwinModelError("TWIN_CONTRACT_INVALID", "REVIEW_REQUIRED must use review or refresh action state");
    }
    if (record.review_reason_codes.length === 0 && record.review_mismatch_refs.length === 0) {
      throw new TwinModelError("TWIN_CONTRACT_INVALID", "REVIEW_REQUIRED requires review reasons or refs");
    }
  }
  if (record.twin_readiness_class === "BLOCKED") {
    if (record.safe_action_state !== "NO_SAFE_ACTION" || !["LOW", "NONE"].includes(record.decision_usefulness)) {
      throw new TwinModelError("TWIN_CONTRACT_INVALID", "BLOCKED requires NO_SAFE_ACTION and low/no usefulness");
    }
  }
  if (record.safe_action_state === "NO_SAFE_ACTION" && record.no_safe_action_reason_codes.length === 0) {
    throw new TwinModelError("TWIN_CONTRACT_INVALID", "NO_SAFE_ACTION requires no_safe_action_reason_codes");
  }
  if (record.safe_action_state !== "NO_SAFE_ACTION" && record.no_safe_action_reason_codes.length > 0) {
    throw new TwinModelError(
      "TWIN_CONTRACT_INVALID",
      "no_safe_action_reason_codes must be empty unless safe_action_state=NO_SAFE_ACTION",
    );
  }
  if (record.non_comparable_mismatch_refs.length > 0) {
    if (!["REFRESH_REQUIRED", "NO_SAFE_ACTION"].includes(record.safe_action_state)) {
      throw new TwinModelError(
        "TWIN_CONTRACT_INVALID",
        "non-comparable mismatch refs must cap safe_action_state",
      );
    }
    if (!["LOW", "NONE"].includes(record.decision_usefulness) || record.usefulness_cap_reason_codes.length === 0) {
      throw new TwinModelError(
        "TWIN_CONTRACT_INVALID",
        "non-comparable mismatch refs must cap usefulness with explicit reason codes",
      );
    }
  }
  if (record.out_of_band_mismatch_refs.length > 0) {
    if (!["RECONCILIATION_REQUIRED", "BLOCKED"].includes(record.twin_readiness_class)) {
      throw new TwinModelError(
        "TWIN_CONTRACT_INVALID",
        "out-of-band refs require RECONCILIATION_REQUIRED or BLOCKED",
      );
    }
    if (!["LOW", "NONE"].includes(record.decision_usefulness)) {
      throw new TwinModelError("TWIN_CONTRACT_INVALID", "out-of-band refs must cap decision usefulness");
    }
  }
  if (record.contradictory_mismatch_refs.length > 0) {
    if (!["RECONCILIATION_REQUIRED", "BLOCKED"].includes(record.twin_readiness_class)) {
      throw new TwinModelError(
        "TWIN_CONTRACT_INVALID",
        "contradictory refs require RECONCILIATION_REQUIRED or BLOCKED",
      );
    }
    if (record.safe_action_state === "SAFE_TO_ACT" || !["LOW", "NONE"].includes(record.decision_usefulness)) {
      throw new TwinModelError("TWIN_CONTRACT_INVALID", "contradictory refs must block safe action and usefulness");
    }
  }
  if (["PARTIAL", "STALE", "UNKNOWN", "OUT_OF_BAND"].includes(record.authority_posture)) {
    if (!["LOW", "NONE"].includes(record.decision_usefulness) || record.usefulness_cap_reason_codes.length === 0) {
      throw new TwinModelError(
        "TWIN_CONTRACT_INVALID",
        "limited or stale authority posture must cap decision usefulness",
      );
    }
  }
  if (record.execution_mode_boundary_contract.legal_effect_boundary !== "COMPLIANCE_CAPABLE") {
    if (record.filing_readiness === "READY_TO_SUBMIT" || record.safe_action_state === "SAFE_TO_ACT") {
      throw new TwinModelError(
        "TWIN_CONTRACT_INVALID",
        "modeled or replay-only twin readiness cannot publish live mutation-capable action",
      );
    }
    if (!record.usefulness_cap_reason_codes.includes("NON_LIVE_EXECUTION_BOUNDARY")) {
      throw new TwinModelError(
        "TWIN_CONTRACT_INVALID",
        "non-live execution boundary must persist NON_LIVE_EXECUTION_BOUNDARY cap",
      );
    }
  }
  return record;
}

export function cloneTwinReadinessStateRecord(record: TwinReadinessStateRecord) {
  return cloneRecord(record);
}
