import { expect, test } from "@playwright/test";

import {
  compileAccessMatrix,
  compiledCellByTuple,
  compiledRoleById,
  mergeCompiledCells,
} from "../../../packages/access-control/src/index.ts";

test("baseline matrix compiles four default roles and overlays step-up plus approval tuples", async () => {
  const matrix = await compileAccessMatrix({ reload: true });

  expect(matrix.contract_version).toBe("ACCESS_CONTROL_MATRIX_V1");
  expect(matrix.role_templates.map((role) => role.role_id)).toEqual([
    "APPROVER",
    "AUDITOR",
    "SUPPORT_OPERATOR",
    "TENANT_ADMIN",
  ]);

  const tenantAdmin = compiledRoleById(matrix, "TENANT_ADMIN");
  const submitCell = compiledCellByTuple(tenantAdmin, "SubmissionRecord", "SUBMIT_TO_AUTHORITY");
  const erasureCell = compiledCellByTuple(tenantAdmin, "RetentionAction", "EXECUTE_ERASURE");

  expect(submitCell.decision).toBe("REQUIRE_STEP_UP");
  expect(submitCell.required_authn_level).toBe("STEP_UP");
  expect(submitCell.reason_codes).toContain("STEP_UP_REQUIRED_FOR_AUTHORITY_SUBMISSION");

  expect(erasureCell.decision).toBe("REQUIRE_APPROVAL");
  expect(erasureCell.required_approvals).toEqual(["approval.erasure.security-review"]);
  expect(erasureCell.approval_requirement).toBe("SECURITY_REVIEW");
});

test("masked viewer posture and fail-closed multi-role merge stay explicit", async () => {
  const matrix = await compileAccessMatrix({ reload: true });

  const auditor = compiledRoleById(matrix, "AUDITOR");
  const support = compiledRoleById(matrix, "SUPPORT_OPERATOR");
  const tenantAdmin = compiledRoleById(matrix, "TENANT_ADMIN");

  const maskedClientView = compiledCellByTuple(auditor, "Client", "VIEW_MASKED");
  expect(maskedClientView.decision).toBe("ALLOW_MASKED");
  expect(maskedClientView.masking_rules).toContain("mask.client_personal_fields");

  const mergedHumanDeclaration = mergeCompiledCells([
    compiledCellByTuple(tenantAdmin, "SubmissionRecord", "SIGN_CLIENT_DECLARATION"),
    compiledCellByTuple(support, "SubmissionRecord", "SIGN_CLIENT_DECLARATION"),
  ]);

  expect(mergedHumanDeclaration.decision).toBe("DENY");
  expect(mergedHumanDeclaration.reason_codes).toContain("NO_ROLE_GRANT");
  expect(mergedHumanDeclaration.effective_scope).toEqual([]);
});
