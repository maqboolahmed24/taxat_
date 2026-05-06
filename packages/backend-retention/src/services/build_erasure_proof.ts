import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";
import {
  assertNonEmptyRetentionString,
  assertRetention,
} from "../models/retention_tag.ts";
import type { ErasureEligibilityDecision } from "./derive_erasure_eligibility.ts";

export type ErasureProofRecord = {
  erasure_proof_id: string;
  manifest_id: string;
  target_ref: string;
  erasure_action_ref: string;
  proof_hash: string;
  created_at: string;
};

export type ErasureProofPreimage = {
  action_completed_at: string;
  action_result_ref: string;
  decision: ErasureEligibilityDecision;
  erasure_action_ref: string;
  erasure_request_ref: string;
  manifest_id: string;
  target_ref: string;
};

export type BuildErasureProofInput = {
  action_completed_at: string;
  action_result_ref: string;
  created_at: string;
  decision: ErasureEligibilityDecision;
  erasure_action_ref: string;
  erasure_request_ref: string;
  manifest_id: string;
  target_ref: string;
};

export type BuiltErasureProof = {
  erasure_proof: ErasureProofRecord;
  proof_preimage: ErasureProofPreimage;
};

export function normalizeErasureProof(proof: ErasureProofRecord): ErasureProofRecord {
  const normalized = {
    erasure_proof_id: assertNonEmptyRetentionString(
      "erasure_proof_id",
      proof.erasure_proof_id,
    ),
    manifest_id: assertNonEmptyRetentionString("manifest_id", proof.manifest_id),
    target_ref: assertNonEmptyRetentionString("target_ref", proof.target_ref),
    erasure_action_ref: assertNonEmptyRetentionString(
      "erasure_action_ref",
      proof.erasure_action_ref,
    ),
    proof_hash: assertNonEmptyRetentionString("proof_hash", proof.proof_hash),
    created_at: normalizeUtcInstantString(proof.created_at),
  };
  return normalized;
}

export function buildErasureProof(input: BuildErasureProofInput): BuiltErasureProof {
  const createdAt = normalizeUtcInstantString(input.created_at);
  const actionCompletedAt = normalizeUtcInstantString(input.action_completed_at);
  assertRetention(
    Date.parse(createdAt) >= Date.parse(actionCompletedAt),
    "RETENTION_CHRONOLOGY_INVALID",
    "ErasureProof.created_at must not predate the durable action result",
  );
  assertRetention(
    input.decision.lawful_action === "DELETE" || input.decision.lawful_action === "PSEUDONYMISE",
    "RETENTION_FIELD_INVALID",
    "ErasureProof can only be built for delete or pseudonymise decisions",
  );

  const proofPreimage: ErasureProofPreimage = {
    action_completed_at: actionCompletedAt,
    action_result_ref: assertNonEmptyRetentionString(
      "action_result_ref",
      input.action_result_ref,
    ),
    decision: input.decision,
    erasure_action_ref: assertNonEmptyRetentionString(
      "erasure_action_ref",
      input.erasure_action_ref,
    ),
    erasure_request_ref: assertNonEmptyRetentionString(
      "erasure_request_ref",
      input.erasure_request_ref,
    ),
    manifest_id: assertNonEmptyRetentionString("manifest_id", input.manifest_id),
    target_ref: assertNonEmptyRetentionString("target_ref", input.target_ref),
  };
  const proofHash = `erasure-proof-hash://${stableJsonHash(proofPreimage)}`;

  return {
    erasure_proof: normalizeErasureProof({
      erasure_proof_id: `erasure-proof://${stableJsonHash({
        erasure_action_ref: proofPreimage.erasure_action_ref,
        proof_hash: proofHash,
      })}`,
      manifest_id: proofPreimage.manifest_id,
      target_ref: proofPreimage.target_ref,
      erasure_action_ref: proofPreimage.erasure_action_ref,
      proof_hash: proofHash,
      created_at: createdAt,
    }),
    proof_preimage: proofPreimage,
  };
}
