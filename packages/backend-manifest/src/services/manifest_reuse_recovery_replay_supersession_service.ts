import type { RunManifestRepository } from "../repositories/run_manifest_repository.ts";
import {
  decideManifestOrchestration,
  type ManifestDecisionOrchestratorInput,
} from "./manifest_decision_orchestrator.ts";

export const decideManifestReuseRecoveryReplaySupersession =
  decideManifestOrchestration;

export class ManifestReuseRecoveryReplaySupersessionService {
  private readonly runManifestRepository?: RunManifestRepository;

  constructor(input?: { runManifestRepository?: RunManifestRepository }) {
    this.runManifestRepository = input?.runManifestRepository;
  }

  async decide(input: ManifestDecisionOrchestratorInput) {
    return decideManifestOrchestration({
      ...input,
      run_manifest_repository:
        input.run_manifest_repository ?? this.runManifestRepository,
    });
  }
}
