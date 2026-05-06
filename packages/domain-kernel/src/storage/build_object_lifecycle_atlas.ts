import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  checkObjectLifecycleAtlasPayload,
  emitObjectLifecycleAtlasPayload,
  loadObjectLifecyclePolicyBundle,
  StorageBoundaryError,
  type ObjectClassPolicyRow,
} from "./object_lifecycle.ts";

type AtlasStageRef = "STAGE" | "SCAN" | "QUARANTINE" | "PUBLISH" | "DELIVER" | "RETAIN_ERASE";

type StageCard = {
  accessibleLabel: string;
  deliveryLaw: "DENIED" | "GOVERNED" | "DERIVATIVE_REQUIRED";
  label: string;
  lifecycleState: string;
  stageRef: AtlasStageRef;
  summary: string;
  tone: "danger" | "forest" | "steel" | "umber";
};

type ObjectLifecycleAtlasPayload = {
  routeId: "object-lifecycle-atlas";
  title: string;
  subtitle: string;
  basisStatement: string;
  deliveryPostureChip: string;
  retentionPostureBadge: string;
  schemaHashes: Record<string, string>;
  selectedObjectClassRef: string;
  selectedStageRef: AtlasStageRef;
  stages: Array<{
    stageRef: AtlasStageRef;
    label: string;
    summary: string;
  }>;
  objectClasses: Array<{
    objectClassRef: string;
    railLabel: string;
    displayName: string;
    storageNamespaceRef: string;
    storageRefPrefix: string;
    deliveryPosture: string;
    retentionClass: string;
    resumabilityPosture: string;
    currentHistoryPosture: string;
    quarantineSummary: string;
    deliverySummary: string;
    retentionSummary: string;
    retentionHookRefs: string[];
    notes: string[];
    branchChips: Array<{
      label: string;
      text: string;
      tone: "danger" | "forest" | "steel" | "umber";
    }>;
    stageCards: StageCard[];
  }>;
};

function railLabel(objectClassRef: string) {
  switch (objectClassRef) {
    case "UPLOAD_SESSION_SOURCE":
      return "UPLOAD SOURCE";
    case "QUARANTINED_SOURCE":
      return "QUARANTINE";
    case "RETAINED_EVIDENCE_CURRENT":
      return "EVIDENCE CURRENT";
    case "CUSTOMER_SAFE_DERIVATIVE":
      return "SAFE DERIVATIVE";
    case "MASKED_EXPORT_BUNDLE":
      return "MASKED EXPORT";
    case "RESTRICTED_EXPORT_BUNDLE":
      return "RESTRICTED EXPORT";
    default:
      return objectClassRef;
  }
}

