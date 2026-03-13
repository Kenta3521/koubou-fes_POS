/**
 * useCategories Hook
 * Phase 2: カテゴリ一覧取得用フック
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuthStore } from '../stores/authStore';

interface Category {
    id: string;
    organizationId: string;
    name: string;
    sortOrder: number;
}

async function fetchCategories(orgId: string): Promise<Category[]> {
    const response = await api.get(`/organizations/${orgId}/categories`);
    return response.data.data;
}

export function useCategories() {
    const { token, activeOrganizationId } = useAuthStore();

    return useQuery({
        queryKey: ['categories', activeOrganizationId],
        queryFn: () => {
            if (!activeOrganizationId) {
                throw new Error('団体が選択されていません');
            }
            return fetchCategories(activeOrganizationId);
        },
        enabled: !!activeOrganizationId && !!token,
        staleTime: 0,
    });
}

export type { Category };
