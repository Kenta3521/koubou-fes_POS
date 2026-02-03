import { UserWithOrganizations } from './user.js';

// Login request - API設計書.md 2.1
export interface LoginRequest {
    email: string;
    password: string;
}

// Login response - API設計書.md 2.1
export interface LoginResponse {
    token: string;
    user: UserWithOrganizations;
}

// Register request - API設計書.md 2.2
export interface RegisterRequest {
    email: string;
    password: string;
    name: string;
    inviteCode: string;
}

// Password reset request - API設計書.md 2.3
export interface PasswordResetRequest {
    email: string;
}

// Password reset confirm - API設計書.md 2.4
export interface PasswordResetConfirm {
    token: string;
    newPassword: string;
}

// Update profile request - API設計書.md 3.2
export interface UpdateProfileRequest {
    name?: string;
}

// Change password request - API設計書.md 3.3
export interface ChangePasswordRequest {
    currentPassword: string;
    newPassword: string;
}

// JWT Payload - JWT token payload structure
export interface JWTPayload {
    userId: string;
    email: string;
    isSystemAdmin: boolean;
}
