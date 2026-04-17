# Glossary

This file is the authoritative vocabulary layer for the pack. When a contract cites a machine field in
backticks, that field name maps to the human-readable glossary concept below rather than introducing a
second meaning.

## Core engine terms

**Authority**: The external system of record whose acknowledgements define legal submission state
(e.g., a tax authority).

**Principal**: The authenticated actor (human or service) initiating an operation.

**Tenant**: A firm-level boundary for data isolation, policy, configuration, and audit.

**Client**: A taxpayer or entity managed under a tenant.

**Period**: A time scope for obligations (tax year, quarter, or other statutory period).

**Connector**: A controlled integration to a data provider (authority, bank, ledger, document inbox).

**Evidence Item**: An auditable artifact supporting a fact (bank statement line, invoice, receipt,
authority response).

**Canonical Fact**: Normalized representation of a domain-specific statement (income event, expense,
allowance, adjustment).

**Snapshot**: An immutable set of canonical facts + metadata for a given `(tenant, client, period,
scope)`.

**Run Manifest**: The hash-bound execution control object for a run, capturing inputs, versions,
policies, code build, timestamps, and produced artifacts; its lifecycle and outcome projections may
advance only through named transitions and audited updates.

**Gate**: A policy decision point that permits, warns, or blocks downstream operations based on trust
and compliance rules.

**Override**: A human-approved exception that changes a gate decision or interpretation, always with
scope, rationale, and expiry.

**Decision Bundle**: The set of artifacts created by a run: snapshot, compute result, risk, trust,
evidence graph, twin view, filing packet, and terminal workflow refs.

**Parity**: A measured difference between internal computed figures and authority-provided figures or
prior submissions.

**Drift**: Any change in facts or configuration that changes outcomes after an earlier decision or
submission.

**Retention Tag**: Metadata describing the retention class and expiration rules for an artifact.

## Execution lineage and identity terms

**Access Binding Hash (`access_binding_hash`)**: The deterministic hash of the effective access
decision, executable scope, executable partition coverage, masking rules, approval requirements,
required authentication level, and other frozen authorization lineage needed to distinguish one
authorized posture from another. It binds idempotency, manifest reuse, and authority request
identity to the actual authorized posture rather than raw caller intent alone.

**Scope Execution Binding (`scope_execution_binding`)**: The authoritative raw-versus-executable
scope contract published after authorization. It freezes requested scope grammar, executable runtime
scope, explicit requested and executable scope families, executable partition coverage,
reduction posture, mutation atomicity, and the bound `access_binding_hash` so gates, workers,
authority operations, and read models share one scope meaning instead of re-deriving it locally.

**Continuation Basis (`continuation_basis`)**: The typed lineage reason explaining why the engine may
reuse an existing manifest, return a prior terminal bundle, create a replay or recovery child, or
spawn another continuation child. It is structured branch truth, not free-form commentary. Persisted
manifests SHALL use the machine-stable vocabulary `{NEW_MANIFEST, REPLAY_CHILD, RECOVERY_CHILD,
CONTINUATION_CHILD, NEW_REQUEST_CHILD}`.

**Config Inheritance Mode (`config_inheritance_mode`)**: The canonical record of whether a child
manifest inherited the parent frozen config exactly (`REPLAY_EXACT`, `RECOVERY_EXACT`,
`HISTORICAL_EXPLICIT`) or resolved fresh child config (`FRESH_CHILD_RESOLUTION`). `null` means no
child manifest was created, so there was no inheritance decision to persist.

## Audit ordering and integrity terms

**Recorded At (`recorded_at`)**: The durable append time assigned when the engine commits an audit
event. It is distinct from semantic `event_time`, which may come from an external authority,
provider, or client clock.

**Audit Stream (`audit_stream_ref`)**: The append-only audit chain in which events are durably ordered
for a given integrity domain. Hash chaining, when enabled, is evaluated within this stream.

**Stream Sequence (`stream_sequence`)**: The monotonic sequence number within one `audit_stream_ref`.
Canonical audit order is derived from `audit_stream_ref` plus `stream_sequence`, not from wall clock
timestamps alone.

## Provenance and explanation terms

**Primary Path (`primary_path_ref`)**: The deterministically selected critical provenance path that the
engine returns first when explaining a filing-critical figure, parity issue, trust block, legal-state
change, or amendment conclusion.

