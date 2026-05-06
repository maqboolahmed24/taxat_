import type { RouteStabilityContract } from "../../../../packages/generated-models/src/generated/typescript/surface-and-experience.ts";
import {
  buildRouteStabilityContract,
  type WorkspaceViewerScope,
} from "../../../backend-workflow/src/projectors/projection_contract_helpers.ts";
import { deriveAuthoritativeEtag } from "./derive_authoritative_etag.ts";

export type WorkspaceStabilityInput = {
  customerHeadSequence: number;
  frameEpoch: number;
  internalHeadSequenceOrNull: number | null;
  lastPublishedSequence: number;
  requestStateVersionOrNull: number | null;
  resumeToken: string;
  shellStabilityToken: string;
  workspaceVersion: number;
};

export function buildWorkspaceStabilityContract(
  input: WorkspaceStabilityInput,
): RouteStabilityContract {
  return buildRouteStabilityContract({
    customer_head_sequence: input.customerHeadSequence,
    frame_epoch: input.frameEpoch,
    internal_head_sequence_or_null: input.internalHeadSequenceOrNull,
    last_published_sequence: input.lastPublishedSequence,
    request_state_version_or_null: input.requestStateVersionOrNull,
    resume_token: input.resumeToken,
    shell_stability_token: input.shellStabilityToken,
    workspace_version: input.workspaceVersion,
  }) as RouteStabilityContract;
}

export function buildWorkspaceStabilityContractFromSnapshot(input: {
  snapshot: {
    customer_head_sequence: number;
    frame_epoch: number;
    internal_head_sequence_or_null: number | null;
    last_published_sequence: number;
    request_state_version_or_null: number | null;
    resume_token: string;
    shell_stability_token: string;
    workspace_version: number;
  };
}) {
  return buildWorkspaceStabilityContract({
    customerHeadSequence: input.snapshot.customer_head_sequence,
    frameEpoch: input.snapshot.frame_epoch,
    internalHeadSequenceOrNull: input.snapshot.internal_head_sequence_or_null,
    lastPublishedSequence: input.snapshot.last_published_sequence,
    requestStateVersionOrNull: input.snapshot.request_state_version_or_null,
    resumeToken: input.snapshot.resume_token,
    shellStabilityToken: input.snapshot.shell_stability_token,
    workspaceVersion: input.snapshot.workspace_version,
  });
}

export function applyWorkspaceSnapshotConditionalRequest(input: {
  ifNoneMatch?: string | null;
  workspaceVersion: number;
}) {
  const etag = deriveAuthoritativeEtag({
    basis: "GUARD_VALUE",
    staleGuardFamily: "WORK_ITEM_VERSION",
    value: input.workspaceVersion,
  });
  return {
    etag,
    status: input.ifNoneMatch === etag ? "NOT_MODIFIED" : "MODIFIED",
  } as const;
}

export function routeKeyForWorkspaceViewer(input: {
  itemId: string;
  viewerScope: WorkspaceViewerScope;
}) {
  return input.viewerScope === "CUSTOMER_VISIBLE"
    ? `/portal/requests/${input.itemId}`
    : `/work/items/${input.itemId}`;
}
