# Customer-Safe Projection And Visibility Partition Enforcement

`packages/backend-workflow/src/contracts` owns the canonical workflow boundary for customer-visible read models. Projectors and notification-open paths must call `assertCustomerSafeProjectionAlignment` before route-visible payloads are persisted or reopened.

## Contract Ownership

Artifacts that require non-null `customer_safe_projection`:

- `WorkspaceSnapshot` with `viewer_scope = CUSTOMER_VISIBLE`
- `CustomerRequestListSnapshot`
- `CollaborationActivitySlice` with `viewer_scope = CUSTOMER_VISIBLE`
- `CollaborationAttachmentSlice` with `viewer_scope = CUSTOMER_VISIBLE`
- `WorkspaceStreamEvent` with `visibility_class = CUSTOMER_VISIBLE`
- `WorkItemNotification` with `visibility_class = CUSTOMER_VISIBLE`

Artifacts that must keep `customer_safe_projection = null`:

- staff `WorkspaceSnapshot`
- staff/internal `CollaborationActivitySlice`
- staff/internal `CollaborationAttachmentSlice`
- staff/internal `WorkspaceStreamEvent`
- internal-only `WorkItemNotification`
- work-inbox snapshots and deltas

## Binding Relationship

For every customer-safe artifact:

- `visibility_partition.access_binding_hash` must equal artifact `access_binding_hash`
- `visibility_partition.masking_posture_fingerprint` must equal artifact `masking_posture_fingerprint`
- `customer_safe_projection.access_binding_hash` must equal `visibility_partition.access_binding_hash`
- `customer_safe_projection.masking_posture_fingerprint` must equal `visibility_partition.masking_posture_fingerprint`
- `customer_safe_projection.visibility_cache_partition_key` must equal `visibility_partition.cache_partition_key`
- cache isolation and cross-device continuity contracts must mirror the same access, masking, and cache basis when present

## Fail-Closed Field Families

`stripInternalOnlyProjectionFields` removes and reports these staff-only families before customer publication:

- assignment state
- escalation logic
- raw gate state
- staff reason codes
- audit lineage
- internal activity
- internal attachments
- internal participants
- internal counts
- staff route context

The enforcement path fails closed if those families remain meaningful in a customer-visible artifact. Nulls, false booleans, and empty arrays are treated as cleared fields.

## Route And Action Rules

Customer-safe `authoritative_action` contracts may only expose `REPLY`, `UPLOAD_FILE`, and `RESPOND_TO_REQUEST_INFO`. Recovery routes and notification targets must stay in the portal route family. Customer-visible notifications must keep `notification_navigation_policy = PORTAL_SAME_SHELL_AND_VISIBILITY_ONLY` and may not target `INTERNAL_ACTIVITY`, `LINKED_CONTEXT`, or `AUDIT_TRAIL`.

## Verification

Coverage lives in:

- `tests/unit/backend_workflow/customer_safe_projection_contract.spec.ts`
- `tests/unit/backend_workflow/visibility_partition_contract.spec.ts`
- `tests/integration/backend_workflow/customer_safe_boundary_enforcement_flow.spec.ts`
- `tests/playwright/admin_console/customer_safe_boundary_inspector.spec.ts`
