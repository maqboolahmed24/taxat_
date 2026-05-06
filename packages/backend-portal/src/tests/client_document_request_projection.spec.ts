import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { expect, test } from "@playwright/test";

import { validateContractSchema } from "../../../../tests/unit/backend_northbound/audit_and_enquiry_fixtures.ts";
import {
  buildClientDocumentRequest,
  buildClientPortalWorkspace,
  buildDocumentCenter,
  buildDocumentRequestCard,
  ClientDocumentRequestProjectionError,
  projectRequestUploadRows,
} from "../index.ts";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

async function validateJsonSchemaOnly(kind: string, payload: unknown) {
  const script = `
import json
import pathlib
import sys

repo = pathlib.Path(sys.argv[1])
sys.path.insert(0, str(repo / "packages" / "contracts-core" / "python"))
from validate_contracts import Draft202012Validator, build_registry, load_json  # type: ignore

kind = sys.argv[2]
payload = json.loads(sys.argv[3])
schema = load_json(repo / "packages" / "contracts-core" / "schemas" / f"{kind}.schema.json")
validator = Draft202012Validator(
    schema,
    registry=build_registry(),
    format_checker=Draft202012Validator.FORMAT_CHECKER,
)
issues = [
    f"schema:{'/'.join(map(str, error.absolute_path)) or '<root>'}: {error.message}"
    for error in sorted(validator.iter_errors(payload), key=lambda error: list(error.absolute_path))
]
if issues:
    raise SystemExit("\\n".join(issues))
`;
  await execFileAsync(path.join(repoRoot, ".venv", "bin", "python3"), [
    "-c",
    script,
    repoRoot,
    kind,
    JSON.stringify(payload),
  ]);
}

const basePortalInput = {
  accessBindingHash: "access.portal.client-2001",
  clientId: "client.taxpayer-2001",
  maskingPostureFingerprint: "mask.portal.full",
  tenantId: "tenant.taxat-sandbox",
  visibilityCachePartitionKey: "visibility.portal.client-2001",
};

function languageContract() {
  return buildClientPortalWorkspace().language_contract as Record<string, unknown>;
}

function identityUploads() {
  return projectRequestUploadRows({
    ...basePortalInput,
    currentArtifactUploadRefOrNull: "upload.identity.current",
    currentRequestUploadRefOrNull: "upload.identity.current",
    requestId: "request.identity",
    requestLifecycleState: "UNDER_REVIEW",
    requestVersionRef: "request.identity.v2",
    uploads: [
      {
        attachment_state: "CONFIRMATION_REQUIRED",
        filename: "passport.pdf",
        media_type: "application/pdf",
        next_action_code: "CONFIRM_ATTACHMENT",
        recovery_posture: "NONE",
        request_binding_state: "ORIGINAL_CURRENT",
        request_id: "request.identity",
        request_version_ref: "request.identity.v2",
        resumability_state: "CLOSED",
        transfer_state: "ACCEPTED",
        upload_confidence_score: 94,
        upload_session_id: "upload.identity.current",
        uploaded_at: "2026-05-03T09:40:00.000Z",
      },
      {
        attachment_state: "STAGED",
        dominant_hazard_code: "REPLACEMENT_REQUIRED",
        filename: "old-passport.jpg",
        media_type: "image/jpeg",
        next_action_code: "UPLOAD_REPLACEMENT",
        recovery_posture: "HARD_RESET_REQUIRED",
        request_binding_state: "SUPERSEDED",
        request_id: "request.identity",
        request_version_ref: "request.identity.v2",
        resumability_state: "CLOSED",
        transfer_state: "REJECTED",
        upload_confidence_score: 0,
        upload_session_id: "upload.identity.rejected",
        uploaded_at: "2026-05-02T15:10:00.000Z",
      },
    ],
  });
}

