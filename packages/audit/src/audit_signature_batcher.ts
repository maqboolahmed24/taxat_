import { stableJsonHash } from "../../domain-kernel/src/primitives/hash.ts";
import { normalizeUtcInstantString } from "../../domain-kernel/src/primitives/time.ts";

import {
  type AuditFamilyRef,
  type AuditPolicyBundle,
  type AuditSignatureProfile,
  resolveSignatureProfile,
} from "./audit_visibility_and_retention.ts";

export type AuditSignatureBatchState = "PENDING" | "SIGNED" | "FAILED";

export type AuditSignatureBatchRecord = {
  audit_stream_ref: string;
  bucket_start_at: string;
  family_ref: AuditFamilyRef;
  failure_reason_code_or_null: string | null;
  signature_profile: AuditSignatureProfile;
  signature_ref: string;
  state: AuditSignatureBatchState;
};

function hourBucketStart(recordedAt: string) {
  const normalized = normalizeUtcInstantString(recordedAt);
  return `${normalized.slice(0, 13)}:00:00Z`;
}

export class AuditSignatureBatcher {
  private readonly batches = new Map<string, AuditSignatureBatchRecord>();
  private readonly policyBundle: AuditPolicyBundle;

  constructor(policyBundle: AuditPolicyBundle) {
    this.policyBundle = policyBundle;
  }

  reserveBatch(init: {
    auditStreamRef: string;
    familyRef: AuditFamilyRef;
    recordedAt: string;
  }) {
    const signatureProfile = resolveSignatureProfile(
      this.policyBundle.signaturePolicy,
      init.familyRef,
    );
    if (signatureProfile === "NONE") {
      return null;
    }

    const bucketStartAt = hourBucketStart(init.recordedAt);
    const signatureRef = `audit-signature.${stableJsonHash({
      audit_stream_ref: init.auditStreamRef,
      bucket_start_at: bucketStartAt,
      family_ref: init.familyRef,
    })}`;

    const existing = this.batches.get(signatureRef);
    if (existing) {
      return existing;
    }

    const created: AuditSignatureBatchRecord = {
      audit_stream_ref: init.auditStreamRef,
      bucket_start_at: bucketStartAt,
      failure_reason_code_or_null: null,
      family_ref: init.familyRef,
      signature_profile: signatureProfile,
      signature_ref: signatureRef,
      state: "PENDING",
    };
    this.batches.set(signatureRef, created);
    return created;
  }

  lookupBatch(signatureRef: string) {
    return this.batches.get(signatureRef) ?? null;
  }

  listBatches() {
    return [...this.batches.values()];
  }

  recordBatchOutcome(init: {
    failureReasonCodeOrNull?: string | null;
    signatureRef: string;
    state: AuditSignatureBatchState;
  }) {
    const batch = this.batches.get(init.signatureRef);
    if (!batch) {
      return null;
    }
    const updated: AuditSignatureBatchRecord = {
      ...batch,
      failure_reason_code_or_null:
        init.state === "FAILED" ? init.failureReasonCodeOrNull ?? null : null,
      state: init.state,
    };
    this.batches.set(init.signatureRef, updated);
    return updated;
  }
}
