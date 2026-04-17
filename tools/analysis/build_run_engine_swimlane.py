#!/usr/bin/env python3
from __future__ import annotations

import csv
import json
import re
from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable


ROOT = Path(__file__).resolve().parents[2]
ALGORITHM_DIR = ROOT / "Algorithm"
DATA_ANALYSIS_DIR = ROOT / "data" / "analysis"
DOCS_ANALYSIS_DIR = ROOT / "docs" / "analysis"
DIAGRAMS_ANALYSIS_DIR = ROOT / "diagrams" / "analysis"
ATLAS_DIR = ROOT / "prototypes" / "analysis" / "run_engine_swimlane_atlas"

PHASE_INDEX_PATH = DATA_ANALYSIS_DIR / "run_engine_phase_index.json"
STEP_LEDGER_PATH = DATA_ANALYSIS_DIR / "run_engine_step_ledger.jsonl"
EVENT_TIMELINE_PATH = DATA_ANALYSIS_DIR / "run_engine_event_timeline.csv"
BRANCH_CONDITIONS_PATH = DATA_ANALYSIS_DIR / "run_engine_branch_conditions.json"
LIVE_EXPERIENCE_MAP_PATH = DATA_ANALYSIS_DIR / "run_engine_live_experience_map.json"

SWIMLANE_DOC_PATH = DOCS_ANALYSIS_DIR / "06_run_engine_end_to_end_execution_swimlane.md"
PHASE_CONTRACTS_DOC_PATH = DOCS_ANALYSIS_DIR / "06_run_engine_phase_contracts.md"
BRANCH_DOC_PATH = DOCS_ANALYSIS_DIR / "06_run_engine_branch_and_terminalization_matrix.md"
MERMAID_PATH = DIAGRAMS_ANALYSIS_DIR / "06_run_engine_swimlane.mmd"

ATLAS_DATA_PATH = ATLAS_DIR / "atlas_data.json"
ATLAS_INDEX_PATH = ATLAS_DIR / "index.html"
ATLAS_STYLES_PATH = ATLAS_DIR / "styles.css"
ATLAS_APP_PATH = ATLAS_DIR / "app.js"

CORE_ENGINE_PATH = "Algorithm/core_engine.md"
MODULES_PATH = "Algorithm/modules.md"
STATE_MACHINES_PATH = "Algorithm/state_machines.md"
INVARIANTS_PATH = "Algorithm/invariants_and_gates.md"
GATE_LOGIC_PATH = "Algorithm/exact_gate_logic_and_decision_tables.md"
OBSERVABILITY_PATH = "Algorithm/observability_and_audit_contract.md"
REPLAY_PATH = "Algorithm/replay_and_reproducibility_contract.md"
FREEZE_PATH = "Algorithm/manifest_and_config_freeze_contract.md"
LATE_DATA_PATH = "Algorithm/late_data_authority_correction_and_replay_propagation_contract.md"
LOW_NOISE_PATH = "Algorithm/low_noise_experience_contract.md"

LANE_ORDER = [
    "CALLER_AND_SCOPE",
    "AUTHORIZATION",
    "MANIFEST_AND_LINEAGE",
    "CONFIG_AND_FREEZE",
    "SOURCE_COLLECTION_AND_CANONICALIZATION",
    "PRESEAL_GATES",
    "POSTSEAL_DAG",
    "AUTHORITY_CONTEXT",
    "DRIFT_AND_AMENDMENT",
    "TRUST_AND_WORKFLOW",
    "FILING_AND_SUBMISSION",
    "LIVE_EXPERIENCE",
    "RETENTION_AND_TERMINALIZATION",
]
DEFAULT_COMPOSITE_SURFACES = [
    "CONTEXT_BAR",
    "DECISION_SUMMARY",
    "ACTION_STRIP",
    "DETAIL_DRAWER",
]
MANDATORY_BRANCH_IDS = {
    "BR_ACCESS_BLOCKED_EARLY_RETURN",
    "BR_INVALID_SCOPE_OR_PRIOR_CONTEXT",
    "BR_EXISTING_DECISION_BUNDLE_RETURN",
    "BR_MANIFEST_REUSE_VS_CONTINUATION_VS_REPLAY",
    "BR_LATE_DATA_SPAWN_REVIEW_EXCLUDE",
    "BR_PRESEAL_BLOCKED_VS_SEALED",
    "BR_PRESTART_VS_POSTSTART_SYSTEM_FAULT",
    "BR_REPLAY_REUSES_FROZEN_POSTSEAL_BASIS",
    "BR_EARLY_FILING_READINESS_TERMINALIZATION",
    "BR_TRUST_POSTURE_TERMINALIZATION",
    "BR_AMENDMENT_INTENT_VS_AMENDMENT_SUBMIT",
    "BR_SUBMIT_VS_NON_SUBMIT",
}
MANDATORY_TEST_IDS = {
    "run-engine-atlas",
    "phase-rail",
    "phase-row-01",
    "lane-canvas",
    "lane-CALLER_AND_SCOPE",
    "selected-phase-detail",
    "branch-chip",
    "transaction-span",
    "event-pin",
    "gate-node",
    "artifact-capsule",
    "experience-update-list",
}

TRANSACTION_PRIMITIVES = {
    "BEGIN_ATOMIC_TRANSACTION",
    "COMMIT_ATOMIC_TRANSACTION",
    "ROLLBACK_ATOMIC_TRANSACTION",
}
MANIFEST_MUTATION_CALLS = {
    "BEGIN_MANIFEST",
    "BEGIN_CHILD_MANIFEST",
    "UPDATE_MANIFEST_PRESEAL_CONTEXT",
    "TRANSITION_MANIFEST",
    "CLAIM_MANIFEST_START",
    "UPDATE_MANIFEST_GATES",
    "APPEND_MANIFEST_GATES",
    "PERSIST_GATE_BATCH",
    "UPDATE_MANIFEST_OUTPUTS",
    "PERSIST_DECISION_BUNDLE",
    "PERSIST_PRESTART_TERMINAL_CONTEXT",
    "SEAL_MANIFEST",
}
PRESEAL_GATE_CODES = {
    "MANIFEST_GATE",
    "ARTIFACT_CONTRACT_GATE",
    "INPUT_BOUNDARY_GATE",
    "DATA_QUALITY_GATE",
}


