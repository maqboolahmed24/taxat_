import type { ProblemEnvelope } from "../../../../packages/generated-models/src/generated/typescript/domain-workflow-and-filing.ts";
import type { CollaborationVisibilityClass } from "../../../backend-workflow/src/models/collaboration_thread.ts";
import {
  CollaborationActivitySliceRepository,
} from "../../../backend-workflow/src/repositories/collaboration_activity_slice_repository.ts";
import {
  CollaborationEntryRepository,
} from "../../../backend-workflow/src/repositories/collaboration_entry_repository.ts";
import {
  CollaborationThreadRepository,
} from "../../../backend-workflow/src/repositories/collaboration_thread_repository.ts";
import {
  WorkspaceSnapshotRepository,
} from "../../../backend-workflow/src/repositories/workspace_snapshot_repository.ts";
import {
  getCollaborationActivitySlice,
} from "../query/get_collaboration_activity_slice.ts";
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
  parseWorkItemWorkspaceSnapshotPath,
  resolveWorkspaceViewerScope,
  type CollaborationReadAuthorizer,
} from "./get_work_item_workspace_snapshot_endpoint.ts";
import type { GetWorkItemWorkspaceSnapshotEndpointRequest } from "./get_work_item_workspace_snapshot_endpoint.ts";

export type GetCollaborationActivityEndpointRequest =
  GetWorkItemWorkspaceSnapshotEndpointRequest & {
    beforeSequence?: number | null;
    includeSystemEntries?: boolean;
    requestInfoRef?: string | null;
    thread?: "customer" | "internal";
  };

export type GetCollaborationActivityEndpointResponse =
  | {
      body: Awaited<ReturnType<typeof getCollaborationActivitySlice>>["slice"];
      headers: typeof workspaceReadNoStoreHeaders;
      sliceRef: string;
      status: 200;
    }
  | {
      body: ProblemEnvelope;
      headers: WorkspaceReadProblemResponse["headers"];
      status: number;
    };

export type GetCollaborationActivityEndpointDependencies = {
  activitySliceRepository?: CollaborationActivitySliceRepository;
  authorizeRead?: CollaborationReadAuthorizer;
  entryRepository: CollaborationEntryRepository;
  threadRepository: CollaborationThreadRepository;
  workspaceSnapshotRepository: WorkspaceSnapshotRepositoryLike;
};

const activityPathPattern = /^\/v1\/work-items\/([^/]+)\/activity$/;

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

function parseActivityPath(request: GetCollaborationActivityEndpointRequest) {
  if (request.itemId !== undefined && request.itemId.length > 0) {
    return {
      beforeSequence: request.beforeSequence ?? null,
      includeSystemEntries: request.includeSystemEntries ?? false,
      itemId: request.itemId,
      requestInfoRef: request.requestInfoRef ?? null,
      thread: request.thread ?? "customer",
      viewerScope: request.viewerScope ?? null,
    };
  }
  const url = requestUrl(request.path);
  if (url === null) {
    return null;
  }
  const match = activityPathPattern.exec(url.pathname);
  if (match === null) {
    return null;
  }
  const before = url.searchParams.get("before_sequence");
  const includeSystemEntries = url.searchParams.get("include_system_entries");
  const thread = url.searchParams.get("thread") ?? "customer";
  try {
    return {
      beforeSequence:
        request.beforeSequence ??
        (before === null || before.length === 0 ? null : Number(before)),
      includeSystemEntries:
        request.includeSystemEntries ??
        (includeSystemEntries === "true" || includeSystemEntries === "1"),
      itemId: decodeURIComponent(match[1]),
      requestInfoRef: request.requestInfoRef ?? url.searchParams.get("request_info_ref"),
      thread: request.thread ?? thread,
      viewerScope: request.viewerScope ?? viewerScopeFromAudience(url.searchParams.get("viewer")),
    };
  } catch {
    return null;
  }
}

