import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const EDGE_PROVIDER_ID = "dns-tls-waf-and-edge-delivery";
export const EDGE_FLOW_ID = "provision-dns-tls-waf-and-edge-delivery";
export const EDGE_POLICY_VERSION = "1.0";
export const EDGE_LAST_VERIFIED_AT = "2026-04-22T18:45:00Z";
export const RECOMMENDED_EDGE_PROVIDER_FAMILY =
  "CLOUDFLARE_DNS_SSL_WAF_CACHE_RULES";

export type EdgeProviderFamily =
  | "CLOUDFLARE_DNS_SSL_WAF_CACHE_RULES"
  | "AWS_ROUTE53_CLOUDFRONT_AWS_WAF"
  | "FASTLY_DNS_TLS_WAF_COMPOSITE";

export type EdgeSelectionStatus =
  | "PROVIDER_DEFAULT_APPLIED"
  | "PROVIDER_CONFIRMED";

export type SurfaceFamilyRef =
  | "OPERATOR_WEB"
  | "CLIENT_PORTAL"
  | "API"
  | "CALLBACKS"
  | "ASSETS"
  | "PREVIEW"
  | "UPDATE_FEEDS";

export type RouteBehavior =
  | "HTML_SHELL"
  | "JSON_API"
  | "SSE_STREAM"
  | "SIGNED_ARTIFACT_DOWNLOAD"
  | "OAUTH_CALLBACK"
  | "AUTHORITY_CALLBACK"
  | "EMAIL_WEBHOOK"
  | "STATIC_ASSET"
  | "PREVIEW_SHELL"
  | "UPDATE_MANIFEST"
  | "UPDATE_PACKAGE";

export type CacheMode =
  | "BYPASS_EDGE_CACHE"
  | "IMMUTABLE_EDGE_CACHE"
  | "SIGNED_DELIVERY_DIGEST_PINNED_EDGE_CACHE";

export type ProvisionStepStatus =
  | "SUCCEEDED"
  | "SKIPPED_AS_ALREADY_PRESENT"
  | "BLOCKED_BY_DRIFT";

export interface SourceRef {
  source_file: string;
  source_heading_or_logical_block: string;
  source_ref: string;
  rationale: string;
}

export interface ProviderOptionRow {
  provider_family: EdgeProviderFamily;
  selection_state:
    | "PROVIDER_DEFAULT_APPLIED"
    | "PROVIDER_DECISION_REQUIRED"
    | "PROVIDER_CONFIRMED";
  provider_label: string;
  docs_urls: string[];
  dns_summary: string;
  tls_summary: string;
  waf_summary: string;
  cache_summary: string;
  preview_summary: string;
  notes: string[];
  source_refs: SourceRef[];
}

export interface HostOriginRow {
  row_ref: string;
  label: string;
  surface_family_ref: SurfaceFamilyRef;
  environment_ref: string;
  hostname: string;
  path_glob: string;
  origin_class_ref: string;
  origin_target: string;
  owning_deployable_ref: string;
  auth_posture: string;
  route_behavior: RouteBehavior;
  tls_policy_ref: string;
  waf_policy_ref: string;
  cache_policy_ref: string;
  provider_registration_allowed: boolean;
  signed_delivery_required: boolean;
  delivery_binding_hash_required: boolean;
  notes: string[];
  source_refs: SourceRef[];
}

export interface DnsAndOriginMatrix {
  schema_version: "1.0";
  matrix_id: "dns_and_origin_matrix";
  selection_status: EdgeSelectionStatus;
  selected_provider_family: EdgeProviderFamily;
  provider_option_rows: ProviderOptionRow[];
  host_origin_rows: HostOriginRow[];
  typed_gaps: string[];
  notes: string[];
  source_refs: SourceRef[];
}

export interface TlsCertificateRow {
  cert_ref: string;
  label: string;
  environment_ref: string;
  hostname_patterns: string[];
  issuance_mode:
    | "ADVANCED_CERTIFICATE_MANAGER"
    | "TOTAL_TLS_WILDCARD"
    | "UNIVERSAL_SSL_PLUS_ADVANCED_CERTS";
  wildcard_usage:
    | "NO_WILDCARD"
    | "WILDCARD_REQUIRED"
    | "TARGETED_WILDCARD_ALLOWED";
  min_tls_version: "TLS_1_2";
  tls13_enabled: boolean;
  hsts_mode:
    | "DISABLED"
    | "ENABLED_NO_PRELOAD"
    | "ENABLED_INCLUDE_SUBDOMAINS_NO_PRELOAD";
  rotation_owner_role: string;
  renewal_window_days: number;
  origin_tls_mode: "STRICT_ORIGIN_TLS_REQUIRED";
  notes: string[];
  source_refs: SourceRef[];
}

export interface TlsCertificateInventory {
  schema_version: "1.0";
  inventory_id: "tls_certificate_inventory";
  selection_status: EdgeSelectionStatus;
  selected_provider_family: EdgeProviderFamily;
  certificate_rows: TlsCertificateRow[];
  notes: string[];
  source_refs: SourceRef[];
}

export interface WafSurfaceRuleRow {
  policy_ref: string;
  label: string;
  surface_family_ref: SurfaceFamilyRef;
  hostname_patterns: string[];
  path_globs: string[];
  managed_rule_sets: string[];
  custom_rule_highlights: string[];
  challenge_posture:
    | "MANAGED_CHALLENGE"
    | "BLOCK"
    | "ALLOWLIST_AND_NO_BROWSER_CHALLENGE"
    | "ACCESS_POLICY_REQUIRED";
  allowlist_refs: string[];
  override_routes: string[];
  review_notes: string[];
  source_refs: SourceRef[];
}

export interface RateLimitRuleRow {
  policy_ref: string;
  label: string;
  surface_family_ref: SurfaceFamilyRef;
  hostname_patterns: string[];
  path_globs: string[];
  threshold: number;
  period_seconds: number;
  action_on_threshold: "MANAGED_CHALLENGE" | "BLOCK" | "LOG_ONLY";
  characteristics: string[];
  bypass_refs: string[];
  notes: string[];
  source_refs: SourceRef[];
}

export interface WafAndRateLimitPolicy {
  schema_version: "1.0";
  policy_id: "waf_and_rate_limit_policy";
  selection_status: EdgeSelectionStatus;
  selected_provider_family: EdgeProviderFamily;
  surface_rule_rows: WafSurfaceRuleRow[];
  rate_limit_rows: RateLimitRuleRow[];
  notes: string[];
  source_refs: SourceRef[];
}

export interface CachePolicyRow {
  policy_ref: string;
  label: string;
  surface_family_ref: SurfaceFamilyRef;
  hostname_patterns: string[];
  path_globs: string[];
  cache_mode: CacheMode;
  cache_key_dimensions: string[];
  requires_delivery_binding_hash: boolean;
  preview_binding_required: boolean;
  signed_delivery_required: boolean;
  authorization_context: string;
  header_contract: string[];
  transform_posture: "NO_EDGE_TRANSFORM" | "STATIC_OPTIMIZATION_ONLY";
  notes: string[];
  source_refs: SourceRef[];
}

export interface CacheAndDeliveryBindingPolicy {
  schema_version: "1.0";
  policy_id: "cache_and_delivery_binding_policy";
  selection_status: EdgeSelectionStatus;
  selected_provider_family: EdgeProviderFamily;
  policy_rows: CachePolicyRow[];
  truth_statement: string;
  notes: string[];
  source_refs: SourceRef[];
}

export interface CallbackOriginPolicyRow {
  policy_ref: string;
  label: string;
  environment_ref: string;
  hostname: string;
  path_glob: string;
  kind: "OAUTH_REDIRECT" | "AUTHORITY_CALLBACK" | "EMAIL_WEBHOOK";
  allowed_upstream_senders: string[];
  auth_posture: string;
  replay_protection: string;
  allowlist_ref_or_null: string | null;
  waf_policy_ref: string;
  dns_origin_row_ref: string;
  notes: string[];
  source_refs: SourceRef[];
}

export interface CallbackAndWebhookOriginPolicy {
  schema_version: "1.0";
  policy_id: "callback_and_webhook_origin_policy";
  selection_status: EdgeSelectionStatus;
  selected_provider_family: EdgeProviderFamily;
  callback_rows: CallbackOriginPolicyRow[];
  notes: string[];
  source_refs: SourceRef[];
}

export interface EdgeInventoryTemplate {
  schema_version: "1.0";
  inventory_id: "edge_inventory";
  provider_id: typeof EDGE_PROVIDER_ID;
  flow_id: typeof EDGE_FLOW_ID;
  policy_version: typeof EDGE_POLICY_VERSION;
  run_id: string;
  workspace_id: string;
  operator_identity_alias: string;
  selection_status: EdgeSelectionStatus;
  selected_provider_family: EdgeProviderFamily;
  provider_option_rows: ProviderOptionRow[];
  zone_root: "taxat.example";
  preview_zone_root: "review.taxat.example";
  hostname_refs: string[];
  certificate_refs: string[];
  policy_refs: string[];
  typed_gaps: string[];
  notes: string[];
  last_verified_at: string;
}

export interface EdgeBoundaryAtlasRow {
  row_ref: string;
  environment_ref: string;
  label: string;
  detail: string;
  badges: string[];
  inspector_title: string;
  inspector_lines: string[];
  hostname_or_pattern: string;
  origin_target_or_null: string | null;
  policy_refs: string[];
}

export interface EdgeBoundaryAtlasFamily {
  family_ref: SurfaceFamilyRef;
  label: string;
  summary: string;
  host_count: number;
  tls_summary: string;
  waf_summary: string;
  cache_summary: string;
  inspector_notes: string[];
  host_origin_rows: EdgeBoundaryAtlasRow[];
  tls_rows: EdgeBoundaryAtlasRow[];
  waf_rows: EdgeBoundaryAtlasRow[];
  cache_rows: EdgeBoundaryAtlasRow[];
}

export interface EdgeBoundaryAtlasViewModel {
  routeId: "edge-boundary-atlas";
  providerDisplayName: string;
  providerMonogram: string;
  selectionPosture: EdgeSelectionStatus;
  postureChipLabel: string;
  policyVersion: string;
  summary: string;
  notes: string[];
  environments: Array<{
    environment_ref: string;
    label: string;
    topology_summary: string;
    edge_posture: string;
  }>;
  families: EdgeBoundaryAtlasFamily[];
  selectedEnvironmentRef: string;
  selectedFamilyRef: SurfaceFamilyRef;
  selectedFocusRef: string | null;
}

export interface ProvisionDnsTlsWafAndEdgeDeliveryStep {
  step_id: string;
  title: string;
  status: ProvisionStepStatus;
  reason: string;
}

export interface MinimalRunContext {
  runId: string;
  workspaceId: string;
  operatorIdentityAlias: string;
}

export interface ProvisionDnsTlsWafAndEdgeDeliveryResult {
  outcome:
    | "EDGE_BOUNDARY_PROVIDER_DEFAULT_APPLIED"
    | "EDGE_BOUNDARY_READY_FOR_PROVIDER_ADOPTION"
    | "EDGE_BOUNDARY_DRIFT_REVIEW_REQUIRED";
  selection_status: EdgeSelectionStatus;
  schema: ReturnType<typeof createEdgeBoundaryTopologySchema>;
  dnsAndOriginMatrix: DnsAndOriginMatrix;
  tlsCertificateInventory: TlsCertificateInventory;
  wafAndRateLimitPolicy: WafAndRateLimitPolicy;
  cacheAndDeliveryBindingPolicy: CacheAndDeliveryBindingPolicy;
  callbackAndWebhookOriginPolicy: CallbackAndWebhookOriginPolicy;
  inventory: EdgeInventoryTemplate;
  atlasViewModel: EdgeBoundaryAtlasViewModel;
  steps: ProvisionDnsTlsWafAndEdgeDeliveryStep[];
  notes: string[];
}

const DEFAULT_RUN_CONTEXT: MinimalRunContext = {
  runId: "run-fixture-edge-boundary-001",
  workspaceId: "wk-provisioning-01",
  operatorIdentityAlias: "ops.edge.boundary",
};

const DOCS = {
  cloudflareProxyStatus: "https://developers.cloudflare.com/dns/proxy-status/",
  cloudflareWildcardDns:
    "https://developers.cloudflare.com/dns/manage-dns-records/reference/wildcard-dns-records/",
  cloudflareSsl: "https://developers.cloudflare.com/ssl/",
  cloudflareAdvancedCerts:
    "https://developers.cloudflare.com/ssl/edge-certificates/advanced-certificate-manager/",
  cloudflareHsts:
    "https://developers.cloudflare.com/ssl/edge-certificates/additional-options/http-strict-transport-security/",
  cloudflareWaf: "https://developers.cloudflare.com/waf/",
  cloudflareRateLimits:
    "https://developers.cloudflare.com/waf/rate-limiting-rules/",
  cloudflareRateParams:
    "https://developers.cloudflare.com/waf/rate-limiting-rules/parameters/",
  cloudflareCacheDefaults:
    "https://developers.cloudflare.com/cache/concepts/default-cache-behavior/",
  cloudflareCacheControl:
    "https://developers.cloudflare.com/cache/concepts/cache-control/",
  cloudflareCacheRules:
    "https://developers.cloudflare.com/cache/how-to/cache-rules/settings/",
  cloudflareBypassCookie:
    "https://developers.cloudflare.com/cache/how-to/cache-rules/examples/bypass-cache-on-cookie/",
  cloudflarePreviews:
    "https://developers.cloudflare.com/pages/configuration/preview-deployments/",
  cloudflareWebSockets: "https://developers.cloudflare.com/network/websockets/",
} as const;

