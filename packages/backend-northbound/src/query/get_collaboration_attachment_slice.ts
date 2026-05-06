import type { NorthboundActorContext } from "../../../../apps/control-plane-api/src/northbound/policy.ts";
import type {
  CollaborationAttachmentSlice,
} from "../../../../packages/generated-models/src/generated/typescript/client-and-collaboration.ts";
import type { CollaborationAttachment } from "../../../backend-workflow/src/models/collaboration_attachment.ts";
import type { CollaborationVisibilityClass } from "../../../backend-workflow/src/models/collaboration_thread.ts";
import { cloneWorkflowRecord } from "../../../backend-workflow/src/models/workflow_item.ts";
import {
  buildCustomerSafeProjectionContract,
  buildVisibilityPartitionContract,
  projectionHash,
  type WorkspaceViewerScope,
} from "../../../backend-workflow/src/projectors/projection_contract_helpers.ts";
import type { StoredCollaborationAttachment } from "../../../backend-workflow/src/repositories/collaboration_attachment_repository.ts";
import {
  getWorkspaceSnapshot,
  type WorkspaceSnapshotRepositoryLike,
} from "./get_workspace_snapshot.ts";

export type CollaborationAttachmentRepositoryLike = {
  listCollaborationAttachmentsByItem: (
    itemId: string,
  ) =>
    | Promise<StoredCollaborationAttachment[]>
    | StoredCollaborationAttachment[];
};

export type GetCollaborationAttachmentSliceInput = {
  actorContext: NorthboundActorContext;
  attachmentRepository: CollaborationAttachmentRepositoryLike;
  focusAnchorRefOrNull?: string | null;
  includeHistory?: boolean;
  includePendingPlaceholders?: boolean;
  itemId: string;
  requestInfoRefOrNull?: string | null;
  viewerScope: WorkspaceViewerScope;
  visibilityClass: CollaborationVisibilityClass;
  workspaceSnapshotRepository: WorkspaceSnapshotRepositoryLike;
};

function sortNewestFirst(left: CollaborationAttachment, right: CollaborationAttachment) {
  return right.published_at.localeCompare(left.published_at) ||
    right.attachment_id.localeCompare(left.attachment_id);
}

function unique(values: readonly string[]) {
  return [...new Set(values)];
}

function downloadableCurrentRef(attachments: readonly CollaborationAttachment[]) {
  const current = attachments[0] ?? null;
  if (
    current === null ||
    current.publication_state !== "AVAILABLE" ||
    current.download_state !== "DOWNLOADABLE"
  ) {
    return null;
  }
  return current.attachment_id;
}

function artifactSelection(input: {
  authoritativeCurrentRefOrNull: string | null;
  currentAttachmentRefs: readonly string[];
  historicalAttachmentRefs: readonly string[];
}): CollaborationAttachmentSlice["artifact_selection"] {
  return {
    authoritative_subject_refs:
      input.authoritativeCurrentRefOrNull === null
        ? []
        : [input.authoritativeCurrentRefOrNull],
    default_download_target_ref_or_null: input.authoritativeCurrentRefOrNull,
    default_preview_target_ref_or_null: input.authoritativeCurrentRefOrNull,
    default_print_target_ref_or_null: null,
    historical_subject_refs: [...input.historicalAttachmentRefs],
    limited_history_count_or_null: null,
    limited_history_state: "NONE",
    presentation_mode: "CURRENT_PRIMARY_HISTORY_SECONDARY",
    primary_subject_refs: [...input.currentAttachmentRefs],
    selection_scope: "COLLABORATION_ATTACHMENT_SLICE",
  };
}

