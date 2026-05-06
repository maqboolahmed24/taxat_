# Northbound Boundary Runbook

`pc_0068` establishes one reusable northbound admission scaffold for `apps/control-plane-api`.
Handlers should compose the shared parser, stale-precondition guard, duplicate/idempotency guard,
and deterministic receipt/problem builders instead of rebuilding those rules locally.

## Composition Order

1. Load the shared policy bundle with `loadNorthboundPolicyBundle()`.
2. Parse and validate the incoming payload with `parseCommandEnvelope(...)`.
3. Evaluate route and stale-view guards with `evaluateStalePreconditions(...)`.
4. Evaluate duplicate posture with `evaluateCommandIdempotency(...)`.
5. If the command is accepted, persist a durable `ApiCommandReceipt` before downstream side effects.
6. If the command is stale, invalid, or policy-rejected, emit one typed `ProblemEnvelope`.

## Handler Shape

```ts
const bundle = await loadNorthboundPolicyBundle();
const parsed = await parseCommandEnvelope(request.body, actorContext, { policyBundle: bundle });
const stale = evaluateStalePreconditions(parsed, currentRouteState);
if (stale.outcome === "STALE") {
  return buildProblemEnvelope({
    problemCode: stale.problemCode,
    policyBundle: bundle,
    correlationId,
    parsed,
    latestCommandReceiptRefOrNull: stale.latestCommandReceiptRefOrNull,
    latestStaleGuardValue: stale.latestStaleGuardValue,
    latestStabilityContractOrNull: stale.routeStabilityContract,
    reasonCodes: stale.reasonCodes,
    routeState: currentRouteState,
    staleGuardFamily: stale.staleGuardFamily,
  });
}

const duplicate = evaluateCommandIdempotency(parsed, existingIdempotencyRecordOrNull);
if (duplicate.outcome === "RETURN_EXISTING_RECEIPT") {
  return duplicate.existingReceipt;
}
if (duplicate.outcome === "IDEMPOTENCY_COLLISION") {
  return buildProblemEnvelope({
    problemCode: "IDEMPOTENCY_COLLISION",
    policyBundle: bundle,
    correlationId,
    parsed,
    latestCommandReceiptRefOrNull: duplicate.existingReceiptRefOrNull,
    reasonCodes: duplicate.reasonCodes,
  });
}

return buildApiCommandReceipt({
  parsed,
  acceptedAt,
  acceptanceState: "ACCEPTED",
  expiresAt,
  projectionRefOrNull,
  projectionSequenceOrNull,
  requestHash: duplicate.requestHash,
  resultRefOrNull: null,
});
```

## Policy Files

- `config/northbound/command_family_matrix.json`
  Records target scope, mutation precondition profile, projection posture, and recovery defaults per
  command family.
- `config/northbound/stale_guard_profile_matrix.json`
  Records how each profile maps command guard fields onto route-stability components and which typed
  problem code to use on mismatch.
- `config/northbound/problem_code_catalog.json`
  Records the typed problem vocabulary instead of scattering handler-local HTTP error strings.

## Important Decisions

- Exact safe retries return the original durable receipt. The boundary does not mint a new duplicate
  receipt by default.
- Idempotency-key reuse with a different payload or namespace tuple emits
  `IDEMPOTENCY_COLLISION`.
- Governance simulation-commit families require `policy_snapshot_hash`,
  `dependency_topology_hash`, `simulation_basis_hash`, and `mutation_basis_contract`.
- If a governance mutation basis still carries `PREVIEW_ONLY`, the boundary fails closed with
  `GOVERNANCE_PREVIEW_ONLY_COMMIT_BLOCKED`.
- Families with `projection_stream_class = NONE` should surface stale outcomes as
  `ProblemEnvelope` paths rather than forced `REJECTED_STALE_VIEW` receipts, because stale receipts
  require a live projection anchor.

## Recovery Rules

- Manifest render and approval-pack families recover through `latest_decision_bundle_ref`,
  `latest_approval_pack_ref`, and manifest resume tokens where needed.
- Collaboration families recover through `latest_workspace_snapshot_ref`.
- Portal route mutations recover through `latest_client_portal_workspace_ref` or
  `latest_upload_session_ref`.
- Governance mutations recover through `latest_policy_snapshot_ref`.
- Every stale or rebase-required problem also carries the grouped `latest_stability_contract_or_null`
  plus the authoritative stale guard value.

## Do Not Reintroduce

- Handler-local parsing rules that drift from `CommandEnvelope`.
- Ad hoc stale checks that compare some but not all required guard fields.
- Local duplicate handling that ignores the stored request hash.
- UI explanations inferred from optimistic local state instead of durable receipt/problem truth.
