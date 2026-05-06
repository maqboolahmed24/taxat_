# Upload Session Recovery Harness and Cross-Device Resume

## Contract Grounding

The portal upload recovery harness is the backend proof artifact for FE-87. It validates against `upload_session_recovery_harness.schema.json` and mirrors the rules in `upload_session_recovery_harness_contract.md`, `customer_client_portal_experience_contract.md`, `northbound_api_and_session_contract.md`, `data_model.md`, `modules.md`, `state_machines.md`, `glossary.md`, `PATCH_RESOLUTION_INDEX.md`, and `test_vectors.md`.

The Algorithm schema and `packages/contracts-core` schema hashes were cross-checked before implementation; the harness uses the package schema in tests because the two copies are identical.

## Deterministic Seed

`deterministic_seed = 182007`.

The seed is stable because it is derived from the roadmap card ordinal `pc_0182` and the seven-case matrix size. It is not derived from timestamps, row order, source hashes, or runtime data. It should change only if `UPLOAD_SESSION_RECOVERY_HARNESS_V1` changes or the required scenario matrix changes.

## Runtime Truth

The harness does not define a second upload state machine. It consumes the existing portal upload-session read projector and recovery services:

- `buildClientUploadSession`
- `reconcileInflightRequestRebase`
- `deriveUploadRecoveryPostureAndNextAction`
- `deriveUploadConfidenceScore`
- `validateUploadSessionChronologyAndScope`
- `deriveUploadRequestBindingContract`

`toClientUploadSessionRecoverySnapshot` is the upload-session read adapter that emits the stable pre/post fields needed by the harness: frozen identity, live request version, resumability, attachment posture, transfer state, scanner/validation state, confidence, resume token, and attachment evidence.

## Case Matrix

The harness emits exactly seven cases:

- `MOBILE_RECONNECT`
- `BROWSER_RELOAD`
- `STALE_REQUEST_REBASE`
- `DUPLICATE_ALLOCATION_RETRY`
- `CHECKSUM_OR_SCANNER_DELAY`
- `ATTACHMENT_CONFIRMATION`
- `CROSS_DEVICE_CONTINUATION`

Every case preserves `upload_session_id`, `storage_ref`, `tenant_id`, `client_id`, `request_id`, and `frozen_request_version_ref` from `pre_session` to `post_session`.

## Recovery Rules

`post_request_projection.request_version_ref` always mirrors `post_session.live_request_version_ref`. Stale request rebase advances the live version while preserving the frozen version and clearing `current_request_upload_ref_or_null`.

Duplicate retry and cross-device continuation set `duplicate_session_created = false` and `duplicate_storage_ref_created = false`; cross-device continuation additionally proves `RESUME_EXISTING_SESSION_ONLY` and `CROSS_DEVICE_RESUME_REUSES_EXISTING_SESSION`.

Checksum/scanner delay keeps the request not-ready even when `bytes_transferred = byte_count`. Attachment confirmation starts at `CONFIRM_ATTACHMENT` and only reaches `READY_CURRENT_REQUEST_SATISFIED` after explicit attachment evidence is present.
