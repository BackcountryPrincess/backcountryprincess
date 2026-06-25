import Foundation
import SwiftData

@Model
final class Bush {
    var id: UUID
    var name: String
    var latitude: Double
    var longitude: Double
    var hectares: Double?
    var tapCount: Int?
    var notes: String
    var isDefault: Bool
    var createdAt: Date

    init(name: String, latitude: Double, longitude: Double) {
        self.id = UUID()
        self.name = name
        self.latitude = latitude
        self.longitude = longitude
        self.notes = ""
        self.isDefault = false
        self.createdAt = Date()
    }
}
