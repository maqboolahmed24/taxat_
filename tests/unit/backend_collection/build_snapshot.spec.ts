import { expect, test } from "@playwright/test";

import {
  BuildSnapshotError,
  SnapshotRepository,
  buildSnapshot,
  buildSnapshotRecord,
  classifySnapshotValidationPosture,
  snapshotRef,
  type SnapshotAssemblySetBindings,
} from "../../../packages/backend-collection/src/index.ts";

function setBindings(manifestId = "manifest-0118-unit"): SnapshotAssemblySetBindings {
  return {
    candidate_fact_set: {
      artifact_contract_hash: "artifact-contract-hash://candidate-facts/0118",
      artifact_type: "CandidateFactSet",
      item_count: 1,
      item_identity_hash: "candidate-fact-item-hash://0118",
      manifest_id: manifestId,
      produced_at: "2026-04-27T14:18:00Z",
      set_hash: "candidate-fact-set-hash://0118",
      set_ref: "candidate-fact-set://0118",
    },
    canonical_fact_set: {
      artifact_contract_hash: "artifact-contract-hash://canonical-facts/0118",
      artifact_type: "CanonicalFactSet",
      item_count: 1,
      item_identity_hash: "canonical-fact-item-hash://0118",
      manifest_id: manifestId,
      produced_at: "2026-04-27T14:20:00Z",
      set_hash: "canonical-fact-set-hash://0118",
      set_ref: "canonical-fact-set://0118",
    },
    conflict_set: {
      artifact_contract_hash: "artifact-contract-hash://conflicts/0118",
      artifact_type: "ConflictSet",
      item_count: 0,
      item_identity_hash: "conflict-item-hash://empty/0118",
      manifest_id: manifestId,
      produced_at: "2026-04-27T14:19:00Z",
      set_hash: "conflict-set-hash://0118",
      set_ref: "conflict-set://0118",
    },
    evidence_item_set: {
      artifact_contract_hash: "artifact-contract-hash://evidence/0118",
      artifact_type: "EvidenceItemSet",
      item_count: 1,
      item_identity_hash: "evidence-item-hash://0118",
      manifest_id: manifestId,
      produced_at: "2026-04-27T14:17:00Z",
      set_hash: "evidence-item-set-hash://0118",
      set_ref: "evidence-item-set://0118",
    },
    source_record_set: {
      artifact_contract_hash: "artifact-contract-hash://sources/0118",
      artifact_type: "SourceRecordSet",
      item_count: 1,
      item_identity_hash: "source-record-item-hash://0118",
      manifest_id: manifestId,
      produced_at: "2026-04-27T14:16:00Z",
      set_hash: "source-record-set-hash://0118",
      set_ref: "source-record-set://0118",
    },
  };
}

test("snapshot build binds authoritative set refs and populated quality/completeness", () => {
  const snapshot = buildSnapshotRecord({
    built_at: "2026-04-27T14:21:00Z",
    completeness: {
      expected_domain_refs: ["domain://vat_obligations"],
      satisfied_domain_refs: ["domain://vat_obligations"],
    },
    manifest_id: "manifest-0118-unit",
    set_bindings: setBindings(),
  });

  expect(snapshot.artifact_type).toBe("Snapshot");
  expect(snapshot.lifecycle_state).toBe("BUILT");
  expect(snapshot.state_transition_contract).toMatchObject({
    current_state: "BUILT",
    machine_code: "SNAPSHOT_LIFECYCLE_V1",
    object_family: "SNAPSHOT",
    previous_state_or_null: null,
    state_field_name: "lifecycle_state",
    transition_event_code: "snapshot_built",
  });
  expect(snapshot.source_record_set_ref).toBe("source-record-set://0118");
  expect(snapshot.evidence_item_set_hash).toBe("evidence-item-set-hash://0118");
  expect(snapshot.quality).toEqual({
    data_quality_score: 100,
    invalid_domain_refs: [],
    reason_codes: [],
  });
  expect(snapshot.completeness).toEqual({
    completeness_score: 100,
    missing_domain_refs: [],
    reason_codes: [],
  });
  expect(classifySnapshotValidationPosture(snapshot)).toBe("VALID");
  expect(snapshot.contract.schema_id).toBe("https://taxat.dev/schemas/snapshot.schema.json");
  expect(snapshot.contract.artifact_id).toBe(snapshotRef(snapshot));
});

test("snapshot build persists only complete normalized payloads", async () => {
  const repository = new SnapshotRepository();
  const snapshot = await buildSnapshot({
    built_at: "2026-04-27T14:22:00Z",
    manifest_id: "manifest-0118-persisted",
    persisted_at: "2026-04-27T14:22:01Z",
    repository,
    set_bindings: setBindings("manifest-0118-persisted"),
  });
  const stored = await repository.requireSnapshotById(snapshot.snapshot_id);

  expect(stored.snapshot).toEqual(snapshot);
  expect(stored.snapshot_row_version).toBe(1);
  expect(stored.snapshot_ref).toBe(snapshotRef(snapshot));
});

test("snapshot quality and completeness classify warned and invalid postures", () => {
  const warned = buildSnapshotRecord({
    built_at: "2026-04-27T14:23:00Z",
    manifest_id: "manifest-0118-warning",
    quality: {
      data_quality_score: 95,
      reason_codes: ["NON_BLOCKING_REVIEW_REQUIRED"],
    },
    set_bindings: setBindings("manifest-0118-warning"),
  });
  const invalid = buildSnapshotRecord({
    built_at: "2026-04-27T14:24:00Z",
    completeness: {
      expected_domain_refs: ["domain://vat_obligations", "domain://income_tax"],
      satisfied_domain_refs: ["domain://vat_obligations"],
    },
    manifest_id: "manifest-0118-invalid",
    set_bindings: setBindings("manifest-0118-invalid"),
  });

  expect(classifySnapshotValidationPosture(warned)).toBe("WARNED");
  expect(warned.quality.reason_codes).toEqual(["NON_BLOCKING_REVIEW_REQUIRED"]);
  expect(classifySnapshotValidationPosture(invalid)).toBe("INVALID");
  expect(invalid.completeness.reason_codes).toEqual(["MISSING_DOMAIN_REFS_PRESENT"]);
  expect(invalid.completeness.missing_domain_refs).toEqual(["domain://income_tax"]);
});

test("snapshot build rejects mismatched set manifests before persistence", () => {
  const bindings = setBindings("manifest-0118-good");
  bindings.conflict_set = {
    ...bindings.conflict_set,
    manifest_id: "manifest-0118-other",
  };

  expect(() =>
    buildSnapshotRecord({
      built_at: "2026-04-27T14:25:00Z",
      manifest_id: "manifest-0118-good",
      set_bindings: bindings,
    }),
  ).toThrow(BuildSnapshotError);
});
