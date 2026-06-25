import SwiftUI

struct ForecastDayRow: View {
    let day: ForecastDay
    let tempUnit: String

    @State private var expanded = false

    var body: some View {
        VStack(spacing: 0) {
            // Collapsed header — always visible
            Button {
                withAnimation(.easeInOut(duration: 0.22)) { expanded.toggle() }
            } label: {
                HStack(spacing: 12) {
                    // Day label + score
                    VStack(spacing: 1) {
                        Text(day.shortDay)
                            .font(.caption2).foregroundStyle(.secondary)
                        Text("\(day.mapleScore)")
                            .font(.title2).fontWeight(.bold)
                            .foregroundStyle(scoreColor(day.mapleScore))
                    }
                    .frame(width: 44)

                    // Score bar
                    GeometryReader { geo in
                        ZStack(alignment: .leading) {
                            RoundedRectangle(cornerRadius: 4)
                                .fill(Color(.systemGray5)).frame(height: 8)
                            RoundedRectangle(cornerRadius: 4)
                                .fill(scoreColor(day.mapleScore))
                                .frame(width: geo.size.width * CGFloat(max(day.mapleScore, 2)) / 100,
                                       height: 8)
                                .animation(.easeOut(duration: 0.5), value: day.mapleScore)
                        }
                    }
                    .frame(height: 8)

                    // Label + freeze-thaw indicator
                    VStack(alignment: .trailing, spacing: 2) {
                        Text(day.scoreLabel)
                            .font(.caption).fontWeight(.medium)
                            .foregroundStyle(scoreColor(day.mapleScore))
                        if day.freezeThaw {
                            Image(systemName: "thermometer.sun.fill")
                                .font(.caption2).foregroundStyle(.green)
                        }
                    }
                    .frame(width: 72)

                    Image(systemName: expanded ? "chevron.up" : "chevron.down")
                        .font(.caption2).foregroundStyle(.secondary)
                }
                .padding(14)
            }
            .buttonStyle(.plain)

            // Expanded detail
            if expanded {
                Divider().padding(.horizontal, 12)

                VStack(spacing: 10) {
                    // Ring scores
                    HStack(spacing: 8) {
                        ringPill("Conditions",    score: day.conditionsScore)
                        ringPill("Flow Strength", score: day.flowStrengthScore)
                        ringPill("Flow Status",   score: day.flowStatusScore)
                    }

                    // Temperatures
                    HStack(spacing: 16) {
                        Spacer()
                        Label(temp(day.tempMax), systemImage: "thermometer.high")
                        Label(temp(day.tempMin), systemImage: "thermometer.low")
                        if let sw = day.temperatureSwing {
                            Label(String(format: "%.1f°", sw), systemImage: "arrow.up.arrow.down")
                        }
                        Spacer()
                    }
                    .font(.caption).foregroundStyle(.secondary)

                    // Snow + season
                    HStack(spacing: 16) {
                        Spacer()
                        if let snow = day.snowDepthCm {
                            Label("\(snow) cm snow", systemImage: "snowflake")
                        }
                        Label("Season \(day.seasonProgression)%", systemImage: "calendar")
                        if day.positiveStreak > 1 {
                            Label("+\(day.positiveStreak) day streak", systemImage: "flame.fill")
                                .foregroundStyle(.orange)
                        }
                        Spacer()
                    }
                    .font(.caption).foregroundStyle(.secondary)
                }
                .padding(.horizontal, 14)
                .padding(.bottom, 12)
                .transition(.opacity.combined(with: .move(edge: .top)))
            }
        }
        .background(Color(.secondarySystemBackground))
        .clipShape(.rect(cornerRadius: 14))
    }

    private func ringPill(_ label: String, score: Int) -> some View {
        VStack(spacing: 2) {
            Text("\(score)")
                .font(.headline).fontWeight(.bold)
                .foregroundStyle(scoreColor(score))
            Text(label)
                .font(.caption2).foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 6)
        .background(scoreColor(score).opacity(0.10))
        .clipShape(.rect(cornerRadius: 8))
    }

    private func temp(_ c: Double?) -> String {
        guard let c else { return "—" }
        return tempUnit == "F"
            ? String(format: "%.0f°F", c * 9 / 5 + 32)
            : String(format: "%.0f°C", c)
    }
}