const SOURCE_REFS: SourceRef[] = [
  {
    source_file: "Algorithm/northbound_api_and_session_contract.md",
    source_heading_or_logical_block: "browser and API transport expectations",
    source_ref:
      "Algorithm/northbound_api_and_session_contract.md::browser_api_transport_expectations",
    rationale:
      "Northbound API transport must preserve session safety, callback handling, uploads, and reconnect-safe routes.",
  },
  {
    source_file: "Algorithm/cache_isolation_and_secure_reuse_contract.md",
    source_heading_or_logical_block: "cache identity envelope and exact-context reuse law",
    source_ref:
      "Algorithm/cache_isolation_and_secure_reuse_contract.md::cache_identity_envelope",
    rationale:
      "Delivery binding, preview binding, masking posture, and access context determine whether edge reuse is lawful.",
  },
  {
    source_file: "Algorithm/security_and_runtime_hardening_contract.md",
    source_heading_or_logical_block: "browser/API/network hardening",
    source_ref:
      "Algorithm/security_and_runtime_hardening_contract.md::browser_api_network_hardening",
    rationale:
      "Strict transport posture, callback segregation, CSP/clickjacking, and fail-closed network defaults are required.",
  },
  {
    source_file: "Algorithm/deployment_and_resilience_contract.md",
    source_heading_or_logical_block: "reference runtime topology and promotion pipeline",
    source_ref:
      "Algorithm/deployment_and_resilience_contract.md::runtime_topology_and_promotion",
    rationale:
      "The public edge must remain environment-scoped and must not widen runtime visibility or release truth.",
  },
  {
    source_file: "data/analysis/environment_domain_dns_callback_matrix.json",
    source_heading_or_logical_block: "environment domain and callback host catalog",
    source_ref: "data/analysis/environment_domain_dns_callback_matrix.json::domain_rows",
    rationale:
      "Earlier environment work already froze the stable callback and browser hostname vocabulary.",
  },
  {
    source_file: "config/notifications/email_webhook_endpoint_contract.json",
    source_heading_or_logical_block: "callback_records",
    source_ref: "config/notifications/email_webhook_endpoint_contract.json::callback_records",
    rationale:
      "Email webhook ingress already has explicit callback hosts, auth posture, and replay-aware ledgers.",
  },
];

const EDGE_ENVIRONMENTS = [
  {
    environment_ref: "env_ephemeral_review_preview",
    label: "Preview",
    slug: "preview",
    zone_suffix: "review.taxat.example",
    topology_summary:
      "Wildcard review domains stay isolated from provider registration and remain safe for browser-only inspection.",
    edge_posture: "NO_PROVIDER_CALLBACK_TRUST",
  },
  {
    environment_ref: "env_shared_sandbox_integration",
    label: "Sandbox",
    slug: "sandbox",
    zone_suffix: "sandbox.taxat.example",
    topology_summary:
      "Stable non-production edge with registered callback hosts, strict TLS, and environment-scoped cache and WAF rules.",
    edge_posture: "SANDBOX_EDGE_ISOLATION",
  },
  {
    environment_ref: "env_preproduction_verification",
    label: "Preproduction",
    slug: "preprod",
    zone_suffix: "preprod.taxat.example",
    topology_summary:
      "Production-like edge controls with sandbox provider bindings and candidate-safe preview separation.",
    edge_posture: "PREPROD_PRODUCTION_LIKE_EDGE",
  },
  {
    environment_ref: "env_production",
    label: "Production",
    slug: "production",
    zone_suffix: "production.taxat.example",
    topology_summary:
      "Public release edge with strict TLS, typed WAF exceptions, no broad cache reuse, and callback segregation.",
    edge_posture: "FAIL_CLOSED_RELEASE_EDGE",
  },
] as const;

const STABLE_EDGE_ENVIRONMENTS = EDGE_ENVIRONMENTS.filter(
  (entry) => entry.environment_ref !== "env_ephemeral_review_preview",
);

const SURFACE_FAMILIES: SurfaceFamilyRef[] = [
  "OPERATOR_WEB",
  "CLIENT_PORTAL",
  "API",
  "CALLBACKS",
  "ASSETS",
  "PREVIEW",
  "UPDATE_FEEDS",
];

const SURFACE_LABELS: Record<SurfaceFamilyRef, string> = {
  OPERATOR_WEB: "OPERATOR_WEB",
  CLIENT_PORTAL: "CLIENT_PORTAL",
  API: "API",
  CALLBACKS: "CALLBACKS",
  ASSETS: "ASSETS",
  PREVIEW: "PREVIEW",
  UPDATE_FEEDS: "UPDATE_FEEDS",
};

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((left, right) =>
    String(left).localeCompare(String(right)),
  );
}

function stableSelectionStatus(
  providerFamilySelection?: EdgeProviderFamily,
): EdgeSelectionStatus {
  return providerFamilySelection ? "PROVIDER_CONFIRMED" : "PROVIDER_DEFAULT_APPLIED";
}

function selectedProviderFamily(
  providerFamilySelection?: EdgeProviderFamily,
): EdgeProviderFamily {
  return providerFamilySelection ?? RECOMMENDED_EDGE_PROVIDER_FAMILY;
}

function familyLabel(family: SurfaceFamilyRef): string {
  return SURFACE_LABELS[family];
}

export function createProviderOptionRows(
  providerFamilySelection?: EdgeProviderFamily,
): ProviderOptionRow[] {
  const selected = selectedProviderFamily(providerFamilySelection);
  const selectionStatus = stableSelectionStatus(providerFamilySelection);
  const cloudflareState =
    selected === "CLOUDFLARE_DNS_SSL_WAF_CACHE_RULES"
      ? selectionStatus === "PROVIDER_CONFIRMED"
        ? "PROVIDER_CONFIRMED"
        : "PROVIDER_DEFAULT_APPLIED"
      : "PROVIDER_DECISION_REQUIRED";

  return [
    {
      provider_family: "CLOUDFLARE_DNS_SSL_WAF_CACHE_RULES",
      selection_state: cloudflareState,
      provider_label: "Cloudflare DNS + edge certificates + WAF + cache rules",
      docs_urls: [
        DOCS.cloudflareProxyStatus,
        DOCS.cloudflareWildcardDns,
        DOCS.cloudflareSsl,
        DOCS.cloudflareAdvancedCerts,
        DOCS.cloudflareHsts,
        DOCS.cloudflareWaf,
        DOCS.cloudflareRateLimits,
        DOCS.cloudflareCacheRules,
        DOCS.cloudflareCacheControl,
        DOCS.cloudflareWebSockets,
      ],
      dns_summary:
        "One control plane covers proxied DNS, wildcard preview DNS, host-based separation, and fail-closed unknown-host posture.",
      tls_summary:
        "Edge certificates, HSTS, and strict origin TLS fit the stable host inventory without multi-provider drift.",
      waf_summary:
        "Managed WAF, custom rules, and rate limits can stay typed per surface family and callback exception set.",
      cache_summary:
        "Cache Rules cleanly express bypass for session/callback flows and immutable reuse for hashed static assets.",
      preview_summary:
        "Wildcard review domains are easy to isolate without letting preview hosts become provider-trusted callback surfaces.",
      notes: [
        "Chosen as the default unified edge platform because prior cards did not fix an edge provider upstream.",
        "Default does not authorize live mutation; it only freezes the portable policy and inventory set.",
      ],
      source_refs: [
        ...SOURCE_REFS,
        {
          source_file: DOCS.cloudflareCacheRules,
          source_heading_or_logical_block: "Cache Rules settings",
          source_ref: DOCS.cloudflareCacheRules,
          rationale:
            "Current Cloudflare docs confirm cache rules can declaratively bypass or enable edge caching by host/path family.",
        },
      ],
    },
    {
      provider_family: "AWS_ROUTE53_CLOUDFRONT_AWS_WAF",
      selection_state:
        selected === "AWS_ROUTE53_CLOUDFRONT_AWS_WAF"
          ? "PROVIDER_CONFIRMED"
          : "PROVIDER_DECISION_REQUIRED",
      provider_label: "Route 53 + CloudFront + AWS WAF",
      docs_urls: [],
      dns_summary:
        "Capable but split across Route 53, CloudFront, ACM, and AWS WAF instead of one edge control plane.",
      tls_summary:
        "TLS posture is workable, but certificate and DNS ownership split makes host/callback inventory drift easier.",
      waf_summary:
        "WAF and rate limiting are capable, but exception review spans multiple AWS surfaces and policies.",
      cache_summary:
        "CloudFront policies can express the law, but host/path policy review is less unified than the default option.",
      preview_summary:
        "Preview-domain isolation is feasible but less direct than a single wildcard edge platform.",
      notes: [
        "Retained as a credible alternative if platform ownership mandates AWS-native edge.",
      ],
      source_refs: SOURCE_REFS,
    },
    {
      provider_family: "FASTLY_DNS_TLS_WAF_COMPOSITE",
      selection_state:
        selected === "FASTLY_DNS_TLS_WAF_COMPOSITE"
          ? "PROVIDER_CONFIRMED"
          : "PROVIDER_DECISION_REQUIRED",
      provider_label: "Fastly edge delivery + DNS/TLS/WAF composite",
      docs_urls: [],
      dns_summary:
        "Technically capable but would likely require a split DNS/TLS/WAF arrangement instead of one consistent control plane.",
      tls_summary:
        "Can support TLS and caching law, but provider composition increases operational ambiguity.",
      waf_summary:
        "WAF and rate limits are available, but callback-path exception governance is less cohesive in a composite stack.",
      cache_summary:
        "Fastly is strong on cache controls, but this card prefers a unified DNS-to-WAF governance plane when unresolved.",
      preview_summary:
        "Preview and review-domain separation remains possible but adds cross-provider policy join points.",
      notes: [
        "Retained as an alternative where cache specialization outweighs unified control plane simplicity.",
      ],
      source_refs: SOURCE_REFS,
    },
  ];
}

function coreTlsRef(slug: string): string {
  return `tls.${slug}.core`;
}

function ingressTlsRef(slug: string): string {
  return `tls.${slug}.ingress`;
}

