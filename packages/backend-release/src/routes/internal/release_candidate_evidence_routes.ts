import {
  getDeploymentReleaseBundle,
  type DeploymentReleaseEvidenceBundle,
} from "../../queries/get_deployment_release_bundle.ts";
import {
  getReleaseCandidateIdentityBundle,
  type ReleaseCandidateIdentityBundle,
  type ReleaseEvidenceBundleSource,
  ReleaseEvidenceQueryError,
} from "../../queries/get_release_candidate_identity_bundle.ts";
import {
  getReleaseVerificationManifestBundle,
  type ReleaseVerificationManifestBundle,
} from "../../queries/get_release_verification_manifest_bundle.ts";

export const getReleaseCandidateIdentityBundleRoutePath =
  "/internal/release-evidence/candidate-identity-bundle" as const;
export const getReleaseVerificationManifestBundleRoutePath =
  "/internal/release-evidence/verification-manifest-bundle" as const;
export const getDeploymentReleaseBundleRoutePath =
  "/internal/release-evidence/deployment-release-bundle" as const;

export type InternalReleaseEvidenceRoutePath =
  | typeof getDeploymentReleaseBundleRoutePath
  | typeof getReleaseCandidateIdentityBundleRoutePath
  | typeof getReleaseVerificationManifestBundleRoutePath;

export const releaseEvidenceNoStoreHeaders = {
  "Cache-Control": "no-store",
} as const;

export type InternalReleaseEvidenceRouteRequest = {
  correlationId?: string;
  ifNoneMatch?: string | null;
  method?: string;
  path?: string;
  principalClass?: string | null;
  query?: Record<string, string | null | undefined>;
};

export type InternalReleaseEvidenceProblemEnvelope = {
  actionability_state: "NO_SAFE_ACTION";
  artifact_type: "ProblemEnvelope";
  correlation_id: string;
  detail: string;
  latest_approval_pack_ref: null;
  latest_client_portal_workspace_ref: null;
  latest_command_receipt_ref: null;
  latest_decision_bundle_ref: null;
  latest_policy_snapshot_ref: null;
  latest_resume_token: null;
  latest_stability_contract_or_null: null;
  latest_stale_guard_value: null;
  latest_upload_session_ref: null;
  latest_workspace_snapshot_ref: null;
  manifest_id: null;
  mutation_precondition_binding_or_null: null;
  problem_code: string;
  reason_codes: string[];
  rebase_required: false;
  retryable: false;
  stale_guard_family: null;
  suggested_detail_surface_code: "AUDIT_TRAIL";
  title: string;
  truth_boundary_contract: {
    artifact_role: "BOUNDARY_RECEIPT";
    authoritative_record_families: string[];
    authoritative_source_policy: "DURABLE_COMMAND_RESULTS_ONLY";
    contract_version: "COMMAND_TRUTH_BOUNDARY_V1";
    durable_writeback_policy: "APPEND_ONLY_BOUNDARY_EVIDENCE";
    observable_projection_families: string[];
    projection_input_policy: "STALE_GUARDS_AND_RECOVERY_MIRRORS_ONLY";
    recovery_basis_policy: "RECEIPT_PLUS_DURABLE_RESULTS_ONLY";
  };
};

export type InternalReleaseEvidenceRouteSuccess =
  | DeploymentReleaseEvidenceBundle
  | ReleaseCandidateIdentityBundle
  | ReleaseVerificationManifestBundle;

export type InternalReleaseEvidenceRouteResponse =
  | {
      body: InternalReleaseEvidenceRouteSuccess;
      headers: typeof releaseEvidenceNoStoreHeaders & { ETag: string };
      status: 200;
    }
  | {
      body: null;
      headers: typeof releaseEvidenceNoStoreHeaders & { ETag: string };
      status: 304;
    }
  | {
      body: InternalReleaseEvidenceProblemEnvelope;
      headers: typeof releaseEvidenceNoStoreHeaders;
      status: 400 | 404 | 405 | 409 | 500;
    };

