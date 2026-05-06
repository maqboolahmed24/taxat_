import {
  LateDataIndicatorSchemaLineage,
  LateDataPolicyBindingSchemaLineage,
  LateDataTemporalContractSchemaLineage,
  type LateDataConsequenceSummary as GeneratedLateDataConsequenceSummary,
  type LateDataPolicyBindingBindingScope,
  type LateDataPolicyBindingLateDataPolicyRef,
  type LateDataPolicyBindingRuntimeScopeRefs,
} from "../../../generated-models/src/generated/typescript/domain-workflow-and-filing.ts";
import type { SchemaBundleArtifactContract } from "../../../generated-models/src/generated/typescript/manifest-and-release.ts";
import { normalizeUtcInstantString, parseUtcInstant } from "../../../domain-kernel/src/primitives/time.ts";
import {
  COLLECTION_LATE_DATA_POLICY_REFS,
  buildCollectionArtifactContract,
  deriveCollectionControlHash,
  normalizeCollectionRuntimeScopes,
  normalizeCollectionSourceClassOrNull,
  normalizeCollectionString,
  normalizeCollectionStringSet,
  normalizeLateDataPolicyRef,
  type CollectionLateDataPolicyRef,
  type CollectionSourceClassOrNull,
} from "./collection_control_common.ts";

export const LATE_DATA_BINDING_SCOPES = [
  "DOMAIN_WIDE",
  "SOURCE_CLASS",
  "PARTITION_SCOPED",
  "RUNTIME_SCOPED",
] as const satisfies readonly LateDataPolicyBindingBindingScope[];

export const LATE_DATA_INDICATOR_TYPES = [
  "POST_CUTOFF_RECORD",
  "CURSOR_ADVANCED",
  "REVISION_ADVANCED",
  "SCHEMA_VERSION_ADVANCED",
  "FRESHNESS_SLO_BREACH",
] as const;

export const LATE_DATA_DETECTION_BASES = [
  "REQUEST_AUDIT",
  "CURSOR_CHECKPOINT",
  "REVISION_MARKER",
  "SOURCE_RECORD_TIMESTAMP",
  "PROVIDER_SCHEMA_SIGNAL",
  "FRESHNESS_EVALUATION",
] as const;

export const LATE_DATA_SEVERITIES = [
  "NOTICE",
  "MANUAL_REVIEW",
  "CHILD_MANIFEST_REQUIRED",
] as const;

export const LATE_DATA_TEMPORAL_CLASSES = [
  "TEMPORALLY_UNPROVED",
  "AUTHORITY_POSTING_LAG",
  "TRUE_POST_BASELINE_EVENT",
  "PRE_CUTOFF_PREEXISTING_LATE_ARRIVAL",
  "POST_CUTOFF_DISCOVERY_PRE_BASELINE_FACT",
] as const;

export type LateDataBindingScope = (typeof LATE_DATA_BINDING_SCOPES)[number];
export type LateDataIndicatorType = (typeof LATE_DATA_INDICATOR_TYPES)[number];
export type LateDataDetectionBasis = (typeof LATE_DATA_DETECTION_BASES)[number];
export type LateDataSeverity = (typeof LATE_DATA_SEVERITIES)[number];
export type LateDataTemporalClass = (typeof LATE_DATA_TEMPORAL_CLASSES)[number];
export type LateDataRuntimeScopeRefs = LateDataPolicyBindingRuntimeScopeRefs;
export type LateDataPolicyRef = LateDataPolicyBindingLateDataPolicyRef;

