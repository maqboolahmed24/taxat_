import {
  buildSnapshotContract,
  buildSnapshotStateTransitionContract,
  deriveSnapshotContentHash,
  normalizeSnapshotRecord,
  type SnapshotLifecycleState,
  type SnapshotRecord,
  type SnapshotTransitionEventCode,
} from "../models/snapshot.ts";
import { normalizeCollectionString, normalizeCollectionStringSet } from "../models/collection_control_common.ts";
import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";
import { classifySnapshotValidationPosture } from "./classify_snapshot_validation_posture.ts";

export type SnapshotTransitionErrorCode =
  | "SNAPSHOT_ILLEGAL_TRANSITION"
  | "SNAPSHOT_TRANSITION_POSTURE_MISMATCH"
  | "SNAPSHOT_TRANSITION_REASON_REQUIRED";

export class SnapshotTransitionError extends Error {
  readonly code: SnapshotTransitionErrorCode;

  constructor(code: SnapshotTransitionErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "SnapshotTransitionError";
    this.code = code;
  }
}

const LEGAL_TRANSITIONS = new Map<
  string,
  {
    event_code: SnapshotTransitionEventCode;
    to: SnapshotLifecycleState;
  }
>([
  ["BUILT::snapshot_validation_passed", { event_code: "snapshot_validation_passed", to: "VALID" }],
  ["BUILT::snapshot_validation_warned", { event_code: "snapshot_validation_warned", to: "WARNED" }],
  ["BUILT::snapshot_validation_failed", { event_code: "snapshot_validation_failed", to: "INVALID" }],
  ["VALID::snapshot_superseded", { event_code: "snapshot_superseded", to: "SUPERSEDED" }],
  ["WARNED::snapshot_superseded", { event_code: "snapshot_superseded", to: "SUPERSEDED" }],
  ["INVALID::snapshot_superseded", { event_code: "snapshot_superseded", to: "SUPERSEDED" }],
  [
    "VALID::snapshot_retention_limited",
    { event_code: "snapshot_retention_limited", to: "RETENTION_LIMITED" },
  ],
  [
    "WARNED::snapshot_retention_limited",
    { event_code: "snapshot_retention_limited", to: "RETENTION_LIMITED" },
  ],
  [
    "INVALID::snapshot_retention_limited",
    { event_code: "snapshot_retention_limited", to: "RETENTION_LIMITED" },
  ],
  ["RETENTION_LIMITED::erasure_complete", { event_code: "erasure_complete", to: "ERASED" }],
]);

function transitionKey(from: SnapshotLifecycleState, eventCode: SnapshotTransitionEventCode) {
  return `${from}::${eventCode}`;
}

function resolveTransition(input: {
  event_code: SnapshotTransitionEventCode;
  from: SnapshotLifecycleState;
}) {
  const transition = LEGAL_TRANSITIONS.get(transitionKey(input.from, input.event_code));
  if (!transition) {
    throw new SnapshotTransitionError(
      "SNAPSHOT_ILLEGAL_TRANSITION",
      `${input.from} cannot apply ${input.event_code}`,
    );
  }
  return transition.to;
}

function assertValidationPosture(
  snapshot: SnapshotRecord,
  eventCode: SnapshotTransitionEventCode,
) {
  const posture = classifySnapshotValidationPosture({
    completeness: snapshot.completeness,
    quality: snapshot.quality,
  });
  const expectedEventByPosture = {
    INVALID: "snapshot_validation_failed",
    VALID: "snapshot_validation_passed",
    WARNED: "snapshot_validation_warned",
  } satisfies Record<string, SnapshotTransitionEventCode>;
  const expectedEvent = expectedEventByPosture[posture];
  if (
    eventCode === "snapshot_validation_passed" ||
    eventCode === "snapshot_validation_warned" ||
    eventCode === "snapshot_validation_failed"
  ) {
    if (eventCode !== expectedEvent) {
      throw new SnapshotTransitionError(
        "SNAPSHOT_TRANSITION_POSTURE_MISMATCH",
        `snapshot quality/completeness posture is ${posture}, not ${eventCode}`,
      );
    }
  }
}

function withRefreshedContract(snapshot: SnapshotRecord): SnapshotRecord {
  const { contract: _contract, ...withoutContract } = snapshot;
  const contentHash = deriveSnapshotContentHash(withoutContract);
  const contract = buildSnapshotContract({
    schema_bundle_hash: snapshot.contract.schema_bundle_hash,
    snapshot_content_hash: contentHash,
    snapshot_id: snapshot.snapshot_id,
    writer_build_id: snapshot.contract.writer_build_id,
  });
  return normalizeSnapshotRecord({
    ...withoutContract,
    contract,
  });
}

