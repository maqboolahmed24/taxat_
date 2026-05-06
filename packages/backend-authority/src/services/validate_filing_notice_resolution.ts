import { AuthorityModelError } from "../models/authority_common.ts";
import {
  filingNoticeResolutionRef,
  normalizeFilingNoticeResolutionRecord,
  type FilingNoticeResolutionRecord,
} from "../models/filing_notice_resolution.ts";
import {
  compareFilingNoticeSteps,
  filingNoticeStepRef,
  type FilingNoticeStepRecord,
} from "../models/filing_notice_step.ts";
import type { FilingPacketRecord } from "../models/filing_packet.ts";
import { validatePacketNoticeStep } from "./validate_packet_notice_step.ts";

export type ValidateFilingNoticeResolutionInput = {
  packet?: FilingPacketRecord | null;
  resolution: FilingNoticeResolutionRecord;
  steps?: readonly FilingNoticeStepRecord[];
};

export function validateFilingNoticeResolution(input: ValidateFilingNoticeResolutionInput) {
  const resolution = normalizeFilingNoticeResolutionRecord(input.resolution);
  if (input.packet !== undefined && input.packet !== null) {
    if (
      resolution.packet_id !== input.packet.packet_id ||
      resolution.manifest_id !== input.packet.manifest_id
    ) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "filing notice resolution must bind to the owning filing packet manifest and packet_id",
      );
    }
  }
  if (input.steps !== undefined) {
    const orderedSteps = [...input.steps].sort(compareFilingNoticeSteps);
    const stepRefs = orderedSteps.map((step) => filingNoticeStepRef(step));
    if (stepRefs.join("\n") !== resolution.notice_step_refs.join("\n")) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "filing notice resolution notice_step_refs must mirror the ordered step set",
      );
    }
    for (const step of orderedSteps) {
      validatePacketNoticeStep({ packet: input.packet ?? undefined, step });
    }
    if (
      resolution.notice_requirements_satisfied &&
      orderedSteps.some((step) => step.lifecycle_state !== "SATISFIED")
    ) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "satisfied filing notice resolution requires every notice step to be SATISFIED",
      );
    }
    if (
      !resolution.notice_requirements_satisfied &&
      orderedSteps.every((step) => step.lifecycle_state === "SATISFIED")
    ) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "unsatisfied filing notice resolution requires at least one unresolved notice step",
      );
    }
  }
  return {
    notice_resolution_ref: filingNoticeResolutionRef(resolution),
    resolution,
  };
}
