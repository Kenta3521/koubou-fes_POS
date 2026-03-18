import SwiftUI

struct LoginView: View {
    @Environment(AuthViewModel.self) private var authVM

    @State private var email = ""
    @State private var password = ""
    @FocusState private var focusedField: Field?

    private enum Field { case email, password }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 32) {
                    // ロゴ・タイトル
                    VStack(spacing: 8) {
                        Image(systemName: "storefront")
                            .font(.system(size: 60))
                            .foregroundStyle(Color.appPrimary)

                        Text("光芒祭 POS")
                            .font(.largeTitle.bold())

                        Text("スタッフログイン")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                    .padding(.top, 40)

                    // 入力フォーム
                    VStack(spacing: 16) {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("メールアドレス")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            TextField("メールアドレスを入力", text: $email)
                                .keyboardType(.emailAddress)
                                .autocorrectionDisabled()
                                .textInputAutocapitalization(.never)
                                .focused($focusedField, equals: .email)
                                .submitLabel(.next)
                                .onSubmit { focusedField = .password }
                                .padding(12)
                                .background(.quaternary, in: RoundedRectangle(cornerRadius: 10))
                        }

                        VStack(alignment: .leading, spacing: 6) {
                            Text("パスワード")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            SecureField("パスワードを入力", text: $password)
                                .focused($focusedField, equals: .password)
                                .submitLabel(.done)
                                .onSubmit { loginIfValid() }
                                .padding(12)
                                .background(.quaternary, in: RoundedRectangle(cornerRadius: 10))
                        }
                    }
                    .padding(.horizontal, 24)

                    // エラーメッセージ
                    if let error = authVM.errorMessage {
                        Text(error)
                            .font(.caption)
                            .foregroundStyle(Color.appError)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 24)
                    }

                    // ログインボタン
                    VStack(spacing: 12) {
                        Button {
                            loginIfValid()
                        } label: {
                            Group {
                                if authVM.isLoading {
                                    ProgressView()
                                        .tint(.white)
                                } else {
                                    Text("ログイン")
                                        .fontWeight(.semibold)
                                }
                            }
                            .frame(maxWidth: .infinity)
                            .frame(height: 50)
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(.appPrimary)
                        .disabled(!isFormValid || authVM.isLoading)
                        .padding(.horizontal, 24)

                    }
                }
                .padding(.bottom, 40)
            }
            .navigationBarHidden(true)
            .onTapGesture { focusedField = nil }
        }
    }

    private var isFormValid: Bool {
        !email.isEmpty && !password.isEmpty
    }

    private func loginIfValid() {
        guard isFormValid else { return }
        focusedField = nil
        Task { await authVM.login(email: email, password: password) }
    }
}

#Preview {
    LoginView()
        .environment(AuthViewModel())
}
