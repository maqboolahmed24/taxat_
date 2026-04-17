# Run Engine Phase Contracts

Each phase section below is the implementation-grade contract for the numbered `RUN_ENGINE(...)` block in `core_engine.md`.

## P01 Authorize and bind execution scope

- Source: `Algorithm/core_engine.md::L145[Authorize_and_bind_execution_scope]`
- Lane focus: `CALLER_AND_SCOPE, AUTHORIZATION`
- Transaction boundary: No atomic transaction. This phase is a caller-to-authorization boundary before manifest lineage exists.

### Entry Conditions

- RUN_ENGINE receives `raw_requested_scope[]`, principal context, and any authority-binding context.
- `masking_context` may be present for read-side rendering, but execution semantics remain unmasked.

### Exit Conditions

- `runtime_scope[]` is bound from authorization and becomes the only downstream scope vocabulary.
- Access-blocked requests may return a low-noise access response before any manifest allocation.

### Branch Predicates

- Access denied, step-up required, or authority-binding mismatch returns before manifest work begins.
- `raw_requested_scope[]` is preserved for later audit only; `runtime_scope[]` drives gates and legal progression.
- `masking_context` remains read-side only and must not leak into compute, filing, or transport behavior.

### State Transitions

- No durable domain object changes state before access posture is resolved.

### Failure Exit Paths

- `ACCESS_BLOCKED_RESPONSE(...)` returns a bounded low-noise posture envelope without allocating a manifest.

### Key Modules

- `AUTHORIZE`
- `ACCESS_BLOCKED_RESPONSE`
- `ENFORCE_ACCESS_SCOPE_AND_MASKING`
- `VALIDATE_EFFECTIVE_SCOPE_BINDING`

### Live Experience

- No phase-local `SYNC_LIVE_EXPERIENCE(...)` call is emitted here.

### Notes

- The shell defaults to `LOW_NOISE` and keeps the access result separate from later manifest lifecycle state.

## P02 Resolve scope intent, validate runtime grammar, load any prior manifest, and choose config inheritance

- Source: `Algorithm/core_engine.md::L185[Resolve_scope_intent_validate_runtime_grammar_load_any_prior_manifest_and_choose_config_inheritance]`
- Lane focus: `CALLER_AND_SCOPE, MANIFEST_AND_LINEAGE, CONFIG_AND_FREEZE`
- Transaction boundary: No atomic transaction. This phase determines lineage and frozen-config posture before any manifest write occurs.

### Entry Conditions

- Authorization resolved a usable `runtime_scope[]` and access binding.
- Any prior manifest lineage must be loaded before config inheritance or reuse decisions are chosen.

### Exit Conditions

- Scope grammar, reporting intent, prior-manifest context, and config inheritance mode are resolved.
- A same-manifest terminal retry may short-circuit to an existing `DecisionBundle`.

### Branch Predicates

- Invalid scope grammar or invalid prior-manifest context stops progression before allocation.
- The reuse decision differentiates fresh manifest allocation, same-manifest reuse, continuation child, and replay child.
- Replay remains lineage-governed reuse of frozen basis rather than a fresh authority read.

### State Transitions

- No manifest lifecycle transition occurs until the branch strategy is selected.

### Failure Exit Paths

- `ERROR(...)` exits on invalid scope grammar or irrecoverable prior-manifest context.
- `ExistingDecisionBundleReturned` may short-circuit same-manifest retries against terminal lineage.

### Key Modules

- `COMPUTE_SCOPE_FLAGS`
- `VALIDATE_SCOPE_GRAMMAR`
- `LOAD_AND_VALIDATE_PRIOR_MANIFEST_CONTEXT`
- `DECIDE_MANIFEST_REUSE_STRATEGY`
- `RECORD_EVENT`
- `LOAD_EXISTING_DECISION_BUNDLE`
- `RESOLVE_CONFIG_FOR_REQUEST`
- `CONTINUATION_REUSES_FROZEN_INPUT`

### Live Experience

- No phase-local `SYNC_LIVE_EXPERIENCE(...)` call is emitted here.

### Notes

- Config inheritance is frozen as a manifest-strategy choice, not a renderer-side preference.

## P03 Allocate, continue, or reuse manifest context and initialize the live experience stream

- Source: `Algorithm/core_engine.md::L259[Allocate_continue_or_reuse_manifest_context_and_initialize_the_live_experience_stream]`
- Lane focus: `MANIFEST_AND_LINEAGE, CONFIG_AND_FREEZE, LIVE_EXPERIENCE`
- Transaction boundary: No global transaction; allocation and stream initialization must still preserve manifest lineage integrity and reconnect-safe shell identity.

### Entry Conditions

- The run knows whether it is a fresh manifest, same-manifest reuse, continuation child, or replay child.
- Config inheritance and input inheritance choices are available.

### Exit Conditions

- A manifest context is allocated, reused, or continued with durable lineage refs.
- The live-experience stream is initialized with `shell_route_key = manifest_id` and monotonic sequencing.

