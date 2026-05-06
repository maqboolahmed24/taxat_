import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import {
  type AdmissibilityState,
  type ProvenancePartitionContract,
  buildProvenancePartitionContract,
  cloneRecord,
  normalizeManifestRefSpine,
  normalizeNullableString,
  normalizeOrderedStringSet,
  normalizeSortedStringSet,
  normalizeTimestamp,
  ProvenanceModelError,
  refFromId,
  requireString,
} from "./provenance_common.ts";
import type { ProofClosureContract } from "./evidence_graph.ts";

export type ProofBundleTargetClass = "FIGURE" | "TOTAL" | "FILING_FIELD" | "DECISION" | "LEGAL_STATE";
export type ProofBundlePurpose =
  | "FILING_DEFENCE"
  | "GATE_EXPLANATION"
  | "LEGAL_STATE_PROOF"
  | "DRIFT_JUSTIFICATION"
  | "RETENTION_LIMITATION";
export type ProofBundleLifecycleState = "GENERATED" | "LIMITED" | "STALE" | "SUPERSEDED";
export type ProofBundleSupportState =
  | "SUPPORTED"
  | "PARTIALLY_SUPPORTED"
  | "UNSUPPORTED"
  | "CONTRADICTED"
  | "STALE";
export type ProofBundleClosureState = "CLOSED" | "OPEN";
export type ProofBundleExplanationStatus = "AVAILABLE" | "LIMITED" | "FAILED";
export type ProofBundleRetentionBehavior = "FULL" | "LIMITED" | "TOMBSTONED" | "PSEUDONYMISED";
export type ProofBundleRejectedPathClass =
  | "WEAKER_SUPPORT"
  | "CONTRADICTS_PRIMARY"
  | "SILENT_LIMITATION_AMBIGUITY"
  | "STALE_OR_SUPERSEDED"
  | "REPLAY_CLOSURE_FAILURE"
  | "AUTHORITY_CLOSURE_FAILURE";

export type ProofBundleRejectedPathEntry = {
  path_ref: string;
  path_rank: number;
  rejection_class: ProofBundleRejectedPathClass;
  rejection_reason_codes: string[];
};

export type ProofBundleReplayRecipe = {
  manifest_refs: string[];
  required_artifact_refs: string[];
  deterministic_order_basis: string[];
  replayable: boolean;
  path_ref_order: string[];
  lineage_boundary_refs: string[];
};

export type ProofBundleRenderRefs = {
  operator_render_ref: string | null;
  reviewer_render_ref: string | null;
  filing_artifact_ref: string | null;
  explanation_status: ProofBundleExplanationStatus;
};

export type ProofBundleLimitationNote = {
  note_id: string;
  limitation_code: string;
  note_class: "RETENTION" | "PRIVACY" | "MASKING" | "MISSING_SUPPORT" | "AUTHORITY_LIMIT" | "SUPERSESSION";
  affected_refs: string[];
};

export type ProofBundleRetentionLimitedExplainabilityContract = {
  contract_version: "RETENTION_EXPLAINABILITY_V1";
  boundary_scope: "PROOF_BUNDLE";
  surface_role: "FILING_PROOF_ARTIFACT";
  surface_specific_binding_policy: "PROOF_BUNDLE_RETAINS_DECISIVE_LIMITATION_AND_RETENTION_BINDING";
  decisive_limitations_policy: "DECISIVE_LIMITATIONS_MUST_REMAIN_TYPED_AND_PRESENT";
  explanation_state_policy: "AVAILABLE_ONLY_WHEN_FULL_DECISIVE_RENDERABILITY_SURVIVES";
  omission_disclosure_policy: "LIMITATIONS_AND_OMISSIONS_MUST_BE_EXPLICIT_NOT_NEGATIVE_ABSENCE";
  audit_sufficiency_policy: "POST_EXPIRY_AUDIT_MUST_RETAIN_OBJECT_REASON_AND_LINEAGE_MINIMUM";
  present_limited_truth_policy: "RETENTION_LIMITED_TRUTH_REMAINS_PRESENT_BUT_LIMITED";
  silent_ambiguity_policy: "SILENT_LIMITATION_AMBIGUITY_FORBIDDEN";
};

export type ProofBundleRetentionBinding = {
  retention_tag_ref: string;
  limitation_behavior: ProofBundleRetentionBehavior;
  minimum_available_until: string | null;
};

