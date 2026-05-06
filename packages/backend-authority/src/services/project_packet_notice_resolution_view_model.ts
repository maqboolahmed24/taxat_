import {
  filingNoticeResolutionRef,
  type FilingNoticeResolutionRecord,
} from "../models/filing_notice_resolution.ts";
import {
  compareFilingNoticeSteps,
  filingNoticeStepRef,
  type FilingNoticeStepCode,
  type FilingNoticeStepRecord,
} from "../models/filing_notice_step.ts";
import type { FilingPacketRecord } from "../models/filing_packet.ts";

export type PacketNoticeViewStatus = "PENDING" | "SATISFIED" | "BLOCKED";

export type PacketNoticeResolutionViewModel = {
  approval_submit_blocked: boolean;
  notice_resolution_ref: string | null;
  notice_step_refs: string[];
  packet_id: string;
  requirements: {
    acknowledgement_required: boolean;
    detail: string;
    notice_step_ref: string;
    status: PacketNoticeViewStatus;
    step_code: FilingNoticeStepCode;
    test_ids: {
      acknowledge: "packet-notice-acknowledge";
      card: "packet-notice-card";
      detail_toggle: "packet-notice-detail-toggle";
      title: "packet-notice-title";
    };
    title: string;
  }[];
  resolution_summary: string;
  state: "NO_NOTICES" | "PENDING" | "SATISFIED" | "BLOCKED" | "STALE";
  stale_protection_state: "CURRENT" | "STALE" | "SUPERSEDED";
  test_ids: {
    blocked: "packet-notice-blocked";
    promotion_block_notice: "packet-promotion-block-notice";
    resolution_summary: "packet-notice-resolution-summary";
    satisfied: "packet-notice-satisfied";
    stack: "packet-notice-stack";
  };
};

export type ProjectPacketNoticeResolutionViewModelInput = {
  packet: FilingPacketRecord;
  resolution?: FilingNoticeResolutionRecord | null;
  stale_protection_state?: "CURRENT" | "STALE" | "SUPERSEDED";
  steps?: readonly FilingNoticeStepRecord[];
};

const TITLE_BY_STEP_CODE: Record<FilingNoticeStepCode, string> = {
  DECLARED_BASIS_ACK_REQUIRED: "Declaration basis acknowledgement",
  DISCLAIMER_ACK_REQUIRED: "Required declaration notices",
  PACKET_APPROVAL_REQUIRED: "Packet approval",
};

const DETAIL_BY_STEP_CODE: Record<FilingNoticeStepCode, string> = {
  DECLARED_BASIS_ACK_REQUIRED:
    "The declaration basis must be explicitly acknowledged for this exact filing packet.",
  DISCLAIMER_ACK_REQUIRED:
    "The packet includes legal notices that must be acknowledged before sign-off can continue.",
  PACKET_APPROVAL_REQUIRED:
    "Packet-local approval must be satisfied before the filing packet can be promoted.",
};

function statusForStep(step: FilingNoticeStepRecord): PacketNoticeViewStatus {
  if (step.lifecycle_state === "SATISFIED") {
    return "SATISFIED";
  }
  if (step.lifecycle_state === "UNSATISFIABLE") {
    return "BLOCKED";
  }
  return "PENDING";
}

export function projectPacketNoticeResolutionViewModel(
  input: ProjectPacketNoticeResolutionViewModelInput,
): PacketNoticeResolutionViewModel {
  const staleProtectionState = input.stale_protection_state ?? "CURRENT";
  const orderedSteps = [...(input.steps ?? [])].sort(compareFilingNoticeSteps);
  const stale = staleProtectionState !== "CURRENT" || ["VOID", "SUPERSEDED"].includes(input.packet.lifecycle_state);
  const noNotices = orderedSteps.length === 0;
  const resolutionSatisfied = input.resolution?.notice_requirements_satisfied ?? false;
  const hasBlockedStep = orderedSteps.some((step) => step.lifecycle_state === "UNSATISFIABLE");
  const hasPendingStep = orderedSteps.some((step) => step.lifecycle_state === "PENDING");
  const state = stale
    ? "STALE"
    : noNotices
      ? "NO_NOTICES"
      : hasBlockedStep || input.resolution?.notice_requirements_satisfied === false
        ? "BLOCKED"
        : resolutionSatisfied && !hasPendingStep
          ? "SATISFIED"
          : "PENDING";

  return {
    approval_submit_blocked: state !== "NO_NOTICES" && state !== "SATISFIED",
    notice_resolution_ref: input.resolution ? filingNoticeResolutionRef(input.resolution) : null,
    notice_step_refs:
      input.resolution?.notice_step_refs ?? orderedSteps.map((step) => filingNoticeStepRef(step)),
    packet_id: input.packet.packet_id,
    requirements: orderedSteps.map((step) => ({
      acknowledgement_required: step.lifecycle_state === "PENDING",
      detail: DETAIL_BY_STEP_CODE[step.step_code],
      notice_step_ref: filingNoticeStepRef(step),
      status: statusForStep(step),
      step_code: step.step_code,
      test_ids: {
        acknowledge: "packet-notice-acknowledge",
        card: "packet-notice-card",
        detail_toggle: "packet-notice-detail-toggle",
        title: "packet-notice-title",
      },
      title: TITLE_BY_STEP_CODE[step.step_code],
    })),
    resolution_summary:
      state === "NO_NOTICES"
        ? "No packet-local review requirements for this filing packet."
        : state === "SATISFIED"
          ? "All packet-local review requirements are satisfied."
          : state === "STALE"
            ? "This packet has changed. Review requirements are read-only until refreshed."
            : state === "BLOCKED"
              ? "This packet cannot be signed until blocked review requirements are resolved."
              : "Packet-local review requirements are waiting for acknowledgement.",
    stale_protection_state: staleProtectionState,
    state,
    test_ids: {
      blocked: "packet-notice-blocked",
      promotion_block_notice: "packet-promotion-block-notice",
      resolution_summary: "packet-notice-resolution-summary",
      satisfied: "packet-notice-satisfied",
      stack: "packet-notice-stack",
    },
  };
}
