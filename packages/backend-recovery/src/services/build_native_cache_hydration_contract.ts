import type { NativeCacheHydrationContract } from "../../../generated-models/src/generated/typescript/surface-and-experience.ts";
import type { JsonValue } from "../../../generated-models/src/generated/typescript/primitives.ts";
import {
  nativeHydrationCompatibilityDimensions,
  nativeHydrationPurgeTriggerReasonCodes,
  nativeHydrationRegulatedLocalArtifactClasses,
  type NativeHydrationScopeClass,
} from "./classify_native_hydration_compatibility.ts";

export type BuildNativeCacheHydrationContractInput = {
  access_binding_hash_or_null?: string | null | undefined;
  canonical_object_ref: string;
  hydration_scope_class: NativeHydrationScopeClass;
  masking_posture_fingerprint: string;
  preview_subject_ref_or_null?: string | null | undefined;
  principal_class: string;
  projection_guard_ref: string;
  restoration_anchor_ref_or_null?: string | null | undefined;
  resume_binding_ref_or_null?: string | null | undefined;
  route_identity_ref: string;
  schema_compatibility_ref: string;
  session_binding_hash: string;
  session_lineage_ref_or_null?: string | null | undefined;
  shell_family: string;
  tenant_id: string;
};

export class NativeCacheHydrationContractBuildError extends Error {
  readonly code: "NATIVE_FIELD_REQUIRED" | "NATIVE_SCOPE_FIELD_POSTURE_INVALID";
  readonly trace: string;

  constructor(input: {
    code: "NATIVE_FIELD_REQUIRED" | "NATIVE_SCOPE_FIELD_POSTURE_INVALID";
    detail: string;
    payload: unknown;
  }) {
    const trace = nativeCacheHydrationContractSerializedPayloadTrace(input.payload);
    super(`${input.code}: ${input.detail}; ${trace}`);
    this.name = "NativeCacheHydrationContractBuildError";
    this.code = input.code;
    this.trace = trace;
  }
}

function fail(
  code: NativeCacheHydrationContractBuildError["code"],
  detail: string,
  payload: unknown,
): never {
  throw new NativeCacheHydrationContractBuildError({ code, detail, payload });
}

function requiredString(field: string, value: string | null | undefined, payload: unknown) {
  if (typeof value !== "string" || value.length === 0) {
    fail("NATIVE_FIELD_REQUIRED", `${field} must be a non-empty string`, payload);
  }
  return value;
}

function optionalString(field: string, value: string | null | undefined, payload: unknown) {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== "string" || value.length === 0) {
    fail("NATIVE_FIELD_REQUIRED", `${field} must be null or a non-empty string`, payload);
  }
  return value;
}

export function nativeCacheHydrationContractSerializedPayloadTrace(payload: unknown) {
  return `trace=${JSON.stringify(payload, null, 2)}`;
}

