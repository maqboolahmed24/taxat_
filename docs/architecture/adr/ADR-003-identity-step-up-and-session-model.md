# ADR-003: Identity, Step-Up, and Session Model

- Status: Accepted
- Date: 2026-04-17
- Deciders: Phase 00 architecture analysis pack

## Context

Taxat needs one declared identity and session model that spans browser operators, portal users, native macOS operators, machine automation clients, invite and deep-link entry, upload resumability, and authority-integrated send paths. The source corpus is unusually explicit: it names non-delegable actions, freezes `PrincipalContext` and `AuthorityBinding` lineage, requires anti-CSRF for browser writes, forbids raw authority credentials on native devices, and insists that step-up completion or revocation invalidate stale resumability rather than letting commands drift forward.

The prior phase-00 packs already established the surrounding architecture constraints: the dependency register surfaced `33` dependencies including explicit IdP tenant and policy setup, the shell atlas normalized `21` routes across `3` shell families, the native topology fixed `ASWebAuthenticationSession` as the preferred auth handoff, and the continuity matrix captured `12` recovery scenarios. ADR-003 closes the remaining gap by selecting one cross-surface model for interactive sessions, step-up, machine credentials, deep-link upgrade, and invalidation behavior.

## Decision

Adopt a **standards-based identity model with server-mediated interactive sessions**:

- Human browser sessions authenticate through an OIDC/OAuth-capable identity provider and operate through secure `HttpOnly`, same-site cookies or an equivalently protected same-origin server-mediated session posture with anti-CSRF.
- Native macOS operators authenticate and step up through `ASWebAuthenticationSession` or an equivalent system-browser-managed flow, storing only product-session artifacts in Keychain-class storage.
- Machine automation clients use distinct short-lived non-browser credentials and explicit service identity; they are never interchangeable with human interactive sessions.
- Raw authority access or refresh tokens and IdP client-secret material stay in governed vault or secret-store boundaries, never in browser storage, native device caches, queues, or read models.
- Invite, deep-link, upload-session, and authority-owned handoff flows may preserve same-object continuity, but sensitive mutation still requires a normal authenticated session and any required fresh step-up.
- Step-up completion rotates the effective challenge state; revocation, logout, tenant switch, binding drift, and stale-view rebase invalidate or revalidate resumability artifacts exactly as the contract requires.

## Decision Drivers

| Driver | Priority | Weight | Why It Matters |
| --- | --- | --- | --- |
| Actor, authority, and delegation integrity | HARD_REQUIREMENT | 12 | The chosen model must preserve principal class, delegation basis, authority-link readiness, client scope, and masking posture as separate machine-checkable layers rather than collapsing them into one ambient login concept. |
| Non-delegable action and step-up coverage | HARD_REQUIREMENT | 12 | High-trust actions must surface as explicit human-gated paths with frozen approval or step-up evidence instead of relying on generic session age or client-side heuristics. |
| Authority binding and token-lineage safety | HARD_REQUIREMENT | 12 | Authority interactions must remain bound to the exact principal, token lineage, authority link, access binding, and frozen step-up or approval evidence that authorized them. |
| Browser interactive security posture | HARD_REQUIREMENT | 11 | Interactive browser writes must resist XSS and CSRF, keep sensitive session material out of unsafe browser storage, and force server-side validation against current actor and session state. |
| Native session security and local-storage fit | HARD_REQUIREMENT | 10 | The model must fit a first-class macOS client that authenticates through the system browser, stores only allowed product-session material locally, and purges on revocation or scope drift. |
| Machine automation separation from human sessions | HARD_REQUIREMENT | 9 | Automation clients must use distinct credentials and identity posture so service principals cannot masquerade as human interactive sessions or satisfy human-only step-up and approval paths. |
| Revocation, rotation, and resume invalidation safety | HARD_REQUIREMENT | 10 | Step-up completion, logout, revocation, tenant switch, and device or binding drift must rotate challenge state, invalidate stale resumability artifacts, and prevent future command acceptance until lawful revalidation. |
| Deep-link, invite, upload, and same-object continuity | HARD_REQUIREMENT | 10 | Invite links, deep links, upload sessions, and external handoffs must preserve same-object continuity while still forcing authenticated upgrade before any sensitive mutation. |
| Stale-view, rebase, and multi-surface consistency | HARD_REQUIREMENT | 6 | The same model must compose with stale-view rejection, route-visible rebase, reconnect, and native restore without letting cached session posture or resumed commands outrun current truth. |
| Auditability and forensic clarity | STRONG_PREFERENCE | 4 | The model should produce one explainable lineage from human or machine identity through authorization, step-up evidence, session revocation, and authority request issuance. |
| Roadmap alignment and common IdP operability | STRONG_PREFERENCE | 4 | The ADR should map cleanly onto the already-scheduled IdP provisioning, session persistence, revocation, web integration, and native authentication tasks without forcing a bespoke vendor-specific posture. |

