# Northbound API and Session Contract

## Purpose

The core algorithm defines command-side truth (`RunManifest`, authority interactions, gate records) and
read-side truth (`DecisionBundle`, `ExperienceDelta`), but production delivery also requires a
first-class contract between product clients and the platform control plane. Without that contract,
duplicate commands, stale-view approvals, reconnect drift, inconsistent client-side inference, and
desktop-cache divergence can reintroduce correctness bugs above an otherwise sound engine.

This contract defines the product-facing command/read surfaces, session rules, stale-view protection,
and reconnect-safe stream behavior.

## 1. Core principles

1. **Command/read separation**. Product clients SHALL issue commands through a command surface and
   SHALL read progress/state through `DecisionBundle`, `ExperienceDelta`, audit, and enquiry-pack
   surfaces. No client may infer legal state from a partially successful command call.
2. **Duplicate suppression at the edge**. Client retries are normal. Duplicate POSTs, mobile
   reconnects, browser refreshes, macOS app relaunch/retry, and operator double-clicks SHALL collapse
   onto one durable command receipt and one legal state transition.
3. **Stale-view protection**. Any command whose legality depends on the state the user saw SHALL carry
   explicit stale-view guards (`if_match_decision_bundle_hash`, `if_match_shell_stability_token`,
   `if_match_frame_epoch`) so the backend can reject approvals or submissions formed from obsolete
   posture.
4. **Read-side determinism**. `ExperienceDelta` remains read-side only. Clients SHALL NOT synthesize
   hidden workflow, trust, or filing states by combining deltas heuristically.
5. **Reconnect safety**. A dropped connection SHALL recover through resume or rebase, not through
   client-side recreation of missing transitions.
6. **Typed failure surfaces**. Every user-visible API failure SHALL return a typed, machine-readable
   problem envelope aligned with existing reason-code families.

## 2. Required northbound surfaces

At minimum, the broader product SHALL expose these surfaces:

- `POST /v1/commands`
- `GET /v1/manifests/{manifest_id}/decision-bundle`
- `GET /v1/manifests/{manifest_id}/experience/snapshot`
- `GET /v1/manifests/{manifest_id}/experience/stream?resume_token=...`
- `GET /v1/manifests/{manifest_id}/audit-trail`
- `GET /v1/manifests/{manifest_id}/enquiry-pack?target_ref=...`
- `GET /v1/client-portal/workspace`
- `GET /v1/client-portal/documents`
- `GET /v1/client-portal/approvals`
- `GET /v1/client-portal/onboarding`
- `GET /v1/client-portal/activity`
- `POST /v1/uploads/sessions`
- `PUT /v1/uploads/sessions/{upload_session_id}/blob`
- `GET /v1/uploads/sessions/{upload_session_id}`

Implementation notes:

- `POST /v1/commands` is the only product-facing write surface for manifest-adjacent truth. It MAY
  dispatch domain-specific command handlers internally, but the external contract SHALL remain
  receipt-based and idempotent.
- `GET /decision-bundle` SHALL return the latest persisted `DecisionBundle` when one exists and SHALL
  include `ETag = decision_bundle_hash`.
- `GET /experience/snapshot` SHALL return the latest materialized frame plus `frame_epoch`,
  `shell_stability_token`, `last_published_sequence`, and a fresh `resume_token`. The same snapshot
  contract SHALL support browser reload, native desktop cold start, and cache rebase without changing
  legal-state semantics.
- `GET /experience/stream` SHALL use a reconnect-safe streaming transport. Server-Sent Events (SSE)
  is the default profile because the flow is primarily server-to-client and ordered by
  `experience_sequence`. Native macOS clients MAY consume the same ordered stream through
  `URLSession` or an equivalent platform transport, but they SHALL preserve exactly the same resume
  and rebase semantics.
- audit and enquiry-pack surfaces SHALL be read-only and SHALL never mutate workflow or compliance
  truth as a side effect of retrieval.

### 2.1 Admin/Governance Console read and simulation surfaces