export type LateDataTemporalContractRecord = {
  amendment_reuse_invalidated: boolean;
  baseline_scope_class: "NONE" | "CURRENT_SCOPE" | "PRIOR_SUBMISSION_CHAIN";
  classification_profile_code: "LATE_DATA_TEMPORAL_V1";
  filing_critical_baseline_touch: boolean;
  legal_effect_basis:
    | "EFFECTIVE_TIME"
    | "VISIBILITY_TIME"
    | "AUTHORITY_PUBLICATION_TIME"
    | "UNKNOWN";
  proof_staleness_required: boolean;
  reason_codes: string[];
  replay_lineage_policy: "HISTORICAL_LINEAGE_ONLY";
  retroactive_impact_required: boolean;
  t_cutoff: string;
  t_discovered: string;
  t_effective_or_null: string | null;
  t_visible_or_null: string | null;
  temporal_certainty_state: "PROVED" | "UNPROVED";
  temporal_classification: LateDataTemporalClass;
  trust_invalidation_required: boolean;
};

export type LateDataConsequenceSummaryRecord = GeneratedLateDataConsequenceSummary;

export type LateDataPolicyBindingRecord = {
  binding_id: string;
  binding_scope: LateDataBindingScope;
  late_data_policy_ref: CollectionLateDataPolicyRef;
  partition_scope_refs: string[];
  precedence_rank: number;
  runtime_scope_refs: LateDataRuntimeScopeRefs;
  source_class: CollectionSourceClassOrNull;
  source_domain: string;
};

export type LateDataIndicatorRecord = {
  artifact_type: "LateDataIndicator";
  binding_ref: string;
  collection_boundary_ref: string;
  detection_basis: LateDataDetectionBasis;
  discovered_at: string;
  evidence_ref: string | null;
  indicator_hash: string;
  indicator_id: string;
  indicator_type: LateDataIndicatorType;
  late_data_policy_ref: CollectionLateDataPolicyRef;
  manifest_id: string;
  partition_scope_refs: string[];
  reason_codes: string[];
  request_audit_ref: string | null;
  runtime_scope_refs: LateDataRuntimeScopeRefs;
  severity: LateDataSeverity;
  source_class: CollectionSourceClassOrNull;
  source_domain: string;
  source_plan_ref: string;
  source_record_ref: string | null;
  temporal_classification_contract: LateDataTemporalContractRecord;
};

export type LateDataIndicatorDraft = Omit<
  LateDataIndicatorRecord,
  "indicator_hash" | "indicator_id"
>;

export type LateDataIndicatorModelErrorCode =
  | "LATE_DATA_BINDING_SCOPE_INVALID"
  | "LATE_DATA_DETECTION_BASIS_INVALID"
  | "LATE_DATA_INDICATOR_ANCHOR_REQUIRED"
  | "LATE_DATA_INDICATOR_ARTIFACT_TYPE_INVALID"
  | "LATE_DATA_INDICATOR_HASH_MISMATCH"
  | "LATE_DATA_INDICATOR_TYPE_INVALID"
  | "LATE_DATA_POLICY_SEVERITY_MISMATCH"
  | "LATE_DATA_PRECEDENCE_INVALID"
  | "LATE_DATA_SCOPE_SHAPE_INVALID"
  | "LATE_DATA_TEMPORAL_CONTRACT_INVALID";

export class LateDataIndicatorModelError extends Error {
  readonly code: LateDataIndicatorModelErrorCode;

  constructor(code: LateDataIndicatorModelErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "LateDataIndicatorModelError";
    this.code = code;
  }
}

function normalizeBindingScope(value: unknown): LateDataBindingScope {
  const normalized = normalizeCollectionString("late_data_policy_binding.binding_scope", value);
  if (!LATE_DATA_BINDING_SCOPES.includes(normalized as LateDataBindingScope)) {
    throw new LateDataIndicatorModelError(
      "LATE_DATA_BINDING_SCOPE_INVALID",
      "binding_scope must be canonical",
    );
  }
  return normalized as LateDataBindingScope;
}

function normalizeIndicatorType(value: unknown): LateDataIndicatorType {
  const normalized = normalizeCollectionString("late_data_indicator.indicator_type", value);
  if (!LATE_DATA_INDICATOR_TYPES.includes(normalized as LateDataIndicatorType)) {
    throw new LateDataIndicatorModelError(
      "LATE_DATA_INDICATOR_TYPE_INVALID",
      "indicator_type must be canonical",
    );
  }
  return normalized as LateDataIndicatorType;
}

