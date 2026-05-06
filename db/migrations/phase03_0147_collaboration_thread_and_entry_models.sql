-- phase03_0147_collaboration_thread_and_entry_models.sql
-- Append-only collaboration lanes and activity entries for WorkflowItem workspaces.

CREATE TABLE IF NOT EXISTS collaboration_threads (
  thread_id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL,
  visibility_class TEXT NOT NULL CHECK (visibility_class IN ('CUSTOMER_VISIBLE', 'INTERNAL_ONLY')),
  head_sequence INTEGER NOT NULL CHECK (head_sequence >= 0),
  lifecycle_state TEXT NOT NULL CHECK (lifecycle_state IN ('OPEN', 'CLOSED', 'LIMITED')),
  participant_refs JSONB NOT NULL,
  last_entry_ref TEXT,
  content_fingerprint TEXT NOT NULL,
  row_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (jsonb_typeof(participant_refs) = 'array' AND jsonb_array_length(participant_refs) > 0),
  CHECK (
    (head_sequence = 0 AND last_entry_ref IS NULL AND lifecycle_state = 'OPEN')
    OR (head_sequence >= 1 AND last_entry_ref IS NOT NULL)
  ),
  UNIQUE (item_id, visibility_class)
);

CREATE TABLE IF NOT EXISTS collaboration_entries (
  entry_id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL,
  thread_id TEXT NOT NULL REFERENCES collaboration_threads (thread_id),
  thread_sequence INTEGER NOT NULL CHECK (thread_sequence >= 1),
  entry_type TEXT NOT NULL CHECK (
    entry_type IN (
      'COMMENT',
      'NOTE',
      'STATUS_CHANGE',
      'ASSIGNMENT_CHANGE',
      'ESCALATION',
      'REQUEST_INFO',
      'REQUEST_INFO_RESPONSE',
      'ATTACHMENT_ONLY',
      'SYSTEM'
    )
  ),
  visibility_class TEXT NOT NULL CHECK (visibility_class IN ('CUSTOMER_VISIBLE', 'INTERNAL_ONLY')),
  causal_parent_entry_ref TEXT,
  body_ref TEXT,
  attachment_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
  actor_ref TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  command_id TEXT NOT NULL UNIQUE,
  semantic_action_id TEXT NOT NULL,
  command_receipt_ref TEXT NOT NULL,
  audit_event_ref TEXT NOT NULL,
  request_info_ref TEXT,
  redaction_state TEXT NOT NULL CHECK (redaction_state IN ('NONE', 'REDACTED')),
  content_fingerprint TEXT NOT NULL,
  inserted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (jsonb_typeof(attachment_refs) = 'array'),
  CHECK (
    entry_type NOT IN ('NOTE', 'ASSIGNMENT_CHANGE', 'ESCALATION')
    OR visibility_class = 'INTERNAL_ONLY'
  ),
  CHECK (
    entry_type NOT IN ('REQUEST_INFO', 'REQUEST_INFO_RESPONSE')
    OR (
      visibility_class = 'CUSTOMER_VISIBLE'
      AND request_info_ref IS NOT NULL
      AND causal_parent_entry_ref IS NOT NULL
    )
  ),
  CHECK (
    entry_type IN ('REQUEST_INFO', 'REQUEST_INFO_RESPONSE')
    OR request_info_ref IS NULL
  ),
  CHECK (
    (entry_type = 'ATTACHMENT_ONLY' AND body_ref IS NULL AND jsonb_array_length(attachment_refs) >= 1)
    OR (entry_type <> 'ATTACHMENT_ONLY' AND body_ref IS NOT NULL)
  ),
  UNIQUE (thread_id, thread_sequence)
);

CREATE INDEX IF NOT EXISTS idx_collaboration_threads_item_visibility
  ON collaboration_threads (item_id, visibility_class, lifecycle_state);

CREATE INDEX IF NOT EXISTS idx_collaboration_entries_thread_order
  ON collaboration_entries (thread_id, thread_sequence);

CREATE INDEX IF NOT EXISTS idx_collaboration_entries_item_visibility
  ON collaboration_entries (item_id, visibility_class, created_at, thread_sequence);

CREATE INDEX IF NOT EXISTS idx_collaboration_entries_actor
  ON collaboration_entries (actor_ref, created_at);

CREATE INDEX IF NOT EXISTS idx_collaboration_entries_request_info
  ON collaboration_entries (request_info_ref, thread_sequence)
  WHERE request_info_ref IS NOT NULL;

COMMENT ON TABLE collaboration_threads IS
  'Visibility-scoped append-only activity lanes for WorkflowItem collaboration.';

COMMENT ON TABLE collaboration_entries IS
  'Immutable collaboration activity entries ordered by thread_sequence and bound to one command receipt, semantic action, and audit event.';
