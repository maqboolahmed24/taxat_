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

**Access Binding**
A frozen fingerprint of the evaluated authorization posture for a specific command or run context,
including effective scope, policy snapshot, delegation/link snapshots, and partition coverage.

**Exceptional Authority Grant**
A one-time, incident-linked approval allowing a specifically bounded otherwise-blocked action. It may
change internal control posture, but SHALL NOT fabricate authority-of-record truth.

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

### Minimum persisted delegation and authority-edge facts

`DelegationGrant` SHALL carry at minimum:

- `delegation_grant_id`
- `tenant_id`
- `reporting_subject_ref`
- `delegate_ref` or `delegate_class`
- `authority_scope_refs[]`
- `partition_scope_refs[]` where the delegated right is narrower than the full client envelope
- `basis_type`
- `basis_evidence_refs[]`
- `effective_from`
- `expires_at`
- `revoked_at`
- `superseded_by_grant_id`
- `lifecycle_state`
- `last_validated_at`

`DelegationGrant.basis_type` is a client-authority concept only. It SHALL represent
`CLIENT_GRANTED`, `SELF_ASSESSMENT_IMPORTED`, or `DIGITAL_HANDSHAKE`; internal tenant or service
authority SHALL remain in `PrincipalContext` / `AuthorizationDecision` and SHALL NOT be serialized
as a client delegation grant.

`AuthorityLink` SHALL carry at minimum:

- `authority_link_id`
- `tenant_id`
- `client_id`
- `authority_scope`
- `provider_environment`
- `authorised_party_ref`
- `delegation_grant_ref` where delegated client authority is required
- `partition_scope_refs[]` where the authority edge is not client-wide
- `token_binding_profile_ref`
- `validated_at`
- `expires_at`
- `revoked_at`
- `lifecycle_state`
- `binding_health`
- `source_evidence_refs[]`

Neither record is valid for live authority mutation if it is expired, revoked, superseded, outside
its declared partition scope, or lacks current validation required by the frozen policy profile.
Imported or handshake-derived authority evidence SHALL remain explicit and time-bounded; it SHALL NOT
quietly become evergreen delegation.
Internal tenant permission SHALL never be treated as a substitute for missing delegated client
authority or for a missing/stale authority link.

`ConnectorBinding`, `DelegationGrant`, `AuthorityLink`, and `ExceptionalAuthorityGrant` SHALL
validate against `schemas/connector_binding.schema.json`, `schemas/delegation_grant.schema.json`,
`schemas/authority_link.schema.json`, and `schemas/exceptional_authority_grant.schema.json` so
provider token lineage, delegated scope coverage, imported-evidence freshness, and bounded
exceptional authority remain explicit rather than reconstructed from ambient session state.

## 3.6 Principal context schema

Every engine run SHALL carry a `PrincipalContext` with at least:

- `principal_id`
- `principal_type in {HUMAN, SERVICE, EXTERNAL}`
- `effective_role_set[]`
- `tenant_id`
- `client_scope[]`
- `requested_scope[]`
- `partition_scope_refs[]`
- `authn_level in {BASIC, MFA, STEP_UP}`
- `subject_identity_assurance_level in {UNVERIFIED, VERIFIED, STEP_UP_VERIFIED}`
- `session_id`
- `service_identity_ref` (for services)
- `delegation_basis in {SELF_ACTING, CLIENT_GRANTED, SELF_ASSESSMENT_IMPORTED, DIGITAL_HANDSHAKE, TENANT_INTERNAL, SYSTEM_ASSIGNED}`
- `authorization_evaluated_at`
- `policy_snapshot_hash`
- `access_binding_hash`
- `delegation_snapshot_refs[]`
- `authority_link_refs[]`
- `authority_link_snapshot_refs[]`
- `masking_scope`
- `approval_capabilities[]`
- `client_portal_capabilities[]`
- `run_kind_capabilities[]`

