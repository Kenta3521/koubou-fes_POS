import { CreateAbility, MongoAbility } from '@casl/ability';
export type Action = string;
export type Subject = string;
export type AppAbility = MongoAbility<[Action, Subject]>;
export declare const createAppAbility: CreateAbility<AppAbility>;
/**
 * Define Ability for a User based on their DB Permissions
 * @param permissionCodes List of permission codes (e.g. ['dashboard:view', 'product:create'])
 * @param userId User ID for ownership checks (optional)
 * @param isSystemAdmin Is System Admin (optional)
 */
export declare function defineAbilityFor(permissionCodes: string[], userId?: string, isSystemAdmin?: boolean): AppAbility;
//# sourceMappingURL=ability.d.ts.map