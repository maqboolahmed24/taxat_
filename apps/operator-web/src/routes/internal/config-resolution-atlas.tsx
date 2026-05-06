export const configResolutionAtlasRoute = {
  id: "config-resolution-atlas",
  title: "Config Resolution Atlas",
  purpose:
    "Document the frozen config resolution pipeline, typed reuse bases, completeness barrier, and final config surface hash without turning internal review into a live flag console.",
  resolutionStages: [
    "CONFIG_VERSIONS",
    "FLAG_SNAPSHOT",
    "INHERITANCE",
    "BARRIER",
    "FREEZE",
    "SURFACE_HASH",
  ],
  palette: {
    background: "#F5F5F2",
    surface: "#FFFFFF",
    secondary: "#EEF0EC",
    ink: "#101418",
    muted: "#69717A",
    hairline: "rgba(16,20,24,0.08)",
    accentNavy: "#4B6078",
    accentSage: "#60705E",
    accentGold: "#8B6A40",
    success: "#17614B",
    warning: "#8C5D1B",
    danger: "#A53A31",
  },
  notes: [
    "Fresh resolution, replay exact reuse, recovery exact reuse, and historical explicit reuse stay typed instead of being inferred from matching hashes after the fact.",
    "Feature-flag evaluation resolves once into a provider-neutral snapshot and later workers consume only the frozen hash or the explicit null-surface posture.",
    "The atlas is read-only and explains lineage, completeness, and hash inputs; it is not a live config or feature-flag control plane.",
  ],
} as const;