A `PrincipalContext` SHALL be treated as incomplete unless both internal policy attributes and relevant
external-authority attributes are available.
Any `CLIENT_SIGNATORY` action that creates declaration or sign-off truth SHALL require the session to satisfy the frozen signatory policy, including `subject_identity_assurance_level = STEP_UP_VERIFIED` whenever the current approval pack demands step-up.
For replay, recovery, or continuation-safe child creation, the original `access_binding_hash` and
referenced snapshot refs SHALL remain frozen in lineage.
A later live-capable command MAY re-evaluate authorization, but it SHALL produce a new
`access_binding_hash` rather than silently mutating the previously frozen authorization context.
Service-flavored `PrincipalContext` artifacts SHALL keep `authn_level = BASIC`,
`subject_identity_assurance_level = UNVERIFIED`, `delegation_basis in {TENANT_INTERNAL, SYSTEM_ASSIGNED}`,
and empty human-facing approval or client-portal capability sets.
Client-acting delegation bases (`SELF_ACTING`, `CLIENT_GRANTED`, `SELF_ASSESSMENT_IMPORTED`,
`DIGITAL_HANDSHAKE`) SHALL retain non-empty `client_scope[]`, and any frozen `authority_link_refs[]`
used by authorization SHALL carry matching `authority_link_snapshot_refs[]` so replay does not depend
on live link lookup.

`PrincipalContext` SHALL validate against `schemas/principal_context.schema.json` so service versus
human identity posture, assurance level, and delegation basis remain machine-readable across
browser, native, automation, replay, and recovery entry points.

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
- `effective_partition_scope_refs[]`
- `masking_rules[]`
- `required_approvals[]`
- `required_authn_level`
- `policy_snapshot_hash`
- `access_binding_hash`
- `dependency_topology_hash` for governance mutation-capable actions; else `null`
- `simulation_basis_hash` for governance mutation-capable actions; else `null`
- `delegation_snapshot_refs[]`
- `authority_link_snapshot_refs[]`
- `bounded_safe_mutation` for governance mutation-capable actions; else `null`
- `approval_requirement` for governance mutation-capable actions; else `null`

For each canonical execution tuple `u = (tau, pi)` over requested scope token `tau` and requested
partition token `pi` (or `GLOBAL` when the action family is not partition-bound), the engine SHALL
compute the bounded decision factors described in `modules.md::AUTHORIZE(...)` and SHALL derive the
final access posture from the tuple-level quantities `direct_allow_u`, `step_up_path_u`,
`approval_path_u`, and `blocked_u`.

The following enforcement rules are mandatory:

- `effective_scope[]` SHALL be the canonical ordered scope-token array the engine is permitted to execute.
- `effective_scope[]` SHALL be equal to, or a strict subset of, the originally requested scope.
- `effective_scope[]` SHALL never add a token that was not present in the originally requested scope.
- the canonical order for persisted scope arrays is the single reporting-scope token first, followed
  by any action tokens in frozen scope-grammar order
- `effective_partition_scope_refs[]` SHALL be the canonical sorted partition-scope set the engine is
  permitted to execute, and it SHALL be equal to, or a strict subset of, the originally requested
  partition coverage.
- `access_binding_hash` SHALL bind the decision, `effective_scope[]`, `effective_partition_scope_refs[]`,
  `policy_snapshot_hash`, `required_authn_level`, canonical `required_approvals[]`, `masking_rules[]`,
  and referenced delegation/authority-link snapshots so audit, replay, and stale-view protection can
  prove the exact authorization basis used.
- where the requested action is a governance/control-plane mutation, `access_binding_hash` SHALL also
  bind the current mutation-hazard basis (`simulation_basis_hash` or equivalent current topology token)
  so a command cannot legally reuse an authorization result after the blast radius or approval
  computation has been superseded.
- governance mutation previews SHALL additionally materialize one
  `GovernanceMutationBasisContract{ policy_snapshot_hash, access_binding_hash, dependency_topology_hash, simulation_basis_hash, commit_authority_posture, approval_requirement, bounded_safe_mutation, required_approvals[], ... }`;
  writes formed from that preview SHALL preserve the same `basis_contract_hash` and SHALL stale-reject
  if authorization binding, approval posture, or hazard basis drifts.
- `dependency_topology_hash` and `simulation_basis_hash` SHALL either both be populated or both be
  `null`. They SHALL remain `null` for non-governance authorization results, and governance
  mutation-capable results SHALL retain both so the hazard basis is explicit rather than implied only
  by the opaque `access_binding_hash`.
- if a governance mutation-capable action is nominally allowed by ABAC but
  `SIMULATE_GOVERNANCE_MUTATION(...).bounded_safe_mutation = 0` and the required governance approval
  remains unsatisfied, `AUTHORIZE(...)` SHALL downgrade the action to `REQUIRE_APPROVAL` rather than
  surfacing immediate `ALLOW`.