### Branch Predicates

- Fresh manifest vs reused sealed manifest vs continuation child vs replay child remains explicitly indexed in lineage.
- Config and input inheritance may come from a frozen prior manifest or from fresh request-time resolution.

### State Transitions

- `RunManifest.lifecycle_state` enters `ALLOCATED` for fresh or child allocations.
- Config freeze and input freeze bindings become part of the immutable execution envelope.

### Failure Exit Paths

- Lineage validation failures stop the run before pre-seal source work starts.

### Key Modules

- `BEGIN_MANIFEST`
- `RECORD_EVENT`
- `VALIDATE_REUSE_SEALED_CONTEXT`
- `BEGIN_CHILD_MANIFEST`
- `FREEZE_CONFIG`
- `UPDATE_MANIFEST_PRESEAL_CONTEXT`
- `VALIDATE_MANIFEST_LINEAGE_PROJECTION`

### Live Experience

- derived composite shell only; posture=n/a; motion=n/a
- ManifestAllocated: PULSE_SPINE, MANIFEST_RIBBON, HANDOFF_BATON, DECISION_STAGE, CONSEQUENCE_RAIL; posture=STREAMING; motion=ORBIT

### Notes

- This is the phase that binds raw request lineage to the stable manifest route and shell continuity contract.

## P04 Load or build the sealed pre-start context using a barriered, partition-aware execution plan

- Source: `Algorithm/core_engine.md::L417[Load_or_build_the_sealed_pre-start_context_using_a_barriered_partition-aware_execution_plan]`
- Lane focus: `SOURCE_COLLECTION_AND_CANONICALIZATION, CONFIG_AND_FREEZE, MANIFEST_AND_LINEAGE`
- Transaction boundary: No atomic transaction. This phase is about building or recovering the immutable pre-seal input basis.

### Entry Conditions

- A manifest exists but has not yet sealed a pre-start execution context.
- The run knows whether it may reuse a sealed pre-start context or must rebuild one from source collection.

### Exit Conditions

- Either a reusable sealed pre-start basis is loaded, or a fresh source/canonicalization pipeline has built the frozen input set.
- Late-data posture, collection boundary, artifact set, and execution basis hash inputs are known.

### Branch Predicates

- A sealed pre-start context may be reused when lineage and freeze rules allow it.
- Late data may force spawn-child, review-if-late, or exclude-late posture before seal.
- Replay may reuse a frozen post-seal basis instead of re-reading authority truth.

### State Transitions

- `SourceCollectionRun.lifecycle_state` advances through source-collection states for fresh pre-seal work.
- `Snapshot.lifecycle_state` becomes buildable only from canonicalized, contract-valid inputs.

### Failure Exit Paths

- Irrecoverable source-collection or replay-precondition failures stop before manifest sealing.

### Key Modules

- `VALIDATE_REPLAY_PRECONDITIONS`
- `RECORD_EVENT`
- `LOAD_SEALED_RUN_CONTEXT`
- `PLAN_SOURCE_COLLECTION`
- `FREEZE_COLLECTION_BOUNDARY`
- `MATERIALIZE_SOURCE_WINDOW`
- `PROMOTE_CANONICAL_FACTS`
- `BUILD_ARTIFACT_SET`
- `FREEZE_NORMALIZATION_CONTEXT`
- `BUILD_SNAPSHOT`
- `VALIDATE`
- `MEASURE_COMPLETENESS`
- `+9` more phase-local module calls

### Live Experience

- PrestartContextReused: DECISION_STAGE, EVIDENCE_TIDE; posture=FROZEN; motion=ECHO
- SourceCollectionStarted: DECISION_STAGE, EVIDENCE_TIDE; posture=STREAMING; motion=TRACE
- SourceCollectionCompleted: EVIDENCE_TIDE, DECISION_STAGE; posture=STREAMING; motion=TRACE
- LateDataClassified: CONSEQUENCE_RAIL, EVIDENCE_TIDE; posture=CONTAINED; motion=RIPPLE
- SnapshotValidated: DECISION_STAGE, EVIDENCE_TIDE, FOCUS_LENS; posture=STREAMING; motion=TRACE

### Notes

- `masking_context` is expressly barred from source planning, canonicalization, filing, and transport semantics.

## P05 Evaluate the ordered pre-seal gate chain, persist pre-start blocked context if needed, and seal only when a new pre-start context was built

- Source: `Algorithm/core_engine.md::L836[Evaluate_the_ordered_pre-seal_gate_chain_persist_pre-start_blocked_context_if_needed_and_seal_only_when_a_new_pre-start_context_was_built]`
- Lane focus: `PRESEAL_GATES, MANIFEST_AND_LINEAGE, LIVE_EXPERIENCE`
- Transaction boundary: One atomic pre-start persistence boundary records gate outputs, terminal pre-start context when needed, and the seal mutation when the manifest is newly built.

### Entry Conditions

- Pre-seal artifacts, input freeze, and schema bundle are available or explicitly reused.
- The manifest is not yet started, so failures remain pre-start outcomes.

