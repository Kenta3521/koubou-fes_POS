
import React, { useEffect, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useParams } from 'react-router-dom';

interface TransactionDetailModalProps {
    transactionId: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

interface TransactionItem {
    id: string;
    productName: string; // items table usually stores productName snapshot
    quantity: number;
    unitPrice: number;
    originalPrice: number;
    discountAmount: number;
    product?: { name: string };
    discount?: { id: string; name: string; type: string; value: number }; // Added discount info
}

interface TransactionDetail {
    id: string;
    totalAmount: number;
    discountAmount: number;
    paymentMethod: string;
    status: string;
    createdAt: string;
    paypayOrderId?: string;
    user: { name: string; email: string };
    items: TransactionItem[];
    discount?: { id: string; name: string; type: string; value: number };
}

export function TransactionDetailModal({
    transactionId,
    open,
    onOpenChange,
}: TransactionDetailModalProps) {
    const { orgId } = useParams<{ orgId: string }>();
    const [transaction, setTransaction] = useState<TransactionDetail | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (open && transactionId && orgId) {
            fetchTransactionDetail();
        } else {
            setTransaction(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, transactionId, orgId]);

    const fetchTransactionDetail = async () => {
        if (!transactionId || !orgId) return;
        setIsLoading(true);
        try {
            const res = await api.get<{ success: boolean; data: TransactionDetail }>(
                `/organizations/${orgId}/transactions/${transactionId}`
            );
            setTransaction(res.data.data);
        } catch (error) {
            console.error('Failed to fetch transaction detail:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('ja-JP', {
            style: 'currency',
            currency: 'JPY',
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('ja-JP');
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'COMPLETED':
                return <Badge variant="default" className="bg-green-600">完了</Badge>;
            case 'CANCELLED':
                return <Badge variant="destructive">キャンセル</Badge>;
            case 'PENDING':
                return <Badge variant="outline" className="text-amber-500 border-amber-500">保留中</Badge>;
            default:
                return <Badge variant="secondary">{status}</Badge>;
        }
    };

    // Calculate applied discounts summary with breakdown
    const getAppliedDiscounts = () => {
        if (!transaction) return [];
        const discounts = new Map<string, {
            name: string;
            amount: number;
            details: { unitDiscount: number; quantity: number; type?: string; value?: number }[]
        }>();

        // Item level discounts
        transaction.items.forEach(item => {
            if (item.discount && item.discountAmount > 0) {
                const key = item.discount.id;
                const entry = discounts.get(key) || {
                    name: item.discount.name,
                    amount: 0,
                    details: []
                };

                const totalItemDiscount = item.discountAmount * item.quantity;
                entry.amount += totalItemDiscount;
                entry.details.push({
                    unitDiscount: item.discountAmount,
                    quantity: item.quantity,
                    type: item.discount.type,
                    value: item.discount.value
                });
                discounts.set(key, entry);
            }
        });

        // Global discount
        const totalItemDiscounts = transaction.items.reduce((sum, item) => sum + (item.discountAmount * item.quantity), 0);
        const globalDiscountRemainder = transaction.discountAmount - totalItemDiscounts;

        if (transaction.discount && globalDiscountRemainder > 0) {
            const key = transaction.discount.id;
            const entry = discounts.get(key) || {
                name: transaction.discount.name,
                amount: 0,
                details: []
            };
            entry.amount += globalDiscountRemainder;
            entry.details.push({
                unitDiscount: globalDiscountRemainder,
                quantity: 1,
                type: transaction.discount.type,
                value: transaction.discount.value
            });
            discounts.set(key, entry);
        } else if (globalDiscountRemainder > 0) {
            // Fallback for cases where discountId might be missing but discountAmount exists
            const key = 'unknown_global';
            const entry = discounts.get(key) || {
                name: 'その他の割引',
                amount: 0,
                details: []
            };
            entry.amount += globalDiscountRemainder;
            entry.details.push({
                unitDiscount: globalDiscountRemainder,
                quantity: 1
            });
            discounts.set(key, entry);
        }

        return Array.from(discounts.values());
    };

    const appliedDiscounts = getAppliedDiscounts();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>取引詳細</DialogTitle>
                    <DialogDescription>
                        取引ID: {transactionId}
                    </DialogDescription>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : transaction ? (
                    <div className="space-y-6">
                        {/* Transaction Info Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                            <div className="space-y-1">
                                <p className="text-muted-foreground">日時</p>
                                <p className="font-medium">{formatDate(transaction.createdAt)}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-muted-foreground">担当者</p>
                                <p className="font-medium">{transaction.user?.name}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-muted-foreground">決済方法</p>
                                <p className="font-medium">{transaction.paymentMethod}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-muted-foreground">ステータス</p>
                                <div>{getStatusBadge(transaction.status)}</div>
                            </div>
                        </div>

                        {/* Items Table */}
                        <div>
                            <h3 className="font-semibold mb-2">購入商品</h3>
                            <div className="border rounded-md">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>商品名</TableHead>
                                            <TableHead className="text-right">単価</TableHead>
                                            <TableHead className="text-right">数量</TableHead>
                                            <TableHead className="text-right">小計</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {transaction.items.map((item) => (
                                            <TableRow key={item.id}>
                                                <TableCell>
                                                    <div>{item.product?.name || item.productName}</div>
                                                    {item.discount && (
                                                        <div className="text-xs text-rose-600">
                                                            (割引: {item.discount.name} -{formatCurrency(item.discountAmount)})
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                                                <TableCell className="text-right">{item.quantity}</TableCell>
                                                <TableCell className="text-right">
                                                    {formatCurrency(item.unitPrice * item.quantity)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>

                        {/* Applied Discounts List */}
                        {appliedDiscounts.length > 0 && (
                            <div>
                                <h3 className="font-semibold mb-2">適用された割引</h3>
                                <div className="border rounded-md bg-muted/20">
                                    <Table>
                                        <TableBody>
                                            {appliedDiscounts.map((d, i) => (
                                                <TableRow key={i}>
                                                    <TableCell className="font-medium">
                                                        <div>{d.name}</div>
                                                        <div className="text-xs text-muted-foreground font-normal">
                                                            {d.details.map((detail, j) => (
                                                                <div key={j}>
                                                                    {detail.type === 'FIXED' ? (
                                                                        `-${formatCurrency(detail.unitDiscount)} × ${detail.quantity}`
                                                                    ) : detail.type === 'PERCENT' ? (
                                                                        `${detail.value}% 割引 (数量: ${detail.quantity})`
                                                                    ) : (
                                                                        `-${formatCurrency(detail.unitDiscount)}`
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right text-rose-600">
                                                        -{formatCurrency(d.amount)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        )}

                        {/* Summary */}
                        <div className="border-t pt-4 space-y-2">
                            <div className="flex justify-between items-center text-sm">
                                <span>小計 (割引前)</span>
                                <span>
                                    {formatCurrency(
                                        transaction.items.reduce((sum, item) => sum + (item.originalPrice || (item.unitPrice + item.discountAmount)) * item.quantity, 0)
                                    )}
                                </span>
                            </div>

                            <div className="flex justify-between items-center text-sm text-rose-600">
                                <span>割引合計</span>
                                <span>-{formatCurrency(transaction.discountAmount)}</span>
                            </div>

                            <div className="flex justify-between items-center text-lg font-bold pt-2 border-t">
                                <span>合計金額</span>
                                <span>{formatCurrency(transaction.totalAmount)}</span>
                            </div>
                        </div>

                        {/* Footer / Actions */}
                        <div className="flex justify-end gap-2 pt-4">
                            <Button variant="outline" onClick={() => onOpenChange(false)}>
                                閉じる
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="py-8 text-center text-muted-foreground">
                        データが見つかりません
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
