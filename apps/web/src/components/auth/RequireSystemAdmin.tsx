import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

export default function RequireSystemAdmin() {
    const { user } = useAuthStore();

    if (!user || !user.isSystemAdmin) {
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
}
