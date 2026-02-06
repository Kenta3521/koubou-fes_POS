import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Activity, Server, Database } from 'lucide-react';
import { useDashboardHealth } from '../hooks/useDashboardData';

export function SystemStatus({ orgId }: { orgId: string }) {
    const { data, isLoading } = useDashboardHealth(orgId);

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>システムステータス</CardTitle>
                </CardHeader>
                <CardContent className="h-32 bg-muted animate-pulse rounded m-4" />
            </Card>
        );
    }

    const { dbStatus, serverUptime } = data || {};

    const formatUptime = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}時間${minutes}分`;
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-blue-600" />
                    システムステータス
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                        <div className="flex items-center gap-2">
                            <Database className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">データベース</span>
                        </div>
                        {dbStatus === 'ONLINE' ? (
                            <div className="flex items-center gap-1 text-emerald-600">
                                <CheckCircle2 className="h-4 w-4" />
                                <span className="text-xs font-bold">ONLINE</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1 text-rose-600">
                                <XCircle className="h-4 w-4" />
                                <span className="text-xs font-bold">OFFLINE</span>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                        <div className="flex items-center gap-2">
                            <Server className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">稼働時間</span>
                        </div>
                        <span className="text-sm font-bold text-blue-600">
                            {serverUptime ? formatUptime(serverUptime) : '---'}
                        </span>
                    </div>
                </div>

                <div className="mt-4 flex items-center justify-between px-1">
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        全てのシステムは正常に稼働しています
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                        最終更新: {new Date().toLocaleTimeString()}
                    </span>
                </div>
            </CardContent>
        </Card>
    );
}