function normalizeDetectionBasis(value: unknown): LateDataDetectionBasis {
  const normalized = normalizeCollectionString("late_data_indicator.detection_basis", value);
  if (!LATE_DATA_DETECTION_BASES.includes(normalized as LateDataDetectionBasis)) {
    throw new LateDataIndicatorModelError(
      "LATE_DATA_DETECTION_BASIS_INVALID",
      "detection_basis must be canonical",
    );
  }
  return normalized as LateDataDetectionBasis;
}

function normalizeSeverity(value: unknown): LateDataSeverity {
  const normalized = normalizeCollectionString("late_data_indicator.severity", value);
  if (!LATE_DATA_SEVERITIES.includes(normalized as LateDataSeverity)) {
    throw new LateDataIndicatorModelError(
      "LATE_DATA_POLICY_SEVERITY_MISMATCH",
      "severity must be canonical",
    );
  }
  return normalized as LateDataSeverity;
}

function normalizeTemporalClass(value: unknown): LateDataTemporalClass {
  const normalized = normalizeCollectionString(
    "late_data_temporal_contract.temporal_classification",
    value,
  );
  if (!LATE_DATA_TEMPORAL_CLASSES.includes(normalized as LateDataTemporalClass)) {
    throw new LateDataIndicatorModelError(
      "LATE_DATA_TEMPORAL_CONTRACT_INVALID",
      "temporal_classification must be canonical",
    );
  }
  return normalized as LateDataTemporalClass;
}

function nullableRef(label: string, value: string | null) {
  return value === null ? null : normalizeCollectionString(label, value);
}

function expectedSeverity(policy: CollectionLateDataPolicyRef): LateDataSeverity {
  switch (policy) {
    case "EXCLUDE_LATE":
      return "NOTICE";
    case "REVIEW_IF_LATE":
      return "MANUAL_REVIEW";
    case "SPAWN_CHILD_MANIFEST":
      return "CHILD_MANIFEST_REQUIRED";
  }
}

function assertBindingScopeShape(binding: LateDataPolicyBindingRecord) {
  if (binding.precedence_rank < 1 || !Number.isInteger(binding.precedence_rank)) {
    throw new LateDataIndicatorModelError(
      "LATE_DATA_PRECEDENCE_INVALID",
      "precedence_rank must be a positive integer",
    );
  }
  if (binding.binding_scope === "DOMAIN_WIDE") {
    if (
      binding.source_class !== null ||
      binding.partition_scope_refs.length > 0 ||
      binding.runtime_scope_refs.length > 0
    ) {
      throw new LateDataIndicatorModelError(
        "LATE_DATA_SCOPE_SHAPE_INVALID",
        "DOMAIN_WIDE bindings cannot carry source class, partition, or runtime narrowing",
      );
    }
  }
  if (binding.binding_scope === "SOURCE_CLASS") {
    if (
      binding.source_class === null ||
      binding.partition_scope_refs.length > 0 ||
      binding.runtime_scope_refs.length > 0
    ) {
      throw new LateDataIndicatorModelError(
        "LATE_DATA_SCOPE_SHAPE_INVALID",
        "SOURCE_CLASS bindings require source_class and cannot carry partition/runtime narrowing",
      );
    }
  }
  if (binding.binding_scope === "PARTITION_SCOPED") {
    if (binding.partition_scope_refs.length === 0 || binding.runtime_scope_refs.length > 0) {
      throw new LateDataIndicatorModelError(
        "LATE_DATA_SCOPE_SHAPE_INVALID",
        "PARTITION_SCOPED bindings require partition_scope_refs and cannot carry runtime narrowing",
      );
    }
  }
  if (binding.binding_scope === "RUNTIME_SCOPED" && binding.runtime_scope_refs.length === 0) {
    throw new LateDataIndicatorModelError(
      "LATE_DATA_SCOPE_SHAPE_INVALID",
      "RUNTIME_SCOPED bindings require runtime_scope_refs",
    );
  }
}

