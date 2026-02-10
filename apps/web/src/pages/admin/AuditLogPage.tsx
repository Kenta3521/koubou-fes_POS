import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { AuditLogListResponse } from '@koubou-fes-pos/shared';
import { AuditLogTable } from '@/components/admin/AuditLogTable';
import { Card, CardContent } from '@/components/ui/card';
import { History } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function AuditLogPage() {
    const { orgId } = useParams<{ orgId: string }>();
    const [activeTab, setActiveTab] = useState('all');

    const { data, isLoading } = useQuery({
        queryKey: ['audit-logs', orgId],
        queryFn: async () => {
            const res = await api.get(`/organizations/${orgId}/audit-logs`);
            return res.data.data as AuditLogListResponse;
        },
        enabled: !!orgId,
    });

    const filteredLogs = data?.logs.filter((log) => {
        if (activeTab === 'all') return true;
        if (activeTab === 'product') return log.action.startsWith('PRODUCT_');
        if (activeTab === 'category') return log.action.startsWith('CATEGORY_');
        if (activeTab === 'discount') return log.action.startsWith('DISCOUNT_');
        if (activeTab === 'transaction') return log.action.startsWith('TRANS_');
        if (activeTab === 'other') {
            return !log.action.startsWith('PRODUCT_') &&
                !log.action.startsWith('CATEGORY_') &&
                !log.action.startsWith('DISCOUNT_') &&
                !log.action.startsWith('TRANS_');
        }
        return true;
    }) || [];

    return (
        <div className="container mx-auto py-6 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <History className="size-6" />
                    <h1 className="text-2xl font-bold">監査ログ</h1>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid grid-cols-6 w-fit h-auto p-1">
                    <TabsTrigger value="all" className="px-4 py-2">全て</TabsTrigger>
                    <TabsTrigger value="category" className="px-4 py-2">カテゴリ</TabsTrigger>
                    <TabsTrigger value="product" className="px-4 py-2">商品</TabsTrigger>
                    <TabsTrigger value="discount" className="px-4 py-2">割引</TabsTrigger>
                    <TabsTrigger value="transaction" className="px-4 py-2">会計</TabsTrigger>
                    <TabsTrigger value="other" className="px-4 py-2">その他</TabsTrigger>
                </TabsList>
            </Tabs>

            <Card>
                <CardContent className="pt-6">
                    <AuditLogTable
                        logs={filteredLogs}
                        isLoading={isLoading}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
