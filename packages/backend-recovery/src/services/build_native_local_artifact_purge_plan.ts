import {
  nativeHydrationRegulatedLocalArtifactClasses,
  type NativeHydrationPurgeReasonCode,
  type NativeRegulatedLocalArtifactClass,
} from "./classify_native_hydration_compatibility.ts";

export type NativeLocalArtifactPurgePlan = {
  first_paint_outcome: "ALLOW_FIRST_PAINT" | "BLOCK_FIRST_PAINT_AND_PURGE";
  local_artifact_purge_policy: "PURGE_NSUSERACTIVITY_PREVIEW_EXPORT_AND_INDEX_WITH_CACHE_STATE";
  mutation_gate:
    | "ALLOW_MUTATION_AND_FILING"
    | "BLOCK_MUTATION_AND_FILING_UNTIL_LIVE_REBASE"
    | "BLOCK_MUTATION_AND_FILING_AND_PURGE";
  purge_execution_policy: "SELECTIVE_IMMEDIATE_PURGE_ON_SCOPE_SESSION_MASKING_OR_SCHEMA_DRIFT";
  purge_required: boolean;
  purge_trigger_reason_codes: NativeHydrationPurgeReasonCode[];
  purged_artifact_classes: NativeRegulatedLocalArtifactClass[];
  resume_binding_ref_after_purge_or_null: string | null;
};

export function buildNativeLocalArtifactPurgePlan(input: {
  purge_trigger_reason_codes: readonly NativeHydrationPurgeReasonCode[];
  restoration_mode?: "CACHE_ONLY_RESTORE" | "CURRENT_LIVE" | "REVALIDATING" | undefined;
  resume_binding_ref_or_null?: string | null | undefined;
}): NativeLocalArtifactPurgePlan {
  const purgeReasonCodes = [...input.purge_trigger_reason_codes];
  const purgeRequired = purgeReasonCodes.length > 0;
  const restorationMode = input.restoration_mode ?? "CURRENT_LIVE";
  return {
    first_paint_outcome: purgeRequired ? "BLOCK_FIRST_PAINT_AND_PURGE" : "ALLOW_FIRST_PAINT",
    local_artifact_purge_policy: "PURGE_NSUSERACTIVITY_PREVIEW_EXPORT_AND_INDEX_WITH_CACHE_STATE",
    mutation_gate: purgeRequired
      ? "BLOCK_MUTATION_AND_FILING_AND_PURGE"
      : restorationMode === "CACHE_ONLY_RESTORE" || restorationMode === "REVALIDATING"
        ? "BLOCK_MUTATION_AND_FILING_UNTIL_LIVE_REBASE"
        : "ALLOW_MUTATION_AND_FILING",
    purge_execution_policy:
      "SELECTIVE_IMMEDIATE_PURGE_ON_SCOPE_SESSION_MASKING_OR_SCHEMA_DRIFT",
    purge_required: purgeRequired,
    purge_trigger_reason_codes: purgeReasonCodes,
    purged_artifact_classes: purgeRequired
      ? [...nativeHydrationRegulatedLocalArtifactClasses]
      : [],
    resume_binding_ref_after_purge_or_null: purgeRequired
      ? null
      : (input.resume_binding_ref_or_null ?? null),
  };
}
