import { createProblemTruthBoundaryContract } from "../../../../apps/control-plane-api/src/northbound/policy.ts";
import { stableJsonHash } from "../../../../packages/domain-kernel/src/primitives/hash.ts";
import type {
  MutationPreconditionBinding,
  ProblemEnvelope,
} from "../../../../packages/generated-models/src/generated/typescript/domain-workflow-and-filing.ts";
import type { RouteStabilityContract } from "../../../../packages/generated-models/src/generated/typescript/surface-and-experience.ts";

export const uploadSessionNoStoreHeaders = {
  "Cache-Control": "no-store",
} as const;

export type UploadSessionProblemKind =
  | "CHECKSUM_INVALID"
  | "CORRUPT"
  | "DUPLICATE_CONFLICT"
  | "HIDDEN"
  | "METHOD_INVALID"
  | "NOT_READY"
  | "REQUEST_INVALID"
  | "ROUTE_INVALID"
  | "STATE_INVALID";

export type UploadSessionProblemResponse = {
  body: ProblemEnvelope;
  headers: typeof uploadSessionNoStoreHeaders;
  status: number;
};

const problemDefaults = {
  CHECKSUM_INVALID: {
    detail: "The uploaded chunk did not match the supplied checksum or final manifest checksum.",
    problemCode: "UPLOAD_SESSION_CHECKSUM_INVALID",
    reasonCodes: ["UPLOAD_SESSION_CHECKSUM_INVALID"],
    retryable: true,
    status: 409,
    title: "Upload checksum is invalid",
  },
  CORRUPT: {
    detail: "The upload session exists but failed governed session validation.",
    problemCode: "UPLOAD_SESSION_CORRUPT",
    reasonCodes: ["UPLOAD_SESSION_CORRUPT"],
    retryable: false,
    status: 500,
    title: "Upload session is corrupt",
  },
  DUPLICATE_CONFLICT: {
    detail: "The requested frozen upload identity is already owned by a different session.",
    problemCode: "UPLOAD_SESSION_DUPLICATE_CONFLICT",
    reasonCodes: ["UPLOAD_SESSION_DUPLICATE_CONFLICT"],
    retryable: false,
    status: 409,
    title: "Upload session duplicate conflict",
  },
  HIDDEN: {
    detail: "No upload session is visible for this actor and client.",
    problemCode: "UPLOAD_SESSION_NOT_VISIBLE",
    reasonCodes: ["UPLOAD_SESSION_NOT_VISIBLE"],
    retryable: false,
    status: 404,
    title: "Upload session is not visible",
  },
  METHOD_INVALID: {
    detail: "The upload session endpoint does not support this HTTP method.",
    problemCode: "UPLOAD_SESSION_METHOD_INVALID",
    reasonCodes: ["HTTP_METHOD_INVALID"],
    retryable: false,
    status: 405,
    title: "Upload session method is invalid",
  },
  NOT_READY: {
    detail: "The upload session is not ready for the requested operation.",
    problemCode: "UPLOAD_SESSION_NOT_READY",
    reasonCodes: ["UPLOAD_SESSION_NOT_READY"],
    retryable: true,
    status: 404,
    title: "Upload session is not ready",
  },
  REQUEST_INVALID: {
    detail: "The upload session request body, route, or chunk window is invalid.",
    problemCode: "UPLOAD_SESSION_REQUEST_INVALID",
    reasonCodes: ["UPLOAD_SESSION_REQUEST_INVALID"],
    retryable: false,
    status: 400,
    title: "Upload session request is invalid",
  },
  ROUTE_INVALID: {
    detail: "The upload session route did not match a supported upload endpoint.",
    problemCode: "UPLOAD_SESSION_ROUTE_INVALID",
    reasonCodes: ["HTTP_ROUTE_INVALID"],
    retryable: false,
    status: 404,
    title: "Upload session route is invalid",
  },
  STATE_INVALID: {
    detail: "The upload session cannot accept the requested state transition.",
    problemCode: "UPLOAD_SESSION_STATE_INVALID",
    reasonCodes: ["UPLOAD_SESSION_STATE_INVALID"],
    retryable: false,
    status: 409,
    title: "Upload session state is invalid",
  },
} as const;

function unique(values: readonly string[]) {
  return [...new Set(values)];
}

function assertProblemEnvelopeShape(problem: ProblemEnvelope) {
  if (problem.artifact_type !== "ProblemEnvelope") {
    throw new Error("problem envelope artifact_type must be ProblemEnvelope");
  }
  if (!/^[A-Z][A-Z0-9_]*$/.test(problem.problem_code)) {
    throw new Error("problem envelope problem_code is invalid");
  }
  if (problem.reason_codes.length === 0) {
    throw new Error("problem envelope requires reason_codes");
  }
}

function uploadSessionReceiptRef(input: {
  correlationId: string;
  latestUploadSessionRef: string | null | undefined;
}) {
  if (input.latestUploadSessionRef === null || input.latestUploadSessionRef === undefined) {
    return null;
  }
  return `receipt.upload-session.${stableJsonHash({
    contract_version: "UPLOAD_SESSION_PROBLEM_RECEIPT_REF_V1",
    correlation_id: input.correlationId,
    latest_upload_session_ref: input.latestUploadSessionRef,
  }).slice(0, 24)}`;
}

