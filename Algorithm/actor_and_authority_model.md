# Actor and Authority Model

## Actor and authority model

The engine SHALL model action, consent, delegation, policy, and legal acknowledgement as separate
concerns. A person may be allowed by tenant policy to operate the product, but still not be allowed
to act for a given client. Likewise, software may hold a valid authority token, but that token may
still be invalid for the specific client in scope. The actor model therefore distinguishes: who is
acting, for whom they are acting, under what delegation basis they are acting, what internal policy
permits, and which external authority ultimately defines legal state.

## 3.1 Purpose

The purpose of the actor and authority model is to ensure that every operation executed by the engine
can answer all five of the following questions deterministically:

1. **Who initiated the operation?**
2. **On whose behalf was the operation initiated?**
3. **What internal tenant policy permits or blocks the operation?**
4. **What external authorisation or authority-link permits authority-integrated actions?**
5. **Which external system, if any, defines the legal truth of the resulting state?**

No engine operation SHALL be executed without a fully populated actor-and-authority context.

## 3.2 Core concepts

**Actor**
Any human, machine, or external system that can cause, approve, acknowledge, reject, or materially
influence a run.

**Principal**
The authenticated active actor bound to a session, service identity, or replay context. A principal is
the entity evaluated by policy at run time.

**Reporting Subject**
The legal person or entity for whom the reporting outcome exists. In the current tax embodiment, this
is the client/taxpayer.

**Delegate**
A principal acting on behalf of the reporting subject under an explicit delegation basis.

**Authority of Record**
The external system whose acknowledgement or returned state defines legal submission status. In the
current embodiment, this is HMRC.

**Delegation Grant**
A persisted record stating that a given delegate may act for a given reporting subject in a defined
scope.

**Authority Link**
A persisted record stating that software has been granted authority by the relevant external actor to
call the authority APIs in a defined scope.

## 3.3 Actor classes

The engine SHALL support the following actor classes.

### A. Reporting-subject actors

These actors are the legal or business subjects of the reporting obligation.

- `SUBJECT_SELF` - the reporting subject acting directly
- `SUBJECT_REPRESENTATIVE` - a human directly representing the subject within the same legal boundary
- `CLIENT_USER` - a legacy umbrella for a portal user associated with the client record; runtime policy SHOULD resolve the session to `CLIENT_VIEWER`, `CLIENT_CONTRIBUTOR`, or `CLIENT_SIGNATORY` before evaluating client-facing actions
- `CLIENT_VIEWER` - a portal user who may view status, deadlines, completed documents, and completed approvals
- `CLIENT_CONTRIBUTOR` - a portal user who may upload documents, answer questionnaires, and complete onboarding steps, but may not legally sign
- `CLIENT_SIGNATORY` - a portal user who may acknowledge declarations and execute sign-off after required step-up

### B. Tenant-side human operators

These actors work inside the tenant boundary.

- `TENANT_ADMIN`
- `PREPARER`
- `REVIEWER`
- `APPROVER`
- `AUDITOR`
- `SUPPORT_OPERATOR`

A single human may hold more than one role, but every session SHALL resolve to one effective role set
for policy evaluation.

### C. Service principals

These are non-human principals authenticated as platform services.

- `SCHEDULER_SERVICE`
- `CONNECTOR_SERVICE`
- `NORMALIZER_SERVICE`
- `COMPUTE_SERVICE`
- `GRAPH_SERVICE`
- `FILING_SERVICE`
- `REPLAY_SERVICE`
- `RETENTION_SERVICE`
- `NOTIFICATION_SERVICE`

A service principal SHALL never inherit human authority implicitly. Any scope it acts in SHALL be
explicitly assigned.

### D. External actors

These actors are outside the tenant boundary.

- `AUTHORITY_SYSTEM`
- `EXTERNAL_PROVIDER`
- `OUT_OF_BAND_SOFTWARE`
- `CUSTOMER_BANK`
- `DOCUMENT_SOURCE_SYSTEM`

These actors are not "users" of the product, but their outputs may create or alter legal, evidential,
or operational state.

## 3.4 Authority layers

The engine SHALL recognize five distinct authority layers.

### Layer 1 - Legal subject authority

The reporting subject's own right to submit, declare, or authorise action concerning their reporting
position.

### Layer 2 - Delegated client authority

