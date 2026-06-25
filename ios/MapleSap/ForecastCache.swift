import Foundation

struct ForecastCacheEntry: Codable {
    let bushID: UUID
    let latitude: Double
    let longitude: Double
    let fetchedAt: Date
    let days: [ForecastDay]

    var isExpired: Bool {
        Date().timeIntervalSince(fetchedAt) > 7_200  // 2 hours
    }
}

struct ForecastCache {
    private let cacheDir: URL

    init() {
        let base = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
        cacheDir = base.appendingPathComponent("maplesap", isDirectory: true)
        try? FileManager.default.createDirectory(at: cacheDir, withIntermediateDirectories: true)
    }

    func load(bushID: UUID) -> ForecastCacheEntry? {
        guard let data = try? Data(contentsOf: cacheURL(for: bushID)) else { return nil }
        return try? JSONDecoder().decode(ForecastCacheEntry.self, from: data)
    }

    func save(_ entry: ForecastCacheEntry) {
        guard let data = try? JSONEncoder().encode(entry) else { return }
        try? data.write(to: cacheURL(for: entry.bushID), options: .atomic)
    }

    func clear(bushID: UUID) {
        try? FileManager.default.removeItem(at: cacheURL(for: bushID))
    }

    private func cacheURL(for bushID: UUID) -> URL {
        cacheDir.appendingPathComponent("forecast_\(bushID.uuidString).json")
    }
}