export function buildNativeCacheHydrationContract(
  input: BuildNativeCacheHydrationContractInput,
): NativeCacheHydrationContract {
  const restorationAnchorRefOrNull = optionalString(
    "restoration_anchor_ref_or_null",
    input.restoration_anchor_ref_or_null,
    input,
  );
  const previewSubjectRefOrNull = optionalString(
    "preview_subject_ref_or_null",
    input.preview_subject_ref_or_null,
    input,
  );

  if (
    input.hydration_scope_class === "EXPERIENCE_CURSOR" ||
    input.hydration_scope_class === "WORKSPACE_CURSOR"
  ) {
    if (restorationAnchorRefOrNull !== null || previewSubjectRefOrNull !== null) {
      fail(
        "NATIVE_SCOPE_FIELD_POSTURE_INVALID",
        `${input.hydration_scope_class} must clear restoration and preview bindings`,
        input,
      );
    }
  } else if (input.hydration_scope_class === "NATIVE_PRIMARY_SCENE") {
    if (restorationAnchorRefOrNull === null) {
      fail(
        "NATIVE_SCOPE_FIELD_POSTURE_INVALID",
        "NATIVE_PRIMARY_SCENE requires a restoration anchor",
        input,
      );
    }
    if (previewSubjectRefOrNull !== null) {
      fail(
        "NATIVE_SCOPE_FIELD_POSTURE_INVALID",
        "NATIVE_PRIMARY_SCENE must clear preview subject binding",
        input,
      );
    }
  } else if (input.hydration_scope_class === "NATIVE_SECONDARY_WINDOW") {
    if (restorationAnchorRefOrNull === null || previewSubjectRefOrNull === null) {
      fail(
        "NATIVE_SCOPE_FIELD_POSTURE_INVALID",
        "NATIVE_SECONDARY_WINDOW requires restoration and preview subject bindings",
        input,
      );
    }
  } else {
    fail(
      "NATIVE_SCOPE_FIELD_POSTURE_INVALID",
      `unknown native hydration scope ${input.hydration_scope_class}`,
      input,
    );
  }

  return {
    access_binding_hash_or_null: optionalString(
      "access_binding_hash_or_null",
      input.access_binding_hash_or_null,
      input,
    ),
    canonical_object_ref: requiredString("canonical_object_ref", input.canonical_object_ref, input),
    compatibility_dimensions: [...nativeHydrationCompatibilityDimensions] as JsonValue[],
    contract_version: "NATIVE_CACHE_HYDRATION_V1",
    cursor_lineage_policy: "RESUME_AND_DELTA_REUSE_REQUIRE_EXACT_LIVE_CURSOR_LINEAGE",
    first_paint_policy: "VERIFY_COMPATIBILITY_BEFORE_RENDER_OR_RESTORE",
    hydration_scope_class: input.hydration_scope_class,
    local_artifact_purge_policy: "PURGE_NSUSERACTIVITY_PREVIEW_EXPORT_AND_INDEX_WITH_CACHE_STATE",
    masking_posture_fingerprint: requiredString(
      "masking_posture_fingerprint",
      input.masking_posture_fingerprint,
      input,
    ),
    mutation_gate_policy: "NO_MUTATION_OR_FILING_AFTER_CACHE_ONLY_RESTORE_OR_CONTEXT_DRIFT",
    preview_subject_ref_or_null: previewSubjectRefOrNull,
    principal_class: requiredString("principal_class", input.principal_class, input),
    projection_guard_ref: requiredString("projection_guard_ref", input.projection_guard_ref, input),
    purge_execution_policy:
      "SELECTIVE_IMMEDIATE_PURGE_ON_SCOPE_SESSION_MASKING_OR_SCHEMA_DRIFT",
    purge_trigger_reason_codes: [...nativeHydrationPurgeTriggerReasonCodes] as JsonValue[],
    regulated_local_artifact_classes: [
      ...nativeHydrationRegulatedLocalArtifactClasses,
    ] as JsonValue[],
    restoration_anchor_ref_or_null: restorationAnchorRefOrNull,
    restoration_reuse_policy:
      "SAME_OBJECT_SAME_SHELL_ONLY_WHEN_FULL_LEGALITY_ENVELOPE_MATCHES",
    resume_binding_ref_or_null: optionalString(
      "resume_binding_ref_or_null",
      input.resume_binding_ref_or_null,
      input,
    ),
    route_identity_ref: requiredString("route_identity_ref", input.route_identity_ref, input),
    schema_compatibility_ref: requiredString(
      "schema_compatibility_ref",
      input.schema_compatibility_ref,
      input,
    ),
    session_binding_hash: requiredString(
      "session_binding_hash",
      input.session_binding_hash,
      input,
    ),
    session_lineage_ref_or_null: optionalString(
      "session_lineage_ref_or_null",
      input.session_lineage_ref_or_null,
      input,
    ),
    shell_family: requiredString("shell_family", input.shell_family, input),
    tenant_id: requiredString("tenant_id", input.tenant_id, input),
  };
}