PHASE_CURATION: dict[int, dict[str, Any]] = {
    1: {
        "entry_conditions": [
            "RUN_ENGINE receives `raw_requested_scope[]`, principal context, and any authority-binding context.",
            "`masking_context` may be present for read-side rendering, but execution semantics remain unmasked.",
        ],
        "exit_conditions": [
            "`runtime_scope[]` is bound from authorization and becomes the only downstream scope vocabulary.",
            "Access-blocked requests may return a low-noise access response before any manifest allocation.",
        ],
        "branch_predicates": [
            "Access denied, step-up required, or authority-binding mismatch returns before manifest work begins.",
            "`raw_requested_scope[]` is preserved for later audit only; `runtime_scope[]` drives gates and legal progression.",
            "`masking_context` remains read-side only and must not leak into compute, filing, or transport behavior.",
        ],
        "state_transitions": [
            "No durable domain object changes state before access posture is resolved.",
        ],
        "failure_exit_paths": [
            "`ACCESS_BLOCKED_RESPONSE(...)` returns a bounded low-noise posture envelope without allocating a manifest.",
        ],
        "notes": [
            "The shell defaults to `LOW_NOISE` and keeps the access result separate from later manifest lifecycle state.",
        ],
        "lane_focus": ["CALLER_AND_SCOPE", "AUTHORIZATION"],
        "branch_tags": ["access early return", "runtime scope bind"],
        "supporting_source_refs": [
            CORE_ENGINE_PATH,
            GATE_LOGIC_PATH,
            OBSERVABILITY_PATH,
            LOW_NOISE_PATH,
        ],
        "transaction_boundary": "No atomic transaction. This phase is a caller-to-authorization boundary before manifest lineage exists.",
        "transaction_spans": [],
    },
    2: {
        "entry_conditions": [
            "Authorization resolved a usable `runtime_scope[]` and access binding.",
            "Any prior manifest lineage must be loaded before config inheritance or reuse decisions are chosen.",
        ],
        "exit_conditions": [
            "Scope grammar, reporting intent, prior-manifest context, and config inheritance mode are resolved.",
            "A same-manifest terminal retry may short-circuit to an existing `DecisionBundle`.",
        ],
        "branch_predicates": [
            "Invalid scope grammar or invalid prior-manifest context stops progression before allocation.",
            "The reuse decision differentiates fresh manifest allocation, same-manifest reuse, continuation child, and replay child.",
            "Replay remains lineage-governed reuse of frozen basis rather than a fresh authority read.",
        ],
        "state_transitions": [
            "No manifest lifecycle transition occurs until the branch strategy is selected.",
        ],
        "failure_exit_paths": [
            "`ERROR(...)` exits on invalid scope grammar or irrecoverable prior-manifest context.",
            "`ExistingDecisionBundleReturned` may short-circuit same-manifest retries against terminal lineage.",
        ],
        "notes": [
            "Config inheritance is frozen as a manifest-strategy choice, not a renderer-side preference.",
        ],
        "lane_focus": ["CALLER_AND_SCOPE", "MANIFEST_AND_LINEAGE", "CONFIG_AND_FREEZE"],
        "branch_tags": ["reuse decision", "bundle return"],
        "supporting_source_refs": [
            CORE_ENGINE_PATH,
            REPLAY_PATH,
            FREEZE_PATH,
            OBSERVABILITY_PATH,
        ],
        "transaction_boundary": "No atomic transaction. This phase determines lineage and frozen-config posture before any manifest write occurs.",
        "transaction_spans": [],
    },
    3: {
        "entry_conditions": [
            "The run knows whether it is a fresh manifest, same-manifest reuse, continuation child, or replay child.",
            "Config inheritance and input inheritance choices are available.",
        ],
        "exit_conditions": [
            "A manifest context is allocated, reused, or continued with durable lineage refs.",
            "The live-experience stream is initialized with `shell_route_key = manifest_id` and monotonic sequencing.",
        ],
        "branch_predicates": [
            "Fresh manifest vs reused sealed manifest vs continuation child vs replay child remains explicitly indexed in lineage.",
            "Config and input inheritance may come from a frozen prior manifest or from fresh request-time resolution.",
        ],
        "state_transitions": [
            "`RunManifest.lifecycle_state` enters `ALLOCATED` for fresh or child allocations.",
            "Config freeze and input freeze bindings become part of the immutable execution envelope.",
        ],
        "failure_exit_paths": [
            "Lineage validation failures stop the run before pre-seal source work starts.",
        ],
        "notes": [
            "This is the phase that binds raw request lineage to the stable manifest route and shell continuity contract.",
        ],
        "lane_focus": ["MANIFEST_AND_LINEAGE", "CONFIG_AND_FREEZE", "LIVE_EXPERIENCE"],
        "branch_tags": ["manifest allocated", "child lineage"],
        "supporting_source_refs": [
            CORE_ENGINE_PATH,
            FREEZE_PATH,
            STATE_MACHINES_PATH,
            LOW_NOISE_PATH,
        ],
        "transaction_boundary": "No global transaction; allocation and stream initialization must still preserve manifest lineage integrity and reconnect-safe shell identity.",
        "transaction_spans": [],
    },
    4: {
        "entry_conditions": [
            "A manifest exists but has not yet sealed a pre-start execution context.",
            "The run knows whether it may reuse a sealed pre-start context or must rebuild one from source collection.",
        ],
        "exit_conditions": [
            "Either a reusable sealed pre-start basis is loaded, or a fresh source/canonicalization pipeline has built the frozen input set.",
            "Late-data posture, collection boundary, artifact set, and execution basis hash inputs are known.",
        ],
        "branch_predicates": [
            "A sealed pre-start context may be reused when lineage and freeze rules allow it.",
            "Late data may force spawn-child, review-if-late, or exclude-late posture before seal.",
            "Replay may reuse a frozen post-seal basis instead of re-reading authority truth.",
        ],
        "state_transitions": [
            "`SourceCollectionRun.lifecycle_state` advances through source-collection states for fresh pre-seal work.",
            "`Snapshot.lifecycle_state` becomes buildable only from canonicalized, contract-valid inputs.",
        ],
        "failure_exit_paths": [
            "Irrecoverable source-collection or replay-precondition failures stop before manifest sealing.",
        ],
        "notes": [
            "`masking_context` is expressly barred from source planning, canonicalization, filing, and transport semantics.",
        ],
        "lane_focus": [
            "SOURCE_COLLECTION_AND_CANONICALIZATION",
            "CONFIG_AND_FREEZE",
            "MANIFEST_AND_LINEAGE",
        ],
        "branch_tags": ["sealed reuse", "late-data fork"],
        "supporting_source_refs": [
            CORE_ENGINE_PATH,
            FREEZE_PATH,
            LATE_DATA_PATH,
            STATE_MACHINES_PATH,
        ],
        "transaction_boundary": "No atomic transaction. This phase is about building or recovering the immutable pre-seal input basis.",
        "transaction_spans": [],
    },
    5: {
        "entry_conditions": [
            "Pre-seal artifacts, input freeze, and schema bundle are available or explicitly reused.",
            "The manifest is not yet started, so failures remain pre-start outcomes.",
        ],
        "exit_conditions": [
            "Ordered pre-seal gates are persisted and either bind a blocked/review posture or allow sealing.",
            "When a new pre-start context was built, the manifest is sealed exactly once.",
        ],
        "branch_predicates": [
            "Pre-seal evaluation may stop as blocked, review-required, or sealable success.",
            "A pre-start system fault after seal but before `RunStarted` still finalizes as `BLOCKED`, not `FAILED`.",
            "Pre-seal outcomes in `{PASS_WITH_NOTICE, MANUAL_REVIEW}` remain binding after seal.",
        ],
        "state_transitions": [
            "`RunManifest.lifecycle_state` moves from `ALLOCATED`/`FROZEN` to `SEALED` when the new pre-start context is accepted.",
            "Pre-start gate failure finalizes the manifest as `BLOCKED` before command-side start.",
        ],
        "failure_exit_paths": [
            "`FINALIZE_TERMINAL_OUTCOME(...)` persists blocked or review-required pre-start outcomes.",
            "`FINALIZE_RUN_FAILURE(...)` captures irrecoverable pre-start failure without starting the run.",
        ],
        "notes": [
            "The seal step is atomic with the pre-start persistence boundary, which makes later replay and reuse defensible.",
        ],
        "lane_focus": ["PRESEAL_GATES", "MANIFEST_AND_LINEAGE", "LIVE_EXPERIENCE"],
        "branch_tags": ["pre-seal block", "sealed success"],
        "supporting_source_refs": [
            CORE_ENGINE_PATH,
            INVARIANTS_PATH,
            GATE_LOGIC_PATH,
            FREEZE_PATH,
        ],
        "transaction_boundary": "One atomic pre-start persistence boundary records gate outputs, terminal pre-start context when needed, and the seal mutation when the manifest is newly built.",
        "transaction_spans": [
            {
                "label": "Persist pre-start context and seal when eligible",
                "lane_start": "MANIFEST_AND_LINEAGE",
                "lane_end": "PRESEAL_GATES",
            }
        ],
    },
    6: {
        "entry_conditions": [
            "A sealed manifest exists and has not yet been legally started by another writer.",
            "The post-seal execution plan can be published only if a manifest-start claim succeeds.",
        ],
        "exit_conditions": [
            "A compare-and-swap manifest-start lease is claimed and the first post-seal DAG is atomically published.",
            "`RunStarted` occurs only after a sealed manifest exists.",
        ],
        "branch_predicates": [
            "Claim rejection may surface active run, stale reclaim requirements, or already-terminal bundle reuse.",
            "The run may still return an existing terminal bundle instead of starting a second writer.",
        ],
        "state_transitions": [
            "`RunManifest.lifecycle_state` moves from `SEALED` to `IN_PROGRESS` only after claim + DAG publish succeeds.",
        ],
        "failure_exit_paths": [
            "Start-claim rejection or invalid manifest posture stops progression before worker execution begins.",
        ],
        "notes": [
            "This is the strongest visible proof that the sealed manifest precedes `RunStarted` and worker fan-out.",
        ],
        "lane_focus": ["MANIFEST_AND_LINEAGE", "POSTSEAL_DAG"],
        "branch_tags": ["start claim", "single writer"],
        "supporting_source_refs": [
            CORE_ENGINE_PATH,
            STATE_MACHINES_PATH,
            OBSERVABILITY_PATH,
        ],
        "transaction_boundary": "A single atomic transaction claims manifest start and publishes the first post-seal DAG or workset.",
        "transaction_spans": [
            {
                "label": "Claim manifest start and publish DAG",
                "lane_start": "MANIFEST_AND_LINEAGE",
                "lane_end": "POSTSEAL_DAG",
            }
        ],
    },
    7: {
        "entry_conditions": [
            "The post-seal DAG is durable and a single writer owns the manifest-start lease.",
            "Workers must persist first-class artifacts before any completion signal becomes visible.",
        ],
        "exit_conditions": [
            "Mandatory post-seal artifacts are adopted into manifest outputs.",
            "Projection lag may continue, but command-side truth has the required compute, risk, graph, and related outputs.",
        ],
        "branch_predicates": [
            "Previously completed lineage-compatible tasks may be reused rather than recomputed.",
            "Projection stages may time out as `CONTINUE_WITHOUT_PROJECTION` without failing command-side truth.",
        ],
        "state_transitions": [
            "No manifest terminalization occurs here; the run remains `IN_PROGRESS` with adopted post-seal artifacts.",
        ],
        "failure_exit_paths": [
            "Missing mandatory stage artifacts or invalid adopted outputs escalate as run failure after start.",
        ],
        "notes": [
            "The DAG boundary separates command truth from slower read-model materialization without losing lineage determinism.",
        ],
        "lane_focus": ["POSTSEAL_DAG", "LIVE_EXPERIENCE"],
        "branch_tags": ["stage reuse", "projection lag"],
        "supporting_source_refs": [
            CORE_ENGINE_PATH,
            OBSERVABILITY_PATH,
            LOW_NOISE_PATH,
        ],
        "transaction_boundary": "No overarching transaction. Worker-local durability must precede task completion, and the orchestrator adopts persisted outputs deterministically.",
        "transaction_spans": [],
    },
    8: {
        "entry_conditions": [
            "Core compute, risk, graph, and retained evidence posture are available after post-seal adoption.",
        ],
        "exit_conditions": [
            "The retention evidence gate is recorded and becomes part of the ordered non-access gate chain.",
        ],
        "branch_predicates": [
            "Retention posture may pass, pass-with-notice, require review, or block downstream progression.",
        ],
        "state_transitions": [
            "Retention-limited posture can narrow later read-side visibility without mutating command truth.",
        ],
        "failure_exit_paths": [
            "This phase records binding posture but does not itself finalize the run; terminalization happens in later decisive branches.",
        ],
        "notes": [
            "Retention limitations are legal constraints on what can be shown or relied upon, not client-side decoration.",
        ],
        "lane_focus": ["RETENTION_AND_TERMINALIZATION", "LIVE_EXPERIENCE"],
        "branch_tags": ["retention gate"],
        "supporting_source_refs": [
            CORE_ENGINE_PATH,
            INVARIANTS_PATH,
            LOW_NOISE_PATH,
        ],
        "transaction_boundary": "No atomic transaction. The retention gate becomes durable input to later trust, filing, and shell-posture decisions.",
        "transaction_spans": [],
    },
    9: {
        "entry_conditions": [
            "Non-access pre-trust gate context is available and the run can consult authority-facing comparison basis.",
            "Authority state must remain distinct from internal progression state and packet intent.",
        ],
        "exit_conditions": [
            "Authority comparison basis, parity result, and parity gate posture are persisted.",
            "Early filing-readiness or amendment-intent terminalization may already have returned.",
        ],
        "branch_predicates": [
            "Provider-required amendment-intent calculation may emit a decisive early amendment gate before the ordinary filing path.",
            "Parity or filing-readiness validation may stop the run early with blocked or review posture.",
            "Out-of-band authority truth remains distinct from internal command-side progression.",
        ],
        "state_transitions": [
            "Authority comparison basis and parity artifacts become durable references for later trust and filing.",
        ],
        "failure_exit_paths": [
            "`FINALIZE_TERMINAL_OUTCOME(...)` may return early for filing-readiness or amendment-intent validation failure.",
        ],
        "notes": [
            "Authority calculations use controlled outbox + inbox recovery, so inline waits never invent unnormalized external truth.",
        ],
        "lane_focus": ["AUTHORITY_CONTEXT", "FILING_AND_SUBMISSION", "LIVE_EXPERIENCE"],
        "branch_tags": ["parity gate", "early filing terminal"],
        "supporting_source_refs": [
            CORE_ENGINE_PATH,
            GATE_LOGIC_PATH,
            OBSERVABILITY_PATH,
            LATE_DATA_PATH,
        ],
        "transaction_boundary": "No single transaction. Authority comparison and parity remain durable command-side artifacts that can drive early terminalization.",
        "transaction_spans": [],
    },
    10: {
        "entry_conditions": [
            "Authority comparison and parity posture are known.",
            "The run can select the lawful drift baseline and evaluate retroactive impact.",
        ],
        "exit_conditions": [
            "Drift, amendment-window context, retroactive impact, and amendment case posture are prepared for later gates.",
        ],
        "branch_predicates": [
            "Baseline selection may prefer authority-corrected, amended, filed, out-of-band, or working states depending lineage.",
            "Drift may imply replay requirement, review escalation, or amendment eligibility.",
            "`AMENDMENT_GATE` is explicitly forbidden during drift preparation and must happen later in the run.",
        ],
        "state_transitions": [
            "`AmendmentCase.lifecycle_state` is prepared in pre-gate posture such as `NOT_ELIGIBLE`, `ELIGIBLE`, or `INTENT_REQUIRED`.",
        ],
        "failure_exit_paths": [
            "No direct terminalization occurs here; this phase prepares downstream drift/amendment consequences only.",
        ],
        "notes": [
            "This phase protects the semantic distinction between drift diagnosis and amendment permissioning.",
        ],
        "lane_focus": ["DRIFT_AND_AMENDMENT"],
        "branch_tags": ["drift baseline", "no amendment gate"],
        "supporting_source_refs": [
            CORE_ENGINE_PATH,
            LATE_DATA_PATH,
            STATE_MACHINES_PATH,
        ],
        "transaction_boundary": "No atomic transaction. Drift and amendment-prep artifacts are persisted as analysis inputs to later gates.",
        "transaction_spans": [],
    },
    11: {
        "entry_conditions": [
            "Parity, retention, drift, and override context are available.",
        ],
        "exit_conditions": [
            "Trust summary, trust gate, and command-side filing case posture are persisted.",
        ],
        "branch_predicates": [
            "Trust currency, override dependencies, and gate explanation can still produce blocked or review posture.",
            "The trust posture may later terminalize the run even if filing scope was requested.",
        ],
        "state_transitions": [
            "Trust and filing-case state become command-side truth that later phases can project or terminalize from.",
        ],
        "failure_exit_paths": [
            "This phase does not directly return, but its gate posture may trigger trust-based terminalization in the next read-model phase.",
        ],
        "notes": [
            "Trust is the command-side synthesis of parity, risk, retention, authority context, and override legality.",
        ],
        "lane_focus": ["TRUST_AND_WORKFLOW"],
        "branch_tags": ["trust gate"],
        "supporting_source_refs": [
            CORE_ENGINE_PATH,
            INVARIANTS_PATH,
            GATE_LOGIC_PATH,
        ],
        "transaction_boundary": "No atomic transaction. Trust posture is durable input to workflow refresh and possible early terminalization.",
        "transaction_spans": [],
    },
    12: {
        "entry_conditions": [
            "Trust posture and the ordered gate chain are stable enough to emit operator workflow consequences.",
        ],
        "exit_conditions": [
            "Workflow items and immediate-consequence posture are refreshed for the current manifest.",
        ],
        "branch_predicates": [
            "Workflow planning may open new operator work or produce no-op refresh if no action is required.",
        ],
        "state_transitions": [
            "Workflow items transition into durable open state when consequence planning demands human follow-up.",
        ],
        "failure_exit_paths": [
            "No direct terminal return occurs here.",
        ],
        "notes": [
            "Workflow remains downstream of gate posture; it does not replace or reinterpret decisive legal state.",
        ],
        "lane_focus": ["TRUST_AND_WORKFLOW", "LIVE_EXPERIENCE"],
        "branch_tags": ["workflow refresh"],
        "supporting_source_refs": [
            CORE_ENGINE_PATH,
            LOW_NOISE_PATH,
            OBSERVABILITY_PATH,
        ],
        "transaction_boundary": "No atomic transaction. Workflow is refreshed as durable consequence planning derived from prior command truth.",
        "transaction_spans": [],
    },
    13: {
        "entry_conditions": [
            "The run has stable trust posture and can publish live read-model projections for the shell.",
            "Projection workers must remain read-side only and may finish after `DecisionBundle` persistence.",
        ],
        "exit_conditions": [
            "Composite low-noise shell surfaces are refreshed and the run either proceeds onward or terminalizes on trust posture.",
        ],
        "branch_predicates": [
            "Trust posture may terminalize here when no amendment or filing path still needs evaluation.",
            "Projection completion may lag behind command truth without blanking the shell or forcing route changes.",
        ],
        "state_transitions": [
            "`LowNoiseExperienceFrame` advances through read-side presentation and attention states without mutating legal truth.",
        ],
        "failure_exit_paths": [
            "`FINALIZE_TERMINAL_OUTCOME(...)` may return on decisive trust posture before amendment or filing stages.",
        ],
        "notes": [
            "This phase is the clearest command-truth versus read-side boundary: `ExperienceDelta` is operational, not the legal record.",
        ],
        "lane_focus": ["LIVE_EXPERIENCE", "TRUST_AND_WORKFLOW", "RETENTION_AND_TERMINALIZATION"],
        "branch_tags": ["trust terminal", "projection refresh"],
        "supporting_source_refs": [
            CORE_ENGINE_PATH,
            LOW_NOISE_PATH,
            OBSERVABILITY_PATH,
        ],
        "transaction_boundary": "No global transaction. Read-side projection publication must preserve shell continuity even while command truth can already terminalize.",
        "transaction_spans": [],
    },
    14: {
        "entry_conditions": [
            "Amendment-related scope was requested or amendment posture otherwise needs decisive evaluation.",
            "Drift and amendment-preparation artifacts are already persisted from phase 10.",
        ],
        "exit_conditions": [
            "`AMENDMENT_GATE` and any intent-to-amend readiness posture are persisted.",
            "The run either continues with a ready amendment path or terminalizes with blocked/review posture.",
        ],
        "branch_predicates": [
            "Amendment intent and amendment submit remain distinct branches.",
            "No amendment request bypasses this gate entirely, leaving filing progression to later phases.",
            "Blocked or review-required amendment posture terminalizes immediately.",
        ],
        "state_transitions": [
            "`AmendmentCase.lifecycle_state` may move into `INTENT_SUBMITTED`, `READY_TO_AMEND`, or terminal review/block posture.",
        ],
        "failure_exit_paths": [
            "`FINALIZE_TERMINAL_OUTCOME(...)` returns when amendment gate posture is blocking or review-required.",
        ],
        "notes": [
            "This is the first lawful place the engine may evaluate `AMENDMENT_GATE`; drift preparation alone is not enough.",
        ],
        "lane_focus": ["DRIFT_AND_AMENDMENT", "FILING_AND_SUBMISSION", "LIVE_EXPERIENCE"],
        "branch_tags": ["amendment gate", "intent vs submit"],
        "supporting_source_refs": [
            CORE_ENGINE_PATH,
            GATE_LOGIC_PATH,
            STATE_MACHINES_PATH,
        ],
        "transaction_boundary": "No single transaction. Amendment readiness and gate posture become durable filing-side inputs or a terminal outcome.",
        "transaction_spans": [],
    },
    15: {
        "entry_conditions": [
            "Filing-related scope is requested or amendment submit requires packet preparation.",
            "Trust, parity, authority context, and amendment posture are available.",
        ],
        "exit_conditions": [
            "Filing-readiness context and `FILING_GATE` posture are persisted.",
            "A filing packet may be prepared and hardened to `APPROVED_TO_SUBMIT` when lawful.",
        ],
        "branch_predicates": [
            "Mode block, prepacket terminalization, and year-end calculation failure can stop filing before packet hardening.",
            "Amendment submit requires `READY_TO_AMEND`; it must not silently reuse an unready amendment case.",
            "Filing gate may block, require review, pass-with-notice, or pass to packet approval and later submission.",
        ],
        "state_transitions": [
            "`FilingPacket.lifecycle_state` advances from `DRAFT` to `PREPARED` and possibly `APPROVED_TO_SUBMIT`.",
            "Filing case posture is refreshed with packet and readiness references.",
        ],
        "failure_exit_paths": [
            "`FINALIZE_TERMINAL_OUTCOME(...)` returns for blocked or review-required filing posture.",
            "`FINALIZE_RUN_FAILURE(...)` guards packet-manifest binding mismatch.",
            "`ERROR(AMENDMENT_CASE_NOT_READY_TO_SUBMIT)` prevents invalid amendment submission.",
        ],
        "notes": [
            "Internal filing intent and packet hardening remain distinct from authority-owned acceptance or confirmation.",
        ],
        "lane_focus": ["AUTHORITY_CONTEXT", "FILING_AND_SUBMISSION", "LIVE_EXPERIENCE"],
        "branch_tags": ["filing gate", "packet harden"],
        "supporting_source_refs": [
            CORE_ENGINE_PATH,
            GATE_LOGIC_PATH,
            STATE_MACHINES_PATH,
            LOW_NOISE_PATH,
        ],
        "transaction_boundary": "No global transaction. Packet preparation and gate persistence must still preserve immutable manifest-binding and approval posture.",
        "transaction_spans": [],
    },
    16: {
        "entry_conditions": [
            "A filing packet is approved for submit and runtime scope actually requests submission.",
            "Submission must still pass send-time dedupe, binding, and gate checks.",
        ],
        "exit_conditions": [
            "Submission gate posture, submission record state, authority request lineage, and any reconciliation outputs are persisted.",
            "The live shell now distinguishes transmit-pending, pending-ack, confirmed, rejected, unknown, and out-of-band authority posture.",
        ],
        "branch_predicates": [
            "Submission gate may block or require review before any authority bytes leave the process.",
            "Recovery may resolve via reconciliation, transmitted-awaiting-ack, or transmit-pending-unverified posture.",
            "Amendment submit updates amendment case state separately from packet or submission state.",
        ],
        "state_transitions": [
            "`SubmissionRecord.lifecycle_state` moves through `INTENT_RECORDED`, `TRANSMIT_PENDING`, `PENDING_ACK`, and authority-resolved terminal states.",
            "`FilingPacket.lifecycle_state` transitions into submission-in-progress posture.",
            "`AmendmentCase.lifecycle_state` may become `AMEND_SUBMITTED`, `AMEND_CONFIRMED`, `AMEND_REJECTED`, or `AMEND_PENDING`.",
        ],
        "failure_exit_paths": [
            "`FINALIZE_TERMINAL_OUTCOME(...)` returns when `SUBMISSION_GATE` blocks or requires review before transmit.",
        ],
        "notes": [
            "Authority-owned truth and out-of-band corrections remain separate from the engine's internal packet and submission intent states.",
        ],
        "lane_focus": ["FILING_AND_SUBMISSION", "AUTHORITY_CONTEXT", "LIVE_EXPERIENCE"],
        "branch_tags": ["submission gate", "ack vs recovery"],
        "supporting_source_refs": [
            CORE_ENGINE_PATH,
            OBSERVABILITY_PATH,
            STATE_MACHINES_PATH,
            LOW_NOISE_PATH,
        ],
        "transaction_boundary": "A dedicated atomic transaction creates the submission record, queues authority transmit intent, advances the filing packet, and refreshes filing-case linkage as one durable handoff.",
        "transaction_spans": [
            {
                "label": "Queue transmit intent and advance packet/submission state",
                "lane_start": "FILING_AND_SUBMISSION",
                "lane_end": "AUTHORITY_CONTEXT",
            }
        ],
    },
    17: {
        "entry_conditions": [
            "A submission exists and reconciliation has produced some authority-side truth or ambiguity.",
        ],
        "exit_conditions": [
            "Post-authority drift, retroactive impact, amendment window, and amendment case refresh are persisted.",
            "Workflow escalation opens when authority-confirmed state is internally superseded or further drift action is needed.",
        ],
        "branch_predicates": [
            "Authority-confirmed state may still be internally superseded by later drift or contradiction.",
            "Replay requirement, contradiction, or material drift opens review workflow instead of silently mutating history.",
        ],
        "state_transitions": [
            "`AmendmentCase.lifecycle_state` may move toward superseded, review, or amendment-required post-authority posture.",
        ],
        "failure_exit_paths": [
            "No direct return occurs here; this phase prepares any post-authority follow-up that survives terminalization.",
        ],
        "notes": [
            "This phase preserves the difference between accepted authority truth and the engine's later observation of new contradictions or amendment need.",
        ],
        "lane_focus": ["DRIFT_AND_AMENDMENT", "LIVE_EXPERIENCE"],
        "branch_tags": ["post-authority drift"],
        "supporting_source_refs": [
            CORE_ENGINE_PATH,
            LATE_DATA_PATH,
            LOW_NOISE_PATH,
        ],
        "transaction_boundary": "No atomic transaction. Post-authority drift is persisted as follow-up truth and workflow, not a rewrite of prior filing history.",
        "transaction_spans": [],
    },
    18: {
        "entry_conditions": [
            "Command-side work is done, or the run is waiting on bounded external confirmation.",
            "The engine must normalize terminal workflow refs and shell checkpoint vocabulary before returning.",
        ],
        "exit_conditions": [
            "A terminal `DecisionBundle` is persisted with final reasons, retained refs, and normalized workflow posture.",
            "The live shell is refreshed into terminal posture without losing authority-pending or out-of-band distinctions.",
        ],
        "branch_predicates": [
            "No reconciliation yields `REVIEW_REQUIRED` with pending external confirmation.",
            "Reconciliation may land as `COMPLETED`, `BLOCKED`, or `REVIEW_REQUIRED` depending on confirmed, rejected, unknown, or out-of-band outcome.",
            "`terminal_checkpoint_state` normalizes transport detail so replay and shell restore do not leak noncanonical transport-only values.",
        ],
        "state_transitions": [
            "`RunManifest.lifecycle_state` terminalizes as `COMPLETED` or `BLOCKED` while review-required bundle posture remains backwards compatible.",
        ],
        "failure_exit_paths": [
            "The phase itself is the final terminalization and return path for successful, blocked, or externally pending outcomes.",
        ],
        "notes": [
            "The terminal live-experience frame is operational read-side state only; it is not the legal record of what happened.",
        ],
        "lane_focus": ["RETENTION_AND_TERMINALIZATION", "LIVE_EXPERIENCE", "MANIFEST_AND_LINEAGE"],
        "branch_tags": ["terminal bundle", "checkpoint normalize"],
        "supporting_source_refs": [
            CORE_ENGINE_PATH,
            OBSERVABILITY_PATH,
            STATE_MACHINES_PATH,
            LOW_NOISE_PATH,
        ],
        "transaction_boundary": "Terminal finalization persists one authoritative bundle, normalized workflow refs, and final shell posture after all decisive branch logic has converged.",
        "transaction_spans": [],
    },
}

