import { AuthorityModelError } from "../models/authority_common.ts";
import { type FilingCaseRecord, filingCaseRef } from "../models/filing_case.ts";
import { type FilingPacketRecord, filingPacketRef } from "../models/filing_packet.ts";
import { type ObligationMirrorRecord } from "../models/obligation_mirror.ts";
import { type SubmissionRecord, submissionRecordRef } from "../models/submission_record.ts";

export type ValidateAuthorityDomainRefsInput = {
  filing_case?: FilingCaseRecord | null;
  filing_packet?: FilingPacketRecord | null;
  obligation_mirror?: ObligationMirrorRecord | null;
  submission_record?: SubmissionRecord | null;
};

function assertEqual(label: string, left: string | null, right: string | null) {
  if (left !== right) {
    throw new AuthorityModelError("AUTHORITY_CONTRACT_INVALID", `${label} mismatch: ${left} !== ${right}`);
  }
}

export function validateAuthorityDomainRefs(input: ValidateAuthorityDomainRefsInput) {
  const filingCase = input.filing_case ?? null;
  const packet = input.filing_packet ?? null;
  const mirror = input.obligation_mirror ?? null;
  const submission = input.submission_record ?? null;

  if (filingCase && packet) {
    assertEqual("filing case current_packet_ref", filingCase.current_packet_ref, filingPacketRef(packet));
    if (filingCase.packet_state !== packet.lifecycle_state) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "filing case packet_state must mirror filing packet lifecycle_state",
      );
    }
    assertEqual("packet manifest binding", filingCase.current_manifest_ref, packet.manifest_id);
  }
  if (filingCase && mirror) {
    if (mirror.ready_manifest_ref !== null) {
      assertEqual("obligation mirror ready manifest", mirror.ready_manifest_ref, filingCase.current_manifest_ref);
    }
    if (mirror.current_submission_ref !== null) {
      assertEqual("pending submission lineage", mirror.current_submission_ref, filingCase.current_submission_ref);
    }
    if (mirror.last_confirmed_submission_ref !== null && filingCase.current_submission_ref !== null) {
      assertEqual(
        "confirmed submission lineage",
        mirror.last_confirmed_submission_ref,
        filingCase.current_submission_ref,
      );
    }
  }
  if (filingCase && submission) {
    assertEqual("filing case current_submission_ref", filingCase.current_submission_ref, submissionRecordRef(submission));
  }
  if (mirror && submission) {
    if (mirror.current_submission_ref !== null) {
      assertEqual("obligation mirror current_submission_ref", mirror.current_submission_ref, submissionRecordRef(submission));
    }
    if (mirror.last_confirmed_submission_ref !== null) {
      assertEqual(
        "obligation mirror last_confirmed_submission_ref",
        mirror.last_confirmed_submission_ref,
        submissionRecordRef(submission),
      );
    }
  }

  return {
    filing_case_ref: filingCase ? filingCaseRef(filingCase) : null,
    filing_packet_ref: packet ? filingPacketRef(packet) : null,
    submission_record_created: submission !== null,
    submission_record_ref: submission ? submissionRecordRef(submission) : null,
  };
}
