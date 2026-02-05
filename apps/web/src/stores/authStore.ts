import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { UserWithOrganizations } from '@koubou-fes-pos/shared';

interface AuthState {
    user: UserWithOrganizations | null;
    token: string | null;
    isAuthenticated: boolean;
    activeOrganizationId: string | null;

    // Actions
    setAuth: (token: string, user: UserWithOrganizations) => void;
    setActiveOrganization: (orgId: string) => void;
    logout: () => void;
    addOrganization: (org: UserWithOrganizations['organizations'][0]) => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            token: null,
            isAuthenticated: false,
            activeOrganizationId: null,

            setAuth: (token, user) => set({
                token,
                user,
                isAuthenticated: true,
                // 自動的に最初の組織を選択状態にするなどのロジックを入れることも可能だが、
                // 複数組織所属の場合に選択画面を出したいため、一旦nullまたは既存ロジックに任せる。
                // 要件により、ここで activeOrganizationId: user.organizations[0]?.organizationId をセットしても良い。
                // P1-020では選択画面を出すのが目的なので、明示的にnullのままにしておく（すでにnull初期化されている）。
            }),

            setActiveOrganization: (orgId) => {
                console.log('[AuthStore] Setting active organization:', orgId);
                set({ activeOrganizationId: orgId });
            },

            logout: () => set({
                token: null,
                user: null,
                isAuthenticated: false,
                activeOrganizationId: null,
            }),

            addOrganization: (org) => set((state) => {
                if (!state.user) return state;
                return {
                    user: {
                        ...state.user,
                        organizations: [...state.user.organizations, org]
                    }
                };
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
