import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { expect, test } from "@playwright/test";

import {
  AuthorityEdgeResolutionService,
  AuthorityLinkRepository,
  type CreateExceptionalAuthorityGrantInput,
  DelegationGrantRepository,
  ExceptionalAuthorityGrantRepository,
  TenantRepository,
  buildAuthorityLinkLineageKey,
  buildDelegationGrantLineageKey,
  buildExceptionalAuthorityGrantLineageKey,
} from "../../../packages/backend-access/src/index.ts";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const migrationPath = path.join(
  repoRoot,
  "db",
  "migrations",
  "phase03_0003_delegation_authority_exception_repositories.sql",
);
const delegationPolicyPath = path.join(
  repoRoot,
  "config",
  "access",
  "delegation_freshness_policy.json",
);
const exceptionalPolicyPath = path.join(
  repoRoot,
  "config",
  "access",
  "exceptional_authority_policy.json",
);

async function validatePayloadAgainstSchema(schemaName: string, payload: unknown) {
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

schema_name = sys.argv[2]
payload = json.loads(sys.argv[3])
schema = load_json(repo / "packages" / "contracts-core" / "schemas" / schema_name)
validator = Draft202012Validator(
    schema,
    registry=build_registry(),
    format_checker=Draft202012Validator.FORMAT_CHECKER,
)
issues = [
    f"schema:<{'/'.join(map(str, error.absolute_path)) or '<root>'}>: {error.message}"
    for error in sorted(validator.iter_errors(payload), key=lambda error: list(error.absolute_path))
]
custom_validator = CUSTOM_VALIDATORS.get(schema_name.replace(".schema.json", ""))
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
    schemaName,
    JSON.stringify(payload),
  ]);
}

test.describe.configure({ mode: "serial" });

test("migration and policy files freeze the delegation, authority-link, and exceptional-authority storage contract", async () => {
  const [migrationSql, delegationPolicyRaw, exceptionalPolicyRaw] = await Promise.all([
    readFile(migrationPath, "utf8"),
    readFile(delegationPolicyPath, "utf8"),
    readFile(exceptionalPolicyPath, "utf8"),
  ]);
  const delegationPolicy = JSON.parse(delegationPolicyRaw) as {
    contract_version: string;
    revalidation_window_hours: number;
  };
  const exceptionalPolicy = JSON.parse(exceptionalPolicyRaw) as {
    contract_version: string;
    human_facing_terms: { digital_handshake_label: string };
    compare_and_swap_required: boolean;
  };

  expect(migrationSql).toContain("CREATE TABLE IF NOT EXISTS control_access.delegation_grant_register");
  expect(migrationSql).toContain("CREATE TABLE IF NOT EXISTS control_access.authority_link_register");
  expect(migrationSql).toContain("CREATE TABLE IF NOT EXISTS control_access.exceptional_authority_grant_register");
  expect(migrationSql).toContain("CREATE TABLE IF NOT EXISTS control_access.delegation_grant_snapshot_register");
  expect(migrationSql).toContain("CREATE TABLE IF NOT EXISTS control_access.authority_link_snapshot_register");
  expect(migrationSql).toContain("CREATE TABLE IF NOT EXISTS control_access.exceptional_authority_grant_snapshot_register");
  expect(migrationSql).toContain("CREATE TABLE IF NOT EXISTS control_access.exceptional_authority_usage_log");
  expect(migrationSql).toContain("CREATE UNIQUE INDEX IF NOT EXISTS delegation_grant_lineage_lookup");
  expect(migrationSql).toContain("CREATE INDEX IF NOT EXISTS authority_link_reporting_authorised_lookup");
  expect(migrationSql).toContain("CREATE INDEX IF NOT EXISTS exceptional_authority_client_action_lookup");
  expect(migrationSql).toContain("ENABLE ROW LEVEL SECURITY");
  expect(migrationSql).toContain("control_support.require_tenant_context()");

  expect(delegationPolicy.contract_version).toBe("DELEGATION_FRESHNESS_POLICY_V1");
  expect(delegationPolicy.revalidation_window_hours).toBe(24);
  expect(exceptionalPolicy.contract_version).toBe("EXCEPTIONAL_AUTHORITY_POLICY_V1");
  expect(exceptionalPolicy.compare_and_swap_required).toBe(true);
  expect(exceptionalPolicy.human_facing_terms.digital_handshake_label).toBe(
    "authorisation link",
  );
});

