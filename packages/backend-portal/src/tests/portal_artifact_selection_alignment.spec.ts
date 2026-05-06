import { expect, test } from "@playwright/test";

import { validateContractSchema } from "../../../../tests/unit/backend_northbound/audit_and_enquiry_fixtures.ts";
import {
  buildClientApprovalCenterPack,
  buildClientDocumentRequest,
  buildClientPortalWorkspace,
  buildDocumentRequestCard,
  projectRequestUploadRows,
  validateArtifactTargetAlignment,
  type BuildClientApprovalPackInput,
} from "../index.ts";

const basePortalInput = {
  accessBindingHash: "access.portal.artifact-test",
  clientId: "client.portal.artifact-test",
  maskingPostureFingerprint: "mask.portal.artifact-test",
  tenantId: "tenant.portal.artifact-test",
  visibilityCachePartitionKey: "visibility.portal.artifact-test",
};

function languageContract() {
  return buildClientPortalWorkspace({ includeOnboarding: false }).language_contract as Record<
    string,
    unknown
  >;
}

function baseApprovalPackInput(): BuildClientApprovalPackInput {
  return {
    accessBindingHash: "access.portal.approval-artifact-test",
    acknowledgedAt: "2026-05-04T09:07:00.000Z",
    approvalPackHash: "approval.artifact.hash.v1",
    approvalPackId: "approval.artifact.pack.v1",
    changeDigestAcknowledgedAt: "2026-05-04T09:05:00.000Z",
    changeDigestSummary: "One declaration is ready for your review.",
    changeHighlightCount: 1,
    changeHighlightsRef: "copy.approval-artifact.change-highlights",
    clientId: "client.portal.approval-artifact-test",
    declarationAcknowledgedAt: "2026-05-04T09:06:00.000Z",
    declarationDownloadRef: "artifact.declaration.v1.download",
    declarationPrintRef: "artifact.declaration.v1.print",
    declarationTextRef: "copy.declaration.v1",
    dueAt: "2026-05-10T12:00:00.000Z",
    languageContract: languageContract(),
    latestApprovalPackHash: "approval.artifact.hash.v1",
    latestViewGuardRef: "view.guard.approval-artifact.v1",
    lifecycleState: "ACKNOWLEDGED",
    maskingPostureFingerprint: "mask.portal.approval-artifact-test",
    now: "2026-05-04T09:08:00.000Z",
    requiresStepUp: true,
    stateChangedAt: "2026-05-04T09:08:00.000Z",
    stepUpExpiresAt: "2026-05-04T09:18:00.000Z",
    stepUpVerifiedAt: "2026-05-04T09:08:00.000Z",
    summary: "Please review and sign the declaration.",
    summaryRef: "copy.approval-artifact.summary",
    tenantId: "tenant.portal.approval-artifact-test",
    title: "Tax declaration approval",
    viewGuardRef: "view.guard.approval-artifact.v1",
    viewedAt: "2026-05-04T09:00:00.000Z",
    visibilityCachePartitionKey: "visibility.portal.approval-artifact-test",
  };
}

