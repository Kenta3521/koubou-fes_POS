import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Users, JapaneseYen, Clock } from 'lucide-react';

interface SummaryCardsProps {
    data?: {
        totalSales: number;
        totalCustomers: number;
        lastHourSales: number;
        growthRate: number;
    };
    isLoading: boolean;
}

export function SummaryCards({ data, isLoading }: SummaryCardsProps) {
    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Loading...</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-8 w-1/2" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    const cards = [
        {
            title: '総売上高',
            value: `¥${(data?.totalSales ?? 0).toLocaleString()}`,
            icon: JapaneseYen,
            description: '累計売上額',
            color: 'text-blue-600',
        },
        {
            title: '累計客数',
            value: `${(data?.totalCustomers ?? 0).toLocaleString()}名`,
            icon: Users,
            description: '累計取引件数',
            color: 'text-green-600',
        },
        {
            title: '直近1時間の売上',
            value: `¥${(data?.lastHourSales ?? 0).toLocaleString()}`,
            icon: Clock,
            description: '1時間以内の売上',
            color: 'text-purple-600',
        },
        {
            title: '前時比',
            value: `${data?.growthRate ?? 0}%`,
            icon: (data?.growthRate ?? 0) >= 0 ? TrendingUp : TrendingDown,
            description: '前1時間との比較',
            color: (data?.growthRate ?? 0) >= 0 ? 'text-emerald-600' : 'text-rose-600',
        },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {cards.map((card, i) => (
                <Card key={i}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                        <card.icon className={`h-4 w-4 ${card.color}`} />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{card.value}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {card.description}
                        </p>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