**Path Ranking Basis (`path_ranking_basis[]`)**: The machine-readable explanation of why one candidate
provenance path was chosen as primary over alternatives, including confidence, limitation, retention,
and tie-break factors.

**Proof Closure Contract (`proof_closure_contract`)**: The frozen machine-readable statement of
whether support closure, authority closure, contradiction isolation, replay closure, decisive-anchor
presence, silent-limitation ambiguity, and staleness invalidation currently permit a filing-capable
target or proof bundle to remain `CLOSED`.

**Lineage Boundary (`lineage_boundaries[]`)**: The explicit record of where a provenance query crosses
from one manifest lineage segment to another, such as continuation, replay, recovery, or supersession.
These boundaries prevent cross-manifest explanation chains from collapsing into one ambiguous proof
path.

## Shell, route, and collaboration terms

**Shell Family (`shell_family`)**: The canonical owning shell classification for a route-visible read
model. When serialized, this vocabulary is closed to `{CALM_SHELL, CLIENT_PORTAL_SHELL,
GOVERNANCE_DENSITY_SHELL}` so browser, native, automation, portal, and governance clients all
preserve same-object, same-shell behavior.

**Surface Embodiment (`surface_embodiment`)**: The optional delivery marker that states how a
route-visible shell is materialized without changing shell ownership. Native operator scenes use
`surface_embodiment = NATIVE_OPERATOR` while keeping the same canonical `shell_family` vocabulary as
their browser or automation counterparts.

**Object Anchor Ref (`object_anchor_ref`)**: The durable object identity that a route-stable shell is
mounted around. It keeps reload, reconnect, rebase, deep-link recovery, and native-scene restoration
bound to the same governing object instead of remounting a different product metaphor for the same
truth.

**Route Context (`route_context`)**: The explicit route-ownership envelope for a mounted detail
surface. It carries the active route ref, mounted module, live focus anchor, lawful parent return
target, and predeclared fallback target so browser back, notification-open, refresh recovery, and
responsive collapse do not depend on history-stack guesswork or shell-local cache state.

**Cross-Device Continuity Contract (`cross_device_continuity_contract`)**: The grouped same-object
continuity envelope for route-visible shells, notification-open targets, and native scenes. It
freezes the mounted object ref, route or scene identity, parent return anchor, dominant-action
posture, grouped guard hashes, compatibility-basis class, visibility/session compatibility refs,
and allowed embodiments so refresh, resize, reconnect, deep-link open, and native restoration reuse
one backend-authored continuity basis.

**Focus Restore Return-Target Harness (`focus_restore_return_target_harness`)**: The deterministic
regression artifact for action-driven focus restoration. It freezes keyboard-first close, back,
help-return, stale-fallback, live-update, and secondary-window-dismissal cases together with the
serialized invoker, parent-return, and fallback anchors plus browser/native identifier mirrors so
focus restore stays part of the route contract instead of browser history guesswork.

**Dominant Question (`dominant_question`)**: The one governing question a mounted shell or route is
answering right now. It anchors summary copy, action posture, automation selectors, and recovery
messaging, and it SHALL not drift merely because a background refresh repainted the same object.

**Settlement State (`settlement_state`)**: The route-visible settlement posture for a mounted shell or
workspace. It distinguishes steady state from receipt-pending, freshening, stale-review, degraded,
or recovery-required posture without forcing clients to infer those states from loaders or badges.

**Recovery Posture (`recovery_posture`)**: The typed inline recovery mode for a mounted object after
stale-view rejection, reconnect, access rebinding, supersession, or similar route-preserving
disruption. It decorates the current shell; it does not authorize remounting the same object into a
different shell grammar.

**View Guard Ref (`view_guard_ref`)**: The route-stable stale-view anchor used by portal and other
projection-bound surfaces whose legality depends on the exact customer-visible projection the actor
reviewed. It freezes rebase and acknowledgment safety for route-scoped commands.

**Mutation Precondition Binding (`mutation_precondition_binding`)**: The explicit stale-write
authorization profile attached to a mutation-capable affordance, command, durable receipt, or typed
problem envelope. It names one command family, the exact guard fields that must be supplied
together, the stale-guard families the backend may echo on rejection, and whether visibility-scope
shifts invalidate the action outright.