### Exit Conditions

- Ordered pre-seal gates are persisted and either bind a blocked/review posture or allow sealing.
- When a new pre-start context was built, the manifest is sealed exactly once.

### Branch Predicates

- Pre-seal evaluation may stop as blocked, review-required, or sealable success.
- A pre-start system fault after seal but before `RunStarted` still finalizes as `BLOCKED`, not `FAILED`.
- Pre-seal outcomes in `{PASS_WITH_NOTICE, MANUAL_REVIEW}` remain binding after seal.

### State Transitions

- `RunManifest.lifecycle_state` moves from `ALLOCATED`/`FROZEN` to `SEALED` when the new pre-start context is accepted.
- Pre-start gate failure finalizes the manifest as `BLOCKED` before command-side start.

### Failure Exit Paths

- `FINALIZE_TERMINAL_OUTCOME(...)` persists blocked or review-required pre-start outcomes.
- `FINALIZE_RUN_FAILURE(...)` captures irrecoverable pre-start failure without starting the run.

### Key Modules

- `FINALIZE_RUN_FAILURE`
- `TRANSITION_MANIFEST`
- `RECORD_EVENT`
- `MANIFEST_GATE`
- `ARTIFACT_CONTRACT_GATE`
- `INPUT_BOUNDARY_GATE`
- `DECLARED_EXCLUSIONS`
- `DATA_QUALITY_GATE`
- `BUILD_PRESEAL_GATE_EVALUATION`
- `PERSIST_PRESTART_TERMINAL_CONTEXT`
- `FINALIZE_TERMINAL_OUTCOME`
- `WRITE_ARTIFACT`
- `+4` more phase-local module calls

### Live Experience

- derived composite shell only; posture=n/a; motion=n/a
- PresealBlocked: MANIFEST_RIBBON, DECISION_STAGE, CONSEQUENCE_RAIL; posture=FRACTURED; motion=FRACTURE
- ManifestSealed: MANIFEST_RIBBON, DECISION_STAGE; posture=FROZEN; motion=SEAL

### Notes

- The seal step is atomic with the pre-start persistence boundary, which makes later replay and reuse defensible.

## P06 Claim the sealed manifest and publish the post-seal command DAG atomically

- Source: `Algorithm/core_engine.md::L1014[Claim_the_sealed_manifest_and_publish_the_post-seal_command_DAG_atomically]`
- Lane focus: `MANIFEST_AND_LINEAGE, POSTSEAL_DAG`
- Transaction boundary: A single atomic transaction claims manifest start and publishes the first post-seal DAG or workset.

### Entry Conditions

- A sealed manifest exists and has not yet been legally started by another writer.
- The post-seal execution plan can be published only if a manifest-start claim succeeds.

### Exit Conditions

- A compare-and-swap manifest-start lease is claimed and the first post-seal DAG is atomically published.
- `RunStarted` occurs only after a sealed manifest exists.

### Branch Predicates

- Claim rejection may surface active run, stale reclaim requirements, or already-terminal bundle reuse.
- The run may still return an existing terminal bundle instead of starting a second writer.

### State Transitions

- `RunManifest.lifecycle_state` moves from `SEALED` to `IN_PROGRESS` only after claim + DAG publish succeeds.

### Failure Exit Paths

- Start-claim rejection or invalid manifest posture stops progression before worker execution begins.

### Key Modules

- `LOAD_FROZEN_POST_SEAL_BASIS`
- `RECORD_EVENT`
- `SEED`
- `CLAIM_MANIFEST_START`
- `LOAD_EXISTING_DECISION_BUNDLE`

### Live Experience

- RunStarted: DECISION_STAGE, EVIDENCE_TIDE; posture=STREAMING; motion=TRACE

### Notes

- This is the strongest visible proof that the sealed manifest precedes `RunStarted` and worker fan-out.

## P07 Await post-seal command DAG completion and adopt mandatory outputs

- Source: `Algorithm/core_engine.md::L1144[Await_post-seal_command_DAG_completion_and_adopt_mandatory_outputs]`
- Lane focus: `POSTSEAL_DAG, LIVE_EXPERIENCE`
- Transaction boundary: No overarching transaction. Worker-local durability must precede task completion, and the orchestrator adopts persisted outputs deterministically.

### Entry Conditions

- The post-seal DAG is durable and a single writer owns the manifest-start lease.
- Workers must persist first-class artifacts before any completion signal becomes visible.

### Exit Conditions

- Mandatory post-seal artifacts are adopted into manifest outputs.
- Projection lag may continue, but command-side truth has the required compute, risk, graph, and related outputs.

### Branch Predicates

- Previously completed lineage-compatible tasks may be reused rather than recomputed.
- Projection stages may time out as `CONTINUE_WITHOUT_PROJECTION` without failing command-side truth.

### State Transitions

- No manifest terminalization occurs here; the run remains `IN_PROGRESS` with adopted post-seal artifacts.

### Failure Exit Paths

