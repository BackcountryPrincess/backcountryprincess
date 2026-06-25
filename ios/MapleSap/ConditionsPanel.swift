import SwiftUI

struct ConditionsPanel: View {
    let day: ForecastDay
    let tempUnit: String

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("CONDITIONS")
                .font(.caption).fontWeight(.semibold)
                .foregroundStyle(.secondary).tracking(1)

            LazyVGrid(
                columns: [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())],
                spacing: 10
            ) {
                ConditionCell(icon: "thermometer.high",    label: "High",   value: temp(day.tempMax))
                ConditionCell(icon: "thermometer.low",     label: "Low",    value: temp(day.tempMin))
                ConditionCell(icon: "arrow.up.arrow.down", label: "Swing",
                              value: day.temperatureSwing.map { String(format: "%.1f°", $0) } ?? "—")
                ConditionCell(icon: "sun.max.fill",        label: "Solar",
                              value: day.solarStrength.map { "\($0)%" } ?? "—")
                ConditionCell(icon: "snowflake",           label: "Snow",
                              value: day.snowDepthCm.map { "\($0) cm" } ?? "—")
                ConditionCell(icon: "leaf.fill",           label: "Soil",
                              value: day.soilThawState?.capitalized ?? "—")
            }

            if day.freezeThaw {
                HStack(spacing: 6) {
                    Image(systemName: "checkmark.circle.fill").foregroundStyle(.green)
                    Text("Freeze-thaw confirmed — sap flow possible")
                        .font(.subheadline).foregroundStyle(.green)
                }
                .padding(10)
                .background(Color.green.opacity(0.10))
                .clipShape(.rect(cornerRadius: 10))
            }
        }
        .padding(16)
        .background(Color(.secondarySystemBackground))
        .clipShape(.rect(cornerRadius: 16))
    }

    private func temp(_ c: Double?) -> String {
        guard let c else { return "—" }
        return tempUnit == "F"
            ? String(format: "%.0f°F", c * 9 / 5 + 32)
            : String(format: "%.1f°C", c)
    }
}

struct ConditionCell: View {
    let icon: String
    let label: String
    let value: String

    var body: some View {
        VStack(spacing: 4) {
            Image(systemName: icon)
                .font(.title3).foregroundStyle(.mapleAmber)
            Text(value)
                .font(.subheadline).fontWeight(.semibold)
            Text(label)
                .font(.caption2).foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 8)
    }
}
