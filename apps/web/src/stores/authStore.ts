import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { UserWithOrganizations } from '@koubou-fes-pos/shared';

interface AuthState {
    user: UserWithOrganizations | null;
    token: string | null;
    isAuthenticated: boolean;

    // Actions
    setAuth: (token: string, user: UserWithOrganizations) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            token: null,
            isAuthenticated: false,

            setAuth: (token, user) => set({
                token,
                user,
                isAuthenticated: true
            }),

            logout: () => set({
                token: null,
                user: null,
                isAuthenticated: false
            }),
        }),
        {
            name: 'auth-storage', // localStorageのキー名
            storage: createJSONStorage(() => localStorage),
            // 必要なプロパティのみ永続化する場合
            // partialize: (state) => ({ token: state.token, user: state.user }),
        }
    )
);
