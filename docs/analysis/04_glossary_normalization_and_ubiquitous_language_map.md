# Glossary Normalization And Ubiquitous Language Map

This report turns the authoritative Taxat vocabulary into a machine-readable ubiquitous-language layer for downstream architecture, schema, QA, and prompt work.

## Summary

- Total normalized terms: `144`.
- High-drift-risk terms: `126`.
- Medium-drift-risk terms: `12`.
- Low-drift-risk terms: `6`.
- Shared-spine fields covered: `9` / `9`.
- Glossary seed failures: `0`.
- Alias collisions surfaced: `30`.
- Ambiguous machine-field mappings: `13`.

## Category Counts

| Category | Count |
| --- | ---: |
| `authority` | `23` |
| `collaboration` | `4` |
| `core_engine` | `7` |
| `evidence` | `18` |
| `governance` | `3` |
| `lineage` | `10` |
| `observability` | `9` |
| `portal` | `3` |
| `release` | `6` |
| `shell_route` | `60` |
| `workflow` | `1` |

## Shared-Spine Coverage

- Shell families captured: `CALM_SHELL, CLIENT_PORTAL_SHELL, GOVERNANCE_DENSITY_SHELL`.
- Route/shared field family captured: `shell_family, object_anchor_ref, dominant_question, dominance_contract, settlement_state, recovery_posture, shell_stability_token, workspace_version, view_guard_ref`.
- Route-visible read models captured: `14`.

## Notable Drift Risks

| Term | Category | Risk | Notes |
| --- | --- | --- | --- |
| `Access Binding` | `authority` | `high` | n/a |
| `Access Binding Hash` | `lineage` | `high` | Authority-facing terminology must preserve external authority-of-record semantics. |
| `Actor` | `authority` | `high` | n/a |
| `Amendment Eligibility Contract` | `shell_route` | `high` | n/a |
| `Append-Only Outcome Projection` | `shell_route` | `high` | n/a |
| `Artifact Affordance Contract` | `shell_route` | `high` | Audience or visibility-sensitive term. Preserve the exact projection boundary named in the corpus. |
| `AuditInvestigationFrame` | `shell_route` | `high` | n/a |
| `Authority` | `authority` | `high` | Authority-facing terminology must preserve external authority-of-record semantics. |
| `AuthorityLinkInventoryItem` | `shell_route` | `high` | n/a |
| `AUTHORITY_ACKNOWLEDGEMENT` | `evidence` | `high` | Authority-facing terminology must preserve external authority-of-record semantics. |
| `Authority Ingress Proof Contract` | `authority` | `high` | Authority-facing terminology must preserve external authority-of-record semantics. |
| `Authority Layer Boundary` | `authority` | `high` | Audience or visibility-sensitive term. Preserve the exact projection boundary named in the corpus. |
| `Authority Link` | `authority` | `high` | Authority-facing terminology must preserve external authority-of-record semantics. |
| `Authority of Record` | `authority` | `high` | n/a |
| `Authority-of-record precedence` | `authority` | `high` | Authority-facing terminology must preserve external authority-of-record semantics. |

## Validation Notes

- Glossary canonicalization failures: `0`.
- Shared-spine fields missing from the normalized map: `0`.

## Output Files

- `data/analysis/glossary_normalized.json`
- `data/analysis/ubiquitous_language_map.csv`
- `data/analysis/term_alias_conflicts.json`
- `data/analysis/field_to_term_map.json`
- `docs/analysis/04_prohibited_synonyms_and_term_drift_rules.md`
