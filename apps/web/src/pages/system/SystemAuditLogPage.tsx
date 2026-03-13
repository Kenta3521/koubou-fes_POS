
import { useQuery } from '@tanstack/react-query';
import { getSystemAuditLogs, type AuditLogFilters } from '@/lib/api';
import { AuditLogTable } from '@/components/audit/AuditLogTable';
import { AuditLogDetailModal } from '@/components/audit/AuditLogDetailModal';
import { useState } from 'react';
import type { AuditLog } from '@koubou-fes-pos/shared';

export default function SystemAuditLogPage() {
    const [page, setPage] = useState(1);
    const [limit] = useState(20);
    const [filters, setFilters] = useState<AuditLogFilters>({});
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
    const [detailOpen, setDetailOpen] = useState(false);

    const { data, isLoading } = useQuery({
        queryKey: ['system-audit-logs', page, filters],
        queryFn: () => getSystemAuditLogs({ ...filters, page, limit }),
    });

    const handleViewDetail = (log: AuditLog) => {
        setSelectedLog(log);
        setDetailOpen(true);
    };

    const logs = data?.data?.data || [];
    const total = data?.data?.meta?.total || 0;

    return (
        <div className="container mx-auto p-6">
            <h1 className="text-2xl font-bold mb-6">システム監査ログ</h1>

            <div className="mb-6">
                <AuditLogTable
                    logs={logs}
                    total={total}
                    page={page}
                    limit={limit}
                    onPageChange={setPage}
                    onFilterChange={setFilters}
                    onViewDetail={handleViewDetail}
                    isLoading={isLoading}
                />
            </div>

            <AuditLogDetailModal
                log={selectedLog}
                open={detailOpen}
                onOpenChange={setDetailOpen}
            />
        </div>
    );
}
