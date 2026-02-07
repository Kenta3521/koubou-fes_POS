import { defineAbilityFor, createAppAbility, type AppAbility } from '@koubou-fes-pos/shared';

export { createAppAbility, defineAbilityFor };
export type { AppAbility };

/**
 * Note: If we need backend-only rules (like specific DB object ownership that doesn't 
 * exist on the frontend), we can wrap the shared defineAbilityFor here or extend it.
 */
export function defineBackendAbilityFor(
    permissionCodes: string[],
    userId?: string,
    organizationId?: string,
    isSystemAdmin: boolean = false
) {
    // For now, we just proxy the shared logic. 
    // organizationId is not yet used in shared logic but kept for consistency.
    return defineAbilityFor(permissionCodes, userId, isSystemAdmin);
}
