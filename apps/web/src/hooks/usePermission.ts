import { useMemo } from 'react';
import { useAbility } from '@casl/react';
import { AbilityContext } from '../contexts/AbilityContext';

/**
 * Hook to check permissions easily in components
 */
export function usePermission() {
    const ability = useAbility(AbilityContext);

    return useMemo(() => ({
        ability,
        can: (action: string, subject: string) => ability.can(action, subject),
        cannot: (action: string, subject: string) => ability.cannot(action, subject),
    }), [ability]);
}
