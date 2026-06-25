import SwiftUI

struct WeekStripView: View {
    let days: [ForecastDay]

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("7-DAY FORECAST")
                .font(.caption).fontWeight(.semibold)
                .foregroundStyle(.secondary).tracking(1)
                .padding(.horizontal)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 10) {
                    ForEach(days) { day in
                        WeekDayCell(day: day)
                    }
                }
                .padding(.horizontal)
                .padding(.vertical, 4)
            }
        }
    }
}

private struct WeekDayCell: View {
    let day: ForecastDay

    var body: some View {
        VStack(spacing: 6) {
            Text(day.shortDay)
                .font(.caption2)
                .foregroundStyle(.secondary)

            ZStack {
                Circle()
                    .stroke(scoreColor(day.mapleScore).opacity(0.25), lineWidth: 3)
                Circle()
                    .trim(from: 0, to: CGFloat(max(day.mapleScore, 3)) / 100)
                    .stroke(scoreColor(day.mapleScore),
                            style: StrokeStyle(lineWidth: 3, lineCap: .round))
                    .rotationEffect(.degrees(-90))
                    .animation(.easeOut(duration: 0.6), value: day.mapleScore)
                Text("\(day.mapleScore)")
                    .font(.caption).fontWeight(.bold)
                    .foregroundStyle(scoreColor(day.mapleScore))
            }
            .frame(width: 48, height: 48)

            Group {
                if day.freezeThaw {
                    Image(systemName: "thermometer.sun.fill")
                        .font(.caption2).foregroundStyle(.green)
                } else {
                    Color.clear
                }
            }
            .frame(height: 14)
        }
        .padding(8)
        .background(Color(.secondarySystemBackground))
        .clipShape(.rect(cornerRadius: 12))
    }
}
