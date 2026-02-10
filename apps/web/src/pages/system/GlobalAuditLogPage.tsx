import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { AuditLogListResponse } from '@koubou-fes-pos/shared';
import { AuditLogTable } from '@/components/admin/AuditLogTable';
import { Card, CardContent } from '@/components/ui/card';
import { History, LayoutGrid } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function GlobalAuditLogPage() {
    const [activeTab, setActiveTab] = useState('all');

    const { data, isLoading } = useQuery({
        queryKey: ['admin-audit-logs'],
        queryFn: async () => {
            const res = await api.get('/admin/audit-logs');
            return res.data.data as AuditLogListResponse;
        },
    });

    // システム管理者の全体ログでは、システムレベルの操作のみを表示
    const filteredLogs = data?.logs.filter((log) => {
        // 基本的に特権アクションまたは団体に紐づかないアクション
        const isSystemLevel = log.isSystemAdminAction || !log.organizationId;
        if (!isSystemLevel) return false;

        if (activeTab === 'all') return true;
        if (activeTab === 'org') return log.action.startsWith('ORG_');
        if (activeTab === 'account') return log.action.startsWith('USER_') || log.action.startsWith('MEMBER_') || log.action === 'LOGIN';
        if (activeTab === 'system') return log.action.startsWith('SYSTEM_') || log.action.startsWith('ROLE_') || log.action.startsWith('PERMISSION_');
        if (activeTab === 'other') {
            return !log.action.startsWith('ORG_') &&
                !log.action.startsWith('USER_') &&
                !log.action.startsWith('MEMBER_') &&
                !log.action.startsWith('SYSTEM_') &&
                !log.action.startsWith('ROLE_') &&
                !log.action.startsWith('PERMISSION_') &&
                log.action !== 'LOGIN';
        }
        return true;
    }) || [];

    return (
        <div className="container mx-auto py-6 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <History className="size-6" />
                    <h1 className="text-2xl font-bold">システム監査ログ</h1>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid grid-cols-5 w-fit h-auto p-1">
                    <TabsTrigger value="all" className="px-4 py-2">全て</TabsTrigger>
                    <TabsTrigger value="org" className="px-4 py-2">団体管理</TabsTrigger>
                    <TabsTrigger value="account" className="px-4 py-2">アカウント</TabsTrigger>
                    <TabsTrigger value="system" className="px-4 py-2">システム</TabsTrigger>
                    <TabsTrigger value="other" className="px-4 py-2">その他</TabsTrigger>
                </TabsList>
            </Tabs>

            <Card>
                <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-medium">システムレベル操作履歴</h2>
                        <LayoutGrid className="size-4 text-muted-foreground" />
                    </div>
                    <AuditLogTable
                        logs={filteredLogs}
                        isLoading={isLoading}
                        showOrganization={true}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
