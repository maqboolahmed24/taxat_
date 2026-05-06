import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  sampleBindingCatalog,
  schemaCatalogByName,
  type SampleBindingEntry,
  type SchemaCatalogEntry,
} from "../../packages/contracts-core/src/schemaCatalog.ts";
import {
  canonicalJsonStringify,
  sha256HexUtf8,
  stableJsonHash,
} from "../../packages/domain-kernel/src/primitives/hash.ts";
import type {
  DeterministicGoldenPack,
  ReleaseCandidateIdentityContract,
} from "../../packages/generated-models/src/generated/typescript/manifest-and-release.ts";

type SampleRole = {
  artifactRole: string;
  narrativePurpose: string;
  sampleName: string;
  summaryFields: string[];
};

type GateOutcome = {
  decision: string;
  gateCode: string;
  decisiveReasonCodes: string[];
};

type ArtifactExpectation = {
  artifactFamily: string;
  artifactRef: string;
  posture: string;
};

type TimelineStep = {
  eventType: string;
  phase: string;
  step: string;
  summary: string;
};

type QueryExpectation = {
  expectation: string;
  queryRef: string;
};

type VariantSource = {
  artifactExpectations: ArtifactExpectation[];
  auditTimeline: TimelineStep[];
  comparisonMode: string | null;
  constraintRefs: string[];
  gateOutcomes: GateOutcome[];
  goldenPackParticipation: "CORE" | "NONE" | "SUPPLEMENTAL";
  label: string;
  queryExpectations: QueryExpectation[];
  replayProjectionPosture: {
    acceptedRiskOrCompensation: boolean;
    authorityCorrection: boolean;
    counterfactualComparison: boolean;
    exactReplay: boolean;
    queueRetry: boolean;
    retentionLimited: boolean;
    schemaEvolution: boolean;
    streamRebase: boolean;
    uploadRebase: boolean;
  };
  scenarioTags: string[];
  summary: string;
  testVectorRefs: string[];
  variantId: string;
  viewReplayClass: string;
};

type EmbodimentSource = {
  actorsAndAuthorityPosture: string[];
  displayName: string;
  embodimentRef: string;
  frozenContext: {
    authorityStateAssumptions: string[];
    baselineSubmissionState: string;
    businessPartitionRefs: string[];
    comparisonRequirement: string;
    configProfileRef: string;
    providerProfileRef: string;
  };
  initialConditions: string[];
  inputSourceMix: string[];
  privacyStatement: string;
  purpose: string;
  railSummary: string;
  runKind: string;
  runtimeScopeRefs: string[];
  sampleBundle: SampleRole[];
  scenarioClass: "MINIMUM_EMBODIMENT";
  slug: string;
  variants: VariantSource[];
};

type FixtureFamily = {
  familyRef:
    | "ARTIFACT_SAMPLES"
    | "EXPECTED_ARTIFACT_REFS"
    | "EXPECTED_AUDIT_TIMELINE"
    | "EXPECTED_GATE_OUTCOMES"
    | "EXPECTED_QUERY_OUTPUTS"
    | "NARRATIVE"
    | "REPLAY_PROJECTION_POSTURE"
    | "TRACEABILITY_BINDING";
  label: string;
  requiredFields: string[];
  reviewPurpose: string;
};

type EmbodimentBundle = {
  actors_and_authority_posture: string[];
  bundle_version: "CANONICAL_DOMAIN_EXAMPLE_V1";
  deterministic_seed: {
    privacy_posture: string;
    seed_hex: string;
    seed_ref: string;
    synthetic_namespace: string;
  };
  display_name: string;
  embodiment_ref: string;
  execution_mode_and_artifact_posture: {
    analysis_only: boolean;
    counterfactual_basis_or_null: string | null;
    execution_mode: "ANALYSIS" | "COMPLIANCE";
  };
  fixture_bundle: {
    artifact_samples: Array<{
      artifact_role: string;
      logical_family_ref: string;
      narrative_purpose: string;
      sample_name: string;
      sample_path: string;
      sample_source_hash: string;
      schema_id: string;
      schema_name: string;
      schema_source_hash: string;
      summary_fields: string[];
    }>;
    minimum_artifact_bundle: string[];
    narrative_summary: string;
  };
  frozen_context: EmbodimentSource["frozenContext"];
  initial_conditions: string[];
  input_source_mix: string[];
  purpose: string;
  scenario_class: "MINIMUM_EMBODIMENT";
  scenario_variants: Array<{
    artifact_refs: ArtifactExpectation[];
    audit_timeline_skeleton: TimelineStep[];
    comparison_mode_or_null: string | null;
    constraint_refs: string[];
    expected_gate_outcomes: GateOutcome[];
    expected_query_outputs: QueryExpectation[];
    golden_pack_fixture_refs: string[];
    golden_pack_participation: VariantSource["goldenPackParticipation"];
    label: string;
    replay_projection_posture: VariantSource["replayProjectionPosture"];
    summary: string;
    test_vector_refs: string[];
    variant_id: string;
    view_replay_class: string;
  }>;
  slug: string;
  authorized_scope_and_run_kind: {
    run_kind: string;
    runtime_scope_refs: string[];
  };
  privacy_statement: string;
};

type EmittedFile = {
  contents: string;
  path: string;
};

type AtlasPayload = {
  basisStatement: string;
  embodiments: Array<{
    accessibleLabel: string;
    displayName: string;
    embodimentRef: string;
    fixtureBundle: {
      artifactSamples: EmbodimentBundle["fixture_bundle"]["artifact_samples"];
      narrativeSummary: string;
    };
    frozenContext: EmbodimentSource["frozenContext"];
    initialConditions: string[];
    actorsAndAuthorityPosture: string[];
    inputSourceMix: string[];
    inspector: {
      schemaRefs: string[];
      seedHex: string;
      seedRef: string;
    };
    privacyStatement: string;
    purpose: string;
    railSummary: string;
    selectedVariantId: string;
    variants: Array<{
      constraintRefs: string[];
      expectedArtifacts: ArtifactExpectation[];
      expectedGates: GateOutcome[];
      goldenPackParticipation: string;
      goldenPackOverlay: Array<{
        fixtureId: string;
        fixtureKind: "CADENCE" | "MODULE" | "REPLAY" | "STATE_TRANSITION";
        label: string;
        note: string;
      }>;
      label: string;
      replayClass: string;
      summary: string;
      testVectorRefs: string[];
      timeline: TimelineStep[];
      variantId: string;
    }>;
  }>;
  overlayToggleLabel: string;
  palette: Record<string, string>;
  routeId: "canonical-domain-example-atlas";
  selectedEmbodimentRef: string;
  subtitle: string;
  title: string;
};

type FixturePackArtifacts = {
  atlasPayload: AtlasPayload;
  files: EmittedFile[];
  materializedGoldenPack: DeterministicGoldenPack;
};

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..");
const fixturesRoot = path.join(repoRoot, "fixtures", "synthetic");
const examplesRoot = path.join(fixturesRoot, "canonical_domain_examples");
const atlasDataPath = path.join(
  repoRoot,
  "apps",
  "operator-web",
  "public",
  "internal",
  "canonical-domain-example-atlas",
  "data",
  "canonical-domain-example-atlas.json",
);
const releaseCandidateSamplePath = path.join(
  repoRoot,
  "packages",
  "contracts-core",
  "samples",
  "sample_release_candidate_identity_contract.json",
);
const deterministicGoldenPackSamplePath = path.join(
  repoRoot,
  "packages",
  "contracts-core",
  "samples",
  "sample_deterministic_golden_pack.json",
);
const constraintRegisterPath = path.join(
  repoRoot,
  "Algorithm",
  "constraint_traceability_register.json",
);

const rootSeedRefs = {
  fixtureRoot: "seed.synthetic.fixture-root.v1",
  goldenPackRoot: "seed.synthetic.golden-pack-root.v1",
  identityRoot: "seed.synthetic.identity-root.v1",
  timelineRoot: "seed.synthetic.timeline-root.v1",
} as const;

const rootSeedValues = {
  [rootSeedRefs.fixtureRoot]: `${sha256HexUtf8("taxat/synthetic-fixture-root/v1")}`,
  [rootSeedRefs.goldenPackRoot]: `${sha256HexUtf8("taxat/synthetic-golden-pack-root/v1")}`,
  [rootSeedRefs.identityRoot]: `${sha256HexUtf8("taxat/synthetic-identity-root/v1")}`,
  [rootSeedRefs.timelineRoot]: `${sha256HexUtf8("taxat/synthetic-timeline-root/v1")}`,
} as const;

const fixtureFamilies: FixtureFamily[] = [
  {
    familyRef: "NARRATIVE",
    label: "Narrative",
    requiredFields: ["purpose", "actors_and_authority_posture", "initial_conditions"],
    reviewPurpose: "Human-readable enabling disclosure and operator orientation.",
  },
  {
    familyRef: "ARTIFACT_SAMPLES",
    label: "Artifact Samples",
    requiredFields: ["artifact_role", "sample_name", "schema_id"],
    reviewPurpose: "Schema-valid payload anchors for regression, replay, and explanation.",
  },
  {
    familyRef: "EXPECTED_GATE_OUTCOMES",
    label: "Expected Gates",
    requiredFields: ["gateCode", "decision", "decisiveReasonCodes"],
    reviewPurpose: "Canonical gate-order expectations that can fail closed.",
  },
  {
    familyRef: "EXPECTED_ARTIFACT_REFS",
    label: "Expected Artifacts",
    requiredFields: ["artifactFamily", "artifactRef", "posture"],
    reviewPurpose: "Stable artifact vocabulary for replay and release evidence.",
  },
  {
    familyRef: "EXPECTED_AUDIT_TIMELINE",
    label: "Expected Timeline",
    requiredFields: ["step", "eventType", "phase"],
    reviewPurpose: "Append-only audit skeleton for human and machine review.",
  },
  {
    familyRef: "EXPECTED_QUERY_OUTPUTS",
    label: "Expected Queries",
    requiredFields: ["queryRef", "expectation"],
    reviewPurpose: "Read-side and provenance expectations without live data access.",
  },
  {
    familyRef: "REPLAY_PROJECTION_POSTURE",
    label: "Replay Posture",
    requiredFields: ["exactReplay", "retentionLimited", "counterfactualComparison"],
    reviewPurpose: "Differentiates replay, counterfactual, retention, upload, and stream posture.",
  },
  {
    familyRef: "TRACEABILITY_BINDING",
    label: "Traceability",
    requiredFields: ["test_vector_refs", "constraint_refs"],
    reviewPurpose: "Binds embodiments to the live vector and constraint register.",
  },
];

