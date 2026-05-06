import type { SourcePlanRecord } from "../models/source_plan.ts";
import { sourcePlanRef } from "../models/source_plan.ts";
import type { SourceWindowDraft, SourceWindowRecord } from "../models/source_window.ts";
import {
  buildSourceWindowContract,
  deriveSourceWindowHash,
  normalizeSourceWindowDraft,
  normalizeSourceWindowRecord,
} from "../models/source_window.ts";

export type BuildSourceWindowInput = {
  collection_completed_at: string;
  collection_started_at: string;
  read_cutoff_at: string;
  schema_bundle_hash?: string;
  source_plan: SourcePlanRecord;
  source_window_id?: string;
  writer_build_id?: string;
};

export function buildSourceWindow(input: BuildSourceWindowInput): SourceWindowRecord {
  const draft: SourceWindowDraft = normalizeSourceWindowDraft({
    artifact_type: "SourceWindow",
    collection_completed_at: input.collection_completed_at,
    collection_started_at: input.collection_started_at,
    cutoff_enforcement_state: "HARD_CLOSED_AT_READ_CUTOFF",
    manifest_id: input.source_plan.manifest_id,
    post_cutoff_observation_mode: "LATE_DATA_ONLY",
    read_cutoff_at: input.read_cutoff_at,
    source_plan_ref: sourcePlanRef(input.source_plan),
    source_window_id: input.source_window_id ?? `source-window.${input.source_plan.manifest_id}`,
  });
  const sourceWindowHash = deriveSourceWindowHash(draft);
  return normalizeSourceWindowRecord({
    ...draft,
    source_window_hash: sourceWindowHash,
    contract: buildSourceWindowContract({
      schema_bundle_hash: input.schema_bundle_hash,
      source_window_hash: sourceWindowHash,
      source_window_id: draft.source_window_id,
      writer_build_id: input.writer_build_id,
    }),
  });
}
