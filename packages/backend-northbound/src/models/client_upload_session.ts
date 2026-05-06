import type {
  UploadRequestBindingContract,
  UploadSessionRecoveryHarness,
  UploadSessionRecoveryHarnessHarnessCase,
} from "../../../../packages/generated-models/src/generated/typescript/index.ts";
import type { GovernedUploadSession } from "../../../../packages/domain-kernel/src/uploads/upload_session_state.ts";

export type ClientUploadSessionRecord = GovernedUploadSession;
export type ClientUploadSessionContract = GovernedUploadSession;
export type ClientUploadRequestBindingContract = UploadRequestBindingContract;
export type ClientUploadSessionRecoveryHarness = UploadSessionRecoveryHarness;

export class ClientUploadSessionContractError extends Error {
  readonly code = "CLIENT_UPLOAD_SESSION_CONTRACT_INVALID";

  constructor(message: string) {
    super(message);
    this.name = "ClientUploadSessionContractError";
  }
}

const transferStates = new Set<ClientUploadSessionRecord["transfer_state"]>([
  "QUEUED",
  "UPLOADING",
  "SCANNING",
  "ACCEPTED",
  "REJECTED",
  "FAILED",
]);
const requestBindingStates = new Set<ClientUploadSessionRecord["request_binding_state"]>([
  "ORIGINAL_CURRENT",
  "RECONFIRMED_CURRENT",
  "RECONFIRMATION_REQUIRED",
  "SUPERSEDED",
]);
const resumabilityStates = new Set<ClientUploadSessionRecord["resumability_state"]>([
  "RESUMABLE",
  "RESTART_REQUIRED",
  "CLOSED",
]);
const attachmentStates = new Set<ClientUploadSessionRecord["attachment_state"]>([
  "STAGED",
  "CONFIRMATION_REQUIRED",
  "ATTACHED",
  "REBIND_REQUIRED",
]);
const recoveryPostures = new Set<ClientUploadSessionRecord["recovery_posture"]>([
  "NONE",
  "INLINE_RESUME",
  "RECONFIRM_INLINE",
  "STALE_REVIEW_REQUIRED",
  "STEP_UP_RETRY",
  "HARD_RESET_REQUIRED",
  "SUPPORT_REQUIRED",
]);
const scenarioCodes = new Set<UploadSessionRecoveryHarnessHarnessCase["scenario_code"]>([
  "MOBILE_RECONNECT",
  "BROWSER_RELOAD",
  "STALE_REQUEST_REBASE",
  "DUPLICATE_ALLOCATION_RETRY",
  "CHECKSUM_OR_SCANNER_DELAY",
  "ATTACHMENT_CONFIRMATION",
  "CROSS_DEVICE_CONTINUATION",
]);

function fail(message: string): never {
  throw new ClientUploadSessionContractError(message);
}

function assertNonEmptyString(label: string, value: unknown): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    fail(`${label} is required`);
  }
}

function assertNullableNonEmptyString(label: string, value: unknown) {
  if (value !== null) {
    assertNonEmptyString(label, value);
  }
}

function assertIsoOrNull(label: string, value: unknown) {
  if (value === null) {
    return;
  }
  assertNonEmptyString(label, value);
  if (Number.isNaN(Date.parse(value))) {
    fail(`${label} must be an ISO-8601 instant`);
  }
}

function assertNonNegativeInteger(label: string, value: unknown): asserts value is number {
  if (!Number.isInteger(value) || (value as number) < 0) {
    fail(`${label} must be a non-negative integer`);
  }
}

function assertPositiveInteger(label: string, value: unknown): asserts value is number {
  if (!Number.isInteger(value) || (value as number) <= 0) {
    fail(`${label} must be a positive integer`);
  }
}

