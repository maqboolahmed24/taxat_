# Security and Runtime Hardening Contract

## Purpose

The current blueprint is strong on authority binding, manifest sealing, auditability, and retention,
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

## 3. Secret, key, and token handling

The broader product SHALL isolate secrets and authority credentials from ordinary application storage.

- raw authority access/refresh tokens SHALL live only in a governed token vault or secret store;
- outbox messages, queues, read models, and general logs SHALL carry only opaque refs such as
  `token_binding_ref`, never raw tokens;
- object payload encryption SHALL use per-tenant or per-sensitivity envelope keys rooted in KMS/HSM
  controlled master keys;
- `SecretVersion` SHALL be versioned, attestable, and rotatable without ambiguous cutover;
- key and secret rotation SHALL be auditable and SHALL fail closed if attestation or version binding
  is unknown.

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
- audit, manifest-control, and token-vault paths SHALL remain isolated from public ingress.

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

## 10. One-sentence summary

The runtime hardening contract ensures the surrounding product cannot compromise the engine through weak
sessions, weak secrets, weak transport, or weak release hygiene.
