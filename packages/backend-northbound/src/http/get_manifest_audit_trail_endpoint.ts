import { createAppendOnlyAuditWriter } from "../../../audit/src/index.ts";
import type { NorthboundActorContext } from "../../../../apps/control-plane-api/src/northbound/policy.ts";
import type { ProblemEnvelope } from "../../../../packages/generated-models/src/generated/typescript/domain-workflow-and-filing.ts";
import type { AuditInvestigationFrame } from "../../../../packages/generated-models/src/generated/typescript/governance-and-policy.ts";
import {
  auditFrameErrorReasonCodes,
  loadManifestAuditInvestigationFrame,
  type AuditEventSource,
} from "../query/load_manifest_audit_investigation_frame.ts";
import {
  authorizeAuditOrEnquiryRead,
  type AuditOrEnquiryReadAuthorizer,
} from "../services/authorize_audit_or_enquiry_read.ts";
import {
  AuditInvestigationFrameValidationError,
} from "../services/build_audit_query_contract.ts";
import {
  buildAuditQueryProblemEnvelope,
  auditQueryNoStoreHeaders,
  type AuditQueryProblemResponse,
} from "../services/build_audit_query_problem_envelope.ts";
import { AuditQueryMappingError } from "../services/map_audit_query_filters_and_cursor.ts";

export type GetManifestAuditTrailEndpointRequest = {
  actorContext: NorthboundActorContext;
  correlationId?: string;
  manifestId?: string;
  method?: string;
  path?: string;
  principalClass?: string | null;
};

export type GetManifestAuditTrailEndpointResponse =
  | {
      body: AuditInvestigationFrame;
      headers: typeof auditQueryNoStoreHeaders;
      status: 200;
    }
  | {
      body: ProblemEnvelope;
      headers: AuditQueryProblemResponse["headers"];
      status: number;
    };

export type GetManifestAuditTrailEndpointDependencies = {
  auditEventSource: AuditEventSource;
  authorizeRead?: AuditOrEnquiryReadAuthorizer;
};

const auditTrailPathPattern = /^\/v1\/manifests\/([^/]+)\/audit-trail$/;

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

export function parseManifestAuditTrailPath(input: {
  manifestId?: string;
  path?: string;
}) {
  if (input.manifestId !== undefined && input.manifestId.length > 0) {
    return input.manifestId;
  }
  const url = requestUrl(input.path, "/v1/manifests//audit-trail");
  if (url === null) {
    return null;
  }
  const match = auditTrailPathPattern.exec(url.pathname);
  if (match === null) {
    return null;
  }
  try {
    const manifestId = decodeURIComponent(match[1]);
    return manifestId.length > 0 ? manifestId : null;
  } catch {
    return null;
  }
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

export async function getManifestAuditTrailEndpoint(
  request: GetManifestAuditTrailEndpointRequest,
  dependencies: GetManifestAuditTrailEndpointDependencies,
): Promise<GetManifestAuditTrailEndpointResponse> {
  const requestCorrelationId = correlationId(request);
  if (request.method !== undefined && request.method !== "GET") {
    return problem({
      correlationId: requestCorrelationId,
      kind: "METHOD_INVALID",
      manifestId: null,
    });
  }
  const manifestId = parseManifestAuditTrailPath(request);
  if (manifestId === null) {
    return problem({
      correlationId: requestCorrelationId,
      kind: "ROUTE_INVALID",
      manifestId: null,
    });
  }

  try {
    const initial = await loadManifestAuditInvestigationFrame({
      auditEventSource: dependencies.auditEventSource,
      exportPosture: {
        reason_codes: [],
        state: "FULL_ALLOWED",
      },
      includeStaffOnlySupportingRefs: true,
      manifestId,
      path: request.path,
    });
    if (initial === null) {
      return problem({
        correlationId: requestCorrelationId,
        kind: "NOT_READY",
        manifestId,
      });
    }

    const authorizeRead = dependencies.authorizeRead ?? authorizeAuditOrEnquiryRead;
    const authorization = await authorizeRead({
      actorContext: request.actorContext,
      principalClass: request.principalClass,
      routeSurface: "MANIFEST_AUDIT_TRAIL",
      tenantId: initial.frame.tenant_id,
    });
    if (!authorization.authorized) {
      return problem({
        correlationId: requestCorrelationId,
        kind: "HIDDEN",
        manifestId,
        reasonCodes: authorization.reasonCodes,
      });
    }

    if (
      authorization.exportPosture.state === "FULL_ALLOWED" &&
      authorization.includeStaffOnlySupportingRefs
    ) {
      return {
        body: initial.frame,
        headers: auditQueryNoStoreHeaders,
        status: 200,
      };
    }

    const scoped = await loadManifestAuditInvestigationFrame({
      auditEventSource: dependencies.auditEventSource,
      exportPosture: authorization.exportPosture,
      includeStaffOnlySupportingRefs: authorization.includeStaffOnlySupportingRefs,
      manifestId,
      path: request.path,
    });
    if (scoped === null) {
      return problem({
        correlationId: requestCorrelationId,
        kind: "NOT_READY",
        manifestId,
      });
    }
    return {
      body: scoped.frame,
      headers: auditQueryNoStoreHeaders,
      status: 200,
    };
  } catch (error) {
    if (error instanceof AuditQueryMappingError) {
      return problem({
        correlationId: requestCorrelationId,
        detailOverride: error.message,
        kind: "QUERY_INVALID",
        manifestId,
        reasonCodes: [error.code],
      });
    }
    if (error instanceof AuditInvestigationFrameValidationError) {
      return problem({
        correlationId: requestCorrelationId,
        detailOverride: error.message,
        kind: "CORRUPT",
        manifestId,
        reasonCodes: error.reasonCodes,
      });
    }
    return problem({
      correlationId: requestCorrelationId,
      detailOverride: error instanceof Error ? error.message : String(error),
      kind: "CORRUPT",
      manifestId,
      reasonCodes: auditFrameErrorReasonCodes(error),
    });
  }
}

export async function createGetManifestAuditTrailEndpointDependencies(input: {
  auditEventSource?: AuditEventSource;
  authorizeRead?: AuditOrEnquiryReadAuthorizer;
} = {}): Promise<GetManifestAuditTrailEndpointDependencies> {
  const dependencies = {
    auditEventSource: input.auditEventSource ?? (await createAppendOnlyAuditWriter()),
  } as GetManifestAuditTrailEndpointDependencies;
  if (input.authorizeRead !== undefined) {
    dependencies.authorizeRead = input.authorizeRead;
  }
  return dependencies;
}
