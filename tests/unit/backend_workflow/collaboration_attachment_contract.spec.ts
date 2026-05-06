import { expect, test } from "@playwright/test";

import {
  CollaborationAttachmentRepository,
  deriveAttachmentDownloadPosture,
  publishCollaborationAttachment,
  transitionCollaborationAttachmentState,
  WorkflowModelError,
} from "../../../packages/backend-workflow/src/index.ts";

const stagedUpload = {
  byte_size: 2048,
  checksum: "sha256:abc0148",
  filename: "vat-evidence.pdf",
  item_id: "workflow-item-attachment-0148",
  media_type: "application/pdf",
  request_binding_state: "ORIGINAL_CURRENT" as const,
  request_info_ref: "request-info://workflow-item-attachment-0148/1",
  storage_ref: "storage://staged/vat-evidence",
  uploaded_at: "2026-04-30T09:00:00Z",
  uploaded_by_ref: "client://client-0148",
  upload_session_id: "upload-session-0148",
  visibility_class: "CUSTOMER_VISIBLE" as const,
};

test("publishes staged upload as a non-downloadable pending-scan attachment", async () => {
  const repository = new CollaborationAttachmentRepository();
  const attachment = await publishCollaborationAttachment({
    published_at: "2026-04-30T09:05:00Z",
    published_entry_ref: "collaboration-entry://attachment-publish",
    repository,
    retention_class: "CUSTOMER_DOCUMENT",
    staged_upload: stagedUpload,
    state_audit_event_ref: "audit://attachment/publish",
  });

  expect(attachment.publication_state).toBe("PENDING_SCAN");
  expect(attachment.download_state).toBe("PENDING");
  expect(attachment.download_ref).toBeNull();
  expect(attachment.unavailable_reason_code).toBe("SCAN_PENDING");
  expect(attachment.storage_ref).toBe("storage://staged/vat-evidence");
});

test("derives downloadability from scan posture, not storage presence", () => {
  expect(() =>
    deriveAttachmentDownloadPosture({
      download_ref: "download://too-early",
      malware_scan_state: "PENDING",
    }),
  ).toThrow(WorkflowModelError);

  const downloadable = deriveAttachmentDownloadPosture({
    download_ref: "download://vat-evidence",
    malware_scan_state: "CLEAN",
    scan_completed_at: "2026-04-30T09:10:00Z",
  });
  expect(downloadable.publication_state).toBe("AVAILABLE");
  expect(downloadable.download_state).toBe("DOWNLOADABLE");
});

test("transitions clean scans to downloadable and quarantines to typed unavailable posture", async () => {
  const repository = new CollaborationAttachmentRepository();
  const pending = await publishCollaborationAttachment({
    published_at: "2026-04-30T09:05:00Z",
    published_entry_ref: "collaboration-entry://attachment-publish",
    repository,
    retention_class: "CUSTOMER_DOCUMENT",
    staged_upload: stagedUpload,
    state_audit_event_ref: "audit://attachment/publish",
  });

  const available = await transitionCollaborationAttachmentState({
    attachment_id: pending.attachment_id,
    current_state_entry_ref: "collaboration-entry://attachment-clean",
    download_ref: "download://vat-evidence",
    malware_scan_state: "CLEAN",
    repository,
    scan_completed_at: "2026-04-30T09:10:00Z",
    state_audit_event_ref: "audit://attachment/clean",
    state_changed_at: "2026-04-30T09:11:00Z",
  });
  expect(available.publication_state).toBe("AVAILABLE");
  expect(available.download_ref).toBe("download://vat-evidence");

  const quarantined = await transitionCollaborationAttachmentState({
    attachment_id: pending.attachment_id,
    current_state_entry_ref: "collaboration-entry://attachment-quarantine",
    malware_scan_state: "QUARANTINED",
    repository,
    scan_completed_at: "2026-04-30T09:12:00Z",
    state_audit_event_ref: "audit://attachment/quarantine",
    state_changed_at: "2026-04-30T09:13:00Z",
  });
  expect(quarantined.publication_state).toBe("QUARANTINED");
  expect(quarantined.download_ref).toBeNull();
  expect(quarantined.unavailable_reason_code).toBe("QUARANTINED_BY_MALWARE_SCAN");
  expect(quarantined.current_state_entry_ref).not.toBe(quarantined.published_entry_ref);
});

test("fails closed on visibility copy-mode contradictions and stale upload binding", async () => {
  const repository = new CollaborationAttachmentRepository();
  await expect(
    publishCollaborationAttachment({
      published_at: "2026-04-30T09:05:00Z",
      published_entry_ref: "collaboration-entry://attachment-internal-copy",
      publish_copy_mode: "CUSTOMER_SAFE_COPY",
      repository,
      retention_class: "INTERNAL_WORKPAPER",
      source_attachment_ref: "collaboration-attachment://source",
      staged_upload: {
        ...stagedUpload,
        request_binding_state: "RECONFIRMATION_REQUIRED" as never,
        request_info_ref: null,
        upload_session_id: "upload-session-internal-copy",
        visibility_class: "INTERNAL_ONLY",
      },
      state_audit_event_ref: "audit://attachment/internal-copy",
    }),
  ).rejects.toThrow(WorkflowModelError);
});
