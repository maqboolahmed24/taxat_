import { expect, test } from "@playwright/test";

import {
  buildDefensibleProofClosureContract,
  buildProofBundleRecord,
  transitionProofBundle,
} from "../../../packages/backend-provenance/src/index.ts";

const partition_contract = {
  client_id: "client-0129",
  contract_version: "PROVENANCE_PARTITION_V1" as const,
  cross_manifest_traversal_policy: "EXPLICIT_BOUNDARY_EDGES_ONLY" as const,
  partition_scope_refs: ["vat"],
  period_scope_ref_or_null: "2026-Q1",
  scope_widening_policy: "NO_TENANT_CLIENT_OR_SCOPE_WIDENING" as const,
  tenant_id: "tenant-0129",
};

test("closes proof only when every closure factor is satisfied", () => {
  const closure = buildDefensibleProofClosureContract({
    authority_closed: true,
    contradiction_isolated: true,
    current_decisive_anchor_present: true,
    replay_closed: true,
    support_closed: true,
  });

  expect(closure.closure_state).toBe("CLOSED");
  expect(closure.proof_closure_contract.closure_failure_reason_codes).toEqual([]);
});

test("keeps unresolved contradictions open with typed closure failure", () => {
  const closure = buildDefensibleProofClosureContract({
    authority_closed: true,
    contradiction_isolated: false,
    current_decisive_anchor_present: true,
    replay_closed: true,
    support_closed: true,
    support_state: "CONTRADICTED",
  });

  expect(closure.closure_state).toBe("OPEN");
  expect(closure.proof_closure_contract.contradiction_isolated).toBe(false);
  expect(closure.proof_closure_contract.closure_failure_reason_codes).toContain(
    "CONTRADICTION_NOT_ISOLATED",
  );
});

test("converts silent limitation ambiguity into explicit unsupported posture", () => {
  const closure = buildDefensibleProofClosureContract({
    authority_closed: true,
    contradiction_isolated: true,
    current_decisive_anchor_present: true,
    replay_closed: true,
    silent_limitation_ambiguity_present: true,
    support_closed: true,
  });

  expect(closure.closure_state).toBe("OPEN");
  expect(closure.proof_closure_contract.silent_limitation_ambiguity_present).toBe(false);
  expect(closure.proof_closure_contract.support_closed).toBe(false);
  expect(closure.proof_closure_contract.closure_failure_reason_codes).toEqual([
    "SILENT_LIMITATION_AMBIGUITY",
    "SUPPORT_OPEN",
  ]);
});

test("marks stale proof historical without dropping replay refs", () => {
  const closed = buildDefensibleProofClosureContract({
    authority_closed: true,
    contradiction_isolated: true,
    current_decisive_anchor_present: true,
    replay_closed: true,
    support_closed: true,
  });
  const bundle = buildProofBundleRecord({
    admissibility_state: "ADMISSIBLE",
    closure_state: "CLOSED",
    decisive_path_refs: ["path-primary"],
    generated_at: "2026-04-28T12:00:00Z",
    graph_ref: "evidence-graph://graph-0129",
    manifest_id: "manifest-0129",
    partition_contract,
    primary_path_ref: "path-primary",
    proof_closure_contract: closed.proof_closure_contract,
    support_state: "SUPPORTED",
    target_ref: "target://vat-box-1",
  });
  const stale = transitionProofBundle(bundle, {
    kind: "MARK_STALE",
    stale_reason_codes: ["LATE_DATA_INVALIDATED_DECISIVE_SUPPORT"],
    staleness_dependency_refs: ["source://late-data"],
    temporal_propagation_event_refs: ["temporal-event://late-data"],
  });

  expect(stale.lifecycle_state).toBe("STALE");
  expect(stale.support_state).toBe("STALE");
  expect(stale.closure_state).toBe("OPEN");
  expect(stale.primary_path_ref).toBe("path-primary");
  expect(stale.staleness_dependency_refs).toContain("temporal-event://late-data");
});
