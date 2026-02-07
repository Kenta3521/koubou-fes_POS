import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Filter, History } from 'lucide-react';
import { api } from '@/lib/api';
import { TransactionDetailModal } from '@/features/admin/transactions/TransactionDetailModal';
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";
import { usePermission } from '@/hooks/usePermission';

// Type definitions matching API response
interface TransactionSummary {
    id: string;
    totalAmount: number;
    paymentMethod: string;
    status: string;
    createdAt: string;
    user: { name: string };
}

interface Meta {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export default function TransactionHistoryPage() {
    const { orgId } = useParams<{ orgId: string }>();
    const navigate = useNavigate();
    const { can } = usePermission();

    // 権限チェック
    useEffect(() => {
        if (!can('read', 'transaction')) {
            navigate('/access-denied');
        }
    }, [can, navigate]);
    const [transactions, setTransactions] = useState<TransactionSummary[]>([]);
    const [meta, setMeta] = useState<Meta>({ total: 0, page: 1, limit: 20, totalPages: 1 });
    const [isLoading, setIsLoading] = useState(false);

    // Filters
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('ALL');
    const [dateFilter, setDateFilter] = useState<string>(''); // YYYY-MM-DD

    // Modal State
    const [selectedTxId, setSelectedTxId] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        if (orgId) {
            fetchTransactions(1);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orgId, statusFilter, paymentMethodFilter, dateFilter]);

    const fetchTransactions = async (page: number) => {
        if (!orgId) return;
        setIsLoading(true);

        try {
            const params = new URLSearchParams();
            params.append('page', page.toString());
            params.append('limit', '20');

            if (statusFilter !== 'ALL') params.append('status', statusFilter);
            if (paymentMethodFilter !== 'ALL') params.append('paymentMethod', paymentMethodFilter);
            if (dateFilter) {
                // simple date filter: start=date, end=date (API logic handles end of day)
                params.append('startDate', new Date(dateFilter).toISOString());
                params.append('endDate', new Date(dateFilter).toISOString());
            }

            const res = await api.get<{ success: boolean; data: TransactionSummary[]; meta: Meta }>(
                `/organizations/${orgId}/transactions?${params.toString()}`
            );

            setTransactions(res.data.data);
            setMeta(res.data.meta);
        } catch (error) {
            console.error('Failed to fetch transactions:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= meta.totalPages) {
            fetchTransactions(newPage);
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
            case 'CANCELED':
                return <Badge variant="destructive">キャンセル</Badge>;
            case 'PENDING':
                return <Badge variant="outline" className="text-amber-500 border-amber-500">保留中</Badge>;
            default:
                return <Badge variant="secondary">{status}</Badge>;
        }
    };

    return (
        <div className="container mx-auto py-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                    <History className="w-8 h-8" />
                    取引履歴
                </h1>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>取引一覧</CardTitle>
                    <CardDescription>
                        過去の取引履歴を確認できます。フィルタ機能を使って特定の取引を検索できます。
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Filters */}
                    <div className="flex flex-col sm:flex-row gap-4 items-end sm:items-center bg-muted/20 p-4 rounded-lg">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">日付</label>
                                <Input
                                    type="date"
                                    value={dateFilter}
                                    onChange={(e) => setDateFilter(e.target.value)}
                                    className="w-full"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">ステータス</label>
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="全てのステータス" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL">全て</SelectItem>
                                        <SelectItem value="COMPLETED">完了</SelectItem>
                                        <SelectItem value="CANCELED">キャンセル</SelectItem>
                                        <SelectItem value="PENDING">保留中</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">決済方法</label>
                                <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="全ての決済方法" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL">全て</SelectItem>
                                        <SelectItem value="CASH">現金</SelectItem>
                                        <SelectItem value="PAYPAY">PayPay</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => {
                                setDateFilter('');
                                setStatusFilter('ALL');
                                setPaymentMethodFilter('ALL');
                            }}
                            title="フィルタをリセット"
                        >
                            <Filter className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Table */}
                    <div className="border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>日時</TableHead>
                                    <TableHead>担当者</TableHead>
                                    <TableHead>決済方法</TableHead>
                                    <TableHead>ステータス</TableHead>
                                    <TableHead className="text-right">合計金額</TableHead>
                                    <TableHead></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8">
                                            <div className="flex justify-center items-center gap-2 text-muted-foreground">
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                読み込み中...
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : transactions.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                            取引が見つかりません
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    transactions.map((tx) => (
                                        <TableRow key={tx.id}>
                                            <TableCell className="font-medium">{formatDate(tx.createdAt)}</TableCell>
                                            <TableCell>{tx.user.name}</TableCell>
                                            <TableCell>{tx.paymentMethod}</TableCell>
                                            <TableCell>{getStatusBadge(tx.status)}</TableCell>
                                            <TableCell className="text-right font-bold">{formatCurrency(tx.totalAmount)}</TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                        setSelectedTxId(tx.id);
                                                        setIsModalOpen(true);
                                                    }}
                                                >
                                                    詳細
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination */}
                    {/* Pagination */}
                    {meta.totalPages > 1 && (
                        <div className="pt-4">
                            <Pagination>
                                <PaginationContent>
                                    <PaginationItem>
                                        <PaginationPrevious
                                            onClick={() => handlePageChange(meta.page - 1)}
                                            className={meta.page <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                        />
                                    </PaginationItem>

                                    {/* Simple page numbers: show current, maybe siblings if complex but for now just simple numbers or abbreviated */}
                                    {Array.from({ length: meta.totalPages }, (_, i) => i + 1).map((page) => (
                                        // Simple logic: if many pages, might want to limit. For now, show all or limits if < 10
                                        (meta.totalPages <= 7 || page === 1 || page === meta.totalPages || (page >= meta.page - 1 && page <= meta.page + 1)) ? (
                                            <PaginationItem key={page}>
                                                <PaginationLink
                                                    isActive={page === meta.page}
                                                    onClick={() => handlePageChange(page)}
                                                    className="cursor-pointer"
                                                >
                                                    {page}
                                                </PaginationLink>
                                            </PaginationItem>
                                        ) : (
                                            (page === 2 && meta.page > 4) || (page === meta.totalPages - 1 && meta.page < meta.totalPages - 3) ? (
                                                <PaginationItem key={page}>
                                                    <PaginationEllipsis />
                                                </PaginationItem>
                                            ) : null
                                        )
                                    ))}

                                    <PaginationItem>
                                        <PaginationNext
                                            onClick={() => handlePageChange(meta.page + 1)}
                                            className={meta.page >= meta.totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                        />
                                    </PaginationItem>
                                </PaginationContent>
                            </Pagination>
                        </div>
                    )}
                </CardContent>
            </Card>

            <TransactionDetailModal
                open={isModalOpen}
                onOpenChange={setIsModalOpen}
                transactionId={selectedTxId}
            />
        </div>
    );
}
