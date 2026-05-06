import type {
  UploadSessionRecoveryHarnessCompletionState,
  UploadSessionRecoveryHarnessHarnessCase,
  UploadSessionRecoveryHarnessScenarioCode,
} from "../../../generated-models/src/generated/typescript/index.ts";
import {
  toClientUploadSessionRecoverySnapshot,
  type ClientUploadSessionRecoverySnapshot,
} from "../projectors/build_client_upload_session.ts";
import type { ClientPortalUploadSessionRecord } from "../types.ts";
import {
  deriveCrossDeviceResumePolicy,
  type UploadRecoverySurfaceClass,
} from "./derive_cross_device_resume_policy.ts";
import { deriveUploadRecoveryPostRequestProjection } from "./derive_upload_recovery_post_request_projection.ts";
import { validateUploadSessionChronologyAndScope } from "./validate_upload_session_chronology_and_scope.ts";

export const requiredUploadRecoveryScenarios = [
  "MOBILE_RECONNECT",
  "BROWSER_RELOAD",
  "STALE_REQUEST_REBASE",
  "DUPLICATE_ALLOCATION_RETRY",
  "CHECKSUM_OR_SCANNER_DELAY",
  "ATTACHMENT_CONFIRMATION",
  "CROSS_DEVICE_CONTINUATION",
] as const satisfies readonly UploadSessionRecoveryHarnessScenarioCode[];

export const expectedUploadRecoveryCompletionByScenario = {
  ATTACHMENT_CONFIRMATION: "READY_CURRENT_REQUEST_SATISFIED",
  BROWSER_RELOAD: "NOT_READY_SCAN_OR_VALIDATION_PENDING",
  CHECKSUM_OR_SCANNER_DELAY: "NOT_READY_SCAN_OR_VALIDATION_PENDING",
  CROSS_DEVICE_CONTINUATION: "NOT_READY_BYTES_IN_FLIGHT",
  DUPLICATE_ALLOCATION_RETRY: "NOT_READY_BYTES_IN_FLIGHT",
  MOBILE_RECONNECT: "NOT_READY_BYTES_IN_FLIGHT",
  STALE_REQUEST_REBASE: "NOT_READY_STALE_RECONFIRM_REQUIRED",
} as const satisfies Record<
  UploadSessionRecoveryHarnessScenarioCode,
  UploadSessionRecoveryHarnessCompletionState
>;

export const uploadRecoverySurfaceByScenario = {
  ATTACHMENT_CONFIRMATION: ["DESKTOP", "DESKTOP"],
  BROWSER_RELOAD: ["BROWSER", "BROWSER"],
  CHECKSUM_OR_SCANNER_DELAY: ["DESKTOP", "DESKTOP"],
  CROSS_DEVICE_CONTINUATION: ["MOBILE", "DESKTOP"],
  DUPLICATE_ALLOCATION_RETRY: ["DESKTOP", "DESKTOP"],
  MOBILE_RECONNECT: ["MOBILE", "MOBILE"],
  STALE_REQUEST_REBASE: ["DESKTOP", "DESKTOP"],
} as const satisfies Record<
  UploadSessionRecoveryHarnessScenarioCode,
  readonly [UploadRecoverySurfaceClass, UploadRecoverySurfaceClass]
>;

function derivedCompletionState(
  session: ClientPortalUploadSessionRecord,
): UploadSessionRecoveryHarnessCompletionState {
  if (session.bytes_transferred < session.byte_count) {
    return "NOT_READY_BYTES_IN_FLIGHT";
  }
  if (
    session.integrity_state !== "VERIFIED" ||
    session.transfer_state !== "ACCEPTED" ||
    session.malware_scan_state === "PENDING" ||
    session.validation_state === "PENDING"
  ) {
    return "NOT_READY_SCAN_OR_VALIDATION_PENDING";
  }
  if (
    session.request_binding_state === "RECONFIRMATION_REQUIRED" ||
    session.request_binding_state === "SUPERSEDED"
  ) {
    return "NOT_READY_STALE_RECONFIRM_REQUIRED";
  }
  if (
    session.attachment_state !== "ATTACHED" ||
    session.attached_document_ref === null ||
    session.attachment_confirmed_at === null
  ) {
    return "NOT_READY_ATTACHMENT_CONFIRMATION_PENDING";
  }
  return "READY_CURRENT_REQUEST_SATISFIED";
}