test("repositories preserve schema-valid snapshots, lineage queries, stale-import fail-closed posture, and CAS-safe bounded usage", async () => {
  const tenantRepository = new TenantRepository();
  const delegationGrantRepository = new DelegationGrantRepository({ tenantRepository });
  const authorityLinkRepository = new AuthorityLinkRepository({
    tenantRepository,
    delegationGrantRepository,
  });
  const exceptionalAuthorityGrantRepository = new ExceptionalAuthorityGrantRepository({
    tenantRepository,
  });
  const edgeResolutionService = new AuthorityEdgeResolutionService({
    delegationGrantRepository,
    authorityLinkRepository,
    exceptionalAuthorityGrantRepository,
  });

  await tenantRepository.create({
    artifact_type: "Tenant",
    tenant_id: "tenant.taxat",
    name: "Taxat Sandbox",
    policy_profile_id: "policy.default",
    default_retention_profile_id: "retention.default",
    lifecycle_state: "ACTIVE",
    disabled_at: null,
    created_at: "2026-04-23T08:00:00Z",
  });

  const delegationGrant = {
    artifact_type: "DelegationGrant" as const,
    delegation_grant_id: "delegation-grant.dg-201",
    tenant_id: "tenant.taxat",
    reporting_subject_ref: "reporting-subject.client-201",
    delegate_ref: "delegate.agent-201",
    delegate_class: "HUMAN" as const,
    authority_scope_refs: ["submit_returns"],
    partition_scope_refs: ["partition.uk.vat"],
    basis_type: "SELF_ASSESSMENT_IMPORTED" as const,
    basis_evidence_refs: ["evidence.import.201"],
    effective_from: "2026-04-23T08:00:00Z",
    expires_at: null,
    revoked_at: null,
    superseded_by_grant_id: null,
    lifecycle_state: "ACTIVE" as const,
    last_validated_at: "2026-04-23T09:00:00Z",
    imported_evidence_fresh_until: "2026-04-25T00:00:00Z",
    limitation_reason_codes: [],
  };
  await validatePayloadAgainstSchema("delegation_grant.schema.json", delegationGrant);
  const createdDelegation = await delegationGrantRepository.create(delegationGrant);
  const originalDelegationSnapshotRef = createdDelegation.snapshot_ref;

  const revalidatedDelegation = await delegationGrantRepository.revalidateGrant(
    "tenant.taxat",
    delegationGrant.delegation_grant_id,
    {
      last_validated_at: "2026-04-24T08:00:00Z",
      imported_evidence_fresh_until: "2026-04-25T12:00:00Z",
      reason_code: "DELEGATION_REVALIDATED",
    },
  );
  const delegationLineageSnapshots =
    await delegationGrantRepository.listSnapshotsByLineageKey(
      "tenant.taxat",
      buildDelegationGrantLineageKey(revalidatedDelegation.record),
    );
  expect(delegationLineageSnapshots).toHaveLength(2);

  const authorityLink = {
    artifact_type: "AuthorityLink" as const,
    authority_link_id: "authority-link.al-201",
    tenant_id: "tenant.taxat",
    client_id: "client.taxpayer.201",
    reporting_subject_ref: "reporting-subject.client-201",
    authority_name: "HMRC-MTD",
    authority_scope: "submit_returns",
    provider_environment: "sandbox",
    provider_api_version: "v1",
    authorised_party_ref: "delegate.agent-201",
    delegation_grant_ref: delegationGrant.delegation_grant_id,
    partition_scope_refs: ["partition.uk.vat"],
    token_binding_profile_ref: "token-binding-profile.201",
    validated_at: "2026-04-24T09:00:00Z",
    expires_at: "2026-05-24T09:00:00Z",
    revoked_at: null,
    superseded_by_link_id: null,
    lifecycle_state: "AUTHORISED_ACTIVE" as const,
    binding_health: "HEALTHY" as const,
    delegation_state: "SATISFIED" as const,
    token_client_binding_state: "BOUND" as const,
    source_evidence_refs: ["evidence.authority-link.201"],
    blocked_reason_codes: [],
    last_binding_check_at: "2026-04-24T09:15:00Z",
  };
  await validatePayloadAgainstSchema("authority_link.schema.json", authorityLink);
  const createdAuthorityLink = await authorityLinkRepository.create(authorityLink);
  const originalAuthoritySnapshotRef = createdAuthorityLink.snapshot_ref;

  const reboundAuthorityLink = await authorityLinkRepository.recordBindingCheck(
    "tenant.taxat",
    authorityLink.authority_link_id,
    {
      checked_at: "2026-04-24T10:00:00Z",
      delegation_state: "SATISFIED",
      expires_at: "2026-05-26T09:00:00Z",
      reason_code: "AUTHORITY_LINK_REVALIDATED",
      token_binding_profile_ref: "token-binding-profile.201",
      token_client_binding_state: "BOUND",
      source_evidence_refs: ["evidence.authority-link.201", "evidence.authority-link.201b"],
    },
  );
  const authorityLineageSnapshots =
    await authorityLinkRepository.listSnapshotsByLineageKey(
      "tenant.taxat",
      buildAuthorityLinkLineageKey(reboundAuthorityLink.record),
    );
  expect(authorityLineageSnapshots).toHaveLength(2);

  const exceptionalGrant = {
    artifact_type: "ExceptionalAuthorityGrant" as const,
    exceptional_grant_id: "exceptional-authority.ea-201",
    incident_ref: "incident.inc-201",
    target_action_family: "CREATE_OVERRIDE",
    tenant_id: "tenant.taxat",
    client_id: "client.taxpayer.201",
    partition_scope_refs: ["partition.uk.vat"],
    requesting_principal_ref: "principal.operator.201",
    requesting_principal_class: "HUMAN" as const,
    approving_principal_ref: "principal.approver.201",
    approving_principal_class: "HUMAN" as const,
    activated_at: "2026-04-24T11:00:00Z",
    expires_at: "2026-04-24T18:00:00Z",
    revoked_at: null,
    usage_limit: 2,
    remaining_uses: 2,
    rationale: "bounded internal override while upstream authority is unavailable",
    compensating_control_refs: ["control.four-eyes-review"],
    lifecycle_state: "ACTIVE" as const,
    approval_step_up_state: "SATISFIED" as const,
    approval_step_up_evidence_ref: "step-up-evidence.201",
    self_approved: false,
    authority_acknowledgement_override_permitted: false,
    delegation_substitution_permitted: false,
    silent_client_widening_permitted: false,
    declaration_sign_without_signatory_basis_permitted: false,
    truth_confirmation_override_permitted: false,
    silent_partition_widening_permitted: false,
  } satisfies CreateExceptionalAuthorityGrantInput;
  await validatePayloadAgainstSchema(
    "exceptional_authority_grant.schema.json",
    exceptionalGrant,
  );
  const createdExceptional = await exceptionalAuthorityGrantRepository.create(exceptionalGrant);
  const originalExceptionalSnapshotRef = createdExceptional.snapshot_ref;

  const firstConsume = await exceptionalAuthorityGrantRepository.consumeUse(
    "tenant.taxat",
    exceptionalGrant.exceptional_grant_id,
    {
      expected_remaining_uses: 2,
      reason_code: "EXCEPTIONAL_AUTHORITY_CONSUMED",
      used_at: "2026-04-24T11:30:00Z",
    },
  );
  const secondConsume = await exceptionalAuthorityGrantRepository.consumeUse(
    "tenant.taxat",
    exceptionalGrant.exceptional_grant_id,
    {
      expected_remaining_uses: 1,
      reason_code: "EXCEPTIONAL_AUTHORITY_CONSUMED",
      used_at: "2026-04-24T11:45:00Z",
    },
  );
  expect(firstConsume.usage_ledger_entry.remaining_uses_after).toBe(1);
  expect(secondConsume.usage_ledger_entry.remaining_uses_after).toBe(0);

  await expect(
    exceptionalAuthorityGrantRepository.consumeUse(
      "tenant.taxat",
      exceptionalGrant.exceptional_grant_id,
      {
        expected_remaining_uses: 1,
        reason_code: "EXCEPTIONAL_AUTHORITY_CONSUMED",
        used_at: "2026-04-24T11:46:00Z",
      },
    ),
  ).rejects.toMatchObject({
    code: "EXCEPTIONAL_AUTHORITY_CAS_MISMATCH",
  });

  await expect(
    exceptionalAuthorityGrantRepository.consumeUse(
      "tenant.taxat",
      exceptionalGrant.exceptional_grant_id,
      {
        reason_code: "EXCEPTIONAL_AUTHORITY_CONSUMED",
        used_at: "2026-04-24T11:47:00Z",
      },
    ),
  ).rejects.toMatchObject({
    code: "EXCEPTIONAL_AUTHORITY_UNDERFLOW",
  });

  const exceptionalLineageSnapshots =
    await exceptionalAuthorityGrantRepository.listSnapshotsByLineageKey(
      "tenant.taxat",
      buildExceptionalAuthorityGrantLineageKey(secondConsume.record),
    );
  expect(exceptionalLineageSnapshots).toHaveLength(3);
  expect(
    await exceptionalAuthorityGrantRepository.listUsageLedger(
      "tenant.taxat",
      exceptionalGrant.exceptional_grant_id,
    ),
  ).toHaveLength(2);

  const staleImportedResolution = await edgeResolutionService.resolve({
    tenant_id: "tenant.taxat",
    client_id: "client.taxpayer.201",
    reporting_subject_ref: "reporting-subject.client-201",
    authorised_party_ref: "delegate.agent-201",
    authority_name: "HMRC-MTD",
    authority_scope: "submit_returns",
    provider_environment: "sandbox",
    provider_api_version: "v1",
    action_family: "SUBMIT_TO_AUTHORITY",
    evaluated_at: "2026-04-25T01:00:00Z",
    partition_scope_refs: ["partition.uk.vat"],
    requires_delegation: true,
    requires_authority_link: true,
    supporting_agent_posture: true,
  });

  expect(staleImportedResolution.delegation_state).toBe("SATISFIED");
  expect(staleImportedResolution.delegation_freshness_state).toBe("REVALIDATION_REQUIRED");
  expect(staleImportedResolution.authority_link_state).toBe("AUTHORISED_ACTIVE");
  expect(staleImportedResolution.blocked_reason_codes).toEqual(
    expect.arrayContaining([
      "CLIENT_DELEGATION_REVALIDATION_REQUIRED",
      "MAIN_AGENT_ONLY_ACTION_FAMILY",
    ]),
  );

  await delegationGrantRepository.revokeGrant("tenant.taxat", delegationGrant.delegation_grant_id, {
    reason_code: "DELEGATION_REVOKED",
    revoked_at: "2026-04-25T02:00:00Z",
  });
  await authorityLinkRepository.revokeLink("tenant.taxat", authorityLink.authority_link_id, {
    reason_code: "AUTHORITY_LINK_REVOKED",
    revoked_at: "2026-04-25T02:01:00Z",
  });

  expect(
    (await delegationGrantRepository.requireSnapshotByRef(originalDelegationSnapshotRef)).record
      .lifecycle_state,
  ).toBe("ACTIVE");
  expect(
    (await authorityLinkRepository.requireSnapshotByRef(originalAuthoritySnapshotRef)).record
      .lifecycle_state,
  ).toBe("AUTHORISED_ACTIVE");
  expect(
    (
      await exceptionalAuthorityGrantRepository.requireSnapshotByRef(
        originalExceptionalSnapshotRef,
      )
    ).record.lifecycle_state,
  ).toBe("ACTIVE");
});
