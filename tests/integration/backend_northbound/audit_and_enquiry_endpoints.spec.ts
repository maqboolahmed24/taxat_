import { expect, test } from "@playwright/test";

import {
  getGovernanceAuditInvestigationsEndpoint,
  getManifestAuditTrailEndpoint,
  getManifestEnquiryPackEndpoint,
} from "../../../packages/backend-northbound/src/index.ts";
import {
  auditActorContext,
  auditEventSourceFixture,
  auditManifestId,
  auditTargetRef,
  auditTenantId,
  persistedEnquiryPackRepositoryFixture,
  validateContractSchema,
} from "../../unit/backend_northbound/audit_and_enquiry_fixtures.ts";

test("manifest audit-trail publishes a schema-valid no-store audit frame", async () => {
  const auditEventSource = await auditEventSourceFixture();
  const response = await getManifestAuditTrailEndpoint(
    {
      actorContext: auditActorContext(),
      correlationId: "corr.audit.manifest.integration",
      method: "GET",
      path: `/v1/manifests/${encodeURIComponent(
        auditManifestId,
      )}/audit-trail?event_family=WORKFLOW&limit=2`,
    },
    {
      auditEventSource,
    },
  );

  expect(response.status).toBe(200);
  if (response.status !== 200) {
    throw new Error(response.body.problem_code);
  }
  expect(response.headers["Cache-Control"]).toBe("no-store");
  expect(response.body.query_contract_code).toBe("AUDIT_TRAIL");
  expect(response.body.active_filters.manifest_refs).toEqual([auditManifestId]);
  expect(response.body.next_cursor).toMatch(/^audit-cursor\./);
  await validateContractSchema("audit_investigation_frame", response.body);
});

test("manifest enquiry-pack read preserves provenance and externalization posture", async () => {
  const { repository } = await persistedEnquiryPackRepositoryFixture();
  const response = await getManifestEnquiryPackEndpoint(
    {
      actorContext: auditActorContext(),
      correlationId: "corr.enquiry.integration",
      method: "GET",
      path: `/v1/manifests/${encodeURIComponent(
        auditManifestId,
      )}/enquiry-pack?target_ref=${encodeURIComponent(auditTargetRef)}`,
    },
    {
      enquiryPackRepository: repository,
    },
  );

  expect(response.status).toBe(200);
  if (response.status !== 200) {
    throw new Error(response.body.problem_code);
  }
  expect(response.headers["Cache-Control"]).toBe("no-store");
  expect(response.body.primary_path_ref).toBe("path://pc0166/primary");
  expect(response.body.critical_path_refs).toContain(response.body.primary_path_ref);
  expect(response.body.externalization_governance_contract.boundary_scope).toBe("ENQUIRY_PACK");
  await validateContractSchema("enquiry_pack", response.body);
});

test("governance audit investigations support staff, masked, and forbidden audiences", async () => {
  const auditEventSource = await auditEventSourceFixture();
  const staff = await getGovernanceAuditInvestigationsEndpoint(
    {
      actorContext: auditActorContext(),
      correlationId: "corr.audit.governance.staff",
      method: "GET",
      path: `/v1/governance/tenants/${encodeURIComponent(
        auditTenantId,
      )}/audit-investigations?query_contract=run_timeline&manifest=${encodeURIComponent(
        auditManifestId,
      )}`,
    },
    {
      auditEventSource,
    },
  );
  expect(staff.status).toBe(200);
  if (staff.status !== 200) {
    throw new Error(staff.body.problem_code);
  }
  expect(staff.body.query_contract_code).toBe("RUN_TIMELINE");
  expect(staff.body.supporting_trace_span_refs.length).toBeGreaterThan(0);

  const masked = await getGovernanceAuditInvestigationsEndpoint(
    {
      actorContext: auditActorContext(),
      correlationId: "corr.audit.governance.masked",
      method: "GET",
      path: `/v1/governance/tenants/${encodeURIComponent(
        auditTenantId,
      )}/audit-investigations?manifest=${encodeURIComponent(auditManifestId)}`,
      principalClass: "STAFF_MASKED_AUDITOR",
    },
    {
      auditEventSource,
    },
  );
  expect(masked.status).toBe(200);
  if (masked.status !== 200) {
    throw new Error(masked.body.problem_code);
  }
  expect(masked.body.export_posture.state).toBe("MASKED_ONLY");
  expect(masked.body.supporting_log_record_refs).toEqual([]);
  expect(masked.body.supporting_trace_span_refs).toEqual([]);

  const forbidden = await getGovernanceAuditInvestigationsEndpoint(
    {
      actorContext: auditActorContext({
        client_id_or_null: "client.audit.pc0166",
        principal_ref: "principal://client/audit-forbidden",
      }),
      correlationId: "corr.audit.governance.forbidden",
      method: "GET",
      path: `/v1/governance/tenants/${encodeURIComponent(auditTenantId)}/audit-investigations`,
      principalClass: "CUSTOMER_PORTAL",
    },
    {
      auditEventSource,
    },
  );
  expect(forbidden.status).toBe(404);
  expect(forbidden.body.artifact_type).toBe("ProblemEnvelope");
  expect(forbidden.body.reason_codes).toContain("AUDIT_READ_CUSTOMER_SESSION_BLOCKED");
  await validateContractSchema("problem_envelope", forbidden.body);
});
