import type { NorthboundActorContext } from "../../../apps/control-plane-api/src/northbound/policy.ts";
import { WorkspaceStreamEventRepository } from "../../../packages/backend-northbound/src/http/get_work_item_workspace_stream_endpoint.ts";
import {
  deriveWorkspaceAccessBindingHash,
  deriveWorkspaceMaskingPostureFingerprint,
  deriveWorkspaceSessionBindingHash,
} from "../../../packages/backend-northbound/src/services/open_or_resume_workspace_cursor.ts";
import {
  buildCollaborationEntry,
  buildWorkspaceSnapshot,
  CollaborationAttachmentRepository,
  CollaborationEntryRepository,
  CollaborationThreadRepository,
  type StoredWorkspaceSnapshot,
  WorkspaceSnapshotRepository,
} from "../../../packages/backend-workflow/src/index.ts";
import type { WorkspaceViewerScope } from "../../../packages/backend-workflow/src/projectors/projection_contract_helpers.ts";
import type { WorkspaceStreamEvent } from "../../../packages/generated-models/src/generated/typescript/client-and-collaboration.ts";
import {
  customerActivityEntries,
  openRequestInfo,
  projectionAttachments,
  workflowProjectionItem,
  workspaceParticipants,
  workspaceThreads,
} from "../backend_workflow/workspace_projection_fixtures.ts";

export function workspaceActorContext(
  viewerScope: WorkspaceViewerScope = "STAFF_FULL",
): NorthboundActorContext {
  return viewerScope === "STAFF_FULL"
    ? {
        client_id_or_null: null,
        principal_ref: "principal://staff-owner",
        session_ref: "session://staff/workspace",
        tenant_id: "tenant-0150",
      }
    : {
        client_id_or_null: "client-0150",
        principal_ref: "principal://client-0150",
        session_ref: "session://client/workspace",
        tenant_id: "tenant-0150",
      };
}

export function internalActivityEntries(itemId = "workflow-item-0150") {
  const threadId = `collaboration-thread://internal/${itemId}`;
  return [1, 2].map((sequence) =>
    buildCollaborationEntry({
      actor_ref: "user://staff-owner",
      body_ref: `body://${itemId}/internal/${sequence}`,
      command_id: `command-${itemId}-internal-${sequence}`,
      created_at: `2026-04-30T10:1${sequence}:00Z`,
      entry_id: `entry://${itemId}/internal/${sequence}`,
      entry_type: sequence === 1 ? "NOTE" : "STATUS_CHANGE",
      item_id: itemId,
      thread_id: threadId,
      thread_sequence: sequence,
      visibility_class: "INTERNAL_ONLY",
    }),
  );
}

export async function persistedWorkspaceFixture(
  input: { itemId?: string; viewerScope?: WorkspaceViewerScope } = {},
) {
  const itemId = input.itemId ?? "workflow-item-0150";
  const viewerScope = input.viewerScope ?? "STAFF_FULL";
  const actorContext = workspaceActorContext(viewerScope);
  const item = workflowProjectionItem({ item_id: itemId });
  const threads = workspaceThreads(itemId);
  const participants = workspaceParticipants(itemId);
  const attachments = projectionAttachments(itemId);
  const requestInfo = openRequestInfo(itemId);
  const snapshot = buildWorkspaceSnapshot({
    access_binding_hash: deriveWorkspaceAccessBindingHash(actorContext),
    attachments,
    customer_thread: threads.customer,
    internal_thread: threads.internal,
    item,
    masking_posture_fingerprint: deriveWorkspaceMaskingPostureFingerprint(actorContext),
    participants,
    request_info_record: requestInfo,
    session_binding_hash: deriveWorkspaceSessionBindingHash(actorContext),
    session_ref: actorContext.session_ref,
    viewer_scope: viewerScope,
  });
  const workspaceSnapshotRepository = new WorkspaceSnapshotRepository();
  const storedSnapshot = await workspaceSnapshotRepository.persistWorkspaceSnapshot({
    snapshot,
  });

  const threadRepository = new CollaborationThreadRepository();
  await threadRepository.persistCollaborationThread({ thread: threads.customer });
  await threadRepository.persistCollaborationThread({ thread: threads.internal });

  const entryRepository = new CollaborationEntryRepository();
  for (const entry of [...customerActivityEntries(itemId), ...internalActivityEntries(itemId)]) {
    await entryRepository.persistCollaborationEntry({ entry });
  }

  const attachmentRepository = new CollaborationAttachmentRepository();
  for (const attachment of attachments) {
    await attachmentRepository.persistCollaborationAttachment({ attachment });
  }

  return {
    actorContext,
    attachmentRepository,
    entryRepository,
    item,
    itemId,
    snapshot,
    storedSnapshot,
    threadRepository,
    viewerScope,
    workspaceSnapshotRepository,
  };
}

