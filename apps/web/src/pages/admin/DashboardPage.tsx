import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SummaryCards } from '@/features/admin/dashboard/components/SummaryCards';
import { SalesTrendChart } from '@/features/admin/dashboard/components/SalesTrendChart';
import { CategorySalesChart } from '@/features/admin/dashboard/components/CategorySalesChart';
import { InventoryAlerts } from '@/features/admin/dashboard/components/InventoryAlerts';
import { SystemStatus } from '@/features/admin/dashboard/components/SystemStatus';
import { useDashboardSummary, useDashboardTrends } from '@/features/admin/dashboard/hooks/useDashboardData';

export default function DashboardPage() {
    const { orgId } = useParams<{ orgId: string }>();

    // データの取得
    const { data: summary, isLoading: isSummaryLoading } = useDashboardSummary(orgId!);
    const { data: trends, isLoading: isTrendsLoading } = useDashboardTrends(orgId!);

    return (
        <div className="container mx-auto p-4 space-y-6">
            <h1 className="text-2xl font-bold">ダッシュボード</h1>

            {/* エグゼクティブサマリー */}
            <SummaryCards data={summary} isLoading={isSummaryLoading} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 売上推移チャート (メイン) */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>売上推移 (30分単位)</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[400px]">
                        <SalesTrendChart data={trends} isLoading={isTrendsLoading} />
                    </CardContent>
                </Card>

                {/* カテゴリ別売上 */}
                <Card>
                    <CardHeader>
                        <CardTitle>カテゴリ別売上</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[400px]">
                        <CategorySalesChart orgId={orgId!} />
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 在庫警告 */}
                <InventoryAlerts orgId={orgId!} />

                {/* システムステータス */}
                <SystemStatus orgId={orgId!} />
            </div>
        </div>
    );
}
