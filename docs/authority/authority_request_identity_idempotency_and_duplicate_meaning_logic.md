# Authority Request Identity, Idempotency, and Duplicate Meaning Logic

`AUTHORITY_REQUEST_IDENTITY_V2` is the only request identity profile for authority traffic.
The implementation normalizes strings with NFC, sorts set-like arrays, preserves declared order for
repeated query values, renders paths through the declared resource template, and uses explicit
`<NONE>` sentinels for null body, obligation, basis, delegation, and empty duplicate partition scope.

The hash boundaries are intentionally separate:

- `identity_namespace_hash`: provider, product, environment, authority scope, operation family/profile,
  API version, and binding lineage.
- `duplicate_meaning_key`: namespace plus tenant/client, attempt lineage, canonical business
  partitions, normalized obligation/basis, method, path, query, request body hash, and
  `access_binding_hash`.
- `request_hash`: exact sealed request identity: namespace, duplicate bucket, header profiles,
  token/binding/link refs, delegation sentinel, subject/acting party tuple, and
  `policy_snapshot_hash`.
- request-level `idempotency_key`: derived only from `duplicate_meaning_key`; it is not the
  manifest-level idempotency key.

`request_identity_contract{...}` is the persisted grouped identity packet. Downstream transport,
recovery, ingress correlation, and request-backed settlement must project or reuse that packet rather
than rebuilding identity from neighboring operation or binding rows.

Collision taxonomy:

- exact replay: same `request_hash` and same grouped identity fields.
- duplicate-meaning collision: same duplicate bucket with a different exact request, requiring reuse,
  reconciliation, or operator handling rather than blind resend.
- body collision: same duplicate bucket with a different `request_body_hash`; hard block.
- access-binding conflict: same duplicate bucket or request hash with a different
  `access_binding_hash`; hard block.
- namespace collision: same namespace hash or request hash reused for a different namespace tuple;
  hard block.
- stale stronger truth: duplicate bucket already has confirmed, rejected, or out-of-band authority
  truth; route to reconciliation/non-send closure.
