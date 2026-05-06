import { expect, test } from "@playwright/test";

import {
  AuthorityModelError,
  buildFilingNoticeStepRecord,
  buildFilingPacketRecord,
  derivePacketNoticeSteps,
  filingNoticeStepRef,
  validatePacketNoticeStep,
} from "../../../packages/backend-authority/src/index.ts";

const at = "2026-04-29T14:00:00Z";

function preparedPacket() {
  return buildFilingPacketRecord({
    approval_state: "REQUIRED_PENDING",
    controlling_proof_bundle_ref: "proof-bundle://0143",
    created_at: at,
    declared_basis: "FINAL_DECLARATION",
    declared_basis_ack_state: "REQUIRED_PENDING",
    disclaimers: ["FINAL_DECLARATION_LEGAL_TEXT"],
    lifecycle_state: "PREPARED",
    manifest_binding_hash: "hash.manifest.0143",
    manifest_id: "manifest-0143",
    packet_id: "packet-0143",
    payload_hash: "hash.payload.0143",
    payload_ref: "payload://0143",
    proof_closure_state: "CLOSED",
    state_changed_at: at,
  });
}

test("notice step lifecycle requires resolved_at only after terminal step outcome", () => {
  expect(() =>
    buildFilingNoticeStepRecord({
      created_at: at,
      lifecycle_state: "PENDING",
      manifest_id: "manifest-0143",
      packet_id: "packet-0143",
      reason_codes: ["DECLARATION_BASIS_ACK_REQUIRED"],
      resolved_at: at,
      scope_refs: ["year_end"],
      step_code: "DECLARED_BASIS_ACK_REQUIRED",
    }),
  ).toThrow(AuthorityModelError);

  expect(() =>
    buildFilingNoticeStepRecord({
      created_at: at,
      lifecycle_state: "SATISFIED",
      manifest_id: "manifest-0143",
      packet_id: "packet-0143",
      reason_codes: ["DECLARATION_BASIS_ACK_REQUIRED"],
      scope_refs: ["year_end"],
      step_code: "DECLARED_BASIS_ACK_REQUIRED",
    }),
  ).toThrow(AuthorityModelError);

  const satisfied = buildFilingNoticeStepRecord({
    created_at: at,
    lifecycle_state: "SATISFIED",
    manifest_id: "manifest-0143",
    packet_id: "packet-0143",
    reason_codes: ["DECLARATION_BASIS_ACK_REQUIRED"],
    resolved_at: "2026-04-29T14:01:00Z",
    scope_refs: ["year_end"],
    step_code: "DECLARED_BASIS_ACK_REQUIRED",
  });
  expect(filingNoticeStepRef(satisfied)).toContain("filing-notice-step://");
});

test("derives canonical packet-local steps in stable order after packet build", async () => {
  const packet = preparedPacket();
  const derived = await derivePacketNoticeSteps({
    actor_ref: "client-signatory://0143",
    created_at: at,
    packet,
    required_approval_refs: ["approval://partner-review"],
    runtime_scope: ["year_end", "prepare_submission"],
  });

  expect(derived.steps.map((step) => step.step_code)).toEqual([
    "DECLARED_BASIS_ACK_REQUIRED",
    "DISCLAIMER_ACK_REQUIRED",
    "PACKET_APPROVAL_REQUIRED",
  ]);
  expect(derived.notice_step_refs).toEqual(derived.steps.map((step) => filingNoticeStepRef(step)));
  for (const step of derived.steps) {
    expect(step.packet_refs).toEqual(expect.arrayContaining([packet.packet_id]));
    expect(validatePacketNoticeStep({ packet, step }).notice_step_ref).toBe(
      filingNoticeStepRef(step),
    );
  }
});

test("does not mint packet-local notice steps before a PREPARED packet exists", async () => {
  const draft = buildFilingPacketRecord({
    created_at: at,
    lifecycle_state: "DRAFT",
    manifest_binding_hash: "hash.manifest.0143",
    manifest_id: "manifest-0143",
    packet_id: "packet-draft-0143",
    payload_hash: "hash.payload.0143.draft",
    payload_ref: "payload://0143/draft",
    state_changed_at: at,
  });

  await expect(
    derivePacketNoticeSteps({
      actor_ref: "client-signatory://0143",
      created_at: at,
      packet: draft,
      runtime_scope: ["year_end"],
    }),
  ).rejects.toThrow(/PREPARED packet/);
});
