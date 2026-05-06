import { expect, test } from "@playwright/test";

import {
  buildExternalizationGovernance,
  buildMaskingPosture,
  buildOmissionEntries,
  buildRenderContract,
} from "../../../packages/backend-provenance/src/index.ts";

const retentionBinding = {
  limitation_behavior: "LIMITED" as const,
  minimum_available_until: "2026-12-31T00:00:00Z",
  retention_tag_ref: "retention-tag://limited",
};

const limitationNotes = [
  {
    affected_refs: ["path-primary", "proof-bundle://proof-0130"],
    limitation_code: "RETENTION_LIMITED_EXPLANATION_MATERIAL",
    note_class: "RETENTION" as const,
    note_id: "limitation.retention",
  },
];

test("derives limited export masking posture from retention-limited proof material", () => {
  expect(
    buildMaskingPosture({
      explanation_status: "LIMITED",
      limitation_notes: limitationNotes,
      retention_binding: retentionBinding,
    }),
  ).toBe("LIMITED_EXPORT");
});

test("generates typed omission entries bound to critical refs", () => {
  const omissions = buildOmissionEntries({
    critical_path_refs: ["path-primary", "path-rejected"],
    explanation_status: "LIMITED",
    limitation_notes: limitationNotes,
    masking_posture: "LIMITED_EXPORT",
    primary_path_ref: "path-primary",
    proof_bundle_ref: "proof-bundle://proof-0130",
    retention_binding: retentionBinding,
  });

  expect(omissions).toHaveLength(1);
  expect(omissions[0]).toMatchObject({
    declared_reason_code: "RETENTION_LIMITED_EXPLANATION_MATERIAL",
    omission_class: "RETENTION",
  });
  expect(omissions[0]?.affected_refs).toEqual([
    "path-primary",
    "path-rejected",
    "proof-bundle://proof-0130",
  ]);
});

test("builds render and externalization contracts from one persisted posture", () => {
  const render = buildRenderContract({
    enquiry_pack_id: "enquiry-pack-0130",
    explanation_status: "LIMITED",
  });
  const governance = buildExternalizationGovernance({
    explanation_status: "LIMITED",
    human_readable_ref: "render://enquiry-pack/enquiry-pack-0130/human",
    limitation_notes: limitationNotes,
    machine_readable_ref: "render://enquiry-pack/enquiry-pack-0130/machine",
    masking_posture: "LIMITED_EXPORT",
    omission_entries: [
      {
        affected_refs: ["path-primary"],
        declared_reason_code: "RETENTION_LIMITED_EXPLANATION_MATERIAL",
        omission_class: "RETENTION",
        omission_id: "omission.retention",
      },
    ],
    retention_binding: retentionBinding,
    target_ref: "target://vat-box-1",
    tenant_id: "tenant-0130",
  });

  expect(render).toEqual({
    filing_artifact_ref: null,
    operator_render_ref: "render://enquiry-pack/enquiry-pack-0130/operator",
    reviewer_render_ref: null,
  });
  expect(governance).toMatchObject({
    delivery_surface_kind: "EXPLANATION_EXPORT",
    eligibility_state: "LIMITED_READY",
    limitation_state: "RETENTION_LIMITED",
    masking_state: "LIMITED_EXPORT",
    preview_target_ref_or_null: "render://enquiry-pack/enquiry-pack-0130/human",
  });
  expect(governance.blocking_context_tokens).toEqual(["RETENTION"]);
  expect(governance.delivery_binding_hash).toEqual(expect.any(String));
});