- Missing mandatory stage artifacts or invalid adopted outputs escalate as run failure after start.

### Key Modules

- `FINALIZE_RUN_FAILURE`
- `RECORD_EVENT`
- `COLLECTION_LATE_DATA_BINDINGS`
- `UPDATE_MANIFEST_OUTPUTS`
- `SELECT_PRIMARY_PROOF_BUNDLE_REF`

### Live Experience

- PostSealCommandsCompleted: DECISION_STAGE, EVIDENCE_TIDE, FOCUS_LENS; posture=STREAMING; motion=TRACE

### Notes

- The DAG boundary separates command truth from slower read-model materialization without losing lineage determinism.

## P08 Retention evidence gate

- Source: `Algorithm/core_engine.md::L1256[Retention_evidence_gate]`
- Lane focus: `RETENTION_AND_TERMINALIZATION, LIVE_EXPERIENCE`
- Transaction boundary: No atomic transaction. The retention gate becomes durable input to later trust, filing, and shell-posture decisions.

### Entry Conditions

- Core compute, risk, graph, and retained evidence posture are available after post-seal adoption.

### Exit Conditions

- The retention evidence gate is recorded and becomes part of the ordered non-access gate chain.

### Branch Predicates

- Retention posture may pass, pass-with-notice, require review, or block downstream progression.

### State Transitions

- Retention-limited posture can narrow later read-side visibility without mutating command truth.

### Failure Exit Paths

- This phase records binding posture but does not itself finalize the run; terminalization happens in later decisive branches.

### Key Modules

- `RETENTION_EVIDENCE_GATE`
- `WRITE_ARTIFACT`
- `RECORD_EVENT`
- `APPEND_MANIFEST_GATES`

### Live Experience

- derived composite shell only; posture=n/a; motion=n/a

### Notes

- Retention limitations are legal constraints on what can be shown or relied upon, not client-side decoration.

## P09 Authority context, comparison basis, parity, and parity gate

- Source: `Algorithm/core_engine.md::L1293[Authority_context_comparison_basis_parity_and_parity_gate]`
- Lane focus: `AUTHORITY_CONTEXT, FILING_AND_SUBMISSION, LIVE_EXPERIENCE`
- Transaction boundary: No single transaction. Authority comparison and parity remain durable command-side artifacts that can drive early terminalization.

### Entry Conditions

- Non-access pre-trust gate context is available and the run can consult authority-facing comparison basis.
- Authority state must remain distinct from internal progression state and packet intent.

### Exit Conditions

- Authority comparison basis, parity result, and parity gate posture are persisted.
- Early filing-readiness or amendment-intent terminalization may already have returned.

### Branch Predicates

- Provider-required amendment-intent calculation may emit a decisive early amendment gate before the ordinary filing path.
- Parity or filing-readiness validation may stop the run early with blocked or review posture.
- Out-of-band authority truth remains distinct from internal command-side progression.

### State Transitions

- Authority comparison basis and parity artifacts become durable references for later trust and filing.

### Failure Exit Paths

- `FINALIZE_TERMINAL_OUTCOME(...)` may return early for filing-readiness or amendment-intent validation failure.

### Key Modules

- `EXECUTE_AUTHORITY_CALCULATION_FLOW`
- `SELECT_DRIFT_BASELINE`
- `WRITE_ARTIFACT`
- `RECORD_EVENT`
- `BUILD_DRIFT_DELTA_VECTOR`
- `CLASSIFY_TEMPORAL_POSITION`
- `ANALYZE_RETROACTIVE_IMPACT`
- `DETECT_DRIFT`
- `MATERIALIZE_AMENDMENT_WINDOW_CONTEXT`
- `EVALUATE_AMENDMENT_ELIGIBILITY`
- `UPSERT_AMENDMENT_CASE`
- `UPDATE_MANIFEST_OUTPUTS`
- `+11` more phase-local module calls

### Live Experience

- IntentToAmendTriggered: DRIFT_FIELD, CONSEQUENCE_RAIL; posture=CONTAINED; motion=RIPPLE
- derived composite shell only; posture=n/a; motion=n/a
- WorkflowOpened: CONSEQUENCE_RAIL; posture=CONTAINED; motion=ECHO
- derived composite shell only; posture=n/a; motion=n/a
- derived composite shell only; posture=n/a; motion=n/a

### Notes

- Authority calculations use controlled outbox + inbox recovery, so inline waits never invent unnormalized external truth.

## P10 Drift posture and amendment posture preparation

- Source: `Algorithm/core_engine.md::L1621[Drift_posture_and_amendment_posture_preparation]`
- Lane focus: `DRIFT_AND_AMENDMENT`
- Transaction boundary: No atomic transaction. Drift and amendment-prep artifacts are persisted as analysis inputs to later gates.

### Entry Conditions

- Authority comparison and parity posture are known.
- The run can select the lawful drift baseline and evaluate retroactive impact.

### Exit Conditions

- Drift, amendment-window context, retroactive impact, and amendment case posture are prepared for later gates.