**Frozen Execution Binding (`frozen_execution_binding`)**: The manifest-owned ref and hash packet
that post-seal workers, retries, and recovery flows must consume. It mirrors the sealed
`manifest_hash`, `execution_basis_hash`, config/input freeze identities, executable scope, and other
worker-safe frozen fields so downstream jobs do not re-resolve live config, live input, or mutated
lineage after freeze. It also preserves the complete continuation/inheritance mirror
(`continuation_of_manifest_id`, `parent_manifest_hash_at_branch`, config/input inheritance modes,
inherited-freeze refs, and fresh-child reason codes) so worker reload does not reconstruct branch
causality from adjacent objects.

**Pre-Seal Gate Evaluation (`preseal_gate_evaluation`)**: The immutable manifest-owned witness for
the canonical pre-seal gate chain. It binds one frozen `execution_basis_hash`, the exact required
gate order, the ordered pre-seal `gate_decision_id` prefix, the blocked-versus-ready disposition,
and the rule that same-manifest retry must reuse that tape while later post-seal gates may only
append after it.

**Manifest Branch Decision (`manifest_branch_decision`)**: The immutable request-time branch proof
that records which reuse/allocation action was legal (`NEW_MANIFEST`, `RETURN_EXISTING_BUNDLE`,
`REUSE_SEALED_MANIFEST`, `REPLAY_CHILD`, `RECOVERY_CHILD`, `CONTINUATION_CHILD`,
`NEW_REQUEST_CHILD`), the exact idempotent request identity, prior-manifest reuse evidence, the
selected manifest's persisted continuation basis and lineage, and the config/input inheritance modes
that justified child allocation.

**Authority Request Identity Contract (`request_identity_contract`)**: The grouped byte-stable
request identity packet copied across `AuthorityRequestEnvelope`, `AuthorityInteractionRecord`, and
request-backed `SubmissionRecord`. It freezes the manifest/basis spine, canonical HTTP identity,
duplicate bucket identity, binding lineage, access/policy hash, and partition scope so recovery and
reconciliation do not reconstruct request identity from adjacent operation or binding artifacts.

**Authority Ingress Proof Contract (`authority_ingress_proof_contract`)**: The grouped authenticated
ingress and correlation witness copied across `AuthorityIngressReceipt`, asynchronous
`AuthorityResponseEnvelope`, response-backed `AuthorityInteractionRecord`, request-backed
`SubmissionRecord`, and authority-settling `ObligationMirror`. It freezes the authenticated channel
state, required authentication evidence modes and refs, canonical delivery identity basis, exact
lineage-binding basis, canonical ingress receipt anchor, duplicate-meaning identity, and
mutation-gate posture so callback, poll, and recovery flows cannot mutate legal state from weak
correlation, undeclared heuristics, or transport-memory-only recovery.

**Authority Reconciliation Control Contract (`reconciliation_control_contract`)**: The grouped
reconciliation-budget packet copied into `AuthorityInteractionRecord` and reused by unresolved
`SubmissionRecord` and `ObligationMirror`. It freezes the authority operation profile, unresolved
truth posture, attempt count, remaining budget, next follow-up, resend legality, replay-resume
policy, escalation owner/workflow/evidence, and analytics outcome class so restore, replay, and
downstream projections do not reconstruct unresolved authority control from timers or retry logs.

**Authority Reconciliation Analytics Snapshot (`authority_reconciliation_analytics_snapshot`)**:
The replay-safe rollup emitted for one authority operation profile from persisted reconciliation
control contracts. It freezes budget-state counts, resend-refusal counts, escalation reason and
latency counts, ambiguity counts, replay-resume counts, and tuning recommendation codes without
promoting transport retry telemetry into source-of-truth.

**Gate Semantics Contract (`gate_semantics_contract`)**: The grouped non-access gate semantics
packet copied into each `GateDecisionRecord`. It freezes the decision-rank mapping, monotone
progression rank, blocking class, reason-order profile, and whether progression was
override-independent, valid-override-governed, override-required-but-missing, or override-forbidden
so downstream read models do not infer legal progression from the raw decision enum alone.

