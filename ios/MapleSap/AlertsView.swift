import SwiftUI
import SwiftData
import UserNotifications

struct AlertsView: View {
    @Environment(ForecastService.self) private var forecast
    @Query(sort: \Bush.createdAt)
    private var bushes: [Bush]

    @AppStorage("ms_activeBushID")      private var activeBushID       = ""
    @AppStorage("ms_alertFreezeThaw")   private var alertFreezeThaw    = true
    @AppStorage("ms_alertExceptional")  private var alertExceptional   = true
    @AppStorage("ms_alertSeasonStart")  private var alertSeasonStart   = true
    @AppStorage("ms_alertSeasonEnd")    private var alertSeasonEnd     = true
    @AppStorage("ms_alertHour")         private var alertHour          = 6
    @AppStorage("ms_alertRecordsData")  private var alertRecordsData   = Data()

    @State private var permissionStatus: UNAuthorizationStatus = .notDetermined
    @State private var isScheduling = false
    @State private var scheduleMessage: String?

    private var activeBush: Bush? {
        if let id = UUID(uuidString: activeBushID) { return bushes.first { $0.id == id } }
        return bushes.first(where: \.isDefault) ?? bushes.first
    }

    private var alertRecords: [AlertRecord] {
        (try? JSONDecoder().decode([AlertRecord].self, from: alertRecordsData)) ?? []
    }

    var body: some View {
        NavigationStack {
            List {
                // Permission status
                Section {
                    switch permissionStatus {
                    case .authorized:
                        Label("Notifications enabled", systemImage: "bell.fill")
                            .foregroundStyle(.green)
                    case .denied:
                        VStack(alignment: .leading, spacing: 6) {
                            Label("Notifications are disabled", systemImage: "bell.slash.fill")
                                .foregroundStyle(.red)
                            Button("Open Settings") {
                                if let url = URL(string: UIApplication.openSettingsURLString) {
                                    UIApplication.shared.open(url)
                                }
                            }
                            .font(.caption).foregroundStyle(.mapleAmber)
                        }
                    default:
                        Button("Enable Notifications") {
                            Task {
                                _ = await NotificationService.shared.requestPermission()
                                permissionStatus = await NotificationService.shared.authorizationStatus()
                            }
                        }
                        .foregroundStyle(.mapleAmber)
                    }
                }

                // Alert toggles
                Section("Alert Types") {
                    Toggle("Freeze-Thaw Events", isOn: $alertFreezeThaw)
                    Toggle("Exceptional Run Days", isOn: $alertExceptional)
                    Toggle("Season Start", isOn: $alertSeasonStart)
                    Toggle("Season End Warning", isOn: $alertSeasonEnd)
                }

                // Alert time
                Section("Alert Time") {
                    Picker("Daily alert at", selection: $alertHour) {
                        ForEach(5...10, id: \.self) { h in
                            Text(String(format: "%d:00 AM", h)).tag(h)
                        }
                    }
                }

                // Schedule button
                Section {
                    Button {
                        Task { await scheduleAlerts() }
                    } label: {
                        if isScheduling {
                            HStack { ProgressView(); Text("Scheduling…") }
                        } else {
                            Text("Update Alert Schedule")
                                .frame(maxWidth: .infinity)
                                .foregroundStyle(.mapleAmber)
                                .fontWeight(.semibold)
                        }
                    }
                    .disabled(isScheduling || permissionStatus != .authorized || activeBush == nil)

                    if let msg = scheduleMessage {
                        Text(msg).font(.caption).foregroundStyle(.secondary)
                    }
                }

                // History
                if !alertRecords.isEmpty {
                    Section("Recent Alerts") {
                        ForEach(alertRecords.suffix(10).reversed()) { record in
                            AlertHistoryCard(record: record)
                        }
                    }
                }
            }
            .navigationTitle("Alerts")
            .task {
                permissionStatus = await NotificationService.shared.authorizationStatus()
            }
        }
    }

    private func scheduleAlerts() async {
        guard let bush = activeBush, !forecast.days7.isEmpty else {
            scheduleMessage = "Load a forecast first."
            return
        }
        isScheduling = true
        let records = await NotificationService.shared.scheduleAlerts(
            forecast: forecast.days7,
            bushName: bush.name,
            enableFreezeThaw: alertFreezeThaw,
            enableExceptional: alertExceptional,
            enableSeasonStart: alertSeasonStart,
            enableSeasonEnd: alertSeasonEnd,
            hour: alertHour
        )
        let combined = (alertRecords + records)
            .sorted { $0.scheduledAt < $1.scheduledAt }
        alertRecordsData = (try? JSONEncoder().encode(combined)) ?? Data()
        scheduleMessage = records.isEmpty
            ? "No upcoming events match your alert preferences."
            : "\(records.count) alert\(records.count == 1 ? "" : "s") scheduled."
        isScheduling = false
    }
}

// MARK: - AlertHistoryCard

struct AlertHistoryCard: View {
    let record: AlertRecord

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: record.type.systemImage)
                .foregroundStyle(.mapleAmber)
                .frame(width: 24)
            VStack(alignment: .leading, spacing: 2) {
                Text(record.type.displayName)
                    .font(.subheadline).fontWeight(.medium)
                Text("\(record.bushName) · \(record.date) · Score \(record.mapleScore)")
                    .font(.caption).foregroundStyle(.secondary)
            }
            Spacer()
        }
    }
}
