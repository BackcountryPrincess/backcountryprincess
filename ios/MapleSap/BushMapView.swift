import SwiftUI
import MapKit

struct BushMapView: View {
    let bushes: [Bush]
    let activeBushID: String
    let onSelect: (Bush) -> Void

    @State private var region = MKCoordinateRegion(
        center: CLLocationCoordinate2D(latitude: 46.57, longitude: -81.32),
        span: MKCoordinateSpan(latitudeDelta: 0.5, longitudeDelta: 0.5)
    )

    var body: some View {
        Map {
            ForEach(bushes) { bush in
                Annotation(bush.name, coordinate: CLLocationCoordinate2D(
                    latitude: bush.latitude,
                    longitude: bush.longitude
                )) {
                    Button { onSelect(bush) } label: {
                        ZStack {
                            Circle()
                                .fill(bush.id.uuidString == activeBushID ? Color.mapleAmber : Color(.systemGray3))
                                .frame(width: 36, height: 36)
                            Image(systemName: "leaf.fill")
                                .font(.caption).foregroundStyle(.white)
                        }
                        .shadow(radius: 3)
                    }
                }
            }
        }
        .onAppear { centerOnBushes() }
        .onChange(of: bushes.count) { _, _ in centerOnBushes() }
    }

    private func centerOnBushes() {
        guard !bushes.isEmpty else { return }
        let lats = bushes.map { $0.latitude }
        let lons = bushes.map { $0.longitude }
        let center = CLLocationCoordinate2D(
            latitude: (lats.min()! + lats.max()!) / 2,
            longitude: (lons.min()! + lons.max()!) / 2
        )
        let span = MKCoordinateSpan(
            latitudeDelta: max((lats.max()! - lats.min()!) * 1.5, 0.1),
            longitudeDelta: max((lons.max()! - lons.min()!) * 1.5, 0.1)
        )
        region = MKCoordinateRegion(center: center, span: span)
    }
}
