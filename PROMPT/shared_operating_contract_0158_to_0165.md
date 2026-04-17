# Shared Operating Contract for `pc_0158` to `pc_0165`

This contract governs the northbound read and streaming tranche that turns the earlier command-edge, governance, portal, upload, and collaboration artifacts into stable HTTP and SSE surfaces.
This block is where durable command receipts become recoverable after lost POST responses, persisted `DecisionBundle` and `LowNoiseExperienceFrame` artifacts become stable read surfaces, governance snapshots become route-safe control-plane reads, portal workspaces become customer-safe route reads, governed upload sessions become resumable transfer/status surfaces, and collaboration workspace projections become visibility-safe snapshot/stream/activity/attachment endpoints.

## Read this first

1. Re-read `../AGENT.md` and the exact checklist rows for `pc_0158` through `pc_0165`.
2. Consume the already-authored cards that this tranche depends on, especially `pc_0134` through `pc_0157`.
3. Treat the Taxat algorithm corpus as the source of truth. Route handlers, DTOs, preview harnesses, cache helpers, and test fixtures are downstream only.
4. Keep command truth, durable receipts, read-side projections, stream cursors, upload-session state, and browser-only view state separate. Do not collapse them into one convenience object.
5. Every persisted artifact introduced in this tranche MUST validate against its canonical schema before it is accepted or exposed.

## Canonical reading order for this tranche

1. Prior dependency cards already produced in earlier waves:
   - `pc_0064` through `pc_0069` for ids, hashes, config freeze, schema/migration, idempotent inbox/outbox, and object lifecycle law
   - `pc_0070` through `pc_0077` for stream/cursor/cache/correlation/golden-fixture semantics
   - `pc_0086` through `pc_0093` for principal/access/authorization/delegation/runtime-scope/governance basis rules
   - `pc_0094` through `pc_0101` for session revocation, policy snapshots, run lineage, schema bundle windows, and config materialization
   - `pc_0102` through `pc_0133` for terminal bundle publication, proof/provenance, twin reconciliation, and authority packet foundations
   - `pc_0134` through `pc_0141` for authority transport, request identity, binding drift, ingress normalization, and authority calculation readiness
   - `pc_0142` through `pc_0149` for workflow/collaboration models, route-safe notifications, and request/attachment/thread artifacts
   - `pc_0150` through `pc_0157` for workflow read-model projectors, customer-safe visibility partitions, queue-health services, and `POST /v1/commands`

2. Core Taxat corpus for this block:
   - `README.md`
   - `northbound_api_and_session_contract.md`
   - `frontend_shell_and_interaction_law.md`
   - `low_noise_experience_contract.md`
   - `customer_client_portal_experience_contract.md`
   - `collaboration_workspace_contract.md`
   - `admin_governance_console_architecture.md`
   - `upload_session_request_binding_and_rebase_contract.md`
   - `cross_device_continuity_and_restoration_contract.md`
   - `semantic_selector_and_accessibility_regression_pack_contract.md`
   - `data_model.md`
   - `state_machines.md`
   - `modules.md`
   - `actor_and_authority_model.md`
   - `invariants_and_gates.md`
   - `contract_integrity_requirements.md`
   - `invariant_enforcement_and_fail_closed_contract.md`
   - `replay_and_reproducibility_contract.md`
   - `observability_and_audit_contract.md`
   - `error_model_and_remediation_model.md`
   - `PATCH_RESOLUTION_INDEX.md`
   - `AUDIT_FINDINGS.md`
   - `UIUX_DESIGN_SKILL.md`

3. Authoritative executable artifacts:
   - `schemas/command_envelope.schema.json`
   - `schemas/problem_envelope.schema.json`
   - `schemas/api_command_receipt.schema.json`
   - `schemas/decision_bundle.schema.json`
   - `schemas/low_noise_experience_frame.schema.json`
   - `schemas/experience_cursor.schema.json`
   - `schemas/experience_stream_event.schema.json`
   - `schemas/stream_recovery_contract.schema.json`
   - `schemas/route_stability_contract.schema.json`
   - `schemas/tenant_governance_snapshot.schema.json`
   - `schemas/governance_policy_snapshot.schema.json`
   - `schemas/principal_access_view.schema.json`
   - `schemas/role_template_matrix.schema.json`
   - `schemas/client_portal_workspace.schema.json`
   - `schemas/client_document_request.schema.json`
   - `schemas/client_approval_pack.schema.json`
   - `schemas/client_onboarding_journey.schema.json`
   - `schemas/client_timeline_event.schema.json`
   - `schemas/portal_help_request.schema.json`
   - `schemas/client_upload_session.schema.json`
   - `schemas/upload_request_binding_contract.schema.json`
   - `schemas/upload_session_recovery_harness.schema.json`
   - `schemas/workspace_snapshot.schema.json`
   - `schemas/workspace_cursor.schema.json`
   - `schemas/workspace_stream_event.schema.json`
   - `schemas/collaboration_activity_slice.schema.json`
   - `schemas/collaboration_attachment_slice.schema.json`
   - `scripts/validate_contracts.py`
   - `tools/forensic_contract_guard.py`
   Treat schema rules and validator-enforced invariants as authoritative. Human-readable examples and previews are secondary.

