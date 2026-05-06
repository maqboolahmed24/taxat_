import type { NorthboundActorContext } from "../../../../apps/control-plane-api/src/northbound/policy.ts";
import {
  validateWorkspaceSnapshot,
  type WorkspaceSnapshot,
} from "../../../backend-workflow/src/projectors/build_workspace_snapshot.ts";
import type { WorkspaceViewerScope } from "../../../backend-workflow/src/projectors/projection_contract_helpers.ts";
import type { StoredWorkspaceSnapshot } from "../../../backend-workflow/src/repositories/workspace_snapshot_repository.ts";
import { cloneWorkflowRecord } from "../../../backend-workflow/src/models/workflow_item.ts";

export type WorkspaceReadFailureKind = "CORRUPT" | "HIDDEN" | "NOT_READY" | "QUERY_INVALID";

export class WorkspaceReadError extends Error {
  readonly kind: WorkspaceReadFailureKind;
  readonly reasonCodes: string[];

  constructor(input: {
    kind: WorkspaceReadFailureKind;
    message: string;
    reasonCodes: string[];
  }) {
    super(input.message);
    this.name = "WorkspaceReadError";
    this.kind = input.kind;
    this.reasonCodes = input.reasonCodes;
  }
}

export type WorkspaceSnapshotRepositoryLike = {
  getLatestWorkspaceSnapshotForItem: (input: {
    item_id: string;
    viewer_scope: WorkspaceViewerScope;
  }) => Promise<StoredWorkspaceSnapshot | null> | StoredWorkspaceSnapshot | null;
};

export type GetWorkspaceSnapshotInput = {
  actorContext: NorthboundActorContext;
  itemId: string;
  repository: WorkspaceSnapshotRepositoryLike;
  viewerScope: WorkspaceViewerScope;
};

function fail(
  kind: WorkspaceReadFailureKind,
  message: string,
  reasonCodes: string[],
): never {
  throw new WorkspaceReadError({ kind, message, reasonCodes });
}

function assertSnapshotAudience(snapshot: WorkspaceSnapshot) {
  if (snapshot.viewer_scope === "CUSTOMER_VISIBLE") {
    if (
      snapshot.shell_family !== "CLIENT_PORTAL_SHELL" ||
      snapshot.internal_head_sequence_or_null !== null ||
      snapshot.customer_safe_projection === null ||
      snapshot.customer_request_workspace === null
    ) {
      fail("CORRUPT", "customer workspace snapshot leaked staff posture", [
        "WORKSPACE_CUSTOMER_VISIBILITY_CONTRACT_INVALID",
      ]);
    }
    const moduleCodes = snapshot.detail_drawer.modules.map((module) => module.module_code);
    if (moduleCodes.join("|") !== "CUSTOMER_ACTIVITY|FILES") {
      fail("CORRUPT", "customer workspace snapshot mounted staff modules", [
        "WORKSPACE_CUSTOMER_MODULES_INVALID",
      ]);
    }
    for (const module of snapshot.detail_drawer.modules) {
      if (module.internal_only_file_refs.length > 0) {
        fail("CORRUPT", "customer workspace snapshot leaked internal file refs", [
          "WORKSPACE_CUSTOMER_INTERNAL_FILE_LEAK",
        ]);
      }
    }
    if (snapshot.queue_projection.internal_unread_count_or_null !== null) {
      fail("CORRUPT", "customer workspace snapshot leaked internal unread counts", [
        "WORKSPACE_CUSTOMER_INTERNAL_COUNT_LEAK",
      ]);
    }
    return;
  }

  if (
    snapshot.shell_family !== "CALM_SHELL" ||
    snapshot.customer_safe_projection !== null ||
    snapshot.customer_request_workspace !== null
  ) {
    fail("CORRUPT", "staff workspace snapshot carried customer-only projection blocks", [
      "WORKSPACE_STAFF_VISIBILITY_CONTRACT_INVALID",
    ]);
  }
}

