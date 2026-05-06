import { expect, test } from "@playwright/test";

import {
  buildEnquiryPackRecord,
  validateEnquiryPack,
} from "../../../packages/backend-provenance/src/index.ts";

const partition_contract = {
  client_id: "client-0130",
  contract_version: "PROVENANCE_PARTITION_V1" as const,
  cross_manifest_traversal_policy: "EXPLICIT_BOUNDARY_EDGES_ONLY" as const,
  partition_scope_refs: ["vat"],
  period_scope_ref_or_null: "2026-Q1",
  scope_widening_policy: "NO_TENANT_CLIENT_OR_SCOPE_WIDENING" as const,
  tenant_id: "tenant-0130",
};

test("builds an available enquiry pack with primary path first in critical refs", () => {
  const pack = buildEnquiryPackRecord({
    critical_path_refs: ["path-secondary", "path-primary"],
    generated_at: "2026-04-28T14:00:00Z",
    graph_ref: "evidence-graph://graph-0130",
    manifest_id: "manifest-0130",
    partition_contract,
    primary_path_ref: "path-primary",
    proof_bundle_ref: "proof-bundle://proof-0130",
    target_ref: "target://vat-box-1",
  });

  expect(pack.critical_path_refs).toEqual(["path-primary", "path-secondary"]);
  expect(pack.masking_posture).toBe("NONE");
  expect(pack.omission_entries).toEqual([]);
  expect(pack.render_contract).toMatchObject({
    filing_artifact_ref: expect.any(String),
    operator_render_ref: expect.any(String),
    reviewer_render_ref: expect.any(String),
  });
  expect(validateEnquiryPack({ pack }).valid).toBe(true);
});

test("fails closed when primary path is not one of the critical paths", () => {
  expect(() =>
    buildEnquiryPackRecord({
      critical_path_refs: ["path-secondary"],
      generated_at: "2026-04-28T14:00:00Z",
      graph_ref: "evidence-graph://graph-0130",
      manifest_id: "manifest-0130",
      partition_contract,
      primary_path_ref: "path-primary",
      proof_bundle_ref: "proof-bundle://proof-0130",
      target_ref: "target://vat-box-1",
    }),
  ).toThrow(/primary_path_ref must appear in critical_path_refs/);
});

test("keeps failed explanation explicit and auditable", () => {
  const pack = buildEnquiryPackRecord({
    critical_path_refs: ["path-primary"],
    explanation_status: "FAILED",
    generated_at: "2026-04-28T14:00:00Z",
    graph_ref: "evidence-graph://graph-0130",
    limitation_notes: [
      {
        affected_refs: ["path-primary"],
        limitation_code: "RENDER_FAILED_EXPLANATION_MATERIAL_UNAVAILABLE",
        note_class: "MISSING_SUPPORT",
        note_id: "limitation.render-failed",
      },
    ],
    manifest_id: "manifest-0130",
    masking_posture: "REDACTED",
    omission_entries: [
      {
        affected_refs: ["path-primary"],
        declared_reason_code: "RENDER_FAILED_EXPLANATION_MATERIAL_UNAVAILABLE",
        omission_class: "EXTERNAL_LIMITATION",
        omission_id: "omission.render-failed",
      },
    ],
    partition_contract,
    primary_path_ref: "path-primary",
    proof_bundle_ref: "proof-bundle://proof-0130",
    target_ref: "target://vat-box-1",
  });

  expect(pack.render_contract).toEqual({
    filing_artifact_ref: null,
    operator_render_ref: null,
    reviewer_render_ref: null,
  });
  expect(pack.explanation_status).toBe("FAILED");
  expect(validateEnquiryPack({ pack }).valid).toBe(true);
});