- If `decision = ALLOW_MASKED`, the engine SHALL execute only `effective_scope[]`. `masking_rules[]`
  SHALL apply only to downstream human/view/export projections, including graph/twin/enquiry/export
  renders. `masking_rules[]` SHALL NOT alter canonical source collection, canonical facts, compute,
  filing-packet bytes, or authority-request canonicalization/hashing. Where masked access cannot
  legally support a filing-capable or amendment-capable token, `AUTHORIZE(...)` SHALL remove that
  token from `effective_scope[]` or return a blocking access decision.
- If a requested filing-capable token cannot legally be executed under the required masking,
  that token SHALL be removed from `effective_scope[]` or the result SHALL be a blocking access decision.
- for mutation-capable governance actions, silent partial execution is forbidden: if any requested
  target tuple is blocked or requires step-up/approval, the engine SHALL preserve the target set as an
  atomic request and SHALL surface the highest-severity requirement instead of auto-dropping the tuple.
- Downstream control flow SHALL branch from `effective_scope[]`, not from the raw requested scope,
  except where the raw requested scope is preserved purely for audit.
- `REQUIRE_STEP_UP`, `REQUIRE_APPROVAL`, and `DENY` are pre-manifest exits. They SHALL return an
  access-blocked response and SHALL NOT allocate a `RunManifest`; any persisted manifest-scoped
  `access_decision{...}` is therefore post-allow-only and limited to `ALLOW` or `ALLOW_MASKED`.

Reusable `AUTHORIZE(...)` outputs SHALL validate against
`schemas/authorization_decision.schema.json` so `ALLOW`, `ALLOW_MASKED`, `REQUIRE_STEP_UP`,
`REQUIRE_APPROVAL`, and `DENY` remain distinct backend contracts rather than devolving into
transport-local permission flags.
Every integration-capable authorization result SHALL also carry one
`AuthorityLayerBoundaryContract{...}` that freezes the active principal class, tenant-permission
layer, delegation layer, imported-delegation freshness posture, authority-link layer, exceptional
authority posture, human-gate requirement and evidence posture, and the explicit prohibitions that
tenant permission never substitutes for authority mutation, authority links never prove client
delegation, and internal exceptions never outrank authority-of-record truth.
`GovernanceAccessSimulation` payloads exposed by the northbound policy simulator SHALL validate
against `schemas/governance_access_simulation.schema.json` so the non-mutating
`SIMULATE_GOVERNANCE_MUTATION(...)` result stays aligned with the nested reusable authorization
contract, the frozen blast-radius basis, and the derived `GovernanceMutationBasisContract`.

## 3.10 Delegation rules

The following delegation rules SHALL apply.

### Rule A - Self-acting rule

If `delegation_basis = SELF_ACTING`, the reporting subject may act within the scope allowed by tenant
policy and authority link state.

### Rule B - Agent-acting rule

If a tenant-side principal acts for a client/reporting subject, the engine SHALL require a valid
`DelegationGrant` covering the requested `(tenant_id, reporting_subject_ref, authority_scope,
partition_scope_refs[])`.

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

### Rule G - Partition-scope rule

Client-level permission, delegation, or authority linking SHALL NOT imply authority over every
business partition, income-source partition, or obligation slice belonging to that client.
The engine SHALL evaluate requested `partition_scope_refs[]` against both the applicable
`DelegationGrant` and `AuthorityLink`.
Any uncovered partition token SHALL be removed from the effective authorization result or SHALL cause
the operation to fail closed when partial execution would be misleading or legally unsafe.

### Rule H - Frozen authorization reuse rule

Replay and same-attempt recovery MAY reuse a prior frozen authorization context only for the same or a
strictly narrower effective scope and partition set.
Any new live filing-capable, amendment-capable, export-capable, or authority-mutating progression on
a child branch SHALL re-run `AUTHORIZE(...)` against current policy and current delegation/link state,
producing a new `access_binding_hash`.

### Rule I - Imported-authorisation freshness rule

Imported Self Assessment authorisation, handshake-derived authority, or other imported delegation
basis SHALL carry explicit evidence and freshness metadata.
If the imported basis is stale, revoked, partially scoped, or no longer provable for the requested
client/partition/action tuple, the engine SHALL treat it as insufficient for live authority mutation
until revalidated.

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

