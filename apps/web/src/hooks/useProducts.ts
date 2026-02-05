/**
 * useProducts Hook
 * Phase 2: 商品一覧取得用フック
 */

import { useQuery } from '@tanstack/react-query';
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

interface ProductsResponse {
    success: boolean;
    data: Product[];
    error?: {
        code: string;
        message: string;
    };
}

interface ProductFilters {
    categoryId?: string;
    isActive?: boolean;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

async function fetchProducts(
    orgId: string,
    token: string,
    filters?: ProductFilters
): Promise<Product[]> {
    const params = new URLSearchParams();

    if (filters?.categoryId) {
        params.append('categoryId', filters.categoryId);
    }
    if (filters?.isActive !== undefined) {
        params.append('isActive', filters.isActive.toString());
    }

    const queryString = params.toString();
    const url = `${API_BASE_URL}/api/v1/organizations/${orgId}/products${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        throw new Error(`商品の取得に失敗しました: ${response.status}`);
    }

    const result: ProductsResponse = await response.json();

    if (!result.success) {
        throw new Error(result.error?.message || '商品の取得に失敗しました');
    }

    return result.data;
}

export function useProducts(filters?: ProductFilters) {
    const { token, activeOrganizationId } = useAuthStore();

    return useQuery({
        queryKey: ['products', activeOrganizationId, filters],
        queryFn: () => {
            if (!activeOrganizationId || !token) {
                throw new Error('団体が選択されていません');
            }
            return fetchProducts(activeOrganizationId, token, filters);
        },
        enabled: !!activeOrganizationId && !!token,
        staleTime: 1 * 60 * 1000, // 1分間キャッシュ（在庫変動を考慮して短め）
    });
}

export type { Product, ProductFilters };