The broader product SHALL also expose read surfaces for the Admin/Governance Console.
These are still northbound product contracts even though they are not manifest-run screens.
At minimum, provide:

- `GET /v1/governance/tenants/{tenant_id}/overview` returning a `TenantGovernanceSnapshot` with
  pending approvals, risky configuration drift, authority-link health counts, retention exceptions,
  and recent audit hotspots
- `GET /v1/governance/tenants/{tenant_id}/policy-snapshot` returning the current tenant policy,
  security posture, step-up requirements, environment bindings, and a stable
  `policy_snapshot_hash` for stale-view protection
- `GET /v1/governance/tenants/{tenant_id}/principals` returning human, service, and external actors
  with effective roles, authn posture, delegation summary, and last material change refs
- `GET /v1/governance/tenants/{tenant_id}/roles/{role_id}` returning the action-family/resource-class
  matrix plus reason codes, masking posture, required approvals, and scope notes used by the access UI
- `POST /v1/governance/tenants/{tenant_id}/access-simulations` as a non-mutating simulation surface
  for evaluating `AUTHORIZE(...)` against a proposed principal/resource/action tuple without mutating
  live grants
- `GET /v1/governance/tenants/{tenant_id}/authority-links` returning link inventory grouped by client,
  authority scope, provider environment, binding health, and last validation outcome
- `GET /v1/governance/tenants/{tenant_id}/retention` returning policy matrices, legal-hold registers,
  erasure queue summaries, limitation counts, and statutory-baseline vs tenant-override comparisons
- `GET /v1/governance/tenants/{tenant_id}/audit-investigations` returning append-only event slices,
  correlation neighborhoods, and export eligibility for governance investigators

These read surfaces SHALL support route-stable filters, cursor pagination, and immutable object refs so
that dense control-plane screens can update inline without losing selection context.

### 2.2 Customer/Client portal and upload-session surfaces

The broader product SHALL also expose dedicated surfaces for the customer/client portal.
At minimum:

- client portal read surfaces SHALL return plain-language, role-filtered projections (`ClientPortalWorkspace` and route-specific derivatives) and SHALL NOT leak internal-only reason codes, expert surface codes, or raw audit hashes into first-view content
- `POST /v1/uploads/sessions` is the governed binary-transfer exception to the generic command surface: it allocates a resumable `ClientUploadSession` for file bytes, while request attachment/finalization remains a typed command through `POST /v1/commands`
- upload session reads SHALL expose scanner state, checksum posture, validation outcome, and resumability metadata so mobile reconnect does not duplicate files or lose user confidence

## 3. Command envelope

Every northbound command SHALL carry a stable envelope. Minimum fields:

- `command_id`
- `command_type`
- `idempotency_key`
- `actor_session_ref`
- `manifest_id` where an existing manifest is targeted, else `null`
- `tenant_id`
- `client_id`
- `period` where applicable
- `requested_scope[]` where applicable
- `if_match_decision_bundle_hash` where the action depends on the currently viewed terminal bundle
- `if_match_shell_stability_token` where the action is initiated from the live shell
- `if_match_frame_epoch` where the action depends on live streamed posture
- `if_match_policy_snapshot_hash` where the action depends on a governance snapshot, role matrix,
  retention policy frame, or authority-link inventory state
- `payload{}`
- `requested_at`

Rules:

- `command_id` SHALL be client-generated and stable across safe retries of the same intent.
- `idempotency_key` SHALL bind to actor/session, semantic command target, and command payload. A new
  human intent MUST use a new key even if the manifest target is the same.
- `payload{}` SHALL contain only domain inputs required for the command. It SHALL NOT embed authority
  tokens, raw audit signatures, or client-derived legal-state flags.
- commands that alter tenant-wide policy, role grants, authority links, retention policy, legal holds,
  or erasure posture SHALL carry either `if_match_policy_snapshot_hash` or an equivalent object-level
  governance version token so the backend can reject writes formed from stale control-plane state
- Commands that merely change local view state (drawer open/close, compare pin, sort order, filter
  chips, reduced-motion preference) SHALL remain local and SHALL NOT traverse this API.

