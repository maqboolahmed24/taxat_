# Embodiments and Examples

## Embodiments and examples

This section SHALL provide worked, implementation-grade embodiments of the engine. It is not a UX
appendix and not a marketing scenario list. Its job is to prove that the invention can be carried out
across the most important operating modes, edge cases, and authority interactions.
`constraint_traceability_register.json` is the live machine-checkable map from named constraints to
their authoritative refs and example/vector coverage; this file supplies the worked embodiments
referenced by that register.
The embodiment corpus SHALL also crosswalk back to the current system objective families through
`constraint_traceability_register.json`.

WIPO's drafting guidance makes this section strategically important: the number of
embodiments/examples depends on claim scope, many engineering inventions may be sufficiently supported
by one main embodiment plus alternatives, and claims are generalizations from one or more
embodiments/examples. Broader or more abstract claim scope therefore benefits from fuller worked
embodiments. [1]

## 16.1 Purpose

The embodiments and examples section SHALL do three things at once:

1. give engineers a concrete target behavior
2. give test authors reusable scenario fixtures
3. give patent counsel and reviewers enabling, technically coherent examples

## 16.2 Required structure for every embodiment

Every embodiment SHALL include the following subsections:

- `Embodiment ID`
- `Name`
- `Purpose`
- `Actors and authority posture`
- `Initial conditions`
- `Input/source mix`
- `Execution mode and artifact posture`
- `Authorized runtime scope and run kind`
- `Frozen config/provider profile`
- `Baseline submission state and comparison requirement`
- `Execution path`
- `Gate outcomes`
- `Authority interactions`
- `Outputs and end states`
- `Failure/edge conditions`
- `Technical effect demonstrated`

Where an embodiment exercises parity, trust, filing, amendment, or analysis behavior, it SHALL also
state the current contract inputs explicitly rather than relying on narrative shorthand. At minimum,
the embodiment SHALL declare the applicable values for:

- `execution_mode`
- `analysis_only`
- `counterfactual_basis` when `execution_mode = ANALYSIS`
- authorized `runtime_scope[]`
- `baseline_submission_state`
- `comparison_requirement` where parity or authority comparison semantics are material

Expected gate outcomes SHALL be written in canonical gate order and SHALL identify the concrete gate
decision enum. Any non-`PASS` example SHOULD also name the decisive reason-code family or blocking
basis so the embodiment can be turned into a deterministic fixture.

Each embodiment SHOULD also map to:

- one structured test vector in `test_vectors.md`
- one or more sample JSON fixtures
- one graph/query expectation where provenance is important

## 16.3 Minimum embodiment set

This corpus SHALL include at least the following embodiment set.

### Embodiment 1 - Direct-subject quarterly update from structured records

**Purpose**
Show the cleanest happy path for record-driven periodic reporting.

**Actors and authority posture**
`SUBJECT_SELF` with valid authority link.

**Initial conditions**
- one business partition
- current digital records present
- no blocking conflicts
- no active overrides

**Input/source mix**
- `BOOKS_OF_ENTRY`
- optional `INSTITUTIONAL_FEED`

**Execution path**
source collection -> snapshot build -> compute periodic totals -> parity/trust if applicable -> filing
packet build -> authority submission -> acknowledgement/reconciliation.

**Outputs**
- sealed manifest
- snapshot
- compute result
- trust summary
- filing packet
- submission record
- obligation mirror update

**Technical effect demonstrated**
The engine converts partitioned digital records into a sealed, authority-reconciled periodic
submission with replayable provenance.

HMRC's current journey for quarterly updates is every 3 months for each self-employment and property
income source, with totals derived from digital records rather than submission of the underlying
records themselves. The Obligations API is the authority-side basis for retrieving obligations. [2]

### Embodiment 2 - Agent-led quarterly update across multiple business partitions

**Purpose**
Show delegated operation and strict partition handling.

**Actors and authority posture**
`PREPARER` / `REVIEWER` acting under delegated client authority and valid authority link.