The authority granted by the reporting subject to an agent or software-mediated delegate to act on
their behalf. In the current HMRC embodiment, agents need an agent services account and client
authorisation, and software authorisation is granted through the HMRC OAuth flow. [1]

### Layer 3 - Tenant operational authority

The internal permission model that determines what a principal inside the tenant may view, compute,
approve, export, erase, or submit.

### Layer 4 - Exceptional authority

Human override authority used to approve bounded exceptions such as parity-gate overrides,
filing-gate overrides, or retention/legal-hold decisions.

### Layer 5 - Authority-of-record precedence

The external authority's acknowledgement or returned status that defines legal submission truth.
Internal intent, internal UI state, or workflow state SHALL never outrank this layer.

## 3.5 Actor-to-authority relationships

The engine SHALL model the following relationships explicitly:

- `ACTS_FOR(principal, reporting_subject)`
- `BELONGS_TO(principal, tenant)`
- `AUTHORISED_BY_CLIENT(delegate, reporting_subject, scope)`
- `AUTHORISED_BY_AUTHORITY(software_or_actor, authority_scope)`
- `SIGNS_FOR(principal, reporting_subject, declaration_scope)`
- `APPROVES(approver, override_or_release)`
- `ACKNOWLEDGES(authority_system, submission_or_status)`
- `EMITS(service_principal, artifact_or_event)`

These relationships SHALL not be inferred solely from UI navigation or token presence. They must exist
as explicit persisted facts or policy-resolved session facts.

## 3.6 Principal context schema

Every engine run SHALL carry a `PrincipalContext` with at least:

- `principal_id`
- `principal_type in {HUMAN, SERVICE, EXTERNAL}`
- `effective_role_set[]`
- `tenant_id`
- `client_scope[]`
- `requested_scope[]`
- `authn_level in {BASIC, MFA, STEP_UP}`
- `subject_identity_assurance_level in {UNVERIFIED, VERIFIED, STEP_UP_VERIFIED}`
- `session_id`
- `service_identity_ref` (for services)
- `delegation_basis in {SELF_ACTING, CLIENT_GRANTED, SELF_ASSESSMENT_IMPORTED, DIGITAL_HANDSHAKE, TENANT_INTERNAL, SYSTEM_ASSIGNED}`
- `authority_link_refs[]`
- `masking_scope`
- `approval_capabilities[]`
- `client_portal_capabilities[]`
- `run_kind_capabilities[]`

A `PrincipalContext` SHALL be treated as incomplete unless both internal policy attributes and relevant
external-authority attributes are available.
Any `CLIENT_SIGNATORY` action that creates declaration or sign-off truth SHALL require the session to satisfy the frozen signatory policy, including `subject_identity_assurance_level = STEP_UP_VERIFIED` whenever the current approval pack demands step-up.

## 3.7 Resource classes

Policy decisions SHALL be made against explicit resource types, including:

- `Client`
- `ConnectorBinding`
- `Snapshot`
- `EvidenceItem`
- `CanonicalFact`
- `ComputeResult`
- `RiskReport`
- `ParityResult`
- `TrustSummary`
- `EvidenceGraph`
- `TwinView`
- `WorkflowItem`
- `FilingPacket`
- `SubmissionRecord`
- `Override`
- `ConfigChangeRequest`
- `RetentionAction`

## 3.8 Action families

The engine SHALL distinguish actions by operational significance, not only by CRUD verbs. At minimum
it SHALL support:

- `VIEW_MASKED`
- `VIEW_FULL`
- `EXPORT`
- `COLLECT_SOURCE_DATA`
- `NORMALISE_AND_CANONICALISE`
- `COMPUTE`
- `FORECAST`
- `EVALUATE_PARITY`
- `SYNTHESISE_TRUST`
- `BUILD_GRAPH`
- `VIEW_TWIN`
- `PLAN_WORKFLOW`
- `REQUEST_CLIENT_INFO`
- `VIEW_CLIENT_PORTAL_STATUS`
- `UPLOAD_CLIENT_DOCUMENT`
- `COMPLETE_ONBOARDING_STEP`
- `ACKNOWLEDGE_CLIENT_DECLARATION`
- `SIGN_CLIENT_DECLARATION`
- `REQUEST_PORTAL_ASSISTANCE`
- `PREPARE_FILING`
- `SUBMIT_TO_AUTHORITY`
- `ACKNOWLEDGE_OR_SUPPRESS_FLAG`
- `CREATE_OVERRIDE`
- `APPROVE_OVERRIDE`
- `REPLAY_RUN`
- `EXECUTE_RETENTION`
- `EXECUTE_ERASURE`
- `APPROVE_CONFIG`
- `LINK_AUTHORITY_SOFTWARE`
- `UNLINK_AUTHORITY_SOFTWARE`