function stableHostRows(): HostOriginRow[] {
  return STABLE_EDGE_ENVIRONMENTS.flatMap((environment) => {
    const slug = environment.slug;
    const zone = environment.zone_suffix;
    const apiHost = `api.${zone}`;
    const sourceRefs = SOURCE_REFS;
    return [
      {
        row_ref: `${slug}.operator-shell`,
        label: "Operator application shell",
        surface_family_ref: "OPERATOR_WEB",
        environment_ref: environment.environment_ref,
        hostname: `operator.${zone}`,
        path_glob: "/*",
        origin_class_ref: "origin.operator-web.frontend",
        origin_target: `https://origin.operator-web.${slug}.svc.taxat.internal`,
        owning_deployable_ref: "deployable_operator_web_app",
        auth_posture: "SESSION_COOKIE_AND_CSRF_REQUIRED",
        route_behavior: "HTML_SHELL",
        tls_policy_ref: coreTlsRef(slug),
        waf_policy_ref: "waf.operator-web",
        cache_policy_ref: "cache.operator-shell",
        provider_registration_allowed: false,
        signed_delivery_required: false,
        delivery_binding_hash_required: false,
        notes: ["Operator HTML and route state remain non-cacheable and session-bound."],
        source_refs: sourceRefs,
      },
      {
        row_ref: `${slug}.portal-shell`,
        label: "Client portal shell",
        surface_family_ref: "CLIENT_PORTAL",
        environment_ref: environment.environment_ref,
        hostname: `portal.${zone}`,
        path_glob: "/*",
        origin_class_ref: "origin.client-portal.frontend",
        origin_target: `https://origin.client-portal.${slug}.svc.taxat.internal`,
        owning_deployable_ref: "deployable_client_portal_web_app",
        auth_posture: "CUSTOMER_SESSION_AND_MASKING_POSTURE_REQUIRED",
        route_behavior: "HTML_SHELL",
        tls_policy_ref: coreTlsRef(slug),
        waf_policy_ref: "waf.client-portal",
        cache_policy_ref: "cache.client-portal-shell",
        provider_registration_allowed: false,
        signed_delivery_required: false,
        delivery_binding_hash_required: false,
        notes: ["Portal HTML must not widen tenant, masking, or customer-safe context through cache reuse."],
        source_refs: sourceRefs,
      },
      {
        row_ref: `${slug}.api-json`,
        label: "Northbound API",
        surface_family_ref: "API",
        environment_ref: environment.environment_ref,
        hostname: apiHost,
        path_glob: "/api/*",
        origin_class_ref: "origin.northbound-api.gateway",
        origin_target: `https://origin.northbound-api.${slug}.svc.taxat.internal`,
        owning_deployable_ref: "deployable_northbound_api_session_gateway",
        auth_posture: "SESSION_OR_SERVICE_AUTH_REQUIRED",
        route_behavior: "JSON_API",
        tls_policy_ref: coreTlsRef(slug),
        waf_policy_ref: "waf.api",
        cache_policy_ref: "cache.api-json",
        provider_registration_allowed: false,
        signed_delivery_required: false,
        delivery_binding_hash_required: false,
        notes: ["API JSON routes stay non-cacheable at the edge unless a later route-specific policy says otherwise."],
        source_refs: sourceRefs,
      },
      {
        row_ref: `${slug}.api-stream`,
        label: "Recovery-safe event stream",
        surface_family_ref: "API",
        environment_ref: environment.environment_ref,
        hostname: apiHost,
        path_glob: "/api/stream/*",
        origin_class_ref: "origin.read-stream.gateway",
        origin_target: `https://origin.northbound-api.${slug}.svc.taxat.internal`,
        owning_deployable_ref: "deployable_read_projector_stream_broker",
        auth_posture: "SESSION_REQUIRED_RECONNECT_SAFE",
        route_behavior: "SSE_STREAM",
        tls_policy_ref: coreTlsRef(slug),
        waf_policy_ref: "waf.api",
        cache_policy_ref: "cache.api-stream",
        provider_registration_allowed: false,
        signed_delivery_required: false,
        delivery_binding_hash_required: false,
        notes: ["SSE routes must avoid edge buffering, caching, and transformations that would break ordering or resume law."],
        source_refs: sourceRefs,
      },
      {
        row_ref: `${slug}.signed-downloads`,
        label: "Signed exports and downloads",
        surface_family_ref: "API",
        environment_ref: environment.environment_ref,
        hostname: apiHost,
        path_glob: "/downloads/*",
        origin_class_ref: "origin.signed-artifact.gateway",
        origin_target: `https://origin.northbound-api.${slug}.svc.taxat.internal`,
        owning_deployable_ref: "deployable_northbound_api_session_gateway",
        auth_posture: "SIGNED_DELIVERY_AND_ACCESS_CONTEXT_REQUIRED",
        route_behavior: "SIGNED_ARTIFACT_DOWNLOAD",
        tls_policy_ref: coreTlsRef(slug),
        waf_policy_ref: "waf.api",
        cache_policy_ref: "cache.signed-delivery-no-store",
        provider_registration_allowed: false,
        signed_delivery_required: true,
        delivery_binding_hash_required: true,
        notes: [
          "Signed downloads and exports must not be edge-cached in a way that widens tenant, access, or masking context.",
        ],
        source_refs: sourceRefs,
      },
      {
        row_ref: `${slug}.auth-callback`,
        label: "HMRC OAuth callback",
        surface_family_ref: "CALLBACKS",
        environment_ref: environment.environment_ref,
        hostname: `auth.${zone}`,
        path_glob: "/oauth/hmrc/callback",
        origin_class_ref: "origin.auth-callback.gateway",
        origin_target: `https://origin.northbound-api.${slug}.svc.taxat.internal`,
        owning_deployable_ref: "deployable_northbound_api_session_gateway",
        auth_posture: "OAUTH_STATE_NONCE_PKCE_REQUIRED",
        route_behavior: "OAUTH_CALLBACK",
        tls_policy_ref: coreTlsRef(slug),
        waf_policy_ref: "waf.callbacks",
        cache_policy_ref: "cache.callback-no-store",
        provider_registration_allowed: true,
        signed_delivery_required: false,
        delivery_binding_hash_required: false,
        notes: ["Redirect callbacks are browser-assisted flows and must not inherit generic HTML or API cache behavior."],
        source_refs: sourceRefs,
      },
      {
        row_ref: `${slug}.authority-ingress`,
        label: "Provider callback ingress",
        surface_family_ref: "CALLBACKS",
        environment_ref: environment.environment_ref,
        hostname: `authority-ingress.${zone}`,
        path_glob: "/hmrc/inbox",
        origin_class_ref: "origin.authority-ingress.gateway",
        origin_target: `https://origin.authority-gateway.${slug}.svc.taxat.internal`,
        owning_deployable_ref: "deployable_controlled_authority_gateway",
        auth_posture: "AUTHENTICATED_CALLBACK_GATEWAY_REQUIRED",
        route_behavior: "AUTHORITY_CALLBACK",
        tls_policy_ref: ingressTlsRef(slug),
        waf_policy_ref: "waf.callbacks",
        cache_policy_ref: "cache.callback-no-store",
        provider_registration_allowed: true,
        signed_delivery_required: false,
        delivery_binding_hash_required: false,
        notes: [
          "Authority ingress is callback- and replay-aware and must bypass browser challenges while keeping explicit allowlist and origin-auth posture.",
        ],
        source_refs: sourceRefs,
      },
      {
        row_ref: `${slug}.notification-webhooks`,
        label: "Email delivery webhooks",
        surface_family_ref: "CALLBACKS",
        environment_ref: environment.environment_ref,
        hostname: `notification-ingress.${zone}`,
        path_glob: "/webhooks/email/postmark/*",
        origin_class_ref: "origin.notification-ingress.gateway",
        origin_target: `https://origin.notification-ingress.${slug}.svc.taxat.internal`,
        owning_deployable_ref: "deployable_northbound_api_session_gateway",
        auth_posture: "BASIC_AUTH_AND_SHARED_HEADER_SECRET_REQUIRED",
        route_behavior: "EMAIL_WEBHOOK",
        tls_policy_ref: ingressTlsRef(slug),
        waf_policy_ref: "waf.callbacks",
        cache_policy_ref: "cache.callback-no-store",
        provider_registration_allowed: true,
        signed_delivery_required: false,
        delivery_binding_hash_required: false,
        notes: [
          "Notification webhooks are authenticated delivery evidence inputs and must not inherit browser route protections.",
        ],
        source_refs: sourceRefs,
      },
      {
        row_ref: `${slug}.assets`,
        label: "Immutable static assets",
        surface_family_ref: "ASSETS",
        environment_ref: environment.environment_ref,
        hostname: `assets.${zone}`,
        path_glob: "/assets/*",
        origin_class_ref: "origin.static-assets.object-store",
        origin_target: `object://assets-${slug}`,
        owning_deployable_ref: "deployable_object_store",
        auth_posture: "PUBLIC_IMMUTABLE_HASHED_ASSET",
        route_behavior: "STATIC_ASSET",
        tls_policy_ref: coreTlsRef(slug),
        waf_policy_ref: "waf.assets",
        cache_policy_ref: "cache.immutable-assets",
        provider_registration_allowed: false,
        signed_delivery_required: false,
        delivery_binding_hash_required: false,
        notes: ["Only hashed immutable assets are cacheable at the edge."],
        source_refs: sourceRefs,
      },
      {
        row_ref: `${slug}.update-manifest`,
        label: "Native update manifest",
        surface_family_ref: "UPDATE_FEEDS",
        environment_ref: environment.environment_ref,
        hostname: `updates.${zone}`,
        path_glob: "/macos/channel/manifest.json",
        origin_class_ref: "origin.native-update-feed.object-store",
        origin_target: `object://native-updates-${slug}`,
        owning_deployable_ref: "deployable_object_store",
        auth_posture: "SIGNED_UPDATE_CHANNEL_REQUIRED",
        route_behavior: "UPDATE_MANIFEST",
        tls_policy_ref: coreTlsRef(slug),
        waf_policy_ref: "waf.update-feeds",
        cache_policy_ref: "cache.update-manifest",
        provider_registration_allowed: false,
        signed_delivery_required: true,
        delivery_binding_hash_required: false,
        notes: ["Update manifest stays signed and conservative so client channel decisions do not drift through stale cache."],
        source_refs: sourceRefs,
      },
      {
        row_ref: `${slug}.update-packages`,
        label: "Digest-pinned update packages",
        surface_family_ref: "UPDATE_FEEDS",
        environment_ref: environment.environment_ref,
        hostname: `updates.${zone}`,
        path_glob: "/macos/packages/*",
        origin_class_ref: "origin.native-update-feed.object-store",
        origin_target: `object://native-updates-${slug}`,
        owning_deployable_ref: "deployable_object_store",
        auth_posture: "SIGNED_URL_OR_CHANNEL_TOKEN_REQUIRED",
        route_behavior: "UPDATE_PACKAGE",
        tls_policy_ref: coreTlsRef(slug),
        waf_policy_ref: "waf.update-feeds",
        cache_policy_ref: "cache.update-package",
        provider_registration_allowed: false,
        signed_delivery_required: true,
        delivery_binding_hash_required: false,
        notes: [
          "Immutable package bytes may cache only when the URL is digest-pinned and signed-delivery law remains intact.",
        ],
        source_refs: sourceRefs,
      },
    ];
  });
}

function previewRows(): HostOriginRow[] {
  return [
    {
      row_ref: "preview.operator-shell",
      label: "Preview operator shell",
      surface_family_ref: "PREVIEW",
      environment_ref: "env_ephemeral_review_preview",
      hostname: "operator-preview-{preview_id}.review.taxat.example",
      path_glob: "/*",
      origin_class_ref: "origin.preview.operator-shell",
      origin_target: "https://origin.review-web-shell.{preview_id}.svc.taxat.internal",
      owning_deployable_ref: "deployable_ephemeral_review_web_shell",
      auth_posture: "REVIEW_ACCESS_POLICY_OR_SHARED_REVIEW_TOKEN_REQUIRED",
      route_behavior: "PREVIEW_SHELL",
      tls_policy_ref: "tls.preview.wildcard",
      waf_policy_ref: "waf.preview",
      cache_policy_ref: "cache.preview-bypass",
      provider_registration_allowed: false,
      signed_delivery_required: false,
      delivery_binding_hash_required: false,
      notes: ["Preview operator routes remain browser-only review surfaces and never become provider-trusted callback origins."],
      source_refs: SOURCE_REFS,
    },
    {
      row_ref: "preview.portal-shell",
      label: "Preview portal shell",
      surface_family_ref: "PREVIEW",
      environment_ref: "env_ephemeral_review_preview",
      hostname: "portal-preview-{preview_id}.review.taxat.example",
      path_glob: "/*",
      origin_class_ref: "origin.preview.portal-shell",
      origin_target: "https://origin.review-web-shell.{preview_id}.svc.taxat.internal",
      owning_deployable_ref: "deployable_ephemeral_review_web_shell",
      auth_posture: "REVIEW_ACCESS_POLICY_OR_SHARED_REVIEW_TOKEN_REQUIRED",
      route_behavior: "PREVIEW_SHELL",
      tls_policy_ref: "tls.preview.wildcard",
      waf_policy_ref: "waf.preview",
      cache_policy_ref: "cache.preview-bypass",
      provider_registration_allowed: false,
      signed_delivery_required: false,
      delivery_binding_hash_required: false,
      notes: ["Preview portal routes stay synthetic and non-promotable."],
      source_refs: SOURCE_REFS,
    },
    {
      row_ref: "preview.assets",
      label: "Preview static assets",
      surface_family_ref: "PREVIEW",
      environment_ref: "env_ephemeral_review_preview",
      hostname: "assets-preview-{preview_id}.review.taxat.example",
      path_glob: "/assets/*",
      origin_class_ref: "origin.preview.asset-bucket",
      origin_target: "object://review-assets-{preview_id}",
      owning_deployable_ref: "deployable_ephemeral_review_web_shell",
      auth_posture: "REVIEW_ACCESS_POLICY_OR_SHARED_REVIEW_TOKEN_REQUIRED",
      route_behavior: "PREVIEW_SHELL",
      tls_policy_ref: "tls.preview.wildcard",
      waf_policy_ref: "waf.preview",
      cache_policy_ref: "cache.preview-bypass",
      provider_registration_allowed: false,
      signed_delivery_required: false,
      delivery_binding_hash_required: false,
      notes: ["Preview assets stay isolated from stable asset domains and are torn down with the review environment."],
      source_refs: SOURCE_REFS,
    },
  ];
}

export function createDnsAndOriginMatrix(
  providerFamilySelection?: EdgeProviderFamily,
): DnsAndOriginMatrix {
  const selected = selectedProviderFamily(providerFamilySelection);
  return {
    schema_version: "1.0",
    matrix_id: "dns_and_origin_matrix",
    selection_status: stableSelectionStatus(providerFamilySelection),
    selected_provider_family: selected,
    provider_option_rows: createProviderOptionRows(providerFamilySelection),
    host_origin_rows: [...stableHostRows(), ...previewRows()],
    typed_gaps: providerFamilySelection
      ? []
      : [
          "PROVIDER_DEFAULT_APPLIED_CLOUDFLARE_EDGE_STACK",
          "ASSUMPTION_AUTHORITY_CALLBACK_ALLOWLIST_REQUIRES_LIVE_PROVIDER_CONFIRMATION",
        ],
    notes: [
      "Unknown hostnames and path families must fail closed instead of reusing a broad catch-all rule.",
      "Operator, portal, API, callback, preview, asset, and update surfaces remain explicitly separated even when the same apex zone is used.",
    ],
    source_refs: SOURCE_REFS,
  };
}

