# TaxatOperator Native Workspace

This directory is the signed macOS boundary for the internal operator app.

## Why It Lives Outside Node Workspaces

- the native workspace must remain buildable through Xcode and Swift Package Manager without Node-only assumptions
- signed desktop delivery, notarization, and native cache/hydration rules are independent of browser build tooling
- the monorepo still keeps this boundary visible to the workspace graph through `apps/internal-operator-macos`

## Placeholder Topology

- `TaxatOperator.xcworkspace/`: Xcode workspace boundary for the signed app
- `Package.swift`: Swift package placeholder for shared native foundations and generated bindings
- `Sources/OperatorWorkspaceFoundation/`: future shared Swift modules
- `GeneratedContracts/Sources/GeneratedContracts/Generated/`: generated Codable bindings for the native subset selected by the binding-generation matrix
- `Tests/OperatorWorkspaceFoundationTests/`: future native unit tests

The signed delivery, session, scene, and AppKit acceleration work remains deferred to the dedicated native phase tasks, but the workspace boundary is now reserved and named consistently.

## Generated Binding Posture

- `GeneratedContracts` is a downstream-only Swift target populated by `tools/contracts/generate_language_bindings.ts`
- the phase-02 matrix intentionally limits Swift coverage to native-relevant families and records the rest in `data/contracts/binding_gap_register.json`
- manual native adapters belong outside `GeneratedContracts` so canonical schema semantics and generator lineage stay machine-detectable