### Branch Predicates

- Baseline selection may prefer authority-corrected, amended, filed, out-of-band, or working states depending lineage.
- Drift may imply replay requirement, review escalation, or amendment eligibility.
- `AMENDMENT_GATE` is explicitly forbidden during drift preparation and must happen later in the run.

### State Transitions

- `AmendmentCase.lifecycle_state` is prepared in pre-gate posture such as `NOT_ELIGIBLE`, `ELIGIBLE`, or `INTENT_REQUIRED`.

### Failure Exit Paths

- No direct terminalization occurs here; this phase prepares downstream drift/amendment consequences only.

### Key Modules

- `SELECT_DRIFT_BASELINE`
- `WRITE_ARTIFACT`
- `RECORD_EVENT`
- `BUILD_DRIFT_DELTA_VECTOR`
- `CLASSIFY_TEMPORAL_POSITION`
- `ANALYZE_RETROACTIVE_IMPACT`
- `DETECT_DRIFT`
- `MATERIALIZE_AMENDMENT_WINDOW_CONTEXT`
- `EVALUATE_AMENDMENT_ELIGIBILITY`
- `UPSERT_AMENDMENT_CASE`
- `UPDATE_MANIFEST_OUTPUTS`
- `LOAD_AMENDMENT_CASE`
- `+1` more phase-local module calls

### Live Experience

- DriftDetected: DRIFT_FIELD, CONSEQUENCE_RAIL; posture=CONTAINED; motion=RIPPLE

### Notes

- This phase protects the semantic distinction between drift diagnosis and amendment permissioning.

## P11 Trust synthesis and command-side case state

- Source: `Algorithm/core_engine.md::L1747[Trust_synthesis_and_command-side_case_state]`
- Lane focus: `TRUST_AND_WORKFLOW`
- Transaction boundary: No atomic transaction. Trust posture is durable input to workflow refresh and possible early terminalization.

### Entry Conditions

- Parity, retention, drift, and override context are available.

### Exit Conditions

- Trust summary, trust gate, and command-side filing case posture are persisted.

### Branch Predicates

- Trust currency, override dependencies, and gate explanation can still produce blocked or review posture.
- The trust posture may later terminalize the run even if filing scope was requested.

### State Transitions

- Trust and filing-case state become command-side truth that later phases can project or terminalize from.

### Failure Exit Paths

- This phase does not directly return, but its gate posture may trigger trust-based terminalization in the next read-model phase.

### Key Modules

- `DERIVE_REQUIRED_HUMAN_STEPS`
- `ASSESS_TRUST_INPUT_STATE`
- `LOAD_OVERRIDES`
- `SYNTHESIZE_TRUST`
- `WRITE_ARTIFACT`
- `RECORD_EVENT`
- `TRUST_GATE`
- `APPEND_MANIFEST_GATES`
- `UPSERT_FILING_CASE`
- `UPDATE_MANIFEST_OUTPUTS`

### Live Experience

- derived composite shell only; posture=n/a; motion=n/a
- TrustSynthesized: DECISION_STAGE, PACKET_FORGE; posture=CONTAINED; motion=TRACE

### Notes

- Trust is the command-side synthesis of parity, risk, retention, authority context, and override legality.

## P12 Workflow planning and immediate consequence refresh

- Source: `Algorithm/core_engine.md::L1859[Workflow_planning_and_immediate_consequence_refresh]`
- Lane focus: `TRUST_AND_WORKFLOW, LIVE_EXPERIENCE`
- Transaction boundary: No atomic transaction. Workflow is refreshed as durable consequence planning derived from prior command truth.

### Entry Conditions

- Trust posture and the ordered gate chain are stable enough to emit operator workflow consequences.

### Exit Conditions

- Workflow items and immediate-consequence posture are refreshed for the current manifest.

### Branch Predicates

- Workflow planning may open new operator work or produce no-op refresh if no action is required.

### State Transitions

- Workflow items transition into durable open state when consequence planning demands human follow-up.

### Failure Exit Paths

- No direct terminal return occurs here.

### Key Modules

- `PLAN_WORKFLOW`
- `UPSERT_WORKFLOW_ITEMS`
- `RECORD_EVENT`

### Live Experience

- CONSEQUENCE_RAIL; posture=n/a; motion=ECHO

### Notes

- Workflow remains downstream of gate posture; it does not replace or reinterpret decisive legal state.

## P13 Publish live read-model projections and conditionally terminalize on trust posture

- Source: `Algorithm/core_engine.md::L1912[Publish_live_read-model_projections_and_conditionally_terminalize_on_trust_posture]`
- Lane focus: `LIVE_EXPERIENCE, TRUST_AND_WORKFLOW, RETENTION_AND_TERMINALIZATION`
- Transaction boundary: No global transaction. Read-side projection publication must preserve shell continuity even while command truth can already terminalize.

### Entry Conditions

- The run has stable trust posture and can publish live read-model projections for the shell.
- Projection workers must remain read-side only and may finish after `DecisionBundle` persistence.

