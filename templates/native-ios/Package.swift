// swift-tools-version:6.0
// Studio Zero — Native iOS / visionOS SwiftUI App
//
// IMPORTANT: This package compiles cross-platform via Swift Package Manager,
// but actual iOS / iPadOS / visionOS device builds require macOS + Xcode.
// On the Studio Zero Windows host, you can:
//   - swift build (Windows target, smoke-test the logic)
//   - swift test (run XCTest suites against the Windows toolchain)
// You CANNOT produce an .ipa here. Hand off to a macOS host for that.

import PackageDescription

let package = Package(
    name: "StudioZeroApp",
    platforms: [
        .iOS(.v17),
        .visionOS(.v1),
        .macOS(.v14),  // for unit tests on Windows + macOS
    ],
    products: [
        .library(name: "StudioZeroApp", targets: ["StudioZeroApp"]),
    ],
    dependencies: [
        // Add Swift Package dependencies here. Common picks:
        //   .package(url: "https://github.com/pointfreeco/swift-composable-architecture", from: "1.15.0"),
        //   .package(url: "https://github.com/supabase/supabase-swift", from: "2.20.0"),
    ],
    targets: [
        .target(
            name: "StudioZeroApp",
            dependencies: [],
            path: "Sources/StudioZeroApp"
        ),
        .testTarget(
            name: "StudioZeroAppTests",
            dependencies: ["StudioZeroApp"],
            path: "Tests/StudioZeroAppTests"
        ),
    ]
)
