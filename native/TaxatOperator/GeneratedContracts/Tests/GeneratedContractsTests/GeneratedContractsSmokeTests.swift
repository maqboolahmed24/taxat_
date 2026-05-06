import XCTest

@testable import GeneratedContracts

final class GeneratedContractsSmokeTests: XCTestCase {
    func testAuthorityContractLineageAndCoverageManifestAreReachable() {
        XCTAssertEqual(
            ActionAuthorityContractSchemaLineage.schemaId,
            "https://taxat.dev/schemas/action_authority_contract.schema.json"
        )
        XCTAssertTrue(
            BindingCoverageManifest.authorityAndAccess.contains("AUTHORITY_AND_ACCESS")
        )
    }

    func testAuthorityContractCanBeConstructedFromGeneratedSurface() {
        let contract = ActionAuthorityContract(
            projection_scope: "WORKSPACE_ACTION_STRIP",
            source_module_code: .string("WORKFLOW_CHOREOGRAPHER"),
            basis_hash: "basis-hash",
            projection_route_key: "route-key",
            projection_version: 1,
            access_binding_hash: "access-hash",
            visibility_cache_partition_key: "partition-key",
            customer_safe_projection: true,
            actionability_state: "ACTION_AVAILABLE",
            primary_action_code_or_null: "OPEN_WORK_ITEM",
            secondary_action_codes: ["VIEW_DETAILS"],
            available_action_codes: ["OPEN_WORK_ITEM", "VIEW_DETAILS"],
            blocked_action_codes: [],
            blocking_reason_code_or_null: nil,
            machine_reason_codes: ["SAFE"],
            suggested_module_code_or_null: .string("FILES"),
            recovery_route_ref_or_null: nil,
            recovery_focus_anchor_ref_or_null: nil
        )

        XCTAssertEqual(contract.projection_scope, "WORKSPACE_ACTION_STRIP")
        XCTAssertEqual(contract.projection_version, 1)
        XCTAssertEqual(contract.available_action_codes.count, 2)
    }
}
