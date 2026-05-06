import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { expect, test } from "@playwright/test";

import { createAppendOnlyAuditWriter } from "../../../packages/audit/src/index.ts";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

async function validateContract(kind: "audit_event", payload: unknown) {
  const script = `
import json
import pathlib
import sys

repo = pathlib.Path(sys.argv[1])
sys.path.insert(0, str(repo / "packages" / "contracts-core" / "python"))
from validate_contracts import (  # type: ignore
    CUSTOM_VALIDATORS,
    Draft202012Validator,
    SCHEMA_DIR,
    build_registry,
    load_json,
)

payload = json.loads(sys.argv[3])
kind = sys.argv[2]
schema = load_json(SCHEMA_DIR / f"{kind}.schema.json")
validator = Draft202012Validator(
    schema,
    registry=build_registry(),
    format_checker=Draft202012Validator.FORMAT_CHECKER,
)
issues = [
    f"schema:<{'/'.join(map(str, error.absolute_path)) or '<root>'}>: {error.message}"
    for error in sorted(validator.iter_errors(payload), key=lambda error: list(error.absolute_path))
]
custom_validator = CUSTOM_VALIDATORS.get(kind)
if custom_validator:
    issues.extend(
        f"custom:{getattr(issue, 'location', 'inline')}: {getattr(issue, 'message', str(issue))}"
        for issue in custom_validator(payload, "inline")
    )
if issues:
    raise SystemExit("\\n".join(issues))
`;

  await execFileAsync(path.join(repoRoot, ".venv", "bin", "python3"), [
    "-c",
    script,
    repoRoot,
    kind,
    JSON.stringify(payload),
  ]);
}

test("builds schema-aligned append-only audit rows and treats exact duplicate publication as a no-op", async () => {
  const writer = await createAppendOnlyAuditWriter();
  await writer.append({
    correlationContext: {
      manifest_id: "manifest.audit.unit.076",
      mode: "COMPLIANCE",
      root_manifest_id: "manifest.audit.unit.076",
      run_kind: "INTERACTIVE",
      tenant_id: "tenant.taxat",
      workflow_item_id: "workflow.audit.unit.076",
    },
    eventTime: "2026-04-23T13:00:00Z",
    eventType: "ManifestFrozen",
    publicationRef: "audit-unit-root",
    serviceRefOrNull: "service.control-plane-api",
    tenantId: "tenant.taxat",
  });
  const sealed = await writer.append({
    correlationContext: {
      manifest_id: "manifest.audit.unit.076",
      mode: "COMPLIANCE",
      root_manifest_id: "manifest.audit.unit.076",
      run_kind: "INTERACTIVE",
      tenant_id: "tenant.taxat",
      workflow_item_id: "workflow.audit.unit.076",
    },
    eventTime: "2026-04-23T13:01:00Z",
    eventType: "ManifestSealed",
    publicationRef: "audit-unit-duplicate",
    serviceRefOrNull: "service.control-plane-api",
    tenantId: "tenant.taxat",
  });
  const duplicate = await writer.append({
    correlationContext: {
      manifest_id: "manifest.audit.unit.076",
      mode: "COMPLIANCE",
      root_manifest_id: "manifest.audit.unit.076",
      run_kind: "INTERACTIVE",
      tenant_id: "tenant.taxat",
      workflow_item_id: "workflow.audit.unit.076",
    },
    eventTime: "2026-04-23T13:01:00Z",
    eventType: "ManifestSealed",
    publicationRef: "audit-unit-duplicate",
    serviceRefOrNull: "service.control-plane-api",
    tenantId: "tenant.taxat",
  });

  expect(sealed.status).toBe("APPENDED");
  expect(duplicate.status).toBe("DUPLICATE_IGNORED");
  expect(duplicate.storedEvent.event.audit_event_id).toBe(sealed.storedEvent.event.audit_event_id);
  expect(sealed.storedEvent.event.stream_sequence).toBe(2);
  expect(sealed.storedEvent.event.prev_event_hash).toBeTruthy();

  await validateContract("audit_event", sealed.storedEvent.event);
});

test("keeps signature failure out-of-band while preserving limited retained context", async () => {
  const writer = await createAppendOnlyAuditWriter();

  await writer.append({
    correlationContext: {
      manifest_id: "manifest.audit.limited.076",
      retention_class: "regulated_record",
      tenant_id: "tenant.taxat",
      workflow_item_id: "workflow.audit.limited.076",
    },
    eventTime: "2026-04-23T13:20:00Z",
    eventType: "RetentionApplied",
    objectRefs: ["artifact.audit.076"],
    publicationRef: "audit-unit-limited-root",
    serviceRefOrNull: "service.retention-engine",
    tenantId: "tenant.taxat",
  });
  const limited = await writer.append({
    correlationContext: {
      manifest_id: "manifest.audit.limited.076",
      retention_class: "regulated_record",
      tenant_id: "tenant.taxat",
      workflow_item_id: "workflow.audit.limited.076",
    },
    eventTime: "2026-04-23T13:30:00Z",
    eventType: "RetentionLimited",
    limitationReasonCodes: ["PAYLOAD_EXPIRED", "RETENTION_LIMIT_ACTIVE"],
    lineageRefs: ["lineage.audit.076", "manifest.audit.limited.076"],
    objectRefs: ["artifact.audit.076"],
    payloadAvailabilityState: "HASH_ONLY",
    payloadExpiryAtOrNull: "2026-04-23T13:30:00Z",
    publicationRef: "audit-unit-limited",
    reasonCodes: ["PAYLOAD_EXPIRED"],
    serviceRefOrNull: "service.retention-engine",
    tenantId: "tenant.taxat",
  });
  await writer.append({
    eventTime: "2026-04-23T13:35:00Z",
    eventType: "BuildAttested",
    objectRefs: ["release.bundle.076"],
    publicationRef: "audit-unit-release-root",
    reasonCodes: ["ATTESTATION_PUBLISHED"],
    serviceRefOrNull: "service.release-engine",
    tenantId: "tenant.taxat",
  });
  const release = await writer.append({
    eventTime: "2026-04-23T13:36:00Z",
    eventType: "ReleasePromoted",
    objectRefs: ["release.bundle.076"],
    publicationRef: "audit-unit-release",
    reasonCodes: ["PROMOTION_APPROVED"],
    serviceRefOrNull: "service.release-engine",
    tenantId: "tenant.taxat",
  });

  const beforeId = release.storedEvent.event.audit_event_id;
  const beforeHash = release.storedEvent.chain_hash;
  writer.markSignatureBatchOutcome({
    failureReasonCodeOrNull: "KMS_BATCH_TIMEOUT",
    signatureRef: release.storedEvent.event.signature_ref,
    state: "FAILED",
  });
  const updated = writer
    .readStream(release.storedEvent.event.audit_stream_ref)
    .find((entry) => entry.event.audit_event_id === release.storedEvent.event.audit_event_id);

  expect(limited.storedEvent.event.retained_context.audit_sufficiency_state).toBe("LIMITED");
  expect(limited.storedEvent.event.retained_context.payload_availability_state).toBe("HASH_ONLY");
  expect(updated?.event.audit_event_id).toBe(beforeId);
  expect(updated?.chain_hash).toBe(beforeHash);
  expect(updated?.signature_batch_state).toBe("FAILED");
  expect(updated?.signature_failure_reason_code_or_null).toBe("KMS_BATCH_TIMEOUT");

  await validateContract("audit_event", limited.storedEvent.event);
});