export type InternalReleaseEvidenceReadAuthorizationInput = {
  principalClass: string | null;
};

export type InternalReleaseEvidenceReadAuthorizationResult =
  | { authorized: true }
  | { authorized: false; reasonCodes: string[] };

export type InternalReleaseEvidenceReadAuthorizer = (
  input: InternalReleaseEvidenceReadAuthorizationInput,
) =>
  | InternalReleaseEvidenceReadAuthorizationResult
  | Promise<InternalReleaseEvidenceReadAuthorizationResult>;

export type InternalReleaseEvidenceRouteDependencies = {
  authorizeRead?: InternalReleaseEvidenceReadAuthorizer;
  source: ReleaseEvidenceBundleSource;
};

export type InternalReleaseEvidenceRouteHandlers = {
  candidateIdentityBundle: (
    request: InternalReleaseEvidenceRouteRequest,
  ) => Promise<InternalReleaseEvidenceRouteResponse>;
  deploymentReleaseBundle: (
    request: InternalReleaseEvidenceRouteRequest,
  ) => Promise<InternalReleaseEvidenceRouteResponse>;
  verificationManifestBundle: (
    request: InternalReleaseEvidenceRouteRequest,
  ) => Promise<InternalReleaseEvidenceRouteResponse>;
};

type AnyInternalReleaseEvidenceRouteHandler = (
  request: InternalReleaseEvidenceRouteRequest,
) => Promise<InternalReleaseEvidenceRouteResponse>;

export type InternalReleaseEvidenceRouteRegistry =
  | {
      get: (
        path: InternalReleaseEvidenceRoutePath,
        handler: AnyInternalReleaseEvidenceRouteHandler,
      ) => void;
    }
  | {
      register: (route: {
        handler: AnyInternalReleaseEvidenceRouteHandler;
        method: "GET";
        path: InternalReleaseEvidenceRoutePath;
      }) => void;
    };

function defaultAuthorizeRead(
  input: InternalReleaseEvidenceReadAuthorizationInput,
): InternalReleaseEvidenceReadAuthorizationResult {
  if (
    input.principalClass === "INTERNAL_ADMIN" ||
    input.principalClass === "RELEASE_AUTOMATION"
  ) {
    return { authorized: true };
  }
  return {
    authorized: false,
    reasonCodes: ["RELEASE_EVIDENCE_INTERNAL_ADMIN_REQUIRED"],
  };
}

function problem(input: {
  correlationId: string;
  detail: string;
  problemCode: string;
  reasonCodes: readonly string[];
  status: 400 | 404 | 405 | 409 | 500;
  title: string;
}): InternalReleaseEvidenceRouteResponse {
  return {
    body: {
      actionability_state: "NO_SAFE_ACTION",
      artifact_type: "ProblemEnvelope",
      correlation_id: input.correlationId,
      detail: input.detail,
      latest_approval_pack_ref: null,
      latest_client_portal_workspace_ref: null,
      latest_command_receipt_ref: null,
      latest_decision_bundle_ref: null,
      latest_policy_snapshot_ref: null,
      latest_resume_token: null,
      latest_stability_contract_or_null: null,
      latest_stale_guard_value: null,
      latest_upload_session_ref: null,
      latest_workspace_snapshot_ref: null,
      manifest_id: null,
      mutation_precondition_binding_or_null: null,
      problem_code: input.problemCode,
      reason_codes: [...new Set(input.reasonCodes)],
      rebase_required: false,
      retryable: false,
      stale_guard_family: null,
      suggested_detail_surface_code: "AUDIT_TRAIL",
      title: input.title,
      truth_boundary_contract: {
        artifact_role: "BOUNDARY_RECEIPT",
        authoritative_record_families: [
          "RUN_MANIFEST",
          "GOVERNANCE_DOMAIN_OBJECT",
          "AUDIT_EVENT",
          "API_COMMAND_RECEIPT",
        ],
        authoritative_source_policy: "DURABLE_COMMAND_RESULTS_ONLY",
        contract_version: "COMMAND_TRUTH_BOUNDARY_V1",
        durable_writeback_policy: "APPEND_ONLY_BOUNDARY_EVIDENCE",
        observable_projection_families: ["DECISION_BUNDLE"],
        projection_input_policy: "STALE_GUARDS_AND_RECOVERY_MIRRORS_ONLY",
        recovery_basis_policy: "RECEIPT_PLUS_DURABLE_RESULTS_ONLY",
      },
    },
    headers: releaseEvidenceNoStoreHeaders,
    status: input.status,
  };
}

