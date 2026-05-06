# Object Lifecycle Runbook

## Purpose

The storage boundary in `packages/domain-kernel/src/storage` is the only shared runtime that may turn staged bytes into published, deliverable, quarantined, retained, or erased objects.
Raw bucket location is never enough on its own.

## Core flow

1. Stage bytes with `stageObject`.
2. Preserve the same `storage_ref` across reconnect or request rebase with `resumeObject`.
3. Move into `SCANNING` with `startScan`.
4. Publish only after clean verdict and explicit retention hook attachment with `publishObject` or `completeScan(...clean: true)`.
5. Mint customer-facing delivery only with `bindDelivery`, never from `storage_ref`.

## Quarantine

- Use `quarantineObject` for malicious verdicts or late re-scan revocation.
- Quarantine clears preview and download handles immediately.
- False-positive release does not mutate quarantine in place; it creates a clean successor object boundary.

## Customer-safe delivery

- Internal-only source objects can require a separate derivative with `publishCustomerSafeDerivative`.
- `bindDelivery` computes a fresh `delivery_binding_hash` from route, access, masking, and target context.
- Reuse must be checked with `assertDeliveryCurrent`; drifted route or session context fails closed.

## Retention and erasure

- Every stage or transition that matters attaches `RetentionTag` and `ArtifactRetention` lineage through `applyRetentionHook`.
- Legal-hold posture lives on `ArtifactRetention`, not on provider lock metadata alone.
- `requestErasure` downgrades to limited posture when current artifact refs still point at the object.
- `eraseObject` is the only shared path that moves an object into `ERASED`.

## Operator checklist

- Do not expose raw provider URLs, signed URLs, or object-store paths as durable product truth.
- Do not bypass quarantine by editing object metadata in place.
- Do not treat a clean scan as permission to skip publication or delivery binding.
- Do not delete or erase a current-view object without checking `currentArtifactRefs`.
