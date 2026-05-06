import type {
  MutationPreconditionBinding,
  ProblemEnvelope,
} from "../../../../packages/generated-models/src/generated/typescript/domain-workflow-and-filing.ts";
import type { RouteStabilityContract } from "../../../../packages/generated-models/src/generated/typescript/surface-and-experience.ts";
import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import {
  buildProblemEnvelope,
  northboundNoStoreHeaders,
  type BuildProblemEnvelopeInput,
} from "./build_problem_envelope.ts";
import type { ProblemRecoveryRefs } from "./restrict_problem_recovery_family.ts";

export type RebaseProblemScope = "MANIFEST_EXPERIENCE" | "WORKSPACE";

export type RebaseRequiredProblemResponse = {
  body: ProblemEnvelope;
  headers: typeof northboundNoStoreHeaders;
  status: 409;
};

export const manifestRenderFrameBinding = {
  invalidates_on_visibility_shift: false,
  profile_code: "MANIFEST_RENDER_FRAME",
  required_guard_fields: [
    "if_match_decision_bundle_hash",
    "if_match_shell_stability_token",
    "if_match_frame_epoch",
  ],
  requires_live_freshness: true,
  stale_guard_families: ["DECISION_BUNDLE_HASH", "SHELL_STABILITY_TOKEN", "FRAME_EPOCH"],
  target_scope_classes: ["MANIFEST"],
} satisfies MutationPreconditionBinding;

export const workspaceStreamRebaseBinding = {
  invalidates_on_visibility_shift: true,
  profile_code: "WORK_ITEM_STATE_MUTATION",
  required_guard_fields: [
    "if_match_work_item_version",
    "if_match_shell_stability_token",
  ],
  requires_live_freshness: true,
  stale_guard_families: ["WORK_ITEM_VERSION", "SHELL_STABILITY_TOKEN"],
  target_scope_classes: ["WORK_ITEM"],
} satisfies MutationPreconditionBinding;

function defaultBinding(scope: RebaseProblemScope) {
  return scope === "MANIFEST_EXPERIENCE"
    ? manifestRenderFrameBinding
    : workspaceStreamRebaseBinding;
}

function recoveryRefs(input: {
  correlationId: string;
  latestCommandReceiptRef?: string | null;
  latestDecisionBundleRef?: string | null;
  latestResumeToken?: string | null;
  latestWorkspaceSnapshotRef?: string | null;
  scope: RebaseProblemScope;
}) {
  const refs: Partial<ProblemRecoveryRefs> = {
    latestCommandReceiptRef: input.latestCommandReceiptRef ?? null,
  };
  if (input.scope === "MANIFEST_EXPERIENCE") {
    refs.latestResumeToken = input.latestResumeToken ?? null;
    if (input.latestCommandReceiptRef !== null && input.latestCommandReceiptRef !== undefined) {
      refs.latestDecisionBundleRef = input.latestDecisionBundleRef ?? null;
    }
    return refs;
  }
  if (
    input.latestWorkspaceSnapshotRef !== null &&
    input.latestWorkspaceSnapshotRef !== undefined
  ) {
    refs.latestWorkspaceSnapshotRef = input.latestWorkspaceSnapshotRef;
    refs.latestCommandReceiptRef =
      input.latestCommandReceiptRef ??
      `stream-recovery-receipt://${stableJsonHash({
        correlation_id: input.correlationId,
        recovery_family: "WORKSPACE_SNAPSHOT",
        workspace_snapshot_ref: input.latestWorkspaceSnapshotRef,
      }).slice(0, 24)}`;
    return refs;
  }
  refs.latestResumeToken = input.latestResumeToken ?? null;
  return refs;
}

function assertRecoveryBasis(input: {
  refs: Partial<ProblemRecoveryRefs>;
  scope: RebaseProblemScope;
}) {
  if (
    input.refs.latestResumeToken == null &&
    input.refs.latestDecisionBundleRef == null &&
    input.refs.latestWorkspaceSnapshotRef == null
  ) {
    throw new Error(
      `${input.scope} rebase problems require a replacement resume token or receipt-backed recovery ref`,
    );
  }
}

export function buildRebaseRequiredProblem(input: {
  audience?: BuildProblemEnvelopeInput["audience"];
  correlationId: string;
  detail?: string;
  latestCommandReceiptRef?: string | null;
  latestDecisionBundleRef?: string | null;
  latestResumeToken?: string | null;
  latestStabilityContract: RouteStabilityContract;
  latestStaleGuardValue: NonNullable<ProblemEnvelope["latest_stale_guard_value"]>;
  latestWorkspaceSnapshotRef?: string | null;
  manifestId?: string | null;
  mutationPreconditionBinding?: MutationPreconditionBinding;
  reasonCodes: readonly string[];
  scope: RebaseProblemScope;
  staleGuardFamily: NonNullable<ProblemEnvelope["stale_guard_family"]>;
  suggestedDetailSurfaceCode?: ProblemEnvelope["suggested_detail_surface_code"];
  title?: string;
}): RebaseRequiredProblemResponse {
  const refs = recoveryRefs(input);
  assertRecoveryBasis({ refs, scope: input.scope });
  return {
    body: buildProblemEnvelope({
      audience: input.audience,
      correlationId: input.correlationId,
      detail:
        input.detail ??
        "The route generation, epoch, shell stability, or stream history window changed and must be rebased before retry.",
      latestStabilityContractOrNull: input.latestStabilityContract,
      latestStaleGuardValue: input.latestStaleGuardValue,
      manifestId: input.manifestId,
      mutationPreconditionBindingOrNull:
        input.mutationPreconditionBinding ?? defaultBinding(input.scope),
      problemCode: "REBASE_REQUIRED",
      reasonCodes: input.reasonCodes,
      rebaseRequired: true,
      recoveryRefs: refs,
      retryable: false,
      staleGuardFamily: input.staleGuardFamily,
      suggestedDetailSurfaceCode: input.suggestedDetailSurfaceCode ?? "FOCUS_LENS",
      title: input.title ?? "Rebase is required",
    }),
    headers: northboundNoStoreHeaders,
    status: 409,
  };
}
