# Tenant Governance Snapshot and Dominant Attention

`packages/backend-governance` owns the first read-side projector for `/governance`.
It emits `TenantGovernanceSnapshot` as a control-plane projection only; it is not mutation truth,
approval authority, or a policy-editor snapshot.

## Dominant Family Source

The durable source for `previous_primary_family` is the previous published
`TenantGovernanceSnapshot`: first `attention_summary.attention_family` when it is non-calm, then
`primary_queue_code` as the route fallback. Hysteresis is evaluated only when that previous family
is still live in the current family inputs.

Each current family input supplies the governed scoring dimensions:

- `openCount`
- `criticalOpenCount`
- `oldestOpenAgeHours`
- `requiresOperatorAction`
- `noisePenalty`
- `worklistRef`
- bounded object refs for row selection and preview strips

The score formula is implemented exactly:

```text
family_score(f) =
  family_base(f)
  + 25 * critical_open_count(f)
  + 6 * min(open_count(f), 9)
  + 4 * oldest_age_bucket(f)
  + 10 * requires_operator_action(f)
  + 8 * 1[f = previous_primary_family]
  - 8 * noise_penalty(f)
```

`oldest_age_bucket(f) = min(floor(oldest_open_age_hours(f) / 8), 6)`.
If the leading family does not exceed the prior still-live family by at least `20`, the previous
family remains dominant.

## Queue And Ledger Alignment

The family-to-queue mapping is fixed:

- `PENDING_APPROVALS -> PENDING_APPROVALS`
- `CONFIGURATION_DRIFT -> CONFIGURATION_DRIFT`
- `AUTHORITY_LINK_RISK -> AUTHORITY_LINK_RISKS`
- `RETENTION_EXCEPTION -> RETENTION_EXCEPTIONS`
- `AUDIT_HOTSPOT -> AUDIT_HOTSPOTS`

`primary_worklist_ref` always mirrors the queue-specific top-level worklist field. The risk ledger
always serializes exactly five rows: the promoted queue first, then remaining queues in canonical
order. Each ledger row mirrors the same worklist ref and count used by the top-level snapshot
projection; the current schema represents audit hotspot count through the bounded
`audit_hotspot_refs[]` tape, so audit hotspot input count must equal that bounded tape count.

## Calm And Support Posture

The snapshot becomes calm when no governance family is live. Calm snapshots keep
`attention_summary.attention_family = CALM`, clear the primary action fields, emit
`dominance_contract.safe_action_state = NO_SAFE_ACTION`, and keep `support_region_state.mode = NONE`.

Non-calm snapshots choose one selected canvas object from an explicit request, the previous
snapshot selection, or the promoted family source refs. If a support sidecar is active, its
`selected_object_ref` must match `selected_canvas_object_ref`; divergent support selection fails
closed in the projector. The default non-calm support posture is `AUDIT`, which publishes
`AUDIT_SIDECAR` as an investigative support surface under the governance dominance contract.

## Route Contracts

The projector reuses the shared shell services for:

- `GovernanceInteractionLayer`
- `ShellDominanceContract`
- `ShellStateTaxonomyContract`
- `CrossDeviceContinuityContract`
- `SemanticAccessibilityContract`
- `CacheIsolationContract`

Active filters are route-stable and sorted where the validator expects deterministic order.
Non-empty risk-family filters are expanded to include the promoted queue, and the interaction layer
chip refs mirror the exact active filter payload in canonical dimension order.
