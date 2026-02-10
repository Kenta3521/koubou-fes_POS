import React, { useState } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ShieldAlert, User, Clock, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { AuditLog } from '@koubou-fes-pos/shared';
import { formatAuditLogMessage } from '@/lib/AuditLogFormatter';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';

interface AuditLogTableProps {
    logs: AuditLog[];
    isLoading: boolean;
    showOrganization?: boolean;
}

export function AuditLogTable({ logs, isLoading, showOrganization = false }: AuditLogTableProps) {
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

    if (isLoading) {
        return (
            <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                ))}
            </div>
        );
    }

    if (logs.length === 0) {
        return (
            <div className="text-center py-10 border rounded-lg bg-muted/20">
                <p className="text-muted-foreground">ログは見つかりませんでした。</p>
            </div>
        );
    }

    const fieldMap: Record<string, string> = {
        name: '名前',
        price: '価格',
        stock: '在庫',
        isActive: '有効状態',
        categoryId: 'カテゴリ',
        sortOrder: '表示順',
        type: '種類',
        value: '値',
        description: '説明',
        permissions: '権限'
    };

    return (
        <div className="rounded-md border overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[180px]">日時</TableHead>
                        <TableHead className="w-[150px]">操作者</TableHead>
                        {showOrganization && <TableHead className="w-[150px]">団体</TableHead>}
                        <TableHead>操作内容</TableHead>
                        <TableHead className="w-[100px] text-center">区分</TableHead>
                        <TableHead className="w-[80px] text-center">詳細</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {logs.map((log) => {
                        const payload = log.payload;
                        return (
                            <TableRow key={log.id}>
                                <TableCell className="font-medium whitespace-nowrap">
                                    <div className="flex items-center gap-2">
                                        <Clock className="size-3.5 text-muted-foreground" />
                                        {format(new Date(log.createdAt), 'yyyy/MM/dd HH:mm:ss')}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <User className="size-3.5 text-muted-foreground" />
                                        <span className="truncate max-w-[120px]" title={log.user?.name || log.userId}>
                                            {log.user?.name || '不明'}
                                        </span>
                                    </div>
                                </TableCell>
                                {showOrganization && (
                                    <TableCell>
                                        <span className="truncate max-w-[120px]" title={log.organization?.name || log.organizationId || '-'}>
                                            {log.organization?.name || '-'}
                                        </span>
                                    </TableCell>
                                )}
                                <TableCell className="break-all text-sm">
                                    {formatAuditLogMessage(log)}
                                </TableCell>
                                <TableCell className="text-center">
                                    {log.isSystemAdminAction ? (
                                        <Badge variant="destructive" className="gap-1 whitespace-nowrap">
                                            <ShieldAlert className="size-3" />
                                            特権
                                        </Badge>
                                    ) : (
                                        <Badge variant="secondary">一般</Badge>
                                    )}
                                </TableCell>
                                <TableCell className="text-center">
                                    {payload && typeof payload === 'object' && 'changes' in payload && Object.keys((payload as { changes: Record<string, unknown> }).changes).length > 0 && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setSelectedLog(log)}
                                            className="size-8"
                                        >
                                            <Eye className="size-4" />
                                        </Button>
                                    )}
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>

            <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>変更詳細</DialogTitle>
                        <DialogDescription>
                            {selectedLog && format(new Date(selectedLog.createdAt), 'yyyy/MM/dd HH:mm:ss')} の操作による変更内容
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="rounded-md border p-4 bg-muted/30">
                            <p className="text-sm font-medium mb-3">
                                {selectedLog && formatAuditLogMessage(selectedLog)}
                            </p>
                            <div className="space-y-3">
                                {selectedLog && selectedLog.payload && typeof selectedLog.payload === 'object' && 'changes' in selectedLog.payload &&
                                    Object.entries((selectedLog.payload as { changes: Record<string, { old: unknown; new: unknown }> }).changes).map(([key, value]) => (
                                        <div key={key} className="grid grid-cols-12 gap-2 text-sm">
                                            <div className="col-span-12 font-medium text-muted-foreground mb-1">
                                                {fieldMap[key] || key}
                                            </div>
                                            <div className="col-span-12 flex gap-2 items-center">
                                                <div className="flex-1 p-2 bg-red-50 text-red-700 rounded border border-red-100 line-through truncate text-xs" title={String(value.old)}>
                                                    {String(value.old)}
                                                </div>
                                                <div className="flex-none text-muted-foreground text-xs font-bold">
                                                    →
                                                </div>
                                                <div className="flex-1 p-2 bg-green-50 text-green-700 rounded border border-green-100 font-medium truncate text-xs" title={String(value.new)}>
                                                    {String(value.new)}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                }
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <Button variant="outline" onClick={() => setSelectedLog(null)}>閉じる</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