function uploadSessionMutationPreconditionBinding(): MutationPreconditionBinding {
  return {
    invalidates_on_visibility_shift: true,
    profile_code: "CLIENT_PORTAL_ROUTE_MUTATION",
    required_guard_fields: ["if_match_client_portal_workspace_version"],
    requires_live_freshness: true,
    stale_guard_families: ["CLIENT_PORTAL_WORKSPACE_VERSION"],
    target_scope_classes: ["MANIFEST", "WORK_ITEM"],
  };
}

function uploadSessionRouteStabilityContract(input: {
  latestUploadSessionRef: string | null | undefined;
  latestStaleGuardValue: number;
}): RouteStabilityContract {
  const viewGuardRef = `view-guard.upload-session.${input.latestUploadSessionRef ?? "unallocated"}`;
  const guardVectorComponents = {
    client_portal_workspace_version_or_null: input.latestStaleGuardValue,
    customer_thread_head_or_null: null,
    decision_bundle_hash_or_null: null,
    dependency_topology_hash_or_null: null,
    frame_epoch_or_null: null,
    internal_thread_head_or_null: null,
    policy_snapshot_hash_or_null: null,
    request_state_version_or_null: null,
    shell_stability_token_or_null: null,
    simulation_basis_hash_or_null: null,
    view_guard_ref_or_null: viewGuardRef,
    work_item_version_or_null: null,
  };
  return {
    guard_vector_components: guardVectorComponents,
    guard_vector_hash: stableJsonHash({
      contract_version: "UPLOAD_SESSION_ROUTE_STABILITY_GUARD_V1",
      guard_vector_components: guardVectorComponents,
    }),
    last_published_sequence_or_null: null,
    publication_generation: input.latestStaleGuardValue,
    resume_capability: "SNAPSHOT_ONLY",
    resume_token_or_null: null,
    route_scope_class: "CLIENT_PORTAL_ROUTE",
  };
}

export function buildUploadSessionProblemEnvelope(input: {
  clientId: string | null;
  correlationId: string;
  detailOverride?: string | null;
  kind: UploadSessionProblemKind;
  latestCommandReceiptRef?: string | null;
  latestStabilityContract?: RouteStabilityContract | null;
  latestStaleGuardValue?: number | null;
  latestUploadSessionRef?: string | null;
  mutationPreconditionBinding?: MutationPreconditionBinding | null;
  reasonCodes?: readonly string[];
  rebaseRequired?: boolean;
  tenantId: string | null;
}): UploadSessionProblemResponse {
  const defaults = problemDefaults[input.kind];
  const rebaseRequired =
    input.rebaseRequired ??
    (input.latestUploadSessionRef !== null && input.latestUploadSessionRef !== undefined);
  const latestStaleGuardValue = input.latestStaleGuardValue ?? 0;
  const actionabilityState = defaults.retryable ? "ACTION_AVAILABLE" : "NO_SAFE_ACTION";
  const latestCommandReceiptRef =
    input.latestCommandReceiptRef ??
    uploadSessionReceiptRef({
      correlationId: input.correlationId,
      latestUploadSessionRef: input.latestUploadSessionRef,
    });
  const problem: ProblemEnvelope = {
    actionability_state: actionabilityState,
    artifact_type: "ProblemEnvelope",
    correlation_id: input.correlationId,
    detail: input.detailOverride ?? defaults.detail,
    latest_approval_pack_ref: null,
    latest_client_portal_workspace_ref: null,
    latest_command_receipt_ref: latestCommandReceiptRef,
    latest_decision_bundle_ref: null,
    latest_policy_snapshot_ref: null,
    latest_resume_token: null,
    latest_stability_contract_or_null: rebaseRequired
      ? (input.latestStabilityContract ??
        uploadSessionRouteStabilityContract({
          latestStaleGuardValue,
          latestUploadSessionRef: input.latestUploadSessionRef,
        }))
      : null,
    latest_stale_guard_value: rebaseRequired ? latestStaleGuardValue : null,
    latest_upload_session_ref: input.latestUploadSessionRef ?? null,
    latest_workspace_snapshot_ref: null,
    manifest_id: input.tenantId,
    mutation_precondition_binding_or_null: rebaseRequired
      ? (input.mutationPreconditionBinding ?? uploadSessionMutationPreconditionBinding())
      : null,
    problem_code: defaults.problemCode,
    reason_codes: unique(input.reasonCodes ?? defaults.reasonCodes),
    rebase_required: rebaseRequired,
    retryable: defaults.retryable,
    stale_guard_family: rebaseRequired ? "CLIENT_PORTAL_WORKSPACE_VERSION" : null,
    suggested_detail_surface_code: actionabilityState === "ACTION_AVAILABLE" ? null : "FILES",
    title: defaults.title,
    truth_boundary_contract: createProblemTruthBoundaryContract(),
  };
  assertProblemEnvelopeShape(problem);
  return {
    body: problem,
    headers: uploadSessionNoStoreHeaders,
    status: defaults.status,
  };
}
