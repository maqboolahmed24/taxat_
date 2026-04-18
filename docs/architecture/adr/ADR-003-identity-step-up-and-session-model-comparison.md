# ADR-003 Comparison Notes

This comparison expands the weighted scorecard that supports ADR-003.

## Ranking

| Rank | Alternative | Weighted Score | Leading Strengths |
| --- | --- | --- | --- |
| 1 | Standards-based human auth with server-mediated browser sessions, system-browser native auth, and separate machine credentials | 92.85 | Best fit for the corpus requirement that interactive browser writes remain authenticated, CSRF-protected, and server-validated rather than token-self-authorized in the client.; Preserves the native system-browser and Keychain posture without weakening same-object continuity or authority-token isolation. |
| 2 | SPA-centric bearer-token model with browser-held access tokens and minimal server session state | 46.0 | Simplifies some frontend deployment and avoids a heavier server-side session layer.; Can look attractive for pure API-centric SPAs and commodity IdP quickstarts. |
| 3 | Embedded-webview or blended token model for browser and native flows | 43.6 | Can appear to reduce context switching by keeping more of the journey inside a product-controlled shell.; May simplify some visual continuity work if security and provider restrictions are ignored. |

## Criteria and Weights

| Criterion | Priority | Weight | Source Grounding |
| --- | --- | --- | --- |
| Actor, authority, and delegation integrity | HARD_REQUIREMENT | 12 | Algorithm/actor_and_authority_model.md::L121[3.4_Authority_layers], Algorithm/actor_and_authority_model.md::L151[3.5_Actor-to-authority_relationships], Algorithm/actor_and_authority_model.md::L222[3.6_Principal_context_schema], Algorithm/actor_and_authority_model.md::L426[3.10_Delegation_rules] |
| Non-delegable action and step-up coverage | HARD_REQUIREMENT | 12 | Algorithm/actor_and_authority_model.md::L490[3.11_Non-delegable_and_step-up_actions], Algorithm/actor_and_authority_model.md::L251[client_signatory_step_up_rule], Algorithm/northbound_api_and_session_contract.md::L429[fresh_step_up_proof_for_signoff], Algorithm/customer_client_portal_experience_contract.md::L340[Approval_and_sign-off_flow] |
| Authority binding and token-lineage safety | HARD_REQUIREMENT | 12 | Algorithm/authority_interaction_protocol.md::L147[B._AuthorityBinding], Algorithm/authority_interaction_protocol.md::L509[9.5_Preflight_sequence], Algorithm/authority_interaction_protocol.md::L540[9.6_Token_and_client_binding_rule], Algorithm/security_and_runtime_hardening_contract.md::L50[3._Secret_key_and_token_handling] |
| Browser interactive security posture | HARD_REQUIREMENT | 11 | Algorithm/northbound_api_and_session_contract.md::L709[8._Session_browser_and_native-client_rules], Algorithm/security_and_runtime_hardening_contract.md::L30[2._Identity_session_and_command_trust], Algorithm/security_and_runtime_hardening_contract.md::L78[4._Browser_native-client_API_and_transport_hardening], Algorithm/security_and_runtime_hardening_contract.md::L178[browser_write_requires_session_and_csrf] |
| Native session security and local-storage fit | HARD_REQUIREMENT | 10 | Algorithm/macos_native_operator_workspace_blueprint.md::L372[7._Authentication_and_session_strategy], Algorithm/macos_native_operator_workspace_blueprint.md::L390[8._Persistence_model], Algorithm/macos_native_operator_workspace_blueprint.md::L473[11._Security_and_runtime_posture_for_the_desktop_client], Algorithm/security_and_runtime_hardening_contract.md::L78[4._Browser_native-client_API_and_transport_hardening] |
| Machine automation separation from human sessions | HARD_REQUIREMENT | 9 | Algorithm/actor_and_authority_model.md::L555[3.13_Machine-actor_rules], Algorithm/northbound_api_and_session_contract.md::L709[8._Session_browser_and_native-client_rules], Algorithm/security_and_runtime_hardening_contract.md::L30[2._Identity_session_and_command_trust] |
| Revocation, rotation, and resume invalidation safety | HARD_REQUIREMENT | 10 | Algorithm/northbound_api_and_session_contract.md::L646[7._Stream_and_reconnect_rules], Algorithm/northbound_api_and_session_contract.md::L709[8._Session_browser_and_native-client_rules], Algorithm/macos_native_operator_workspace_blueprint.md::L372[7._Authentication_and_session_strategy], Algorithm/security_and_runtime_hardening_contract.md::L30[2._Identity_session_and_command_trust] |
| Deep-link, invite, upload, and same-object continuity | HARD_REQUIREMENT | 10 | Algorithm/northbound_api_and_session_contract.md::L184[2.2_Customer_Client_portal_and_upload-session_surfaces], Algorithm/northbound_api_and_session_contract.md::L709[8._Session_browser_and_native-client_rules], Algorithm/customer_client_portal_experience_contract.md::L370[Onboarding_flow], Algorithm/customer_client_portal_experience_contract.md::L399[Artifact_print_and_browser-handoff_rules], Algorithm/customer_client_portal_experience_contract.md::L595[route_context_deep_link_focus_and_return_path] |
| Stale-view, rebase, and multi-surface consistency | HARD_REQUIREMENT | 6 | Algorithm/northbound_api_and_session_contract.md::L621[6._Concurrency_and_stale-view_rules], Algorithm/northbound_api_and_session_contract.md::L646[7._Stream_and_reconnect_rules], Algorithm/customer_client_portal_experience_contract.md::L701[Playwright_validation_minimum], Algorithm/macos_native_operator_workspace_blueprint.md::L546[native_browser_stale_view_parity] |
| Auditability and forensic clarity | STRONG_PREFERENCE | 4 | Algorithm/actor_and_authority_model.md::L326[3.9_Policy_decision_model], Algorithm/actor_and_authority_model.md::L596[3.15_Frontend_and_governance-console_rendering_contract], Algorithm/security_and_runtime_hardening_contract.md::L30[2._Identity_session_and_command_trust], Algorithm/authority_interaction_protocol.md::L1175[9.15_Audit_invariants] |
| Roadmap alignment and common IdP operability | STRONG_PREFERENCE | 4 | Algorithm/security_and_runtime_hardening_contract.md::L30[2._Identity_session_and_command_trust], PROMPT/Checklist.md::L74[pc_0039], PROMPT/Checklist.md::L75[pc_0040], PROMPT/Checklist.md::L120[pc_0085], PROMPT/Checklist.md::L129[pc_0094], PROMPT/Checklist.md::L272[pc_0237], PROMPT/Checklist.md::L273[pc_0238], PROMPT/Checklist.md::L326[pc_0291] |