### Exceptional authority controls

Layer-4 exceptional authority SHALL be bounded as a first-class control object, not a verbal excuse.
Any break-glass or exceptional path SHALL create an `ExceptionalAuthorityGrant` carrying at minimum:

- incident or case ref
- target action family
- target client and `partition_scope_refs[]`
- rationale
- approving principal
- activated_at
- expires_at
- one-time or bounded-use limit
- compensating-control refs

Exceptional authority SHALL require human step-up and SHALL NOT be originated or self-approved by a
service principal.
It MAY permit bounded internal control exceptions, but it SHALL NOT:

- fabricate authority acknowledgement
- substitute for missing client delegation
- silently widen client scope beyond the approved exception
- sign a client declaration without a valid signatory basis
- convert unknown authority truth into confirmed truth
- silently widen partition scope beyond the approved exception

Any `ExceptionalAuthorityGrant` and any sendable authority artifact that depends on it SHALL
preserve explicit `delegation_substitution_permitted = false`,
`silent_client_widening_permitted = false`, and `silent_partition_widening_permitted = false` style
prohibitions so break-glass approval remains bounded to the approved action, client, and partition
slice instead of mutating the broader delegation or legal-truth model.

## 3.12 Authority precedence rules

The following precedence rules SHALL apply.

1. `AUTHORITY_SYSTEM` acknowledgements define legal submission state.
2. No tenant actor may set `SubmissionRecord.status = CONFIRMED` without an authority-grounded basis.
3. Overrides may change engine interpretation or gate outcomes, but may not fabricate authority acknowledgement.
4. A workflow action may recommend filing, but cannot itself change legal submission state.
5. A `SubmissionRecord` may be annotated as `UNKNOWN` or `OUT_OF_BAND`, but such annotation does not replace authority truth.
6. `UNKNOWN`, `OUT_OF_BAND`, and authority-corrected postures are first-class legal-truth states and
   SHALL remain distinct from `CONFIRMED`, `REJECTED`, and internal-intent states.
7. Out-of-band discovery or authority-corrected truth SHALL carry explicit basis refs and SHALL
   supersede conflicting internal workflow or recommendation posture for legal-state interpretation.
8. Current delegation or token health does not rewrite past authority truth, but it DOES gate any new
   mutation or acknowledgement attempt derived from that truth.

## 3.13 Machine-actor rules

Service principals SHALL be governed as first-class actors, not hidden implementation detail.

- Every service action SHALL carry a `service_identity_ref`.
- Every service SHALL be scoped to one tenant or an explicitly approved multi-tenant operational scope.
- Scheduled runs SHALL still execute under `PrincipalContext`, not under "system bypass".
- `SCHEDULER_SERVICE` MAY allocate `NightlyBatchRun` and `run_kind = NIGHTLY` manifests only within
  the tenant/window scope explicitly assigned to the schedule and only when the serving release and
  policy snapshot are both admissible.
- a scheduler-launched nightly manifest SHALL carry `nightly_batch_run_ref` and
  `nightly_window_key`; the scheduler SHALL NOT rely on ephemeral queue state alone to explain why
  the manifest exists.
- service principals SHALL NOT satisfy `REQUIRE_STEP_UP`, `REQUIRE_APPROVAL`, override approval, or
  exceptional authority on behalf of a human; those outcomes SHALL become workflow or escalation
  artifacts instead.
- service principals SHALL NOT advertise client-portal or human approval capabilities in frozen
  authorization context.
- `NOTIFICATION_SERVICE` MAY publish operator digests or work-item notifications only from
  persisted batch/workflow truth and SHALL NOT infer legal submission state from transport intent or
  queue presence alone.
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
- no live-capable replay, recovery, or continuation branch without either a frozen reusable
  `access_binding_hash` or a newly evaluated authorization binding
- no client-level grant or authority link silently interpreted as coverage for ungranted
  `partition_scope_refs[]`
- no exceptional-authority path without incident-linked approval, expiry, and bounded scope
- no `UNKNOWN`, `OUT_OF_BAND`, or authority-corrected truth collapsed into `CONFIRMED`

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
- the UI SHALL surface whether the current access posture is live-evaluated or frozen from replay or
  recovery lineage, including the effective `partition_scope_refs[]` where those affect legal action
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
