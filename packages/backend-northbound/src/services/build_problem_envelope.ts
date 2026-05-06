import { createProblemTruthBoundaryContract } from "../../../../apps/control-plane-api/src/northbound/policy.ts";
import type {
  MutationPreconditionBinding,
  ProblemEnvelope,
} from "../../../../packages/generated-models/src/generated/typescript/domain-workflow-and-filing.ts";
import type { RouteStabilityContract } from "../../../../packages/generated-models/src/generated/typescript/surface-and-experience.ts";
import {
  restrictProblemRecoveryFamily,
  type ProblemRecoveryRefs,
  type RecoveryFamilyRestriction,
} from "./restrict_problem_recovery_family.ts";
import {
  selectPortalSafeDetailSurface,
  type ProblemAudienceClass,
} from "./select_portal_safe_detail_surface.ts";

export const northboundNoStoreHeaders = {
  "Cache-Control": "no-store",
} as const;

export type BuildProblemEnvelopeInput = {
  actionabilityState?: ProblemEnvelope["actionability_state"];
  audience?: ProblemAudienceClass;
  correlationId: string;
  detail: string;
  latestStabilityContractOrNull?: RouteStabilityContract | null;
  latestStaleGuardValue?: ProblemEnvelope["latest_stale_guard_value"];
  manifestId?: string | null;
  mutationPreconditionBindingOrNull?: MutationPreconditionBinding | null;
  problemCode: string;
  reasonCodes: readonly string[];
  rebaseRequired?: boolean;
  recoveryRefs?: Partial<ProblemRecoveryRefs> | null;
  restrictRecoveryFamilyTo?: RecoveryFamilyRestriction | null;
  retryable: boolean;
  staleGuardFamily?: ProblemEnvelope["stale_guard_family"];
  suggestedDetailSurfaceCode?: ProblemEnvelope["suggested_detail_surface_code"];
  title: string;
};

export class ProblemEnvelopeBuildError extends Error {
  readonly reasonCodes: string[];

  constructor(message: string, reasonCodes: readonly string[]) {
    super(message);
    this.name = "ProblemEnvelopeBuildError";
    this.reasonCodes = [...reasonCodes];
  }
}

function uniqueReasonCodes(values: readonly string[]) {
  const result = [...new Set(values.map((value) => value.trim()))].filter(
    (value) => value.length > 0,
  );
  if (result.length === 0) {
    throw new ProblemEnvelopeBuildError("ProblemEnvelope requires reason_codes", [
      "PROBLEM_REASON_CODES_EMPTY",
    ]);
  }
  return result;
}

function assertNonEmpty(fieldName: string, value: string | null | undefined) {
  if (value !== null && value !== undefined && value.trim().length === 0) {
    throw new ProblemEnvelopeBuildError(`${fieldName} cannot be empty`, [
      "PROBLEM_EMPTY_TOKEN",
    ]);
  }
}

function assertStaleGuardValue(input: {
  latestStaleGuardValue: ProblemEnvelope["latest_stale_guard_value"];
  staleGuardFamily: ProblemEnvelope["stale_guard_family"];
}) {
  if (input.staleGuardFamily === null) {
    if (input.latestStaleGuardValue !== null) {
      throw new ProblemEnvelopeBuildError(
        "latest_stale_guard_value must be null without stale_guard_family",
        ["PROBLEM_STALE_GUARD_VALUE_WITHOUT_FAMILY"],
      );
    }
    return;
  }
  if (
    input.latestStaleGuardValue === null ||
    (typeof input.latestStaleGuardValue === "string" &&
      input.latestStaleGuardValue.trim().length === 0)
  ) {
    throw new ProblemEnvelopeBuildError(
      "stale-view problem envelopes must echo the current stale guard value",
      ["PROBLEM_STALE_GUARD_VALUE_MISSING"],
    );
  }
}