4. External implementation guidance that may sharpen technique but never override Taxat semantics:
   - current Playwright guidance for semantic locators, auto-waiting, actionability-safe interactions, trace capture, APIRequestContext testing, and debugging
   - current Apple HIG guidance for readable typography, restrained motion, materials, and layout width discipline
   - current Material guidance for accessible structure, color-role layering, and coherent transitions

## Package and implementation placement rules

- `pc_0158` through `pc_0165` belong in the northbound/control-plane package selected by `pc_0028`.
  If it does not exist, create `packages/backend-northbound` and emit `ASSUMPTION_BACKEND_NORTHBOUND_PACKAGE_CREATED`.

- Reuse the durable models and services from earlier cards instead of cloning semantics into new packages:
  - `ApiCommandReceipt` and command-edge helpers from `pc_0157`
  - manifest bundle/frame/stream artifacts from `pc_0126` through `pc_0141`
  - governance read-model foundations from `pc_0086` through `pc_0093`
  - portal, upload, and collaboration domain artifacts from `pc_0134` through `pc_0149`
  - workflow projectors and customer-safe/visibility partition logic from `pc_0150` through `pc_0156`

- Keep northbound code organized by boundary:
  - `src/http` for route registration and endpoint handlers
  - `src/query` for read-model/query assembly
  - `src/repositories` for durable storage adapters and lookups
  - `src/services` for guard hashing, route-stability publication, recovery-problem construction, cursor issuance, and upload-session transition logic
  - `src/streams` for manifest/workspace SSE serialization and cursor lifecycle helpers
  - `src/models` only for schema-backed transport/domain boundary objects, never for browser-only state

- Optional preview or contract-explorer surfaces MAY be added only when they materially accelerate endpoint verification.
  Use:
  - `apps/admin-console-web` for governance and staff-visible explorers
  - `apps/client-portal-web` for portal/upload/customer-visible explorers
  Keep them read-only and diagnostic. They are not product branches.

- Respect tranche boundaries.
  This block may complete:
  - `GET /v1/commands/{command_id}`
  - `GET /v1/manifests/{manifest_id}/decision-bundle`
  - `GET /v1/manifests/{manifest_id}/experience/snapshot`
  - `GET /v1/manifests/{manifest_id}/experience/stream`
  - governance overview/policy/principal/role reads
  - portal workspace/documents/approvals/onboarding/activity reads
  - upload allocate/blob/status surfaces
  - collaboration workspace snapshot/stream/activity/attachments reads
  It MUST NOT silently absorb later audit-trail, enquiry-pack, investigation, or filing-confirmation surfaces except for the smallest shared helper required to keep this block executable.

## Shared design contract for any browser-visible explorer introduced in this block

Most cards here are backend-first, but some teams move faster with read-only contract explorers or preview shells. If you add one, keep it aligned with the existing product language instead of building a generic dashboard.

### Explorer families in scope

- command-receipt inspector for recovery-anchor and stale-guard review
- decision-bundle and experience-snapshot explorer for manifest shells
- manifest SSE stream inspector with sequence/rebase ribbon
- governance snapshot / role-matrix inspector
- portal workspace route inspector for documents / approvals / onboarding / activity
- upload-session inspector with phase ladder and binding posture
- collaboration workspace / activity / attachment inspector

### Visual language

- posture: minimalist premium, quiet, typography-first, no KPI wall
- app background: `#F7F5F1`
- primary surface: `#FFFFFF`
- secondary surface: `#F1F3F0`
- elevated surface: `#FCFCFB`
- primary ink: `#171717`
- secondary ink: `#667085`
- calm accent: `#0F766E`
- governance accent: `#1D4ED8`
- caution: `#B7791F`
- danger: `#C2410C`
- borders: `rgba(23,23,23,0.08)`
- shadow ceiling: `0 8px 24px rgba(23,23,23,0.06)`
- typography stack: `Inter`, `SF Pro Text`, `Segoe UI`, sans-serif
- monospace stack: `ui-monospace`, `SFMono-Regular`, `Consolas`, monospace

### Type scale

- page title: `32/38`, semibold
- section title: `20/28`, semibold
- panel title: `16/24`, semibold
- label / eyebrow: `12/16`, medium, `0.04em` tracking
- body: `14/22`, regular
- helper / timestamp / reason text: `12/18`, regular
- ids / hashes / tokens / refs: `12/18`, medium monospace