export function lateDataPolicyBindingRef(binding: Pick<LateDataPolicyBindingRecord, "binding_id">) {
  return `late-data-policy-binding://${binding.binding_id}`;
}

export function lateDataIndicatorRef(
  indicator: Pick<LateDataIndicatorRecord, "indicator_id">,
) {
  return `late-data-indicator://${indicator.indicator_id}`;
}

export function normalizeLateDataPolicyBinding(
  input: LateDataPolicyBindingRecord,
): LateDataPolicyBindingRecord {
  const binding: LateDataPolicyBindingRecord = {
    binding_id: normalizeCollectionString("late_data_policy_binding.binding_id", input.binding_id),
    binding_scope: normalizeBindingScope(input.binding_scope),
    late_data_policy_ref: normalizeLateDataPolicyRef(
      "late_data_policy_binding.late_data_policy_ref",
      input.late_data_policy_ref,
    ),
    partition_scope_refs: normalizeCollectionStringSet(
      "late_data_policy_binding.partition_scope_refs",
      input.partition_scope_refs,
    ),
    precedence_rank: input.precedence_rank,
    runtime_scope_refs: normalizeCollectionRuntimeScopes(
      "late_data_policy_binding.runtime_scope_refs",
      input.runtime_scope_refs,
    ) as LateDataRuntimeScopeRefs,
    source_class: normalizeCollectionSourceClassOrNull(
      "late_data_policy_binding.source_class",
      input.source_class,
    ),
    source_domain: normalizeCollectionString(
      "late_data_policy_binding.source_domain",
      input.source_domain,
    ),
  };
  assertBindingScopeShape(binding);
  return binding;
}

export function deriveLateDataPolicyBindingId(
  input: Omit<LateDataPolicyBindingRecord, "binding_id" | "precedence_rank">,
) {
  return `late-data-policy-binding.${deriveCollectionControlHash({
    artifact_family: "LATE_DATA_POLICY_BINDING_ID",
    payload: {
      ...input,
      partition_scope_refs: normalizeCollectionStringSet(
        "late_data_policy_binding.partition_scope_refs",
        input.partition_scope_refs,
      ),
      runtime_scope_refs: normalizeCollectionRuntimeScopes(
        "late_data_policy_binding.runtime_scope_refs",
        input.runtime_scope_refs,
      ),
    },
  })}`;
}

