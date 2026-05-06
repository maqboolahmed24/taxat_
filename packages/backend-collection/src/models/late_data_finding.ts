import { LateDataFindingSchemaLineage } from "../../../generated-models/src/generated/typescript/domain-workflow-and-filing.ts";
import type { SchemaBundleArtifactContract } from "../../../generated-models/src/generated/typescript/manifest-and-release.ts";
import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";
import {
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
import {
  lateDataIndicatorRef,
  lateDataPolicyRefSeverity,
  normalizeLateDataTemporalContract,
  type LateDataRuntimeScopeRefs,
  type LateDataSeverity,
  type LateDataTemporalContractRecord,
} from "./late_data_indicator.ts";

export const LATE_DATA_FINDING_STATES = [
  "OPEN",
  "EXCLUDED_FROM_ACTIVE_MANIFEST",
  "REVIEW_REQUIRED",
  "CHILD_MANIFEST_SPAWNED",
  "SUPERSEDED",
] as const;

export const LATE_DATA_ACTIVE_MANIFEST_EFFECTS = [
  "NONE",
  "NOTICE_ONLY",
  "REVIEW_REQUIRED",
  "OUT_OF_SCOPE_CHILD_REQUIRED",
] as const;

export type LateDataFindingState = (typeof LATE_DATA_FINDING_STATES)[number];
export type LateDataActiveManifestEffect =
  (typeof LATE_DATA_ACTIVE_MANIFEST_EFFECTS)[number];

export type LateDataFindingRecord = {
  active_manifest_effect: LateDataActiveManifestEffect;
  artifact_type: "LateDataFinding";
  binding_ref: string;
  child_manifest_ref: string | null;
  discovered_at: string;
  finding_id: string;
  finding_state: LateDataFindingState;
  indicator_refs: string[];
  late_data_policy_ref: CollectionLateDataPolicyRef;
  manifest_id: string;
  partition_scope_refs: string[];
  reason_codes: string[];
  resolved_at: string | null;
  runtime_scope_refs: LateDataRuntimeScopeRefs;
  severity: LateDataSeverity;
  source_class: CollectionSourceClassOrNull;
  source_domain: string;
  superseded_by_finding_ref: string | null;
  temporal_classification_contract: LateDataTemporalContractRecord;
  workflow_item_ref: string | null;
};

export type LateDataFindingBuildInput = Omit<
  LateDataFindingRecord,
  "artifact_type" | "finding_id"
> & {
  finding_id?: string;
};

export type LateDataFindingModelErrorCode =
  | "LATE_DATA_FINDING_ARTIFACT_TYPE_INVALID"
  | "LATE_DATA_FINDING_EFFECT_INVALID"
  | "LATE_DATA_FINDING_POLICY_STATE_MISMATCH"
  | "LATE_DATA_FINDING_SEVERITY_MISMATCH"
  | "LATE_DATA_FINDING_STATE_INVALID";

export class LateDataFindingModelError extends Error {
  readonly code: LateDataFindingModelErrorCode;

  constructor(code: LateDataFindingModelErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "LateDataFindingModelError";
    this.code = code;
  }
}

function normalizeFindingState(value: unknown): LateDataFindingState {
  const normalized = normalizeCollectionString("late_data_finding.finding_state", value);
  if (!LATE_DATA_FINDING_STATES.includes(normalized as LateDataFindingState)) {
    throw new LateDataFindingModelError(
      "LATE_DATA_FINDING_STATE_INVALID",
      "finding_state must be canonical",
    );
  }
  return normalized as LateDataFindingState;
}

function normalizeActiveEffect(value: unknown): LateDataActiveManifestEffect {
  const normalized = normalizeCollectionString(
    "late_data_finding.active_manifest_effect",
    value,
  );
  if (!LATE_DATA_ACTIVE_MANIFEST_EFFECTS.includes(normalized as LateDataActiveManifestEffect)) {
    throw new LateDataFindingModelError(
      "LATE_DATA_FINDING_EFFECT_INVALID",
      "active_manifest_effect must be canonical",
    );
  }
  return normalized as LateDataActiveManifestEffect;
}

function nullableRef(label: string, value: string | null) {
  return value === null ? null : normalizeCollectionString(label, value);
}

function normalizeResolvedAt(value: string | null) {
  return value === null ? null : normalizeUtcInstantString(value);
}

function assertPolicyState(input: LateDataFindingRecord) {
  const expectedSeverity = lateDataPolicyRefSeverity(input.late_data_policy_ref);
  if (input.severity !== expectedSeverity) {
    throw new LateDataFindingModelError(
      "LATE_DATA_FINDING_SEVERITY_MISMATCH",
      "finding severity must match the resolved late-data policy",
    );
  }

  if (input.finding_state === "OPEN") {
    if (
      input.child_manifest_ref !== null ||
      input.workflow_item_ref !== null ||
      input.superseded_by_finding_ref !== null ||
      input.resolved_at !== null
    ) {
      throw new LateDataFindingModelError(
        "LATE_DATA_FINDING_POLICY_STATE_MISMATCH",
        "OPEN findings cannot carry child, workflow, supersession, or resolution refs",
      );
    }
    return;
  }

  if (input.finding_state === "EXCLUDED_FROM_ACTIVE_MANIFEST") {
    if (
      input.late_data_policy_ref !== "EXCLUDE_LATE" ||
      input.active_manifest_effect !== "NOTICE_ONLY" ||
      input.child_manifest_ref !== null ||
      input.workflow_item_ref !== null ||
      input.superseded_by_finding_ref !== null ||
      input.resolved_at === null
    ) {
      throw new LateDataFindingModelError(
        "LATE_DATA_FINDING_POLICY_STATE_MISMATCH",
        "excluded findings must be notice-only and resolved without child/workflow refs",
      );
    }
    return;
  }

  if (input.finding_state === "REVIEW_REQUIRED") {
    if (
      input.late_data_policy_ref !== "REVIEW_IF_LATE" ||
      input.active_manifest_effect !== "REVIEW_REQUIRED" ||
      input.workflow_item_ref === null ||
      input.child_manifest_ref !== null ||
      input.superseded_by_finding_ref !== null ||
      input.resolved_at !== null
    ) {
      throw new LateDataFindingModelError(
        "LATE_DATA_FINDING_POLICY_STATE_MISMATCH",
        "review findings must carry a workflow ref and remain unresolved",
      );
    }
    return;
  }

  if (input.finding_state === "CHILD_MANIFEST_SPAWNED") {
    if (
      input.late_data_policy_ref !== "SPAWN_CHILD_MANIFEST" ||
      input.active_manifest_effect !== "OUT_OF_SCOPE_CHILD_REQUIRED" ||
      input.child_manifest_ref === null ||
      input.workflow_item_ref !== null ||
      input.superseded_by_finding_ref !== null ||
      input.resolved_at === null
    ) {
      throw new LateDataFindingModelError(
        "LATE_DATA_FINDING_POLICY_STATE_MISMATCH",
        "child-manifest findings must carry child ref and resolved_at",
      );
    }
    return;
  }

  if (
    input.finding_state === "SUPERSEDED" &&
    (input.active_manifest_effect !== "NONE" ||
      input.superseded_by_finding_ref === null ||
      input.resolved_at === null)
  ) {
    throw new LateDataFindingModelError(
      "LATE_DATA_FINDING_POLICY_STATE_MISMATCH",
      "superseded findings must clear active effect and reference the replacing finding",
    );
  }
}

export function lateDataFindingRef(finding: Pick<LateDataFindingRecord, "finding_id">) {
  return `late-data-finding://${finding.finding_id}`;
}

export function deriveLateDataFindingId(input: Omit<LateDataFindingRecord, "finding_id">) {
  return `late-data-finding.${deriveCollectionControlHash({
    artifact_family: "LATE_DATA_FINDING_ID",
    payload: input,
  })}`;
}

export function normalizeLateDataFindingRecord(
  input: LateDataFindingRecord,
): LateDataFindingRecord {
  if (input.artifact_type !== "LateDataFinding") {
    throw new LateDataFindingModelError(
      "LATE_DATA_FINDING_ARTIFACT_TYPE_INVALID",
      "late-data findings must carry artifact_type LateDataFinding",
    );
  }

  const record: LateDataFindingRecord = {
    active_manifest_effect: normalizeActiveEffect(input.active_manifest_effect),
    artifact_type: "LateDataFinding",
    binding_ref: normalizeCollectionString("late_data_finding.binding_ref", input.binding_ref),
    child_manifest_ref: nullableRef(
      "late_data_finding.child_manifest_ref",
      input.child_manifest_ref,
    ),
    discovered_at: normalizeUtcInstantString(input.discovered_at),
    finding_id: normalizeCollectionString("late_data_finding.finding_id", input.finding_id),
    finding_state: normalizeFindingState(input.finding_state),
    indicator_refs: normalizeCollectionStringSet(
      "late_data_finding.indicator_refs",
      input.indicator_refs,
      { minItems: 1 },
    ),
    late_data_policy_ref: normalizeLateDataPolicyRef(
      "late_data_finding.late_data_policy_ref",
      input.late_data_policy_ref,
    ),
    manifest_id: normalizeCollectionString("late_data_finding.manifest_id", input.manifest_id),
    partition_scope_refs: normalizeCollectionStringSet(
      "late_data_finding.partition_scope_refs",
      input.partition_scope_refs,
    ),
    reason_codes: normalizeCollectionStringSet(
      "late_data_finding.reason_codes",
      input.reason_codes,
      { minItems: 1 },
    ),
    resolved_at: normalizeResolvedAt(input.resolved_at),
    runtime_scope_refs: normalizeCollectionRuntimeScopes(
      "late_data_finding.runtime_scope_refs",
      input.runtime_scope_refs,
    ) as LateDataRuntimeScopeRefs,
    severity: input.severity,
    source_class: normalizeCollectionSourceClassOrNull(
      "late_data_finding.source_class",
      input.source_class,
    ),
    source_domain: normalizeCollectionString("late_data_finding.source_domain", input.source_domain),
    superseded_by_finding_ref: nullableRef(
      "late_data_finding.superseded_by_finding_ref",
      input.superseded_by_finding_ref,
    ),
    temporal_classification_contract: normalizeLateDataTemporalContract(
      input.temporal_classification_contract,
    ),
    workflow_item_ref: nullableRef("late_data_finding.workflow_item_ref", input.workflow_item_ref),
  };
  assertPolicyState(record);
  return record;
}

export function buildLateDataFindingRecord(
  input: LateDataFindingBuildInput,
): LateDataFindingRecord {
  const { finding_id: explicitFindingId, ...payload } = input;
  const base: Omit<LateDataFindingRecord, "finding_id"> = {
    ...payload,
    artifact_type: "LateDataFinding",
  };
  const findingId = explicitFindingId ?? deriveLateDataFindingId(base);
  return normalizeLateDataFindingRecord({
    ...base,
    finding_id: findingId,
  });
}

export function buildLateDataFindingFromIndicator(input: {
  child_manifest_ref?: string;
  indicator: {
    binding_ref: string;
    discovered_at: string;
    indicator_id: string;
    late_data_policy_ref: CollectionLateDataPolicyRef;
    manifest_id: string;
    partition_scope_refs: string[];
    reason_codes: string[];
    runtime_scope_refs: LateDataRuntimeScopeRefs;
    severity: LateDataSeverity;
    source_class: CollectionSourceClassOrNull;
    source_domain: string;
    temporal_classification_contract: LateDataTemporalContractRecord;
  };
  resolved_at?: string;
  workflow_item_ref?: string;
}) {
  const indicatorRef = lateDataIndicatorRef(input.indicator);
  switch (input.indicator.late_data_policy_ref) {
    case "EXCLUDE_LATE":
      return buildLateDataFindingRecord({
        active_manifest_effect: "NOTICE_ONLY",
        binding_ref: input.indicator.binding_ref,
        child_manifest_ref: null,
        discovered_at: input.indicator.discovered_at,
        finding_state: "EXCLUDED_FROM_ACTIVE_MANIFEST",
        indicator_refs: [indicatorRef],
        late_data_policy_ref: "EXCLUDE_LATE",
        manifest_id: input.indicator.manifest_id,
        partition_scope_refs: input.indicator.partition_scope_refs,
        reason_codes: ["LATE_DATA_EXCLUDED_FROM_ACTIVE_MANIFEST", ...input.indicator.reason_codes],
        resolved_at: input.resolved_at ?? input.indicator.discovered_at,
        runtime_scope_refs: input.indicator.runtime_scope_refs,
        severity: input.indicator.severity,
        source_class: input.indicator.source_class,
        source_domain: input.indicator.source_domain,
        superseded_by_finding_ref: null,
        temporal_classification_contract: input.indicator.temporal_classification_contract,
        workflow_item_ref: null,
      });
    case "REVIEW_IF_LATE":
      return buildLateDataFindingRecord({
        active_manifest_effect: "REVIEW_REQUIRED",
        binding_ref: input.indicator.binding_ref,
        child_manifest_ref: null,
        discovered_at: input.indicator.discovered_at,
        finding_state: "REVIEW_REQUIRED",
        indicator_refs: [indicatorRef],
        late_data_policy_ref: "REVIEW_IF_LATE",
        manifest_id: input.indicator.manifest_id,
        partition_scope_refs: input.indicator.partition_scope_refs,
        reason_codes: ["LATE_DATA_REVIEW_REQUIRED", ...input.indicator.reason_codes],
        resolved_at: null,
        runtime_scope_refs: input.indicator.runtime_scope_refs,
        severity: input.indicator.severity,
        source_class: input.indicator.source_class,
        source_domain: input.indicator.source_domain,
        superseded_by_finding_ref: null,
        temporal_classification_contract: input.indicator.temporal_classification_contract,
        workflow_item_ref:
          input.workflow_item_ref ??
          `workflow-item://late-data/${deriveCollectionControlHash({
            artifact_family: "LATE_DATA_WORKFLOW_ITEM",
            payload: { indicator_ref: indicatorRef },
          })}`,
      });
    case "SPAWN_CHILD_MANIFEST":
      return buildLateDataFindingRecord({
        active_manifest_effect: "OUT_OF_SCOPE_CHILD_REQUIRED",
        binding_ref: input.indicator.binding_ref,
        child_manifest_ref:
          input.child_manifest_ref ??
          `run-manifest://child/${deriveCollectionControlHash({
            artifact_family: "LATE_DATA_CHILD_MANIFEST",
            payload: { indicator_ref: indicatorRef },
          })}`,
        discovered_at: input.indicator.discovered_at,
        finding_state: "CHILD_MANIFEST_SPAWNED",
        indicator_refs: [indicatorRef],
        late_data_policy_ref: "SPAWN_CHILD_MANIFEST",
        manifest_id: input.indicator.manifest_id,
        partition_scope_refs: input.indicator.partition_scope_refs,
        reason_codes: ["LATE_DATA_CHILD_MANIFEST_REQUIRED", ...input.indicator.reason_codes],
        resolved_at: input.resolved_at ?? input.indicator.discovered_at,
        runtime_scope_refs: input.indicator.runtime_scope_refs,
        severity: input.indicator.severity,
        source_class: input.indicator.source_class,
        source_domain: input.indicator.source_domain,
        superseded_by_finding_ref: null,
        temporal_classification_contract: input.indicator.temporal_classification_contract,
        workflow_item_ref: null,
      });
  }
}

export function buildLateDataFindingContract(input: {
  finding_id: string;
  finding_payload_hash: string;
  schema_bundle_hash?: string;
  writer_build_id?: string;
}): SchemaBundleArtifactContract {
  return buildCollectionArtifactContract({
    artifact_content_hash: input.finding_payload_hash,
    artifact_id: lateDataFindingRef({ finding_id: input.finding_id }),
    artifact_type: "LateDataFinding",
    ...(input.schema_bundle_hash === undefined
      ? {}
      : { schema_bundle_hash: input.schema_bundle_hash }),
    schema_id: LateDataFindingSchemaLineage.schemaId,
    schema_source_hash: LateDataFindingSchemaLineage.sourceHash,
    writer_build_id: input.writer_build_id ?? "build.taxat.collection.0117",
  });
}

export function deriveLateDataFindingPayloadHash(record: LateDataFindingRecord) {
  return `late-data-finding-hash://${deriveCollectionControlHash({
    artifact_family: "LATE_DATA_FINDING",
    payload: normalizeLateDataFindingRecord(record),
  })}`;
}

export function cloneLateDataFindingRecord(record: LateDataFindingRecord) {
  return structuredClone(record);
}