test("keeps download-only document artifacts current while clearing same-shell preview", async () => {
  const uploads = projectRequestUploadRows({
    ...basePortalInput,
    currentArtifactUploadRefOrNull: "upload.accounts.current",
    currentRequestUploadRefOrNull: "upload.accounts.current",
    requestId: "request.accounts",
    requestLifecycleState: "UNDER_REVIEW",
    requestVersionRef: "request.accounts.v2",
    uploads: [
      {
        attachment_state: "CONFIRMATION_REQUIRED",
        filename: "accounts.zip",
        media_type: "application/zip",
        next_action_code: "CONFIRM_ATTACHMENT",
        recovery_posture: "NONE",
        request_binding_state: "ORIGINAL_CURRENT",
        request_id: "request.accounts",
        request_version_ref: "request.accounts.v2",
        resumability_state: "CLOSED",
        transfer_state: "ACCEPTED",
        upload_confidence_score: 92,
        upload_session_id: "upload.accounts.current",
        uploaded_at: "2026-05-04T08:00:00.000Z",
      },
      {
        attachment_state: "STAGED",
        filename: "accounts-old.zip",
        media_type: "application/zip",
        next_action_code: "UPLOAD_REPLACEMENT",
        recovery_posture: "HARD_RESET_REQUIRED",
        request_binding_state: "SUPERSEDED",
        request_id: "request.accounts",
        request_version_ref: "request.accounts.v1",
        resumability_state: "CLOSED",
        transfer_state: "REJECTED",
        upload_confidence_score: 0,
        upload_session_id: "upload.accounts.rejected",
        uploaded_at: "2026-05-03T08:00:00.000Z",
      },
    ],
  });
  const request = buildClientDocumentRequest({
    ...basePortalInput,
    category: "OTHER",
    currentRequestUploadRefOrNull: "upload.accounts.current",
    descriptionRef: "copy.request.accounts.description",
    dueAt: "2026-05-10T12:00:00.000Z",
    languageContract: languageContract(),
    lifecycleState: "UNDER_REVIEW",
    requestId: "request.accounts",
    requestVersionRef: "request.accounts.v2",
    requestedFileTypes: ["application/zip"],
    title: "Accounts backup",
    uploads,
  });
  const card = buildDocumentRequestCard({
    acceptedFileTypes: ["application/zip"],
    ...basePortalInput,
    clientRequest: request,
    currentArtifactUploadRefOrNull: "upload.accounts.current",
    dueLabel: "Due 10 May 2026",
    maxFileSizeMb: 25,
    uploads,
    whyRequestedLabel: "We need the accounting export.",
  });

  expect(card.artifact_selection.default_preview_target_ref_or_null).toBeNull();
  expect(card.artifact_selection.default_download_target_ref_or_null).toBe(
    "artifact.upload.accounts.current.download",
  );
  expect(card.artifact_affordance.default_preview_target_ref_or_null).toBeNull();
  expect(card.externalization_governance_contract.download_target_ref_or_null).toBe(
    "artifact.upload.accounts.current.download",
  );
  expect(card.externalization_governance_contract.external_handoff_target_ref_or_null).toBeNull();
  expect(card.artifact_selection.historical_subject_refs).toEqual(["upload.accounts.rejected"]);
  validateArtifactTargetAlignment({
    artifactAffordance: card.artifact_affordance,
    artifactSelection: card.artifact_selection,
    externalizationGovernanceContract: card.externalization_governance_contract,
  });
  await validateContractSchema("artifact_selection_contract", card.artifact_selection);
  await validateContractSchema("artifact_affordance_contract", card.artifact_affordance);
  await validateContractSchema(
    "externalization_governance_contract",
    card.externalization_governance_contract,
  );
});

test("keeps declaration exports distinct from issued receipt exports in approval routes", async () => {
  const pending = buildClientApprovalCenterPack(baseApprovalPackInput());
  expect(pending.artifact_selection.default_preview_target_ref_or_null).toBe("copy.declaration.v1");
  expect(pending.artifact_selection.default_download_target_ref_or_null).toBe(
    "artifact.declaration.v1.download",
  );
  expect(pending.artifact_selection.default_print_target_ref_or_null).toBe(
    "artifact.declaration.v1.print",
  );
  expect(pending.receipt_download_ref).toBeNull();
  validateArtifactTargetAlignment({
    artifactAffordance: pending.artifact_affordance,
    artifactSelection: pending.artifact_selection,
    externalizationGovernanceContract: pending.externalization_governance_contract,
  });

  const signed = buildClientApprovalCenterPack({
    ...baseApprovalPackInput(),
    lifecycleState: "SIGNED",
    receiptDownloadRef: "artifact.receipt.v1.download",
    receiptIssuedAt: "2026-05-04T09:10:00.000Z",
    receiptPrintRef: "artifact.receipt.v1.print",
    receiptRef: "approval.receipt.v1",
    signedAt: "2026-05-04T09:10:00.000Z",
    stateChangedAt: "2026-05-04T09:10:00.000Z",
  });
  expect(signed.artifact_selection.default_preview_target_ref_or_null).toBe(
    "copy.declaration.v1",
  );
  expect(signed.artifact_selection.default_download_target_ref_or_null).toBe(
    "artifact.receipt.v1.download",
  );
  expect(signed.artifact_selection.default_print_target_ref_or_null).toBe(
    "artifact.receipt.v1.print",
  );
  expect(signed.declaration_download_ref).not.toBe(signed.receipt_download_ref);
  expect(signed.externalization_governance_contract.download_target_ref_or_null).toBe(
    signed.receipt_download_ref,
  );
  validateArtifactTargetAlignment({
    artifactAffordance: signed.artifact_affordance,
    artifactSelection: signed.artifact_selection,
    externalizationGovernanceContract: signed.externalization_governance_contract,
  });
  await validateContractSchema("artifact_affordance_contract", signed.artifact_affordance);
  await validateContractSchema(
    "externalization_governance_contract",
    signed.externalization_governance_contract,
  );
});
