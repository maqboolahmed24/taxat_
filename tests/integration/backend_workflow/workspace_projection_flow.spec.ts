import { expect, test } from "@playwright/test";

import {
  CollaborationActivitySliceRepository,
  CollaborationAttachmentRepository,
  CollaborationEntryRepository,
  CollaborationThreadRepository,
  CustomerRequestListSnapshotRepository,
  projectCollaborationActivitySlice,
  projectCustomerRequestListSnapshot,
  projectWorkspaceSnapshotForViewer,
  RequestInfoRecordRepository,
  WorkItemParticipantRepository,
  WorkflowItemRepository,
  WorkspaceSnapshotRepository,
} from "../../../packages/backend-workflow/src/index.ts";
import {
  customerActivityEntries,
  openRequestInfo,
  projectionAttachments,
  workflowProjectionItem,
  workspaceParticipants,
  workspaceThreads,
} from "../../unit/backend_workflow/workspace_projection_fixtures.ts";

test("projects list, customer detail, and activity slice from backend-authored read models", async () => {
  const item = workflowProjectionItem({ item_id: "workflow-item-0150-flow" });
  const threads = workspaceThreads(item.item_id);
  const participants = workspaceParticipants(item.item_id);
  const request = openRequestInfo(item.item_id);
  const attachments = projectionAttachments(item.item_id);
  const entries = customerActivityEntries(item.item_id);

  const workflowRepository = new WorkflowItemRepository();
  const threadRepository = new CollaborationThreadRepository();
  const participantRepository = new WorkItemParticipantRepository();
  const requestRepository = new RequestInfoRecordRepository();
  const attachmentRepository = new CollaborationAttachmentRepository();
  const entryRepository = new CollaborationEntryRepository();
  const workspaceRepository = new WorkspaceSnapshotRepository();
  const requestListRepository = new CustomerRequestListSnapshotRepository();
  const activityRepository = new CollaborationActivitySliceRepository();

  await workflowRepository.persistWorkflowItem({ item });
  await threadRepository.persistCollaborationThread({ thread: threads.internal });
  await threadRepository.persistCollaborationThread({ thread: threads.customer });
  for (const participant of participants) {
    await participantRepository.upsertWorkItemParticipant({ participant });
  }
  await requestRepository.persistRequestInfoRecord({ record: request });
  for (const attachment of attachments) {
    await attachmentRepository.persistCollaborationAttachment({ attachment });
  }
  for (const entry of entries) {
    await entryRepository.persistCollaborationEntry({ entry });
  }

  const detail = await projectWorkspaceSnapshotForViewer({
    access_binding_hash: "access-0150-flow",
    attachment_repository: attachmentRepository,
    item,
    masking_posture_fingerprint: "mask-0150-flow",
    participant_repository: participantRepository,
    repository: workspaceRepository,
    request_info_repository: requestRepository,
    thread_repository: threadRepository,
    viewer_scope: "CUSTOMER_VISIBLE",
  });
  const list = await projectCustomerRequestListSnapshot({
    access_binding_hash: "access-0150-flow",
    attachment_repository: attachmentRepository,
    client_id: item.client_id,
    item_repository: workflowRepository,
    list_version: item.customer_workspace_version,
    masking_posture_fingerprint: "mask-0150-flow",
    repository: requestListRepository,
    request_info_repository: requestRepository,
    selected_item_ref_or_null: item.item_id,
    tenant_id: item.tenant_id,
    updated_at: "2026-04-30T12:00:00Z",
  });
  const activity = await projectCollaborationActivitySlice({
    access_binding_hash: "access-0150-flow",
    entry_repository: entryRepository,
    item_id: item.item_id,
    limit: 2,
    masking_posture_fingerprint: "mask-0150-flow",
    repository: activityRepository,
    shell_stability_token: detail.snapshot.shell_stability_token,
    thread_repository: threadRepository,
    thread_visibility_class: "CUSTOMER_VISIBLE",
    viewer_scope: "CUSTOMER_VISIBLE",
    workspace_route_key: detail.snapshot.workspace_route_key,
    workspace_snapshot_repository: workspaceRepository,
    workspace_version: detail.snapshot.workspace_version,
  });

  const row = list.snapshot.rows.find((candidate) => candidate.item_id === item.item_id)!;
  expect(row.authoritative_action.actionability_state).toBe(
    detail.snapshot.customer_request_workspace?.authoritative_action.actionability_state,
  );
  expect(row.primary_action_code_or_null).toBe(
    detail.snapshot.customer_request_workspace?.authoritative_action.primary_action_code_or_null,
  );
  expect(list.snapshot.selected_focus_anchor_ref_or_null).toBe(row.focus_anchor_ref);
  expect(activity.slice.latest_workspace_snapshot_ref).toBe(detail.stored.snapshot_ref);
  expect(activity.slice.entry_refs).toEqual([
    `entry://${item.item_id}/customer/4`,
    `entry://${item.item_id}/customer/3`,
  ]);
  expect((await workspaceRepository.getLatestWorkspaceSnapshotForItem({
    item_id: item.item_id,
    viewer_scope: "CUSTOMER_VISIBLE",
  }))?.snapshot_ref).toBe(detail.stored.snapshot_ref);
});
