import {
  projectSemanticAccessibilityContract,
  projectShellDominanceContract,
  projectShellStateTaxonomyContract,
} from "../../../backend-low-noise/src/index.ts";
import { buildGovernanceRouteContinuityContract as buildSharedGovernanceRouteContinuityContract } from "../../../backend-recovery/src/services/build_cross_device_continuity_contract.ts";
import { createCacheIsolationContract } from "../../../domain-kernel/src/cache/cache_isolation_key.ts";
import {
  sortSetLikeStrings,
  stableJsonHash,
} from "../../../domain-kernel/src/primitives/hash.ts";
import type {
  TenantGovernanceSnapshot,
  TenantGovernanceSnapshotSupportRegionState,
} from "../../../generated-models/src/generated/typescript/governance-and-policy.ts";
import {
  buildGovernanceOverviewFilters,
  type GovernanceOverviewFilters,
} from "../services/build_governance_overview_filters.ts";
import { buildGovernanceInteractionLayer } from "./build_governance_interaction_layer.ts";
import { deriveGovernanceAttentionSummary } from "../services/derive_governance_attention_summary.ts";
import {
  buildGovernanceRiskLedger,
  type GovernanceRiskLedgerFamilySource,
} from "../services/build_governance_risk_ledger.ts";
import {
  deriveGovernanceFamilyScores,
  governanceFamilyOrder,
  governanceFamilyToQueueCode,
  type GovernanceFamilyCode,
  type GovernanceFamilyScoreSource,
} from "../services/derive_governance_family_scores.ts";

export type TenantGovernanceFamilyProjectionSource = GovernanceFamilyScoreSource &
  GovernanceRiskLedgerFamilySource & {
    objectRefs?: readonly string[] | undefined;
  };

export type TenantGovernanceSupportRegionInput = {
  mode: TenantGovernanceSnapshotSupportRegionState["mode"];
  reasonCode?: string | null | undefined;
  selectedObjectRef?: string | null | undefined;
};

export type BuildTenantGovernanceSnapshotInput = {
  activeFilters?: Partial<GovernanceOverviewFilters> | undefined;
  dominantQuestion?: string | undefined;
  environmentRef: string;
  familySources: readonly TenantGovernanceFamilyProjectionSource[];
  focusAnchorRef?: string | null | undefined;
  objectAnchorRef?: string | undefined;
  pendingChangeRefs?: readonly string[] | undefined;
  pendingChangeWorklistRef: string;
  policySnapshotHash: string;
  previousSnapshot?: TenantGovernanceSnapshot | null | undefined;
  principalClass?: string | undefined;
  recentChangeRefs?: readonly string[] | undefined;
  recoveryPosture?: TenantGovernanceSnapshot["recovery_posture"] | undefined;
  selectedCanvasObjectRef?: string | null | undefined;
  sessionBindingHash: string;
  settlementState?: TenantGovernanceSnapshot["settlement_state"] | undefined;
  snapshotId?: string | undefined;
  supportRegion?: TenantGovernanceSupportRegionInput | undefined;
  tenantId: string;
  updatedAt: string;
};

export class TenantGovernanceSnapshotProjectionError extends Error {
  constructor(detail: string) {
    super(`TENANT_GOVERNANCE_SNAPSHOT_PROJECTION_INVALID: ${detail}`);
    this.name = "TenantGovernanceSnapshotProjectionError";
  }
}

const defaultObjectAnchorRef = "/governance";

const supportSurfaceByMode = {
  APPROVAL: "APPROVAL_PANEL",
  AUDIT: "AUDIT_SIDECAR",
  BLAST_RADIUS: "BLAST_RADIUS_PANEL",
  DIFF: "DIFF_PANEL",
  EXPORT_ELIGIBILITY: "EXPORT_ELIGIBILITY_PANEL",
  NONE: null,
} as const;

const supportRoleByMode = {
  APPROVAL: "SUBORDINATE",
  AUDIT: "INVESTIGATION",
  BLAST_RADIUS: "SUBORDINATE",
  DIFF: "INVESTIGATION",
  EXPORT_ELIGIBILITY: "SUBORDINATE",
  NONE: "NONE",
} as const;

