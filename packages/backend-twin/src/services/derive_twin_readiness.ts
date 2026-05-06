import { twinDeltaArcRef, type TwinDeltaArcRecord } from "../models/twin_delta_arc.ts";
import type { ExecutionModeBoundaryContract } from "../models/twin_common.ts";
import {
  buildTwinReadinessStateRecord,
  type TwinFilingReadiness,
  type TwinReadinessAuthorityPosture,
  type TwinReadinessClass,
  type TwinReadinessStateRecord,
} from "../models/twin_readiness_state.ts";
import type { TwinMismatchSummaryRecord } from "../models/twin_mismatch_summary.ts";
import type { TwinStateSnapshotRecord } from "../models/twin_state_snapshot.ts";
import { TwinReadinessStateRepository } from "../repositories/twin_readiness_state_repository.ts";

export type DeriveTwinReadinessInput = {
  authority_snapshot?: TwinStateSnapshotRecord;
  decision_bundle_ref?: string | null;
  deltas: readonly TwinDeltaArcRecord[];
  execution_mode_boundary_contract: ExecutionModeBoundaryContract;
  filing_readiness: TwinFilingReadiness;
  gate_decision_refs?: readonly string[];
  internal_snapshot?: TwinStateSnapshotRecord;
  last_evaluated_at: string;
  mismatch_summary: TwinMismatchSummaryRecord;
  repository?: TwinReadinessStateRepository;
  trust_summary_ref: string;
  twin_id: string;
};

export type DeriveTwinReadinessResult = {
  readiness: TwinReadinessStateRecord;
  repository: TwinReadinessStateRepository;
  stored: Awaited<ReturnType<TwinReadinessStateRepository["persistTwinReadinessState"]>>;
};

function refs(deltas: readonly TwinDeltaArcRecord[]) {
  return deltas.map((delta) => twinDeltaArcRef(delta)).sort();
}

function authorityPosture(input: DeriveTwinReadinessInput): TwinReadinessAuthorityPosture {
  const authority = input.authority_snapshot;
  if (!authority || authority.authority_truth_state === "NOT_REQUESTED") {
    return "NOT_REQUESTED";
  }
  if (authority.freshness_state === "STALE" || authority.assembly_state === "STALE") {
    return "STALE";
  }
  if (authority.authority_truth_state === "PENDING_ACK") {
    return "PENDING";
  }
  if (authority.authority_truth_state === "PARTIAL_ACK") {
    return "PARTIAL";
  }
  if (authority.authority_truth_state === "UNKNOWN" || authority.assembly_state === "UNAVAILABLE") {
    return "UNKNOWN";
  }
  if (authority.authority_truth_state === "OUT_OF_BAND") {
    return "OUT_OF_BAND";
  }
  if (input.mismatch_summary.mismatch_count > 0) {
    return "CURRENT_MISMATCHED";
  }
  return "CURRENT_MATCHED";
}

function baselineState(input: DeriveTwinReadinessInput) {
  if (input.deltas.some((delta) => delta.baseline_state === "MISSING" || delta.delta_class === "BASELINE_MISSING")) {
    return "MISSING" as const;
  }
  if (input.deltas.some((delta) => delta.baseline_state === "STALE")) {
    return "STALE" as const;
  }
  if (input.deltas.some((delta) => delta.baseline_state === "PARTIAL")) {
    return "PARTIAL" as const;
  }
  if (input.deltas.some((delta) => delta.baseline_state === "PROVED")) {
    return "PROVED" as const;
  }
  return "NOT_APPLICABLE" as const;
}

