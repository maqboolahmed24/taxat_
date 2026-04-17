# Run Engine End-to-End Execution Swimlane

## What This Pack Captures

This pack turns `RUN_ENGINE(...)` into a queryable execution spine. It preserves the exact 18-phase source order,
indexes every phase-local `RECORD_EVENT(...)` and `WRITE_ARTIFACT(...)` call, and makes branch, gate,
transaction, lineage, and live-experience consequences explicit for later backend and frontend work.

## Structural Totals

- Phases: `18`
- Parsed logical statements: `905`
- Phase-local audit events: `98`
- Artifact writes: `50`
- Gate evaluations or gate helpers: `16`
- Live-experience sync statements: `49`
- Atomic transaction primitives: `12`
- Branch rows captured: `12`

## Lane Taxonomy

- `CALLER_AND_SCOPE`
- `AUTHORIZATION`
- `MANIFEST_AND_LINEAGE`
- `CONFIG_AND_FREEZE`
- `SOURCE_COLLECTION_AND_CANONICALIZATION`
- `PRESEAL_GATES`
- `POSTSEAL_DAG`
- `AUTHORITY_CONTEXT`
- `DRIFT_AND_AMENDMENT`
- `TRUST_AND_WORKFLOW`
- `FILING_AND_SUBMISSION`
- `LIVE_EXPERIENCE`
- `RETENTION_AND_TERMINALIZATION`

## Engine Spine

