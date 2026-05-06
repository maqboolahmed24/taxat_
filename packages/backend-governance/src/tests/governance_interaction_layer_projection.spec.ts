import { expect, test } from "@playwright/test";

import { validateContractSchema } from "../../../../tests/unit/backend_northbound/audit_and_enquiry_fixtures.ts";
import {
  buildGovernanceInteractionLayer,
  deriveGovernanceFilterChipEcho,
  deriveGovernanceSupportSurfacePresentation,
} from "../index.ts";

test("projects schema-valid shared governance constants and canonical chip order", async () => {
  const layer = buildGovernanceInteractionLayer({
    activeFilters: {
      authority_operation_refs: ["authority-op.pc0195"],
      actor_refs: ["principal://staff/auditor"],
      client_refs: ["client.pc0195"],
      event_families: ["AuthorityInteraction"],
      manifest_refs: ["manifest.pc0195"],
      object_refs: ["object://pc0195/vat"],
      window_from: "2026-05-04T09:00:00.000Z",
      window_to: "2026-05-04T10:00:00.000Z",
    },
    routeFamily: "audit_investigation",
  });

  expect(layer).toMatchObject({
    auxiliary_surface_presentation: "SIDECAR",
    compaction_mode: "WIDE",
    density_profile: "GOVERNANCE_DENSITY_PROFILE_V1",
    diff_basket_policy: "STAGED_DIFF_AND_BASKET_RETAIN_CONTEXT",
    export_binding_policy: "ACTIVE_FILTERED_SLICE_GOVERNS_EXPORT",
    feedback_truth_policy: "DURABLE_RECEIPT_AND_TYPED_FAILURE_DRIVEN",
    focus_trap_mode: "NON_MODAL",
    inventory_filter_grammar: "CANONICAL_ROUTE_FILTER_GRAMMAR",
    keyboard_focus_policy: "RETURN_FOCUS_ANCHOR_OR_ROVING_SELECTION",
    motion_profile: "SUBTLE_CAUSAL_ONLY",
    selection_persistence_mode: "PRESERVE_WHILE_OBJECT_RESOLVES",
    selector_profile: "GOVERNANCE_SEMANTIC_SELECTORS_V1",
    support_surface_policy: "ONE_PROMOTED_SUPPORT_SURFACE_MAX",
  });
  expect(layer.foundation_contract).toMatchObject({
    responsive_compaction_token: "GOVERNANCE_AUXILIARY_REDOCK_V1",
    selector_profile: "GOVERNANCE_SEMANTIC_SELECTORS_V1",
    shell_family: "GOVERNANCE_DENSITY_SHELL",
  });
  expect(layer.selected_filter_chip_refs).toEqual([
    "actor:principal://staff/auditor",
    "event_family:AuthorityInteraction",
    "client:client.pc0195",
    "manifest:manifest.pc0195",
    "authority_operation:authority-op.pc0195",
    "object:object://pc0195/vat",
    "window_from:2026-05-04T09:00:00.000Z",
    "window_to:2026-05-04T10:00:00.000Z",
  ]);
  expect(layer.preserved_context_codes).toEqual([
    "ACTIVE_FILTERS",
    "SELECTION",
    "FOCUS_ANCHOR",
    "PROMOTED_SUPPORT_SURFACE",
    "QUERY_SLICE",
  ]);

  await validateContractSchema("governance_interaction_layer", layer);
});

test("serializes route filter chips in validator dimension order", () => {
  expect(
    deriveGovernanceFilterChipEcho({
      activeFilters: {
        binding_health_states: ["TOKEN_EXPIRED"],
        authority_scopes: ["VAT"],
        client_refs: ["client.pc0195"],
        expiry_risk_bands: ["EXPIRES_7_DAYS"],
        lifecycle_states: ["AUTHORISED_LIMITED"],
        provider_environments: ["sandbox"],
      },
      routeFamily: "authority_link_inventory",
    }),
  ).toEqual([
    "authority_scope:VAT",
    "client:client.pc0195",
    "provider_environment:sandbox",
    "lifecycle_state:AUTHORISED_LIMITED",
    "binding_health:TOKEN_EXPIRED",
    "expiry_risk:EXPIRES_7_DAYS",
  ]);

  expect(
    deriveGovernanceFilterChipEcho({
      activeFilters: {
        artifact_classes: ["CLIENT_SOURCE_RECORD"],
        client_refs: ["client.pc0195"],
        erasure_readiness_states: ["BLOCKED"],
        legal_hold_states: ["ACTIVE"],
        release_eligibility_states: ["NOT_ELIGIBLE"],
        retention_classes: ["regulated_record"],
      },
      routeFamily: "retention_governance",
    }),
  ).toEqual([
    "artifact_class:CLIENT_SOURCE_RECORD",
    "retention_class:regulated_record",
    "client:client.pc0195",
    "legal_hold_state:ACTIVE",
    "release_eligibility:NOT_ELIGIBLE",
    "erasure_readiness:BLOCKED",
  ]);

  expect(
    deriveGovernanceFilterChipEcho({
      activeFilters: {
        change_states: ["OPEN"],
        client_refs: ["client.pc0195"],
        environment_ref: "production",
        principal_classes: ["STAFF_FULL"],
        risk_families: ["AUTHORITY_LINK_RISK"],
      },
      routeFamily: "tenant_governance_snapshot",
    }),
  ).toEqual([
    "environment:production",
    "client:client.pc0195",
    "principal_class:STAFF_FULL",
    "risk_family:AUTHORITY_LINK_RISK",
    "change_state:OPEN",
  ]);
});

test("keeps support-surface promotion exclusive", () => {
  expect(
    deriveGovernanceSupportSurfacePresentation({
      candidates: [
        {
          priority: 20,
          surface: "AUDIT_SIDECAR",
        },
        {
          priority: 80,
          surface: "EXPORT_ELIGIBILITY_PANEL",
        },
      ],
    }),
  ).toBe("EXPORT_ELIGIBILITY_PANEL");

  expect(() =>
    deriveGovernanceSupportSurfacePresentation({
      candidates: [
        {
          priority: 50,
          promoted: true,
          surface: "BLAST_RADIUS_PANEL",
        },
        {
          priority: 60,
          promoted: true,
          surface: "EXPORT_ELIGIBILITY_PANEL",
        },
      ],
    }),
  ).toThrow(/GOVERNANCE_SUPPORT_SURFACE_CONFLICT/);
});