**Initial conditions**
- two separate business partitions
- separate obligation periods
- agent acting for client

**Input/source mix**
- ledger feed
- bank feed
- document uploads

**Execution path**
authorize acting-for relationship -> freeze manifest with partition set -> build partitioned totals ->
produce separate obligation-aware outputs -> submit/reconcile per relevant scope.

**Technical effect demonstrated**
The engine preserves separate-business integrity while still operating as one delegated workflow.

HMRC's digital-record guidance requires separate records for separate businesses, and quarterly
obligations are per relevant income source/business context. [5]

### Embodiment 3 - In-year correction carried into the next quarterly update

**Purpose**
Show that pre-finalisation correction is not treated as amendment.

**Actors and authority posture**
Direct subject or authorized agent.

**Initial conditions**
- one earlier quarterly update already submitted
- new or corrected source fact arrives before final declaration

**Execution path**
new manifest created -> corrected facts canonically promoted -> working baseline updated -> next
quarterly update includes correction lineage.

**Outputs**
- new working baseline
- no amendment case
- correction lineage visible in provenance

**Technical effect demonstrated**
The engine distinguishes working-state evolution from post-finalisation amendment semantics.

HMRC guidance says corrections during the year are included in the next quarterly update and the
original quarterly update does not need to be resent. [3]

### Embodiment 4 - End-of-year final declaration with authority calculation

**Purpose**
Show the complete year-end path.

**Actors and authority posture**
Subject or authorized agent with valid authority link.

**Initial conditions**
- year-end data complete enough for finalisation
- final-declaration path enabled by provider profile

**Execution path**
build annual adjusted totals -> trigger authority calculation -> retrieve calculation -> confirm
calculation basis -> present result -> submit final declaration -> reconcile acknowledgement.

**Outputs**
- calculation-linked filing packet
- confirmed or pending submission state
- filed baseline manifest if confirmed

**Technical effect demonstrated**
The engine binds internal compute, authority calculation, user declaration, and legal-state
acknowledgement into one sealed lineage.

HMRC's year-end guide describes the final-declaration flow as trigger calculation, retrieve
calculation, show the result, and submit final declaration. [3]

### Embodiment 5 - Final declaration blocked by material parity divergence

**Purpose**
Show how mandatory authority-comparison divergence or coverage loss blocks straight-through progression.

**Initial conditions**
- `comparison_requirement = MANDATORY`
- authority comparison basis is required for the requested final-declaration scope
- either a material difference is detected in critical field(s) or the required comparison basis is incomplete/non-comparable

**Execution path**
compute -> parity evaluation under frozen comparison policy -> if critical material/blocking
divergence exists, `PARITY_GATE` returns `OVERRIDABLE_BLOCK` or `HARD_BLOCK`; if required comparison
coverage is incomplete, `parity_classification = NOT_COMPARABLE` and `PARITY_GATE` returns
`HARD_BLOCK` -> trust falls to `RED` or `INSUFFICIENT_DATA` -> filing readiness stays
`READY_REVIEW` or `NOT_READY`, never straight-through submit.

**Optional branch**
approved scoped parity override creates new manifest branch and allows reviewer progression, but does
not alter authority truth and does not convert a mandatory non-comparable basis into a pass state.

**Technical effect demonstrated**
The engine prevents silent filing under unresolved internal-versus-authority divergence.

### Embodiment 6 - Post-finalisation material drift leading to amendment

**Purpose**
Show the amendment path after confirmed final declaration.

**Initial conditions**
- confirmed final-declaration baseline exists
- new material facts arrive within amendment window

**Execution path**
select filed baseline -> classify drift -> amendment gate confirms eligibility -> intent-to-amend
calculation path -> retrieve amended calculation -> user confirmation -> confirm-amendment submission ->
reconciliation.

**Outputs**
- drift record
- amendment case
- amended baseline after authority confirmation

**Technical effect demonstrated**
The engine moves from filed truth to amended truth only through a lawful authority-recognized
amendment sequence.