## Step-Up Trigger Overview

| Trigger | Outcome | Actors | Invalidation / Revalidation |
| --- | --- | --- | --- |
| Linking or re-linking software to the authority | STEP_UP_OR_APPROVAL_REQUIRED | TENANT_ADMIN, PREPARER, APPROVER | STEP_UP_COMPLETED, AUTHORITY_REBIND_OR_BINDING_DRIFT, SESSION_REVOKED |
| Approve override changing filing readiness or parity outcome | STEP_UP_OR_APPROVAL_REQUIRED | APPROVER, TENANT_ADMIN | STEP_UP_COMPLETED, STALE_VIEW_REBASE, SESSION_REVOKED |
| Submit filing or amendment | STEP_UP_OR_APPROVAL_REQUIRED | APPROVER, CLIENT_SIGNATORY, TENANT_ADMIN | STEP_UP_COMPLETED, AUTHORITY_REBIND_OR_BINDING_DRIFT, STALE_VIEW_REBASE, SESSION_REVOKED |
| Mark externally unverified submission as known out-of-band | STEP_UP_OR_APPROVAL_REQUIRED | APPROVER, TENANT_ADMIN, SUPPORT_OPERATOR | STEP_UP_COMPLETED, AUTHORITY_REBIND_OR_BINDING_DRIFT, SESSION_REVOKED |
| Export full evidence packs or unmasked provenance | STEP_UP_OR_APPROVAL_REQUIRED | AUDITOR, APPROVER, TENANT_ADMIN, SUPPORT_OPERATOR | STEP_UP_COMPLETED, SESSION_REVOKED, LOGOUT |
| Approve config versions for compliance mode | STEP_UP_OR_APPROVAL_REQUIRED | TENANT_ADMIN, APPROVER | STEP_UP_COMPLETED, STALE_VIEW_REBASE, SESSION_REVOKED |
| Execute erasure, legal-hold release, or retention exception | STEP_UP_OR_APPROVAL_REQUIRED | TENANT_ADMIN, APPROVER | STEP_UP_COMPLETED, SESSION_REVOKED, LOGOUT |
| Client signatory declaration or sign-off when the approval pack demands step-up | STEP_UP_REQUIRED | CLIENT_SIGNATORY | STEP_UP_COMPLETED, STALE_VIEW_REBASE, SESSION_REVOKED, DEEP_LINK_OR_INVITE_EXPIRY |
| Governance mutation that widens access, changes step-up posture, alters retention minimums, or relinks authority scope | STEP_UP_OR_APPROVAL_REQUIRED | TENANT_ADMIN, APPROVER | STEP_UP_COMPLETED, STALE_VIEW_REBASE, TENANT_SWITCH, SESSION_REVOKED |
| Invite, deep-link, or external handoff entry before authenticated upgrade | AUTHENTICATED_SESSION_UPGRADE_REQUIRED | CLIENT_VIEWER, CLIENT_CONTRIBUTOR, CLIENT_SIGNATORY | DEEP_LINK_OR_INVITE_EXPIRY, SESSION_REVOKED, STALE_VIEW_REBASE |

The matrix covers `10` trigger rows: `1` explicit step-up-only trigger, `8` step-up-or-approval trigger families, and `1` authenticated-upgrade gate for invite or deep-link entry.

## Session Flows

