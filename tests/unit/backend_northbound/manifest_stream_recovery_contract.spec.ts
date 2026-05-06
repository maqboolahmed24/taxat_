import { expect, test } from "@playwright/test";

import {
  buildManifestStreamRecoveryContract,
  issueManifestResumeToken,
  manifestResumeBindingFromActor,
} from "../../../packages/backend-northbound/src/index.ts";
import { actorContext } from "./post_commands_fixtures.ts";

test("resume tokens bind to manifest route, shell, session, access, masking, epoch, and frontier", () => {
  const actor = actorContext({
    access_binding_hash_or_null: "access-binding-1",
    masking_posture_fingerprint_or_null: "masking-1",
    principal_ref: "principal-1",
    session_ref: "session-1",
    tenant_id: "tenant-1",
  });
  const binding = manifestResumeBindingFromActor({
    actorContext: actor,
    frameEpoch: 3,
    lastPublishedSequence: 9,
    manifestId: "manifest-stream-binding",
    publicationGeneration: 5,
    shellRouteKey: "manifest-stream-binding",
    shellStabilityToken: "shell-token-1",
  });
  const first = issueManifestResumeToken({
    ...binding,
    issuedAt: "2026-05-03T10:00:00.000Z",
    nonce: "nonce-1",
  });
  const second = issueManifestResumeToken({
    ...binding,
    issuedAt: "2026-05-03T10:00:00.000Z",
    nonce: "nonce-2",
  });

  expect(first).toMatch(/^resume\.manifest\./);
  expect(second).toMatch(/^resume\.manifest\./);
  expect(second).not.toBe(first);
});

test("manifest stream recovery contract makes the raw token transport-only under grouped authority", () => {
  const contract = buildManifestStreamRecoveryContract({
    accessBindingHash: "access-binding-1",
    frameEpoch: 3,
    lastPublishedSequence: 9,
    manifestId: "manifest-stream-contract",
    maskingContextHash: "masking-1",
    publicationGeneration: 5,
    resumeToken: "resume-token-1",
    sessionBindingHash: "session-binding-1",
    sessionRef: "session-1",
    shellRouteKey: "manifest-stream-contract",
    shellStabilityToken: "shell-token-1",
  });

  expect(contract).toMatchObject({
    access_binding_hash: "access-binding-1",
    catch_up_policy: "CATCH_UP_BEFORE_LIVE",
    delivery_window_state: "LIVE_RESUMABLE",
    duplicate_delivery_policy: "IDEMPOTENT_BY_SCOPE_EPOCH_SEQUENCE",
    frame_epoch: 3,
    last_published_sequence: 9,
    masking_context_hash: "masking-1",
    publication_generation: 5,
    resume_binding_ref_or_null: "resume-token-1",
    resume_binding_representation: "RAW_TOKEN",
    resume_token_binding_mode: "EXACT_ROUTE_SESSION_SCOPE_MASKING",
    route_key: "manifest-stream-contract",
    sequence_application_policy: "STRICTLY_MONOTONIC_GAP_FREE_WITHIN_EPOCH",
    session_binding_hash: "session-binding-1",
    session_ref: "session-1",
    shell_stability_token: "shell-token-1",
    stream_scope_class: "MANIFEST_EXPERIENCE",
    subject_ref: "manifest-stream-contract",
  });
});
