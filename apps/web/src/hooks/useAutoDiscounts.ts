import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

export interface AutoDiscount {
    id: string;
    name: string;
    type: 'PERCENT' | 'FIXED';
    value: number;
    targetType: 'SPECIFIC_PROD' | 'CATEGORY' | 'ORDER_TOTAL';
    targetProductId: string | null;
    targetCategoryId: string | null;
    triggerType: 'AUTO' | 'MANUAL';
    conditionType: 'NONE' | 'MIN_QUANTITY' | 'MIN_AMOUNT';
    isActive: boolean;
}

/**
 * 自動適用・条件なしの割引を取得するフック
 * 商品カードに表示するための割引情報を取得
 */
export function useAutoDiscounts() {
    const { activeOrganizationId } = useAuthStore();

    return useQuery({
        queryKey: ['auto-discounts', activeOrganizationId],
        queryFn: async () => {
            if (!activeOrganizationId) {
                throw new Error('No active organization');
            }

            const response = await api.get(`/organizations/${activeOrganizationId}/discounts`);
            const allDiscounts = response.data.data as AutoDiscount[];

            // フィルタ: triggerType=AUTO, conditionType=NONE, isActive=true
            // targetType が SPECIFIC_PROD または CATEGORY のもののみ
            const autoDiscounts = allDiscounts.filter(d => {
                return (
                    d.isActive &&
                    d.triggerType === 'AUTO' &&
                    d.conditionType === 'NONE' &&
                    (d.targetType === 'SPECIFIC_PROD' || d.targetType === 'CATEGORY')
                );
            });

            return autoDiscounts;
        },
        enabled: !!activeOrganizationId,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}
