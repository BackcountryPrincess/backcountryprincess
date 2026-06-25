import SwiftUI
import SwiftData

struct TodayView: View {
    @Environment(ForecastService.self) private var forecast
    @Query(sort: \Bush.createdAt)
    private var bushes: [Bush]

    @AppStorage("ms_temperatureUnit") private var tempUnit      = "C"
    @AppStorage("ms_activeBushID")    private var activeBushID  = ""

    @State private var showBushPicker = false

    private var activeBush: Bush? {
        if let id = UUID(uuidString: activeBushID) {
            return bushes.first { $0.id == id }
        }
        return bushes.first(where: \.isDefault) ?? bushes.first
    }

    // MARK: Body

    var body: some View {
        NavigationStack {
            content
                .navigationTitle("Today")
                .toolbar { toolbarContent }
                .sheet(isPresented: $showBushPicker) {
                    BushPickerSheet(activeBushID: $activeBushID)
                }
        }
        .task(id: activeBush?.id) {
            guard let bush = activeBush else { return }
            await forecast.load(bush: bush)
        }
        .refreshable {
            guard let bush = activeBush else { return }
            await forecast.load(bush: bush, forceRefresh: true)
        }
    }

    // MARK: State router

    @ViewBuilder
    private var content: some View {
        if bushes.isEmpty {
            noBushState
        } else if forecast.isLoading && forecast.allDays.isEmpty {
            loadingState
        } else if let err = forecast.loadError, forecast.allDays.isEmpty {
            errorState(message: err)
        } else if forecast.isOffSeason && !forecast.allDays.isEmpty {
            offSeasonState
        } else if let today = forecast.days7.first {
            mainContent(today: today)
        } else {
            loadingState
        }
    }

    // MARK: Main content

    @ViewBuilder
    private func mainContent(today: ForecastDay) -> some View {
        ScrollView {
            VStack(spacing: 20) {
                if forecast.isOffline, let at = forecast.fetchedAt {
                    offlineBanner(fetchedAt: at)
                }

                MapleScoreGauge(score: today.mapleScore, subtitle: today.displayDate)
                    .padding(.horizontal)

                VStack(spacing: 10) {
                    RingScoreRow(
                        label: "Conditions",
                        score: today.conditionsScore,
                        icon: "thermometer.medium",
                        detail: today.freezeThaw ? "Freeze-thaw ✓" : "No freeze-thaw today"
                    )
                    RingScoreRow(
                        label: "Flow Strength",
                        score: today.flowStrengthScore,
                        icon: "drop.fill",
                        detail: today.temperatureSwing.map { String(format: "%.1f°C swing", $0) } ?? "—"
                    )
                    RingScoreRow(
                        label: "Flow Status",
                        score: today.flowStatusScore,
                        icon: "calendar.badge.clock",
                        detail: "Season \(today.seasonProgression)%"
                    )
                }
                .padding(.horizontal)

                ConditionsPanel(day: today, tempUnit: tempUnit)
                    .padding(.horizontal)

                if let next = forecast.nextFreezeThawDay ?? forecast.nextExceptionalDay {
                    NextEventCard(day: next)
                        .padding(.horizontal)
                }

                if forecast.days7.count > 1 {
                    WeekStripView(days: forecast.days7)
                }
            }
            .padding(.vertical)
        }
    }

    // MARK: Off-season state

    private var offSeasonState: some View {
        VStack(spacing: 24) {
            Spacer()
            Image(systemName: "snowflake")
                .font(.system(size: 64))
                .foregroundStyle(.mapleAmber)
            Text("Off Season")
                .font(.title).fontWeight(.bold)
            Text("Sap season runs mid-January through late April. Freeze-thaw conditions are not forecast for the next 7 days.")
                .multilineTextAlignment(.center)
                .foregroundStyle(.secondary)
                .padding(.horizontal, 32)
            if let bush = activeBush {
                Label(bush.name, systemImage: "mappin.circle")
                    .font(.caption).foregroundStyle(.secondary)
            }
            Spacer()
        }
        .frame(maxWidth: .infinity)
    }

    // MARK: Empty / error states

    private var noBushState: some View {
        ContentUnavailableView {
            Label("No Sugar Bushes", systemImage: "mappin.slash")
        } description: {
            Text("Add your first bush in the Bushes tab to receive sap run forecasts.")
        }
    }

    private var loadingState: some View {
        VStack(spacing: 16) {
            ProgressView().scaleEffect(1.4)
            Text("Loading forecast…").foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private func errorState(message: String) -> some View {
        ContentUnavailableView {
            Label("No Forecast Available", systemImage: "exclamationmark.triangle")
        } description: {
            Text(message)
        } actions: {
            Button("Try Again") {
                Task {
                    guard let bush = activeBush else { return }
                    await forecast.load(bush: bush, forceRefresh: true)
                }
            }
            .buttonStyle(.bordered)
        }
    }

    // MARK: Offline banner

    private func offlineBanner(fetchedAt: Date) -> some View {
        HStack(spacing: 6) {
            Image(systemName: "wifi.slash")
            Text("Offline — data from \(fetchedAt, style: .relative) ago")
                .font(.caption)
        }
        .foregroundStyle(.orange)
        .padding(.horizontal, 16)
        .padding(.vertical, 8)
        .background(Color.orange.opacity(0.12))
        .clipShape(.capsule)
    }

    // MARK: Toolbar

    @ToolbarContentBuilder
    private var toolbarContent: some ToolbarContent {
        ToolbarItem(placement: .topBarLeading) {
            if let bush = activeBush {
                Button { showBushPicker = true } label: {
                    HStack(spacing: 4) {
                        Image(systemName: "mappin.circle.fill").foregroundStyle(.mapleAmber)
                        Text(bush.name).fontWeight(.semibold)
                        Image(systemName: "chevron.down").font(.caption2)
                    }
                    .foregroundStyle(.primary)
                }
            }
        }
        ToolbarItem(placement: .topBarTrailing) {
            if forecast.isLoading {
                ProgressView()
            } else if forecast.isOffline {
                Image(systemName: "wifi.slash").foregroundStyle(.orange)
            }
        }
    }
}
