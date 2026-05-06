import {
  AuthorityModelError,
  assertEnum,
  cloneRecord,
  hashObject,
  normalizeNullableTimestamp,
  normalizeOrderedStringSet,
  normalizeSortedStringSet,
  normalizeTimestamp,
  refFromId,
  requireString,
} from "./authority_common.ts";

export const FILING_NOTICE_STEP_CODES = [
  "DECLARED_BASIS_ACK_REQUIRED",
  "DISCLAIMER_ACK_REQUIRED",
  "PACKET_APPROVAL_REQUIRED",
] as const;

export const FILING_NOTICE_STEP_LIFECYCLE_STATES = [
  "PENDING",
  "SATISFIED",
  "UNSATISFIABLE",
] as const;

export const FILING_NOTICE_STEP_ORDER: readonly FilingNoticeStepCode[] = [
  "DECLARED_BASIS_ACK_REQUIRED",
  "DISCLAIMER_ACK_REQUIRED",
  "PACKET_APPROVAL_REQUIRED",
] as const;

export type FilingNoticeStepCode = (typeof FILING_NOTICE_STEP_CODES)[number];
export type FilingNoticeStepLifecycleState = (typeof FILING_NOTICE_STEP_LIFECYCLE_STATES)[number];

export type FilingNoticeStepRecord = {
  artifact_type: "FilingNoticeStep";
  created_at: string;
  lifecycle_state: FilingNoticeStepLifecycleState;
  manifest_id: string;
  notice_step_id: string;
  packet_id: string;
  packet_refs: string[];
  reason_codes: string[];
  resolved_at: string | null;
  scope_refs: string[];
  step_code: FilingNoticeStepCode;
};

export type FilingNoticeStepBuildInput = Partial<
  Omit<FilingNoticeStepRecord, "artifact_type" | "packet_refs" | "reason_codes" | "scope_refs">
> & {
  created_at: string;
  manifest_id: string;
  packet_id: string;
  packet_refs?: readonly string[];
  reason_codes: readonly string[];
  scope_refs: readonly string[];
  step_code: FilingNoticeStepCode;
};

export function filingNoticeStepRef(
  step: Pick<FilingNoticeStepRecord, "notice_step_id"> | string,
) {
  return refFromId("filing-notice-step", typeof step === "string" ? step : step.notice_step_id);
}

function slug(value: string) {
  return requireString("notice_step_id_material", value)
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .slice(0, 72);
}

export function noticeStepOrderIndex(stepCode: FilingNoticeStepCode) {
  return FILING_NOTICE_STEP_ORDER.indexOf(stepCode);
}

export function compareFilingNoticeSteps(
  left: Pick<FilingNoticeStepRecord, "notice_step_id" | "step_code">,
  right: Pick<FilingNoticeStepRecord, "notice_step_id" | "step_code">,
) {
  return (
    noticeStepOrderIndex(left.step_code) - noticeStepOrderIndex(right.step_code) ||
    left.notice_step_id.localeCompare(right.notice_step_id)
  );
}

function defaultStepId(input: {
  manifest_id: string;
  packet_id: string;
  step_code: FilingNoticeStepCode;
}) {
  const order = String(noticeStepOrderIndex(input.step_code) + 1).padStart(2, "0");
  return [
    "filing-notice-step",
    slug(input.manifest_id),
    slug(input.packet_id),
    order,
    input.step_code.toLowerCase(),
  ].join(".");
}

function assertLifecycleTimestamps(record: FilingNoticeStepRecord) {
  if (record.lifecycle_state === "PENDING" && record.resolved_at !== null) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "PENDING filing notice steps must keep resolved_at null",
    );
  }
  if (record.lifecycle_state !== "PENDING" && record.resolved_at === null) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "SATISFIED and UNSATISFIABLE filing notice steps require resolved_at",
    );
  }
  if (record.resolved_at !== null && Date.parse(record.resolved_at) < Date.parse(record.created_at)) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "filing notice step resolved_at cannot precede created_at",
    );
  }
}

function assertPacketBinding(record: FilingNoticeStepRecord) {
  if (!record.packet_refs.includes(record.packet_id)) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "FilingNoticeStep.packet_refs must include the owning packet_id",
    );
  }
}

export function buildFilingNoticeStepRecord(
  input: FilingNoticeStepBuildInput,
): FilingNoticeStepRecord {
  const stepCode = assertEnum("step_code", input.step_code, FILING_NOTICE_STEP_CODES);
  const lifecycleState = assertEnum(
    "lifecycle_state",
    input.lifecycle_state ?? "PENDING",
    FILING_NOTICE_STEP_LIFECYCLE_STATES,
  );
  const manifestId = requireString("manifest_id", input.manifest_id);
  const packetId = requireString("packet_id", input.packet_id);
  const record: FilingNoticeStepRecord = {
    artifact_type: "FilingNoticeStep",
    created_at: normalizeTimestamp("created_at", input.created_at),
    lifecycle_state: lifecycleState,
    manifest_id: manifestId,
    notice_step_id:
      input.notice_step_id ??
      defaultStepId({
        manifest_id: manifestId,
        packet_id: packetId,
        step_code: stepCode,
      }),
    packet_id: packetId,
    packet_refs: normalizeSortedStringSet(
      "packet_refs",
      input.packet_refs ?? [packetId],
      { minItems: 1 },
    ),
    reason_codes: normalizeSortedStringSet("reason_codes", input.reason_codes, { minItems: 1 }),
    resolved_at: normalizeNullableTimestamp("resolved_at", input.resolved_at),
    scope_refs: normalizeSortedStringSet("scope_refs", input.scope_refs, { minItems: 1 }),
    step_code: stepCode,
  };
  assertPacketBinding(record);
  assertLifecycleTimestamps(record);
  return record;
}

export function normalizeFilingNoticeStepRecord(
  input: FilingNoticeStepRecord,
): FilingNoticeStepRecord {
  return buildFilingNoticeStepRecord(input);
}

export function filingNoticeStepContentFingerprint(record: FilingNoticeStepRecord) {
  const normalized = normalizeFilingNoticeStepRecord(record);
  return hashObject("FILING_NOTICE_STEP_CONTENT_V1", {
    created_at: normalized.created_at,
    lifecycle_state: normalized.lifecycle_state,
    manifest_id: normalized.manifest_id,
    notice_step_id: normalized.notice_step_id,
    packet_id: normalized.packet_id,
    packet_refs: normalized.packet_refs,
    reason_codes: normalized.reason_codes,
    resolved_at: normalized.resolved_at,
    scope_refs: normalizeOrderedStringSet("scope_refs", normalized.scope_refs),
    step_code: normalized.step_code,
  });
}

export function cloneFilingNoticeStepRecord(record: FilingNoticeStepRecord) {
  return cloneRecord(record);
}
