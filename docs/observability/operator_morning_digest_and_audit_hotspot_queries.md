# Operator Morning Digest And Audit Hotspot Queries

`packages/backend-observability` owns the read layer for published
`OperatorMorningDigest` artifacts and governance-facing audit hotspot analytics.
The query layer reads persisted digest artifacts only; it does not rebuild morning
handoff posture from live queues, worker memory, logs, or UI-local counters.

## Digest Query Contract

`getOperatorMorningDigest({ tenant_id, coverage_date })` returns the current
authoritative digest for that tenant coverage date. Supplying `digest_id` returns
that historical publication, including superseded publications. The stable cache
key is:

```text
operator_morning_digest:{tenant_id}:{coverage_date}:{digest_id}
```

`listOperatorMorningDigests(...)` supports `tenant_id`, `coverage_date`,
`include_superseded`, `cursor_offset`, and bounded `limit` filters. Current-only
lists hide digests superseded by a later publication; historical lists preserve
the full audit lineage.

Each returned result includes:

- the schema-valid `OperatorMorningDigest`
- `digest_ref`
- `publication_posture.publication_state`
- current digest id
- superseded-by pointer when present
- supersedes pointer when present
- supersession root digest id
- lineage digest ids in stable order

The read guard rechecks publication integrity before returning: queue summaries
partition `published_workflow_item_refs[]`, highlighted workflow refs come from
that same persisted set, `publication_qa_completed_at` follows workflow and
notification settlement, and generated/published timestamps remain monotonic.

## Hotspot Analytics Contract

`buildAuditHotspotAnalytics(...)` accepts typed hotspot sources grounded in
persisted backend artifacts, such as `AuditInvestigationFrame`,
`FailureLifecycleDashboard`, `TenantGovernanceSnapshot`, or authority
reconciliation analytics. A source must carry a concrete `worklist_ref` and at
least one `affected_object_ref`, even when non-material churn suppression zeroes
the open count.

Rows are ranked by `GOVERNANCE_AUDIT_HOTSPOT_SCORE_V1`:

```text
300
+ 25 * critical_open_count
+ 6 * min(open_count, 9)
+ 4 * min(floor(oldest_open_age_hours / 8), 6)
+ 10 * requires_operator_action
- 8 * non_material_churn_suppressed
```

Ties use critical count, open count, last observed timestamp, and hotspot ref.
`listAuditHotspots(...)` applies stable filters over source artifact type and
affected object ref, then returns cursor-offset paging.

The analytics result also publishes a governance-compatible
`governance_family_source` for `TenantGovernanceSnapshot`: it binds the
`AUDIT_HOTSPOT` family to the same worklist ref and ranked hotspot refs, so the
overview attention ledger reuses backend ranking instead of reranking in the UI.

No optional browser lab or northbound route was added for this task. The
implemented surface is a read-only backend query and analytics layer.
