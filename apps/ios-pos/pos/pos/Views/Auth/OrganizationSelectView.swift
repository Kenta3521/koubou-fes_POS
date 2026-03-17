import SwiftUI

struct OrganizationSelectView: View {
    @Environment(AuthViewModel.self) private var authVM

    var body: some View {
        NavigationStack {
            Group {
                if organizations.isEmpty {
                    ContentUnavailableView(
                        "所属団体がありません",
                        systemImage: "building.2",
                        description: Text("管理者に連絡して団体への追加を依頼してください")
                    )
                } else {
                    List(organizations) { org in
                        Button {
                            authVM.selectOrganization(id: org.id)
                        } label: {
                            HStack {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(org.name)
                                        .font(.headline)
                                        .foregroundStyle(org.isActive ? .primary : .secondary)

                                    if !org.isActive {
                                        Text("現在無効")
                                            .font(.caption)
                                            .foregroundStyle(Color.appError)
                                    }
                                }
                                Spacer()
                                Image(systemName: "chevron.right")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                        .disabled(!org.isActive)
                    }
                }
            }
            .navigationTitle("団体を選択")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("ログアウト", role: .destructive) {
                        authVM.logout()
                    }
                    .font(.caption)
                }
            }
        }
    }

    /// 通常ユーザー: 自分の所属団体 / systemAdmin: 全団体
    private var organizations: [AnyOrganization] {
        guard let user = authVM.currentUser else { return [] }

        if user.isSystemAdmin {
            return authVM.adminOrganizations.map { AnyOrganization(id: $0.id, name: $0.name, isActive: $0.isActive) }
        } else {
            return user.organizations.map { AnyOrganization(id: $0.id, name: $0.name, isActive: $0.isActive) }
        }
    }
}

// MARK: - Internal helper

private struct AnyOrganization: Identifiable {
    let id: String
    let name: String
    let isActive: Bool
}

#Preview {
    OrganizationSelectView()
        .environment(AuthViewModel())
}
