import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AuthProvider from './components/auth/AuthProvider';
import { useAuthStore } from './stores/authStore';
import { Button } from './components/ui/button';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function HomePage() {
  const { user, logout } = useAuthStore();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        <h1 className="text-4xl font-bold text-center text-primary">
          光芒祭POSシステム
        </h1>
        <p className="text-center text-muted-foreground mt-4">
          Phase1: 基盤構築中 (ログイン完了)
        </p>
        <div className="mt-8 text-center space-y-4">
          <p>ようこそ、{user?.name} さん ({user?.email})</p>
          <Button onClick={logout} variant="outline">ログアウト</Button>
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
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<HomePage />} />
            </Route>
          </Routes>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
