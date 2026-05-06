import XCTest
@testable import OperatorWorkspaceFoundation

final class PlaceholderTests: XCTestCase {
    func testPlaceholderNoteIsPresent() {
        XCTAssertFalse(OperatorWorkspaceFoundationPlaceholder.note.isEmpty)
    }
}
