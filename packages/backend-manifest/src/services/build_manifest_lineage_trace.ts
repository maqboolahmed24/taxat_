import type {
  ManifestLineageTraceCandidateEvaluation,
} from "../../../generated-models/src/generated/typescript/manifest-and-release.ts";
import type { RunManifestRecord } from "../models/run_manifest.ts";
import type { ManifestDecisionServiceResult } from "../types/manifest_decision_service_result.ts";
import {
  buildManifestLineageTrace,
  type ManifestLineageTraceFactoryInput,
} from "./manifest_lineage_trace_factory.ts";

export class ManifestDecisionLineageTraceBuildError extends Error {
  constructor(detail: string) {
    super(`MANIFEST_DECISION_LINEAGE_TRACE_BUILD_FAILED: ${detail}`);
    this.name = "ManifestDecisionLineageTraceBuildError";
  }
}

export function buildManifestDecisionLineageTrace(input: {
  branch_decision_audit_refs?: string[];
  branch_decision_trace_span_refs?: string[];
  decision: ManifestDecisionServiceResult;
  lineage_trace_id?: string;
  nightly_predecessor_context?: ManifestLineageTraceFactoryInput["nightly_predecessor_context"];
  selected_manifest?: RunManifestRecord;
}) {
  const branchDecision = input.decision.branch_decision_contract;
  if (branchDecision === null) {
    throw new ManifestDecisionLineageTraceBuildError(
      "blocked decisions do not have a branch decision contract",
    );
  }
  const selectedManifest = input.selected_manifest ?? input.decision.selected_manifest_snapshot;
  if (selectedManifest === null) {
    throw new ManifestDecisionLineageTraceBuildError(
      "manifest-producing decisions require the allocated child manifest before lineage trace construction",
    );
  }

  return buildManifestLineageTrace({
    branch_decision_audit_refs: input.branch_decision_audit_refs ?? [
      `audit://${branchDecision.selected_manifest_id}/manifest-branch-decision`,
    ],
    branch_decision_trace_span_refs: input.branch_decision_trace_span_refs ?? [
      `trace://${branchDecision.selected_manifest_id}/manifest-branch-decision`,
    ],
    candidate_evaluations:
      input.decision.candidate_evaluations as ManifestLineageTraceCandidateEvaluation[],
    lineage_trace_id: input.lineage_trace_id,
    nightly_predecessor_context: input.nightly_predecessor_context,
    request_branch_decision: branchDecision,
    selected_manifest: selectedManifest,
  });
}
