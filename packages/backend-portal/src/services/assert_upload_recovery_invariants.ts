import type {
  UploadSessionRecoveryHarness,
  UploadSessionRecoveryHarnessCompletionState,
  UploadSessionRecoveryHarnessHarnessCase,
  UploadSessionRecoveryHarnessScenarioCode,
  UploadSessionRecoveryHarnessSessionSnapshot,
} from "../../../generated-models/src/generated/typescript/index.ts";
import {
  expectedUploadRecoveryCompletionByScenario,
  requiredUploadRecoveryScenarios,
} from "./materialize_upload_recovery_case.ts";

export class UploadSessionRecoveryHarnessInvariantError extends Error {
  readonly reasonCodes: string[];

  constructor(message: string, reasonCodes: readonly string[]) {
    super(message);
    this.name = "UploadSessionRecoveryHarnessInvariantError";
    this.reasonCodes = [...reasonCodes];
  }
}

function fail(message: string, reasonCodes: readonly string[]): never {
  throw new UploadSessionRecoveryHarnessInvariantError(message, reasonCodes);
}

function assertNonEmpty(label: string, value: unknown): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    fail(`${label} must be a non-empty string`, ["UPLOAD_RECOVERY_FIELD_REQUIRED"]);
  }
}

function assertNullableNonEmpty(label: string, value: unknown) {
  if (value !== null) {
    assertNonEmpty(label, value);
  }
}

function assertSnapshot(
  snapshot: UploadSessionRecoveryHarnessSessionSnapshot,
  label: string,
) {
  assertNonEmpty(`${label}.upload_session_id`, snapshot.upload_session_id);
  assertNonEmpty(`${label}.storage_ref`, snapshot.storage_ref);
  assertNonEmpty(`${label}.tenant_id`, snapshot.tenant_id);
  assertNonEmpty(`${label}.client_id`, snapshot.client_id);
  assertNonEmpty(`${label}.request_id`, snapshot.request_id);
  assertNonEmpty(
    `${label}.frozen_request_version_ref`,
    snapshot.frozen_request_version_ref,
  );
  assertNonEmpty(`${label}.live_request_version_ref`, snapshot.live_request_version_ref);
  assertNullableNonEmpty(`${label}.resume_token_ref_or_null`, snapshot.resume_token_ref_or_null);
  assertNullableNonEmpty(
    `${label}.attached_document_ref_or_null`,
    snapshot.attached_document_ref_or_null,
  );
  assertNullableNonEmpty(
    `${label}.attachment_confirmed_at_or_null`,
    snapshot.attachment_confirmed_at_or_null,
  );
  if (!Number.isInteger(snapshot.byte_count) || snapshot.byte_count < 1) {
    fail(`${label}.byte_count must be positive`, ["UPLOAD_RECOVERY_BYTE_COUNT_INVALID"]);
  }
  if (
    !Number.isInteger(snapshot.bytes_transferred) ||
    snapshot.bytes_transferred < 0 ||
    snapshot.bytes_transferred > snapshot.byte_count
  ) {
    fail(`${label}.bytes_transferred must fit byte_count`, [
      "UPLOAD_RECOVERY_BYTES_TRANSFERRED_INVALID",
    ]);
  }
  if (
    !Number.isInteger(snapshot.upload_confidence_score) ||
    snapshot.upload_confidence_score < 0 ||
    snapshot.upload_confidence_score > 100
  ) {
    fail(`${label}.upload_confidence_score must be 0..100`, [
      "UPLOAD_RECOVERY_CONFIDENCE_INVALID",
    ]);
  }
  if (
    snapshot.request_binding_state === "ORIGINAL_CURRENT" &&
    snapshot.live_request_version_ref !== snapshot.frozen_request_version_ref
  ) {
    fail(`${label} original-current binding must not drift live version`, [
      "UPLOAD_RECOVERY_LIVE_VERSION_DRIFT",
    ]);
  }
  if (
    snapshot.request_binding_state !== "ORIGINAL_CURRENT" &&
    snapshot.live_request_version_ref === snapshot.frozen_request_version_ref
  ) {
    fail(`${label} stale or reconfirmed binding must publish live drift`, [
      "UPLOAD_RECOVERY_LIVE_VERSION_MISSING",
    ]);
  }
  if (snapshot.resumability_state === "RESUMABLE") {
    assertNonEmpty(`${label}.resume_token_ref_or_null`, snapshot.resume_token_ref_or_null);
  } else if (snapshot.resume_token_ref_or_null !== null) {
    fail(`${label} non-resumable snapshot must clear resume token`, [
      "UPLOAD_RECOVERY_RESUME_TOKEN_DRIFT",
    ]);
  }
  if (snapshot.next_action_code === "RESUME_UPLOAD" && snapshot.resumability_state !== "RESUMABLE") {
    fail(`${label} RESUME_UPLOAD requires RESUMABLE`, [
      "UPLOAD_RECOVERY_RESUMABILITY_DRIFT",
    ]);
  }
  if (
    snapshot.next_action_code === "CONFIRM_ATTACHMENT" &&
    snapshot.attachment_state !== "CONFIRMATION_REQUIRED"
  ) {
    fail(`${label} CONFIRM_ATTACHMENT requires confirmation posture`, [
      "UPLOAD_RECOVERY_ATTACHMENT_ACTION_DRIFT",
    ]);
  }
  if (
    snapshot.next_action_code === "RECONFIRM_REQUEST" &&
    snapshot.attachment_state !== "REBIND_REQUIRED"
  ) {
    fail(`${label} RECONFIRM_REQUEST requires rebind posture`, [
      "UPLOAD_RECOVERY_REBIND_ACTION_DRIFT",
    ]);
  }
  if (snapshot.attachment_state === "ATTACHED") {
    assertNonEmpty(`${label}.attached_document_ref_or_null`, snapshot.attached_document_ref_or_null);
    assertNonEmpty(
      `${label}.attachment_confirmed_at_or_null`,
      snapshot.attachment_confirmed_at_or_null,
    );
    if (
      snapshot.next_action_code !== "NONE" ||
      snapshot.upload_confidence_score < 85 ||
      snapshot.request_binding_state === "RECONFIRMATION_REQUIRED" ||
      snapshot.request_binding_state === "SUPERSEDED"
    ) {
      fail(`${label} attached posture requires current binding and no next action`, [
        "UPLOAD_RECOVERY_ATTACHED_POSTURE_INVALID",
      ]);
    }
  }
}