### Layout rules

- portal explorer max width: `1180px`
- internal explorer max width: `1440px`
- outer padding: `24px` mobile, `32px` desktop
- gutters: `20px`
- radius: `18px` to `20px`
- one dominant column plus at most one restrained contextual rail
- avoid three-column walls, donut charts, heatmaps, glossy hero cards, and decorative telemetry mosaics
- any sequence, route, or stale-guard diagram must preserve the governing server order from the algorithm

### Motion and interaction

- only opacity / translate / height disclosure motion
- duration band: `140ms` to `180ms`
- reduced motion support is mandatory
- no parallax, bounce, or semantic-priority-changing animation
- live streams MUST NOT steal focus from active composers, search fields, or compare controls
- focus order MUST follow visible reading order and route continuity law

### Charts / diagrams / logos

Use diagrams only when they explain a contract faster than prose.
Preferred forms in this tranche:
- one guard-vector ladder or hash lineage ribbon
- one publication-generation / sequence frontier strip
- one upload phase ladder
- one current-versus-history artifact matrix
- one governance dominant-worklist stack

Do NOT add decorative logos, animated counters, or dashboard ornament.

## Non-negotiable interpretation rules

- `GET /v1/commands/{command_id}` is a durable receipt recovery surface, not a projection poller.
  It MUST return the latest lawful `ApiCommandReceipt` for that command id and keep success-class recovery anchors intact even after expiry.

- `DecisionBundle`, `LowNoiseExperienceFrame`, `TenantGovernanceSnapshot`, `GovernancePolicySnapshot`, `PrincipalAccessView`, `RoleTemplateMatrix`, `ClientPortalWorkspace`, `WorkspaceSnapshot`, `CollaborationActivitySlice`, and `CollaborationAttachmentSlice` are read-side artifacts only.
  They MUST NOT be promoted back into legal truth.

- `stability_contract` and `stream_recovery_contract` are authoritative grouped publications.
  Raw `resume_token` is transport material only and MUST NOT become the primary recovery basis.

- `shell_family`, `object_anchor_ref`, `dominant_question`, `settlement_state`, `recovery_posture`, and `interaction_layer` are part of the route contract.
  Reload, reconnect, rebase, notification-open, and responsive collapse must preserve them rather than letting the client invent a second shell.

- Manifest read surfaces stay manifest-scoped.
  Collaboration read surfaces stay work-item-scoped.
  Portal read surfaces stay customer-safe and portal-scoped.
  Governance read surfaces stay control-plane-scoped.
  Problem envelopes MUST publish the narrowest recovery family and MUST NOT mix manifest resume recovery with portal/collaboration/governance recovery in one envelope.

- Portal workspaces and derivatives SHALL keep `shell_family = CLIENT_PORTAL_SHELL`, one active top-level `route`, one matching active `navigation_tabs[]` entry, exact `workspace_version`, explicit `view_guard_ref`, and the grouped `stability_contract`.
  Current-versus-history artifact posture MUST come from `artifact_selection` and `artifact_affordance`, not row order or renderer memory.

- Upload bytes move only through `/v1/uploads/sessions` surfaces.
  Attachment confirmation and other legal mutations remain typed commands through `POST /v1/commands`.
  `ClientUploadSession` MUST keep request-binding posture, resumability posture, integrity posture, scan/validation posture, attachment posture, recovery posture, and next action distinct.

- Collaboration snapshot/stream/activity/attachment reads are visibility-scoped.
  Customer sessions MUST NEVER receive internal thread heads, internal participants, internal attachments, or staff-only audit refs.

- `ExperienceCursor` and `WorkspaceCursor` are durable server artifacts, not client cache hints.
  Live cursors cannot acknowledge past the published frontier; rebased cursors must point at a different replacement snapshot; revoked/expired cursors stay terminal.

- Governance reads MUST preserve focus anchors, selected objects, dominant worklists, and policy snapshot hashes as explicit read-model state.
  Do not replace that with a local permission enum, a generic KPI response, or an unscoped role grid.

- Every route handler introduced in this block must fail closed on access-binding drift, masking drift, tenant drift, schema incompatibility, or mixed-generation guard vectors.

## Common validation and test rules

- Validate every response artifact against its canonical JSON schema.
- Use Playwright APIRequestContext or equivalent HTTP-contract tooling for northbound endpoint tests.
- When an optional browser-visible explorer is added, test it with Playwright using semantic/user-facing locators and actionability-safe interactions.
- No fixed sleeps in stream, retry, or reconnect tests.
- Capture traces or equivalent request/response/event logs on failures.
- Prefer deterministic fixtures and seeded artifacts over timing-dependent live data.
- Re-run `scripts/validate_contracts.py --self-test` and `tools/forensic_contract_guard.py` after the tranche changes land.