BRANCH_ROWS = [
    {
        "branch_id": "BR_ACCESS_BLOCKED_EARLY_RETURN",
        "branch_family": "access_blocked_early_return",
        "phase_id": "P01",
        "phase_name": PHASE_CURATION[1]["branch_tags"][0],
        "trigger_condition": "Authorization or access-scope binding fails before any manifest allocation.",
        "true_path": "Return `ACCESS_BLOCKED_RESPONSE(...)` with low-noise posture envelope.",
        "false_path": "Continue into runtime-scope resolution and manifest-strategy selection.",
        "terminal_outcome": "Terminal before manifest allocation.",
        "source_refs": [CORE_ENGINE_PATH, GATE_LOGIC_PATH, LOW_NOISE_PATH],
    },
    {
        "branch_id": "BR_INVALID_SCOPE_OR_PRIOR_CONTEXT",
        "branch_family": "invalid_scope_or_prior_context",
        "phase_id": "P02",
        "phase_name": "scope and prior-context validation",
        "trigger_condition": "Runtime scope grammar or prior-manifest context fails validation.",
        "true_path": "Return `ERROR(...)` before manifest allocation or reuse.",
        "false_path": "Proceed to manifest reuse / continuation / replay selection.",
        "terminal_outcome": "Hard stop before manifest allocation.",
        "source_refs": [CORE_ENGINE_PATH, REPLAY_PATH],
    },
    {
        "branch_id": "BR_EXISTING_DECISION_BUNDLE_RETURN",
        "branch_family": "existing_decision_bundle_return",
        "phase_id": "P02",
        "phase_name": "same-manifest retry bundle return",
        "trigger_condition": "The run matches a terminal manifest lineage whose `DecisionBundle` may be safely reused.",
        "true_path": "Return the existing `DecisionBundle` instead of allocating a continuation child.",
        "false_path": "Continue into fresh, continuation, or replay manifest work.",
        "terminal_outcome": "Terminal via idempotent bundle reuse.",
        "source_refs": [CORE_ENGINE_PATH, STATE_MACHINES_PATH, OBSERVABILITY_PATH],
    },
    {
        "branch_id": "BR_MANIFEST_REUSE_VS_CONTINUATION_VS_REPLAY",
        "branch_family": "manifest_branch_selection",
        "phase_id": "P03",
        "phase_name": "manifest strategy selection",
        "trigger_condition": "Reuse strategy chooses fresh manifest, same-manifest reuse, continuation child, or replay child.",
        "true_path": "Lineage refs, inheritance modes, and branch-decision audit context are frozen into manifest context.",
        "false_path": "n/a",
        "terminal_outcome": "Nonterminal lineage fork that governs the rest of the run.",
        "source_refs": [CORE_ENGINE_PATH, FREEZE_PATH, REPLAY_PATH, OBSERVABILITY_PATH],
    },
    {
        "branch_id": "BR_LATE_DATA_SPAWN_REVIEW_EXCLUDE",
        "branch_family": "late_data_policy",
        "phase_id": "P04",
        "phase_name": "late-data classification",
        "trigger_condition": "Late data appears while building or reusing the pre-seal context.",
        "true_path": "Spawn child, surface review posture, or exclude late data according to policy bindings.",
        "false_path": "Continue with the sealed pre-start basis.",
        "terminal_outcome": "Usually nonterminal, but may force review or child lineage before seal.",
        "source_refs": [CORE_ENGINE_PATH, LATE_DATA_PATH, FREEZE_PATH],
    },
    {
        "branch_id": "BR_PRESEAL_BLOCKED_VS_SEALED",
        "branch_family": "preseal_gate_outcome",
        "phase_id": "P05",
        "phase_name": "ordered pre-seal gate chain",
        "trigger_condition": "The ordered pre-seal gates resolve as block/review or allow seal.",
        "true_path": "Persist pre-start terminal context or review-required posture and stop before `RunStarted`.",
        "false_path": "Seal the manifest and permit later `RunStarted` claim.",
        "terminal_outcome": "Blocked or review-required pre-start outcome vs nonterminal sealed success.",
        "source_refs": [CORE_ENGINE_PATH, INVARIANTS_PATH, GATE_LOGIC_PATH],
    },
    {
        "branch_id": "BR_PRESTART_VS_POSTSTART_SYSTEM_FAULT",
        "branch_family": "fault_boundary",
        "phase_id": "P05",
        "phase_name": "system fault boundary",
        "trigger_condition": "A system fault happens before `RunStarted` or after command-side start.",
        "true_path": "Pre-start faults finalize `BLOCKED` even if the manifest already sealed.",
        "false_path": "Post-start faults use started-run failure handling and may enter `FAILED` semantics.",
        "terminal_outcome": "Boundary between blocked pre-start and failed post-start posture.",
        "source_refs": [CORE_ENGINE_PATH, STATE_MACHINES_PATH],
    },
    {
        "branch_id": "BR_REPLAY_REUSES_FROZEN_POSTSEAL_BASIS",
        "branch_family": "replay_basis_reuse",
        "phase_id": "P04",
        "phase_name": "replay basis selection",
        "trigger_condition": "The request is a replay-capable lineage path with frozen post-seal basis available.",
        "true_path": "Reuse the frozen post-seal basis and replay from deterministic lineage-bound artifacts.",
        "false_path": "Build or recover a fresh pre-seal basis under ordinary collection rules.",
        "terminal_outcome": "Nonterminal lineage reuse that constrains later compute and audit expectations.",
        "source_refs": [CORE_ENGINE_PATH, REPLAY_PATH, FREEZE_PATH],
    },
    {
        "branch_id": "BR_EARLY_FILING_READINESS_TERMINALIZATION",
        "branch_family": "early_filing_readiness_terminalization",
        "phase_id": "P09",
        "phase_name": "authority and filing-readiness short-circuit",
        "trigger_condition": "Authority or filing-readiness validation yields non-pass posture before packet preparation.",
        "true_path": "Emit filing or amendment gate posture and finalize blocked/review-required outcome early.",
        "false_path": "Proceed into drift, trust, amendment, and filing packet work.",
        "terminal_outcome": "Early blocked or review-required terminalization.",
        "source_refs": [CORE_ENGINE_PATH, GATE_LOGIC_PATH, OBSERVABILITY_PATH],
    },
    {
        "branch_id": "BR_TRUST_POSTURE_TERMINALIZATION",
        "branch_family": "trust_posture_terminalization",
        "phase_id": "P13",
        "phase_name": "trust-posture terminalization",
        "trigger_condition": "Trust posture is already decisive and no later amendment or filing stage remains required.",
        "true_path": "Publish live projections and return a terminal bundle from trust posture.",
        "false_path": "Continue into amendment and filing stages.",
        "terminal_outcome": "Completed, blocked, or review-required terminalization before filing logic.",
        "source_refs": [CORE_ENGINE_PATH, LOW_NOISE_PATH],
    },
    {
        "branch_id": "BR_AMENDMENT_INTENT_VS_AMENDMENT_SUBMIT",
        "branch_family": "amendment_progression_split",
        "phase_id": "P14",
        "phase_name": "amendment intent vs amendment submit",
        "trigger_condition": "Runtime scope requests amendment intent, amendment submit, or neither.",
        "true_path": "Intent-to-amend readiness and later submit readiness remain distinct state-machine progressions.",
        "false_path": "No amendment progression occurs and filing logic remains ordinary.",
        "terminal_outcome": "May terminalize blocked/review-required on amendment gate or continue to filing.",
        "source_refs": [CORE_ENGINE_PATH, STATE_MACHINES_PATH, GATE_LOGIC_PATH],
    },
    {
        "branch_id": "BR_SUBMIT_VS_NON_SUBMIT",
        "branch_family": "submit_vs_non_submit",
        "phase_id": "P16",
        "phase_name": "submission execution split",
        "trigger_condition": "Runtime scope requests actual submission and the packet is approved to submit.",
        "true_path": "Execute governed transmit, bounded recovery, and authority reconciliation.",
        "false_path": "End without transmit while retaining packet or trust posture as the latest truth.",
        "terminal_outcome": "May remain pending external confirmation, complete, or block/review depending on authority outcome.",
        "source_refs": [CORE_ENGINE_PATH, STATE_MACHINES_PATH, OBSERVABILITY_PATH],
    },
]

