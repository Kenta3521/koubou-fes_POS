import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, Check } from 'lucide-react';
import { CalculationResult } from '@koubou-fes-pos/shared';
import { useAuthStore } from '@/stores/authStore';
import { useCartStore } from '@/stores/cartStore';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

export default function CashPaymentPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { activeOrganizationId } = useAuthStore();
    const { items, clearCart } = useCartStore();

    const calculation = location.state?.calculation as CalculationResult;
    const totalAmount = calculation?.totalAmount || 0;

    const [depositAmount, setDepositAmount] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // お釣り計算
    const change = depositAmount - totalAmount;
    const isInsufficient = change < 0;

    // 計算データがない場合はリダイレクト
    if (!calculation || !activeOrganizationId) {
        navigate('/pos');
        return null;
    }

    // 金額追加ハンドラ
    const handleAddAmount = (amount: number) => {
        setDepositAmount(prev => prev + amount);
    };

    // クリアハンドラ
    const handleClear = () => {
        setDepositAmount(0);
    };

    // 会計完了ハンドラ
    const handleComplete = async () => {
        if (isInsufficient) return;

        setIsProcessing(true);
        setError(null);

        try {
            console.log('[CashPayment] Creating transaction...');

            // 取引を作成（PENDING状態）
            const createResponse = await api.post(`/organizations/${activeOrganizationId}/transactions`, {
                items: items.map(item => ({
                    productId: item.productId,
                    quantity: item.quantity,
                })),
                paymentMethod: 'CASH',
                depositAmount,
                changeAmount: change,
            });

            const transactionId = createResponse.data.data.id;
            console.log('[CashPayment] Transaction created (PENDING):', transactionId);

            // 取引を完了（在庫減算・StockLog記録）
            const completeResponse = await api.post(
                `/organizations/${activeOrganizationId}/transactions/${transactionId}/complete-cash`
            );

            console.log('[CashPayment] Transaction completed:', completeResponse.data);

            // カートをクリア
            clearCart();

            // 完了画面へ遷移
            navigate('/pos/complete', {
                state: {
                    transaction: completeResponse.data.data,
                    change,
                },
            });
        } catch (err: any) {
            console.error('[CashPayment] Failed to create transaction:', err);
            setError(err.response?.data?.error?.message || '取引の作成に失敗しました');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col">
            {/* ヘッダー */}
            <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(-1)}
                    className="p-2"
                >
                    <ChevronLeft className="h-5 w-5" />
                </Button>
                <h1 className="text-lg font-bold text-gray-900">現金会計</h1>
            </header>

            {/* メインコンテンツ */}
            <main className="flex-1 p-4 flex flex-col items-center justify-center max-w-md mx-auto w-full">
                <div className="w-full space-y-6">
                    {/* 合計金額 */}
                    <Card>
                        <CardContent className="pt-6 text-center">
                            <p className="text-sm text-gray-600 mb-2">合計金額</p>
                            <p className="text-4xl font-bold text-gray-900">
                                ¥{totalAmount.toLocaleString()}
                            </p>
                        </CardContent>
                    </Card>

                    {/* 預かり金額 */}
                    <Card className="border-2 border-primary">
                        <CardContent className="pt-6 text-center">
                            <p className="text-sm text-gray-600 mb-2">預かり金額</p>
                            <p className="text-5xl font-bold text-primary">
                                ¥{depositAmount.toLocaleString()}
                            </p>
                        </CardContent>
                    </Card>

                    {/* 金額ボタン */}
                    <div className="space-y-3">
                        <div className="grid grid-cols-3 gap-3">
                            <Button
                                variant="outline"
                                size="lg"
                                onClick={() => handleAddAmount(100)}
                                className="h-16 text-lg font-bold"
                            >
                                +100
                            </Button>
                            <Button
                                variant="outline"
                                size="lg"
                                onClick={() => handleAddAmount(500)}
                                className="h-16 text-lg font-bold"
                            >
                                +500
                            </Button>
                            <Button
                                variant="outline"
                                size="lg"
                                onClick={() => handleAddAmount(1000)}
                                className="h-16 text-lg font-bold"
                            >
                                +1000
                            </Button>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <Button
                                variant="outline"
                                size="lg"
                                onClick={() => handleAddAmount(5000)}
                                className="h-16 text-lg font-bold"
                            >
                                +5000
                            </Button>
                            <Button
                                variant="outline"
                                size="lg"
                                onClick={() => handleAddAmount(10000)}
                                className="h-16 text-lg font-bold"
                            >
                                +10000
                            </Button>
                            <Button
                                variant="outline"
                                size="lg"
                                onClick={handleClear}
                                className="h-16 text-lg font-bold text-red-500 hover:text-red-600 hover:bg-red-50"
                            >
                                C
                            </Button>
                        </div>
                    </div>

                    {/* お釣り */}
                    <Card className={cn(
                        isInsufficient ? 'border-2 border-red-500 bg-red-50' : 'bg-green-50'
                    )}>
                        <CardContent className="pt-6 text-center">
                            <p className="text-sm text-gray-600 mb-2">
                                {isInsufficient ? '不足金額' : 'お釣り'}
                            </p>
                            <p className={cn(
                                "text-4xl font-bold",
                                isInsufficient ? 'text-red-600' : 'text-green-600'
                            )}>
                                ¥{Math.abs(change).toLocaleString()}
                            </p>
                        </CardContent>
                    </Card>

                    {/* エラー表示 */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                            <p className="text-sm text-red-600">{error}</p>
                        </div>
                    )}

                    {/* 会計完了ボタン */}
                    <Button
                        onClick={handleComplete}
                        disabled={isInsufficient || isProcessing}
                        className={cn(
                            "w-full h-14 text-lg font-bold",
                            isInsufficient || isProcessing
                                ? "bg-gray-300 cursor-not-allowed"
                                : "bg-green-600 hover:bg-green-700"
                        )}
                    >
                        <Check className="mr-2 h-6 w-6" />
                        {isProcessing ? '処理中...' : '会計を完了する'}
                    </Button>
                </div>
            </main>
        </div>
    );
}
