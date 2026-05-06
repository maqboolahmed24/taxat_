import { createCacheIsolationContract } from "../../../domain-kernel/src/cache/cache_isolation_key.ts";
import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import {
  buildGovernancePolicySnapshotHashInput,
  deriveApprovalRules,
  deriveEnvironmentBindings,
  deriveMaskingDefaults,
  deriveSessionSecurityPosture,
  deriveStepUpRules,
  loadGovernancePolicyProjectionInputs,
  type GovernancePolicyProjectionInputs,
} from "../../../backend-access/src/projectors/governance_policy_snapshot_projector.ts";
import { buildGovernancePolicySnapshotHash } from "../../../backend-access/src/hash/policy_snapshot_hash.ts";
import {
  normalizeGovernancePolicySnapshotRecord,
  type GovernancePolicySnapshotRecord,
} from "../../../backend-access/src/models/governance_policy_snapshot.ts";
import type {
  GovernancePolicySnapshotRecoveryPosture,
  GovernancePolicySnapshotSectionCode,
  GovernancePolicySnapshotSettlementState,
  GovernancePolicySnapshotStagedChangeGroup,
} from "../../../generated-models/src/generated/typescript/governance-and-policy.ts";
import { buildGovernanceInteractionLayer } from "./build_governance_interaction_layer.ts";
import { buildConfigHistoryTimeline } from "../services/build_config_history_timeline.ts";
import { buildGovernanceApprovalComposer } from "../services/build_governance_approval_composer.ts";
import { buildGovernanceBlastRadiusPanel } from "../services/build_governance_blast_radius_panel.ts";
import { buildGovernanceChangeBasket } from "../services/build_governance_change_basket.ts";
import { buildTenantConfigWorkspace } from "../services/build_tenant_config_workspace.ts";

export type BuildGovernancePolicySnapshotInput = {
  activeSectionCode?: GovernancePolicySnapshotSectionCode | string | null | undefined;
  approvalSubmitted?: boolean | undefined;
  capturedAt?: string | undefined;
  directSubmissionRequested?: boolean | undefined;
  expiresAt?: string | null | undefined;
  lastMaterialChangeRef?: string | undefined;
  policyInputs?: GovernancePolicyProjectionInputs | undefined;
  previousSnapshot?: GovernancePolicySnapshotRecord | null | undefined;
  principalClass?: string | undefined;
  rationaleRef?: string | null | undefined;
  rationaleRequired?: boolean | undefined;
  readyToSubmit?: boolean | undefined;
  receiptPending?: boolean | undefined;
  relatedObjectRefs?: readonly string[] | undefined;
  requestedApproverScope?: readonly string[] | undefined;
  reviewedPolicySnapshotHash?: string | null | undefined;
  selectedHistoryChangeRef?: string | null | undefined;
  sessionBindingHash?: string | undefined;
  snapshotId?: string | undefined;
  stagedChangeGroups?: readonly GovernancePolicySnapshotStagedChangeGroup[] | undefined;
  staleBasket?: boolean | undefined;
  stepUpPending?: boolean | undefined;
  tenantId?: string | undefined;
  visibleHistoryChangeRefs?: readonly string[] | undefined;
  visibleBlastGroupRef?: string | null | undefined;
};

function policyObjectAnchorRef(tenantId: string) {
  return `/v1/governance/tenants/${encodeURIComponent(tenantId)}/policy-snapshot`;
}

function defaultLastMaterialChangeRef(policySnapshotHash: string) {
  return `policy-change.${policySnapshotHash.slice(0, 16)}`;
}

function snapshotIdFor(input: {
  activeSectionCode: string;
  lastMaterialChangeRef: string;
  policySnapshotHash: string;
  selectedHistoryChangeRef: string | null;
  stagedChangeGroups: readonly GovernancePolicySnapshotStagedChangeGroup[];
  tenantId: string;
}) {
  return `governance-policy-snapshot.${stableJsonHash({
    active_section_code: input.activeSectionCode,
    last_material_change_ref: input.lastMaterialChangeRef,
    policy_snapshot_hash: input.policySnapshotHash,
    selected_history_change_ref: input.selectedHistoryChangeRef,
    staged_change_group_refs: input.stagedChangeGroups.map((group) => ({
      basis_contract_hash: group.mutation_basis_contract.basis_contract_hash,
      hazard_contract_hash: group.mutation_hazard.hazard_contract_hash,
      object_type: group.object_type,
      staged_change_refs: group.staged_changes.map((change) => change.change_ref),
    })),
    tenant_id: input.tenantId,
  }).slice(0, 24)}`;
}

function settlementFor(input: {
  receiptPending: boolean;
  rebaseRequired: boolean;
}): GovernancePolicySnapshotSettlementState {
  if (input.receiptPending) {
    return "RECEIPT_PENDING";
  }
  return input.rebaseRequired ? "STALE_REVIEW_REQUIRED" : "STEADY";
}

function recoveryFor(rebaseRequired: boolean): GovernancePolicySnapshotRecoveryPosture {
  return rebaseRequired ? "INLINE_REBASE" : "NONE";
}