**Governance Mutation Hazard Contract (`mutation_hazard`)**: The grouped bounded governance
mutation-risk packet published by `GovernanceAccessSimulation` and reused by
`GovernancePolicySnapshot` basket and blast-radius surfaces. It freezes the exact
`policy_snapshot_hash`, `access_binding_hash`, `dependency_topology_hash`, `simulation_basis_hash`,
the canonical lower/upper blast-radius interval, classed impacted counts, quantitative policy-risk
contributors, approval and commit posture, confidence and predictability posture, and the ordered
driver/trigger/blocker explanation arrays. Its `hazard_contract_hash` is the durable reviewed risk
identity that `mutation_basis_contract.hazard_contract_hash` must mirror before a governance write
can proceed.

**Constraint Traceability Register (`constraint_traceability_register.json`)**: The machine-checkable
live constraint map for the blueprint corpus. Each entry names one active cross-document
constraint, its architectural rationale, authoritative refs, validator and forensic-guard refs,
downstream read-surface propagation refs, and scenario/vector anchors. Historical cleanup notes do
not live here.

**Constraint Coverage Index (`constraint_coverage_index.md`)**: The human-readable summary of the
live constraint traceability register. It summarizes active named constraints and critical
constraint families, but it does not act as a second findings ledger or a home for stale
`could still` defect notes.

**Replay Basis Integrity Contract (`basis_integrity_contract`)**: The immutable replay-attestation
proof of historical-basis provenance. It records whether config, input, pre-seal tape, authority
post-seal basis, and late-data post-seal basis were historically reused, declared-counterfactual,
missing, or corrupt; whether any live connector reads, live authority reads, or late-data rescans
executed; which substitutions were declared or undeclared; and whether deterministic outcome hashing
stayed limited to persisted or transactionally staged material.

**Baseline Selection Contract (`selection_contract`)**: The immutable exact-scope baseline-choice
proof attached to `DriftBaselineEnvelope`. It freezes the active exact scope, chosen scope-match
class, dominance ranks, continuity class, and `baseline_anchor_weight` together with explicit
uncertainty reasons so broader, out-of-band, or authority-corrected truth cannot later masquerade
as an exact same-chain baseline.

**Amendment Eligibility Contract (`amendment_eligibility_contract`)**: The immutable split between
amendment trigger, live legal eligibility, and readiness reuse. It records whether amendment-aware
workflow was triggered at all, whether the case is eligible now, whether any persisted
intent-to-amend readiness remains `FRESH`, `STALE`, or `NOT_APPLICABLE`, and the exact
baseline/retroactive/window hashes and reason codes that justify that posture.

**Late-Data Temporal Contract (`temporal_classification_contract`)**: The immutable per-indicator or
per-finding temporal truth packet. It freezes `t_cutoff`, `t_effective`, `t_visible`,
`t_discovered`, the resolved temporal class (`TEMPORALLY_UNPROVED`, `AUTHORITY_POSTING_LAG`,
`TRUE_POST_BASELINE_EVENT`, `PRE_CUTOFF_PREEXISTING_LATE_ARRIVAL`,
`POST_CUTOFF_DISCOVERY_PRE_BASELINE_FACT`), baseline-touch scope, and whether trust, proof, or
amendment reuse must be invalidated.

**Late-Data Consequence Summary (`temporal_consequence_summary`)**: The immutable monitor-result
summary that separates raw late-data counts from final legal consequence. It records the persisted
classification counts, the highest downstream consequence, temporal-uncertainty blocking posture,
and whether retroactive impact, trust invalidation, proof staleness, or amendment-reuse
invalidation are required.

**Late-Data Retroactive-Impact Simulation Basis Contract
(`late_data_retroactive_impact_simulation_basis_contract`)**: The immutable historical-basis packet
for counterfactual late-data analysis. It freezes the exact source manifest, execution basis,
cutoff, baseline, covered scopes, covered submission chain, monitor/finding lineage,
temporal-propagation lineage, proof lineage, and pinned analysis policies so FE-93 simulation never
reclassifies history from live rescans or widens beyond the declared legal slice.

