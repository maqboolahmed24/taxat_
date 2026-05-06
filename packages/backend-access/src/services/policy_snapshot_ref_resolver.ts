import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { normalizeStringSet, requireTrimmedString } from "./principal_context_normalizer.ts";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..", "..", "..");
const accessMatrixPath = path.join(repoRoot, "config", "access", "access_control_matrix.json");

type AccessMatrixRoleTemplate = {
  approval_capabilities: string[];
  client_portal_capabilities: string[];
  policy_snapshot_hash: string;
  role_id: string;
  run_kind_capabilities: string[];
  version_hash: string;
};

type AccessControlMatrixArtifact = {
  contract_version?: "ACCESS_CONTROL_MATRIX_V1";
  policy_snapshot_hash: string;
  role_templates: AccessMatrixRoleTemplate[];
};

export type ResolvedPolicySnapshotRef = {
  approval_capabilities: string[];
  client_portal_capabilities: string[];
  missing_role_ids: string[];
  policy_snapshot_hash: string;
  resolved_role_ids: string[];
  role_version_hashes: string[];
  run_kind_capabilities: string[];
};

type PolicySnapshotRefResolverErrorCode =
  | "POLICY_SNAPSHOT_MATRIX_INVALID"
  | "POLICY_SNAPSHOT_ROLE_SET_EMPTY";

export class PolicySnapshotRefResolverError extends Error {
  readonly code: PolicySnapshotRefResolverErrorCode;

  constructor(code: PolicySnapshotRefResolverErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "PolicySnapshotRefResolverError";
    this.code = code;
  }
}

let cachedMatrix: Promise<AccessControlMatrixArtifact> | null = null;

async function loadAccessMatrix(options?: { reload?: boolean }) {
  if (!cachedMatrix || options?.reload) {
    cachedMatrix = readFile(accessMatrixPath, "utf8").then((raw) => {
      const parsed = JSON.parse(raw) as AccessControlMatrixArtifact;
      if (
        parsed.contract_version !== undefined &&
        parsed.contract_version !== "ACCESS_CONTROL_MATRIX_V1"
      ) {
        throw new PolicySnapshotRefResolverError(
          "POLICY_SNAPSHOT_MATRIX_INVALID",
          "unexpected access-control matrix contract_version",
        );
      }
      return parsed;
    });
  }
  return cachedMatrix;
}

export class PolicySnapshotRefResolver {
  async resolveForRoleSet(
    effectiveRoleSet: readonly string[],
    options?: { reload?: boolean },
  ): Promise<ResolvedPolicySnapshotRef> {
    const normalizedRoleSet = normalizeStringSet("effective_role_set", effectiveRoleSet, {
      minItems: 1,
    });
    if (normalizedRoleSet.length === 0) {
      throw new PolicySnapshotRefResolverError(
        "POLICY_SNAPSHOT_ROLE_SET_EMPTY",
        "effective_role_set must contain at least one role id",
      );
    }

    const matrix = await loadAccessMatrix(options);
    const roleTemplates = new Map(
      matrix.role_templates.map((template) => [
        requireTrimmedString("role_template.role_id", template.role_id),
        template,
      ]),
    );

    const resolved_role_ids: string[] = [];
    const missing_role_ids: string[] = [];
    const approval_capabilities = new Set<string>();
    const client_portal_capabilities = new Set<string>();
    const run_kind_capabilities = new Set<string>();
    const role_version_hashes = new Set<string>();

    for (const roleId of normalizedRoleSet) {
      const template = roleTemplates.get(roleId);
      if (!template) {
        missing_role_ids.push(roleId);
        continue;
      }
      resolved_role_ids.push(roleId);
      template.approval_capabilities.forEach((capability) => approval_capabilities.add(capability));
      template.client_portal_capabilities.forEach((capability) =>
        client_portal_capabilities.add(capability),
      );
      template.run_kind_capabilities.forEach((capability) => run_kind_capabilities.add(capability));
      role_version_hashes.add(requireTrimmedString("role_template.version_hash", template.version_hash));
    }

    return {
      policy_snapshot_hash: requireTrimmedString(
        "access_control_matrix.policy_snapshot_hash",
        matrix.policy_snapshot_hash,
      ),
      resolved_role_ids,
      missing_role_ids,
      approval_capabilities: normalizeStringSet(
        "approval_capabilities",
        [...approval_capabilities],
      ),
      client_portal_capabilities: normalizeStringSet(
        "client_portal_capabilities",
        [...client_portal_capabilities],
      ),
      run_kind_capabilities: normalizeStringSet(
        "run_kind_capabilities",
        [...run_kind_capabilities],
      ),
      role_version_hashes: normalizeStringSet("role_version_hashes", [...role_version_hashes]),
    };
  }
}
