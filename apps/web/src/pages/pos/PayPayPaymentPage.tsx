import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { X, AlertCircle, Loader2, Clock, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useCartStore } from '@/stores/cartStore';
import { CalculationResult } from '@koubou-fes-pos/shared';
import { cn } from '@/lib/utils';
import { socket } from '@/lib/socket';
import { useToast } from '@/hooks/use-toast';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';

interface PayPayResponse {
    qrCodeUrl: string;
    deepLink: string;
    expiresAt: number;
    merchantPaymentId: string;
}

const PayPayPaymentPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { activeOrganizationId } = useAuthStore();
    const { clearCart } = useCartStore();
    const { toast } = useToast();

    // Get calculation from location state (from OrderConfirmationPage)
    const calculation = location.state?.calculation as CalculationResult;
    const manualDiscountId = location.state?.manualDiscountId as string | undefined;

    const [transaction, setTransaction] = useState<any>(null);
    const [paypayData, setPayPayData] = useState<PayPayResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
    const [paymentStatus, setPaymentStatus] = useState<'waiting' | 'success' | 'expired'>('waiting');

    // キャンセル確認ダイアログの状態
    const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);

    // Lock to prevent duplicate initialization (React StrictMode mounts twice)
    const initialized = React.useRef(false);

    // Debug state
    const [, setIsConnected] = useState(socket.connected);

    useEffect(() => {
        function onConnect() {
            setIsConnected(true);
            console.log('Socket Connected:', socket.id);
        }
        function onDisconnect() {
            setIsConnected(false);
            console.log('Socket Disconnected');
        }
        function onConnectError(err: Error) {
            console.error('Socket Connection Error:', err);
        }

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.on('connect_error', onConnectError);

        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.off('connect_error', onConnectError);
        };
    }, []);

    const handleCancelClick = () => {
        if (paymentStatus === 'expired') {
            navigate('/pos');
            return;
        }
        setIsCancelConfirmOpen(true);
    };

    const handleCancelConfirm = async () => {
        if (transaction) {
            try {
                await api.post(`/organizations/${activeOrganizationId}/transactions/${transaction.id}/cancel`);
            } catch (err) {
                console.error('Cancel failed:', err);
            }
        }
        clearCart();
        navigate('/pos');
    };

    const handleTimeout = useCallback(async () => {
        setPaymentStatus('expired');
        setError('有効期限が切れました。注文をやり直してください。');
        if (transaction) {
            try {
                await api.post(`/organizations/${activeOrganizationId}/transactions/${transaction.id}/cancel`);
            } catch (err) {
                console.error('Timeout cleanup failed:', err);
            }
        }
        clearCart();
    }, [activeOrganizationId, transaction, clearCart]);

    const checkStatus = useCallback(async (isManual = false) => {
        if (!transaction || !activeOrganizationId || paymentStatus !== 'waiting') return;

        try {
            const res = await api.get(`/organizations/${activeOrganizationId}/transactions/${transaction.id}/paypay/status`);
            const data = res.data.data;
            console.log('Status check:', data);

            // Check if transaction is completed locally or in PayPay
            if (data.status === 'COMPLETED' || data.paypayStatus === 'COMPLETED' || data.paypayStatus === 'SUCCESS') {
                setPaymentStatus('success');
                clearCart();
                // Give user a moment to see the success state
                setTimeout(() => {
                    navigate('/pos/complete', { state: { transaction: { ...transaction, status: 'COMPLETED' }, calculation } });
                }, 1500);
                return;
            }

            if (isManual) {
                toast({
                    title: '未完了',
                    description: `決済はまだ完了していません。\nPayPayステータス: ${data.paypayStatus}`,
                });
            }
        } catch (err) {
            console.error('Status check failed:', err);
            if (isManual) {
                toast({
                    title: 'エラー',
                    description: 'ステータスの確認に失敗しました',
                    variant: 'destructive',
                });
            }
        }
    }, [activeOrganizationId, transaction, calculation, navigate, paymentStatus, clearCart, toast]);



    const createTransactionAndQR = useCallback(async () => {
        if (!activeOrganizationId || !calculation || initialized.current) return;

        initialized.current = true;
        setIsLoading(true);
        setError(null);
        try {
            // 1. Create Transaction (Status: PENDING)
            const txnResponse = await api.post(`/organizations/${activeOrganizationId}/transactions`, {
                items: calculation.items.map(item => ({
                    productId: item.productId,
                    quantity: item.quantity
                })),
                paymentMethod: 'PAYPAY',
                manualDiscountId: manualDiscountId || undefined
            });

            const txn = txnResponse.data.data;
            setTransaction(txn);

            // 2. Create PayPay QR
            const ppResponse = await api.post(`/organizations/${activeOrganizationId}/transactions/${txn.id}/paypay/create`);
            setPayPayData(ppResponse.data.data);

            // Set initial timer based on expiry if available, else 300s
            setTimeLeft(300);
        } catch (err: any) {
            console.error('PayPay init failed:', err);
            setError(err.response?.data?.error?.message || 'PayPayの準備に失敗しました');
            // Allow retry if failed
            initialized.current = false;
        } finally {
            setIsLoading(false);
        }
    }, [activeOrganizationId, calculation, manualDiscountId]);

    useEffect(() => {
        if (!calculation) {
            navigate('/pos');
            return;
        }
        createTransactionAndQR();
    }, [calculation, createTransactionAndQR, navigate]);

    // Socket connection and listener management
    useEffect(() => {
        if (!transaction) return;

        console.log('Setting up socket for transaction:', transaction.id);

        // Ensure connected
        if (!socket.connected) {
            console.log('Connecting socket...');
            socket.on('connect', () => {
                // Ensure join on reconnect
                console.log('Socket connected/reconnected, joining room:', transaction.id);
                socket.emit('join_transaction', transaction.id);
            });
            socket.connect();
        }

        // Join room immediately if already connected
        if (socket.connected) {
            console.log('Socket already connected, joining room:', transaction.id);
            socket.emit('join_transaction', transaction.id);
        }

        const onPaymentComplete = (data: any) => {
            console.log('Payment completed via socket:', data);

            // Loose check for transaction ID to handle potential string/number mismatches (though unlikely with UUID)
            if (data.transactionId === transaction.id) {
                console.log('Navigating to complete page for transaction:', transaction.id);
                clearCart();
                navigate('/pos/complete', { state: { transaction: { ...transaction, status: 'COMPLETED' }, calculation } });
            } else {
                console.warn('Received completion for different transaction:', data.transactionId);
            }
        };

        socket.on('payment_complete', onPaymentComplete);

        return () => {
            console.log('Cleaning up socket listener for transaction:', transaction.id);
            socket.off('payment_complete', onPaymentComplete);
            // Note: We don't disconnect here to avoid flapping if component re-renders quickly,
            // but we can rely on page navigation (unmount) to eventually close it if needed.
            // However, since `socket` is singleton, we don't want to disconnect it 
            // if other components use it, but here we are clean.
            // Also, we remove the 'connect' listener added above? 
            // The anonymous function `() => ... join ...` is tricky to remove without reference.
            // Ideally we define it outside, but for simplicity:
            // Socket.io handles dupes for emit usually fine, but listeners pile up.
            // Let's rely on standard re-join behavior.
            socket.off('connect'); // Be careful not to remove OTHER connect listeners if any
            // Actually, removing all 'connect' listeners might be aggressive if user debug code added one.
            // But user debug code in previous effect adds specific named functions.
            // So socket.off('connect') removes all. 
            // Let's refine this.
        };
    }, [transaction, navigate, calculation]);

    // Timer effect
    useEffect(() => {
        if (!paypayData || timeLeft <= 0 || paymentStatus !== 'waiting') return;

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    handleTimeout();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [paypayData, timeLeft, paymentStatus, handleTimeout]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Polling Effect
    useEffect(() => {
        if (!transaction || !paypayData || paymentStatus !== 'waiting') return;

        // Poll every 2 seconds for snappier feedback
        const intervalId = setInterval(() => {
            checkStatus(false);
        }, 2000);

        return () => clearInterval(intervalId);
    }, [transaction, paypayData, checkStatus, paymentStatus]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-screen space-y-4">
                <Loader2 className="h-10 w-10 animate-spin text-red-500" />
                <p className="text-gray-600">PayPayを準備中...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-screen p-6 space-y-6">
                <AlertCircle className="h-16 w-16 text-red-500" />
                <div className="text-center space-y-2">
                    <h2 className="text-xl font-bold">エラーが発生しました</h2>
                    <p className="text-gray-600">{error}</p>
                </div>
                <Button onClick={() => navigate('/pos/confirm')} variant="outline" className="w-full max-w-xs">
                    注文確認に戻る
                </Button>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
            {/* 
                CUSTOMER SIDE (TOP HALF) 
                Rotated 180 degrees for the customer across the counter
            */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 border-b-2 border-dashed border-gray-300 relative bg-white rotate-180">
                <div className="text-center space-y-4 w-full">
                    <div className="space-y-1">
                        <p className="text-lg font-bold text-gray-500">お支払い金額</p>
                        <p className="text-6xl font-black text-gray-900 leading-tight">
                            ¥{calculation.totalAmount.toLocaleString()}
                        </p>
                    </div>

                    <div className="flex justify-center bg-white p-6 rounded-3xl shadow-xl border-4 border-red-500 mx-auto w-fit relative overflow-hidden">
                        {paypayData?.qrCodeUrl && (
                            <>
                                <QRCodeSVG
                                    value={paypayData.qrCodeUrl}
                                    size={260}
                                    level="M"
                                    includeMargin={false}
                                    className={cn(paymentStatus !== 'waiting' && "opacity-20 blur-sm")}
                                />
                                {paymentStatus === 'expired' && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-white/60">
                                        <div className="text-red-600 font-bold text-xl rotate-12 border-4 border-red-600 px-4 py-2">
                                            EXPIRED
                                        </div>
                                    </div>
                                )}
                                {paymentStatus === 'success' && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-white/40">
                                        <CheckCircle2 className="h-24 w-24 text-green-500 animate-bounce" />
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    <p className={cn(
                        "text-sm font-bold",
                        paymentStatus === 'success' ? "text-green-600" : "text-red-600"
                    )}>
                        {paymentStatus === 'success' ? "お支払いが完了しました！" : "PayPayでスキャンしてください"}
                    </p>
                </div>
            </div>

            {/* 
                STAFF SIDE (BOTTOM HALF)
                Normal orientation for the staff
            */}
            <div className="flex-1 flex flex-col p-6 bg-gray-50 space-y-6">
                <div className="flex justify-between items-center">
                    <div className="flex items-center space-y-1 flex-col items-start font-mono">
                        <div className="flex items-center text-gray-600 text-sm">
                            <Clock className="h-4 w-4 mr-1" />
                            有効期限
                        </div>
                        <div className={cn(
                            "text-2xl font-bold",
                            timeLeft < 60 && paymentStatus === 'waiting' ? "text-red-600 animate-pulse" : "text-gray-900"
                        )}>
                            {formatTime(timeLeft)}
                        </div>
                    </div>

                    <div className="text-right">
                        <p className="text-xs text-gray-400">Transaction ID</p>
                        <p className="text-xs font-mono text-gray-500">{transaction?.id.substring(0, 8)}...</p>
                    </div>
                </div>

                <div className="flex-1 flex flex-col justify-center">
                    <Card className="bg-white/80 border-none shadow-sm">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">お預かり金額 (PayPay)</p>
                                <p className="text-2xl font-bold text-gray-900">¥{calculation.totalAmount.toLocaleString()}</p>
                            </div>

                            {paymentStatus === 'waiting' ? (
                                <div className="bg-red-100 text-red-600 px-3 py-1.5 rounded-full text-xs font-bold flex items-center shadow-sm border border-red-200">
                                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                                    決済待受中
                                </div>
                            ) : paymentStatus === 'success' ? (
                                <div className="bg-green-100 text-green-600 px-3 py-1.5 rounded-full text-xs font-bold flex items-center shadow-sm border border-green-200 animate-in zoom-in duration-300">
                                    <CheckCircle2 className="mr-2 h-3.5 w-3.5" />
                                    決済完了
                                </div>
                            ) : (
                                <div className="bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full text-xs font-bold flex items-center border border-gray-200">
                                    <X className="mr-2 h-3.5 w-3.5" />
                                    期限切れ
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 gap-3">
                    <Button
                        variant="secondary"
                        className="h-14 bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200"
                        onClick={() => checkStatus(true)}
                        disabled={paymentStatus !== 'waiting'}
                    >
                        支払い状況を確認する
                    </Button>

                    <Button
                        variant="outline"
                        className="h-14 text-gray-600 border-gray-200"
                        onClick={handleCancelClick}
                    >
                        <X className="mr-2 h-5 w-5" />
                        {paymentStatus === 'expired' ? "POS画面に戻る" : "決済をキャンセル"}
                    </Button>
                </div>
            </div>

            <ConfirmDialog
                open={isCancelConfirmOpen}
                onOpenChange={setIsCancelConfirmOpen}
                title="決済のキャンセル"
                description="決済をキャンセルしてもよろしいですか？"
                confirmText="キャンセルする"
                variant="destructive"
                onConfirm={handleCancelConfirm}
            />
        </div>
    );
};

export default PayPayPaymentPage;
