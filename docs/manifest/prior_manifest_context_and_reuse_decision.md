# Prior Manifest Context And Reuse Decision

`pc_0102` implements the request-time branch-selection foundation for manifest
reuse. The modules classify prior-manifest state, validate compatibility, and
select the branch action that later allocation/start/seal cards must reuse.

## Request Identity

`compute_request_identity_hash.ts` defines `MANIFEST_REQUEST_IDENTITY_V1`.
The canonical vector is distinct from deterministic outcome hashing and
includes:

- tenant, client, period, business partitions, and income-source partitions;
- idempotency key and access binding hash;
- requested scope and executable scope in canonical scope order;
- mode, run kind, replay class for replay requests, and nightly window key for
  nightly requests.

The hash does not include persistence row versions, queue ids, write times, or
decision outputs.

## Prior Context

`load_and_validate_prior_manifest_context.ts` loads a prior manifest at most
once for a decision path and returns:

- `ABSENT` when no prior manifest id or manifest object is supplied;
- `VALID` when lineage mirrors, hard identity fields, access binding, and
  manifest hash posture are reusable;
- `INVALID` with typed reasons when drift must fail closed.

Lineage mirror drift is not normalized. It is surfaced as
`LINEAGE_MIRROR_MISMATCH`.

## Branch Precedence

`decide_manifest_reuse_strategy.ts` uses this deterministic precedence:

1. `RETURN_EXISTING_BUNDLE`
2. `REUSE_SEALED_MANIFEST`
3. `REPLAY_CHILD`
4. `RECOVERY_CHILD`
5. `CONTINUATION_CHILD`
6. `NEW_REQUEST_CHILD`
7. `NEW_MANIFEST`

Terminal same-request return wins before child allocation, which prevents
duplicate replay/recovery children. Sealed reuse is only legal for an
unstarted sealed manifest. Replay and recovery branches preserve exact frozen
basis by mapping to exact inheritance modes, while fresh continuation and
new-request children use fresh config/input modes.

## Fail-Closed Conditions

Hard-invalid prior context blocks branch selection instead of silently
allocating a child. This includes tenant/client/period/mode/access drift,
missing manifest hash, and lineage mirror mismatch. Active start leases block
recovery-child allocation. Sealed reuse rejects `opened_at`, output links,
submission refs, drift refs, decision bundle hash, deterministic outcome hash,
replay attestation ref, and hidden nested post-start projection data.

## Candidate Evaluations

Every selected strategy includes seven candidate evaluations in canonical action
order. The selected action has no disqualifiers; rejected candidates retain
schema-backed disqualifier reason codes so `ManifestLineageTrace` can later
persist an exhaustive explanation without recomputing controller-local logic.
