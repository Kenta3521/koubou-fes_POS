import SwiftUI

struct ContentView: View {
    @Environment(AuthViewModel.self) private var authVM

    var body: some View {
        Group {
            switch authVM.appState {
            case .loading:
                // 起動時JWT検証中
                ProgressView()
                    .scaleEffect(1.5)
                    .task { await authVM.checkAuthOnStartup() }

            case .login:
                LoginView()

            case .orgSelect:
                OrganizationSelectView()

            case .main:
                POSTabView()
            }
        }
    }
}

#Preview {
    ContentView()
        .environment(AuthViewModel())
}
