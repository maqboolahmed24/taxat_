# Low-Noise Experience Frame Projector

`packages/backend-low-noise` owns the first server-authored `LowNoiseExperienceFrame` assembly boundary.
The package was created for `pc_0169` because the shared operating contract explicitly permits creating it when absent: `ASSUMPTION_BACKEND_LOW_NOISE_PACKAGE_CREATED`.

## Authoritative Inputs

`buildLowNoiseExperienceFrame` is pure and deterministic from typed publication inputs:

- Manifest route identity: `manifestId`, `objectAnchorRef`, `frameEpoch`, `lastPublishedSequence`, `shellStabilityToken`, `resumeToken`.
- Published decision/trust refs: `decisionBundleRef`, `decisionBundleHash`, `trustSummaryRef`.
- Transport and cache boundaries: `tenantId`, `clientIdOrNull`, `principalClass`, `sessionRef`, `sessionBindingHash`, `accessBindingHash`, `maskingContextHash`.
- Published posture: connection, settlement, recovery, truth origin, checkpoint, context labels, bounded visible reasons, action candidates, and detail-module candidates.

Renderer-local ranking is forbidden. `validateLowNoiseFramePublication` rejects route-local/client salience keys such as `route_local_salience`, `client_salience`, `surface_weights`, and `surface_salience_override`. The only published salience policy is the schema-owned `dominance_contract.renderer_salience_policy = SERVER_AUTHORED_ONLY`.

## Frame Shape

The frame always publishes exactly four peer surfaces in this order:

```text
CONTEXT_BAR -> DECISION_SUMMARY -> ACTION_STRIP -> DETAIL_DRAWER
```

`DETAIL_DRAWER` may be promoted as the single support region, but it is never a competing primary surface. Recovery, stale, and degraded postures remain inline in the same shell and fail closed to `NO_SAFE_ACTION`.

## Adapter Seams

`pc_0170` owns the deeper reusable surface projectors. This card keeps two narrow seams:

- `buildMinimalDominanceContractAdapter` mirrors the action strip, active detail module, and compare/audit flags into `ShellDominanceContract`.
- `buildMinimalShellStateTaxonomyAdapter` mirrors summary/detail empty-state posture plus settlement/recovery state into `ShellStateTaxonomyContract`.

These adapters avoid route-local booleans while leaving the fuller abstraction replaceable by the next low-noise card.

## Budget And Cache Rules

`deriveSurfaceBudgetContract` centralizes the frozen cognitive/copy constants and mirrors the Python validator formula:

```text
scan_load = (
  4*persistent_surfaces + 5*concurrent_primary + 3*visible_reasons
  + 4*visible_warnings + 3*visible_actions + 2*detail_entries
  + ceil(visible_shell_chars / 80) + 6*prominent_motion
) / 4
```

Before publication, the projector derives `low_noise_budget_audit` from the rendered surfaces, compresses secondary actions/detail entries if needed, and rejects duplicate posture copy or over-budget frames.

The cache isolation contract is partitioned by tenant, client, session binding, access binding, masking posture, route identity, and projection version. Cross-device continuity is route-guard-only for `MANIFEST_ROUTE` and binds the same object, shell route, focus anchor, dominant action posture, and route stability guard hash.
