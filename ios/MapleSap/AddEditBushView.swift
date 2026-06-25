import SwiftUI
import SwiftData
import CoreLocation
import MapKit

struct AddEditBushView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var modelContext
    @Environment(ForecastService.self) private var forecastService

    var bush: Bush? // nil = add mode

    @State private var name       = ""
    @State private var latText    = ""
    @State private var lonText    = ""
    @State private var hectares   = ""
    @State private var tapCount   = ""
    @State private var notes      = ""
    @State private var isDefault  = false
    @State private var inputError: String?
    @State private var isLocating = false
    @State private var searchText = ""
    @State private var searchResults: [MKLocalSearchCompletion] = []
    @StateObject private var locManager = AddBushLocationManager()
    @StateObject private var completer  = SearchCompleter()

    var body: some View {
        NavigationStack {
            Form {
                Section("Bush Details") {
                    TextField("Name (e.g., North Forty)", text: $name)

                    VStack(alignment: .leading, spacing: 6) {
                        Text("Location").font(.caption).foregroundStyle(.secondary)

                        HStack(spacing: 8) {
                            TextField("Latitude",  text: $latText).keyboardType(.decimalPad)
                            TextField("Longitude", text: $lonText).keyboardType(.decimalPad)
                        }

                        Button {
                            isLocating = true
                            locManager.requestOnce { result in
                                isLocating = false
                                if case .success(let loc) = result {
                                    latText = String(format: "%.6f", loc.coordinate.latitude)
                                    lonText = String(format: "%.6f", loc.coordinate.longitude)
                                }
                            }
                        } label: {
                            Label(isLocating ? "Locating…" : "Use Current Location",
                                  systemImage: "location.fill")
                        }
                        .disabled(isLocating)
                        .foregroundStyle(.mapleAmber)
                    }

                    // Address search
                    TextField("Search Address", text: $searchText)
                        .onChange(of: searchText) { _, q in completer.search(q) }

                    if !completer.results.isEmpty {
                        ForEach(completer.results, id: \.self) { result in
                            Button {
                                geocode(result)
                                searchText = ""
                            } label: {
                                VStack(alignment: .leading) {
                                    Text(result.title).foregroundStyle(.primary)
                                    Text(result.subtitle).font(.caption).foregroundStyle(.secondary)
                                }
                            }
                        }
                    }
                }

                Section("Optional Details") {
                    HStack {
                        Text("Hectares")
                        Spacer()
                        TextField("e.g. 12.5", text: $hectares)
                            .keyboardType(.decimalPad)
                            .multilineTextAlignment(.trailing)
                            .frame(width: 100)
                    }
                    HStack {
                        Text("Tap Count")
                        Spacer()
                        TextField("e.g. 400", text: $tapCount)
                            .keyboardType(.numberPad)
                            .multilineTextAlignment(.trailing)
                            .frame(width: 100)
                    }
                    Toggle("Default Bush", isOn: $isDefault)
                }

                Section("Notes") {
                    TextEditor(text: $notes)
                        .frame(minHeight: 80)
                }

                if let err = inputError {
                    Section {
                        Text(err).foregroundStyle(.red).font(.caption)
                    }
                }
            }
            .navigationTitle(bush == nil ? "Add Bush" : "Edit Bush")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") { save() }
                        .fontWeight(.semibold)
                }
            }
            .onAppear { loadExisting() }
        }
    }

    private func loadExisting() {
        guard let b = bush else { return }
        name       = b.name
        latText    = String(b.latitude)
        lonText    = String(b.longitude)
        hectares   = b.hectares.map { String($0) } ?? ""
        tapCount   = b.tapCount.map { String($0) } ?? ""
        notes      = b.notes
        isDefault  = b.isDefault
    }

    private func save() {
        inputError = nil
        let trimmed = name.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty else { inputError = "Enter a name for this bush."; return }
        guard let lat = Double(latText), let lon = Double(lonText),
              lat >= -90, lat <= 90, lon >= -180, lon <= 180
        else { inputError = "Enter valid latitude and longitude values."; return }

        if let existing = bush {
            if isDefault { existing.isDefault = true }
            existing.name      = trimmed
            existing.latitude  = lat
            existing.longitude = lon
            existing.hectares  = Double(hectares)
            existing.tapCount  = Int(tapCount)
            existing.notes     = notes
            existing.isDefault = isDefault
            forecastService.clearForBush(existing.id)
        } else {
            let b = Bush(name: trimmed, latitude: lat, longitude: lon)
            b.hectares  = Double(hectares)
            b.tapCount  = Int(tapCount)
            b.notes     = notes
            b.isDefault = isDefault
            modelContext.insert(b)
        }
        dismiss()
    }

    private func geocode(_ result: MKLocalSearchCompletion) {
        let req = MKLocalSearch.Request(completion: result)
        MKLocalSearch(request: req).start { resp, _ in
            guard let item = resp?.mapItems.first else { return }
            let coord = item.placemark.coordinate
            latText = String(format: "%.6f", coord.latitude)
            lonText = String(format: "%.6f", coord.longitude)
            completer.results = []
        }
    }
}

// MARK: - CLLocationManager delegate wrapper

final class AddBushLocationManager: NSObject, ObservableObject, CLLocationManagerDelegate {
    private let manager = CLLocationManager()
    private var completion: ((Result<CLLocation, Error>) -> Void)?

    override init() {
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyBest
    }

    func requestOnce(_ completion: @escaping (Result<CLLocation, Error>) -> Void) {
        self.completion = completion
        switch manager.authorizationStatus {
        case .notDetermined: manager.requestWhenInUseAuthorization()
        case .authorizedWhenInUse, .authorizedAlways: manager.requestLocation()
        default: completion(.failure(LocError.denied)); self.completion = nil
        }
    }

    func locationManager(_ m: CLLocationManager, didUpdateLocations locs: [CLLocation]) {
        if let l = locs.first { completion?(.success(l)); completion = nil }
    }

    func locationManager(_ m: CLLocationManager, didFailWithError error: Error) {
        completion?(.failure(error)); completion = nil
    }

    func locationManagerDidChangeAuthorization(_ m: CLLocationManager) {
        switch m.authorizationStatus {
        case .authorizedWhenInUse, .authorizedAlways: m.requestLocation()
        case .denied, .restricted: completion?(.failure(LocError.denied)); completion = nil
        default: break
        }
    }

    enum LocError: LocalizedError {
        case denied
        var errorDescription: String? {
            "Location access is off. Enable it in Settings → MapleSAP → Location."
        }
    }
}

// MARK: - MKLocalSearchCompleter wrapper

final class SearchCompleter: NSObject, ObservableObject, MKLocalSearchCompleterDelegate {
    private let completer = MKLocalSearchCompleter()
    @Published var results: [MKLocalSearchCompletion] = []

    override init() {
        super.init()
        completer.delegate = self
        completer.resultTypes = .address
    }

    func search(_ query: String) {
        if query.isEmpty { results = []; return }
        completer.queryFragment = query
    }

    func completerDidUpdateResults(_ c: MKLocalSearchCompleter) {
        results = Array(c.results.prefix(5))
    }

    func completer(_ c: MKLocalSearchCompleter, didFailWithError _: Error) {
        results = []
    }
}