function certRows(): TlsCertificateRow[] {
  return [
    {
      cert_ref: "tls.preview.wildcard",
      label: "Preview wildcard review domains",
      environment_ref: "env_ephemeral_review_preview",
      hostname_patterns: ["*.review.taxat.example"],
      issuance_mode: "TOTAL_TLS_WILDCARD",
      wildcard_usage: "WILDCARD_REQUIRED",
      min_tls_version: "TLS_1_2",
      tls13_enabled: true,
      hsts_mode: "ENABLED_NO_PRELOAD",
      rotation_owner_role: "PLATFORM_OPERATIONS",
      renewal_window_days: 30,
      origin_tls_mode: "STRICT_ORIGIN_TLS_REQUIRED",
      notes: [
        "Preview wildcard certificate isolates review traffic from stable environment certificates and avoids hostname ambiguity.",
      ],
      source_refs: SOURCE_REFS,
    },
    ...STABLE_EDGE_ENVIRONMENTS.flatMap((environment): TlsCertificateRow[] => {
      const slug = environment.slug;
      const zone = environment.zone_suffix;
      const includeSubdomains: TlsCertificateRow["hsts_mode"] =
        environment.environment_ref === "env_production"
          ? "ENABLED_INCLUDE_SUBDOMAINS_NO_PRELOAD"
          : "ENABLED_NO_PRELOAD";
      return [
        {
          cert_ref: coreTlsRef(slug),
          label: `${environment.label} core public hosts`,
          environment_ref: environment.environment_ref,
          hostname_patterns: [
            `operator.${zone}`,
            `portal.${zone}`,
            `api.${zone}`,
            `auth.${zone}`,
            `assets.${zone}`,
            `updates.${zone}`,
          ],
          issuance_mode: "ADVANCED_CERTIFICATE_MANAGER",
          wildcard_usage: "NO_WILDCARD",
          min_tls_version: "TLS_1_2",
          tls13_enabled: true,
          hsts_mode: includeSubdomains,
          rotation_owner_role: "PLATFORM_OPERATIONS",
          renewal_window_days: 30,
          origin_tls_mode: "STRICT_ORIGIN_TLS_REQUIRED",
          notes: [
            "Stable browser, API, asset, and update hosts share one environment-scoped certificate inventory row.",
          ],
          source_refs: SOURCE_REFS,
        },
        {
          cert_ref: ingressTlsRef(slug),
          label: `${environment.label} callback and webhook ingress hosts`,
          environment_ref: environment.environment_ref,
          hostname_patterns: [
            `authority-ingress.${zone}`,
            `notification-ingress.${zone}`,
          ],
          issuance_mode: "ADVANCED_CERTIFICATE_MANAGER",
          wildcard_usage: "NO_WILDCARD",
          min_tls_version: "TLS_1_2",
          tls13_enabled: true,
          hsts_mode: "ENABLED_NO_PRELOAD",
          rotation_owner_role: "PLATFORM_OPERATIONS",
          renewal_window_days: 30,
          origin_tls_mode: "STRICT_ORIGIN_TLS_REQUIRED",
          notes: [
            "Callback and webhook hosts remain certificate-scoped separately from browser shells to avoid hostname and ingress ambiguity.",
          ],
          source_refs: SOURCE_REFS,
        },
      ];
    }),
  ];
}

export function createTlsCertificateInventory(
  providerFamilySelection?: EdgeProviderFamily,
): TlsCertificateInventory {
  return {
    schema_version: "1.0",
    inventory_id: "tls_certificate_inventory",
    selection_status: stableSelectionStatus(providerFamilySelection),
    selected_provider_family: selectedProviderFamily(providerFamilySelection),
    certificate_rows: certRows(),
    notes: [
      "Certificate rotation stays environment-scoped and must not merge preview, sandbox, preproduction, and production host ambiguity.",
      "Origin TLS remains strict for every host family.",
    ],
    source_refs: [
      ...SOURCE_REFS,
      {
        source_file: DOCS.cloudflareHsts,
        source_heading_or_logical_block: "HSTS",
        source_ref: DOCS.cloudflareHsts,
        rationale:
          "Current Cloudflare docs cover HSTS configuration and its caution around preload and includeSubDomains.",
      },
    ],
  };
}

function surfaceRuleRows(): WafSurfaceRuleRow[] {
  return [
    {
      policy_ref: "waf.operator-web",
      label: "Operator web shell protections",
      surface_family_ref: "OPERATOR_WEB",
      hostname_patterns: ["operator.*.taxat.example"],
      path_globs: ["/*"],
      managed_rule_sets: ["Cloudflare Managed Ruleset", "Super Bot Fight Mode equivalent"],
      custom_rule_highlights: [
        "Managed challenge on suspicious step-up, login, or session bootstrap routes.",
        "Typed allowlist for operator review or incident-response ranges only.",
      ],
      challenge_posture: "MANAGED_CHALLENGE",
      allowlist_refs: ["allowlist.operator-reviewed-ranges"],
      override_routes: ["/healthz"],
      review_notes: [
        "Operator exceptions remain typed and reviewable instead of ad hoc firewall bypasses.",
      ],
      source_refs: SOURCE_REFS,
    },
    {
      policy_ref: "waf.client-portal",
      label: "Client portal protections",
      surface_family_ref: "CLIENT_PORTAL",
      hostname_patterns: ["portal.*.taxat.example"],
      path_globs: ["/*"],
      managed_rule_sets: ["Cloudflare Managed Ruleset", "Bot Management equivalent"],
      custom_rule_highlights: [
        "Challenge suspicious interactive flows without exposing raw provider callbacks to browser posture.",
      ],
      challenge_posture: "MANAGED_CHALLENGE",
      allowlist_refs: [],
      override_routes: ["/healthz"],
      review_notes: ["Portal traffic is human-facing but still subject to customer-safe visibility law."],
      source_refs: SOURCE_REFS,
    },
    {
      policy_ref: "waf.api",
      label: "Northbound API protections",
      surface_family_ref: "API",
      hostname_patterns: ["api.*.taxat.example"],
      path_globs: ["/api/*", "/downloads/*"],
      managed_rule_sets: ["Cloudflare Managed Ruleset"],
      custom_rule_highlights: [
        "Block obvious exploit traffic without introducing browser-only interstitials on JSON or SSE routes.",
        "Protect upload and mutation endpoints with rate limits rather than cache-side reuse.",
      ],
      challenge_posture: "BLOCK",
      allowlist_refs: [],
      override_routes: ["/healthz", "/api/stream/*"],
      review_notes: ["API surfaces prefer block-or-log semantics to browser challenges."],
      source_refs: SOURCE_REFS,
    },
    {
      policy_ref: "waf.callbacks",
      label: "Callback and webhook protections",
      surface_family_ref: "CALLBACKS",
      hostname_patterns: [
        "auth.*.taxat.example",
        "authority-ingress.*.taxat.example",
        "notification-ingress.*.taxat.example",
      ],
      path_globs: ["/oauth/hmrc/callback", "/hmrc/inbox", "/webhooks/email/postmark/*"],
      managed_rule_sets: ["Cloudflare Managed Ruleset"],
      custom_rule_highlights: [
        "No browser challenge or JavaScript interstitial is allowed on callback or webhook paths.",
        "Provider ingress stays behind typed allowlists and origin authentication checks.",
      ],
      challenge_posture: "ALLOWLIST_AND_NO_BROWSER_CHALLENGE",
      allowlist_refs: [
        "allowlist.hmrc-or-relay-egress",
        "allowlist.postmark-webhooks",
      ],
      override_routes: ["/oauth/hmrc/callback", "/hmrc/inbox", "/webhooks/email/postmark/*"],
      review_notes: [
        "False-positive operator review is allowed, but callback exceptions stay typed and reviewable.",
      ],
      source_refs: SOURCE_REFS,
    },
    {
      policy_ref: "waf.assets",
      label: "Static asset protections",
      surface_family_ref: "ASSETS",
      hostname_patterns: ["assets.*.taxat.example"],
      path_globs: ["/assets/*"],
      managed_rule_sets: ["Cloudflare Managed Ruleset"],
      custom_rule_highlights: ["Allow immutable asset delivery but resist hotlinking and abusive fetch spikes."],
      challenge_posture: "MANAGED_CHALLENGE",
      allowlist_refs: [],
      override_routes: [],
      review_notes: ["Only hashed immutable assets receive broad edge cache posture."],
      source_refs: SOURCE_REFS,
    },
    {
      policy_ref: "waf.preview",
      label: "Preview domain protections",
      surface_family_ref: "PREVIEW",
      hostname_patterns: ["*.review.taxat.example"],
      path_globs: ["/*"],
      managed_rule_sets: ["Cloudflare Managed Ruleset"],
      custom_rule_highlights: [
        "Preview routes require Access-style review gating and never become provider callback origins.",
      ],
      challenge_posture: "ACCESS_POLICY_REQUIRED",
      allowlist_refs: ["allowlist.reviewers"],
      override_routes: [],
      review_notes: ["Preview domains remain synthetic, isolated, and easy to tear down."],
      source_refs: SOURCE_REFS,
    },
    {
      policy_ref: "waf.update-feeds",
      label: "Native update feed protections",
      surface_family_ref: "UPDATE_FEEDS",
      hostname_patterns: ["updates.*.taxat.example"],
      path_globs: ["/macos/*"],
      managed_rule_sets: ["Cloudflare Managed Ruleset"],
      custom_rule_highlights: [
        "Protect update feeds from abuse while preserving signed, digest-pinned package delivery.",
      ],
      challenge_posture: "BLOCK",
      allowlist_refs: [],
      override_routes: [],
      review_notes: ["Update paths must stay cache-aware without becoming a privacy-insensitive long-term store."],
      source_refs: SOURCE_REFS,
    },
  ];
}

function rateLimitRows(): RateLimitRuleRow[] {
  return [
    {
      policy_ref: "rate.operator-step-up",
      label: "Operator shell sign-in and step-up",
      surface_family_ref: "OPERATOR_WEB",
      hostname_patterns: ["operator.*.taxat.example"],
      path_globs: ["/login*", "/step-up*"],
      threshold: 40,
      period_seconds: 60,
      action_on_threshold: "MANAGED_CHALLENGE",
      characteristics: ["ip.src", "http.request.uri.path"],
      bypass_refs: ["allowlist.operator-reviewed-ranges"],
      notes: ["Protect operator interactive auth surfaces while still allowing typed incident-response ranges."],
      source_refs: SOURCE_REFS,
    },
    {
      policy_ref: "rate.portal-auth",
      label: "Client portal sign-in and approval churn",
      surface_family_ref: "CLIENT_PORTAL",
      hostname_patterns: ["portal.*.taxat.example"],
      path_globs: ["/login*", "/approvals/*"],
      threshold: 30,
      period_seconds: 60,
      action_on_threshold: "MANAGED_CHALLENGE",
      characteristics: ["ip.src", "http.request.uri.path"],
      bypass_refs: [],
      notes: ["Client-facing routes challenge suspicious bursts instead of silently widening cache reuse."],
      source_refs: SOURCE_REFS,
    },
    {
      policy_ref: "rate.api-mutations",
      label: "Northbound API mutations and uploads",
      surface_family_ref: "API",
      hostname_patterns: ["api.*.taxat.example"],
      path_globs: ["/api/commands/*", "/api/uploads/*", "/downloads/*"],
      threshold: 120,
      period_seconds: 60,
      action_on_threshold: "BLOCK",
      characteristics: ["ip.src", "http.request.uri.path", "cf.colo.id"],
      bypass_refs: [],
      notes: ["API mutation endpoints should fail with typed application or edge errors, not browser interstitials."],
      source_refs: SOURCE_REFS,
    },
    {
      policy_ref: "rate.api-stream-handshake",
      label: "SSE handshake protection",
      surface_family_ref: "API",
      hostname_patterns: ["api.*.taxat.example"],
      path_globs: ["/api/stream/*"],
      threshold: 30,
      period_seconds: 60,
      action_on_threshold: "LOG_ONLY",
      characteristics: ["ip.src", "http.request.uri.path"],
      bypass_refs: [],
      notes: ["Stream routes log handshake spikes but avoid intrusive interstitial behavior that would break continuity."],
      source_refs: SOURCE_REFS,
    },
    {
      policy_ref: "rate.authority-callbacks",
      label: "Authority callback ingress",
      surface_family_ref: "CALLBACKS",
      hostname_patterns: ["authority-ingress.*.taxat.example"],
      path_globs: ["/hmrc/inbox"],
      threshold: 300,
      period_seconds: 60,
      action_on_threshold: "BLOCK",
      characteristics: ["ip.src", "http.request.uri.path"],
      bypass_refs: ["allowlist.hmrc-or-relay-egress"],
      notes: ["Callback ingress bypasses browser challenge but still blocks abusive or unknown senders."],
      source_refs: SOURCE_REFS,
    },
    {
      policy_ref: "rate.notification-webhooks",
      label: "Notification delivery callbacks",
      surface_family_ref: "CALLBACKS",
      hostname_patterns: ["notification-ingress.*.taxat.example"],
      path_globs: ["/webhooks/email/postmark/*"],
      threshold: 180,
      period_seconds: 60,
      action_on_threshold: "BLOCK",
      characteristics: ["ip.src", "http.request.uri.path"],
      bypass_refs: ["allowlist.postmark-webhooks"],
      notes: ["Webhook ingress remains replay-aware and explicit about provider allowlists and auth."],
      source_refs: SOURCE_REFS,
    },
    {
      policy_ref: "rate.preview-shell",
      label: "Preview shell access",
      surface_family_ref: "PREVIEW",
      hostname_patterns: ["*.review.taxat.example"],
      path_globs: ["/*"],
      threshold: 60,
      period_seconds: 60,
      action_on_threshold: "MANAGED_CHALLENGE",
      characteristics: ["ip.src", "http.request.uri.path"],
      bypass_refs: ["allowlist.reviewers"],
      notes: ["Preview traffic is for review only and should not tolerate uncontrolled anonymous bursts."],
      source_refs: SOURCE_REFS,
    },
    {
      policy_ref: "rate.assets",
      label: "Immutable asset delivery",
      surface_family_ref: "ASSETS",
      hostname_patterns: ["assets.*.taxat.example"],
      path_globs: ["/assets/*"],
      threshold: 600,
      period_seconds: 60,
      action_on_threshold: "MANAGED_CHALLENGE",
      characteristics: ["ip.src", "http.request.uri.path"],
      bypass_refs: [],
      notes: ["High-volume immutable assets stay cacheable, but abusive bursts still surface at the edge."],
      source_refs: SOURCE_REFS,
    },
    {
      policy_ref: "rate.update-feeds",
      label: "Native update feed delivery",
      surface_family_ref: "UPDATE_FEEDS",
      hostname_patterns: ["updates.*.taxat.example"],
      path_globs: ["/macos/*"],
      threshold: 120,
      period_seconds: 60,
      action_on_threshold: "BLOCK",
      characteristics: ["ip.src", "http.request.uri.path"],
      bypass_refs: [],
      notes: ["Update feeds block abusive fetch bursts without weakening signed delivery or digest-pinned package reuse."],
      source_refs: SOURCE_REFS,
    },
  ];
}