export async function buildGovernancePolicySnapshot(
  input: BuildGovernancePolicySnapshotInput = {},
): Promise<GovernancePolicySnapshotRecord> {
  const tenant_id = input.tenantId ?? "tenant.taxat-sandbox";
  const captured_at = input.capturedAt ?? "2026-05-04T09:30:00.000Z";
  const policyInputs =
    input.policyInputs ?? (await loadGovernancePolicyProjectionInputs());
  const policy_snapshot_hash = buildGovernancePolicySnapshotHash(
    buildGovernancePolicySnapshotHashInput(policyInputs),
  );
  const reviewedPolicySnapshotHash =
    input.reviewedPolicySnapshotHash === undefined
      ? policy_snapshot_hash
      : input.reviewedPolicySnapshotHash;
  const routeStale =
    reviewedPolicySnapshotHash !== null &&
    reviewedPolicySnapshotHash !== policy_snapshot_hash;
  const last_material_change_ref =
    input.lastMaterialChangeRef ??
    input.previousSnapshot?.last_material_change_ref ??
    defaultLastMaterialChangeRef(policy_snapshot_hash);
  const tenant_config_workspace = buildTenantConfigWorkspace({
    activeSectionCode:
      input.activeSectionCode ??
      input.previousSnapshot?.tenant_config_workspace.active_section_code ??
      undefined,
    materialConfigHashes: policyInputs.material_config_hashes,
    previousWorkspace: input.previousSnapshot?.tenant_config_workspace,
  });
  const change_basket = buildGovernanceChangeBasket({
    currentPolicySnapshotHash: policy_snapshot_hash,
    directSubmissionRequested: input.directSubmissionRequested,
    readyToSubmit: input.readyToSubmit,
    receiptPending: input.receiptPending,
    stagedChangeGroups: input.stagedChangeGroups,
    stale: input.staleBasket ?? routeStale,
    stepUpPending: input.stepUpPending,
  });
  const rebaseRequired =
    routeStale || change_basket.basket_state === "STALE_REBASE_REQUIRED";
  const recovery_posture = recoveryFor(rebaseRequired);
  const object_anchor_ref = policyObjectAnchorRef(tenant_id);
  const cache_isolation_contract = await createCacheIsolationContract({
    cacheScopeClass: "GOVERNANCE_POLICY_SNAPSHOT",
    canonicalObjectRef: object_anchor_ref,
    principalClass: input.principalClass ?? "STAFF_FULL",
    projectionVersionRef: policy_snapshot_hash,
    routeIdentityRef: object_anchor_ref,
    sessionBindingHash:
      input.sessionBindingHash ?? "session-binding.governance-policy-snapshot",
    shellFamily: "GOVERNANCE_DENSITY_SHELL",
    tenantId: tenant_id,
  });
  const approval_composer = buildGovernanceApprovalComposer({
    approvalSubmitted: input.approvalSubmitted,
    changeBasket: change_basket,
    expiresAt: input.expiresAt,
    rationaleRef: input.rationaleRef,
    rationaleRequired: input.rationaleRequired,
    relatedObjectRefs: input.relatedObjectRefs,
    requestedApproverScope: input.requestedApproverScope,
  });
  const blast_radius_panel = buildGovernanceBlastRadiusPanel({
    changeBasket: change_basket,
    visibleGroupRef: input.visibleBlastGroupRef,
  });
  const config_history_timeline = buildConfigHistoryTimeline({
    changeBasket: change_basket,
    lastMaterialChangeRef: last_material_change_ref,
    recoveryPosture: recovery_posture,
    selectedChangeRef:
      input.selectedHistoryChangeRef ??
      input.previousSnapshot?.config_history_timeline.selected_change_ref ??
      last_material_change_ref,
    visibleChangeRefs:
      input.visibleHistoryChangeRefs ??
      input.previousSnapshot?.config_history_timeline.visible_change_refs ??
      [last_material_change_ref],
  });
  const snapshot_id =
    input.snapshotId ??
    snapshotIdFor({
      activeSectionCode: tenant_config_workspace.active_section_code,
      lastMaterialChangeRef: last_material_change_ref,
      policySnapshotHash: policy_snapshot_hash,
      selectedHistoryChangeRef: config_history_timeline.selected_change_ref,
      stagedChangeGroups: change_basket.staged_change_groups,
      tenantId: tenant_id,
    });

  return normalizeGovernancePolicySnapshotRecord({
    approval_composer,
    approval_rules: deriveApprovalRules(policyInputs),
    artifact_type: "GovernancePolicySnapshot",
    blast_radius_panel,
    cache_isolation_contract,
    captured_at,
    change_basket,
    config_history_timeline,
    dominant_question:
      "What tenant policy governs access, security, authority environments, approvals, and evidence right now?",
    environment_bindings: deriveEnvironmentBindings(policyInputs),
    interaction_layer: buildGovernanceInteractionLayer({
      routeFamily: "governance_policy_snapshot",
    }),
    last_material_change_ref,
    masking_defaults: deriveMaskingDefaults(policyInputs),
    object_anchor_ref,
    policy_snapshot_hash,
    recovery_posture,
    session_security_posture: deriveSessionSecurityPosture(policyInputs),
    settlement_state: settlementFor({
      receiptPending: input.receiptPending === true,
      rebaseRequired,
    }),
    shell_family: "GOVERNANCE_DENSITY_SHELL",
    snapshot_id,
    step_up_rules: deriveStepUpRules(policyInputs),
    tenant_config_workspace,
    tenant_id,
  });
}
