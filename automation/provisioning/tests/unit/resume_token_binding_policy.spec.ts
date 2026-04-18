import { expect, test } from "@playwright/test";

import {
  createLocalVsSharedCachePolicy,
  createResumeTokenBindingPolicy,
  createStreamResumeContractMap,
  createTtlAndInvalidationMatrix,
  validateLocalVsSharedCachePolicy,
  validateResumeTokenBindingPolicy,
  validateStreamResumeContractMap,
  validateTtlAndInvalidationMatrix,
} from "../../../../infra/cache/bootstrap/provision_cache_and_stream_resume_store.js";

test("resume policy keeps raw tokens transport-only and binds route or legality context explicitly", () => {
  const policy = createResumeTokenBindingPolicy();
  validateResumeTokenBindingPolicy(policy);

  expect(policy.binding_rows).toHaveLength(5);
  expect(
    policy.binding_rows.every(
      (row) =>
        row.raw_resume_token_policy ===
        "TRANSPORT_ONLY_NEVER_PERSIST_RAW_TOKEN",
    ),
  ).toBe(true);

  const manifestRow = policy.binding_rows.find(
    (row) => row.policy_ref === "resume.manifest_experience",
  );
  expect(manifestRow?.required_binding_dimensions).toEqual(
    expect.arrayContaining([
      "route_identity_ref",
      "canonical_object_ref",
      "shell_stability_token",
      "session_ref",
      "session_binding_hash",
      "access_binding_hash",
      "masking_context_hash",
    ]),
  );
  expect(manifestRow?.envelope_fields).not.toContain("raw_resume_token");

  const uploadRow = policy.binding_rows.find(
    (row) => row.policy_ref === "resume.upload_session_recovery",
  );
  expect(uploadRow?.required_binding_dimensions).toEqual(
    expect.arrayContaining([
      "request_binding_hash",
      "request_rebase_generation",
      "schema_compatibility_ref",
      "session_binding_hash",
    ]),
  );
  expect(uploadRow?.notes.join(" ")).toMatch(/read|mutation/i);
});

test("ttl coverage, invalidation triggers, forbidden cache classes, and contract anchors remain explicit", () => {
  const ttlMatrix = createTtlAndInvalidationMatrix();
  const localPolicy = createLocalVsSharedCachePolicy();
  const contractMap = createStreamResumeContractMap();

  validateTtlAndInvalidationMatrix(ttlMatrix);
  validateLocalVsSharedCachePolicy(localPolicy);
  validateStreamResumeContractMap(contractMap);

  expect(ttlMatrix.family_ttl_rows).toHaveLength(5);
  expect(ttlMatrix.invalidation_rows).toHaveLength(10);
  expect(
    ttlMatrix.invalidation_rows.map((row) => row.trigger_ref),
  ).toEqual(
    expect.arrayContaining([
      "trigger.tenant_switch",
      "trigger.masking_tightening",
      "trigger.session_revoked",
      "trigger.schema_incompatible",
      "trigger.cache_only_restore",
    ]),
  );

  const rawTokenClass = localPolicy.class_rows.find(
    (row) => row.class_ref === "class.raw_resume_token",
  );
  expect(rawTokenClass?.never_local).toBe(true);
  expect(rawTokenClass?.never_shared).toBe(true);
  expect(rawTokenClass?.shared_store_policy).toBe("FORBIDDEN_AT_REST");

  const sessionClass = localPolicy.class_rows.find(
    (row) => row.class_ref === "class.session_cookie_or_bearer",
  );
  expect(sessionClass?.never_local).toBe(true);
  expect(sessionClass?.never_shared).toBe(true);

  const nativeContract = contractMap.rows.find(
    (row) => row.contract_row_ref === "contract.native_operator_hydration",
  );
  expect(nativeContract?.schema_refs).toEqual(
    expect.arrayContaining([
      "Algorithm/schemas/native_cache_hydration_contract.schema.json",
      "Algorithm/schemas/cache_isolation_contract.schema.json",
      "Algorithm/schemas/stream_recovery_contract.schema.json",
    ]),
  );
});
