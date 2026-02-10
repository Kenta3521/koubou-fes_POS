export interface AuditLog {
    id: string;
    userId: string;
    organizationId?: string | null;
    action: string;
    targetId?: string | null;
    payload: any;
    isSystemAdminAction: boolean;
    createdAt: string;
    user?: {
        id: string;
        name: string;
        email: string;
    } | null;
    organization?: {
        id: string;
        name: string;
    } | null;
}
export interface AuditLogListResponse {
    logs: AuditLog[];
    total: number;
}
//# sourceMappingURL=audit.d.ts.map