export function createWafAndRateLimitPolicy(
  providerFamilySelection?: EdgeProviderFamily,
): WafAndRateLimitPolicy {
  return {
    schema_version: "1.0",
    policy_id: "waf_and_rate_limit_policy",
    selection_status: stableSelectionStatus(providerFamilySelection),
    selected_provider_family: selectedProviderFamily(providerFamilySelection),
    surface_rule_rows: surfaceRuleRows(),
    rate_limit_rows: rateLimitRows(),
    notes: [
      "Callback and webhook paths never inherit browser-only challenges.",
      "False-positive operational overrides remain typed and reviewable.",
    ],
    source_refs: [
      ...SOURCE_REFS,
      {
        source_file: DOCS.cloudflareWaf,
        source_heading_or_logical_block: "Cloudflare WAF",
        source_ref: DOCS.cloudflareWaf,
        rationale:
          "Current Cloudflare docs confirm unified WAF, custom rule, and managed rules posture for typed edge protection.",
      },
      {
        source_file: DOCS.cloudflareRateLimits,
        source_heading_or_logical_block: "Rate limiting rules",
        source_ref: DOCS.cloudflareRateLimits,
        rationale:
          "Current Cloudflare docs confirm rate limiting rules can be expressed by host/path family.",
      },
    ],
  };
}

function cachePolicyRows(): CachePolicyRow[] {
  return [
    {
      policy_ref: "cache.operator-shell",
      label: "Operator shell cache bypass",
      surface_family_ref: "OPERATOR_WEB",
      hostname_patterns: ["operator.*.taxat.example"],
      path_globs: ["/*"],
      cache_mode: "BYPASS_EDGE_CACHE",
      cache_key_dimensions: [],
      requires_delivery_binding_hash: false,
      preview_binding_required: false,
      signed_delivery_required: false,
      authorization_context: "SESSION_COOKIE_AND_CSRF_CONTEXT",
      header_contract: [
        "Cache-Control: no-store",
        "Vary: Cookie, Authorization",
      ],
      transform_posture: "NO_EDGE_TRANSFORM",
      notes: ["Operator HTML and route continuity never reuse broad shared edge cache."],
      source_refs: SOURCE_REFS,
    },
    {
      policy_ref: "cache.client-portal-shell",
      label: "Client portal cache bypass",
      surface_family_ref: "CLIENT_PORTAL",
      hostname_patterns: ["portal.*.taxat.example"],
      path_globs: ["/*"],
      cache_mode: "BYPASS_EDGE_CACHE",
      cache_key_dimensions: [],
      requires_delivery_binding_hash: false,
      preview_binding_required: false,
      signed_delivery_required: false,
      authorization_context: "CUSTOMER_SESSION_MASKING_CONTEXT",
      header_contract: [
        "Cache-Control: no-store",
        "Vary: Cookie, Authorization",
      ],
      transform_posture: "NO_EDGE_TRANSFORM",
      notes: ["Portal HTML must not widen tenant or masking context through cache reuse."],
      source_refs: SOURCE_REFS,
    },
    {
      policy_ref: "cache.api-json",
      label: "API JSON no-store",
      surface_family_ref: "API",
      hostname_patterns: ["api.*.taxat.example"],
      path_globs: ["/api/*"],
      cache_mode: "BYPASS_EDGE_CACHE",
      cache_key_dimensions: [],
      requires_delivery_binding_hash: false,
      preview_binding_required: false,
      signed_delivery_required: false,
      authorization_context: "SESSION_OR_SERVICE_AUTH_CONTEXT",
      header_contract: [
        "Cache-Control: no-store",
        "Vary: Authorization",
      ],
      transform_posture: "NO_EDGE_TRANSFORM",
      notes: ["JSON API responses remain application-governed and non-cacheable at the edge."],
      source_refs: SOURCE_REFS,
    },
    {
      policy_ref: "cache.api-stream",
      label: "Streaming route bypass",
      surface_family_ref: "API",
      hostname_patterns: ["api.*.taxat.example"],
      path_globs: ["/api/stream/*"],
      cache_mode: "BYPASS_EDGE_CACHE",
      cache_key_dimensions: [],
      requires_delivery_binding_hash: false,
      preview_binding_required: false,
      signed_delivery_required: false,
      authorization_context: "SESSION_AND_RESUME_CONTEXT",
      header_contract: [
        "Cache-Control: no-store, no-transform",
        "X-Accel-Buffering: no",
      ],
      transform_posture: "NO_EDGE_TRANSFORM",
      notes: ["Reconnect-safe stream routes must avoid buffering, caching, and response rewriting."],
      source_refs: SOURCE_REFS,
    },
    {
      policy_ref: "cache.signed-delivery-no-store",
      label: "Signed delivery no-store",
      surface_family_ref: "API",
      hostname_patterns: ["api.*.taxat.example"],
      path_globs: ["/downloads/*"],
      cache_mode: "BYPASS_EDGE_CACHE",
      cache_key_dimensions: [],
      requires_delivery_binding_hash: true,
      preview_binding_required: false,
      signed_delivery_required: true,
      authorization_context: "DELIVERY_BINDING_HASH_AND_ACCESS_CONTEXT",
      header_contract: [
        "Cache-Control: no-store",
        "Vary: Authorization, X-Taxat-Delivery-Binding",
      ],
      transform_posture: "NO_EDGE_TRANSFORM",
      notes: [
        "Signed downloads and exports are per-context and must not widen access or masking posture through cache reuse.",
      ],
      source_refs: SOURCE_REFS,
    },
    {
      policy_ref: "cache.callback-no-store",
      label: "Callback and webhook cache bypass",
      surface_family_ref: "CALLBACKS",
      hostname_patterns: [
        "auth.*.taxat.example",
        "authority-ingress.*.taxat.example",
        "notification-ingress.*.taxat.example",
      ],
      path_globs: ["/oauth/hmrc/callback", "/hmrc/inbox", "/webhooks/email/postmark/*"],
      cache_mode: "BYPASS_EDGE_CACHE",
      cache_key_dimensions: [],
      requires_delivery_binding_hash: false,
      preview_binding_required: false,
      signed_delivery_required: false,
      authorization_context: "CALLBACK_REQUEST_PROOF_ONLY",
      header_contract: ["Cache-Control: no-store"],
      transform_posture: "NO_EDGE_TRANSFORM",
      notes: ["Callback and webhook paths remain replay-aware and never cacheable."],
      source_refs: SOURCE_REFS,
    },
    {
      policy_ref: "cache.immutable-assets",
      label: "Immutable asset reuse",
      surface_family_ref: "ASSETS",
      hostname_patterns: ["assets.*.taxat.example"],
      path_globs: ["/assets/*"],
      cache_mode: "IMMUTABLE_EDGE_CACHE",
      cache_key_dimensions: ["host", "path", "asset_digest_path_segment"],
      requires_delivery_binding_hash: false,
      preview_binding_required: false,
      signed_delivery_required: false,
      authorization_context: "NONE_PUBLIC_HASHED_ASSET",
      header_contract: [
        "Cache-Control: public, max-age=31536000, immutable",
      ],
      transform_posture: "STATIC_OPTIMIZATION_ONLY",
      notes: ["Only immutable hashed assets are allowed to use broad edge cache."],
      source_refs: SOURCE_REFS,
    },
    {
      policy_ref: "cache.preview-bypass",
      label: "Preview cache bypass",
      surface_family_ref: "PREVIEW",
      hostname_patterns: ["*.review.taxat.example"],
      path_globs: ["/*"],
      cache_mode: "BYPASS_EDGE_CACHE",
      cache_key_dimensions: [],
      requires_delivery_binding_hash: false,
      preview_binding_required: true,
      signed_delivery_required: false,
      authorization_context: "PREVIEW_ID_AND_REVIEW_TOKEN_CONTEXT",
      header_contract: ["Cache-Control: no-store"],
      transform_posture: "NO_EDGE_TRANSFORM",
      notes: ["Preview routes remain isolated and easy to tear down without broad shared edge reuse."],
      source_refs: SOURCE_REFS,
    },
    {
      policy_ref: "cache.update-manifest",
      label: "Update manifest bypass",
      surface_family_ref: "UPDATE_FEEDS",
      hostname_patterns: ["updates.*.taxat.example"],
      path_globs: ["/macos/channel/manifest.json"],
      cache_mode: "BYPASS_EDGE_CACHE",
      cache_key_dimensions: [],
      requires_delivery_binding_hash: false,
      preview_binding_required: false,
      signed_delivery_required: true,
      authorization_context: "SIGNED_UPDATE_CHANNEL_CONTEXT",
      header_contract: ["Cache-Control: no-store"],
      transform_posture: "NO_EDGE_TRANSFORM",
      notes: ["Channel manifests remain conservative so rollout state never drifts through stale edge copies."],
      source_refs: SOURCE_REFS,
    },
    {
      policy_ref: "cache.update-package",
      label: "Digest-pinned package reuse",
      surface_family_ref: "UPDATE_FEEDS",
      hostname_patterns: ["updates.*.taxat.example"],
      path_globs: ["/macos/packages/*"],
      cache_mode: "SIGNED_DELIVERY_DIGEST_PINNED_EDGE_CACHE",
      cache_key_dimensions: ["host", "path", "artifact_digest"],
      requires_delivery_binding_hash: false,
      preview_binding_required: false,
      signed_delivery_required: true,
      authorization_context: "SIGNED_URL_OR_CHANNEL_TOKEN",
      header_contract: [
        "Cache-Control: public, s-maxage=86400, immutable",
        "Signed URL required",
      ],
      transform_posture: "NO_EDGE_TRANSFORM",
      notes: ["Package bytes may cache only when the URL is immutable and the package digest is part of the durable identity."],
      source_refs: SOURCE_REFS,
    },
  ];
}

