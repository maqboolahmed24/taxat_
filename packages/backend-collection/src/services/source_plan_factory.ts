import type {
  SourcePlanDraft,
  SourcePlanPlannedSourceRecord,
  SourcePlanRecord,
} from "../models/source_plan.ts";
import {
  buildSourcePlanContract,
  deriveSourcePlanHash,
  normalizeSourcePlanDraft,
  normalizeSourcePlanRecord,
} from "../models/source_plan.ts";
import { validatePlanCoverage } from "./plan_coverage_validator.ts";

export type BuildSourcePlanInput = {
  manifest_id: string;
  planned_sources: SourcePlanPlannedSourceRecord[];
  required_domains: string[];
  schema_bundle_hash?: string;
  source_plan_id?: string;
  writer_build_id?: string;
};

export function buildSourcePlan(input: BuildSourcePlanInput): SourcePlanRecord {
  const draft: SourcePlanDraft = normalizeSourcePlanDraft({
    artifact_type: "SourcePlan",
    manifest_id: input.manifest_id,
    planned_sources: input.planned_sources,
    required_domains: input.required_domains,
    source_plan_id: input.source_plan_id ?? `source-plan.${input.manifest_id}`,
  });
  validatePlanCoverage(draft);
  const sourcePlanHash = deriveSourcePlanHash(draft);
  return normalizeSourcePlanRecord({
    ...draft,
    source_plan_hash: sourcePlanHash,
    contract: buildSourcePlanContract({
      schema_bundle_hash: input.schema_bundle_hash,
      source_plan_hash: sourcePlanHash,
      source_plan_id: draft.source_plan_id,
      writer_build_id: input.writer_build_id,
    }),
  });
}
