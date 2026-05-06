# Client Compatibility Matrix Generation

`ClientCompatibilityMatrix` is first-class release evidence for the supported browser and macOS client window. The backend-release implementation is intentionally bound to the Algorithm contract rather than the generated matrix type, because the generated `ClientCompatibilityMatrix` type currently omits the top-level evidence fields required by the schema.

Local implementation:

- [Model](../../packages/backend-release/src/models/client_compatibility_matrix.ts)
- [State derivation](../../packages/backend-release/src/services/derive_client_matrix_state.ts)
- [Generator](../../packages/backend-release/src/services/generate_client_compatibility_matrix.ts)
- [Repository](../../packages/backend-release/src/repositories/client_compatibility_matrix_repository.ts)
- [Algorithm schema](../../Algorithm/schemas/client_compatibility_matrix.schema.json)
- [Algorithm validator](../../Algorithm/scripts/validate_contracts.py)

Generation rules:

- The matrix binds the exact `ReleaseCandidateIdentityContract`, `SchemaBundleCompatibilityGateContract`, `candidate_identity_hash`, `candidate_environment_ref`, `build_artifact_ref`, and `supported_client_window_ref`.
- A candidate with `supported_client_window_ref_or_null = null` cannot generate a green matrix.
- Browser and macOS row families are canonicalized by `client_version`, then scenario order:
  `OLDEST_SUPPORTED_TO_CURRENT_SERVER`, `CURRENT_CLIENT_TO_ROLLBACK_SAFE_SERVER`.
- Duplicate `(client_version, scenario)` rows are rejected.
- Every tested client version must retain both required compatibility scenarios.
- `matrix_state = GREEN` is derived only when every row is compatible and the shared compatibility gate has `native_client_window_state = VERIFIED_COMPATIBLE`.
- `matrix_state = RED` is derived only when at least one row is incompatible and the shared compatibility gate has `native_client_window_state = BLOCKED`.

The repository persists immutable matrix evidence by `compatibility_matrix_id`, validates the payload against `client_compatibility_matrix.schema.json`, and indexes by candidate, build artifact, supported client window, and matrix state. A later persist with the same matrix id is idempotent only when the payload hash is unchanged.
