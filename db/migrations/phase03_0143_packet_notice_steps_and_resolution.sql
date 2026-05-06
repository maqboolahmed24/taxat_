-- phase03_0143_packet_notice_steps_and_resolution.sql
-- Durable packet-local filing notice artifacts for pc_0143.

create table if not exists filing_notice_steps (
  notice_step_id text primary key,
  notice_step_ref text not null unique,
  manifest_id text not null,
  packet_id text not null,
  step_code text not null check (
    step_code in (
      'DECLARED_BASIS_ACK_REQUIRED',
      'DISCLAIMER_ACK_REQUIRED',
      'PACKET_APPROVAL_REQUIRED'
    )
  ),
  lifecycle_state text not null check (lifecycle_state in ('PENDING', 'SATISFIED', 'UNSATISFIABLE')),
  reason_codes jsonb not null,
  scope_refs jsonb not null,
  packet_refs jsonb not null,
  created_at timestamptz not null,
  resolved_at timestamptz null,
  content_fingerprint text not null,
  row_version integer not null default 1,
  inserted_at timestamptz not null default now(),
  check (jsonb_typeof(reason_codes) = 'array' and jsonb_array_length(reason_codes) > 0),
  check (jsonb_typeof(scope_refs) = 'array' and jsonb_array_length(scope_refs) > 0),
  check (jsonb_typeof(packet_refs) = 'array' and jsonb_array_length(packet_refs) > 0),
  check (
    (lifecycle_state = 'PENDING' and resolved_at is null)
    or (lifecycle_state in ('SATISFIED', 'UNSATISFIABLE') and resolved_at is not null)
  ),
  check (resolved_at is null or resolved_at >= created_at)
);

create index if not exists filing_notice_steps_manifest_idx
  on filing_notice_steps (manifest_id, packet_id, step_code);

create index if not exists filing_notice_steps_packet_idx
  on filing_notice_steps (packet_id, step_code, created_at);

create table if not exists filing_notice_resolutions (
  notice_resolution_id text primary key,
  notice_resolution_ref text not null unique,
  manifest_id text not null,
  packet_id text not null,
  notice_step_refs jsonb not null,
  notice_refs jsonb not null,
  notice_requirements_satisfied boolean not null,
  approval_state text not null check (
    approval_state in (
      'NOT_REQUIRED',
      'SATISFIED',
      'REQUIRED_PENDING',
      'UNSATISFIABLE',
      'DENIED'
    )
  ),
  declared_basis_ack_state text not null check (
    declared_basis_ack_state in (
      'NOT_APPLICABLE',
      'NOT_REQUIRED',
      'SATISFIED',
      'REQUIRED_PENDING',
      'UNSATISFIABLE'
    )
  ),
  unresolved_reason_codes jsonb not null default '[]'::jsonb,
  resolved_at timestamptz not null,
  content_fingerprint text not null,
  row_version integer not null default 1,
  inserted_at timestamptz not null default now(),
  check (jsonb_typeof(notice_step_refs) = 'array' and jsonb_array_length(notice_step_refs) > 0),
  check (notice_refs = notice_step_refs),
  check (jsonb_typeof(unresolved_reason_codes) = 'array'),
  check (
    (notice_requirements_satisfied and jsonb_array_length(unresolved_reason_codes) = 0)
    or ((not notice_requirements_satisfied) and jsonb_array_length(unresolved_reason_codes) > 0)
  ),
  check (
    (not notice_requirements_satisfied)
    or approval_state in ('NOT_REQUIRED', 'SATISFIED')
  ),
  check (
    (not notice_requirements_satisfied)
    or declared_basis_ack_state in ('NOT_APPLICABLE', 'NOT_REQUIRED', 'SATISFIED')
  )
);

create index if not exists filing_notice_resolutions_manifest_idx
  on filing_notice_resolutions (manifest_id, packet_id, resolved_at);

create index if not exists filing_notice_resolutions_packet_idx
  on filing_notice_resolutions (packet_id, notice_requirements_satisfied, resolved_at);
