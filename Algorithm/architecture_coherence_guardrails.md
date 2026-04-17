# Architecture Coherence Guardrails

This document defines the standing guardrails that keep the Algorithm corpus internally coherent as contracts evolve. It focuses on permanent cross-spec obligations rather than on historical review status.

## 0. Foundation spine coherence

- canonical shared-spine object families SHALL use one name across the README, glossary, data model,
  state machines, shell contracts, and route schemas; the route-stable staff shell contract is
  `LowNoiseExperienceFrame`, not `ExperienceFrame`
- when serialized, shell-family vocabulary is closed to `CALM_SHELL`, `CLIENT_PORTAL_SHELL`,
  and `GOVERNANCE_DENSITY_SHELL`; native delivery SHALL use a separate embodiment marker such as
  `surface_embodiment = NATIVE_OPERATOR` rather than inventing a second shell family; companion
  route-stability fields such as `shell_family`, `object_anchor_ref`, `dominant_question`,
  `settlement_state`, `recovery_posture`, `shell_stability_token`, `workspace_version`, and
  `view_guard_ref` SHALL keep one meaning across browser, native, portal, governance, and
  collaboration surfaces
- customer-safe and customer-visible projections SHALL remain distinct from internal-only, staff-full,
  governance-controlled, and authority-facing visibility class boundaries; no contract family may
  silently widen a projection or rename a visibility boundary locally
- the glossary and README inventory SHALL stay aligned with the machine-enforced route contracts so
  downstream prompt families inherit one foundation vocabulary before specialization begins

## 1. Lineage and continuation coherence

- Child-manifest frozen-basis behavior SHALL be expressed through explicit continuation policy plus `continuation_set.config_inheritance_mode` and `continuation_set.input_inheritance_mode`, never through implicit reuse rules.
- Branch selection SHALL evaluate exact same-request bundle reuse and same-manifest sealed-context reuse before generic continuation-child allocation.
- Tenant/client/period/scope/lineage compatibility SHALL fail closed as typed validation outcomes rather than assertion-driven crashes or silent fallback.
- Root, reuse, and child branches SHALL serialize one unambiguous lineage posture, and top-level lineage mirrors SHALL remain byte-identical with `continuation_set{...}`.

## 2. Execution-context propagation

- Every derived artifact emitted after manifest allocation SHALL carry the common execution-context field group.
- `RunManifest.mode` and derived-artifact execution markers such as `execution_mode`, `analysis_only`, `non_compliance_config_refs[]`, and `counterfactual_basis` SHALL remain explicit and SHALL NOT collapse into parallel terminology.
- New amendment, drift, enquiry, shell, and workspace artifacts SHALL be reviewed for execution-context completeness whenever a new contract family is introduced.

## 3. Gate, audit, and observability alignment

- Ordered gate persistence SHALL remain explicit, typed, and correlation-safe across manifests, gate records, and emitted audit families.
- Audit, trace, log, and metric contracts SHALL evolve together; event-family lists, correlation keys, and ordering rules SHALL remain synchronized across prose, schemas, and examples.
- No cross-surface simplification SHALL erase the distinction between gate posture, authority posture, and observability evidence.

## 4. Schema, documentation, and example parity

- Schema, prose, state machines, data-model summaries, examples, and release-verification artifacts SHALL describe the same contract families without editorial lag being treated as acceptable.
- When a contract family changes, named downstream surfaces that serialize or explain that family SHALL be updated in the same change set or explicitly blocked from release.
- Cross-document terminology SHALL remain concrete and stable; disagreements between spec layers are contract defects, not documentation backlog.
- `constraint_traceability_register.json` SHALL remain the machine-checkable live constraint map. Every live named constraint SHALL bind authoritative refs, validator and forensic-guard refs, downstream surface refs, and example coverage through concrete file paths plus required-term anchors rather than vague phase labels or obsolete note pointers.
- `constraint_coverage_index.md` SHALL remain a human summary of the live register. Historical cleanup notes SHALL stay in `AUDIT_FINDINGS.md` and `PATCH_RESOLUTION_INDEX.md`; they SHALL NOT be restated as if they were still-live constraint rows.
- When a named live constraint changes, `constraint_traceability_register.json`, `constraint_coverage_index.md`, and every listed downstream specialized shell, route, or schema contract SHALL move in the same change set.
- `AUDIT_FINDINGS.md`, `PATCH_RESOLUTION_INDEX.md`, and `contract_integrity_requirements.md` SHALL
  keep one synchronized forensic closure register for material historical defects; corpus and
  acceptance closure SHALL fail closed if any numbered finding is left unmapped, multiply mapped, or
  described as resolved only in notes without an authoritative contract/validator/guard path.