function assertChronology(session: ClientUploadSessionRecord) {
  const ordered = [
    ["submitted_at", session.submitted_at],
    ["transfer_started_at", session.transfer_started_at],
    ["scan_completed_at", session.scan_completed_at],
    ["validation_completed_at", session.validation_completed_at],
    ["finalized_at", session.finalized_at],
    ["reconfirmed_at", session.reconfirmed_at],
    ["attachment_confirmed_at", session.attachment_confirmed_at],
  ] as const;
  let previous: null | { label: string; time: number } = null;
  for (const [label, value] of ordered) {
    if (value === null) {
      continue;
    }
    const time = Date.parse(value);
    if (previous !== null && time < previous.time) {
      fail(`${label} must not move before ${previous.label}`);
    }
    previous = { label, time };
  }
  const latestEventTime = Math.max(
    ...ordered
      .map(([, value]) => (value === null ? Number.NEGATIVE_INFINITY : Date.parse(value)))
      .filter(Number.isFinite),
  );
  if (Number.isFinite(latestEventTime) && Date.parse(session.state_changed_at) < latestEventTime) {
    fail("state_changed_at must not precede the latest session event timestamp");
  }
}

export function cloneClientUploadSession(
  session: ClientUploadSessionRecord,
): ClientUploadSessionRecord {
  return JSON.parse(JSON.stringify(session)) as ClientUploadSessionRecord;
}

export function assertUploadRequestBindingContract(contract: UploadRequestBindingContract) {
  if (contract.contract_version !== "UPLOAD_REQUEST_BINDING_V1") {
    fail("upload_request_binding_contract contract_version drifted");
  }
  assertNonEmptyString("frozen_tenant_id", contract.frozen_tenant_id);
  assertNonEmptyString("frozen_client_id", contract.frozen_client_id);
  assertNonEmptyString("frozen_request_id", contract.frozen_request_id);
  assertNonEmptyString("request_identity_ref", contract.request_identity_ref);
  assertNonEmptyString("frozen_request_version_ref", contract.frozen_request_version_ref);
  assertNonEmptyString("live_request_version_ref", contract.live_request_version_ref);
  assertNonEmptyString("frozen_binding_scope_hash", contract.frozen_binding_scope_hash);
  if (contract.request_identity_ref !== contract.frozen_request_id) {
    fail("request_identity_ref must mirror frozen_request_id");
  }
  const expectedFrozenBindingScopeHash = [
    contract.frozen_tenant_id,
    contract.frozen_client_id,
    contract.frozen_request_id,
    contract.frozen_request_version_ref,
  ].join("|");
  if (contract.frozen_binding_scope_hash !== expectedFrozenBindingScopeHash) {
    fail("frozen_binding_scope_hash must equal the frozen tenant/client/request/version tuple");
  }
  if (!requestBindingStates.has(contract.request_binding_state)) {
    fail("request_binding_state is outside the upload binding enum");
  }
  const expectedBasis =
    contract.request_binding_state === "ORIGINAL_CURRENT"
      ? "ORIGINAL_FROZEN_REQUEST"
      : contract.request_binding_state === "RECONFIRMED_CURRENT"
        ? "EXPLICIT_RECONFIRMATION"
        : contract.request_binding_state === "RECONFIRMATION_REQUIRED"
          ? "ACTIVE_REQUEST_REBASE_PENDING_CONFIRMATION"
          : "ACTIVE_REQUEST_SUPERSEDED";
  if (contract.binding_resolution_basis !== expectedBasis) {
    fail("binding_resolution_basis must mirror request_binding_state");
  }
  if (
    contract.request_binding_state === "ORIGINAL_CURRENT" &&
    contract.rebase_detected_at_or_null !== null
  ) {
    fail("original current binding must not publish a rebase timestamp");
  }
  if (
    contract.request_binding_state !== "ORIGINAL_CURRENT" &&
    contract.rebase_detected_at_or_null === null
  ) {
    fail("rebased binding states require rebase_detected_at_or_null");
  }
  assertIsoOrNull("rebase_detected_at_or_null", contract.rebase_detected_at_or_null);
  if (contract.resume_identity_policy !== "RESUME_EXISTING_SESSION_ONLY") {
    fail("resume_identity_policy drifted");
  }
  if (contract.duplicate_session_policy !== "NO_DUPLICATE_SESSION_ON_RECONNECT") {
    fail("duplicate_session_policy drifted");
  }
  if (contract.duplicate_file_policy !== "REUSE_FROZEN_STORAGE_REF_ON_RESUME_OR_RETRY") {
    fail("duplicate_file_policy drifted");
  }
  if (
    contract.inflight_rebase_policy !==
    "IN_FLIGHT_REBASE_PRESERVES_SESSION_UNTIL_TRANSFER_TERMINATES"
  ) {
    fail("inflight_rebase_policy drifted");
  }
  if (contract.stale_completion_policy !== "STALE_BYTES_NEVER_SATISFY_CURRENT_REQUEST") {
    fail("stale_completion_policy drifted");
  }
  if (contract.attachment_authority_policy !== "ATTACH_ONLY_TO_CURRENT_OR_RECONFIRMED_REQUEST") {
    fail("attachment_authority_policy drifted");
  }
  if (
    contract.next_action_authority_policy !==
    "TRANSFER_AND_BINDING_STATE_DETERMINE_NEXT_ACTION"
  ) {
    fail("next_action_authority_policy drifted");
  }
  if (contract.cross_device_resume_policy !== "CROSS_DEVICE_RESUME_REUSES_EXISTING_SESSION") {
    fail("cross_device_resume_policy drifted");
  }
  return contract;
}

