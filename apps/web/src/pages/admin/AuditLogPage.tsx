import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { AuditLog } from '@koubou-fes-pos/shared';
import { AuditLogTable } from '@/components/audit/AuditLogTable';
import { AuditLogDetailModal } from '@/components/audit/AuditLogDetailModal';
import type { AuditLogFilters } from '@/components/audit/AuditLogTable';

export default function AuditLogPage() {
    const { orgId } = useParams<{ orgId: string }>();
    const [page, setPage] = useState(1);
    const [limit] = useState(20);
    const [filters, setFilters] = useState<AuditLogFilters>({});
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
    const [detailOpen, setDetailOpen] = useState(false);

    const { data, isLoading } = useQuery({
        queryKey: ['audit-logs', orgId, page, filters],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (filters.startDate) params.append('startDate', filters.startDate);
            if (filters.endDate) params.append('endDate', filters.endDate);
            if (filters.category) params.append('category', filters.category);
            if (filters.userId) params.append('userId', filters.userId);
            params.append('page', page.toString());
            params.append('limit', limit.toString());

            const res = await api.get(`/audit-logs/organizations/${orgId}?${params.toString()}`);
            return res.data;
        },
        enabled: !!orgId,
    });

    const handleViewDetail = (log: AuditLog) => {
        setSelectedLog(log);
        setDetailOpen(true);
    };

    const handleExportCsv = async () => {
        try {
            const params = new URLSearchParams();
            if (filters.startDate) params.append('startDate', filters.startDate);
            if (filters.endDate) params.append('endDate', filters.endDate);
            if (filters.category) params.append('category', filters.category);
            if (filters.userId) params.append('userId', filters.userId);

            const response = await api.get(`/audit-logs/organizations/${orgId}/export?${params.toString()}`, {
                responseType: 'blob',
            });

            // Create download link
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `audit-logs-${orgId}-${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('CSV export failed:', error);
        }
    };

    const logs = data?.data || [];
    const total = data?.meta?.total || 0;

    return (
        <div className="container mx-auto py-6 space-y-6">
            <h1 className="text-2xl font-bold">監査ログ</h1>

            <AuditLogTable
                logs={logs}
                total={total}
                page={page}
                limit={limit}
                onPageChange={setPage}
                onFilterChange={setFilters}
                onViewDetail={handleViewDetail}
                onExportCsv={handleExportCsv}
                isLoading={isLoading}
            />

            <AuditLogDetailModal
                log={selectedLog}
                open={detailOpen}
                onOpenChange={setDetailOpen}
            />
        </div>
    );
}