export type ProofBundleArtifactContract = {
  artifact_id: string;
  schema_id: string;
  artifact_type: string;
  semantic_version: string;
  content_hash: string;
  dialect_ref: string;
  compatibility_class: string;
  writer_min_reader_version: string;
  allowed_upgrade_kinds: ("PATCH_BACKWARD" | "MINOR_BACKWARD" | "MAJOR_BREAKING")[];
  schema_bundle_hash: string;
  artifact_content_hash: string;
  writer_build_id: string;
};

export type ProofBundleRecord = {
  artifact_type: "ProofBundle";
  proof_bundle_id: string;
  manifest_id: string;
  manifest_refs: string[];
  partition_contract: ProvenancePartitionContract;
  graph_ref: string;
  target_ref: string;
  target_class: ProofBundleTargetClass;
  bundle_purpose: ProofBundlePurpose;
  lifecycle_state: ProofBundleLifecycleState;
  support_state: ProofBundleSupportState;
  admissibility_state: AdmissibilityState;
  closure_state: ProofBundleClosureState;
  proof_closure_contract: ProofClosureContract;
  primary_path_ref: string | null;
  decisive_path_refs: string[];
  rejected_path_refs: string[];
  rejected_path_entries: ProofBundleRejectedPathEntry[];
  decisive_evidence_refs: string[];
  authority_basis_refs: string[];
  config_basis_refs: string[];
  contradiction_refs: string[];
  stale_reason_codes: string[];
  staleness_dependency_refs: string[];
  temporal_propagation_event_refs: string[];
  lineage_boundary_refs: string[];
  decisive_lineage_boundary_refs: string[];
  replay_recipe: ProofBundleReplayRecipe;
  render_refs: ProofBundleRenderRefs;
  limitation_notes: ProofBundleLimitationNote[];
  retention_limited_explainability_contract: ProofBundleRetentionLimitedExplainabilityContract;
  retention_binding: ProofBundleRetentionBinding;
  bundle_hash: string;
  superseded_by_bundle_ref: string | null;
  generated_at: string;
  contract: ProofBundleArtifactContract;
};

export type ProofBundleBuildInput = Partial<ProofBundleRecord> & {
  manifest_id: string;
  partition_contract: ProvenancePartitionContract;
  graph_ref: string;
  target_ref: string;
  proof_closure_contract: ProofClosureContract;
};

export function proofBundleRef(bundle: Pick<ProofBundleRecord, "proof_bundle_id"> | string) {
  return refFromId("proof-bundle", typeof bundle === "string" ? bundle : bundle.proof_bundle_id);
}

export function buildProofBundleRetentionLimitedExplainabilityContract(): ProofBundleRetentionLimitedExplainabilityContract {
  return {
    audit_sufficiency_policy: "POST_EXPIRY_AUDIT_MUST_RETAIN_OBJECT_REASON_AND_LINEAGE_MINIMUM",
    boundary_scope: "PROOF_BUNDLE",
    contract_version: "RETENTION_EXPLAINABILITY_V1",
    decisive_limitations_policy: "DECISIVE_LIMITATIONS_MUST_REMAIN_TYPED_AND_PRESENT",
    explanation_state_policy: "AVAILABLE_ONLY_WHEN_FULL_DECISIVE_RENDERABILITY_SURVIVES",
    omission_disclosure_policy: "LIMITATIONS_AND_OMISSIONS_MUST_BE_EXPLICIT_NOT_NEGATIVE_ABSENCE",
    present_limited_truth_policy: "RETENTION_LIMITED_TRUTH_REMAINS_PRESENT_BUT_LIMITED",
    silent_ambiguity_policy: "SILENT_LIMITATION_AMBIGUITY_FORBIDDEN",
    surface_role: "FILING_PROOF_ARTIFACT",
    surface_specific_binding_policy: "PROOF_BUNDLE_RETAINS_DECISIVE_LIMITATION_AND_RETENTION_BINDING",
  };
}

export function deriveProofBundleId(input: {
  manifest_id: string;
  graph_ref: string;
  target_ref: string;
  bundle_purpose: ProofBundlePurpose;
  generated_at: string;
  primary_path_ref: string | null;
  rejected_path_refs: readonly string[];
  support_state: ProofBundleSupportState;
}) {
  return `proof-bundle.${stableJsonHash(input)}`;
}

export function deriveProofBundleHash(input: Omit<ProofBundleRecord, "bundle_hash" | "contract">) {
  return stableJsonHash(input);
}

