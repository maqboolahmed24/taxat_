CREATE TABLE IF NOT EXISTS workflow_request_info_records (
  request_info_id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL,
  visibility_class TEXT NOT NULL DEFAULT 'CUSTOMER_VISIBLE',
  request_info_ordinal INTEGER NOT NULL CHECK (request_info_ordinal >= 1),
  lifecycle_state TEXT NOT NULL CHECK (lifecycle_state IN ('OPEN', 'RESPONDED', 'CLOSED')),
  request_state_version INTEGER NOT NULL CHECK (request_state_version >= 1),
  prompt_entry_ref TEXT NOT NULL,
  prompt_body_ref TEXT NOT NULL,
  requested_by_ref TEXT NOT NULL,
  customer_due_at TIMESTAMPTZ,
  opened_notification_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
  opened_at TIMESTAMPTZ NOT NULL,
  response_entry_ref TEXT,
  response_body_ref TEXT,
  responded_by_ref TEXT,
  responded_at TIMESTAMPTZ,
  closure_entry_ref TEXT,
  closed_by_ref TEXT,
  closure_reason_code TEXT CHECK (closure_reason_code IN ('CUSTOMER_REPLY_ACCEPTED', 'CANCELLED', 'SUPERSEDED')),
  closed_at TIMESTAMPTZ,
  audit_event_refs JSONB NOT NULL,
  UNIQUE (item_id, request_info_ordinal),
  CHECK (visibility_class = 'CUSTOMER_VISIBLE'),
  CHECK (jsonb_typeof(opened_notification_refs) = 'array'),
  CHECK (jsonb_typeof(audit_event_refs) = 'array' AND jsonb_array_length(audit_event_refs) >= 1),
  CHECK (
    (response_entry_ref IS NULL AND response_body_ref IS NULL AND responded_by_ref IS NULL AND responded_at IS NULL)
    OR
    (response_entry_ref IS NOT NULL AND response_body_ref IS NOT NULL AND responded_by_ref IS NOT NULL AND responded_at IS NOT NULL)
  ),
  CHECK (response_entry_ref IS NULL OR response_entry_ref <> prompt_entry_ref),
  CHECK (response_body_ref IS NULL OR response_body_ref <> prompt_body_ref),
  CHECK (responded_at IS NULL OR responded_at >= opened_at),
  CHECK (closed_at IS NULL OR closed_at >= opened_at),
  CHECK (responded_at IS NULL OR closed_at IS NULL OR closed_at >= responded_at),
  CHECK (
    lifecycle_state <> 'OPEN'
    OR (
      request_state_version = 1
      AND response_entry_ref IS NULL
      AND response_body_ref IS NULL
      AND responded_by_ref IS NULL
      AND responded_at IS NULL
      AND closure_entry_ref IS NULL
      AND closed_by_ref IS NULL
      AND closure_reason_code IS NULL
      AND closed_at IS NULL
    )
  ),
  CHECK (
    lifecycle_state <> 'RESPONDED'
    OR (
      request_state_version = 2
      AND response_entry_ref IS NOT NULL
      AND response_body_ref IS NOT NULL
      AND responded_by_ref IS NOT NULL
      AND responded_at IS NOT NULL
      AND closure_entry_ref IS NULL
      AND closed_by_ref IS NULL
      AND closure_reason_code IS NULL
      AND closed_at IS NULL
    )
  ),
  CHECK (
    lifecycle_state <> 'CLOSED'
    OR (
      closure_entry_ref IS NOT NULL
      AND closed_by_ref IS NOT NULL
      AND closure_reason_code IS NOT NULL
      AND closed_at IS NOT NULL
    )
  ),
  CHECK (
    closure_reason_code <> 'CUSTOMER_REPLY_ACCEPTED'
    OR (
      request_state_version = 3
      AND response_entry_ref IS NOT NULL
      AND response_body_ref IS NOT NULL
      AND responded_by_ref IS NOT NULL
      AND responded_at IS NOT NULL
    )
  ),
  CHECK (
    closure_reason_code NOT IN ('CANCELLED', 'SUPERSEDED')
    OR (
      request_state_version = 2
      AND response_entry_ref IS NULL
      AND response_body_ref IS NULL
      AND responded_by_ref IS NULL
      AND responded_at IS NULL
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_workflow_request_info_records_item
  ON workflow_request_info_records (item_id, request_info_ordinal);

CREATE INDEX IF NOT EXISTS idx_workflow_request_info_records_lifecycle
  ON workflow_request_info_records (lifecycle_state);

CREATE TABLE IF NOT EXISTS workflow_collaboration_attachments (
  attachment_id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL,
  published_entry_ref TEXT NOT NULL,
  current_state_entry_ref TEXT NOT NULL,
  state_audit_event_ref TEXT NOT NULL,
  visibility_class TEXT NOT NULL CHECK (visibility_class IN ('CUSTOMER_VISIBLE', 'INTERNAL_ONLY')),
  request_info_ref TEXT,
  upload_session_id TEXT NOT NULL UNIQUE,
  publish_copy_mode TEXT NOT NULL CHECK (publish_copy_mode IN ('DIRECT_UPLOAD', 'CUSTOMER_SAFE_COPY', 'CUSTOMER_SAFE_DERIVATIVE')),
  source_attachment_ref TEXT,
  filename TEXT NOT NULL,
  media_type TEXT NOT NULL,
  byte_size INTEGER NOT NULL CHECK (byte_size >= 1),
  checksum TEXT NOT NULL,
  storage_ref TEXT NOT NULL,
  download_ref TEXT,
  malware_scan_state TEXT NOT NULL CHECK (malware_scan_state IN ('PENDING', 'CLEAN', 'QUARANTINED')),
  publication_state TEXT NOT NULL CHECK (publication_state IN ('PENDING_SCAN', 'AVAILABLE', 'QUARANTINED')),
  download_state TEXT NOT NULL CHECK (download_state IN ('PENDING', 'DOWNLOADABLE', 'UNAVAILABLE')),
  unavailable_reason_code TEXT CHECK (unavailable_reason_code IN ('SCAN_PENDING', 'QUARANTINED_BY_MALWARE_SCAN')),
  uploaded_by_ref TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL,
  published_at TIMESTAMPTZ NOT NULL,
  state_changed_at TIMESTAMPTZ NOT NULL,
  scan_completed_at TIMESTAMPTZ,
  semantic_action_id TEXT NOT NULL,
  retention_class TEXT NOT NULL,
  CHECK (published_at >= uploaded_at),
  CHECK (state_changed_at >= published_at),
  CHECK (scan_completed_at IS NULL OR scan_completed_at >= uploaded_at),
  CHECK (source_attachment_ref IS NULL OR source_attachment_ref <> attachment_id),
  CHECK (publish_copy_mode <> 'DIRECT_UPLOAD' OR source_attachment_ref IS NULL),
  CHECK (
    publish_copy_mode = 'DIRECT_UPLOAD'
    OR (visibility_class = 'CUSTOMER_VISIBLE' AND source_attachment_ref IS NOT NULL)
  ),
  CHECK (visibility_class <> 'INTERNAL_ONLY' OR publish_copy_mode = 'DIRECT_UPLOAD'),
  CHECK (
    publication_state <> 'PENDING_SCAN'
    OR (
      malware_scan_state = 'PENDING'
      AND download_state = 'PENDING'
      AND download_ref IS NULL
      AND unavailable_reason_code = 'SCAN_PENDING'
      AND scan_completed_at IS NULL
    )
  ),
  CHECK (
    publication_state <> 'AVAILABLE'
    OR (
      malware_scan_state = 'CLEAN'
      AND download_state = 'DOWNLOADABLE'
      AND download_ref IS NOT NULL
      AND unavailable_reason_code IS NULL
      AND scan_completed_at IS NOT NULL
    )
  ),
  CHECK (
    publication_state <> 'QUARANTINED'
    OR (
      malware_scan_state = 'QUARANTINED'
      AND download_state = 'UNAVAILABLE'
      AND download_ref IS NULL
      AND unavailable_reason_code = 'QUARANTINED_BY_MALWARE_SCAN'
      AND scan_completed_at IS NOT NULL
      AND current_state_entry_ref <> published_entry_ref
    )
  ),
  CHECK (publication_state = 'PENDING_SCAN' OR state_changed_at >= scan_completed_at)
);

CREATE INDEX IF NOT EXISTS idx_workflow_collaboration_attachments_item
  ON workflow_collaboration_attachments (item_id, published_at);

CREATE INDEX IF NOT EXISTS idx_workflow_collaboration_attachments_request
  ON workflow_collaboration_attachments (request_info_ref)
  WHERE request_info_ref IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_workflow_collaboration_attachments_visibility
  ON workflow_collaboration_attachments (visibility_class);

CREATE TABLE IF NOT EXISTS workflow_item_participants (
  item_id TEXT NOT NULL,
  participant_ref TEXT NOT NULL,
  participant_role TEXT NOT NULL CHECK (
    participant_role IN (
      'PREPARER',
      'REVIEWER',
      'APPROVER',
      'SUPPORT_OPERATOR',
      'TENANT_ADMIN',
      'AUDITOR',
      'CLIENT_VIEWER',
      'CLIENT_CONTRIBUTOR',
      'CLIENT_SIGNATORY',
      'SUBJECT_SELF',
      'SUBJECT_REPRESENTATIVE'
    )
  ),
  watch_state TEXT NOT NULL CHECK (watch_state IN ('PRIMARY_OWNER', 'WATCHER', 'CUSTOMER_PARTICIPANT')),
  last_read_customer_sequence INTEGER CHECK (last_read_customer_sequence IS NULL OR last_read_customer_sequence >= 0),
  last_read_internal_sequence INTEGER CHECK (last_read_internal_sequence IS NULL OR last_read_internal_sequence >= 0),
  notification_preferences_ref TEXT NOT NULL,
  PRIMARY KEY (item_id, participant_ref),
  CHECK (
    participant_role NOT IN (
      'CLIENT_VIEWER',
      'CLIENT_CONTRIBUTOR',
      'CLIENT_SIGNATORY',
      'SUBJECT_SELF',
      'SUBJECT_REPRESENTATIVE'
    )
    OR watch_state = 'CUSTOMER_PARTICIPANT'
  ),
  CHECK (
    watch_state <> 'CUSTOMER_PARTICIPANT'
    OR (
      participant_role IN (
        'CLIENT_VIEWER',
        'CLIENT_CONTRIBUTOR',
        'CLIENT_SIGNATORY',
        'SUBJECT_SELF',
        'SUBJECT_REPRESENTATIVE'
      )
      AND last_read_internal_sequence IS NULL
    )
  ),
  CHECK (
    watch_state <> 'PRIMARY_OWNER'
    OR participant_role IN ('PREPARER', 'REVIEWER', 'APPROVER', 'SUPPORT_OPERATOR', 'TENANT_ADMIN')
  )
);

CREATE INDEX IF NOT EXISTS idx_workflow_item_participants_watch_state
  ON workflow_item_participants (watch_state);
