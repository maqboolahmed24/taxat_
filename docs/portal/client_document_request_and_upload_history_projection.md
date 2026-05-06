# Client Document Request And Upload History Projection

`pc_0180` adds one backend-authored document-request lineage model and one route-ready request-card projection for the client portal.

## Authoritative Split

- `ClientDocumentRequest` owns request truth: `latest_upload_ref` is chronology only, and `current_request_upload_ref_or_null` is the only pointer that can say an upload currently satisfies the governed request version.
- Document-route request cards own display truth: `current_upload_ref` names the current visible upload lane, while `current_artifact_upload_ref` names the default preview/download artifact.
- `document_center` aggregates request cards only after base lineage and request-local upload membership have been validated.

## Current Versus History

- Every upload row publishes `request_version_ref`, `request_binding_state`, `resumability_state`, `attachment_state`, `history_state`, `preview_posture`, and `preview_reason_code`.
- Rejected, failed, superseded, or stale rows remain visible as explicit history or recovery context but cannot become `current_artifact_upload_ref`.
- Limited history is surfaced through `artifact_selection.limited_history_state` and `limited_history_count_or_null`; it does not masquerade as no history.

## Preview And Externalization

The current adapter is intentionally minimal. It publishes schema-valid `artifact_selection`, `artifact_affordance`, and `externalization_governance_contract` records for document requests so preview/download targets remain server-authored through refresh, reconnect, and narrow-screen recovery. The full artifact-affordance card can replace this adapter without changing the document-request lineage boundary.

## Fail-Closed Rules

The projector rejects duplicate request-local `upload_session_id` values, dangling `latest_upload_ref`, dangling current request pointers, dangling request-card current pointers, withdrawn lineage leakage, expired requests without `due_at`, and request-card status that contradicts the mounted current upload transfer posture.
