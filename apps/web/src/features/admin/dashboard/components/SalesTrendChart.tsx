import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

interface SalesTrendChartProps {
    data?: Array<{
        time: string;
        sales: number;
        customers: number;
        categories: { [key: string]: number };
    }>;
    isLoading: boolean;
}

export function SalesTrendChart({ data, isLoading }: SalesTrendChartProps) {
    if (isLoading) {
        return <Skeleton className="w-full h-full" />;
    }

    if (!data || data.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-muted-foreground">
                データがありません
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                    dataKey="time"
                    tick={{ fontSize: 12 }}
                    interval="preserveStartEnd"
                />
                <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `¥${value.toLocaleString()}`}
                />
                <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `${value}名`}
                />
                <Tooltip
                    formatter={(value: any, name: string) => {
                        if (name === '売上') return [`¥${value.toLocaleString()}`, name];
                        return [`${value}名`, name];
                    }}
                />
                <Legend />
                <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="sales"
                    name="売上"
                    stroke="#2563eb"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                />
                <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="customers"
                    name="客数"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                />
            </LineChart>
        </ResponsiveContainer>
    );
}
