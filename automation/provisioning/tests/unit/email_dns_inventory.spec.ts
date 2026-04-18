import { expect, test } from "@playwright/test";

import { createRunContext } from "../../src/core/run_context.js";
import {
  buildTemplateEmailArtifacts,
  createRecommendedFixtureState,
  validateEmailDnsInventory,
  validateMessageStreamCatalog,
  type EmailDnsInventory,
} from "../../src/providers/email/flows/create_email_account_and_sender_domain.js";

function fixtureRunContext() {
  return createRunContext({
    runId: "run-fixture-email-domain",
    providerId: "transactional-email-delivery-control-plane",
    flowId: "email-workspace-and-sender-domain-bootstrap",
    productEnvironmentId: "env_local_provisioning_workstation",
    providerEnvironment: "fixture",
    executionMode: "fixture",
    operatorIdentityAlias: "ops.email.fixture",
    workspaceId: "wk-local-provisioning-email",
    evidenceRoot: "artifacts/runs/email-domain-fixture",
  });
}

test("template builder emits environment-bound DNS inventory and stream partitions", () => {
  const artifacts = buildTemplateEmailArtifacts(
    fixtureRunContext(),
    createRecommendedFixtureState("existing"),
  );

  expect(artifacts.workspaceRecord.workspace_rows).toHaveLength(4);
  expect(artifacts.senderDomainRecord.sender_domains).toHaveLength(3);
  expect(artifacts.dnsInventory.rows).toHaveLength(12);
  expect(artifacts.messageStreamCatalog.streams).toHaveLength(9);

  validateEmailDnsInventory(artifacts.dnsInventory, artifacts.senderDomainRecord);
  validateMessageStreamCatalog(artifacts.messageStreamCatalog);

  const requiredPurposes = new Set(
    artifacts.dnsInventory.rows.map((row) => row.purpose),
  );
  expect(requiredPurposes).toEqual(
    new Set([
      "DOMAIN_VERIFICATION",
      "DKIM_SIGNING",
      "RETURN_PATH",
      "DMARC_POLICY",
    ]),
  );

  const productionStreams = artifacts.messageStreamCatalog.streams.filter(
    (stream) => stream.product_environment_id === "env_production",
  );
  expect(
    productionStreams.some((stream) => stream.stream_kind === "SANDBOX_TEST_SINK"),
  ).toBe(false);
});

test("dns inventory validator rejects rows without explicit owner or environment parity", () => {
  const artifacts = buildTemplateEmailArtifacts(
    fixtureRunContext(),
    createRecommendedFixtureState("existing"),
  );
  const brokenInventory: EmailDnsInventory = structuredClone(artifacts.dnsInventory);

  brokenInventory.rows[0]!.owner_role = "" as any;

  expect(() =>
    validateEmailDnsInventory(brokenInventory, artifacts.senderDomainRecord),
  ).toThrow(/owner role/i);
});
