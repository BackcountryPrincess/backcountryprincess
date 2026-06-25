import SwiftUI
import SwiftData

@main
struct MapleSapApp: App {
    @State private var forecastService = ForecastService()

    var body: some Scene {
        WindowGroup {
            RootView()
                .modelContainer(for: Bush.self)
                .environment(forecastService)
                .preferredColorScheme(.dark)
        }
    }
}
