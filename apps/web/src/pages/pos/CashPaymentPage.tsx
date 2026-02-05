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

    // 数値入力ハンドラ
    const handleNumberClick = (num: number | '00') => {
        setDepositAmount(prev => {
            const nextValue = prev * (num === '00' ? 100 : 10) + (num === '00' ? 0 : num);
            // 100万円以上は制限 (誤入力防止)
            if (nextValue > 1000000) return prev;
            return nextValue;
        });
    };

    // 合計金額をセット (現計)
    const handleExactAmount = () => {
        setDepositAmount(totalAmount);
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
        } catch (err: unknown) {
            console.error('[CashPayment] Failed to create transaction:', err);
            const errorMessage = (err as any)?.response?.data?.error?.message || '取引の作成に失敗しました';
            setError(errorMessage);
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
                    {/* 合計請求額ディスプレイ */}
                    <Card className="bg-gray-50 border-gray-200 shadow-none border">
                        <CardContent className="py-3 px-6 flex justify-between items-baseline">
                            <span className="text-sm font-bold text-gray-400 uppercase tracking-tighter">会計合計</span>
                            <span className="text-2xl font-black text-gray-600">
                                <span className="text-lg mr-1">¥</span>
                                {totalAmount.toLocaleString()}
                            </span>
                        </CardContent>
                    </Card>

                    {/* メイン入力・お釣りエリア */}
                    <div className="space-y-4">
                        {/* 預かり金額 */}
                        <div className="bg-white border-2 border-primary rounded-2xl px-8 py-6 flex flex-col items-center justify-center shadow-md">
                            <span className="text-xs font-black text-primary/60 uppercase mb-1">預かり金額</span>
                            <span className="text-6xl font-black text-primary tracking-tighter">
                                <span className="text-3xl mr-1 italic">¥</span>
                                {depositAmount.toLocaleString()}
                            </span>
                        </div>

                        {/* お釣り表示 (預かりのすぐ下に配置) */}
                        <div className={cn(
                            "rounded-2xl p-4 transition-all duration-300 flex items-center justify-between mx-4",
                            isInsufficient
                                ? "bg-red-50 border-2 border-red-200 text-red-700"
                                : change === 0
                                    ? "bg-gray-50 border border-gray-200 text-gray-500"
                                    : "bg-green-500 text-white shadow-lg border-2 border-green-400 scale-105"
                        )}>
                            <div className="flex flex-col">
                                <span className={cn(
                                    "text-xs font-black uppercase",
                                    !isInsufficient && change > 0 ? "text-white/80" : "opacity-70"
                                )}>
                                    {isInsufficient ? '不足分' : change === 0 ? 'お釣りなし' : 'お釣り'}
                                </span>
                                <span className="text-4xl font-black italic tracking-tighter">
                                    ¥{Math.abs(change).toLocaleString()}
                                </span>
                            </div>
                            {isInsufficient && (
                                <div className="bg-red-500 text-white text-xs font-black px-3 py-1.5 rounded-full animate-pulse">
                                    不足
                                </div>
                            )}
                            {!isInsufficient && change > 0 && (
                                <div className="bg-white text-green-600 text-xs font-black px-3 py-1.5 rounded-full shadow-sm">
                                    確定可能
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 特大テンキー (バックスペース廃止、サイズ拡大) */}
                    <div className="grid grid-cols-4 gap-4 h-[440px]">
                        {/* 数字キー (左3列) */}
                        <div className="col-span-3 grid grid-cols-3 gap-3">
                            {[7, 8, 9, 4, 5, 6, 1, 2, 3].map((num) => (
                                <Button
                                    key={num}
                                    variant="outline"
                                    onClick={() => handleNumberClick(num)}
                                    className="h-full text-4xl font-black bg-white border-2 border-gray-100 rounded-2xl shadow-sm hover:border-primary/50 hover:bg-primary/5 active:scale-90 transition-all"
                                >
                                    {num}
                                </Button>
                            ))}
                            <Button
                                variant="outline"
                                onClick={() => handleNumberClick(0)}
                                className="h-full text-4xl font-black bg-white border-2 border-gray-100 rounded-2xl shadow-sm hover:border-primary/50 hover:bg-primary/5 active:scale-90 transition-all"
                            >
                                0
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => handleNumberClick('00')}
                                className="h-full text-3xl font-black bg-white border-2 border-gray-100 rounded-2xl shadow-sm hover:border-primary/50 hover:bg-primary/5 active:scale-90 transition-all"
                            >
                                00
                            </Button>
                            <Button
                                variant="outline"
                                onClick={handleClear}
                                className="h-full text-3xl font-black bg-white border-2 border-red-200 rounded-2xl shadow-sm text-red-500 hover:bg-red-50 active:scale-90 transition-all"
                            >
                                AC
                            </Button>
                        </div>

                        {/* アクションキー (右1列) */}
                        <div className="col-span-1 grid grid-rows-3 gap-3">
                            <Button
                                variant="secondary"
                                onClick={handleExactAmount}
                                className="h-full font-black text-blue-800 bg-blue-100 border-2 border-blue-200 rounded-2xl shadow-sm hover:bg-blue-200 active:scale-90 transition-all flex flex-col gap-1 items-center justify-center"
                            >
                                <span className="text-xs uppercase opacity-60">ぴったり</span>
                                <span className="text-2xl">現計</span>
                            </Button>
                            <Button
                                onClick={handleComplete}
                                disabled={isInsufficient || isProcessing}
                                className={cn(
                                    "row-span-2 h-full rounded-2xl shadow-xl active:scale-95 transition-all flex flex-col items-center justify-center gap-2",
                                    isInsufficient || isProcessing
                                        ? "bg-gray-100 text-gray-400 cursor-not-allowed grayscale"
                                        : "bg-green-600 hover:bg-green-700 text-white ring-4 ring-green-100"
                                )}
                            >
                                <Check className="h-10 w-10 mb-1" />
                                <span className="text-2xl font-black leading-tight">
                                    {isProcessing ? '受注中' : '会計'}
                                    <br />
                                    {isProcessing ? '...' : '完了'}
                                </span>
                            </Button>
                        </div>
                    </div>

                    {/* エラー表示 */}
                    {error && (
                        <div className="bg-red-600 text-white text-sm font-black py-4 px-6 rounded-2xl shadow-lg animate-bounce text-center">
                            ⚠️ {error}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
