import SwiftUI
import SwiftData
import CoreLocation

// MARK: - Root Onboarding Container

struct OnboardingView: View {
    @AppStorage("ms_onboardingComplete") private var onboardingComplete = false
    @State private var page = 0

    var body: some View {
        TabView(selection: $page) {
            WelcomePage(page: $page).tag(0)
            LocationPage(page: $page).tag(1)
            NotificationPage(page: $page).tag(2)
            FirstBushPage { onboardingComplete = true }.tag(3)
        }
        .tabViewStyle(.page)
        .indexViewStyle(.page(backgroundDisplayMode: .always))
        .ignoresSafeArea()
    }
}

// MARK: - Page 1: Welcome

private struct WelcomePage: View {
    @Binding var page: Int

    var body: some View {
        VStack(spacing: 32) {
            Spacer()
            Image(systemName: "leaf.circle.fill")
                .font(.system(size: 100))
                .foregroundStyle(.mapleAmber)
            VStack(spacing: 12) {
                Text("MapleSAP")
                    .font(.largeTitle).fontWeight(.black)
                Text("Sap Run Intelligence")
                    .font(.title3).foregroundStyle(.secondary)
                Text("Know when the sap will run — before it does.\nFreeze-thaw forecasts for your sugar bushes.")
                    .multilineTextAlignment(.center)
                    .foregroundStyle(.secondary)
                    .padding(.horizontal, 24)
            }
            Spacer()
            Button("Get Started") { withAnimation { page = 1 } }
                .buttonStyle(.borderedProminent)
                .tint(.mapleAmber)
                .foregroundStyle(.black)
                .controlSize(.large)
                .padding(.bottom, 60)
        }
        .padding()
    }
}

// MARK: - Page 2: Location

private struct LocationPage: View {
    @Binding var page: Int
    @State private var requested = false
    @StateObject private var loc = OnboardingLocationManager()

    var body: some View {
        VStack(spacing: 32) {
            Spacer()
            Image(systemName: "location.circle.fill")
                .font(.system(size: 100))
                .foregroundStyle(.mapleAmber)
            VStack(spacing: 12) {
                Text("Precise Forecasts")
                    .font(.title).fontWeight(.bold).multilineTextAlignment(.center)
                Text("MapleSAP uses your location to generate sap run forecasts for your exact sugar bush sites — not a regional average.")
                    .multilineTextAlignment(.center)
                    .foregroundStyle(.secondary)
                    .padding(.horizontal, 24)
            }
            Spacer()
            VStack(spacing: 12) {
                Button("Enable Location Access") {
                    requested = true
                    loc.requestOnce()
                }
                .buttonStyle(.borderedProminent)
                .tint(.mapleAmber)
                .foregroundStyle(.black)
                .controlSize(.large)
                .disabled(requested)

                Button("Skip") { withAnimation { page = 2 } }
                    .foregroundStyle(.secondary)
            }
            .padding(.bottom, 60)
        }
        .padding()
        .onChange(of: requested) { _, _ in
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) {
                withAnimation { page = 2 }
            }
        }
    }
}

// MARK: - Page 3: Notifications

private struct NotificationPage: View {
    @Binding var page: Int
    @State private var requested = false

    var body: some View {
        VStack(spacing: 32) {
            Spacer()
            Image(systemName: "bell.circle.fill")
                .font(.system(size: 100))
                .foregroundStyle(.mapleAmber)
            VStack(spacing: 12) {
                Text("Never Miss a Run")
                    .font(.title).fontWeight(.bold).multilineTextAlignment(.center)
                Text("MapleSAP sends a morning alert before freeze-thaw events and exceptional sap run days.")
                    .multilineTextAlignment(.center)
                    .foregroundStyle(.secondary)
                    .padding(.horizontal, 24)
            }
            Spacer()
            VStack(spacing: 12) {
                Button("Enable Alerts") {
                    requested = true
                    Task {
                        _ = await NotificationService.shared.requestPermission()
                        await MainActor.run { withAnimation { page = 3 } }
                    }
                }
                .buttonStyle(.borderedProminent)
                .tint(.mapleAmber)
                .foregroundStyle(.black)
                .controlSize(.large)
                .disabled(requested)

                Button("Skip") { withAnimation { page = 3 } }
                    .foregroundStyle(.secondary)
            }
            .padding(.bottom, 60)
        }
        .padding()
    }
}

// MARK: - Page 4: First Bush

struct FirstBushPage: View {
    let onComplete: () -> Void

    @Environment(\.modelContext) private var modelContext
    @Query private var allBushes: [Bush]

