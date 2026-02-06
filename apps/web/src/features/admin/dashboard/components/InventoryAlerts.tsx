import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, AlertTriangle } from 'lucide-react';
import { useDashboardInventory } from '../hooks/useDashboardData';

export function InventoryAlerts({ orgId }: { orgId: string }) {
    const { data, isLoading } = useDashboardInventory(orgId);

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>在庫状況</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="h-10 bg-muted animate-pulse rounded" />
                    <div className="h-10 bg-muted animate-pulse rounded" />
                </CardContent>
            </Card>
        );
    }

    const { outOfStock = [], lowStock = [] } = data || {};

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle>在庫状況</CardTitle>
                <div className="flex gap-2">
                    {outOfStock.length > 0 && (
                        <Badge variant="destructive" className="animate-pulse">
                            品切れ {outOfStock.length}
                        </Badge>
                    )}
                    {lowStock.length > 0 && (
                        <Badge variant="outline" className="text-amber-600 border-amber-600">
                            僅少 {lowStock.length}
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-4 max-h-[300px] overflow-auto">
                {outOfStock.length === 0 && lowStock.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8 text-sm">
                        全ての商品は十分に在庫があります
                    </p>
                ) : (
                    <>
                        {outOfStock.map((p: any) => (
                            <div key={p.id} className="flex items-center justify-between p-2 rounded bg-rose-50 dark:bg-rose-950/20">
                                <div className="flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4 text-rose-600" />
                                    <span className="text-sm font-medium">{p.name}</span>
                                </div>
                                <Badge variant="destructive">品切れ</Badge>
                            </div>
                        ))}
                        {lowStock.map((p: any) => (
                            <div key={p.id} className="flex items-center justify-between p-2 rounded bg-amber-50 dark:bg-amber-950/20">
                                <div className="flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                                    <span className="text-sm font-medium">{p.name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-amber-700">残り {p.stock}</span>
                                    <Badge variant="outline" className="text-amber-600 border-amber-600">在庫僅少</Badge>
                                </div>
                            </div>
                        ))}
                    </>
                )}
            </CardContent>
        </Card>
    );
}
