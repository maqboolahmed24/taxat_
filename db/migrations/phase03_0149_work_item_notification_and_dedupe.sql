-- phase03_0149_work_item_notification_and_dedupe.sql
-- Durable notification artifact with dedupe, delivery/read monotonicity, and persisted open-target continuity.

CREATE TABLE IF NOT EXISTS workflow_item_notifications (
  notification_id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL,
  recipient_ref TEXT NOT NULL,
  visibility_class TEXT NOT NULL CHECK (visibility_class IN ('CUSTOMER_VISIBLE', 'INTERNAL_ONLY')),
  notification_type TEXT NOT NULL CHECK (
    notification_type IN (
      'NEW_ASSIGNMENT',
      'REASSIGNMENT',
      'ESCALATION',
      'CUSTOMER_REPLY',
      'CUSTOMER_DUE_DATE_CHANGED',
      'SLA_DUE_SOON',
      'SLA_OVERDUE',
      'SLA_BREACHED',
      'ITEM_RESOLVED',
      'ITEM_CANCELLED',
      'REQUEST_INFO_OPENED',
      'CUSTOMER_VISIBLE_COMMENT'
    )
  ),
  delivery_channel TEXT NOT NULL CHECK (delivery_channel IN ('IN_APP', 'EMAIL', 'PUSH')),
  dedupe_key TEXT NOT NULL UNIQUE,
  semantic_action_id TEXT NOT NULL,
  visibility_partition JSONB NOT NULL,
  access_binding_hash TEXT NOT NULL,
  customer_safe_projection JSONB,
  queue_projection JSONB NOT NULL,
  shell_family TEXT NOT NULL CHECK (shell_family IN ('CALM_SHELL', 'CLIENT_PORTAL_SHELL')),
  object_anchor_ref TEXT NOT NULL,
  cross_device_continuity_contract JSONB NOT NULL,
  target_route_ref TEXT NOT NULL,
  target_module_code TEXT CHECK (
    target_module_code IN (
      'CUSTOMER_ACTIVITY',
      'INTERNAL_ACTIVITY',
      'FILES',
      'LINKED_CONTEXT',
      'AUDIT_TRAIL'
    )
  ),
  focus_anchor_ref TEXT,
  focus_restoration JSONB NOT NULL,
  return_route_ref TEXT NOT NULL,
  return_focus_anchor_ref TEXT NOT NULL,
  fallback_route_ref TEXT NOT NULL,
  fallback_focus_anchor_ref TEXT NOT NULL,
  fallback_reason_code_or_null TEXT NOT NULL,
  workspace_version_at_queue INTEGER NOT NULL CHECK (workspace_version_at_queue >= 0),
  request_info_ref TEXT,
  queued_at TIMESTAMPTZ NOT NULL,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  suppressed_reason_codes JSONB NOT NULL DEFAULT '[]'::jsonb,
  content_fingerprint TEXT NOT NULL,
  inserted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (jsonb_typeof(visibility_partition) = 'object'),
  CHECK (jsonb_typeof(queue_projection) = 'object'),
  CHECK (jsonb_typeof(cross_device_continuity_contract) = 'object'),
  CHECK (jsonb_typeof(focus_restoration) = 'object'),
  CHECK (jsonb_typeof(suppressed_reason_codes) = 'array'),
  CHECK (object_anchor_ref = item_id),
  CHECK (target_route_ref <> return_route_ref),
  CHECK (target_route_ref <> fallback_route_ref),
  CHECK (fallback_route_ref = return_route_ref),
  CHECK (fallback_focus_anchor_ref = return_focus_anchor_ref),
  CHECK (
    (target_module_code IS NULL AND focus_anchor_ref IS NULL)
    OR (target_module_code IS NOT NULL AND focus_anchor_ref IS NOT NULL)
  ),
  CHECK (delivered_at IS NULL OR delivered_at >= queued_at),
  CHECK (read_at IS NULL OR delivered_at IS NOT NULL),
  CHECK (read_at IS NULL OR read_at >= delivered_at),
  CHECK (
    jsonb_array_length(suppressed_reason_codes) = 0
    OR (delivered_at IS NULL AND read_at IS NULL)
  ),
  CHECK (
    visibility_class <> 'CUSTOMER_VISIBLE'
    OR (
      shell_family = 'CLIENT_PORTAL_SHELL'
      AND customer_safe_projection IS NOT NULL
      AND target_route_ref ~ '^/portal/requests/[^[:space:]]+$'
      AND return_route_ref ~ '^(/portal|/portal/requests|/portal/approvals|/portal/help)$'
      AND fallback_route_ref ~ '^(/portal|/portal/requests|/portal/approvals|/portal/help)$'
      AND notification_type IN (
        'REQUEST_INFO_OPENED',
        'CUSTOMER_VISIBLE_COMMENT',
        'CUSTOMER_DUE_DATE_CHANGED',
        'ITEM_RESOLVED',
        'ITEM_CANCELLED'
      )
      AND (target_module_code IS NULL OR target_module_code IN ('CUSTOMER_ACTIVITY', 'FILES'))
    )
  ),
  CHECK (
    visibility_class <> 'INTERNAL_ONLY'
    OR (
      shell_family = 'CALM_SHELL'
      AND customer_safe_projection IS NULL
      AND target_route_ref ~ '^/work/items/[^[:space:]]+$'
      AND return_route_ref ~ '^(/work|/manifests/[^[:space:]]+[?]focus=workflow:[^[:space:]]+)$'
      AND fallback_route_ref ~ '^(/work|/manifests/[^[:space:]]+[?]focus=workflow:[^[:space:]]+)$'
      AND notification_type IN (
        'NEW_ASSIGNMENT',
        'REASSIGNMENT',
        'ESCALATION',
        'CUSTOMER_REPLY',
        'SLA_DUE_SOON',
        'SLA_OVERDUE',
        'SLA_BREACHED',
        'ITEM_RESOLVED',
        'ITEM_CANCELLED'
      )
    )
  ),
  CHECK (
    notification_type <> 'REQUEST_INFO_OPENED'
    OR (
      visibility_class = 'CUSTOMER_VISIBLE'
      AND request_info_ref IS NOT NULL
      AND focus_anchor_ref IS NOT NULL
    )
  ),
  CHECK (notification_type = 'REQUEST_INFO_OPENED' OR request_info_ref IS NULL),
  CHECK (notification_type <> 'CUSTOMER_VISIBLE_COMMENT' OR visibility_class = 'CUSTOMER_VISIBLE')
);

CREATE INDEX IF NOT EXISTS idx_workflow_item_notifications_recipient
  ON workflow_item_notifications (recipient_ref, queued_at, notification_id);

CREATE INDEX IF NOT EXISTS idx_workflow_item_notifications_item
  ON workflow_item_notifications (item_id, queued_at, notification_id);

CREATE INDEX IF NOT EXISTS idx_workflow_item_notifications_visibility
  ON workflow_item_notifications (visibility_class, queued_at, notification_id);

CREATE INDEX IF NOT EXISTS idx_workflow_item_notifications_unread
  ON workflow_item_notifications (recipient_ref, delivered_at, notification_id)
  WHERE delivered_at IS NOT NULL AND read_at IS NULL AND jsonb_array_length(suppressed_reason_codes) = 0;

CREATE INDEX IF NOT EXISTS idx_workflow_item_notifications_read
  ON workflow_item_notifications (recipient_ref, read_at, notification_id)
  WHERE read_at IS NOT NULL;

COMMENT ON TABLE workflow_item_notifications IS
  'Visibility-scoped work item notifications with persisted shell route, focus, fallback, continuity, and dedupe contracts.';