function artifactAffordance(input: {
  authoritativeCurrentRefOrNull: string | null;
  currentAttachmentRefs: readonly string[];
  historicalAttachmentRefs: readonly string[];
}): CollaborationAttachmentSlice["artifact_affordance"] {
  const hasCurrent = input.currentAttachmentRefs.length > 0;
  const hasHistory = input.historicalAttachmentRefs.length > 0;
  return {
    affordance_scope: "COLLABORATION_ATTACHMENT_SLICE",
    contract_version: "ARTIFACT_AFFORDANCE_V1",
    default_download_target_ref_or_null: input.authoritativeCurrentRefOrNull,
    default_preview_target_ref_or_null: input.authoritativeCurrentRefOrNull,
    default_print_target_ref_or_null: null,
    header_posture: hasCurrent && hasHistory
      ? "CURRENT_WITH_HISTORY"
      : hasCurrent
        ? "CURRENT"
        : "HISTORICAL",
    history_affordance_state: hasHistory ? "EXPLICIT_SECONDARY" : "NONE",
    invocation_validation_policy: "VISIBLE_PRIMARY_AND_DEFAULT_TARGETS_MUST_MATCH_GOVERNED_POSTURE",
    label_visibility_policy: "EXPLICIT_POSTURE_LABELS_REQUIRED",
    preview_open_policy: hasHistory
      ? "CURRENT_SUMMARY_FIRST_THEN_HISTORY_ON_DEMAND"
      : "CURRENT_SUMMARY_FIRST_ONLY",
    primary_slot_policy: "CURRENT_PRIMARY_HISTORY_EXPLICIT",
    primary_subject_role: hasCurrent ? "CURRENT_ARTIFACT" : "NO_CURRENT_ARTIFACT",
    visible_primary_subject_ref_or_null: input.currentAttachmentRefs[0] ?? null,
  };
}

export function validateCollaborationAttachmentSlice(
  slice: CollaborationAttachmentSlice,
) {
  if (slice.artifact_type !== "CollaborationAttachmentSlice") {
    throw new Error("attachment slice artifact_type must be CollaborationAttachmentSlice");
  }
  if (slice.active_filters.visibility_class !== slice.visibility_class) {
    throw new Error("attachment filters must mirror visibility class");
  }
  if (slice.visibility_partition.partition_scope !== "COLLABORATION_ATTACHMENT_SLICE") {
    throw new Error("attachment slice visibility partition scope drifted");
  }
  if (
    slice.visibility_partition.allowed_visibility_classes.length !== 1 ||
    slice.visibility_partition.allowed_visibility_classes[0] !== slice.visibility_class
  ) {
    throw new Error("attachment slice visibility partition drifted from filter");
  }
  if (slice.viewer_scope === "CUSTOMER_VISIBLE") {
    if (
      slice.visibility_class !== "CUSTOMER_VISIBLE" ||
      slice.customer_safe_projection === null ||
      slice.active_filters.include_pending_placeholders
    ) {
      throw new Error("customer attachment slices must stay customer-visible and exclude pending placeholders");
    }
  }
  if (slice.visibility_class === "INTERNAL_ONLY") {
    if (slice.viewer_scope !== "STAFF_FULL" || slice.customer_safe_projection !== null) {
      throw new Error("internal attachment slices must be staff-only");
    }
  }
  if (!slice.active_filters.include_history && slice.historical_attachment_refs.length > 0) {
    throw new Error("attachment slice history must clear when include_history is false");
  }
  if (
    projectionHash(slice.artifact_selection.primary_subject_refs) !==
    projectionHash(slice.current_attachment_refs)
  ) {
    throw new Error("attachment selection primary refs drifted from current refs");
  }
  if (
    projectionHash(slice.artifact_selection.historical_subject_refs) !==
    projectionHash(slice.historical_attachment_refs)
  ) {
    throw new Error("attachment selection historical refs drifted from historical refs");
  }
  if (slice.artifact_selection.default_print_target_ref_or_null !== null) {
    throw new Error("collaboration attachment slices cannot expose a print default");
  }
  return slice;
}