function buildStageCards(row: ObjectClassPolicyRow): StageCard[] {
  switch (row.object_class_ref) {
    case "UPLOAD_SESSION_SOURCE":
      return [
        {
          accessibleLabel: "staged upload source same storage ref across resume",
          deliveryLaw: "DENIED",
          label: "Stage",
          lifecycleState: "STAGED",
          stageRef: "STAGE",
          summary:
            "Bytes land in upload staging and keep the same storage_ref across reconnect and request rebase.",
          tone: "steel",
        },
        {
          accessibleLabel: "scanning upload source not yet attachable",
          deliveryLaw: "DENIED",
          label: "Scan",
          lifecycleState: "SCANNING",
          stageRef: "SCAN",
          summary:
            "Transfer can settle before scan completes, but attach, preview, and download remain blocked.",
          tone: "umber",
        },
        {
          accessibleLabel: "quarantined attachment not downloadable",
          deliveryLaw: "DENIED",
          label: "Quarantine",
          lifecycleState: "QUARANTINED",
          stageRef: "QUARANTINE",
          summary:
            "Malicious or policy-blocked verdicts move the body into isolated quarantine with customer-safe status only.",
          tone: "danger",
        },
        {
          accessibleLabel: "published upload source still internal only",
          deliveryLaw: "DERIVATIVE_REQUIRED",
          label: "Publish",
          lifecycleState: "PUBLISHED",
          stageRef: "PUBLISH",
          summary:
            "A clean upload source can be published as internal evidence, but raw bytes remain internal-only truth.",
          tone: "forest",
        },
        {
          accessibleLabel: "upload source delivery denied without derivative",
          deliveryLaw: "DERIVATIVE_REQUIRED",
          label: "Deliver",
          lifecycleState: "PUBLISHED",
          stageRef: "DELIVER",
          summary:
            "Customer delivery remains unlawful until a customer-safe derivative or export bundle is minted explicitly.",
          tone: "umber",
        },
        {
          accessibleLabel: "upload source retain or erase after workflow settlement",
          deliveryLaw: "DENIED",
          label: "Retain / Erase",
          lifecycleState: "RETAINED",
          stageRef: "RETAIN_ERASE",
          summary:
            "Retention hooks preserve upload lineage, and current-view references can still block erasure later.",
          tone: "steel",
        },
      ];
    case "QUARANTINED_SOURCE":
      return [
        {
          accessibleLabel: "quarantine source preserved from prior upload lineage",
          deliveryLaw: "DENIED",
          label: "Stage",
          lifecycleState: "QUARANTINED",
          stageRef: "STAGE",
          summary: "Quarantined bodies are already isolated artifacts, not resumable upload state.",
          tone: "danger",
        },
        {
          accessibleLabel: "quarantine source awaits review evidence",
          deliveryLaw: "DENIED",
          label: "Scan",
          lifecycleState: "QUARANTINED",
          stageRef: "SCAN",
          summary:
            "Security review and false-positive evidence can inspect lineage without reopening customer delivery.",
          tone: "danger",
        },
        {
          accessibleLabel: "quarantine source never previewable or downloadable",
          deliveryLaw: "DENIED",
          label: "Quarantine",
          lifecycleState: "QUARANTINED",
          stageRef: "QUARANTINE",
          summary:
            "Quarantine is the dominant posture: no preview, no download, and no raw provider URLs.",
          tone: "danger",
        },
        {
          accessibleLabel: "false positive release copies forward into clean successor",
          deliveryLaw: "DERIVATIVE_REQUIRED",
          label: "Publish",
          lifecycleState: "PUBLISHED",
          stageRef: "PUBLISH",
          summary:
            "Manual release creates a new clean object boundary instead of mutating the quarantined body in place.",
          tone: "forest",
        },
        {
          accessibleLabel: "quarantine delivery stays revoked",
          deliveryLaw: "DENIED",
          label: "Deliver",
          lifecycleState: "QUARANTINED",
          stageRef: "DELIVER",
          summary:
            "Existing bindings are revoked and later delivery must happen on a clean successor object only.",
          tone: "danger",
        },
        {
          accessibleLabel: "quarantine lineage retained for proof preservation",
          deliveryLaw: "DENIED",
          label: "Retain / Erase",
          lifecycleState: "RETAINED",
          stageRef: "RETAIN_ERASE",
          summary:
            "Proof-preservation posture can hold the quarantined object even when the product object is replaced.",
          tone: "umber",
        },
      ];
    case "RETAINED_EVIDENCE_CURRENT":
      return [
        {
          accessibleLabel: "retained evidence enters from a promoted clean source",
          deliveryLaw: "GOVERNED",
          label: "Stage",
          lifecycleState: "PUBLISHED",
          stageRef: "STAGE",
          summary:
            "This class begins after governed promotion from upload staging into retained evidence.",
          tone: "steel",
        },
        {
          accessibleLabel: "retained evidence can be rescanned without changing durable ref",
          deliveryLaw: "GOVERNED",
          label: "Scan",
          lifecycleState: "PUBLISHED",
          stageRef: "SCAN",
          summary:
            "Later scan or validation signals may still affect delivery posture without rewriting the durable artifact ref.",
          tone: "steel",
        },
        {
          accessibleLabel: "retained evidence quarantine revokes current delivery",
          deliveryLaw: "DENIED",
          label: "Quarantine",
          lifecycleState: "QUARANTINED",
          stageRef: "QUARANTINE",
          summary:
            "A late re-scan can revoke preview and download while preserving historical lineage and proof.",
          tone: "danger",
        },
        {
          accessibleLabel: "retained evidence publish keeps current and history explicit",
          deliveryLaw: "GOVERNED",
          label: "Publish",
          lifecycleState: "PUBLISHED",
          stageRef: "PUBLISH",
          summary:
            "Publication keeps current-versus-history target selection explicit instead of backfilling one mutable default.",
          tone: "forest",
        },
        {
          accessibleLabel: "retained evidence deliverable only through governed binding",
          deliveryLaw: "GOVERNED",
          label: "Deliver",
          lifecycleState: "DELIVERABLE",
          stageRef: "DELIVER",
          summary:
            "Preview and download require a fresh delivery_binding_hash plus current or historical target selection.",
          tone: "forest",
        },
        {
          accessibleLabel: "retained evidence erasure may be blocked by current view references",
          deliveryLaw: "GOVERNED",
          label: "Retain / Erase",
          lifecycleState: "RETAINED",
          stageRef: "RETAIN_ERASE",
          summary:
            "Retention and erasure flow through ArtifactRetention, and current artifact views can downgrade erasure to limited posture.",
          tone: "umber",
        },
      ];
    case "CUSTOMER_SAFE_DERIVATIVE":
      return [
        {
          accessibleLabel: "customer safe derivative minted from internal source",
          deliveryLaw: "GOVERNED",
          label: "Stage",
          lifecycleState: "PUBLISHED",
          stageRef: "STAGE",
          summary:
            "A derivative is minted from an internal-only source instead of widening source-body access.",
          tone: "steel",
        },
        {
          accessibleLabel: "customer safe derivative inherits clean source gate",
          deliveryLaw: "GOVERNED",
          label: "Scan",
          lifecycleState: "PUBLISHED",
          stageRef: "SCAN",
          summary:
            "Derivative generation stays bound to the clean source and can be rebuilt if delivery context drifts.",
          tone: "steel",
        },
        {
          accessibleLabel: "customer safe derivative quarantine revokes preview and download",
          deliveryLaw: "DENIED",
          label: "Quarantine",
          lifecycleState: "QUARANTINED",
          stageRef: "QUARANTINE",
          summary:
            "Derivative delivery can still be revoked later when scan or policy posture changes.",
          tone: "danger",
        },
        {
          accessibleLabel:
            "customer safe derivative published for explicit current or history target",
          deliveryLaw: "GOVERNED",
          label: "Publish",
          lifecycleState: "PUBLISHED",
          stageRef: "PUBLISH",
          summary:
            "Publishing keeps the derivative bound to explicit current-versus-history target semantics.",
          tone: "forest",
        },
        {
          accessibleLabel: "customer safe derivative preview and download via governed binding",
          deliveryLaw: "GOVERNED",
          label: "Deliver",
          lifecycleState: "DELIVERABLE",
          stageRef: "DELIVER",
          summary:
            "This is the customer-facing delivery class: preview and download remain route-bound and binding-bound.",
          tone: "forest",
        },
        {
          accessibleLabel:
            "customer safe derivative retained or erased without rewriting source truth",
          deliveryLaw: "GOVERNED",
          label: "Retain / Erase",
          lifecycleState: "RETAINED",
          stageRef: "RETAIN_ERASE",
          summary:
            "Retention acts on the derivative artifact while the source retained-evidence body keeps its own independent lineage.",
          tone: "umber",
        },
      ];
    case "MASKED_EXPORT_BUNDLE":
      return [
        {
          accessibleLabel: "masked export bundle minted on explicit export invocation",
          deliveryLaw: "GOVERNED",
          label: "Stage",
          lifecycleState: "PUBLISHED",
          stageRef: "STAGE",
          summary:
            "Masked exports are explicit derivative bundles, not ambient side effects of viewing a document.",
          tone: "steel",
        },
        {
          accessibleLabel: "masked export bundle rebuilds from current policy and source",
          deliveryLaw: "GOVERNED",
          label: "Scan",
          lifecycleState: "PUBLISHED",
          stageRef: "SCAN",
          summary:
            "Each export generation can rebuild from current masking and retention policy without changing the source artifact.",
          tone: "steel",
        },
        {
          accessibleLabel: "masked export quarantine revokes outward sharing",
          deliveryLaw: "DENIED",
          label: "Quarantine",
          lifecycleState: "QUARANTINED",
          stageRef: "QUARANTINE",
          summary:
            "If an export bundle becomes unsafe, the bundle is quarantined without rewriting source evidence.",
          tone: "danger",
        },
        {
          accessibleLabel: "masked export published as explicit derivative output",
          deliveryLaw: "GOVERNED",
          label: "Publish",
          lifecycleState: "PUBLISHED",
          stageRef: "PUBLISH",
          summary:
            "Publication records one export invocation with its own storage_ref and retention lineage.",
          tone: "forest",
        },
        {
          accessibleLabel: "masked export download only through governed binding",
          deliveryLaw: "GOVERNED",
          label: "Deliver",
          lifecycleState: "DELIVERABLE",
          stageRef: "DELIVER",
          summary: "Masked exports support download and governed sharing, not ambient preview.",
          tone: "forest",
        },
        {
          accessibleLabel: "masked export erased once derivative retention window closes",
          deliveryLaw: "GOVERNED",
          label: "Retain / Erase",
          lifecycleState: "RETAINED",
          stageRef: "RETAIN_ERASE",
          summary:
            "Derivative retention can end earlier than retained source evidence while still preserving erasure proof.",
          tone: "umber",
        },
      ];
    case "RESTRICTED_EXPORT_BUNDLE":
      return [
        {
          accessibleLabel: "restricted export bundle minted for step up review",
          deliveryLaw: "DERIVATIVE_REQUIRED",
          label: "Stage",
          lifecycleState: "PUBLISHED",
          stageRef: "STAGE",
          summary:
            "Restricted exports remain internally visible bundles until a separate masked export is minted.",
          tone: "steel",
        },
        {
          accessibleLabel: "restricted export bundle follows audit and replay rules",
          deliveryLaw: "DERIVATIVE_REQUIRED",
          label: "Scan",
          lifecycleState: "PUBLISHED",
          stageRef: "SCAN",
          summary:
            "Restricted exports follow replay-safe evidence rules and never collapse into customer-safe handles.",
          tone: "steel",
        },
        {
          accessibleLabel: "restricted export quarantine blocks any outward delivery",
          deliveryLaw: "DENIED",
          label: "Quarantine",
          lifecycleState: "QUARANTINED",
          stageRef: "QUARANTINE",
          summary:
            "A restricted bundle can still be quarantined, which revokes even operator-step-up delivery.",
          tone: "danger",
        },
        {
          accessibleLabel: "restricted export published under audit and visibility partition",
          deliveryLaw: "DERIVATIVE_REQUIRED",
          label: "Publish",
          lifecycleState: "PUBLISHED",
          stageRef: "PUBLISH",
          summary:
            "Publication preserves audit and visibility partitioning instead of sharing a raw storage path.",
          tone: "forest",
        },
        {
          accessibleLabel: "restricted export requires masked derivative before customer sharing",
          deliveryLaw: "DERIVATIVE_REQUIRED",
          label: "Deliver",
          lifecycleState: "PUBLISHED",
          stageRef: "DELIVER",
          summary:
            "A masked export is still required before the restricted bundle can become customer-safe.",
          tone: "umber",
        },
        {
          accessibleLabel: "restricted export retained as regulated record",
          deliveryLaw: "DERIVATIVE_REQUIRED",
          label: "Retain / Erase",
          lifecycleState: "RETAINED",
          stageRef: "RETAIN_ERASE",
          summary:
            "Restricted export retention stays governed like other regulated evidence-bearing artifacts.",
          tone: "umber",
        },
      ];
    default:
      return [];
  }
}

