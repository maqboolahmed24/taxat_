import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import type { ExternalizationGovernanceContractRecord } from "../types.ts";

export class PortalExternalizationGovernanceContractError extends Error {
  readonly reasonCodes: string[];

  constructor(message: string, reasonCodes: readonly string[]) {
    super(message);
    this.name = "PortalExternalizationGovernanceContractError";
    this.reasonCodes = [...reasonCodes];
  }
}

type ExternalizationBase = Omit<
  ExternalizationGovernanceContractRecord,
  "delivery_binding_hash"
>;

function uniqueTokens(tokens: readonly string[]) {
  const normalized = tokens.map((token) => token.trim()).filter((token) => token.length > 0);
  return [...new Set(normalized)];
}

export function derivePortalExternalizationDeliveryBindingHash(
  contract: ExternalizationBase,
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

function surfaceKindForBoundary(
  boundaryScope: ExternalizationGovernanceContractRecord["boundary_scope"],
): ExternalizationGovernanceContractRecord["delivery_surface_kind"] {
  return boundaryScope === "CLIENT_DOCUMENT_REQUEST"
    ? "PORTAL_DOCUMENT_DOWNLOAD"
    : "PORTAL_APPROVAL_EXPORT";
}

export function derivePortalExternalizationGovernanceContract(input: {
  accessBindingHash: string;
  approvalRequirementTokenOrNull?: string | null | undefined;
  approvalState?: ExternalizationGovernanceContractRecord["approval_state"] | undefined;
  blockingContextTokens?: readonly string[] | undefined;
  boundaryScope: ExternalizationGovernanceContractRecord["boundary_scope"];
  contextAnchorRef: string;
  downloadTargetRefOrNull: string | null;
  eligibilityState: ExternalizationGovernanceContractRecord["eligibility_state"];
  historyMeaningState: ExternalizationGovernanceContractRecord["history_meaning_state"];
  limitationState: ExternalizationGovernanceContractRecord["limitation_state"];
  maskingPostureFingerprint: string;
  previewTargetRefOrNull: string | null;
  printTargetRefOrNull: string | null;
  sliceBindingRef: string;
  tenantId: string;
  visibilityCachePartitionKey: string;
}): ExternalizationGovernanceContractRecord {
  if (input.boundaryScope === "CLIENT_DOCUMENT_REQUEST" && input.printTargetRefOrNull !== null) {
    throw new PortalExternalizationGovernanceContractError(
      "portal document request externalization must not invent printable binary-upload targets",
      ["PORTAL_EXTERNALIZATION_DOCUMENT_PRINT_TARGET_FORBIDDEN"],
    );
  }
  const blockingContextTokens = uniqueTokens(input.blockingContextTokens ?? []);
  if (
    (input.eligibilityState === "BLOCKED" || input.eligibilityState === "APPROVAL_REQUIRED") &&
    blockingContextTokens.length === 0
  ) {
    throw new PortalExternalizationGovernanceContractError(
      "blocked or approval-gated externalization must retain explicit blocking context",
      ["PORTAL_EXTERNALIZATION_BLOCKING_CONTEXT_REQUIRED"],
    );
  }
  if (
    input.approvalState === "REQUIRED_PENDING" &&
    (input.approvalRequirementTokenOrNull ?? null) === null
  ) {
    throw new PortalExternalizationGovernanceContractError(
      "pending approval externalization must retain an approval requirement token",
      ["PORTAL_EXTERNALIZATION_APPROVAL_TOKEN_REQUIRED"],
    );
  }

  const base: ExternalizationBase = {
    access_binding_hash_or_null: input.accessBindingHash,
    approval_requirement_token_or_null: input.approvalRequirementTokenOrNull ?? null,
    approval_state: input.approvalState ?? "NOT_REQUIRED",
    background_scope_policy: "DETACHED_BACKGROUND_SCOPE_FORBIDDEN",
    blocking_context_tokens: blockingContextTokens,
    boundary_scope: input.boundaryScope,
    context_anchor_ref: input.contextAnchorRef,
    contract_version: "EXTERNALIZATION_GOVERNANCE_V1",
    delivery_context_policy: "TENANT_AND_SECURITY_CONTEXT_BOUND_AT_INVOCATION",
    delivery_surface_kind: surfaceKindForBoundary(input.boundaryScope),
    direct_url_policy: "DIRECT_URL_BYPASS_FORBIDDEN",
    download_target_ref_or_null: input.downloadTargetRefOrNull,
    eligibility_state: input.eligibilityState,
    external_handoff_target_ref_or_null: null,
    handoff_target_policy: "EXTERNAL_TARGET_AND_BLOCKING_CONTEXT_EXPLICIT",
    history_meaning_state: input.historyMeaningState,
    limitation_state: input.limitationState,
    masking_posture_fingerprint_or_null: input.maskingPostureFingerprint,
    masking_state: "CUSTOMER_SAFE_ONLY",
    posture_preservation_policy: "CURRENT_HISTORY_MASKING_LIMITATION_AND_APPROVAL_PRESERVED",
    preview_target_ref_or_null: input.previewTargetRefOrNull,
    print_target_ref_or_null: input.printTargetRefOrNull,
    reentry_validation_policy: "RETURN_AND_DELIVERY_REQUIRE_GOVERNED_REVALIDATION",
    shell_family_or_null: "CLIENT_PORTAL_SHELL",
    signed_url_binding_policy: "SIGNED_URLS_REQUIRE_CURRENT_GOVERNED_BINDING",
    slice_binding_policy: "ACTIVE_GOVERNED_SLICE_REQUIRED",
    slice_binding_ref: input.sliceBindingRef,
    temporary_artifact_policy: "TEMP_FILES_AND_NATIVE_PREVIEWS_REQUIRE_MATCHING_BINDING",
    tenant_id: input.tenantId,
    visibility_cache_partition_key_or_null: input.visibilityCachePartitionKey,
  };

  return {
    ...base,
    delivery_binding_hash: derivePortalExternalizationDeliveryBindingHash(base),
  };
}
