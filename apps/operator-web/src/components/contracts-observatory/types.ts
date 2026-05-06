export type ObservatoryViewContract = {
  componentId: string;
  region:
    | "TOP_BAR"
    | "NAVIGATION"
    | "CANVAS"
    | "EVIDENCE_RAIL"
    | "COMMAND_SEARCH";
  purpose: string;
  accessibleContract: string[];
  dataDependencies: string[];
};
