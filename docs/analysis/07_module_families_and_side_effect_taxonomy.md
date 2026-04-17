# Module Families and Side-Effect Taxonomy

## Purity Classes

| Purity | Count |
| --- | ---: |
| `artifact_persister` | 7 |
| `deterministic_builder` | 90 |
| `event_emitter` | 6 |
| `external_transport` | 16 |
| `mixed` | 36 |
| `projection_builder` | 9 |
| `pure_transform` | 23 |
| `state_mutator` | 22 |

## Boundary Crossings

| Boundary | Count |
| --- | ---: |
| `authority` | 12 |
| `browser_handoff` | 4 |
| `none` | 180 |
| `storage` | 13 |

## Schema Touchpoint Totals

- Module records with schema touchpoints: `176`
- Unique schemas touched: `132`
- Total touchpoint rows: `326`
