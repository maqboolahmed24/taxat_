import { expect, test } from "@playwright/test";

import {
  loadGovernanceAuditInvestigationFrame,
  loadManifestAuditInvestigationFrame,
  mapAuditQueryFiltersAndCursor,
  validateEnquiryExternalizationGovernance,
} from "../../../packages/backend-northbound/src/index.ts";
import {
  auditEventSourceFixture,
  auditManifestId,
  auditTargetRef,
  auditTenantId,
  enquiryPackFixture,
  validateContractSchema,
} from "./audit_and_enquiry_fixtures.ts";

test("canonical audit query mapper freezes route query contract and cursor hash", () => {
  const mapped = mapAuditQueryFiltersAndCursor({
    forcedManifestRef: auditManifestId,
    path: `/v1/manifests/${encodeURIComponent(
      auditManifestId,
    )}/audit-trail?event_family=WORKFLOW&object=${encodeURIComponent(auditTargetRef)}&limit=2`,
    queryAnchorRef: auditManifestId,
    routeFamily: "MANIFEST_AUDIT_TRAIL",
  });

  expect(mapped.queryContractCode).toBe("AUDIT_TRAIL");
  expect(mapped.orderingBasis).toBe("AUDIT_STREAM_SEQUENCE");
  expect(mapped.activeFilters.manifest_refs).toEqual([auditManifestId]);
  expect(mapped.activeFilters.event_families).toEqual(["WORKFLOW"]);
  expect(mapped.activeFilters.object_refs).toEqual([auditTargetRef]);

  expect(() =>
    mapAuditQueryFiltersAndCursor({
      forcedManifestRef: auditManifestId,
      path: `/v1/manifests/${encodeURIComponent(
        auditManifestId,
      )}/audit-trail?event_family=WORKFLOW,,SECURITY`,
      queryAnchorRef: auditManifestId,
      routeFamily: "MANIFEST_AUDIT_TRAIL",
    }),
  ).toThrow(/AUDIT_FILTER_TOKEN_INVALID/);
});

test("audit investigation frames validate schema and keep logs secondary to ordered evidence", async () => {
  const auditEventSource = await auditEventSourceFixture();
  const loaded = await loadManifestAuditInvestigationFrame({
    auditEventSource,
    exportPosture: {
      reason_codes: [],
      state: "FULL_ALLOWED",
    },
    includeStaffOnlySupportingRefs: true,
    manifestId: auditManifestId,
    path: `/v1/manifests/${encodeURIComponent(auditManifestId)}/audit-trail?limit=2`,
  });
  expect(loaded).not.toBeNull();
  if (loaded === null) {
    throw new Error("expected audit frame");
  }

  expect(loaded.frame.query_contract_code).toBe("AUDIT_TRAIL");
  expect(loaded.frame.ordering_basis).toBe("AUDIT_STREAM_SEQUENCE");
  expect(loaded.frame.ordered_event_refs).toHaveLength(2);
  expect(loaded.frame.supporting_log_record_refs.length).toBeLessThanOrEqual(
    loaded.frame.ordered_event_refs.length,
  );
  expect(loaded.frame.next_cursor).toMatch(/^audit-cursor\./);
  await validateContractSchema("audit_investigation_frame", loaded.frame);
});

test("governance run timeline uses recorded-at ordering and supporting traces", async () => {
  const auditEventSource = await auditEventSourceFixture();
  const loaded = await loadGovernanceAuditInvestigationFrame({
    auditEventSource,
    exportPosture: {
      reason_codes: [],
      state: "FULL_ALLOWED",
    },
    includeStaffOnlySupportingRefs: true,
    path: `/v1/governance/tenants/${encodeURIComponent(
      auditTenantId,
    )}/audit-investigations?query_contract=run_timeline&manifest=${encodeURIComponent(
      auditManifestId,
    )}`,
    tenantId: auditTenantId,
  });
  expect(loaded).not.toBeNull();
  if (loaded === null) {
    throw new Error("expected governance audit frame");
  }

  expect(loaded.frame.query_contract_code).toBe("RUN_TIMELINE");
  expect(loaded.frame.ordering_basis).toBe("RECORDED_AT_THEN_STREAM_SEQUENCE");
  expect(loaded.frame.supporting_trace_span_refs.length).toBeGreaterThan(0);
  await validateContractSchema("audit_investigation_frame", loaded.frame);
});

test("enquiry pack validation rejects available packs with material masking posture", () => {
  const pack = enquiryPackFixture();
  expect(validateEnquiryExternalizationGovernance(pack).primary_path_ref).toBe(
    "path://pc0166/primary",
  );

  expect(() =>
    validateEnquiryExternalizationGovernance({
      ...pack,
      masking_posture: "MASKED",
      omission_entries: [
        {
          affected_refs: [pack.primary_path_ref],
          declared_reason_code: "MASKED_FOR_LIMITED_READER",
          omission_class: "MASKING",
          omission_id: "omission.masked.available",
        },
      ],
    }),
  ).toThrow(/AVAILABLE enquiry packs cannot carry material masking/);
});
