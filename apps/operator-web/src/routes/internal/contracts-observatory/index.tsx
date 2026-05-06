import {
  artifactCanvasView,
  commandSearchDialogView,
  evidenceRailView,
  navigationTreeView,
  observatoryTopBarView,
} from "../../../components/contracts-observatory";

export const contractsObservatoryIndexRoute = {
  id: "contracts-observatory",
  title: "Contracts Observatory",
  path: "/internal/contracts-observatory",
  purpose:
    "Host the canonical internal contract atlas inside the existing operator shell rather than splitting authoritative docs into a parallel app surface.",
  taxonomy: [
    "OVERVIEW",
    "RUNTIME_CONTRACTS",
    "DATA_MODEL",
    "SCHEMAS",
    "SAMPLES",
    "BINDINGS",
    "VALIDATORS",
    "DRIFT_AND_READINESS",
    "SUPPORT_DOCS",
  ],
  palette: {
    background: "#F7F5F1",
    surface: "#FFFFFF",
    support: "#EFEDE8",
    ink: "#101418",
    mutedInk: "#667079",
    hairline: "rgba(16,20,24,0.08)",
    accentNavy: "#465A77",
    accentSage: "#61705C",
    accentBrass: "#8A6942",
    link: "#375D8A",
    success: "#17614B",
    warning: "#8B5D1B",
    danger: "#A23A33",
  },
  shellComposition: [
    observatoryTopBarView,
    navigationTreeView,
    artifactCanvasView,
    evidenceRailView,
    commandSearchDialogView,
  ],
  notes: [
    "The surface is read-only and build-time generated from prose, schemas, samples, validators, bindings, and readiness evidence.",
    "Source-of-truth badges distinguish authoritative artifacts from generated companions and traceability-only cards.",
  ],
} as const;
