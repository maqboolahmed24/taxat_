# Hash Calculation Contracts

`pc_0093` centralizes backend-access hashing on top of the domain-kernel canonical JSON substrate from `pc_0064`. The authoritative implementation lives in [`packages/backend-access/src/hash/canonical_hash_serializer.ts`](../../packages/backend-access/src/hash/canonical_hash_serializer.ts) and the domain-specific assemblers under [`packages/backend-access/src/hash/`](../../packages/backend-access/src/hash).

## Serializer Rules

- Digest algorithm: SHA-256 via the existing domain-kernel `stableJsonHash(...)` helper. No backend-access module invents a second algorithm.
- String handling: canonical JSON preserves the underlying string content and normalizes Unicode to NFC. Domain-specific builders apply `requireTrimmedString(...)` or `requireCanonicalString(...)` where the contract requires trimmed identifiers.
- Object ordering: object keys are serialized lexicographically, independent of host-language insertion order.
- Arrays: only set-like contract fields are deduplicated and sorted. Examples are `effective_role_set`, `required_approvals` on authorization decisions, `requested_approver_scope`, and `referenced_object_version_refs`. Ordered contract arrays that already carry semantic order, such as governance hazard reason/code arrays, are preserved as-is after element normalization.
- Null versus absent: the canonical serializer rejects `undefined`. Backend-access hash builders must materialize optional fields as explicit `null` when the contract says “not present”.
- Timestamps: the generic serializer converts `Date` instances to normalized UTC instants; domain-specific builders also normalize string timestamps such as `authorization_evaluated_at`.
- Nested vectors: nested objects are recursively canonicalized before hashing. `proposed_diff` and `authority_layer_boundary` therefore hash stably even if source objects were assembled in different key orders.

## Formula Boundaries

- Generic substrate:
  - [`packages/backend-access/src/hash/canonical_hash_serializer.ts`](../../packages/backend-access/src/hash/canonical_hash_serializer.ts)
- Access-binding formulas:
  - [`packages/backend-access/src/hash/access_binding_hash.ts`](../../packages/backend-access/src/hash/access_binding_hash.ts)
  - `PrincipalContext`
  - `AuthorizationDecision`
  - `ScopeExecutionBinding`
- Governance basis formulas:
  - [`packages/backend-access/src/hash/dependency_topology_hash.ts`](../../packages/backend-access/src/hash/dependency_topology_hash.ts)
  - [`packages/backend-access/src/hash/simulation_basis_hash.ts`](../../packages/backend-access/src/hash/simulation_basis_hash.ts)
  - [`packages/backend-access/src/hash/hazard_contract_hash.ts`](../../packages/backend-access/src/hash/hazard_contract_hash.ts)
  - [`packages/backend-access/src/hash/basis_contract_hash.ts`](../../packages/backend-access/src/hash/basis_contract_hash.ts)

## Versioning Posture

- Serializer profile: `BACKEND_ACCESS_CANONICAL_HASH_V1`
- Fixture catalog: `BACKEND_ACCESS_HASH_VECTOR_FIXTURES_V1`
- Governance contract versions remain their own first-class payload fields:
  - `GOVERNANCE_MUTATION_HAZARD_CONTRACT_V1`
  - `GOVERNANCE_MUTATION_BASIS_CONTRACT_V1`

If a future change needs different hash inputs, add a new explicit formula/profile version and keep the historical V1 builders intact for replay. Do not mutate the V1 input shape in place.

## Published Fixture Digests

The cross-language-ready fixture catalog is published in [`packages/backend-access/src/hash/hash_vector_fixtures.ts`](../../packages/backend-access/src/hash/hash_vector_fixtures.ts). The current golden digests are:

- `principal_context_access_binding`: `c63ee34bb459aff65f1e3e571a1b88cfeac761eafae1faa417bdbca7f75a3428`
- `dependency_topology_hash`: `ece6f1697e7232bf6e37e7ec4ae171aba471c536fd7cb27f2fd58a1e1b5f8bb9`
- `simulation_basis_hash`: `856bef4fd97756207e500437205cc5c31ebb81b5b7500338dac4b2d5904b8db1`
- `governance_authorization_decision_access_binding`: `a4d3839fd157877fcc6614caa2c20bc3b2efd5d8d70aefe8bedf64d4fe68dc6f`
- `allow_authorization_decision_access_binding`: `53f3b544272a286e59aa1572d6834633f746a69bd667aa669431ee45d9716d37`
- `scope_execution_binding_access_binding`: `3fc20f948b83d1f1211257cb4e7e6c8d6dcfe770de0741264fabc572aefe8630`
- `governance_mutation_hazard_contract_hash`: `b97ac7943a82d31d0993c899f04a5f989557f363e2b7921800bb77b43fbd8cba`
- `governance_mutation_basis_contract_hash`: `6d9f48337b10cffa2f8bf687181779e0378eac3b07b5672ad04922983a17decb`

Those fixture vectors are the contract for replay tooling and for any future implementation in another language.
