import { twinDeltaArcRef } from "../models/twin_delta_arc.ts";
import type { ExecutionModeBoundaryContract } from "../models/twin_common.ts";
import { twinInterpretationStateRef } from "../models/twin_interpretation_state.ts";
import { twinMismatchSummaryRef } from "../models/twin_mismatch_summary.ts";
import { twinReadinessStateRef, type TwinFilingReadiness } from "../models/twin_readiness_state.ts";
import { twinReconciliationStateRef } from "../models/twin_reconciliation_state.ts";
import {
  twinStateSnapshotRef,
  type AssembledTwinStateSnapshot,
} from "../models/twin_state_snapshot.ts";
import { twinTimelineRef } from "../models/twin_timeline.ts";
import { buildTwinViewRecord, type TwinViewRecord } from "../models/twin_view.ts";
import { TwinDeltaArcRepository } from "../repositories/twin_delta_arc_repository.ts";
import { TwinMismatchSummaryRepository } from "../repositories/twin_mismatch_summary_repository.ts";
import { TwinReadinessStateRepository } from "../repositories/twin_readiness_state_repository.ts";
import { TwinInterpretationStateRepository } from "../repositories/twin_interpretation_state_repository.ts";
import { TwinReconciliationStateRepository } from "../repositories/twin_reconciliation_state_repository.ts";
import { TwinViewRepository } from "../repositories/twin_view_repository.ts";
import { buildTwinInterpretationState } from "./build_twin_interpretation_state.ts";
import { buildTwinTimeline } from "./build_twin_timeline.ts";
import { computeTwinDeltaSet } from "./compute_twin_delta_set.ts";
import { deriveTwinReadiness } from "./derive_twin_readiness.ts";
import { planTwinReconciliation, type TwinReconciliationProfile } from "./plan_twin_reconciliation.ts";
import { summarizeTwinMismatches } from "./summarize_twin_mismatches.ts";

export type BuildTwinViewInput = {
  authority: AssembledTwinStateSnapshot;
  built_at: string;
  decision_bundle_ref?: string | null;
  execution_mode_boundary_contract: ExecutionModeBoundaryContract;
  filing_readiness: TwinFilingReadiness;
  gate_decision_refs?: readonly string[];
  internal: AssembledTwinStateSnapshot;
  interpretation_repository?: TwinInterpretationStateRepository;
  manifest_id: string;
  mismatch_summary_repository?: TwinMismatchSummaryRepository;
  parity_result_ref: string;
  readiness_repository?: TwinReadinessStateRepository;
  reconciliation_profile?: TwinReconciliationProfile & {
    auto_attempt_count?: number;
    last_attempted_at?: string | null;
    workflow_item_refs?: readonly string[];
  };
  reconciliation_repository?: TwinReconciliationStateRepository;
  timeline_and_view_repository?: TwinViewRepository;
  twin_delta_repository?: TwinDeltaArcRepository;
  twin_id?: string;
  trust_summary_ref: string;
};

export type BuildTwinViewResult = {
  authority: AssembledTwinStateSnapshot;
  deltas: Awaited<ReturnType<typeof computeTwinDeltaSet>>["deltas"];
  internal: AssembledTwinStateSnapshot;
  interpretation: Awaited<ReturnType<typeof buildTwinInterpretationState>>["interpretation_state"];
  readiness: Awaited<ReturnType<typeof deriveTwinReadiness>>["readiness"];
  reconciliation: Awaited<ReturnType<typeof planTwinReconciliation>>["reconciliation_state"];
  repositories: {
    deltas: TwinDeltaArcRepository;
    interpretation: TwinInterpretationStateRepository;
    mismatch_summaries: TwinMismatchSummaryRepository;
    readiness: TwinReadinessStateRepository;
    reconciliation: TwinReconciliationStateRepository;
    views: TwinViewRepository;
  };
  stored: {
    deltas: Awaited<ReturnType<TwinDeltaArcRepository["persistTwinDeltaSet"]>>;
    interpretation: Awaited<ReturnType<TwinInterpretationStateRepository["persistTwinInterpretationState"]>>;
    mismatch_summary: Awaited<ReturnType<TwinMismatchSummaryRepository["persistTwinMismatchSummary"]>>;
    readiness: Awaited<ReturnType<TwinReadinessStateRepository["persistTwinReadinessState"]>>;
    reconciliation: Awaited<ReturnType<TwinReconciliationStateRepository["persistTwinReconciliationState"]>>;
    timeline: Awaited<ReturnType<TwinViewRepository["persistTwinTimeline"]>>;
    view: Awaited<ReturnType<TwinViewRepository["persistTwinView"]>>;
  };
  summary: Awaited<ReturnType<typeof summarizeTwinMismatches>>["summary"];
  timeline: Awaited<ReturnType<typeof buildTwinTimeline>>["timeline"];
  view: TwinViewRecord;
};

