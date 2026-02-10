import { AbilityBuilder, createMongoAbility } from '@casl/ability';
export const createAppAbility = createMongoAbility;
/**
 * Define Ability for a User based on their DB Permissions
 * @param permissionCodes List of permission codes (e.g. ['dashboard:view', 'product:create'])
 * @param userId User ID for ownership checks (optional)
 * @param isSystemAdmin Is System Admin (optional)
 */
export function defineAbilityFor(permissionCodes, userId, isSystemAdmin = false) {
    const { can, build } = new AbilityBuilder(createAppAbility);
    // 1. System Admin (Super User) logic
    if (isSystemAdmin) {
        can('manage', 'all'); // Super Admin: Can manage everything
        return build();
    }
    // 2. Map DB permissions to CASL rules
    permissionCodes.forEach(code => {
        const parts = code.split(':');
        if (parts.length === 2) {
            const subject = parts[0];
            const action = parts[1];
            can(action, subject);
            // 'management' or 'manage' action implies all actions for that subject
            if (action === 'management' || action === 'manage') {
                can('manage', subject);
                can('read', subject);
                can('view', subject);
                can('view_list', subject);
                can('list', subject);
                can('create', subject);
                can('update', subject);
                can('delete', subject);
            }
            // Standard read permission implies various viewing aliases
            if (action === 'read' || action === 'view' || action === 'view_list' || action === 'list') {
                can('read', subject);
                can('view', subject);
                can('view_list', subject);
                can('list', subject);
            }
        }
    });
    // 3. POS Context (transaction:create/management allows viewing resources for sales)
    const hasTxCreate = permissionCodes.includes('transaction:create');
    const hasTxManage = permissionCodes.some(c => c === 'transaction:management' || c === 'transaction:manage');
    if (hasTxCreate || hasTxManage) {
        ['product', 'category', 'discount'].forEach(subject => {
            can('read_pos', subject);
            can('view', subject);
            can('view_list', subject);
            can('list', subject);
        });
    }
    // 4. ABAC (Attribute Based Access Control) rules
    if (userId) {
        // Enforce type for conditions
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        can('manage', 'User', { id: userId });
    }
    return build();
}
//# sourceMappingURL=ability.js.map