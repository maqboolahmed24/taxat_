import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";

import type { ExceptionalAuthorityGrantRecord } from "../models/exceptional_authority_grant.ts";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..", "..", "..");
const policyPath = path.join(repoRoot, "config", "access", "exceptional_authority_policy.json");

export type ExceptionalAuthorityPolicy = {
  contract_version: "EXCEPTIONAL_AUTHORITY_POLICY_V1";
  basis_statement: string;
  compare_and_swap_required: true;
  main_agent_only_action_families: string[];
  human_facing_terms: {
    digital_handshake_label: "authorisation link";
  };
};

export type ExceptionalAuthorityBudgetResolution = {
  usable: boolean;
  exhausted: boolean;
  main_agent_only_blocked: boolean;
};

let cachedPolicy: Promise<ExceptionalAuthorityPolicy> | null = null;

export async function loadExceptionalAuthorityPolicy(options?: { reload?: boolean }) {
  if (!cachedPolicy || options?.reload) {
    cachedPolicy = readFile(policyPath, "utf8").then((raw) => {
      const parsed = JSON.parse(raw) as ExceptionalAuthorityPolicy;
      if (parsed.contract_version !== "EXCEPTIONAL_AUTHORITY_POLICY_V1") {
        throw new Error("Unexpected exceptional authority policy version.");
      }
      return parsed;
    });
  }
  return cachedPolicy;
}

export class ExceptionalAuthorityBudgetService {
  async isMainAgentOnlyBlocked(input: {
    action_family: string;
    supporting_agent_posture?: boolean;
  }) {
    if (input.supporting_agent_posture !== true) {
      return false;
    }
    const policy = await loadExceptionalAuthorityPolicy();
    return policy.main_agent_only_action_families.includes(input.action_family);
  }

  async resolve(
    record: ExceptionalAuthorityGrantRecord,
    input: {
      action_family: string;
      evaluated_at: string;
      supporting_agent_posture?: boolean;
    },
  ): Promise<ExceptionalAuthorityBudgetResolution> {
    const normalizedEvaluatedAt = normalizeUtcInstantString(input.evaluated_at);
    const mainAgentOnlyBlocked = await this.isMainAgentOnlyBlocked({
      action_family: input.action_family,
      ...(input.supporting_agent_posture === undefined
        ? {}
        : { supporting_agent_posture: input.supporting_agent_posture }),
    });

    const usable =
      record.lifecycle_state === "ACTIVE" &&
      record.target_action_family === input.action_family &&
      record.remaining_uses > 0 &&
      record.revoked_at === null &&
      record.expires_at > normalizedEvaluatedAt &&
      !mainAgentOnlyBlocked;

    return {
      usable,
      exhausted: record.remaining_uses === 0 || record.lifecycle_state === "EXHAUSTED",
      main_agent_only_blocked: mainAgentOnlyBlocked,
    };
  }
}