**Late-Data Retroactive-Impact Simulation (`LateDataRetroactiveImpactSimulation`)**: The analysis-only
artifact that replays the canonical five temporal classes against a frozen historical basis and
emits one of five explicit consequence buckets: `CURRENT_ONLY`, `EXPLANATION_ONLY`,
`AMENDMENT_TRIGGERING`, `REPLAY_TRIGGERING`, or `REVIEW_BLOCKED`. It proves whether late data
affects only current scope, requires explanation, restates prior positions, forces replay, or
blocks on temporal uncertainty without mutating prior legal truth.

**Trust Score Band / Cap Band (`score_band`, `cap_band`)**: The persisted split between the numeric
trust result and the stricter legal ceiling. `score_band` records the pure score-derived band,
`cap_band` records the fail-closed non-score ceiling, and `trust_band` is the most restrictive of
the two so review, block, and automation ceilings do not have to be recomputed from raw scores.

**Upstream Gate Cap (`upstream_gate_cap`)**: The persisted trust-stage ceiling derived from the
already-decided upstream non-access gates. It freezes whether trust may be `AUTO_ELIGIBLE`,
`NOTICE_ONLY`, `REVIEW_ONLY`, or `BLOCKED`, so downstream gates, nightly automation, and read-side
action surfaces cannot accidentally outrank earlier legal progression.

**Append-Only Outcome Projection (`append_only_outcome_projection`)**: The authoritative
post-seal-growth envelope on `RunManifest`. It owns the gate tape, historical post-seal basis,
output refs, submission refs, drift refs, decision-bundle hash, deterministic outcome hash, and
replay attestation ref that may append after seal without rewriting the frozen execution envelope.
Its `output_refs{...}` entries remain structured output-link objects so proof/twin/replay linkage
keeps artifact hashes and dependency identities explicit.

**Historical Post-Seal Basis (`post_seal_basis`)**: The replay-safe authority and late-data lineage
packet stored inside `append_only_outcome_projection`. It preserves either an explicit null sentinel
or the exact post-seal authority-context, late-data-monitor, authority-calculation, and drift-record
hash/ref set that materially affected a completed outcome.

**Route Stability Contract (`stability_contract`)**: The grouped read-side marker contract that
publishes one `publication_generation`, one `guard_vector_hash`, the exact component markers that
formed that hash, and the current resume capability for a route. Snapshots, stream events, stale
failures, and native restoration SHALL all serialize the same contract for the same current route
generation rather than loosely correlated marker fields.

**Publication Generation (`publication_generation`)**: The monotonic route-visible generation number
for the currently published shell or workspace posture. It advances whenever displayed truth or
mutation safety changes materially, even when the mounted shell family remains the same.

**Guard Vector Hash (`guard_vector_hash`)**: The canonical hash over the active stale-view guard
components for the current route generation. It changes whenever any governing marker in the route's
legal mutation basis changes, so clients can detect mixed-generation cache, stream, and recovery
state without reconstructing marker equivalence locally.

**Focus Restoration Contract (`focus_restoration`)**: The grouped deep-link and recovery envelope
that preserves the originally requested focus anchor, the focus anchor actually restored now, one
explicit restoration disposition, and one explicit reason whenever refresh, reconnect, notification
open, responsive collapse, or native scene restoration cannot land on the exact prior focus target.
`EXACT_FOCUS` means the requested and resolved anchors match, `REMAPPED_FOCUS` means the same route
recovered to a different lawful anchor, `OBJECT_SUMMARY` means the shell kept the same mounted object
but fell back to its summary posture, `PARENT_RETURN` means the detail route had to return to its
governed parent target, and `INVALIDATED` means restoration itself is no longer lawful.

**Collaboration Queue Projection (`queue_projection`)**: The shared collaboration queue-truth
envelope attached to inbox rows, mounted workspaces, badge-bearing stream events, and notifications.
It freezes split lane unread counts, drawer badge mirrors, the canonical inbox sort basis, deferred
focus-lock posture, and which activity lane a notification may lawfully reopen so clients do not
infer reorder, removal, or badge meaning from transport arrival order.

**Collaboration Routing Contract (`routing_contract`)**: The persisted per-item quantitative routing
contract attached to `WorkflowItem` and every collaboration `queue_projection`. It freezes the
governing routing-profile hash, canonical sort tuple, assignment and escalation scores, queue
pressure, recommendation posture, ranked explanation codes, and draft/focus continuity guards so
browser, native, stream, notification, and automation consumers reuse one routing decision instead
of recomputing from local clocks, badges, or partial state.

