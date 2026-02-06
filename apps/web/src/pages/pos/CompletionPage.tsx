import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, ArrowRight } from 'lucide-react';

export default function CompletionPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const transaction = location.state?.transaction;
    const change = location.state?.change;
    const [progress, setProgress] = useState(0);

    // 5秒間にわたって進捗を更新し、完了後に自動遷移
    useEffect(() => {
        const duration = 5000; // 5 seconds
        const interval = 50; // Update every 50ms for smooth animation
        const steps = duration / interval;
        const increment = 100 / steps;

        const progressTimer = setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) {
                    clearInterval(progressTimer);
                    return 100;
                }
                return prev + increment;
            });
        }, interval);

        const navigateTimer = setTimeout(() => {
            navigate('/pos');
        }, duration);

        return () => {
            clearInterval(progressTimer);
            clearTimeout(navigateTimer);
        };
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
            <Card className="w-full max-w-md shadow-xl border-none">
                <CardContent className="pt-10 pb-8 text-center space-y-8">
                    {/* 完了アイコン */}
                    <div className="flex justify-center flex-col items-center space-y-2">
                        <div className="relative">
                            <CheckCircle2 className="h-24 w-24 text-green-500 animate-in zoom-in duration-500" />
                            <div className="absolute inset-0 h-24 w-24 bg-green-500/10 rounded-full animate-ping -z-10" />
                        </div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight">会計完了</h1>
                    </div>

                    {/* 取引詳細 */}
                    <div className="space-y-3 pt-6 border-t border-gray-100">
                        {transaction.items?.map((item: any) => (
                            <div key={item.id} className="flex justify-between text-base">
                                <span className="text-gray-600 font-medium">
                                    {item.product?.name || 'Unknown'} <span className="text-xs text-gray-400 font-bold ml-1">x {item.quantity}</span>
                                </span>
                                <span className="font-bold text-gray-800">
                                    ¥{(item.unitPrice * item.quantity).toLocaleString()}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* 合計 */}
                    <div className="space-y-3 pt-6 border-t border-gray-100 bg-gray-50/50 -mx-6 px-6 py-4">
                        <div className="flex justify-between items-baseline">
                            <span className="text-gray-500 font-bold uppercase text-xs tracking-wider">合計請求額</span>
                            <span className="text-3xl font-black text-gray-900">
                                <span className="text-xl mr-1">¥</span>
                                {transaction.totalAmount.toLocaleString()}
                            </span>
                        </div>

                        {change !== undefined && change >= 0 && (
                            <div className="flex justify-between items-center text-green-600 bg-green-50 px-3 py-2 rounded-lg border border-green-100 mt-2">
                                <span className="text-sm font-bold">お釣り</span>
                                <span className="text-xl font-black">
                                    <span className="text-sm mr-0.5">¥</span>
                                    {change.toLocaleString()}
                                </span>
                            </div>
                        )}

                        <div className="flex justify-between items-center text-xs text-gray-400 font-bold pt-2">
                            <span>支払方法</span>
                            <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded uppercase tracking-widest text-[10px]">
                                {transaction.paymentMethod === 'CASH' ? '現金' : 'PayPay'}
                            </span>
                        </div>
                    </div>

                    {/* 次の注文ボタン (プログレスバー付き) */}
                    <div className="pt-4 space-y-3">
                        <Button
                            onClick={handleNextOrder}
                            className="w-full h-16 text-xl font-black bg-orange-500 hover:bg-orange-600 relative overflow-hidden group shadow-lg shadow-orange-200"
                        >
                            {/* 進捗レイヤー */}
                            <div
                                className="absolute left-0 top-0 bottom-0 bg-white/20 transition-all duration-75 ease-linear pointer-events-none"
                                style={{ width: `${progress}%` }}
                            />

                            <span className="relative z-10 flex items-center justify-center gap-2">
                                次の注文へ
                                <ArrowRight className="h-6 w-6 group-hover:translate-x-1 transition-transform" />
                            </span>
                        </Button>
                        <p className="text-[10px] text-gray-400 font-bold flex items-center justify-center gap-1 uppercase tracking-widest">
                            Autoforwarding to POS in {Math.max(0, Math.ceil(5 - (progress / 100) * 5))}s
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
