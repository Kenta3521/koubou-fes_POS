import { UserStatus, Role } from '../constants/index.js';
export interface User {
    id: string;
    email: string;
    name: string;
    status: UserStatus;
    isSystemAdmin: boolean;
    createdAt: Date;
}
export interface UserOrganization {
    userId: string;
    organizationId: string;
    role: Role;
}
export interface UserWithOrganizations extends User {
    organizations: Array<{
        id: string;
        name: string;
        isActive: boolean;
        role: Role;
        permissions: string[];
    }>;
}
export interface UpdateProfileRequest {
    name?: string;
    email?: string;
}
//# sourceMappingURL=user.d.ts.map