CALL_LANE_MAP = {
    "CALLER_AND_SCOPE": {
        "COMPUTE_SCOPE_FLAGS",
        "VALIDATE_EFFECTIVE_SCOPE_BINDING",
        "MATERIALIZE_SCOPE_EXECUTION_BINDING",
        "VALIDATE_SCOPE_GRAMMAR",
    },
    "AUTHORIZATION": {
        "AUTHORIZE",
        "ACCESS_BLOCKED_RESPONSE",
        "ENFORCE_ACCESS_SCOPE_AND_MASKING",
        "EVALUATE_GATE_CHAIN",
    },
    "MANIFEST_AND_LINEAGE": {
        "LOAD_AND_VALIDATE_PRIOR_MANIFEST_CONTEXT",
        "VALIDATE_REUSE_SEALED_CONTEXT",
        "DECIDE_MANIFEST_REUSE_STRATEGY",
        "BEGIN_MANIFEST",
        "BEGIN_CHILD_MANIFEST",
        "VALIDATE_MANIFEST_LINEAGE_PROJECTION",
        "EMIT_MANIFEST_LINEAGE_TRACE",
        "LOAD_EXISTING_DECISION_BUNDLE",
        "LOAD_SEALED_RUN_CONTEXT",
        "VALIDATE_REPLAY_PRECONDITIONS",
        "LOAD_FROZEN_POST_SEAL_BASIS",
        "LOAD_SUBMISSION_LINEAGE",
        "LOAD_AMENDMENT_CASE",
        "TRANSITION_MANIFEST",
        "CLAIM_MANIFEST_START",
        "UPDATE_MANIFEST_GATES",
        "APPEND_MANIFEST_GATES",
        "PERSIST_GATE_BATCH",
        "UPDATE_MANIFEST_OUTPUTS",
        "PERSIST_DECISION_BUNDLE",
        "PERSIST_PRESTART_TERMINAL_CONTEXT",
        "FINALIZE_TERMINAL_OUTCOME",
        "FINALIZE_RUN_FAILURE",
        "BEGIN_SUBMISSION_RECORD",
        "TRANSITION_SUBMISSION_RECORD",
        "NORMALIZE_TERMINAL_WORKFLOW_REFS",
    },
    "CONFIG_AND_FREEZE": {
        "RESOLVE_CONFIG",
        "FREEZE_CONFIG",
        "LOAD_MANIFEST",
        "LOAD_CONFIG_FREEZE",
        "CONTINUATION_REUSES_FROZEN_CONFIG",
        "MATERIALIZE_CFG_FROM_FREEZE",
        "CONTINUATION_REUSES_FROZEN_INPUT",
        "RESOLVE_CONFIG_FOR_REQUEST",
        "UPDATE_MANIFEST_PRESEAL_CONTEXT",
        "APPLY_EXECUTION_MODE_STAMP",
        "FREEZE_COLLECTION_BOUNDARY",
        "FREEZE_NORMALIZATION_CONTEXT",
        "FREEZE_INPUT_SET",
        "COMPUTE_EXECUTION_BASIS_HASH",
        "LOAD_SCHEMA_BUNDLE",
        "SEAL_MANIFEST",
    },
    "SOURCE_COLLECTION_AND_CANONICALIZATION": {
        "PLAN_SOURCE_COLLECTION",
        "COLLECT_SOURCES",
        "LATE_DATA_INDICATORS",
        "MATERIALIZE_SOURCE_WINDOW",
        "MATERIALIZE_SOURCE_RECORDS",
        "MATERIALIZE_EVIDENCE_ITEMS",
        "EXTRACT_CANDIDATE_FACTS",
        "DETECT_CONFLICTS",
        "PROMOTE_CANONICAL_FACTS",
        "BUILD_ARTIFACT_SET",
        "WRAP_AND_HASH",
        "DECLARED_EXCLUSIONS",
        "DECLARE_MISSING_SOURCES",
        "DECLARE_STALE_SOURCES",
        "COLLECTION_LATE_DATA_BINDINGS",
        "MONITOR_LATE_DATA_AFTER_SEAL",
        "BUILD_SNAPSHOT",
        "MEASURE_COMPLETENESS",
        "SCORE_GRAPH_QUALITY",
    },
    "PRESEAL_GATES": {
        "BUILD_PRESEAL_GATE_EVALUATION",
        "VALIDATE_ARTIFACT_SET",
        "VALIDATE_ARTIFACT",
        "RECORD_ARTIFACT_CONTRACT_REF",
        "RECORD_ARTIFACT_CONTRACT_REFS",
        "ARTIFACT_CONTRACT_GATE",
        "ASSEMBLE_RELEASE_VERIFICATION_MANIFEST",
        "MANIFEST_GATE",
        "INPUT_BOUNDARY_GATE",
        "DATA_QUALITY_GATE",
    },
    "POSTSEAL_DAG": {
        "COMPUTE_OUTCOME",
        "FORECAST",
        "SEED",
        "SCORE_RISK",
        "BUILD_EVIDENCE_GRAPH",
        "SELECT_PRIMARY_PROOF_BUNDLE_REF",
        "GET_PROVENANCE",
        "GENERATE_ENQUIRY_PACK",
        "BUILD_TWIN_VIEW",
        "ASSEMBLE_TWIN_STATE_SNAPSHOT",
        "COMPUTE_TWIN_DELTA_SET",
        "SUMMARIZE_TWIN_MISMATCHES",
        "DERIVE_TWIN_READINESS",
    },
    "AUTHORITY_CONTEXT": {
        "EXTRACT_AUTHORITY_VIEWS",
        "LOAD_AUTHORITY_STATE",
        "OBLIGATION_STATUS",
        "AUTHORITY_LINK_STATE",
        "EVALUATE_PARITY",
        "RETENTION_EVIDENCE_GATE",
        "PARITY_GATE",
        "EXECUTE_AUTHORITY_CALCULATION_FLOW",
        "CHECK_TRUST_CURRENCY",
        "RESOLVE_AUTHORITY_OPERATION",
        "RESOLVE_AUTHORITY_BINDING",
        "CANONICALIZE_AUTHORITY_REQUEST",
        "DERIVE_AUTHORITY_REQUEST_HASHES",
        "BUILD_AUTHORITY_REQUEST_ENVELOPE",
        "WAIT_FOR_TRANSMIT_OR_RECONCILIATION",
        "RECONCILE_AUTHORITY_STATE",
        "UPSERT_OBLIGATION_MIRROR",
        "AUTHORITY_NEXT_CHECKPOINT_AT",
    },
    "DRIFT_AND_AMENDMENT": {
        "SELECT_DRIFT_BASELINE",
        "BUILD_DRIFT_DELTA_VECTOR",
        "CLASSIFY_TEMPORAL_POSITION",
        "ANALYZE_RETROACTIVE_IMPACT",
        "DETECT_DRIFT",
        "MATERIALIZE_AMENDMENT_WINDOW_CONTEXT",
        "EVALUATE_AMENDMENT_ELIGIBILITY",
        "UPSERT_AMENDMENT_CASE",
        "AMENDMENT_GATE",
        "CONSTRUCT_AMENDMENT_BUNDLE",
    },
    "TRUST_AND_WORKFLOW": {
        "LOAD_OVERRIDES",
        "APPROVAL_STATE",
        "DERIVE_REQUIRED_HUMAN_STEPS",
        "VALIDATE_OVERRIDE_DEPENDENCIES",
        "ASSESS_TRUST_INPUT_STATE",
        "BUILD_GATE_EXPLANATION",
        "SYNTHESIZE_TRUST",
        "TRUST_GATE",
        "PLAN_WORKFLOW",
        "UPSERT_WORKFLOW_ITEMS",
        "EMIT_WORKFLOW_ITEM",
    },
    "FILING_AND_SUBMISSION": {
        "DECLARED_BASIS_ACK_STATE",
        "DERIVE_PACKET_NOTICE_STEPS",
        "FILING_GATE",
        "BUILD_FILING_PACKET",
        "RESOLVE_FILING_NOTICES",
        "APPROVE_FILING_PACKET",
        "SUBMISSION_GATE",
        "PERSIST_OUTBOX_MESSAGE",
        "BUILD_TRANSMIT_COMMAND",
    },
    "LIVE_EXPERIENCE": {
        "INIT_EXPERIENCE_STREAM",
        "SYNC_LIVE_EXPERIENCE",
        "SYNC_LIVE_EXPERIENCE_FROM_GATES",
        "BUILD_LIVE_EXPERIENCE_FRAME",
        "MODULE_UPDATE",
        "BUILD_SURFACE_PATCH_SET",
        "BUILD_PULSE_SPINE_STATE",
        "BUILD_CONSEQUENCE_RAIL_STATE",
        "BUILD_CONSEQUENCE_RAIL_STATE_FROM_AMENDMENT",
        "BUILD_PACKET_FORGE_STATE",
        "BUILD_AUTHORITY_TUNNEL_STATE",
        "BUILD_DRIFT_FIELD_STATE",
        "BUILD_DECISION_STAGE_STATE",
        "BUILD_MANIFEST_RIBBON_STATE",
    },
    "RETENTION_AND_TERMINALIZATION": {
        "RETENTION_TAG",
    },
}