export function assertClientUploadSessionContract(session: ClientUploadSessionRecord) {
  if (session.artifact_type !== "ClientUploadSession") {
    fail("artifact_type must be ClientUploadSession");
  }
  assertNonEmptyString("upload_session_id", session.upload_session_id);
  assertNonEmptyString("tenant_id", session.tenant_id);
  assertNonEmptyString("client_id", session.client_id);
  assertNullableNonEmptyString("manifest_id", session.manifest_id);
  assertNonEmptyString("request_id", session.request_id);
  assertNonEmptyString("request_version_ref", session.request_version_ref);
  assertUploadRequestBindingContract(session.upload_request_binding_contract);
  if (session.tenant_id !== session.upload_request_binding_contract.frozen_tenant_id) {
    fail("tenant_id must mirror the frozen upload binding");
  }
  if (session.client_id !== session.upload_request_binding_contract.frozen_client_id) {
    fail("client_id must mirror the frozen upload binding");
  }
  if (session.request_id !== session.upload_request_binding_contract.frozen_request_id) {
    fail("request_id must mirror the frozen upload binding");
  }
  if (
    session.request_version_ref !==
    session.upload_request_binding_contract.frozen_request_version_ref
  ) {
    fail("request_version_ref must remain the frozen request version");
  }
  if (session.request_binding_state !== session.upload_request_binding_contract.request_binding_state) {
    fail("request_binding_state must mirror upload_request_binding_contract");
  }
  assertNonEmptyString("initiated_by", session.initiated_by);
  assertNonEmptyString("storage_ref", session.storage_ref);
  assertNonEmptyString("filename", session.filename);
  if (session.filename.length > 120) {
    fail("filename must fit the ClientUploadSession schema max length");
  }
  assertNonEmptyString("media_type", session.media_type);
  assertPositiveInteger("byte_count", session.byte_count);
  assertNonEmptyString("checksum", session.checksum);
  assertNonNegativeInteger("bytes_transferred", session.bytes_transferred);
  if (session.bytes_transferred > session.byte_count) {
    fail("bytes_transferred must not exceed byte_count");
  }
  assertNonNegativeInteger("retry_count", session.retry_count);
  assertNonNegativeInteger("resume_attempt_count", session.resume_attempt_count);
  assertNonNegativeInteger("resume_success_count", session.resume_success_count);
  if (!transferStates.has(session.transfer_state)) {
    fail("transfer_state is outside the ClientUploadSession enum");
  }
  if (!requestBindingStates.has(session.request_binding_state)) {
    fail("request_binding_state is outside the ClientUploadSession enum");
  }
  if (!resumabilityStates.has(session.resumability_state)) {
    fail("resumability_state is outside the ClientUploadSession enum");
  }
  if (!attachmentStates.has(session.attachment_state)) {
    fail("attachment_state is outside the ClientUploadSession enum");
  }
  if (!recoveryPostures.has(session.recovery_posture)) {
    fail("recovery_posture is outside the ClientUploadSession enum");
  }
  assertNullableNonEmptyString("resume_token_ref", session.resume_token_ref);
  assertNullableNonEmptyString("attached_document_ref", session.attached_document_ref);
  assertNullableNonEmptyString("outcome_reason_code", session.outcome_reason_code);
  assertIsoOrNull("submitted_at", session.submitted_at);
  assertIsoOrNull("transfer_started_at", session.transfer_started_at);
  assertIsoOrNull("last_activity_at", session.last_activity_at);
  assertIsoOrNull("scan_completed_at", session.scan_completed_at);
  assertIsoOrNull("validation_completed_at", session.validation_completed_at);
  assertIsoOrNull("finalized_at", session.finalized_at);
  assertIsoOrNull("attachment_confirmed_at", session.attachment_confirmed_at);
  assertIsoOrNull("reconfirmed_at", session.reconfirmed_at);
  assertIsoOrNull("state_changed_at", session.state_changed_at);
  assertIsoOrNull("expires_at", session.expires_at);
  if (!Number.isInteger(session.upload_confidence_score) || session.upload_confidence_score < 0) {
    fail("upload_confidence_score must be an integer from 0 to 100");
  }
  if (session.upload_confidence_score > 100) {
    fail("upload_confidence_score must be an integer from 0 to 100");
  }

  if (["QUEUED", "UPLOADING", "SCANNING"].includes(session.transfer_state)) {
    if (session.malware_scan_state !== "PENDING" || session.validation_state !== "PENDING") {
      fail("in-flight transfers must keep scan and validation pending");
    }
    if (session.attachment_state !== "STAGED") {
      fail("in-flight transfers must keep attachment_state STAGED");
    }
    if (
      session.attached_document_ref !== null ||
      session.attachment_confirmed_at !== null ||
      session.scan_completed_at !== null ||
      session.validation_completed_at !== null ||
      session.finalized_at !== null
    ) {
      fail("in-flight transfers must not publish final scan, validation, or attachment refs");
    }
  }
  if (session.transfer_state === "ACCEPTED") {
    if (
      session.integrity_state !== "VERIFIED" ||
      session.malware_scan_state !== "CLEAN" ||
      session.validation_state !== "ACCEPTED" ||
      session.resumability_state !== "CLOSED"
    ) {
      fail("accepted uploads require verified integrity, clean scan, accepted validation, and closed resumability");
    }
    if (
      session.scan_completed_at === null ||
      session.validation_completed_at === null ||
      session.finalized_at === null
    ) {
      fail("accepted uploads require scan, validation, and finalized timestamps");
    }
  }
  if (session.resumability_state === "RESUMABLE") {
    if (session.resume_token_ref === null || session.next_action_code !== "RESUME_UPLOAD") {
      fail("resumable uploads require a resume token and RESUME_UPLOAD next action");
    }
  }
  if (session.resumability_state === "CLOSED" && session.resume_token_ref !== null) {
    fail("closed uploads must clear resume_token_ref");
  }
  if (session.request_binding_state === "ORIGINAL_CURRENT" && session.reconfirmed_at !== null) {
    fail("original current sessions must not publish reconfirmed_at");
  }
  if (session.request_binding_state === "RECONFIRMED_CURRENT" && session.reconfirmed_at === null) {
    fail("reconfirmed current sessions must publish reconfirmed_at");
  }
  if (
    ["RECONFIRMATION_REQUIRED", "SUPERSEDED"].includes(session.request_binding_state) &&
    (session.attached_document_ref !== null ||
      session.attachment_confirmed_at !== null ||
      session.reconfirmed_at !== null ||
      session.dominant_hazard_code === null)
  ) {
    fail("stale upload bindings must clear attachment refs and publish a hazard code");
  }
  if (session.attachment_state === "CONFIRMATION_REQUIRED") {
    if (
      session.transfer_state !== "ACCEPTED" ||
      session.validation_state !== "ACCEPTED" ||
      !["ORIGINAL_CURRENT", "RECONFIRMED_CURRENT"].includes(session.request_binding_state) ||
      session.attached_document_ref !== null ||
      session.attachment_confirmed_at !== null ||
      session.next_action_code !== "CONFIRM_ATTACHMENT"
    ) {
      fail("confirmation-required uploads must be accepted current uploads awaiting explicit attachment");
    }
  }
  if (session.attachment_state === "ATTACHED") {
    if (
      session.transfer_state !== "ACCEPTED" ||
      session.malware_scan_state !== "CLEAN" ||
      session.validation_state !== "ACCEPTED" ||
      session.integrity_state !== "VERIFIED" ||
      !["ORIGINAL_CURRENT", "RECONFIRMED_CURRENT"].includes(session.request_binding_state) ||
      session.attached_document_ref === null ||
      session.attachment_confirmed_at === null ||
      session.upload_confidence_score < 85 ||
      session.next_action_code !== "NONE" ||
      session.recovery_posture !== "NONE"
    ) {
      fail("ATTACHED requires verified bytes, current binding, high confidence, and no recovery posture");
    }
  }
  if (session.attachment_state === "REBIND_REQUIRED") {
    if (
      session.transfer_state !== "ACCEPTED" ||
      session.next_action_code !== "RECONFIRM_REQUEST" ||
      !["RECONFIRMATION_REQUIRED", "SUPERSEDED"].includes(session.request_binding_state)
    ) {
      fail("REBIND_REQUIRED requires accepted stale bytes and RECONFIRM_REQUEST");
    }
  }
  if (["NONE", "CONFIRM_ATTACHMENT"].includes(session.next_action_code)) {
    if (session.recovery_posture !== "NONE" || session.dominant_hazard_code !== null) {
      fail("safe next actions must clear recovery posture and hazards");
    }
  }
  if (session.next_action_code === "RESUME_UPLOAD") {
    if (session.recovery_posture !== "INLINE_RESUME" || session.dominant_hazard_code === null) {
      fail("RESUME_UPLOAD requires INLINE_RESUME and a resume hazard code");
    }
  }
  if (session.next_action_code === "RECONFIRM_REQUEST") {
    if (
      !["RECONFIRM_INLINE", "STALE_REVIEW_REQUIRED"].includes(session.recovery_posture) ||
      session.dominant_hazard_code === null
    ) {
      fail("RECONFIRM_REQUEST requires stale recovery posture and a hazard code");
    }
  }
  if (["RETRY_UPLOAD", "UPLOAD_REPLACEMENT", "CONTACT_SUPPORT"].includes(session.next_action_code)) {
    if (session.outcome_reason_code === null || session.dominant_hazard_code === null) {
      fail("unsafe next actions require outcome and hazard reason codes");
    }
  }
  if (session.integrity_state === "FAILED") {
    if (session.upload_confidence_score !== 0 || session.dominant_hazard_code === null) {
      fail("failed integrity must zero confidence and publish a hazard");
    }
  }
  if (session.request_binding_state === "SUPERSEDED" && session.upload_confidence_score > 25) {
    fail("superseded uploads must cap confidence at 25");
  }
  assertChronology(session);
  return session;
}

