import Foundation

struct ForecastAPIClient {
    private let baseURL = URL(string: "https://app.maplesap.app")!

    func fetchForecast(latitude: Double, longitude: Double) async throws -> [ForecastDay] {
        var components = URLComponents(
            url: baseURL.appendingPathComponent("api/forecast/v1"),
            resolvingAgainstBaseURL: false
        )!
        components.queryItems = [
            URLQueryItem(name: "latitude",  value: String(latitude)),
            URLQueryItem(name: "longitude", value: String(longitude)),
            URLQueryItem(name: "days",      value: "14"),
        ]
        guard let url = components.url else { throw ForecastError.badRequest }

        var request = URLRequest(url: url, timeoutInterval: 15)
        request.setValue("application/json", forHTTPHeaderField: "Accept")

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
            throw ForecastError.serverError
        }

        let decoded = try JSONDecoder().decode(ForecastResponse.self, from: data)
        guard decoded.ok else { throw ForecastError.serverError }
        return decoded.forecast
    }
}

private struct ForecastResponse: Codable {
    let ok: Bool
    let forecast: [ForecastDay]
}

enum ForecastError: Error, LocalizedError {
    case badRequest
    case serverError
    case noData

    var errorDescription: String? {
        switch self {
        case .badRequest:  return "Invalid forecast request."
        case .serverError: return "Unable to reach the forecast server."
        case .noData:      return "No forecast data available."
        }
    }
}
