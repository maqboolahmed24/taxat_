import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";

import type { DelegationGrantRecord } from "../models/delegation_grant.ts";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..", "..", "..");
const policyPath = path.join(repoRoot, "config", "access", "delegation_freshness_policy.json");

export type DelegationFreshnessPolicy = {
  contract_version: "DELEGATION_FRESHNESS_POLICY_V1";
  basis_statement: string;
  imported_basis_types: Array<"SELF_ASSESSMENT_IMPORTED" | "DIGITAL_HANDSHAKE">;
  current_state: "CURRENT";
  not_applicable_state: "NOT_APPLICABLE";
  revalidation_required_state: "REVALIDATION_REQUIRED";
  revalidation_window_hours: number;
  stale_import_blocks_live_authority: true;
};

export type DelegationFreshnessResolution = {
  freshness_state: "NOT_APPLICABLE" | "CURRENT" | "REVALIDATION_REQUIRED";
  live_usable: boolean;
  stale: boolean;
};

let cachedPolicy: Promise<DelegationFreshnessPolicy> | null = null;

export async function loadDelegationFreshnessPolicy(options?: { reload?: boolean }) {
  if (!cachedPolicy || options?.reload) {
    cachedPolicy = readFile(policyPath, "utf8").then((raw) => {
      const parsed = JSON.parse(raw) as DelegationFreshnessPolicy;
      if (parsed.contract_version !== "DELEGATION_FRESHNESS_POLICY_V1") {
        throw new Error("Unexpected delegation freshness policy version.");
      }
      return parsed;
    });
  }
  return cachedPolicy;
}

function thresholdInstant(instant: string, hours: number) {
  return new Date(new Date(instant).valueOf() - hours * 60 * 60 * 1000).toISOString();
}

export class DelegationFreshnessService {
  async resolve(
    record: DelegationGrantRecord,
    evaluatedAt: string,
  ): Promise<DelegationFreshnessResolution> {
    const policy = await loadDelegationFreshnessPolicy();
    const normalizedEvaluatedAt = normalizeUtcInstantString(evaluatedAt);

    if (record.basis_type === "CLIENT_GRANTED") {
      return {
        freshness_state: policy.not_applicable_state,
        live_usable: true,
        stale: false,
      };
    }

    if (
      record.imported_evidence_fresh_until === null ||
      record.last_validated_at === null ||
      !["ACTIVE", "LIMITED_SCOPE"].includes(record.lifecycle_state)
    ) {
      return {
        freshness_state: policy.revalidation_required_state,
        live_usable: false,
        stale: true,
      };
    }

    if (
      normalizedEvaluatedAt > record.imported_evidence_fresh_until ||
      record.last_validated_at > record.imported_evidence_fresh_until
    ) {
      return {
        freshness_state: policy.revalidation_required_state,
        live_usable: false,
        stale: true,
      };
    }

    if (
      normalizedEvaluatedAt >=
      thresholdInstant(
        record.imported_evidence_fresh_until,
        policy.revalidation_window_hours,
      )
    ) {
      return {
        freshness_state: policy.revalidation_required_state,
        live_usable: false,
        stale: false,
      };
    }

    return {
      freshness_state: policy.current_state,
      live_usable: true,
      stale: false,
    };
  }
}

