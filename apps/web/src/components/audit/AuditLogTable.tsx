
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
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
import { format } from 'date-fns';
import type { AuditLog } from '@koubou-fes-pos/shared';
import { formatAuditLogMessage } from '@/lib/AuditLogFormatter';
import { useState } from 'react';
import { ChevronLeft, ChevronRight, FileText, Download } from 'lucide-react';

interface AuditLogTableProps {
    logs: AuditLog[];
    total: number;
    page: number;
    limit: number;
    onPageChange: (page: number) => void;
    onFilterChange: (filters: AuditLogFilters) => void;
    onViewDetail: (log: AuditLog) => void;
    onExportCsv?: () => void;
    isLoading?: boolean;
}

export interface AuditLogFilters {
    startDate?: string;
    endDate?: string;
    category?: string;
    action?: string;
    userId?: string;
}

const CATEGORIES = ['AUTH', 'USER', 'PRODUCT', 'DISCOUNT', 'ROLE', 'TRANSACTION', 'ORG', 'SYSTEM'];

export function AuditLogTable({
    logs,
    total,
    page,
    limit,
    onPageChange,
    onFilterChange,
    onViewDetail,
    onExportCsv,
    isLoading
}: AuditLogTableProps) {
    const [filters, setFilters] = useState<AuditLogFilters>({});

    const handleFilterChange = (key: keyof AuditLogFilters, value: string) => {
        const newFilters = { ...filters, [key]: value || undefined };
        setFilters(newFilters);
        onFilterChange(newFilters);
        onPageChange(1); // Reset to first page on filter change
    };

    const totalPages = Math.ceil(total / limit);

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-4 items-end bg-muted/30 p-4 rounded-lg">
                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium">開始日</label>
                    <Input
                        type="date"
                        className="w-[160px]"
                        value={filters.startDate || ''}
                        onChange={(e) => handleFilterChange('startDate', e.target.value)}
                    />
                </div>
                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium">終了日</label>
                    <Input
                        type="date"
                        className="w-[160px]"
                        value={filters.endDate || ''}
                        onChange={(e) => handleFilterChange('endDate', e.target.value)}
                    />
                </div>
                <div className="flex flex-col gap-1.5 min-w-[140px]">
                    <label className="text-sm font-medium">カテゴリ</label>
                    <Select
                        value={filters.category || 'all'}
                        onValueChange={(val) => handleFilterChange('category', val === 'all' ? '' : val)}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="全カテゴリ" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">全カテゴリ</SelectItem>
                            {CATEGORIES.map((cat) => (
                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                {/* Export Button */}
                {onExportCsv && (
                    <div className="ml-auto">
                        <Button variant="outline" onClick={onExportCsv} disabled={isLoading}>
                            <Download className="mr-2 h-4 w-4" />
                            CSVエクスポート
                        </Button>
                    </div>
                )}
            </div>

            {/* Table */}
            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[180px]">日時</TableHead>
                            <TableHead className="w-[120px]">カテゴリ</TableHead>
                            <TableHead className="w-[150px]">実行者</TableHead>
                            <TableHead>操作内容</TableHead>
                            <TableHead className="w-[100px] text-right">詳細</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {logs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                    ログが見つかりません
                                </TableCell>
                            </TableRow>
                        ) : (
                            logs.map((log) => (
                                <TableRow key={log.id}>
                                    <TableCell className="font-mono text-sm">
                                        {format(new Date(log.createdAt), 'yyyy/MM/dd HH:mm:ss')}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="font-normal font-mono text-xs">
                                            {log.category || 'UNKNOWN'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {log.user ? (
                                            <div className="flex flex-col">
                                                <span>{log.user.name}</span>
                                            </div>
                                        ) : (
                                            <span className="text-muted-foreground italic">System</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {formatAuditLogMessage(log)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => onViewDetail(log)}
                                            className="h-8 w-8 p-0"
                                        >
                                            <FileText className="h-4 w-4" />
                                            <span className="sr-only">詳細を表示</span>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                        {total} 件中 {(page - 1) * limit + 1} - {Math.min(page * limit, total)} 件を表示
                    </div>
                    <div className="flex items-center space-x-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onPageChange(page - 1)}
                            disabled={page <= 1 || isLoading}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <div className="text-sm font-medium">
                            {page} / {totalPages}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onPageChange(page + 1)}
                            disabled={page >= totalPages || isLoading}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
