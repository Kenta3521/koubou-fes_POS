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
                    // トークンがある場合、有効性を確認したり、ユーザー情報を再取得したりする
                    // 今回は簡易的にトークンがあればOKとし、後続のAPIリクエストで401になったらログアウトする仕組みが必要
                    // 必要に応じてここで /api/v1/users/me を呼ぶなどの処理を追加可能

                    await api.get('/users/me').catch(() => {
                        // エラーならログアウト（無効なトークンなど）
                        logout();
                    });

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
