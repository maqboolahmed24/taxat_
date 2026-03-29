# Invention Boundary and System Boundary

## 1) Exact invention boundary

Use this as a drop-in section.

### Exact invention boundary

The invention is a computer-implemented decision engine for regulated reporting that produces a
**defensible, replayable, evidence-linked decision bundle** by executing a manifest-frozen sequence over
multi-source data, policy gates, authority comparisons, trust synthesis, provenance construction,
and authority-acknowledged state transitions.

In the preferred embodiment reflected in the current specification, the regulated reporting context is
**tax reporting**, including recurring in-year obligations, end-of-year completion, optional submission to
an external authority, authority acknowledgement capture, post-submission drift assessment, and amendment
recommendation. The invention is not limited to tax, but tax is the principal enabling embodiment in the
present disclosure.

#### The invention begins where

the system receives an authenticated request to evaluate or advance a regulated reporting scope for a
specific tenant, client, period, requested scope, and execution mode, and either creates or reuses a
`RunManifest` whose frozen execution envelope is immutable once freeze/seal rules are satisfied.

#### The invention ends where

the system returns a `DecisionBundle` and records the resulting compliance artifacts, audit events,
authority acknowledgement state, workflow recommendations, and retention metadata required to explain,
replay, and govern the decision.

### Positive boundary: what is inside the invention

The invention specifically covers the coordinated technical method that:

1. freezes execution context into a `RunManifest` with an immutable execution envelope, including client scope, period, mode,
   code build, and configuration references;
2. collects and normalizes multi-source evidence into a canonical `Snapshot`;
3. measures validation quality and completeness explicitly, instead of allowing silent degradation;
4. computes regulated-reporting outcomes from the canonical snapshot under frozen rule/config versions;
5. evaluates parity between internally computed results and authority-available values or previously
   submitted values;
6. synthesizes trust from quality, completeness, parity, risk, defence quality, and approved overrides
   into an actionable posture that governs automation and filing readiness;
7. constructs an evidence-linked provenance graph that can trace any material output back to canonical
   facts, original evidence, transformation steps, rule/config versions, overrides, and authority
   acknowledgements;
8. produces a cross-source twin representation that exposes deltas, readiness, and unresolved conflicts;
9. generates workflow actions from trust, parity, risk, and data-health conditions;
10. optionally builds a filing packet and submits it through a controlled authority channel;
11. treats authority acknowledgement as the legal state trigger, rather than assuming submission success
    from internal intent;
12. detects post-decision drift and recommends review or amendment when materially justified; and
13. applies retention, expiry, erasure, and limitation propagation across all generated artifacts.

### The inventive center

The inventive center is not any one sub-step in isolation. It is the combination and ordered interaction
of the following elements as one coherent engine:

- manifest-envelope freezing,
- canonical evidence snapshotting,
- explicit gate evaluation,
- parity-aware trust synthesis,
- evidence-linked provenance graphing,
- authority-acknowledged state handling,
- and drift-aware post-decision governance.

That combination creates a technical result the current pack is already aiming at: a replayable decision
state in which every material output is reproducible, every automation step is policy-bounded, every
filing state is authority-grounded, and every review outcome is explainable back to evidence.

### Negative boundary: what is not the invention

The invention does not claim, by itself:

- tax law, filing law, or statutory thresholds as abstract subject matter;
- generic ETL, generic workflow, generic OCR, generic graph databases, or generic access control in
  isolation;
- the mere use of OAuth, APIs, or tokens;
- HMRC's own APIs, HMRC's own calculation services, or HMRC online-service journeys;
- user interface styling, dashboards, or front-end layout as such;
- standalone forecasting models disconnected from manifest, trust, and provenance governance;
- or a simple connector product that moves data from one source to another.

The invention also does not reside in "automation" alone. It resides in governed automation where
automation is allowed, blocked, or downgraded based on frozen inputs, explicit policy gates, authority
comparison, and auditable override semantics.

### Practical technical effect

The technical effect of the invention is that the engine can produce a decision that is:

- replayable under the same frozen manifest envelope or an explicit replay child manifest using the same config state,
- traceable from output to evidence,
- bounded by explicit policy gates,
- separated by execution mode so exploratory analysis cannot contaminate compliance artifacts,
- grounded in authority acknowledgement for legal state,
- and governed after the fact through drift detection and retention-aware provenance.