function threadVisibilityClass(
  thread: string,
): CollaborationVisibilityClass | null {
  if (thread === "customer") {
    return "CUSTOMER_VISIBLE";
  }
  if (thread === "internal") {
    return "INTERNAL_ONLY";
  }
  return null;
}

function validBeforeSequence(value: number | null) {
  return value === null || (Number.isInteger(value) && value >= 1);
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

export async function getCollaborationActivityEndpoint(
  request: GetCollaborationActivityEndpointRequest,
  dependencies: GetCollaborationActivityEndpointDependencies,
): Promise<GetCollaborationActivityEndpointResponse> {
  const requestCorrelationId = correlationId(request);
  if (request.method !== undefined && request.method !== "GET") {
    return problem({
      correlationId: requestCorrelationId,
      itemId: null,
      kind: "METHOD_INVALID",
    });
  }
  const parsed = parseActivityPath(request);
  if (parsed === null || parsed.itemId.length === 0) {
    return problem({
      correlationId: requestCorrelationId,
      itemId: null,
      kind: "ROUTE_INVALID",
    });
  }
  const threadClass = threadVisibilityClass(parsed.thread);
  if (threadClass === null || !validBeforeSequence(parsed.beforeSequence)) {
    return problem({
      correlationId: requestCorrelationId,
      itemId: parsed.itemId,
      kind: "QUERY_INVALID",
      reasonCodes: ["WORKSPACE_ACTIVITY_FILTER_INVALID"],
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
    routeSurface: "COLLABORATION_ACTIVITY",
    storedSnapshot: storedForAuth,
    viewerScope,
  });
  if (!authorization.authorized || (viewerScope === "CUSTOMER_VISIBLE" && threadClass !== "CUSTOMER_VISIBLE")) {
    return problem({
      correlationId: requestCorrelationId,
      itemId: parsed.itemId,
      kind: "HIDDEN",
      latestWorkspaceSnapshotRef: storedForAuth?.snapshot_ref,
      reasonCodes:
        authorization.authorized
          ? ["WORKSPACE_CUSTOMER_INTERNAL_ACTIVITY_FORBIDDEN"]
          : authorization.reasonCodes,
      tenantId: request.actorContext.tenant_id,
    });
  }
  try {
    const result = await getCollaborationActivitySlice({
      actorContext: request.actorContext,
      beforeSequenceOrNull: parsed.beforeSequence,
      entryRepository: dependencies.entryRepository,
      includeSystemEntries: parsed.includeSystemEntries,
      itemId: parsed.itemId,
      requestInfoRefOrNull: parsed.requestInfoRef,
      sliceRepository: dependencies.activitySliceRepository,
      threadRepository: dependencies.threadRepository,
      threadVisibilityClass: threadClass,
      viewerScope,
      workspaceSnapshotRepository: dependencies.workspaceSnapshotRepository,
    });
    return {
      body: result.slice,
      headers: workspaceReadNoStoreHeaders,
      sliceRef: result.sliceRef,
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

export function createGetCollaborationActivityEndpointDependencies(input: {
  activitySliceRepository?: CollaborationActivitySliceRepository;
  authorizeRead?: CollaborationReadAuthorizer;
  entryRepository?: CollaborationEntryRepository;
  threadRepository?: CollaborationThreadRepository;
  workspaceSnapshotRepository?: WorkspaceSnapshotRepositoryLike;
} = {}): GetCollaborationActivityEndpointDependencies {
  return {
    activitySliceRepository: input.activitySliceRepository,
    authorizeRead: input.authorizeRead,
    entryRepository: input.entryRepository ?? new CollaborationEntryRepository(),
    threadRepository: input.threadRepository ?? new CollaborationThreadRepository(),
    workspaceSnapshotRepository:
      input.workspaceSnapshotRepository ?? new WorkspaceSnapshotRepository(),
  };
}
