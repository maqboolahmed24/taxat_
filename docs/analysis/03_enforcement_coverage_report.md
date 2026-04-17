# Enforcement Coverage Report

This report summarizes how deeply each logical family is covered across prose, schema, samples, validator logic, forensic guards, live constraints, and historical closure context.

## Coverage Signatures

| Coverage signature | Row count |
| --- | ---: |
| `prose+schema+validator+guard+constraint+history` | `297` |
| `prose+schema+validator+guard+constraint` | `150` |
| `prose+schema+sample+validator+guard+constraint` | `121` |
| `prose+schema+sample+validator+guard+constraint+history` | `70` |
| `prose+schema+guard+constraint` | `47` |
| `prose+schema+validator+constraint+history` | `14` |
| `prose` | `13` |
| `prose+schema+guard+constraint+history` | `9` |
| `prose+schema+guard` | `8` |
| `schema+guard` | `8` |
| `prose+schema+sample+guard+constraint` | `7` |
| `prose+schema+validator+guard` | `6` |
| `schema+sample+validator+guard` | `6` |
| `prose+constraint` | `5` |
| `prose+schema+constraint` | `3` |
| `prose+schema+sample+validator+guard` | `3` |
| `prose+guard+history` | `2` |
| `prose+schema+constraint+history` | `2` |
| `prose+schema+sample+validator+constraint` | `2` |
| `prose+validator` | `2` |
| `prose+validator+guard` | `2` |
| `validator` | `2` |
| `guard` | `1` |
| `prose+constraint+history` | `1` |
| `prose+guard` | `1` |
| `prose+sample+validator+guard+constraint+history` | `1` |
| `prose+schema` | `1` |

## Coverage By Family Kind

| Family kind | Fully mapped | Partial | Doc only | Schema only | Validator only | Gap |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `object_family` | `182` | `48` | `5` | `0` | `0` | `6` |
| `contract_family` | `61` | `2` | `13` | `0` | `0` | `0` |
| `state_machine_family` | `32` | `1` | `1` | `0` | `0` | `0` |
| `validator_family` | `182` | `12` | `0` | `0` | `2` | `2` |
| `forensic_guard_family` | `182` | `37` | `0` | `0` | `1` | `6` |
| `constraint_family` | `8` | `1` | `0` | `0` | `0` | `0` |

## Live Constraint Register Coverage

| Constraint ID | Constraint family | Authoritative refs | Enforcement refs | Downstream refs | Example refs |
| --- | --- | ---: | ---: | ---: | ---: |
| `CC-01` | Shared shell and route-stability vocabulary stays authoritative across specialized surfaces | `3` | `2` | `3` | `1` |
| `CC-02` | Interaction-layer and customer-safe projection boundaries remain shared instead of route-local | `3` | `2` | `4` | `1` |
| `CC-03` | Manifest freeze, continuation lineage, gate tape, and replay basis remain one immutable execution spine | `3` | `2` | `4` | `1` |
| `CC-04` | Evidence, proof, twin comparison, and late-data invalidation keep one explicit lineage and closure vocabulary | `3` | `2` | `4` | `1` |
| `CC-05` | Authority ingress, truth boundaries, workflow actionability, and amendment posture stay bound to explicit contracts | `3` | `2` | `4` | `1` |
| `CC-06` | Governance mutation risk, nightly publication, and externalization rules reuse one reviewed basis instead of transport-local heuristics | `3` | `2` | `4` | `1` |
| `CC-07` | Schema evolution, release identity, recovery governance, and state transitions remain closed, typed, and replay-safe | `3` | `2` | `5` | `1` |
| `CC-08` | Constraint coverage stays live-only, machine-checkable, and distinct from forensic history | `5` | `2` | `2` | `1` |
| `CC-09` | Invariant failures stay typed, durable, and stage-bound instead of assertion-only | `3` | `2` | `4` | `1` |

## Explicit Gap Registers

- Schemas without clear prose anchors: `6`.
- Data-model families without schemas: `5`.
- Validators without prose anchors: `4`.
- Guards without prose anchors: `7`.
- Duplicate custom-validator keys: `3`.