export function createCacheAndDeliveryBindingPolicy(
  providerFamilySelection?: EdgeProviderFamily,
): CacheAndDeliveryBindingPolicy {
  return {
    schema_version: "1.0",
    policy_id: "cache_and_delivery_binding_policy",
    selection_status: stableSelectionStatus(providerFamilySelection),
    selected_provider_family: selectedProviderFamily(providerFamilySelection),
    policy_rows: cachePolicyRows(),
    truth_statement:
      "Edge caching never substitutes for governed object-store retention, application visibility decisions, or delivery binding law.",
    notes: [
      "Signed downloads, preview routes, callbacks, and streaming paths bypass edge cache.",
      "Only immutable hashed assets and digest-pinned signed update packages receive edge cache eligibility.",
    ],
    source_refs: [
      ...SOURCE_REFS,
      {
        source_file: DOCS.cloudflareCacheDefaults,
        source_heading_or_logical_block: "Default cache behavior",
        source_ref: DOCS.cloudflareCacheDefaults,
        rationale:
          "Current Cloudflare docs clarify default cache posture and reinforce the need for explicit rules on dynamic surfaces.",
      },
      {
        source_file: DOCS.cloudflareBypassCookie,
        source_heading_or_logical_block: "Bypass cache on cookie",
        source_ref: DOCS.cloudflareBypassCookie,
        rationale:
          "Current Cloudflare docs confirm cookie- and session-bound bypass rules remain declaratively expressible.",
      },
    ],
  };
}

function callbackRows(): CallbackOriginPolicyRow[] {
  return STABLE_EDGE_ENVIRONMENTS.flatMap((environment) => {
    const slug = environment.slug;
    const zone = environment.zone_suffix;
    const hmrcSender =
      environment.environment_ref === "env_production"
        ? "HMRC production authorization service via browser redirect"
        : "HMRC sandbox authorization service via browser redirect";
    const providerSender =
      environment.environment_ref === "env_production"
        ? "HMRC production or a governed Taxat relay"
        : "HMRC sandbox or a governed Taxat relay";
    return [
      {
        policy_ref: `${slug}.hmrc-oauth-redirect`,
        label: "HMRC OAuth redirect callback",
        environment_ref: environment.environment_ref,
        hostname: `auth.${zone}`,
        path_glob: "/oauth/hmrc/callback",
        kind: "OAUTH_REDIRECT",
        allowed_upstream_senders: [hmrcSender, "Human browser following the authorization redirect"],
        auth_posture: "STATE_NONCE_AND_PKCE_REQUIRED",
        replay_protection: "authorization_code_single_use_and_state_ledger",
        allowlist_ref_or_null: null,
        waf_policy_ref: "waf.callbacks",
        dns_origin_row_ref: `${slug}.auth-callback`,
        notes: ["Redirect callbacks are browser-assisted and do not use webhook-style source allowlists."],
        source_refs: SOURCE_REFS,
      },
      {
        policy_ref: `${slug}.authority-callback-ingress`,
        label: "Authority callback ingress",
        environment_ref: environment.environment_ref,
        hostname: `authority-ingress.${zone}`,
        path_glob: "/hmrc/inbox",
        kind: "AUTHORITY_CALLBACK",
        allowed_upstream_senders: [providerSender, "Taxat replay or recovery injector by explicit approval"],
        auth_posture:
          "EDGE_SHARED_SECRET_OR_PROVIDER_SIGNATURE_REQUIRED_BEFORE_INBOX_ACCEPT",
        replay_protection:
          "provider_delivery_id_and_delivery_binding_hash_dedupe_ledger",
        allowlist_ref_or_null: "allowlist.hmrc-or-relay-egress",
        waf_policy_ref: "waf.callbacks",
        dns_origin_row_ref: `${slug}.authority-ingress`,
        notes: [
          "The corpus requires authenticated dedupe ingress even when provider callback mechanics still need live revalidation.",
        ],
        source_refs: SOURCE_REFS,
      },
      {
        policy_ref: `${slug}.notification-webhooks`,
        label: "Email delivery webhook ingress",
        environment_ref: environment.environment_ref,
        hostname: `notification-ingress.${zone}`,
        path_glob: "/webhooks/email/postmark/*",
        kind: "EMAIL_WEBHOOK",
        allowed_upstream_senders: ["Postmark webhook delivery service"],
        auth_posture: "BASIC_AUTH_AND_SHARED_HEADER_SECRET_REQUIRED",
        replay_protection:
          "provider_message_id_and_event_id_dedupe_ledger",
        allowlist_ref_or_null: "allowlist.postmark-webhooks",
        waf_policy_ref: "waf.callbacks",
        dns_origin_row_ref: `${slug}.notification-webhooks`,
        notes: [
          "Postmark-compatible webhook auth comes from the existing callback contract and remains explicit here.",
        ],
        source_refs: [
          ...SOURCE_REFS,
          {
            source_file: "config/notifications/email_webhook_endpoint_contract.json",
            source_heading_or_logical_block: "callback_records",
            source_ref:
              "config/notifications/email_webhook_endpoint_contract.json::callback_records",
            rationale:
              "The current webhook contract already states HTTPS, Basic Auth, shared header secret, and idempotency ledger posture.",
          },
        ],
      },
    ];
  });
}

export function createCallbackAndWebhookOriginPolicy(
  providerFamilySelection?: EdgeProviderFamily,
): CallbackAndWebhookOriginPolicy {
  return {
    schema_version: "1.0",
    policy_id: "callback_and_webhook_origin_policy",
    selection_status: stableSelectionStatus(providerFamilySelection),
    selected_provider_family: selectedProviderFamily(providerFamilySelection),
    callback_rows: callbackRows(),
    notes: [
      "Callback and webhook routes remain separate from browser-origin caching and challenge posture.",
      "Replay protection is mandatory even when the upstream sender is allowlisted.",
    ],
    source_refs: SOURCE_REFS,
  };
}

export function createEdgeBoundaryTopologySchema() {
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://taxat.dev/schemas/edge_boundary_topology.schema.json",
    title: "Taxat edge boundary topology",
    type: "object",
    required: [
      "schema_version",
      "matrix_id",
      "selection_status",
      "selected_provider_family",
      "host_origin_rows",
    ],
    properties: {
      schema_version: { const: "1.0" },
      matrix_id: { const: "dns_and_origin_matrix" },
      selection_status: {
        enum: ["PROVIDER_DEFAULT_APPLIED", "PROVIDER_CONFIRMED"],
      },
      selected_provider_family: {
        enum: [
          "CLOUDFLARE_DNS_SSL_WAF_CACHE_RULES",
          "AWS_ROUTE53_CLOUDFRONT_AWS_WAF",
          "FASTLY_DNS_TLS_WAF_COMPOSITE",
        ],
      },
      host_origin_rows: {
        type: "array",
        minItems: 1,
        items: {
          type: "object",
          required: [
            "row_ref",
            "label",
            "surface_family_ref",
            "environment_ref",
            "hostname",
            "path_glob",
            "origin_class_ref",
            "origin_target",
            "tls_policy_ref",
            "waf_policy_ref",
            "cache_policy_ref",
          ],
        },
      },
    },
  };
}

export function validateDnsAndOriginMatrix(
  matrix: DnsAndOriginMatrix = createDnsAndOriginMatrix(),
): void {
  const seen = new Set<string>();
  for (const row of matrix.host_origin_rows) {
    const identity = `${row.environment_ref}|${row.hostname}|${row.path_glob}`;
    if (seen.has(identity)) {
      throw new Error(`Duplicate edge host/path mapping detected for ${identity}.`);
    }
    seen.add(identity);
    if (!row.origin_class_ref || !row.origin_target) {
      throw new Error(`${row.row_ref} must declare a single origin class and target.`);
    }
    if (!row.tls_policy_ref || !row.waf_policy_ref || !row.cache_policy_ref) {
      throw new Error(`${row.row_ref} must declare TLS, WAF, and cache refs.`);
    }
  }
  for (const family of SURFACE_FAMILIES) {
    if (!matrix.host_origin_rows.some((row) => row.surface_family_ref === family)) {
      throw new Error(`Surface family ${family} is missing from the DNS and origin matrix.`);
    }
  }
}

function wildcardPatternToRegExp(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replaceAll("*", "[^.]+");
  return new RegExp(`^${escaped}$`);
}

function hostnameMatchesPattern(hostname: string, pattern: string): boolean {
  return wildcardPatternToRegExp(pattern).test(hostname);
}

export function validateTlsCertificateInventory(
  inventory: TlsCertificateInventory = createTlsCertificateInventory(),
  matrix: DnsAndOriginMatrix = createDnsAndOriginMatrix(),
): void {
  const certMap = new Map(inventory.certificate_rows.map((row) => [row.cert_ref, row]));
  for (const row of matrix.host_origin_rows) {
    const cert = certMap.get(row.tls_policy_ref);
    if (!cert) {
      throw new Error(`${row.row_ref} references missing TLS policy ${row.tls_policy_ref}.`);
    }
    const covered = cert.hostname_patterns.some((pattern) =>
      hostnameMatchesPattern(row.hostname, pattern),
    );
    if (!covered) {
      throw new Error(
        `${row.row_ref} hostname ${row.hostname} is not covered by certificate ${cert.cert_ref}.`,
      );
    }
  }
}

export function validateWafAndRateLimitPolicy(
  policy: WafAndRateLimitPolicy = createWafAndRateLimitPolicy(),
  matrix: DnsAndOriginMatrix = createDnsAndOriginMatrix(),
): void {
  const surfacePolicies = new Map(
    policy.surface_rule_rows.map((row) => [row.policy_ref, row]),
  );
  for (const row of matrix.host_origin_rows) {
    const waf = surfacePolicies.get(row.waf_policy_ref);
    if (!waf) {
      throw new Error(`${row.row_ref} references missing WAF policy ${row.waf_policy_ref}.`);
    }
    if (
      row.surface_family_ref === "CALLBACKS" &&
      waf.challenge_posture !== "ALLOWLIST_AND_NO_BROWSER_CHALLENGE"
    ) {
      throw new Error("Callback routes must bypass browser-only challenge posture.");
    }
  }
  const callbackPolicy = policy.surface_rule_rows.find((row) => row.policy_ref === "waf.callbacks");
  if (!callbackPolicy || callbackPolicy.allowlist_refs.length === 0) {
    throw new Error("Callback routes must declare typed allowlists.");
  }
  if (!policy.rate_limit_rows.some((row) => row.surface_family_ref === "API")) {
    throw new Error("API rate limits are required.");
  }
}

export function validateCacheAndDeliveryBindingPolicy(
  policy: CacheAndDeliveryBindingPolicy = createCacheAndDeliveryBindingPolicy(),
  matrix: DnsAndOriginMatrix = createDnsAndOriginMatrix(),
): void {
  const policyMap = new Map(policy.policy_rows.map((row) => [row.policy_ref, row]));
  for (const row of matrix.host_origin_rows) {
    const cache = policyMap.get(row.cache_policy_ref);
    if (!cache) {
      throw new Error(`${row.row_ref} references missing cache policy ${row.cache_policy_ref}.`);
    }
    if (
      row.route_behavior === "SSE_STREAM" &&
      (cache.cache_mode !== "BYPASS_EDGE_CACHE" ||
        cache.transform_posture !== "NO_EDGE_TRANSFORM")
    ) {
      throw new Error("Streaming routes must bypass edge cache and edge transforms.");
    }
    if (
      row.delivery_binding_hash_required &&
      (!cache.requires_delivery_binding_hash ||
        cache.cache_mode !== "BYPASS_EDGE_CACHE")
    ) {
      throw new Error(
        `${row.row_ref} requires delivery binding hash and therefore must remain non-cacheable.`,
      );
    }
    if (
      row.route_behavior === "PREVIEW_SHELL" &&
      (!cache.preview_binding_required || cache.cache_mode !== "BYPASS_EDGE_CACHE")
    ) {
      throw new Error("Preview routes must stay preview-bound and non-cacheable.");
    }
  }
}

export function validateCallbackAndWebhookOriginPolicy(
  policy: CallbackAndWebhookOriginPolicy = createCallbackAndWebhookOriginPolicy(),
  matrix: DnsAndOriginMatrix = createDnsAndOriginMatrix(),
): void {
  const matrixRows = new Map(matrix.host_origin_rows.map((row) => [row.row_ref, row]));
  for (const row of policy.callback_rows) {
    if (!row.allowed_upstream_senders.length) {
      throw new Error(`${row.policy_ref} must declare allowed upstream senders.`);
    }
    if (!row.auth_posture || !row.replay_protection) {
      throw new Error(`${row.policy_ref} must declare auth and replay posture.`);
    }
    const dnsRow = matrixRows.get(row.dns_origin_row_ref);
    if (!dnsRow || dnsRow.surface_family_ref !== "CALLBACKS") {
      throw new Error(`${row.policy_ref} must bind to a callback DNS matrix row.`);
    }
  }
}