### Exit Conditions

- Composite low-noise shell surfaces are refreshed and the run either proceeds onward or terminalizes on trust posture.

### Branch Predicates

- Trust posture may terminalize here when no amendment or filing path still needs evaluation.
- Projection completion may lag behind command truth without blanking the shell or forcing route changes.

### State Transitions

- `LowNoiseExperienceFrame` advances through read-side presentation and attention states without mutating legal truth.

### Failure Exit Paths

- `FINALIZE_TERMINAL_OUTCOME(...)` may return on decisive trust posture before amendment or filing stages.

### Key Modules

- `RECORD_EVENT`
- `UPDATE_MANIFEST_OUTPUTS`
- `BUILD_LIVE_EXPERIENCE_FRAME`
- `SELECT_PRIMARY_PROOF_BUNDLE_REF`
- `FINALIZE_TERMINAL_OUTCOME`

### Live Experience

- ExperienceFrameRefreshed: derived composite shell only; posture=n/a; motion=n/a
- ProjectionSidecarsMaterialized: derived composite shell only; posture=n/a; motion=ECHO

### Notes

- This phase is the clearest command-truth versus read-side boundary: `ExperienceDelta` is operational, not the legal record.

## P14 Amendment gate and intent-to-amend progression

- Source: `Algorithm/core_engine.md::L2159[Amendment_gate_and_intent-to-amend_progression]`
- Lane focus: `DRIFT_AND_AMENDMENT, FILING_AND_SUBMISSION, LIVE_EXPERIENCE`
- Transaction boundary: No single transaction. Amendment readiness and gate posture become durable filing-side inputs or a terminal outcome.

### Entry Conditions

- Amendment-related scope was requested or amendment posture otherwise needs decisive evaluation.
- Drift and amendment-preparation artifacts are already persisted from phase 10.

### Exit Conditions

- `AMENDMENT_GATE` and any intent-to-amend readiness posture are persisted.
- The run either continues with a ready amendment path or terminalizes with blocked/review posture.

### Branch Predicates

- Amendment intent and amendment submit remain distinct branches.
- No amendment request bypasses this gate entirely, leaving filing progression to later phases.
- Blocked or review-required amendment posture terminalizes immediately.

### State Transitions

- `AmendmentCase.lifecycle_state` may move into `INTENT_SUBMITTED`, `READY_TO_AMEND`, or terminal review/block posture.

### Failure Exit Paths

- `FINALIZE_TERMINAL_OUTCOME(...)` returns when amendment gate posture is blocking or review-required.

### Key Modules

- `VALIDATE_AMENDMENT_READINESS_FRESHNESS`
- `RECORD_EVENT`
- `AMENDMENT_GATE`
- `WRITE_ARTIFACT`
- `APPEND_MANIFEST_GATES`
- `PLAN_WORKFLOW`
- `UPSERT_WORKFLOW_ITEMS`
- `SELECT_PRIMARY_PROOF_BUNDLE_REF`
- `FINALIZE_TERMINAL_OUTCOME`
- `EXECUTE_AUTHORITY_CALCULATION_FLOW`
- `UPSERT_AMENDMENT_CASE`
- `UPDATE_MANIFEST_OUTPUTS`

### Live Experience

- derived composite shell only; posture=n/a; motion=n/a
- WorkflowOpened: CONSEQUENCE_RAIL; posture=CONTAINED; motion=ECHO
- IntentToAmendTriggered: DRIFT_FIELD, CONSEQUENCE_RAIL; posture=CONTAINED; motion=RIPPLE
- derived composite shell only; posture=n/a; motion=n/a
- IntentToAmendValidated: DRIFT_FIELD; posture=BRIDGED; motion=BRIDGE

### Notes

- This is the first lawful place the engine may evaluate `AMENDMENT_GATE`; drift preparation alone is not enough.

## P15 Authority calculation, filing readiness, packet preparation, and filing gate

- Source: `Algorithm/core_engine.md::L2454[Authority_calculation_filing_readiness_packet_preparation_and_filing_gate]`
- Lane focus: `AUTHORITY_CONTEXT, FILING_AND_SUBMISSION, LIVE_EXPERIENCE`
- Transaction boundary: No global transaction. Packet preparation and gate persistence must still preserve immutable manifest-binding and approval posture.

### Entry Conditions

- Filing-related scope is requested or amendment submit requires packet preparation.
- Trust, parity, authority context, and amendment posture are available.

### Exit Conditions

- Filing-readiness context and `FILING_GATE` posture are persisted.
- A filing packet may be prepared and hardened to `APPROVED_TO_SUBMIT` when lawful.

### Branch Predicates

- Mode block, prepacket terminalization, and year-end calculation failure can stop filing before packet hardening.
- Amendment submit requires `READY_TO_AMEND`; it must not silently reuse an unready amendment case.
- Filing gate may block, require review, pass-with-notice, or pass to packet approval and later submission.

### State Transitions

