import SwiftUI

struct RingScoreRow: View {
    let label: String
    let score: Int
    let icon: String
    let detail: String

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundStyle(scoreColor(score))
                .frame(width: 28)

            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text(label)
                        .font(.subheadline).fontWeight(.medium)
                    Spacer()
                    Text("\(score)")
                        .font(.subheadline).fontWeight(.bold)
                        .foregroundStyle(scoreColor(score))
                }

                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        RoundedRectangle(cornerRadius: 4)
                            .fill(Color(.systemGray5))
                            .frame(height: 6)
                        RoundedRectangle(cornerRadius: 4)
                            .fill(scoreColor(score))
                            .frame(width: geo.size.width * CGFloat(score) / 100, height: 6)
                            .animation(.easeOut(duration: 0.7), value: score)
                    }
                }
                .frame(height: 6)

                Text(detail)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(12)
        .background(Color(.secondarySystemBackground))
        .clipShape(.rect(cornerRadius: 12))
    }
}
