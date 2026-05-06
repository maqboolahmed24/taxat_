import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { AddressInfo } from "node:net";
import { expect, test } from "@playwright/test";

import {
  getDeploymentReleaseBundleRoutePath,
  getReleaseCandidateIdentityBundleRoutePath,
  getReleaseVerificationManifestBundleRoutePath,
  registerInternalReleaseCandidateEvidenceRoutes,
  type InternalReleaseEvidenceRouteHandlers,
} from "../index.ts";
import { releaseEvidenceFixture } from "./release_candidate_evidence_test_fixtures.ts";

type ReleaseEvidenceHandler =
  InternalReleaseEvidenceRouteHandlers[keyof InternalReleaseEvidenceRouteHandlers];

async function releaseEvidenceHttpHarness() {
  const fixture = await releaseEvidenceFixture();
  const registered = new Map<string, ReleaseEvidenceHandler>();
  registerInternalReleaseCandidateEvidenceRoutes(
    {
      get: (path, handler) => {
        registered.set(path, handler as ReleaseEvidenceHandler);
      },
    },
    { source: fixture.source },
  );

  const server = createServer(
    async (request: IncomingMessage, response: ServerResponse) => {
      const url = new URL(request.url ?? "/", "http://127.0.0.1");
      const handler = registered.get(url.pathname);
      if (handler === undefined) {
        response.writeHead(404, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ problem_code: "HTTP_ROUTE_INVALID" }));
        return;
      }
      const result = await handler({
        correlationId: String(
          request.headers["x-correlation-id"] ?? "corr.api.release-evidence",
        ),
        ifNoneMatch:
          typeof request.headers["if-none-match"] === "string"
            ? request.headers["if-none-match"]
            : null,
        method: request.method,
        path: `${url.pathname}${url.search}`,
        principalClass:
          typeof request.headers["x-principal-class"] === "string"
            ? request.headers["x-principal-class"]
            : null,
      });
      response.writeHead(result.status, {
        "Content-Type": "application/json",
        ...result.headers,
      });
      response.end(result.body === null ? "" : JSON.stringify(result.body));
    },
  );

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });
  const port = (server.address() as AddressInfo).port;
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    candidateHash: fixture.candidate.candidate_identity_hash,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
    currentManifestId: fixture.currentManifestId,
    deploymentReleaseId: fixture.deploymentReleaseId,
    registered,
  };
}

test("internal release evidence routes register and serve APIRequestContext reads", async ({
  request,
}) => {
  const harness = await releaseEvidenceHttpHarness();
  try {
    expect([...harness.registered.keys()].sort()).toEqual(
      [
        getDeploymentReleaseBundleRoutePath,
        getReleaseCandidateIdentityBundleRoutePath,
        getReleaseVerificationManifestBundleRoutePath,
      ].sort(),
    );
    const headers = { "X-Principal-Class": "INTERNAL_ADMIN" };
    const candidate = await request.get(
      `${harness.baseUrl}${getReleaseCandidateIdentityBundleRoutePath}?candidate_identity_hash=${encodeURIComponent(
        harness.candidateHash,
      )}`,
      { headers },
    );
    const manifest = await request.get(
      `${harness.baseUrl}${getReleaseVerificationManifestBundleRoutePath}?verification_manifest_id=${encodeURIComponent(
        harness.currentManifestId,
      )}`,
      { headers },
    );
    const release = await request.get(
      `${harness.baseUrl}${getDeploymentReleaseBundleRoutePath}?release_id=${encodeURIComponent(
        harness.deploymentReleaseId,
      )}`,
      { headers },
    );

    for (const response of [candidate, manifest, release]) {
      expect(response.status()).toBe(200);
      expect(response.headers()["cache-control"]).toBe("no-store");
      expect(response.headers().etag).toMatch(/^"release-evidence\.[a-f0-9]{64}"$/);
    }
    expect((await candidate.json()).artifact_type).toBe(
      "ReleaseCandidateIdentityBundle",
    );
    expect((await manifest.json()).artifact_type).toBe(
      "ReleaseVerificationManifestBundle",
    );
    expect((await release.json()).artifact_type).toBe(
      "DeploymentReleaseEvidenceBundle",
    );

    const etag = candidate.headers().etag;
    const conditional = await request.get(
      `${harness.baseUrl}${getReleaseCandidateIdentityBundleRoutePath}?candidate_identity_hash=${encodeURIComponent(
        harness.candidateHash,
      )}`,
      {
        headers: {
          ...headers,
          "If-None-Match": etag,
        },
      },
    );
    expect(conditional.status()).toBe(304);
    expect(conditional.headers().etag).toBe(etag);
    expect(await conditional.text()).toBe("");
  } finally {
    await harness.close();
  }
});

test("internal release evidence routes hide without admin boundary and return typed problems", async ({
  request,
}) => {
  const harness = await releaseEvidenceHttpHarness();
  try {
    const hidden = await request.get(
      `${harness.baseUrl}${getReleaseCandidateIdentityBundleRoutePath}?candidate_identity_hash=${encodeURIComponent(
        harness.candidateHash,
      )}`,
      {
        headers: {
          "X-Principal-Class": "CUSTOMER",
        },
      },
    );
    expect(hidden.status()).toBe(404);
    const hiddenProblem = await hidden.json();
    expect(hiddenProblem.artifact_type).toBe("ProblemEnvelope");
    expect(hiddenProblem.problem_code).toBe("RELEASE_EVIDENCE_NOT_VISIBLE");
    expect(hiddenProblem.reason_codes).toContain(
      "RELEASE_EVIDENCE_INTERNAL_ADMIN_REQUIRED",
    );

    const invalid = await request.get(
      `${harness.baseUrl}${getReleaseVerificationManifestBundleRoutePath}`,
      {
        headers: {
          "X-Principal-Class": "INTERNAL_ADMIN",
        },
      },
    );
    expect(invalid.status()).toBe(400);
    const invalidProblem = await invalid.json();
    expect(invalidProblem.problem_code).toBe("RELEASE_EVIDENCE_QUERY_INVALID");
    expect(invalidProblem.reason_codes).toContain(
      "RELEASE_EVIDENCE_FIELD_INVALID",
    );
  } finally {
    await harness.close();
  }
});