- `FilingPacket.lifecycle_state` advances from `DRAFT` to `PREPARED` and possibly `APPROVED_TO_SUBMIT`.
- Filing case posture is refreshed with packet and readiness references.

### Failure Exit Paths

- `FINALIZE_TERMINAL_OUTCOME(...)` returns for blocked or review-required filing posture.
- `FINALIZE_RUN_FAILURE(...)` guards packet-manifest binding mismatch.
- `ERROR(AMENDMENT_CASE_NOT_READY_TO_SUBMIT)` prevents invalid amendment submission.

### Key Modules

- `CHECK_TRUST_CURRENCY`
- `LOAD_OVERRIDES`
- `FILING_GATE`
- `OBLIGATION_STATUS`
- `WRITE_ARTIFACT`
- `RECORD_EVENT`
- `APPEND_MANIFEST_GATES`
- `PLAN_WORKFLOW`
- `UPSERT_WORKFLOW_ITEMS`
- `SELECT_PRIMARY_PROOF_BUNDLE_REF`
- `FINALIZE_TERMINAL_OUTCOME`
- `EXECUTE_AUTHORITY_CALCULATION_FLOW`
- `+9` more phase-local module calls

### Live Experience

- derived composite shell only; posture=n/a; motion=n/a
- WorkflowOpened: CONSEQUENCE_RAIL; posture=CONTAINED; motion=ECHO
- derived composite shell only; posture=n/a; motion=n/a
- WorkflowOpened: CONSEQUENCE_RAIL; posture=CONTAINED; motion=ECHO
- derived composite shell only; posture=n/a; motion=n/a
- WorkflowOpened: CONSEQUENCE_RAIL; posture=CONTAINED; motion=ECHO
- FilingPacketPrepared: PACKET_FORGE; posture=FROZEN; motion=SEAL
- derived composite shell only; posture=n/a; motion=n/a
- WorkflowOpened: CONSEQUENCE_RAIL; posture=CONTAINED; motion=ECHO
- FilingPacketApproved: PACKET_FORGE; posture=FROZEN; motion=SEAL

### Notes

- Internal filing intent and packet hardening remain distinct from authority-owned acceptance or confirmation.

## P16 Submission enqueue, governed transmit, inbox-normalized recovery, and bounded reconciliation

- Source: `Algorithm/core_engine.md::L2965[Submission_enqueue_governed_transmit_inbox-normalized_recovery_and_bounded_reconciliation]`
- Lane focus: `FILING_AND_SUBMISSION, AUTHORITY_CONTEXT, LIVE_EXPERIENCE`
- Transaction boundary: A dedicated atomic transaction creates the submission record, queues authority transmit intent, advances the filing packet, and refreshes filing-case linkage as one durable handoff.

### Entry Conditions

- A filing packet is approved for submit and runtime scope actually requests submission.
- Submission must still pass send-time dedupe, binding, and gate checks.

### Exit Conditions

- Submission gate posture, submission record state, authority request lineage, and any reconciliation outputs are persisted.
- The live shell now distinguishes transmit-pending, pending-ack, confirmed, rejected, unknown, and out-of-band authority posture.

### Branch Predicates

- Submission gate may block or require review before any authority bytes leave the process.
- Recovery may resolve via reconciliation, transmitted-awaiting-ack, or transmit-pending-unverified posture.
- Amendment submit updates amendment case state separately from packet or submission state.

### State Transitions

- `SubmissionRecord.lifecycle_state` moves through `INTENT_RECORDED`, `TRANSMIT_PENDING`, `PENDING_ACK`, and authority-resolved terminal states.
- `FilingPacket.lifecycle_state` transitions into submission-in-progress posture.
- `AmendmentCase.lifecycle_state` may become `AMEND_SUBMITTED`, `AMEND_CONFIRMED`, `AMEND_REJECTED`, or `AMEND_PENDING`.

### Failure Exit Paths

- `FINALIZE_TERMINAL_OUTCOME(...)` returns when `SUBMISSION_GATE` blocks or requires review before transmit.

### Key Modules

- `CONSTRUCT_AMENDMENT_BUNDLE`
- `WRITE_ARTIFACT`
- `UPDATE_MANIFEST_OUTPUTS`
- `RECORD_EVENT`
- `RESOLVE_AUTHORITY_OPERATION`
- `RESOLVE_AUTHORITY_BINDING`
- `CANONICALIZE_AUTHORITY_REQUEST`
- `DERIVE_AUTHORITY_REQUEST_HASHES`
- `BUILD_AUTHORITY_REQUEST_ENVELOPE`
- `SUBMISSION_GATE`
- `EXISTING_SUBMISSIONS`
- `APPEND_MANIFEST_GATES`
- `+12` more phase-local module calls

### Live Experience

