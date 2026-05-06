import { expect, test } from "@playwright/test";

import {
  buildWorkflowItem,
  deriveWorkflowRoutingContractHash,
  normalizeWorkflowItem,
  WorkflowModelError,
} from "../../../packages/backend-workflow/src/index.ts";

function baseItem(overrides: Partial<Parameters<typeof buildWorkflowItem>[0]> = {}) {
  return buildWorkflowItem({
    client_id: "client-0145",
    dedupe_key: "client-0145:2026-q1:missing-vat-return",
    item_id: "workflow-item-0145",
    opened_at: "2026-04-29T09:00:00Z",
    period: "2026-Q1",
    routing_queue_ref: "queue://tax-ops/filings",
    tenant_id: "tenant-0145",
    title: "Missing VAT return evidence",
    type: "MISSING_VAT_RETURN_EVIDENCE",
    ...overrides,
  });
}

test("builds an internal-only open workflow item with durable truth boundary contracts", () => {
  const item = baseItem();

  expect(item.artifact_type).toBe("WorkflowItem");
  expect(item.customer_status_projection).toBeNull();
  expect(item.customer_workspace_version).toBe(0);
  expect(item.truth_boundary_contract.authoritative_record_families).toEqual([
    "RUN_MANIFEST",
    "WORKFLOW_ITEM",
    "AUDIT_EVENT",
  ]);
  expect(item.authority_truth_contract.truth_surface_role).toBe("INTERNAL_WORKFLOW_COORDINATION");
  expect(item.routing_contract.routing_scope).toBe("WORKFLOW_ITEM");
  expect(item.routing_contract.basis_hash).toBe(deriveWorkflowRoutingContractHash(item.routing_contract));
});

test("enforces WAITING_ON_CLIENT customer request posture", () => {
  const item = baseItem({
    active_request_info_ref: "request-info://workflow-item-0145/1",
    collaboration_visibility: "CUSTOMER_SHARED",
    customer_due_at: "2026-04-30T09:00:00Z",
    lifecycle_state: "WAITING_ON_CLIENT",
  });

  expect(item.waiting_on_actor).toBe("CUSTOMER");
  expect(item.customer_status_projection).toBe("ACTION_REQUIRED");
  expect(item.active_request_info_ref).toBe("request-info://workflow-item-0145/1");

  expect(() =>
    baseItem({
      active_request_info_ref: null,
      collaboration_visibility: "CUSTOMER_SHARED",
      lifecycle_state: "WAITING_ON_CLIENT",
    }),
  ).toThrow(WorkflowModelError);
});

test("keeps customer projections derived and customer-safe", () => {
  expect(() =>
    baseItem({
      collaboration_visibility: "INTERNAL_ONLY",
      customer_status_projection: "UNDER_REVIEW",
    }),
  ).toThrow(WorkflowModelError);

  expect(() =>
    baseItem({
      collaboration_visibility: "CUSTOMER_SHARED",
      customer_status_projection: "Blocked by internal gate" as never,
    }),
  ).toThrow(WorkflowModelError);
});

test("WAITING_ON_AUTHORITY requires explicit unresolved authority waiting truth", () => {
  const item = baseItem({
    authority_truth_state: "PENDING_ACK",
    collaboration_visibility: "CUSTOMER_SHARED",
    lifecycle_state: "WAITING_ON_AUTHORITY",
  });

  expect(item.waiting_on_actor).toBe("AUTHORITY");
  expect(item.customer_status_projection).toBe("WAITING_ON_CONFIRMATION");

  expect(() =>
    baseItem({
      authority_truth_state: "OUT_OF_BAND",
      collaboration_visibility: "CUSTOMER_SHARED",
      lifecycle_state: "WAITING_ON_AUTHORITY",
    }),
  ).toThrow(WorkflowModelError);
});

test("unresolved authority truth blocks DONE and customer RESOLVED semantics", () => {
  expect(() =>
    baseItem({
      authority_truth_state: "UNKNOWN",
      closed_at: "2026-04-29T10:00:00Z",
      collaboration_visibility: "CUSTOMER_SHARED",
      lifecycle_state: "DONE",
    }),
  ).toThrow(WorkflowModelError);

  const done = baseItem({
    authority_truth_state: "CONFIRMED",
    closed_at: "2026-04-29T10:00:00Z",
    collaboration_visibility: "CUSTOMER_SHARED",
    lifecycle_state: "DONE",
  });
  expect(done.customer_status_projection).toBe("RESOLVED");
  expect(done.waiting_on_actor).toBe("NONE");
});

test("fails closed on stale customer version and routing drift", () => {
  expect(() =>
    baseItem({
      collaboration_visibility: "INTERNAL_ONLY",
      customer_workspace_version: 1,
    }),
  ).toThrow(WorkflowModelError);

  const item = baseItem();
  expect(() =>
    normalizeWorkflowItem({
      ...item,
      routing_contract: {
        ...item.routing_contract,
        assignment_efficiency_score: item.routing_contract.assignment_efficiency_score + 1,
      },
    }),
  ).toThrow(WorkflowModelError);
});
