# Connector Binding Resolution And Fetch Dispatch Pipeline

`pc_0111` adds the provider-neutral collection dispatch boundary. Application services resolve a sealed `ConnectorBinding`, build a deterministic request envelope, and call only `ControlledGatewayClient`.

## Binding Resolution

Binding selection starts from `SourcePlan.planned_sources[].provider_binding_ref` and accepts an exact match against:

- `ConnectorBinding.binding_id`
- `connector-binding://${binding_id}`
- `ConnectorBinding.binding_lineage_ref`

After the exact binding match, the resolver fails closed unless all execution dimensions match:

- `tenant_id`
- `client_id`
- `subject_ref`
- `provider`
- `provider_environment`
- `provider_api_version`
- `partition_scope_refs[]`, where an empty binding partition set means no partition ceiling and a non-empty set must contain every planned partition
- required gateway scopes, defaulting to the planned `source_domain`

Posture must be `lifecycle_state = ACTIVE`, `health_state = HEALTHY | EXPIRING_SOON`, `client_binding_state = BOUND`, and `delegation_state = NOT_REQUIRED | SATISFIED`. Revoked, expired, superseded, token-invalid, client-mismatched, environment/API-drifted, scope-limited, and ambiguous bindings all return typed fetch-gap codes before transport.

## Request Envelope

`buildCollectionFetchRequest(...)` freezes the planned source into `CollectionFetchRequestEnvelope` with:

- deterministic `request_id`, `request_hash`, and idempotency key
- source plan fields: source domain/class, query basis, cursor strategy, read model, late-data policy, required schemas, and partition scope
- connector lineage: binding id/ref, token ref, token version ref, binding lineage ref, provider, environment, client, and subject
- gateway policy proving credentials are gateway-issued from opaque token refs and application code cannot make direct provider calls

Read models map provider-neutrally:

- `AS_OF`: `as_of_at = read_cutoff_at`
- `WINDOWED`: `window_closed_at = read_cutoff_at`, `window_basis_ref = query_basis_ref`
- `POINT_IN_TIME`: `point_in_time_at = read_cutoff_at`
- `LATEST_ALLOWED`: `latest_allowed_at = read_cutoff_at`

Requests cannot be built after the active `read_cutoff_at`.

## Dispatch And Normalization

`dispatchCollectionFetch(...)` calls `ControlledGatewayClient.sendCollectionFetch(...)` and normalizes gateway responses into `FetchDispatchResult`.

Result posture:

- all successful pages: `SOURCE_FETCHED`
- audited empty response: `SOURCE_EMPTY_CONFIRMED`
- page-level timeout, parse failure, pagination truncation, revision drift, rate limit, or schema drift: `SOURCE_PARTIAL_GAP`
- gateway aborts, auth/client/binding failures, environment drift, or read-cutoff violations: `SOURCE_FATAL_FAILURE`

Request and page audit refs are deterministic `fetch-audit://...` refs, deduped and sorted. Cursor checkpoint refs and revision refs are derived from request hash, gateway exchange ref, page cursor material, revision markers, and observed provider schema version so replay of the same response yields the same boundary inputs.

An empty success is not missing-source posture. It carries `empty_response_confirmed = true`, request/page audit lineage, and no partial gap refs so later boundary freezing can persist `NO_DATA_CONFIRMED_AT_CUTOFF` distinctly from `MISSING_AT_CUTOFF`.
