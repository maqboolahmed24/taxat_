# POST /v1/commands and ApiCommandReceipt

`POST /v1/commands` is implemented in `packages/backend-northbound` as a framework-neutral route handler. It validates the incoming `CommandEnvelope` against the northbound policy bundle, rejects projection-derived authority inputs, hashes the full command request including `command_id`, persists an `ApiCommandReceipt` before dispatch, and returns typed `ProblemEnvelope` failures for stale views, invalid envelopes, and idempotency collisions.

## Admission Order

1. Parse the request body as `CommandEnvelope` and bind it to the authenticated `NorthboundActorContext`.
2. Validate command-family target scope, required stale guards, truth-boundary contract, canonical requested scope, and payload constraints.
3. Hash the command request with `NORTHBOUND_COMMAND_REQUEST_HASH_V1`; `command_id` and `idempotency_key` both participate in duplicate suppression.
4. Return a durable `DUPLICATE_REPLAY` receipt for exact safe retry, or a typed `IDEMPOTENCY_COLLISION` problem when the same key is reused with a different request hash.
5. Evaluate stale guards against the current route stability state.
6. Persist an `ACCEPTED` receipt before invoking the domain command handler.

## Receipt Store

The migration `db/migrations/phase03_0157_api_command_receipt_store.sql` creates `api_command_receipts` with:

- immutable `receipt_id` primary key;
- command lookup by `(tenant_id, command_id)`;
- exact accepted duplicate suppression by `(tenant_id, principal_ref, session_ref, command_id, idempotency_key, request_hash)`;
- idempotency collision lookup by actor/session/idempotency key;
- JSONB storage for the receipt payload, original command envelope, truth boundary, mutation binding, route stability, and governance mutation basis.

Success-class receipts must keep at least one durable recovery anchor. A projection ref may be present as an observational mirror, but it is not allowed to be the sole recovery basis.

## Route Integration

Use `registerPostCommandsRoute(registry, dependencies)` to mount the handler at `POST /v1/commands`. The dependencies require a route-state resolver so stale guards are compared against a current grouped `RouteStabilityContract` before the command is accepted.