test("publishes a base ClientDocumentRequest with chronology separated from request satisfaction", async () => {
  const request = buildClientDocumentRequest({
    ...basePortalInput,
    category: "IDENTITY",
    currentRequestUploadRefOrNull: "upload.identity.current",
    descriptionRef: "copy.request.identity.description",
    dueAt: "2026-05-10T12:00:00.000Z",
    languageContract: languageContract(),
    lifecycleState: "UNDER_REVIEW",
    manifestId: "manifest.portal.2026",
    requestId: "request.identity",
    requestVersionRef: "request.identity.v2",
    requestedFileTypes: ["application/pdf", "image/jpeg"],
    title: "Photo ID",
    uploads: identityUploads(),
  });

  expect(request.latest_upload_ref).toBe("upload.identity.current");
  expect(request.current_request_upload_ref_or_null).toBe("upload.identity.current");
  expect(request.artifact_selection.historical_subject_refs).toEqual([
    "upload.identity.rejected",
  ]);
  expect(request.artifact_selection.default_download_target_ref_or_null).toBeNull();
  expect(request.externalization_governance_contract).toMatchObject({
    context_anchor_ref: "request.identity",
    eligibility_state: "READY",
    history_meaning_state: "CURRENT_WITH_HISTORY_EXPLICIT",
    slice_binding_ref: "request.identity.v2",
  });

  await validateContractSchema("client_document_request", request);
});

test("builds route request cards with current-upload and current-artifact pointers kept distinct", async () => {
  const currentRequest = buildClientDocumentRequest({
    ...basePortalInput,
    category: "IDENTITY",
    currentRequestUploadRefOrNull: "upload.identity.current",
    descriptionRef: "copy.request.identity.description",
    dueAt: "2026-05-10T12:00:00.000Z",
    languageContract: languageContract(),
    lifecycleState: "UNDER_REVIEW",
    requestId: "request.identity",
    requestVersionRef: "request.identity.v2",
    requestedFileTypes: ["application/pdf", "image/jpeg"],
    title: "Photo ID",
    uploads: identityUploads(),
  });
  const card = buildDocumentRequestCard({
    acceptedFileTypes: ["application/pdf", "image/jpeg"],
    ...basePortalInput,
    clientRequest: currentRequest,
    currentArtifactUploadRefOrNull: "upload.identity.current",
    dueLabel: "Due 10 May 2026",
    helpText: "Please use a clear scan or photo.",
    maxFileSizeMb: 25,
    uploads: identityUploads(),
    whyRequestedLabel: "We need to confirm your identity.",
  });

  expect(card.status).toBe("UNDER_REVIEW");
  expect(card.current_upload_ref).toBe("upload.identity.current");
  expect(card.current_artifact_upload_ref).toBe("upload.identity.current");
  expect(card.uploads.map((upload) => upload.history_state)).toEqual(["CURRENT", "REJECTED"]);
  expect(card.artifact_selection.default_preview_target_ref_or_null).toBe(
    "upload.identity.current",
  );
  expect(card.artifact_selection.default_download_target_ref_or_null).toBe(
    "artifact.upload.identity.current.download",
  );
  expect(card.externalization_governance_contract.download_target_ref_or_null).toBe(
    "artifact.upload.identity.current.download",
  );

  const rejectedCenter = buildDocumentCenter({
    ...basePortalInput,
    languageContract: languageContract(),
    requests: [
      {
        acceptedFileTypes: ["application/pdf"],
        category: "BANK_STATEMENT",
        currentArtifactUploadRefOrNull: "upload.bank.previous",
        currentRequestUploadRefOrNull: null,
        descriptionRef: "copy.request.bank.description",
        dueAt: "2026-05-12T12:00:00.000Z",
        dueLabel: "Due 12 May 2026",
        lifecycleState: "REJECTED",
        maxFileSizeMb: 25,
        requestId: "request.bank-statement",
        requestVersionRef: "request.bank-statement.v1",
        requestedFileTypes: ["application/pdf"],
        reviewOutcome: "Please upload a replacement statement.",
        title: "Bank statement",
        uploads: [
          {
            attachment_state: "STAGED",
            dominant_hazard_code: "REPLACEMENT_REQUIRED",
            filename: "statement-old.pdf",
            media_type: "application/pdf",
            next_action_code: "UPLOAD_REPLACEMENT",
            recovery_posture: "HARD_RESET_REQUIRED",
            request_binding_state: "ORIGINAL_CURRENT",
            request_id: "request.bank-statement",
            request_version_ref: "request.bank-statement.v1",
            resumability_state: "CLOSED",
            transfer_state: "REJECTED",
            upload_confidence_score: 0,
            upload_session_id: "upload.bank.rejected",
            uploaded_at: "2026-05-03T08:00:00.000Z",
          },
        ],
        whyRequestedLabel: "We need proof of the account.",
      },
    ],
  });

  expect(rejectedCenter.requests[0].status).toBe("REJECTED");
  expect(rejectedCenter.requests[0].current_upload_ref).toBe("upload.bank.rejected");
  expect(rejectedCenter.requests[0].current_artifact_upload_ref).toBeNull();
  expect(rejectedCenter.requests[0].artifact_selection.default_preview_target_ref_or_null).toBeNull();

  const workspace = {
    ...buildClientPortalWorkspace({ includeOnboarding: false, route: "DOCUMENTS" }),
    document_center: rejectedCenter,
  };
  await validateJsonSchemaOnly("client_portal_workspace", workspace);
});

