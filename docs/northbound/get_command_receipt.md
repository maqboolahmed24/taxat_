# GET /v1/commands/{command_id}

`GET /v1/commands/{command_id}` is the durable readback surface for a client-generated command id after a lost `POST /v1/commands` response, safe retry, automation poll, browser refresh, or app relaunch. It returns an `ApiCommandReceipt`; it does not rehydrate legal state from projections and it does not act as a projection poller.

## Lookup and Visibility Boundary

The repository lookup starts at `tenant_id + command_id` and then selects the latest receipt visible to the current actor. Visibility is exact on:

- `tenant_id`
- `principal_ref`
- synthetic receipt `client_id` (`actor.client_id_or_null`, or `client.system.control-plane` for unscoped system reads)
- true target scope class and target ref shape

Session ref is preserved on the receipt for audit and duplicate-suppression lineage, but readback does not require the current session to equal the original session. This keeps app relaunch recovery possible while staying tenant-, client-, principal-, and scope-safe.

Hidden receipts and missing receipts both return `COMMAND_RECEIPT_NOT_FOUND` with `404` and no `latest_command_receipt_ref`, so command-id probing does not reveal another actor's receipt.

## Recovery Anchors

Success-class receipts are `ACCEPTED`, `DUPLICATE_REPLAY`, and `EXPIRED` receipts whose `original_acceptance_state` is one of those success states. A success-class receipt must retain at least one durable recovery anchor:

- `result_ref`
- `activity_refs[]`
- `audit_event_refs[]`

`latest_projection_ref` is only an observational mirror and cannot be the only recovery basis. `notification_refs[]` alone is also not sufficient for GET recovery. Invalid historical rows fail closed with `COMMAND_RECEIPT_CORRUPT` instead of returning partial recovery data.

## Expired Receipts

`EXPIRED` is a terminal receipt projection, not a transport timeout. An expired receipt must preserve:

- `command_id`
- `request_hash`
- `idempotency_key`
- `original_acceptance_state`
- the same durable recovery-anchor family used before expiry

The endpoint returns expired receipts when they are otherwise lawful and contract-valid.

## Durable Command Outcomes

`REJECTED_STALE_VIEW`, `REJECTED_POLICY`, and `REJECTED_INVALID` are durable command outcomes. GET returns those receipts as `200` when visible and valid. They are not remapped to transport failures.

Endpoint failures are limited to route/method errors, hidden or missing receipts, and corrupt/schema-invalid receipt rows. Every GET response uses `Cache-Control: no-store`.