function correlationId(request: InternalReleaseEvidenceRouteRequest) {
  return request.correlationId ?? `corr.release-evidence.${Date.now()}`;
}

function queryValue(request: InternalReleaseEvidenceRouteRequest, key: string) {
  const direct = request.query?.[key];
  if (typeof direct === "string" && direct.trim().length > 0) {
    return direct;
  }
  if (request.path === undefined) {
    return null;
  }
  const url = new URL(request.path, "http://internal.taxat.local");
  const value = url.searchParams.get(key);
  return value === null || value.trim().length === 0 ? null : value;
}

function success(
  request: InternalReleaseEvidenceRouteRequest,
  body: InternalReleaseEvidenceRouteSuccess,
): InternalReleaseEvidenceRouteResponse {
  if (request.ifNoneMatch === body.etag) {
    return {
      body: null,
      headers: {
        ...releaseEvidenceNoStoreHeaders,
        ETag: body.etag,
      },
      status: 304,
    };
  }
  return {
    body,
    headers: {
      ...releaseEvidenceNoStoreHeaders,
      ETag: body.etag,
    },
    status: 200,
  };
}

function statusForError(error: unknown): 400 | 404 | 409 | 500 {
  if (error instanceof ReleaseEvidenceQueryError) {
    if (error.code === "RELEASE_EVIDENCE_FIELD_INVALID") {
      return 400;
    }
    if (error.code === "RELEASE_EVIDENCE_NOT_FOUND") {
      return 404;
    }
    return 409;
  }
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string" &&
    (error as { code: string }).code.endsWith("_NOT_FOUND")
  ) {
    return 404;
  }
  return 500;
}

async function runInternalReleaseEvidenceEndpoint(input: {
  dependencies: InternalReleaseEvidenceRouteDependencies;
  load: () => Promise<InternalReleaseEvidenceRouteSuccess>;
  request: InternalReleaseEvidenceRouteRequest;
}) {
  const requestCorrelationId = correlationId(input.request);
  if (input.request.method !== undefined && input.request.method !== "GET") {
    return problem({
      correlationId: requestCorrelationId,
      detail: "Internal release evidence routes are read-only.",
      problemCode: "RELEASE_EVIDENCE_METHOD_INVALID",
      reasonCodes: ["RELEASE_EVIDENCE_READ_ONLY_ROUTE"],
      status: 405,
      title: "Method not allowed",
    });
  }
  const authorizeRead = input.dependencies.authorizeRead ?? defaultAuthorizeRead;
  const authorization = await authorizeRead({
    principalClass: input.request.principalClass ?? null,
  });
  if (!authorization.authorized) {
    return problem({
      correlationId: requestCorrelationId,
      detail: "The release evidence route is internal and admin-only.",
      problemCode: "RELEASE_EVIDENCE_NOT_VISIBLE",
      reasonCodes: authorization.reasonCodes,
      status: 404,
      title: "Release evidence not visible",
    });
  }
  try {
    return success(input.request, await input.load());
  } catch (error) {
    const status = statusForError(error);
    return problem({
      correlationId: requestCorrelationId,
      detail: error instanceof Error ? error.message : String(error),
      problemCode:
        status === 404
          ? "RELEASE_EVIDENCE_NOT_FOUND"
          : status === 409
            ? "RELEASE_EVIDENCE_BINDING_CONFLICT"
            : status === 400
              ? "RELEASE_EVIDENCE_QUERY_INVALID"
              : "RELEASE_EVIDENCE_QUERY_FAILED",
      reasonCodes: [
        error instanceof ReleaseEvidenceQueryError
          ? error.code
          : "RELEASE_EVIDENCE_QUERY_ERROR",
      ],
      status,
      title: "Release evidence query failed",
    });
  }
}

