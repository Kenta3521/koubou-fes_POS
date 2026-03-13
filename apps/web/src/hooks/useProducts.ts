/**
 * useProducts Hook
 * Phase 2: 商品一覧取得用フック
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuthStore } from '../stores/authStore';

interface Product {
    id: string;
    organizationId: string;
    categoryId: string;
    name: string;
    price: number;
    stock: number;
    isActive: boolean;
}

interface ProductFilters {
    categoryId?: string;
    isActive?: boolean;
}

async function fetchProducts(
    orgId: string,
    filters?: ProductFilters
): Promise<Product[]> {
    const params = new URLSearchParams();

    if (filters?.categoryId) {
        params.append('categoryId', filters.categoryId);
    }
    if (filters?.isActive !== undefined) {
        params.append('isActive', filters.isActive.toString());
    }

    const response = await api.get(`/organizations/${orgId}/products`, {
        params
    });

    return response.data.data;
}

export function useProducts(filters?: ProductFilters) {
    const { token, activeOrganizationId } = useAuthStore();

    return useQuery({
        queryKey: ['products', activeOrganizationId, filters],
        queryFn: () => {
            if (!activeOrganizationId) {
                throw new Error('団体が選択されていません');
            }
            return fetchProducts(activeOrganizationId, filters);
        },
        enabled: !!activeOrganizationId && !!token,
        staleTime: 0, // 在庫変動を考慮して、常に最新情報を取得するように（キャッシュからではなく必ずフェッチ）
    });
}

export type { Product, ProductFilters };
