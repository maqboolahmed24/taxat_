import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";
import type { AuthorityLinkInventoryItem } from "../../../generated-models/src/generated/typescript/authority-and-access.ts";
import type { AuthorityLinkRecord } from "../../../backend-access/src/models/authority_link.ts";
import { buildGovernanceInteractionLayer } from "./build_governance_interaction_layer.ts";
import {
  buildAffectedOperationList,
  type AuthorityLinkAffectedOperationInput,
} from "../services/build_affected_operation_list.ts";
import { buildBindingHealthTimeline } from "../services/build_binding_health_timeline.ts";
import { buildGuidedHandshakeStepper } from "../services/build_guided_handshake_stepper.ts";
import { buildPreflightChecklist } from "../services/build_preflight_checklist.ts";
import {
  deriveAuthorityLinkHealthRollup,
  type AuthorityLinkInventoryBindingHealth,
  type AuthorityLinkInventoryExpiryRiskBand,
  type AuthorityLinkInventoryLifecycleState,
} from "../services/derive_authority_link_health_rollup.ts";

export type AuthorityLinkInventoryItemRecord = Omit<
  AuthorityLinkInventoryItem,
  "expires_at" | "last_validated_at"
> & {
  expires_at: string | null;
  last_validated_at: string | null;
};

type ActiveAuthorityLinkFilters = {
  authority_scopes: string[];
  binding_health_states: AuthorityLinkInventoryBindingHealth[];
  client_refs: string[];
  expiry_risk_bands: AuthorityLinkInventoryExpiryRiskBand[];
  lifecycle_states: AuthorityLinkInventoryLifecycleState[];
  provider_environments: string[];
};

export type BuildAuthorityLinkInventoryItemInput = {
  activeFilters?: Partial<ActiveAuthorityLinkFilters> | undefined;
  affectedOperations?: readonly AuthorityLinkAffectedOperationInput[] | undefined;
  authorityLink: AuthorityLinkRecord;
  evaluatedAt: string;
  eventRefs?: readonly string[] | undefined;
  expectedProviderEnvironment?: string | null | undefined;
  externalHandoffRef?: string | null | undefined;
  focusAnchorRef?: string | null | undefined;
  guidedFlowMode?: AuthorityLinkInventoryItem["authority_link_workspace"]["guided_flow_mode"] | undefined;
  handshakeAttemptRefs?: readonly string[] | undefined;
  handshakeFlowState?: AuthorityLinkInventoryItem["guided_handshake_stepper"]["flow_state"] | undefined;
  latestAttemptState?: AuthorityLinkInventoryItem["handshake_history"]["latest_attempt_state"] | undefined;
  latestFailureRef?: string | null | undefined;
  nextValidationDueAt?: string | null | undefined;
  recoveryPosture?: AuthorityLinkInventoryItem["recovery_posture"] | undefined;
  selectedHandshakeAttemptRef?: string | null | undefined;
  settlementState?: AuthorityLinkInventoryItem["settlement_state"] | undefined;
};

const authorityLinkSurfaceOrder = [
  "INVENTORY_RAIL",
  "WORKSPACE_CANVAS",
  "AUDIT_SIDECAR",
] as const;

const authorityLinkDetailModuleOrder = [
  "AuthorityLinkIdentityCard",
  "BindingHealthTimeline",
  "HandshakeHistory",
  "AffectedOperationList",
  "PreflightChecklist",
] as const;

function uniqueSorted(values: readonly string[]) {
  return [...new Set(values.filter((value) => value.trim().length > 0))].sort((left, right) =>
    left.localeCompare(right),
  );
}

function mergeFilters(
  input: Partial<ActiveAuthorityLinkFilters> | undefined,
  required: ActiveAuthorityLinkFilters,
): ActiveAuthorityLinkFilters {
  return {
    authority_scopes: uniqueSorted([
      ...(input?.authority_scopes ?? []),
      ...required.authority_scopes,
    ]),
    binding_health_states: uniqueSorted([
      ...(input?.binding_health_states ?? []),
      ...required.binding_health_states,
    ]) as AuthorityLinkInventoryBindingHealth[],
    client_refs: uniqueSorted([...(input?.client_refs ?? []), ...required.client_refs]),
    expiry_risk_bands: uniqueSorted([
      ...(input?.expiry_risk_bands ?? []),
      ...required.expiry_risk_bands,
    ]) as AuthorityLinkInventoryExpiryRiskBand[],
    lifecycle_states: uniqueSorted([
      ...(input?.lifecycle_states ?? []),
      ...required.lifecycle_states,
    ]) as AuthorityLinkInventoryLifecycleState[],
    provider_environments: uniqueSorted([
      ...(input?.provider_environments ?? []),
      ...required.provider_environments,
    ]),
  };
}