### Preferred embodiment boundary

For the current pack, the preferred embodiment should be stated as:

> a multi-tenant evidence-linked decision engine for recurring tax compliance workflows in which
> customers or agents maintain digital records, evaluate in-year and end-of-year positions,
> optionally submit filings through software, receive authority acknowledgements, and later assess
> drift or amendment eligibility.

That wording stays broad enough for patent strategy, while still being fully supported by the documents
in this pack.

---

## 2) System boundary: what happens inside the engine, and what stays outside

Use this as a second drop-in section.

### System boundary

The system is divided into three zones:

1. Core engine zone - the inventive decision engine itself
2. Controlled edge zone - platform services the engine depends on but does not itself invent
3. External authority / external actor zone - systems and actions outside the engine's control

The engine owns the decisioning spine. It does not own every adjacent product function.

---

### A. What happens inside the engine

The following functions are inside the engine boundary:

#### 1. Run initiation and authority to act

- accept an authenticated request context;
- evaluate whether the requested action is allowed for the given tenant, client, period, scope, mode,
  and run kind;
- create or reuse a `RunManifest`.

#### 2. Config freeze and execution envelope

- resolve rule versions, policy versions, thresholds, materiality settings, connector profile refs,
  and retention profile refs;
- bind them immutably to the run.

#### 3. Evidence acquisition as engine-controlled intake

The engine may instruct the controlled edge to fetch external data, but the engine owns:

- the decision to request data,
- the mapping of returned payload references into run scope,
- and the rule that no fetched data becomes canonical until it is normalized into the `Snapshot`.

#### 4. Canonicalization and data-quality formation

- normalize raw payloads into canonical facts and evidence items;
- validate them;
- compute completeness and uncertainty;
- persist the `Snapshot`.

#### 5. Outcome computation

- compute regulated-reporting outcomes from the canonical snapshot;
- optionally produce forecast artifacts in analysis-safe separation.

#### 6. Risk, parity, and trust

- generate risk signals;
- compare internal results with authority-available values and prior submissions;
- synthesize `TrustSummary` and filing readiness;
- evaluate gate decisions and override usage.

#### 7. Provenance and twin formation

- build the `EvidenceGraph`;
- score graph quality;
- build the `TwinView`;
- bind outputs to manifest and provenance refs.

#### 8. Workflow planning

- generate or update workflow items from trust, parity, risk, data quality, and drift.

#### 9. Filing packet formation

- construct a `FilingPacket`;
- declare basis, disclaimers, and manifest linkage.

#### 10. Submission state handling

The engine may invoke a controlled authority submission channel, but inside the engine boundary it owns:

- submission intent,
- request hash binding,
- packet-to-manifest linkage,
- `SubmissionRecord` persistence,
- and acknowledgement-state interpretation (`CONFIRMED`, `PENDING`, `REJECTED`, `UNKNOWN`).

#### 11. Drift and amendment recommendation

- compare later evidence or later runs against the filing baseline;
- classify drift;
- recommend review or amendment.

#### 12. Retention and erasure governance

- assign retention tags;
- enforce expiry semantics;
- propagate limitation notes when upstream evidence is expired;
- record erasure/pseudonymisation outcomes.

---

### B. What is outside the core engine but still inside the broader product

These are platform-adjacent services, not part of the inventive engine itself:

- user interface rendering;
- staff console, client portal, and admin console;
- northbound product API gateway, browser/session management, native-desktop session restoration, and
  live-experience stream transport;
- token vault and OAuth session maintenance;
- connector worker execution and retry orchestration;
- OCR or document extraction runtime;
- notification delivery;
- object storage, database, queue, cache, observability stack;
- schema migration control plane, release admission, canary/rollback orchestration;
- backup/restore orchestration, disaster-recovery execution, and key/secret lifecycle services;
- CI/CD, environment management, secrets management;
- release/version packaging.

These are necessary to operate the product, but they are not the engine's inventive heart. The engine
calls them or depends on them through interfaces.

One especially important example is OAuth token handling for authority APIs. HMRC's user-restricted model
allows software to hold multiple OAuth 2.0 tokens for an agent and requires the software to use the
correct token for the correct client; that token management belongs in the controlled integration layer,
not in the inventive core itself. [1]

---

### C. What stays outside the engine altogether

These are outside the engine and remain either HMRC-owned, provider-owned, or user/human-owned:

#### 1. HMRC sign-up and agent authorisation setup

The engine does not sign users up to MTD. HMRC says sign-up by API is ruled out for security reasons,
and RPA for client sign-up is strictly prohibited. Agent sign-up and authorisation setup occur through
HMRC and the agent services account regime, not through the engine. [2]

#### 2. HMRC-online-services-only tasks

The engine must not pretend to own tasks that HMRC currently reserves to HMRC online services. Current
HMRC guidance shows that tasks such as changing contact preference, changing payments on account, making
payments, claiming refunds, setting up time-to-pay or budget payment plans, adding some business details,
and ceasing businesses sit wholly or partly in HMRC online services rather than in software. The software
may guide the journey and should hand the user over through the default system browser or an
equivalent system-managed external session rather than an in-app full-trust web surface. [3]

#### 3. Authority-owned legal status

The engine does not own the legal truth of submission status. HMRC's acknowledgement and downstream
authority state are the legal reference points. The engine records, interprets, and presents those states;
it does not replace them. That is already consistent with your invariant "authority precedence."

#### 4. HMRC's own calculation service

Your engine may compute its own result and compare it with authority values, but HMRC explicitly provides
tax calculations directly through software integrations, and the calculation retrieved by software is the
same one HMRC uses. So the engine may consume and compare HMRC calculations, but it is not the authority
calculation service itself. [4]

#### 5. Human judgment outside override protocol

Purely manual professional advice, off-system reviewer conversations, and undocumented decisions are
outside the engine. They become part of the engine only when entered through a governed override,
workflow resolution, or audit event.

---

### D. Boundary rules the spec should state explicitly

Add these rules exactly.

#### Boundary Rule 1 - The engine owns decisions, not identity issuance

Identity proofing, agent-service-account creation, and primary sign-up are outside the engine.

#### Boundary Rule 2 - The engine owns canonicalization, not raw-source truth

External payloads are inputs, not canonical facts, until transformed into a `Snapshot`.

#### Boundary Rule 3 - The engine owns filing intent and packet formation, not authority acceptance

A filing is not legally "done" because the engine built a packet or sent a request. It becomes legally
acknowledged only when the authority state supports that conclusion.

#### Boundary Rule 4 - The engine owns parity and trust, not HMRC's own calculations

Authority calculations are authoritative comparison inputs, not replaceable by internal optimism. [4]

#### Boundary Rule 5 - The engine owns amendment recommendation, not unrestricted amendment rights

HMRC's end-of-year journey requires that a final declaration has first been completed through software,
that amendments fall within the permitted amendment window, and that an intent-to-amend path plus
validations are followed. The engine therefore decides "recommend amendment / eligible to attempt
amendment," but amendment acceptance is authority-controlled. [5]

#### Boundary Rule 6 - The engine may guide users to HMRC online services, but does not absorb HMRC-only tasks

That handoff should be treated as a formal boundary crossing. [3]

#### Boundary Rule 7 - The engine owns evidence-linked explainability for all states it creates

For every state created inside the boundary, the engine must be able to explain the state from manifest
to evidence, config, override, and authority acknowledgement.

---

### E. One-sentence boundary summary

Use this sentence in the spec:

> The engine boundary covers manifest-frozen intake, canonicalization, computation, parity evaluation,
> trust synthesis, provenance construction, workflow planning, filing-packet generation,
> submission-state recording, drift detection, and retention governance; it excludes authority sign-up,
> HMRC-online-services-only tasks, external identity issuance, provider-specific credential custody
> mechanics, and the authority's own legal acceptance and calculation services.

This is the cleanest version to anchor the rest of your rewrite.

[1]: https://developer.service.hmrc.gov.uk/api-documentation/docs/authorisation/user-restricted-endpoints
[2]: https://developer.service.hmrc.gov.uk/guides/income-tax-mtd-end-to-end-service-guide/documentation/prepare-for-mtd.html
[3]: https://developer.service.hmrc.gov.uk/guides/income-tax-mtd-end-to-end-service-guide/documentation/tasks-outside-mtd-software.html
[4]: https://developer.service.hmrc.gov.uk/guides/income-tax-mtd-end-to-end-service-guide/documentation/tax-calculations.html
[5]: https://developer.service.hmrc.gov.uk/guides/income-tax-mtd-end-to-end-service-guide/documentation/make-updates-at-tax-year-end.html