function assertCaseIdentity(caseEntry: UploadSessionRecoveryHarnessHarnessCase) {
  for (const field of [
    "upload_session_id",
    "storage_ref",
    "tenant_id",
    "client_id",
    "request_id",
    "frozen_request_version_ref",
  ] as const) {
    if (caseEntry.pre_session[field] !== caseEntry.post_session[field]) {
      fail(`${caseEntry.scenario_code} changed ${field}`, [
        "UPLOAD_RECOVERY_FROZEN_IDENTITY_DRIFT",
      ]);
    }
  }
}

function assertProjection(caseEntry: UploadSessionRecoveryHarnessHarnessCase) {
  if (caseEntry.post_request_projection.request_id !== caseEntry.post_session.request_id) {
    fail(`${caseEntry.scenario_code} request projection id drifted`, [
      "UPLOAD_RECOVERY_POST_REQUEST_ID_DRIFT",
    ]);
  }
  if (
    caseEntry.post_request_projection.request_version_ref !==
    caseEntry.post_session.live_request_version_ref
  ) {
    fail(`${caseEntry.scenario_code} request projection did not publish live version`, [
      "UPLOAD_RECOVERY_POST_REQUEST_VERSION_DRIFT",
    ]);
  }
  if (
    caseEntry.post_session.request_binding_state !== "ORIGINAL_CURRENT" &&
    caseEntry.post_session.request_binding_state !== "RECONFIRMED_CURRENT" &&
    caseEntry.post_request_projection.current_request_upload_ref_or_null !== null
  ) {
    fail(`${caseEntry.scenario_code} stale binding satisfied current request`, [
      "UPLOAD_RECOVERY_STALE_CURRENT_REF_DRIFT",
    ]);
  }
  if (
    caseEntry.expected_request_completion_state !== "READY_CURRENT_REQUEST_SATISFIED" &&
    caseEntry.post_request_projection.current_request_upload_ref_or_null !== null
  ) {
    fail(`${caseEntry.scenario_code} non-ready case published current request upload`, [
      "UPLOAD_RECOVERY_PREMATURE_CURRENT_REF",
    ]);
  }
}

