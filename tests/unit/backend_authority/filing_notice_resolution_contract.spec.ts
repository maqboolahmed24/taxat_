import { expect, test } from "@playwright/test";

import {
  AuthorityModelError,
  buildFilingNoticeResolutionRecord,
  buildFilingNoticeStepRecord,
  buildFilingPacketRecord,
  filingNoticeStepRef,
  resolveFilingNotices,
  validateFilingNoticeResolution,
} from "../../../packages/backend-authority/src/index.ts";

const at = "2026-04-29T14:10:00Z";

function packet() {
  return buildFilingPacketRecord({
    approval_state: "REQUIRED_PENDING",
    controlling_proof_bundle_ref: "proof-bundle://0143-resolution",
    created_at: at,
    declared_basis: "FINAL_DECLARATION",
    declared_basis_ack_state: "NOT_APPLICABLE",
    lifecycle_state: "PREPARED",
    manifest_binding_hash: "hash.manifest.0143.resolution",
    manifest_id: "manifest-0143-resolution",
    packet_id: "packet-0143-resolution",
    payload_hash: "hash.payload.0143.resolution",
    payload_ref: "payload://0143/resolution",
    proof_closure_state: "CLOSED",
    state_changed_at: at,
  });
}

function approvalStep() {
  return buildFilingNoticeStepRecord({
    created_at: at,
    manifest_id: "manifest-0143-resolution",
    packet_id: "packet-0143-resolution",
    packet_refs: ["packet-0143-resolution", "filing-packet://packet-0143-resolution"],
    reason_codes: ["PACKET_APPROVAL_REQUIRED"],
    scope_refs: ["client-signatory://0143", "year_end"],
    step_code: "PACKET_APPROVAL_REQUIRED",
  });
}

test("satisfied resolution can keep declaration basis acknowledgement NOT_APPLICABLE", async () => {
  const filingPacket = packet();
  const step = approvalStep();
  const resolved = await resolveFilingNotices({
    acknowledged_step_codes: ["PACKET_APPROVAL_REQUIRED"],
    packet: filingPacket,
    resolved_at: "2026-04-29T14:11:00Z",
    steps: [step],
  });

  expect(resolved.resolution.notice_requirements_satisfied).toBe(true);
  expect(resolved.resolution.approval_state).toBe("SATISFIED");
  expect(resolved.resolution.declared_basis_ack_state).toBe("NOT_APPLICABLE");
  expect(resolved.resolution.unresolved_reason_codes).toEqual([]);
  expect(
    validateFilingNoticeResolution({
      packet: filingPacket,
      resolution: resolved.resolution,
      steps: resolved.steps,
    }).notice_resolution_ref,
  ).toContain("filing-notice-resolution://");
});

test("unsatisfied resolution requires unresolved component posture and reason codes", () => {
  const ref = filingNoticeStepRef(approvalStep());
  expect(() =>
    buildFilingNoticeResolutionRecord({
      approval_state: "REQUIRED_PENDING",
      declared_basis_ack_state: "NOT_APPLICABLE",
      manifest_id: "manifest-0143-resolution",
      notice_requirements_satisfied: false,
      notice_step_refs: [ref],
      packet_id: "packet-0143-resolution",
      resolved_at: at,
    }),
  ).toThrow(AuthorityModelError);

  expect(() =>
    buildFilingNoticeResolutionRecord({
      approval_state: "SATISFIED",
      declared_basis_ack_state: "SATISFIED",
      manifest_id: "manifest-0143-resolution",
      notice_requirements_satisfied: false,
      notice_step_refs: [ref],
      packet_id: "packet-0143-resolution",
      resolved_at: at,
      unresolved_reason_codes: ["PACKET_APPROVAL_REQUIRED_UNRESOLVED"],
    }),
  ).toThrow(AuthorityModelError);
});

test("notice_refs must mirror ordered notice_step_refs exactly", () => {
  const ref = filingNoticeStepRef(approvalStep());
  expect(() =>
    buildFilingNoticeResolutionRecord({
      approval_state: "SATISFIED",
      declared_basis_ack_state: "NOT_APPLICABLE",
      manifest_id: "manifest-0143-resolution",
      notice_refs: [`${ref}-drift`],
      notice_requirements_satisfied: true,
      notice_step_refs: [ref],
      packet_id: "packet-0143-resolution",
      resolved_at: at,
      unresolved_reason_codes: [],
    }),
  ).toThrow(/notice_refs/);
});
