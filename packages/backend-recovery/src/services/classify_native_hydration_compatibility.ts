import type { NativeCacheHydrationContract } from "../../../generated-models/src/generated/typescript/surface-and-experience.ts";

export type NativeHydrationScopeClass = NativeCacheHydrationContract["hydration_scope_class"];

export const nativeHydrationCompatibilityDimensions = [
  "TENANT_ID",
  "PRINCIPAL_CLASS",
  "SESSION_BINDING",
  "SESSION_LINEAGE",
  "ACCESS_BINDING_OR_NULL",
  "MASKING_POSTURE",
  "ROUTE_IDENTITY",
  "CANONICAL_OBJECT",
  "SUPPORTED_CONTRACT_WINDOW",
  "PROJECTION_GUARD",
] as const;

export const nativeHydrationPurgeTriggerReasonCodes = [
  "TENANT_SWITCH",
  "PRINCIPAL_CLASS_CHANGE",
  "PRIVILEGE_DOWNGRADE",
  "SESSION_REVOKED",
  "SESSION_BINDING_CHANGE",
  "ACCESS_BINDING_CHANGE",
  "MASKING_CHANGE",
  "SCHEMA_INCOMPATIBLE",
  "ROUTE_OR_OBJECT_DRIFT",
] as const;

export const nativeHydrationRegulatedLocalArtifactClasses = [
  "STRUCTURED_CACHE",
  "RESUME_METADATA",
  "SCENE_RESTORATION_PAYLOAD",
  "NSUSERACTIVITY",
  "PREVIEW_CACHE",
  "TEMP_EXPORT_FILE",
  "LOCAL_SEARCH_INDEX",
] as const;

export type NativeHydrationPurgeReasonCode =
  (typeof nativeHydrationPurgeTriggerReasonCodes)[number];
export type NativeRegulatedLocalArtifactClass =
  (typeof nativeHydrationRegulatedLocalArtifactClasses)[number];

export type NativeHydrationCompatibilityEnvelope = {
  access_binding_hash_or_null: string | null;
  canonical_object_ref: string;
  masking_posture_fingerprint: string;
  principal_class: string;
  projection_guard_ref: string;
  route_identity_ref: string;
  schema_compatibility_ref: string;
  session_binding_hash: string;
  session_lineage_ref_or_null: string | null;
  tenant_id: string;
};

export type NativeHydrationCompatibilityInput = {
  cached: NativeHydrationCompatibilityEnvelope;
  current: NativeHydrationCompatibilityEnvelope;
  restoration_mode?: "CACHE_ONLY_RESTORE" | "CURRENT_LIVE" | "REVALIDATING" | undefined;
  session_revoked?: boolean | undefined;
  privilege_downgraded?: boolean | undefined;
};

export type NativeHydrationCompatibilityResult = {
  compatible_before_first_paint: boolean;
  compatibility_dimensions: typeof nativeHydrationCompatibilityDimensions;
  mutation_posture:
    | "ALLOW_MUTATION_AND_FILING"
    | "BLOCK_MUTATION_AND_FILING_UNTIL_LIVE_REBASE"
    | "BLOCK_MUTATION_AND_FILING_AND_PURGE";
  purge_required: boolean;
  purge_trigger_reason_codes: NativeHydrationPurgeReasonCode[];
  restoration_reuse_legal: boolean;
  resume_lineage_reuse_legal: boolean;
};

function pushReason(
  reasons: Set<NativeHydrationPurgeReasonCode>,
  reason: NativeHydrationPurgeReasonCode,
) {
  reasons.add(reason);
}

export function classifyNativeHydrationCompatibility(
  input: NativeHydrationCompatibilityInput,
): NativeHydrationCompatibilityResult {
  const reasons = new Set<NativeHydrationPurgeReasonCode>();

  if (input.cached.tenant_id !== input.current.tenant_id) {
    pushReason(reasons, "TENANT_SWITCH");
  }
  if (input.cached.principal_class !== input.current.principal_class) {
    pushReason(reasons, "PRINCIPAL_CLASS_CHANGE");
  }
  if (input.privilege_downgraded) {
    pushReason(reasons, "PRIVILEGE_DOWNGRADE");
  }
  if (input.session_revoked) {
    pushReason(reasons, "SESSION_REVOKED");
  }
  if (
    input.cached.session_binding_hash !== input.current.session_binding_hash ||
    input.cached.session_lineage_ref_or_null !== input.current.session_lineage_ref_or_null
  ) {
    pushReason(reasons, "SESSION_BINDING_CHANGE");
  }
  if (input.cached.access_binding_hash_or_null !== input.current.access_binding_hash_or_null) {
    pushReason(reasons, "ACCESS_BINDING_CHANGE");
  }
  if (input.cached.masking_posture_fingerprint !== input.current.masking_posture_fingerprint) {
    pushReason(reasons, "MASKING_CHANGE");
  }
  if (input.cached.schema_compatibility_ref !== input.current.schema_compatibility_ref) {
    pushReason(reasons, "SCHEMA_INCOMPATIBLE");
  }
  if (
    input.cached.route_identity_ref !== input.current.route_identity_ref ||
    input.cached.canonical_object_ref !== input.current.canonical_object_ref
  ) {
    pushReason(reasons, "ROUTE_OR_OBJECT_DRIFT");
  }
  if (input.cached.projection_guard_ref !== input.current.projection_guard_ref) {
    pushReason(reasons, "SCHEMA_INCOMPATIBLE");
  }

  const purgeReasonCodes = nativeHydrationPurgeTriggerReasonCodes.filter((reason) =>
    reasons.has(reason),
  );
  const purgeRequired = purgeReasonCodes.length > 0;
  const restorationMode = input.restoration_mode ?? "CURRENT_LIVE";
  const cacheOnlyOrRevalidating =
    restorationMode === "CACHE_ONLY_RESTORE" || restorationMode === "REVALIDATING";

  return {
    compatible_before_first_paint: !purgeRequired,
    compatibility_dimensions: nativeHydrationCompatibilityDimensions,
    mutation_posture: purgeRequired
      ? "BLOCK_MUTATION_AND_FILING_AND_PURGE"
      : cacheOnlyOrRevalidating
        ? "BLOCK_MUTATION_AND_FILING_UNTIL_LIVE_REBASE"
        : "ALLOW_MUTATION_AND_FILING",
    purge_required: purgeRequired,
    purge_trigger_reason_codes: purgeReasonCodes,
    restoration_reuse_legal: !purgeRequired,
    resume_lineage_reuse_legal:
      !purgeRequired &&
      input.cached.session_lineage_ref_or_null === input.current.session_lineage_ref_or_null,
  };
}
