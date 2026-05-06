import type { CacheIsolationContract } from "../../../generated-models/src/generated/typescript/domain-workflow-and-filing.ts";
import { buildCacheIsolationKey } from "./cache_isolation_key.ts";
import { buildCachePurgePlan, type CachePurgePlan } from "./cache_purge_plan.ts";
import {
  assessPreviewExportReuse,
  type PreviewExportReuseDecision,
} from "./preview_export_binding.ts";

export type CacheReuseDecision = "EXACT_REUSE" | "READ_ONLY_RESTORE" | "REJECT_AND_PURGE";

export type CacheReuseGuardResult = {
  allowed: boolean;
  cacheKey: string;
  decision: CacheReuseDecision;
  hydrationAllowed: boolean;
  mutationGate:
    | "ALLOW_MUTATION"
    | "BLOCK_MUTATION_AND_PURGE"
    | "BLOCK_MUTATION_PENDING_LIVE_LEGALITY";
  previewExportDecision: PreviewExportReuseDecision;
  purgePlan: CachePurgePlan;
};

export async function assessCacheReuseGuard(
  input: {
    liveLegalityState: "CACHE_ONLY" | "CURRENT" | "REVALIDATING";
    requestedContract: CacheIsolationContract;
    storedContract: CacheIsolationContract;
  },
  options?: { reload?: boolean },
) {
  const [cacheKey, purgePlan, previewExportDecision] = await Promise.all([
    buildCacheIsolationKey(input.requestedContract, options),
    buildCachePurgePlan(
      {
        requestedContract: input.requestedContract,
        storedContract: input.storedContract,
      },
      options,
    ),
    assessPreviewExportReuse(
      {
        cacheContract: input.storedContract,
        currentOnly: true,
        liveLegalityState: input.liveLegalityState,
        routeIdentityRef: input.requestedContract.route_identity_ref,
        selectedSubjectRefOrNull: input.requestedContract.preview_subject_ref_or_null,
      },
      options,
    ),
  ]);

  if (purgePlan.triggerCodes.length > 0) {
    return {
      allowed: false,
      cacheKey,
      decision: "REJECT_AND_PURGE",
      hydrationAllowed: false,
      mutationGate: "BLOCK_MUTATION_AND_PURGE",
      previewExportDecision,
      purgePlan,
    } satisfies CacheReuseGuardResult;
  }

  if (input.liveLegalityState !== "CURRENT") {
    return {
      allowed: true,
      cacheKey,
      decision: "READ_ONLY_RESTORE",
      hydrationAllowed: true,
      mutationGate: "BLOCK_MUTATION_PENDING_LIVE_LEGALITY",
      previewExportDecision,
      purgePlan,
    } satisfies CacheReuseGuardResult;
  }

  return {
    allowed: true,
    cacheKey,
    decision: "EXACT_REUSE",
    hydrationAllowed: true,
    mutationGate: "ALLOW_MUTATION",
    previewExportDecision,
    purgePlan,
  } satisfies CacheReuseGuardResult;
}
