import SwiftUI
import SwiftData

struct ForecastView: View {
    @Environment(ForecastService.self) private var forecast
    @Query(sort: \Bush.createdAt)
    private var bushes: [Bush]

    @AppStorage("ms_forecastDays")    private var forecastDays = 7
    @AppStorage("ms_temperatureUnit") private var tempUnit     = "C"
    @AppStorage("ms_activeBushID")    private var activeBushID = ""

    private var activeBush: Bush? {
        if let id = UUID(uuidString: activeBushID) {
            return bushes.first { $0.id == id }
        }
        return bushes.first(where: \.isDefault) ?? bushes.first
    }

    private var displayDays: [ForecastDay] {
        forecastDays == 14 ? forecast.days14 : forecast.days7
    }

    var body: some View {
        NavigationStack {
            Group {
                if bushes.isEmpty {
                    ContentUnavailableView(
                        "No Sugar Bushes",
                        systemImage: "mappin.slash",
                        description: Text("Add a bush in the Bushes tab to see forecasts.")
                    )
                } else if forecast.isLoading && displayDays.isEmpty {
                    VStack(spacing: 14) {
                        ProgressView().scaleEffect(1.3)
                        Text("Loading forecast…").foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if let err = forecast.loadError, displayDays.isEmpty {
                    ContentUnavailableView(
                        "No Forecast",
                        systemImage: "exclamationmark.triangle",
                        description: Text(err)
                    )
                } else {
                    forecastList
                }
            }
            .navigationTitle("Forecast")
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Picker("", selection: $forecastDays) {
                        Text("7 Day").tag(7)
                        Text("14 Day").tag(14)
                    }
                    .pickerStyle(.segmented)
                    .frame(width: 130)
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Picker("°", selection: $tempUnit) {
                        Text("°C").tag("C")
                        Text("°F").tag("F")
                    }
                    .pickerStyle(.segmented)
                    .frame(width: 82)
                }
            }
        }
        .task(id: "\(activeBush?.id.uuidString ?? "")") {
            guard let bush = activeBush else { return }
            await forecast.load(bush: bush)
        }
    }

    private var forecastList: some View {
        List {
            if forecast.isOffline, let at = forecast.fetchedAt {
                Section {
                    Label(
                        "Offline — last updated \(at.formatted(date: .abbreviated, time: .shortened))",
                        systemImage: "wifi.slash"
                    )
                    .font(.caption)
                    .foregroundStyle(.orange)
                }
            }

            ForEach(displayDays) { day in
                ForecastDayRow(day: day, tempUnit: tempUnit)
                    .listRowBackground(Color.clear)
                    .listRowSeparator(.hidden)
                    .listRowInsets(EdgeInsets(top: 4, leading: 16, bottom: 4, trailing: 16))
            }
        }
        .listStyle(.plain)
        .refreshable {
            guard let bush = activeBush else { return }
            await forecast.load(bush: bush, forceRefresh: true)
        }
    }
}