export function createEdgeInventoryTemplate({
  runContext = DEFAULT_RUN_CONTEXT,
  providerFamilySelection,
}: {
  runContext?: MinimalRunContext;
  providerFamilySelection?: EdgeProviderFamily;
} = {}): EdgeInventoryTemplate {
  const matrix = createDnsAndOriginMatrix(providerFamilySelection);
  const tlsInventory = createTlsCertificateInventory(providerFamilySelection);
  const wafPolicy = createWafAndRateLimitPolicy(providerFamilySelection);
  const cachePolicy = createCacheAndDeliveryBindingPolicy(providerFamilySelection);
  const callbackPolicy = createCallbackAndWebhookOriginPolicy(providerFamilySelection);

  return {
    schema_version: "1.0",
    inventory_id: "edge_inventory",
    provider_id: EDGE_PROVIDER_ID,
    flow_id: EDGE_FLOW_ID,
    policy_version: EDGE_POLICY_VERSION,
    run_id: runContext.runId,
    workspace_id: runContext.workspaceId,
    operator_identity_alias: runContext.operatorIdentityAlias,
    selection_status: matrix.selection_status,
    selected_provider_family: matrix.selected_provider_family,
    provider_option_rows: matrix.provider_option_rows,
    zone_root: "taxat.example",
    preview_zone_root: "review.taxat.example",
    hostname_refs: uniqueSorted(matrix.host_origin_rows.map((row) => row.hostname)),
    certificate_refs: uniqueSorted(tlsInventory.certificate_rows.map((row) => row.cert_ref)),
    policy_refs: uniqueSorted([
      ...wafPolicy.surface_rule_rows.map((row) => row.policy_ref),
      ...wafPolicy.rate_limit_rows.map((row) => row.policy_ref),
      ...cachePolicy.policy_rows.map((row) => row.policy_ref),
      ...callbackPolicy.callback_rows.map((row) => row.policy_ref),
    ]),
    typed_gaps: matrix.typed_gaps,
    notes: [
      "Inventory is sanitized and contains only hostname, certificate, and policy refs.",
      "Live DNS, TLS, WAF, or cache mutation remains out of scope for this fixture-backed provisioning flow.",
    ],
    last_verified_at: EDGE_LAST_VERIFIED_AT,
  };
}

function stableInventoryComparable(inventory: EdgeInventoryTemplate) {
  return {
    selection_status: inventory.selection_status,
    selected_provider_family: inventory.selected_provider_family,
    zone_root: inventory.zone_root,
    preview_zone_root: inventory.preview_zone_root,
    provider_option_rows: inventory.provider_option_rows,
    hostname_refs: inventory.hostname_refs,
    certificate_refs: inventory.certificate_refs,
    policy_refs: inventory.policy_refs,
    typed_gaps: inventory.typed_gaps,
    notes: inventory.notes,
    last_verified_at: inventory.last_verified_at,
  };
}

function buildAtlasRowsForFamily(
  family: SurfaceFamilyRef,
  matrix: DnsAndOriginMatrix,
  tlsInventory: TlsCertificateInventory,
  wafPolicy: WafAndRateLimitPolicy,
  cachePolicy: CacheAndDeliveryBindingPolicy,
): Pick<
  EdgeBoundaryAtlasFamily,
  "host_origin_rows" | "tls_rows" | "waf_rows" | "cache_rows"
> {
  const hostRows = matrix.host_origin_rows
    .filter((row) => row.surface_family_ref === family)
    .map((row) => ({
      row_ref: `${row.row_ref}.host`,
      environment_ref: row.environment_ref,
      label: row.label,
      detail: `${row.hostname}${row.path_glob} -> ${row.origin_class_ref}`,
      badges: [
        row.route_behavior.replaceAll("_", " "),
        row.auth_posture.replaceAll("_", " "),
      ],
      inspector_title: `${row.label} origin`,
      inspector_lines: [
        `Hostname: ${row.hostname}`,
        `Path: ${row.path_glob}`,
        `Origin: ${row.origin_target}`,
        `TLS: ${row.tls_policy_ref}`,
        `WAF: ${row.waf_policy_ref}`,
        `Cache: ${row.cache_policy_ref}`,
      ],
      hostname_or_pattern: row.hostname,
      origin_target_or_null: row.origin_target,
      policy_refs: [row.tls_policy_ref, row.waf_policy_ref, row.cache_policy_ref],
    }));

  const tlsRefs = uniqueSorted(
    matrix.host_origin_rows
      .filter((row) => row.surface_family_ref === family)
      .map((row) => row.tls_policy_ref),
  );
  const tlsRows = tlsInventory.certificate_rows
    .filter((row) => tlsRefs.includes(row.cert_ref))
    .flatMap((row) =>
      matrix.host_origin_rows
        .filter(
          (host) =>
            host.surface_family_ref === family &&
            host.tls_policy_ref === row.cert_ref,
        )
        .map((host) => ({
          row_ref: `${host.row_ref}.tls`,
          environment_ref: host.environment_ref,
          label: row.label,
          detail: row.hostname_patterns.join(", "),
          badges: [
            row.hsts_mode.replaceAll("_", " "),
            row.wildcard_usage.replaceAll("_", " "),
          ],
          inspector_title: `${host.label} TLS`,
          inspector_lines: [
            `Certificate: ${row.cert_ref}`,
            `Min TLS: ${row.min_tls_version}`,
            `HSTS: ${row.hsts_mode}`,
            `Wildcard usage: ${row.wildcard_usage}`,
          ],
          hostname_or_pattern: row.hostname_patterns.join(", "),
          origin_target_or_null: null,
          policy_refs: [row.cert_ref],
        })),
    );

  const wafRows = [
    ...wafPolicy.surface_rule_rows
      .filter((row) => row.surface_family_ref === family)
      .map((row) => ({
        row_ref: `${row.policy_ref}.surface`,
        environment_ref: "shared",
        label: row.label,
        detail: row.custom_rule_highlights[0] ?? row.challenge_posture.replaceAll("_", " "),
        badges: [row.challenge_posture.replaceAll("_", " ")],
        inspector_title: row.label,
        inspector_lines: [
          `Managed rules: ${row.managed_rule_sets.join(", ")}`,
          `Allowlists: ${row.allowlist_refs.join(", ") || "none"}`,
          ...row.review_notes,
        ],
        hostname_or_pattern: row.hostname_patterns.join(", "),
        origin_target_or_null: null,
        policy_refs: [row.policy_ref],
      })),
    ...wafPolicy.rate_limit_rows
      .filter((row) => row.surface_family_ref === family)
      .map((row) => ({
        row_ref: `${row.policy_ref}.rate`,
        environment_ref: "shared",
        label: row.label,
        detail: `${row.threshold} req / ${row.period_seconds}s -> ${row.action_on_threshold.replaceAll("_", " ")}`,
        badges: [
          `${row.threshold}/${row.period_seconds}s`,
          row.action_on_threshold.replaceAll("_", " "),
        ],
        inspector_title: row.label,
        inspector_lines: [
          `Hostnames: ${row.hostname_patterns.join(", ")}`,
          `Paths: ${row.path_globs.join(", ")}`,
          `Characteristics: ${row.characteristics.join(", ")}`,
          `Bypass refs: ${row.bypass_refs.join(", ") || "none"}`,
        ],
        hostname_or_pattern: row.hostname_patterns.join(", "),
        origin_target_or_null: null,
        policy_refs: [row.policy_ref],
      })),
  ];

  const cacheRows = cachePolicy.policy_rows
    .filter((row) => row.surface_family_ref === family)
    .map((row) => ({
      row_ref: `${row.policy_ref}.cache`,
      environment_ref: "shared",
      label: row.label,
      detail: row.cache_mode.replaceAll("_", " "),
      badges: [
        row.cache_mode.replaceAll("_", " "),
        row.signed_delivery_required ? "Signed delivery" : "Unsigned",
      ],
      inspector_title: row.label,
      inspector_lines: [
        `Paths: ${row.path_globs.join(", ")}`,
        `Auth context: ${row.authorization_context}`,
        `Headers: ${row.header_contract.join(" | ")}`,
        row.requires_delivery_binding_hash
          ? "delivery_binding_hash required"
          : "delivery_binding_hash not required",
      ],
      hostname_or_pattern: row.hostname_patterns.join(", "),
      origin_target_or_null: null,
      policy_refs: [row.policy_ref],
    }));

  return {
    host_origin_rows: hostRows,
    tls_rows: tlsRows,
    waf_rows: wafRows,
    cache_rows: cacheRows,
  };
}

function familySummary(family: SurfaceFamilyRef): {
  summary: string;
  tls: string;
  waf: string;
  cache: string;
} {
  switch (family) {
    case "OPERATOR_WEB":
      return {
        summary:
          "Operator browser shells stay session-bound, non-cacheable, and challengeable without widening privileged access.",
        tls: "Environment-scoped core certs with strict origin TLS.",
        waf: "Managed challenge plus typed operator allowlists.",
        cache: "No-store at the edge.",
      };
    case "CLIENT_PORTAL":
      return {
        summary:
          "Client portal shells remain customer-safe, masking-aware, and non-cacheable.",
        tls: "Environment-scoped core certs with strict origin TLS.",
        waf: "Managed challenge without callback bleed-over.",
        cache: "No-store at the edge.",
      };
    case "API":
      return {
        summary:
          "API, streams, and signed downloads fail closed on cache and transform shortcuts.",
        tls: "Core cert inventory covers API and download hosts.",
        waf: "Block/log semantics instead of browser interstitials.",
        cache: "JSON and streams bypass cache; signed downloads require delivery binding and no-store.",
      };
    case "CALLBACKS":
      return {
        summary:
          "Callback and webhook routes are origin-authenticated, replay-aware, and isolated from browser challenge posture.",
        tls: "Ingress certs stay separate from browser-shell cert inventory.",
        waf: "Allowlist and no-browser-challenge posture.",
        cache: "Never cacheable.",
      };
    case "ASSETS":
      return {
        summary:
          "Only immutable hashed assets get broad edge reuse.",
        tls: "Core cert inventory covers asset hosts.",
        waf: "Managed protection with hotlink and abuse review.",
        cache: "Immutable edge cache only.",
      };
    case "PREVIEW":
      return {
        summary:
          "Preview domains remain synthetic, wildcarded, isolated, and non-promotable.",
        tls: "Wildcard preview cert isolated from stable environments.",
        waf: "Access policy and reviewer gating.",
        cache: "Preview bypass only.",
      };
    case "UPDATE_FEEDS":
      return {
        summary:
          "Native update manifests stay conservative while digest-pinned package bytes may cache under signed delivery.",
        tls: "Core cert inventory covers update hosts.",
        waf: "Block-oriented protection for feed abuse.",
        cache: "Manifest bypass, package reuse only when digest-pinned and signed.",
      };
  }
}

export function createEdgeBoundaryAtlasViewModel(
  providerFamilySelection?: EdgeProviderFamily,
): EdgeBoundaryAtlasViewModel {
  const matrix = createDnsAndOriginMatrix(providerFamilySelection);
  const tlsInventory = createTlsCertificateInventory(providerFamilySelection);
  const wafPolicy = createWafAndRateLimitPolicy(providerFamilySelection);
  const cachePolicy = createCacheAndDeliveryBindingPolicy(providerFamilySelection);

  return {
    routeId: "edge-boundary-atlas",
    providerDisplayName: "Edge boundary",
    providerMonogram:
      selectedProviderFamily(providerFamilySelection) ===
      "CLOUDFLARE_DNS_SSL_WAF_CACHE_RULES"
        ? "CF"
        : "EDGE",
    selectionPosture: stableSelectionStatus(providerFamilySelection),
    postureChipLabel: "Fail closed edge law",
    policyVersion: EDGE_POLICY_VERSION,
    summary:
      "DNS, TLS, WAF, cache, preview, and callback rules are typed so later browser and API work cannot improvise edge law.",
    notes: [
      "The atlas is read-only and cannot mutate DNS or edge state.",
      "Surface families stay explicit and keyboard-addressable instead of hiding behind a provider console clone.",
    ],
    environments: EDGE_ENVIRONMENTS.map((entry) => ({
      environment_ref: entry.environment_ref,
      label: entry.label,
      topology_summary: entry.topology_summary,
      edge_posture: entry.edge_posture,
    })),
    families: SURFACE_FAMILIES.map((family) => {
      const summaries = familySummary(family);
      const hostCount = uniqueSorted(
        matrix.host_origin_rows
          .filter((row) => row.surface_family_ref === family)
          .map((row) => row.hostname),
      ).length;
      return {
        family_ref: family,
        label: familyLabel(family),
        summary: summaries.summary,
        host_count: hostCount,
        tls_summary: summaries.tls,
        waf_summary: summaries.waf,
        cache_summary: summaries.cache,
        inspector_notes: [
          `${hostCount} hostname pattern(s) currently map to this family.`,
          "Unknown host or path combinations fail closed instead of inheriting a broad default rule.",
        ],
        ...buildAtlasRowsForFamily(
          family,
          matrix,
          tlsInventory,
          wafPolicy,
          cachePolicy,
        ),
      };
    }),
    selectedEnvironmentRef: "env_preproduction_verification",
    selectedFamilyRef: "OPERATOR_WEB",
    selectedFocusRef: null,
  };
}

