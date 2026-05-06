# Scope Execution Binding And Runtime Enforcement

`pc_0090` turns a frozen `AuthorizationDecision` into the runtime contract that downstream execution must consume.

## Design

- `ScopeExecutionBinding` is a first-class governed control object, not a route-local helper.
- `requested_scope[]` remains audit input only after authorization.
- `executable_scope[]` is the only scope downstream orchestration, workers, authority requests, and exporters may execute from.
- `masking_context` is explicitly projection-only.
  It may shape human-facing API views, exports, and read models, but it must not alter canonical facts, compute, request hashing, or authority payload generation.

## Services

- `validate_effective_scope_binding.ts`
  - Fail-closed validation for empty scope, widening beyond request or frozen decision, analysis-mode live scope, masking mismatches, atomic live-request narrowing, partition widening, and replay misuse.
- `materialize_scope_execution_binding.ts`
  - Freezes a schema-valid `ScopeExecutionBinding` from a frozen `AuthorizationDecision`, `PrincipalContext`, execution mode, and executable partition coverage.
  - The binding hash includes the source authorization-decision binding hash plus executable-scope facts so replay after step-up rotation cannot masquerade as the same access posture.
- `enforce_access_scope_and_masking.ts`
  - Primary downstream API.
  - Returns `runtime_scope[]`, `masking_context`, and `scope_execution_binding` together so handlers do not consult raw requested scope.
- `runtime_scope_guard.ts`
  - Replay/reuse guard backed by a durable binding repository.
  - Rejects stale principal-context reuse, widened partitions, widened executable scope, analysis-mode live replay, and service-principal reuse of client-acting bindings.

## Durable Storage Choice

Bindings ultimately belong inside `RunManifest`, `AuthorityOperation`, and related sealed artifacts.
This task also adds `ScopeExecutionBindingRepository` because the repo does not yet have those manifest surfaces, while command-admission and replay checks already need one frozen, queryable execution-binding substrate.

The repository stores:

- the governed `scope_execution_binding`
- the source authorization-decision access binding hash
- the source principal-context access binding hash
- tenant, session, principal, delegation-basis, and action metadata for replay checks

Later manifest and authority-operation cards can embed the exact same binding payload while retaining this repository as the pre-manifest replay and audit substrate.

## Runtime Rules

- `ALLOW` and `ALLOW_MASKED` are the only executable decision postures.
- `ALLOW_MASKED` must retain non-empty masking rules.
- `ALLOW` must retain no masking rules.
- `ANALYSIS` mode must remain `READ_ONLY`.
- Live-capable scope families are atomic.
  If authorization would reduce them, materialization fails with `RUNTIME_SCOPE_ATOMIC_REDUCTION_FORBIDDEN`.
- Replay may not widen executable scope or executable partition coverage.
- A rotated or otherwise changed principal context invalidates older frozen bindings through `RUNTIME_SCOPE_ACCESS_BINDING_STALE`.

## Adoption Rule

Future handlers should call `RuntimeScopeGuard.enforce(...)` or `AccessScopeAndMaskingEnforcer.enforce(...)` after `AUTHORIZE(...)` and then pass only:

- `runtime_scope[]`
- `scope_execution_binding`
- `masking_context`

They should not branch on raw `requested_scope[]` once a frozen binding exists.
