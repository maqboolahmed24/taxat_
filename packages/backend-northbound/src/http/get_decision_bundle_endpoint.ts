import {
  DecisionBundleRepository,
  type StoredDecisionBundleRecord,
} from "../../../backend-compute/src/repositories/decision_bundle_repository.ts";
import type { DecisionBundleRecord } from "../../../backend-compute/src/models/decision_bundle.ts";
import type { NorthboundActorContext } from "../../../../apps/control-plane-api/src/northbound/policy.ts";
import type { ProblemEnvelope } from "../../../../packages/generated-models/src/generated/typescript/domain-workflow-and-filing.ts";
import { getLatestDecisionBundleForManifest } from "../query/get_latest_decision_bundle_for_manifest.ts";
import { applyDecisionBundleConditionalRequest } from "../services/apply_decision_bundle_conditional_request.ts";
import {
  buildDecisionBundleNotReadyProblem,
  decisionBundleNoStoreHeaders,
  type DecisionBundleProblemResponse,
} from "../services/build_decision_bundle_not_ready_problem.ts";
import {
  DecisionBundlePublicationError,
  validateDecisionBundlePublication,
} from "../services/validate_decision_bundle_publication.ts";

export type DecisionBundleReadAuthorization =
  | {
      authorized: true;
      reasonCodes?: string[];
    }
  | {
      authorized: false;
      hidden?: true;
      reasonCodes?: string[];
    };

export type DecisionBundleReadAuthorizer = (input: {
  actorContext: NorthboundActorContext;
  manifestId: string;
  storedDecisionBundle: StoredDecisionBundleRecord | null;
}) => DecisionBundleReadAuthorization | Promise<DecisionBundleReadAuthorization>;

export type GetDecisionBundleEndpointRequest = {
  actorContext: NorthboundActorContext;
  correlationId?: string;
  ifNoneMatch?: string | null;
  manifestId?: string;
  method?: string;
  path?: string;
};

export type GetDecisionBundleEndpointResponse =
  | {
      body: DecisionBundleRecord;
      headers: typeof decisionBundleNoStoreHeaders & {
        ETag: string;
      };
      status: 200;
    }
  | {
      body: null;
      headers: typeof decisionBundleNoStoreHeaders & {
        ETag: string;
      };
      status: 304;
    }
  | {
      body: ProblemEnvelope;
      headers: DecisionBundleProblemResponse["headers"];
      status: number;
    };

export type GetDecisionBundleEndpointDependencies = {
  authorizeRead?: DecisionBundleReadAuthorizer;
  decisionBundleRepository: DecisionBundleRepository;
};

const decisionBundlePathPrefix = "/v1/manifests/";
const decisionBundlePathSuffix = "/decision-bundle";

function correlationId(request: GetDecisionBundleEndpointRequest) {
  return request.correlationId ?? `corr.${Date.now()}`;
}

function manifestIdFromPath(path: string) {
  if (!path.startsWith(decisionBundlePathPrefix) || !path.endsWith(decisionBundlePathSuffix)) {
    return null;
  }
  const encoded = path.slice(
    decisionBundlePathPrefix.length,
    path.length - decisionBundlePathSuffix.length,
  );
  if (encoded.length === 0 || encoded.includes("/")) {
    return null;
  }
  try {
    const manifestId = decodeURIComponent(encoded);
    return manifestId.length > 0 ? manifestId : null;
  } catch {
    return null;
  }
}

function resolveManifestId(request: GetDecisionBundleEndpointRequest) {
  const pathManifestId =
    request.path === undefined ? undefined : manifestIdFromPath(request.path);
  if (request.path !== undefined && pathManifestId === null) {
    return null;
  }
  if (
    request.manifestId !== undefined &&
    pathManifestId !== undefined &&
    request.manifestId !== pathManifestId
  ) {
    return null;
  }
  return request.manifestId ?? pathManifestId ?? null;
}

async function authorize(input: {
  dependencies: GetDecisionBundleEndpointDependencies;
  manifestId: string;
  request: GetDecisionBundleEndpointRequest;
  storedDecisionBundle: StoredDecisionBundleRecord | null;
}) {
  const authorizer =
    input.dependencies.authorizeRead ??
    (() =>
      ({
        authorized: true,
        reasonCodes: ["DECISION_BUNDLE_READ_AUTHORIZED"],
      }) satisfies DecisionBundleReadAuthorization);
  return authorizer({
    actorContext: input.request.actorContext,
    manifestId: input.manifestId,
    storedDecisionBundle: input.storedDecisionBundle,
  });
}

function etagHeaders(etag: string) {
  return {
    ...decisionBundleNoStoreHeaders,
    ETag: etag,
  };
}

export async function getDecisionBundleEndpoint(
  request: GetDecisionBundleEndpointRequest,
  dependencies: GetDecisionBundleEndpointDependencies,
): Promise<GetDecisionBundleEndpointResponse> {
  const requestCorrelationId = correlationId(request);

  if (request.method !== undefined && request.method !== "GET") {
    return buildDecisionBundleNotReadyProblem({
      correlationId: requestCorrelationId,
      kind: "METHOD_INVALID",
      manifestId: null,
    });
  }

  const manifestId = resolveManifestId(request);
  if (manifestId === null) {
    return buildDecisionBundleNotReadyProblem({
      correlationId: requestCorrelationId,
      kind: "ROUTE_INVALID",
      manifestId: null,
    });
  }

  const storedDecisionBundle = await getLatestDecisionBundleForManifest({
    decisionBundleRepository: dependencies.decisionBundleRepository,
    manifestId,
  });

  const authorization = await authorize({
    dependencies,
    manifestId,
    request,
    storedDecisionBundle,
  });
  if (!authorization.authorized) {
    return buildDecisionBundleNotReadyProblem({
      correlationId: requestCorrelationId,
      kind: "HIDDEN",
      manifestId,
    });
  }

  if (storedDecisionBundle === null) {
    return buildDecisionBundleNotReadyProblem({
      correlationId: requestCorrelationId,
      kind: "NOT_READY",
      manifestId,
    });
  }

  try {
    const publication = validateDecisionBundlePublication({
      stored: storedDecisionBundle,
    });
    const conditional = applyDecisionBundleConditionalRequest({
      currentDecisionBundleHash: publication.decisionBundleHash,
      ifNoneMatch: request.ifNoneMatch,
    });
    if (conditional.status === "NOT_MODIFIED") {
      return {
        body: null,
        headers: etagHeaders(conditional.etag),
        status: 304,
      };
    }
    return {
      body: publication.record,
      headers: etagHeaders(conditional.etag),
      status: 200,
    };
  } catch (error) {
    if (error instanceof DecisionBundlePublicationError) {
      return buildDecisionBundleNotReadyProblem({
        correlationId: requestCorrelationId,
        kind: "CORRUPT",
        manifestId,
        reasonCodes: error.reasonCodes,
      });
    }
    throw error;
  }
}

export function createGetDecisionBundleEndpointDependencies(input: {
  authorizeRead?: DecisionBundleReadAuthorizer;
  decisionBundleRepository?: DecisionBundleRepository;
} = {}): GetDecisionBundleEndpointDependencies {
  const dependencies = {
    decisionBundleRepository:
      input.decisionBundleRepository ?? new DecisionBundleRepository(),
  } as GetDecisionBundleEndpointDependencies;
  if (input.authorizeRead !== undefined) {
    dependencies.authorizeRead = input.authorizeRead;
  }
  return dependencies;
}