**Work Queue Health Contract (`queue_health_contract`)**: The persisted inbox-view queue-health
contract. It freezes queue-health score, queue-pressure score, degraded-vs-healthy posture,
intervention recommendation, and the rule that row ordering follows canonical persisted sort tuples
only, so banners and ordering do not fall back to raw backlog counts or client-local heuristics.

**Visibility Class (`visibility_class`)**: The canonical projection boundary that states which viewer
population may observe an entry, attachment, event, notification, or derived posture. Customer-safe
and customer-visible projections SHALL remain distinct from internal-only, staff-full, governance,
or authority-facing posture, and a contract SHALL not widen that boundary implicitly.

**Shell Stability Token (`shell_stability_token`)**: The reconnect-safe token that represents the
current shell hierarchy and object-permanence baseline. Clients use it for stale-view detection and
non-destructive refresh without inventing their own hierarchy comparison rules.

**Workspace Version (`workspace_version`)**: The route-visible monotonic version of a governed
workspace or projection. For collaboration it is the authoritative stale-view guard and `ETag` basis
for work-item reads and writes; for portal-style routes it is the route-stable rebase anchor for the
current customer-visible workspace posture.

**Portal Interaction Layer (`PortalInteractionLayer`)**: The shared interaction contract for
client-visible portal routes and list/detail projections. It freezes task-first spacing, literal
status language, semantic selector grammar, same-shell contextual return, current-first artifact
presentation, responsive stack behavior, and subtle motion without making each portal route invent
its own local interaction rules.

**Operator Interaction Layer (`OperatorInteractionLayer`)**: The shared interaction contract for
calm-shell, staff workspace, inbox, and native operator scenes. It freezes mounted-content
preservation, inline refresh and rebase behavior, notification mounting, preview embodiment,
current-vs-history presentation, selector grammar, and low-noise motion across browser and native
staff/operator surfaces.

**Governance Interaction Layer (`GovernanceInteractionLayer`)**: The shared interaction contract for
governance console routes. It freezes density profile, canonical filter grammar, support-surface
promotion, semantic selector profile, diff/basket continuity, export posture, and keyboard/focus
restoration across overview, policy, access, authority-link, retention, and audit routes.

**Customer Safe Projection (`customer_safe_projection`)**: The shared FE-41/FE-70 boundary
contract for portal workspaces, customer request lists, customer-visible collaboration detail,
customer-visible collaboration activity and attachment reads, customer-visible workspace stream
events, customer-visible notifications, document requests, approval packs, onboarding journeys,
and client timeline events. It freezes customer-safe-only status and action derivation, explicit
limitation and recovery notices, current-versus-history artifact posture, hidden-activity
suppression, customer-safe module and metadata projection, customer-visible-only attachment scope,
internal-only delta exclusion during live updates, exclusion of internal draft placeholders, same-shell
notification navigation, customer-visible export scope, and the blocked staff signal classes
`ASSIGNMENT_STATE`, `ESCALATION_LOGIC`, `RAW_GATE_STATE`, `STAFF_REASON_CODES`,
`AUDIT_LINEAGE`, `INTERNAL_ACTIVITY`, `INTERNAL_ATTACHMENTS`, `INTERNAL_PARTICIPANTS`,
`INTERNAL_COUNTS`, and `STAFF_ROUTE_CONTEXT`.

**Upload Session Recovery Harness (`upload_session_recovery_harness`)**: The deterministic FE-87
governed-upload recovery artifact. It serializes pre/post `ClientUploadSession` snapshots plus the
post-recovery request projection for mobile reconnect, browser reload, stale request rebase,
duplicate allocation retry, checksum/scanner delay, attachment confirmation, and cross-device
continuation. Its job is to prove that frozen tenant/client/request/request-version lineage,
storage reuse, explicit stale-rebind posture, and completion boundaries survive every lawful resume
path.

