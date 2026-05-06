# Principal Context And Authorization Decision Models

`pc_0086` turns the `Tenant`, `User`, and `ActorSession` substrate from `pc_0085` into the first durable authorization-control layer for Phase 03. The implementation keeps `PrincipalContext` and `AuthorizationDecision` as frozen governed objects rather than allowing request adapters, controller helpers, or browser-only simulators to rebuild access posture from partial claims.

## Design choices

- Both `PrincipalContext` and `AuthorizationDecision` are durably persisted, not merely emitted transiently with audit mirrors. The control store now carries frozen records for session lookup, principal lookup, policy-snapshot lookup, decision access-binding lookup, and governance simulation correlation.
- `PrincipalContext.access_binding_hash` is the canonical hash of the frozen actor, scope, delegation, authority-link, masking, and policy inputs. `AuthorizationDecision.access_binding_hash` is derived from that principal-context binding plus the final decision posture, effective scope, masking rules, required approvals, required authn level, and governance basis hashes where applicable.
- Policy capabilities remain backend concerns, not UI-local conditionals. `approval_capabilities[]`, `client_portal_capabilities[]`, and `run_kind_capabilities[]` are resolved from the compiled access matrix through `PolicySnapshotRefResolver` and stored in the frozen principal context as machine-readable capability sets.
- Request/session adapters stop at collecting durable facts. `PrincipalContextBuilder` owns the translation from tenant, user, actor-session, policy snapshot, delegation snapshots, and authority-link snapshots into the canonical frozen context. Route handlers and command adapters should pass facts into the builder, not compose authorization objects manually.
- Unknown or not-yet-compiled roles do not disappear from `effective_role_set[]`. The builder preserves the exact user role set, resolves capabilities from whatever compiled role templates currently exist, and leaves missing role templates visible for documentation and later policy work rather than flattening the role set to the currently compiled subset.

## Canonical ordering

The implementation canonicalizes the following arrays before hashing, persistence, or downstream use:

- Scope arrays use the corpus order: `year_end`, `quarterly_update`, `estimate_only`, `prepare_submission`, `submit`, `amendment_intent`, `amendment_submit`.
- Set-like string arrays are trimmed, deduplicated, NFC-normalized, and sorted lexicographically.
- `effective_role_set[]`
- `client_scope[]`
- `requested_scope[]`
- `partition_scope_refs[]`
- `effective_scope[]`
- `effective_partition_scope_refs[]`
- `required_approvals[]`
- `masking_rules[]`
- `delegation_snapshot_refs[]`
- `authority_link_snapshot_refs[]`
- `reason_codes[]`
- `approval_capabilities[]`
- `client_portal_capabilities[]`
- `run_kind_capabilities[]`

This closes the replay-drift gap where hash calculators could otherwise depend on insertion order or partially ordered caller inputs.

## Validation posture

The model layer fails closed before persistence:

- service principals must remain `BASIC`, `UNVERIFIED`, machine-scoped, and free of human approval or client-portal capabilities
- client-acting delegation bases require non-empty `client_scope[]`
- `authority_link_refs[]` require matching `authority_link_snapshot_refs[]`
- `ALLOW_MASKED` requires non-empty masking rules
- `ALLOW` forbids masking rules
- `REQUIRE_STEP_UP` must carry `required_authn_level`
- governance mutation decisions must retain the `dependency_topology_hash` and `simulation_basis_hash` pair together
- chronology must not regress relative to the linked session or earlier frozen authorization basis

Focused tests additionally validate generated `PrincipalContext` and `AuthorizationDecision` payloads against the canonical Python contract validators in `packages/contracts-core/python/validate_contracts.py`.

## Storage layout

`db/migrations/phase03_0002_principal_context_authorization_decision.sql` creates:

- `control_access.principal_context_register`
- `control_access.authorization_decision_register`

The tables enforce tenant scoping, service-principal restrictions, authority-link lineage pairing, governance hash pairing, and decision-posture invariants with control-store constraints and RLS policies.

## Implementation map

- `packages/backend-access/src/models/principal_context.ts`
- `packages/backend-access/src/models/authorization_decision.ts`
- `packages/backend-access/src/services/principal_context_builder.ts`
- `packages/backend-access/src/services/principal_context_normalizer.ts`
- `packages/backend-access/src/services/authorization_decision_factory.ts`
- `packages/backend-access/src/services/reason_code_registry.ts`
- `packages/backend-access/src/services/policy_snapshot_ref_resolver.ts`
- `packages/backend-access/src/repositories/principal_context_repository.ts`

## Result

Later backend-access cards can now consume durable, schema-backed authorization artifacts instead of reconstructing access posture independently in northbound handlers, governance simulators, masking code, or replay flows.