export function normalizeLateDataTemporalContract(
  input: LateDataTemporalContractRecord,
): LateDataTemporalContractRecord {
  if (input.classification_profile_code !== "LATE_DATA_TEMPORAL_V1") {
    throw new LateDataIndicatorModelError(
      "LATE_DATA_TEMPORAL_CONTRACT_INVALID",
      "classification_profile_code must be LATE_DATA_TEMPORAL_V1",
    );
  }
  if (input.replay_lineage_policy !== "HISTORICAL_LINEAGE_ONLY") {
    throw new LateDataIndicatorModelError(
      "LATE_DATA_TEMPORAL_CONTRACT_INVALID",
      "replay_lineage_policy must be HISTORICAL_LINEAGE_ONLY",
    );
  }
  const temporalClassification = normalizeTemporalClass(input.temporal_classification);
  const reasonCodes = normalizeCollectionStringSet(
    "late_data_temporal_contract.reason_codes",
    input.reason_codes,
    {
      minItems:
        temporalClassification === "TEMPORALLY_UNPROVED" ||
        input.retroactive_impact_required ||
        input.trust_invalidation_required ||
        input.proof_staleness_required ||
        input.amendment_reuse_invalidated
          ? 1
          : 0,
    },
  );
  if (temporalClassification === "TEMPORALLY_UNPROVED") {
    if (
      input.temporal_certainty_state !== "UNPROVED" ||
      input.legal_effect_basis !== "UNKNOWN" ||
      !input.trust_invalidation_required ||
      !input.proof_staleness_required ||
      !input.amendment_reuse_invalidated
    ) {
      throw new LateDataIndicatorModelError(
        "LATE_DATA_TEMPORAL_CONTRACT_INVALID",
        "TEMPORALLY_UNPROVED requires unproved uncertainty and invalidation posture",
      );
    }
  }
  if (
    input.filing_critical_baseline_touch &&
    (input.baseline_scope_class === "NONE" ||
      !input.trust_invalidation_required ||
      !input.proof_staleness_required ||
      !input.amendment_reuse_invalidated)
  ) {
    throw new LateDataIndicatorModelError(
      "LATE_DATA_TEMPORAL_CONTRACT_INVALID",
      "filing-critical late data requires current/prior baseline scope and invalidation posture",
    );
  }
  if (input.baseline_scope_class === "PRIOR_SUBMISSION_CHAIN" && !input.retroactive_impact_required) {
    throw new LateDataIndicatorModelError(
      "LATE_DATA_TEMPORAL_CONTRACT_INVALID",
      "prior submission chain late data requires retroactive impact posture",
    );
  }

  return {
    amendment_reuse_invalidated: input.amendment_reuse_invalidated,
    baseline_scope_class: input.baseline_scope_class,
    classification_profile_code: "LATE_DATA_TEMPORAL_V1",
    filing_critical_baseline_touch: input.filing_critical_baseline_touch,
    legal_effect_basis: input.legal_effect_basis,
    proof_staleness_required: input.proof_staleness_required,
    reason_codes: reasonCodes,
    replay_lineage_policy: "HISTORICAL_LINEAGE_ONLY",
    retroactive_impact_required: input.retroactive_impact_required,
    t_cutoff: normalizeUtcInstantString(input.t_cutoff),
    t_discovered: normalizeUtcInstantString(input.t_discovered),
    t_effective_or_null:
      input.t_effective_or_null === null
        ? null
        : normalizeUtcInstantString(input.t_effective_or_null),
    t_visible_or_null:
      input.t_visible_or_null === null ? null : normalizeUtcInstantString(input.t_visible_or_null),
    temporal_certainty_state: input.temporal_certainty_state,
    temporal_classification: temporalClassification,
    trust_invalidation_required: input.trust_invalidation_required,
  };
}

