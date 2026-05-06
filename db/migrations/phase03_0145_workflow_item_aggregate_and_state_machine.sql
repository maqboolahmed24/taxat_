-- phase03_0145_workflow_item_aggregate_and_state_machine.sql
-- Durable WorkflowItem aggregate table. Workflow coordination is command-side
-- authority for work state only; authority truth remains explicit and cannot be
-- inferred from lifecycle or customer projection fields.

CREATE TABLE IF NOT EXISTS workflow_items (
  item_id TEXT PRIMARY KEY,
  item_ref TEXT NOT NULL UNIQUE,
  tenant_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  period TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type ~ '^[A-Z][A-Z0-9_]*$'),
  execution_mode_boundary_contract JSONB NOT NULL,
  lifecycle_state TEXT NOT NULL CHECK (
    lifecycle_state IN (
      'OPEN',
      'IN_PROGRESS',
      'WAITING_ON_CLIENT',
      'WAITING_ON_AUTHORITY',
      'BLOCKED',
      'DONE',
      'CANCELLED',
      'STALE'
    )
  ),
  state_transition_contract JSONB NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT', 'CRITICAL')),
  due_at TIMESTAMPTZ,
  context_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
  title TEXT NOT NULL,
  truth_boundary_contract JSONB NOT NULL,
  authority_truth_contract JSONB NOT NULL,
  collaboration_visibility TEXT NOT NULL CHECK (
    collaboration_visibility IN ('INTERNAL_ONLY', 'CUSTOMER_SHARED')
  ),
  authority_truth_state TEXT NOT NULL CHECK (
    authority_truth_state IN (
      'NOT_APPLICABLE',
      'NOT_REQUESTED',
      'UNKNOWN',
      'PENDING_ACK',
      'PARTIAL_ACK',
      'CONFIRMED',
      'REJECTED',
      'OUT_OF_BAND'
    )
  ),
  customer_status_projection TEXT CHECK (
    customer_status_projection IS NULL
    OR customer_status_projection IN (
      'UNDER_REVIEW',
      'ACTION_REQUIRED',
      'WAITING_ON_CONFIRMATION',
      'RESOLVED',
      'CLOSED'
    )
  ),
  current_assignee_ref TEXT,
  assignment_state TEXT NOT NULL CHECK (assignment_state IN ('UNASSIGNED', 'ASSIGNED', 'ESCALATED')),
  escalation_target_ref TEXT,
  routing_queue_ref TEXT NOT NULL,
  routing_contract JSONB NOT NULL,
  waiting_on_actor TEXT NOT NULL CHECK (waiting_on_actor IN ('NONE', 'CUSTOMER', 'STAFF', 'AUTHORITY', 'SYSTEM')),
  sla_policy_ref TEXT,
  sla_due_at TIMESTAMPTZ,
  customer_due_at TIMESTAMPTZ,
  due_state TEXT CHECK (due_state IS NULL OR due_state IN ('ON_TRACK', 'DUE_SOON', 'OVERDUE', 'BREACHED')),
  queue_entered_at TIMESTAMPTZ NOT NULL,
  last_assignment_at TIMESTAMPTZ,
  waiting_since_at TIMESTAMPTZ NOT NULL,
  reassignment_count_30d INTEGER NOT NULL CHECK (reassignment_count_30d >= 0),
  ownership_confidence_score INTEGER NOT NULL CHECK (ownership_confidence_score BETWEEN 0 AND 100),
  assignment_efficiency_score INTEGER NOT NULL CHECK (assignment_efficiency_score BETWEEN 0 AND 100),
  sla_pressure_score INTEGER NOT NULL CHECK (sla_pressure_score BETWEEN 0 AND 100),
  escalation_pressure_score INTEGER NOT NULL CHECK (escalation_pressure_score BETWEEN 0 AND 100),
  collaboration_priority_score INTEGER NOT NULL CHECK (collaboration_priority_score BETWEEN 0 AND 100),
  resolution_confidence_score INTEGER NOT NULL CHECK (resolution_confidence_score BETWEEN 0 AND 100),
  customer_thread_ref TEXT,
  internal_thread_ref TEXT NOT NULL,
  staff_workspace_version INTEGER NOT NULL CHECK (staff_workspace_version >= 1),
  customer_workspace_version INTEGER NOT NULL CHECK (customer_workspace_version >= 0),
  active_request_info_ref TEXT,
  next_request_info_ordinal INTEGER NOT NULL CHECK (next_request_info_ordinal >= 1),
  last_customer_activity_at TIMESTAMPTZ,
  last_internal_activity_at TIMESTAMPTZ,
  last_customer_visible_event_ref TEXT,
  last_internal_event_ref TEXT,
  dedupe_key TEXT NOT NULL,
  active_dedupe_key TEXT GENERATED ALWAYS AS (
    CASE
      WHEN lifecycle_state IN ('OPEN', 'IN_PROGRESS', 'WAITING_ON_CLIENT', 'WAITING_ON_AUTHORITY', 'BLOCKED')
      THEN tenant_id || ':' || client_id || ':' || period || ':' || type || ':' || dedupe_key
      ELSE NULL
    END
  ) STORED,
  closed_at TIMESTAMPTZ,
  content_fingerprint TEXT NOT NULL,
  row_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (
    (customer_status_projection IS NULL AND collaboration_visibility = 'INTERNAL_ONLY')
    OR (customer_status_projection IS NOT NULL AND collaboration_visibility = 'CUSTOMER_SHARED' AND customer_thread_ref IS NOT NULL)
  ),
  CHECK (
    collaboration_visibility = 'CUSTOMER_SHARED'
    OR (
      customer_status_projection IS NULL
      AND customer_due_at IS NULL
      AND customer_thread_ref IS NULL
      AND customer_workspace_version = 0
      AND last_customer_activity_at IS NULL
      AND last_customer_visible_event_ref IS NULL
    )
  ),
  CHECK (
    lifecycle_state <> 'WAITING_ON_CLIENT'
    OR (
      collaboration_visibility = 'CUSTOMER_SHARED'
      AND waiting_on_actor = 'CUSTOMER'
      AND active_request_info_ref IS NOT NULL
      AND customer_status_projection = 'ACTION_REQUIRED'
    )
  ),
  CHECK (
    waiting_on_actor <> 'CUSTOMER'
    OR (lifecycle_state = 'WAITING_ON_CLIENT' AND active_request_info_ref IS NOT NULL)
  ),
  CHECK (
    waiting_on_actor = 'CUSTOMER'
    OR active_request_info_ref IS NULL
  ),
  CHECK (
    waiting_on_actor <> 'AUTHORITY'
    OR lifecycle_state = 'WAITING_ON_AUTHORITY'
  ),
  CHECK (
    lifecycle_state <> 'WAITING_ON_AUTHORITY'
    OR (waiting_on_actor = 'AUTHORITY' AND authority_truth_state IN ('UNKNOWN', 'PENDING_ACK', 'PARTIAL_ACK'))
  ),
  CHECK (
    customer_status_projection <> 'WAITING_ON_CONFIRMATION'
    OR (lifecycle_state = 'WAITING_ON_AUTHORITY' AND authority_truth_state IN ('UNKNOWN', 'PENDING_ACK', 'PARTIAL_ACK'))
  ),
  CHECK (customer_status_projection <> 'ACTION_REQUIRED' OR lifecycle_state = 'WAITING_ON_CLIENT'),
  CHECK (customer_status_projection <> 'RESOLVED' OR lifecycle_state = 'DONE'),
  CHECK (
    customer_status_projection <> 'CLOSED'
    OR lifecycle_state IN ('CANCELLED', 'STALE')
  ),
  CHECK (
    customer_status_projection <> 'UNDER_REVIEW'
    OR lifecycle_state IN ('OPEN', 'IN_PROGRESS', 'BLOCKED')
  ),
  CHECK (
    authority_truth_state NOT IN ('UNKNOWN', 'PENDING_ACK', 'PARTIAL_ACK', 'OUT_OF_BAND')
    OR (lifecycle_state <> 'DONE' AND customer_status_projection IS DISTINCT FROM 'RESOLVED')
  ),
  CHECK (
    (lifecycle_state IN ('DONE', 'CANCELLED', 'STALE') AND closed_at IS NOT NULL AND waiting_on_actor = 'NONE')
    OR (lifecycle_state NOT IN ('DONE', 'CANCELLED', 'STALE') AND closed_at IS NULL)
  ),
  CHECK (
    (assignment_state = 'UNASSIGNED' AND current_assignee_ref IS NULL AND escalation_target_ref IS NULL AND last_assignment_at IS NULL)
    OR (assignment_state = 'ASSIGNED' AND current_assignee_ref IS NOT NULL AND escalation_target_ref IS NULL AND last_assignment_at IS NOT NULL)
    OR (assignment_state = 'ESCALATED' AND current_assignee_ref IS NOT NULL AND escalation_target_ref IS NOT NULL AND last_assignment_at IS NOT NULL)
  ),
  CHECK (
    (due_state IS NULL AND due_at IS NULL)
    OR (due_state IS NOT NULL AND due_at IS NOT NULL)
  ),
  CHECK (
    (last_customer_activity_at IS NULL AND last_customer_visible_event_ref IS NULL)
    OR (last_customer_activity_at IS NOT NULL AND last_customer_visible_event_ref IS NOT NULL)
  ),
  CHECK (
    (last_internal_activity_at IS NULL AND last_internal_event_ref IS NULL)
    OR (last_internal_activity_at IS NOT NULL AND last_internal_event_ref IS NOT NULL)
  ),
  CHECK (customer_workspace_version <= staff_workspace_version)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_workflow_items_active_dedupe_key
  ON workflow_items (active_dedupe_key)
  WHERE active_dedupe_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_workflow_items_tenant_client_period
  ON workflow_items (tenant_id, client_id, period, lifecycle_state);

CREATE INDEX IF NOT EXISTS idx_workflow_items_queue_order
  ON workflow_items (
    routing_queue_ref,
    collaboration_priority_score DESC,
    due_at ASC NULLS LAST,
    resolution_confidence_score ASC,
    queue_entered_at ASC,
    item_id ASC
  );

CREATE INDEX IF NOT EXISTS idx_workflow_items_assignee
  ON workflow_items (current_assignee_ref, lifecycle_state)
  WHERE current_assignee_ref IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_workflow_items_authority_truth
  ON workflow_items (authority_truth_state, lifecycle_state);

CREATE INDEX IF NOT EXISTS idx_workflow_items_customer_projection
  ON workflow_items (customer_status_projection, customer_workspace_version)
  WHERE collaboration_visibility = 'CUSTOMER_SHARED';