function streamVisibilityPartition(snapshot: StoredWorkspaceSnapshot["record"]) {
  return {
    ...snapshot.visibility_partition,
    partition_scope: "WORKSPACE_STREAM_EVENT" as const,
  };
}

function streamCustomerSafeProjection(snapshot: StoredWorkspaceSnapshot["record"]) {
  return snapshot.customer_safe_projection === null
    ? null
    : {
        ...snapshot.customer_safe_projection,
        boundary_scope: "WORKSPACE_STREAM_EVENT" as const,
      };
}

function queueProjection(snapshot: StoredWorkspaceSnapshot["record"]) {
  return {
    ...snapshot.queue_projection,
    projection_scope: "WORKSPACE_STREAM_EVENT" as const,
  };
}

export function workspaceStreamEventFixture(input: {
  eventType?: WorkspaceStreamEvent["event_type"];
  occurredAt?: string;
  sequence: number;
  storedSnapshot: StoredWorkspaceSnapshot;
}): WorkspaceStreamEvent {
  const snapshot = input.storedSnapshot.record;
  const eventType = input.eventType ?? "workspace.delta";
  return {
    access_binding_hash: snapshot.access_binding_hash,
    activity_ref:
      eventType === "activity.appended"
        ? `entry://${snapshot.item_id}/customer/${input.sequence}`
        : null,
    artifact_type: "WorkspaceStreamEvent",
    audit_ref:
      eventType === "audit.appended"
        ? `audit://workspace/${snapshot.item_id}/${input.sequence}`
        : null,
    customer_safe_projection: streamCustomerSafeProjection(snapshot),
    delta_ref:
      eventType === "workspace.delta"
        ? `workspace-delta://${snapshot.item_id}/${input.sequence}`
        : null,
    event_type: eventType,
    frame_epoch: snapshot.frame_epoch,
    item_id: snapshot.item_id,
    masking_posture_fingerprint: snapshot.masking_posture_fingerprint,
    notification_ref:
      eventType === "notification.badge"
        ? `notification://${snapshot.item_id}/${input.sequence}`
        : null,
    object_anchor_ref: snapshot.object_anchor_ref,
    occurred_at: input.occurredAt ?? `2026-04-30T11:0${input.sequence}:00Z`,
    queue_projection_or_null:
      eventType === "workspace.delta" ||
      eventType === "activity.appended" ||
      eventType === "notification.badge"
        ? queueProjection(snapshot)
        : null,
    resume_token: snapshot.resume_token,
    session_visibility_class: snapshot.viewer_scope,
    shell_family: snapshot.shell_family,
    shell_stability_token: snapshot.shell_stability_token,
    snapshot_ref: eventType === "workspace.snapshot" ? input.storedSnapshot.snapshot_ref : null,
    stability_contract: snapshot.stability_contract,
    stream_recovery_contract: snapshot.stream_recovery_contract,
    stream_scope_class: "WORKSPACE",
    visibility_partition: streamVisibilityPartition(snapshot),
    workspace_route_key: snapshot.workspace_route_key,
    workspace_sequence: input.sequence,
    workspace_version: snapshot.workspace_version,
  };
}

export function workspaceStreamRepositoryWithEvents(input: {
  eventTypes?: WorkspaceStreamEvent["event_type"][];
  sequences: number[];
  storedSnapshot: StoredWorkspaceSnapshot;
}) {
  const repository = new WorkspaceStreamEventRepository();
  input.sequences.forEach((sequence, index) => {
    repository.persistEvent({
      event: workspaceStreamEventFixture({
        eventType: input.eventTypes?.[index] ?? "workspace.delta",
        sequence,
        storedSnapshot: input.storedSnapshot,
      }),
    });
  });
  return repository;
}
