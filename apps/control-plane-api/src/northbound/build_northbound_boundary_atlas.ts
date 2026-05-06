import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  checkNorthboundAtlasPayload,
  emitNorthboundAtlasPayload,
  loadNorthboundPolicyBundle,
  NorthboundBoundaryError,
  type CommandFamilyPolicyRow,
} from "./policy.ts";

type AtlasStageRef = "PARSE" | "VALIDATE" | "STALE" | "DUPLICATE" | "RECEIPT" | "PROBLEM";

type NorthboundBoundaryAtlasPayload = {
  routeId: "northbound-boundary-atlas";
  title: string;
  subtitle: string;
  basisStatement: string;
  routeStabilityBadge: string;
  boundaryPostureChip: string;
  schemaHashes: Record<string, string>;
  stages: Array<{
    stage_ref: AtlasStageRef;
    label: string;
    summary: string;
  }>;
  selectedCommandType: string;
  selectedStageRef: AtlasStageRef;
  families: Array<{
    commandType: string;
    displayName: string;
    familyGroup: string;
    targetScopeClass: string;
    routeScopeClass: string;
    projectionStreamClass: string;
    dispatchPosture: string;
    requiredGuardFields: string[];
    staleGuardFamilies: string[];
    problemCodes: string[];
    receiptFields: string[];
    chips: string[];
    stageNarrative: Record<AtlasStageRef, string>;
    notes: string[];
  }>;
};

function familyProblemCodes(family: CommandFamilyPolicyRow) {
  const staleCodes = family.mutation_precondition_binding.stale_guard_families.some((entry) =>
    entry === "SHELL_STABILITY_TOKEN" || entry === "FRAME_EPOCH"
  )
    ? ["REBASE_REQUIRED", "VIEW_STALE"]
    : ["VIEW_STALE"];
  const shared = [
    "INVALID_COMMAND_ENVELOPE",
    "COMMAND_SCOPE_TARGET_MISMATCH",
    "IDEMPOTENCY_COLLISION",
  ];
  const governance =
    family.target_scope_class === "GOVERNANCE"
      ? [
          "GOVERNANCE_SIMULATION_BASIS_REQUIRED",
          "GOVERNANCE_PREVIEW_ONLY_COMMIT_BLOCKED",
          "POLICY_REJECTED",
        ]
      : [];
  return [...new Set([...shared, ...staleCodes, ...governance])];
}

function stageNarrative(family: CommandFamilyPolicyRow): Record<AtlasStageRef, string> {
  return {
    PARSE: `Parse ${family.command_type} against the imported CommandEnvelope contract and bind it to ${family.target_scope_class} scope.`,
    VALIDATE: `Validate ${family.mutation_precondition_binding.profile_code} exactly, reject extra stale guards, and preserve the command-request truth-boundary contract.`,
    STALE: `Compare ${family.mutation_precondition_binding.stale_guard_families.join(", ")} against the current ${family.route_scope_class} route-stability contract.`,
    DUPLICATE: `Reuse the same durable receipt for exact request replays; reject idempotency collisions instead of guessing user intent.`,
    RECEIPT: `Emit ApiCommandReceipt with ${family.projection_stream_class} projection posture and append-only boundary evidence.`,
    PROBLEM: `Emit typed ProblemEnvelope recovery for ${family.default_recovery_ref_family.toLowerCase()}-anchored rebase or hard-stop paths.`,
  };
}

function buildAtlasPayload(bundle: Awaited<ReturnType<typeof loadNorthboundPolicyBundle>>): NorthboundBoundaryAtlasPayload {
  return {
    routeId: "northbound-boundary-atlas",
    title: "Taxat Northbound Boundary Atlas",
    subtitle:
      "One shared admission scaffold turns command envelopes into typed problems or durable receipts without per-endpoint guesswork.",
    basisStatement: bundle.commandFamilyMatrix.basis_statement,
    routeStabilityBadge: "Route stability required",
    boundaryPostureChip: "Receipt / Problem only",
    schemaHashes: {
      apiCommandReceipt: bundle.schemas.apiCommandReceipt.sourceHash,
      commandEnvelope: bundle.schemas.commandEnvelope.sourceHash,
      problemEnvelope: bundle.schemas.problemEnvelope.sourceHash,
      routeStabilityContract: bundle.schemas.routeStabilityContract.sourceHash,
    },
    stages: [
      {
        stage_ref: "PARSE",
        label: "PARSE",
        summary: "Read the exact northbound envelope and actor/session binding.",
      },
      {
        stage_ref: "VALIDATE",
        label: "VALIDATE",
        summary: "Enforce command family, mutation profile, and truth-boundary shape.",
      },
      {
        stage_ref: "STALE",
        label: "STALE",
        summary: "Compare command-side stale guards against the current route-stability contract.",
      },
      {
        stage_ref: "DUPLICATE",
        label: "DUPLICATE",
        summary: "Detect safe replay versus idempotency collision.",
      },
      {
        stage_ref: "RECEIPT",
        label: "RECEIPT",
        summary: "Emit durable ApiCommandReceipt before downstream side effects fan out.",
      },
      {
        stage_ref: "PROBLEM",
        label: "PROBLEM",
        summary: "Emit typed ProblemEnvelope when the command cannot be accepted safely.",
      }
    ],
    selectedCommandType: "AMEND_RETURN",
    selectedStageRef: "STALE",
    families: bundle.commandFamilyMatrix.command_family_rows.map((family) => ({
      commandType: family.command_type,
      displayName: family.display_name,
      familyGroup: family.family_group,
      targetScopeClass: family.target_scope_class,
      routeScopeClass: family.route_scope_class,
      projectionStreamClass: family.projection_stream_class,
      dispatchPosture: family.dispatch_posture,
      requiredGuardFields: family.mutation_precondition_binding.required_guard_fields.slice(),
      staleGuardFamilies: family.mutation_precondition_binding.stale_guard_families.slice(),
      problemCodes: familyProblemCodes(family),
      receiptFields: [
        "receipt_id",
        "request_hash",
        "acceptance_state",
        "truth_boundary_contract",
        "mutation_precondition_binding"
      ],
      chips: [
        family.target_scope_class,
        family.route_scope_class,
        family.projection_stream_class
      ],
      stageNarrative: stageNarrative(family),
      notes: family.notes.slice(),
    })),
  };
}

export async function mainBuildNorthboundBoundaryAtlas() {
  const args = new Set(process.argv.slice(2));
  const mode = args.has("--emit") ? "emit" : "check";
  const bundle = await loadNorthboundPolicyBundle({ reload: true });
  const payload = buildAtlasPayload(bundle);
  if (mode === "emit") {
    await emitNorthboundAtlasPayload(payload);
  } else {
    await checkNorthboundAtlasPayload(payload);
  }
  console.log(`${mode === "emit" ? "wrote" : "verified"} northbound boundary atlas`);
  console.log(`command families: ${payload.families.length}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  mainBuildNorthboundBoundaryAtlas().catch((error) => {
    const message =
      error instanceof NorthboundBoundaryError
        ? `${error.problemCode}: ${error.reasonCodes.join(", ")}`
        : error instanceof Error
          ? error.message
          : String(error);
    console.error(message);
    process.exitCode = 1;
  });
}
