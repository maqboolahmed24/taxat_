export type SnapshotBoundSetArtifactType =
  | "SourceRecordSet"
  | "EvidenceItemSet"
  | "CandidateFactSet"
  | "ConflictSet"
  | "CanonicalFactSet";

export type SnapshotBoundSetRef<TArtifactType extends SnapshotBoundSetArtifactType> = {
  artifact_contract_hash?: string;
  artifact_type: TArtifactType;
  item_count?: number;
  item_identity_hash?: string;
  manifest_id: string;
  produced_at?: string;
  set_hash: string;
  set_ref: string;
};

export type SnapshotAssemblySetBindings = {
  candidate_fact_set: SnapshotBoundSetRef<"CandidateFactSet">;
  canonical_fact_set: SnapshotBoundSetRef<"CanonicalFactSet">;
  conflict_set: SnapshotBoundSetRef<"ConflictSet">;
  evidence_item_set: SnapshotBoundSetRef<"EvidenceItemSet">;
  source_record_set: SnapshotBoundSetRef<"SourceRecordSet">;
};

export type SnapshotAssemblyQualityInput = {
  data_quality_score?: number;
  invalid_domain_refs?: readonly string[];
  reason_codes?: readonly string[];
};

export type SnapshotAssemblyCompletenessInput = {
  completeness_score?: number;
  expected_domain_refs?: readonly string[];
  missing_domain_refs?: readonly string[];
  reason_codes?: readonly string[];
  satisfied_domain_refs?: readonly string[];
};
