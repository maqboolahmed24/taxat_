import { expect, test } from "@playwright/test";

import {
  SnapshotTransitionError,
  buildSnapshotRecord,
  transitionSnapshot,
  type SnapshotAssemblySetBindings,
  type SnapshotRecord,
} from "../../../packages/backend-collection/src/index.ts";

function setBindings(manifestId: string): SnapshotAssemblySetBindings {
  return {
    candidate_fact_set: {
      artifact_type: "CandidateFactSet",
      manifest_id: manifestId,
      set_hash: `candidate-fact-set-hash://${manifestId}`,
      set_ref: `candidate-fact-set://${manifestId}`,
    },
    canonical_fact_set: {
      artifact_type: "CanonicalFactSet",
      manifest_id: manifestId,
      set_hash: `canonical-fact-set-hash://${manifestId}`,
      set_ref: `canonical-fact-set://${manifestId}`,
    },
    conflict_set: {
      artifact_type: "ConflictSet",
      manifest_id: manifestId,
      set_hash: `conflict-set-hash://${manifestId}`,
      set_ref: `conflict-set://${manifestId}`,
    },
    evidence_item_set: {
      artifact_type: "EvidenceItemSet",
      manifest_id: manifestId,
      set_hash: `evidence-item-set-hash://${manifestId}`,
      set_ref: `evidence-item-set://${manifestId}`,
    },
    source_record_set: {
      artifact_type: "SourceRecordSet",
      manifest_id: manifestId,
      set_hash: `source-record-set-hash://${manifestId}`,
      set_ref: `source-record-set://${manifestId}`,
    },
  };
}

function snapshot(input?: {
  completeness?: Parameters<typeof buildSnapshotRecord>[0]["completeness"];
  manifest_id?: string;
  quality?: Parameters<typeof buildSnapshotRecord>[0]["quality"];
}): SnapshotRecord {
  const manifestId = input?.manifest_id ?? "manifest-0118-transition";
  return buildSnapshotRecord({
    built_at: "2026-04-27T15:00:00Z",
    ...(input?.completeness === undefined ? {} : { completeness: input.completeness }),
    manifest_id: manifestId,
    ...(input?.quality === undefined ? {} : { quality: input.quality }),
    set_bindings: setBindings(manifestId),
  });
}

test("snapshot validation transition moves BUILT to VALID with named state contract", () => {
  const built = snapshot();
  const valid = transitionSnapshot({
    event_code: "snapshot_validation_passed",
    snapshot: built,
    transitioned_at: "2026-04-27T15:01:00Z",
    transition_audit_ref: "audit://snapshot/valid",
  });

  expect(valid.lifecycle_state).toBe("VALID");
  expect(valid.state_transition_contract).toMatchObject({
    current_state: "VALID",
    previous_state_or_null: "BUILT",
    transition_event_code: "snapshot_validation_passed",
  });
  expect(valid.audit_refs).toContain("audit://snapshot/valid");
  expect(valid.contract.artifact_content_hash).not.toBe(built.contract.artifact_content_hash);
});

test("snapshot validation transitions enforce warned and invalid postures", () => {
  const warned = transitionSnapshot({
    event_code: "snapshot_validation_warned",
    snapshot: snapshot({
      manifest_id: "manifest-0118-warned-transition",
      quality: {
        data_quality_score: 96,
        reason_codes: ["NON_BLOCKING_REVIEW_REQUIRED"],
      },
    }),
    transitioned_at: "2026-04-27T15:02:00Z",
    transition_audit_ref: "audit://snapshot/warned",
  });
  const invalid = transitionSnapshot({
    event_code: "snapshot_validation_failed",
    snapshot: snapshot({
      completeness: {
        expected_domain_refs: ["domain://vat", "domain://income_tax"],
        satisfied_domain_refs: ["domain://vat"],
      },
      manifest_id: "manifest-0118-invalid-transition",
    }),
    transitioned_at: "2026-04-27T15:03:00Z",
    transition_audit_ref: "audit://snapshot/invalid",
  });

  expect(warned.lifecycle_state).toBe("WARNED");
  expect(invalid.lifecycle_state).toBe("INVALID");
  expect(() =>
    transitionSnapshot({
      event_code: "snapshot_validation_passed",
      snapshot: invalid,
      transitioned_at: "2026-04-27T15:04:00Z",
      transition_audit_ref: "audit://snapshot/mismatch",
    }),
  ).toThrow(SnapshotTransitionError);
});

test("snapshot terminal transitions require named reasons and reject illegal re-entry", () => {
  const valid = transitionSnapshot({
    event_code: "snapshot_validation_passed",
    snapshot: snapshot({ manifest_id: "manifest-0118-terminal" }),
    transitioned_at: "2026-04-27T15:05:00Z",
    transition_audit_ref: "audit://snapshot/terminal-valid",
  });
  const superseded = transitionSnapshot({
    event_code: "snapshot_superseded",
    snapshot: valid,
    superseded_by_snapshot_id: "snapshot.successor.0118",
    transitioned_at: "2026-04-27T15:06:00Z",
    transition_audit_ref: "audit://snapshot/superseded",
  });
  const retentionLimited = transitionSnapshot({
    event_code: "snapshot_retention_limited",
    snapshot: valid,
    retention_limitation_ref: "retention-limitation://snapshot/0118",
    transitioned_at: "2026-04-27T15:07:00Z",
    transition_audit_ref: "audit://snapshot/retention-limited",
  });
  const erased = transitionSnapshot({
    erasure_proof_ref: "erasure-proof://snapshot/0118",
    event_code: "erasure_complete",
    snapshot: retentionLimited,
    transitioned_at: "2026-04-27T15:08:00Z",
    transition_audit_ref: "audit://snapshot/erased",
  });

  expect(superseded.lifecycle_state).toBe("SUPERSEDED");
  expect(superseded.superseded_by_snapshot_id_or_null).toBe("snapshot.successor.0118");
  expect(retentionLimited.lifecycle_state).toBe("RETENTION_LIMITED");
  expect(erased.lifecycle_state).toBe("ERASED");
  expect(erased.retention_limitation_ref_or_null).toBe("retention-limitation://snapshot/0118");
  expect(() =>
    transitionSnapshot({
      event_code: "snapshot_validation_passed",
      snapshot: superseded,
      transitioned_at: "2026-04-27T15:09:00Z",
      transition_audit_ref: "audit://snapshot/reentry",
    }),
  ).toThrow(SnapshotTransitionError);
  expect(() =>
    transitionSnapshot({
      event_code: "snapshot_superseded",
      snapshot: valid,
      transitioned_at: "2026-04-27T15:10:00Z",
      transition_audit_ref: "audit://snapshot/missing-supersession",
    }),
  ).toThrow(SnapshotTransitionError);
});