test("surfaces limited history disclosure without pretending history is absent", async () => {
  const documentCenter = buildDocumentCenter({
    ...basePortalInput,
    languageContract: languageContract(),
    requests: [
      {
        acceptedFileTypes: ["application/pdf", "image/jpeg"],
        category: "IDENTITY",
        currentArtifactUploadRefOrNull: "upload.identity.current",
        currentRequestUploadRefOrNull: "upload.identity.current",
        descriptionRef: "copy.request.identity.description",
        dueAt: "2026-05-10T12:00:00.000Z",
        dueLabel: "Due 10 May 2026",
        historyDisclosureState: "LIMITED",
        lifecycleState: "UNDER_REVIEW",
        limitedHistoryCountOrNull: 3,
        maxFileSizeMb: 25,
        requestId: "request.identity",
        requestVersionRef: "request.identity.v2",
        requestedFileTypes: ["application/pdf", "image/jpeg"],
        title: "Photo ID",
        uploads: identityUploads(),
        whyRequestedLabel: "We need to confirm your identity.",
      },
    ],
  });

  expect(documentCenter.requests[0].artifact_selection.limited_history_state).toBe("LIMITED");
  expect(documentCenter.requests[0].artifact_selection.limited_history_count_or_null).toBe(3);
  expect(documentCenter.requests[0].artifact_affordance.history_affordance_state).toBe(
    "EXPLICIT_SECONDARY_LIMITED",
  );
  expect(
    documentCenter.requests[0].uploads.every((upload) => typeof upload.history_state === "string"),
  ).toBe(true);

  const workspace = {
    ...buildClientPortalWorkspace({ includeOnboarding: false, route: "DOCUMENTS" }),
    document_center: documentCenter,
  };
  await validateJsonSchemaOnly("client_portal_workspace", workspace);
});

