import { UserWithOrganizations } from './user.js';
export interface LoginRequest {
    email: string;
    password: string;
}
export interface LoginResponse {
    token: string;
    user: UserWithOrganizations;
}
export interface RegisterRequest {
    email: string;
    password: string;
    name: string;
    inviteCode: string;
}
export interface PasswordResetRequest {
    email: string;
}
export interface PasswordResetConfirm {
    token: string;
    newPassword: string;
}
export interface ChangePasswordRequest {
    currentPassword: string;
    newPassword: string;
}
export interface JWTPayload {
    userId: string;
    email: string;
    organizationId?: string;
    role?: string;
}
export interface JoinOrganizationRequest {
    inviteCode: string;
}
//# sourceMappingURL=auth.d.ts.map