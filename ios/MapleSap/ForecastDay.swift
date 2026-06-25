import Foundation

struct ForecastDay: Codable, Identifiable, Hashable {
    var id: String { date }

    let date: String
    let conditionsScore: Int
    let flowStrengthScore: Int
    let flowStatusScore: Int
    let mapleScore: Int
    let freezeThaw: Bool
    let temperatureSwing: Double?
    let tempMax: Double?
    let tempMin: Double?
    let solarStrength: Int?
    let sunExposure: Int?
    let snowDepthCm: Int?
    let soilTemperature0cm: Double?
    let soilMoisture: Double?
    let positiveStreak: Int
    let negativeStreak: Int
    let seasonProgression: Int
    let snowpackState: String?
    let soilThawState: String?
    let soilMoistureState: String?

    enum CodingKeys: String, CodingKey {
        case date
        case conditionsScore   = "conditions_score"
        case flowStrengthScore = "flow_strength_score"
        case flowStatusScore   = "flow_status_score"
        case mapleScore        = "maple_score"
        case freezeThaw        = "freeze_thaw"
        case temperatureSwing  = "temperature_swing"
        case tempMax           = "temp_max"
        case tempMin           = "temp_min"
        case solarStrength     = "solar_strength"
        case sunExposure       = "sun_exposure"
        case snowDepthCm       = "snow_depth_cm"
        case soilTemperature0cm = "soil_temperature_0cm"
        case soilMoisture      = "soil_moisture"
        case positiveStreak    = "positive_streak"
        case negativeStreak    = "negative_streak"
        case seasonProgression = "season_progression"
        case snowpackState     = "snowpack_state"
        case soilThawState     = "soil_thaw_state"
        case soilMoistureState = "soil_moisture_state"
    }

    var scoreLabel: String {
        switch mapleScore {
        case 80...100: return "Exceptional"
        case 60 ..< 80: return "Good"
        case 40 ..< 60: return "Fair"
        case 1 ..< 40:  return "Slow"
        default:        return "Off Season"
        }
    }

    var displayDate: String {
        let parse = DateFormatter()
        parse.dateFormat = "yyyy-MM-dd"
        guard let d = parse.date(from: date) else { return date }
        let fmt = DateFormatter()
        fmt.dateFormat = "EEE MMM d"
        return fmt.string(from: d)
    }

    var shortDay: String {
        let parse = DateFormatter()
        parse.dateFormat = "yyyy-MM-dd"
        guard let d = parse.date(from: date) else { return date }
        let fmt = DateFormatter()
        fmt.dateFormat = "EEE"
        return fmt.string(from: d)
    }

    var isOffSeason: Bool {
        mapleScore == 0 && !freezeThaw && seasonProgression <= 5
    }
}