    @State private var name = ""
    @State private var latitude = ""
    @State private var longitude = ""
    @State private var inputError: String?
    @State private var isLocating = false
    @StateObject private var loc = OnboardingLocationManager()

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                Spacer(minLength: 40)

                Image(systemName: "mappin.circle.fill")
                    .font(.system(size: 80))
                    .foregroundStyle(.mapleAmber)

                Text("Add Your First Bush")
                    .font(.title).fontWeight(.bold)

                Text("Enter a name and coordinates for your sugar bush. You can add more later in the Bushes tab.")
                    .multilineTextAlignment(.center)
                    .foregroundStyle(.secondary)
                    .padding(.horizontal, 24)

                VStack(spacing: 10) {
                    TextField("Bush Name (e.g., East Ridge)", text: $name)
                        .padding(12)
                        .background(Color(.secondarySystemBackground))
                        .clipShape(.rect(cornerRadius: 10))

                    HStack(spacing: 8) {
                        TextField("Latitude", text: $latitude)
                            .keyboardType(.decimalPad)
                            .padding(12)
                            .background(Color(.secondarySystemBackground))
                            .clipShape(.rect(cornerRadius: 10))

                        TextField("Longitude", text: $longitude)
                            .keyboardType(.decimalPad)
                            .padding(12)
                            .background(Color(.secondarySystemBackground))
                            .clipShape(.rect(cornerRadius: 10))
                    }

                    Button {
                        isLocating = true
                        loc.requestOnce { result in
                            isLocating = false
                            if case .success(let l) = result {
                                latitude  = String(format: "%.6f", l.coordinate.latitude)
                                longitude = String(format: "%.6f", l.coordinate.longitude)
                            }
                        }
                    } label: {
                        Label(isLocating ? "Locating…" : "Use Current Location",
                              systemImage: "location.fill")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.bordered)
                    .tint(.mapleAmber)
                    .disabled(isLocating)

                    if let err = inputError {
                        Text(err).font(.caption).foregroundStyle(.red)
                    }
                }
                .padding(.horizontal)

                VStack(spacing: 12) {
                    Button("Add Bush & Start") { saveAndComplete() }
                        .buttonStyle(.borderedProminent)
                        .tint(.mapleAmber)
                        .foregroundStyle(.black)
                        .controlSize(.large)

                    Button("Skip — add later") { onComplete() }
                        .foregroundStyle(.secondary)
                        .font(.subheadline)
                }
                .padding(.bottom, 60)
            }
            .padding()
        }
    }

    private func saveAndComplete() {
        inputError = nil
        let trimmed = name.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty else { inputError = "Enter a name for your bush."; return }

        let lat: Double
        let lon: Double

        if latitude.isEmpty && longitude.isEmpty {
            // Use Levack, ON as a maple-country default so the forecast is meaningful
            lat = 46.57
            lon = -81.32
        } else {
            guard let la = Double(latitude), let lo = Double(longitude),
                  la >= -90, la <= 90, lo >= -180, lo <= 180
            else { inputError = "Enter valid latitude and longitude."; return }
            lat = la
            lon = lo
        }

        let bush = Bush(name: trimmed, latitude: lat, longitude: lon)
        bush.isDefault = true
        modelContext.insert(bush)
        onComplete()
    }
}

// MARK: - Lightweight location helper for onboarding

final class OnboardingLocationManager: NSObject, ObservableObject, CLLocationManagerDelegate {
    private let manager = CLLocationManager()
    private var completion: ((Result<CLLocation, Error>) -> Void)?

    override init() {
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyHundredMeters
    }

    /// One-shot location request (no completion = just trigger permission dialog).
    func requestOnce(_ completion: ((Result<CLLocation, Error>) -> Void)? = nil) {
        self.completion = completion
        switch manager.authorizationStatus {
        case .notDetermined:
            manager.requestWhenInUseAuthorization()
        case .authorizedWhenInUse, .authorizedAlways:
            manager.requestLocation()
        default:
            completion?(.failure(LocError.denied))
        }
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let loc = locations.first else { return }
        completion?(.success(loc))
        completion = nil
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        completion?(.failure(error))
        completion = nil
    }

    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        switch manager.authorizationStatus {
        case .authorizedWhenInUse, .authorizedAlways:
            manager.requestLocation()
        case .denied, .restricted:
            completion?(.failure(LocError.denied))
            completion = nil
        default: break
        }
    }

    enum LocError: LocalizedError {
        case denied
        var errorDescription: String? {
            "Location access is disabled. You can enable it in Settings → MapleSAP → Location."
        }
    }
}
