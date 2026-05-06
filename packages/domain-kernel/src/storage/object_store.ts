import { assertUploadSessionStorageContinuity } from "../references/artifact_locator.ts";

import {
  assertGovernedObjectDeliveryBindingCurrent,
  createGovernedObjectDeliveryBinding,
} from "./delivery_binding.ts";
import {
  createGovernedObjectRecord,
  loadObjectLifecyclePolicyBundle,
  objectClassRow,
  transitionLifecycleState,
  type GovernedObjectRecord,
  type ObjectLifecyclePolicyBundle,
} from "./object_lifecycle.ts";
import { evaluateQuarantineTransition } from "./quarantine_policy.ts";
import { applyRetentionHook, requestErasureWithCurrentViewGuard } from "./retention_hooks.ts";

export class InMemoryGovernedObjectStore {
  readonly #bundle: ObjectLifecyclePolicyBundle;
  readonly #records = new Map<string, GovernedObjectRecord>();

  constructor(bundle: ObjectLifecyclePolicyBundle) {
    this.#bundle = bundle;
  }

  get(objectRef: string) {
    const record = this.#records.get(objectRef);
    if (!record) {
      throw new Error(`Unknown object ${objectRef}`);
    }
    return record;
  }

  list() {
    return [...this.#records.values()];
  }

  stageObject(input: {
    at: string;
    objectClassRef: string;
    objectRef: string;
    requestVersionRefOrNull?: string | null;
    storageRef: string;
    tenantId: string;
    uploadSessionIdOrNull?: string | null;
  }) {
    const record = createGovernedObjectRecord(this.#bundle, {
      attachmentConfirmed: false,
      createdAt: input.at,
      lifecycleState: "STAGED",
      objectClassRef: input.objectClassRef,
      objectRef: input.objectRef,
      requestVersionRefOrNull: input.requestVersionRefOrNull ?? null,
      storageRef: input.storageRef,
      tenantId: input.tenantId,
      uploadSessionIdOrNull: input.uploadSessionIdOrNull ?? null,
    });
    const retention = applyRetentionHook(this.#bundle, record, {
      at: input.at,
      hookRef: "STAGE_WRITE",
    });
    const staged = {
      ...record,
      artifactRetentionOrNull: retention.artifactRetention,
      retentionTagOrNull: retention.retentionTag,
    } satisfies GovernedObjectRecord;
    this.#records.set(staged.objectRef, staged);
    return staged;
  }

  resumeObject(input: {
    nextRequestVersionRef: string;
    objectRef: string;
    previousRequestVersionRef: string;
  }) {
    const record = this.get(input.objectRef);
    if (!record.uploadSessionIdOrNull || !record.requestVersionRefOrNull) {
      throw new Error(`Object ${input.objectRef} is not resumable`);
    }
    assertUploadSessionStorageContinuity({
      nextRequestVersionRef: input.nextRequestVersionRef,
      nextStorageRef: record.storageRef,
      previousRequestVersionRef: input.previousRequestVersionRef,
      previousStorageRef: record.storageRef,
      uploadSessionId: record.uploadSessionIdOrNull,
    });
    const updated = {
      ...record,
      requestVersionRefOrNull: input.nextRequestVersionRef,
    } satisfies GovernedObjectRecord;
    this.#records.set(updated.objectRef, updated);
    return updated;
  }

  startScan(input: { at: string; objectRef: string }) {
    const record = this.get(input.objectRef);
    const scanning = transitionLifecycleState(record, "SCANNING", {
      at: input.at,
      reasonCodes: ["SCAN_PENDING"],
      triggerRef: "BYTES_TRANSFERRED_AWAITING_VERDICT",
    });
    const updated = {
      ...scanning,
      malwareScanState: "PENDING",
    } satisfies GovernedObjectRecord;
    this.#records.set(updated.objectRef, updated);
    return updated;
  }

  completeScan(input: { at: string; clean: boolean; objectRef: string; reasonCodes?: string[] }) {
    const record = this.get(input.objectRef);
    if (input.clean) {
      return this.publishObject({
        at: input.at,
        malwareScanState: "CLEAN",
        objectRef: input.objectRef,
        publicationState:
          objectClassRow(this.#bundle, record.objectClassRef).exposure_posture === "CUSTOMER_SAFE"
            ? "CUSTOMER_SAFE"
            : "INTERNAL_ONLY",
        reasonCodes: ["SCAN_CLEAN", ...(input.reasonCodes ?? [])],
        triggerRef: "SCAN_VERDICT_CLEAN",
      });
    }

    return this.quarantineObject({
      at: input.at,
      objectRef: input.objectRef,
      reasonCodes: input.reasonCodes ?? ["SCAN_QUARANTINED"],
      triggerRef: "SCAN_VERDICT_QUARANTINED",
    });
  }

  publishObject(input: {
    at: string;
    malwareScanState?: "CLEAN" | "PENDING" | "QUARANTINED";
    objectRef: string;
    publicationState?: "INTERNAL_ONLY" | "CUSTOMER_SAFE";
    reasonCodes?: string[];
    triggerRef?: string;
  }) {
    const record = this.get(input.objectRef);
    const published =
      record.lifecycleState === "PUBLISHED"
        ? record
        : transitionLifecycleState(record, "PUBLISHED", {
            at: input.at,
            reasonCodes: input.reasonCodes ?? ["OBJECT_PUBLISHED"],
            triggerRef: input.triggerRef ?? "OBJECT_PUBLISHED",
          });
    const retention = applyRetentionHook(this.#bundle, published, {
      at: input.at,
      hookRef: "PUBLISH",
    });
    const updated = {
      ...published,
      artifactRetentionOrNull: retention.artifactRetention,
      malwareScanState: input.malwareScanState ?? published.malwareScanState,
      publicationState: input.publicationState ?? published.publicationState,
      retentionTagOrNull: retention.retentionTag,
    } satisfies GovernedObjectRecord;
    this.#records.set(updated.objectRef, updated);
    return updated;
  }

  quarantineObject(input: {
    at: string;
    objectRef: string;
    reasonCodes: string[];
    triggerRef: "POST_PUBLICATION_RESCAN_QUARANTINE" | "SCAN_VERDICT_QUARANTINED";
  }) {
    const record = this.get(input.objectRef);
    const evaluation = evaluateQuarantineTransition(this.#bundle, record, {
      additionalReasonCodes: input.reasonCodes,
      malwareScanState: "QUARANTINED",
      triggerRef: input.triggerRef,
    });
    const quarantined = transitionLifecycleState(record, evaluation.row.to_lifecycle_state, {
      at: input.at,
      reasonCodes: evaluation.reasonCodes,
      triggerRef: input.triggerRef,
    });
    const retention = applyRetentionHook(this.#bundle, quarantined, {
      at: input.at,
      hookRef: "QUARANTINE",
    });
    const updated = {
      ...quarantined,
      malwareScanState: "QUARANTINED",
      publicationState: "DELIVERY_REVOKED",
      quarantineEventRefOrNull: `quarantine.event.${record.objectRef}`,
      quarantineReasonCodes: evaluation.reasonCodes,
      artifactRetentionOrNull: retention.artifactRetention,
      retentionTagOrNull: retention.retentionTag,
    } satisfies GovernedObjectRecord;
    this.#records.set(updated.objectRef, updated);
    return updated;
  }

  publishCustomerSafeDerivative(input: {
    at: string;
    derivativeObjectClassRef?: string;
    derivativeObjectRef: string;
    sourceObjectRef: string;
    storageRef: string;
  }) {
    const source = this.get(input.sourceObjectRef);
    const derivative = createGovernedObjectRecord(this.#bundle, {
      createdAt: input.at,
      currentHistoryPosture: source.currentHistoryPosture,
      derivativeSourceObjectRefOrNull: source.objectRef,
      lifecycleState: "PUBLISHED",
      malwareScanState: "CLEAN",
      objectClassRef: input.derivativeObjectClassRef ?? "CUSTOMER_SAFE_DERIVATIVE",
      objectRef: input.derivativeObjectRef,
      publicationState: "CUSTOMER_SAFE",
      storageRef: input.storageRef,
      tenantId: source.tenantId,
    });
    const retention = applyRetentionHook(this.#bundle, derivative, {
      at: input.at,
      hookRef: "PUBLISH",
    });
    const updated = {
      ...derivative,
      artifactRetentionOrNull: retention.artifactRetention,
      retentionTagOrNull: retention.retentionTag,
    } satisfies GovernedObjectRecord;
    this.#records.set(updated.objectRef, updated);
    return updated;
  }

  bindDelivery(input: {
    affordance: "PREVIEW" | "DOWNLOAD" | "EXTERNALIZATION";
    at: string;
    context: Parameters<typeof createGovernedObjectDeliveryBinding>[2]["context"];
    downloadRefOrNull?: string | null;
    objectRef: string;
    previewTargetRefOrNull?: string | null;
    targetRef: string;
  }) {
    const record = this.get(input.objectRef);
    const binding = createGovernedObjectDeliveryBinding(this.#bundle, record, {
      affordance: input.affordance,
      context: input.context,
      downloadRefOrNull: input.downloadRefOrNull ?? null,
      previewTargetRefOrNull: input.previewTargetRefOrNull ?? null,
      targetRef: input.targetRef,
    });
    const deliverable = transitionLifecycleState(record, "DELIVERABLE", {
      at: input.at,
      reasonCodes: ["DELIVERY_BOUND"],
      triggerRef: "DELIVERY_BOUND",
    });
    const updated = {
      ...deliverable,
      deliveryAffordanceOrNull: binding.affordance,
      deliveryBindingHashOrNull: binding.deliveryBindingHash,
      deliveryTargetRefOrNull: binding.targetRef,
      downloadRefOrNull: binding.downloadRefOrNull,
      previewTargetRefOrNull: binding.previewTargetRefOrNull,
    } satisfies GovernedObjectRecord;
    this.#records.set(updated.objectRef, updated);
    return updated;
  }

  assertDeliveryCurrent(input: {
    bindingHash: string;
    context: Parameters<typeof assertGovernedObjectDeliveryBindingCurrent>[1]["context"];
    objectRef: string;
  }) {
    const record = this.get(input.objectRef);
    assertGovernedObjectDeliveryBindingCurrent(record, {
      bindingHash: input.bindingHash,
      context: input.context,
    });
  }

  retainObject(input: { at: string; holdRef: string; objectRef: string }) {
    const record = this.get(input.objectRef);
    const retained = transitionLifecycleState(record, "RETAINED", {
      at: input.at,
      reasonCodes: ["LEGAL_HOLD_APPLIED"],
      triggerRef: "RETENTION_HOLD_APPLIED",
    });
    const retention = applyRetentionHook(this.#bundle, retained, {
      at: input.at,
      holdRefOrNull: input.holdRef,
      hookRef: "RETAIN_HOLD",
    });
    const updated = {
      ...retained,
      artifactRetentionOrNull: retention.artifactRetention,
      retentionTagOrNull: retention.retentionTag,
    } satisfies GovernedObjectRecord;
    this.#records.set(updated.objectRef, updated);
    return updated;
  }

  requestErasure(input: { at: string; currentArtifactRefs: string[]; objectRef: string }) {
    const record = this.get(input.objectRef);
    const decision = requestErasureWithCurrentViewGuard(this.#bundle, record, {
      at: input.at,
      currentArtifactRefs: input.currentArtifactRefs,
    });
    const nextState = decision.outcome === "ERASURE_PENDING" ? "ERASURE_PENDING" : "RETAINED";
    const transitioned =
      record.lifecycleState === nextState
        ? record
        : transitionLifecycleState(record, nextState, {
            at: input.at,
            reasonCodes:
              decision.outcome === "ERASURE_PENDING"
                ? ["ERASURE_REQUEST_ACCEPTED"]
                : decision.reasonCodes,
            triggerRef:
              decision.outcome === "ERASURE_PENDING"
                ? "ERASURE_REQUEST_ACCEPTED"
                : "CURRENT_ARTIFACT_VIEW_REFERENCE_BLOCKS_ERASURE",
          });
    const updated = {
      ...transitioned,
      artifactRetentionOrNull: decision.artifactRetention,
      currentArtifactRefs: [...input.currentArtifactRefs],
      retentionTagOrNull: decision.retentionTag,
    } satisfies GovernedObjectRecord;
    this.#records.set(updated.objectRef, updated);
    return updated;
  }

  eraseObject(input: { at: string; objectRef: string }) {
    const record = this.get(input.objectRef);
    const erased = transitionLifecycleState(record, "ERASED", {
      at: input.at,
      reasonCodes: ["ERASURE_COMPLETED"],
      triggerRef: "ERASURE_COMPLETED",
    });
    const retention = applyRetentionHook(this.#bundle, erased, {
      at: input.at,
      hookRef: "ERASURE_COMPLETE",
    });
    const updated = {
      ...erased,
      artifactRetentionOrNull: retention.artifactRetention,
      retentionTagOrNull: retention.retentionTag,
    } satisfies GovernedObjectRecord;
    this.#records.set(updated.objectRef, updated);
    return updated;
  }
}

export async function createInMemoryGovernedObjectStore(options?: { reload?: boolean }) {
  return new InMemoryGovernedObjectStore(await loadObjectLifecyclePolicyBundle(options));
}
