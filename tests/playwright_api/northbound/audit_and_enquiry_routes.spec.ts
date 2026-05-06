import { expect, test } from "@playwright/test";

import {
  getGovernanceAuditInvestigationsRoutePath,
  getManifestAuditTrailRoutePath,
  getManifestEnquiryPackRoutePath,
  registerAuditAndEnquiryRoutes,
} from "../../../packages/backend-northbound/src/index.ts";
import {
  auditActorContext,
  auditEventSourceFixture,
  auditManifestId,
  auditTargetRef,
  auditTenantId,
  persistedEnquiryPackRepositoryFixture,
} from "../../unit/backend_northbound/audit_and_enquiry_fixtures.ts";

test("audit and enquiry route registry exposes three GET read handlers", async () => {
  const auditEventSource = await auditEventSourceFixture();
  const { repository } = await persistedEnquiryPackRepositoryFixture();
  const registered = new Map<string, (request: never) => Promise<unknown>>();
  const handlers = registerAuditAndEnquiryRoutes(
    {
      get: (path, handler) => {
        registered.set(path, handler);
      },
    },
    {
      auditEventSource,
      enquiryPackRepository: repository,
    },
  );

  expect([...registered.keys()]).toEqual([
    getManifestAuditTrailRoutePath,
    getManifestEnquiryPackRoutePath,
    getGovernanceAuditInvestigationsRoutePath,
  ]);
  expect(registered.get(getManifestAuditTrailRoutePath)).toBe(handlers.manifestAuditTrail);
  expect(registered.get(getManifestEnquiryPackRoutePath)).toBe(handlers.manifestEnquiryPack);
  expect(registered.get(getGovernanceAuditInvestigationsRoutePath)).toBe(
    handlers.governanceAuditInvestigations,
  );

  const audit = await handlers.manifestAuditTrail({
    actorContext: auditActorContext(),
    correlationId: "corr.api.audit.route",
    method: "GET",
    path: `/v1/manifests/${encodeURIComponent(auditManifestId)}/audit-trail`,
  });
  const enquiry = await handlers.manifestEnquiryPack({
    actorContext: auditActorContext(),
    correlationId: "corr.api.enquiry.route",
    method: "GET",
    path: `/v1/manifests/${encodeURIComponent(
      auditManifestId,
    )}/enquiry-pack?target_ref=${encodeURIComponent(auditTargetRef)}`,
  });
  const governance = await handlers.governanceAuditInvestigations({
    actorContext: auditActorContext(),
    correlationId: "corr.api.governance.audit.route",
    method: "GET",
    path: `/v1/governance/tenants/${encodeURIComponent(auditTenantId)}/audit-investigations`,
  });

  expect(audit.status).toBe(200);
  expect(enquiry.status).toBe(200);
  expect(governance.status).toBe(200);
  expect(audit.headers["Cache-Control"]).toBe("no-store");
  expect(enquiry.headers["Cache-Control"]).toBe("no-store");
  expect(governance.headers["Cache-Control"]).toBe("no-store");
  expect(audit.body.artifact_type).toBe("AuditInvestigationFrame");
  expect(enquiry.body.enquiry_pack_id).toBeTruthy();
  expect(governance.body.artifact_type).toBe("AuditInvestigationFrame");
});
