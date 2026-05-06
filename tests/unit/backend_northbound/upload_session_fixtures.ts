import type { NorthboundActorContext } from "../../../apps/control-plane-api/src/northbound/policy.ts";
import {
  buildUploadBlobChecksumPlan,
  ClientUploadSessionRepository,
} from "../../../packages/backend-northbound/src/index.ts";

export const uploadTenantId = "tenant.taxat-upload";
export const uploadClientId = "client.taxat-upload";
export const uploadRequestId = "request.upload.bank-statement";
export const uploadRequestIdentityRef = uploadRequestId;
export const uploadRequestVersionV1 = "request-version.bank-statement.v1";
export const uploadRequestVersionV2 = "request-version.bank-statement.v2";
export const uploadFixedNow = new Date("2026-05-04T09:00:00Z");

export const uploadActorContext = {
  client_id_or_null: uploadClientId,
  principal_ref: "principal.client-upload",
  session_ref: "session.client-upload",
  tenant_id: uploadTenantId,
} satisfies NorthboundActorContext;

const encoder = new TextEncoder();

export function uploadChunks() {
  return [encoder.encode("ABCD"), encoder.encode("EFGH"), encoder.encode("IJKL")];
}

export async function uploadAllocationBody() {
  const chunks = uploadChunks();
  const checksumPlan = await buildUploadBlobChecksumPlan({
    chunks,
  });
  return {
    byte_count: chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0),
    capture_mode: "BROWSE",
    checksum: checksumPlan.checksum,
    checksum_algorithm_ref: "SHA256_CHUNK_HEX_V1",
    chunk_size_bytes: 4,
    client_id: uploadClientId,
    filename: "bank-statement.pdf",
    media_type: "application/pdf",
    request_id: uploadRequestId,
    request_identity_ref: uploadRequestIdentityRef,
    request_version_ref: uploadRequestVersionV1,
    surface_class: "DESKTOP",
    tenant_id: uploadTenantId,
  };
}

export async function uploadSessionRepositoryFixture() {
  return {
    repository: new ClientUploadSessionRepository(),
  };
}
