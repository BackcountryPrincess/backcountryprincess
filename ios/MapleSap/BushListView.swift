import SwiftUI
import SwiftData

struct BushListView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(ForecastService.self) private var forecastService
    @Query(sort: \Bush.createdAt)
    private var bushes: [Bush]

    @AppStorage("ms_activeBushID") private var activeBushID = ""
    @State private var showMap = false
    @State private var showAdd = false
    @State private var editingBush: Bush?
    @State private var confirmDelete: Bush?

    var body: some View {
        NavigationStack {
            Group {
                if showMap {
                    BushMapView(
                        bushes: bushes,
                        activeBushID: activeBushID
                    ) { bush in
                        activeBushID = bush.id.uuidString
                    }
                    .ignoresSafeArea(edges: .bottom)
                } else {
                    listView
                }
            }
            .navigationTitle("Sugar Bushes")
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button {
                        withAnimation { showMap.toggle() }
                    } label: {
                        Image(systemName: showMap ? "list.bullet" : "map")
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button { showAdd = true } label: {
                        Image(systemName: "plus")
                    }
                }
            }
            .sheet(isPresented: $showAdd) {
                AddEditBushView()
            }
            .sheet(item: $editingBush) { bush in
                AddEditBushView(bush: bush)
            }
            .confirmationDialog(
                "Delete \"\(confirmDelete?.name ?? "")\"?",
                isPresented: Binding(
                    get: { confirmDelete != nil },
                    set: { if !$0 { confirmDelete = nil } }
                ),
                titleVisibility: .visible
            ) {
                Button("Delete", role: .destructive) {
                    if let b = confirmDelete { deleteBush(b) }
                    confirmDelete = nil
                }
                Button("Cancel", role: .cancel) { confirmDelete = nil }
            }
        }
    }

    private var listView: some View {
        Group {
            if bushes.isEmpty {
                ContentUnavailableView {
                    Label("No Sugar Bushes", systemImage: "mappin.slash")
                } description: {
                    Text("Tap + to add your first bush.")
                } actions: {
                    Button("Add Bush") { showAdd = true }
                        .buttonStyle(.borderedProminent)
                        .tint(.mapleAmber)
                }
            } else {
                List {
                    ForEach(bushes) { bush in
                        BushCard(
                            bush: bush,
                            isActive: bush.id.uuidString == activeBushID
                                   || (activeBushID.isEmpty && bush.isDefault)
                        )
                        .onTapGesture { activeBushID = bush.id.uuidString }
                        .swipeActions(edge: .leading) {
                            Button {
                                editingBush = bush
                            } label: {
                                Label("Edit", systemImage: "pencil")
                            }
                            .tint(.mapleAmber)

                            Button {
                                setDefault(bush)
                            } label: {
                                Label("Default", systemImage: "star.fill")
                            }
                            .tint(.orange)
                        }
                        .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                            Button(role: .destructive) {
                                confirmDelete = bush
                            } label: {
                                Label("Delete", systemImage: "trash")
                            }
                        }
                        .listRowBackground(Color.clear)
                        .listRowSeparator(.hidden)
                        .listRowInsets(EdgeInsets(top: 4, leading: 16, bottom: 4, trailing: 16))
                    }
                }
                .listStyle(.plain)
            }
        }
    }

    private func setDefault(_ bush: Bush) {
        for b in bushes { b.isDefault = false }
        bush.isDefault = true
        activeBushID = bush.id.uuidString
    }

    private func deleteBush(_ bush: Bush) {
        forecastService.clearForBush(bush.id)
        if activeBushID == bush.id.uuidString {
            activeBushID = bushes.first(where: { $0.id != bush.id })?.id.uuidString ?? ""
        }
        modelContext.delete(bush)
    }
}

// MARK: - BushCard

struct BushCard: View {
    let bush: Bush
    let isActive: Bool

    var body: some View {
        HStack(spacing: 12) {
            ZStack {
                Circle()
                    .fill(isActive ? Color.mapleAmber : Color(.systemGray4))
                    .frame(width: 42, height: 42)
                Image(systemName: "leaf.fill")
                    .font(.body).foregroundStyle(.white)
            }

            VStack(alignment: .leading, spacing: 2) {
                HStack {
                    Text(bush.name).fontWeight(.semibold)
                    if bush.isDefault {
                        Image(systemName: "star.fill")
                            .font(.caption2).foregroundStyle(.mapleAmber)
                    }
                }
                Text(String(format: "%.4f, %.4f", bush.latitude, bush.longitude))
                    .font(.caption).foregroundStyle(.secondary)
                if let h = bush.hectares, let t = bush.tapCount {
                    Text("\(h, specifier: "%.1f") ha · \(t) taps")
                        .font(.caption2).foregroundStyle(.tertiary)
                } else if let h = bush.hectares {
                    Text("\(h, specifier: "%.1f") ha")
                        .font(.caption2).foregroundStyle(.tertiary)
                } else if let t = bush.tapCount {
                    Text("\(t) taps")
                        .font(.caption2).foregroundStyle(.tertiary)
                }
            }

            Spacer()

            if isActive {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundStyle(.mapleAmber)
            }
        }
        .padding(14)
        .background(
            isActive
                ? Color.mapleAmber.opacity(0.12)
                : Color(.secondarySystemBackground)
        )
        .clipShape(.rect(cornerRadius: 14))
        .overlay(
            isActive
                ? RoundedRectangle(cornerRadius: 14).stroke(Color.mapleAmber.opacity(0.4), lineWidth: 1)
                : nil
        )
    }
}

// MARK: - BushPickerSheet (used from TodayView / ForecastView toolbar)

struct BushPickerSheet: View {
    @Binding var activeBushID: String
    @Environment(\.dismiss) private var dismiss
    @Query(sort: \Bush.createdAt)
    private var bushes: [Bush]

    var body: some View {
        NavigationStack {
            List(bushes) { bush in
                Button {
                    activeBushID = bush.id.uuidString
                    dismiss()
                } label: {
                    HStack {
                        Label(bush.name, systemImage: bush.isDefault ? "star.fill" : "mappin.circle")
                            .foregroundStyle(.primary)
                        Spacer()
                        if bush.id.uuidString == activeBushID {
                            Image(systemName: "checkmark").foregroundStyle(.mapleAmber)
                        }
                    }
                }
            }
            .navigationTitle("Select Bush")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
        .presentationDetents([.medium])
    }
}
