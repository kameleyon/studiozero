// Studio Zero — App entry point
//
// On macOS this file lives in an Xcode project (.xcodeproj or .xcodeproj from
// SPM). To bootstrap into Xcode:
//   1. Copy this directory to a macOS host
//   2. Open Package.swift in Xcode (Xcode 15+)
//   3. File → New → Target → App (iOS or visionOS)
//   4. Set @main on this struct as the app delegate
//
// Or generate a fresh Xcode project that wraps this Package:
//   swift package generate-xcodeproj  (deprecated in Swift 6 — use Xcode's
//   "Open Package" instead)

#if canImport(SwiftUI)
import SwiftUI

@available(iOS 17.0, visionOS 1.0, macOS 14.0, *)
public struct StudioZeroApp: App {
    public init() {}

    public var body: some Scene {
        WindowGroup {
            ContentView()
        }
        #if os(visionOS)
        // visionOS-specific scene config (immersive space, etc.)
        ImmersiveSpace(id: "ImmersiveSpace") {
            ImmersiveView()
        }
        #endif
    }
}
#endif
