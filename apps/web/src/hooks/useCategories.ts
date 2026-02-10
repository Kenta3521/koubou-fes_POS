/**
 * useCategories Hook
 * Phase 2: カテゴリ一覧取得用フック
 */

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';

interface Category {
    id: string;
    organizationId: string;
    name: string;
    sortOrder: number;
}

interface CategoriesResponse {
    success: boolean;
    data: Category[];
    error?: {
        code: string;
        message: string;
    };
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

async function fetchCategories(orgId: string, token: string): Promise<Category[]> {
    const response = await fetch(
        `${API_BASE_URL}/api/v1/organizations/${orgId}/categories`,
        {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        }
    );

    if (!response.ok) {
        throw new Error(`カテゴリの取得に失敗しました: ${response.status}`);
    }

    const result: CategoriesResponse = await response.json();

    if (!result.success) {
        throw new Error(result.error?.message || 'カテゴリの取得に失敗しました');
    }

    return result.data;
}

export function useCategories() {
    const { token, activeOrganizationId } = useAuthStore();

    return useQuery({
        queryKey: ['categories', activeOrganizationId],
        queryFn: () => {
            if (!activeOrganizationId || !token) {
                throw new Error('団体が選択されていません');
            }
            return fetchCategories(activeOrganizationId, token);
        },
        enabled: !!activeOrganizationId && !!token,
        staleTime: 0,
    });
}

export type { Category };