- `README.md`, `constraint_coverage_index.md`, and `test_vectors.md` SHALL keep prompt-stage
  coverage and acceptance-range maps aligned with `prompts/system/00_system_objective.md`; no major
  blueprint family or high-signal acceptance vector family may sit outside an owning prompt stage,
  validator path, and reference-layer description.

## 5. Frontend shell and interaction coherence

- shell-family ownership, same-object continuity, support-region budgets, stale/recovery posture, artifact-preview/export/handoff rules, and UI telemetry fences SHALL remain synchronized across `frontend_shell_and_interaction_law.md` and every profile-specific shell contract
- shared interaction-layer contracts are the authoritative boundary between server-authored
  behavior and platform translation; browser, native, responsive, and automation embodiments MAY
  redock or restack surfaces, but they SHALL NOT redefine continuity, recovery, support-region, or
  current-versus-history semantics outside the published interaction layer
- profile-specific UI documents MAY tighten cross-platform shell law, but they SHALL NOT reintroduce parallel writable posture, detached success semantics, unsafe external handoff, or contradictory visibility/freshness presentation
- browser and native embodiments SHALL preserve the same route-stability, stale-view, and artifact-governance semantics even when the layout primitives differ
- same object, same shell SHALL hold across manifest, work-item, client-request, approval-pack, onboarding-step, and governance-object routes; deep links, notification opens, rebase recovery, and device-class changes SHALL preserve the parent shell grammar and active section rather than remount a different product metaphor for the same object
- primary shell read models SHALL serialize one `dominant_question` plus explicit settlement or
  actionability posture so browser, native, and automation clients do not reconstruct the screen's
  purpose heuristically from independent badges, loaders, or counts
- where a route contract additionally serializes `shell_family`, `object_anchor_ref`, or
  `recovery_posture`, those fields SHALL remain synchronized with `dominant_question`,
  stale-view/rebase semantics, and the owning shell-family vocabulary rather than drifting into a
  second competing metadata layer
- every user-facing route SHALL answer one dominant question and surface one dominant action at a time; compare, audit, and side-by-side blocker review MAY add a second promoted region only when that second region is itself the explicit user task
- current artifacts, approval packs, uploads, exports, and external handoff objects SHALL render summary-first with explicit current-versus-historical lineage; historical, superseded, masked, or limited variants SHALL never become the default primary artifact affordance

## 6. Recovery, constrained-layout, and verification continuity

- reconnect, rebase, stale-view, projection-lag, degraded-transport, and pending-propagation states SHALL preserve the mounted object and keep the current shell stable; recovery posture SHALL be explicit and route-visible rather than implied through full-screen loaders, toast-only messaging, or disappearing actions
- narrow-screen, embedded, mobile, and resized native-window variants SHALL collapse ancillary rails, drawers, or sidecars into the same reading order and object identity used by the wide shell; no layout collapse may change the active route key, focused object, or safe-next-action meaning
- focus anchors, return paths, semantic selectors, and accessibility labels SHALL remain stable across shell morphologies so browser, native, automation, and assistive technologies all observe the same interaction contract

## 7. One-sentence summary

The corpus remains coherent when lineage, execution context, gate semantics, observability evidence, and cross-surface shell continuity evolve as one synchronized architecture instead of as separate review tracks.
