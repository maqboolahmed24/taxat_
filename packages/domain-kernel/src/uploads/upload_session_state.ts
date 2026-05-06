import type {
  ClientUploadSession,
  ISO8601DateTimeString,
} from "../../../generated-models/src/generated/typescript/index.ts";

export type NullableUploadDateField =
  | "attachment_confirmed_at"
  | "finalized_at"
  | "reconfirmed_at"
  | "scan_completed_at"
  | "validation_completed_at";

export type GovernedUploadSession = Omit<ClientUploadSession, NullableUploadDateField> & {
  attachment_confirmed_at: ISO8601DateTimeString | null;
  finalized_at: ISO8601DateTimeString | null;
  reconfirmed_at: ISO8601DateTimeString | null;
  scan_completed_at: ISO8601DateTimeString | null;
  validation_completed_at: ISO8601DateTimeString | null;
};

export type UploadAttachmentState = GovernedUploadSession["attachment_state"];
export type UploadCaptureMode = GovernedUploadSession["capture_mode"];
export type UploadIntegrityState = GovernedUploadSession["integrity_state"];
export type UploadMalwareScanState = GovernedUploadSession["malware_scan_state"];
export type UploadNextActionCode = GovernedUploadSession["next_action_code"];
export type UploadRecoveryPosture = GovernedUploadSession["recovery_posture"];
export type UploadResumabilityState = GovernedUploadSession["resumability_state"];
export type UploadSurfaceClass = GovernedUploadSession["surface_class"];
export type UploadTransferState = GovernedUploadSession["transfer_state"];
export type UploadValidationState = GovernedUploadSession["validation_state"];