EVENT_CORRELATION_OVERRIDES = {
    "GateEvaluated": {"gate_code"},
    "WorkflowOpened": {"workflow_item_id"},
    "SubmissionAttempted": {"submission_record_id", "authority_operation_id", "idempotency_key", "request_hash"},
    "SubmissionConfirmed": {"submission_record_id", "authority_operation_id"},
    "SubmissionRejected": {"submission_record_id", "authority_operation_id"},
    "SubmissionUnknown": {"submission_record_id", "authority_operation_id"},
    "SubmissionReconciled": {"submission_record_id", "authority_operation_id"},
    "OutOfBandStateObserved": {"submission_record_id", "authority_operation_id"},
}
LINEAGE_EVENTS = {
    "AccessScopeBound",
    "ExistingDecisionBundleReturned",
    "ManifestContextReused",
    "ContinuationChildAllocated",
    "ConfigInheritanceResolved",
    "ManifestAllocated",
}


@dataclass(frozen=True)
class PhaseBlock:
    phase_number: int
    phase_id: str
    phase_name: str
    source_line_start: int
    source_line_end: int
    lines: tuple[tuple[int, str], ...]


@dataclass(frozen=True)
class Statement:
    phase_number: int
    phase_id: str
    order_in_phase: int
    source_line_start: int
    source_line_end: int
    text: str


@dataclass(frozen=True)
class StepRecord:
    row_id: str
    phase_id: str
    phase_name: str
    ordered_index: int
    step_order: int
    source_line_start: int
    source_line_end: int
    statement: str
    statement_kind: str
    primary_lane: str
    lane_tags: tuple[str, ...]
    call_names: tuple[str, ...]
    module_calls: tuple[str, ...]
    helper_calls: tuple[dict[str, str], ...]
    event_codes: tuple[str, ...]
    artifact_writes: tuple[str, ...]
    gate_evaluations: tuple[str, ...]
    manifest_mutations: tuple[str, ...]
    live_experience_modules: tuple[str, ...]
    transaction_boundary_event: str | None
    return_path: str | None
    notes: tuple[str, ...]

    def to_dict(self) -> dict[str, Any]:
        return {
            "row_id": self.row_id,
            "phase_id": self.phase_id,
            "phase_name": self.phase_name,
            "ordered_index": self.ordered_index,
            "step_order": self.step_order,
            "source_line_start": self.source_line_start,
            "source_line_end": self.source_line_end,
            "statement": self.statement,
            "statement_kind": self.statement_kind,
            "primary_lane": self.primary_lane,
            "lane_tags": list(self.lane_tags),
            "call_names": list(self.call_names),
            "module_calls": list(self.module_calls),
            "helper_calls": list(self.helper_calls),
            "event_codes": list(self.event_codes),
            "artifact_writes": list(self.artifact_writes),
            "gate_evaluations": list(self.gate_evaluations),
            "manifest_mutations": list(self.manifest_mutations),
            "live_experience_modules": list(self.live_experience_modules),
            "transaction_boundary_event": self.transaction_boundary_event,
            "return_path": self.return_path,
            "notes": list(self.notes),
        }