function requireNonEmptyString(label: string, value: string | null | undefined) {
  const normalized = (value ?? "").trim();
  if (normalized.length === 0) {
    throw new TenantGovernanceSnapshotProjectionError(`${label} must be a non-empty string`);
  }
  return normalized;
}

function assertDateTime(label: string, value: string) {
  const normalized = requireNonEmptyString(label, value);
  if (Number.isNaN(Date.parse(normalized))) {
    throw new TenantGovernanceSnapshotProjectionError(`${label} must be an ISO date-time string`);
  }
  return normalized;
}

function familySourceByCode(sources: readonly TenantGovernanceFamilyProjectionSource[]) {
  const byFamily = new Map<GovernanceFamilyCode, TenantGovernanceFamilyProjectionSource>();
  for (const source of sources) {
    if (byFamily.has(source.family)) {
      throw new TenantGovernanceSnapshotProjectionError(`duplicate family source ${source.family}`);
    }
    byFamily.set(source.family, source);
  }
  for (const family of governanceFamilyOrder) {
    if (!byFamily.has(family)) {
      throw new TenantGovernanceSnapshotProjectionError(`missing family source ${family}`);
    }
  }
  return byFamily;
}

function uniqueSortedRefs(label: string, refs: readonly string[] | undefined) {
  const normalized = (refs ?? []).map((ref) => requireNonEmptyString(label, ref));
  return sortSetLikeStrings([...new Set(normalized)]);
}

function boundedRequiredRefs(input: {
  count: number;
  family: GovernanceFamilyCode;
  maxItems: number;
  refs: readonly string[] | undefined;
}) {
  if (input.count === 0) {
    return [];
  }
  const refs = uniqueSortedRefs(`${input.family}.objectRefs[]`, input.refs);
  if (refs.length === 0) {
    throw new TenantGovernanceSnapshotProjectionError(
      `${input.family}.objectRefs[] must include at least one visible ref when count is open`,
    );
  }
  return refs.slice(0, Math.min(input.maxItems, input.count));
}

function boundedSortedRefs(label: string, refs: readonly string[] | undefined, maxItems: number) {
  const normalized = uniqueSortedRefs(label, refs);
  if (normalized.length > maxItems) {
    throw new TenantGovernanceSnapshotProjectionError(
      `${label} must not exceed ${maxItems} refs`,
    );
  }
  return normalized;
}

function ensurePendingChangesComeFromRecent(input: {
  pendingChangeRefs: readonly string[];
  recentChangeRefs: readonly string[];
}) {
  const recent = new Set(input.recentChangeRefs);
  const missing = input.pendingChangeRefs.filter((ref) => !recent.has(ref));
  if (missing.length > 0) {
    throw new TenantGovernanceSnapshotProjectionError(
      `pendingChangeRefs must be a subset of recentChangeRefs; missing ${missing.join(", ")}`,
    );
  }
}

function selectedObjectFor(input: {
  familySourcesByCode: ReadonlyMap<GovernanceFamilyCode, TenantGovernanceFamilyProjectionSource>;
  focusAnchorRef: string | null | undefined;
  previousSnapshot?: TenantGovernanceSnapshot | null | undefined;
  primaryFamily: GovernanceFamilyCode | null;
  requestedSelectedObjectRef?: string | null | undefined;
}) {
  if (input.requestedSelectedObjectRef !== undefined) {
    return input.requestedSelectedObjectRef;
  }
  if (input.previousSnapshot?.selected_canvas_object_ref) {
    return input.previousSnapshot.selected_canvas_object_ref;
  }
  if (input.primaryFamily) {
    const primaryRefs = input.familySourcesByCode.get(input.primaryFamily)?.objectRefs ?? [];
    if (primaryRefs.length > 0) {
      return primaryRefs[0]!;
    }
  }
  return input.focusAnchorRef ?? null;
}

