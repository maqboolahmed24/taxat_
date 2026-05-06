import {
  AuthorityModelError,
  assertEnum,
  cloneRecord,
  hashObject,
  normalizeOrderedStringSet,
  normalizeSortedStringSet,
  normalizeTimestamp,
  refFromId,
  requireString,
} from "./authority_common.ts";
import {
  type FilingPacketApprovalState,
  type FilingPacketDeclaredBasisAckState,
} from "./filing_packet.ts";

export type FilingNoticeResolutionRecord = {
  approval_state: FilingPacketApprovalState;
  artifact_type: "FilingNoticeResolution";
  declared_basis_ack_state: FilingPacketDeclaredBasisAckState;
  manifest_id: string;
  notice_refs: string[];
  notice_requirements_satisfied: boolean;
  notice_resolution_id: string;
  notice_step_refs: string[];
  packet_id: string;
  resolved_at: string;
  unresolved_reason_codes: string[];
};

export type FilingNoticeResolutionBuildInput = Partial<
  Omit<
    FilingNoticeResolutionRecord,
    | "artifact_type"
    | "notice_refs"
    | "notice_step_refs"
    | "unresolved_reason_codes"
  >
> & {
  approval_state: FilingPacketApprovalState;
  declared_basis_ack_state: FilingPacketDeclaredBasisAckState;
  manifest_id: string;
  notice_refs?: readonly string[];
  notice_requirements_satisfied: boolean;
  notice_step_refs: readonly string[];
  packet_id: string;
  resolved_at: string;
  unresolved_reason_codes?: readonly string[];
};

export function filingNoticeResolutionRef(
  resolution: Pick<FilingNoticeResolutionRecord, "notice_resolution_id"> | string,
) {
  return refFromId(
    "filing-notice-resolution",
    typeof resolution === "string" ? resolution : resolution.notice_resolution_id,
  );
}

function slug(value: string) {
  return requireString("notice_resolution_id_material", value)
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .slice(0, 72);
}

function defaultResolutionId(input: {
  manifest_id: string;
  notice_step_refs: readonly string[];
  packet_id: string;
  resolved_at: string;
}) {
  const basisHash = hashObject("FILING_NOTICE_RESOLUTION_ID_V1", {
    notice_step_refs: input.notice_step_refs,
    resolved_at: input.resolved_at,
  }).slice(0, 16);
  return ["filing-notice-resolution", slug(input.manifest_id), slug(input.packet_id), basisHash].join(".");
}

function assertResolvedComponentStates(record: FilingNoticeResolutionRecord) {
  const approvalResolved = ["NOT_REQUIRED", "SATISFIED"].includes(record.approval_state);
  const ackResolved = ["NOT_APPLICABLE", "NOT_REQUIRED", "SATISFIED"].includes(
    record.declared_basis_ack_state,
  );
  const hasUnresolvedApproval = ["REQUIRED_PENDING", "UNSATISFIABLE", "DENIED"].includes(
    record.approval_state,
  );
  const hasUnresolvedAck = ["REQUIRED_PENDING", "UNSATISFIABLE"].includes(
    record.declared_basis_ack_state,
  );

  if (record.notice_requirements_satisfied) {
    if (!approvalResolved || !ackResolved) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "satisfied filing notice resolutions require resolved approval and acknowledgement states",
      );
    }
    if (record.unresolved_reason_codes.length > 0) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "satisfied filing notice resolutions must not retain unresolved reason codes",
      );
    }
  } else {
    if (record.unresolved_reason_codes.length === 0) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "unsatisfied filing notice resolutions require unresolved_reason_codes",
      );
    }
    if (!hasUnresolvedApproval && !hasUnresolvedAck) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "unsatisfied filing notice resolutions require an unresolved approval or declaration-basis posture",
      );
    }
  }
}

export function buildFilingNoticeResolutionRecord(
  input: FilingNoticeResolutionBuildInput,
): FilingNoticeResolutionRecord {
  const manifestId = requireString("manifest_id", input.manifest_id);
  const packetId = requireString("packet_id", input.packet_id);
  const noticeStepRefs = normalizeOrderedStringSet("notice_step_refs", input.notice_step_refs, {
    minItems: 1,
  });
  const noticeRefs = normalizeOrderedStringSet("notice_refs", input.notice_refs ?? noticeStepRefs, {
    minItems: 1,
  });
  if (noticeRefs.join("\n") !== noticeStepRefs.join("\n")) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "FilingNoticeResolution.notice_refs must exactly mirror notice_step_refs",
    );
  }
  const resolvedAt = normalizeTimestamp("resolved_at", input.resolved_at);
  const record: FilingNoticeResolutionRecord = {
    approval_state: assertEnum("approval_state", input.approval_state, [
      "NOT_REQUIRED",
      "SATISFIED",
      "REQUIRED_PENDING",
      "UNSATISFIABLE",
      "DENIED",
    ] as const),
    artifact_type: "FilingNoticeResolution",
    declared_basis_ack_state: assertEnum("declared_basis_ack_state", input.declared_basis_ack_state, [
      "NOT_APPLICABLE",
      "NOT_REQUIRED",
      "SATISFIED",
      "REQUIRED_PENDING",
      "UNSATISFIABLE",
    ] as const),
    manifest_id: manifestId,
    notice_refs: noticeRefs,
    notice_requirements_satisfied: Boolean(input.notice_requirements_satisfied),
    notice_resolution_id:
      input.notice_resolution_id ??
      defaultResolutionId({
        manifest_id: manifestId,
        notice_step_refs: noticeStepRefs,
        packet_id: packetId,
        resolved_at: resolvedAt,
      }),
    notice_step_refs: noticeStepRefs,
    packet_id: packetId,
    resolved_at: resolvedAt,
    unresolved_reason_codes: normalizeSortedStringSet(
      "unresolved_reason_codes",
      input.unresolved_reason_codes,
    ),
  };
  assertResolvedComponentStates(record);
  return record;
}

export function normalizeFilingNoticeResolutionRecord(
  input: FilingNoticeResolutionRecord,
): FilingNoticeResolutionRecord {
  return buildFilingNoticeResolutionRecord(input);
}

export function filingNoticeResolutionContentFingerprint(
  record: FilingNoticeResolutionRecord,
) {
  const normalized = normalizeFilingNoticeResolutionRecord(record);
  return hashObject("FILING_NOTICE_RESOLUTION_CONTENT_V1", {
    approval_state: normalized.approval_state,
    declared_basis_ack_state: normalized.declared_basis_ack_state,
    manifest_id: normalized.manifest_id,
    notice_refs: normalized.notice_refs,
    notice_requirements_satisfied: normalized.notice_requirements_satisfied,
    notice_resolution_id: normalized.notice_resolution_id,
    notice_step_refs: normalized.notice_step_refs,
    packet_id: normalized.packet_id,
    resolved_at: normalized.resolved_at,
    unresolved_reason_codes: normalized.unresolved_reason_codes,
  });
}

export function cloneFilingNoticeResolutionRecord(record: FilingNoticeResolutionRecord) {
  return cloneRecord(record);
}
