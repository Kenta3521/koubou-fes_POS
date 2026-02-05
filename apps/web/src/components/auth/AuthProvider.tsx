import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';

interface AuthProviderProps {
    children: React.ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
    const [isReady, setIsReady] = useState(false);
    const { token, logout } = useAuthStore();

    useEffect(() => {
        const initializeAuth = async () => {
            if (token) {
                try {
                    const response = await api.get('/users/me');
                    // DBの最新情報をストアに反映させる
                    useAuthStore.setState({ user: response.data.data });

                } catch (error) {
                    logout();
                }
            }
            setIsReady(true);
        };

        initializeAuth();
    }, [token, logout]);

    if (!isReady) {
        // ローディング中（必要であればスピナーなどを表示）
        return <div className="flex h-screen items-center justify-center">Loading...</div>;
    }

    return <>{children}</>;
}
