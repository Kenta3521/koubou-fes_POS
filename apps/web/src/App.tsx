import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AuthProvider from './components/auth/AuthProvider';
import { MainLayout } from './components/layout/MainLayout';
import { Toaster } from './components/ui/toaster';
import { useAuthStore } from './stores/authStore';
import PublicRoute from './components/auth/PublicRoute';
import NotFoundPage from './pages/NotFoundPage';
import SelectOrganizationPage from './pages/auth/SelectOrganizationPage';
import SettingsPage from './pages/settings/SettingsPage';
import OrderEntryPage from './pages/pos/OrderEntryPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function HomePage() {
  const { user } = useAuthStore();

  return (
    <div className="container mx-auto px-4 sm:px-6">
      <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-3 sm:mb-4">
        ようこそ、{user?.name}さん
      </h1>
      <p className="text-sm sm:text-base text-muted-foreground p-3 sm:p-4 bg-muted rounded-md mb-4 sm:mb-6">
        左上のメニューアイコン、またはサイドバーから機能を選択してください。
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <div className="border rounded-lg p-4 sm:p-6 shadow-sm">
          <h2 className="text-lg sm:text-xl font-bold mb-2">POSシステム</h2>
          <p className="text-sm sm:text-base text-gray-600 mb-4">レジ機能を利用して注文処理を行います。</p>
        </div>
        <div className="border rounded-lg p-4 sm:p-6 shadow-sm">
          <h2 className="text-lg sm:text-xl font-bold mb-2">管理機能</h2>
          <p className="text-sm sm:text-base text-gray-600 mb-4">商品やカテゴリの管理、売上データの確認を行います。</p>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public Routes (Guest Only) */}
            <Route element={<PublicRoute />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
            </Route>

            {/* Organization Selection (Auth required, but no layout yet) */}
            <Route element={<ProtectedRoute />}>
              <Route path="/select-org" element={<SelectOrganizationPage />} />
            </Route>

            {/* Protected Routes (Auth & Layout) */}
            <Route element={<ProtectedRoute />}>
              <Route element={<MainLayout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/settings" element={<SettingsPage />} />
                {/* POS Routes */}
                <Route path="/pos" element={<OrderEntryPage />} />
                {/* 今後追加されるルートはここに追加 */}
              </Route>
            </Route>

            {/* 404 Not Found */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          <Toaster />
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