function supportRegionStateFor(input: {
  attentionIsCalm: boolean;
  selectedCanvasObjectRef: string | null;
  supportRegion?: TenantGovernanceSupportRegionInput | undefined;
}) {
  const mode =
    input.supportRegion?.mode ??
    (input.attentionIsCalm || input.selectedCanvasObjectRef === null ? "NONE" : "AUDIT");
  if (mode === "NONE") {
    return {
      mode: "NONE",
      reason_code: null,
      selected_object_ref: null,
    } satisfies TenantGovernanceSnapshotSupportRegionState;
  }

  if (input.selectedCanvasObjectRef === null) {
    throw new TenantGovernanceSnapshotProjectionError(
      "supportRegion.mode requires selectedCanvasObjectRef",
    );
  }
  if (
    input.supportRegion?.selectedObjectRef !== undefined &&
    input.supportRegion.selectedObjectRef !== null &&
    input.supportRegion.selectedObjectRef !== input.selectedCanvasObjectRef
  ) {
    throw new TenantGovernanceSnapshotProjectionError(
      "supportRegion.selectedObjectRef must match selectedCanvasObjectRef",
    );
  }
  return {
    mode,
    reason_code: requireNonEmptyString(
      "supportRegion.reasonCode",
      input.supportRegion?.reasonCode ?? `${mode}_SUPPORTS_SELECTED_GOVERNANCE_OBJECT`,
    ),
    selected_object_ref: input.selectedCanvasObjectRef,
  } satisfies TenantGovernanceSnapshotSupportRegionState;
}

function countForFamily(
  familySourcesByCode: ReadonlyMap<GovernanceFamilyCode, TenantGovernanceFamilyProjectionSource>,
  family: GovernanceFamilyCode,
) {
  return familySourcesByCode.get(family)!.openCount;
}

function snapshotIdFor(input: {
  environmentRef: string;
  policySnapshotHash: string;
  tenantId: string;
  updatedAt: string;
}) {
  return `tenant-governance-snapshot.${stableJsonHash(input).slice(0, 16)}`;
}

function crossDeviceContinuityContractFor(input: {
  dominantActionState: "ACTION_AVAILABLE" | "NO_SAFE_ACTION";
  focusAnchorRef: string | null;
  objectAnchorRef: string;
  policySnapshotHash: string;
}) {
  return buildSharedGovernanceRouteContinuityContract({
    canonical_object_ref: input.objectAnchorRef,
    dominant_action_state_or_null: input.dominantActionState,
    focus_anchor_ref_or_null: input.focusAnchorRef,
    route_identity_ref: input.objectAnchorRef,
    stability_guard_hash_or_null: input.policySnapshotHash,
  }) satisfies TenantGovernanceSnapshot["cross_device_continuity_contract"];
}