def repo_rel(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def phase_id(number: int) -> str:
    return f"P{number:02d}"


def line_ref(path: str, line_number: int, label: str) -> str:
    safe_label = re.sub(r"[^A-Za-z0-9_.-]+", "_", label).strip("_") or "line"
    return f"{path}::L{line_number}[{safe_label}]"


def ordered_unique(values: Iterable[str]) -> list[str]:
    seen: set[str] = set()
    ordered: list[str] = []
    for value in values:
        if not value or value in seen:
            continue
        seen.add(value)
        ordered.append(value)
    return ordered


def json_write(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n")


def write_jsonl(path: Path, rows: Iterable[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w") as handle:
        for row in rows:
            handle.write(json.dumps(row, sort_keys=True))
            handle.write("\n")


def load_run_engine_blocks() -> list[PhaseBlock]:
    lines = (ALGORITHM_DIR / "core_engine.md").read_text().splitlines()
    start = next(index for index, line in enumerate(lines) if line.startswith("### Procedure: RUN_ENGINE"))
    end = next(
        index for index, line in enumerate(lines[start + 1 :], start + 1) if line.startswith("## Execution helper constraints used above")
    )
    headers: list[tuple[int, int, str]] = []
    for index in range(start + 1, end):
        match = re.match(r"^(\d+)\.\s+(.*)$", lines[index].strip())
        if match:
            headers.append((int(match.group(1)), index + 1, match.group(2)))
    blocks: list[PhaseBlock] = []
    for pos, (number, line_number, name) in enumerate(headers):
        next_line = headers[pos + 1][1] - 1 if pos + 1 < len(headers) else end
        body_lines = tuple((idx + 1, lines[idx]) for idx in range(line_number, next_line))
        blocks.append(
            PhaseBlock(
                phase_number=number,
                phase_id=phase_id(number),
                phase_name=name,
                source_line_start=line_number,
                source_line_end=next_line,
                lines=body_lines,
            )
        )
    return blocks


def parse_module_names() -> set[str]:
    text = (ALGORITHM_DIR / "modules.md").read_text().splitlines()
    modules: set[str] = set()
    for line in text:
        match = re.match(r"^##\s+([A-Z][A-Z0-9_]+)\(", line.strip())
        if match:
            modules.add(match.group(1))
    return modules


def strip_bullet_prefix(line: str) -> str:
    return re.sub(r"^\s*\*\s?", "", line.rstrip())


def bracket_delta(text: str) -> int:
    return sum(text.count(ch) for ch in "([{") - sum(text.count(ch) for ch in ")]}")


def statement_complete(text: str, balance: int) -> bool:
    return balance <= 0 and not text.rstrip().endswith((",", "(", "[", "{"))


def collapse_whitespace(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def parse_statements(block: PhaseBlock) -> list[Statement]:
    statements: list[Statement] = []
    parts: list[str] = []
    start_line: int | None = None
    end_line: int | None = None
    balance = 0
    in_fence = False

    def flush() -> None:
        nonlocal parts, start_line, end_line, balance
        if not parts or start_line is None or end_line is None:
            parts = []
            start_line = None
            end_line = None
            balance = 0
            return
        text = collapse_whitespace(" ".join(parts))
        if text:
            statements.append(
                Statement(
                    phase_number=block.phase_number,
                    phase_id=block.phase_id,
                    order_in_phase=len(statements) + 1,
                    source_line_start=start_line,
                    source_line_end=end_line,
                    text=text,
                )
            )
        parts = []
        start_line = None
        end_line = None
        balance = 0

    for line_number, raw_line in block.lines:
        stripped = raw_line.strip()
        if stripped == "```":
            in_fence = not in_fence
            flush()
            continue
        candidate = strip_bullet_prefix(raw_line).strip()
        if not candidate or candidate == "---":
            flush()
            continue
        if candidate.startswith("#"):
            continue
        if start_line is None:
            start_line = line_number
        end_line = line_number
        parts.append(candidate)
        balance += bracket_delta(candidate)
        if statement_complete(candidate, balance):
            flush()
    flush()
    return statements


CALL_RE = re.compile(r"\b([A-Z][A-Z0-9_]+)\(")


def extract_call_names(statement: str) -> list[str]:
    return ordered_unique(CALL_RE.findall(statement))


def helper_reason(call_name: str) -> str:
    if call_name in TRANSACTION_PRIMITIVES:
        return "Atomic transaction primitive defined directly in the core pseudocode."
    if call_name in {"HASH", "ERROR", "MODULE_UPDATE"}:
        return "Primitive orchestration helper used inline by the core pseudocode."
    if call_name.startswith("BUILD_") and call_name.endswith("_STATE"):
        return "Read-side projection builder used by live experience composition."
    if call_name.startswith("BUILD_") or call_name.startswith("LOAD_") or call_name.startswith("SELECT_"):
        return "Derived orchestration helper that is constrained by the surrounding core-engine contract."
    if call_name.startswith("SYNC_") or call_name.startswith("NORMALIZE_"):
        return "Command-to-read-side helper constrained by the low-noise experience contract."
    return "Inline orchestration helper outside the formal `modules.md` module catalog."


def classify_call(call_name: str, modules: set[str]) -> dict[str, str]:
    if call_name in modules:
        return {
            "call_name": call_name,
            "classification": "module",
            "source_ref": f"{MODULES_PATH}::{call_name}",
        }
    return {
        "call_name": call_name,
        "classification": "helper",
        "source_ref": f"{CORE_ENGINE_PATH}#execution-helper-constraints-used-above",
        "reason": helper_reason(call_name),
    }


def extract_events(statement: str) -> list[str]:
    return ordered_unique(
        match.group(1)
        for match in re.finditer(r"RECORD_EVENT\(\s*([A-Za-z_][A-Za-z0-9_]*)", statement)
    )


def extract_artifacts(statement: str) -> list[str]:
    return ordered_unique(
        match.group(1)
        for match in re.finditer(r"WRITE_ARTIFACT\(\s*([A-Za-z_][A-Za-z0-9_]*)", statement)
    )


def extract_gates(call_names: Iterable[str]) -> list[str]:
    gates: list[str] = []
    for name in call_names:
        if name.endswith("_GATE") or name == "EVALUATE_GATE_CHAIN":
            gates.append(name)
    return ordered_unique(gates)


def extract_manifest_mutations(call_names: Iterable[str]) -> list[str]:
    return ordered_unique(name for name in call_names if name in MANIFEST_MUTATION_CALLS)


def extract_live_experience_modules(statement: str) -> list[str]:
    return ordered_unique(match.group(1) for match in re.finditer(r'MODULE_UPDATE\(\s*"([^"]+)"', statement))


def extract_return_path(statement: str) -> str | None:
    if not statement.startswith("return "):
        return None
    match = re.match(r"return\s+([A-Z][A-Z0-9_]+)\(", statement)
    if match:
        return match.group(1)
    return "RETURN"


def transaction_boundary_event(statement: str) -> str | None:
    for primitive in TRANSACTION_PRIMITIVES:
        if primitive in statement:
            return primitive
    return None


def lane_for_call(call_name: str, phase_number: int) -> str | None:
    for lane, call_names in CALL_LANE_MAP.items():
        if call_name in call_names:
            return lane
    if call_name in PRESEAL_GATE_CODES:
        return "PRESEAL_GATES"
    if call_name == "RETENTION_EVIDENCE_GATE":
        return "RETENTION_AND_TERMINALIZATION"
    if call_name in {"PARITY_GATE", "EXECUTE_AUTHORITY_CALCULATION_FLOW"}:
        return "AUTHORITY_CONTEXT"
    if call_name in {"TRUST_GATE", "PLAN_WORKFLOW", "UPSERT_WORKFLOW_ITEMS"}:
        return "TRUST_AND_WORKFLOW"
    if call_name in {"AMENDMENT_GATE", "UPSERT_AMENDMENT_CASE"}:
        return "DRIFT_AND_AMENDMENT"
    if call_name in {"FILING_GATE", "SUBMISSION_GATE", "BUILD_FILING_PACKET"}:
        return "FILING_AND_SUBMISSION"
    if phase_number in {6, 7}:
        return "POSTSEAL_DAG"
    if phase_number == 8:
        return "RETENTION_AND_TERMINALIZATION"
    if phase_number == 9:
        return "AUTHORITY_CONTEXT"
    if phase_number == 10:
        return "DRIFT_AND_AMENDMENT"
    if phase_number in {11, 12}:
        return "TRUST_AND_WORKFLOW"
    if phase_number == 13:
        return "LIVE_EXPERIENCE"
    if phase_number == 14:
        return "DRIFT_AND_AMENDMENT"
    if phase_number in {15, 16}:
        return "FILING_AND_SUBMISSION"
    if phase_number == 17:
        return "DRIFT_AND_AMENDMENT"
    if phase_number == 18:
        return "RETENTION_AND_TERMINALIZATION"
    return None


def default_phase_lane(phase_number: int) -> str:
    defaults = {
        1: "AUTHORIZATION",
        2: "MANIFEST_AND_LINEAGE",
        3: "MANIFEST_AND_LINEAGE",
        4: "SOURCE_COLLECTION_AND_CANONICALIZATION",
        5: "PRESEAL_GATES",
        6: "POSTSEAL_DAG",
        7: "POSTSEAL_DAG",
        8: "RETENTION_AND_TERMINALIZATION",
        9: "AUTHORITY_CONTEXT",
        10: "DRIFT_AND_AMENDMENT",
        11: "TRUST_AND_WORKFLOW",
        12: "TRUST_AND_WORKFLOW",
        13: "LIVE_EXPERIENCE",
        14: "DRIFT_AND_AMENDMENT",
        15: "FILING_AND_SUBMISSION",
        16: "FILING_AND_SUBMISSION",
        17: "DRIFT_AND_AMENDMENT",
        18: "RETENTION_AND_TERMINALIZATION",
    }
    return defaults[phase_number]


def derive_lane_tags(
    phase_number: int,
    statement_kind: str,
    call_names: list[str],
    event_codes: list[str],
    artifact_writes: list[str],
    live_modules: list[str],
) -> list[str]:
    lanes: list[str] = []
    if statement_kind == "live_experience" or live_modules:
        lanes.append("LIVE_EXPERIENCE")
    for call_name in call_names:
        lane = lane_for_call(call_name, phase_number)
        if lane:
            lanes.append(lane)
    if not lanes and event_codes:
        lanes.append(default_phase_lane(phase_number))
    if not lanes and artifact_writes:
        lanes.append(default_phase_lane(phase_number))
    if not lanes:
        lanes.append(default_phase_lane(phase_number))
    return ordered_unique(lanes)


def statement_kind(
    statement: str,
    event_codes: list[str],
    artifact_writes: list[str],
    gate_codes: list[str],
    live_modules: list[str],
) -> str:
    if "BEGIN_ATOMIC_TRANSACTION()" in statement:
        return "transaction_begin"
    if "COMMIT_ATOMIC_TRANSACTION()" in statement:
        return "transaction_commit"
    if "ROLLBACK_ATOMIC_TRANSACTION()" in statement:
        return "transaction_rollback"
    if statement.startswith("return "):
        return "return"
    if statement.startswith("if ") or statement.startswith("else if ") or statement == "else:":
        return "branch"
    if live_modules or "SYNC_LIVE_EXPERIENCE" in statement:
        return "live_experience"
    if gate_codes:
        return "gate"
    if artifact_writes:
        return "artifact_write"
    if event_codes:
        return "event"
    if CALL_RE.search(statement):
        return "module_call"
    return "assignment"


def build_step_records(block: PhaseBlock, modules: set[str]) -> list[StepRecord]:
    records: list[StepRecord] = []
    for statement in parse_statements(block):
        call_names = extract_call_names(statement.text)
        call_resolutions = [classify_call(call_name, modules) for call_name in call_names]
        module_calls = [item["call_name"] for item in call_resolutions if item["classification"] == "module"]
        helper_calls = [item for item in call_resolutions if item["classification"] == "helper"]
        event_codes = extract_events(statement.text)
        artifact_writes = extract_artifacts(statement.text)
        gate_codes = extract_gates(call_names)
        live_modules = extract_live_experience_modules(statement.text)
        kind = statement_kind(statement.text, event_codes, artifact_writes, gate_codes, live_modules)
        lane_tags = derive_lane_tags(block.phase_number, kind, call_names, event_codes, artifact_writes, live_modules)
        records.append(
            StepRecord(
                row_id=f"{block.phase_id}-S{statement.order_in_phase:03d}",
                phase_id=block.phase_id,
                phase_name=block.phase_name,
                ordered_index=block.phase_number,
                step_order=statement.order_in_phase,
                source_line_start=statement.source_line_start,
                source_line_end=statement.source_line_end,
                statement=statement.text,
                statement_kind=kind,
                primary_lane=lane_tags[0],
                lane_tags=tuple(lane_tags),
                call_names=tuple(call_names),
                module_calls=tuple(module_calls),
                helper_calls=tuple(helper_calls),
                event_codes=tuple(event_codes),
                artifact_writes=tuple(artifact_writes),
                gate_evaluations=tuple(gate_codes),
                manifest_mutations=tuple(extract_manifest_mutations(call_names)),
                live_experience_modules=tuple(live_modules),
                transaction_boundary_event=transaction_boundary_event(statement.text),
                return_path=extract_return_path(statement.text),
                notes=tuple(
                    note
                    for note in [
                        "Read-side only `masking_context` prohibition." if "masking_context" in statement.text else "",
                        "Access branch preserves `raw_requested_scope[]` for audit while using `runtime_scope[]` downstream."
                        if "raw_requested_scope" in statement.text or "runtime_scope" in statement.text
                        else "",
                    ]
                    if note
                ),
            )
        )
    return records


def build_live_experience_entries(step_records: list[StepRecord]) -> list[dict[str, Any]]:
    entries: list[dict[str, Any]] = []
    for record in step_records:
        if record.statement_kind != "live_experience":
            continue
        posture_match = re.search(r'posture_state\s*=\s*"([^"]+)"', record.statement)
        semantic_match = re.search(r'semantic_motion\s*=\s*"([^"]+)"', record.statement)
        cause_match = re.search(r'cause_ref\s*=\s*"([^"]+)"', record.statement)
        phase_code_match = re.search(r'phase_code\s*=\s*"([^"]+)"', record.statement)
        entries.append(
            {
                "step_id": record.row_id,
                "source_line_start": record.source_line_start,
                "source_line_end": record.source_line_end,
                "surface_modules": list(record.live_experience_modules),
                "composite_shell_surfaces": DEFAULT_COMPOSITE_SURFACES,
                "posture_state": posture_match.group(1) if posture_match else None,
                "semantic_motion": semantic_match.group(1) if semantic_match else None,
                "cause_ref": cause_match.group(1) if cause_match else None,
                "phase_code": phase_code_match.group(1) if phase_code_match else None,
                "command_vs_read_side_boundary": (
                    "Operational read-side delta only; command truth must already be persisted elsewhere."
                ),
            }
        )
    return entries


def summarize_lane_highlights(
    phase_number: int,
    step_records: list[StepRecord],
    curation: dict[str, Any],
) -> dict[str, list[dict[str, str]]]:
    bucket: dict[str, list[dict[str, str]]] = {lane: [] for lane in LANE_ORDER}
    per_lane_counter: dict[str, Counter[str]] = {lane: Counter() for lane in LANE_ORDER}
    per_lane_kinds: dict[str, dict[str, str]] = {lane: {} for lane in LANE_ORDER}
    for record in step_records:
        lane = record.primary_lane
        for call_name in record.module_calls[:2]:
            per_lane_counter[lane][call_name] += 1
            per_lane_kinds[lane][call_name] = "module"
        for gate in record.gate_evaluations:
            per_lane_counter[lane][gate] += 1
            per_lane_kinds[lane][gate] = "gate"
        for artifact in record.artifact_writes[:2]:
            per_lane_counter[lane][artifact] += 1
            per_lane_kinds[lane][artifact] = "artifact"
        for event in record.event_codes[:2]:
            per_lane_counter[lane][event] += 1
            per_lane_kinds[lane][event] = "event"
        if record.statement_kind == "return" and record.return_path:
            per_lane_counter[lane][record.return_path] += 1
            per_lane_kinds[lane][record.return_path] = "terminal"
    for lane, tags in zip(curation["lane_focus"], curation["branch_tags"], strict=False):
        bucket[lane].append({"kind": "branch", "label": tags})
    for lane in LANE_ORDER:
        for label, _count in per_lane_counter[lane].most_common(3):
            bucket[lane].append({"kind": per_lane_kinds[lane][label], "label": label})
    return {lane: items for lane, items in bucket.items() if items}


def build_phase_record(block: PhaseBlock, step_records: list[StepRecord]) -> dict[str, Any]:
    curation = PHASE_CURATION[block.phase_number]
    called_modules = ordered_unique(call for record in step_records for call in record.module_calls)
    helper_calls = ordered_unique(
        helper["call_name"] for record in step_records for helper in record.helper_calls
    )
    helper_rows = []
    seen_helpers: set[str] = set()
    for record in step_records:
        for helper in record.helper_calls:
            name = helper["call_name"]
            if name in seen_helpers:
                continue
            seen_helpers.add(name)
            helper_rows.append(helper)
    audit_events = ordered_unique(event for record in step_records for event in record.event_codes)
    artifact_writes = ordered_unique(
        artifact for record in step_records for artifact in record.artifact_writes
    )
    gate_evaluations = ordered_unique(gate for record in step_records for gate in record.gate_evaluations)
    manifest_mutations = ordered_unique(
        mutation for record in step_records for mutation in record.manifest_mutations
    )
    return_paths = ordered_unique(
        record.return_path for record in step_records if record.return_path is not None
    )
    live_experience_updates = build_live_experience_entries(step_records)
    return {
        "phase_id": block.phase_id,
        "phase_name": block.phase_name,
        "ordered_index": block.phase_number,
        "source_heading_or_logical_block": line_ref(CORE_ENGINE_PATH, block.source_line_start, block.phase_name),
        "source_line_start": block.source_line_start,
        "source_line_end": block.source_line_end,
        "entry_conditions": curation["entry_conditions"],
        "exit_conditions": curation["exit_conditions"],
        "branch_predicates": curation["branch_predicates"],
        "called_modules": called_modules,
        "called_helpers": helper_rows,
        "state_transitions": curation["state_transitions"],
        "artifact_writes": artifact_writes,
        "manifest_mutations": manifest_mutations,
        "gate_evaluations": gate_evaluations,
        "audit_events": audit_events,
        "live_experience_updates": live_experience_updates,
        "transaction_boundary": curation["transaction_boundary"],
        "transaction_spans": curation["transaction_spans"],
        "failure_exit_paths": curation["failure_exit_paths"],
        "notes": curation["notes"],
        "lane_focus": curation["lane_focus"],
        "branch_tags": curation["branch_tags"],
        "supporting_source_refs": curation["supporting_source_refs"],
        "step_count": len(step_records),
        "return_paths": return_paths,
        "lane_highlights": summarize_lane_highlights(block.phase_number, step_records, curation),
    }


def event_family(event_code: str) -> str:
    if "Manifest" in event_code:
        return "manifest_lifecycle"
    if "Submission" in event_code or "Authority" in event_code:
        return "authority_submission"
    if "Workflow" in event_code:
        return "workflow"
    if "Gate" in event_code:
        return "gate"
    if "Drift" in event_code or "Amendment" in event_code:
        return "drift_amendment"
    return "run_observability"


def event_correlation_keys(event_code: str) -> list[str]:
    keys = {"tenant_id", "client_id", "manifest_id", "trace_id", "run_kind", "mode"}
    if event_code in LINEAGE_EVENTS:
        keys |= {
            "root_manifest_id",
            "parent_manifest_id",
            "continuation_of_manifest_id",
            "replay_of_manifest_id",
            "idempotency_key",
            "request_hash",
            "identity_namespace_hash",
            "duplicate_meaning_key",
            "access_binding_hash",
            "policy_snapshot_hash",
            "manifest_lineage_trace_ref",
        }
    keys |= EVENT_CORRELATION_OVERRIDES.get(event_code, set())
    return sorted(keys)


def build_event_timeline(phase_records: list[dict[str, Any]], step_records: list[StepRecord]) -> list[dict[str, Any]]:
    timeline: list[dict[str, Any]] = []
    phase_name_by_id = {phase["phase_id"]: phase["phase_name"] for phase in phase_records}
    for record in step_records:
        for event_code in record.event_codes:
            timeline.append(
                {
                    "timeline_order": len(timeline) + 1,
                    "phase_id": record.phase_id,
                    "phase_name": phase_name_by_id[record.phase_id],
                    "step_id": record.row_id,
                    "event_code": event_code,
                    "event_family": event_family(event_code),
                    "source_line_start": record.source_line_start,
                    "source_line_end": record.source_line_end,
                    "primary_lane": record.primary_lane,
                    "mandatory_correlation_keys": ", ".join(event_correlation_keys(event_code)),
                }
            )
    return timeline


def build_live_experience_map(phase_records: list[dict[str, Any]]) -> dict[str, Any]:
    phases = []
    for phase in phase_records:
        phases.append(
            {
                "phase_id": phase["phase_id"],
                "phase_name": phase["phase_name"],
                "ordered_index": phase["ordered_index"],
                "source_heading_or_logical_block": phase["source_heading_or_logical_block"],
                "surface_modules": ordered_unique(
                    module
                    for entry in phase["live_experience_updates"]
                    for module in entry["surface_modules"]
                ),
                "composite_shell_surfaces": DEFAULT_COMPOSITE_SURFACES,
                "posture_states": ordered_unique(
                    entry["posture_state"] for entry in phase["live_experience_updates"] if entry["posture_state"]
                ),
                "semantic_motions": ordered_unique(
                    entry["semantic_motion"] for entry in phase["live_experience_updates"] if entry["semantic_motion"]
                ),
                "cause_refs": ordered_unique(
                    entry["cause_ref"] for entry in phase["live_experience_updates"] if entry["cause_ref"]
                ),
                "phase_codes": ordered_unique(
                    entry["phase_code"] for entry in phase["live_experience_updates"] if entry["phase_code"]
                ),
                "command_vs_read_side_boundary": (
                    "Every `ExperienceDelta` remains read-side only; command truth and state transitions must already be durable."
                ),
                "notes": [
                    "Low-noise shells keep one mounted route keyed by `manifest_id`.",
                    "Reduced-motion clients must preserve semantics without relying on motion tokens.",
                ],
            }
        )
    return {
        "phase_count": len(phases),
        "composite_shell_surfaces": DEFAULT_COMPOSITE_SURFACES,
        "phases": phases,
    }


def build_phase_index(phase_records: list[dict[str, Any]], step_records: list[StepRecord], modules: set[str]) -> dict[str, Any]:
    helper_catalog = ordered_unique(
        helper["call_name"] for record in step_records for helper in record.helper_calls
    )
    return {
        "phase_count": len(phase_records),
        "lane_taxonomy": LANE_ORDER,
        "module_catalog_size": len(modules),
        "summary": {
            "step_count": len(step_records),
            "event_count": sum(len(record.event_codes) for record in step_records),
            "artifact_write_count": sum(len(record.artifact_writes) for record in step_records),
            "gate_count": sum(len(record.gate_evaluations) for record in step_records),
            "live_experience_update_count": sum(
                1 for record in step_records if record.statement_kind == "live_experience"
            ),
            "transaction_primitive_count": sum(
                1 for record in step_records if record.transaction_boundary_event is not None
            ),
            "return_path_count": sum(1 for record in step_records if record.return_path is not None),
        },
        "mandatory_edge_cases": [
            "`raw_requested_scope[]` is preserved for audit while `runtime_scope[]` drives downstream semantics.",
            "`masking_context` remains read-side only and must not affect compute, filing, or transport.",
            "Same-manifest retry against a terminal manifest returns the existing `DecisionBundle`.",
            "A pre-start system fault after `SEALED` but before `RunStarted` still finalizes `BLOCKED`.",
            "Replay may reuse frozen post-seal basis instead of inventing a fresh authority read.",
            "`AMENDMENT_GATE` is forbidden during drift preparation and occurs later in the run.",
            "Authority-owned truth and out-of-band corrections stay distinct from internal progression state.",
        ],
        "helper_call_catalog": helper_catalog,
        "phases": phase_records,
    }


def build_atlas_data(
    phase_index: dict[str, Any],
    branch_conditions: dict[str, Any],
    live_experience_map: dict[str, Any],
) -> dict[str, Any]:
    live_phase_map = {phase["phase_id"]: phase for phase in live_experience_map["phases"]}
    branches_by_phase: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in branch_conditions["rows"]:
        branches_by_phase[row["phase_id"]].append(row)

    phases = []
    for phase in phase_index["phases"]:
        live_phase = live_phase_map[phase["phase_id"]]
        phases.append(
            {
                "phase_id": phase["phase_id"],
                "ordered_index": phase["ordered_index"],
                "phase_name": phase["phase_name"],
                "phase_label": f"{phase['ordered_index']}. {phase['phase_name']}",
                "source_heading_or_logical_block": phase["source_heading_or_logical_block"],
                "lane_focus": phase["lane_focus"],
                "branch_tags": phase["branch_tags"],
                "branch_rows": branches_by_phase[phase["phase_id"]],
                "transaction_spans": phase["transaction_spans"],
                "lane_highlights": phase["lane_highlights"],
                "gate_evaluations": phase["gate_evaluations"],
                "artifact_writes": phase["artifact_writes"],
                "audit_events": phase["audit_events"],
                "live_experience": live_phase,
                "entry_conditions": phase["entry_conditions"],
                "exit_conditions": phase["exit_conditions"],
                "failure_exit_paths": phase["failure_exit_paths"],
                "notes": phase["notes"],
                "called_modules": phase["called_modules"],
                "return_paths": phase["return_paths"],
                "supporting_source_refs": phase["supporting_source_refs"],
            }
        )
    return {
        "lane_taxonomy": LANE_ORDER,
        "test_ids": sorted(MANDATORY_TEST_IDS),
        "summary": phase_index["summary"],
        "phase_count": phase_index["phase_count"],
        "mandatory_edge_cases": phase_index["mandatory_edge_cases"],
        "phases": phases,
        "composite_shell_surfaces": DEFAULT_COMPOSITE_SURFACES,
    }


def branch_conditions_payload() -> dict[str, Any]:
    return {
        "mandatory_branch_ids": sorted(MANDATORY_BRANCH_IDS),
        "row_count": len(BRANCH_ROWS),
        "rows": BRANCH_ROWS,
    }


def write_event_csv(rows: list[dict[str, Any]]) -> None:
    EVENT_TIMELINE_PATH.parent.mkdir(parents=True, exist_ok=True)
    with EVENT_TIMELINE_PATH.open("w", newline="") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[
                "timeline_order",
                "phase_id",
                "phase_name",
                "step_id",
                "event_code",
                "event_family",
                "source_line_start",
                "source_line_end",
                "primary_lane",
                "mandatory_correlation_keys",
            ],
        )
        writer.writeheader()
        writer.writerows(rows)


def short_phase_summary_row(phase: dict[str, Any]) -> str:
    gates = ", ".join(phase["gate_evaluations"]) if phase["gate_evaluations"] else "n/a"
    returns = ", ".join(phase["return_paths"]) if phase["return_paths"] else "nonterminal"
    live = ", ".join(
        ordered_unique(
            module for entry in phase["live_experience_updates"] for module in entry["surface_modules"]
        )[:3]
    ) or "n/a"
    return (
        f"| `{phase['phase_id']}` | {phase['phase_name']} | "
        f"{', '.join(phase['lane_focus'])} | {gates} | "
        f"{len(phase['artifact_writes'])} | {len(phase['audit_events'])} | {returns} | {live} |"
    )


def write_swimlane_doc(phase_index: dict[str, Any], branch_conditions: dict[str, Any], live_map: dict[str, Any]) -> None:
    summary = phase_index["summary"]
    lines = [
        "# Run Engine End-to-End Execution Swimlane",
        "",
        "## What This Pack Captures",
        "",
        "This pack turns `RUN_ENGINE(...)` into a queryable execution spine. It preserves the exact 18-phase source order,",
        "indexes every phase-local `RECORD_EVENT(...)` and `WRITE_ARTIFACT(...)` call, and makes branch, gate,",
        "transaction, lineage, and live-experience consequences explicit for later backend and frontend work.",
        "",
        "## Structural Totals",
        "",
        f"- Phases: `{phase_index['phase_count']}`",
        f"- Parsed logical statements: `{summary['step_count']}`",
        f"- Phase-local audit events: `{summary['event_count']}`",
        f"- Artifact writes: `{summary['artifact_write_count']}`",
        f"- Gate evaluations or gate helpers: `{summary['gate_count']}`",
        f"- Live-experience sync statements: `{summary['live_experience_update_count']}`",
        f"- Atomic transaction primitives: `{summary['transaction_primitive_count']}`",
        f"- Branch rows captured: `{branch_conditions['row_count']}`",
        "",
        "## Lane Taxonomy",
        "",
    ]
    for lane in LANE_ORDER:
        lines.append(f"- `{lane}`")
    lines.extend(
        [
            "",
            "## Engine Spine",
            "",
            "| Phase | Name | Lane Focus | Gates | Artifacts | Events | Return Paths | Live Modules |",
            "| --- | --- | --- | --- | ---: | ---: | --- | --- |",
        ]
    )
    for phase in phase_index["phases"]:
        lines.append(short_phase_summary_row(phase))
    lines.extend(
        [
            "",
            "## Mandatory Edge Cases",
            "",
        ]
    )
    for edge_case in phase_index["mandatory_edge_cases"]:
        lines.append(f"- {edge_case}")
    lines.extend(
        [
            "",
            "## Live Experience Guardrails",
            "",
            f"- Composite shell surfaces remain `{', '.join(DEFAULT_COMPOSITE_SURFACES)}` in the low-noise profile.",
            "- `ExperienceDelta` is operational read-side output only; legal command truth remains in manifests, artifacts, gates, and the terminal `DecisionBundle`.",
            "- Projection lag is allowed after command truth persists, so the shell must remain mounted and continuity-safe even while detail modules are still materializing.",
        ]
    )
    SWIMLANE_DOC_PATH.write_text("\n".join(lines) + "\n")


def write_phase_contracts_doc(phase_index: dict[str, Any]) -> None:
    lines = [
        "# Run Engine Phase Contracts",
        "",
        "Each phase section below is the implementation-grade contract for the numbered `RUN_ENGINE(...)` block in `core_engine.md`.",
        "",
    ]
    for phase in phase_index["phases"]:
        lines.extend(
            [
                f"## {phase['phase_id']} {phase['phase_name']}",
                "",
                f"- Source: `{phase['source_heading_or_logical_block']}`",
                f"- Lane focus: `{', '.join(phase['lane_focus'])}`",
                f"- Transaction boundary: {phase['transaction_boundary']}",
                "",
                "### Entry Conditions",
                "",
            ]
        )
        for item in phase["entry_conditions"]:
            lines.append(f"- {item}")
        lines.extend(["", "### Exit Conditions", ""])
        for item in phase["exit_conditions"]:
            lines.append(f"- {item}")
        lines.extend(["", "### Branch Predicates", ""])
        for item in phase["branch_predicates"]:
            lines.append(f"- {item}")
        lines.extend(["", "### State Transitions", ""])
        for item in phase["state_transitions"]:
            lines.append(f"- {item}")
        lines.extend(["", "### Failure Exit Paths", ""])
        for item in phase["failure_exit_paths"]:
            lines.append(f"- {item}")
        lines.extend(["", "### Key Modules", ""])
        for item in phase["called_modules"][:12]:
            lines.append(f"- `{item}`")
        if len(phase["called_modules"]) > 12:
            lines.append(f"- `+{len(phase['called_modules']) - 12}` more phase-local module calls")
        lines.extend(["", "### Live Experience", ""])
        live_updates = phase["live_experience_updates"]
        if not live_updates:
            lines.append("- No phase-local `SYNC_LIVE_EXPERIENCE(...)` call is emitted here.")
        else:
            for update in live_updates:
                surfaces = ", ".join(update["surface_modules"]) if update["surface_modules"] else "derived composite shell only"
                detail = f"{surfaces}; posture={update['posture_state'] or 'n/a'}; motion={update['semantic_motion'] or 'n/a'}"
                if update["cause_ref"]:
                    detail = f"{update['cause_ref']}: {detail}"
                lines.append(f"- {detail}")
        lines.extend(["", "### Notes", ""])
        for item in phase["notes"]:
            lines.append(f"- {item}")
        lines.append("")
    PHASE_CONTRACTS_DOC_PATH.write_text("\n".join(lines) + "\n")


def write_branch_doc(branch_conditions: dict[str, Any]) -> None:
    lines = [
        "# Run Engine Branch and Terminalization Matrix",
        "",
        "| Branch ID | Phase | Trigger | True Path | False Path | Terminal Outcome |",
        "| --- | --- | --- | --- | --- | --- |",
    ]
    for row in branch_conditions["rows"]:
        lines.append(
            f"| `{row['branch_id']}` | `{row['phase_id']}` | {row['trigger_condition']} | "
            f"{row['true_path']} | {row['false_path']} | {row['terminal_outcome']} |"
        )
    lines.extend(
        [
            "",
            "## Coverage Notes",
            "",
            "- Same-manifest retry returns the existing `DecisionBundle` instead of allocating a continuation child.",
            "- Replay remains frozen-basis reuse, not a fresh authority read.",
            "- Pre-start blocked posture is distinct from post-start failure posture.",
            "- Trust-posture terminalization and filing-readiness terminalization are both captured explicitly.",
        ]
    )
    BRANCH_DOC_PATH.write_text("\n".join(lines) + "\n")


def write_mermaid(phase_index: dict[str, Any], branch_conditions: dict[str, Any]) -> None:
    branch_by_id = {row["branch_id"]: row for row in branch_conditions["rows"]}
    lines = [
        "flowchart TB",
        '  classDef phase fill:#121721,stroke:#5AA9FF,color:#F5F7FA,stroke-width:1px;',
        '  classDef branch fill:#181E29,stroke:#E7B04B,color:#F5F7FA,stroke-width:1px;',
        '  classDef terminal fill:#181E29,stroke:#E96B6B,color:#F5F7FA,stroke-width:1px;',
        "",
    ]
    for phase in phase_index["phases"]:
        label = f'{phase["phase_id"]} {phase["phase_name"]}\\n{" / ".join(phase["lane_focus"][:2])}'
        lines.append(f'  {phase["phase_id"]}["{label}"]:::phase')
    lines.extend(
        [
            "  P01 --> P02 --> P03 --> P04 --> P05 --> P06 --> P07 --> P08 --> P09 --> P10 --> P11 --> P12 --> P13 --> P14 --> P15 --> P16 --> P17 --> P18",
            "",
            '  BR_ACCESS{"Access blocked?"}:::branch',
            '  TERM_ACCESS["Early access-blocked return"]:::terminal',
            "  P01 --> BR_ACCESS",
            "  BR_ACCESS -->|yes| TERM_ACCESS",
            "  BR_ACCESS -->|no| P02",
            "",
            '  BR_PRESEAL{"Pre-seal gates allow seal?"}:::branch',
            '  TERM_PRESTART["Blocked or review pre-start outcome"]:::terminal',
            "  P05 --> BR_PRESEAL",
            "  BR_PRESEAL -->|no| TERM_PRESTART",
            "  BR_PRESEAL -->|yes| P06",
            "",
            '  BR_TRUST{"Trust terminalization?"}:::branch',
            '  TERM_TRUST["Trust posture terminal bundle"]:::terminal',
            "  P13 --> BR_TRUST",
            "  BR_TRUST -->|yes| TERM_TRUST",
            "  BR_TRUST -->|no| P14",
            "",
            '  BR_SUBMIT{"Submit path requested?"}:::branch',
            '  TERM_PENDING["Review-required pending authority confirmation"]:::terminal',
            "  P16 --> BR_SUBMIT",
            "  BR_SUBMIT -->|no| P17",
            "  BR_SUBMIT -->|yes| TERM_PENDING",
            "",
            '  TERM_FINAL["Terminal finalization and return"]:::terminal',
            "  P18 --> TERM_FINAL",
        ]
    )
    MERMAID_PATH.write_text("\n".join(lines) + "\n")


def ensure_atlas_scaffold() -> None:
    missing = [path for path in [ATLAS_INDEX_PATH, ATLAS_STYLES_PATH, ATLAS_APP_PATH] if not path.exists()]
    if missing:
        missing_list = ", ".join(repo_rel(path) for path in missing)
        raise SystemExit(f"Atlas scaffold missing required static file(s): {missing_list}")


def build_outputs() -> dict[str, Any]:
    modules = parse_module_names()
    blocks = load_run_engine_blocks()
    step_records = [record for block in blocks for record in build_step_records(block, modules)]
    phase_to_steps: dict[str, list[StepRecord]] = defaultdict(list)
    for record in step_records:
        phase_to_steps[record.phase_id].append(record)
    phase_records = [
        build_phase_record(block, phase_to_steps[block.phase_id])
        for block in blocks
    ]
    branch_conditions = branch_conditions_payload()
    live_map = build_live_experience_map(phase_records)
    phase_index = build_phase_index(phase_records, step_records, modules)
    atlas_data = build_atlas_data(phase_index, branch_conditions, live_map)
    return {
        "phase_index": phase_index,
        "step_records": step_records,
        "event_timeline": build_event_timeline(phase_records, step_records),
        "branch_conditions": branch_conditions,
        "live_map": live_map,
        "atlas_data": atlas_data,
    }


def write_outputs(outputs: dict[str, Any]) -> None:
    DATA_ANALYSIS_DIR.mkdir(parents=True, exist_ok=True)
    DOCS_ANALYSIS_DIR.mkdir(parents=True, exist_ok=True)
    DIAGRAMS_ANALYSIS_DIR.mkdir(parents=True, exist_ok=True)
    ATLAS_DIR.mkdir(parents=True, exist_ok=True)
    ensure_atlas_scaffold()
    json_write(PHASE_INDEX_PATH, outputs["phase_index"])
    write_jsonl(STEP_LEDGER_PATH, (record.to_dict() for record in outputs["step_records"]))
    write_event_csv(outputs["event_timeline"])
    json_write(BRANCH_CONDITIONS_PATH, outputs["branch_conditions"])
    json_write(LIVE_EXPERIENCE_MAP_PATH, outputs["live_map"])
    json_write(ATLAS_DATA_PATH, outputs["atlas_data"])
    write_swimlane_doc(outputs["phase_index"], outputs["branch_conditions"], outputs["live_map"])
    write_phase_contracts_doc(outputs["phase_index"])
    write_branch_doc(outputs["branch_conditions"])
    write_mermaid(outputs["phase_index"], outputs["branch_conditions"])


def main() -> int:
    outputs = build_outputs()
    write_outputs(outputs)
    summary = {
        "status": "PASS",
        "phase_count": outputs["phase_index"]["phase_count"],
        "step_count": outputs["phase_index"]["summary"]["step_count"],
        "event_count": outputs["phase_index"]["summary"]["event_count"],
        "artifact_write_count": outputs["phase_index"]["summary"]["artifact_write_count"],
        "branch_count": outputs["branch_conditions"]["row_count"],
        "live_experience_phase_count": outputs["live_map"]["phase_count"],
    }
    print(json.dumps(summary, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