HMRC's year-end guidance says amendments after software-completed final declaration are available
within the amendment window and follow an intent-to-amend / confirm-amendment flow. [3]

### Embodiment 7 - Out-of-band filing discovered by authority reconciliation

**Purpose**
Show safe handling when legal state exists outside the active packet chain.

**Initial conditions**
- software has a working case
- authority indicates the obligation or final state is already satisfied externally

**Execution path**
authority read/reconcile -> emit `OutOfBandStateObserved` -> freeze
`baseline_submission_state = OUT_OF_BAND_UNRECONCILED` -> reconciliation workflow ->
live-progression trust/filing posture capped at `READY_REVIEW` or `NOT_READY` -> no blind
amendment or duplicate filing.

**Technical effect demonstrated**
The engine preserves legal correctness by refusing to fabricate continuity where the legal baseline is
external.

### Embodiment 8 - Authority correction observed after filing

**Purpose**
Show forward-compatible handling of authority-side changes.

**Initial conditions**
- confirmed filed baseline exists
- authority later exposes corrected position

**Execution path**
authority reconciliation detects change -> create `AUTHORITY_CORRECTION` drift cause -> rebuild
parity/trust against corrected baseline -> open review workflow.

**Technical effect demonstrated**
The engine can absorb authority-originated correction without rewriting its own historical lineage.

HMRC's roadmap includes visibility of HMRC corrections made to a return filed through MTD software and
changes in how periodic obligations are marked as met. [4]

### Embodiment 9 - Retention-limited replay and enquiry defense

**Purpose**
Show that explainability survives expiry/erasure.

**Initial conditions**
- older upstream evidence partly expired or pseudonymised
- downstream compliance artifacts still retained

**Execution path**
replay or provenance query against limited graph -> limitation nodes returned -> enquiry pack includes
tombstone/limitation notes rather than silent gaps.

**Technical effect demonstrated**
The engine preserves structural explainability even when direct evidence is no longer fully present.

HMRC's digital-record baseline requires long-lived retention for MTD records, which is why
limitation-aware explainability matters in the first place. [5]

### Embodiment 10 - Analysis-only counterfactual run

**Purpose**
Show separation between exploratory analysis and compliance truth.

**Initial conditions**
- approved compliance manifest exists
- draft/candidate config is being tested

**Execution path**
create child manifest with `execution_mode = ANALYSIS` and `analysis_only = true` -> freeze
`non_compliance_config_refs[]` and `counterfactual_basis` -> recompute/parity/trust under analysis
policy -> keep outputs analysis-only -> cap `automation_level` at `LIMITED`/`BLOCKED` and
`filing_readiness` at `READY_REVIEW`/`NOT_READY`.

**Technical effect demonstrated**
The engine can explore alternative rule/config outcomes without contaminating compliance artifacts.

### Embodiment 11 - Degraded-data review path with no filing

**Purpose**
Show safe non-submission under insufficient evidence.

**Initial conditions**
- critical domain missing or critical evidence erased
- user still wants diagnostic output

**Execution path**
snapshot and compute may proceed in limited form -> data-quality or retention gate blocks filing ->
trust becomes `INSUFFICIENT_DATA` or `RED` -> remediation tasks opened.

**Technical effect demonstrated**
The engine degrades safely into analysis/review mode instead of producing false filing confidence.

### Embodiment 12 - Multi-product compatible chain

**Purpose**
Show one logical engine spanning multiple compatible products.

**Initial conditions**
- bank import from one system
- bookkeeping data from another
- document capture from another
- authority submission through core engine

**Execution path**
multi-product source provenance frozen into one manifest -> canonicalization across origin systems ->
compliance outputs preserve product-of-origin and transformation chain.

**Technical effect demonstrated**
The invention works as a compatibility-governed chain, not only as a monolithic one-product
deployment.

The HMRC-compatible software estate may involve one product or multiple products working together, and
HMRC's end-to-end guidance is framed around software integrating with HMRC APIs within those broader
user journeys. [5]