export async function getCollaborationAttachmentSlice(
  input: GetCollaborationAttachmentSliceInput,
) {
  if (
    input.viewerScope === "CUSTOMER_VISIBLE" &&
    input.visibilityClass !== "CUSTOMER_VISIBLE"
  ) {
    throw new Error("customer actors cannot read internal collaboration attachments");
  }
  const includePendingPlaceholders =
    input.viewerScope === "CUSTOMER_VISIBLE"
      ? false
      : input.includePendingPlaceholders ?? false;
  const includeHistory = input.includeHistory ?? true;
  const snapshot = await getWorkspaceSnapshot({
    actorContext: input.actorContext,
    itemId: input.itemId,
    repository: input.workspaceSnapshotRepository,
    viewerScope: input.viewerScope,
  });
  const storedAttachments = await input.attachmentRepository.listCollaborationAttachmentsByItem(
    snapshot.record.item_id,
  );
  const attachments = storedAttachments
    .map((stored) => stored.record)
    .filter((attachment) => attachment.visibility_class === input.visibilityClass)
    .filter((attachment) =>
      input.requestInfoRefOrNull === undefined ||
      input.requestInfoRefOrNull === null ||
      attachment.request_info_ref === input.requestInfoRefOrNull,
    )
    .filter((attachment) =>
      attachment.publication_state === "AVAILABLE" ||
      (includePendingPlaceholders && attachment.publication_state === "PENDING_SCAN"),
    )
    .sort(sortNewestFirst);
  const currentAttachmentRefs = unique(
    attachments.length === 0 ? [] : [attachments[0].attachment_id],
  );
  const historicalAttachmentRefs = includeHistory
    ? unique(attachments.slice(1).map((attachment) => attachment.attachment_id))
    : [];
  const authoritativeCurrentRefOrNull = downloadableCurrentRef(attachments);
  const visibilityPartition = buildVisibilityPartitionContract({
    access_binding_hash: snapshot.record.access_binding_hash,
    allowed_visibility_classes: [input.visibilityClass],
    audience_class:
      input.viewerScope === "CUSTOMER_VISIBLE" ? "CUSTOMER_COLLABORATION" : "STAFF",
    badge_counter_policy: "SURFACE_VISIBLE_ONLY",
    masking_posture_fingerprint: snapshot.record.masking_posture_fingerprint,
    ordering_side_channel_policy: "VISIBLE_EVENTS_ONLY",
    partition_scope: "COLLABORATION_ATTACHMENT_SLICE",
    subject_ref: `${snapshot.record.workspace_route_key}:${input.visibilityClass}`,
  });
  const slice: CollaborationAttachmentSlice = {
    access_binding_hash: snapshot.record.access_binding_hash,
    active_filters: {
      include_history: includeHistory,
      include_pending_placeholders: includePendingPlaceholders,
      request_info_ref_or_null: input.requestInfoRefOrNull ?? null,
      visibility_class: input.visibilityClass,
    },
    artifact_affordance: artifactAffordance({
      authoritativeCurrentRefOrNull,
      currentAttachmentRefs,
      historicalAttachmentRefs,
    }),
    artifact_selection: artifactSelection({
      authoritativeCurrentRefOrNull,
      currentAttachmentRefs,
      historicalAttachmentRefs,
    }),
    artifact_type: "CollaborationAttachmentSlice",
    current_attachment_refs: currentAttachmentRefs,
    customer_safe_projection:
      input.viewerScope === "CUSTOMER_VISIBLE"
        ? buildCustomerSafeProjectionContract({
            access_binding_hash: snapshot.record.access_binding_hash,
            boundary_scope: "COLLABORATION_ATTACHMENT_SLICE",
            masking_posture_fingerprint: snapshot.record.masking_posture_fingerprint,
            projection_audience: "CUSTOMER_COLLABORATION",
            visibility_cache_partition_key: visibilityPartition.cache_partition_key,
          })
        : null,
    focus_anchor_ref_or_null:
      input.focusAnchorRefOrNull ?? snapshot.record.route_context.focus_anchor_ref_or_null,
    historical_attachment_refs: historicalAttachmentRefs,
    item_id: snapshot.record.item_id,
    latest_workspace_snapshot_ref: snapshot.snapshot_ref,
    masking_posture_fingerprint: snapshot.record.masking_posture_fingerprint,
    returned_at: new Date(0).toISOString(),
    shell_stability_token: snapshot.record.shell_stability_token,
    viewer_scope: input.viewerScope,
    visibility_class: input.visibilityClass,
    visibility_partition: visibilityPartition,
    workspace_route_key: snapshot.record.workspace_route_key,
    workspace_version: snapshot.record.workspace_version,
  };
  validateCollaborationAttachmentSlice(slice);
  return {
    slice: cloneWorkflowRecord(slice),
    snapshot,
  };
}