function caseId(scenarioCode: UploadSessionRecoveryHarnessScenarioCode) {
  return `upload-recovery.pc-0182.${scenarioCode.toLowerCase()}`;
}

export function materializeUploadRecoveryCase(input: {
  entrySurfaceClass?: UploadRecoverySurfaceClass | undefined;
  postSession: ClientPortalUploadSessionRecord;
  preSession: ClientPortalUploadSessionRecord;
  resumeSurfaceClass?: UploadRecoverySurfaceClass | undefined;
  scenarioCode: UploadSessionRecoveryHarnessScenarioCode;
}): UploadSessionRecoveryHarnessHarnessCase {
  const preSession = validateUploadSessionChronologyAndScope(input.preSession);
  const postSession = validateUploadSessionChronologyAndScope(input.postSession);
  const [defaultEntrySurface, defaultResumeSurface] =
    uploadRecoverySurfaceByScenario[input.scenarioCode];
  const entrySurfaceClass = input.entrySurfaceClass ?? defaultEntrySurface;
  const resumeSurfaceClass = input.resumeSurfaceClass ?? defaultResumeSurface;
  const expectedCompletionState = expectedUploadRecoveryCompletionByScenario[input.scenarioCode];
  const actualCompletionState = derivedCompletionState(postSession);

  if (actualCompletionState !== expectedCompletionState) {
    throw new Error(
      `${input.scenarioCode} produced ${actualCompletionState}, expected ${expectedCompletionState}`,
    );
  }

  if (input.scenarioCode === "CROSS_DEVICE_CONTINUATION") {
    const policy = deriveCrossDeviceResumePolicy({
      entrySurfaceClass,
      postSession,
      preSession,
      resumeSurfaceClass,
    });
    if (!policy.continuation_allowed) {
      throw new Error(
        `CROSS_DEVICE_CONTINUATION is not lawful: ${policy.reason_codes.join(",")}`,
      );
    }
  }

  return {
    case_id: caseId(input.scenarioCode),
    duplicate_session_created: false,
    duplicate_storage_ref_created: false,
    entry_surface_class: entrySurfaceClass,
    expected_request_completion_state: expectedCompletionState,
    post_request_projection: deriveUploadRecoveryPostRequestProjection(postSession),
    post_session: toClientUploadSessionRecoverySnapshot(
      postSession,
    ) as UploadSessionRecoveryHarnessHarnessCase["post_session"],
    pre_session: toClientUploadSessionRecoverySnapshot(
      preSession,
    ) as UploadSessionRecoveryHarnessHarnessCase["pre_session"],
    resume_surface_class: resumeSurfaceClass,
    scenario_code: input.scenarioCode,
  };
}

export function materializeUploadRecoveryCaseFromSnapshots(input: {
  entrySurfaceClass: UploadRecoverySurfaceClass;
  expectedRequestCompletionState: UploadSessionRecoveryHarnessCompletionState;
  postRequestProjection: UploadSessionRecoveryHarnessHarnessCase["post_request_projection"];
  postSession: ClientUploadSessionRecoverySnapshot;
  preSession: ClientUploadSessionRecoverySnapshot;
  resumeSurfaceClass: UploadRecoverySurfaceClass;
  scenarioCode: UploadSessionRecoveryHarnessScenarioCode;
}): UploadSessionRecoveryHarnessHarnessCase {
  return {
    case_id: caseId(input.scenarioCode),
    duplicate_session_created: false,
    duplicate_storage_ref_created: false,
    entry_surface_class: input.entrySurfaceClass,
    expected_request_completion_state: input.expectedRequestCompletionState,
    post_request_projection: input.postRequestProjection,
    post_session:
      input.postSession as UploadSessionRecoveryHarnessHarnessCase["post_session"],
    pre_session:
      input.preSession as UploadSessionRecoveryHarnessHarnessCase["pre_session"],
    resume_surface_class: input.resumeSurfaceClass,
    scenario_code: input.scenarioCode,
  };
}
