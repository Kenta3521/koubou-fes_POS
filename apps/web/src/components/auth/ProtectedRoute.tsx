import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

export default function ProtectedRoute() {
    const { isAuthenticated, activeOrganizationId } = useAuthStore();
    const location = useLocation();

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // 団体未選択かつ、選択画面以外へのアクセスの場合は選択画面へリダイレクト
    if (!activeOrganizationId && location.pathname !== '/select-org') {
        return <Navigate to="/select-org" replace />;
    }

    return <Outlet />;
}
