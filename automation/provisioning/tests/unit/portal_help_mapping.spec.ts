import { expect, test } from "@playwright/test";

import {
  createRecommendedPortalHelpToExternalTicketMapping,
  validatePortalHelpMapping,
} from "../../src/providers/support/flows/create_support_workspace_if_selected.js";

test("contextual help mapping preserves route, focus, request-info lineage, and bounded mirror rules", () => {
  const mapping = createRecommendedPortalHelpToExternalTicketMapping();

  validatePortalHelpMapping(mapping);

  const contextual = mapping.mapping_rows.find(
    (row) => row.scenario_ref === "contextual_request_help",
  );

  expect(contextual).toBeDefined();
  expect(contextual?.required_portal_fields).toEqual(
    expect.arrayContaining([
      "help_request_id",
      "reason_family",
      "source_route",
      "source_focus_anchor_ref",
      "request_info_ref",
      "manifest_id",
      "item_id",
      "case_context_refs",
    ]),
  );
  expect(contextual?.field_rows).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        source_field: "request_info_ref",
        external_field_ref_or_null: "ticket.custom.request_info_ref",
        export_policy: "CUSTOM_FIELD",
      }),
      expect.objectContaining({
        source_field: "source_focus_anchor_ref",
        external_field_ref_or_null: "ticket.custom.source_focus_anchor_ref",
        export_policy: "CUSTOM_FIELD",
      }),
      expect.objectContaining({
        source_field: "subject_line",
        external_field_ref_or_null: "ticket.subject",
        export_policy: "TICKET_SUBJECT",
      }),
    ]),
  );
  expect(contextual?.mirror_back_policy).toBe("REFERENCE_AND_STATUS_METADATA_ONLY");
});

test("portal help mapping keeps distinct help scenarios and blocks internal-only leakage", () => {
  const mapping = createRecommendedPortalHelpToExternalTicketMapping();

  const generalHelp = mapping.mapping_rows.find(
    (row) => row.scenario_ref === "general_help_route",
  );
  const acknowledgement = mapping.mapping_rows.find(
    (row) => row.scenario_ref === "support_acknowledgement",
  );

  expect(mapping.mapping_rows).toHaveLength(3);
  expect(generalHelp?.required_portal_fields).toEqual(
    expect.arrayContaining(["case_context_refs", "source_focus_anchor_ref"]),
  );
  expect(acknowledgement?.mirror_back_policy).toBe("NO_EXTERNAL_WRITE");
  expect(acknowledgement?.field_rows).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        source_field: "acknowledgement_summary",
        export_policy: "PUBLIC_COMMENT_SUMMARY",
      }),
      expect.objectContaining({
        source_field: "response_ref",
        export_policy: "INTERNAL_ONLY_FORBIDDEN",
      }),
    ]),
  );

  const prohibitedFields = new Set(
    mapping.mapping_rows.flatMap((row) => row.prohibited_source_fields),
  );
  [
    "body_ref",
    "masked_evidence_refs",
    "internal_note_refs",
    "authority_payload_refs",
    "privileged_audit_refs",
  ].forEach((field) => {
    expect(prohibitedFields.has(field)).toBe(true);
  });

  const forbiddenRows = mapping.mapping_rows.flatMap((row) =>
    row.field_rows.filter((fieldRow) => fieldRow.export_policy === "INTERNAL_ONLY_FORBIDDEN"),
  );
  expect(forbiddenRows.map((row) => row.source_field)).toEqual(
    expect.arrayContaining([
      "body_ref",
      "masked_evidence_refs",
      "internal_note_refs",
      "response_ref",
    ]),
  );
});
