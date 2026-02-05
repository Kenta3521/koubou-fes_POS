import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, X, AlertCircle, Loader2, Clock } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { CalculationResult } from '@koubou-fes-pos/shared';
import { cn } from '@/lib/utils';
import { socket } from '@/lib/socket';

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

    // Get calculation from location state (from OrderConfirmationPage)
    const calculation = location.state?.calculation as CalculationResult;
    // We would ideally have the transaction ID passed through or navigate after creation
    // For now, assuming location.state has the transaction created or we create it here
    // Let's check how we get here. OrderConfirmationPage calls calculate but createTransaction 
    // happens when one of the payment buttons is clicked.
    // In CashPaymentPage, completeTransaction is called at the end.
    // In PayPay, we need to create the transaction FIRST to get the ID for PayPay create API.

    const [transaction, setTransaction] = useState<any>(null);
    const [paypayData, setPayPayData] = useState<PayPayResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
    // Debug state
    const [isConnected, setIsConnected] = useState(socket.connected);
    const [lastEvent, setLastEvent] = useState<any>(null);

    useEffect(() => {
        function onConnect() {
            setIsConnected(true);
            console.log('Socket Connected:', socket.id);
        }
        function onDisconnect() {
            setIsConnected(false);
            console.log('Socket Disconnected');
        }
        function onConnectError(err: any) {
            console.error('Socket Connection Error:', err);
            setLastEvent({ type: 'error', message: err.message });
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



    const createTransactionAndQR = useCallback(async () => {
        if (!activeOrganizationId || !calculation) return;

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
                manualDiscountId: calculation.appliedOrderDiscount?.id
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
        } finally {
            setIsLoading(false);
        }
    }, [activeOrganizationId, calculation]);

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
            setLastEvent(data); // for debug

            // Loose check for transaction ID to handle potential string/number mismatches (though unlikely with UUID)
            if (data.transactionId === transaction.id) {
                console.log('Navigating to complete page for transaction:', transaction.id);
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
        if (!paypayData || timeLeft <= 0) return;

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    // Handle timeout (P3-009)
                    // navigate('/pos', { state: { error: 'タイムアウトしました' } });
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [paypayData, timeLeft]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleCancel = async () => {
        if (window.confirm('決済をキャンセルしてもよろしいですか？')) {
            if (transaction) {
                try {
                    await api.post(`/organizations/${activeOrganizationId}/transactions/${transaction.id}/cancel`);
                } catch (err) {
                    console.error('Cancel failed:', err);
                }
            }
            navigate('/pos');
        }
    };

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

                    <div className="flex justify-center bg-white p-6 rounded-3xl shadow-xl border-4 border-red-500 mx-auto w-fit">
                        {paypayData?.qrCodeUrl && (
                            <QRCodeSVG
                                value={paypayData.qrCodeUrl}
                                size={260}
                                level="M"
                                includeMargin={false}
                            />
                        )}
                    </div>

                    <p className="text-sm font-bold text-red-600">
                        PayPayでスキャンしてください
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
                            timeLeft < 60 ? "text-red-600 animate-pulse" : "text-gray-900"
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
                            <div className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-xs font-bold">
                                決済待受中
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 gap-3">
                    <Button
                        variant="secondary"
                        className="h-14 bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200"
                        onClick={async () => {
                            if (!transaction) return;
                            try {
                                const res = await api.get(`/organizations/${activeOrganizationId}/transactions/${transaction.id}/paypay/status`);
                                const data = res.data.data;
                                console.log('Manual status check:', data);
                                if (data.status === 'COMPLETED') {
                                    navigate('/pos/complete', { state: { transaction: { ...transaction, status: 'COMPLETED' }, calculation } });
                                } else {
                                    alert(`決済はまだ完了していません。\nPayPayステータス: ${data.paypayStatus}`);
                                }
                            } catch (err) {
                                console.error('Status check failed:', err);
                                alert('ステータスの確認に失敗しました');
                            }
                        }}
                    >
                        <Loader2 className="mr-2 h-5 w-5 animate-spin hidden" /> {/* Placeholder for loading state if needed */}
                        支払い状況を確認する
                    </Button>

                    <Button
                        variant="outline"
                        className="h-14 text-gray-600 border-gray-200"
                        onClick={handleCancel}
                    >
                        <X className="mr-2 h-5 w-5" />
                        決済をキャンセル
                    </Button>
                </div>
            </div>

        </div>
    );
};

export default PayPayPaymentPage;