export async function buildTwinView(input: BuildTwinViewInput): Promise<BuildTwinViewResult> {
  const twinId = input.twin_id ?? input.internal.snapshot.twin_id;
  const viewRepository = input.timeline_and_view_repository ?? new TwinViewRepository();
  const deltaRepository = input.twin_delta_repository ?? new TwinDeltaArcRepository();
  const mismatchSummaryRepository = input.mismatch_summary_repository ?? new TwinMismatchSummaryRepository();
  const readinessRepository = input.readiness_repository ?? new TwinReadinessStateRepository();
  const reconciliationRepository = input.reconciliation_repository ?? new TwinReconciliationStateRepository();
  const interpretationRepository = input.interpretation_repository ?? new TwinInterpretationStateRepository();

  const timelineResult = await buildTwinTimeline({
    authority_snapshot: input.authority.snapshot,
    authority_subjects: input.authority.subjects,
    generated_at: input.built_at,
    internal_snapshot: input.internal.snapshot,
    internal_subjects: input.internal.subjects,
    repository: viewRepository,
    twin_id: twinId,
  });
  const deltaResult = await computeTwinDeltaSet({
    authority_snapshot: input.authority.snapshot,
    authority_subjects: input.authority.subjects,
    compared_at: input.built_at,
    internal_snapshot: input.internal.snapshot,
    internal_subjects: input.internal.subjects,
    repository: deltaRepository,
    timeline: timelineResult.timeline,
  });
  const summaryResult = await summarizeTwinMismatches({
    deltas: deltaResult.deltas,
    generated_at: input.built_at,
    repository: mismatchSummaryRepository,
    twin_id: twinId,
  });
  const readinessResult = await deriveTwinReadiness({
    authority_snapshot: input.authority.snapshot,
    decision_bundle_ref: input.decision_bundle_ref ?? null,
    deltas: deltaResult.deltas,
    execution_mode_boundary_contract: input.execution_mode_boundary_contract,
    filing_readiness: input.filing_readiness,
    gate_decision_refs: input.gate_decision_refs ?? [],
    internal_snapshot: input.internal.snapshot,
    last_evaluated_at: input.built_at,
    mismatch_summary: summaryResult.summary,
    repository: readinessRepository,
    trust_summary_ref: input.trust_summary_ref,
    twin_id: twinId,
  });
  const reconciliationResult = await planTwinReconciliation({
    auto_attempt_count: input.reconciliation_profile?.auto_attempt_count,
    deltas: deltaResult.deltas,
    generated_at: input.built_at,
    last_attempted_at: input.reconciliation_profile?.last_attempted_at,
    profile: input.reconciliation_profile,
    repository: reconciliationRepository,
    twin_id: twinId,
    workflow_item_refs: input.reconciliation_profile?.workflow_item_refs,
  });
  const interpretationResult = await buildTwinInterpretationState({
    deltas: deltaResult.deltas,
    interpretation_repository: interpretationRepository,
    mismatch_summary: summaryResult.summary,
    readiness: readinessResult.readiness,
    reconciliation_state: reconciliationResult.reconciliation_state,
  });

  const stale =
    input.internal.snapshot.assembly_state === "STALE" ||
    input.authority.snapshot.assembly_state === "STALE" ||
    input.internal.snapshot.freshness_state === "STALE" ||
    input.authority.snapshot.freshness_state === "STALE" ||
    timelineResult.timeline.lifecycle_state === "STALE";

  const view = buildTwinViewRecord({
    authority_state_ref: twinStateSnapshotRef(input.authority.snapshot),
    built_at: input.built_at,
    comparison_basis_ref: input.internal.snapshot.comparison_basis_ref ?? input.authority.snapshot.comparison_basis_ref,
    cross_source_delta_refs: deltaResult.deltas.map((delta) => twinDeltaArcRef(delta)),
    execution_mode_boundary_contract: input.execution_mode_boundary_contract,
    internal_state_ref: twinStateSnapshotRef(input.internal.snapshot),
    interpretation_state_ref: twinInterpretationStateRef(interpretationResult.interpretation_state),
    lifecycle_state: stale ? "STALE" : "BUILT",
    manifest_id: input.manifest_id,
    mismatch_summary_ref: twinMismatchSummaryRef(summaryResult.summary),
    parity_result_ref: input.parity_result_ref,
    readiness_ref: twinReadinessStateRef(readinessResult.readiness),
    reconciliation_state_ref: twinReconciliationStateRef(reconciliationResult.reconciliation_state),
    stale_at: stale ? input.built_at : null,
    superseded_at: null,
    timeline_ref: twinTimelineRef(timelineResult.timeline),
    twin_id: twinId,
  });
  const storedView = await viewRepository.persistTwinView({ view });

  return {
    authority: input.authority,
    deltas: deltaResult.deltas,
    internal: input.internal,
    interpretation: interpretationResult.interpretation_state,
    readiness: readinessResult.readiness,
    reconciliation: reconciliationResult.reconciliation_state,
    repositories: {
      deltas: deltaRepository,
      interpretation: interpretationRepository,
      mismatch_summaries: mismatchSummaryRepository,
      readiness: readinessRepository,
      reconciliation: reconciliationRepository,
      views: viewRepository,
    },
    stored: {
      deltas: deltaResult.stored,
      interpretation: interpretationResult.stored,
      mismatch_summary: summaryResult.stored,
      readiness: readinessResult.stored,
      reconciliation: reconciliationResult.stored,
      timeline: timelineResult.stored,
      view: storedView,
    },
    summary: summaryResult.summary,
    timeline: timelineResult.timeline,
    view,
  };
}