## Coverage Summary

- Session flows covered: `6`
- Step-up or upgrade triggers covered: `10`
- Invalidation events covered: `7`
- Identity boundaries covered: `6`
- Deep-link and resume rules covered: `8`

## Actor, authority, and delegation integrity

- Priority: `HARD_REQUIREMENT`
- Weight: `12`
- Rationale: The chosen model must preserve principal class, delegation basis, authority-link readiness, client scope, and masking posture as separate machine-checkable layers rather than collapsing them into one ambient login concept.

| Alternative | Raw Score | Weighted Contribution | Reason |
| --- | --- | --- | --- |
| Standards-based human auth with server-mediated browser sessions, system-browser native auth, and separate machine credentials | 4.75 | 11.4 | Keeps principal class, delegation, authority link, masking posture, and machine versus human identity as distinct server-enforced facts. |
| SPA-centric bearer-token model with browser-held access tokens and minimal server session state | 2.0 | 4.8 | It is harder to keep delegation basis, authority-link posture, and current masking posture server-authoritative when the browser is treated as the durable session carrier. |
| Embedded-webview or blended token model for browser and native flows | 2.25 | 5.4 | Blended token and shell posture make it easier for trust boundaries to become implicit rather than machine-readable. |

## Authority binding and token-lineage safety

- Priority: `HARD_REQUIREMENT`
- Weight: `12`
- Rationale: Authority interactions must remain bound to the exact principal, token lineage, authority link, access binding, and frozen step-up or approval evidence that authorized them.

| Alternative | Raw Score | Weighted Contribution | Reason |
| --- | --- | --- | --- |
| Standards-based human auth with server-mediated browser sessions, system-browser native auth, and separate machine credentials | 4.75 | 11.4 | Best fit for persisted `AuthorityBinding`, token-lineage revalidation, and request-envelope sealing before network send. |
| SPA-centric bearer-token model with browser-held access tokens and minimal server session state | 2.25 | 5.4 | Persisted authority binding still exists server-side, but browser-held bearer posture introduces more pressure to trust client-carried identity context than the corpus allows. |
| Embedded-webview or blended token model for browser and native flows | 2.0 | 4.8 | Authority-token lineage and handoff posture become harder to reason about when credentials and challenge state cross embedded shells. |

## Non-delegable action and step-up coverage

- Priority: `HARD_REQUIREMENT`
- Weight: `12`
- Rationale: High-trust actions must surface as explicit human-gated paths with frozen approval or step-up evidence instead of relying on generic session age or client-side heuristics.

