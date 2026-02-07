import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

export default function ProtectedRoute() {
    const { user, isAuthenticated, activeOrganizationId } = useAuthStore();
    const location = useLocation();

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // 団体未選択かつ、選択画面以外へのアクセスの場合は選択画面へリダイレクト
    // ただし、システム管理者の場合は団体未選択でもシステム管理画面等へのアクセスを許可する
    if (!activeOrganizationId && location.pathname !== '/select-org' && !user?.isSystemAdmin) {
        return <Navigate to="/select-org" replace />;
    }

    return <Outlet />;
}