export function buildLateDataTemporalContract(input: {
  authority_originated?: boolean;
  baseline_effective_at?: string | null;
  baseline_scope_class?: "NONE" | "CURRENT_SCOPE" | "PRIOR_SUBMISSION_CHAIN";
  filing_critical_baseline_touch?: boolean;
  reason_codes?: readonly string[];
  t_cutoff: string;
  t_discovered: string;
  t_effective_or_null?: string | null;
  t_visible_or_null?: string | null;
}): LateDataTemporalContractRecord {
  const tCutoff = normalizeUtcInstantString(input.t_cutoff);
  const tDiscovered = normalizeUtcInstantString(input.t_discovered);
  const tEffective =
    input.t_effective_or_null === undefined || input.t_effective_or_null === null
      ? null
      : normalizeUtcInstantString(input.t_effective_or_null);
  const tVisible =
    input.t_visible_or_null === undefined || input.t_visible_or_null === null
      ? null
      : normalizeUtcInstantString(input.t_visible_or_null);
  const filingCritical = input.filing_critical_baseline_touch ?? false;
  const baselineScope =
    input.baseline_scope_class ?? (filingCritical ? "CURRENT_SCOPE" : "NONE");
  const extraReasonCodes = normalizeCollectionStringSet(
    "late_data_temporal_contract.input_reason_codes",
    input.reason_codes ?? [],
  );

  if (tEffective === null || tVisible === null) {
    return normalizeLateDataTemporalContract({
      amendment_reuse_invalidated: true,
      baseline_scope_class: baselineScope === "NONE" && filingCritical ? "CURRENT_SCOPE" : baselineScope,
      classification_profile_code: "LATE_DATA_TEMPORAL_V1",
      filing_critical_baseline_touch: filingCritical,
      legal_effect_basis: "UNKNOWN",
      proof_staleness_required: true,
      reason_codes: normalizeCollectionStringSet("late_data_temporal_contract.reason_codes", [
        "TEMPORAL_PROOF_MISSING",
        ...extraReasonCodes,
      ]),
      replay_lineage_policy: "HISTORICAL_LINEAGE_ONLY",
      retroactive_impact_required: baselineScope === "PRIOR_SUBMISSION_CHAIN",
      t_cutoff: tCutoff,
      t_discovered: tDiscovered,
      t_effective_or_null: tEffective,
      t_visible_or_null: tVisible,
      temporal_certainty_state: "UNPROVED",
      temporal_classification: "TEMPORALLY_UNPROVED",
      trust_invalidation_required: true,
    });
  }

  const cutoff = parseUtcInstant(tCutoff).valueOf();
  const effective = parseUtcInstant(tEffective).valueOf();
  const visible = parseUtcInstant(tVisible).valueOf();
  const baseline =
    input.baseline_effective_at === undefined || input.baseline_effective_at === null
      ? null
      : parseUtcInstant(input.baseline_effective_at).valueOf();
  const priorChain = baselineScope === "PRIOR_SUBMISSION_CHAIN";
  const invalidates = filingCritical || priorChain;
  const retroactive = priorChain || (filingCritical && effective <= cutoff);

  let temporalClassification: LateDataTemporalClass;
  let legalEffectBasis: LateDataTemporalContractRecord["legal_effect_basis"] = "EFFECTIVE_TIME";
  const reasonCodes: string[] = [];
  if (
    input.authority_originated &&
    baseline !== null &&
    effective <= baseline &&
    visible > cutoff
  ) {
    temporalClassification = "AUTHORITY_POSTING_LAG";
    legalEffectBasis = "AUTHORITY_PUBLICATION_TIME";
    reasonCodes.push("AUTHORITY_POSTING_LAG");
  } else if (baseline !== null && effective > baseline) {
    temporalClassification = "TRUE_POST_BASELINE_EVENT";
    reasonCodes.push("TRUE_POST_BASELINE_EVENT");
  } else if (effective <= cutoff && visible <= cutoff) {
    temporalClassification = "PRE_CUTOFF_PREEXISTING_LATE_ARRIVAL";
    legalEffectBasis = "VISIBILITY_TIME";
    reasonCodes.push("PRE_CUTOFF_PREEXISTING_LATE_ARRIVAL");
  } else {
    temporalClassification = "POST_CUTOFF_DISCOVERY_PRE_BASELINE_FACT";
    reasonCodes.push("POST_CUTOFF_DISCOVERY_PRE_BASELINE_FACT");
  }

  return normalizeLateDataTemporalContract({
    amendment_reuse_invalidated: invalidates,
    baseline_scope_class: baselineScope,
    classification_profile_code: "LATE_DATA_TEMPORAL_V1",
    filing_critical_baseline_touch: filingCritical,
    legal_effect_basis: legalEffectBasis,
    proof_staleness_required: invalidates,
    reason_codes: normalizeCollectionStringSet("late_data_temporal_contract.reason_codes", [
      ...reasonCodes,
      ...extraReasonCodes,
    ]),
    replay_lineage_policy: "HISTORICAL_LINEAGE_ONLY",
    retroactive_impact_required: retroactive,
    t_cutoff: tCutoff,
    t_discovered: tDiscovered,
    t_effective_or_null: tEffective,
    t_visible_or_null: tVisible,
    temporal_certainty_state: "PROVED",
    temporal_classification: temporalClassification,
    trust_invalidation_required: invalidates,
  });
}

