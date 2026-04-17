# Security and Runtime Hardening Contract

## Purpose

This architecture is strong on authority binding, manifest sealing, auditability, and retention,
but it does not yet define the broader product threat model or the runtime controls required to
operate the engine safely in production. This contract closes that gap.

The goal is to prevent the broader product from undermining a correct core algorithm through session
abuse, cross-tenant leakage, weak token handling, insecure transport, supply-chain compromise, or
restore-time privacy regressions.

## 1. Threat classes

The broader product SHALL explicitly defend against at minimum:

1. cross-tenant or cross-client data exposure;
2. stale or replayed user commands;
3. authority-token misuse or wrong-client token binding;
4. queue, callback, or worker-result injection;
5. unsafe log, export, cache, or analytics leakage;
6. browser-origin attacks (session theft, CSRF, clickjacking, XSS-assisted action replay);
7. SSRF or uncontrolled egress from connectors and OCR/document pipelines;
8. compromised build, dependency, or release artifact;
9. restore-time resurrection of erased or masked data;
10. privileged-operator overreach without step-up, approval, or audit evidence;
11. desktop-client compromise, unsafe local cache exposure, or embedded-web-content escape on signed
    native operator workspaces.

## 2. Identity, session, and command trust

The broader product SHALL enforce:

- federated product identity through OIDC/OAuth 2.0 or an equivalent short-lived identity system;
- MFA/step-up for non-delegable, filing-capable, or authority-sensitive actions;
- short-lived `ActorSession` records with revocation and device/session binding state;
- server-side validation of every command against current actor/session state, never only against a
  client-held token;
- anti-CSRF protection for cookie-based browser sessions;
- system-browser or platform-auth-session sign-in for native operator clients rather than unrestricted
  embedded credential surfaces;
- Keychain-backed storage for native product-session material plus revocation-aware local cache purge;
- session rotation after privilege elevation or step-up completion;
- explicit session revocation audit on logout, compromise response, or administrator invalidation.

`ActorSession`, `PrincipalContext`, and any reusable `AuthorizationDecision` payload SHALL validate
against dedicated contracts in `schemas/` so browser, native, and automation security posture
remains machine-readable instead of being reconstructed from client-specific transport behavior.

## 3. Secret, key, and token handling

The broader product SHALL isolate secrets and authority credentials from ordinary application storage.

- raw authority access/refresh tokens SHALL live only in a governed token vault or secret store;
- outbox messages, queues, read models, and general logs SHALL carry only opaque refs such as
  `token_binding_ref`, never raw tokens;
- any queued authority mutation SHALL revalidate the usable token version against the persisted
  `binding_lineage_ref` immediately before send; token rotation is legal only inside the same
  subject/client/scope lineage and SHALL NOT silently rebind a request to a different authority link
  or different reporting subject; queued send SHALL also remain bound to the same
  `access_binding_hash`, `policy_snapshot_hash`, and any required satisfied step-up/approval state;
- any exceptional-authority path SHALL stay bound to the same tenant, client, partition scope, and
  token lineage as the persisted authority path; it SHALL NOT be used to swap subjects, widen hidden
  scope, or bypass the permanent prohibitions frozen on `ExceptionalAuthorityGrant`;
- object payload encryption SHALL use per-tenant or per-sensitivity envelope keys rooted in KMS/HSM
  controlled master keys;
- `SecretVersion` SHALL be versioned, attestable, and rotatable without ambiguous cutover;
- key and secret rotation SHALL be auditable and SHALL fail closed if attestation or version binding
  is unknown.

`SecretVersion` SHALL validate against its dedicated schema so attestation, active-use windows,
cutover start, retirement, and revocation are serialized consistently across runtime, release, and
restore controls.
Retired versions SHALL therefore retain the rotation-start timestamp and historical-read window,
revoked versions SHALL bind explicit revocation reason and chronology, and no secret lineage may
self-supersede or invert attestation/activation/cutover time.

## 4. Browser, native-client, API, and transport hardening

The northbound product surface SHALL enforce across browser and native embodiments:

- TLS for all external traffic;
- secure cookie flags where cookies are used;
- signed and notarized macOS desktop builds with hardened runtime and least-privilege entitlements for
  the native operator workspace;
- system-browser or platform-auth-session handoff for native sign-in and step-up rather than an
  unrestricted embedded web surface;
- native local caches SHALL remain OS-protected, tenant-bound, and free of raw authority credentials;
- `Content-Security-Policy` with deny-by-default script posture and `frame-ancestors 'none'` unless an
  approved embedding model explicitly requires otherwise;
- restrictive `CORS` with explicit origin allowlists only where cross-origin access is required;
- anti-clickjacking, anti-content-sniffing, and safe download/export headers;
- deep links, drag/drop intake, imported files, and embedded web content SHALL validate origin, type,
  and tenant binding before any state transition or artifact adoption;
- per-session and per-principal command rate limits, especially for approval, step-up, and transmit
  surfaces;
- stale-view and idempotency replay windows to suppress accidental or malicious duplicate submits.

## 5. Service-to-service and network hardening

The runtime topology SHALL assume zero trust between service boundaries.

