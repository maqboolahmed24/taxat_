import { expect, test } from "@playwright/test";

import { validateContractSchema } from "../../../../tests/unit/backend_northbound/audit_and_enquiry_fixtures.ts";
import {
  buildNativeCacheHydrationContract,
  buildNativeLocalArtifactPurgePlan,
  classifyNativeHydrationCompatibility,
  nativeCacheHydrationContractSerializedPayloadTrace,
  nativeHydrationPurgeTriggerReasonCodes,
} from "../index.ts";

function nativeBase() {
  return {
    access_binding_hash_or_null: "access-binding-hash-1",
    canonical_object_ref: "item-1",
    masking_posture_fingerprint: "masking-fingerprint-1",
    principal_class: "STAFF_FULL",
    projection_guard_ref: "guard-vector-hash-1",
    resume_binding_ref_or_null: "resume-binding-hash-1",
    route_identity_ref: "workspace-route-1",
    schema_compatibility_ref: "schema-window-1",
    session_binding_hash: "session-binding-hash-1",
    session_lineage_ref_or_null: "session-lineage-1",
    shell_family: "CALM_SHELL",
    tenant_id: "tenant-1",
  } as const;
}

test("builds schema-valid native cursor and scene hydration contracts with first-paint and mutation gates", async () => {
  const cursor = buildNativeCacheHydrationContract({
    ...nativeBase(),
    hydration_scope_class: "WORKSPACE_CURSOR",
  });
  const primaryScene = buildNativeCacheHydrationContract({
    ...nativeBase(),
    hydration_scope_class: "NATIVE_PRIMARY_SCENE",
    restoration_anchor_ref_or_null: "nsuseractivity-primary-1",
  });

  await validateContractSchema("native_cache_hydration_contract", cursor);
  await validateContractSchema("native_cache_hydration_contract", primaryScene);
  expect(cursor.restoration_anchor_ref_or_null).toBeNull();
  expect(cursor.preview_subject_ref_or_null).toBeNull();
  expect(primaryScene.restoration_anchor_ref_or_null).toBe("nsuseractivity-primary-1");
  expect(primaryScene.preview_subject_ref_or_null).toBeNull();
  expect(primaryScene.first_paint_policy).toBe("VERIFY_COMPATIBILITY_BEFORE_RENDER_OR_RESTORE");
  expect(primaryScene.mutation_gate_policy).toBe(
    "NO_MUTATION_OR_FILING_AFTER_CACHE_ONLY_RESTORE_OR_CONTEXT_DRIFT",
  );
});

test("requires secondary-window restoration and preview-subject bindings", async () => {
  const secondary = buildNativeCacheHydrationContract({
    ...nativeBase(),
    canonical_object_ref: "preview-artifact-1",
    hydration_scope_class: "NATIVE_SECONDARY_WINDOW",
    preview_subject_ref_or_null: "preview-artifact-1",
    restoration_anchor_ref_or_null: "nsuseractivity-secondary-1",
    route_identity_ref: "scene:native-secondary-1",
  });

  await validateContractSchema("native_cache_hydration_contract", secondary);
  expect(secondary.preview_subject_ref_or_null).toBe("preview-artifact-1");
  expect(() =>
    buildNativeCacheHydrationContract({
      ...nativeBase(),
      hydration_scope_class: "NATIVE_SECONDARY_WINDOW",
      restoration_anchor_ref_or_null: "nsuseractivity-secondary-1",
    }),
  ).toThrow(/requires restoration and preview subject bindings/);
});

test("classifies exact native hydration dimensions and blocks cache-only mutation posture", () => {
  const envelope = nativeBase();
  const result = classifyNativeHydrationCompatibility({
    cached: envelope,
    current: envelope,
    restoration_mode: "CACHE_ONLY_RESTORE",
  });

  expect(result.compatible_before_first_paint).toBe(true);
  expect(result.purge_required).toBe(false);
  expect(result.resume_lineage_reuse_legal).toBe(true);
  expect(result.mutation_posture).toBe("BLOCK_MUTATION_AND_FILING_UNTIL_LIVE_REBASE");

  const purgePlan = buildNativeLocalArtifactPurgePlan({
    purge_trigger_reason_codes: result.purge_trigger_reason_codes,
    restoration_mode: "CACHE_ONLY_RESTORE",
    resume_binding_ref_or_null: envelope.resume_binding_ref_or_null,
  });
  expect(purgePlan.first_paint_outcome).toBe("ALLOW_FIRST_PAINT");
  expect(purgePlan.mutation_gate).toBe("BLOCK_MUTATION_AND_FILING_UNTIL_LIVE_REBASE");
  expect(purgePlan.purged_artifact_classes).toEqual([]);
});

test("maps tenant, privilege, revocation, masking, and schema drift to purge reasons", () => {
  const cached = nativeBase();
  const current = {
    ...nativeBase(),
    access_binding_hash_or_null: "access-binding-hash-narrowed",
    masking_posture_fingerprint: "masking-fingerprint-narrowed",
    principal_class: "CUSTOMER_VISIBLE",
    projection_guard_ref: "guard-vector-hash-2",
    schema_compatibility_ref: "schema-window-2",
    session_binding_hash: "session-binding-hash-2",
    session_lineage_ref_or_null: "session-lineage-2",
    tenant_id: "tenant-2",
  };

  const result = classifyNativeHydrationCompatibility({
    cached,
    current,
    privilege_downgraded: true,
    session_revoked: true,
  });

  expect(result.purge_required).toBe(true);
  expect(result.compatible_before_first_paint).toBe(false);
  expect(result.purge_trigger_reason_codes).toEqual([
    "TENANT_SWITCH",
    "PRINCIPAL_CLASS_CHANGE",
    "PRIVILEGE_DOWNGRADE",
    "SESSION_REVOKED",
    "SESSION_BINDING_CHANGE",
    "ACCESS_BINDING_CHANGE",
    "MASKING_CHANGE",
    "SCHEMA_INCOMPATIBLE",
  ]);
  expect(result.purge_trigger_reason_codes).toEqual(
    nativeHydrationPurgeTriggerReasonCodes.filter((reason) =>
      result.purge_trigger_reason_codes.includes(reason),
    ),
  );

  const purgePlan = buildNativeLocalArtifactPurgePlan({
    purge_trigger_reason_codes: result.purge_trigger_reason_codes,
    resume_binding_ref_or_null: cached.resume_binding_ref_or_null,
  });
  expect(purgePlan.resume_binding_ref_after_purge_or_null).toBeNull();
  expect(purgePlan.purged_artifact_classes).toEqual([
    "STRUCTURED_CACHE",
    "RESUME_METADATA",
    "SCENE_RESTORATION_PAYLOAD",
    "NSUSERACTIVITY",
    "PREVIEW_CACHE",
    "TEMP_EXPORT_FILE",
    "LOCAL_SEARCH_INDEX",
  ]);
});

test("captures serialized native hydration payload traces on failure", () => {
  const invalid = {
    ...nativeBase(),
    hydration_scope_class: "NATIVE_PRIMARY_SCENE" as const,
  };
  expect(() => buildNativeCacheHydrationContract(invalid)).toThrow(/trace=/);
  expect(nativeCacheHydrationContractSerializedPayloadTrace(invalid)).toContain(
    "NATIVE_PRIMARY_SCENE",
  );
});
