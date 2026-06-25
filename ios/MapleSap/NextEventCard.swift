import SwiftUI

struct NextEventCard: View {
    let day: ForecastDay

    private var isExceptional: Bool { day.mapleScore >= 80 }

    var body: some View {
        HStack(spacing: 14) {
            Image(systemName: isExceptional ? "star.fill" : "thermometer.sun.fill")
                .font(.title2)
                .foregroundStyle(.mapleAmber)
                .frame(width: 44)

            VStack(alignment: .leading, spacing: 2) {
                Text("Next Event")
                    .font(.caption).foregroundStyle(.secondary).tracking(0.5)
                Text(isExceptional ? "Exceptional run expected" : "Freeze-thaw expected")
                    .font(.subheadline).fontWeight(.semibold)
                Text("\(day.displayDate)  ·  Score \(day.mapleScore)")
                    .font(.caption).foregroundStyle(.secondary)
            }

            Spacer()

            Text("\(day.mapleScore)")
                .font(.title).fontWeight(.black)
                .foregroundStyle(scoreColor(day.mapleScore))
        }
        .padding(14)
        .background(Color(.secondarySystemBackground))
        .clipShape(.rect(cornerRadius: 14))
    }
}
