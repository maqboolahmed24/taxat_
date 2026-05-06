# Environment And Secret Injection Runbook

## Purpose

This runbook defines the runtime boundary introduced by `pc_0063`.
`ConfigFreeze` remains the execution truth after a run is sealed.
Process environment variables are bootstrap inputs only.
Secret material stays behind opaque handle payloads and provider-backed resolution.

## Runtime Layers

The checked-in runtime policy under `/Users/test/Code/taxat_/config/runtime` separates four strata:

1. `BOOTSTRAP INPUTS`
   Process environment, explicit overrides, and local-only handle bootstrap files.
2. `SECRET HANDLES`
   Opaque handle payloads that carry alias, namespace, metadata, version, and optional handle refs.
3. `FROZEN CONFIG`
   `ConfigFreeze` identity and surface hashes used by post-seal server and native-adjacent consumers.
4. `RUNTIME CONSUMERS`
   `API`, `WORKER`, `CLI`, `PYTHON`, `BROWSER_BUILD`, `PLAYWRIGHT`, and `NATIVE`.

These are intentionally distinct.
Runtime helpers must not treat a mutable env bag as authoritative business config.

## Checked-In Sources Of Truth

- Runtime key catalog: [/Users/test/Code/taxat_/config/runtime/runtime_environment_catalog.json](/Users/test/Code/taxat_/config/runtime/runtime_environment_catalog.json)
- Provider environment compatibility: [/Users/test/Code/taxat_/config/runtime/provider_environment_matrix.json](/Users/test/Code/taxat_/config/runtime/provider_environment_matrix.json)
- Secret-handle rules: [/Users/test/Code/taxat_/config/runtime/secret_injection_policy.json](/Users/test/Code/taxat_/config/runtime/secret_injection_policy.json)
- Browser-safe allowlist: [/Users/test/Code/taxat_/config/runtime/browser_safe_env_allowlist.json](/Users/test/Code/taxat_/config/runtime/browser_safe_env_allowlist.json)
- TypeScript loader entrypoint: [/Users/test/Code/taxat_/packages/runtime-foundation/src/load_runtime_profile.ts](/Users/test/Code/taxat_/packages/runtime-foundation/src/load_runtime_profile.ts)
- Python parity helper: [/Users/test/Code/taxat_/python/validators/src/taxat_validators/runtime_profile.py](/Users/test/Code/taxat_/python/validators/src/taxat_validators/runtime_profile.py)

## Source Precedence

Resolution order is consumer-specific and declared in `secret_injection_policy.json`.
The important rules are:

- `EXPLICIT_OVERRIDE` and `PROCESS_ENV` may bootstrap local tooling or pre-seal flows.
- `LOCAL_FILE_BOOTSTRAP` is allowed only for `CLI`, `PYTHON`, and `PLAYWRIGHT`, and only in local environments explicitly listed in policy.
- `FROZEN_CONFIG` is the only lawful post-seal source for consumers that require frozen execution identity.
- Once frozen-config identity exists, live-env fallback fails closed with `RUNTIME_CONFIG_FREEZE_REQUIRED`.

## Secret Handle Shape

Secret-handle payloads are JSON objects.
They must contain metadata only:

- `alias_ref`
- `namespace_ref`
- `store_ref`
- `metadata_ref`
- `version_ref`
- optional `fingerprint`
- optional `provider_environment_ref`
- optional `handle_ref`

These payloads must not contain raw value fields such as `value`, `secret`, `token`, `client_secret`, `password`, or `plaintext`.
The loaders raise `RUNTIME_SECRET_HANDLE_RAW_VALUE_FORBIDDEN` if any forbidden raw field appears.

## Browser-Safe Projection

Browser-visible code may consume only the explicit allowlist in `browser_safe_env_allowlist.json`.
The allowed projection is intentionally narrow:

- `TAXAT_BROWSER_PUBLIC_BASE_URL`
- `TAXAT_BROWSER_PUBLIC_ENVIRONMENT_LABEL`
- `TAXAT_BROWSER_PUBLIC_RELEASE_CHANNEL`
- `TAXAT_BROWSER_PUBLIC_BUILD_SHA`
- `TAXAT_BROWSER_PUBLIC_SENTRY_DSN`

Any other key presented to `projectBrowserSafeEnv()` fails with `RUNTIME_BROWSER_SAFE_KEY_FORBIDDEN`.
This is how browser bundles and internal static viewers avoid inheriting server-only runtime state.

## Lawful Examples

### API / Worker

- Read `TAXAT_ENVIRONMENT_ID`, provider posture, and `ConfigFreeze` metadata from frozen config.
- Resolve database or authority credentials from secret handles only.
- Reject mutable process-env fallback after frozen-config identity is present.

### CLI / Python

- Bootstrap locally with `TAXAT_LOCAL_SECRET_BOOTSTRAP_FILE` only in local-authoring or local-provisioning environments.
- Use metadata-only handles for the redaction dictionary instead of raw secret text.
- Preserve typed errors for empty values, malformed JSON, alias mismatch, and provider mismatch.

### Playwright

- Consume browser-safe metadata and provider base URLs.
- Reject raw client-secret handles or broader server secret bags.
- Use operator-injected session state or fixture handles instead of confidential client secrets.

## Unlawful Patterns

- Reading mutable `process.env` after `ConfigFreeze` should govern runtime behavior.
- Pointing sandbox credentials at production endpoints.
- Carrying raw secret values into browser bundles, Playwright traces, logs, or internal atlas data.
- Letting local bootstrap files operate in preview, sandbox, pre-production, or production environments.
- Treating `BROWSER_BUILD` or static viewer surfaces as allowed consumers of secret-handle helpers.

## Generated Atlas

The read-only visualization for this policy lives at:

- Route metadata: [/Users/test/Code/taxat_/apps/operator-web/src/routes/internal/environment-basis-atlas.tsx](/Users/test/Code/taxat_/apps/operator-web/src/routes/internal/environment-basis-atlas.tsx)
- Static atlas: [/Users/test/Code/taxat_/apps/operator-web/public/internal/environment-basis-atlas/index.html](/Users/test/Code/taxat_/apps/operator-web/public/internal/environment-basis-atlas/index.html)
- Generated payload: [/Users/test/Code/taxat_/apps/operator-web/public/internal/environment-basis-atlas/data/environment-basis-atlas.json](/Users/test/Code/taxat_/apps/operator-web/public/internal/environment-basis-atlas/data/environment-basis-atlas.json)

Refresh the payload with:

```sh
node --experimental-strip-types ./packages/runtime-foundation/src/load_runtime_profile.ts --emit
```

Verify drift with:

```sh
node --experimental-strip-types ./packages/runtime-foundation/src/load_runtime_profile.ts --check
```

## Failure Codes You Should Expect

- `RUNTIME_ENV_KEY_MISSING`
- `RUNTIME_ENV_EMPTY`
- `RUNTIME_ENV_COERCION_FAILED`
- `RUNTIME_ENV_KEY_FORBIDDEN`
- `RUNTIME_ENV_PROVIDER_MISMATCH`
- `RUNTIME_SECRET_HANDLE_FORBIDDEN`
- `RUNTIME_SECRET_HANDLE_RAW_VALUE_FORBIDDEN`
- `RUNTIME_LOCAL_BOOTSTRAP_FORBIDDEN`
- `RUNTIME_CONFIG_FREEZE_REQUIRED`
- `RUNTIME_BROWSER_SAFE_KEY_FORBIDDEN`

These failures are designed to preserve the failing key, source, and consumer class without leaking a secret value.
