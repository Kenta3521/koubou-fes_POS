
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import type { AuditLog } from '@koubou-fes-pos/shared';
import { formatAuditLogMessage } from '@/lib/AuditLogFormatter';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface AuditLogDetailModalProps {
    log: AuditLog | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function AuditLogDetailModal({ log, open, onOpenChange }: AuditLogDetailModalProps) {
    if (!log) return null;

    const payload = log.payload as any;
    const hasChanges = payload?.changes && Object.keys(payload.changes).length > 0;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        監査ログ詳細
                        <Badge variant="outline" className="ml-2 font-mono">
                            {log.action}
                        </Badge>
                    </DialogTitle>
                    <DialogDescription>
                        ID: {log.id}
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="h-full max-h-[60vh] pr-4">
                    <div className="grid gap-6">
                        {/* 基本情報 */}
                        <div className="space-y-4">
                            <h3 className="font-semibold border-b pb-2">基本情報</h3>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-muted-foreground block text-xs mb-1">実行日時</span>
                                    <span className="font-mono">{format(new Date(log.createdAt), 'yyyy/MM/dd HH:mm:ss')}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground block text-xs mb-1">カテゴリ</span>
                                    <span>{log.category}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground block text-xs mb-1">実行ユーザー</span>
                                    <span>{log.user?.name || 'System'}</span>
                                    <span className="text-xs text-muted-foreground ml-2">({log.userId || 'N/A'})</span>
                                </div>
                                {log.targetId && (
                                    <div>
                                        <span className="text-muted-foreground block text-xs mb-1">対象ID</span>
                                        <span className="font-mono text-xs">{log.targetId}</span>
                                    </div>
                                )}
                            </div>
                            <div>
                                <span className="text-muted-foreground block text-xs mb-1">概要</span>
                                <div className="p-3 bg-muted rounded-md text-sm">
                                    {formatAuditLogMessage(log)}
                                </div>
                            </div>
                        </div>

                        {/* 詳細データ */}
                        <div className="space-y-4">
                            <h3 className="font-semibold border-b pb-2">詳細データ</h3>

                            <Tabs defaultValue={hasChanges ? "diff" : "json"} className="w-full">
                                <TabsList>
                                    {hasChanges && <TabsTrigger value="diff">変更内容 (Diff)</TabsTrigger>}
                                    <TabsTrigger value="json">Raw JSON</TabsTrigger>
                                </TabsList>

                                {hasChanges && (
                                    <TabsContent value="diff">
                                        <div className="border rounded-md divide-y">
                                            <div className="grid grid-cols-2 bg-muted/50 p-2 font-medium text-xs text-center">
                                                <div>項目</div>
                                                <div>変更後の値</div>
                                            </div>
                                            {Object.entries(payload.changes).map(([key, val]: [string, any]) => {
                                                // Handle both formats: {old, new} or just the new value
                                                const displayValue = val?.new !== undefined ? val.new : val;

                                                return (
                                                    <div key={key} className="grid grid-cols-2 p-2 text-sm items-center">
                                                        <div className="font-mono text-xs font-semibold">{key}</div>
                                                        <div className="text-green-700 bg-green-50 p-2 rounded break-all mx-1 font-medium">
                                                            {displayValue === null
                                                                ? '(null)'
                                                                : displayValue === undefined
                                                                    ? '(未設定)'
                                                                    : typeof displayValue === 'object'
                                                                        ? JSON.stringify(displayValue, null, 2)
                                                                        : String(displayValue)}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </TabsContent>
                                )}

                                <TabsContent value="json">
                                    <div className="bg-slate-950 text-slate-50 p-4 rounded-md overflow-x-auto">
                                        <pre className="text-xs font-mono">
                                            {JSON.stringify(payload, null, 2)}
                                        </pre>
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </div>
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
