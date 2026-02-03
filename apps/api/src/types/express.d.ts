/**
 * Express型拡張
 * req.userにユーザー情報を追加
 */

import { UserWithOrganizations } from '@koubou-fes-pos/shared';

declare global {
    namespace Express {
        interface Request {
            user?: UserWithOrganizations;
        }
    }
}

export { };