### 3.1 Governance command families

The Admin/Governance Console SHALL still write through `POST /v1/commands`.
At minimum, support command types equivalent to:

- `ADMIN_UPDATE_TENANT_SETTINGS`
- `ADMIN_STAGE_POLICY_CHANGE`
- `ADMIN_ASSIGN_PRINCIPAL_ROLE`
- `ADMIN_REMOVE_PRINCIPAL_ROLE`
- `ADMIN_SET_PRINCIPAL_ATTRIBUTES`
- `ADMIN_LINK_AUTHORITY`
- `ADMIN_RELINK_AUTHORITY`
- `ADMIN_UNLINK_AUTHORITY`
- `ADMIN_APPLY_RETENTION_POLICY`
- `ADMIN_APPLY_LEGAL_HOLD`
- `ADMIN_RELEASE_LEGAL_HOLD`
- `ADMIN_EXECUTE_ERASURE`
- `ADMIN_EXPORT_AUDIT_SLICE`

Rules:

- commands that widen access, change step-up posture, alter retention minimums, or relink authority
  scope SHALL require step-up or explicit approval according to the actor/authority model
- unmasked audit export and irreversible retention actions SHALL never be accepted from a stale
  governance view
- governance commands SHALL produce ordinary durable command receipts rather than bespoke admin-only
  transport acknowledgements

### 3.2 Client portal command families

Client portal command families SHALL at minimum include:

- `CLIENT_PORTAL_COMPLETE_ONBOARDING_STEP`
- `CLIENT_PORTAL_FINALIZE_UPLOAD`
- `CLIENT_PORTAL_ACKNOWLEDGE_APPROVAL_PACK`
- `CLIENT_PORTAL_SIGN_APPROVAL_PACK`
- `CLIENT_PORTAL_REQUEST_HELP`

Portal command rules:

- sign and acknowledgement commands SHALL carry stale-view guards plus the current `approval_pack_hash` for the pack the client actually saw
- sign-off commands SHALL include fresh step-up proof whenever the approval pack or frozen policy marks step-up as required
- finalize-upload commands SHALL reference an existing governed `upload_session_id`; raw file bytes SHALL NOT traverse `POST /v1/commands`

## 4. Command receipt

Every accepted or duplicate-replayed command SHALL produce a durable `ApiCommandReceipt`. Minimum
fields:

- `receipt_id`
- `command_id`
- `command_type`
- `manifest_id`
- `request_hash`
- `idempotency_key`
- `acceptance_state in {ACCEPTED, DUPLICATE_REPLAY, REJECTED_STALE_VIEW, REJECTED_POLICY, REJECTED_INVALID}`
- `duplicate_of_receipt_id`
- `latest_experience_sequence`
- `reason_codes[]`
- `result_ref`
- `accepted_at`
- `expires_at`

Receipt rules:

- the receipt SHALL be persisted before downstream side effects are published;
- safe retries with equivalent `request_hash` and `idempotency_key` SHALL return the original
  receipt rather than enqueueing duplicate work;
- `ACCEPTED` and `DUPLICATE_REPLAY` are success classes;
- stale-view, policy, and shape failures SHALL remain typed failures and SHALL NOT be disguised as
  accepted async work.

## 5. Problem response contract

Every non-successful response SHALL emit a machine-readable problem envelope with at minimum:

- `problem_code`
- `title`
- `detail`
- `reason_codes[]`
- `retryable`
- `correlation_id`
- `manifest_id` where applicable
- `latest_decision_bundle_ref` where applicable
- `latest_policy_snapshot_ref` where applicable
- `latest_resume_token` or `rebase_required = true` where applicable
- `actionability_state`
- `suggested_detail_surface_code`

This is the transport-layer counterpart to the error/remediation model: it is user-consumable, but it
must remain derivable from typed backend truth rather than free-form prose alone.

## 6. Concurrency and stale-view rules

The backend SHALL reject stale or conflicting commands rather than guessing user intent.

1. Commands that approve, override, submit, or materially change remediation state SHALL require at
   least one stale-view guard.
