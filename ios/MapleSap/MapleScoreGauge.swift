import SwiftUI

struct MapleScoreGauge: View {
    let score: Int
    let subtitle: String

    var body: some View {
        VStack(spacing: 4) {
            Text(subtitle)
                .font(.subheadline)
                .foregroundStyle(.secondary)

            ZStack {
                Circle()
                    .stroke(Color(.systemGray5), lineWidth: 18)

                Circle()
                    .trim(from: 0, to: CGFloat(score) / 100)
                    .stroke(
                        LinearGradient(
                            colors: [scoreColor(score).opacity(0.55), scoreColor(score)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ),
                        style: StrokeStyle(lineWidth: 18, lineCap: .round)
                    )
                    .rotationEffect(.degrees(-90))
                    .animation(.easeOut(duration: 0.9), value: score)

                VStack(spacing: 2) {
                    Text("\(score)")
                        .font(.system(size: 64, weight: .black, design: .rounded))
                        .foregroundStyle(scoreColor(score))
                    Text(scoreLabel(score))
                        .font(.headline)
                        .foregroundStyle(.primary)
                    Text("Maple Score")
                        .font(.caption)
                        .foregroundStyle(.tertiary)
                }
            }
            .frame(width: 210, height: 210)
        }
    }
}
