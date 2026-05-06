import type { TelemetryResourceCorrelationContext } from "../../generated-models/src/generated/typescript/retention-failure-and-observability.ts";

import {
  type AuditFamilyRef,
  type AuditPolicyBundle,
  AuditPolicyError,
} from "./audit_visibility_and_retention.ts";

export type AuditStreamHead = {
  audit_stream_ref: string;
  continuity_state: "EMPTY" | "ACTIVE" | "BROKEN";
  last_audit_event_id_or_null: string | null;
  last_event_hash_or_null: string | null;
  last_recorded_at_or_null: string | null;
  stream_sequence: number;
};

const EMPTY_HEAD: Omit<AuditStreamHead, "audit_stream_ref"> = {
  continuity_state: "EMPTY",
  last_audit_event_id_or_null: null,
  last_event_hash_or_null: null,
  last_recorded_at_or_null: null,
  stream_sequence: 0,
};

function normalizeSegment(value: string) {
  return value.normalize("NFC").replace(/[^a-zA-Z0-9._-]+/g, "_");
}

function renderTemplate(template: string, params: Record<string, string>) {
  return template.replaceAll(/\{([^{}]+)\}/g, (_, key: string) => {
    const value = params[key];
    if (!value) {
      throw new AuditPolicyError({
        code: "AUDIT_POLICY_INVALID",
        detail: `missing audit stream template parameter ${key}`,
      });
    }
    return normalizeSegment(value);
  });
}

export function deriveAuditStreamRef(
  bundle: AuditPolicyBundle,
  init: {
    correlationContext: TelemetryResourceCorrelationContext;
    eventFamilyRef: AuditFamilyRef;
    manifestIdOrNull: string | null;
    tenantId: string;
  },
) {
  const tenantId = normalizeSegment(init.tenantId);
  const context = init.correlationContext;

  const rows = bundle.partitionPolicy.partition_resolution_order
    .map((partitionRef) => bundle.partitionsByRef.get(partitionRef))
    .filter(Boolean);

  for (const row of rows) {
    switch (row.partition_ref) {
      case "NIGHTLY":
        if (context.nightly_batch_run_ref && context.nightly_window_key) {
          return renderTemplate(row.stream_ref_template, {
            nightly_batch_run_ref: context.nightly_batch_run_ref,
            nightly_window_key: context.nightly_window_key,
            tenant_id: tenantId,
          });
        }
        break;
      case "AUTHORITY":
        if (context.authority_operation_id) {
          return renderTemplate(row.stream_ref_template, {
            authority_operation_id: context.authority_operation_id,
            tenant_id: tenantId,
          });
        }
        break;
      case "MANIFEST":
        if (init.manifestIdOrNull) {
          return renderTemplate(row.stream_ref_template, {
            manifest_id: init.manifestIdOrNull,
            tenant_id: tenantId,
          });
        }
        break;
      case "WORKFLOW":
        if (context.workflow_item_id) {
          return renderTemplate(row.stream_ref_template, {
            tenant_id: tenantId,
            workflow_item_id: context.workflow_item_id,
          });
        }
        break;
      case "FAMILY":
        return renderTemplate(row.stream_ref_template, {
          family_ref: init.eventFamilyRef,
          tenant_id: tenantId,
        });
    }
  }

  throw new AuditPolicyError({
    code: "AUDIT_POLICY_INVALID",
    detail: `unable to derive audit stream ref for family ${init.eventFamilyRef}`,
  });
}

export class AuditStreamSequencer {
  private readonly heads = new Map<string, AuditStreamHead>();
  private readonly locks = new Map<string, Promise<void>>();

  peekHead(streamRef: string): AuditStreamHead {
    return this.heads.get(streamRef) ?? { ...EMPTY_HEAD, audit_stream_ref: streamRef };
  }

  seedHead(head: AuditStreamHead) {
    this.commitHead(head);
  }

  commitHead(head: AuditStreamHead) {
    this.heads.set(head.audit_stream_ref, { ...head });
  }

  async runExclusive<T>(streamRef: string, operation: (head: AuditStreamHead) => Promise<T>) {
    const previous = this.locks.get(streamRef) ?? Promise.resolve();
    let release = () => undefined;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.locks.set(streamRef, current);
    await previous;
    try {
      return await operation(this.peekHead(streamRef));
    } finally {
      release();
      if (this.locks.get(streamRef) === current) {
        this.locks.delete(streamRef);
      }
    }
  }
}
