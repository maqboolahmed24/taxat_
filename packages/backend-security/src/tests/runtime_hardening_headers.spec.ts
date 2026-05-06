import { expect, test } from "@playwright/test";

import {
  applyHttpSecurityHeaders,
  buildRuntimeHardeningPolicy,
} from "../index.ts";

test("emits deny-by-default browser security headers and blocked framing posture", () => {
  const policy = buildRuntimeHardeningPolicy({
    allowed_cors_origins: ["https://operator.taxat.example"],
  });
  const headers = applyHttpSecurityHeaders({
    policy,
    route_family: "APP_SHELL",
  });

  expect(headers["Content-Security-Policy"]).toContain("script-src 'self'");
  expect(headers["Content-Security-Policy"]).toContain("frame-ancestors 'none'");
  expect(headers["X-Frame-Options"]).toBe("DENY");
  expect(headers["X-Content-Type-Options"]).toBe("nosniff");
  expect(headers["Strict-Transport-Security"]).toContain("includeSubDomains");
  expect(headers["Referrer-Policy"]).toBe("no-referrer");
  expect(headers["Permissions-Policy"]).toContain("camera=()");
});

test("uses explicit frame-ancestor registry for approved embedded content only", () => {
  const policy = buildRuntimeHardeningPolicy({
    allowed_embedded_origins: ["https://embed.taxat.example"],
  });
  const headers = applyHttpSecurityHeaders({
    policy,
    route_family: "EMBEDDED_CONTENT",
  });

  expect(headers["Content-Security-Policy"]).toContain(
    "frame-ancestors https://embed.taxat.example",
  );
  expect(headers["X-Frame-Options"]).toBeUndefined();
});

test("applies safe download/export headers and forbids direct object-store bypass", () => {
  const policy = buildRuntimeHardeningPolicy({
    allowed_cors_origins: ["https://operator.taxat.example"],
  });
  const headers = applyHttpSecurityHeaders({
    filename: "audit export.csv",
    policy,
    route_family: "DOWNLOAD_EXPORT",
  });

  expect(headers["Cache-Control"]).toBe("no-store, max-age=0");
  expect(headers["Content-Disposition"]).toBe('attachment; filename="audit_export.csv"');
  expect(headers["X-Download-Options"]).toBe("noopen");
  expect(headers["X-Taxat-Direct-Object-Store-Url-Policy"]).toBe("FORBIDDEN");
  expect(headers["X-Taxat-Export-Masking-Policy"]).toBe(
    "INHERIT_EXTERNALIZATION_GOVERNANCE",
  );
});
