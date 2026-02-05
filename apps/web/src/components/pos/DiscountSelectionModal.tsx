import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Ticket, X, Check } from 'lucide-react';

interface Discount {
    id: string;
    name: string;
    type: 'FIXED' | 'PERCENT';
    value: number;
    targetType: string;
    conditionType: string;
    conditionValue: number;
    validFrom: string | null;
    validTo: string | null;
    isActive: boolean;
}

interface DiscountSelectionModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    currentTotal: number;
    onSelectDiscount: (discountId: string | null) => void;
    selectedDiscountId?: string | null;
}

export function DiscountSelectionModal({
    open,
    onOpenChange,
    currentTotal,
    onSelectDiscount,
    selectedDiscountId,
}: DiscountSelectionModalProps) {
    const { activeOrganizationId } = useAuthStore();
    const [discounts, setDiscounts] = useState<Discount[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!open || !activeOrganizationId) return;

        const fetchDiscounts = async () => {
            setIsLoading(true);
            setError(null);
            try {
                console.log('[DiscountModal] Fetching manual discounts for org:', activeOrganizationId);
                const response = await api.get(`/organizations/${activeOrganizationId}/discounts`);

                // Filter for manual discounts only
                const manualDiscounts = response.data.data.filter(
                    (d: Discount) => d.isActive
                );

                setDiscounts(manualDiscounts);
                console.log('[DiscountModal] Found', manualDiscounts.length, 'discounts');
            } catch (err) {
                console.error('Failed to fetch discounts:', err);
                setError('割引の取得に失敗しました');
            } finally {
                setIsLoading(false);
            }
        };

        fetchDiscounts();
    }, [open, activeOrganizationId]);

    const formatDiscountValue = (discount: Discount) => {
        if (discount.type === 'FIXED') {
            return `¥${discount.value}引き`;
        } else {
            return `${discount.value}%OFF`;
        }
    };

    const formatCondition = (discount: Discount) => {
        if (discount.conditionType === 'MIN_AMOUNT') {
            return `¥${discount.conditionValue}以上のご注文`;
        } else if (discount.conditionType === 'MIN_QUANTITY') {
            return `${discount.conditionValue}個以上`;
        }
        return '';
    };

    const isDiscountApplicable = (discount: Discount) => {
        if (discount.conditionType === 'MIN_AMOUNT') {
            return currentTotal >= discount.conditionValue;
        }
        // For other condition types, assume applicable for now
        return true;
    };

    const handleSelect = (discountId: string) => {
        onSelectDiscount(discountId);
    };

    const handleRemove = () => {
        onSelectDiscount(null);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Ticket className="h-5 w-5" />
                        割引・クーポンを選択
                    </DialogTitle>
                    <DialogDescription>
                        適用する割引を選択してください
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Remove discount option */}
                    {selectedDiscountId && (
                        <Card className="border-2 border-red-200 bg-red-50">
                            <CardContent className="pt-6">
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    onClick={handleRemove}
                                >
                                    <X className="mr-2 h-4 w-4" />
                                    割引を解除
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    {isLoading && (
                        <div className="text-center py-8 text-gray-500">
                            読み込み中...
                        </div>
                    )}

                    {error && (
                        <div className="text-center py-8 text-red-500">
                            {error}
                        </div>
                    )}

                    {!isLoading && !error && discounts.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                            利用可能な割引がありません
                        </div>
                    )}

                    {!isLoading && !error && discounts.map((discount) => {
                        const isSelected = discount.id === selectedDiscountId;
                        const isApplicable = isDiscountApplicable(discount);

                        return (
                            <Card
                                key={discount.id}
                                className={`cursor-pointer transition-all ${isSelected
                                    ? 'border-2 border-primary bg-primary/5'
                                    : isApplicable
                                        ? 'hover:border-primary/50'
                                        : 'opacity-50 cursor-not-allowed'
                                    }`}
                                onClick={() => isApplicable && handleSelect(discount.id)}
                            >
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <CardTitle className="text-lg flex items-center gap-2">
                                                {discount.name}
                                                {isSelected && (
                                                    <Check className="h-5 w-5 text-primary" />
                                                )}
                                            </CardTitle>
                                            <CardDescription className="mt-1">
                                                {formatCondition(discount)}
                                            </CardDescription>
                                        </div>
                                        <Badge variant={isApplicable ? 'default' : 'secondary'}>
                                            {formatDiscountValue(discount)}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                {!isApplicable && (
                                    <CardContent>
                                        <p className="text-sm text-red-500">
                                            条件を満たしていません
                                        </p>
                                    </CardContent>
                                )}
                            </Card>
                        );
                    })}
                </div>
            </DialogContent>
        </Dialog>
    );
}
