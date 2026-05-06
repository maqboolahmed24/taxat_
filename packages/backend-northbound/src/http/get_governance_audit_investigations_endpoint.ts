import { createAppendOnlyAuditWriter } from "../../../audit/src/index.ts";
import type { NorthboundActorContext } from "../../../../apps/control-plane-api/src/northbound/policy.ts";
import type { ProblemEnvelope } from "../../../../packages/generated-models/src/generated/typescript/domain-workflow-and-filing.ts";
import type { AuditInvestigationFrame } from "../../../../packages/generated-models/src/generated/typescript/governance-and-policy.ts";
import { loadGovernanceAuditInvestigationFrame } from "../query/load_governance_audit_investigation_frame.ts";
import type { AuditEventSource } from "../query/load_manifest_audit_investigation_frame.ts";
import {
  authorizeAuditOrEnquiryRead,
  type AuditOrEnquiryReadAuthorizer,
} from "../services/authorize_audit_or_enquiry_read.ts";
import { AuditInvestigationFrameValidationError } from "../services/build_audit_query_contract.ts";
import {
  auditQueryNoStoreHeaders,
  buildAuditQueryProblemEnvelope,
  type AuditQueryProblemResponse,
} from "../services/build_audit_query_problem_envelope.ts";
import { AuditQueryMappingError } from "../services/map_audit_query_filters_and_cursor.ts";

export type GetGovernanceAuditInvestigationsEndpointRequest = {
  actorContext: NorthboundActorContext;
  correlationId?: string;
  method?: string;
  path?: string;
  principalClass?: string | null;
  tenantId?: string;
};

export type GetGovernanceAuditInvestigationsEndpointResponse =
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

export type GetGovernanceAuditInvestigationsEndpointDependencies = {
  auditEventSource: AuditEventSource;
  authorizeRead?: AuditOrEnquiryReadAuthorizer;
};

const governanceAuditPathPattern =
  /^\/v1\/governance\/tenants\/([^/]+)\/audit-investigations$/;

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

export function parseGovernanceAuditInvestigationsPath(input: {
  path?: string;
  tenantId?: string;
}) {
  if (input.tenantId !== undefined && input.tenantId.length > 0) {
    return input.tenantId;
  }
  const url = requestUrl(
    input.path,
    "/v1/governance/tenants//audit-investigations",
  );
  if (url === null) {
    return null;
  }
  const match = governanceAuditPathPattern.exec(url.pathname);
  if (match === null) {
    return null;
  }
  try {
    const tenantId = decodeURIComponent(match[1]);
    return tenantId.length > 0 ? tenantId : null;
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

export async function getGovernanceAuditInvestigationsEndpoint(
  request: GetGovernanceAuditInvestigationsEndpointRequest,
  dependencies: GetGovernanceAuditInvestigationsEndpointDependencies,
): Promise<GetGovernanceAuditInvestigationsEndpointResponse> {
  const requestCorrelationId = correlationId(request);
  if (request.method !== undefined && request.method !== "GET") {
    return problem({
      correlationId: requestCorrelationId,
      kind: "METHOD_INVALID",
      manifestId: null,
    });
  }
  const tenantId = parseGovernanceAuditInvestigationsPath(request);
  if (tenantId === null) {
    return problem({
      correlationId: requestCorrelationId,
      kind: "ROUTE_INVALID",
      manifestId: null,
    });
  }

  const authorizeRead = dependencies.authorizeRead ?? authorizeAuditOrEnquiryRead;
  const authorization = await authorizeRead({
    actorContext: request.actorContext,
    principalClass: request.principalClass,
    routeSurface: "GOVERNANCE_AUDIT_INVESTIGATIONS",
    tenantId,
  });
  if (!authorization.authorized) {
    return problem({
      correlationId: requestCorrelationId,
      kind: "HIDDEN",
      manifestId: tenantId,
      reasonCodes: authorization.reasonCodes,
    });
  }

  try {
    const loaded = await loadGovernanceAuditInvestigationFrame({
      auditEventSource: dependencies.auditEventSource,
      exportPosture: authorization.exportPosture,
      includeStaffOnlySupportingRefs: authorization.includeStaffOnlySupportingRefs,
      path: request.path,
      tenantId,
    });
    if (loaded === null) {
      return problem({
        correlationId: requestCorrelationId,
        kind: "NOT_READY",
        manifestId: tenantId,
      });
    }
    return {
      body: loaded.frame,
      headers: auditQueryNoStoreHeaders,
      status: 200,
    };
  } catch (error) {
    if (error instanceof AuditQueryMappingError) {
      return problem({
        correlationId: requestCorrelationId,
        detailOverride: error.message,
        kind: "QUERY_INVALID",
        manifestId: tenantId,
        reasonCodes: [error.code],
      });
    }
    if (error instanceof AuditInvestigationFrameValidationError) {
      return problem({
        correlationId: requestCorrelationId,
        detailOverride: error.message,
        kind: "CORRUPT",
        manifestId: tenantId,
        reasonCodes: error.reasonCodes,
      });
    }
    return problem({
      correlationId: requestCorrelationId,
      detailOverride: error instanceof Error ? error.message : String(error),
      kind: "CORRUPT",
      manifestId: tenantId,
    });
  }
}

export async function createGetGovernanceAuditInvestigationsEndpointDependencies(input: {
  auditEventSource?: AuditEventSource;
  authorizeRead?: AuditOrEnquiryReadAuthorizer;
} = {}): Promise<GetGovernanceAuditInvestigationsEndpointDependencies> {
  const dependencies = {
    auditEventSource: input.auditEventSource ?? (await createAppendOnlyAuditWriter()),
  } as GetGovernanceAuditInvestigationsEndpointDependencies;
  if (input.authorizeRead !== undefined) {
    dependencies.authorizeRead = input.authorizeRead;
  }
  return dependencies;
}
