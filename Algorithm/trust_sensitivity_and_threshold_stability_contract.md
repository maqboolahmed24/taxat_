# Trust Sensitivity And Threshold-Stability Contract

`TrustSummary` SHALL persist one `trust_sensitivity_analysis_contract`, aliased to the authoritative
`TrustSensitivityContract`, so threshold fragility, score-versus-cap divergence, freshness
invalidation, authority uncertainty, and automation gating remain visible from the frozen artifact
itself rather than being reconstructed from ad hoc what-if tooling.

This is a first-class algorithmic boundary. Downstream trust surfaces, gate logic, replay, policy
tuning, and validation consume it directly.

## Governing boundary

The persisted contract SHALL freeze:

- the exact basis lineage:
  `trust_input_basis_contract_hash`, `execution_mode_boundary_hash`, `execution_mode`,
  `execution_legal_effect_boundary`, baseline posture, authority uncertainty, override posture,
  late-data invalidation posture, and required human-step count
- the exact current posture:
  `score_band`, `cap_band`, `trust_band`, `trust_input_state`, `threshold_stability_state`,
  `upstream_gate_cap`, `automation_level`, and `filing_readiness`
- the explanatory margins:
  `trust_green_margin`, `trust_amber_margin`, `risk_automation_margin`,
  `completeness_margin`, `graph_filing_margin_or_null`,
  `authority_review_margin_or_null`, and `authority_block_margin_or_null`
- the explicit score-versus-cap relation via
  `score_cap_alignment_state in {ALIGNED, SCORE_STRICTER_THAN_CAP, CAP_STRICTER_THAN_SCORE}`
- the exact non-score cap drivers via `cap_driver_reason_codes[]`
- the exact active guard-band surfaces via `edge_trigger_codes[]`
- one canonical ordered perturbation set in `projected_case_results[]`

`score_cap_alignment_state = CAP_STRICTER_THAN_SCORE` SHALL require at least one
`cap_driver_reason_codes[]` entry. `threshold_stability_state = EDGE_REVIEW` SHALL require at least
one `edge_trigger_codes[]` entry and `STABLE` SHALL clear them. When live authority progression is
not requested, the live-only margins SHALL be null.

## Canonical perturbation set

`projected_case_results[]` SHALL contain exactly these six deterministic probes, in canonical
order:

- `TRUST_SCORE_MINUS_ONE`
- `TRUST_SCORE_PLUS_ONE`
- `RISK_SCORE_PLUS_ONE`
- `AUTHORITY_UNCERTAINTY_PLUS_ONE`
- `FRESHNESS_INVALIDATED`
- `INVALID_OVERRIDE_RELIED_UPON`

Every projected case SHALL persist:

- the resulting score, cap, and final trust bands
- the resulting `trust_input_state`, `threshold_stability_state`, `automation_level`, and
  `filing_readiness`
- the projected trust, risk, completeness, graph-filing, and authority margins
- the projected edge-trigger set
- the reason codes added and removed relative to the frozen current posture
- a monotonicity expectation:
  `NON_DEGRADING` only for `TRUST_SCORE_PLUS_ONE`; `NON_IMPROVING` for all other probes

The fixed six-probe set exists to close the actual brittle transitions:

- a one-point trust drop at a green edge
- a one-point trust improvement that still remains capped
- a one-point risk worsening that can silently pull a score band down
- a one-point authority-uncertainty worsening that can flip live progression into unresolved review
- freshness invalidation that must inject `TRUST_RECALCULATION_REQUIRED`
- invalid override reliance that must collapse to contradicted or insufficient-data posture

## Failure classes closed

- Green numeric trust can no longer hide a stricter cap posture because
  `score_cap_alignment_state` and `cap_driver_reason_codes[]` make the divergence explicit.
- Near-zero threshold margins can no longer disappear into a generic amber or green summary because
  `edge_trigger_codes[]` and the persisted margin fields expose the exact active guard-band
  surfaces, including authority review and authority block thresholds when live progression is
  requested.
- Invalid override refs can no longer keep influencing readiness silently because
  `INVALID_OVERRIDE_RELIED_UPON` is a required perturbation probe and it must collapse to
  contradicted or insufficient-data posture.
- Freshness invalidation can no longer leave stale trust looking current because
  `FRESHNESS_INVALIDATED` is a required projected case with its degraded trust-input and automation
  result frozen.
- Authority uncertainty can no longer drift across live thresholds without visibility because the
  current artifact freezes both the current authority margins and the
  `AUTHORITY_UNCERTAINTY_PLUS_ONE` perturbation outcome.
- Non-monotonic safer-versus-riskier transitions now fail closed because the perturbation set and
  monotonicity expectations are persisted and validator-checked, not inferred heuristically.

## Operational rule

Any consumer that needs threshold introspection, cap explanation, or tuning sensitivity SHALL read
the persisted `trust_sensitivity_analysis_contract`. It SHALL NOT recompute trust perturbations from
local heuristics, UI-only summaries, or partial trust fields.