function assertHarnessCase(caseEntry: UploadSessionRecoveryHarnessHarnessCase) {
  assertNonEmptyString("case_id", caseEntry.case_id);
  if (!scenarioCodes.has(caseEntry.scenario_code)) {
    fail(`unknown upload recovery scenario ${caseEntry.scenario_code}`);
  }
  if (caseEntry.duplicate_session_created !== false) {
    fail("recovery harness cases must not create duplicate sessions");
  }
  if (caseEntry.duplicate_storage_ref_created !== false) {
    fail("recovery harness cases must not create duplicate storage refs");
  }
  if (caseEntry.pre_session.upload_session_id !== caseEntry.post_session.upload_session_id) {
    fail("recovery harness must preserve upload_session_id");
  }
  if (caseEntry.pre_session.storage_ref !== caseEntry.post_session.storage_ref) {
    fail("recovery harness must preserve storage_ref");
  }
  if (caseEntry.scenario_code === "MOBILE_RECONNECT") {
    if (
      caseEntry.entry_surface_class !== "MOBILE" ||
      caseEntry.resume_surface_class !== "MOBILE" ||
      caseEntry.expected_request_completion_state !== "NOT_READY_BYTES_IN_FLIGHT"
    ) {
      fail("MOBILE_RECONNECT harness case does not match schema posture");
    }
  }
  if (caseEntry.scenario_code === "BROWSER_RELOAD") {
    if (
      caseEntry.entry_surface_class !== "BROWSER" ||
      caseEntry.resume_surface_class !== "BROWSER" ||
      caseEntry.expected_request_completion_state !== "NOT_READY_SCAN_OR_VALIDATION_PENDING"
    ) {
      fail("BROWSER_RELOAD harness case does not match schema posture");
    }
  }
  if (
    caseEntry.scenario_code === "STALE_REQUEST_REBASE" &&
    caseEntry.post_request_projection.current_request_upload_ref_or_null !== null
  ) {
    fail("stale rebase harness case must not satisfy the current request");
  }
}

