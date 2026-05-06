-- phase03_0146_collaboration_routing_contract.sql
-- Persisted collaboration routing contracts, stable queue-order indexes, and
-- routing profile lineage for historical replay.

CREATE TABLE IF NOT EXISTS workflow_collaboration_routing_profiles (
  routing_profile_hash TEXT PRIMARY KEY,
  routing_profile_code TEXT NOT NULL CHECK (
    routing_profile_code = 'COLLABORATION_ROUTING_FORMULA_V1'
  ),
  profile_version TEXT NOT NULL,
  profile_snapshot JSONB NOT NULL,
  activated_at TIMESTAMPTZ NOT NULL,
  retired_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (jsonb_typeof(profile_snapshot) = 'object'),
  CHECK (retired_at IS NULL OR retired_at >= activated_at)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'workflow_items_collaboration_routing_contract_v1'
  ) THEN
    ALTER TABLE workflow_items
      ADD CONSTRAINT workflow_items_collaboration_routing_contract_v1
      CHECK (
        routing_contract->>'contract_version' = 'COLLABORATION_ROUTING_V1'
        AND routing_contract->>'routing_scope' = 'WORKFLOW_ITEM'
        AND routing_contract->>'routing_profile_code' = 'COLLABORATION_ROUTING_FORMULA_V1'
        AND routing_contract->>'routing_queue_ref' = routing_queue_ref
        AND routing_contract #>> '{canonical_sort_key,item_id}' = item_id
        AND (routing_contract #>> '{canonical_sort_key,queue_entered_at}')::timestamptz = queue_entered_at
        AND (routing_contract->>'assignment_efficiency_score')::integer = assignment_efficiency_score
        AND (routing_contract->>'ownership_confidence_score')::integer = ownership_confidence_score
        AND (routing_contract->>'sla_pressure_score')::integer = sla_pressure_score
        AND (routing_contract->>'escalation_pressure_score')::integer = escalation_pressure_score
        AND (routing_contract->>'collaboration_priority_score')::integer = collaboration_priority_score
        AND (routing_contract->>'resolution_confidence_score')::integer = resolution_confidence_score
        AND (routing_contract #>> '{canonical_sort_key,collaboration_priority_score}')::integer = collaboration_priority_score
        AND (routing_contract #>> '{canonical_sort_key,resolution_confidence_score}')::integer = resolution_confidence_score
        AND (routing_contract->>'queue_pressure_score')::integer = 100 - (routing_contract->>'queue_health_score')::integer
        AND (
          ((routing_contract->>'queue_health_score')::integer >= (routing_contract->>'queue_health_floor')::integer
            AND routing_contract->>'queue_health_state' = 'HEALTHY')
          OR ((routing_contract->>'queue_health_score')::integer < (routing_contract->>'queue_health_floor')::integer
            AND routing_contract->>'queue_health_state' IN ('DEGRADED', 'SATURATED'))
        )
        AND jsonb_typeof(routing_contract->'ordering_reason_codes') = 'array'
        AND jsonb_array_length(routing_contract->'ordering_reason_codes') BETWEEN 1 AND 6
        AND jsonb_typeof(routing_contract->'recommendation_reason_codes') = 'array'
        AND jsonb_array_length(routing_contract->'recommendation_reason_codes') <= 6
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_workflow_items_routing_contract_stable_order
  ON workflow_items (
    routing_queue_ref,
    collaboration_priority_score DESC,
    ((routing_contract->>'escalation_rank')::integer) DESC,
    ((routing_contract #>> '{canonical_sort_key,effective_due_at_or_null}')::timestamptz) ASC NULLS LAST,
    resolution_confidence_score ASC,
    queue_entered_at ASC,
    item_id ASC
  );

CREATE INDEX IF NOT EXISTS idx_workflow_items_routing_recommendations
  ON workflow_items (
    routing_queue_ref,
    (routing_contract->>'assignment_recommendation_state'),
    (routing_contract->>'escalation_recommendation_state'),
    (routing_contract->>'draft_safety_state')
  );

CREATE INDEX IF NOT EXISTS idx_workflow_collaboration_routing_profiles_code_version
  ON workflow_collaboration_routing_profiles (
    routing_profile_code,
    profile_version,
    activated_at
  );

COMMENT ON TABLE workflow_collaboration_routing_profiles IS
  'Frozen collaboration-routing formula profiles keyed by routing_profile_hash for replaying historical WorkflowItem.routing_contract decisions.';

COMMENT ON INDEX idx_workflow_items_routing_contract_stable_order IS
  'Stable queue order: priority desc, escalation rank desc, effective due asc nulls last, resolution confidence asc, queue entry asc, item id asc.';
