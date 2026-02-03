// Organization type based on DB設計書.md Organization model
export interface Organization {
    id: string;
    name: string;
    inviteCode: string;
    isActive: boolean;
    createdAt: Date;
}
