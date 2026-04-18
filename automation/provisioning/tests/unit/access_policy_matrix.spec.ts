import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

import {
  createAccessPolicyMatrix,
  createSecretAliasCatalog,
  validateAccessPolicyMatrix,
} from "../../../../infra/secrets/bootstrap/provision_secrets_manager_kms_or_hsm_roots.js";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  "..",
);

async function readJson<T>(segments: string[]): Promise<T> {
  const filePath = path.join(repoRoot, ...segments);
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

test("checked-in access policy matrix stays aligned with the builder", async () => {
  const persistedMatrix = await readJson([
    "config",
    "secrets",
    "access_policy_matrix.json",
  ]);

  expect(persistedMatrix).toEqual(createAccessPolicyMatrix());
});

test("least-privilege separation remains explicit across read, decrypt, rotate, and policy capabilities", () => {
  const matrix = createAccessPolicyMatrix();
  const catalog = createSecretAliasCatalog();
  validateAccessPolicyMatrix(matrix, catalog);

  const ciGrant = matrix.grants.find((row) => row.role_ref === "role.ci_deploy");
  expect(ciGrant?.capabilities).toEqual({
    list_metadata: "ALLOW",
    write_secret: "DENY",
    read_secret: "DENY",
    decrypt_unwrap: "DENY",
    rotate_version: "DENY",
    disable_or_revoke: "DENY",
    manage_policy: "DENY",
    attest_audit: "ALLOW",
  });

  const projectionGrant = matrix.grants.find(
    (row) => row.role_ref === "role.projection_service",
  );
  expect(projectionGrant?.capabilities.read_secret).toBe("DENY");
  expect(projectionGrant?.capabilities.decrypt_unwrap).toBe("DENY");

  const supportGrant = matrix.grants.find(
    (row) => row.role_ref === "role.support_adapter",
  );
  expect(
    supportGrant?.alias_refs.some((aliasRef) => aliasRef.includes("authority.hmrc")),
  ).toBe(false);

  const breakGlassGrant = matrix.grants.find(
    (row) => row.role_ref === "role.break_glass_operator",
  );
  expect(breakGlassGrant?.dual_control_required).toBe(true);
  expect(breakGlassGrant?.namespace_refs).toEqual(
    expect.arrayContaining(["sec_production_runtime", "sec_drill_restore_material"]),
  );
});
