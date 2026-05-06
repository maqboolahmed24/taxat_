# Gate Decision Explainability Projection And Reason Compression

`DecisionExplainabilityContract` is the authoritative read boundary for gate decisions, trust summaries, and terminal decision bundles. Read surfaces must not rebuild dominant reasons, compressed summaries, semantic qualifiers, or action hints from raw metrics.

## Projection Rules

- Parent artifacts own `reason_codes[]`, `dominant_reason_code`, plain text, and `decision_explainability_contract`.
- The read view validates persisted alignment before returning anything.
- `compressed_reason_codes[]` is always the first three ordered reasons.
- `suppressed_reason_count` is `ordered_reason_codes.length - compressed_reason_codes.length`.
- Semantic qualifiers use canonical order: `AUTHORITY_STATE`, `LIMITATION_STATE`, `OVERRIDE_STATE`, `ACTIONABILITY_STATE`.
- Gate projections expose family `GATE_DECISION`; persisted contracts retain schema family `GATE_DECISION_RECORD`.

## Implemented Surfaces

- Compute validator: `packages/backend-compute/src/services/validate_persisted_decision_explainability_alignment.ts`
- Compute view projection: `packages/backend-compute/src/services/project_decision_explainability_view.ts`
- Governance projector: `packages/backend-governance/src/projectors/build_gate_decision_explainability_projection.ts`
- Governance single-artifact query: `packages/backend-governance/src/queries/get_gate_decision_explainability.ts`
- Governance manifest row query: `packages/backend-governance/src/queries/list_decision_explainability_rows.ts`

## Failure Posture

Projection fails closed when the persisted contract drifts from the parent artifact. The validator rejects ordered reason drift, dominant reason drift, compressed prefix drift, suppressed count drift, qualifier order drift, qualifier set drift, action projection drift, top-level decision bundle summary drift, plain text field drift, and plain text budget violations.

This keeps governance, audit, workflow, and low-noise reads pinned to the persisted explanation grammar instead of letting each consumer infer a different explanation from raw reason arrays or metrics.