## 3.9 Policy decision model

The engine SHALL evaluate access using an ABAC-style contract:

`AUTHORIZE(subject_attributes, object_attributes, action_attributes, environment_attributes)`

The engine SHALL allow the following decision outputs:

- `ALLOW`
- `ALLOW_MASKED`
- `REQUIRE_STEP_UP`
- `REQUIRE_APPROVAL`
- `DENY`

Every result SHALL include:

- `decision`
- `reason_codes[]`
- `effective_scope[]`
- `masking_rules[]`
- `required_approvals[]`
- `required_authn_level`

The following enforcement rules are mandatory:

- `effective_scope[]` SHALL be the canonical ordered scope-token array the engine is permitted to execute.
- `effective_scope[]` SHALL be equal to, or a strict subset of, the originally requested scope.
- `effective_scope[]` SHALL never add a token that was not present in the originally requested scope.
- If `decision = ALLOW_MASKED`, the engine SHALL execute only `effective_scope[]`. `masking_rules[]`
  SHALL apply only to downstream human/view/export projections, including graph/twin/enquiry/export
  renders. `masking_rules[]` SHALL NOT alter canonical source collection, canonical facts, compute,
  filing-packet bytes, or authority-request canonicalization/hashing. Where masked access cannot
  legally support a filing-capable or amendment-capable token, `AUTHORIZE(...)` SHALL remove that
  token from `effective_scope[]` or return a blocking access decision.
- If a requested filing-capable token cannot legally be executed under the required masking,
  that token SHALL be removed from `effective_scope[]` or the result SHALL be a blocking access decision.
- Downstream control flow SHALL branch from `effective_scope[]`, not from the raw requested scope,
  except where the raw requested scope is preserved purely for audit.

## 3.10 Delegation rules

The following delegation rules SHALL apply.

### Rule A - Self-acting rule

If `delegation_basis = SELF_ACTING`, the reporting subject may act within the scope allowed by tenant
policy and authority link state.

### Rule B - Agent-acting rule

If a tenant-side principal acts for a client, the engine SHALL require a valid `DelegationGrant` for
that `(tenant_id, client_id, authority_scope)`.

### Rule C - Imported authorisation rule

The engine MAY record a delegation basis derived from pre-existing authority relationships, including
imported Self Assessment authorisations or digital-handshake-derived authorisations, but it SHALL still
persist the basis type explicitly rather than treating delegation as implicit. HMRC's current agent
journey explicitly recognizes existing Self Assessment authorisations, digital handshakes, and
agent-services-account-based authorisations as live ways an agent relationship can exist. [3]

### Rule D - Authority-link rule

Authority-integrated operations SHALL require a valid `AuthorityLink` in addition to internal
permission. A human having tenant permission is not sufficient by itself for authority calls.

### Rule E - Token-to-client binding rule

Where the authority uses user-restricted OAuth tokens, the engine SHALL bind token use to the correct
reporting subject and scope. In the current HMRC embodiment, software may hold multiple OAuth tokens
for an agent, but must use the correct token for each client. [4]

### Rule F - Fail-closed rule

If delegation basis, authority link, or token/client binding is missing or ambiguous, the engine SHALL
fail closed for authority-facing operations.

## 3.11 Non-delegable and step-up actions

The engine SHALL treat the following as non-routine actions, requiring `REQUIRE_STEP_UP` or
`REQUIRE_APPROVAL`:

- linking or re-linking software to the authority
- approving an override that changes filing readiness or parity outcome
- submitting a filing or amendment
- marking an externally unverified submission as known out-of-band
- exporting full evidence packs or unmasked provenance
- approving config versions for compliance mode
- executing erasure, legal-hold release, or retention exceptions

In the HMRC grant-authority journey, the user passes through sign-in, 2-step verification where
applicable, and identity checks where applicable before HMRC issues an OAuth token. That supports
treating authority-linking and submission-adjacent actions as step-up-worthy in the engine design. [1]

