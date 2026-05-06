-- pc_0130: enquiry pack assembly and retention-limited explainability support.
-- Enquiry packs persist bounded explanation refs and policy posture, not raw sensitive source payloads.

CREATE TABLE IF NOT EXISTS enquiry_packs (
  enquiry_pack_id text PRIMARY KEY,
  enquiry_pack_ref text NOT NULL UNIQUE,
  manifest_id text NOT NULL,
  graph_ref text NOT NULL,
  target_ref text NOT NULL,
  target_class text NOT NULL CHECK (
    target_class IN ('FIGURE', 'TOTAL', 'FILING_FIELD', 'DECISION', 'LEGAL_STATE', 'DRIFT', 'RETENTION_LIMITATION', 'ERROR_CHAIN')
  ),
  primary_path_ref text NOT NULL,
  critical_path_refs jsonb NOT NULL,
  supporting_evidence_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  transformation_step_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  config_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  override_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  authority_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  limitation_notes jsonb NOT NULL DEFAULT '[]'::jsonb,
  audit_refs jsonb NOT NULL,
  lineage_boundaries jsonb NOT NULL DEFAULT '[]'::jsonb,
  masking_posture text NOT NULL CHECK (masking_posture IN ('NONE', 'MASKED', 'REDACTED', 'LIMITED_EXPORT')),
  omission_entries jsonb NOT NULL DEFAULT '[]'::jsonb,
  human_readable_ref text NOT NULL,
  machine_readable_ref text NOT NULL,
  proof_bundle_ref text,
  explanation_status text NOT NULL CHECK (explanation_status IN ('AVAILABLE', 'LIMITED', 'FAILED')),
  retention_binding jsonb NOT NULL,
  render_contract jsonb NOT NULL,
  externalization_governance_contract jsonb NOT NULL,
  record jsonb NOT NULL,
  generated_at timestamptz NOT NULL,
  inserted_at timestamptz NOT NULL DEFAULT now(),
  CHECK (jsonb_typeof(critical_path_refs) = 'array' AND jsonb_array_length(critical_path_refs) > 0),
  CHECK (jsonb_typeof(supporting_evidence_refs) = 'array'),
  CHECK (jsonb_typeof(transformation_step_refs) = 'array'),
  CHECK (jsonb_typeof(config_refs) = 'array'),
  CHECK (jsonb_typeof(override_refs) = 'array'),
  CHECK (jsonb_typeof(authority_refs) = 'array'),
  CHECK (jsonb_typeof(limitation_notes) = 'array'),
  CHECK (jsonb_typeof(audit_refs) = 'array' AND jsonb_array_length(audit_refs) > 0),
  CHECK (jsonb_typeof(lineage_boundaries) = 'array'),
  CHECK (jsonb_typeof(omission_entries) = 'array'),
  CHECK (
    (masking_posture = 'NONE' AND jsonb_array_length(omission_entries) = 0)
    OR (masking_posture <> 'NONE' AND jsonb_array_length(omission_entries) > 0)
  ),
  CHECK (
    (explanation_status = 'FAILED'
      AND render_contract->'operator_render_ref' = 'null'::jsonb
      AND render_contract->'reviewer_render_ref' = 'null'::jsonb
      AND render_contract->'filing_artifact_ref' = 'null'::jsonb)
    OR explanation_status <> 'FAILED'
  ),
  CHECK (
    (explanation_status IN ('LIMITED', 'FAILED') AND jsonb_array_length(limitation_notes) > 0)
    OR explanation_status = 'AVAILABLE'
  )
);

CREATE INDEX IF NOT EXISTS enquiry_packs_manifest_idx
  ON enquiry_packs(manifest_id, explanation_status, masking_posture);

CREATE INDEX IF NOT EXISTS enquiry_packs_graph_target_idx
  ON enquiry_packs(graph_ref, target_ref, generated_at);

CREATE INDEX IF NOT EXISTS enquiry_packs_proof_bundle_idx
  ON enquiry_packs(proof_bundle_ref)
  WHERE proof_bundle_ref IS NOT NULL;
