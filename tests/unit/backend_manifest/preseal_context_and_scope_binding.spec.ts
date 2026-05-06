import { expect, test } from "@playwright/test";

import {
  UpdateManifestPresealContextError,
  applyManifestPresealContextPatch,
  buildFrozenExecutionBinding,
  enforceAccessScopeAndMasking,
  materializeScopeExecutionBinding,
  validateManifestLineageProjection,
  validateRuntimeScopeBinding,
  type RunManifestRecord,
} from "../../../packages/backend-manifest/src/index.ts";
import {
  buildBaseAllocatedManifest,
  buildFrozenBasis,
} from "../../fixtures/run_manifest_fixture.ts";

type FrozenBasisFixture = ReturnType<typeof buildFrozenBasis>;

function configFreezeForPatch(
  basis: FrozenBasisFixture,
): NonNullable<RunManifestRecord["config_freeze"]> {
  return basis.config_freeze as unknown as NonNullable<RunManifestRecord["config_freeze"]>;
}

function inputFreezeForPatch(
  basis: FrozenBasisFixture,
): NonNullable<RunManifestRecord["input_freeze"]> {
  return basis.input_freeze as unknown as NonNullable<RunManifestRecord["input_freeze"]>;
}

test("scope binding materialization preserves authorized narrowing deterministically", () => {
  const materialized = materializeScopeExecutionBinding({
    mode: "COMPLIANCE",
    requested_scope: ["year_end", "quarterly_update"],
    access_decision: {
      decision: "ALLOW",
      authorization_decision_access_binding_hash:
        "authorization-decision-access-binding-hash://preseal.scope.narrowed",
      effective_scope: ["year_end"],
      reason_codes: ["ACCESS_GRANTED", "SCOPE_REDUCED_BY_AUTHORIZATION"],
    },
  });

  expect(materialized.status).toBe("MATERIALIZED");
  if (materialized.status === "MATERIALIZED") {
    expect(materialized.scope_execution_binding.requested_scope).toEqual([
      "year_end",
      "quarterly_update",
    ]);
    expect(materialized.scope_execution_binding.executable_scope).toEqual(["year_end"]);
    expect(materialized.scope_execution_binding.reduction_posture).toBe(
      "REDUCED_BY_AUTHORIZATION",
    );
  }
});

test("masking stays bound to the same executable access packet", () => {
  const materialized = materializeScopeExecutionBinding({
    mode: "COMPLIANCE",
    requested_scope: ["year_end"],
    access_decision: {
      decision: "ALLOW_MASKED",
      authorization_decision_access_binding_hash:
        "authorization-decision-access-binding-hash://preseal.scope.masked",
      effective_scope: ["year_end"],
      masking_rules: ["mask-rule://income-source", "mask-rule://client-ref"],
      reason_codes: ["ACCESS_GRANTED_MASKED"],
    },
  });

  expect(materialized.status).toBe("MATERIALIZED");
  if (materialized.status === "MATERIALIZED") {
    const enforced = enforceAccessScopeAndMasking({
      runtime_scope: ["year_end"],
      scope_execution_binding: materialized.scope_execution_binding,
    });
    expect(enforced.access_decision).toBe("ALLOW_MASKED");
    expect(enforced.masking_rules).toEqual([
      "mask-rule://client-ref",
      "mask-rule://income-source",
    ]);
  }
});

test("step-up, approval, and deny outcomes remain pre-start boundaries", () => {
  for (const decision of ["REQUIRE_STEP_UP", "REQUIRE_APPROVAL", "DENY"] as const) {
    const outcome = materializeScopeExecutionBinding({
      mode: "COMPLIANCE",
      requested_scope: ["year_end"],
      access_decision: {
        decision,
        authorization_decision_access_binding_hash:
          `authorization-decision-access-binding-hash://preseal.boundary.${decision.toLowerCase()}`,
        effective_scope: ["year_end"],
        reason_codes: [`${decision}_BOUNDARY`],
      },
    });
    expect(outcome.status).toBe("PRESTART_BOUNDARY");
    expect(outcome.scope_execution_binding).toBeNull();
  }
});