| Phase | Name | Lane Focus | Gates | Artifacts | Events | Return Paths | Live Modules |
| --- | --- | --- | --- | ---: | ---: | --- | --- |
| `P01` | Authorize and bind execution scope | CALLER_AND_SCOPE, AUTHORIZATION | n/a | 0 | 0 | ERROR | n/a |
| `P02` | Resolve scope intent, validate runtime grammar, load any prior manifest, and choose config inheritance | CALLER_AND_SCOPE, MANIFEST_AND_LINEAGE, CONFIG_AND_FREEZE | n/a | 0 | 1 | ERROR, LOAD_EXISTING_DECISION_BUNDLE | n/a |
| `P03` | Allocate, continue, or reuse manifest context and initialize the live experience stream | MANIFEST_AND_LINEAGE, CONFIG_AND_FREEZE, LIVE_EXPERIENCE | n/a | 0 | 6 | ERROR | PULSE_SPINE, MANIFEST_RIBBON, HANDOFF_BATON |
| `P04` | Load or build the sealed pre-start context using a barriered, partition-aware execution plan | SOURCE_COLLECTION_AND_CANONICALIZATION, CONFIG_AND_FREEZE, MANIFEST_AND_LINEAGE | n/a | 0 | 6 | ERROR | DECISION_STAGE, EVIDENCE_TIDE, CONSEQUENCE_RAIL |
| `P05` | Evaluate the ordered pre-seal gate chain, persist pre-start blocked context if needed, and seal only when a new pre-start context was built | PRESEAL_GATES, MANIFEST_AND_LINEAGE, LIVE_EXPERIENCE | MANIFEST_GATE, ARTIFACT_CONTRACT_GATE, INPUT_BOUNDARY_GATE, DATA_QUALITY_GATE | 12 | 2 | FINALIZE_RUN_FAILURE, FINALIZE_TERMINAL_OUTCOME | MANIFEST_RIBBON, DECISION_STAGE, CONSEQUENCE_RAIL |
| `P06` | Claim the sealed manifest and publish the post-seal command DAG atomically | MANIFEST_AND_LINEAGE, POSTSEAL_DAG | n/a | 0 | 3 | ERROR, LOAD_EXISTING_DECISION_BUNDLE | DECISION_STAGE, EVIDENCE_TIDE |
| `P07` | Await post-seal command DAG completion and adopt mandatory outputs | POSTSEAL_DAG, LIVE_EXPERIENCE | n/a | 0 | 6 | FINALIZE_RUN_FAILURE | DECISION_STAGE, EVIDENCE_TIDE, FOCUS_LENS |
| `P08` | Retention evidence gate | RETENTION_AND_TERMINALIZATION, LIVE_EXPERIENCE | RETENTION_EVIDENCE_GATE | 1 | 1 | nonterminal | n/a |
| `P09` | Authority context, comparison basis, parity, and parity gate | AUTHORITY_CONTEXT, FILING_AND_SUBMISSION, LIVE_EXPERIENCE | AMENDMENT_GATE, FILING_GATE, PARITY_GATE | 6 | 10 | FINALIZE_TERMINAL_OUTCOME | DRIFT_FIELD, CONSEQUENCE_RAIL |
| `P10` | Drift posture and amendment posture preparation | DRIFT_AND_AMENDMENT | n/a | 4 | 7 | nonterminal | DRIFT_FIELD, CONSEQUENCE_RAIL |
| `P11` | Trust synthesis and command-side case state | TRUST_AND_WORKFLOW | TRUST_GATE | 2 | 2 | nonterminal | DECISION_STAGE, PACKET_FORGE |
| `P12` | Workflow planning and immediate consequence refresh | TRUST_AND_WORKFLOW, LIVE_EXPERIENCE | n/a | 0 | 2 | nonterminal | CONSEQUENCE_RAIL |
| `P13` | Publish live read-model projections and conditionally terminalize on trust posture | LIVE_EXPERIENCE, TRUST_AND_WORKFLOW, RETENTION_AND_TERMINALIZATION | n/a | 0 | 1 | FINALIZE_TERMINAL_OUTCOME | n/a |
| `P14` | Amendment gate and intent-to-amend progression | DRIFT_AND_AMENDMENT, FILING_AND_SUBMISSION, LIVE_EXPERIENCE | AMENDMENT_GATE | 1 | 6 | FINALIZE_TERMINAL_OUTCOME | CONSEQUENCE_RAIL, DRIFT_FIELD |
| `P15` | Authority calculation, filing readiness, packet preparation, and filing gate | AUTHORITY_CONTEXT, FILING_AND_SUBMISSION, LIVE_EXPERIENCE | FILING_GATE | 2 | 3 | FINALIZE_TERMINAL_OUTCOME | CONSEQUENCE_RAIL, PACKET_FORGE |
| `P16` | Submission enqueue, governed transmit, inbox-normalized recovery, and bounded reconciliation | FILING_AND_SUBMISSION, AUTHORITY_CONTEXT, LIVE_EXPERIENCE | SUBMISSION_GATE | 8 | 14 | FINALIZE_TERMINAL_OUTCOME | AUTHORITY_TUNNEL, CONSEQUENCE_RAIL, PULSE_SPINE |
| `P17` | Post-authority drift monitoring | DRIFT_AND_AMENDMENT, LIVE_EXPERIENCE | n/a | 4 | 10 | nonterminal | DRIFT_FIELD, CONSEQUENCE_RAIL |
| `P18` | Terminal finalization and return | RETENTION_AND_TERMINALIZATION, LIVE_EXPERIENCE, MANIFEST_AND_LINEAGE | n/a | 0 | 0 | FINALIZE_TERMINAL_OUTCOME | PULSE_SPINE, MANIFEST_RIBBON, DECISION_STAGE |

## Mandatory Edge Cases

- `raw_requested_scope[]` is preserved for audit while `runtime_scope[]` drives downstream semantics.
- `masking_context` remains read-side only and must not affect compute, filing, or transport.
- Same-manifest retry against a terminal manifest returns the existing `DecisionBundle`.
- A pre-start system fault after `SEALED` but before `RunStarted` still finalizes `BLOCKED`.
- Replay may reuse frozen post-seal basis instead of inventing a fresh authority read.
- `AMENDMENT_GATE` is forbidden during drift preparation and occurs later in the run.
- Authority-owned truth and out-of-band corrections stay distinct from internal progression state.

## Live Experience Guardrails

- Composite shell surfaces remain `CONTEXT_BAR, DECISION_SUMMARY, ACTION_STRIP, DETAIL_DRAWER` in the low-noise profile.
- `ExperienceDelta` is operational read-side output only; legal command truth remains in manifests, artifacts, gates, and the terminal `DecisionBundle`.
- Projection lag is allowed after command truth persists, so the shell must remain mounted and continuity-safe even while detail modules are still materializing.