function createEdgeBoundaryRunbookMarkdown(
  providerFamilySelection?: EdgeProviderFamily,
): string {
  const matrix = createDnsAndOriginMatrix(providerFamilySelection);
  const tlsInventory = createTlsCertificateInventory(providerFamilySelection);
  const wafPolicy = createWafAndRateLimitPolicy(providerFamilySelection);
  const cachePolicy = createCacheAndDeliveryBindingPolicy(providerFamilySelection);
  const callbackPolicy = createCallbackAndWebhookOriginPolicy(providerFamilySelection);

  return `# Edge Boundary Runbook

## Purpose

This runbook freezes Taxat's public edge law for DNS, TLS, WAF, cache, preview domains, and callback origins.
It exists so later browser and API work cannot improvise delivery posture or widen cache visibility by accident.

## Provider Posture

- Selected provider family: \`${matrix.selected_provider_family}\`
- Selection status: \`${matrix.selection_status}\`
- Unified default rationale: unresolved upstream provider choice was normalized into one declarative default platform instead of leaving DNS/TLS/WAF/cache posture implicit.

## Host And Origin Matrix

${matrix.host_origin_rows
  .map(
    (row) =>
      `- \`${row.hostname}${row.path_glob}\` -> \`${row.origin_target}\` (${row.surface_family_ref}, TLS ${row.tls_policy_ref}, WAF ${row.waf_policy_ref}, cache ${row.cache_policy_ref})`,
  )
  .join("\n")}

## Certificates

${tlsInventory.certificate_rows
  .map(
    (row) =>
      `- \`${row.cert_ref}\`: ${row.hostname_patterns.join(", ")} (${row.hsts_mode}, ${row.wildcard_usage})`,
  )
  .join("\n")}

## WAF And Rate Limits

${wafPolicy.surface_rule_rows
  .map(
    (row) =>
      `- \`${row.policy_ref}\`: ${row.challenge_posture}; allowlists = ${row.allowlist_refs.join(", ") || "none"}`,
  )
  .join("\n")}

${wafPolicy.rate_limit_rows
  .map(
    (row) =>
      `- \`${row.policy_ref}\`: ${row.threshold} req / ${row.period_seconds}s -> ${row.action_on_threshold}`,
  )
  .join("\n")}

## Cache And Delivery Binding

${cachePolicy.policy_rows
  .map(
    (row) =>
      `- \`${row.policy_ref}\`: ${row.cache_mode}; signed delivery = ${row.signed_delivery_required ? "yes" : "no"}; delivery binding hash = ${row.requires_delivery_binding_hash ? "required" : "not required"}`,
  )
  .join("\n")}

## Callback And Webhook Boundaries

${callbackPolicy.callback_rows
  .map(
    (row) =>
      `- \`${row.policy_ref}\`: ${row.hostname}${row.path_glob}; auth = ${row.auth_posture}; allowlist = ${row.allowlist_ref_or_null ?? "n/a"}`,
  )
  .join("\n")}

## Operating Rules

- Unknown host/path families fail closed.
- Browser shells, callbacks, webhooks, and streams bypass edge cache.
- Signed downloads require application-level access context and delivery binding, not broad CDN reuse.
- Preview hosts are synthetic and must not be provider-registered callback origins.
- Core public hosts and ingress hosts use separate certificate inventory rows to avoid hostname ambiguity across environments.
`;
}

export async function provisionDnsTlsWafAndEdgeDelivery(options: {
  runContext: MinimalRunContext;
  inventoryPath: string;
  existingInventoryPath?: string;
  providerFamilySelection?: EdgeProviderFamily;
}): Promise<ProvisionDnsTlsWafAndEdgeDeliveryResult> {
  const selectionStatus = stableSelectionStatus(options.providerFamilySelection);
  const schema = createEdgeBoundaryTopologySchema();
  const dnsAndOriginMatrix = createDnsAndOriginMatrix(options.providerFamilySelection);
  const tlsCertificateInventory = createTlsCertificateInventory(
    options.providerFamilySelection,
  );
  const wafAndRateLimitPolicy = createWafAndRateLimitPolicy(
    options.providerFamilySelection,
  );
  const cacheAndDeliveryBindingPolicy = createCacheAndDeliveryBindingPolicy(
    options.providerFamilySelection,
  );
  const callbackAndWebhookOriginPolicy = createCallbackAndWebhookOriginPolicy(
    options.providerFamilySelection,
  );

  validateDnsAndOriginMatrix(dnsAndOriginMatrix);
  validateTlsCertificateInventory(tlsCertificateInventory, dnsAndOriginMatrix);
  validateWafAndRateLimitPolicy(wafAndRateLimitPolicy, dnsAndOriginMatrix);
  validateCacheAndDeliveryBindingPolicy(
    cacheAndDeliveryBindingPolicy,
    dnsAndOriginMatrix,
  );
  validateCallbackAndWebhookOriginPolicy(
    callbackAndWebhookOriginPolicy,
    dnsAndOriginMatrix,
  );

  const inventory = createEdgeInventoryTemplate({
    runContext: options.runContext,
    providerFamilySelection: options.providerFamilySelection,
  });

  let adoptionStep: ProvisionDnsTlsWafAndEdgeDeliveryStep = {
    step_id: "edge.adopt-or-verify-existing-topology",
    title: "Adopt or verify existing edge topology",
    status: "SUCCEEDED",
    reason:
      "No prior edge inventory was supplied; a sanitized edge inventory will be created.",
  };

  if (options.existingInventoryPath) {
    try {
      const existingInventory = JSON.parse(
        await readFile(options.existingInventoryPath, "utf8"),
      ) as EdgeInventoryTemplate;
      if (
        JSON.stringify(stableInventoryComparable(existingInventory)) !==
        JSON.stringify(stableInventoryComparable(inventory))
      ) {
        return {
          outcome: "EDGE_BOUNDARY_DRIFT_REVIEW_REQUIRED",
          selection_status: selectionStatus,
          schema,
          dnsAndOriginMatrix,
          tlsCertificateInventory,
          wafAndRateLimitPolicy,
          cacheAndDeliveryBindingPolicy,
          callbackAndWebhookOriginPolicy,
          inventory,
          atlasViewModel: createEdgeBoundaryAtlasViewModel(
            options.providerFamilySelection,
          ),
          steps: [
            {
              step_id: "edge.resolve-provider-family",
              title: "Resolve edge provider family",
              status: "SUCCEEDED",
              reason: options.providerFamilySelection
                ? `Provider family ${options.providerFamilySelection} was supplied explicitly.`
                : "No upstream edge provider choice existed, so the unified default provider family was applied declaratively.",
            },
            {
              step_id: "edge.adopt-or-verify-existing-topology",
              title: "Adopt or verify existing edge topology",
              status: "BLOCKED_BY_DRIFT",
              reason:
                "Existing edge inventory differs from the frozen topology signature. The flow stopped without overwriting the prior record.",
            },
          ],
          notes: [
            "No existing edge inventory file was overwritten because topology drift requires review.",
          ],
        };
      }
      adoptionStep = {
        step_id: "edge.adopt-or-verify-existing-topology",
        title: "Adopt or verify existing edge topology",
        status: "SKIPPED_AS_ALREADY_PRESENT",
        reason:
          "Existing edge inventory matches the frozen topology signature and can be adopted without drift.",
      };
    } catch {
      adoptionStep = {
        step_id: "edge.adopt-or-verify-existing-topology",
        title: "Adopt or verify existing edge topology",
        status: "SUCCEEDED",
        reason:
          "No prior edge inventory could be read; a sanitized edge inventory will be created.",
      };
    }
  }

  await mkdir(path.dirname(options.inventoryPath), { recursive: true });
  await writeFile(options.inventoryPath, `${JSON.stringify(inventory, null, 2)}\n`, "utf8");

  return {
    outcome: options.providerFamilySelection
      ? "EDGE_BOUNDARY_READY_FOR_PROVIDER_ADOPTION"
      : "EDGE_BOUNDARY_PROVIDER_DEFAULT_APPLIED",
    selection_status: selectionStatus,
    schema,
    dnsAndOriginMatrix,
    tlsCertificateInventory,
    wafAndRateLimitPolicy,
    cacheAndDeliveryBindingPolicy,
    callbackAndWebhookOriginPolicy,
    inventory,
    atlasViewModel: createEdgeBoundaryAtlasViewModel(options.providerFamilySelection),
    steps: [
      {
        step_id: "edge.resolve-provider-family",
        title: "Resolve edge provider family",
        status: "SUCCEEDED",
        reason: options.providerFamilySelection
          ? `Provider family ${options.providerFamilySelection} was supplied explicitly.`
          : "No prior edge provider was fixed upstream, so the unified default provider family was applied declaratively.",
      },
      {
        step_id: "edge.freeze-host-and-origin-matrix",
        title: "Freeze host and origin matrix",
        status: "SUCCEEDED",
        reason:
          "Every public host and path family now maps to a single origin class, WAF posture, TLS inventory row, and cache policy.",
      },
      {
        step_id: "edge.freeze-tls-inventory",
        title: "Freeze TLS and certificate inventory",
        status: "SUCCEEDED",
        reason:
          "Environment-scoped core and ingress certificates, HSTS posture, and wildcard preview usage are now explicit.",
      },
      {
        step_id: "edge.freeze-waf-and-rate-limits",
        title: "Freeze WAF and rate-limit posture",
        status: "SUCCEEDED",
        reason:
          "Managed rules, callback exceptions, typed allowlists, and per-surface rate limits are now explicit.",
      },
      {
        step_id: "edge.freeze-cache-law",
        title: "Freeze cache and delivery-binding law",
        status: "SUCCEEDED",
        reason:
          "Streaming, callback, preview, signed-download, and immutable-asset posture is now machine-readable.",
      },
      {
        step_id: "edge.freeze-callback-origins",
        title: "Freeze callback and webhook origin policy",
        status: "SUCCEEDED",
        reason:
          "Callback hosts, auth posture, replay protection, and allowlists are now explicit and reviewable.",
      },
      adoptionStep,
      {
        step_id: "edge.persist-sanitized-inventory",
        title: "Persist sanitized inventory",
        status: "SUCCEEDED",
        reason:
          "Sanitized edge inventory persisted with hostname, certificate, and policy refs only.",
      },
    ],
    notes: [
      "No live provider mutation occurred.",
      "This flow is safe to rerun because it only writes sanitized inventory and compares topology drift explicitly.",
    ],
  };
}

export async function emitCheckedInArtifacts(repoRoot: string): Promise<void> {
  const schema = createEdgeBoundaryTopologySchema();
  const dnsAndOriginMatrix = createDnsAndOriginMatrix();
  const tlsCertificateInventory = createTlsCertificateInventory();
  const wafAndRateLimitPolicy = createWafAndRateLimitPolicy();
  const cacheAndDeliveryBindingPolicy = createCacheAndDeliveryBindingPolicy();
  const callbackAndWebhookOriginPolicy = createCallbackAndWebhookOriginPolicy();
  const inventory = createEdgeInventoryTemplate();
  const atlasViewModel = createEdgeBoundaryAtlasViewModel();
  const runbookMarkdown = createEdgeBoundaryRunbookMarkdown();

  const writes: Array<[string, string]> = [
    [
      "infra/edge/contracts/edge_boundary_topology.schema.json",
      `${JSON.stringify(schema, null, 2)}\n`,
    ],
    [
      "config/edge/dns_and_origin_matrix.json",
      `${JSON.stringify(dnsAndOriginMatrix, null, 2)}\n`,
    ],
    [
      "config/edge/tls_certificate_inventory.json",
      `${JSON.stringify(tlsCertificateInventory, null, 2)}\n`,
    ],
    [
      "config/edge/waf_and_rate_limit_policy.json",
      `${JSON.stringify(wafAndRateLimitPolicy, null, 2)}\n`,
    ],
    [
      "config/edge/cache_and_delivery_binding_policy.json",
      `${JSON.stringify(cacheAndDeliveryBindingPolicy, null, 2)}\n`,
    ],
    [
      "config/edge/callback_and_webhook_origin_policy.json",
      `${JSON.stringify(callbackAndWebhookOriginPolicy, null, 2)}\n`,
    ],
    [
      "data/provisioning/edge_inventory.template.json",
      `${JSON.stringify(inventory, null, 2)}\n`,
    ],
    ["docs/provisioning/edge_boundary_runbook.md", runbookMarkdown],
  ];

  for (const [relativePath, content] of writes) {
    const targetPath = path.join(repoRoot, relativePath);
    await mkdir(path.dirname(targetPath), { recursive: true });
    await writeFile(targetPath, content, "utf8");
  }

  const sampleRunPath = path.join(
    repoRoot,
    "automation/provisioning/report_viewer/data/sample_run.json",
  );
  const sampleRun = JSON.parse(await readFile(sampleRunPath, "utf8")) as Record<
    string,
    unknown
  >;
  sampleRun.edgeBoundaryAtlas = atlasViewModel;
  await writeFile(sampleRunPath, `${JSON.stringify(sampleRun, null, 2)}\n`, "utf8");
}

async function main() {
  const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
  const selfPath = fileURLToPath(import.meta.url);
  if (invokedPath !== selfPath) {
    return;
  }

  if (process.argv.includes("--emit")) {
    const repoRoot = path.resolve(path.dirname(selfPath), "..", "..", "..");
    await emitCheckedInArtifacts(repoRoot);
  }
}

await main();
