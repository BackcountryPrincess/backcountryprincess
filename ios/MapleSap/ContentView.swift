import SwiftUI
import SwiftData

struct RootView: View {
    @AppStorage("ms_onboardingComplete") private var onboardingComplete = false

    var body: some View {
        if onboardingComplete {
            MainTabView()
        } else {
            OnboardingView()
        }
    }
}

struct MainTabView: View {
    @AppStorage("ms_selectedTab") private var selectedTab = 0

    var body: some View {
        TabView(selection: $selectedTab) {
            TodayView()
                .tabItem { Label("Today", systemImage: "leaf.fill") }
                .tag(0)
            ForecastView()
                .tabItem { Label("Forecast", systemImage: "calendar") }
                .tag(1)
            BushListView()
                .tabItem { Label("Bushes", systemImage: "map.fill") }
                .tag(2)
            AlertsView()
                .tabItem { Label("Alerts", systemImage: "bell.fill") }
                .tag(3)
            SettingsView()
                .tabItem { Label("Settings", systemImage: "gear") }
                .tag(4)
        }
        .tint(.mapleAmber)
    }
}
