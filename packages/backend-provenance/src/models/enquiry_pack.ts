import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import {
  type ProvenancePartitionContract,
  buildProvenancePartitionContract,
  cloneRecord,
  normalizeManifestRefSpine,
  normalizeNullableString,
  normalizeOrderedStringSet,
  normalizeSortedStringSet,
  normalizeTimestamp,
  ProvenanceModelError,
  requireString,
} from "./provenance_common.ts";
import type { EvidenceGraphLineageBoundary } from "./evidence_graph.ts";
import type {
  ProofBundleLimitationNote,
  ProofBundleRetentionBinding,
} from "./proof_bundle.ts";

export type EnquiryPackTargetClass =
  | "FIGURE"
  | "TOTAL"
  | "FILING_FIELD"
  | "DECISION"
  | "LEGAL_STATE"
  | "DRIFT"
  | "RETENTION_LIMITATION"
  | "ERROR_CHAIN";
export type EnquiryPackExplanationStatus = "AVAILABLE" | "LIMITED" | "FAILED";
export type EnquiryPackMaskingPosture = "NONE" | "MASKED" | "REDACTED" | "LIMITED_EXPORT";
export type EnquiryPackOmissionClass =
  | "MASKING"
  | "RETENTION"
  | "PRIVACY"
  | "AUTHORITY_LIMIT"
  | "EXTERNAL_LIMITATION";

export type EnquiryPackOmissionEntry = {
  omission_id: string;
  omission_class: EnquiryPackOmissionClass;
  affected_refs: string[];
  declared_reason_code: string;
};

export type EnquiryPackRenderContract = {
  operator_render_ref: string | null;
  reviewer_render_ref: string | null;
  filing_artifact_ref: string | null;
};

export type EnquiryPackRetentionLimitedExplainabilityContract = {
  contract_version: "RETENTION_EXPLAINABILITY_V1";
  boundary_scope: "ENQUIRY_PACK";
  surface_role: "SCRUTINY_EXPORT_PACK";
  surface_specific_binding_policy: "ENQUIRY_PACK_RETAINS_LIMITATION_NOTES_OMISSIONS_AND_RETENTION_BINDING";
  decisive_limitations_policy: "DECISIVE_LIMITATIONS_MUST_REMAIN_TYPED_AND_PRESENT";
  explanation_state_policy: "AVAILABLE_ONLY_WHEN_FULL_DECISIVE_RENDERABILITY_SURVIVES";
  omission_disclosure_policy: "LIMITATIONS_AND_OMISSIONS_MUST_BE_EXPLICIT_NOT_NEGATIVE_ABSENCE";
  audit_sufficiency_policy: "POST_EXPIRY_AUDIT_MUST_RETAIN_OBJECT_REASON_AND_LINEAGE_MINIMUM";
  present_limited_truth_policy: "RETENTION_LIMITED_TRUTH_REMAINS_PRESENT_BUT_LIMITED";
  silent_ambiguity_policy: "SILENT_LIMITATION_AMBIGUITY_FORBIDDEN";
};

