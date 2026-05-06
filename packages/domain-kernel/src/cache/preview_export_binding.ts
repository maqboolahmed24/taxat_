import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { CacheIsolationContract } from "../../../generated-models/src/generated/typescript/domain-workflow-and-filing.ts";
import { computeCacheDeliveryBindingHash, type CacheScopeClass } from "./cache_isolation_key.ts";
import type { CachePurgeArtifactClass } from "./cache_purge_plan.ts";

export type PreviewExportReuseDecisionCode =
  | "ALLOWED"
  | "DELIVERY_BINDING_DRIFT"
  | "LIVE_LEGALITY_PENDING"
  | "NOT_CURRENT_SELECTION"
  | "ROUTE_MISMATCH"
  | "SELECTION_MISMATCH";

export type PreviewExportReusePolicyRow = {
  cache_scope_class: CacheScopeClass;
  current_selection_only: boolean;
  notes: string[];
  purge_artifact_classes_on_drift: CachePurgeArtifactClass[];
  route_match_required: boolean;
  selected_subject_policy: "EXACT_MATCH_WHEN_PRESENT" | "NULL_ONLY";
};

export type PreviewExportReusePolicy = {
  basis_statement: string;
  contract_version: "PREVIEW_EXPORT_REUSE_POLICY_V1";
  policy_id: string;
  scope_rows: PreviewExportReusePolicyRow[];
  source_lineage: Array<{
    rationale: string;
    source_file: string;
    source_heading_or_logical_block: string;
  }>;
};

export type PreviewExportReuseDecision = {
  allowed: boolean;
  decisionCode: PreviewExportReuseDecisionCode;
  expectedDeliveryBindingHash: string;
  purgeArtifactClasses: CachePurgeArtifactClass[];
};

type PreviewExportBindingErrorInit = {
  code: "POLICY_VALIDATION_FAILED" | "PREVIEW_EXPORT_SCOPE_UNKNOWN";
  detail: string;
};

export class PreviewExportBindingError extends Error {
  readonly code: PreviewExportBindingErrorInit["code"];

  constructor(init: PreviewExportBindingErrorInit) {
    super(`${init.code}: ${init.detail}`);
    this.name = "PreviewExportBindingError";
    this.code = init.code;
  }
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..", "..", "..");
const previewPolicyPath = path.join(
  repoRoot,
  "config",
  "cache",
  "preview_export_reuse_policy.json",
);
let cachedPolicy: Promise<PreviewExportReusePolicy> | null = null;

function assertCondition(
  condition: unknown,
  init: PreviewExportBindingErrorInit,
): asserts condition {
  if (!condition) {
    throw new PreviewExportBindingError(init);
  }
}

async function readJson<T>(filePath: string) {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

function validatePolicy(policy: PreviewExportReusePolicy) {
  assertCondition(policy.contract_version === "PREVIEW_EXPORT_REUSE_POLICY_V1", {
    code: "POLICY_VALIDATION_FAILED",
    detail: "preview/export reuse policy contract version drifted",
  });
  const seen = new Set<CacheScopeClass>();
  for (const row of policy.scope_rows) {
    assertCondition(!seen.has(row.cache_scope_class), {
      code: "POLICY_VALIDATION_FAILED",
      detail: `duplicate preview/export reuse row ${row.cache_scope_class}`,
    });
    seen.add(row.cache_scope_class);
  }
}

export async function loadPreviewExportReusePolicy(options?: { reload?: boolean }) {
  if (!cachedPolicy || options?.reload) {
    cachedPolicy = (async () => {
      const policy = await readJson<PreviewExportReusePolicy>(previewPolicyPath);
      validatePolicy(policy);
      return policy;
    })();
  }
  return cachedPolicy;
}

export function previewExportReuseRow(
  policy: PreviewExportReusePolicy,
  cacheScopeClass: CacheScopeClass,
) {
  const row =
    policy.scope_rows.find((entry) => entry.cache_scope_class === cacheScopeClass) ?? null;
  assertCondition(row !== null, {
    code: "PREVIEW_EXPORT_SCOPE_UNKNOWN",
    detail: `unknown preview/export reuse scope ${cacheScopeClass}`,
  });
  return row;
}

export async function assessPreviewExportReuse(
  input: {
    cacheContract: CacheIsolationContract;
    currentOnly: boolean;
    liveLegalityState: "CACHE_ONLY" | "CURRENT" | "REVALIDATING";
    routeIdentityRef: string;
    selectedSubjectRefOrNull?: string | null;
  },
  options?: { reload?: boolean },
) {
  const policy = await loadPreviewExportReusePolicy(options);
  const row = previewExportReuseRow(policy, input.cacheContract.cache_scope_class);
  const expectedDeliveryBindingHash = computeCacheDeliveryBindingHash(input.cacheContract);

  if (input.cacheContract.delivery_binding_hash !== expectedDeliveryBindingHash) {
    return {
      allowed: false,
      decisionCode: "DELIVERY_BINDING_DRIFT",
      expectedDeliveryBindingHash,
      purgeArtifactClasses: row.purge_artifact_classes_on_drift,
    } satisfies PreviewExportReuseDecision;
  }

  if (input.liveLegalityState !== "CURRENT") {
    return {
      allowed: false,
      decisionCode: "LIVE_LEGALITY_PENDING",
      expectedDeliveryBindingHash,
      purgeArtifactClasses: [],
    } satisfies PreviewExportReuseDecision;
  }

  if (
    row.route_match_required &&
    input.routeIdentityRef !== input.cacheContract.route_identity_ref
  ) {
    return {
      allowed: false,
      decisionCode: "ROUTE_MISMATCH",
      expectedDeliveryBindingHash,
      purgeArtifactClasses: row.purge_artifact_classes_on_drift,
    } satisfies PreviewExportReuseDecision;
  }

  if (row.current_selection_only && !input.currentOnly) {
    return {
      allowed: false,
      decisionCode: "NOT_CURRENT_SELECTION",
      expectedDeliveryBindingHash,
      purgeArtifactClasses: row.purge_artifact_classes_on_drift,
    } satisfies PreviewExportReuseDecision;
  }

  const selectedSubjectRefOrNull = input.selectedSubjectRefOrNull ?? null;
  if (row.selected_subject_policy === "NULL_ONLY") {
    if (
      input.cacheContract.preview_subject_ref_or_null !== null ||
      selectedSubjectRefOrNull !== null
    ) {
      return {
        allowed: false,
        decisionCode: "SELECTION_MISMATCH",
        expectedDeliveryBindingHash,
        purgeArtifactClasses: row.purge_artifact_classes_on_drift,
      } satisfies PreviewExportReuseDecision;
    }
  } else if (selectedSubjectRefOrNull !== input.cacheContract.preview_subject_ref_or_null) {
    return {
      allowed: false,
      decisionCode: "SELECTION_MISMATCH",
      expectedDeliveryBindingHash,
      purgeArtifactClasses: row.purge_artifact_classes_on_drift,
    } satisfies PreviewExportReuseDecision;
  }

  return {
    allowed: true,
    decisionCode: "ALLOWED",
    expectedDeliveryBindingHash,
    purgeArtifactClasses: [],
  } satisfies PreviewExportReuseDecision;
}