| Alternative | Raw Score | Weighted Contribution | Reason |
| --- | --- | --- | --- |
| Standards-based human auth with server-mediated browser sessions, system-browser native auth, and separate machine credentials | 4.75 | 11.4 | Fits explicit `REQUIRE_STEP_UP` and `REQUIRE_APPROVAL` outcomes cleanly and keeps sign-off or authority-sensitive actions behind frozen human-gate evidence. |
| SPA-centric bearer-token model with browser-held access tokens and minimal server session state | 2.25 | 5.4 | Step-up can be bolted on, but token-refresh-driven UX makes it easier to blur fresh step-up proof with stale browser-held session state. |
| Embedded-webview or blended token model for browser and native flows | 2.5 | 6.0 | It can present step-up inline, but the trustworthiness of that inline posture is weaker when embedded surfaces are overused for sign-in or authority checkpoints. |

## Browser interactive security posture

- Priority: `HARD_REQUIREMENT`
- Weight: `11`
- Rationale: Interactive browser writes must resist XSS and CSRF, keep sensitive session material out of unsafe browser storage, and force server-side validation against current actor and session state.

| Alternative | Raw Score | Weighted Contribution | Reason |
| --- | --- | --- | --- |
| Standards-based human auth with server-mediated browser sessions, system-browser native auth, and separate machine credentials | 4.75 | 10.45 | Browser writes stay behind secure cookies or equivalent same-origin protected session posture plus anti-CSRF and server-side policy checks. |
| SPA-centric bearer-token model with browser-held access tokens and minimal server session state | 1.5 | 3.3 | Bearer tokens in browser storage are the weakest fit for the corpus's secure cookie, same-origin session, and anti-CSRF requirements. |
| Embedded-webview or blended token model for browser and native flows | 2.0 | 4.4 | Still weaker than the chosen model because embedded or blended token patterns tend to reintroduce browser-visible credential handling and muddier CSRF posture. |

## Deep-link, invite, upload, and same-object continuity

- Priority: `HARD_REQUIREMENT`
- Weight: `10`
- Rationale: Invite links, deep links, upload sessions, and external handoffs must preserve same-object continuity while still forcing authenticated upgrade before any sensitive mutation.

| Alternative | Raw Score | Weighted Contribution | Reason |
| --- | --- | --- | --- |
| Standards-based human auth with server-mediated browser sessions, system-browser native auth, and separate machine credentials | 4.5 | 9.0 | Allows limited-context entry and external handoff while still forcing authenticated upgrade before upload, acknowledgement, or sign-off. |
| SPA-centric bearer-token model with browser-held access tokens and minimal server session state | 3.0 | 6.0 | Client-controlled state can preserve context, but upgrade gating and request-binding safety become less trustworthy if sensitive mutation logic trusts browser session material too early. |
| Embedded-webview or blended token model for browser and native flows | 2.5 | 5.0 | Visual continuity may look smoother, but the corpus explicitly prefers same-object recovery through governed return targets, not through collapsing security boundaries into one shell. |

## Native session security and local-storage fit

- Priority: `HARD_REQUIREMENT`
- Weight: `10`
- Rationale: The model must fit a first-class macOS client that authenticates through the system browser, stores only allowed product-session material locally, and purges on revocation or scope drift.

| Alternative | Raw Score | Weighted Contribution | Reason |
| --- | --- | --- | --- |
| Standards-based human auth with server-mediated browser sessions, system-browser native auth, and separate machine credentials | 4.75 | 9.5 | Directly matches `ASWebAuthenticationSession`-style auth and Keychain-backed product-session storage without raw authority credentials on device. |
| SPA-centric bearer-token model with browser-held access tokens and minimal server session state | 3.0 | 6.0 | Native could still secure local material better than the browser, but the overall product model remains centered on browser-held tokens rather than system-browser-backed sessions. |
| Embedded-webview or blended token model for browser and native flows | 1.5 | 3.0 | This is the worst fit for the explicit native rule preferring `ASWebAuthenticationSession` or equivalent system-browser-managed flows and forbidding raw authority credentials on device. |

## Revocation, rotation, and resume invalidation safety

- Priority: `HARD_REQUIREMENT`
- Weight: `10`
- Rationale: Step-up completion, logout, revocation, tenant switch, and device or binding drift must rotate challenge state, invalidate stale resumability artifacts, and prevent future command acceptance until lawful revalidation.

| Alternative | Raw Score | Weighted Contribution | Reason |
| --- | --- | --- | --- |
| Standards-based human auth with server-mediated browser sessions, system-browser native auth, and separate machine credentials | 4.75 | 9.5 | Supports session challenge rotation, revocation-aware cache purge, and invalidation of resume or upload control artifacts after step-up or revocation. |
| SPA-centric bearer-token model with browser-held access tokens and minimal server session state | 2.0 | 4.0 | Step-up rotation and immediate revocation are materially harder when browser-held tokens remain usable until expiry or ad hoc refresh logic catches up. |
| Embedded-webview or blended token model for browser and native flows | 2.25 | 4.5 | Revocation and challenge-state invalidation are harder to enforce uniformly when multiple embedded shells and token caches participate. |