function deriveGuidedFlowMode(input: {
  requestedMode?: AuthorityLinkInventoryItem["authority_link_workspace"]["guided_flow_mode"] | undefined;
  stepperFlowState: AuthorityLinkInventoryItem["guided_handshake_stepper"]["flow_state"];
  lifecycleState: AuthorityLinkInventoryItem["lifecycle_state"];
}) {
  if (input.requestedMode) {
    return input.requestedMode;
  }
  if (input.stepperFlowState === "LINKED") {
    return "DETAILS" as const;
  }
  if (
    input.lifecycleState === "AUTHORISED_ACTIVE" ||
    input.lifecycleState === "AUTHORISED_LIMITED"
  ) {
    return "RELINK" as const;
  }
  return "LINK" as const;
}

function latestAttemptStateFor(input: {
  flowState: AuthorityLinkInventoryItem["guided_handshake_stepper"]["flow_state"];
  requested?: AuthorityLinkInventoryItem["handshake_history"]["latest_attempt_state"] | undefined;
}) {
  if (input.requested) {
    return input.requested;
  }
  if (input.flowState === "HANDOFF_PENDING" || input.flowState === "VALIDATION_PENDING") {
    return "PENDING_RETURN" as const;
  }
  if (input.flowState === "NOT_STARTED") {
    return "NONE_RECORDED" as const;
  }
  return "COMPLETED" as const;
}

function handshakeHistory(input: {
  authorityLinkId: string;
  attemptRefs?: readonly string[] | undefined;
  flowState: AuthorityLinkInventoryItem["guided_handshake_stepper"]["flow_state"];
  latestAttemptState?: AuthorityLinkInventoryItem["handshake_history"]["latest_attempt_state"] | undefined;
  latestFailureRef?: string | null | undefined;
  selectedAttemptRef?: string | null | undefined;
}): AuthorityLinkInventoryItem["handshake_history"] {
  const latest_attempt_state = latestAttemptStateFor({
    flowState: input.flowState,
    requested: input.latestAttemptState,
  });
  const attempt_refs =
    latest_attempt_state === "NONE_RECORDED"
      ? []
      : uniqueSorted([
          ...(input.attemptRefs ?? []),
          `handshake-attempt.${input.authorityLinkId}.latest`,
        ]);
  const selected_attempt_ref_or_null =
    attempt_refs.length === 0
      ? null
      : input.selectedAttemptRef && attempt_refs.includes(input.selectedAttemptRef)
        ? input.selectedAttemptRef
        : attempt_refs.at(-1)!;
  const latest_failure_ref_or_null = ["FAILED", "ABANDONED", "EXPIRED"].includes(
    latest_attempt_state,
  )
    ? input.latestFailureRef ?? `handshake-failure.${input.authorityLinkId}.latest`
    : null;

  return {
    attempt_refs,
    latest_attempt_state,
    latest_failure_ref_or_null,
    selected_attempt_ref_or_null,
  };
}

type AuthorityLinkExternalizationContract =
  AuthorityLinkInventoryItem["externalization_governance_contract"];

function externalizationDeliveryBindingHash(
  contract: Omit<AuthorityLinkExternalizationContract, "delivery_binding_hash">,
) {
  return stableJsonHash({
    access_binding_hash_or_null: contract.access_binding_hash_or_null,
    approval_requirement_token_or_null: contract.approval_requirement_token_or_null,
    approval_state: contract.approval_state,
    blocking_context_tokens: [...contract.blocking_context_tokens].sort(),
    boundary_scope: contract.boundary_scope,
    context_anchor_ref: contract.context_anchor_ref,
    delivery_surface_kind: contract.delivery_surface_kind,
    download_target_ref_or_null: contract.download_target_ref_or_null,
    eligibility_state: contract.eligibility_state,
    external_handoff_target_ref_or_null: contract.external_handoff_target_ref_or_null,
    history_meaning_state: contract.history_meaning_state,
    limitation_state: contract.limitation_state,
    masking_posture_fingerprint_or_null: contract.masking_posture_fingerprint_or_null,
    masking_state: contract.masking_state,
    preview_target_ref_or_null: contract.preview_target_ref_or_null,
    print_target_ref_or_null: contract.print_target_ref_or_null,
    shell_family_or_null: contract.shell_family_or_null,
    slice_binding_ref: contract.slice_binding_ref,
    tenant_id: contract.tenant_id,
    visibility_cache_partition_key_or_null: contract.visibility_cache_partition_key_or_null,
  });
}

