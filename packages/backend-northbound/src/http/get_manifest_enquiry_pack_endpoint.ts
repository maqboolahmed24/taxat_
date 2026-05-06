import {
  EnquiryPackRepository,
  type EnquiryPackRecord,
} from "../../../backend-provenance/src/index.ts";
import type { NorthboundActorContext } from "../../../../apps/control-plane-api/src/northbound/policy.ts";
import type { ProblemEnvelope } from "../../../../packages/generated-models/src/generated/typescript/domain-workflow-and-filing.ts";
import { loadManifestEnquiryPack, type EnquiryPackRepositoryLike } from "../query/load_manifest_enquiry_pack.ts";
import {
  authorizeAuditOrEnquiryRead,
  type AuditOrEnquiryReadAuthorizer,
} from "../services/authorize_audit_or_enquiry_read.ts";
import {
  auditQueryNoStoreHeaders,
  buildAuditQueryProblemEnvelope,
  type AuditQueryProblemResponse,
} from "../services/build_audit_query_problem_envelope.ts";
import { EnquiryExternalizationGovernanceError } from "../services/validate_enquiry_externalization_governance.ts";

export type GetManifestEnquiryPackEndpointRequest = {
  actorContext: NorthboundActorContext;
  correlationId?: string;
  manifestId?: string;
  method?: string;
  path?: string;
  principalClass?: string | null;
  targetRef?: string;
};

export type GetManifestEnquiryPackEndpointResponse =
  | {
      body: EnquiryPackRecord;
      headers: typeof auditQueryNoStoreHeaders;
      status: 200;
    }
  | {
      body: ProblemEnvelope;
      headers: AuditQueryProblemResponse["headers"];
      status: number;
    };

export type GetManifestEnquiryPackEndpointDependencies = {
  authorizeRead?: AuditOrEnquiryReadAuthorizer;
  enquiryPackRepository: EnquiryPackRepositoryLike;
};

const enquiryPackPathPattern = /^\/v1\/manifests\/([^/]+)\/enquiry-pack$/;

function correlationId(request: { correlationId?: string }) {
  return request.correlationId ?? `corr.${Date.now()}`;
}

function requestUrl(path: string | undefined, fallbackPath: string) {
  try {
    return new URL(path ?? fallbackPath, "http://taxat.local");
  } catch {
    return null;
  }
}

export function parseManifestEnquiryPackPath(input: {
  manifestId?: string;
  path?: string;
  targetRef?: string;
}) {
  const url = requestUrl(input.path, "/v1/manifests//enquiry-pack");
  const routeManifestId = (() => {
    if (input.manifestId !== undefined && input.manifestId.length > 0) {
      return input.manifestId;
    }
    if (url === null) {
      return null;
    }
    const match = enquiryPackPathPattern.exec(url.pathname);
    if (match === null) {
      return null;
    }
    try {
      const manifestId = decodeURIComponent(match[1]);
      return manifestId.length > 0 ? manifestId : null;
    } catch {
      return null;
    }
  })();
  const targetRef = input.targetRef ?? url?.searchParams.get("target_ref") ?? null;
  if (routeManifestId === null || targetRef === null || targetRef.trim().length === 0) {
    return null;
  }
  return {
    manifestId: routeManifestId,
    targetRef: targetRef.trim(),
  };
}

function problem(input: {
  correlationId: string;
  detailOverride?: string | null;
  kind: Parameters<typeof buildAuditQueryProblemEnvelope>[0]["kind"];
  manifestId?: string | null;
  reasonCodes?: readonly string[];
}) {
  return buildAuditQueryProblemEnvelope(input);
}

export async function getManifestEnquiryPackEndpoint(
  request: GetManifestEnquiryPackEndpointRequest,
  dependencies: GetManifestEnquiryPackEndpointDependencies,
): Promise<GetManifestEnquiryPackEndpointResponse> {
  const requestCorrelationId = correlationId(request);
  if (request.method !== undefined && request.method !== "GET") {
    return problem({
      correlationId: requestCorrelationId,
      kind: "METHOD_INVALID",
      manifestId: null,
    });
  }
  const parsed = parseManifestEnquiryPackPath(request);
  if (parsed === null) {
    return problem({
      correlationId: requestCorrelationId,
      kind: "ROUTE_INVALID",
      manifestId: request.manifestId ?? null,
      reasonCodes: ["ENQUIRY_PACK_TARGET_REF_REQUIRED"],
    });
  }

  try {
    const stored = await loadManifestEnquiryPack({
      enquiryPackRepository: dependencies.enquiryPackRepository,
      manifestId: parsed.manifestId,
      targetRef: parsed.targetRef,
    });
    if (stored === null) {
      return problem({
        correlationId: requestCorrelationId,
        kind: "NOT_READY",
        manifestId: parsed.manifestId,
        reasonCodes: ["ENQUIRY_PACK_NOT_MATERIALIZED"],
      });
    }
    const authorizeRead = dependencies.authorizeRead ?? authorizeAuditOrEnquiryRead;
    const authorization = await authorizeRead({
      actorContext: request.actorContext,
      principalClass: request.principalClass,
      routeSurface: "MANIFEST_ENQUIRY_PACK",
      tenantId: stored.record.partition_contract.tenant_id,
    });
    if (!authorization.authorized) {
      return problem({
        correlationId: requestCorrelationId,
        kind: "HIDDEN",
        manifestId: parsed.manifestId,
        reasonCodes: authorization.reasonCodes,
      });
    }
    if (
      authorization.exportPosture.state === "MASKED_ONLY" &&
      stored.record.masking_posture === "NONE"
    ) {
      return problem({
        correlationId: requestCorrelationId,
        detailOverride:
          "The current enquiry pack is full-posture only; a masked reader requires a materialized masked pack.",
        kind: "HIDDEN",
        manifestId: parsed.manifestId,
        reasonCodes: ["ENQUIRY_PACK_MASKED_READER_REQUIRES_MASKED_PACK"],
      });
    }
    return {
      body: stored.record,
      headers: auditQueryNoStoreHeaders,
      status: 200,
    };
  } catch (error) {
    if (error instanceof EnquiryExternalizationGovernanceError) {
      return problem({
        correlationId: requestCorrelationId,
        detailOverride: error.message,
        kind: "CORRUPT",
        manifestId: parsed.manifestId,
        reasonCodes: error.reasonCodes,
      });
    }
    return problem({
      correlationId: requestCorrelationId,
      detailOverride: error instanceof Error ? error.message : String(error),
      kind: "CORRUPT",
      manifestId: parsed.manifestId,
    });
  }
}

export function createGetManifestEnquiryPackEndpointDependencies(input: {
  authorizeRead?: AuditOrEnquiryReadAuthorizer;
  enquiryPackRepository?: EnquiryPackRepositoryLike;
} = {}): GetManifestEnquiryPackEndpointDependencies {
  const dependencies = {
    enquiryPackRepository: input.enquiryPackRepository ?? new EnquiryPackRepository(),
  } as GetManifestEnquiryPackEndpointDependencies;
  if (input.authorizeRead !== undefined) {
    dependencies.authorizeRead = input.authorizeRead;
  }
  return dependencies;
}