**Externalization Governance Contract (`externalization_governance_contract`)**: The shared FE-57
export, download, print, and browser-handoff boundary packet bound into `AuditInvestigationFrame`,
portal document and approval artifacts, `EnquiryPack`, and `AuthorityLinkInventoryItem`. It freezes
the mounted governed slice, current-versus-history meaning, masking posture, limitation posture,
approval posture, invocation-time tenant/access/masking/visibility mirrors, canonical
`delivery_binding_hash`, delivery targets, blocking context, and no-detached-scope/no-direct-URL
policies so externalized artifacts cannot drift broader, fresher, or differently classified than
the slice the user actually reviewed.

**Artifact Affordance Contract (`artifact_affordance`)**: The shared FE-69 current-versus-history
presentation packet bound into portal document requests, portal approval packs, customer-visible
collaboration file reads, and native secondary preview windows. It freezes the visible primary
subject, explicit header posture, history disclosure mode, and default preview/download/print
targets so current artifacts remain summary-first while historical, superseded, rejected, expired,
or quarantined artifacts stay explicitly secondary.

**Portal Language Contract (`language_contract`)**: The shared FE-71 portal wording packet bound
into `ClientPortalWorkspace`, `CustomerRequestListSnapshot`, customer-visible request detail,
`ClientDocumentRequest`, `ClientApprovalPack`, `ClientOnboardingJourney`, and
`ClientTimelineEvent`. It freezes literal client-safe task language, the one-dominant-question and
one-dominant-action rule, explicit due/current/history/settlement grammar, banned internal
vocabulary families, bounded field budgets, and the per-route first-view copy budgets that keep
`HOME`, `DOCUMENTS`, `APPROVALS`, `ONBOARDING`, `HELP`, and contextual request detail calm and
non-duplicative.

**Authority Layer Boundary (`authority_layer_boundary`)**: The shared FE-52 control packet bound
into `AuthorizationDecision`, `GovernanceAccessSimulation`, `AuthorityBinding`,
`AuthorityOperation`, and `AuthorityRequestEnvelope`. It freezes the active principal class, tenant
permission posture, client delegation posture, imported-delegation freshness, authority-link
readiness, exceptional-authority posture, human-gate resolution state, and the explicit rules that
tenant permission never substitutes for delegation or authority-link readiness, authority links never
prove delegation coverage, and internal exception paths never outrank authority-of-record truth.

**Failure Resolution Contract (`failure_resolution_contract`)**: The shared FE-45 lifecycle law
bound into `ErrorRecord`, `RemediationTask`, `CompensationRecord`, `FailureInvestigation`, and
`AcceptedRiskApproval`. It freezes that every material failure must remain a durable object with
explicit ownership, one lawful next path, retry and accepted-risk governance, and evidence-backed
closure instead of dissolving into logs, notes, or detached workflow.

**State Transition Contract (`state_transition_contract`)**: The shared FE-46 named-transition
governance packet bound into mutable backend control objects such as `RunManifest`,
`NightlyBatchRun`, `WorkflowItem`, `FilingPacket`, `SubmissionRecord`, `FilingCase`,
`DeploymentRelease`, `SchemaMigrationLedger`, `RecoveryCheckpoint`, and
`ReleaseVerificationManifest`. It freezes the object family, machine code, authoritative state
field, current and previous state, one named `transition_event_code`, one `transition_audit_ref`,
and the fail-closed policies that require named events, typed illegal-transition rejection,
concurrency guards, and successor-lineage allocation instead of terminal-state reentry in place.

**Schema Reader Window Contract (`schema_reader_window_contract`)**: The shared FE-47
schema-evolution compatibility packet bound into schema bundles, manifests, nightly batches,
migration ledgers, deployment releases, verification evidence, restore drills, and release
verification manifests. It freezes the active writer bundle, the supported reader bundle set, the
protected historical bundle set, the open-vs-closed window state, and the policies for historical
manifest continuity, destructive contract timing, rollback safety, fail-forward posture, and
replay/restore readability.

**Authority Sandbox Coverage Contract (`authority_sandbox_coverage_contract`)**: The shared BE-91
release-facing sandbox breadth packet bound into `VerificationSuiteResult` and
`GateAdmissibilityRecord`, with its canonical hash echoed by authority-sandbox rows in
`ReleaseVerificationManifest` and `ReleaseVerificationManifestAssemblyContract`. It freezes the
exact enabled provider-profile set, exact exercised operation-family set, sandbox request and
duplicate namespace hashes, and the required controlled-edge fail-closed cases for token rotation,
binding-lineage invalidation, ambiguous ingress quarantine, duplicate-bucket change, fraud-header
validation, and reconciliation-budget exhaustion.