test("runtime scope validation rejects widened worker scope", () => {
  const materialized = materializeScopeExecutionBinding({
    mode: "COMPLIANCE",
    requested_scope: ["year_end"],
    access_decision: {
      decision: "ALLOW",
      authorization_decision_access_binding_hash:
        "authorization-decision-access-binding-hash://preseal.scope.runtime",
      effective_scope: ["year_end"],
      reason_codes: ["ACCESS_GRANTED"],
    },
  });
  expect(materialized.status).toBe("MATERIALIZED");
  if (materialized.status === "MATERIALIZED") {
    const validation = validateRuntimeScopeBinding({
      runtime_scope: ["year_end", "prepare_submission"],
      scope_execution_binding: materialized.scope_execution_binding,
    });
    expect(validation.valid).toBe(false);
    expect(validation.reason_codes).toContain("RUNTIME_SCOPE_EXCEEDS_EXECUTABLE_SCOPE");
  }
});

test("frozen execution binding is assembled from canonical manifest, config, and input sources", () => {
  const manifest = buildBaseAllocatedManifest({
    manifest_id: "manifest.run.frozen-binding.0104",
    idempotency_key: "idempotency://manifest.run.frozen-binding.0104",
  });
  const basis = buildFrozenBasis(manifest);

  const frozen = buildFrozenExecutionBinding({
    manifest,
    config_freeze: configFreezeForPatch(basis),
    input_freeze: inputFreezeForPatch(basis),
  });

  expect(frozen.hash_set.execution_basis_hash).toBe(basis.hash_set.execution_basis_hash);
  expect(frozen.frozen_execution_binding.manifest_id).toBe(manifest.manifest_id);
  expect(frozen.frozen_execution_binding.scope_execution_binding.binding_scope_class).toBe(
    "FROZEN_EXECUTION_BINDING",
  );
  expect(frozen.frozen_execution_binding.config_resolution_basis).toBe(
    "DIRECT_REQUEST_RESOLUTION",
  );
});

test("lineage projection validation fails closed on top-level and branch drift", () => {
  const manifest = buildBaseAllocatedManifest({
    manifest_id: "manifest.run.lineage-drift.0104",
    idempotency_key: "idempotency://manifest.run.lineage-drift.0104",
  });
  const drifted: RunManifestRecord = {
    ...manifest,
    root_manifest_id: "manifest.run.other-root.0104",
  };

  const validation = validateManifestLineageProjection(drifted);
  expect(validation.valid).toBe(false);
  expect(validation.reason_codes).toContain("TOP_LEVEL_CONTINUATION_SET_MISMATCH");
  expect(validation.reason_codes).toContain("BRANCH_DECISION_LINEAGE_MISMATCH");
});

test("preseal patch rejects non-runnable access decisions and applies full frozen basis", () => {
  const manifest = buildBaseAllocatedManifest({
    manifest_id: "manifest.run.preseal-patch.0104",
    idempotency_key: "idempotency://manifest.run.preseal-patch.0104",
  });
  expect(() =>
    applyManifestPresealContextPatch({
      manifest,
      patch: {
        access_decision: {
          decision: "REQUIRE_STEP_UP",
          authorization_decision_access_binding_hash:
            "authorization-decision-access-binding-hash://preseal.patch.step-up",
          effective_scope: ["year_end"],
          reason_codes: ["STEP_UP_REQUIRED"],
        },
      },
    }),
  ).toThrow(UpdateManifestPresealContextError);

  const basis = buildFrozenBasis(manifest);
  const patched = applyManifestPresealContextPatch({
    manifest,
    patch: {
      config_freeze: configFreezeForPatch(basis),
      input_freeze: inputFreezeForPatch(basis),
    },
  });
  expect(patched.manifest.hash_set?.execution_basis_hash).toBe(
    basis.hash_set.execution_basis_hash,
  );
  expect(patched.patched_fields).toContain("frozen_execution_binding");
});