- AuthorityRequestBuilt: AUTHORITY_TUNNEL; posture=STREAMING; motion=TRACE
- derived composite shell only; posture=n/a; motion=n/a
- WorkflowOpened: CONSEQUENCE_RAIL; posture=CONTAINED; motion=ECHO
- SubmissionAttempted: PULSE_SPINE, AUTHORITY_TUNNEL, PACKET_FORGE; posture=STREAMING; motion=TRACE
- SubmissionAwaitingAuthorityConfirmation: PULSE_SPINE, AUTHORITY_TUNNEL, PACKET_FORGE, CONSEQUENCE_RAIL; posture=CONTAINED; motion=ECHO
- SubmissionTransmitStillPending: PULSE_SPINE, AUTHORITY_TUNNEL, CONSEQUENCE_RAIL; posture=CONTAINED; motion=ECHO
- SubmissionReconciled: PULSE_SPINE, AUTHORITY_TUNNEL, PACKET_FORGE; posture=n/a; motion=n/a

### Notes

- Authority-owned truth and out-of-band corrections remain separate from the engine's internal packet and submission intent states.

## P17 Post-authority drift monitoring

- Source: `Algorithm/core_engine.md::L3465[Post-authority_drift_monitoring]`
- Lane focus: `DRIFT_AND_AMENDMENT, LIVE_EXPERIENCE`
- Transaction boundary: No atomic transaction. Post-authority drift is persisted as follow-up truth and workflow, not a rewrite of prior filing history.

### Entry Conditions

- A submission exists and reconciliation has produced some authority-side truth or ambiguity.

### Exit Conditions

- Post-authority drift, retroactive impact, amendment window, and amendment case refresh are persisted.
- Workflow escalation opens when authority-confirmed state is internally superseded or further drift action is needed.

### Branch Predicates

- Authority-confirmed state may still be internally superseded by later drift or contradiction.
- Replay requirement, contradiction, or material drift opens review workflow instead of silently mutating history.

### State Transitions

- `AmendmentCase.lifecycle_state` may move toward superseded, review, or amendment-required post-authority posture.

### Failure Exit Paths

- No direct return occurs here; this phase prepares any post-authority follow-up that survives terminalization.

### Key Modules

- `SELECT_DRIFT_BASELINE`
- `WRITE_ARTIFACT`
- `RECORD_EVENT`
- `BUILD_DRIFT_DELTA_VECTOR`
- `CLASSIFY_TEMPORAL_POSITION`
- `ANALYZE_RETROACTIVE_IMPACT`
- `DETECT_DRIFT`
- `MATERIALIZE_AMENDMENT_WINDOW_CONTEXT`
- `EVALUATE_AMENDMENT_ELIGIBILITY`
- `UPSERT_AMENDMENT_CASE`
- `UPDATE_MANIFEST_OUTPUTS`
- `EMIT_WORKFLOW_ITEM`

### Live Experience

- PostAuthorityDriftEvaluated: DRIFT_FIELD, CONSEQUENCE_RAIL; posture=CONTAINED; motion=RIPPLE
- WorkflowOpened: CONSEQUENCE_RAIL; posture=CONTAINED; motion=ECHO

### Notes

- This phase preserves the difference between accepted authority truth and the engine's later observation of new contradictions or amendment need.

## P18 Terminal finalization and return

- Source: `Algorithm/core_engine.md::L3571[Terminal_finalization_and_return]`
- Lane focus: `RETENTION_AND_TERMINALIZATION, LIVE_EXPERIENCE, MANIFEST_AND_LINEAGE`
- Transaction boundary: Terminal finalization persists one authoritative bundle, normalized workflow refs, and final shell posture after all decisive branch logic has converged.

### Entry Conditions

- Command-side work is done, or the run is waiting on bounded external confirmation.
- The engine must normalize terminal workflow refs and shell checkpoint vocabulary before returning.

### Exit Conditions

- A terminal `DecisionBundle` is persisted with final reasons, retained refs, and normalized workflow posture.
- The live shell is refreshed into terminal posture without losing authority-pending or out-of-band distinctions.

### Branch Predicates

- No reconciliation yields `REVIEW_REQUIRED` with pending external confirmation.
- Reconciliation may land as `COMPLETED`, `BLOCKED`, or `REVIEW_REQUIRED` depending on confirmed, rejected, unknown, or out-of-band outcome.
- `terminal_checkpoint_state` normalizes transport detail so replay and shell restore do not leak noncanonical transport-only values.

### State Transitions

- `RunManifest.lifecycle_state` terminalizes as `COMPLETED` or `BLOCKED` while review-required bundle posture remains backwards compatible.

### Failure Exit Paths

- The phase itself is the final terminalization and return path for successful, blocked, or externally pending outcomes.

### Key Modules

- `SELECT_PRIMARY_PROOF_BUNDLE_REF`
- `FINALIZE_TERMINAL_OUTCOME`

### Live Experience

- TerminalFinalization: PULSE_SPINE, MANIFEST_RIBBON, DECISION_STAGE, CONSEQUENCE_RAIL, AUTHORITY_TUNNEL; posture=n/a; motion=n/a

### Notes

- The terminal live-experience frame is operational read-side state only; it is not the legal record of what happened.