export async function getInternalReleaseCandidateIdentityBundleEndpoint(
  request: InternalReleaseEvidenceRouteRequest,
  dependencies: InternalReleaseEvidenceRouteDependencies,
) {
  return runInternalReleaseEvidenceEndpoint({
    dependencies,
    load: async () => {
      const candidateIdentityHash = queryValue(request, "candidate_identity_hash");
      if (candidateIdentityHash === null) {
        throw new ReleaseEvidenceQueryError(
          "RELEASE_EVIDENCE_FIELD_INVALID",
          "candidate_identity_hash query parameter is required",
        );
      }
      return getReleaseCandidateIdentityBundle({
        candidate_identity_hash: candidateIdentityHash,
        compatibility_gate_hash: queryValue(request, "compatibility_gate_hash"),
        source: dependencies.source,
      });
    },
    request,
  });
}

export async function getInternalReleaseVerificationManifestBundleEndpoint(
  request: InternalReleaseEvidenceRouteRequest,
  dependencies: InternalReleaseEvidenceRouteDependencies,
) {
  return runInternalReleaseEvidenceEndpoint({
    dependencies,
    load: async () => {
      const verificationManifestId = queryValue(request, "verification_manifest_id");
      if (verificationManifestId === null) {
        throw new ReleaseEvidenceQueryError(
          "RELEASE_EVIDENCE_FIELD_INVALID",
          "verification_manifest_id query parameter is required",
        );
      }
      return getReleaseVerificationManifestBundle({
        source: dependencies.source,
        verification_manifest_id: verificationManifestId,
      });
    },
    request,
  });
}

export async function getInternalDeploymentReleaseBundleEndpoint(
  request: InternalReleaseEvidenceRouteRequest,
  dependencies: InternalReleaseEvidenceRouteDependencies,
) {
  return runInternalReleaseEvidenceEndpoint({
    dependencies,
    load: async () => {
      const releaseId = queryValue(request, "release_id");
      if (releaseId === null) {
        throw new ReleaseEvidenceQueryError(
          "RELEASE_EVIDENCE_FIELD_INVALID",
          "release_id query parameter is required",
        );
      }
      return getDeploymentReleaseBundle({
        release_id: releaseId,
        source: dependencies.source,
      });
    },
    request,
  });
}

function registerGet(
  registry: InternalReleaseEvidenceRouteRegistry,
  path: InternalReleaseEvidenceRoutePath,
  handler: AnyInternalReleaseEvidenceRouteHandler,
) {
  if ("get" in registry) {
    registry.get(path, handler);
    return;
  }
  registry.register({ handler, method: "GET", path });
}

export function registerInternalReleaseCandidateEvidenceRoutes(
  registry: InternalReleaseEvidenceRouteRegistry,
  dependencies: InternalReleaseEvidenceRouteDependencies,
) {
  const handlers = {
    candidateIdentityBundle: (request) =>
      getInternalReleaseCandidateIdentityBundleEndpoint(request, dependencies),
    deploymentReleaseBundle: (request) =>
      getInternalDeploymentReleaseBundleEndpoint(request, dependencies),
    verificationManifestBundle: (request) =>
      getInternalReleaseVerificationManifestBundleEndpoint(request, dependencies),
  } satisfies InternalReleaseEvidenceRouteHandlers;

  registerGet(
    registry,
    getReleaseCandidateIdentityBundleRoutePath,
    handlers.candidateIdentityBundle,
  );
  registerGet(
    registry,
    getReleaseVerificationManifestBundleRoutePath,
    handlers.verificationManifestBundle,
  );
  registerGet(
    registry,
    getDeploymentReleaseBundleRoutePath,
    handlers.deploymentReleaseBundle,
  );
  return handlers;
}
