// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "TaxatOperatorWorkspace",
    platforms: [
        .macOS(.v15)
    ],
    products: [
        .library(
            name: "GeneratedContracts",
            targets: ["GeneratedContracts"]
        ),
        .library(
            name: "OperatorWorkspaceFoundation",
            targets: ["OperatorWorkspaceFoundation"]
        )
    ],
    targets: [
        .target(
            name: "GeneratedContracts",
            path: "GeneratedContracts/Sources/GeneratedContracts"
        ),
        .target(
            name: "OperatorWorkspaceFoundation",
            dependencies: ["GeneratedContracts"]
        ),
        .testTarget(
            name: "GeneratedContractsTests",
            dependencies: ["GeneratedContracts"],
            path: "GeneratedContracts/Tests/GeneratedContractsTests"
        ),
        .testTarget(
            name: "OperatorWorkspaceFoundationTests",
            dependencies: ["OperatorWorkspaceFoundation"]
        )
    ]
)
