import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2 } from 'lucide-react';

export default function CompletionPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const transaction = location.state?.transaction;
    const change = location.state?.change;

    // 3秒後に自動遷移
    useEffect(() => {
        const timer = setTimeout(() => {
            navigate('/pos');
        }, 3000);

        return () => clearTimeout(timer);
    }, [navigate]);

    const handleNextOrder = () => {
        navigate('/pos');
    };

    if (!transaction) {
        navigate('/pos');
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <CardContent className="pt-8 pb-6 text-center space-y-6">
                    {/* 完了アイコン */}
                    <div className="flex justify-center">
                        <CheckCircle2 className="h-24 w-24 text-green-500" />
                    </div>

                    {/* タイトル */}
                    <h1 className="text-2xl font-bold text-gray-900">会計完了</h1>

                    {/* 取引詳細 */}
                    <div className="space-y-3 pt-4 border-t border-gray-200">
                        {transaction.items?.map((item: any) => (
                            <div key={item.id} className="flex justify-between text-sm">
                                <span className="text-gray-600">
                                    {item.product?.name || 'Unknown'} x {item.quantity}
                                </span>
                                <span className="font-medium">
                                    ¥{(item.unitPrice * item.quantity).toLocaleString()}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* 合計 */}
                    <div className="space-y-2 pt-4 border-t border-gray-200">
                        <div className="flex justify-between text-lg font-bold">
                            <span>合計</span>
                            <span>¥{transaction.totalAmount.toLocaleString()}</span>
                        </div>

                        {change !== undefined && change >= 0 && (
                            <div className="flex justify-between text-sm text-gray-600">
                                <span>お釣り</span>
                                <span className="font-medium text-green-600">
                                    ¥{change.toLocaleString()}
                                </span>
                            </div>
                        )}

                        <div className="flex justify-between text-sm text-gray-600">
                            <span>支払方法</span>
                            <span className="font-medium">
                                {transaction.paymentMethod === 'CASH' ? '現金' : 'PayPay'}
                            </span>
                        </div>
                    </div>

                    {/* 次の注文ボタン */}
                    <div className="pt-4">
                        <Button
                            onClick={handleNextOrder}
                            className="w-full h-12 text-lg font-bold bg-orange-500 hover:bg-orange-600"
                        >
                            次の注文へ
                        </Button>
                        <p className="text-xs text-gray-500 mt-2">
                            (3秒後に自動遷移します)
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
