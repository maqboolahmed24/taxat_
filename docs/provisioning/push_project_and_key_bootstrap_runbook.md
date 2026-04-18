# Push Project And Key Bootstrap Runbook

## Scope

This pack freezes the current Taxat device-messaging control plane posture for notification transport and notification-open continuity.

It covers:

- the authoritative push provider topology for current Taxat surfaces
- environment-bound Firebase-compatible project adoption or creation
- APNs binding required for native macOS operator delivery
- vault-safe lineage for service-account and APNs key material
- machine-readable continuity rules for push-eligible notification families
- the provisioning viewer surface `device-messaging-topology-board`

It does **not** cover:

- customer portal web push
- operator web push
- speculative iOS, iPadOS, Android, or other mobile app credentials
- any provider-owned source of workflow truth

## Source Gap

`shared_operating_contract_0038_to_0045.md` was absent at execution time. This runbook therefore grounds itself directly in:

- `Algorithm/collaboration_workspace_contract.md`
- `Algorithm/customer_client_portal_experience_contract.md`
- `Algorithm/northbound_api_and_session_contract.md`
- `Algorithm/macos_native_operator_workspace_blueprint.md`
- `Algorithm/security_and_runtime_hardening_contract.md`
- `Algorithm/data_model.md`
- prior outputs from `pc_0018`, `pc_0021`, `pc_0031`, `pc_0033`, and `pc_0042`
- current official Firebase Cloud Messaging and Apple APNs documentation

## Current Surface Decision

The current product posture is intentionally narrow.

- Active remote delivery is enabled only for `NATIVE_MACOS_OPERATOR`.
- Customer-visible notifications remain browser and email scoped.
- Operator web retains in-app stream and badge posture only.
- Native macOS delivery requires APNs binding now because the current source corpus explicitly calls for redaction-safe system notifications in the internal macOS operator embodiment.

The authoritative machine-readable files are:

- `config/notifications/push_channel_catalog.json`
- `config/notifications/notification_open_continuity_matrix.json`
- `data/provisioning/push_project_inventory.template.json`
- `data/provisioning/push_key_lineage.template.json`

## Truth Boundary

Push transport remains a projection only.

- `WorkItemNotification` remains the authoritative product carrier.
- Provider projects, keys, channels, and delivery receipts do not become workflow truth.
- Notification-open continuity must restore the same lawful work item and shell posture.
- Provider drift must fail closed rather than silently widening shell, route, or visibility scope.

## Channel Doctrine

The checked-in channel catalog currently publishes `6` channel rows:

- `1` local fixture sink
- `3` active native macOS channels for sandbox, pre-production, and production
- `2` explicitly deferred browser-push rows

The active notification families are:

- `ESCALATION`
- `CUSTOMER_REPLY`
- `SLA_OVERDUE`
- `SLA_BREACHED`

The explicitly excluded families are:

- `NEW_ASSIGNMENT`
- `REASSIGNMENT`
- `CUSTOMER_DUE_DATE_CHANGED`
- `SLA_DUE_SOON`
- `ITEM_RESOLVED`
- `ITEM_CANCELLED`
- `REQUEST_INFO_OPENED`
- `CUSTOMER_VISIBLE_COMMENT`

## Continuity Doctrine

The authoritative continuity map is `config/notifications/notification_open_continuity_matrix.json`.

Rules:

- Every push-eligible family must map to exactly one lawful continuity row.
- Current push-open continuity always targets `native_primary_work_item_scene`.
- The shell family remains `CALM_SHELL`.
- The return target remains `native_primary_manifest_scene` or a stricter inbox fallback.
- Customer-visible browser routes are not reused for internal native push-open.
- Parent-bound support reopening is allowed only where the source corpus explicitly permits it.

## Credential Doctrine

The authoritative key-lineage pack is `data/provisioning/push_key_lineage.template.json`.

Rules:

- All service-account and APNs key material remains `VAULT_ONLY`.
- Repo files may store only vault refs, safe aliases, and fingerprints.
- Environment-specific key material may not cross sandbox, pre-production, or production boundaries.
- No raw `.p8` material, JSON private keys, token values, or equivalent secrets may appear in repo files, traces, or screenshots.

## Operational Sequence

1. Open the provider control plane and verify semantic selectors still resolve.
2. Create or adopt the environment-bound messaging projects.
3. Reconcile APNs binding for native macOS environments.
4. Reconcile governed service-account and APNs lineage against the checked-in template pack.
5. Verify browser push remains explicitly deferred for portal and operator web.
6. Verify continuity rows still reopen the same work item in the same shell family.
7. Use the viewer board to inspect channel topology, credential lineage, and continuity targets before later delivery implementation.

## Viewer

The low-noise inspection surface is `device-messaging-topology-board` in `automation/provisioning/report_viewer`.

Use it to inspect:

- environment-specific active and deferred channels
- push-eligible notification families
- continuity targets and return anchors
- vault-safe key lineage
- the current native-only versus browser-deferred decision

## Revalidated Provider Sources

Revalidated on `2026-04-18` against current official provider documentation:

- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [Server Environment](https://firebase.google.com/docs/cloud-messaging/server-environment)
- [Authorize HTTP v1 Send Requests](https://firebase.google.com/docs/cloud-messaging/send/v1-api#authorize-http-v1-send-requests)
- [Set up a Firebase Cloud Messaging client app on Apple platforms](https://firebase.google.com/docs/cloud-messaging/ios/get-started)
- [Communicate with APNs using authentication tokens](https://developer.apple.com/help/account/capabilities/communicate-with-apns-using-authentication-tokens/)
- [Create a private key](https://developer.apple.com/help/account/keys/create-a-private-key)
