import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  materializeDependencyTopologyHash,
} from "../hash/dependency_topology_hash.ts";
import {
  normalizeStringSet,
  requireTrimmedString,
} from "./principal_context_normalizer.ts";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..", "..", "..");
const simulationProfileCatalogPath = path.join(
  repoRoot,
  "config",
  "governance",
  "simulation_profile_catalog.json",
);

const epsilon = 1e-6;

export type GovernanceSimulationProfileNodeType =
  | "PRINCIPAL"
  | "CLIENT"
  | "AUTHORITY_OPERATION"
  | "WORKFLOW"
  | "LIMITATION"
  | "ROLE"
  | "POLICY_RULE"
  | "AUTHORITY_LINK"
  | "RETENTION_RULE"
  | "EXPORT_SURFACE"
  | "APPROVAL_OBJECT";

export type GovernanceSimulationEdgeDefault = {
  control_criticality: number;
  externality: number;
  irreversibility: number;
  privilege_coupling: number;
  scope_overlap: number;
  semantically_relevant: boolean;
  settlement_p50_seconds: number;
};

export type GovernanceSimulationProfile = {
  action_families: string[];
  edge_defaults: Record<string, GovernanceSimulationEdgeDefault>;
  edge_weight_profile_ref: string;
  freshness_budget_seconds: number;
  gamma: number;
  impact_presence_threshold: number;
  maximum_propagation_depth: number;
  node_seed_defaults: Record<string, number>;
  node_weight_profile_ref: string;
  node_weights: Record<string, number>;
  profile_ref: string;
  resource_classes: string[];
  settlement_sla_seconds: number;
  source_refs: string[];
  tau_prop_seconds: number;
};

export type GovernanceSimulationProfileCatalog = {
  basis_statement: string;
  contract_version: "GOVERNANCE_SIMULATION_PROFILE_CATALOG_V1";
  profiles: GovernanceSimulationProfile[];
  source_lineage: Array<{
    source_file: string;
    source_ref: string;
  }>;
};

export type DependencyTopologyNodeInput = {
  external_authority?: boolean;
  node_ref: string;
  node_type: GovernanceSimulationProfileNodeType;
  node_weight?: number;
  seed?: number;
  validated?: boolean;
  version_ref?: string | null;
};

export type DependencyTopologyEdgeInput = {
  control_criticality?: number;
  edge_ref?: string;
  edge_type: string;
  externality?: number;
  from_node_ref: string;
  irreversibility?: number;
  observed?: boolean;
  privilege_coupling?: number;
  scope_overlap?: number;
  semantically_relevant?: boolean;
  settlement_p50_seconds?: number;
  to_node_ref: string;
  version_ref?: string | null;
};

export type DependencyTopologyNode = {
  external_authority: boolean;
  node_ref: string;
  node_type: GovernanceSimulationProfileNodeType;
  node_weight: number;
  seed: number;
  validated: boolean;
  version_ref: string | null;
};

export type DependencyTopologyEdge = {
  control_criticality: number;
  edge_ref: string;
  edge_type: string;
  externality: number;
  from_node_ref: string;
  irreversibility: number;
  observed: boolean;
  privilege_coupling: number;
  propagation_speed: number;
  scope_overlap: number;
  semantically_relevant: boolean;
  settlement_p50_seconds: number;
  to_node_ref: string;
  version_ref: string | null;
  weight: number;
};

export type DependencyTopologyBuildInput = {
  action_family: string;
  edges?: DependencyTopologyEdgeInput[];
  inventory_slice_refs?: string[];
  nodes: DependencyTopologyNodeInput[];
  profile_ref?: string;
  resource_class: string;
};

export type DependencyTopologyBuildResult = {
  dependency_topology_hash: string;
  edge_weight_profile_ref: string;
  edges: DependencyTopologyEdge[];
  gamma: number;
  impact_presence_threshold: number;
  inventory_slice_refs: string[];
  maximum_propagation_depth: number;
  node_weight_profile_ref: string;
  nodes: DependencyTopologyNode[];
  profile: GovernanceSimulationProfile;
  referenced_object_version_refs: string[];
  tau_prop_seconds: number;
};

type DependencyTopologyBuilderErrorCode =
  | "DEPENDENCY_TOPOLOGY_CATALOG_INVALID"
  | "DEPENDENCY_TOPOLOGY_NODE_MISSING"
  | "DEPENDENCY_TOPOLOGY_PROFILE_NOT_FOUND"
  | "DEPENDENCY_TOPOLOGY_SEED_INVALID";

export class DependencyTopologyBuilderError extends Error {
  readonly code: DependencyTopologyBuilderErrorCode;

  constructor(code: DependencyTopologyBuilderErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "DependencyTopologyBuilderError";
    this.code = code;
  }
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function normalizePositiveNumber(label: string, value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new DependencyTopologyBuilderError(
      "DEPENDENCY_TOPOLOGY_CATALOG_INVALID",
      `${label} must be a positive number`,
    );
  }
  return value;
}

function normalizeBoundedRatio(label: string, value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new DependencyTopologyBuilderError(
      "DEPENDENCY_TOPOLOGY_CATALOG_INVALID",
      `${label} must be a finite number`,
    );
  }
  return clamp01(value);
}

let cachedCatalog: Promise<GovernanceSimulationProfileCatalog> | null = null;

export async function loadGovernanceSimulationProfileCatalog(options?: {
  reload?: boolean;
}) {
  if (!cachedCatalog || options?.reload) {
    cachedCatalog = readFile(simulationProfileCatalogPath, "utf8").then((raw) => {
      const parsed = JSON.parse(raw) as GovernanceSimulationProfileCatalog;
      if (
        parsed.contract_version !== "GOVERNANCE_SIMULATION_PROFILE_CATALOG_V1"
      ) {
        throw new DependencyTopologyBuilderError(
          "DEPENDENCY_TOPOLOGY_CATALOG_INVALID",
          "unexpected governance simulation profile catalog version",
        );
      }
      return {
        ...parsed,
        profiles: parsed.profiles.map((profile) => ({
          ...profile,
          action_families: normalizeStringSet(
            `simulation_profile.${profile.profile_ref}.action_families`,
            profile.action_families,
            { minItems: 1 },
          ),
          resource_classes: normalizeStringSet(
            `simulation_profile.${profile.profile_ref}.resource_classes`,
            profile.resource_classes,
            { minItems: 1 },
          ),
          node_weight_profile_ref: requireTrimmedString(
            `simulation_profile.${profile.profile_ref}.node_weight_profile_ref`,
            profile.node_weight_profile_ref,
          ),
          edge_weight_profile_ref: requireTrimmedString(
            `simulation_profile.${profile.profile_ref}.edge_weight_profile_ref`,
            profile.edge_weight_profile_ref,
          ),
          profile_ref: requireTrimmedString(
            "simulation_profile.profile_ref",
            profile.profile_ref,
          ),
          source_refs: normalizeStringSet(
            `simulation_profile.${profile.profile_ref}.source_refs`,
            profile.source_refs,
            { minItems: 1 },
          ),
          gamma: normalizeBoundedRatio(
            `simulation_profile.${profile.profile_ref}.gamma`,
            profile.gamma,
          ),
          impact_presence_threshold: normalizeBoundedRatio(
            `simulation_profile.${profile.profile_ref}.impact_presence_threshold`,
            profile.impact_presence_threshold,
          ),
          maximum_propagation_depth: Math.max(
            0,
            Math.floor(
              normalizePositiveNumber(
                `simulation_profile.${profile.profile_ref}.maximum_propagation_depth`,
                profile.maximum_propagation_depth,
              ),
            ),
          ),
          freshness_budget_seconds: normalizePositiveNumber(
            `simulation_profile.${profile.profile_ref}.freshness_budget_seconds`,
            profile.freshness_budget_seconds,
          ),
          tau_prop_seconds: normalizePositiveNumber(
            `simulation_profile.${profile.profile_ref}.tau_prop_seconds`,
            profile.tau_prop_seconds,
          ),
          settlement_sla_seconds: normalizePositiveNumber(
            `simulation_profile.${profile.profile_ref}.settlement_sla_seconds`,
            profile.settlement_sla_seconds,
          ),
          node_weights: Object.fromEntries(
            Object.entries(profile.node_weights ?? {}).map(([key, value]) => [
              requireTrimmedString(
                `simulation_profile.${profile.profile_ref}.node_weights.${key}`,
                key,
              ),
              normalizePositiveNumber(
                `simulation_profile.${profile.profile_ref}.node_weights.${key}`,
                value,
              ),
            ]),
          ),
          node_seed_defaults: Object.fromEntries(
            Object.entries(profile.node_seed_defaults ?? {}).map(([key, value]) => [
              requireTrimmedString(
                `simulation_profile.${profile.profile_ref}.node_seed_defaults.${key}`,
                key,
              ),
              normalizeBoundedRatio(
                `simulation_profile.${profile.profile_ref}.node_seed_defaults.${key}`,
                value,
              ),
            ]),
          ),
          edge_defaults: Object.fromEntries(
            Object.entries(profile.edge_defaults ?? {}).map(([key, value]) => [
              requireTrimmedString(
                `simulation_profile.${profile.profile_ref}.edge_defaults.${key}`,
                key,
              ),
              {
                scope_overlap: normalizeBoundedRatio(
                  `simulation_profile.${profile.profile_ref}.edge_defaults.${key}.scope_overlap`,
                  value.scope_overlap,
                ),
                privilege_coupling: normalizeBoundedRatio(
                  `simulation_profile.${profile.profile_ref}.edge_defaults.${key}.privilege_coupling`,
                  value.privilege_coupling,
                ),
                control_criticality: normalizeBoundedRatio(
                  `simulation_profile.${profile.profile_ref}.edge_defaults.${key}.control_criticality`,
                  value.control_criticality,
                ),
                externality: normalizeBoundedRatio(
                  `simulation_profile.${profile.profile_ref}.edge_defaults.${key}.externality`,
                  value.externality,
                ),
                irreversibility: normalizeBoundedRatio(
                  `simulation_profile.${profile.profile_ref}.edge_defaults.${key}.irreversibility`,
                  value.irreversibility,
                ),
                settlement_p50_seconds: normalizePositiveNumber(
                  `simulation_profile.${profile.profile_ref}.edge_defaults.${key}.settlement_p50_seconds`,
                  value.settlement_p50_seconds,
                ),
                semantically_relevant: Boolean(value.semantically_relevant),
              } satisfies GovernanceSimulationEdgeDefault,
            ]),
          ),
        })),
      };
    });
  }
  return cachedCatalog;
}

