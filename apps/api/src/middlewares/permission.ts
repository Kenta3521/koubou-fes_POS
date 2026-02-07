
import { Request, Response, NextFunction } from 'express';
import { defineAbilityFor } from '../utils/casl/ability.factory.js';

/**
 * Check if the user has the required permission (CASL Check)
 * @param action Action to perform (e.g. 'view', 'create')
 * @param subject Subject to act upon (e.g. 'Dashboard', 'Product')
 */
export function checkPermission(action: string | string[], subject: string) {
    return (req: Request, res: Response, next: NextFunction): void => {
        // 1. Auth Check (Assumes authenticate middleware ran before)
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: { code: 'UNAUTHORIZED', message: '認証が必要です' }
            });
            return;
        }

        // 2. System Admin Bypass
        if (req.user.isSystemAdmin) {
            next();
            return;
        }

        // 3. Organization Context
        // Try to get orgId from params (standard) or body/query if needed, but usually params for scoped resources.
        const orgId = req.params.orgId || req.params.organizationId;

        if (!orgId) {
            // If no orgId in context, we only check global permissions if we had any.
            // For now, most permissions are org-scoped. 
            // If the route is generic (e.g. /profile), we might skip specific org checks or use logic.
            // But strict RBAC here implies org context.
            res.status(400).json({
                success: false,
                error: { code: 'ORG_CONTEXT_MISSING', message: '組織コンテキストが不明です' }
            });
            return;
        }

        // 4. Find Membership and Permissions
        const membership = req.user.organizations.find(o => o.id === orgId);

        if (!membership) {
            res.status(403).json({
                success: false,
                error: { code: 'PERMISSION_DENIED', message: 'この組織に所属していません' }
            });
            return;
        }

        // 5. Construct Ability
        // membership.permissions is populated by auth middleware
        const ability = defineAbilityFor(membership.permissions || [], req.user.id, false);

        // 6. Check Permission
        let allowed = false;
        if (Array.isArray(action)) {
            // OR logic: Allow if user has ANY of the permissions
            allowed = action.some(a => ability.can(a, subject));
        } else {
            allowed = ability.can(action, subject);
        }

        if (!allowed) {
            res.status(403).json({
                success: false,
                error: {
                    code: 'PERMISSION_DENIED',
                    message: `権限がありません: ${Array.isArray(action) ? action.join(' or ') : action} ${subject}`
                }
            });
            return;
        }

        next();
    };
}
