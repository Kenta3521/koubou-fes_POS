import { AbilityBuilder, CreateAbility, createMongoAbility, MongoAbility } from '@casl/ability';

// Define general types for Ability
export type Action = string;
export type Subject = string;

export type AppAbility = MongoAbility<[Action, Subject]>;

export const createAppAbility = createMongoAbility as CreateAbility<AppAbility>;

/**
 * Define Ability for a User based on their DB Permissions
 * @param permissionCodes List of permission codes (e.g. ['dashboard:view', 'product:create'])
 * @param userId User ID for ownership checks (optional)
 * @param isSystemAdmin Is System Admin (optional)
 */
export function defineAbilityFor(permissionCodes: string[], userId?: string, isSystemAdmin: boolean = false) {
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
            }
        }
    });

    // 3. ABAC (Attribute Based Access Control) rules
    if (userId) {
        // Enforce type for conditions
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        can('manage', 'User', { id: userId } as any);
    }

    return build();
}
