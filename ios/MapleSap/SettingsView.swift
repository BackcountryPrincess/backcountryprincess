import SwiftUI

struct SettingsView: View {
    @AppStorage("ms_temperatureUnit") private var tempUnit   = "C"
    @AppStorage("ms_areaUnit")        private var areaUnit   = "ha"
    @AppStorage("ms_alertHour")       private var alertHour  = 6

    var body: some View {
        NavigationStack {
            Form {
                Section("Units") {
                    Picker("Temperature", selection: $tempUnit) {
                        Text("Celsius (°C)").tag("C")
                        Text("Fahrenheit (°F)").tag("F")
                    }
                    Picker("Area", selection: $areaUnit) {
                        Text("Hectares (ha)").tag("ha")
                        Text("Acres (ac)").tag("ac")
                    }
                }

                Section("Notifications") {
                    Picker("Morning Alert Time", selection: $alertHour) {
                        ForEach(5...10, id: \.self) { h in
                            Text(String(format: "%d:00 AM", h)).tag(h)
                        }
                    }
                }

                Section("About") {
                    LabeledContent("Version", value: "2.0.0")
                    LabeledContent("Model", value: "Forecast Engine V1")
                    LabeledContent("Data Source", value: "Open-Meteo")
                }

                Section("Support") {
                    Link(destination: URL(string: "https://maplesap.app")!) {
                        Label("Visit maplesap.app", systemImage: "globe")
                            .foregroundStyle(.mapleAmber)
                    }
                    Link(destination: URL(string: "https://maplesap.app/privacy/")!) {
                        Label("Privacy Policy", systemImage: "lock.shield")
                            .foregroundStyle(.mapleAmber)
                    }
                    Link(destination: URL(string: "https://maplesap.app/support/")!) {
                        Label("Get Support", systemImage: "questionmark.circle")
                            .foregroundStyle(.mapleAmber)
                    }
                }
            }
            .navigationTitle("Settings")
        }
    }
}
