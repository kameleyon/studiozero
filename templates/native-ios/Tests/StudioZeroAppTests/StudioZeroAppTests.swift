// Studio Zero — XCTest sample. Runs cross-platform via swift test.
import XCTest
@testable import StudioZeroApp

final class StudioZeroAppTests: XCTestCase {
    func testSampleAssertion() {
        XCTAssertEqual(1 + 1, 2, "Math still works")
    }
}