function buildAuthorityLinkExternalizationContract(input: {
  authorityLinkId: string;
  blockingCheckRefs: readonly string[];
  externalHandoffRef: string | null;
  flowState: AuthorityLinkInventoryItem["guided_handshake_stepper"]["flow_state"];
  tenantId: string;
}): AuthorityLinkExternalizationContract {
  const eligibility_state =
    input.flowState === "BLOCKED"
      ? "BLOCKED"
      : input.flowState === "HANDOFF_PENDING" || input.flowState === "VALIDATION_PENDING"
        ? "PENDING_RETURN"
        : "READY";
  const base = {
    access_binding_hash_or_null: null,
    approval_requirement_token_or_null: null,
    approval_state: "NOT_REQUIRED",
    background_scope_policy: "DETACHED_BACKGROUND_SCOPE_FORBIDDEN",
    blocking_context_tokens: [...input.blockingCheckRefs],
    boundary_scope: "AUTHORITY_LINK_HANDOFF",
    context_anchor_ref: input.authorityLinkId,
    contract_version: "EXTERNALIZATION_GOVERNANCE_V1",
    delivery_context_policy: "TENANT_AND_SECURITY_CONTEXT_BOUND_AT_INVOCATION",
    delivery_surface_kind: "AUTHORITY_LINK_EXTERNAL_HANDOFF",
    direct_url_policy: "DIRECT_URL_BYPASS_FORBIDDEN",
    download_target_ref_or_null: null,
    eligibility_state,
    external_handoff_target_ref_or_null: input.externalHandoffRef,
    handoff_target_policy: "EXTERNAL_TARGET_AND_BLOCKING_CONTEXT_EXPLICIT",
    history_meaning_state: "HANDOFF_TARGET_EXPLICIT",
    limitation_state:
      input.blockingCheckRefs.length > 0 ? "PREFLIGHT_BLOCKED" : "FULL",
    masking_posture_fingerprint_or_null: null,
    masking_state: "NOT_APPLICABLE",
    posture_preservation_policy: "CURRENT_HISTORY_MASKING_LIMITATION_AND_APPROVAL_PRESERVED",
    preview_target_ref_or_null: null,
    print_target_ref_or_null: null,
    reentry_validation_policy: "RETURN_AND_DELIVERY_REQUIRE_GOVERNED_REVALIDATION",
    shell_family_or_null: "GOVERNANCE_DENSITY_SHELL",
    signed_url_binding_policy: "SIGNED_URLS_REQUIRE_CURRENT_GOVERNED_BINDING",
    slice_binding_policy: "ACTIVE_GOVERNED_SLICE_REQUIRED",
    slice_binding_ref: input.authorityLinkId,
    temporary_artifact_policy: "TEMP_FILES_AND_NATIVE_PREVIEWS_REQUIRE_MATCHING_BINDING",
    tenant_id: input.tenantId,
    visibility_cache_partition_key_or_null: null,
  } satisfies Omit<AuthorityLinkExternalizationContract, "delivery_binding_hash">;

  return {
    ...base,
    delivery_binding_hash: externalizationDeliveryBindingHash(base),
  };
}