## 16.3A Objective-family coverage map

The twelve minimum embodiments above cover the engine core, authority progression, amendment,
retention, replay-safe explainability, and multi-product operation. The full scenario corpus is
completed by `test_vectors.md`, which extends those embodiments across the end-to-end system
objective families so the reference layer matches the current blueprint architecture.

- `TV-01..TV-12` extend the core engine, authority, drift, retention, and multi-product embodiments
  into fixture-oriented execution scenarios.
- `TV-13..TV-25` cover low-noise shell continuity, command idempotency, northbound recovery, release,
  cache isolation, and replay-safe lifecycle guarantees.
- `TV-26..TV-31` cover client portal home, uploads, approvals, onboarding, accessibility, and
  contextual same-shell recovery.
- `TV-32..TV-39A` cover collaboration, staff inbox, customer request list, governance read models,
  and responsive same-object continuity.
- `TV-40..TV-50` cover replay exactness, recovery lineage, twin-state comparison, and
  authority-reconciliation edge conditions.
- `TV-51..TV-54` cover nightly-autopilot recovery, digest publication, and operator-ready escalation.
- `TV-55..TV-62` cover trust, filing-readiness invalidation, proof closure, and explanation failure
  posture.
- `TV-63..TV-70` cover amendment freshness, supersession, delayed acknowledgement, duplicate-send
  suppression, and authority-ingress quarantine behavior.

This split is deliberate: the minimum embodiments stay readable enough for enabling disclosure, while
the extended test-vector ranges keep the current portal, governance, staff/operator, and replay
families synchronized with the end-to-end system objective.

## 16.4 Embodiment template for the pack

For consistency, each embodiment should be written in this structure:

### Embodiment X - [Name]

**Purpose**
[One paragraph]

**Actors and authority posture**
[Who is acting, for whom, under what authority]

**Initial conditions**
[List]

**Input/source mix**
[List]

**Execution mode and artifact posture**
- execution_mode
- analysis_only
- counterfactual_basis (if analysis)

**Authorized scope and run kind**
- authorized runtime_scope[]
- run kind

**Frozen context**
- config profile
- provider profile
- business partitions
- baseline_submission_state
- comparison_requirement (if parity/authority comparison applies)
- authority state assumptions

**Execution sequence**

1. ...
2. ...
3. ...

**Expected gate outcomes**
- gate_code -> decision
- gate_code -> decision

**Expected artifacts**
[List]

**Expected end state**
[List]

**Failure branches / alternative branches**
[List]

**Technical effect demonstrated**
[One paragraph]

## 16.5 Example fixture rule

Every embodiment SHOULD have:

- one narrative description
- one fixture bundle
- one expected artifact list
- one expected gate decision list
- one expected provenance query output
- one expected audit timeline skeleton

That lets the same embodiment serve:

- patent/disclosure support
- product specification
- QA/UAT
- regression testing

## 16.6 One-sentence summary

The embodiments and examples section turns the engine from a strong abstract architecture into an
enabling, testable, patent-supportive disclosure by showing exactly how the system behaves in its main
happy paths, edge cases, and authority-bound legal transitions.

[1]: https://www.wipo.int/edocs/pubdocs/en/wipo-pub-867-23-en-wipo-patent-drafting-manual.pdf?utm_source=chatgpt.com
[2]: https://developer.service.hmrc.gov.uk/api-documentation/docs/api/service/obligations-api/3.0?utm_source=chatgpt.com
[3]: https://developer.service.hmrc.gov.uk/guides/income-tax-mtd-end-to-end-service-guide/documentation/make-updates-at-tax-year-end.html?utm_source=chatgpt.com
[4]: https://developer.service.hmrc.gov.uk/roadmaps/mtd-itsa-vendors-roadmap/apis.html?utm_source=chatgpt.com
[5]: https://developer.service.hmrc.gov.uk/guides/income-tax-mtd-end-to-end-service-guide/?utm_source=chatgpt.com