export function normalizeLateDataIndicatorDraft(
  input: LateDataIndicatorDraft,
): LateDataIndicatorDraft {
  if (input.artifact_type !== "LateDataIndicator") {
    throw new LateDataIndicatorModelError(
      "LATE_DATA_INDICATOR_ARTIFACT_TYPE_INVALID",
      "late-data indicators must carry artifact_type LateDataIndicator",
    );
  }
  const lateDataPolicyRef = normalizeLateDataPolicyRef(
    "late_data_indicator.late_data_policy_ref",
    input.late_data_policy_ref,
  );
  const severity = normalizeSeverity(input.severity);
  if (severity !== expectedSeverity(lateDataPolicyRef)) {
    throw new LateDataIndicatorModelError(
      "LATE_DATA_POLICY_SEVERITY_MISMATCH",
      "indicator severity must match the resolved late-data policy",
    );
  }
  const detectionBasis = normalizeDetectionBasis(input.detection_basis);
  const requestAuditRef = nullableRef(
    "late_data_indicator.request_audit_ref",
    input.request_audit_ref,
  );
  const sourceRecordRef = nullableRef(
    "late_data_indicator.source_record_ref",
    input.source_record_ref,
  );
  const evidenceRef = nullableRef("late_data_indicator.evidence_ref", input.evidence_ref);
  if (requestAuditRef === null && sourceRecordRef === null && evidenceRef === null) {
    throw new LateDataIndicatorModelError(
      "LATE_DATA_INDICATOR_ANCHOR_REQUIRED",
      "late-data indicators require at least one request, source-record, or evidence anchor",
    );
  }
  if (detectionBasis === "REQUEST_AUDIT" && requestAuditRef === null) {
    throw new LateDataIndicatorModelError(
      "LATE_DATA_INDICATOR_ANCHOR_REQUIRED",
      "REQUEST_AUDIT indicators require request_audit_ref",
    );
  }
  if (detectionBasis === "SOURCE_RECORD_TIMESTAMP" && sourceRecordRef === null) {
    throw new LateDataIndicatorModelError(
      "LATE_DATA_INDICATOR_ANCHOR_REQUIRED",
      "SOURCE_RECORD_TIMESTAMP indicators require source_record_ref",
    );
  }
  if (detectionBasis === "FRESHNESS_EVALUATION" && evidenceRef === null) {
    throw new LateDataIndicatorModelError(
      "LATE_DATA_INDICATOR_ANCHOR_REQUIRED",
      "FRESHNESS_EVALUATION indicators require evidence_ref",
    );
  }

  return {
    artifact_type: "LateDataIndicator",
    binding_ref: normalizeCollectionString("late_data_indicator.binding_ref", input.binding_ref),
    collection_boundary_ref: normalizeCollectionString(
      "late_data_indicator.collection_boundary_ref",
      input.collection_boundary_ref,
    ),
    detection_basis: detectionBasis,
    discovered_at: normalizeUtcInstantString(input.discovered_at),
    evidence_ref: evidenceRef,
    indicator_type: normalizeIndicatorType(input.indicator_type),
    late_data_policy_ref: lateDataPolicyRef,
    manifest_id: normalizeCollectionString("late_data_indicator.manifest_id", input.manifest_id),
    partition_scope_refs: normalizeCollectionStringSet(
      "late_data_indicator.partition_scope_refs",
      input.partition_scope_refs,
    ),
    reason_codes: normalizeCollectionStringSet(
      "late_data_indicator.reason_codes",
      input.reason_codes,
      { minItems: 1 },
    ),
    request_audit_ref: requestAuditRef,
    runtime_scope_refs: normalizeCollectionRuntimeScopes(
      "late_data_indicator.runtime_scope_refs",
      input.runtime_scope_refs,
    ) as LateDataRuntimeScopeRefs,
    severity,
    source_class: normalizeCollectionSourceClassOrNull(
      "late_data_indicator.source_class",
      input.source_class,
    ),
    source_domain: normalizeCollectionString(
      "late_data_indicator.source_domain",
      input.source_domain,
    ),
    source_plan_ref: normalizeCollectionString(
      "late_data_indicator.source_plan_ref",
      input.source_plan_ref,
    ),
    source_record_ref: sourceRecordRef,
    temporal_classification_contract: normalizeLateDataTemporalContract(
      input.temporal_classification_contract,
    ),
  };
}

