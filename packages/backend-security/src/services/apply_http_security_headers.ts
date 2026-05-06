import {
  buildRuntimeHardeningPolicy,
  type RuntimeHardeningPolicy,
  type RuntimeRouteFamily,
} from "./build_runtime_hardening_policy.ts";

export type HeaderMap = Record<string, string>;

export type ApplyHttpSecurityHeadersInput = {
  existing_headers?: HeaderMap;
  filename?: string;
  policy?: RuntimeHardeningPolicy;
  route_family: RuntimeRouteFamily;
};

function csp(policy: RuntimeHardeningPolicy, routeFamily: RuntimeRouteFamily) {
  const frameAncestors =
    routeFamily === "EMBEDDED_CONTENT" && policy.csp.approved_frame_ancestors.length > 0
      ? policy.csp.approved_frame_ancestors
      : policy.csp.frame_ancestors;
  const directives: Array<[string, string[]]> = [
    ["default-src", policy.csp.default_src],
    ["script-src", policy.csp.script_src],
    ["connect-src", policy.csp.connect_src],
    ["img-src", policy.csp.img_src],
    ["style-src", policy.csp.style_src],
    ["object-src", policy.csp.object_src],
    ["base-uri", ["'self'"]],
    ["form-action", ["'self'"]],
    ["frame-ancestors", frameAncestors],
    ["upgrade-insecure-requests", []],
  ];
  return directives
    .map(([name, values]) => (values.length > 0 ? `${name} ${values.join(" ")}` : name))
    .join("; ");
}

function safeAttachmentFilename(filename: string | undefined) {
  const fallback = "taxat-export.bin";
  if (filename === undefined || filename.length === 0) {
    return fallback;
  }
  return filename.replace(/[^A-Za-z0-9._-]/g, "_");
}

export function applyHttpSecurityHeaders(input: ApplyHttpSecurityHeadersInput): HeaderMap {
  const policy = input.policy ?? buildRuntimeHardeningPolicy();
  const routePolicy = policy.route_policies[input.route_family];
  const approvedEmbedding =
    input.route_family === "EMBEDDED_CONTENT" && policy.csp.approved_frame_ancestors.length > 0;
  const headers: HeaderMap = {
    ...(input.existing_headers ?? {}),
    "Content-Security-Policy": csp(policy, input.route_family),
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
    "Referrer-Policy": policy.referrer_policy,
    "Strict-Transport-Security": `max-age=${policy.hsts.max_age_seconds}; includeSubDomains`,
    "X-Content-Type-Options": "nosniff",
  };
  if (!approvedEmbedding) {
    headers["X-Frame-Options"] = policy.x_frame_options;
  }
  if (routePolicy.safe_download_headers_required) {
    headers["Cache-Control"] = policy.safe_delivery.cache_control;
    headers["Content-Disposition"] =
      `attachment; filename="${safeAttachmentFilename(input.filename)}"`;
    headers["X-Download-Options"] = "noopen";
    headers["X-Permitted-Cross-Domain-Policies"] = "none";
    headers["X-Taxat-Export-Masking-Policy"] = policy.safe_delivery.export_masking_policy;
    headers["X-Taxat-Direct-Object-Store-Url-Policy"] =
      policy.safe_delivery.direct_object_store_url_policy;
  }
  return headers;
}