export function transitionSnapshot(input: {
  audit_refs?: readonly string[];
  erasure_proof_ref?: string;
  event_code: Exclude<SnapshotTransitionEventCode, "snapshot_built">;
  provenance_refs?: readonly string[];
  retention_limitation_ref?: string;
  snapshot: SnapshotRecord;
  superseded_by_snapshot_id?: string;
  transitioned_at: string;
  transition_audit_ref: string;
}) {
  const snapshot = normalizeSnapshotRecord(input.snapshot);
  const transitionedAt = normalizeUtcInstantString(input.transitioned_at);
  const nextState = resolveTransition({
    event_code: input.event_code,
    from: snapshot.lifecycle_state,
  });
  assertValidationPosture(snapshot, input.event_code);

  const auditRefs = normalizeCollectionStringSet(
    "snapshot.audit_refs",
    [input.transition_audit_ref, ...snapshot.audit_refs, ...(input.audit_refs ?? [])],
    { minItems: 1 },
  );
  const provenanceRefs = normalizeCollectionStringSet("snapshot.provenance_refs", [
    ...snapshot.provenance_refs,
    ...(input.provenance_refs ?? []),
  ]);
  let nextSnapshot: SnapshotRecord = {
    ...snapshot,
    audit_refs: auditRefs,
    lifecycle_state: nextState,
    provenance_refs: provenanceRefs,
    state_changed_at: transitionedAt,
    state_transition_contract: buildSnapshotStateTransitionContract({
      current_state: nextState,
      previous_state_or_null: snapshot.lifecycle_state,
      transition_applied_at: transitionedAt,
      transition_audit_ref: input.transition_audit_ref,
      transition_event_code: input.event_code,
    }),
  };

  switch (input.event_code) {
    case "snapshot_validation_passed":
    case "snapshot_validation_warned":
    case "snapshot_validation_failed":
      nextSnapshot = {
        ...nextSnapshot,
        erasure_proof_ref_or_null: null,
        retention_limitation_ref_or_null: null,
        superseded_by_snapshot_id_or_null: null,
      };
      break;
    case "snapshot_superseded": {
      if (input.superseded_by_snapshot_id === undefined) {
        throw new SnapshotTransitionError(
          "SNAPSHOT_TRANSITION_REASON_REQUIRED",
          "snapshot_superseded requires a superseding snapshot id",
        );
      }
      const supersedingSnapshotId = normalizeCollectionString(
        "snapshot.superseded_by_snapshot_id",
        input.superseded_by_snapshot_id,
      );
      if (supersedingSnapshotId === snapshot.snapshot_id) {
        throw new SnapshotTransitionError(
          "SNAPSHOT_TRANSITION_REASON_REQUIRED",
          "snapshot_superseded requires a different superseding snapshot id",
        );
      }
      nextSnapshot = {
        ...nextSnapshot,
        erasure_proof_ref_or_null: null,
        retention_limitation_ref_or_null: null,
        superseded_by_snapshot_id_or_null: supersedingSnapshotId,
      };
      break;
    }
    case "snapshot_retention_limited":
      if (input.retention_limitation_ref === undefined) {
        throw new SnapshotTransitionError(
          "SNAPSHOT_TRANSITION_REASON_REQUIRED",
          "snapshot_retention_limited requires a retention limitation ref",
        );
      }
      nextSnapshot = {
        ...nextSnapshot,
        erasure_proof_ref_or_null: null,
        retention_limitation_ref_or_null: normalizeCollectionString(
          "snapshot.retention_limitation_ref",
          input.retention_limitation_ref,
        ),
        superseded_by_snapshot_id_or_null: null,
      };
      break;
    case "erasure_complete":
      if (input.erasure_proof_ref === undefined) {
        throw new SnapshotTransitionError(
          "SNAPSHOT_TRANSITION_REASON_REQUIRED",
          "erasure_complete requires an erasure proof ref",
        );
      }
      nextSnapshot = {
        ...nextSnapshot,
        erasure_proof_ref_or_null: normalizeCollectionString(
          "snapshot.erasure_proof_ref",
          input.erasure_proof_ref,
        ),
        retention_limitation_ref_or_null: snapshot.retention_limitation_ref_or_null,
        superseded_by_snapshot_id_or_null: null,
      };
      break;
  }

  return withRefreshedContract(nextSnapshot);
}
