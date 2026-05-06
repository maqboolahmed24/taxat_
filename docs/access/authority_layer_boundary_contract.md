# Authority Layer Boundary Contract

`pc_0087` introduces the first governed runtime for `AuthorityLayerBoundaryContract` in
`packages/backend-access`.

## Purpose

The boundary packet keeps these layers separate and queryable:

- tenant permission
- client delegation
- imported delegation freshness
- authority-link readiness
- exceptional authority
- human-gate requirement and evidence posture
- authority-of-record precedence

This closes the earlier gap where simulator and controller paths could flatten those dimensions into
one boolean or one role check.

## Runtime Layout

The implementation lives in:

- `packages/backend-access/src/models/authority_layer_boundary_contract.ts`
- `packages/backend-access/src/services/authority_layer_boundary_resolver.ts`
- `packages/backend-access/src/services/authority_boundary_validator.ts`
- `packages/backend-access/src/services/authority_chain_layer_builder.ts`
- `packages/backend-access/src/services/authority_boundary_reasoning.ts`

The resolver accepts frozen principal facts plus explicit boundary inputs:

- `principal_context.principal_type`
- `principal_context.delegation_basis`
- `tenant_permission_state`
- delegation requirement, posture, and imported-freshness posture
- authority-link lifecycle and token/client-binding posture
- exceptional-authority posture
- human-gate requirement and evidence posture
- target binding scope class

The resolver is side-effect free. It does not mutate delegation grants, authority links, or approval
records. It only materializes the packet and validates it fail-closed.

## Persistence Decision

This card keeps the contract as a nested governed JSON object inside downstream artifacts such as
`AuthorizationDecision` and `GovernanceAccessSimulation`.

That is intentional:

- the contract is small enough for hot-path retrieval
- the field ordering is frozen for deterministic serialization
- no connector-specific token blob is required to query or audit it
- relational decomposition can be added later for dedicated authority-link or delegation indexes
  without changing the public packet

## Stable Chain Representation

`authority_chain_layers[]` is emitted in one fixed order:

1. `SESSION_AUTHN_POSTURE`
2. `TENANT_OPERATIONAL_AUTHORITY`
3. `CLIENT_DELEGATION_COVERAGE`
4. `EXTERNAL_AUTHORITY_LINK_READINESS`
5. `AUTHORITY_OF_RECORD_OUTCOME`

This ordering is shared across authorization views, simulations, and later sendable authority
artifacts so downstream code does not invent its own explanation stack.

## Authority Of Record Precedence

The packet itself freezes the precedence policy as
`EXTERNAL_TRUTH_SUPERSEDES_INTERNAL_EXCEPTION`.

Current runtime reasoning accepts an explicit authority-of-record posture input for explanation and
chain-layer emission:

- `NOT_APPLICABLE`
- `NOT_EVALUATED`
- `CONFLICT_UNCERTAIN`
- `CONFIRMED`

`CONFLICT_UNCERTAIN` fails closed and is the path used when external truth is unresolved or
conflicts with internal workflow truth. Internal overrides and accepted risk never become confirmed
authority truth.

## Derived Versus Frozen Fields

Frozen from the caller:

- `binding_scope_class`
- `principal_type`
- `delegation_basis`
- `tenant_permission_state`
- explicit delegation, link, exceptional-authority, and human-gate source facts

Derived by the resolver:

- `integration_capability` when omitted
- `client_delegation_state` fail-closed defaults
- `delegation_freshness_state`
- `authority_link_state` fail-closed mapping for token/client mismatch
- `human_gate_resolution_state` when only requirement and exceptional evidence posture are given

Recomputation is only legal when evaluating a new authorization or simulation slice with new frozen
inputs. It is not legal for controllers or UI routes to mutate the boundary packet ad hoc.

## Edge Handling

The validator rejects the key shortcut cases called out by the corpus:

- internal-only posture with live delegation or authority-link requirements
- service principal claiming frozen human-gate satisfaction
- imported or digital-handshake delegation with `NOT_APPLICABLE` freshness
- bounded exceptional authority without frozen evidence
- sendable authority artifacts without satisfied tenant permission, live delegation posture, active
  or limited link state, and frozen human evidence

Reserved-action and reduced-authority failures are represented by
`tenant_permission_state = DENIED` plus typed tenant-operation reason codes such as
`ACTION_FAMILY_RESERVED_TO_MAIN_AGENT`.

