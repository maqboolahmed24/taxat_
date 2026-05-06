import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import type { NorthboundActorContext } from "../../../apps/control-plane-api/src/northbound/policy.ts";
import {
  type AppendOnlyAuditWriter,
  createAppendOnlyAuditWriter,
} from "../../../packages/audit/src/index.ts";
import {
  buildEnquiryPackRecord,
  type EnquiryPackRecord,
  EnquiryPackRepository,
} from "../../../packages/backend-provenance/src/index.ts";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

export const auditTenantId = "tenant.audit.pc0166";
export const auditManifestId = "manifest.audit.pc0166";
export const auditTargetRef = "target://vat-box-1/pc0166";

export function auditActorContext(
  overrides: Partial<NorthboundActorContext> = {},
): NorthboundActorContext {
  return {
    client_id_or_null: null,
    principal_ref: "principal://staff/audit-investigator",
    session_ref: "session://staff/audit-investigator",
    tenant_id: auditTenantId,
    ...overrides,
  };
}

async function appendManifestEvent(input: {
  eventTime: string;
  eventType: string;
  objectRefs?: readonly string[];
  publicationRef: string;
  writer: AppendOnlyAuditWriter;
}) {
  return input.writer.append({
    correlationContext: {
      manifest_id: auditManifestId,
      mode: "COMPLIANCE",
      root_manifest_id: auditManifestId,
      run_kind: "INTERACTIVE",
      span_id: `span${input.publicationRef.replaceAll("-", "").slice(-8).padStart(8, "0")}`,
      tenant_id: auditTenantId,
      trace_id: "11111111111111111111111111111111",
      workflow_item_id: "workflow-item.audit.pc0166",
    },
    eventTime: input.eventTime,
    eventType: input.eventType,
    objectRefs: input.objectRefs ?? [`manifest://${auditManifestId}`],
    publicationRef: input.publicationRef,
    serviceRefOrNull: "service.control-plane-api",
    tenantId: auditTenantId,
  });
}

export async function auditEventSourceFixture() {
  const writer = await createAppendOnlyAuditWriter();
  await appendManifestEvent({
    eventTime: "2026-05-04T09:00:00.000Z",
    eventType: "ManifestFrozen",
    publicationRef: "audit-pc0166-001",
    writer,
  });
  await appendManifestEvent({
    eventTime: "2026-05-04T09:01:00.000Z",
    eventType: "ManifestSealed",
    objectRefs: [`manifest://${auditManifestId}`, auditTargetRef],
    publicationRef: "audit-pc0166-002",
    writer,
  });
  await appendManifestEvent({
    eventTime: "2026-05-04T09:02:00.000Z",
    eventType: "ManifestCompleted",
    objectRefs: [`manifest://${auditManifestId}`, auditTargetRef, "log://runtime/pc0166"],
    publicationRef: "audit-pc0166-003",
    writer,
  });
  return writer;
}

function partitionContract() {
  return {
    client_id: "client.audit.pc0166",
    contract_version: "PROVENANCE_PARTITION_V1" as const,
    cross_manifest_traversal_policy: "EXPLICIT_BOUNDARY_EDGES_ONLY" as const,
    partition_scope_refs: ["vat"],
    period_scope_ref_or_null: "2026-Q1",
    scope_widening_policy: "NO_TENANT_CLIENT_OR_SCOPE_WIDENING" as const,
    tenant_id: auditTenantId,
  };
}

export function enquiryPackFixture(input: Partial<EnquiryPackRecord> = {}): EnquiryPackRecord {
  return buildEnquiryPackRecord({
    audit_refs: [`audit://proof/${auditManifestId}/target`],
    critical_path_refs: ["path://pc0166/primary", "path://pc0166/alternate"],
    generated_at: "2026-05-04T09:03:00.000Z",
    graph_ref: "evidence-graph://pc0166",
    manifest_id: auditManifestId,
    partition_contract: partitionContract(),
    primary_path_ref: "path://pc0166/primary",
    proof_bundle_ref: "proof-bundle://pc0166",
    supporting_evidence_refs: ["evidence://pc0166/vat-return"],
    target_ref: auditTargetRef,
    transformation_step_refs: ["edge://pc0166/calc"],
    ...input,
  });
}

export async function persistedEnquiryPackRepositoryFixture(pack = enquiryPackFixture()) {
  const repository = new EnquiryPackRepository();
  const stored = await repository.persistEnquiryPack({ pack });
  return {
    repository,
    stored,
  };
}

export async function validateContractSchema(kind: string, payload: unknown) {
  const script = `
import json
import pathlib
import sys

repo = pathlib.Path(sys.argv[1])
sys.path.insert(0, str(repo / "packages" / "contracts-core" / "python"))
from validate_contracts import (  # type: ignore
    CUSTOM_VALIDATORS,
    Draft202012Validator,
    build_registry,
    load_json,
)

kind = sys.argv[2]
payload = json.loads(sys.argv[3])
schema = load_json(repo / "packages" / "contracts-core" / "schemas" / f"{kind}.schema.json")
validator = Draft202012Validator(
    schema,
    registry=build_registry(),
    format_checker=Draft202012Validator.FORMAT_CHECKER,
)
issues = [
    f"schema:{'/'.join(map(str, error.absolute_path)) or '<root>'}: {error.message}"
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
