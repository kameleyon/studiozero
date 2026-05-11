// Studio Zero — Primary screen
#if canImport(SwiftUI)
import SwiftUI

@available(iOS 17.0, visionOS 1.0, macOS 14.0, *)
public struct ContentView: View {
    @State private var counter: Int = 0

    public init() {}

    public var body: some View {
        VStack(spacing: 16) {
            Text("Studio Zero")
                .font(.largeTitle).bold()

            Text("SwiftUI + SPM scaffold. Replace this view with your real app.")
                .font(.body)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)

            Button(action: { counter += 1 }) {
                Text("Tap count: \(counter)")
                    .frame(minWidth: 44, minHeight: 44) // Apple HIG touch-target floor
                    .padding(.horizontal, 16)
            }
            .buttonStyle(.borderedProminent)
            .accessibilityIdentifier("tap-counter")
            .accessibilityLabel("Increment tap counter")
        }
        .padding()
    }
}

#if os(visionOS)
@available(visionOS 1.0, *)
public struct ImmersiveView: View {
    public init() {}
    public var body: some View {
        // Place RealityView content here when targeting immersive visionOS
        EmptyView()
    }
}
#endif
#endif
