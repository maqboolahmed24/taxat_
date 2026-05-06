import type { NorthboundActorContext } from "../../../../apps/control-plane-api/src/northbound/policy.ts";
import type { ProblemEnvelope } from "../../../../packages/generated-models/src/generated/typescript/domain-workflow-and-filing.ts";
import {
  getLatestLowNoiseExperienceFrame,
  LowNoiseExperienceFrameRepository,
  type LowNoiseExperienceFrameRecord,
  type LowNoiseExperienceFrameRepositoryLike,
  type StoredLowNoiseExperienceFrameRecord,
} from "../query/get_latest_low_noise_experience_frame.ts";
import {
  buildExperienceSnapshotNotReadyProblem,
  experienceSnapshotNoStoreHeaders,
  type ExperienceSnapshotProblemResponse,
} from "../services/build_experience_snapshot_not_ready_problem.ts";
import { buildManifestRouteStabilityContract } from "../services/build_manifest_route_stability_contract.ts";
import { buildManifestStreamRecoveryContract } from "../services/build_manifest_stream_recovery_contract.ts";
import {
  issueManifestResumeToken,
  manifestResumeBindingFromActor,
  type ManifestResumeBinding,
} from "../services/issue_manifest_resume_token.ts";
import {
  LowNoiseExperiencePublicationError,
  validateLowNoiseExperiencePublication,
} from "../services/validate_low_noise_experience_publication.ts";

export type ExperienceSnapshotReadAuthorization =
  | {
      authorized: true;
      reasonCodes?: string[];
    }
  | {
      authorized: false;
      hidden?: true;
      reasonCodes?: string[];
    };

export type ExperienceSnapshotReadAuthorizer = (input: {
  actorContext: NorthboundActorContext;
  manifestId: string;
  storedFrame: StoredLowNoiseExperienceFrameRecord | null;
}) => ExperienceSnapshotReadAuthorization | Promise<ExperienceSnapshotReadAuthorization>;

export type GetExperienceSnapshotEndpointRequest = {
  actorContext: NorthboundActorContext;
  correlationId?: string;
  manifestId?: string;
  method?: string;
  path?: string;
  resumeTokenIssuedAt?: string;
  resumeTokenNonce?: string;
  schemaCompatibilityRef?: string;
};

export type GetExperienceSnapshotEndpointResponse =
  | {
      body: LowNoiseExperienceFrameRecord;
      headers: typeof experienceSnapshotNoStoreHeaders;
      status: 200;
    }
  | {
      body: ProblemEnvelope;
      headers: ExperienceSnapshotProblemResponse["headers"];
      status: number;
    };

export type GetExperienceSnapshotEndpointDependencies = {
  authorizeRead?: ExperienceSnapshotReadAuthorizer;
  issueResumeToken?: (
    binding: ManifestResumeBinding & {
      issuedAt?: string;
      nonce?: string;
    },
  ) => string;
  lowNoiseExperienceFrameRepository: LowNoiseExperienceFrameRepositoryLike;
};

const experienceSnapshotPathPrefix = "/v1/manifests/";
const experienceSnapshotPathSuffix = "/experience/snapshot";

function correlationId(request: GetExperienceSnapshotEndpointRequest) {
  return request.correlationId ?? `corr.${Date.now()}`;
}

