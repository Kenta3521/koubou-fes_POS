import { UserStatus, Role } from '../constants/index.js';

// User type based on DB設計書.md User model
export interface User {
    id: string;
    email: string;
    name: string;
    status: UserStatus;
    isSystemAdmin: boolean;
    createdAt: Date;
}

// UserOrganization relation
export interface UserOrganization {
    userId: string;
    organizationId: string;
    role: Role;
}

// User with organizations for authentication response
export interface UserWithOrganizations extends User {
    organizations: Array<{
        id: string;
        name: string;
        role: Role;
    }>;
}