| Flow | Entry | Session Carrier | Sensitive Mutation Posture | Continuity Guard |
| --- | --- | --- | --- | --- |
| Interactive browser operator session | OIDC/OAuth human sign-in through the chosen IdP, then server-mediated interactive session resolution. | Secure `HttpOnly`, same-site cookie or equivalent same-origin protected session plus anti-CSRF binding. | Governance, authority-link, approval, and submission actions require current actor-session validation and may trigger step-up or approval. | Route and shell continuity stay same-object and same-shell where the broader frontend contract requires it. |
| Interactive browser client-portal session | Normal sign-in or post-invite upgrade into a fully authenticated portal session bound to one principal class, client scope, delegation basis, and masking posture. | Secure browser session cookie or equivalent same-origin protected session plus anti-CSRF binding. | Document upload, acknowledgement, and sign-off happen only after authenticated upgrade into the normal portal session; `CLIENT_SIGNATORY` sign-off may additionally require `STEP_UP_VERIFIED` assurance. | The portal preserves declaration context and approval-pack focus through step-up completion. |
| Native macOS operator session | System-browser or platform auth-session sign-in through `ASWebAuthenticationSession` or equivalent. | Server-authoritative interactive session plus Keychain-backed product-session artifacts and resume metadata. | Commands use the same server-side actor-session and stale-view validation as browser clients; native-only local state never becomes legal truth. | Scene restoration is allowed only while local cache, resume metadata, and server session all remain valid. |
| Machine automation client | Short-lived non-browser machine credential with explicit service identity and scoped environment or tenant binding. | Machine credential plus persisted `command_id`, `idempotency_key`, and server-evaluated `PrincipalContext` for each command. | Machine actors may perform only service-allowed actions and must still satisfy server-side authorization and idempotency contracts. | Replay, retry, and delayed send remain bound to durable request identity and binding lineage. |
| Invite or deep-link recipient before authenticated upgrade | Notification, emailed deep link, or invite opens contextual route state before a normal authenticated session has been re-established. | Contextual entry posture only; not yet a full sensitive-mutation session. | Sensitive actions are blocked until the flow upgrades into a normal authenticated session bound to the correct principal, tenant, and client scope. | The flow preserves contextual focus and return path through `route_context` and typed fallback targets. |
| Governed upload-session transfer flow | Authenticated portal session allocates a governed `ClientUploadSession` as the binary-transfer exception to the generic command surface. | Normal authenticated session plus upload-session binding contract that freezes tenant, client, request, and request-version identity. | Byte transfer and status inspection are allowed; request attachment and later submission semantics still require current typed command validation. | Resumed uploads stay visibly attached to the same request lane instead of appearing as fresh uploads. |

The session matrix covers `6` governed flows and keeps browser human, portal human, native human, machine automation, invite or deep-link pre-upgrade, and upload-session transfer posture explicitly separate.

## Identity Boundaries

| Boundary | Session Carrier | Allowed Material | Forbidden Material |
| --- | --- | --- | --- |
| Interactive browser human boundary | Secure browser session cookie or equivalent same-origin protected session plus anti-CSRF binding. | IdP redirect artifacts, server-mediated session identifier, anti-CSRF binding | browser-held raw authority credentials, unsafe primary bearer-token storage for browser writes |
| Portal invite or deep-link pre-upgrade boundary | Contextual route and return-path state only. | invite token or deep-link context, focused request or approval anchor | sensitive mutation authority before authenticated upgrade, scope widening from deep-link context alone |
| Interactive native human boundary | ASWebAuthenticationSession or equivalent plus Keychain-backed product-session material. | product-session artifacts, resume metadata, redaction-safe local cache | raw authority credentials on device, unrestricted embedded credential surfaces for primary sign-in or step-up |
| Machine automation boundary | Short-lived machine credential and explicit `command_id` plus `idempotency_key`. | short-lived non-browser bearer or client credential, service identity ref | human interactive session cookies, human step-up or approval substitution |
| Embedded web-view boundary | Low-risk documentation or help content only. | non-sensitive documentation context | primary sign-in, step-up completion, HMRC-only task handoff |
| Authority-token and IdP secret boundary | Vault-held authority tokens, IdP admin material, and client-secret records referenced indirectly from application flows. | vault-held authority token lineage, vault-held IdP client secrets or private keys | raw authority access or refresh tokens in browser, queue, read model, or device cache, mixed storage of IdP tenant-admin material with general application state |

The boundary model uses `6` explicit security boundaries so browser human, native human, machine automation, limited-context entry, embedded low-risk web content, and vault-held secret material do not collapse into one ambiguous login posture.

## Alternatives Considered

| Alternative | Weighted Score | Rank |
| --- | --- | --- |
| Standards-based human auth with server-mediated browser sessions, system-browser native auth, and separate machine credentials | 92.85 | 1 |
| SPA-centric bearer-token model with browser-held access tokens and minimal server session state | 46.0 | 2 |
| Embedded-webview or blended token model for browser and native flows | 43.6 | 3 |

The winning option is **Standards-based human auth with server-mediated browser sessions, system-browser native auth, and separate machine credentials** with a weighted score of `92.85`.

## Why This Option Wins