function assertScenario(
  caseEntry: UploadSessionRecoveryHarnessHarnessCase,
  scenarioCode: UploadSessionRecoveryHarnessScenarioCode,
) {
  const expectedCompletion: UploadSessionRecoveryHarnessCompletionState =
    expectedUploadRecoveryCompletionByScenario[scenarioCode];
  if (caseEntry.expected_request_completion_state !== expectedCompletion) {
    fail(`${scenarioCode} expected completion state drifted`, [
      "UPLOAD_RECOVERY_COMPLETION_STATE_DRIFT",
    ]);
  }
  if (scenarioCode === "MOBILE_RECONNECT") {
    if (
      caseEntry.entry_surface_class !== "MOBILE" ||
      caseEntry.resume_surface_class !== "MOBILE" ||
      caseEntry.post_session.next_action_code !== "RESUME_UPLOAD"
    ) {
      fail("MOBILE_RECONNECT must remain same-mobile resumable", [
        "UPLOAD_RECOVERY_MOBILE_RECONNECT_DRIFT",
      ]);
    }
  }
  if (scenarioCode === "BROWSER_RELOAD") {
    if (
      caseEntry.entry_surface_class !== "BROWSER" ||
      caseEntry.resume_surface_class !== "BROWSER" ||
      caseEntry.post_session.transfer_state !== "SCANNING"
    ) {
      fail("BROWSER_RELOAD must remain browser scanning posture", [
        "UPLOAD_RECOVERY_BROWSER_RELOAD_DRIFT",
      ]);
    }
  }
  if (scenarioCode === "STALE_REQUEST_REBASE") {
    if (
      caseEntry.post_session.frozen_request_version_ref ===
        caseEntry.post_session.live_request_version_ref ||
      caseEntry.post_session.next_action_code !== "RECONFIRM_REQUEST" ||
      caseEntry.post_request_projection.current_request_upload_ref_or_null !== null
    ) {
      fail("STALE_REQUEST_REBASE must preserve frozen identity and clear current ref", [
        "UPLOAD_RECOVERY_STALE_REBASE_DRIFT",
      ]);
    }
  }
  if (scenarioCode === "DUPLICATE_ALLOCATION_RETRY") {
    if (
      caseEntry.duplicate_session_created !== false ||
      caseEntry.duplicate_storage_ref_created !== false ||
      !["QUEUED", "UPLOADING"].includes(caseEntry.post_session.transfer_state)
    ) {
      fail("DUPLICATE_ALLOCATION_RETRY must reuse the in-flight session", [
        "UPLOAD_RECOVERY_DUPLICATE_RETRY_DRIFT",
      ]);
    }
  }
  if (scenarioCode === "CHECKSUM_OR_SCANNER_DELAY") {
    if (
      caseEntry.post_session.bytes_transferred !== caseEntry.post_session.byte_count ||
      caseEntry.post_session.attachment_state === "ATTACHED" ||
      caseEntry.post_request_projection.current_request_upload_ref_or_null !== null
    ) {
      fail("CHECKSUM_OR_SCANNER_DELAY must keep full bytes not-ready", [
        "UPLOAD_RECOVERY_SCANNER_DELAY_DRIFT",
      ]);
    }
  }
  if (scenarioCode === "ATTACHMENT_CONFIRMATION") {
    if (
      caseEntry.pre_session.next_action_code !== "CONFIRM_ATTACHMENT" ||
      caseEntry.post_session.attachment_state !== "ATTACHED" ||
      caseEntry.post_request_projection.current_request_upload_ref_or_null !==
        caseEntry.post_session.upload_session_id
    ) {
      fail("ATTACHMENT_CONFIRMATION must be the only ready-current path", [
        "UPLOAD_RECOVERY_ATTACHMENT_CONFIRMATION_DRIFT",
      ]);
    }
  }
  if (scenarioCode === "CROSS_DEVICE_CONTINUATION") {
    if (
      caseEntry.entry_surface_class === caseEntry.resume_surface_class ||
      caseEntry.post_session.next_action_code !== "RESUME_UPLOAD" ||
      caseEntry.duplicate_session_created !== false ||
      caseEntry.duplicate_storage_ref_created !== false
    ) {
      fail("CROSS_DEVICE_CONTINUATION must switch surfaces and reuse identity", [
        "UPLOAD_RECOVERY_CROSS_DEVICE_DRIFT",
      ]);
    }
  }
}

export function assertUploadRecoveryInvariants(
  harness: UploadSessionRecoveryHarness,
): UploadSessionRecoveryHarness {
  if (harness.contract_version !== "UPLOAD_SESSION_RECOVERY_HARNESS_V1") {
    fail("upload recovery harness contract version drifted", [
      "UPLOAD_RECOVERY_TOP_LEVEL_DRIFT",
    ]);
  }
  if (!Number.isInteger(harness.deterministic_seed) || harness.deterministic_seed < 0) {
    fail("deterministic_seed must be a non-negative integer", [
      "UPLOAD_RECOVERY_SEED_INVALID",
    ]);
  }
  if (harness.cases.length !== requiredUploadRecoveryScenarios.length) {
    fail("upload recovery harness must cover exactly the required scenario matrix", [
      "UPLOAD_RECOVERY_CASE_MATRIX_DRIFT",
    ]);
  }
  const seen = new Set<UploadSessionRecoveryHarnessScenarioCode>();
  for (const caseEntry of harness.cases) {
    assertNonEmpty("case_id", caseEntry.case_id);
    assertSnapshot(caseEntry.pre_session, `${caseEntry.case_id}.pre_session`);
    assertSnapshot(caseEntry.post_session, `${caseEntry.case_id}.post_session`);
    assertCaseIdentity(caseEntry);
    assertProjection(caseEntry);
    assertScenario(caseEntry, caseEntry.scenario_code);
    if (seen.has(caseEntry.scenario_code)) {
      fail(`${caseEntry.scenario_code} appeared more than once`, [
        "UPLOAD_RECOVERY_DUPLICATE_SCENARIO",
      ]);
    }
    seen.add(caseEntry.scenario_code);
  }
  for (const scenarioCode of requiredUploadRecoveryScenarios) {
    if (!seen.has(scenarioCode)) {
      fail(`${scenarioCode} is missing from upload recovery harness`, [
        "UPLOAD_RECOVERY_SCENARIO_MISSING",
      ]);
    }
  }
  return harness;
}
