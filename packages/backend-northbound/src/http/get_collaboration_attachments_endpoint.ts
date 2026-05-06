import type { ProblemEnvelope } from "../../../../packages/generated-models/src/generated/typescript/domain-workflow-and-filing.ts";
import type { CollaborationVisibilityClass } from "../../../backend-workflow/src/models/collaboration_thread.ts";
import {
  CollaborationAttachmentRepository,
} from "../../../backend-workflow/src/repositories/collaboration_attachment_repository.ts";
import {
  WorkspaceSnapshotRepository,
} from "../../../backend-workflow/src/repositories/workspace_snapshot_repository.ts";
import {
  getCollaborationAttachmentSlice,
  type CollaborationAttachmentRepositoryLike,
} from "../query/get_collaboration_attachment_slice.ts";
import {
  WorkspaceReadError,
  viewerScopeFromAudience,
  type WorkspaceSnapshotRepositoryLike,
} from "../query/get_workspace_snapshot.ts";
import {
  buildWorkspaceProblemEnvelope,
  workspaceReadNoStoreHeaders,
  type WorkspaceReadProblemResponse,
} from "../services/build_workspace_problem_envelope.ts";
import {
  authorizeCollaborationReadScope,
  resolveWorkspaceViewerScope,
  type CollaborationReadAuthorizer,
  type GetWorkItemWorkspaceSnapshotEndpointRequest,
} from "./get_work_item_workspace_snapshot_endpoint.ts";

export type GetCollaborationAttachmentsEndpointRequest =
  GetWorkItemWorkspaceSnapshotEndpointRequest & {
    includeHistory?: boolean;
    includePendingPlaceholders?: boolean;
    requestInfoRef?: string | null;
    visibility?: "customer" | "internal";
  };

export type GetCollaborationAttachmentsEndpointResponse =
  | {
      body: Awaited<ReturnType<typeof getCollaborationAttachmentSlice>>["slice"];
      headers: typeof workspaceReadNoStoreHeaders;
      status: 200;
    }
  | {
      body: ProblemEnvelope;
      headers: WorkspaceReadProblemResponse["headers"];
      status: number;
    };

export type GetCollaborationAttachmentsEndpointDependencies = {
  attachmentRepository: CollaborationAttachmentRepositoryLike;
  authorizeRead?: CollaborationReadAuthorizer;
  workspaceSnapshotRepository: WorkspaceSnapshotRepositoryLike;
};

const attachmentsPathPattern = /^\/v1\/work-items\/([^/]+)\/attachments$/;

function correlationId(request: { correlationId?: string }) {
  return request.correlationId ?? `corr.${Date.now()}`;
}

function requestUrl(path: string | undefined) {
  try {
    return new URL(path ?? "/", "http://taxat.local");
  } catch {
    return null;
  }
}

function parseBooleanQuery(value: string | null) {
  return value === "true" || value === "1";
}

function parseAttachmentsPath(request: GetCollaborationAttachmentsEndpointRequest) {
  if (request.itemId !== undefined && request.itemId.length > 0) {
    return {
      includeHistory: request.includeHistory ?? true,
      includePendingPlaceholders: request.includePendingPlaceholders ?? false,
      itemId: request.itemId,
      requestInfoRef: request.requestInfoRef ?? null,
      viewerScope: request.viewerScope ?? null,
      visibility: request.visibility ?? "customer",
    };
  }
  const url = requestUrl(request.path);
  if (url === null) {
    return null;
  }
  const match = attachmentsPathPattern.exec(url.pathname);
  if (match === null) {
    return null;
  }
  try {
    return {
      includeHistory:
        request.includeHistory ??
        (url.searchParams.has("include_history")
          ? parseBooleanQuery(url.searchParams.get("include_history"))
          : true),
      includePendingPlaceholders:
        request.includePendingPlaceholders ??
        parseBooleanQuery(url.searchParams.get("include_pending_placeholders")),
      itemId: decodeURIComponent(match[1]),
      requestInfoRef: request.requestInfoRef ?? url.searchParams.get("request_info_ref"),
      viewerScope: request.viewerScope ?? viewerScopeFromAudience(url.searchParams.get("viewer")),
      visibility: request.visibility ?? url.searchParams.get("visibility") ?? "customer",
    };
  } catch {
    return null;
  }
}

function visibilityClass(
  visibility: string,
): CollaborationVisibilityClass | null {
  if (visibility === "customer") {
    return "CUSTOMER_VISIBLE";
  }
  if (visibility === "internal") {
    return "INTERNAL_ONLY";
  }
  return null;
}

function problem(input: {
  correlationId: string;
  detailOverride?: string | null;
  error?: unknown;
  itemId: string | null;
  kind: Parameters<typeof buildWorkspaceProblemEnvelope>[0]["kind"];
  latestWorkspaceSnapshotRef?: string | null;
  reasonCodes?: readonly string[];
  tenantId?: string | null;
}) {
  return buildWorkspaceProblemEnvelope({
    correlationId: input.correlationId,
    detailOverride:
      input.detailOverride ??
      (input.error instanceof Error
        ? input.error.message
        : input.error === undefined
          ? null
          : String(input.error)),
    itemId: input.itemId,
    kind: input.kind,
    latestWorkspaceSnapshotRef: input.latestWorkspaceSnapshotRef,
    reasonCodes: input.reasonCodes,
    tenantId: input.tenantId,
  });
}