- It is the only option that matches the corpus requirement for secure browser session posture with anti-CSRF while still keeping human identity, delegation, authority link, and masking posture server-authoritative.
- It preserves the native system-browser and Keychain posture without weakening same-object continuity or allowing raw authority credentials onto the device.
- It keeps machine automation separate from human sessions, which is necessary because service principals are explicitly forbidden from satisfying `REQUIRE_STEP_UP`, `REQUIRE_APPROVAL`, or exceptional authority on behalf of humans.
- It composes cleanly with `AuthorityBinding`, send-time token-lineage revalidation, and the rule that a sendable `AuthorityRequestEnvelope` cannot exist until required step-up or approval evidence is already frozen.
- It lets invite, deep-link, and external handoff flows preserve route and object continuity while still forcing authenticated upgrade and fresh step-up where the current object demands it.

## Guardrails On The Decision

- Interactive browser writes SHALL remain behind a secure server-mediated session and anti-CSRF; bearer-token-in-browser-storage posture is rejected for primary interactive mutation.
- Native sign-in and step-up SHALL use system-browser or platform auth-session flows; embedded web views stay limited to low-risk documentation or help content.
- Machine credentials SHALL remain distinct from human sessions and SHALL NOT satisfy human-only step-up, approval, or signatory actions.
- Raw authority tokens and IdP client-secret material SHALL remain in governed vault or secret-store boundaries.
- Step-up completion SHALL rotate challenge state and SHALL force revalidation of pre-step-up commands, cursors, resume tokens, and upload-session control artifacts before they can continue.
- Revocation, logout, tenant switch, masking drift, authority rebinding, or stale-view rebase SHALL fail closed with typed recovery posture instead of silently refreshing hidden local state.
- Invite-link, emailed deep-link, and authority-owned handoff returns SHALL preserve same-object continuity, but return SHALL NOT imply completion before governed read models settle.

## Consequences

Positive consequences:

- Browser, native, and automation work now share one declared trust model before implementation starts.
- Later backend and frontend tasks can implement actor-session persistence, revocation, cache isolation, and native restoration against a stable cross-surface contract.
- Security posture stays explainable: browser trust is session-mediated, native trust is system-browser-plus-Keychain, automation trust is machine-credential-based, and authority tokens stay behind vault boundaries.

Negative consequences and tradeoffs:

- The product needs a deliberate backend session and revocation layer rather than a thin token-only SPA.
- Browser, backend, and native teams must coordinate on challenge-state rotation and resume-token invalidation instead of treating those concerns as surface-local details.
- Separate per-surface IdP client registrations and policy profiles are mandatory, which adds configuration work even though it sharpens the trust boundary.

## Deferred Decisions

- specific IdP vendor and hosting choice, so long as it supports OIDC/OAuth-compatible human auth, MFA, step-up, and short-lived session posture
- exact backend session-store product and revocation fanout mechanism
- exact browser BFF or edge-session topology used to implement the server-mediated web session
- exact step-up factor mix, enrollment UX, and device binding heuristics
- exact authority-boundary implementation details that belong to ADR-004 and later delivery tasks
- exact schema, service, and UI implementations scheduled in roadmap tasks `pc_0085`, `pc_0094`, `pc_0237`, `pc_0238`, and `pc_0291`

## References

- Session flow matrix: [session_flow_matrix.json](/Users/test/Code/taxat_/data/analysis/session_flow_matrix.json)
- Step-up trigger and invalidation matrix: [step_up_trigger_and_invalidation_matrix.json](/Users/test/Code/taxat_/data/analysis/step_up_trigger_and_invalidation_matrix.json)
- Identity boundary model: [browser_native_automation_identity_boundary.json](/Users/test/Code/taxat_/data/analysis/browser_native_automation_identity_boundary.json)
- Deep-link, invite, and resume rules: [deep_link_invite_and_resume_rules.json](/Users/test/Code/taxat_/data/analysis/deep_link_invite_and_resume_rules.json)
- Scorecard: [ADR-003-identity-step-up-and-session-model-scorecard.json](/Users/test/Code/taxat_/docs/architecture/adr/ADR-003-identity-step-up-and-session-model-scorecard.json)
- Comparison notes: [ADR-003-identity-step-up-and-session-model-comparison.md](/Users/test/Code/taxat_/docs/architecture/adr/ADR-003-identity-step-up-and-session-model-comparison.md)
- Decision diagram: [ADR-003-identity-session-topology.mmd](/Users/test/Code/taxat_/diagrams/analysis/ADR-003-identity-session-topology.mmd)