function edgeOrderingKey(edge: {
  edge_ref: string;
  edge_type: string;
  from_node_ref: string;
  to_node_ref: string;
  version_ref: string | null;
}) {
  return [
    edge.from_node_ref,
    edge.to_node_ref,
    edge.edge_type,
    edge.version_ref ?? "",
    edge.edge_ref,
  ].join("::");
}

function resolvePropagationSpeed(
  settlementP50Seconds: number,
  tauPropSeconds: number,
) {
  return Math.exp((-Math.log(2) * settlementP50Seconds) / Math.max(tauPropSeconds, epsilon));
}

function resolveEdgeWeight(input: {
  control_criticality: number;
  externality: number;
  irreversibility: number;
  privilege_coupling: number;
  propagation_speed: number;
  scope_overlap: number;
}) {
  return clamp01(
    1 -
      (1 - input.scope_overlap) ** 0.22 *
        (1 - input.privilege_coupling) ** 0.22 *
        (1 - input.control_criticality) ** 0.18 *
        (1 - input.externality) ** 0.14 *
        (1 - input.irreversibility) ** 0.14 *
        (1 - input.propagation_speed) ** 0.1,
  );
}

export class DependencyTopologyBuilder {
  async resolveProfile(input: {
    action_family: string;
    profile_ref?: string;
    resource_class: string;
  }) {
    const catalog = await loadGovernanceSimulationProfileCatalog();
    const profile =
      input.profile_ref === undefined
        ? catalog.profiles.find(
            (candidate) =>
              candidate.resource_classes.includes(input.resource_class) &&
              candidate.action_families.includes(input.action_family),
          )
        : catalog.profiles.find(
            (candidate) => candidate.profile_ref === input.profile_ref,
          );
    if (!profile) {
      throw new DependencyTopologyBuilderError(
        "DEPENDENCY_TOPOLOGY_PROFILE_NOT_FOUND",
        `no governance simulation profile matches ${input.resource_class}::${input.action_family}${input.profile_ref ? ` [profile_ref=${input.profile_ref}]` : ""}`,
      );
    }
    return structuredClone(profile);
  }

