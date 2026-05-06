# Authority Link Inventory And Health Rollups

`pc_0192` adds the authoritative read-side projector for
`GET /v1/governance/tenants/{tenant_id}/authority-links` at
`packages/backend-governance/src/projectors/build_authority_link_inventory_item.ts`.
The projector emits one schema-valid `AuthorityLinkInventoryItem` from durable authority-link,
delegation, token/client binding, validation, and operation-impact inputs. It does not expose raw
tokens, credential payloads, or browser-local handshake internals.

## Projection Boundary

- `binding_health`, `delegation_state`, and `token_client_binding_state` are derived independently.
  Binding health starts from `AuthorityLinkBindingHealthService`, delegation mirrors the durable
  authority-link delegation record, and token/client binding mirrors the durable token-binding
  posture.
- `NOT_REQUIRED` delegation is normalized to inventory `SATISFIED` because the inventory schema only
  publishes action-relevant delegation states.
- Client binding mismatch remains a first-class health state. When the durable lifecycle is otherwise
  active, the inventory lifecycle stays active and `binding_health = CLIENT_BINDING_MISMATCH` carries
  the token/client problem separately.
- Provider environment drift is derived by comparing the durable link environment with the expected
  route environment and fails closed as `ENVIRONMENT_DRIFT` without mutating lifecycle truth.
- `SUPERSEDED` links publish inventory lifecycle `REVOKED` with an explicit
  `AUTHORITY_LINK_SUPERSEDED` blocked reason because the inventory schema does not expose a separate
  superseded lifecycle enum.

## Workspace Shape

- Workspace surfaces are fixed as
  `INVENTORY_RAIL -> WORKSPACE_CANVAS -> AUDIT_SIDECAR`.
- Detail modules are fixed as
  `AuthorityLinkIdentityCard -> BindingHealthTimeline -> HandshakeHistory -> AffectedOperationList -> PreflightChecklist`.
- The interaction layer preserves active filters, selected link, focus anchor, promoted support
  surface, and guided handshake step so reconnect or responsive compaction reopens the same selected
  authority link and slice.
- Filter chips use the validator order:
  `authority_scope`, `client`, `provider_environment`, `lifecycle_state`, `binding_health`,
  `expiry_risk`.

## Health And Issue Promotion

- Promoted issue refs are deterministic:
  `CLIENT_BINDING_MISMATCH`, `DELEGATION_GAP`, `ENVIRONMENT_DRIFT`, `TOKEN_INVALID`, `REVOKED`, and
  `EXPIRED` produce `authority-link-issue.{authority_link_id}.{health}`.
- `prominent_issue_ref_or_null` is null only when the current health state has no material issue to
  promote.
- The binding-health timeline mirrors the top-level binding, delegation, and token/client states and
  reuses the same promoted issue ref.
- Expiry bands are computed from `evaluatedAt` and `expires_at`: expired, 7 days, 14 days, 30 days,
  otherwise none.
- `next_validation_due_at_or_null` defaults to 72 hours after the latest binding check or validation,
  capped at `expires_at`, and is null for terminal revoked, expired, unlinked, or token-invalid
  lifecycle states.

## Handshake And Preflight

- The handshake step order is fixed as
  `SELECT_AUTHORITY -> CONFIRM_CLIENT_SCOPE -> RUN_PREFLIGHT_CHECKS -> AUTHORISE_EXTERNAL_HANDOFF -> VALIDATE_BINDING`.
- `credential_capture_mode` is always `GUIDED_HANDSHAKE_ONLY`.
- Completed steps are always a gap-free prefix of the canonical step order.
- `handshake_history.latest_failure_ref_or_null` is populated only when the latest attempt state is
  `FAILED`, `ABANDONED`, or `EXPIRED`.
- Preflight checks use the fixed order
  `AUTHORITY_SCOPE -> CLIENT_BINDING -> DELEGATION_COVERAGE -> PROVIDER_ENVIRONMENT -> TOKEN_FRESHNESS`.
- `preflight_blocking_check_refs[]` is copied from checklist checks with `check_state = BLOCKED`, so
  the stepper and checklist cannot disagree.

## Operation Impact And Handoff Binding

- Affected operation sections are fixed as
  `PREFLIGHT -> SUBMISSION -> RECONCILIATION -> AMENDMENT`.
- `primary_blocked_operation_ref_or_null` is null when no preflight check is blocked. When blockers
  exist, it must point to the first affected operation whose `blockingCheckRefs` intersects the
  checklist blockers. If no operation rows are supplied, the read model creates one fallback
  preflight-blocked operation so the blocker remains traceable.
- The nested `externalization_governance_contract` is bound to the selected authority link through
  `context_anchor_ref`, `slice_binding_ref`, and `boundary_scope = AUTHORITY_LINK_HANDOFF`.
- Handoff eligibility is `BLOCKED` when the stepper is blocked, `PENDING_RETURN` during external
  handoff or validation return, and `READY` otherwise. Checklist blockers become
  `blocking_context_tokens` and force `limitation_state = PREFLIGHT_BLOCKED`.
- `delivery_binding_hash` is built from the same canonical field set used by the contract validator,
  with blocking context tokens sorted for hash stability.