function assertSnapshotGuardSpine(stored: StoredWorkspaceSnapshot) {
  const snapshot = stored.record;
  if (snapshot.item_id !== stored.item_id || snapshot.object_anchor_ref !== snapshot.item_id) {
    fail("CORRUPT", "workspace snapshot item anchor drifted", [
      "WORKSPACE_SNAPSHOT_ITEM_ANCHOR_DRIFT",
    ]);
  }
  if (
    snapshot.tenant_id !== stored.tenant_id ||
    snapshot.viewer_scope !== stored.viewer_scope ||
    snapshot.workspace_route_key !== stored.workspace_route_key ||
    snapshot.workspace_version !== stored.workspace_version ||
    snapshot.shell_stability_token !== stored.shell_stability_token ||
    snapshot.access_binding_hash !== stored.access_binding_hash ||
    snapshot.visibility_partition.cache_partition_key !==
      stored.visibility_cache_partition_key
  ) {
    fail("CORRUPT", "workspace snapshot stored index drifted from payload", [
      "WORKSPACE_SNAPSHOT_INDEX_DRIFT",
    ]);
  }
  if (
    snapshot.stability_contract.route_scope_class !== "WORKSPACE" ||
    snapshot.stability_contract.last_published_sequence_or_null !==
      snapshot.last_published_sequence ||
    snapshot.stability_contract.resume_token_or_null !== snapshot.resume_token
  ) {
    fail("CORRUPT", "workspace snapshot stability contract drifted", [
      "WORKSPACE_SNAPSHOT_STABILITY_DRIFT",
    ]);
  }
  if (
    snapshot.stream_recovery_contract.stream_scope_class !== "WORKSPACE" ||
    snapshot.stream_recovery_contract.route_key !== snapshot.workspace_route_key ||
    snapshot.stream_recovery_contract.subject_ref !== snapshot.item_id ||
    snapshot.stream_recovery_contract.resume_binding_ref_or_null !== snapshot.resume_token
  ) {
    fail("CORRUPT", "workspace snapshot stream recovery contract drifted", [
      "WORKSPACE_SNAPSHOT_RECOVERY_DRIFT",
    ]);
  }
}

export function validateStoredWorkspaceSnapshot(stored: StoredWorkspaceSnapshot) {
  try {
    validateWorkspaceSnapshot(stored.record);
    assertSnapshotAudience(stored.record);
    assertSnapshotGuardSpine(stored);
    return cloneWorkflowRecord(stored);
  } catch (error) {
    if (error instanceof WorkspaceReadError) {
      throw error;
    }
    fail("CORRUPT", error instanceof Error ? error.message : String(error), [
      "WORKSPACE_SNAPSHOT_SCHEMA_INVALID",
    ]);
  }
}

export async function getWorkspaceSnapshot(input: GetWorkspaceSnapshotInput) {
  if (input.itemId.length === 0) {
    fail("QUERY_INVALID", "workspace snapshot requires an item id", [
      "WORKSPACE_ITEM_ID_REQUIRED",
    ]);
  }
  const stored = await input.repository.getLatestWorkspaceSnapshotForItem({
    item_id: input.itemId,
    viewer_scope: input.viewerScope,
  });
  if (stored === null) {
    fail("NOT_READY", "workspace snapshot is not materialized", [
      "WORKSPACE_SNAPSHOT_NOT_READY",
    ]);
  }
  const validated = validateStoredWorkspaceSnapshot(stored);
  if (validated.tenant_id !== input.actorContext.tenant_id) {
    fail("HIDDEN", "workspace snapshot tenant is not visible to actor", [
      "WORKSPACE_TENANT_NOT_VISIBLE",
    ]);
  }
  if (validated.viewer_scope !== input.viewerScope) {
    fail("CORRUPT", "workspace snapshot viewer scope drifted", [
      "WORKSPACE_VIEWER_SCOPE_DRIFT",
    ]);
  }
  return validated;
}

export function viewerScopeFromAudience(value: string | null | undefined) {
  if (value === undefined || value === null || value.length === 0) {
    return null;
  }
  const normalized = value.toLowerCase();
  if (normalized === "staff" || normalized === "staff_full") {
    return "STAFF_FULL" as const;
  }
  if (normalized === "customer" || normalized === "customer_visible") {
    return "CUSTOMER_VISIBLE" as const;
  }
  return null;
}

export function defaultViewerScopeForActor(actorContext: NorthboundActorContext) {
  return actorContext.client_id_or_null === null
    ? ("STAFF_FULL" as const)
    : ("CUSTOMER_VISIBLE" as const);
}