- east-west traffic SHALL use authenticated service identity and mutual TLS where the platform permits;
- connector/OCR/authority gateway components SHALL run with least-privilege network egress policies;
- external fetchers SHALL use explicit allowlists and SSRF-resistant URL validation;
- inbound callbacks or worker results SHALL enter through a transactional inbox/dedupe layer before
  any state transition or artifact adoption;
- authority-provider callbacks, poll payloads, or gateway-recovered responses SHALL additionally
  authenticate the provider channel, compute a provider-delivery dedupe key, and bind the payload to
  the expected request lineage before any legal-state mutation;
- audit, manifest-control, and token-vault paths SHALL remain isolated from public ingress.

That authenticated ingress checkpoint SHALL persist a first-class `AuthorityIngressReceipt` before
response normalization or state mutation so quarantine, dedupe, and request-lineage proof survive
transport retries and asynchronous recovery flows.
The same checkpoint SHALL also publish one grouped `authority_ingress_proof_contract{...}` reused by
asynchronous `AuthorityResponseEnvelope`, request-backed `SubmissionRecord`, and authority-settling
`ObligationMirror` artifacts so later mutation or replay cannot reconstruct ingress authentication
or lineage proof from transport-local memory.
Bound or normalized ingress receipts SHALL therefore retain the concrete `authority_reference`,
`request_hash`, `idempotency_key`, `bound_interaction_ref`, and at least one audit-event reference
for the authenticated checkpoint they prove; normalized-response refs SHALL appear only on
`receipt_state = NORMALIZED`; duplicate-suppressed ingress SHALL retain a non-null
`canonical_ingress_receipt_ref` and SHALL NOT emit a second normalized response; and quarantine
timestamps or reason codes SHALL appear only on `receipt_state = QUARANTINED`, where
`reconciliation_owner_ref` is mandatory. A lone `authority_reference` match SHALL therefore remain
quarantined as `BOUND_WITH_AUTHORITY_REFERENCE_ONLY` rather than being treated as sufficient legal
correlation.

## 6. Data protection, privacy, and cache safety

The broader product SHALL treat data minimisation and leakage prevention as runtime controls, not only
as retention prose.

- cache keys for northbound read surfaces SHALL include at minimum `tenant_id`, principal class,
  masking posture fingerprint, and manifest identity;
- logs SHALL redact secrets, raw tokens, government identifiers, and full regulated payload bodies;
- exports SHALL inherit masking/export policy, never bypass it through direct object-store URLs;
- backups SHALL remain encrypted and inventory-controlled;
- restores that re-materialize already-erased or newly-out-of-policy personal data SHALL open a
  compensating re-erasure workflow under audit rather than silently re-exposing the data.

## 7. Supply-chain and build integrity

No release may reach a live environment without provenance.

The broader product SHALL require:

- signed `BuildArtifact` outputs;
- SBOM generation and retention for shipped artifacts;
- dependency and container/image vulnerability scanning;
- provenance attestations tying build output to source revision, builder identity, and policy outcome;
- release admission that verifies signature, digest, provenance, and schema compatibility before
  promote/canary.

`BuildArtifact` SHALL keep `distribution_targets[]` in canonical order, SHALL require desktop
notarization and hardened-runtime evidence whenever `MACOS_DESKTOP` is shipped, and SHALL clear
those desktop-only evidence refs when the desktop target is absent so release identity does not
silently overclaim native hardening posture.

## 8. Operational security release gates

The default production gate SHALL block promotion when any of the following is true:

- unsigned build or unknown provenance;
- unresolved critical vulnerability in an internet-exposed component or token-handling path;
- failing anti-CSRF / session / stale-view tests;
- failing signed/notarized desktop-build verification or hardened-runtime/entitlement policy for the
  native operator workspace;
- failing cross-tenant cache isolation tests;
- missing secret-rotation attestation for newly promoted environments;
- failing sandbox authority binding tests for the active provider profile.

## 9. Security invariants

1. no raw authority token outside the vault boundary
2. no queue, outbox, inbox, or cache artifact that can act as a bearer credential by itself
3. no browser-origin write action without authenticated session and anti-CSRF protection, and no
   native write action without a live bound session plus device-local secret hygiene
4. no cache or CDN reuse across tenants or masking postures
5. no release without signature, digest, and provenance attestation
6. no restore completion without privacy/erasure reconciliation
7. no privileged action without step-up/approval state where policy requires it
8. no production desktop client without signature, notarization, and hardened-runtime policy
   compliance
9. no live authority mutation send after binding-lineage drift, token/client rebinding, or
   authority-link revocation
10. no authority callback, poll result, or recovery payload may mutate legal state before authenticated
    ingress, dedupe, and request-lineage correlation complete

## 10. One-sentence summary

The runtime hardening contract ensures the surrounding product cannot compromise the engine through weak
sessions, weak secrets, weak transport, or weak release hygiene.
## FE-25 Cache Isolation

Runtime hardening now treats cache reuse as a security boundary rather than a performance-only concern. `cache_isolation_contract` freezes the exact security context required for reuse and requires purge-or-reject behavior on tenant, principal, session, access, masking, route, projection-version, or preview drift so stale or broader content cannot be revived from local or shared caches. That contract now also freezes one canonical `delivery_binding_hash` plus exact revalidation and temporary-artifact purge policies so preview, download, signed URL, Quick Look, and temp-file flows cannot reuse a broader or stale cache identity after the invoking security context has moved.