**Nightly Batch Identity Contract (`identity_contract`)**: The shared FE-55 control packet bound
into `NightlyBatchRun`. It freezes the structured scheduler dedupe tuple
`{ tenant_id, nightly_window_key, trigger_class, release_verification_manifest_ref, policy_snapshot_hash, autopilot_policy_hash, scheduler_dedupe_key }`
plus the same-window duplicate, cross-window continuity, and successor-reclaim policies so nightly
batch identity never collapses into one opaque key.

**Operator Digest Derivation Contract (`derivation_contract`)**: The shared FE-56 morning-handoff
packet bound into `OperatorMorningDigest` and mirrored from `NightlyBatchRun` publication state. It
freezes the single nightly window basis, source batch set hash, persisted outcome counts,
published workflow outcome counts, workflow/notification publication completion timestamps, one
passed publication QA proof over exact outcome, queue, highlight, workflow, notification,
waiting-on-authority, and late-data partitions, deterministic highlight ranking profile, and
monotonic supersession lineage so the morning digest is derived from persisted truth rather than
queue side effects or notification timing races.

**Nightly Portfolio Simulation Basis Contract (`basis_contract`)**: The shared FE-88 non-mutating
what-if basis packet bound into `NightlyPortfolioWhatIfSimulation`. It freezes one exact nightly
window, one exact source batch set, one exact covered `selection_entry_ref` partition, the baseline
policy/release/schema/build identity, the modeled-only execution boundary hash, and the explicit
counterfactual knobs so simulation cannot fall back to live queue reads or mixed release identities.

**Nightly Portfolio What-If Simulation (`NightlyPortfolioWhatIfSimulation`)**: The FE-88 analysis
artifact for comparing baseline nightly selection and morning-handoff posture against an alternate
policy, capacity, retry, release, or authority scenario. It remains `execution_mode = ANALYSIS`,
never mutates live manifests or queues, and carries `entry_diffs[]` / `highlight_diffs[]` with
reason-code explanations for every changed bucket, rank, or highlight outcome.

**Backfill Execution Contract (`backfill_execution_contract`)**: The shared FE-47
migration-backfill packet bound into `SchemaMigrationLedger`. It freezes whether backfill is
required, the exact target schema bundle, the lawful execution state, the affected artifact
families, and the idempotent append-or-derive lineage rules so schema evolution cannot silently
double-apply, skip audit lineage, or mutate historical meaning in place.

**Command Truth Boundary Contract (`truth_boundary_contract`)**: The shared FE-42 / BE-42 boundary
contract attached to command envelopes, command-side durable records, boundary receipts, and
read-side projections. It freezes whether an artifact is a `COMMAND_REQUEST`,
`COMMAND_SIDE_AUTHORITY`, `BOUNDARY_RECEIPT`, or `READ_SIDE_PROJECTION`, together with the only
lawful authoritative-source policy, projection-input policy, durable-writeback policy, recovery
basis policy, durable record families, and observable projection families for that role. Its job is
to prevent command legality, retry, replay, or recovery from silently depending on `DecisionBundle`,
`ExperienceDelta`, workspace snapshots, portal caches, or other read-side surfaces as if they were
durable truth.

**Feedback Truth Policy (`feedback_truth_policy`)**: The rule that stale, pending-settlement,
recovery, and command-result feedback must be driven by durable `ApiCommandReceipt` truth and typed
`ProblemEnvelope` failure posture rather than by local optimistic UI inference.

**Work Item / Workflow Item (`WorkflowItem`)**: The governed human-action object created for review,
approval, remediation, late-data follow-up, or customer/staff collaboration. "Work item" is the
user-facing label; `WorkflowItem` is the canonical persisted object and MAY project separate internal
and customer-visible activity lanes when shared externally.

**Forensic Closure Register**: The mirrored table shared by `AUDIT_FINDINGS.md` and
`PATCH_RESOLUTION_INDEX.md` that maps every numbered historical finding to its owning prompt stages,
authoritative corpus, and resolution mechanism families. It is the repo-level closure gate for
historical material defects, not a substitute for live audit or provenance evidence.