export async function getCollaborationAttachmentsEndpoint(
  request: GetCollaborationAttachmentsEndpointRequest,
  dependencies: GetCollaborationAttachmentsEndpointDependencies,
): Promise<GetCollaborationAttachmentsEndpointResponse> {
  const requestCorrelationId = correlationId(request);
  if (request.method !== undefined && request.method !== "GET") {
    return problem({
      correlationId: requestCorrelationId,
      itemId: null,
      kind: "METHOD_INVALID",
    });
  }
  const parsed = parseAttachmentsPath(request);
  if (parsed === null || parsed.itemId.length === 0) {
    return problem({
      correlationId: requestCorrelationId,
      itemId: null,
      kind: "ROUTE_INVALID",
    });
  }
  const fileVisibilityClass = visibilityClass(parsed.visibility);
  if (fileVisibilityClass === null) {
    return problem({
      correlationId: requestCorrelationId,
      itemId: parsed.itemId,
      kind: "QUERY_INVALID",
      reasonCodes: ["WORKSPACE_ATTACHMENT_VISIBILITY_FILTER_INVALID"],
      tenantId: request.actorContext.tenant_id,
    });
  }
  const viewerScope =
    parsed.viewerScope ??
    resolveWorkspaceViewerScope({
      actorContext: request.actorContext,
      path: request.path,
      viewerScope: request.viewerScope,
    });
  const storedForAuth =
    await dependencies.workspaceSnapshotRepository.getLatestWorkspaceSnapshotForItem({
      item_id: parsed.itemId,
      viewer_scope: viewerScope,
    });
  const authorizeRead =
    dependencies.authorizeRead ?? authorizeCollaborationReadScope;
  const authorization = await authorizeRead({
    actorContext: request.actorContext,
    itemId: parsed.itemId,
    principalClass: request.principalClass,
    routeSurface: "COLLABORATION_ATTACHMENTS",
    storedSnapshot: storedForAuth,
    viewerScope,
  });
  if (!authorization.authorized || (viewerScope === "CUSTOMER_VISIBLE" && fileVisibilityClass !== "CUSTOMER_VISIBLE")) {
    return problem({
      correlationId: requestCorrelationId,
      itemId: parsed.itemId,
      kind: "HIDDEN",
      latestWorkspaceSnapshotRef: storedForAuth?.snapshot_ref,
      reasonCodes:
        authorization.authorized
          ? ["WORKSPACE_CUSTOMER_INTERNAL_ATTACHMENT_FORBIDDEN"]
          : authorization.reasonCodes,
      tenantId: request.actorContext.tenant_id,
    });
  }
  try {
    const result = await getCollaborationAttachmentSlice({
      actorContext: request.actorContext,
      attachmentRepository: dependencies.attachmentRepository,
      includeHistory: parsed.includeHistory,
      includePendingPlaceholders: parsed.includePendingPlaceholders,
      itemId: parsed.itemId,
      requestInfoRefOrNull: parsed.requestInfoRef,
      viewerScope,
      visibilityClass: fileVisibilityClass,
      workspaceSnapshotRepository: dependencies.workspaceSnapshotRepository,
    });
    return {
      body: result.slice,
      headers: workspaceReadNoStoreHeaders,
      status: 200,
    };
  } catch (error) {
    if (error instanceof WorkspaceReadError) {
      return problem({
        correlationId: requestCorrelationId,
        error,
        itemId: parsed.itemId,
        kind: error.kind,
        latestWorkspaceSnapshotRef: storedForAuth?.snapshot_ref,
        reasonCodes: error.reasonCodes,
        tenantId: request.actorContext.tenant_id,
      });
    }
    return problem({
      correlationId: requestCorrelationId,
      error,
      itemId: parsed.itemId,
      kind: /customer actors cannot read internal/.test(
        error instanceof Error ? error.message : String(error),
      )
        ? "HIDDEN"
        : "CORRUPT",
      latestWorkspaceSnapshotRef: storedForAuth?.snapshot_ref,
      tenantId: request.actorContext.tenant_id,
    });
  }
}

export function createGetCollaborationAttachmentsEndpointDependencies(input: {
  attachmentRepository?: CollaborationAttachmentRepositoryLike;
  authorizeRead?: CollaborationReadAuthorizer;
  workspaceSnapshotRepository?: WorkspaceSnapshotRepositoryLike;
} = {}): GetCollaborationAttachmentsEndpointDependencies {
  return {
    attachmentRepository:
      input.attachmentRepository ?? new CollaborationAttachmentRepository(),
    authorizeRead: input.authorizeRead,
    workspaceSnapshotRepository:
      input.workspaceSnapshotRepository ?? new WorkspaceSnapshotRepository(),
  };
}
