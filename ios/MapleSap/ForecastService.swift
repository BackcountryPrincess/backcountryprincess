import Foundation
import Observation

@Observable
final class ForecastService {
    // Published state
    var allDays: [ForecastDay] = []
    var isLoading = false
    var loadError: String?
    var fetchedAt: Date?
    var isOffline = false

    // Derived views — computed so they always reflect allDays
    var days7:  [ForecastDay] { Array(allDays.prefix(7)) }
    var days14: [ForecastDay] { Array(allDays.prefix(14)) }

    var isOffSeason: Bool {
        !allDays.isEmpty && allDays.prefix(7).allSatisfy { $0.mapleScore == 0 && !$0.freezeThaw }
    }

    var nextFreezeThawDay: ForecastDay? {
        days7.dropFirst().first { $0.freezeThaw }
    }

    var nextExceptionalDay: ForecastDay? {
        days7.dropFirst().first { $0.mapleScore >= 80 }
    }

    private let apiClient = ForecastAPIClient()
    private let cache = ForecastCache()
    private var loadingBushID: UUID?

    @MainActor
    func load(bush: Bush, forceRefresh: Bool = false) async {
        let bushID = bush.id
        loadingBushID = bushID

        // Serve from cache when fresh and not forced
        if !forceRefresh, let cached = cache.load(bushID: bushID), !cached.isExpired {
            allDays  = cached.days
            fetchedAt = cached.fetchedAt
            isOffline = false
            loadError = nil
            return
        }

        isLoading = true
        loadError = nil

        do {
            let fetched = try await apiClient.fetchForecast(
                latitude: bush.latitude,
                longitude: bush.longitude
            )

            guard loadingBushID == bushID else { return }

            let entry = ForecastCacheEntry(
                bushID: bushID,
                latitude: bush.latitude,
                longitude: bush.longitude,
                fetchedAt: Date(),
                days: fetched
            )
            cache.save(entry)

            allDays   = fetched
            fetchedAt = Date()
            isOffline = false
        } catch {
            guard loadingBushID == bushID else { return }

            // Fall back to stale cache rather than blank screen
            if let cached = cache.load(bushID: bushID) {
                allDays   = cached.days
                fetchedAt = cached.fetchedAt
                isOffline = true
            } else {
                loadError = error.localizedDescription
            }
        }

        isLoading = false
    }

    func clearForBush(_ bushID: UUID) {
        cache.clear(bushID: bushID)
        if loadingBushID == bushID {
            allDays   = []
            fetchedAt = nil
            isOffline = false
            loadError = nil
        }
    }
}
