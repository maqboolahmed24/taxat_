# Begin Manifest And Start Claim Protocol

`beginManifest` allocates a root `RunManifest` with `root_manifest_id = manifest_id`, no parent lineage, generation `0`, and a manifest-local `NEW_MANIFEST` branch decision. Nightly launch refs are copied into the manifest before freeze so duplicate suppression does not depend on scheduler memory.

`beginChildManifest` allocates explicit successor lineage from a prior manifest. Replay children bind `parent_manifest_id = replay_of_manifest_id` with `REPLAY_EXACT` config/input inheritance, recovery children bind continuation lineage with `RECOVERY_EXACT`, and ordinary continuation or new-request children use fresh child config/input modes. Recovery allocation fails while the source `manifest_start_claim.claim_state` is `ACTIVE_LEASED`; stale recovery children reuse the source `attempt_lineage_ref`.

Start ownership is committed through `claimManifestStart`. The service loads the current row, rejects active, terminal, stale, or drifted targets with typed outcomes, validates the sealed pre-start posture, then performs one compare-and-swap write for `opened_at`, `IN_PROGRESS`, the active lease token, holder, epoch, expiry, attempt lineage, and first stage/outbox publication refs.

`reclaimManifestStart` is separate from first claim. It requires non-empty stale-reclaim evidence, rejects still-active leases, preserves the existing `attempt_lineage_ref`, and reuses the original first-publication refs while rotating holder/token/epoch under compare-and-swap.

Typed outcomes are:

- `CLAIM_GRANTED`
- `ALREADY_ACTIVE`
- `ALREADY_TERMINAL`
- `INVALID_PRESTART_STATE`
- `RECOVERY_REQUIRED`
- `RECLAIM_GRANTED`
- `RECLAIM_REJECTED_ACTIVE_LEASE`

Terminal result recording uses `buildTerminalResultRecordedStartClaim` or `markManifestStartClaimTerminal`, preserving the same token, holder, attempt lineage, and first publication proof while moving `manifest_start_claim.claim_state` to `TERMINAL_RESULT_RECORDED`.