function assertProblemEnvelopeShape(problem: ProblemEnvelope) {
  assertNonEmpty("problem_code", problem.problem_code);
  assertNonEmpty("title", problem.title);
  assertNonEmpty("detail", problem.detail);
  assertNonEmpty("correlation_id", problem.correlation_id);
  assertNonEmpty("manifest_id", problem.manifest_id);
  assertNonEmpty("latest_decision_bundle_ref", problem.latest_decision_bundle_ref);
  assertNonEmpty("latest_workspace_snapshot_ref", problem.latest_workspace_snapshot_ref);
  assertNonEmpty("latest_approval_pack_ref", problem.latest_approval_pack_ref);
  assertNonEmpty(
    "latest_client_portal_workspace_ref",
    problem.latest_client_portal_workspace_ref,
  );
  assertNonEmpty("latest_upload_session_ref", problem.latest_upload_session_ref);
  assertNonEmpty("latest_policy_snapshot_ref", problem.latest_policy_snapshot_ref);
  assertNonEmpty("latest_command_receipt_ref", problem.latest_command_receipt_ref);
  assertNonEmpty("latest_resume_token", problem.latest_resume_token);
  if (!/^[A-Z][A-Z0-9_]*$/.test(problem.problem_code)) {
    throw new ProblemEnvelopeBuildError("problem_code must be machine-stable", [
      "PROBLEM_CODE_INVALID",
    ]);
  }
  if (
    problem.actionability_state === "ACTION_AVAILABLE" &&
    problem.suggested_detail_surface_code !== null
  ) {
    throw new ProblemEnvelopeBuildError(
      "ACTION_AVAILABLE problem envelopes must not suggest a detail surface",
      ["PROBLEM_ACTION_AVAILABLE_SURFACE_INVALID"],
    );
  }
  if (
    problem.actionability_state === "NO_SAFE_ACTION" &&
    problem.suggested_detail_surface_code === null
  ) {
    throw new ProblemEnvelopeBuildError(
      "NO_SAFE_ACTION problem envelopes require a suggested detail surface",
      ["PROBLEM_NO_SAFE_ACTION_SURFACE_MISSING"],
    );
  }
  if (problem.rebase_required) {
    if (problem.mutation_precondition_binding_or_null === null) {
      throw new ProblemEnvelopeBuildError(
        "rebase problem envelopes require mutation_precondition_binding_or_null",
        ["PROBLEM_REBASE_BINDING_MISSING"],
      );
    }
    if (problem.latest_stability_contract_or_null === null) {
      throw new ProblemEnvelopeBuildError(
        "rebase problem envelopes require latest_stability_contract_or_null",
        ["PROBLEM_REBASE_STABILITY_CONTRACT_MISSING"],
      );
    }
    if (
      problem.stale_guard_family !== null &&
      !problem.mutation_precondition_binding_or_null.stale_guard_families.includes(
        problem.stale_guard_family,
      )
    ) {
      throw new ProblemEnvelopeBuildError(
        "stale_guard_family must stay inside mutation_precondition_binding_or_null.stale_guard_families",
        ["PROBLEM_STALE_GUARD_BINDING_MISMATCH"],
      );
    }
  } else if (
    problem.mutation_precondition_binding_or_null !== null ||
    problem.stale_guard_family !== null ||
    problem.latest_stale_guard_value !== null ||
    problem.latest_stability_contract_or_null !== null
  ) {
    throw new ProblemEnvelopeBuildError(
      "non-rebase problem envelopes cannot carry stale-view recovery state",
      ["PROBLEM_NON_REBASE_STALE_STATE_PRESENT"],
    );
  }
  assertStaleGuardValue({
    latestStaleGuardValue: problem.latest_stale_guard_value,
    staleGuardFamily: problem.stale_guard_family,
  });
}

export function buildProblemEnvelope(input: BuildProblemEnvelopeInput): ProblemEnvelope {
  const rebaseRequired = input.rebaseRequired ?? false;
  const restricted = restrictProblemRecoveryFamily({
    refs: input.recoveryRefs,
    restrictTo: input.restrictRecoveryFamilyTo,
  });
  const actionabilityState = input.actionabilityState ?? "NO_SAFE_ACTION";
  const suggestedDetailSurfaceCode =
    actionabilityState === "ACTION_AVAILABLE"
      ? null
      : selectPortalSafeDetailSurface({
          audience: input.audience ?? "STAFF",
          preferredSurface: input.suggestedDetailSurfaceCode ?? "FOCUS_LENS",
          recoveryFamily: restricted.family,
        });

  const problem: ProblemEnvelope = {
    actionability_state: actionabilityState,
    artifact_type: "ProblemEnvelope",
    correlation_id: input.correlationId,
    detail: input.detail,
    latest_approval_pack_ref: restricted.refs.latestApprovalPackRef,
    latest_client_portal_workspace_ref:
      restricted.refs.latestClientPortalWorkspaceRef,
    latest_command_receipt_ref: restricted.refs.latestCommandReceiptRef,
    latest_decision_bundle_ref: restricted.refs.latestDecisionBundleRef,
    latest_policy_snapshot_ref: restricted.refs.latestPolicySnapshotRef,
    latest_resume_token: restricted.refs.latestResumeToken,
    latest_stability_contract_or_null: rebaseRequired
      ? input.latestStabilityContractOrNull ?? null
      : null,
    latest_stale_guard_value: rebaseRequired
      ? input.latestStaleGuardValue ?? null
      : null,
    latest_upload_session_ref: restricted.refs.latestUploadSessionRef,
    latest_workspace_snapshot_ref: restricted.refs.latestWorkspaceSnapshotRef,
    manifest_id: input.manifestId ?? null,
    mutation_precondition_binding_or_null: rebaseRequired
      ? input.mutationPreconditionBindingOrNull ?? null
      : null,
    problem_code: input.problemCode,
    reason_codes: uniqueReasonCodes(input.reasonCodes),
    rebase_required: rebaseRequired,
    retryable: input.retryable,
    stale_guard_family: rebaseRequired ? input.staleGuardFamily ?? null : null,
    suggested_detail_surface_code: suggestedDetailSurfaceCode,
    title: input.title,
    truth_boundary_contract: createProblemTruthBoundaryContract(),
  };
  assertProblemEnvelopeShape(problem);
  return problem;
}

