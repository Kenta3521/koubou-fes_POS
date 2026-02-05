import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useCartStore } from '@/stores/cartStore';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';
import { CalculationResult, CalculatedItem } from '@koubou-fes-pos/shared';
import { ChevronLeft, Ticket, Banknote, Smartphone } from 'lucide-react';
import { DiscountSelectionModal } from '@/components/pos/DiscountSelectionModal';

const OrderConfirmationPage: React.FC = () => {
    const navigate = useNavigate();
    const { items } = useCartStore();
    const { activeOrganizationId } = useAuthStore();

    const [calculation, setCalculation] = useState<CalculationResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Discount modal state
    const [discountModalOpen, setDiscountModalOpen] = useState(false);
    const [selectedManualDiscountId, setSelectedManualDiscountId] = useState<string | null>(null);

    useEffect(() => {
        if (!activeOrganizationId) return;
        if (items.length === 0) {
            navigate('/pos');
            return;
        }

        const fetchCalculation = async () => {
            setIsLoading(true);
            setError(null); // エラーをリセット
            try {
                console.log('[OrderConfirmationPage] Fetching calculation for org:', activeOrganizationId);
                console.log('[OrderConfirmationPage] Manual discount ID:', selectedManualDiscountId);

                const response = await api.post(`/organizations/${activeOrganizationId}/transactions/calculate`, {
                    items: items.map(i => ({ productId: i.productId, quantity: i.quantity })),
                    manualDiscountId: selectedManualDiscountId || undefined,
                });
                setCalculation(response.data.data);
            } catch (err: any) {
                console.error('Calculation failed:', err);
                const message = err.response?.data?.error?.message || '金額計算に失敗しました';
                setError(message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchCalculation();
    }, [activeOrganizationId, items, navigate, selectedManualDiscountId]);

    const handleDiscountSelect = (discountId: string | null) => {
        console.log('[OrderConfirmationPage] Discount selected:', discountId);
        setSelectedManualDiscountId(discountId);
        setDiscountModalOpen(false);
    };

    if (!activeOrganizationId) return <div>Organization not selected</div>;
    if (isLoading) return <div className="p-4">計算中...</div>;

    if (error) return (
        <div className="flex flex-col items-center justify-center h-full p-4 space-y-4">
            <div className="text-red-500 font-medium">{error}</div>
            <p className="text-gray-500 text-sm">カートの内容が古い可能性があります。</p>
            <Button onClick={() => navigate('/pos')}>注文入力に戻る</Button>
        </div>
    );

    if (!calculation) return null;

    return (
        <div className="flex flex-col h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b p-4 flex items-center">
                <Button variant="ghost" size="icon" onClick={() => navigate('/pos')}>
                    <ChevronLeft className="h-6 w-6" />
                </Button>
                <h1 className="text-xl font-bold ml-2">注文確認</h1>
            </header>

            {/* Content */}
            <main className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* 注文商品リスト */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg">注文商品</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                        {calculation.items.map((item: CalculatedItem) => (
                            <div key={item.productId} className="flex justify-between items-start">
                                <div>
                                    <div className="font-medium">{item.productName}</div>
                                    <div className="text-sm text-gray-500">
                                        x{item.quantity} (単価: ¥{item.originalPrice})
                                    </div>
                                    {item.appliedDiscount && (
                                        <div className="text-sm text-green-600">
                                            {item.appliedDiscount.name}: -¥{item.discountAmount * item.quantity}
                                        </div>
                                    )}
                                </div>
                                <div className="text-right font-medium">
                                    ¥{item.unitPrice * item.quantity}
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* 支払いサマリー (P2-011) */}
                <Card>
                    <CardContent className="pt-6 grid gap-2">
                        <div className="flex justify-between text-gray-600">
                            <span>小計 (割引前)</span>
                            <span>¥{calculation.subtotalAmount.toLocaleString()}</span>
                        </div>
                        {calculation.totalDiscountAmount > 0 && (
                            <div className="flex justify-between text-green-600">
                                <span>割引合計</span>
                                <span>-¥{calculation.totalDiscountAmount.toLocaleString()}</span>
                            </div>
                        )}
                        {calculation.appliedOrderDiscount && (
                            <div className="flex justify-between text-sm text-green-600 pl-4">
                                <span>└ {calculation.appliedOrderDiscount.name}</span>
                                <span>適用中</span>
                            </div>
                        )}

                        <Separator className="my-2" />

                        <div className="flex justify-between text-xl font-bold">
                            <span>合計</span>
                            <span>¥{calculation.totalAmount.toLocaleString()}</span>
                        </div>
                    </CardContent>
                </Card>

                {/* 割引ボタン (P2-015) */}
                <Button
                    variant="outline"
                    className="w-full h-12"
                    onClick={() => setDiscountModalOpen(true)}
                >
                    <Ticket className="mr-2 h-5 w-5" />
                    {selectedManualDiscountId ? '割引を変更' : 'クーポン・割引を適用'}
                </Button>

            </main>

            {/* Footer / Payment Methods (P2-010) */}
            <footer className="bg-white border-t p-4 space-y-3">
                <Button
                    variant="default"
                    className="w-full h-14 text-lg bg-green-600 hover:bg-green-700"
                    onClick={() => navigate('/pos/payment/cash', { state: { calculation } })}
                >
                    <Banknote className="mr-2 h-6 w-6" />
                    現金で支払う
                </Button>
                <Button
                    variant="default"
                    className="w-full h-14 text-lg bg-red-500 hover:bg-red-600"
                    onClick={() => navigate('/pos/payment/paypay', { state: { calculation } })}
                >
                    <Smartphone className="mr-2 h-6 w-6" />
                    PayPayで支払う
                </Button>
            </footer>

            {/* Discount Selection Modal */}
            <DiscountSelectionModal
                open={discountModalOpen}
                onOpenChange={setDiscountModalOpen}
                currentTotal={calculation?.subtotalAmount || 0}
                onSelectDiscount={handleDiscountSelect}
                selectedDiscountId={selectedManualDiscountId}
            />
        </div>
    );
};

export default OrderConfirmationPage;
