import type { ObservatoryViewContract } from "./types";

export const commandSearchDialogView = {
  componentId: "CommandSearchDialog",
  region: "COMMAND_SEARCH",
  purpose:
    "Provide command-style lookup across files, headings, schema ids, field paths, entity names, and task ids with deterministic keyboard traversal.",
  accessibleContract: [
    "The dialog supports open, close, arrow-key navigation, enter-to-commit, and escape-to-dismiss.",
    "Search results expose whether the hit came from an artifact, heading, or schema field.",
  ],
  dataDependencies: [
    "search-index.json",
    "site-manifest.json",
  ],
} satisfies ObservatoryViewContract;
