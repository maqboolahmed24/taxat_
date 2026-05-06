import type { ClientPortalUploadSessionRecord } from "../types.ts";
import { validateUploadSessionChronologyAndScope } from "./validate_upload_session_chronology_and_scope.ts";

export type UploadRecoverySurfaceClass = "BROWSER" | "DESKTOP" | "MOBILE";

export type CrossDeviceResumePolicy = {
  client_id: string;
  continuation_allowed: boolean;
  contract_version: "CROSS_DEVICE_UPLOAD_RESUME_POLICY_V1";
  cross_device_resume_policy: "CROSS_DEVICE_RESUME_REUSES_EXISTING_SESSION";
  duplicate_session_created: false;
  duplicate_storage_ref_created: false;
  entry_surface_class: UploadRecoverySurfaceClass;
  frozen_request_version_ref: string;
  governed_session_reuse_required: true;
  reason_codes: string[];
  request_id: string;
  resume_identity_policy: "RESUME_EXISTING_SESSION_ONLY";
  resume_surface_class: UploadRecoverySurfaceClass;
  storage_ref: string;
  tenant_id: string;
  upload_session_id: string;
  visibility_partition_policy: "TENANT_CLIENT_REQUEST_SCOPE_MUST_MATCH";
};

export function deriveCrossDeviceResumePolicy(input: {
  entrySurfaceClass: UploadRecoverySurfaceClass;
  postSession: ClientPortalUploadSessionRecord;
  preSession: ClientPortalUploadSessionRecord;
  resumeSurfaceClass: UploadRecoverySurfaceClass;
}): CrossDeviceResumePolicy {
  const pre = validateUploadSessionChronologyAndScope(input.preSession);
  const post = validateUploadSessionChronologyAndScope(input.postSession);
  const identityPreserved =
    pre.upload_session_id === post.upload_session_id &&
    pre.storage_ref === post.storage_ref &&
    pre.tenant_id === post.tenant_id &&
    pre.client_id === post.client_id &&
    pre.request_id === post.request_id &&
    pre.request_version_ref === post.request_version_ref;
  const policyAllowsReuse =
    post.upload_request_binding_contract.resume_identity_policy ===
      "RESUME_EXISTING_SESSION_ONLY" &&
    post.upload_request_binding_contract.cross_device_resume_policy ===
      "CROSS_DEVICE_RESUME_REUSES_EXISTING_SESSION";
  const surfaceChanged = input.entrySurfaceClass !== input.resumeSurfaceClass;
  const continuationAllowed =
    identityPreserved &&
    policyAllowsReuse &&
    surfaceChanged &&
    post.resumability_state === "RESUMABLE" &&
    post.next_action_code === "RESUME_UPLOAD";

  return {
    client_id: post.client_id,
    continuation_allowed: continuationAllowed,
    contract_version: "CROSS_DEVICE_UPLOAD_RESUME_POLICY_V1",
    cross_device_resume_policy: "CROSS_DEVICE_RESUME_REUSES_EXISTING_SESSION",
    duplicate_session_created: false,
    duplicate_storage_ref_created: false,
    entry_surface_class: input.entrySurfaceClass,
    frozen_request_version_ref: post.request_version_ref,
    governed_session_reuse_required: true,
    reason_codes: continuationAllowed
      ? ["CROSS_DEVICE_SESSION_REUSE_CONFIRMED"]
      : [
          ...(!identityPreserved ? ["CROSS_DEVICE_IDENTITY_DRIFT"] : []),
          ...(!policyAllowsReuse ? ["CROSS_DEVICE_POLICY_DRIFT"] : []),
          ...(!surfaceChanged ? ["CROSS_DEVICE_SURFACE_NOT_CHANGED"] : []),
          ...(post.resumability_state !== "RESUMABLE"
            ? ["CROSS_DEVICE_SESSION_NOT_RESUMABLE"]
            : []),
        ],
    request_id: post.request_id,
    resume_identity_policy: "RESUME_EXISTING_SESSION_ONLY",
    resume_surface_class: input.resumeSurfaceClass,
    storage_ref: post.storage_ref,
    tenant_id: post.tenant_id,
    upload_session_id: post.upload_session_id,
    visibility_partition_policy: "TENANT_CLIENT_REQUEST_SCOPE_MUST_MATCH",
  };
}