## Machine automation separation from human sessions

- Priority: `HARD_REQUIREMENT`
- Weight: `9`
- Rationale: Automation clients must use distinct credentials and identity posture so service principals cannot masquerade as human interactive sessions or satisfy human-only step-up and approval paths.

| Alternative | Raw Score | Weighted Contribution | Reason |
| --- | --- | --- | --- |
| Standards-based human auth with server-mediated browser sessions, system-browser native auth, and separate machine credentials | 4.5 | 8.1 | Human and machine credentials remain explicitly different, and machine clients can use short-lived creds without pretending to satisfy human step-up. |
| SPA-centric bearer-token model with browser-held access tokens and minimal server session state | 2.0 | 3.6 | A broad token-first philosophy increases the risk of conceptual drift between human interactive sessions and machine credential posture. |
| Embedded-webview or blended token model for browser and native flows | 2.0 | 3.6 | Mixed token handling does little to clarify machine-human separation and can make the overall posture more ambiguous. |

## Stale-view, rebase, and multi-surface consistency

- Priority: `HARD_REQUIREMENT`
- Weight: `6`
- Rationale: The same model must compose with stale-view rejection, route-visible rebase, reconnect, and native restore without letting cached session posture or resumed commands outrun current truth.

| Alternative | Raw Score | Weighted Contribution | Reason |
| --- | --- | --- | --- |
| Standards-based human auth with server-mediated browser sessions, system-browser native auth, and separate machine credentials | 4.25 | 5.1 | A strong fit for typed stale-view rejection and same-object rebase, provided browser and native clients share the same session-lineage semantics. |
| SPA-centric bearer-token model with browser-held access tokens and minimal server session state | 2.25 | 2.7 | Keeping browser, native, and reconnect semantics aligned is harder when each client is tempted to infer more from locally held token state. |
| Embedded-webview or blended token model for browser and native flows | 2.25 | 2.7 | Blended shell rules make stale-view and resume semantics harder to keep identical across browser and native clients. |

## Auditability and forensic clarity

- Priority: `STRONG_PREFERENCE`
- Weight: `4`
- Rationale: The model should produce one explainable lineage from human or machine identity through authorization, step-up evidence, session revocation, and authority request issuance.

| Alternative | Raw Score | Weighted Contribution | Reason |
| --- | --- | --- | --- |
| Standards-based human auth with server-mediated browser sessions, system-browser native auth, and separate machine credentials | 4.5 | 3.6 | Creates one explainable chain from IdP session through access binding, step-up evidence, revocation, and authority request issuance. |
| SPA-centric bearer-token model with browser-held access tokens and minimal server session state | 2.5 | 2.0 | Audit trails remain possible, but the resulting lineage is less crisp because important session posture shifts happen closer to the client. |
| Embedded-webview or blended token model for browser and native flows | 2.75 | 2.2 | Lineage is still observable, but the provenance of sign-in, step-up, and authority handoff becomes harder to explain precisely. |

## Roadmap alignment and common IdP operability

- Priority: `STRONG_PREFERENCE`
- Weight: `4`
- Rationale: The ADR should map cleanly onto the already-scheduled IdP provisioning, session persistence, revocation, web integration, and native authentication tasks without forcing a bespoke vendor-specific posture.

| Alternative | Raw Score | Weighted Contribution | Reason |
| --- | --- | --- | --- |
| Standards-based human auth with server-mediated browser sessions, system-browser native auth, and separate machine credentials | 4.25 | 3.4 | Maps directly to the existing roadmap tasks for IdP client setup, MFA and session policy, actor-session persistence, revocation services, and native auth integration. |
| SPA-centric bearer-token model with browser-held access tokens and minimal server session state | 3.5 | 2.8 | Commodity IdPs support this style easily, but it does not align well with the roadmap items that explicitly call for revocation, device binding, CSRF protection, and native system-browser auth restoration. |
| Embedded-webview or blended token model for browser and native flows | 2.5 | 2.0 | It fights both the native delivery roadmap and the revocation plus CSRF work already planned for backend and frontend implementation. |

## Why The Runner-Up Options Lost

- `SPA-centric bearer-token model with browser-held access tokens and minimal server session state` lost because directly weakens the corpus requirement for secure browser session posture with anti-CSRF and server-side current-session validation. It also makes revocation, step-up rotation, stale-view rebound, and same-object deep-link recovery more brittle because sensitive state lives too close to the browser runtime.
- `Embedded-webview or blended token model for browser and native flows` lost because directly conflicts with the explicit rules preferring system-browser or platform-auth-session handoff and limiting embedded web views to low-risk documentation or help. It also blurs the trust boundary between native session material, browser session posture, and authority-owned checkpoints in ways the corpus repeatedly forbids.