test("clears withdrawn lineage and preserves expired due-window anchors", async () => {
  const withdrawn = buildClientDocumentRequest({
    ...basePortalInput,
    category: "OTHER",
    currentRequestUploadRefOrNull: "upload.withdrawn",
    descriptionRef: "copy.request.withdrawn.description",
    dueAt: null,
    languageContract: languageContract(),
    lifecycleState: "WITHDRAWN",
    requestId: "request.withdrawn",
    requestVersionRef: "request.withdrawn.v1",
    requestedFileTypes: ["application/pdf"],
    title: "Withdrawn request",
    uploads: [{ upload_session_id: "upload.withdrawn", uploaded_at: "2026-05-03T08:00:00.000Z" }],
  });
  expect(withdrawn.upload_refs).toEqual([]);
  expect(withdrawn.latest_upload_ref).toBeNull();
  expect(withdrawn.current_request_upload_ref_or_null).toBeNull();
  await validateContractSchema("client_document_request", withdrawn);

  const expired = buildClientDocumentRequest({
    ...basePortalInput,
    category: "BANK_STATEMENT",
    descriptionRef: "copy.request.expired.description",
    dueAt: "2026-05-01T12:00:00.000Z",
    languageContract: languageContract(),
    lifecycleState: "EXPIRED",
    requestId: "request.expired",
    requestVersionRef: "request.expired.v1",
    requestedFileTypes: ["application/pdf"],
    title: "Expired request",
  });
  expect(expired.due_at).toBe("2026-05-01T12:00:00.000Z");
  await validateContractSchema("client_document_request", expired);

  expect(() =>
    buildClientDocumentRequest({
      ...basePortalInput,
      category: "BANK_STATEMENT",
      descriptionRef: "copy.request.expired.description",
      dueAt: null,
      languageContract: languageContract(),
      lifecycleState: "EXPIRED",
      requestId: "request.expired",
      requestVersionRef: "request.expired.v1",
      requestedFileTypes: ["application/pdf"],
      title: "Expired request",
    }),
  ).toThrow(ClientDocumentRequestProjectionError);
});

test("fails closed on duplicate uploads and dangling request-card pointers", () => {
  expect(() =>
    projectRequestUploadRows({
      ...basePortalInput,
      currentRequestUploadRefOrNull: "upload.duplicate",
      requestId: "request.duplicate",
      requestLifecycleState: "UNDER_REVIEW",
      requestVersionRef: "request.duplicate.v1",
      uploads: [
        {
          attachment_state: "CONFIRMATION_REQUIRED",
          filename: "a.pdf",
          media_type: "application/pdf",
          next_action_code: "CONFIRM_ATTACHMENT",
          recovery_posture: "NONE",
          request_binding_state: "ORIGINAL_CURRENT",
          request_version_ref: "request.duplicate.v1",
          resumability_state: "CLOSED",
          transfer_state: "ACCEPTED",
          upload_confidence_score: 90,
          upload_session_id: "upload.duplicate",
          uploaded_at: "2026-05-03T08:00:00.000Z",
        },
        {
          attachment_state: "CONFIRMATION_REQUIRED",
          filename: "b.pdf",
          media_type: "application/pdf",
          next_action_code: "CONFIRM_ATTACHMENT",
          recovery_posture: "NONE",
          request_binding_state: "ORIGINAL_CURRENT",
          request_version_ref: "request.duplicate.v1",
          resumability_state: "CLOSED",
          transfer_state: "ACCEPTED",
          upload_confidence_score: 90,
          upload_session_id: "upload.duplicate",
          uploaded_at: "2026-05-03T08:01:00.000Z",
        },
      ],
    }),
  ).toThrow(ClientDocumentRequestProjectionError);

  const uploads = identityUploads();
  const request = buildClientDocumentRequest({
    ...basePortalInput,
    category: "IDENTITY",
    currentRequestUploadRefOrNull: "upload.identity.current",
    descriptionRef: "copy.request.identity.description",
    dueAt: "2026-05-10T12:00:00.000Z",
    languageContract: languageContract(),
    lifecycleState: "UNDER_REVIEW",
    requestId: "request.identity",
    requestVersionRef: "request.identity.v2",
    requestedFileTypes: ["application/pdf", "image/jpeg"],
    title: "Photo ID",
    uploads,
  });

  expect(() =>
    buildDocumentRequestCard({
      acceptedFileTypes: ["application/pdf", "image/jpeg"],
      ...basePortalInput,
      clientRequest: request,
      dueLabel: "Due 10 May 2026",
      maxFileSizeMb: 25,
      uploads: uploads.filter((upload) => upload.upload_session_id !== "upload.identity.current"),
      whyRequestedLabel: "We need to confirm your identity.",
    }),
  ).toThrow(ClientDocumentRequestProjectionError);
});