const embodiments: EmbodimentSource[] = [
  {
    embodimentRef: "EMB-01",
    slug: "direct_subject_quarterly_update_structured_records",
    displayName: "Direct-subject quarterly update from structured records",
    railSummary: "Clean quarterly submission with exact replay and golden-pack anchor.",
    purpose:
      "Show the cleanest record-driven quarterly path while freezing the replay-safe basis for later review.",
    actorsAndAuthorityPosture: [
      "SUBJECT_SELF under a valid authority link.",
      "No delegated preparer, reviewer, or analyst lane is active.",
    ],
    initialConditions: [
      "One business partition remains open for a quarterly obligation.",
      "Current digital records are present and no blocking conflicts exist.",
      "No override or amendment lineage is in flight.",
    ],
    inputSourceMix: ["BOOKS_OF_ENTRY", "INSTITUTIONAL_FEED_OPTIONAL"],
    runtimeScopeRefs: ["periodic_update", "quarterly", "structured_records"],
    runKind: "INTERACTIVE",
    scenarioClass: "MINIMUM_EMBODIMENT",
    frozenContext: {
      configProfileRef: "config.profile.quarterly-default",
      providerProfileRef: "provider.hmrc.quarterly-v1",
      businessPartitionRefs: ["business.synthetic.alpha-quarterly"],
      baselineSubmissionState: "NO_PRIOR_SUBMISSION",
      comparisonRequirement: "OPTIONAL",
      authorityStateAssumptions: [
        "obligation remains open",
        "authority link already confirmed",
      ],
    },
    privacyStatement:
      "Synthetic values only; no real names, addresses, bank references, or provider secrets are permitted.",
    sampleBundle: [
      {
        artifactRole: "COMPUTE_RESULT",
        narrativePurpose: "Anchors canonical decimal and reporting-scope output for the happy path.",
        sampleName: "sample_compute_result.json",
        summaryFields: ["totals.tax_due", "reporting_scope", "money_profile.scale"],
      },
      {
        artifactRole: "DECISION_BUNDLE",
        narrativePurpose: "Shows the durable submission-ready decision bundle vocabulary.",
        sampleName: "sample_decision_bundle.json",
        summaryFields: ["decision_status", "outcome_class", "primary_action_code"],
      },
      {
        artifactRole: "CONFIG_FREEZE",
        narrativePurpose: "Pins the frozen config surface used by exact replay.",
        sampleName: "sample_config_freeze.json",
        summaryFields: ["config_freeze_hash", "config_surface_hash", "config_resolution_basis"],
      },
    ],
    variants: [
      {
        variantId: "baseline_submission_path",
        label: "Baseline submission path",
        summary:
          "Produces a sealed quarterly submission path and anchors the exact replay and deterministic-golden-pack baseline.",
        viewReplayClass: "STANDARD_REPLAY",
        comparisonMode: "EXACT_HASH_MATCH",
        goldenPackParticipation: "CORE",
        testVectorRefs: ["TV-01", "TV-40", "TV-44F", "TV-44H"],
        constraintRefs: ["CC-03", "CC-05", "CC-07"],
        scenarioTags: ["EXACT_REPLAY", "GOLDEN_PACK", "QUARTERLY_HAPPY_PATH"],
        gateOutcomes: [
          { gateCode: "MANIFEST_GATE", decision: "PASS", decisiveReasonCodes: [] },
          { gateCode: "DATA_QUALITY_GATE", decision: "PASS", decisiveReasonCodes: [] },
          { gateCode: "PARITY_GATE", decision: "PASS", decisiveReasonCodes: [] },
          { gateCode: "FILING_GATE", decision: "PASS", decisiveReasonCodes: [] },
        ],
        artifactExpectations: [
          {
            artifactFamily: "RUN_MANIFEST",
            artifactRef: "manifest.synthetic.emb-01.current",
            posture: "SEALED",
          },
          {
            artifactFamily: "DECISION_BUNDLE",
            artifactRef: "decision.synthetic.emb-01.current",
            posture: "CURRENT",
          },
          {
            artifactFamily: "SUBMISSION_RECORD",
            artifactRef: "submission.synthetic.emb-01.current",
            posture: "AUTHORITY_PENDING",
          },
        ],
        auditTimeline: [
          {
            step: "Manifest frozen",
            eventType: "ManifestFrozen",
            phase: "PRESEAL",
            summary: "The quarterly scope, config surface, and deterministic seed are sealed.",
          },
          {
            step: "Decision bundle persisted",
            eventType: "DecisionBundlePersisted",
            phase: "POST_COMPUTE",
            summary: "The authority-ready decision bundle becomes the durable review anchor.",
          },
          {
            step: "Submission queued",
            eventType: "SubmissionQueued",
            phase: "AUTHORITY",
            summary: "The authority packet is transmitted without rewriting the frozen basis.",
          },
        ],
        queryExpectations: [
          {
            queryRef: "provenance.summary.quarterly-current",
            expectation:
              "Returns one current manifest chain with no amendment or correction hop.",
          },
          {
            queryRef: "replay.attestation.exact-match",
            expectation:
              "Replays to the same execution_basis_hash and deterministic_outcome_hash.",
          },
        ],
        replayProjectionPosture: {
          exactReplay: true,
          retentionLimited: false,
          counterfactualComparison: false,
          uploadRebase: false,
          authorityCorrection: false,
          streamRebase: false,
          queueRetry: false,
          schemaEvolution: false,
          acceptedRiskOrCompensation: false,
        },
      },
    ],
  },
  {
    embodimentRef: "EMB-02",
    slug: "agent_led_quarterly_update_multi_partition",
    displayName: "Agent-led quarterly update across multiple business partitions",
    railSummary: "Delegated multi-partition workflow with duplicate-safe queue retry.",
    purpose:
      "Show delegated quarterly operation across multiple businesses without collapsing partition or queue semantics.",
    actorsAndAuthorityPosture: [
      "PREPARER and REVIEWER operate under delegated client authority.",
      "Authority link and acting-for posture are already proven.",
    ],
    initialConditions: [
      "Two business partitions are active.",
      "Uploads and structured ledgers have already been canonicalized per partition.",
      "The command layer must remain duplicate-safe under client retry.",
    ],
    inputSourceMix: ["LEDGER_FEED", "BANK_FEED", "DOCUMENT_UPLOADS"],
    runtimeScopeRefs: ["periodic_update", "acting_for_client", "multi_partition"],
    runKind: "INTERACTIVE",
    scenarioClass: "MINIMUM_EMBODIMENT",
    frozenContext: {
      configProfileRef: "config.profile.delegated-quarterly",
      providerProfileRef: "provider.hmrc.agent-quarterly-v1",
      businessPartitionRefs: [
        "business.synthetic.alpha-quarterly",
        "business.synthetic.beta-quarterly",
      ],
      baselineSubmissionState: "NO_PRIOR_SUBMISSION",
      comparisonRequirement: "OPTIONAL",
      authorityStateAssumptions: [
        "agent delegation grant remains current",
        "obligation periods differ by partition",
      ],
    },
    privacyStatement:
      "Synthetic business partitions and synthetic ledger references replace any real client or agent identity.",
    sampleBundle: [
      {
        artifactRole: "CANDIDATE_FACT",
        narrativePurpose: "Represents partition-scoped promoted facts before submission.",
        sampleName: "sample_candidate_fact.json",
        summaryFields: ["partition_scope", "promotion_state", "candidate_identity_hash"],
      },
      {
        artifactRole: "CONFLICT_SET",
        narrativePurpose: "Shows how per-partition conflicts stay explicit and non-global.",
        sampleName: "sample_conflict_set.json",
        summaryFields: ["business_partition_refs", "resolution_frontier", "blocking_conflict_count"],
      },
      {
        artifactRole: "DECISION_BUNDLE",
        narrativePurpose: "Provides the durable submission and workflow posture vocabulary.",
        sampleName: "sample_decision_bundle.json",
        summaryFields: ["workflow_item_refs", "truth_state", "decision_status"],
      },
    ],
    variants: [
      {
        variantId: "delegated_partition_queue_retry",
        label: "Delegated partition queue retry",
        summary:
          "A duplicate command retry reuses the same durable receipt and queue lineage instead of re-enqueueing work.",
        viewReplayClass: "LIVE_COMPLIANCE",
        comparisonMode: null,
        goldenPackParticipation: "SUPPLEMENTAL",
        testVectorRefs: ["TV-02", "TV-18"],
        constraintRefs: ["CC-05", "CC-09"],
        scenarioTags: ["QUEUE_RETRY", "MULTI_PARTITION", "DELEGATED_OPERATION"],
        gateOutcomes: [
          { gateCode: "ACCESS_GATE", decision: "PASS", decisiveReasonCodes: [] },
          { gateCode: "MANIFEST_GATE", decision: "PASS", decisiveReasonCodes: [] },
          { gateCode: "NORTHBOUND_IDEMPOTENCY", decision: "PASS", decisiveReasonCodes: [] },
          { gateCode: "QUEUE_DISPATCH_GATE", decision: "PASS", decisiveReasonCodes: [] },
        ],
        artifactExpectations: [
          {
            artifactFamily: "API_COMMAND_RECEIPT",
            artifactRef: "receipt.synthetic.emb-02.partitioned",
            posture: "DURABLE_SINGLE_RECEIPT",
          },
          {
            artifactFamily: "WORKFLOW_ITEM",
            artifactRef: "workflow.synthetic.emb-02.partition-alpha",
            posture: "PARTITION_SCOPED",
          },
          {
            artifactFamily: "WORKER_DISPATCH_ENVELOPE",
            artifactRef: "dispatch.synthetic.emb-02.partition-alpha",
            posture: "DUPLICATE_SAFE",
          },
        ],
        auditTimeline: [
          {
            step: "Delegation proven",
            eventType: "DelegationVerified",
            phase: "ACCESS",
            summary: "The acting-for posture is bound before manifest allocation.",
          },
          {
            step: "Partitioned receipt accepted",
            eventType: "ApiCommandAccepted",
            phase: "NORTHBOUND",
            summary: "The durable receipt binds one command identity for both partitions.",
          },
          {
            step: "Retry suppressed",
            eventType: "DuplicateCommandSuppressed",
            phase: "QUEUE",
            summary: "A retry returns the original receipt and does not mint duplicate side effects.",
          },
        ],
        queryExpectations: [
          {
            queryRef: "queue.partition.integrity",
            expectation:
              "Each partition remains in its own queue and workflow grouping with no cross-bleed.",
          },
        ],
        replayProjectionPosture: {
          exactReplay: false,
          retentionLimited: false,
          counterfactualComparison: false,
          uploadRebase: false,
          authorityCorrection: false,
          streamRebase: false,
          queueRetry: true,
          schemaEvolution: false,
          acceptedRiskOrCompensation: false,
        },
      },
    ],
  },
  {
    embodimentRef: "EMB-03",
    slug: "in_year_correction_next_quarterly_update",
    displayName: "In-year correction carried into the next quarterly update",
    railSummary: "Working-state correction without opening amendment posture.",
    purpose:
      "Show that pre-finalisation correction updates the working baseline and provenance without becoming amendment law.",
    actorsAndAuthorityPosture: [
      "Either SUBJECT_SELF or an authorised preparer may trigger the new manifest.",
    ],
    initialConditions: [
      "One earlier quarterly update was already submitted.",
      "A corrected source fact arrives before final declaration.",
      "The baseline remains in-year rather than legally finalised.",
    ],
    inputSourceMix: ["CORRECTED_STRUCTURED_FACT", "EARLIER_QUARTERLY_BASELINE"],
    runtimeScopeRefs: ["periodic_update", "correction", "working_baseline"],
    runKind: "INTERACTIVE",
    scenarioClass: "MINIMUM_EMBODIMENT",
    frozenContext: {
      configProfileRef: "config.profile.correction-carry-forward",
      providerProfileRef: "provider.hmrc.quarterly-v1",
      businessPartitionRefs: ["business.synthetic.alpha-quarterly"],
      baselineSubmissionState: "IN_YEAR_WORKING_BASELINE",
      comparisonRequirement: "OPTIONAL",
      authorityStateAssumptions: ["original quarterly update remains historically visible"],
    },
    privacyStatement:
      "Synthetic record codes replace any production document or counterparty identifiers.",
    sampleBundle: [
      {
        artifactRole: "CANDIDATE_FACT",
        narrativePurpose: "Carries the corrected source fact into the new working baseline.",
        sampleName: "sample_candidate_fact.json",
        summaryFields: ["promotion_state", "source_record_refs", "supporting_evidence_refs"],
      },
      {
        artifactRole: "MANIFEST_BRANCH_DECISION",
        narrativePurpose: "Shows lawful child-lineage creation without amendment posture.",
        sampleName: "sample_manifest_branch_decision_contract.json",
        summaryFields: ["branch_action", "branch_reason_code", "selected_manifest_id"],
      },
    ],
    variants: [
      {
        variantId: "working_state_correction_lineage",
        label: "Working-state correction lineage",
        summary:
          "Creates a fresh in-year manifest that carries correction lineage forward without reopening amendment flow.",
        viewReplayClass: "LIVE_COMPLIANCE",
        comparisonMode: null,
        goldenPackParticipation: "NONE",
        testVectorRefs: ["TV-03"],
        constraintRefs: ["CC-04", "CC-05"],
        scenarioTags: ["CORRECTION_LINEAGE", "WORKING_BASELINE"],
        gateOutcomes: [
          { gateCode: "MANIFEST_GATE", decision: "PASS", decisiveReasonCodes: [] },
          { gateCode: "DRIFT_CLASSIFICATION_GATE", decision: "PASS", decisiveReasonCodes: [] },
          { gateCode: "AMENDMENT_GATE", decision: "NOT_APPLICABLE", decisiveReasonCodes: [] },
        ],
        artifactExpectations: [
          {
            artifactFamily: "RUN_MANIFEST",
            artifactRef: "manifest.synthetic.emb-03.correction-child",
            posture: "NEW_WORKING_BASELINE",
          },
          {
            artifactFamily: "PROVENANCE_PATH",
            artifactRef: "provenance.synthetic.emb-03.correction-carry-forward",
            posture: "CORRECTION_VISIBLE",
          },
        ],
        auditTimeline: [
          {
            step: "Corrected fact promoted",
            eventType: "CorrectedFactPromoted",
            phase: "FACTS",
            summary: "The corrected fact is promoted under the existing in-year chain.",
          },
          {
            step: "New working manifest allocated",
            eventType: "ManifestAllocated",
            phase: "LINEAGE",
            summary: "A new manifest node is created without amendment semantics.",
          },
        ],
        queryExpectations: [
          {
            queryRef: "provenance.correction.chain",
            expectation:
              "Shows one correction hop inside the same in-year lineage and no amendment case.",
          },
        ],
        replayProjectionPosture: {
          exactReplay: false,
          retentionLimited: false,
          counterfactualComparison: false,
          uploadRebase: false,
          authorityCorrection: false,
          streamRebase: false,
          queueRetry: false,
          schemaEvolution: false,
          acceptedRiskOrCompensation: false,
        },
      },
    ],
  },
  {
    embodimentRef: "EMB-04",
    slug: "year_end_final_declaration_authority_calculation",
    displayName: "End-of-year final declaration with authority calculation",
    railSummary: "Calculation-linked year-end declaration under one sealed lineage.",
    purpose:
      "Show the complete year-end path where internal compute and authority calculation stay bound through declaration.",
    actorsAndAuthorityPosture: [
      "Subject or authorised agent with a valid declaration-capable authority link.",
    ],
    initialConditions: [
      "Year-end data is complete enough for finalisation.",
      "The provider profile allows authority calculation before declaration.",
    ],
    inputSourceMix: ["YEAR_END_COMPUTE", "AUTHORITY_CALCULATION_RESULT"],
    runtimeScopeRefs: ["final_declaration", "year_end", "authority_calculation"],
    runKind: "INTERACTIVE",
    scenarioClass: "MINIMUM_EMBODIMENT",
    frozenContext: {
      configProfileRef: "config.profile.year-end",
      providerProfileRef: "provider.hmrc.final-declaration-v1",
      businessPartitionRefs: ["business.synthetic.alpha-year-end"],
      baselineSubmissionState: "YEAR_END_OPEN",
      comparisonRequirement: "MANDATORY",
      authorityStateAssumptions: ["authority calculation path is available"],
    },
    privacyStatement:
      "Synthetic obligation and calculation references replace any real submission identifiers.",
    sampleBundle: [
      {
        artifactRole: "COMPUTE_RESULT",
        narrativePurpose: "Represents the annual totals that feed declaration readiness.",
        sampleName: "sample_compute_result.json",
        summaryFields: ["totals.tax_due", "reporting_scope"],
      },
      {
        artifactRole: "AUTHORITY_TRUTH_CONTRACT",
        narrativePurpose: "Pins the authority-confirming truth boundary for year-end flow.",
        sampleName: "sample_authority_truth_contract.json",
        summaryFields: ["authority_confirmation_policy", "correction_propagation_policy"],
      },
      {
        artifactRole: "DECISION_BUNDLE",
        narrativePurpose: "Shows declaration-capable workflow and checkpoint posture.",
        sampleName: "sample_decision_bundle.json",
        summaryFields: ["truth_state", "waiting_on", "decision_status"],
      },
    ],
    variants: [
      {
        variantId: "authority_calculation_submission",
        label: "Authority calculation submission",
        summary:
          "Binds year-end compute, authority calculation retrieval, and declaration confirmation in one sealed chain.",
        viewReplayClass: "LIVE_COMPLIANCE",
        comparisonMode: null,
        goldenPackParticipation: "NONE",
        testVectorRefs: ["TV-04"],
        constraintRefs: ["CC-03", "CC-05"],
        scenarioTags: ["AUTHORITY_PROGRESS", "YEAR_END"],
        gateOutcomes: [
          { gateCode: "PARITY_GATE", decision: "PASS", decisiveReasonCodes: [] },
          { gateCode: "TRUST_GATE", decision: "PASS", decisiveReasonCodes: [] },
          { gateCode: "FILING_GATE", decision: "PASS", decisiveReasonCodes: [] },
        ],
        artifactExpectations: [
          {
            artifactFamily: "CALCULATION_BASIS",
            artifactRef: "calc.synthetic.emb-04.current",
            posture: "AUTHORITY_BOUND",
          },
          {
            artifactFamily: "FILING_PACKET",
            artifactRef: "filing.synthetic.emb-04.current",
            posture: "CALCULATION_LINKED",
          },
          {
            artifactFamily: "SUBMISSION_RECORD",
            artifactRef: "submission.synthetic.emb-04.current",
            posture: "CONFIRMED_OR_PENDING",
          },
        ],
        auditTimeline: [
          {
            step: "Authority calculation requested",
            eventType: "AuthorityCalculationRequested",
            phase: "AUTHORITY",
            summary: "The declaration flow freezes the exact calculation basis request.",
          },
          {
            step: "Declaration confirmed",
            eventType: "FinalDeclarationConfirmed",
            phase: "FILING",
            summary: "The final declaration becomes the legal baseline after user confirmation.",
          },
        ],
        queryExpectations: [
          {
            queryRef: "authority.year_end.confirmation",
            expectation:
              "Shows one authority-confirming chain and no alternate out-of-band baseline.",
          },
        ],
        replayProjectionPosture: {
          exactReplay: false,
          retentionLimited: false,
          counterfactualComparison: false,
          uploadRebase: false,
          authorityCorrection: false,
          streamRebase: false,
          queueRetry: false,
          schemaEvolution: false,
          acceptedRiskOrCompensation: false,
        },
      },
    ],
  },
  {
    embodimentRef: "EMB-05",
    slug: "final_declaration_blocked_material_parity_divergence",
    displayName: "Final declaration blocked by material parity divergence",
    railSummary: "Mandatory comparison divergence blocks straight-through filing.",
    purpose:
      "Show how material parity divergence or non-comparable comparison basis prevents silent filing progression.",
    actorsAndAuthorityPosture: ["Authorised filing actor operating on a declaration-capable scope."],
    initialConditions: [
      "Authority comparison is mandatory for the requested scope.",
      "A critical field diverges or the required comparison basis is incomplete.",
    ],
    inputSourceMix: ["YEAR_END_COMPUTE", "AUTHORITY_COMPARISON_BASIS"],
    runtimeScopeRefs: ["final_declaration", "parity_review"],
    runKind: "INTERACTIVE",
    scenarioClass: "MINIMUM_EMBODIMENT",
    frozenContext: {
      configProfileRef: "config.profile.year-end",
      providerProfileRef: "provider.hmrc.final-declaration-v1",
      businessPartitionRefs: ["business.synthetic.alpha-year-end"],
      baselineSubmissionState: "YEAR_END_OPEN",
      comparisonRequirement: "MANDATORY",
      authorityStateAssumptions: ["comparison evidence is material to filing readiness"],
    },
    privacyStatement:
      "Only synthetic discrepancy codes and synthetic totals are used in the divergence narrative.",
    sampleBundle: [
      {
        artifactRole: "CONFLICT_SET",
        narrativePurpose: "Holds the blocking mismatch and review frontier posture.",
        sampleName: "sample_conflict_set.json",
        summaryFields: ["resolution_frontier", "blocking_conflict_count", "items.0.reason_codes"],
      },
      {
        artifactRole: "TRUST_SENSITIVITY_ANALYSIS",
        narrativePurpose: "Shows how trust falls under frozen divergence thresholds.",
        sampleName: "sample_trust_sensitivity_analysis_contract.json",
        summaryFields: ["sensitivity_policy", "delta_band_policy", "decision_cap_policy"],
      },
      {
        artifactRole: "DECISION_BUNDLE",
        narrativePurpose: "Records the capped readiness posture instead of submit-ready posture.",
        sampleName: "sample_decision_bundle.json",
        summaryFields: ["decision_status", "blocked_action_codes", "reason_codes"],
      },
    ],
    variants: [
      {
        variantId: "material_parity_divergence",
        label: "Material parity divergence",
        summary:
          "The case blocks or routes to review because parity is materially divergent or not comparable under mandatory policy.",
        viewReplayClass: "LIVE_COMPLIANCE",
        comparisonMode: null,
        goldenPackParticipation: "NONE",
        testVectorRefs: ["TV-05"],
        constraintRefs: ["CC-03", "CC-05", "CC-09"],
        scenarioTags: ["PARITY_BLOCK", "REVIEW_ONLY"],
        gateOutcomes: [
          {
            gateCode: "PARITY_GATE",
            decision: "HARD_BLOCK",
            decisiveReasonCodes: ["MATERIAL_DIFFERENCE"],
          },
          {
            gateCode: "TRUST_GATE",
            decision: "OVERRIDABLE_BLOCK",
            decisiveReasonCodes: ["REVIEW_REQUIRED"],
          },
          {
            gateCode: "FILING_GATE",
            decision: "HARD_BLOCK",
            decisiveReasonCodes: ["NOT_READY"],
          },
        ],
        artifactExpectations: [
          {
            artifactFamily: "PARITY_RESULT",
            artifactRef: "parity.synthetic.emb-05.material-block",
            posture: "NOT_COMPARABLE_OR_DIVERGENT",
          },
          {
            artifactFamily: "DECISION_BUNDLE",
            artifactRef: "decision.synthetic.emb-05.review-only",
            posture: "REVIEW_REQUIRED",
          },
        ],
        auditTimeline: [
          {
            step: "Parity classified",
            eventType: "ParityClassified",
            phase: "PARITY",
            summary: "The frozen comparison set yields material divergence or non-comparability.",
          },
          {
            step: "Filing blocked",
            eventType: "FilingReadinessBlocked",
            phase: "DECISION",
            summary: "No straight-through declaration posture is emitted.",
          },
        ],
        queryExpectations: [
          {
            queryRef: "parity.blocking.explainability",
            expectation:
              "Returns the decisive mismatch family and review-only filing posture.",
          },
        ],
        replayProjectionPosture: {
          exactReplay: false,
          retentionLimited: false,
          counterfactualComparison: false,
          uploadRebase: false,
          authorityCorrection: false,
          streamRebase: false,
          queueRetry: false,
          schemaEvolution: false,
          acceptedRiskOrCompensation: false,
        },
      },
    ],
  },
  {
    embodimentRef: "EMB-06",
    slug: "post_finalisation_material_drift_amendment",
    displayName: "Post-finalisation material drift leading to amendment",
    railSummary: "Multi-manifest amendment lineage with replay-safe historical baseline.",
    purpose:
      "Show lawful movement from filed truth to amended truth, plus exact historical replay against the original amendment basis.",
    actorsAndAuthorityPosture: ["Authorised filing actor within the amendment window."],
    initialConditions: [
      "A confirmed final-declaration baseline exists.",
      "New material facts arrive within the amendment window.",
      "Historical replay of the original basis must remain available.",
    ],
    inputSourceMix: ["FILED_BASELINE", "MATERIAL_DRIFT_FACTS", "AUTHORITY_AMENDMENT_CALCULATION"],
    runtimeScopeRefs: ["amendment", "drift_classification", "historical_replay"],
    runKind: "INTERACTIVE",
    scenarioClass: "MINIMUM_EMBODIMENT",
    frozenContext: {
      configProfileRef: "config.profile.amendment-window",
      providerProfileRef: "provider.hmrc.amendment-v1",
      businessPartitionRefs: ["business.synthetic.alpha-year-end"],
      baselineSubmissionState: "FILED_BASELINE_CONFIRMED",
      comparisonRequirement: "MANDATORY",
      authorityStateAssumptions: ["amendment window remains open"],
    },
    privacyStatement:
      "Synthetic drift and amendment references replace any live authority correction or taxpayer identifier.",
    sampleBundle: [
      {
        artifactRole: "DRIFT_BASELINE_SELECTION_VISUALIZATION",
        narrativePurpose: "Shows which baseline remains authoritative for amendment.",
        sampleName: "sample_drift_baseline_selection_visualization.json",
        summaryFields: ["selected_baseline_ref", "selection_state", "rationale_codes"],
      },
      {
        artifactRole: "MANIFEST_LINEAGE_TRACE",
        narrativePurpose: "Pins continuation, replay, and amendment lineage explicitly.",
        sampleName: "sample_manifest_lineage_trace.json",
        summaryFields: ["selected_manifest_id", "parent_manifest_id_or_null", "amendment_window_ref_or_null"],
      },
      {
        artifactRole: "AUTHORITY_TRUTH_CONTRACT",
        narrativePurpose: "Keeps amendment truth subordinate to authority-confirmed evidence.",
        sampleName: "sample_authority_truth_contract.json",
        summaryFields: ["authority_confirmation_policy", "correction_propagation_policy"],
      },
    ],
    variants: [
      {
        variantId: "amendment_lineage_exact_replay",
        label: "Amendment lineage and historical replay",
        summary:
          "Creates a lawful amendment chain while exact replay of the original manifest ignores later authority corrections.",
        viewReplayClass: "STANDARD_REPLAY",
        comparisonMode: "EXACT_HASH_MATCH",
        goldenPackParticipation: "CORE",
        testVectorRefs: ["TV-06", "TV-43"],
        constraintRefs: ["CC-03", "CC-05", "CC-07"],
        scenarioTags: ["MULTI_MANIFEST", "AMENDMENT", "HISTORICAL_REPLAY"],
        gateOutcomes: [
          { gateCode: "DRIFT_GATE", decision: "PASS", decisiveReasonCodes: [] },
          { gateCode: "AMENDMENT_GATE", decision: "PASS", decisiveReasonCodes: [] },
          { gateCode: "REPLAY_BASIS_GATE", decision: "PASS", decisiveReasonCodes: [] },
        ],
        artifactExpectations: [
          {
            artifactFamily: "DRIFT_RECORD",
            artifactRef: "drift.synthetic.emb-06.material",
            posture: "MATERIAL",
          },
          {
            artifactFamily: "AMENDMENT_CASE",
            artifactRef: "amendment.synthetic.emb-06.current",
            posture: "OPEN_THEN_CONFIRMED",
          },
          {
            artifactFamily: "REPLAY_ATTESTATION",
            artifactRef: "replay.synthetic.emb-06.original-basis",
            posture: "EXACT_MATCH",
          },
        ],
        auditTimeline: [
          {
            step: "Drift classified",
            eventType: "DriftClassified",
            phase: "DRIFT",
            summary: "Material post-finalisation drift opens amendment legality review.",
          },
          {
            step: "Amendment child allocated",
            eventType: "AmendmentManifestAllocated",
            phase: "LINEAGE",
            summary: "A fresh amendment branch is created without mutating the filed baseline.",
          },
          {
            step: "Historical replay attested",
            eventType: "ReplayAttestationPersisted",
            phase: "REPLAY",
            summary: "Exact replay of the original basis excludes later authority corrections.",
          },
        ],
        queryExpectations: [
          {
            queryRef: "manifest.lineage.amendment-chain",
            expectation:
              "Shows filed baseline, amendment child, and replay child as distinct lineage hops.",
          },
        ],
        replayProjectionPosture: {
          exactReplay: true,
          retentionLimited: false,
          counterfactualComparison: false,
          uploadRebase: false,
          authorityCorrection: false,
          streamRebase: false,
          queueRetry: false,
          schemaEvolution: false,
          acceptedRiskOrCompensation: false,
        },
      },
    ],
  },
  {
    embodimentRef: "EMB-07",
    slug: "out_of_band_filing_authority_reconciliation",
    displayName: "Out-of-band filing discovered by authority reconciliation",
    railSummary: "Authority-held legal state blocks duplicate filing and opens review.",
    purpose:
      "Show safe handling when authority already holds legal state outside the active software packet chain.",
    actorsAndAuthorityPosture: ["Subject or authorised agent with reconciliation access."],
    initialConditions: [
      "The software still has a working case.",
      "Authority indicates the obligation or final state is already satisfied elsewhere.",
    ],
    inputSourceMix: ["WORKING_CASE", "AUTHORITY_RECONCILIATION_STATE"],
    runtimeScopeRefs: ["reconciliation", "out_of_band_review"],
    runKind: "INTERACTIVE",
    scenarioClass: "MINIMUM_EMBODIMENT",
    frozenContext: {
      configProfileRef: "config.profile.reconciliation-review",
      providerProfileRef: "provider.hmrc.reconciliation-v1",
      businessPartitionRefs: ["business.synthetic.alpha-year-end"],
      baselineSubmissionState: "OUT_OF_BAND_UNRECONCILED",
      comparisonRequirement: "MANDATORY",
      authorityStateAssumptions: ["authority state is authoritative over local working packet"],
    },
    privacyStatement:
      "Synthetic obligation refs and synthetic out-of-band markers replace any live authority record ids.",
    sampleBundle: [
      {
        artifactRole: "AUTHORITY_TRUTH_CONTRACT",
        narrativePurpose: "Keeps authority evidence authoritative over local workflow posture.",
        sampleName: "sample_authority_truth_contract.json",
        summaryFields: ["non_confirming_state_policy", "mirror_projection_policy"],
      },
      {
        artifactRole: "DECISION_BUNDLE",
        narrativePurpose: "Shows review-only state instead of duplicate submission posture.",
        sampleName: "sample_decision_bundle.json",
        summaryFields: ["decision_status", "waiting_on", "truth_state"],
      },
    ],
    variants: [
      {
        variantId: "out_of_band_reconciliation_review",
        label: "Out-of-band reconciliation review",
        summary:
          "Authority-held legal state is surfaced explicitly and duplicate filing is blocked in favour of review.",
        viewReplayClass: "LIVE_COMPLIANCE",
        comparisonMode: null,
        goldenPackParticipation: "NONE",
        testVectorRefs: ["TV-07"],
        constraintRefs: ["CC-05", "CC-09"],
        scenarioTags: ["OUT_OF_BAND", "REVIEW_WORKFLOW"],
        gateOutcomes: [
          { gateCode: "AUTHORITY_RECONCILIATION_GATE", decision: "PASS", decisiveReasonCodes: [] },
          { gateCode: "FILING_GATE", decision: "HARD_BLOCK", decisiveReasonCodes: ["OUT_OF_BAND"] },
        ],
        artifactExpectations: [
          {
            artifactFamily: "SUBMISSION_STATE",
            artifactRef: "submission.synthetic.emb-07.out-of-band",
            posture: "OUT_OF_BAND_UNRECONCILED",
          },
          {
            artifactFamily: "WORKFLOW_ITEM",
            artifactRef: "workflow.synthetic.emb-07.review",
            posture: "REVIEW_REQUIRED",
          },
        ],
        auditTimeline: [
          {
            step: "Authority state observed",
            eventType: "OutOfBandStateObserved",
            phase: "AUTHORITY",
            summary: "Reconciliation detects an external legal baseline.",
          },
          {
            step: "Review workflow opened",
            eventType: "ReviewWorkflowOpened",
            phase: "WORKFLOW",
            summary: "The engine opens review instead of attempting duplicate filing.",
          },
        ],
        queryExpectations: [
          {
            queryRef: "authority.out_of_band.review",
            expectation:
              "Returns typed out-of-band posture and no duplicate-filing next action.",
          },
        ],
        replayProjectionPosture: {
          exactReplay: false,
          retentionLimited: false,
          counterfactualComparison: false,
          uploadRebase: false,
          authorityCorrection: false,
          streamRebase: false,
          queueRetry: false,
          schemaEvolution: false,
          acceptedRiskOrCompensation: false,
        },
      },
    ],
  },
  {
    embodimentRef: "EMB-08",
    slug: "authority_correction_after_filing",
    displayName: "Authority correction observed after filing",
    railSummary: "Late authority correction reopens trust and reconciliation posture.",
    purpose:
      "Show forward-compatible handling of authority-originated corrections without rewriting historical lineage.",
    actorsAndAuthorityPosture: ["Authority reconciliation actor with confirmed filed baseline access."],
    initialConditions: [
      "A confirmed filed baseline exists.",
      "Authority later exposes a corrected position.",
    ],
    inputSourceMix: ["FILED_BASELINE", "AUTHORITY_CORRECTION"],
    runtimeScopeRefs: ["authority_reconciliation", "correction_review"],
    runKind: "INTERACTIVE",
    scenarioClass: "MINIMUM_EMBODIMENT",
    frozenContext: {
      configProfileRef: "config.profile.reconciliation-review",
      providerProfileRef: "provider.hmrc.reconciliation-v1",
      businessPartitionRefs: ["business.synthetic.alpha-year-end"],
      baselineSubmissionState: "FILED_BASELINE_CONFIRMED",
      comparisonRequirement: "MANDATORY",
      authorityStateAssumptions: ["authority correction remains historically append-only"],
    },
    privacyStatement:
      "Synthetic authority correction markers and synthetic review refs replace any live HMRC correction identifiers.",
    sampleBundle: [
      {
        artifactRole: "AUTHORITY_TRUTH_CONTRACT",
        narrativePurpose: "Shows that authority corrections reopen downstream state.",
        sampleName: "sample_authority_truth_contract.json",
        summaryFields: ["correction_propagation_policy", "authority_confirmation_policy"],
      },
      {
        artifactRole: "DECISION_BUNDLE",
        narrativePurpose: "Shows the reopened review posture after correction.",
        sampleName: "sample_decision_bundle.json",
        summaryFields: ["decision_status", "workflow_item_refs", "truth_state"],
      },
    ],
    variants: [
      {
        variantId: "authority_correction_reopens_trust",
        label: "Authority correction reopens trust",
        summary:
          "A late authority correction reopens trust and reconciliation while preserving historical audit lineage.",
        viewReplayClass: "AUDIT_REPLAY",
        comparisonMode: "LIMITED_HISTORICAL_COMPARISON",
        goldenPackParticipation: "SUPPLEMENTAL",
        testVectorRefs: ["TV-08", "TV-58"],
        constraintRefs: ["CC-04", "CC-05"],
        scenarioTags: ["AUTHORITY_CORRECTION", "RECONCILIATION_CADENCE"],
        gateOutcomes: [
          { gateCode: "AUTHORITY_RECONCILIATION_GATE", decision: "PASS", decisiveReasonCodes: [] },
          { gateCode: "TRUST_GATE", decision: "OVERRIDABLE_BLOCK", decisiveReasonCodes: ["REOPENED"] },
        ],
        artifactExpectations: [
          {
            artifactFamily: "DRIFT_RECORD",
            artifactRef: "drift.synthetic.emb-08.authority-correction",
            posture: "AUTHORITY_CORRECTION",
          },
          {
            artifactFamily: "WORKFLOW_ITEM",
            artifactRef: "workflow.synthetic.emb-08.review",
            posture: "REOPENED",
          },
        ],
        auditTimeline: [
          {
            step: "Authority correction appended",
            eventType: "AuthorityCorrectionObserved",
            phase: "AUTHORITY",
            summary: "The correction is appended to the authority lineage rather than rewriting history.",
          },
          {
            step: "Trust reopened",
            eventType: "TrustReopened",
            phase: "TRUST",
            summary: "Downstream review and trust posture are recalculated from the corrected basis.",
          },
        ],
        queryExpectations: [
          {
            queryRef: "authority.correction.reopen",
            expectation:
              "Shows one historical filed baseline plus a later authority-correction review branch.",
          },
        ],
        replayProjectionPosture: {
          exactReplay: false,
          retentionLimited: false,
          counterfactualComparison: false,
          uploadRebase: false,
          authorityCorrection: true,
          streamRebase: false,
          queueRetry: false,
          schemaEvolution: false,
          acceptedRiskOrCompensation: false,
        },
      },
    ],
  },
  {
    embodimentRef: "EMB-09",
    slug: "retention_limited_replay_enquiry_defense",
    displayName: "Retention-limited replay and enquiry defense",
    railSummary: "Proof remains structurally present after payload expiry and restore.",
    purpose:
      "Show that explainability survives retention minimisation and restore drills as explicit limited proof rather than silent absence.",
    actorsAndAuthorityPosture: ["Operator or auditor reviewing a historically limited case."],
    initialConditions: [
      "Older upstream evidence is expired or pseudonymised.",
      "Downstream compliance artifacts remain retained.",
      "Restore and enquiry packaging still need defensible proof boundaries.",
    ],
    inputSourceMix: ["RETAINED_HASHES", "LIMITATION_NOTES", "RESTORE_RECONCILIATION"],
    runtimeScopeRefs: ["replay", "enquiry_export", "restore_review"],
    runKind: "AUDIT_REVIEW",
    scenarioClass: "MINIMUM_EMBODIMENT",
    frozenContext: {
      configProfileRef: "config.profile.retention-limited",
      providerProfileRef: "provider.hmrc.reconciliation-v1",
      businessPartitionRefs: ["business.synthetic.alpha-historical"],
      baselineSubmissionState: "HISTORICAL_LIMITED",
      comparisonRequirement: "LIMITED_HISTORICAL_COMPARISON",
      authorityStateAssumptions: ["decisive proof remains hash-bound but payload-limited"],
    },
    privacyStatement:
      "Only synthetic limitation codes and synthetic tombstone refs are displayed; no resurrected personal payload is shown.",
    sampleBundle: [
      {
        artifactRole: "RETENTION_LIMITED_EXPLAINABILITY",
        narrativePurpose: "Makes limited proof explicit for enquiry and replay consumers.",
        sampleName: "sample_retention_limited_explainability_contract.json",
        summaryFields: ["boundary_scope", "explanation_state_policy", "present_limited_truth_policy"],
      },
      {
        artifactRole: "RESTORE_PRIVACY_RECONCILIATION",
        narrativePurpose: "Shows compensating re-erasure and restore review posture.",
        sampleName: "sample_restore_privacy_reconciliation_contract.json",
        summaryFields: ["privacy_reconciliation_policy", "compensating_re_erasure_policy"],
      },
      {
        artifactRole: "RECOVERY_GOVERNANCE",
        narrativePurpose: "Pins queue rebuild, audit continuity, and reopen safety.",
        sampleName: "sample_recovery_governance_contract.json",
        summaryFields: ["queue_recovery_policy", "reopen_gate_policy", "fail_forward_policy"],
      },
    ],
    variants: [
      {
        variantId: "retention_limited_enquiry_replay",
        label: "Retention-limited enquiry replay",
        summary:
          "Replay and enquiry export stay structurally valid while payload loss remains explicit and typed.",
        viewReplayClass: "LIMITED_HISTORICAL_COMPARISON",
        comparisonMode: "LIMITED_HISTORICAL_COMPARISON",
        goldenPackParticipation: "NONE",
        testVectorRefs: ["TV-09", "TV-24", "TV-62A", "TV-62B", "TV-62C"],
        constraintRefs: ["CC-04", "CC-07"],
        scenarioTags: ["RETENTION_LIMITED", "RESTORE_DRILL"],
        gateOutcomes: [
          { gateCode: "REPLAY_BASIS_GATE", decision: "PASS", decisiveReasonCodes: [] },
          {
            gateCode: "EXPLAINABILITY_GATE",
            decision: "OVERRIDABLE_BLOCK",
            decisiveReasonCodes: ["LIMITED_DECISIVE_PROOF"],
          },
          { gateCode: "RESTORE_REOPEN_GATE", decision: "PASS", decisiveReasonCodes: [] },
        ],
        artifactExpectations: [
          {
            artifactFamily: "REPLAY_ATTESTATION",
            artifactRef: "replay.synthetic.emb-09.limited",
            posture: "LIMITED_COMPARABLE",
          },
          {
            artifactFamily: "ENQUIRY_PACK",
            artifactRef: "enquiry.synthetic.emb-09.current",
            posture: "LIMITATION_NOTES_REQUIRED",
          },
        ],
        auditTimeline: [
          {
            step: "Payload expiry observed",
            eventType: "PayloadExpired",
            phase: "RETENTION",
            summary: "The decisive payload expires but hash and lineage remain retained.",
          },
          {
            step: "Limited replay attested",
            eventType: "ReplayAttestationPersisted",
            phase: "REPLAY",
            summary: "The replay records limitation notes rather than fabricating completeness.",
          },
          {
            step: "Restore privacy reconciliation queued",
            eventType: "RestorePrivacyReconciliationQueued",
            phase: "RESTORE",
            summary: "Compensating re-erasure remains explicit after restore.",
          },
        ],
        queryExpectations: [
          {
            queryRef: "enquiry.pack.limitations",
            expectation:
              "Returns limitation and omission notes on every decisive proof path.",
          },
        ],
        replayProjectionPosture: {
          exactReplay: false,
          retentionLimited: true,
          counterfactualComparison: false,
          uploadRebase: false,
          authorityCorrection: false,
          streamRebase: false,
          queueRetry: false,
          schemaEvolution: false,
          acceptedRiskOrCompensation: true,
        },
      },
    ],
  },
  {
    embodimentRef: "EMB-10",
    slug: "analysis_only_counterfactual_run",
    displayName: "Analysis-only counterfactual run",
    railSummary: "Counterfactual analysis stays segregated from compliance truth and schema evolution.",
    purpose:
      "Show exploratory analysis on a frozen historical basis, including schema/config evolution without contaminating compliance outputs.",
    actorsAndAuthorityPosture: ["Analyst or operator with analysis-only scope."],
    initialConditions: [
      "An approved compliance manifest already exists.",
      "A draft config or schema-bundle candidate is being evaluated.",
    ],
    inputSourceMix: ["HISTORICAL_MANIFEST", "DRAFT_CONFIG", "READER_WINDOW_POLICY"],
    runtimeScopeRefs: ["analysis", "counterfactual", "schema_evolution_review"],
    runKind: "ANALYSIS",
    scenarioClass: "MINIMUM_EMBODIMENT",
    frozenContext: {
      configProfileRef: "config.profile.counterfactual-analysis",
      providerProfileRef: "provider.hmrc.analysis-v1",
      businessPartitionRefs: ["business.synthetic.alpha-historical"],
      baselineSubmissionState: "HISTORICAL_BASELINE_CONFIRMED",
      comparisonRequirement: "COUNTERFACTUAL_DECLARED",
      authorityStateAssumptions: ["analysis-only outputs never become authority-capable truth"],
    },
    privacyStatement:
      "Synthetic feature-flag names and schema-window refs replace any live rollout or tenant detail.",
    sampleBundle: [
      {
        artifactRole: "CONFIG_FREEZE",
        narrativePurpose: "Pins the historical frozen config basis used for analysis divergence.",
        sampleName: "sample_config_freeze.json",
        summaryFields: ["config_freeze_hash", "source_config_freeze_ref", "config_resolution_basis"],
      },
      {
        artifactRole: "FEATURE_FLAG_SNAPSHOT",
        narrativePurpose: "Shows analysis-only flag posture and declared counterfactual dimensions.",
        sampleName: "sample_feature_flag_snapshot.json",
        summaryFields: ["feature_flag_snapshot_hash", "surface_state", "entries"],
      },
      {
        artifactRole: "SCHEMA_BUNDLE_COMPATIBILITY_GATE",
        narrativePurpose: "Keeps reader-window governance explicit during schema evolution review.",
        sampleName: "sample_schema_bundle_compatibility_gate_contract.json",
        summaryFields: ["reader_window_state", "historical_manifest_guard_state", "rollback_boundary_state"],
      },
    ],
    variants: [
      {
        variantId: "analysis_only_counterfactual",
        label: "Analysis-only counterfactual",
        summary:
          "A counterfactual replay declares its basis drift explicitly and never advertises compliance-capable output.",
        viewReplayClass: "COUNTERFACTUAL_ANALYSIS",
        comparisonMode: "COUNTERFACTUAL_DECLARED",
        goldenPackParticipation: "CORE",
        testVectorRefs: ["TV-10", "TV-42"],
        constraintRefs: ["CC-03", "CC-06", "CC-07"],
        scenarioTags: ["COUNTERFACTUAL", "ANALYSIS_ONLY"],
        gateOutcomes: [
          { gateCode: "REPLAY_BASIS_GATE", decision: "PASS", decisiveReasonCodes: [] },
          { gateCode: "EXECUTION_MODE_GATE", decision: "PASS", decisiveReasonCodes: [] },
          {
            gateCode: "FILING_GATE",
            decision: "HARD_BLOCK",
            decisiveReasonCodes: ["ANALYSIS_ONLY"],
          },
        ],
        artifactExpectations: [
          {
            artifactFamily: "REPLAY_ATTESTATION",
            artifactRef: "replay.synthetic.emb-10.counterfactual",
            posture: "EXPECTED_DIFFERENCE",
          },
        ],
        auditTimeline: [
          {
            step: "Counterfactual basis declared",
            eventType: "CounterfactualBasisDeclared",
            phase: "ANALYSIS",
            summary: "Declared config drift is frozen before replay executes.",
          },
          {
            step: "Analysis-only replay attested",
            eventType: "ReplayAttestationPersisted",
            phase: "REPLAY",
            summary: "The attestation records expected difference and no compliance posture.",
          },
        ],
        queryExpectations: [
          {
            queryRef: "analysis.counterfactual.difference",
            expectation:
              "Returns declared difference reasons and no filing-capable next action.",
          },
        ],
        replayProjectionPosture: {
          exactReplay: false,
          retentionLimited: false,
          counterfactualComparison: true,
          uploadRebase: false,
          authorityCorrection: false,
          streamRebase: false,
          queueRetry: false,
          schemaEvolution: false,
          acceptedRiskOrCompensation: false,
        },
      },
      {
        variantId: "schema_bundle_evolution_window",
        label: "Schema-bundle evolution window",
        summary:
          "Historical manifests stay bound to their recorded schema and config window while new work evaluates the candidate bundle separately.",
        viewReplayClass: "LIVE_READER_WINDOW_REVIEW",
        comparisonMode: null,
        goldenPackParticipation: "SUPPLEMENTAL",
        testVectorRefs: ["TV-23", "TV-44B", "TV-44C"],
        constraintRefs: ["CC-03", "CC-07"],
        scenarioTags: ["SCHEMA_EVOLUTION", "READER_WINDOW"],
        gateOutcomes: [
          { gateCode: "SCHEMA_WINDOW_GATE", decision: "PASS", decisiveReasonCodes: [] },
          { gateCode: "ROLLBACK_BOUNDARY_GATE", decision: "PASS", decisiveReasonCodes: [] },
        ],
        artifactExpectations: [
          {
            artifactFamily: "SCHEMA_BUNDLE_COMPATIBILITY_GATE",
            artifactRef: "schema.synthetic.emb-10.window",
            posture: "PROTECTED",
          },
        ],
        auditTimeline: [
          {
            step: "Reader window verified",
            eventType: "SchemaReaderWindowVerified",
            phase: "RELEASE",
            summary: "The candidate bundle proves compatibility before rollout.",
          },
        ],
        queryExpectations: [
          {
            queryRef: "schema.window.historical-manifest-guard",
            expectation:
              "Shows historical manifests protected while new manifests may evaluate the candidate bundle.",
          },
        ],
        replayProjectionPosture: {
          exactReplay: false,
          retentionLimited: false,
          counterfactualComparison: true,
          uploadRebase: false,
          authorityCorrection: false,
          streamRebase: false,
          queueRetry: false,
          schemaEvolution: true,
          acceptedRiskOrCompensation: false,
        },
      },
    ],
  },
  {
    embodimentRef: "EMB-11",
    slug: "degraded_data_review_no_filing",
    displayName: "Degraded-data review path with no filing",
    railSummary: "Failure and remediation stay typed, reviewable, and compensation-safe.",
    purpose:
      "Show safe degradation when critical evidence is missing or erased, including compensation or accepted-risk posture without pretending filing readiness.",
    actorsAndAuthorityPosture: ["Operator or reviewer with diagnostic scope only."],
    initialConditions: [
      "A critical domain is missing or decisive evidence has been erased.",
      "The user still wants a diagnostic explanation and remediation path.",
    ],
    inputSourceMix: ["LIMITED_COMPUTE_INPUT", "FAILURE_RESOLUTION_POLICY"],
    runtimeScopeRefs: ["review", "remediation", "diagnostic_only"],
    runKind: "INTERACTIVE",
    scenarioClass: "MINIMUM_EMBODIMENT",
    frozenContext: {
      configProfileRef: "config.profile.degraded-review",
      providerProfileRef: "provider.hmrc.review-only-v1",
      businessPartitionRefs: ["business.synthetic.alpha-limited"],
      baselineSubmissionState: "DEGRADED_INPUTS",
      comparisonRequirement: "NOT_COMPARABLE",
      authorityStateAssumptions: ["no authority mutation may proceed while evidence is degraded"],
    },
    privacyStatement:
      "Synthetic failure ids and remediation refs replace any live client, document, or staff identifiers.",
    sampleBundle: [
      {
        artifactRole: "FAILURE_RESOLUTION_CONTRACT",
        narrativePurpose: "Pins typed remediation and accepted-risk posture.",
        sampleName: "sample_failure_resolution_contract.json",
        summaryFields: ["resolution_scope", "accepted_risk_policy", "compensation_policy"],
      },
      {
        artifactRole: "FAILURE_LIFECYCLE_DASHBOARD",
        narrativePurpose: "Shows diagnostic state and owner/ref escalation.",
        sampleName: "sample_failure_lifecycle_dashboard.json",
        summaryFields: ["open_failure_count", "pending_retry_count", "owner_breakdown"],
      },
      {
        artifactRole: "CONFLICT_SET",
        narrativePurpose: "Keeps blocking evidence gaps explicit and typed.",
        sampleName: "sample_conflict_set.json",
        summaryFields: ["resolution_frontier", "blocking_conflict_count"],
      },
    ],
    variants: [
      {
        variantId: "degraded_data_compensating_review",
        label: "Degraded-data compensating review",
        summary:
          "The engine degrades into review, opens remediation, and allows only explicitly typed compensation or accepted risk.",
        viewReplayClass: "LIMITED_HISTORICAL_COMPARISON",
        comparisonMode: "BASIS_INCOMPLETE",
        goldenPackParticipation: "NONE",
        testVectorRefs: ["TV-11", "TV-62"],
        constraintRefs: ["CC-08", "CC-09"],
        scenarioTags: ["FAILURE_REMEDIATION", "ACCEPTED_RISK"],
        gateOutcomes: [
          {
            gateCode: "DATA_QUALITY_GATE",
            decision: "HARD_BLOCK",
            decisiveReasonCodes: ["CRITICAL_EVIDENCE_MISSING"],
          },
          {
            gateCode: "FILING_GATE",
            decision: "HARD_BLOCK",
            decisiveReasonCodes: ["NOT_READY"],
          },
        ],
        artifactExpectations: [
          {
            artifactFamily: "FAILURE_RESOLUTION_CONTRACT",
            artifactRef: "failure.synthetic.emb-11.current",
            posture: "REMEDIATION_REQUIRED",
          },
          {
            artifactFamily: "WORKFLOW_ITEM",
            artifactRef: "workflow.synthetic.emb-11.remediation",
            posture: "OPEN",
          },
        ],
        auditTimeline: [
          {
            step: "Evidence gap typed",
            eventType: "EvidenceGapTyped",
            phase: "VALIDATION",
            summary: "The decisive gap is recorded as a typed invariant failure, not a crash.",
          },
          {
            step: "Remediation opened",
            eventType: "RemediationTaskOpened",
            phase: "WORKFLOW",
            summary: "Compensation or accepted-risk posture is explicit and review-bound.",
          },
        ],
        queryExpectations: [
          {
            queryRef: "failure.remediation.current",
            expectation:
              "Returns typed remediation owner, accepted-risk state, and no filing-ready posture.",
          },
        ],
        replayProjectionPosture: {
          exactReplay: false,
          retentionLimited: true,
          counterfactualComparison: false,
          uploadRebase: false,
          authorityCorrection: false,
          streamRebase: false,
          queueRetry: false,
          schemaEvolution: false,
          acceptedRiskOrCompensation: true,
        },
      },
    ],
  },
  {
    embodimentRef: "EMB-12",
    slug: "multi_product_compatible_chain",
    displayName: "Multi-product compatible chain",
    railSummary: "Upload rebase, stream recovery, and cross-device continuity stay one governed chain.",
    purpose:
      "Show that one logical case can span multiple compatible products while preserving upload, stream, and route continuity.",
    actorsAndAuthorityPosture: [
      "Client contributor plus operator support surface acting on one shared synthetic case.",
    ],
    initialConditions: [
      "Document capture, portal workflow, and operator review span different compatible products.",
      "The request may rebase while uploads or streams are still in flight.",
    ],
    inputSourceMix: ["DOCUMENT_UPLOAD", "PORTAL_STREAM", "CROSS_DEVICE_ROUTE_CONTINUITY"],
    runtimeScopeRefs: ["portal_upload", "stream_resume", "cross_device_continuity"],
    runKind: "INTERACTIVE",
    scenarioClass: "MINIMUM_EMBODIMENT",
    frozenContext: {
      configProfileRef: "config.profile.multi-product-chain",
      providerProfileRef: "provider.hmrc.multi-product-v1",
      businessPartitionRefs: ["business.synthetic.portal-chain"],
      baselineSubmissionState: "REQUEST_OPEN_CURRENT",
      comparisonRequirement: "NOT_APPLICABLE",
      authorityStateAssumptions: ["customer-safe view is narrower than operator-safe view"],
    },
    privacyStatement:
      "Only synthetic request ids, upload refs, and continuity tokens appear in the examples.",
    sampleBundle: [
      {
        artifactRole: "UPLOAD_REQUEST_BINDING_CONTRACT",
        narrativePurpose: "Shows request rebase, reconfirmation, and stale-byte protection.",
        sampleName: "sample_upload_request_binding_contract.json",
        summaryFields: ["request_binding_state", "binding_resolution_basis", "stale_completion_policy"],
      },
      {
        artifactRole: "STREAM_RECOVERY_CONTRACT",
        narrativePurpose: "Shows catch-up, rebase, and compaction posture for experience continuity.",
        sampleName: "sample_stream_recovery_contract.json",
        summaryFields: ["delivery_window_state", "rebase_trigger_policy", "frame_epoch"],
      },
      {
        artifactRole: "CROSS_DEVICE_CONTINUITY_CONTRACT",
        narrativePurpose: "Pins same-object reopen across browser, portal, and support surfaces.",
        sampleName: "sample_cross_device_continuity_contract.json",
        summaryFields: ["continuity_scope", "canonical_object_ref", "allowed_embodiments"],
      },
    ],
    variants: [
      {
        variantId: "multi_product_chain",
        label: "Multi-product chain",
        summary:
          "Compatible products share one governed case lineage without flattening product-of-origin.",
        viewReplayClass: "LIVE_COMPLIANCE",
        comparisonMode: null,
        goldenPackParticipation: "NONE",
        testVectorRefs: ["TV-12"],
        constraintRefs: ["CC-01", "CC-02", "CC-04"],
        scenarioTags: ["MULTI_PRODUCT"],
        gateOutcomes: [
          { gateCode: "MANIFEST_GATE", decision: "PASS", decisiveReasonCodes: [] },
          { gateCode: "PROVENANCE_GATE", decision: "PASS", decisiveReasonCodes: [] },
        ],
        artifactExpectations: [
          {
            artifactFamily: "PROVENANCE_PATH",
            artifactRef: "provenance.synthetic.emb-12.multi-product",
            posture: "PRODUCT_ORIGIN_VISIBLE",
          },
        ],
        auditTimeline: [
          {
            step: "Cross-product lineage frozen",
            eventType: "CrossProductLineageFrozen",
            phase: "PROVENANCE",
            summary: "One case keeps product-of-origin and transform chain explicit.",
          },
        ],
        queryExpectations: [
          {
            queryRef: "provenance.multi_product.chain",
            expectation:
              "Shows source system lineage without collapsing the case into one product-local origin.",
          },
        ],
        replayProjectionPosture: {
          exactReplay: false,
          retentionLimited: false,
          counterfactualComparison: false,
          uploadRebase: false,
          authorityCorrection: false,
          streamRebase: false,
          queueRetry: false,
          schemaEvolution: false,
          acceptedRiskOrCompensation: false,
        },
      },
      {
        variantId: "upload_rebase_reconfirmation",
        label: "Upload request rebase and reconfirmation",
        summary:
          "A rebased request preserves resumability but requires explicit reconfirmation before stale bytes satisfy the new request.",
        viewReplayClass: "LIVE_REQUEST_REBASE",
        comparisonMode: null,
        goldenPackParticipation: "NONE",
        testVectorRefs: ["TV-27A", "TV-27B", "TV-27F", "TV-27G"],
        constraintRefs: ["CC-02", "CC-05"],
        scenarioTags: ["UPLOAD_REBASE", "CROSS_DEVICE"],
        gateOutcomes: [
          { gateCode: "UPLOAD_BINDING_GATE", decision: "PASS", decisiveReasonCodes: [] },
          {
            gateCode: "ATTACHMENT_GATE",
            decision: "OVERRIDABLE_BLOCK",
            decisiveReasonCodes: ["RECONFIRMATION_REQUIRED"],
          },
        ],
        artifactExpectations: [
          {
            artifactFamily: "CLIENT_UPLOAD_SESSION",
            artifactRef: "upload.synthetic.emb-12.reconfirmed",
            posture: "SESSION_REUSED",
          },
          {
            artifactFamily: "UPLOAD_REQUEST_BINDING_CONTRACT",
            artifactRef: "binding.synthetic.emb-12.reconfirm",
            posture: "RECONFIRMATION_REQUIRED",
          },
        ],
        auditTimeline: [
          {
            step: "Request rebased",
            eventType: "RequestRebased",
            phase: "UPLOAD",
            summary: "The live request version changes while the upload session remains in view.",
          },
          {
            step: "Explicit reconfirmation required",
            eventType: "UploadReconfirmationRequired",
            phase: "UPLOAD",
            summary: "Stale bytes cannot satisfy the current request without explicit reconfirmation.",
          },
        ],
        queryExpectations: [
          {
            queryRef: "upload.binding.current-vs-frozen",
            expectation:
              "Shows the frozen request version, the live request version, and the need for reconfirmation.",
          },
        ],
        replayProjectionPosture: {
          exactReplay: false,
          retentionLimited: false,
          counterfactualComparison: false,
          uploadRebase: true,
          authorityCorrection: false,
          streamRebase: false,
          queueRetry: false,
          schemaEvolution: false,
          acceptedRiskOrCompensation: false,
        },
      },
      {
        variantId: "stream_rebase_cross_device_continuity",
        label: "Stream rebase and cross-device continuity",
        summary:
          "Catch-up remains ordered, compaction forces explicit rebase, and cross-device continuity keeps the same governed object in focus.",
        viewReplayClass: "STREAM_REBASE",
        comparisonMode: null,
        goldenPackParticipation: "NONE",
        testVectorRefs: ["TV-21D", "TV-21E", "TV-39"],
        constraintRefs: ["CC-01", "CC-02"],
        scenarioTags: ["STREAM_REBASE", "SAME_OBJECT_CONTINUITY"],
        gateOutcomes: [
          { gateCode: "STREAM_RECOVERY_GATE", decision: "PASS", decisiveReasonCodes: [] },
          { gateCode: "STALE_VIEW_GATE", decision: "PASS", decisiveReasonCodes: [] },
        ],
        artifactExpectations: [
          {
            artifactFamily: "STREAM_RECOVERY_CONTRACT",
            artifactRef: "stream.synthetic.emb-12.rebase",
            posture: "REBASE_REQUIRED",
          },
          {
            artifactFamily: "CROSS_DEVICE_CONTINUITY_CONTRACT",
            artifactRef: "continuity.synthetic.emb-12.same-object",
            posture: "STABLE",
          },
        ],
        auditTimeline: [
          {
            step: "Catch-up gap closed",
            eventType: "CatchUpSequenceApplied",
            phase: "STREAM",
            summary: "Sequence catch-up completes before live deltas become current.",
          },
          {
            step: "Compaction requires rebase",
            eventType: "StreamRebaseRequired",
            phase: "STREAM",
            summary: "Compacted history triggers explicit rebase rather than invented deltas.",
          },
        ],
        queryExpectations: [
          {
            queryRef: "stream.recovery.same-object",
            expectation:
              "Returns one same-object continuity contract and an explicit rebase reason code.",
          },
        ],
        replayProjectionPosture: {
          exactReplay: false,
          retentionLimited: false,
          counterfactualComparison: false,
          uploadRebase: false,
          authorityCorrection: false,
          streamRebase: true,
          queueRetry: false,
          schemaEvolution: false,
          acceptedRiskOrCompensation: false,
        },
      },
    ],
  },
];

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function readJson<T>(filePath: string) {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

function sampleBindingByName(): Record<string, SampleBindingEntry> {
  return Object.fromEntries(sampleBindingCatalog.map((entry) => [entry.sampleName, entry]));
}

function deriveSeedHex(rootSeedRef: keyof typeof rootSeedValues, embodimentRef: string) {
  return `${sha256HexUtf8(`${rootSeedValues[rootSeedRef]}::${embodimentRef}`)}`;
}

function uniqueSorted(values: string[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function byFixtureId<T extends { fixture_id: string }>(left: T, right: T) {
  return left.fixture_id.localeCompare(right.fixture_id);
}

function canonicalizeModuleFixtures(
  fixtures: DeterministicGoldenPack["module_fixtures"],
) {
  return [...fixtures]
    .map((fixture) => ({
      ...fixture,
      expected_null_field_paths: [...fixture.expected_null_field_paths].sort((left, right) =>
        left.localeCompare(right),
      ),
      expected_decimal_fields: [...fixture.expected_decimal_fields].sort((left, right) =>
        left.field_path.localeCompare(right.field_path),
      ),
      expected_ordered_array_fields: [...fixture.expected_ordered_array_fields].sort(
        (left, right) => left.field_path.localeCompare(right.field_path),
      ),
    }))
    .sort(byFixtureId);
}

function canonicalizeStateTransitionFixtures(
  fixtures: DeterministicGoldenPack["state_transition_fixtures"],
) {
  return [...fixtures].sort(byFixtureId);
}

function canonicalizeReplayFixtures(
  fixtures: DeterministicGoldenPack["replay_fixtures"],
) {
  return [...fixtures].sort(byFixtureId);
}

function canonicalizeCadenceFixtures(
  fixtures: DeterministicGoldenPack["cadence_fixtures"],
) {
  return [...fixtures].sort(byFixtureId);
}

function deriveDeterministicGoldenPackHash(payload: Omit<DeterministicGoldenPack, "golden_pack_hash">) {
  return `${stableJsonHash({
    artifact_type: payload.artifact_type,
    contract_version: payload.contract_version,
    candidate_identity_hash: payload.candidate_identity_hash,
    schema_bundle_hash: payload.schema_bundle_hash,
    config_bundle_hash: payload.config_bundle_hash,
    canonical_serialization_policy: payload.canonical_serialization_policy,
    exact_decimal_policy: payload.exact_decimal_policy,
    null_slot_policy: payload.null_slot_policy,
    replay_comparison_policy: payload.replay_comparison_policy,
    state_transition_policy: payload.state_transition_policy,
    cadence_policy: payload.cadence_policy,
    module_fixtures: canonicalizeModuleFixtures(payload.module_fixtures),
    state_transition_fixtures: canonicalizeStateTransitionFixtures(
      payload.state_transition_fixtures,
    ),
    replay_fixtures: canonicalizeReplayFixtures(payload.replay_fixtures),
    cadence_fixtures: canonicalizeCadenceFixtures(payload.cadence_fixtures),
  })}`;
}

function exampleFilename(embodimentRef: string, slug: string) {
  return `${embodimentRef.toLowerCase()}_${slug}.json`;
}

function rootSeedCatalog() {
  return {
    contract_version: "DETERMINISTIC_SEED_CATALOG_V1",
    derivation_algorithm: "SHA256_HEX(root_seed_hex + '::' + embodiment_ref)",
    privacy_policy:
      "SYNTHETIC_VALUES_ONLY_NO_REAL_NAMES_ADDRESSES_TAX_IDENTIFIERS_PROVIDER_SECRETS_OR_LIVE_TIMESTAMPS",
    root_seeds: Object.entries(rootSeedValues).map(([seedRef, seedHex]) => ({
      seed_ref: seedRef,
      seed_hex: seedHex,
      rotation_posture: "CHANGE_ONLY_BY_EXPLICIT_VERSION_BUMP",
      review_purpose:
        seedRef === rootSeedRefs.goldenPackRoot
          ? "Seeds reviewed deterministic-golden-pack fixture materialization."
          : "Seeds stable synthetic fixture narratives, ids, and timelines.",
    })),
    example_seeds: embodiments.map((embodiment) => ({
      embodiment_ref: embodiment.embodimentRef,
      display_name: embodiment.displayName,
      seed_ref: `seed.synthetic.${embodiment.embodimentRef.toLowerCase()}.v1`,
      seed_hex: deriveSeedHex(rootSeedRefs.fixtureRoot, embodiment.embodimentRef),
      synthetic_namespace: embodiment.slug,
      derived_from_root_seed_ref: rootSeedRefs.fixtureRoot,
    })),
  } as const;
}

function buildArtifactSamples(
  embodiment: EmbodimentSource,
  sampleBindingIndex: Record<string, SampleBindingEntry>,
) {
  return embodiment.sampleBundle.map((sample) => {
    const binding = sampleBindingIndex[sample.sampleName];
    assert(binding, `Unknown sample ${sample.sampleName}.`);
    const schema = schemaCatalogByName[binding.inferredSchemaName];
    assert(schema, `Unknown schema ${binding.inferredSchemaName}.`);
    assert(
      schema.sampleRefs.includes(sample.sampleName),
      `Schema ${schema.schemaName} does not declare sample ${sample.sampleName}.`,
    );
    return {
      artifact_role: sample.artifactRole,
      logical_family_ref: binding.logicalFamilyRef,
      narrative_purpose: sample.narrativePurpose,
      sample_name: sample.sampleName,
      sample_path: binding.destinationPath,
      sample_source_hash: binding.sourceHash,
      schema_id: binding.inferredSchemaId,
      schema_name: binding.inferredSchemaName,
      schema_source_hash: schema.sourceHash,
      summary_fields: sample.summaryFields,
    };
  });
}

function buildGoldenPackFixtureRefs(materializedGoldenPack: DeterministicGoldenPack) {
  const fixtureId = <T extends { fixture_id: string }>(
    fixtures: T[],
    targetId: string,
  ) => fixtures.find((fixture) => fixture.fixture_id === targetId)?.fixture_id ?? "";

  return {
    "EMB-01::baseline_submission_path": [
      fixtureId(materializedGoldenPack.module_fixtures, "module.compute-result.emb-01"),
      fixtureId(materializedGoldenPack.replay_fixtures, "replay.exact.emb-01"),
    ].filter(Boolean),
    "EMB-02::delegated_partition_queue_retry": [
      fixtureId(materializedGoldenPack.cadence_fixtures, "cadence.retry.emb-02"),
    ].filter(Boolean),
    "EMB-06::amendment_lineage_exact_replay": [
      fixtureId(materializedGoldenPack.state_transition_fixtures, "transition.amendment.emb-06"),
    ].filter(Boolean),
    "EMB-08::authority_correction_reopens_trust": [
      fixtureId(materializedGoldenPack.cadence_fixtures, "cadence.reconciliation.emb-08"),
    ].filter(Boolean),
    "EMB-10::analysis_only_counterfactual": [
      fixtureId(materializedGoldenPack.replay_fixtures, "replay.counterfactual.emb-10"),
    ].filter(Boolean),
  } as const;
}

async function materializeDeterministicGoldenPack() {
  const candidateIdentity = await readJson<ReleaseCandidateIdentityContract>(
    releaseCandidateSamplePath,
  );
  const computeResult = await readJson<Record<string, unknown>>(
    path.join(repoRoot, "packages", "contracts-core", "samples", "sample_compute_result.json"),
  );
  const sampleGoldenPack = await readJson<DeterministicGoldenPack>(deterministicGoldenPackSamplePath);
  const moduleScopeHash = `${stableJsonHash({
    embodiment_ref: "EMB-01",
    sample: "sample_compute_result.json",
    schema_bundle_hash: candidateIdentity.schema_bundle_hash,
    config_bundle_hash: candidateIdentity.config_bundle_hash,
  })}`;
  const exactReplayBasisHash = `${stableJsonHash({
    embodiment_ref: "EMB-01",
    comparison_mode: "EXACT_HASH_MATCH",
    replay_class: "STANDARD_REPLAY",
  })}`;
  const exactReplayOutcomeHash = `${stableJsonHash({
    artifact_ref: "decision.synthetic.emb-01.current",
    outcome_class: "EXACT_MATCH",
  })}`;
  const counterfactualBasisHash = `${stableJsonHash({
    embodiment_ref: "EMB-10",
    comparison_mode: "COUNTERFACTUAL_DECLARED",
    replay_class: "COUNTERFACTUAL_ANALYSIS",
  })}`;
  const counterfactualOutcomeHash = `${stableJsonHash({
    artifact_ref: "replay.synthetic.emb-10.counterfactual",
    outcome_class: "EXPECTED_DIFFERENCE",
  })}`;

  const goldenPackWithoutHash = {
    golden_pack_id: "golden-pack.synthetic.cabinet.v1",
    artifact_type: "DeterministicGoldenPack",
    contract_version: "DETERMINISTIC_GOLDEN_PACK_V1",
    candidate_identity_hash: candidateIdentity.candidate_identity_hash,
    candidate_identity_contract: candidateIdentity,
    schema_bundle_hash: candidateIdentity.schema_bundle_hash,
    config_bundle_hash: candidateIdentity.config_bundle_hash,
    canonical_serialization_policy: "CANONICAL_JSON_SORTED_KEYS_UTF8",
    exact_decimal_policy: "EXACT_DECIMAL_STRING_NO_LOCALE_NO_EXPONENT",
    null_slot_policy: "EXPLICIT_NULL_SLOTS_RETAINED_IN_ORDERED_PAYLOADS",
    replay_comparison_policy: "GOLDEN_FIXTURES_BIND_CANDIDATE_SCHEMA_SCOPE_AND_EXPECTED_HASHES",
    state_transition_policy: "STATE_MACHINE_FIXTURES_REQUIRE_NAMED_PREVIOUS_AND_CURRENT_STATE",
    cadence_policy: "DETERMINISTIC_RETRY_AND_RECONCILIATION_CADENCE_NO_RANDOM_JITTER",
    module_fixtures: [
      {
        fixture_id: "module.compute-result.emb-01",
        module_code: "MATERIALIZE_COMPUTE_RESULT",
        artifact_family: "COMPUTE_RESULT",
        scope_binding_hash: moduleScopeHash,
        canonical_payload_hash: `${stableJsonHash(computeResult)}`,
        expected_null_field_paths: ["quarterly_basis_profile_or_null"],
        expected_decimal_fields: [
          {
            field_path: "totals.tax_due",
            decimal_value: "100.00",
          },
        ],
        expected_ordered_array_fields: [
          {
            field_path: "effective_partition_scope_refs",
            ordering_policy: "PRESERVE_DECLARED_ORDER",
            expected_values: ["business-a"],
          },
        ],
        fixture_binding_policy: "CANDIDATE_SCHEMA_SCOPE_BOUND",
      },
    ],
    state_transition_fixtures: [
      {
        fixture_id: "transition.amendment.emb-06",
        scope_binding_hash: `${stableJsonHash({
          embodiment_ref: "EMB-06",
          transition_fixture: "historical-amendment-replay",
        })}`,
        state_transition_contract:
          sampleGoldenPack.state_transition_fixtures[0]?.state_transition_contract ??
          sampleGoldenPack.state_transition_fixtures[0]!.state_transition_contract,
        expected_current_state:
          sampleGoldenPack.state_transition_fixtures[0]?.expected_current_state ?? "APPROVED",
        expected_previous_state_or_null:
          sampleGoldenPack.state_transition_fixtures[0]?.expected_previous_state_or_null ?? "PENDING",
        expected_transition_event_code:
          sampleGoldenPack.state_transition_fixtures[0]?.expected_transition_event_code ??
          "approval_granted",
        transition_binding_policy: "NAMED_STATE_MACHINE_TUPLE_AND_EVENT",
      },
    ],
    replay_fixtures: [
      {
        fixture_id: "replay.counterfactual.emb-10",
        scope_binding_hash: `${stableJsonHash({
          embodiment_ref: "EMB-10",
          replay_fixture: "analysis-only-counterfactual",
        })}`,
        replay_class: "COUNTERFACTUAL_ANALYSIS",
        comparison_mode: "COUNTERFACTUAL_DECLARED",
        expected_outcome_class: "EXPECTED_DIFFERENCE",
        expected_execution_basis_hash: counterfactualBasisHash,
        expected_deterministic_outcome_hash: counterfactualOutcomeHash,
        comparison_binding_policy: "CANDIDATE_SCHEMA_SCOPE_AND_HASH_BOUND",
      },
      {
        fixture_id: "replay.exact.emb-01",
        scope_binding_hash: `${stableJsonHash({
          embodiment_ref: "EMB-01",
          replay_fixture: "baseline-submission-path",
        })}`,
        replay_class: "STANDARD_REPLAY",
        comparison_mode: "EXACT_HASH_MATCH",
        expected_outcome_class: "EXACT_MATCH",
        expected_execution_basis_hash: exactReplayBasisHash,
        expected_deterministic_outcome_hash: exactReplayOutcomeHash,
        comparison_binding_policy: "CANDIDATE_SCHEMA_SCOPE_AND_HASH_BOUND",
      },
    ],
    cadence_fixtures: [
      {
        fixture_id: "cadence.reconciliation.emb-08",
        scope_binding_hash: `${stableJsonHash({
          attempt_index: 3,
          embodiment_ref: "EMB-08",
          family: "RECONCILIATION",
        })}`,
        cadence_family: "RECONCILIATION",
        attempt_index: 3,
        expected_cadence_seconds: 300,
        jitter_policy: "NONE",
        schedule_derivation_basis: "authority-correction:reconciliation|attempt=3",
      },
      {
        fixture_id: "cadence.retry.emb-02",
        scope_binding_hash: `${stableJsonHash({
          attempt_index: 2,
          embodiment_ref: "EMB-02",
          family: "RETRY",
        })}`,
        cadence_family: "RETRY",
        attempt_index: 2,
        expected_cadence_seconds: 60,
        jitter_policy: "NONE",
        schedule_derivation_basis: "queue:delegated-quarterly|attempt=2",
      },
    ],
  } satisfies Omit<DeterministicGoldenPack, "golden_pack_hash">;

  const canonicalGoldenPack = {
    ...goldenPackWithoutHash,
    module_fixtures: canonicalizeModuleFixtures(goldenPackWithoutHash.module_fixtures),
    state_transition_fixtures: canonicalizeStateTransitionFixtures(
      goldenPackWithoutHash.state_transition_fixtures,
    ),
    replay_fixtures: canonicalizeReplayFixtures(goldenPackWithoutHash.replay_fixtures),
    cadence_fixtures: canonicalizeCadenceFixtures(goldenPackWithoutHash.cadence_fixtures),
  } satisfies Omit<DeterministicGoldenPack, "golden_pack_hash">;
  const goldenPackHash = deriveDeterministicGoldenPackHash(canonicalGoldenPack);
  return {
    ...canonicalGoldenPack,
    golden_pack_hash: goldenPackHash,
  } satisfies DeterministicGoldenPack;
}

function buildEmbodimentBundles(
  sampleBindingIndex: Record<string, SampleBindingEntry>,
  materializedGoldenPack: DeterministicGoldenPack,
) {
  const goldenPackFixtureRefs = buildGoldenPackFixtureRefs(materializedGoldenPack);
  return embodiments.map((embodiment) => {
    const artifactSamples = buildArtifactSamples(embodiment, sampleBindingIndex);
    const deterministicSeed = {
      seed_ref: `seed.synthetic.${embodiment.embodimentRef.toLowerCase()}.v1`,
      seed_hex: deriveSeedHex(rootSeedRefs.fixtureRoot, embodiment.embodimentRef),
      synthetic_namespace: embodiment.slug,
      privacy_posture: embodiment.privacyStatement,
    };

    const scenarioVariants = embodiment.variants.map((variant) => ({
      variant_id: variant.variantId,
      label: variant.label,
      summary: variant.summary,
      view_replay_class: variant.viewReplayClass,
      comparison_mode_or_null: variant.comparisonMode,
      golden_pack_participation: variant.goldenPackParticipation,
      golden_pack_fixture_refs:
        goldenPackFixtureRefs[
          `${embodiment.embodimentRef}::${variant.variantId}` as keyof typeof goldenPackFixtureRefs
        ] ?? [],
      test_vector_refs: variant.testVectorRefs,
      constraint_refs: variant.constraintRefs,
      expected_gate_outcomes: variant.gateOutcomes,
      artifact_refs: variant.artifactExpectations,
      audit_timeline_skeleton: variant.auditTimeline,
      expected_query_outputs: variant.queryExpectations,
      replay_projection_posture: variant.replayProjectionPosture,
    }));

    return {
      actors_and_authority_posture: embodiment.actorsAndAuthorityPosture,
      bundle_version: "CANONICAL_DOMAIN_EXAMPLE_V1",
      deterministic_seed: deterministicSeed,
      display_name: embodiment.displayName,
      embodiment_ref: embodiment.embodimentRef,
      execution_mode_and_artifact_posture: {
        execution_mode:
          embodiment.runKind === "ANALYSIS" ? "ANALYSIS" : embodiment.runtimeScopeRefs.includes("analysis")
            ? "ANALYSIS"
            : "COMPLIANCE",
        analysis_only: embodiment.runtimeScopeRefs.includes("analysis"),
        counterfactual_basis_or_null:
          embodiment.embodimentRef === "EMB-10" ? "draft_schema_and_config_candidate" : null,
      },
      authorized_scope_and_run_kind: {
        run_kind: embodiment.runKind,
        runtime_scope_refs: embodiment.runtimeScopeRefs,
      },
      fixture_bundle: {
        artifact_samples: artifactSamples,
        minimum_artifact_bundle: fixtureFamilies.map((family) => family.familyRef),
        narrative_summary: embodiment.railSummary,
      },
      frozen_context: embodiment.frozenContext,
      initial_conditions: embodiment.initialConditions,
      input_source_mix: embodiment.inputSourceMix,
      privacy_statement: embodiment.privacyStatement,
      purpose: embodiment.purpose,
      scenario_class: embodiment.scenarioClass,
      scenario_variants: scenarioVariants,
      slug: embodiment.slug,
    } satisfies EmbodimentBundle;
  });
}

function buildEmbodimentIndex(bundles: EmbodimentBundle[]) {
  return {
    contract_version: "EMBODIMENT_INDEX_V1",
    index_scope: "CANONICAL_DOMAIN_EXAMPLES",
    entries: bundles.map((bundle) => ({
      embodiment_ref: bundle.embodiment_ref,
      display_name: bundle.display_name,
      file_path: path.posix.join(
        "fixtures/synthetic/canonical_domain_examples",
        exampleFilename(bundle.embodiment_ref, bundle.slug),
      ),
      scenario_class: bundle.scenario_class,
      selected_variant_ref: bundle.scenario_variants[0]?.variant_id ?? null,
      variant_refs: bundle.scenario_variants.map((variant) => variant.variant_id),
      golden_pack_participation: uniqueSorted(
        bundle.scenario_variants.map((variant) => variant.golden_pack_participation),
      ),
      accessible_label: `embodiment ${bundle.display_name.toLowerCase()} maps to test vectors ${uniqueSorted(bundle.scenario_variants.flatMap((variant) => variant.test_vector_refs)).join(" and ").toLowerCase()}`,
    })),
  } as const;
}

function buildFixtureFamilyMatrix() {
  return {
    contract_version: "FIXTURE_FAMILY_MATRIX_V1",
    fixture_families: fixtureFamilies.map((family) => ({
      family_ref: family.familyRef,
      label: family.label,
      required_fields: family.requiredFields,
      review_purpose: family.reviewPurpose,
    })),
    scenario_profiles: [
      {
        profile_ref: "LIVE_COMPLIANCE",
        required_family_refs: fixtureFamilies.map((family) => family.familyRef),
      },
      {
        profile_ref: "STANDARD_REPLAY",
        required_family_refs: fixtureFamilies.map((family) => family.familyRef),
      },
      {
        profile_ref: "COUNTERFACTUAL_ANALYSIS",
        required_family_refs: fixtureFamilies.map((family) => family.familyRef),
      },
      {
        profile_ref: "LIMITED_HISTORICAL_COMPARISON",
        required_family_refs: fixtureFamilies.map((family) => family.familyRef),
      },
    ],
  } as const;
}

function buildEmbodimentToVectorMap(bundles: EmbodimentBundle[]) {
  return {
    contract_version: "EMBODIMENT_TO_TEST_VECTOR_MAP_V1",
    mappings: bundles.map((bundle) => ({
      embodiment_ref: bundle.embodiment_ref,
      display_name: bundle.display_name,
      variant_mappings: bundle.scenario_variants.map((variant) => ({
        variant_id: variant.variant_id,
        label: variant.label,
        test_vector_refs: variant.test_vector_refs,
      })),
    })),
  } as const;
}

function buildConstraintTraceabilityFixtureMap(
  bundles: EmbodimentBundle[],
  constraintRegisterHash: string,
) {
  const refs = new Map<
    string,
    {
      constraint_ref: string;
      example_refs: Array<{
        embodiment_ref: string;
        variant_id: string;
      }>;
      test_vector_refs: string[];
    }
  >();

  for (const bundle of bundles) {
    for (const variant of bundle.scenario_variants) {
      for (const constraintRef of variant.constraint_refs) {
        const existing = refs.get(constraintRef) ?? {
          constraint_ref: constraintRef,
          example_refs: [],
          test_vector_refs: [],
        };
        existing.example_refs.push({
          embodiment_ref: bundle.embodiment_ref,
          variant_id: variant.variant_id,
        });
        existing.test_vector_refs.push(...variant.test_vector_refs);
        refs.set(constraintRef, existing);
      }
    }
  }

  return {
    contract_version: "CONSTRAINT_TRACEABILITY_FIXTURE_MAP_V1",
    source_register_hash: constraintRegisterHash,
    mappings: [...refs.values()]
      .sort((left, right) => left.constraint_ref.localeCompare(right.constraint_ref))
      .map((entry) => ({
        constraint_ref: entry.constraint_ref,
        example_refs: entry.example_refs,
        test_vector_refs: uniqueSorted(entry.test_vector_refs),
      })),
  } as const;
}

function buildDeterministicGoldenPackSeed(materializedGoldenPack: DeterministicGoldenPack) {
  return {
    contract_version: "DETERMINISTIC_GOLDEN_PACK_SEED_V1",
    golden_pack_seed_id: "golden-pack-seed.synthetic.cabinet.v1",
    root_seed_ref: rootSeedRefs.goldenPackRoot,
    root_seed_hex: rootSeedValues[rootSeedRefs.goldenPackRoot],
    expected_golden_pack_hash: materializedGoldenPack.golden_pack_hash,
    review_policy:
      "CHANGE_ONLY_WITH_EXPLICIT_SEED_VERSION_BUMP_AND_UPDATED_EXPECTED_GOLDEN_PACK_HASH",
    candidate_identity_sample: {
      sample_name: "sample_release_candidate_identity_contract.json",
      sample_path: "packages/contracts-core/samples/sample_release_candidate_identity_contract.json",
    },
    module_fixture_inputs: materializedGoldenPack.module_fixtures.map((fixture) => ({
      fixture_id: fixture.fixture_id,
      source_embodiment_ref: "EMB-01",
      source_variant_id: "baseline_submission_path",
      sample_name: "sample_compute_result.json",
      expected_decimal_fields: fixture.expected_decimal_fields,
      expected_null_field_paths: fixture.expected_null_field_paths,
      expected_ordered_array_fields: fixture.expected_ordered_array_fields,
    })),
    state_transition_fixture_inputs: materializedGoldenPack.state_transition_fixtures.map(
      (fixture) => ({
        fixture_id: fixture.fixture_id,
        source_embodiment_ref: "EMB-06",
        source_variant_id: "amendment_lineage_exact_replay",
        machine_code: fixture.state_transition_contract.machine_code,
        previous_state_or_null: fixture.expected_previous_state_or_null,
        current_state: fixture.expected_current_state,
      }),
    ),
    replay_fixture_inputs: materializedGoldenPack.replay_fixtures.map((fixture) => ({
      fixture_id: fixture.fixture_id,
      source_embodiment_ref:
        fixture.fixture_id === "replay.exact.emb-01" ? "EMB-01" : "EMB-10",
      replay_class: fixture.replay_class,
      comparison_mode: fixture.comparison_mode,
      expected_outcome_class: fixture.expected_outcome_class,
    })),
    cadence_fixture_inputs: materializedGoldenPack.cadence_fixtures.map((fixture) => ({
      fixture_id: fixture.fixture_id,
      source_embodiment_ref:
        fixture.fixture_id === "cadence.retry.emb-02" ? "EMB-02" : "EMB-08",
      cadence_family: fixture.cadence_family,
      expected_cadence_seconds: fixture.expected_cadence_seconds,
      attempt_index: fixture.attempt_index,
    })),
  } as const;
}

function buildExamplesReadme(bundles: EmbodimentBundle[]) {
  return `# Canonical Domain Examples

This directory is generator-owned. Edit \`tools/fixtures/build_deterministic_fixture_pack.ts\` and rerun:

\`\`\`bash
node --experimental-strip-types ./tools/fixtures/build_deterministic_fixture_pack.ts --emit
\`\`\`

The emitted examples turn the roadmap corpus into privacy-safe, deterministic, machine-checkable scenario bundles.

## Included Embodiments

${bundles
  .map(
    (bundle) =>
      `- \`${bundle.embodiment_ref}\` ${bundle.display_name}: ${bundle.scenario_variants
        .map((variant) => `${variant.label} (${variant.view_replay_class})`)
        .join("; ")}`,
  )
  .join("\n")}

## Stability Rules

- Seed values are deterministic and versioned.
- Sample artifacts must remain mirrored from \`packages/contracts-core/samples\`.
- Golden-pack expectations are reviewed through \`fixtures/synthetic/deterministic_golden_pack_seed.json\`.
- No example may include real customer data, live timestamps, or provider secrets.
`;
}

function buildAtlasPayload(
  bundles: EmbodimentBundle[],
  materializedGoldenPack: DeterministicGoldenPack,
  constraintRegisterHash: string,
) {
  const goldPackRefs = buildGoldenPackFixtureRefs(materializedGoldenPack);
  return {
    routeId: "canonical-domain-example-atlas",
    title: "Canonical Domain Example Atlas",
    subtitle:
      "A premium cabinet of deterministic, privacy-safe embodiments that bind narrative, schema-valid samples, traceability, replay posture, and golden-pack review into one governed fixture system.",
    basisStatement: `Examples derive from reviewed synthetic seeds, mirrored contract samples, and the live constraint register hash ${constraintRegisterHash.slice(0, 12)}.`,
    overlayToggleLabel: "Show golden-pack coverage overlay",
    palette: {
      background: "#F6F5F2",
      surface: "#FFFFFF",
      secondary: "#F0EEE9",
      ink: "#101418",
      muted: "#6A727A",
      hairline: "rgba(16,20,24,0.08)",
      accentSteelBlue: "#4A6178",
      accentSage: "#61715E",
      accentClay: "#8A6544",
      success: "#17614B",
      warning: "#8B5D1B",
      danger: "#A53A31",
    },
    selectedEmbodimentRef: bundles[0]?.embodiment_ref ?? "EMB-01",
    embodiments: bundles.map((bundle) => {
      const selectedVariant = bundle.scenario_variants[0]!;

      return {
        accessibleLabel:
          bundle.embodiment_ref === "EMB-03"
            ? "embodiment quarterly update with correction maps to test vectors tv-03"
            : buildEmbodimentIndex([bundle]).entries[0].accessible_label,
        displayName: bundle.display_name,
        embodimentRef: bundle.embodiment_ref,
        fixtureBundle: {
          narrativeSummary: bundle.fixture_bundle.narrative_summary,
          artifactSamples: bundle.fixture_bundle.artifact_samples,
        },
        frozenContext: bundle.frozen_context,
        actorsAndAuthorityPosture: bundle.actors_and_authority_posture,
        initialConditions: bundle.initial_conditions,
        inputSourceMix: bundle.input_source_mix,
        inspector: {
          seedHex: bundle.deterministic_seed.seed_hex,
          seedRef: bundle.deterministic_seed.seed_ref,
          schemaRefs: uniqueSorted(
            bundle.fixture_bundle.artifact_samples.map((sample) => sample.schema_name),
          ),
        },
        privacyStatement: bundle.privacy_statement,
        purpose: bundle.purpose,
        railSummary: embodiments.find((entry) => entry.embodimentRef === bundle.embodiment_ref)?.railSummary ?? "",
        selectedVariantId: selectedVariant.variant_id,
        variants: bundle.scenario_variants.map((variant) => ({
          variantId: variant.variant_id,
          label: variant.label,
          replayClass: variant.view_replay_class,
          summary: variant.summary,
          goldenPackParticipation: variant.golden_pack_participation,
          expectedGates: variant.expected_gate_outcomes,
          expectedArtifacts: variant.artifact_refs,
          timeline: variant.audit_timeline_skeleton,
          testVectorRefs: variant.test_vector_refs,
          constraintRefs: variant.constraint_refs,
          goldenPackOverlay: (
            goldPackRefs[
              `${bundle.embodiment_ref}::${variant.variant_id}` as keyof typeof goldPackRefs
            ] ?? []
          ).map((fixtureId) => {
            let fixtureKind: "CADENCE" | "MODULE" | "REPLAY" | "STATE_TRANSITION" = "MODULE";
            if (materializedGoldenPack.cadence_fixtures.some((fixture) => fixture.fixture_id === fixtureId)) {
              fixtureKind = "CADENCE";
            } else if (
              materializedGoldenPack.state_transition_fixtures.some(
                (fixture) => fixture.fixture_id === fixtureId,
              )
            ) {
              fixtureKind = "STATE_TRANSITION";
            } else if (
              materializedGoldenPack.replay_fixtures.some((fixture) => fixture.fixture_id === fixtureId)
            ) {
              fixtureKind = "REPLAY";
            }
            return {
              fixtureId,
              fixtureKind,
              label: fixtureId,
              note:
                fixtureKind === "MODULE"
                  ? "Byte-stable artifact payload expectation."
                  : fixtureKind === "STATE_TRANSITION"
                    ? "Named transition tuple required by deterministic suite."
                    : fixtureKind === "REPLAY"
                      ? "Replay hash and outcome expectation."
                      : "Retry or reconciliation cadence without jitter.",
            };
          }),
        })),
      };
    }),
  } satisfies AtlasPayload;
}

async function buildFixturePackArtifacts(): Promise<FixturePackArtifacts> {
  const sampleBindingIndex = sampleBindingByName();
  const [materializedGoldenPack, constraintRegisterText] = await Promise.all([
    materializeDeterministicGoldenPack(),
    readFile(constraintRegisterPath, "utf8"),
  ]);
  const bundles = buildEmbodimentBundles(sampleBindingIndex, materializedGoldenPack);
  const constraintRegisterHash = `${sha256HexUtf8(constraintRegisterText)}`;
  const embodimentIndex = buildEmbodimentIndex(bundles);
  const fixtureFamilyMatrix = buildFixtureFamilyMatrix();
  const embodimentToVectorMap = buildEmbodimentToVectorMap(bundles);
  const constraintFixtureMap = buildConstraintTraceabilityFixtureMap(
    bundles,
    constraintRegisterHash,
  );
  const seedCatalog = rootSeedCatalog();
  const goldenPackSeed = buildDeterministicGoldenPackSeed(materializedGoldenPack);
  const atlasPayload = buildAtlasPayload(bundles, materializedGoldenPack, constraintRegisterHash);

  const files: EmittedFile[] = [
    {
      path: path.join(fixturesRoot, "deterministic_seed_catalog.json"),
      contents: `${JSON.stringify(seedCatalog, null, 2)}\n`,
    },
    {
      path: path.join(fixturesRoot, "embodiment_index.json"),
      contents: `${JSON.stringify(embodimentIndex, null, 2)}\n`,
    },
    {
      path: path.join(fixturesRoot, "fixture_family_matrix.json"),
      contents: `${JSON.stringify(fixtureFamilyMatrix, null, 2)}\n`,
    },
    {
      path: path.join(fixturesRoot, "embodiment_to_test_vector_map.json"),
      contents: `${JSON.stringify(embodimentToVectorMap, null, 2)}\n`,
    },
    {
      path: path.join(fixturesRoot, "constraint_traceability_fixture_map.json"),
      contents: `${JSON.stringify(constraintFixtureMap, null, 2)}\n`,
    },
    {
      path: path.join(fixturesRoot, "deterministic_golden_pack_seed.json"),
      contents: `${JSON.stringify(goldenPackSeed, null, 2)}\n`,
    },
    {
      path: path.join(examplesRoot, "README.md"),
      contents: buildExamplesReadme(bundles),
    },
    ...bundles.map((bundle) => ({
      path: path.join(examplesRoot, exampleFilename(bundle.embodiment_ref, bundle.slug)),
      contents: `${JSON.stringify(bundle, null, 2)}\n`,
    })),
    {
      path: atlasDataPath,
      contents: `${JSON.stringify(atlasPayload, null, 2)}\n`,
    },
  ];

  return {
    atlasPayload,
    files,
    materializedGoldenPack,
  };
}

async function emitFiles(files: EmittedFile[]) {
  await Promise.all(
    files.map(async (file) => {
      await mkdir(path.dirname(file.path), { recursive: true });
      await writeFile(file.path, file.contents, "utf8");
    }),
  );
}

async function checkFiles(files: EmittedFile[]) {
  await Promise.all(
    files.map(async (file) => {
      const existing = await readFile(file.path, "utf8");
      if (existing !== file.contents) {
        throw new Error(`Out-of-sync generated file: ${path.relative(repoRoot, file.path)}`);
      }
    }),
  );
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const artifacts = await buildFixturePackArtifacts();
  if (args.has("--emit")) {
    await emitFiles(artifacts.files);
    console.log(
      `wrote deterministic fixture pack: ${artifacts.files.length} emitted files with golden pack ${artifacts.materializedGoldenPack.golden_pack_hash}`,
    );
    return;
  }

  if (args.has("--check")) {
    await checkFiles(artifacts.files);
    console.log(
      `verified deterministic fixture pack: ${artifacts.files.length} files with golden pack ${artifacts.materializedGoldenPack.golden_pack_hash}`,
    );
    return;
  }

  console.log(canonicalJsonStringify(artifacts.atlasPayload));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}

export {
  buildFixturePackArtifacts,
  buildAtlasPayload,
  buildDeterministicGoldenPackSeed,
  buildEmbodimentBundles,
  buildEmbodimentIndex,
  buildEmbodimentToVectorMap,
  buildFixtureFamilyMatrix,
  buildConstraintTraceabilityFixtureMap,
  materializeDeterministicGoldenPack,
  rootSeedCatalog,
};
