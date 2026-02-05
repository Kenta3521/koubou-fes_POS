
import { Role } from '../constants/index.js';

export interface Member {
    userId: string;
    organizationId: string;
    role: Role;
    user: {
        id: string;
        name: string;
        email: string;
        status: string;
        createdAt: string | Date;
    };
}

export interface UpdateMemberRequest {
    role: Role;
}
