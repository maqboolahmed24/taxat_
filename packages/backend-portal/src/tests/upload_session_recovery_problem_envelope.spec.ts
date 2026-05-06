import { expect, test } from "@playwright/test";

import { validateContractSchema } from "../../../../tests/unit/backend_northbound/audit_and_enquiry_fixtures.ts";
import { buildUploadSessionProblemEnvelope } from "../../../backend-northbound/src/services/build_upload_session_problem_envelope.ts";

test("upload-session checksum problems publish the narrow upload recovery ref and receipt", async () => {
  const response = buildUploadSessionProblemEnvelope({
    clientId: "client.taxat-upload",
    correlationId: "corr.upload-recovery.problem.checksum",
    kind: "CHECKSUM_INVALID",
    latestUploadSessionRef: "upload-session.bank-statement.recovery",
    tenantId: "tenant.taxat-upload",
  });

  expect(response.status).toBe(409);
  expect(response.headers["Cache-Control"]).toBe("no-store");
  expect(response.body.latest_upload_session_ref).toBe(
    "upload-session.bank-statement.recovery",
  );
  expect(response.body.latest_command_receipt_ref).toContain("receipt.upload-session.");
  expect(response.body.latest_client_portal_workspace_ref).toBeNull();
  expect(response.body.latest_approval_pack_ref).toBeNull();
  expect(response.body.rebase_required).toBe(true);
  expect(response.body.stale_guard_family).toBe("CLIENT_PORTAL_WORKSPACE_VERSION");
  expect(response.body.actionability_state).toBe("ACTION_AVAILABLE");
  expect(response.body.suggested_detail_surface_code).toBeNull();

  await validateContractSchema("problem_envelope", response.body);
});

test("upload-session stale recovery problems publish stale guard basis and stability hints", () => {
  const response = buildUploadSessionProblemEnvelope({
    clientId: "client.taxat-upload",
    correlationId: "corr.upload-recovery.problem.stale",
    kind: "STATE_INVALID",
    latestStaleGuardValue: 1_777_888_800,
    latestUploadSessionRef: "upload-session.bank-statement.recovery",
    reasonCodes: ["UPLOAD_SESSION_STALE_REQUEST_VERSION"],
    rebaseRequired: true,
    tenantId: "tenant.taxat-upload",
  });

  expect(response.status).toBe(409);
  expect(response.body.latest_upload_session_ref).toBe(
    "upload-session.bank-statement.recovery",
  );
  expect(response.body.latest_command_receipt_ref).toContain("receipt.upload-session.");
  expect(response.body.rebase_required).toBe(true);
  expect(response.body.stale_guard_family).toBe("CLIENT_PORTAL_WORKSPACE_VERSION");
  expect(response.body.latest_stale_guard_value).toBe(1_777_888_800);
  expect(response.body.mutation_precondition_binding_or_null).toMatchObject({
    profile_code: "CLIENT_PORTAL_ROUTE_MUTATION",
    stale_guard_families: ["CLIENT_PORTAL_WORKSPACE_VERSION"],
  });
  expect(response.body.latest_stability_contract_or_null).toMatchObject({
    resume_capability: "SNAPSHOT_ONLY",
    route_scope_class: "CLIENT_PORTAL_ROUTE",
  });
});
