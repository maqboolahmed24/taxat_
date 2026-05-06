# Authorize Module

`packages/backend-access/src/services/authorize.ts` is the backend-access entry point for
`AUTHORIZE(...)`. It consumes one frozen `PrincipalContext`, the compiled access matrix, the
governed authentication- and approval-policy services, and persisted delegation or authority-link
facts, then emits exactly one schema-valid `AuthorizationDecision`.

## Inputs

The authorizer evaluates one canonical tuple family:

- `resource_class`
- `action_family`
- each canonical `requested_scope[]` token
- each canonical `requested_partition_scope_refs[]` ref, or `GLOBAL` when no partition set is
  requested
- the merged role cell from `config/access/access_control_matrix.json`
- the tuple-level authentication rule from `config/access/authentication_level_policy.json`, when
  present
- the tuple-level approval rule from
  `config/access/approval_requirement_resolution.json`, when present
- the non-delegable action-family rule from
  `config/access/non_delegable_action_family_catalog.json`, when present
- partition-scoped delegation or authority-link posture from the repositories added in `pc_0088`
- projection masking legality from `masking_projection_policy.ts`

When an action requires client or authority context, callers supply `operation_target` with the
reporting subject, authority scope, and, for authority-linked actions, the client plus provider
coordinates.

## Runtime Policy Source

Runtime policy evaluation intentionally uses three sources in parallel:

- `access_control_matrix.json` provides the compiled role cells and frozen `policy_snapshot_hash`
- `authentication_level_policy.json` plus
  `non_delegable_action_family_catalog.json` keep step-up, freshness, and challenge-rotation
  posture explicit
- `approval_requirement_resolution.json` keeps approval obligations, governance preview-only
  blocking, and approver-capability resolution explicit

That split closes the precedence gap from the compiled matrix alone. For example,
`LINK_AUTHORITY_SOFTWARE` retains both the step-up and approval lineage, and the final decision can
surface `REQUIRE_STEP_UP` first while still preserving the pending approval obligation in the
blocked-response helper and in the boundary contract.

## Tuple Evaluation

`authorization_tuple_evaluator.ts` computes one result per `(scope_token, partition_ref)` pair.
Each tuple carries:

- direct allow, step-up path, approval path, or blocked posture
- reason-code lineage
- delegation state and freshness posture
- authority-link state
- exceptional-authority posture
- the snapshot refs that support the tuple when delegation or authority linkage is actually present

`partition_scope_evaluator.ts` performs the repository-backed edge lookup per partition. It uses the
existing `AuthorityEdgeResolutionService` so delegation freshness, authority-link binding health,
and supporting-agent restrictions stay centralized.

## Decision Precedence

Decision selection follows the corpus ordering:

1. `DENY` when no tuple remains a candidate
2. `REQUIRE_STEP_UP` when no tuple is directly executable and at least one tuple is on the
   step-up path
3. `REQUIRE_APPROVAL` when no tuple is directly executable, no tuple remains on the step-up path,
   and at least one tuple is on the approval path
4. `ALLOW_MASKED` when at least one directly executable tuple requires projection masking
5. `ALLOW` otherwise

The authorizer does not rely on the compiled cell winner alone. It uses the dedicated step-up and
approval services to preserve the corpus rule that step-up surfaces first when both obligations
remain outstanding.

## Atomicity

`effective_scope_reducer.ts` treats requests containing live mutation-capable scope tokens
(`prepare_submission`, `submit`, `amendment_intent`, `amendment_submit`) as atomic.

When any tuple inside that request is blocked or requires escalation:

- directly executable tuples are zeroed before final decision selection
- the request cannot silently degrade into a narrower executable write
- the final result is therefore `DENY`, `REQUIRE_STEP_UP`, or `REQUIRE_APPROVAL`, never a narrowed
  `ALLOW`

This closes the hidden partial-execution gap for live filing or amendment flows.

## Masking

`masking_projection_policy.ts` keeps masking as a projection-only concern.

- Masking only activates when the merged role cell is `ALLOW_MASKED`
- Masking never rewrites canonical source, compute, packet, or authority bytes
- Live mutation-capable scope tokens are illegal under projection masking and therefore cannot
  become directly executable through a masked posture

`ALLOW_MASKED` decisions therefore carry `masking_rules[]`, but those rules are consumed only by
read or export projections downstream.

## Boundary and Persistence

The final `AuthorizationDecision` is created through `AuthorizationDecisionFactory`, then optionally
persisted through `AuthorizationDecisionPersistenceService`, which delegates to
`PrincipalContextRepository`.

`authorize.ts` also builds one consistent blocked-response shape through
`access_blocked_response.ts`. Controllers can use that object instead of improvising separate
payloads for deny, step-up, and approval exits.

Important authority-boundary details:

- delegation-required actions now use `integration_capability = AUTHORITY_INTEGRATED` even when no
  external authority link is required, so delegation posture is not erased
- authority-integrated denials may keep `authority_link_state = UNLINKED` with an empty
  `authority_link_snapshot_refs[]`; the decision model no longer forces a fake link lineage when no
  link exists

## Governed Reason Codes

`config/access/authorization_reason_code_map.json` maps tuple and edge-evaluator codes onto the
governed catalog in `config/access/reason_code_catalog.json`.

The current map covers:

- delegation freshness and expiry failures
- authority-link binding-health failures
- supporting-agent restrictions
- client-portal capability failures
- governance approval gating when a supplied mutation basis remains unsafe

The factory remains the final guardrail. If a mapped code is not registered for the selected
decision outcome, decision creation fails closed.
