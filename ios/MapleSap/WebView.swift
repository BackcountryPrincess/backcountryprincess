import SwiftUI

// MARK: - Brand Colors

extension Color {
    static let mapleAmber = Color(red: 200 / 255, green: 115 / 255, blue: 26 / 255)
}

// Allows `.mapleAmber` in .foregroundStyle(), .tint(), .fill() etc.
extension ShapeStyle where Self == Color {
    static var mapleAmber: Color { .init(red: 200 / 255, green: 115 / 255, blue: 26 / 255) }
}

// MARK: - Score Utilities

func scoreColor(_ score: Int) -> Color {
    switch score {
    case 80...100: return .green
    case 60 ..< 80: return .mapleAmber
    case 40 ..< 60: return .orange
    default:        return Color(.systemGray3)
    }
}

func scoreLabel(_ score: Int) -> String {
    switch score {
    case 80...100: return "Exceptional"
    case 60 ..< 80: return "Good"
    case 40 ..< 60: return "Fair"
    case 1 ..< 40:  return "Slow"
    default:        return "Off Season"
    }
}