export async function buildTenantGovernanceSnapshot(
  input: BuildTenantGovernanceSnapshotInput,
): Promise<TenantGovernanceSnapshot> {
  const tenantId = requireNonEmptyString("tenantId", input.tenantId);
  const environmentRef = requireNonEmptyString("environmentRef", input.environmentRef);
  const policySnapshotHash = requireNonEmptyString(
    "policySnapshotHash",
    input.policySnapshotHash,
  );
  const objectAnchorRef = requireNonEmptyString(
    "objectAnchorRef",
    input.objectAnchorRef ?? defaultObjectAnchorRef,
  );
  const updatedAt = assertDateTime("updatedAt", input.updatedAt);
  const familySourcesByCode = familySourceByCode(input.familySources);
  const scores = deriveGovernanceFamilyScores({
    familySources: input.familySources,
    previousSnapshot: input.previousSnapshot,
  });
  const primaryFamily = scores.primary_family ?? "PENDING_APPROVALS";
  const primaryQueueCode = governanceFamilyToQueueCode[primaryFamily];
  const ledger = buildGovernanceRiskLedger({
    familySources: input.familySources,
    primaryFamily,
  });
  const attentionSummary = deriveGovernanceAttentionSummary({
    familyScores: scores.family_scores,
    primaryFamily: scores.primary_family,
    riskLedgerEntries: ledger,
  });
  const primaryWorklistRef = familySourcesByCode.get(primaryFamily)!.worklistRef;
  const activeFilters = buildGovernanceOverviewFilters({
    environmentRef,
    filters: input.activeFilters,
    primaryQueueCode,
  });
  const interactionLayer = buildGovernanceInteractionLayer({
    activeFilters,
    routeFamily: "tenant_governance_snapshot",
  });
  const selectedCanvasObjectRef = selectedObjectFor({
    familySourcesByCode,
    focusAnchorRef: input.focusAnchorRef,
    previousSnapshot: input.previousSnapshot,
    primaryFamily: scores.primary_family,
    requestedSelectedObjectRef: input.selectedCanvasObjectRef,
  });
  const normalizedSelectedCanvasObjectRef =
    selectedCanvasObjectRef === null
      ? null
      : requireNonEmptyString("selectedCanvasObjectRef", selectedCanvasObjectRef);
  if (attentionSummary.attention_family !== "CALM" && normalizedSelectedCanvasObjectRef === null) {
    throw new TenantGovernanceSnapshotProjectionError(
      "non-calm governance attention requires a selected canvas object",
    );
  }
  const focusAnchorCandidate = input.focusAnchorRef ?? normalizedSelectedCanvasObjectRef;
  const focusAnchorRef =
    input.focusAnchorRef === null || focusAnchorCandidate === null
      ? null
      : requireNonEmptyString("focusAnchorRef", focusAnchorCandidate);
  const supportRegionState = supportRegionStateFor({
    attentionIsCalm: attentionSummary.attention_family === "CALM",
    selectedCanvasObjectRef: normalizedSelectedCanvasObjectRef,
    supportRegion: input.supportRegion,
  });
  const recentChangeRefs = boundedSortedRefs("recentChangeRefs[]", input.recentChangeRefs, 20);
  const pendingChangeRefs = boundedSortedRefs("pendingChangeRefs[]", input.pendingChangeRefs, 12);
  ensurePendingChangesComeFromRecent({ pendingChangeRefs, recentChangeRefs });

  const authorityLinkRiskRefs = boundedRequiredRefs({
    count: countForFamily(familySourcesByCode, "AUTHORITY_LINK_RISK"),
    family: "AUTHORITY_LINK_RISK",
    maxItems: 6,
    refs: familySourcesByCode.get("AUTHORITY_LINK_RISK")!.objectRefs,
  });
  const retentionExceptionRefs = boundedRequiredRefs({
    count: countForFamily(familySourcesByCode, "RETENTION_EXCEPTION"),
    family: "RETENTION_EXCEPTION",
    maxItems: 6,
    refs: familySourcesByCode.get("RETENTION_EXCEPTION")!.objectRefs,
  });
  const auditHotspotRefs = boundedRequiredRefs({
    count: countForFamily(familySourcesByCode, "AUDIT_HOTSPOT"),
    family: "AUDIT_HOTSPOT",
    maxItems: 12,
    refs: familySourcesByCode.get("AUDIT_HOTSPOT")!.objectRefs,
  });
  if (auditHotspotRefs.length !== countForFamily(familySourcesByCode, "AUDIT_HOTSPOT")) {
    throw new TenantGovernanceSnapshotProjectionError(
      "AUDIT_HOTSPOT.openCount must equal auditHotspotRefs length in the current schema",
    );
  }

  const dominantActionState =
    attentionSummary.attention_family !== "CALM" &&
    attentionSummary.primary_worklist_ref !== null &&
    attentionSummary.next_legal_action_label !== null
      ? "ACTION_AVAILABLE"
      : "NO_SAFE_ACTION";
  const settlementState = input.settlementState ?? "STEADY";
  const recoveryPosture = input.recoveryPosture ?? "NONE";
  const dominantQuestion =
    input.dominantQuestion ?? "Which governance issue needs operator attention first?";
  const dominanceContract = projectShellDominanceContract({
    actionabilityState: dominantActionState,
    auditModeExplicit: supportRegionState.mode === "AUDIT",
    compareModeExplicit: supportRegionState.mode === "DIFF",
    dominantActionRefOrNull:
      dominantActionState === "ACTION_AVAILABLE" ? attentionSummary.primary_worklist_ref : null,
    dominantQuestion,
    primaryActionCode:
      dominantActionState === "ACTION_AVAILABLE" ? attentionSummary.primary_worklist_ref : null,
    recoveryPosture,
    settlementState,
    shellFamily: "GOVERNANCE_DENSITY_SHELL",
    supportSurfaceCodeOrNull: supportSurfaceByMode[supportRegionState.mode],
    supportSurfaceRole: supportRoleByMode[supportRegionState.mode],
  });
  const stateTaxonomyContract = projectShellStateTaxonomyContract({
    recoveryPosture,
    settlementState,
  });
  const cacheIsolationContract = await createCacheIsolationContract({
    cacheScopeClass: "TENANT_GOVERNANCE_SNAPSHOT",
    canonicalObjectRef: objectAnchorRef,
    principalClass: input.principalClass ?? "STAFF_FULL",
    projectionVersionRef: policySnapshotHash,
    routeIdentityRef: objectAnchorRef,
    sessionBindingHash: requireNonEmptyString("sessionBindingHash", input.sessionBindingHash),
    shellFamily: "GOVERNANCE_DENSITY_SHELL",
    tenantId,
  });

  return {
    active_filters: activeFilters,
    artifact_type: "TenantGovernanceSnapshot",
    attention_summary: attentionSummary,
    audit_hotspot_refs: auditHotspotRefs,
    audit_hotspot_worklist_ref: familySourcesByCode.get("AUDIT_HOTSPOT")!.worklistRef,
    authority_link_risk_refs: authorityLinkRiskRefs,
    authority_link_risk_worklist_ref: familySourcesByCode.get("AUTHORITY_LINK_RISK")!.worklistRef,
    cache_isolation_contract: cacheIsolationContract,
    configuration_drift_worklist_ref: familySourcesByCode.get("CONFIGURATION_DRIFT")!.worklistRef,
    cross_device_continuity_contract: crossDeviceContinuityContractFor({
      dominantActionState,
      focusAnchorRef,
      objectAnchorRef,
      policySnapshotHash,
    }),
    dominance_contract: dominanceContract,
    dominant_question: dominantQuestion,
    environment_ref: environmentRef,
    expiring_authority_link_count: countForFamily(familySourcesByCode, "AUTHORITY_LINK_RISK"),
    focus_anchor_ref: focusAnchorRef,
    interaction_layer: interactionLayer,
    object_anchor_ref: objectAnchorRef,
    pending_approval_count: countForFamily(familySourcesByCode, "PENDING_APPROVALS"),
    pending_approval_worklist_ref: familySourcesByCode.get("PENDING_APPROVALS")!.worklistRef,
    pending_change_refs: pendingChangeRefs,
    pending_change_worklist_ref: requireNonEmptyString(
      "pendingChangeWorklistRef",
      input.pendingChangeWorklistRef,
    ),
    policy_snapshot_hash: policySnapshotHash,
    primary_queue_code: primaryQueueCode,
    primary_worklist_ref: requireNonEmptyString("primaryWorklistRef", primaryWorklistRef),
    recent_change_refs: recentChangeRefs,
    recovery_posture: recoveryPosture,
    retention_exception_count: countForFamily(familySourcesByCode, "RETENTION_EXCEPTION"),
    retention_exception_refs: retentionExceptionRefs,
    retention_exception_worklist_ref: familySourcesByCode.get("RETENTION_EXCEPTION")!.worklistRef,
    risky_configuration_drift_count: countForFamily(familySourcesByCode, "CONFIGURATION_DRIFT"),
    risk_ledger_entries: ledger,
    selected_canvas_object_ref: normalizedSelectedCanvasObjectRef,
    semantic_accessibility_contract: projectSemanticAccessibilityContract({
      surfaceType: "TenantGovernanceSnapshot",
    }),
    settlement_state: settlementState,
    shell_family: "GOVERNANCE_DENSITY_SHELL",
    snapshot_id:
      input.snapshotId ??
      snapshotIdFor({
        environmentRef,
        policySnapshotHash,
        tenantId,
        updatedAt,
      }),
    state_taxonomy_contract: stateTaxonomyContract,
    support_region_state: supportRegionState,
    tenant_id: tenantId,
    updated_at: updatedAt,
  };
}