function branchChips(row: ObjectClassPolicyRow) {
  return [
    {
      label: "Namespace",
      text: `${row.storage_namespace_ref} / ${row.storage_ref_prefix}`,
      tone: "steel" as const,
    },
    {
      label: "Delivery",
      text: row.delivery_posture,
      tone: row.delivery_posture.includes("NOT") ? ("danger" as const) : ("forest" as const),
    },
    {
      label: "History",
      text: row.current_history_posture,
      tone: "umber" as const,
    },
  ];
}

function quarantineSummary(row: ObjectClassPolicyRow) {
  if (row.object_class_ref === "QUARANTINED_SOURCE") {
    return "Quarantine is the primary posture for this class; release copies forward into a clean successor object.";
  }
  if (row.object_class_ref === "UPLOAD_SESSION_SOURCE") {
    return "Malware or policy verdicts copy the upload source into quarantine and keep customer delivery unavailable.";
  }
  return "Late re-scan can revoke existing delivery and preserve quarantine lineage without rewriting durable source truth.";
}

function deliverySummary(row: ObjectClassPolicyRow) {
  if (row.object_class_ref === "UPLOAD_SESSION_SOURCE") {
    return "Delivery denied until a customer-safe derivative or explicit export bundle exists.";
  }
  if (row.object_class_ref === "MASKED_EXPORT_BUNDLE") {
    return "Download and governed share only. No ambient preview route is implied.";
  }
  if (row.object_class_ref === "RESTRICTED_EXPORT_BUNDLE") {
    return "Restricted delivery remains step-up and audit bound, and customer-safe sharing still requires a masked derivative.";
  }
  return "Preview and download remain route-bound, target-bound, and delivery-binding-bound.";
}