export async function deriveTwinReadiness(input: DeriveTwinReadinessInput): Promise<DeriveTwinReadinessResult> {
  const repository = input.repository ?? new TwinReadinessStateRepository();
  const mismatchDeltas = input.deltas.filter(
    (delta) => delta.delta_class !== "MATCH_EXACT" && delta.delta_class !== "MATCH_EQUIVALENT",
  );
  const blockingCandidates = mismatchDeltas.filter(
    (delta) => delta.materiality_class === "BLOCKING" || delta.delta_class === "BASELINE_MISSING",
  );
  const reconciliationCandidates = mismatchDeltas.filter((delta) =>
    ["RUN_RECONCILIATION", "PREPARE_AMENDMENT"].includes(delta.resolution_class),
  );
  const waitingCandidates = mismatchDeltas.filter(
    (delta) => delta.comparability_state === "WAITING_ON_AUTHORITY" || delta.delta_class === "TIMELINE_LAG",
  );
  const limitedOrStaleCandidates = mismatchDeltas.filter(
    (delta) =>
      delta.delta_class === "LIMITED_VISIBILITY" ||
      delta.delta_class === "STALE_COMPARISON" ||
      delta.freshness_state === "STALE" ||
      delta.freshness_state === "LIMITED",
  );
  const materialReviewCandidates = mismatchDeltas.filter((delta) =>
    ["MATERIAL", "REVIEW"].includes(delta.materiality_class),
  );
  const contradictoryCandidates = mismatchDeltas.filter((delta) => delta.comparability_state === "CONTRADICTORY");
  const nonComparableCandidates = mismatchDeltas.filter((delta) => delta.comparability_state === "NON_COMPARABLE");
  const outOfBandCandidates = mismatchDeltas.filter((delta) => delta.comparability_state === "OUT_OF_BAND");
  const posture = authorityPosture(input);
  const baseline = baselineState(input);

  let readinessClass: TwinReadinessClass;
  if (input.filing_readiness === "NOT_READY" || blockingCandidates.length > 0 || baseline === "MISSING") {
    readinessClass = "BLOCKED";
  } else if (reconciliationCandidates.length > 0 || outOfBandCandidates.length > 0 || contradictoryCandidates.length > 0) {
    readinessClass = "RECONCILIATION_REQUIRED";
  } else if (waitingCandidates.length > 0) {
    readinessClass = "WAITING_ON_AUTHORITY";
  } else if (
    materialReviewCandidates.length > 0 ||
    limitedOrStaleCandidates.length > 0 ||
    input.filing_readiness === "READY_REVIEW" ||
    ["PARTIAL", "STALE", "UNKNOWN", "OUT_OF_BAND", "CURRENT_MISMATCHED"].includes(posture)
  ) {
    readinessClass = "REVIEW_REQUIRED";
  } else {
    readinessClass = "READY";
  }

  const capReasonCodes = new Set<string>();
  if (posture === "PARTIAL") {
    capReasonCodes.add("AUTHORITY_PARTIAL");
  }
  if (posture === "STALE") {
    capReasonCodes.add("AUTHORITY_STALE");
  }
  if (posture === "UNKNOWN") {
    capReasonCodes.add("AUTHORITY_UNKNOWN");
  }
  if (posture === "OUT_OF_BAND") {
    capReasonCodes.add("AUTHORITY_OUT_OF_BAND");
  }
  if (nonComparableCandidates.length > 0) {
    capReasonCodes.add("NON_COMPARABLE_MISMATCH");
  }
  if (contradictoryCandidates.length > 0) {
    capReasonCodes.add("CONTRADICTORY_MISMATCH");
  }
  if (baseline === "MISSING") {
    capReasonCodes.add("BASELINE_MISSING");
  }
  if (input.execution_mode_boundary_contract.legal_effect_boundary !== "COMPLIANCE_CAPABLE") {
    capReasonCodes.add("NON_LIVE_EXECUTION_BOUNDARY");
    if (readinessClass === "READY") {
      readinessClass = "REVIEW_REQUIRED";
    }
  }

  const blockingRefs = readinessClass === "BLOCKED" ? refs(blockingCandidates) : [];
  const reconciliationRefs =
    readinessClass === "RECONCILIATION_REQUIRED" ? refs(reconciliationCandidates.length ? reconciliationCandidates : mismatchDeltas) : [];
  const waitingRefs = readinessClass === "WAITING_ON_AUTHORITY" ? refs(waitingCandidates) : [];
  const reviewRefs =
    readinessClass === "REVIEW_REQUIRED"
      ? refs([...materialReviewCandidates, ...limitedOrStaleCandidates].filter((delta, index, all) => all.indexOf(delta) === index))
      : [];
  const nonComparableRefs = refs(nonComparableCandidates);
  const contradictoryRefs = refs(contradictoryCandidates);
  const outOfBandRefs = refs(outOfBandCandidates);

  let safeActionState: TwinReadinessStateRecord["safe_action_state"] = "NO_SAFE_ACTION";
  let decisionUsefulness: TwinReadinessStateRecord["decision_usefulness"] = "LOW";
  let filingReadiness = input.filing_readiness;
  if (readinessClass === "READY") {
    safeActionState = "SAFE_TO_ACT";
    decisionUsefulness = "HIGH";
  } else if (readinessClass === "WAITING_ON_AUTHORITY") {
    safeActionState = "WAIT_ONLY";
    decisionUsefulness = "MEDIUM";
  } else if (readinessClass === "RECONCILIATION_REQUIRED") {
    safeActionState = nonComparableRefs.length > 0 || contradictoryRefs.length > 0 || outOfBandRefs.length > 0 ? "NO_SAFE_ACTION" : "REVIEW_BEFORE_ACT";
    decisionUsefulness = "LOW";
  } else if (readinessClass === "REVIEW_REQUIRED") {
    safeActionState = nonComparableRefs.length > 0 || limitedOrStaleCandidates.length > 0 ? "REFRESH_REQUIRED" : "REVIEW_BEFORE_ACT";
    decisionUsefulness = capReasonCodes.size > 0 ? "LOW" : "MEDIUM";
  } else {
    safeActionState = "NO_SAFE_ACTION";
    decisionUsefulness = "NONE";
  }
  if (input.execution_mode_boundary_contract.legal_effect_boundary !== "COMPLIANCE_CAPABLE") {
    filingReadiness = filingReadiness === "READY_TO_SUBMIT" ? "READY_REVIEW" : filingReadiness;
    if (safeActionState === "SAFE_TO_ACT") {
      safeActionState = "REVIEW_BEFORE_ACT";
    }
    decisionUsefulness = "LOW";
  }

  const readiness = buildTwinReadinessStateRecord({
    authority_posture: posture,
    baseline_state: baseline,
    blocking_mismatch_refs: blockingRefs,
    blocking_reason_codes: readinessClass === "BLOCKED" ? ["TWIN_BLOCKED"] : [],
    contradictory_mismatch_refs: contradictoryRefs,
    decision_bundle_ref: input.decision_bundle_ref ?? null,
    decision_usefulness: decisionUsefulness,
    execution_mode_boundary_contract: input.execution_mode_boundary_contract,
    filing_readiness: filingReadiness,
    gate_decision_refs: [...(input.gate_decision_refs ?? [])],
    last_evaluated_at: input.last_evaluated_at,
    no_safe_action_reason_codes: safeActionState === "NO_SAFE_ACTION" ? ["NO_SAFE_TWIN_ACTION"] : [],
    non_comparable_mismatch_refs: nonComparableRefs,
    out_of_band_mismatch_refs: outOfBandRefs,
    reconciliation_mismatch_refs: reconciliationRefs,
    review_mismatch_refs: reviewRefs,
    review_reason_codes: readinessClass === "REVIEW_REQUIRED" ? ["TWIN_REVIEW_REQUIRED"] : [],
    safe_action_state: safeActionState,
    trust_summary_ref: input.trust_summary_ref,
    twin_id: input.twin_id,
    twin_readiness_class: readinessClass,
    unresolved_conflict_refs: refs([...contradictoryCandidates, ...outOfBandCandidates]),
    usefulness_cap_reason_codes: [...capReasonCodes].sort(),
    waiting_mismatch_refs: waitingRefs,
  });
  const stored = await repository.persistTwinReadinessState({ readiness });
  return {
    readiness,
    repository,
    stored,
  };
}