export async function buildAuthorityLinkInventoryItem(
  input: BuildAuthorityLinkInventoryItemInput,
): Promise<AuthorityLinkInventoryItemRecord> {
  const evaluatedAt = normalizeUtcInstantString(input.evaluatedAt);
  const healthRollup = deriveAuthorityLinkHealthRollup({
    authorityLink: input.authorityLink,
    evaluatedAt,
    expectedProviderEnvironment: input.expectedProviderEnvironment,
  });
  const preflight_checklist = buildPreflightChecklist({
    authorityLink: input.authorityLink,
    evaluatedAt,
    healthRollup,
  });
  const guided_handshake_stepper = buildGuidedHandshakeStepper({
    authorityLinkId: input.authorityLink.authority_link_id,
    externalHandoffRef: input.externalHandoffRef,
    flowState: input.handshakeFlowState,
    lifecycleState: healthRollup.lifecycle_state,
    preflightBlockingCheckRefs: preflight_checklist.blocking_check_refs,
  });
  const { affected_operation_counts, affected_operation_list } =
    buildAffectedOperationList({
      authorityLinkId: input.authorityLink.authority_link_id,
      operations: input.affectedOperations,
      preflightBlockingCheckRefs: preflight_checklist.blocking_check_refs,
    });
  const binding_health_timeline = buildBindingHealthTimeline({
    authorityLink: input.authorityLink,
    evaluatedAt,
    eventRefs: input.eventRefs,
    healthRollup,
    nextValidationDueAt: input.nextValidationDueAt,
  });
  const handshake_history = handshakeHistory({
    authorityLinkId: input.authorityLink.authority_link_id,
    attemptRefs: input.handshakeAttemptRefs,
    flowState: guided_handshake_stepper.flow_state,
    latestAttemptState: input.latestAttemptState,
    latestFailureRef: input.latestFailureRef,
    selectedAttemptRef: input.selectedHandshakeAttemptRef,
  });
  const active_filters = mergeFilters(input.activeFilters, {
    authority_scopes: [input.authorityLink.authority_scope],
    binding_health_states: [healthRollup.binding_health],
    client_refs: [input.authorityLink.client_id],
    expiry_risk_bands: [healthRollup.expiry_risk_band],
    lifecycle_states: [healthRollup.lifecycle_state],
    provider_environments: [input.authorityLink.provider_environment],
  });
  const focus_anchor_ref =
    input.focusAnchorRef ??
    healthRollup.prominent_issue_ref_or_null ??
    affected_operation_list.primary_blocked_operation_ref_or_null ??
    input.authorityLink.authority_link_id;
  const interaction_layer = buildGovernanceInteractionLayer({
    activeFilters: active_filters,
    routeFamily: "authority_link_inventory",
  });
  const externalization_governance_contract =
    buildAuthorityLinkExternalizationContract({
      authorityLinkId: input.authorityLink.authority_link_id,
      blockingCheckRefs: preflight_checklist.blocking_check_refs,
      externalHandoffRef: guided_handshake_stepper.external_handoff_ref_or_null,
      flowState: guided_handshake_stepper.flow_state,
      tenantId: input.authorityLink.tenant_id,
    });

  return {
    affected_operation_counts,
    affected_operation_list,
    artifact_type: "AuthorityLinkInventoryItem",
    authority_link_id: input.authorityLink.authority_link_id,
    authority_link_workspace: {
      active_filters,
      detail_module_order: [...authorityLinkDetailModuleOrder],
      guided_flow_mode: deriveGuidedFlowMode({
        lifecycleState: healthRollup.lifecycle_state,
        requestedMode: input.guidedFlowMode,
        stepperFlowState: guided_handshake_stepper.flow_state,
      }),
      prominent_issue_ref_or_null: healthRollup.prominent_issue_ref_or_null,
      promoted_support_surface: "AUDIT_SIDECAR",
      selected_authority_link_ref: input.authorityLink.authority_link_id,
      surface_order: [...authorityLinkSurfaceOrder],
    },
    authority_scope: input.authorityLink.authority_scope,
    binding_health: healthRollup.binding_health,
    binding_health_timeline,
    blocked_reason_codes: healthRollup.blocked_reason_codes,
    client_id: input.authorityLink.client_id,
    delegation_state: healthRollup.delegation_state,
    dominant_question:
      "Which authority link is safe to use, relink, or block before authority-bound operations proceed?",
    expires_at: input.authorityLink.expires_at,
    externalization_governance_contract,
    focus_anchor_ref,
    guided_handshake_stepper,
    handshake_history,
    interaction_layer,
    last_validated_at:
      input.authorityLink.validated_at ?? input.authorityLink.last_binding_check_at,
    lifecycle_state: healthRollup.lifecycle_state,
    object_anchor_ref: input.authorityLink.authority_link_id,
    preflight_checklist,
    provider_environment: input.authorityLink.provider_environment,
    recovery_posture: input.recoveryPosture ?? "NONE",
    settlement_state: input.settlementState ?? "STEADY",
    shell_family: "GOVERNANCE_DENSITY_SHELL",
    tenant_id: input.authorityLink.tenant_id,
    token_client_binding_state: healthRollup.token_client_binding_state,
  };
}