export type ExternalizationGovernanceContract = {
  contract_version: "EXTERNALIZATION_GOVERNANCE_V1";
  boundary_scope: "ENQUIRY_PACK";
  tenant_id: string;
  shell_family_or_null: null;
  context_anchor_ref: string;
  slice_binding_ref: string;
  delivery_surface_kind: "EXPLANATION_EXPORT";
  history_meaning_state: "LIMITED_EXPLANATION_EXPLICIT";
  eligibility_state: "READY" | "LIMITED_READY" | "BLOCKED";
  approval_state: "NOT_REQUIRED";
  access_binding_hash_or_null: string | null;
  masking_state: "NONE" | "MASKED_EXPORT_ONLY" | "LIMITED_EXPORT";
  masking_posture_fingerprint_or_null: string | null;
  limitation_state: "FULL" | "RETENTION_LIMITED";
  visibility_cache_partition_key_or_null: string | null;
  preview_target_ref_or_null: string | null;
  download_target_ref_or_null: string | null;
  print_target_ref_or_null: null;
  external_handoff_target_ref_or_null: null;
  approval_requirement_token_or_null: null;
  blocking_context_tokens: string[];
  delivery_binding_hash: string;
  slice_binding_policy: "ACTIVE_GOVERNED_SLICE_REQUIRED";
  background_scope_policy: "DETACHED_BACKGROUND_SCOPE_FORBIDDEN";
  direct_url_policy: "DIRECT_URL_BYPASS_FORBIDDEN";
  posture_preservation_policy: "CURRENT_HISTORY_MASKING_LIMITATION_AND_APPROVAL_PRESERVED";
  handoff_target_policy: "EXTERNAL_TARGET_AND_BLOCKING_CONTEXT_EXPLICIT";
  reentry_validation_policy: "RETURN_AND_DELIVERY_REQUIRE_GOVERNED_REVALIDATION";
  delivery_context_policy: "TENANT_AND_SECURITY_CONTEXT_BOUND_AT_INVOCATION";
  signed_url_binding_policy: "SIGNED_URLS_REQUIRE_CURRENT_GOVERNED_BINDING";
  temporary_artifact_policy: "TEMP_FILES_AND_NATIVE_PREVIEWS_REQUIRE_MATCHING_BINDING";
};

export type EnquiryPackRecord = {
  enquiry_pack_id: string;
  manifest_id: string;
  manifest_refs: string[];
  partition_contract: ProvenancePartitionContract;
  graph_ref: string;
  target_ref: string;
  target_class: EnquiryPackTargetClass;
  primary_path_ref: string;
  critical_path_refs: string[];
  supporting_evidence_refs: string[];
  transformation_step_refs: string[];
  config_refs: string[];
  override_refs: string[];
  authority_refs: string[];
  limitation_notes: ProofBundleLimitationNote[];
  audit_refs: string[];
  lineage_boundaries: EvidenceGraphLineageBoundary[];
  masking_posture: EnquiryPackMaskingPosture;
  omission_entries: EnquiryPackOmissionEntry[];
  human_readable_ref: string;
  machine_readable_ref: string;
  generated_at: string;
  proof_bundle_ref: string | null;
  explanation_status: EnquiryPackExplanationStatus;
  retention_binding: ProofBundleRetentionBinding;
  retention_limited_explainability_contract: EnquiryPackRetentionLimitedExplainabilityContract;
  render_contract: EnquiryPackRenderContract;
  externalization_governance_contract: ExternalizationGovernanceContract;
};

export type EnquiryPackBuildInput = Partial<EnquiryPackRecord> & {
  manifest_id: string;
  partition_contract: ProvenancePartitionContract;
  graph_ref: string;
  target_ref: string;
  primary_path_ref: string;
  critical_path_refs: readonly string[];
};

export function enquiryPackRef(pack: Pick<EnquiryPackRecord, "enquiry_pack_id"> | string) {
  return `enquiry-pack://${typeof pack === "string" ? requireString("enquiry_pack_id", pack) : pack.enquiry_pack_id}`;
}

export function buildEnquiryPackRetentionLimitedExplainabilityContract(): EnquiryPackRecord["retention_limited_explainability_contract"] {
  return {
    audit_sufficiency_policy: "POST_EXPIRY_AUDIT_MUST_RETAIN_OBJECT_REASON_AND_LINEAGE_MINIMUM",
    boundary_scope: "ENQUIRY_PACK",
    contract_version: "RETENTION_EXPLAINABILITY_V1",
    decisive_limitations_policy: "DECISIVE_LIMITATIONS_MUST_REMAIN_TYPED_AND_PRESENT",
    explanation_state_policy: "AVAILABLE_ONLY_WHEN_FULL_DECISIVE_RENDERABILITY_SURVIVES",
    omission_disclosure_policy: "LIMITATIONS_AND_OMISSIONS_MUST_BE_EXPLICIT_NOT_NEGATIVE_ABSENCE",
    present_limited_truth_policy: "RETENTION_LIMITED_TRUTH_REMAINS_PRESENT_BUT_LIMITED",
    silent_ambiguity_policy: "SILENT_LIMITATION_AMBIGUITY_FORBIDDEN",
    surface_role: "SCRUTINY_EXPORT_PACK",
    surface_specific_binding_policy: "ENQUIRY_PACK_RETAINS_LIMITATION_NOTES_OMISSIONS_AND_RETENTION_BINDING",
  };
}