function buildAtlasPayload(
  bundle: Awaited<ReturnType<typeof loadObjectLifecyclePolicyBundle>>,
): ObjectLifecycleAtlasPayload {
  return {
    routeId: "object-lifecycle-atlas",
    title: "Taxat Object Lifecycle Atlas",
    subtitle:
      "A governed storage river keeps upload source, quarantine, publication, delivery, and retention law explicit without turning raw storage into product truth.",
    basisStatement: bundle.objectClassCatalog.basis_statement,
    deliveryPostureChip: "Governed delivery only",
    retentionPostureBadge: "Retention hooks attached",
    schemaHashes: bundle.schemaHashes,
    selectedObjectClassRef: "RETAINED_EVIDENCE_CURRENT",
    selectedStageRef: "DELIVER",
    stages: [
      {
        stageRef: "STAGE",
        label: "Stage",
        summary: "Receive or mint bytes under an explicit storage namespace and object class.",
      },
      {
        stageRef: "SCAN",
        label: "Scan",
        summary: "Security and validation posture settle without implying delivery.",
      },
      {
        stageRef: "QUARANTINE",
        label: "Quarantine",
        summary: "Revocation or isolation stays explicit and history-preserving.",
      },
      {
        stageRef: "PUBLISH",
        label: "Publish",
        summary: "Publication records durable source or derivative meaning before delivery.",
      },
      {
        stageRef: "DELIVER",
        label: "Deliver",
        summary: "Preview, download, or governed share require current delivery binding.",
      },
      {
        stageRef: "RETAIN_ERASE",
        label: "Retain / Erase",
        summary: "Retention and erasure remain canonical control objects, not storage-only tags.",
      },
    ],
    objectClasses: bundle.objectClassCatalog.object_class_rows.map((row) => ({
      objectClassRef: row.object_class_ref,
      railLabel: railLabel(row.object_class_ref),
      displayName: row.display_name,
      storageNamespaceRef: row.storage_namespace_ref,
      storageRefPrefix: row.storage_ref_prefix,
      deliveryPosture: row.delivery_posture,
      retentionClass: row.retention_class,
      resumabilityPosture: row.resumability_posture,
      currentHistoryPosture: row.current_history_posture,
      quarantineSummary: quarantineSummary(row),
      deliverySummary: deliverySummary(row),
      retentionSummary:
        row.retention_class === "regulated_record"
          ? "Regulated-record retention keeps legal hold, limitation, and erasure proof on canonical objects."
          : "Derived-artifact retention can expire earlier than retained source evidence while keeping erasure proof explicit.",
      retentionHookRefs: bundle.retentionMetadataHookPolicy.hook_rows
        .filter((hook) => hook.applies_to_object_classes.includes(row.object_class_ref))
        .map((hook) => hook.hook_ref),
      notes: row.notes.slice(),
      branchChips: branchChips(row),
      stageCards: buildStageCards(row),
    })),
  };
}

export async function mainBuildObjectLifecycleAtlas() {
  const mode = new Set(process.argv.slice(2)).has("--emit") ? "emit" : "check";
  const bundle = await loadObjectLifecyclePolicyBundle({ reload: true });
  const payload = buildAtlasPayload(bundle);
  if (mode === "emit") {
    await emitObjectLifecycleAtlasPayload(payload);
  } else {
    await checkObjectLifecycleAtlasPayload(payload);
  }
  console.log(`${mode === "emit" ? "wrote" : "verified"} object lifecycle atlas`);
  console.log(`object classes: ${payload.objectClasses.length}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  mainBuildObjectLifecycleAtlas().catch((error) => {
    const message =
      error instanceof StorageBoundaryError ? `${error.code}: ${error.message}` : String(error);
    console.error(message);
    process.exitCode = 1;
  });
}