  async build(input: DependencyTopologyBuildInput): Promise<DependencyTopologyBuildResult> {
    const profile = await this.resolveProfile(input);
    const inventory_slice_refs = normalizeStringSet(
      "inventory_slice_refs",
      input.inventory_slice_refs ?? [],
    );

    const nodes = [...input.nodes]
      .map((node) => {
        const node_ref = requireTrimmedString("dependency_topology.nodes[].node_ref", node.node_ref);
        const node_type = requireTrimmedString(
          `dependency_topology.nodes[${node_ref}].node_type`,
          node.node_type,
        ) as GovernanceSimulationProfileNodeType;
        const node_weight =
          node.node_weight ??
          profile.node_weights[node_type] ??
          1;
        const seed =
          node.seed ?? profile.node_seed_defaults[node_type] ?? 0;
        return {
          node_ref,
          node_type,
          node_weight: normalizePositiveNumber(
            `dependency_topology.nodes[${node_ref}].node_weight`,
            node_weight,
          ),
          seed: normalizeBoundedRatio(
            `dependency_topology.nodes[${node_ref}].seed`,
            seed,
          ),
          validated: node.validated ?? true,
          external_authority: node.external_authority ?? false,
          version_ref:
            node.version_ref === undefined || node.version_ref === null
              ? null
              : requireTrimmedString(
                  `dependency_topology.nodes[${node_ref}].version_ref`,
                  node.version_ref,
                ),
        } satisfies DependencyTopologyNode;
      })
      .sort((left, right) => left.node_ref.localeCompare(right.node_ref));

    const nodeByRef = new Map(nodes.map((node) => [node.node_ref, node] as const));
    const edges = [...(input.edges ?? [])]
      .map((edge, index) => {
        const from_node_ref = requireTrimmedString(
          "dependency_topology.edges[].from_node_ref",
          edge.from_node_ref,
        );
        const to_node_ref = requireTrimmedString(
          "dependency_topology.edges[].to_node_ref",
          edge.to_node_ref,
        );
        if (!nodeByRef.has(from_node_ref) || !nodeByRef.has(to_node_ref)) {
          throw new DependencyTopologyBuilderError(
            "DEPENDENCY_TOPOLOGY_NODE_MISSING",
            `edge ${edge.edge_ref ?? index} references missing node(s)`,
          );
        }
        const edge_type = requireTrimmedString(
          "dependency_topology.edges[].edge_type",
          edge.edge_type,
        );
        const defaults = profile.edge_defaults[edge_type] ?? {
          scope_overlap: 0,
          privilege_coupling: 0,
          control_criticality: 0,
          externality: 0,
          irreversibility: 0,
          settlement_p50_seconds: profile.tau_prop_seconds,
          semantically_relevant: true,
        };
        const settlement_p50_seconds =
          edge.settlement_p50_seconds ?? defaults.settlement_p50_seconds;
        const propagation_speed = resolvePropagationSpeed(
          normalizePositiveNumber(
            `dependency_topology.edges[${edge_type}].settlement_p50_seconds`,
            settlement_p50_seconds,
          ),
          profile.tau_prop_seconds,
        );
        const resolved = {
          edge_ref:
            edge.edge_ref ??
            `${from_node_ref}->${to_node_ref}:${edge_type}`,
          edge_type,
          from_node_ref,
          to_node_ref,
          scope_overlap: normalizeBoundedRatio(
            `dependency_topology.edges[${edge_type}].scope_overlap`,
            edge.scope_overlap ?? defaults.scope_overlap,
          ),
          privilege_coupling: normalizeBoundedRatio(
            `dependency_topology.edges[${edge_type}].privilege_coupling`,
            edge.privilege_coupling ?? defaults.privilege_coupling,
          ),
          control_criticality: normalizeBoundedRatio(
            `dependency_topology.edges[${edge_type}].control_criticality`,
            edge.control_criticality ?? defaults.control_criticality,
          ),
          externality: normalizeBoundedRatio(
            `dependency_topology.edges[${edge_type}].externality`,
            edge.externality ?? defaults.externality,
          ),
          irreversibility: normalizeBoundedRatio(
            `dependency_topology.edges[${edge_type}].irreversibility`,
            edge.irreversibility ?? defaults.irreversibility,
          ),
          settlement_p50_seconds: normalizePositiveNumber(
            `dependency_topology.edges[${edge_type}].settlement_p50_seconds`,
            settlement_p50_seconds,
          ),
          propagation_speed,
          semantically_relevant:
            edge.semantically_relevant ?? defaults.semantically_relevant,
          observed:
            edge.observed ??
            (nodeByRef.get(from_node_ref)?.version_ref !== null &&
              nodeByRef.get(to_node_ref)?.version_ref !== null),
          version_ref:
            edge.version_ref === undefined || edge.version_ref === null
              ? null
              : requireTrimmedString(
                  `dependency_topology.edges[${edge_type}].version_ref`,
                  edge.version_ref,
                ),
          weight: 0,
        } satisfies Omit<DependencyTopologyEdge, "weight"> & { weight: number };
        return {
          ...resolved,
          weight: resolveEdgeWeight(resolved),
        } satisfies DependencyTopologyEdge;
      })
      .sort((left, right) => edgeOrderingKey(left).localeCompare(edgeOrderingKey(right)));

    const { dependency_topology_hash, referenced_object_version_refs } =
      materializeDependencyTopologyHash({
        nodes,
        edges,
        node_weight_profile_ref: profile.node_weight_profile_ref,
        edge_weight_profile_ref: profile.edge_weight_profile_ref,
      });

    return {
      profile,
      nodes,
      edges,
      inventory_slice_refs,
      node_weight_profile_ref: profile.node_weight_profile_ref,
      edge_weight_profile_ref: profile.edge_weight_profile_ref,
      maximum_propagation_depth: profile.maximum_propagation_depth,
      gamma: profile.gamma,
      tau_prop_seconds: profile.tau_prop_seconds,
      impact_presence_threshold: profile.impact_presence_threshold,
      referenced_object_version_refs,
      dependency_topology_hash,
    };
  }
}