2. If the currently viewed `DecisionBundle` is stale, the backend SHALL return `409 VIEW_STALE` with
   the latest bundle reference and SHALL NOT auto-rebase the action.
3. If the live shell posture changed such that the primary object/action is no longer valid, the
   backend SHALL reject using `if_match_shell_stability_token`.
4. `frame_epoch` changes SHALL force client rebase before any destructive or filing-capable action is
   accepted.
5. governance mutations formed from an outdated `policy_snapshot_hash`, authority-link version, or
   retention frame SHALL be rejected with a typed stale-view error rather than merged heuristically.
6. client approval and sign-off commands SHALL fail closed when the referenced `approval_pack_hash` has been superseded or when the visible summary no longer matches the current legal pack.
7. Duplicate safe retries SHALL win over race conditions; incompatible concurrent intents SHALL fail
   closed and open a fresh review path when needed.

## 7. Stream and reconnect rules

The stream contract SHALL preserve ordered, reconnect-safe delivery.

- `experience_sequence` SHALL be strictly monotonic within `(manifest_id, frame_epoch)`.
- `resume_token` SHALL bind to `manifest_id`, `frame_epoch`, the last acknowledged sequence, and the
  authenticated session context.
- reuse of a `resume_token` from the wrong session, tenant, or principal class SHALL fail closed.
- the stream SHALL emit typed events at minimum for `experience.delta`, `experience.snapshot`,
  `terminal.bundle`, and `heartbeat`.
- duplicate delta delivery is legal; clients SHALL treat delivery as idempotent by sequence number.
- if history has compacted or `frame_epoch` advanced, the server SHALL return `409 REBASE_REQUIRED`
  plus a fresh snapshot reference instead of inventing missing deltas.
- catch-up and snapshot rebase SHALL preserve the core shell guarantees from
  `low_noise_experience_contract.md` and SHALL not require a destructive route reset.

## 8. Session, browser, and native-client rules

The broader product SHALL treat browser, native desktop, and session posture as governed security
boundaries.

- browser sessions SHALL use secure, `HttpOnly`, same-site session cookies plus an anti-CSRF binding,
  or an equivalent same-origin session mechanism with demonstrably equivalent protections;
- native macOS operator sessions SHALL authenticate through a system-browser or platform auth session,
  SHALL store only product-session artifacts in Keychain-class storage, and SHALL NOT persist raw
  authority credentials on device;
- native clients MAY persist `DecisionBundle`, `ExperienceDelta` snapshots, view preferences, and
  resume metadata for fast relaunch, but all persisted state SHALL remain derivable from server truth
  and SHALL be invalidated on revocation, tenant switch, masking-posture change, or schema
  incompatibility;
- non-browser automation clients MAY use short-lived bearer credentials, but they SHALL still emit
  `command_id` and `idempotency_key`;
- embedded web views, if any, SHALL be limited to low-risk documentation/help content and SHALL NOT be
  trusted as the primary authority for sign-in, step-up completion, or HMRC-only task handoff;
- invite-link or emailed deep-link entry into the client portal SHALL upgrade into a normal authenticated session before document upload, acknowledgement, or sign-off actions are accepted;
- step-up completion SHALL rotate the effective session challenge state so a pre-step-up command cannot
  be replayed afterward without revalidation;
- session revocation SHALL invalidate outstanding resume tokens, upload-session control operations, and future command acceptance.

## 9. Invariants

1. no manifest-adjacent mutation without a durable command receipt
2. no stale approval/override/submit command without explicit backend rejection
3. no reconnect path that depends on client-side reconstruction of legal transitions
4. no cache key for northbound read surfaces that omits tenant, principal class, masking posture,
   manifest identity, and session/client identity
5. no accepted write command that depends on untrusted client-derived legal-state flags
6. no session or command surface that emits raw authority tokens, secrets, or unredacted sensitive
   payloads

## 10. One-sentence summary

The northbound API and session contract turns the blueprint into a production-safe product surface by
making commands idempotent, views concurrency-safe, and reconnect/stream behavior deterministic.
