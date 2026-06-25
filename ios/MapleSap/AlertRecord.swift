import Foundation

struct AlertRecord: Codable, Identifiable {
    let id: String
    let type: AlertType
    let bushName: String
    let mapleScore: Int
    let date: String
    let scheduledAt: Date

    enum AlertType: String, Codable {
        case freezeThaw      = "freeze_thaw"
        case exceptionalRun  = "exceptional_run"
        case seasonStart     = "season_start"
        case seasonEnd       = "season_end"

        var displayName: String {
            switch self {
            case .freezeThaw:     return "Freeze-Thaw"
            case .exceptionalRun: return "Exceptional Run"
            case .seasonStart:    return "Season Start"
            case .seasonEnd:      return "Season End Warning"
            }
        }

        var systemImage: String {
            switch self {
            case .freezeThaw:     return "thermometer.sun.fill"
            case .exceptionalRun: return "star.fill"
            case .seasonStart:    return "leaf.fill"
            case .seasonEnd:      return "leaf.arrow.triangle.circlepath"
            }
        }
    }
}