export function assertUploadSessionRecoveryHarnessContract(
  harness: UploadSessionRecoveryHarness,
) {
  if (harness.contract_version !== "UPLOAD_SESSION_RECOVERY_HARNESS_V1") {
    fail("upload recovery harness contract_version drifted");
  }
  if (harness.suite_profile !== "RESUMABLE_UPLOAD_RECONNECT_REBASE_AND_DUPLICATE_MATRIX") {
    fail("upload recovery harness suite_profile drifted");
  }
  if (harness.run_mode !== "DETERMINISTIC_SESSION_RECOVERY_ENUMERATION") {
    fail("upload recovery harness run_mode drifted");
  }
  if (harness.identity_policy !== "FROZEN_TENANT_CLIENT_REQUEST_AND_VERSION_SCOPE") {
    fail("upload recovery harness identity policy drifted");
  }
  if (harness.resume_policy !== "RESUME_EXISTING_SESSION_AND_STORAGE_REF_ONLY") {
    fail("upload recovery harness resume policy drifted");
  }
  if (harness.rebase_policy !== "LIVE_REQUEST_VERSION_MAY_ADVANCE_FROZEN_VERSION_MAY_NOT") {
    fail("upload recovery harness rebase policy drifted");
  }
  if (
    harness.completion_policy !==
    "TRANSFER_SUCCESS_NEVER_IMPLIES_ATTACHMENT_OR_REQUEST_SATISFACTION"
  ) {
    fail("upload recovery harness completion policy drifted");
  }
  if (
    harness.duplicate_policy !==
    "NO_DUPLICATE_SESSION_OR_STORAGE_REF_ON_RETRY_OR_CROSS_DEVICE_RESUME"
  ) {
    fail("upload recovery harness duplicate policy drifted");
  }
  if (harness.recovery_action_policy !== "NEXT_ACTION_AND_RESUMABILITY_STATE_GOVERN_ALL_RECOVERY") {
    fail("upload recovery harness recovery action policy drifted");
  }
  if (harness.cases.length < 7) {
    fail("upload recovery harness must cover the seven deterministic scenarios");
  }
  const seen = new Set<UploadSessionRecoveryHarnessHarnessCase["scenario_code"]>();
  for (const caseEntry of harness.cases) {
    assertHarnessCase(caseEntry);
    seen.add(caseEntry.scenario_code);
  }
  for (const scenario of scenarioCodes) {
    if (!seen.has(scenario)) {
      fail(`upload recovery harness missing ${scenario}`);
    }
  }
  return harness;
}
