import type {
  SourcePlan as GeneratedSourcePlan,
  SourcePlanPlannedSource as GeneratedSourcePlanPlannedSource,
} from "../../../generated-models/src/generated/typescript/provenance-and-evidence.ts";
import { SourcePlanSchemaLineage } from "../../../generated-models/src/generated/typescript/provenance-and-evidence.ts";
import type { SchemaBundleArtifactContract } from "../../../generated-models/src/generated/typescript/manifest-and-release.ts";
import {
  assertCollectionControl,
  buildCollectionArtifactContract,
  deriveCollectionControlHash,
  normalizeCollectionSourceClass,
  normalizeCollectionString,
  normalizeCollectionStringSet,
  normalizeLateDataPolicyRef,
  type CollectionLateDataPolicyRef,
  type CollectionSourceClass,
} from "./collection_control_common.ts";

const SOURCE_PLAN_READ_MODELS = [
  "AS_OF",
  "WINDOWED",
  "POINT_IN_TIME",
  "LATEST_ALLOWED",
] as const satisfies readonly SourcePlanPlannedSourceRecord["read_model"][];

export type SourcePlanPlannedSourceRecord = Omit<
  GeneratedSourcePlanPlannedSource,
  "late_data_policy_ref" | "source_class"
> & {
  late_data_policy_ref: CollectionLateDataPolicyRef;
  source_class: CollectionSourceClass;
};

export type SourcePlanRecord = Omit<
  GeneratedSourcePlan,
  "contract" | "planned_sources"
> & {
  contract: SchemaBundleArtifactContract;
  planned_sources: SourcePlanPlannedSourceRecord[];
};

export type SourcePlanDraft = Omit<SourcePlanRecord, "contract" | "source_plan_hash">;

export type SourcePlanModelErrorCode =
  | "SOURCE_PLAN_ARTIFACT_TYPE_INVALID"
  | "SOURCE_PLAN_HASH_MISMATCH";

export class SourcePlanModelError extends Error {
  readonly code: SourcePlanModelErrorCode;

  constructor(code: SourcePlanModelErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "SourcePlanModelError";
    this.code = code;
  }
}

function plannedSourceKey(source: SourcePlanPlannedSourceRecord) {
  return [
    source.source_domain,
    source.partition_scope_refs.join("\u001f"),
    source.provider_binding_ref,
    source.source_class,
  ].join("\u001e");
}

export function sourcePlanRef(plan: Pick<SourcePlanRecord, "source_plan_id">) {
  return `source-plan://${plan.source_plan_id}`;
}

export function normalizePlannedSource(
  source: SourcePlanPlannedSourceRecord,
): SourcePlanPlannedSourceRecord {
  return {
    source_domain: normalizeCollectionString("planned_source.source_domain", source.source_domain),
    source_class: normalizeCollectionSourceClass("planned_source.source_class", source.source_class),
    provider_binding_ref: normalizeCollectionString(
      "planned_source.provider_binding_ref",
      source.provider_binding_ref,
    ),
    partition_scope_refs: normalizeCollectionStringSet(
      "planned_source.partition_scope_refs",
      source.partition_scope_refs,
      { minItems: 1 },
    ),
    query_basis_ref: normalizeCollectionString(
      "planned_source.query_basis_ref",
      source.query_basis_ref,
    ),
    cursor_strategy_ref: normalizeCollectionString(
      "planned_source.cursor_strategy_ref",
      source.cursor_strategy_ref,
    ),
    read_model: (() => {
      assertCollectionControl(
        SOURCE_PLAN_READ_MODELS.includes(source.read_model),
        "COLLECTION_CONSTANT_INVALID",
        "planned_source.read_model must be canonical",
      );
      return source.read_model;
    })(),
    late_data_policy_ref: normalizeLateDataPolicyRef(
      "planned_source.late_data_policy_ref",
      source.late_data_policy_ref,
    ),
    completeness_expectation_ref: normalizeCollectionString(
      "planned_source.completeness_expectation_ref",
      source.completeness_expectation_ref,
    ),
    freshness_slo_ref: normalizeCollectionString(
      "planned_source.freshness_slo_ref",
      source.freshness_slo_ref,
    ),
    required_schema_refs: normalizeCollectionStringSet(
      "planned_source.required_schema_refs",
      source.required_schema_refs,
      { minItems: 1 },
    ),
    required_source_class_refs: normalizeCollectionStringSet(
      "planned_source.required_source_class_refs",
      source.required_source_class_refs ?? [],
    ),
  };
}

export function normalizeSourcePlanDraft(input: SourcePlanDraft): SourcePlanDraft {
  if (input.artifact_type !== "SourcePlan") {
    throw new SourcePlanModelError(
      "SOURCE_PLAN_ARTIFACT_TYPE_INVALID",
      "source plans must carry artifact_type SourcePlan",
    );
  }
  const plannedSources = input.planned_sources
    .map((source) => normalizePlannedSource(source))
    .sort((left, right) => plannedSourceKey(left).localeCompare(plannedSourceKey(right)));

  return {
    source_plan_id: normalizeCollectionString("source_plan.source_plan_id", input.source_plan_id),
    manifest_id: normalizeCollectionString("source_plan.manifest_id", input.manifest_id),
    artifact_type: "SourcePlan",
    required_domains: normalizeCollectionStringSet(
      "source_plan.required_domains",
      input.required_domains,
      { minItems: 1 },
    ),
    planned_sources: plannedSources,
  };
}

export function deriveSourcePlanHash(input: SourcePlanDraft) {
  return `source-plan-hash://${deriveCollectionControlHash({
    artifact_family: "SOURCE_PLAN",
    payload: normalizeSourcePlanDraft(input),
  })}`;
}

export function buildSourcePlanContract(input: {
  schema_bundle_hash?: string;
  source_plan_hash: string;
  source_plan_id: string;
  writer_build_id?: string;
}) {
  return buildCollectionArtifactContract({
    artifact_content_hash: input.source_plan_hash,
    artifact_id: sourcePlanRef({ source_plan_id: input.source_plan_id }),
    artifact_type: "SourcePlan",
    schema_bundle_hash: input.schema_bundle_hash,
    schema_id: SourcePlanSchemaLineage.schemaId,
    schema_source_hash: SourcePlanSchemaLineage.sourceHash,
    writer_build_id: input.writer_build_id,
  });
}

export function normalizeSourcePlanRecord(input: SourcePlanRecord): SourcePlanRecord {
  const draft = normalizeSourcePlanDraft(input);
  const expectedHash = deriveSourcePlanHash(draft);
  if (input.source_plan_hash !== expectedHash) {
    throw new SourcePlanModelError(
      "SOURCE_PLAN_HASH_MISMATCH",
      "source_plan_hash must match the canonical source plan payload",
    );
  }
  return {
    ...draft,
    source_plan_hash: expectedHash,
    contract: structuredClone(input.contract),
  };
}

export function cloneSourcePlanRecord(record: SourcePlanRecord) {
  return structuredClone(record);
}