function manifestIdFromPath(path: string) {
  if (
    !path.startsWith(experienceSnapshotPathPrefix) ||
    !path.endsWith(experienceSnapshotPathSuffix)
  ) {
    return null;
  }
  const encoded = path.slice(
    experienceSnapshotPathPrefix.length,
    path.length - experienceSnapshotPathSuffix.length,
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

function resolveManifestId(request: GetExperienceSnapshotEndpointRequest) {
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
  dependencies: GetExperienceSnapshotEndpointDependencies;
  manifestId: string;
  request: GetExperienceSnapshotEndpointRequest;
  storedFrame: StoredLowNoiseExperienceFrameRecord | null;
}) {
  const authorizer =
    input.dependencies.authorizeRead ??
    (() =>
      ({
        authorized: true,
        reasonCodes: ["EXPERIENCE_SNAPSHOT_READ_AUTHORIZED"],
      }) satisfies ExperienceSnapshotReadAuthorization);
  return authorizer({
    actorContext: input.request.actorContext,
    manifestId: input.manifestId,
    storedFrame: input.storedFrame,
  });
}

function publicationGeneration(storedFrame: StoredLowNoiseExperienceFrameRecord) {
  const generation = storedFrame.record.stability_contract?.publication_generation;
  if (!Number.isInteger(generation) || generation < 0) {
    throw new LowNoiseExperiencePublicationError(
      "low-noise frame stability contract does not publish a valid generation",
      ["LOW_NOISE_PUBLICATION_GENERATION_INVALID"],
    );
  }
  return generation;
}

export async function getExperienceSnapshotEndpoint(
  request: GetExperienceSnapshotEndpointRequest,
  dependencies: GetExperienceSnapshotEndpointDependencies,
): Promise<GetExperienceSnapshotEndpointResponse> {
  const requestCorrelationId = correlationId(request);

  if (request.method !== undefined && request.method !== "GET") {
    return buildExperienceSnapshotNotReadyProblem({
      correlationId: requestCorrelationId,
      kind: "METHOD_INVALID",
      manifestId: null,
    });
  }

  const manifestId = resolveManifestId(request);
  if (manifestId === null) {
    return buildExperienceSnapshotNotReadyProblem({
      correlationId: requestCorrelationId,
      kind: "ROUTE_INVALID",
      manifestId: null,
    });
  }

  const storedFrame = await getLatestLowNoiseExperienceFrame({
    lowNoiseExperienceFrameRepository: dependencies.lowNoiseExperienceFrameRepository,
    manifestId,
  });

  const authorization = await authorize({
    dependencies,
    manifestId,
    request,
    storedFrame,
  });
  if (!authorization.authorized) {
    return buildExperienceSnapshotNotReadyProblem({
      correlationId: requestCorrelationId,
      kind: "HIDDEN",
      manifestId,
    });
  }

  if (storedFrame === null) {
    return buildExperienceSnapshotNotReadyProblem({
      correlationId: requestCorrelationId,
      kind: "NOT_READY",
      manifestId,
    });
  }

  try {
    const generation = publicationGeneration(storedFrame);
    const binding = manifestResumeBindingFromActor({
      actorContext: request.actorContext,
      frameEpoch: storedFrame.frame_epoch,
      lastPublishedSequence: storedFrame.last_published_sequence,
      manifestId,
      publicationGeneration: generation,
      schemaCompatibilityRef: request.schemaCompatibilityRef,
      shellRouteKey: storedFrame.record.shell_route_key,
      shellStabilityToken: storedFrame.shell_stability_token,
    });
    const issueResumeToken = dependencies.issueResumeToken ?? issueManifestResumeToken;
    const resumeToken = issueResumeToken({
      ...binding,
      issuedAt: request.resumeTokenIssuedAt,
      nonce: request.resumeTokenNonce,
    });
    const stabilityContract = buildManifestRouteStabilityContract({
      decisionBundleHash: storedFrame.decision_bundle_hash,
      frameEpoch: storedFrame.frame_epoch,
      lastPublishedSequence: storedFrame.last_published_sequence,
      publicationGeneration: generation,
      resumeToken,
      shellStabilityToken: storedFrame.shell_stability_token,
    });
    const streamRecoveryContract = buildManifestStreamRecoveryContract({
      accessBindingHash: binding.accessBindingHash,
      frameEpoch: storedFrame.frame_epoch,
      lastPublishedSequence: storedFrame.last_published_sequence,
      manifestId,
      maskingContextHash: binding.maskingContextHash,
      publicationGeneration: generation,
      resumeToken,
      sessionBindingHash: binding.sessionBindingHash,
      sessionRef: binding.sessionRef,
      shellRouteKey: storedFrame.record.shell_route_key,
      shellStabilityToken: storedFrame.shell_stability_token,
    });
    const publication = validateLowNoiseExperiencePublication({
      accessBindingHash: binding.accessBindingHash,
      maskingContextHash: binding.maskingContextHash,
      republishedStabilityContract: stabilityContract,
      republishedStreamRecoveryContract: streamRecoveryContract,
      resumeToken,
      sessionBindingHash: binding.sessionBindingHash,
      sessionRef: binding.sessionRef,
      stored: storedFrame,
    });
    return {
      body: publication.frame,
      headers: experienceSnapshotNoStoreHeaders,
      status: 200,
    };
  } catch (error) {
    if (error instanceof LowNoiseExperiencePublicationError) {
      return buildExperienceSnapshotNotReadyProblem({
        correlationId: requestCorrelationId,
        kind: "CORRUPT",
        manifestId,
        reasonCodes: error.reasonCodes,
      });
    }
    throw error;
  }
}

export function createGetExperienceSnapshotEndpointDependencies(input: {
  authorizeRead?: ExperienceSnapshotReadAuthorizer;
  issueResumeToken?: GetExperienceSnapshotEndpointDependencies["issueResumeToken"];
  lowNoiseExperienceFrameRepository?: LowNoiseExperienceFrameRepositoryLike;
} = {}): GetExperienceSnapshotEndpointDependencies {
  const dependencies = {
    lowNoiseExperienceFrameRepository:
      input.lowNoiseExperienceFrameRepository ?? new LowNoiseExperienceFrameRepository(),
  } as GetExperienceSnapshotEndpointDependencies;
  if (input.authorizeRead !== undefined) {
    dependencies.authorizeRead = input.authorizeRead;
  }
  if (input.issueResumeToken !== undefined) {
    dependencies.issueResumeToken = input.issueResumeToken;
  }
  return dependencies;
}