## 3.12 Authority precedence rules

The following precedence rules SHALL apply.

1. `AUTHORITY_SYSTEM` acknowledgements define legal submission state.
2. No tenant actor may set `SubmissionRecord.status = CONFIRMED` without an authority-grounded basis.
3. Overrides may change engine interpretation or gate outcomes, but may not fabricate authority acknowledgement.
4. A workflow action may recommend filing, but cannot itself change legal submission state.
5. A `SubmissionRecord` may be annotated as `UNKNOWN` or `OUT_OF_BAND`, but such annotation does not replace authority truth.

## 3.13 Machine-actor rules

Service principals SHALL be governed as first-class actors, not hidden implementation detail.

- Every service action SHALL carry a `service_identity_ref`.
- Every service SHALL be scoped to one tenant or an explicitly approved multi-tenant operational scope.
- Scheduled runs SHALL still execute under `PrincipalContext`, not under "system bypass".
- Service principals SHALL not approve their own overrides.
- Service principals SHALL not invent delegation on behalf of a client.

## 3.14 Actor invariants

The actor model SHALL satisfy these invariants:

- no action without `PrincipalContext`
- no authority call without both internal permission and authority link
- no client-affecting action without explicit client scope
- no compliance submission without step-up or approved equivalent
- no override without approver identity, rationale, scope, and expiry
- no legal-state mutation without authority-of-record basis

## 3.15 Frontend and governance-console rendering contract

Product interfaces that expose tenant governance, access policy, delegation, authority linking,
retention, or audit SHALL render the actor model as separate visible dimensions rather than collapsing
everything into one generic `permission` state.

Minimum frontend rules:

- role labels are explanatory only; visible action legality SHALL bind to structured `AUTHORIZE(...)`
  or policy-simulation results, not to string-matching on role names
- the UI SHALL distinguish internal tenant permission, client delegation, external `AuthorityLink`,
  current authentication posture, and authority-of-record outcome whenever those dimensions materially
  affect the action being reviewed
- `REQUIRE_STEP_UP` SHALL render as an active escalation path with stated scope and reason, not as a
  silently disabled button
- `REQUIRE_APPROVAL` SHALL render as a staged change or approval flow that exposes required approver
  scope, rationale, and expiry expectations
- `ALLOW_MASKED` SHALL show projection/export limitations explicitly without implying that source facts
  are missing from canonical computation
- admin/governance views SHALL distinguish human principals, service principals, and external actors in
  directories, filters, and audit views
- authority-link inventory surfaces SHALL bind each link to client scope, acting party, authority
  scope, provider environment, and token/client binding health so operators do not confuse internal
  access with external authority correctness
- append-only audit history for privilege, delegation, authority-link, retention, and override changes
  SHALL remain visible from the same workflow rather than forcing operators to reconstruct causality in
  a separate logging tool

No product surface SHALL imply that tenant permission alone authorizes authority-facing action, or
that authority possession alone authorizes tenant-side policy action.
The user must be able to tell which layer is satisfied, which is missing, and what step can legally
advance the chain.

## 3.16 One-sentence summary

The actor and authority model separates who is acting, for whom they are acting, what policy allows,
what delegation authorises, and which external system defines legal truth, so that every engine action
is both policy-valid and authority-correct.

The current tax embodiment should be read in light of HMRC's digital-record model: compatible software
must create, store, and correct digital records; required digital record details include amount, date,
and category; separate businesses need separate records and separate quarterly updates; quarterly
updates are category totals created from digital records every 3 months and do not require accounting
or tax adjustments before submission; records must generally be kept at least 5 years after the
31 January deadline; and the software estate may be one product or multiple products working together,
including bank imports, scanned receipts/invoices, manual entry, or bridging tools. [5]

[1]: https://developer.service.hmrc.gov.uk/api-documentation/docs/authorisation/user-restricted-endpoints
[2]: https://csrc.nist.gov/files/pubs/sp/800/162/final/docs/nist.sp.800-162-201401.pdf
[3]: https://www.gov.uk/guidance/add-your-client-authorisations-for-making-tax-digital-for-income-tax?utm_source=chatgpt.com
[4]: https://developer.service.hmrc.gov.uk/api-documentation/docs/authorisation/user-restricted-endpoints
[5]: https://www.gov.uk/guidance/use-making-tax-digital-for-income-tax/create-digital-records