export function deriveLateDataIndicatorId(input: LateDataIndicatorDraft) {
  const draft = normalizeLateDataIndicatorDraft(input);
  return `late-data-indicator.${deriveCollectionControlHash({
    artifact_family: "LATE_DATA_INDICATOR_ID",
    payload: draft,
  })}`;
}

export function deriveLateDataIndicatorHash(input: Omit<LateDataIndicatorRecord, "indicator_hash">) {
  return `late-data-indicator-hash://${deriveCollectionControlHash({
    artifact_family: "LATE_DATA_INDICATOR",
    payload: input,
  })}`;
}

export function buildLateDataIndicatorRecord(
  input: LateDataIndicatorDraft,
): LateDataIndicatorRecord {
  const draft = normalizeLateDataIndicatorDraft(input);
  const indicatorId = deriveLateDataIndicatorId(draft);
  const indicatorHash = deriveLateDataIndicatorHash({
    ...draft,
    indicator_id: indicatorId,
  });
  return normalizeLateDataIndicatorRecord({
    ...draft,
    indicator_hash: indicatorHash,
    indicator_id: indicatorId,
  });
}

export function normalizeLateDataIndicatorRecord(
  input: LateDataIndicatorRecord,
): LateDataIndicatorRecord {
  const draft = normalizeLateDataIndicatorDraft(input);
  const indicatorId = normalizeCollectionString(
    "late_data_indicator.indicator_id",
    input.indicator_id,
  );
  const expectedHash = deriveLateDataIndicatorHash({
    ...draft,
    indicator_id: indicatorId,
  });
  if (input.indicator_hash !== expectedHash) {
    throw new LateDataIndicatorModelError(
      "LATE_DATA_INDICATOR_HASH_MISMATCH",
      "indicator_hash must match the canonical late-data indicator payload",
    );
  }
  return {
    ...draft,
    indicator_hash: expectedHash,
    indicator_id: indicatorId,
  };
}

export function buildLateDataIndicatorContract(input: {
  indicator_hash: string;
  indicator_id: string;
  schema_bundle_hash?: string;
  writer_build_id?: string;
}): SchemaBundleArtifactContract {
  return buildCollectionArtifactContract({
    artifact_content_hash: input.indicator_hash,
    artifact_id: lateDataIndicatorRef({ indicator_id: input.indicator_id }),
    artifact_type: "LateDataIndicator",
    ...(input.schema_bundle_hash === undefined
      ? {}
      : { schema_bundle_hash: input.schema_bundle_hash }),
    schema_id: LateDataIndicatorSchemaLineage.schemaId,
    schema_source_hash: LateDataIndicatorSchemaLineage.sourceHash,
    writer_build_id: input.writer_build_id ?? "build.taxat.collection.0117",
  });
}

export function lateDataPolicyRefSeverity(policy: CollectionLateDataPolicyRef) {
  return expectedSeverity(policy);
}

export function cloneLateDataIndicatorRecord(record: LateDataIndicatorRecord) {
  return structuredClone(record);
}

export function lateDataPolicyBindingSchemaContractRef() {
  return `schema-contract://${LateDataPolicyBindingSchemaLineage.schemaId}#${LateDataPolicyBindingSchemaLineage.sourceHash}`;
}

export function lateDataTemporalContractSchemaContractRef() {
  return `schema-contract://${LateDataTemporalContractSchemaLineage.schemaId}#${LateDataTemporalContractSchemaLineage.sourceHash}`;
}

export function assertLateDataPolicyRef(value: CollectionLateDataPolicyRef) {
  if (!COLLECTION_LATE_DATA_POLICY_REFS.includes(value)) {
    throw new LateDataIndicatorModelError(
      "LATE_DATA_POLICY_SEVERITY_MISMATCH",
      "late-data policy ref must be canonical",
    );
  }
}