export function deriveEnquiryPackId(input: {
  manifest_id: string;
  graph_ref: string;
  proof_bundle_ref: string | null;
  target_ref: string;
  primary_path_ref: string;
  critical_path_refs: readonly string[];
  explanation_status: EnquiryPackExplanationStatus;
  generated_at: string;
}) {
  return `enquiry-pack.${stableJsonHash(input)}`;
}

export function deriveExternalizationDeliveryBindingHash(contract: Omit<ExternalizationGovernanceContract, "delivery_binding_hash">) {
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

export function buildExternalizationGovernanceContractRecord(
  input: Omit<
    Partial<ExternalizationGovernanceContract>,
    | "contract_version"
    | "boundary_scope"
    | "delivery_surface_kind"
    | "history_meaning_state"
    | "shell_family_or_null"
    | "approval_state"
    | "print_target_ref_or_null"
    | "external_handoff_target_ref_or_null"
    | "approval_requirement_token_or_null"
    | "delivery_binding_hash"
  > & {
    tenant_id: string;
    target_ref: string;
    explanation_status: EnquiryPackExplanationStatus;
    masking_posture: EnquiryPackMaskingPosture;
    limitation_behavior: ProofBundleRetentionBinding["limitation_behavior"];
    human_readable_ref: string;
    machine_readable_ref: string;
    blocking_context_tokens?: readonly string[];
  },
): ExternalizationGovernanceContract {
  const eligibilityState = {
    AVAILABLE: "READY",
    FAILED: "BLOCKED",
    LIMITED: "LIMITED_READY",
  }[input.explanation_status] as ExternalizationGovernanceContract["eligibility_state"];
  const maskingState = {
    LIMITED_EXPORT: "LIMITED_EXPORT",
    MASKED: "MASKED_EXPORT_ONLY",
    NONE: "NONE",
    REDACTED: "MASKED_EXPORT_ONLY",
  }[input.masking_posture] as ExternalizationGovernanceContract["masking_state"];
  const limitationState =
    input.limitation_behavior === "FULL" && input.explanation_status === "AVAILABLE"
      ? "FULL"
      : "RETENTION_LIMITED";
  const withoutHash: Omit<ExternalizationGovernanceContract, "delivery_binding_hash"> = {
    access_binding_hash_or_null: normalizeNullableString(
      "externalization_governance_contract.access_binding_hash_or_null",
      input.access_binding_hash_or_null ?? null,
    ),
    approval_requirement_token_or_null: null,
    approval_state: "NOT_REQUIRED",
    background_scope_policy: "DETACHED_BACKGROUND_SCOPE_FORBIDDEN",
    blocking_context_tokens: normalizeSortedStringSet(
      "externalization_governance_contract.blocking_context_tokens",
      input.blocking_context_tokens ?? [],
    ),
    boundary_scope: "ENQUIRY_PACK",
    context_anchor_ref: requireString("externalization_governance_contract.context_anchor_ref", input.context_anchor_ref ?? input.target_ref),
    contract_version: "EXTERNALIZATION_GOVERNANCE_V1",
    delivery_context_policy: "TENANT_AND_SECURITY_CONTEXT_BOUND_AT_INVOCATION",
    delivery_surface_kind: "EXPLANATION_EXPORT",
    direct_url_policy: "DIRECT_URL_BYPASS_FORBIDDEN",
    download_target_ref_or_null:
      input.explanation_status === "FAILED"
        ? null
        : requireString("machine_readable_ref", input.download_target_ref_or_null ?? input.machine_readable_ref),
    eligibility_state: eligibilityState,
    external_handoff_target_ref_or_null: null,
    handoff_target_policy: "EXTERNAL_TARGET_AND_BLOCKING_CONTEXT_EXPLICIT",
    history_meaning_state: "LIMITED_EXPLANATION_EXPLICIT",
    limitation_state: limitationState,
    masking_posture_fingerprint_or_null: normalizeNullableString(
      "externalization_governance_contract.masking_posture_fingerprint_or_null",
      input.masking_posture_fingerprint_or_null ?? null,
    ),
    masking_state: maskingState,
    posture_preservation_policy: "CURRENT_HISTORY_MASKING_LIMITATION_AND_APPROVAL_PRESERVED",
    preview_target_ref_or_null:
      input.explanation_status === "FAILED"
        ? null
        : requireString("human_readable_ref", input.preview_target_ref_or_null ?? input.human_readable_ref),
    print_target_ref_or_null: null,
    reentry_validation_policy: "RETURN_AND_DELIVERY_REQUIRE_GOVERNED_REVALIDATION",
    shell_family_or_null: null,
    signed_url_binding_policy: "SIGNED_URLS_REQUIRE_CURRENT_GOVERNED_BINDING",
    slice_binding_policy: "ACTIVE_GOVERNED_SLICE_REQUIRED",
    slice_binding_ref: requireString("externalization_governance_contract.slice_binding_ref", input.slice_binding_ref ?? input.target_ref),
    temporary_artifact_policy: "TEMP_FILES_AND_NATIVE_PREVIEWS_REQUIRE_MATCHING_BINDING",
    tenant_id: requireString("externalization_governance_contract.tenant_id", input.tenant_id),
    visibility_cache_partition_key_or_null: normalizeNullableString(
      "externalization_governance_contract.visibility_cache_partition_key_or_null",
      input.visibility_cache_partition_key_or_null ?? null,
    ),
  };
  return {
    ...withoutHash,
    delivery_binding_hash: deriveExternalizationDeliveryBindingHash(withoutHash),
  };
}

function normalizeCriticalPathRefs(primaryPathRef: string, values: readonly string[]) {
  const refs = normalizeOrderedStringSet("critical_path_refs", values, { minItems: 1 });
  if (!refs.includes(primaryPathRef)) {
    throw new ProvenanceModelError(
      "PROVENANCE_CONTRACT_INVALID",
      "primary_path_ref must appear in critical_path_refs",
    );
  }
  const tail = normalizeSortedStringSet("critical_path_refs", refs.filter((ref) => ref !== primaryPathRef));
  return [primaryPathRef, ...tail];
}

function normalizeLimitationNotes(notes: readonly ProofBundleLimitationNote[] | undefined) {
  return [...(notes ?? [])]
    .map((note) => ({
      affected_refs: normalizeSortedStringSet("limitation_notes.affected_refs", note.affected_refs, {
        minItems: 1,
      }),
      limitation_code: requireString("limitation_notes.limitation_code", note.limitation_code),
      note_class: requireString("limitation_notes.note_class", note.note_class) as ProofBundleLimitationNote["note_class"],
      note_id: requireString("limitation_notes.note_id", note.note_id),
    }))
    .sort((left, right) => left.note_id.localeCompare(right.note_id));
}

function normalizeOmissionEntries(entries: readonly EnquiryPackOmissionEntry[] | undefined) {
  return [...(entries ?? [])]
    .map((entry) => ({
      affected_refs: normalizeSortedStringSet("omission_entries.affected_refs", entry.affected_refs, {
        minItems: 1,
      }),
      declared_reason_code: requireString("omission_entries.declared_reason_code", entry.declared_reason_code),
      omission_class: requireString("omission_entries.omission_class", entry.omission_class) as EnquiryPackOmissionClass,
      omission_id: requireString("omission_entries.omission_id", entry.omission_id),
    }))
    .sort((left, right) => left.omission_id.localeCompare(right.omission_id));
}

function normalizeLineageBoundaries(boundaries: readonly EvidenceGraphLineageBoundary[] | undefined) {
  return [...(boundaries ?? [])]
    .map((boundary) => ({
      boundary_edge_ref: requireString("lineage_boundaries.boundary_edge_ref", boundary.boundary_edge_ref),
      boundary_id: requireString("lineage_boundaries.boundary_id", boundary.boundary_id),
      client_id: normalizeNullableString("lineage_boundaries.client_id", boundary.client_id),
      decisive_in_path_refs: normalizeSortedStringSet(
        "lineage_boundaries.decisive_in_path_refs",
        boundary.decisive_in_path_refs ?? [],
      ),
      exposed_in_path_refs: normalizeSortedStringSet("lineage_boundaries.exposed_in_path_refs", boundary.exposed_in_path_refs, {
        minItems: 1,
      }),
      from_manifest_id: requireString("lineage_boundaries.from_manifest_id", boundary.from_manifest_id),
      partition_scope_refs: normalizeSortedStringSet(
        "lineage_boundaries.partition_scope_refs",
        boundary.partition_scope_refs ?? [],
      ),
      period_scope_ref_or_null: normalizeNullableString(
        "lineage_boundaries.period_scope_ref_or_null",
        boundary.period_scope_ref_or_null,
      ),
      relation: boundary.relation,
      tenant_id: requireString("lineage_boundaries.tenant_id", boundary.tenant_id),
      to_manifest_id: requireString("lineage_boundaries.to_manifest_id", boundary.to_manifest_id),
    }))
    .sort((left, right) => left.boundary_id.localeCompare(right.boundary_id));
}

function normalizeRetentionBinding(binding: ProofBundleRetentionBinding | undefined) {
  return {
    limitation_behavior: binding?.limitation_behavior ?? "FULL",
    minimum_available_until:
      binding?.minimum_available_until == null
        ? null
        : normalizeTimestamp("retention_binding.minimum_available_until", binding.minimum_available_until),
    retention_tag_ref: requireString(
      "retention_binding.retention_tag_ref",
      binding?.retention_tag_ref ?? "retention-tag://enquiry-pack/full",
    ),
  } satisfies ProofBundleRetentionBinding;
}

function normalizeRenderContract(contract: EnquiryPackRenderContract, explanationStatus: EnquiryPackExplanationStatus) {
  const normalized = {
    filing_artifact_ref: normalizeNullableString("render_contract.filing_artifact_ref", contract.filing_artifact_ref),
    operator_render_ref: normalizeNullableString("render_contract.operator_render_ref", contract.operator_render_ref),
    reviewer_render_ref: normalizeNullableString("render_contract.reviewer_render_ref", contract.reviewer_render_ref),
  } satisfies EnquiryPackRenderContract;
  const nonNullCount = [
    normalized.operator_render_ref,
    normalized.reviewer_render_ref,
    normalized.filing_artifact_ref,
  ].filter((value) => value !== null).length;
  if (explanationStatus === "AVAILABLE" && nonNullCount !== 3) {
    throw new ProvenanceModelError(
      "PROVENANCE_CONTRACT_INVALID",
      "AVAILABLE enquiry packs require all render-contract refs",
    );
  }
  if (explanationStatus === "LIMITED" && nonNullCount === 0) {
    throw new ProvenanceModelError(
      "PROVENANCE_CONTRACT_INVALID",
      "LIMITED enquiry packs require at least one surviving render-contract ref",
    );
  }
  if (explanationStatus === "FAILED" && nonNullCount !== 0) {
    throw new ProvenanceModelError(
      "PROVENANCE_CONTRACT_INVALID",
      "FAILED enquiry packs must clear render-contract refs",
    );
  }
  return normalized;
}

function assertEnquiryPackInvariants(pack: Omit<EnquiryPackRecord, "enquiry_pack_id"> & { enquiry_pack_id: string }) {
  const criticalRefSet = new Set(pack.critical_path_refs);
  if (!criticalRefSet.has(pack.primary_path_ref)) {
    throw new ProvenanceModelError(
      "PROVENANCE_CONTRACT_INVALID",
      "primary_path_ref must appear in critical_path_refs",
    );
  }
  if (pack.masking_posture === "NONE" && pack.omission_entries.length > 0) {
    throw new ProvenanceModelError(
      "PROVENANCE_CONTRACT_INVALID",
      "masking_posture NONE must not retain omission_entries",
    );
  }
  if (pack.masking_posture !== "NONE" && pack.omission_entries.length === 0) {
    throw new ProvenanceModelError(
      "PROVENANCE_CONTRACT_INVALID",
      "masked or limited enquiry packs must retain omission_entries",
    );
  }
  const retentionLimited = ["LIMITED", "TOMBSTONED", "PSEUDONYMISED"].includes(
    pack.retention_binding.limitation_behavior,
  );
  if (pack.explanation_status === "AVAILABLE" && pack.retention_binding.limitation_behavior !== "FULL") {
    throw new ProvenanceModelError(
      "PROVENANCE_CONTRACT_INVALID",
      "AVAILABLE enquiry packs must retain FULL retention posture",
    );
  }
  if (retentionLimited) {
    const limitationClasses = new Set(pack.limitation_notes.map((note) => note.note_class));
    const omissionClasses = new Set(pack.omission_entries.map((entry) => entry.omission_class));
    const criticalRefs = new Set([pack.primary_path_ref, ...pack.critical_path_refs]);
    if (pack.proof_bundle_ref) criticalRefs.add(pack.proof_bundle_ref);
    const limitationRefs = new Set(pack.limitation_notes.flatMap((note) => note.affected_refs));
    const omissionRefs = new Set(pack.omission_entries.flatMap((entry) => entry.affected_refs));
    if (pack.explanation_status === "AVAILABLE") {
      throw new ProvenanceModelError(
        "PROVENANCE_CONTRACT_INVALID",
        "retention-limited enquiry packs must not advertise AVAILABLE explanation",
      );
    }
    if (!limitationClasses.has("RETENTION") && !limitationClasses.has("PRIVACY")) {
      throw new ProvenanceModelError(
        "PROVENANCE_CONTRACT_INVALID",
        "retention-limited enquiry packs require RETENTION or PRIVACY limitation notes",
      );
    }
    if (!omissionClasses.has("RETENTION") && !omissionClasses.has("PRIVACY")) {
      throw new ProvenanceModelError(
        "PROVENANCE_CONTRACT_INVALID",
        "retention-limited enquiry packs require RETENTION or PRIVACY omission entries",
      );
    }
    if ([...criticalRefs].every((ref) => !limitationRefs.has(ref))) {
      throw new ProvenanceModelError(
        "PROVENANCE_CONTRACT_INVALID",
        "retention limitation notes must bind to critical path or proof refs",
      );
    }
    if ([...criticalRefs].every((ref) => !omissionRefs.has(ref))) {
      throw new ProvenanceModelError(
        "PROVENANCE_CONTRACT_INVALID",
        "retention omission entries must bind to critical path or proof refs",
      );
    }
  }
  if (pack.explanation_status !== "AVAILABLE" && pack.limitation_notes.length === 0) {
    throw new ProvenanceModelError(
      "PROVENANCE_CONTRACT_INVALID",
      "non-AVAILABLE enquiry packs must retain explicit limitation_notes",
    );
  }
  if (pack.manifest_refs.length > 1 && pack.lineage_boundaries.length === 0) {
    throw new ProvenanceModelError(
      "PROVENANCE_CONTRACT_INVALID",
      "cross-manifest enquiry packs must retain lineage_boundaries",
    );
  }
  if (pack.manifest_refs.length === 1 && pack.lineage_boundaries.length > 0) {
    throw new ProvenanceModelError(
      "PROVENANCE_CONTRACT_INVALID",
      "single-manifest enquiry packs must not retain lineage_boundaries",
    );
  }
}

export function normalizeEnquiryPackRecord(input: EnquiryPackRecord): EnquiryPackRecord {
  const manifestId = requireString("manifest_id", input.manifest_id);
  const manifestRefs = normalizeManifestRefSpine(manifestId, input.manifest_refs);
  const primaryPathRef = requireString("primary_path_ref", input.primary_path_ref);
  const criticalPathRefs = normalizeCriticalPathRefs(primaryPathRef, input.critical_path_refs);
  const explanationStatus = (input.explanation_status ?? "AVAILABLE") as EnquiryPackExplanationStatus;
  const retentionBinding = normalizeRetentionBinding(input.retention_binding);
  const enquiryPackId = requireString("enquiry_pack_id", input.enquiry_pack_id);
  const humanReadableRef = requireString("human_readable_ref", input.human_readable_ref);
  const machineReadableRef = requireString("machine_readable_ref", input.machine_readable_ref);
  const maskingPosture = (input.masking_posture ?? "NONE") as EnquiryPackMaskingPosture;
  const graphRef = requireString("graph_ref", input.graph_ref);
  const targetRef = requireString("target_ref", input.target_ref);
  const proofBundleRef = normalizeNullableString("proof_bundle_ref", input.proof_bundle_ref);
  const externalizationGovernanceContract =
    input.externalization_governance_contract ??
    buildExternalizationGovernanceContractRecord({
      blocking_context_tokens: [],
      explanation_status: explanationStatus,
      human_readable_ref: humanReadableRef,
      limitation_behavior: retentionBinding.limitation_behavior,
      machine_readable_ref: machineReadableRef,
      masking_posture: maskingPosture,
      target_ref: targetRef,
      tenant_id: input.partition_contract.tenant_id,
    });
  const normalized: EnquiryPackRecord = {
    audit_refs: normalizeSortedStringSet("audit_refs", input.audit_refs ?? [], { minItems: 1 }),
    authority_refs: normalizeSortedStringSet("authority_refs", input.authority_refs ?? []),
    config_refs: normalizeSortedStringSet("config_refs", input.config_refs ?? []),
    critical_path_refs: criticalPathRefs,
    externalization_governance_contract: {
      ...externalizationGovernanceContract,
      blocking_context_tokens: normalizeSortedStringSet(
        "externalization_governance_contract.blocking_context_tokens",
        externalizationGovernanceContract.blocking_context_tokens ?? [],
      ),
    },
    enquiry_pack_id: enquiryPackId,
    explanation_status: explanationStatus,
    generated_at: normalizeTimestamp("generated_at", input.generated_at),
    graph_ref: graphRef,
    human_readable_ref: humanReadableRef,
    limitation_notes: normalizeLimitationNotes(input.limitation_notes ?? []),
    lineage_boundaries: normalizeLineageBoundaries(input.lineage_boundaries ?? []),
    machine_readable_ref: machineReadableRef,
    manifest_id: manifestId,
    manifest_refs: manifestRefs,
    masking_posture: maskingPosture,
    omission_entries: normalizeOmissionEntries(input.omission_entries ?? []),
    override_refs: normalizeSortedStringSet("override_refs", input.override_refs ?? []),
    partition_contract: buildProvenancePartitionContract(input.partition_contract),
    primary_path_ref: primaryPathRef,
    proof_bundle_ref: proofBundleRef,
    render_contract: normalizeRenderContract(input.render_contract, explanationStatus),
    retention_binding: retentionBinding,
    retention_limited_explainability_contract: buildEnquiryPackRetentionLimitedExplainabilityContract(),
    supporting_evidence_refs: normalizeSortedStringSet("supporting_evidence_refs", input.supporting_evidence_refs ?? []),
    target_class: (input.target_class ?? "FIGURE") as EnquiryPackTargetClass,
    target_ref: targetRef,
    transformation_step_refs: normalizeSortedStringSet("transformation_step_refs", input.transformation_step_refs ?? []),
  };
  const withoutHash = {
    ...normalized.externalization_governance_contract,
    delivery_binding_hash: undefined,
  };
  const externalizationHash = deriveExternalizationDeliveryBindingHash(
    withoutHash as Omit<ExternalizationGovernanceContract, "delivery_binding_hash">,
  );
  normalized.externalization_governance_contract.delivery_binding_hash = externalizationHash;
  assertEnquiryPackInvariants(normalized);
  return normalized;
}

export function buildEnquiryPackRecord(input: EnquiryPackBuildInput): EnquiryPackRecord {
  const generatedAt = normalizeTimestamp("generated_at", input.generated_at ?? "2026-04-28T00:00:00Z");
  const primaryPathRef = requireString("primary_path_ref", input.primary_path_ref);
  const criticalPathRefs = normalizeCriticalPathRefs(primaryPathRef, input.critical_path_refs);
  const explanationStatus = (input.explanation_status ?? "AVAILABLE") as EnquiryPackExplanationStatus;
  const proofBundleRef = normalizeNullableString("proof_bundle_ref", input.proof_bundle_ref);
  const enquiryPackId =
    input.enquiry_pack_id ??
    deriveEnquiryPackId({
      critical_path_refs: criticalPathRefs,
      explanation_status: explanationStatus,
      generated_at: generatedAt,
      graph_ref: input.graph_ref,
      manifest_id: input.manifest_id,
      primary_path_ref: primaryPathRef,
      proof_bundle_ref: proofBundleRef,
      target_ref: input.target_ref,
    });
  const draft = {
    ...input,
    audit_refs: input.audit_refs ?? [`audit://enquiry-pack/${enquiryPackId}`],
    enquiry_pack_id: enquiryPackId,
    explanation_status: explanationStatus,
    generated_at: generatedAt,
    human_readable_ref: input.human_readable_ref ?? `render://enquiry-pack/${enquiryPackId}/human`,
    machine_readable_ref: input.machine_readable_ref ?? `render://enquiry-pack/${enquiryPackId}/machine`,
    manifest_refs: input.manifest_refs ?? [input.manifest_id],
    masking_posture: input.masking_posture ?? "NONE",
    proof_bundle_ref: proofBundleRef,
    render_contract:
      input.render_contract ??
      ({
        filing_artifact_ref:
          explanationStatus === "FAILED" ? null : `render://enquiry-pack/${enquiryPackId}/filing-artifact`,
        operator_render_ref:
          explanationStatus === "FAILED" ? null : `render://enquiry-pack/${enquiryPackId}/operator`,
        reviewer_render_ref:
          explanationStatus === "AVAILABLE" ? `render://enquiry-pack/${enquiryPackId}/reviewer` : null,
      } satisfies EnquiryPackRenderContract),
    retention_binding: input.retention_binding ?? {
      limitation_behavior: "FULL",
      minimum_available_until: null,
      retention_tag_ref: "retention-tag://enquiry-pack/full",
    },
    retention_limited_explainability_contract:
      input.retention_limited_explainability_contract ??
      buildEnquiryPackRetentionLimitedExplainabilityContract(),
  } as EnquiryPackRecord;
  return normalizeEnquiryPackRecord(draft);
}

export function cloneEnquiryPackRecord(record: EnquiryPackRecord) {
  return cloneRecord(normalizeEnquiryPackRecord(record));
}