export function buildProofBundleArtifactContract(input: {
  proof_bundle_id: string;
  bundle_hash: string;
  schema_bundle_hash?: string | null;
  writer_build_id?: string | null;
}): ProofBundleArtifactContract {
  return {
    allowed_upgrade_kinds: ["PATCH_BACKWARD", "MINOR_BACKWARD"],
    artifact_content_hash: requireString("bundle_hash", input.bundle_hash),
    artifact_id: requireString("proof_bundle_id", input.proof_bundle_id),
    artifact_type: "ProofBundle",
    compatibility_class: "BACKWARD_COMPATIBLE",
    content_hash: "proof_bundle.schema.json@PROOF_BUNDLE_V1",
    dialect_ref: "https://json-schema.org/draft/2020-12/schema",
    schema_bundle_hash: requireString("schema_bundle_hash", input.schema_bundle_hash ?? "schema-bundle.local-dev"),
    schema_id: "https://taxat.dev/schemas/proof_bundle.schema.json",
    semantic_version: "1.0.0",
    writer_build_id: requireString("writer_build_id", input.writer_build_id ?? "backend-provenance.pc_0129"),
    writer_min_reader_version: "1.0.0",
  };
}

function normalizeRejectedPathEntries(
  entries: readonly ProofBundleRejectedPathEntry[] | undefined,
  rejectedPathRefs: readonly string[],
) {
  const normalized = [...(entries ?? [])]
    .map((entry) => ({
      path_rank: Number(entry.path_rank),
      path_ref: requireString("rejected_path_entries.path_ref", entry.path_ref),
      rejection_class: requireString(
        "rejected_path_entries.rejection_class",
        entry.rejection_class,
      ) as ProofBundleRejectedPathClass,
      rejection_reason_codes: normalizeSortedStringSet(
        "rejected_path_entries.rejection_reason_codes",
        entry.rejection_reason_codes,
        { minItems: 1 },
      ),
    }))
    .sort((left, right) => left.path_rank - right.path_rank || left.path_ref.localeCompare(right.path_ref));

  if (normalized.length !== rejectedPathRefs.length) {
    throw new ProvenanceModelError(
      "PROVENANCE_CONTRACT_INVALID",
      "rejected_path_entries must exactly mirror rejected_path_refs",
    );
  }
  normalized.forEach((entry, index) => {
    if (!Number.isInteger(entry.path_rank) || entry.path_rank !== index + 2) {
      throw new ProvenanceModelError(
        "PROVENANCE_CONTRACT_INVALID",
        "rejected_path_entries.path_rank must form a contiguous sequence starting at 2",
      );
    }
    if (entry.path_ref !== rejectedPathRefs[index]) {
      throw new ProvenanceModelError(
        "PROVENANCE_CONTRACT_INVALID",
        "rejected_path_entries order must mirror rejected_path_refs",
      );
    }
  });
  return normalized;
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

function normalizeReplayRecipe(input: {
  replay_recipe: ProofBundleReplayRecipe | undefined;
  manifest_refs: readonly string[];
  graph_ref: string;
  decisive_path_refs: readonly string[];
  rejected_path_refs: readonly string[];
  primary_path_ref: string | null;
  staleness_dependency_refs: readonly string[];
  temporal_propagation_event_refs: readonly string[];
  lineage_boundary_refs: readonly string[];
  closed: boolean;
}) {
  const pathRefOrder = [
    ...(input.primary_path_ref ? [input.primary_path_ref] : []),
    ...input.rejected_path_refs,
  ];
  const requiredArtifactRefs = normalizeSortedStringSet("replay_recipe.required_artifact_refs", [
    input.graph_ref,
    ...input.decisive_path_refs,
    ...input.rejected_path_refs,
    ...input.staleness_dependency_refs,
    ...input.temporal_propagation_event_refs,
    ...(input.replay_recipe?.required_artifact_refs ?? []),
  ], { minItems: 1 });
  const deterministicOrderBasis = normalizeSortedStringSet("replay_recipe.deterministic_order_basis", [
    "PROOF_PATH_SELECTION_V1",
    "PROOF_CLOSURE_V1",
    ...(input.replay_recipe?.deterministic_order_basis ?? []),
  ], { minItems: 1 });

  const replayable = input.replay_recipe?.replayable ?? input.closed;
  return {
    deterministic_order_basis: deterministicOrderBasis,
    lineage_boundary_refs: normalizeSortedStringSet(
      "replay_recipe.lineage_boundary_refs",
      input.replay_recipe?.lineage_boundary_refs ?? input.lineage_boundary_refs,
    ),
    manifest_refs: normalizeOrderedStringSet(
      "replay_recipe.manifest_refs",
      input.replay_recipe?.manifest_refs ?? input.manifest_refs,
      { minItems: 1 },
    ),
    path_ref_order: normalizeOrderedStringSet(
      "replay_recipe.path_ref_order",
      input.replay_recipe?.path_ref_order ?? pathRefOrder,
    ),
    replayable,
    required_artifact_refs: requiredArtifactRefs,
  } satisfies ProofBundleReplayRecipe;
}

function normalizeRenderRefs(input: ProofBundleRenderRefs | undefined, proofBundleId: string) {
  const explanationStatus = input?.explanation_status ?? "AVAILABLE";
  const availableDefaults = {
    filing_artifact_ref: `render://proof-bundle/${proofBundleId}/filing-artifact`,
    operator_render_ref: `render://proof-bundle/${proofBundleId}/operator`,
    reviewer_render_ref: `render://proof-bundle/${proofBundleId}/reviewer`,
  };
  const renderRefs = {
    explanation_status: explanationStatus,
    filing_artifact_ref:
      input?.filing_artifact_ref === undefined
        ? explanationStatus === "FAILED"
          ? null
          : availableDefaults.filing_artifact_ref
        : normalizeNullableString("render_refs.filing_artifact_ref", input.filing_artifact_ref),
    operator_render_ref:
      input?.operator_render_ref === undefined
        ? explanationStatus === "FAILED"
          ? null
          : availableDefaults.operator_render_ref
        : normalizeNullableString("render_refs.operator_render_ref", input.operator_render_ref),
    reviewer_render_ref:
      input?.reviewer_render_ref === undefined
        ? explanationStatus === "FAILED" || explanationStatus === "LIMITED"
          ? null
          : availableDefaults.reviewer_render_ref
        : normalizeNullableString("render_refs.reviewer_render_ref", input.reviewer_render_ref),
  } satisfies ProofBundleRenderRefs;

  const nonNullCount = [
    renderRefs.operator_render_ref,
    renderRefs.reviewer_render_ref,
    renderRefs.filing_artifact_ref,
  ].filter((value) => value !== null).length;
  if (renderRefs.explanation_status === "AVAILABLE" && nonNullCount !== 3) {
    throw new ProvenanceModelError(
      "PROVENANCE_CONTRACT_INVALID",
      "AVAILABLE render refs require operator, reviewer, and filing artifact refs",
    );
  }
  if (renderRefs.explanation_status === "LIMITED" && nonNullCount === 0) {
    throw new ProvenanceModelError(
      "PROVENANCE_CONTRACT_INVALID",
      "LIMITED render refs require at least one surviving render ref",
    );
  }
  if (renderRefs.explanation_status === "FAILED" && nonNullCount !== 0) {
    throw new ProvenanceModelError(
      "PROVENANCE_CONTRACT_INVALID",
      "FAILED render refs must clear all render refs",
    );
  }
  return renderRefs;
}

function normalizeRetentionBinding(binding: ProofBundleRetentionBinding | undefined) {
  return {
    limitation_behavior: (binding?.limitation_behavior ?? "FULL") as ProofBundleRetentionBehavior,
    minimum_available_until:
      binding?.minimum_available_until == null
        ? null
        : normalizeTimestamp("retention_binding.minimum_available_until", binding.minimum_available_until),
    retention_tag_ref: requireString(
      "retention_binding.retention_tag_ref",
      binding?.retention_tag_ref ?? "retention-tag://proof-bundle/full",
    ),
  } satisfies ProofBundleRetentionBinding;
}

function assertProofBundleInvariants(bundle: Omit<ProofBundleRecord, "bundle_hash" | "contract">) {
  if (bundle.proof_closure_contract.silent_limitation_ambiguity_present) {
    throw new ProvenanceModelError(
      "PROVENANCE_CONTRACT_INVALID",
      "ProofBundle must persist explicit limitation notes instead of silent limitation ambiguity",
    );
  }
  if (bundle.primary_path_ref && !bundle.decisive_path_refs.includes(bundle.primary_path_ref)) {
    throw new ProvenanceModelError(
      "PROVENANCE_CONTRACT_INVALID",
      "primary_path_ref must appear in decisive_path_refs",
    );
  }
  if (
    bundle.primary_path_ref &&
    bundle.decisive_path_refs.length > 0 &&
    bundle.decisive_path_refs[0] !== bundle.primary_path_ref
  ) {
    throw new ProvenanceModelError(
      "PROVENANCE_CONTRACT_INVALID",
      "decisive_path_refs must begin with primary_path_ref",
    );
  }
  const decisiveSet = new Set(bundle.decisive_path_refs);
  const overlap = bundle.rejected_path_refs.filter((pathRef) => decisiveSet.has(pathRef));
  if (overlap.length > 0) {
    throw new ProvenanceModelError(
      "PROVENANCE_CONTRACT_INVALID",
      `rejected_path_refs must not overlap decisive_path_refs: ${overlap.join(", ")}`,
    );
  }
  if (bundle.support_state === "UNSUPPORTED") {
    if (
      bundle.primary_path_ref !== null ||
      bundle.decisive_path_refs.length > 0 ||
      bundle.rejected_path_refs.length > 0 ||
      bundle.rejected_path_entries.length > 0 ||
      bundle.closure_state !== "OPEN"
    ) {
      throw new ProvenanceModelError(
        "PROVENANCE_CONTRACT_INVALID",
        "UNSUPPORTED proof bundles must remain open and pathless",
      );
    }
  } else if (!bundle.primary_path_ref || bundle.decisive_path_refs.length === 0) {
    throw new ProvenanceModelError(
      "PROVENANCE_CONTRACT_INVALID",
      "non-UNSUPPORTED proof bundles must retain primary and decisive path refs",
    );
  }
  if (bundle.support_state === "SUPPORTED") {
    if (bundle.admissibility_state !== "ADMISSIBLE" || bundle.closure_state !== "CLOSED") {
      throw new ProvenanceModelError(
        "PROVENANCE_CONTRACT_INVALID",
        "SUPPORTED proof bundles must be ADMISSIBLE and CLOSED",
      );
    }
  }
  if (bundle.support_state === "PARTIALLY_SUPPORTED") {
    if (bundle.admissibility_state !== "LIMITED" || bundle.closure_state !== "CLOSED") {
      throw new ProvenanceModelError(
        "PROVENANCE_CONTRACT_INVALID",
        "PARTIALLY_SUPPORTED proof bundles must be LIMITED and CLOSED",
      );
    }
  }
  if (bundle.support_state === "CONTRADICTED" && bundle.closure_state !== "OPEN") {
    throw new ProvenanceModelError(
      "PROVENANCE_CONTRACT_INVALID",
      "CONTRADICTED proof bundles must preserve OPEN closure",
    );
  }
  if (bundle.support_state === "STALE" && bundle.closure_state !== "OPEN") {
    throw new ProvenanceModelError(
      "PROVENANCE_CONTRACT_INVALID",
      "STALE proof bundles must preserve OPEN closure",
    );
  }
  if (bundle.closure_state === "CLOSED" && !bundle.replay_recipe.replayable) {
    throw new ProvenanceModelError(
      "PROVENANCE_CONTRACT_INVALID",
      "closed proof bundles must be replayable",
    );
  }
  const expectedPathRefOrder = [
    ...(bundle.primary_path_ref ? [bundle.primary_path_ref] : []),
    ...bundle.rejected_path_refs,
  ];
  if (JSON.stringify(bundle.replay_recipe.path_ref_order) !== JSON.stringify(expectedPathRefOrder)) {
    throw new ProvenanceModelError(
      "PROVENANCE_CONTRACT_INVALID",
      "replay_recipe.path_ref_order must equal primary_path_ref plus rejected_path_refs",
    );
  }
  if (JSON.stringify(bundle.replay_recipe.manifest_refs) !== JSON.stringify(bundle.manifest_refs)) {
    throw new ProvenanceModelError(
      "PROVENANCE_CONTRACT_INVALID",
      "replay_recipe.manifest_refs must mirror manifest_refs",
    );
  }
  if (JSON.stringify(bundle.replay_recipe.lineage_boundary_refs) !== JSON.stringify(bundle.lineage_boundary_refs)) {
    throw new ProvenanceModelError(
      "PROVENANCE_CONTRACT_INVALID",
      "replay_recipe.lineage_boundary_refs must mirror lineage_boundary_refs",
    );
  }
  if (!bundle.replay_recipe.deterministic_order_basis.includes("PROOF_PATH_SELECTION_V1")) {
    throw new ProvenanceModelError(
      "PROVENANCE_CONTRACT_INVALID",
      "replay_recipe.deterministic_order_basis must include PROOF_PATH_SELECTION_V1",
    );
  }
  const requiredArtifactRefs = new Set(bundle.replay_recipe.required_artifact_refs);
  const missingRequiredRefs = [
    bundle.graph_ref,
    ...bundle.decisive_path_refs,
    ...bundle.rejected_path_refs,
    ...bundle.staleness_dependency_refs,
    ...bundle.temporal_propagation_event_refs,
  ].filter((ref) => !requiredArtifactRefs.has(ref));
  if (missingRequiredRefs.length > 0) {
    throw new ProvenanceModelError(
      "PROVENANCE_CONTRACT_INVALID",
      `replay_recipe.required_artifact_refs is missing ${missingRequiredRefs.join(", ")}`,
    );
  }
  const lineageSet = new Set(bundle.lineage_boundary_refs);
  const missingDecisiveLineage = bundle.decisive_lineage_boundary_refs.filter((ref) => !lineageSet.has(ref));
  if (missingDecisiveLineage.length > 0) {
    throw new ProvenanceModelError(
      "PROVENANCE_CONTRACT_INVALID",
      "decisive_lineage_boundary_refs must be a subset of lineage_boundary_refs",
    );
  }
  if (bundle.manifest_refs.length > 1 && bundle.lineage_boundary_refs.length === 0) {
    throw new ProvenanceModelError(
      "PROVENANCE_CONTRACT_INVALID",
      "cross-manifest proof bundles must retain lineage_boundary_refs",
    );
  }
  if (bundle.manifest_refs.length === 1 && bundle.lineage_boundary_refs.length > 0) {
    throw new ProvenanceModelError(
      "PROVENANCE_CONTRACT_INVALID",
      "single-manifest proof bundles must not retain lineage_boundary_refs",
    );
  }
  if (bundle.stale_reason_codes.length > 0 && bundle.staleness_dependency_refs.length === 0) {
    throw new ProvenanceModelError(
      "PROVENANCE_CONTRACT_INVALID",
      "staleness_dependency_refs must stay non-empty when stale reason codes are present",
    );
  }
  if (bundle.staleness_dependency_refs.length > 0 && bundle.stale_reason_codes.length === 0) {
    throw new ProvenanceModelError(
      "PROVENANCE_CONTRACT_INVALID",
      "staleness_dependency_refs must clear when stale reason codes are absent",
    );
  }
  if (bundle.support_state === "STALE") {
    const temporalSet = new Set(bundle.staleness_dependency_refs);
    if (bundle.temporal_propagation_event_refs.length === 0) {
      throw new ProvenanceModelError(
        "PROVENANCE_CONTRACT_INVALID",
        "STALE proof bundles must retain temporal_propagation_event_refs",
      );
    }
    const missingTemporalRefs = bundle.temporal_propagation_event_refs.filter((ref) => !temporalSet.has(ref));
    if (missingTemporalRefs.length > 0) {
      throw new ProvenanceModelError(
        "PROVENANCE_CONTRACT_INVALID",
        "staleness_dependency_refs must include every temporal propagation event",
      );
    }
  }
  if (bundle.lifecycle_state === "SUPERSEDED" && bundle.superseded_by_bundle_ref === null) {
    throw new ProvenanceModelError(
      "PROVENANCE_CONTRACT_INVALID",
      "SUPERSEDED proof bundles must retain superseded_by_bundle_ref",
    );
  }
  if (bundle.superseded_by_bundle_ref !== null && bundle.lifecycle_state !== "SUPERSEDED") {
    throw new ProvenanceModelError(
      "PROVENANCE_CONTRACT_INVALID",
      "superseded_by_bundle_ref requires lifecycle_state SUPERSEDED",
    );
  }

  const retentionLimited = ["LIMITED", "TOMBSTONED", "PSEUDONYMISED"].includes(
    bundle.retention_binding.limitation_behavior,
  );
  if (retentionLimited) {
    const noteClasses = new Set(bundle.limitation_notes.map((note) => note.note_class));
    if (bundle.render_refs.explanation_status === "AVAILABLE" || bundle.admissibility_state === "ADMISSIBLE") {
      throw new ProvenanceModelError(
        "PROVENANCE_CONTRACT_INVALID",
        "retention-limited proof bundles must degrade explanation and admissibility posture",
      );
    }
    if (bundle.limitation_notes.length === 0 || (!noteClasses.has("RETENTION") && !noteClasses.has("PRIVACY"))) {
      throw new ProvenanceModelError(
        "PROVENANCE_CONTRACT_INVALID",
        "retention-limited proof bundles require RETENTION or PRIVACY limitation notes",
      );
    }
  }
  if (bundle.render_refs.explanation_status !== "AVAILABLE" && bundle.limitation_notes.length === 0) {
    throw new ProvenanceModelError(
      "PROVENANCE_CONTRACT_INVALID",
      "non-AVAILABLE proof bundles must retain explicit limitation notes",
    );
  }
}

export function normalizeProofBundleRecord(input: ProofBundleRecord): ProofBundleRecord {
  const manifestId = requireString("manifest_id", input.manifest_id);
  const manifestRefs = normalizeManifestRefSpine(manifestId, input.manifest_refs);
  const primaryPathRef = normalizeNullableString("primary_path_ref", input.primary_path_ref);
  const decisivePathRefs = normalizeOrderedStringSet("decisive_path_refs", input.decisive_path_refs ?? []);
  const rejectedPathRefs = normalizeOrderedStringSet("rejected_path_refs", input.rejected_path_refs ?? []);
  const lineageBoundaryRefs = normalizeSortedStringSet("lineage_boundary_refs", input.lineage_boundary_refs ?? []);
  const decisiveLineageBoundaryRefs = normalizeSortedStringSet(
    "decisive_lineage_boundary_refs",
    input.decisive_lineage_boundary_refs ?? [],
  );
  const staleReasonCodes = normalizeSortedStringSet("stale_reason_codes", input.stale_reason_codes ?? []);
  const stalenessDependencyRefs = normalizeSortedStringSet(
    "staleness_dependency_refs",
    input.staleness_dependency_refs ?? [],
  );
  const temporalPropagationEventRefs = normalizeSortedStringSet(
    "temporal_propagation_event_refs",
    input.temporal_propagation_event_refs ?? [],
  );
  const graphRef = requireString("graph_ref", input.graph_ref);
  const proofBundleId = requireString("proof_bundle_id", input.proof_bundle_id);
  const replayRecipe = normalizeReplayRecipe({
    closed: input.closure_state === "CLOSED",
    decisive_path_refs: decisivePathRefs,
    graph_ref: graphRef,
    lineage_boundary_refs: lineageBoundaryRefs,
    manifest_refs: manifestRefs,
    primary_path_ref: primaryPathRef,
    rejected_path_refs: rejectedPathRefs,
    replay_recipe: input.replay_recipe,
    staleness_dependency_refs: stalenessDependencyRefs,
    temporal_propagation_event_refs: temporalPropagationEventRefs,
  });
  const withoutHash: Omit<ProofBundleRecord, "bundle_hash" | "contract"> = {
    admissibility_state: input.admissibility_state,
    artifact_type: "ProofBundle",
    authority_basis_refs: normalizeSortedStringSet("authority_basis_refs", input.authority_basis_refs ?? []),
    bundle_purpose: (input.bundle_purpose ?? "FILING_DEFENCE") as ProofBundlePurpose,
    closure_state: (input.closure_state ?? "OPEN") as ProofBundleClosureState,
    config_basis_refs: normalizeSortedStringSet("config_basis_refs", input.config_basis_refs ?? []),
    contradiction_refs: normalizeSortedStringSet("contradiction_refs", input.contradiction_refs ?? []),
    decisive_evidence_refs: normalizeSortedStringSet("decisive_evidence_refs", input.decisive_evidence_refs ?? []),
    decisive_lineage_boundary_refs: decisiveLineageBoundaryRefs,
    decisive_path_refs: decisivePathRefs,
    generated_at: normalizeTimestamp("generated_at", input.generated_at),
    graph_ref: graphRef,
    lifecycle_state: (input.lifecycle_state ?? "GENERATED") as ProofBundleLifecycleState,
    limitation_notes: normalizeLimitationNotes(input.limitation_notes ?? []),
    lineage_boundary_refs: lineageBoundaryRefs,
    manifest_id: manifestId,
    manifest_refs: manifestRefs,
    partition_contract: buildProvenancePartitionContract(input.partition_contract),
    primary_path_ref: primaryPathRef,
    proof_bundle_id: proofBundleId,
    proof_closure_contract: input.proof_closure_contract,
    rejected_path_entries: normalizeRejectedPathEntries(input.rejected_path_entries ?? [], rejectedPathRefs),
    rejected_path_refs: rejectedPathRefs,
    render_refs: normalizeRenderRefs(input.render_refs, proofBundleId),
    replay_recipe: replayRecipe,
    retention_binding: normalizeRetentionBinding(input.retention_binding),
    retention_limited_explainability_contract: buildProofBundleRetentionLimitedExplainabilityContract(),
    stale_reason_codes: staleReasonCodes,
    staleness_dependency_refs: stalenessDependencyRefs,
    superseded_by_bundle_ref: normalizeNullableString("superseded_by_bundle_ref", input.superseded_by_bundle_ref),
    support_state: (input.support_state ?? "UNSUPPORTED") as ProofBundleSupportState,
    target_class: (input.target_class ?? "FIGURE") as ProofBundleTargetClass,
    target_ref: requireString("target_ref", input.target_ref),
    temporal_propagation_event_refs: temporalPropagationEventRefs,
  };
  assertProofBundleInvariants(withoutHash);
  const bundleHash = deriveProofBundleHash(withoutHash);
  if (input.bundle_hash && input.bundle_hash !== bundleHash) {
    throw new ProvenanceModelError(
      "PROVENANCE_CONTRACT_INVALID",
      "bundle_hash does not match normalized ProofBundle content",
    );
  }
  return {
    ...withoutHash,
    bundle_hash: bundleHash,
    contract: buildProofBundleArtifactContract({
      bundle_hash: bundleHash,
      proof_bundle_id: proofBundleId,
      schema_bundle_hash: input.contract?.schema_bundle_hash,
      writer_build_id: input.contract?.writer_build_id,
    }),
  };
}

export function buildProofBundleRecord(input: ProofBundleBuildInput): ProofBundleRecord {
  const generatedAt = normalizeTimestamp("generated_at", input.generated_at ?? "2026-04-28T00:00:00Z");
  const primaryPathRef = normalizeNullableString("primary_path_ref", input.primary_path_ref ?? null);
  const rejectedPathRefs = normalizeOrderedStringSet("rejected_path_refs", input.rejected_path_refs ?? []);
  const bundlePurpose = (input.bundle_purpose ?? "FILING_DEFENCE") as ProofBundlePurpose;
  const supportState = (input.support_state ?? "UNSUPPORTED") as ProofBundleSupportState;
  const proofBundleId =
    input.proof_bundle_id ??
    deriveProofBundleId({
      bundle_purpose: bundlePurpose,
      generated_at: generatedAt,
      graph_ref: input.graph_ref,
      manifest_id: input.manifest_id,
      primary_path_ref: primaryPathRef,
      rejected_path_refs: rejectedPathRefs,
      support_state: supportState,
      target_ref: input.target_ref,
    });
  const rejectedPathEntries =
    input.rejected_path_entries ??
    rejectedPathRefs.map((pathRef, index) => ({
      path_rank: index + 2,
      path_ref: pathRef,
      rejection_class: "WEAKER_SUPPORT" as const,
      rejection_reason_codes: ["LOWER_RANKED_BY_PROOF_PATH_SELECTION_V1"],
    }));
  const draft = {
    ...input,
    admissibility_state:
      input.admissibility_state ??
      (supportState === "SUPPORTED" ? "ADMISSIBLE" : supportState === "UNSUPPORTED" ? "INADMISSIBLE" : "LIMITED"),
    artifact_type: "ProofBundle",
    bundle_purpose: bundlePurpose,
    closure_state: input.closure_state ?? (["SUPPORTED", "PARTIALLY_SUPPORTED"].includes(supportState) ? "CLOSED" : "OPEN"),
    contract: input.contract ?? ({} as ProofBundleArtifactContract),
    generated_at: generatedAt,
    lifecycle_state: input.lifecycle_state ?? "GENERATED",
    limitation_notes: input.limitation_notes ?? [],
    manifest_refs: input.manifest_refs ?? [input.manifest_id],
    primary_path_ref: primaryPathRef,
    proof_bundle_id: proofBundleId,
    rejected_path_entries: rejectedPathEntries,
    rejected_path_refs: rejectedPathRefs,
    render_refs: input.render_refs ?? normalizeRenderRefs(undefined, proofBundleId),
    retention_binding: input.retention_binding ?? {
      limitation_behavior: "FULL",
      minimum_available_until: null,
      retention_tag_ref: "retention-tag://proof-bundle/full",
    },
    retention_limited_explainability_contract:
      input.retention_limited_explainability_contract ?? buildProofBundleRetentionLimitedExplainabilityContract(),
    superseded_by_bundle_ref: input.superseded_by_bundle_ref ?? null,
    support_state: supportState,
  } as ProofBundleRecord;
  delete (draft as Partial<ProofBundleRecord>).bundle_hash;
  return normalizeProofBundleRecord(draft as ProofBundleRecord);
}

export function deriveProofBundleContentHash(record: ProofBundleRecord) {
  return normalizeProofBundleRecord({ ...record, bundle_hash: "" }).bundle_hash;
}

export function cloneProofBundleRecord(record: ProofBundleRecord) {
  return cloneRecord(normalizeProofBundleRecord(record));
}
