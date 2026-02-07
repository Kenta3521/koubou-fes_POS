import React, { ReactNode } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { AbilityContext } from '@/contexts/AbilityContext';
import { defineAbilityFor, createAppAbility } from '@koubou-fes-pos/shared';

interface AbilityProviderProps {
    children: ReactNode;
}

// Create a singleton ability instance for the app
const ability = createAppAbility();

export default function AbilityProvider({ children }: AbilityProviderProps) {
    const { user, activeOrganizationId } = useAuthStore();

    // Sync ability rules based on store state
    const rules = React.useMemo(() => {
        let permissions: string[] = [];
        if (user) {
            if (!user.isSystemAdmin && activeOrganizationId) {
                const membership = user.organizations?.find(o => o.id === activeOrganizationId);
                permissions = membership?.permissions || [];
            }
            return defineAbilityFor(permissions, user.id, user.isSystemAdmin).rules;
        }
        return [];
    }, [user, activeOrganizationId]);

    // Update the singleton instance SYNCHRONOUSLY during render if rules changed
    // This ensures child components (like POS guards) see the rules on first mount.
    // casl-ability ensures that .update([]) is fast and only notifies if rules actually change.
    // However, to be super safe against any React warn about "Cannot update a component while rendering a different component",
    // we use a simple ref-like check or just let it notify. (Ability instance is external to React state).
    const rulesJson = JSON.stringify(rules);
    const lastRulesRef = React.useRef<string>("");

    if (lastRulesRef.current !== rulesJson) {
        ability.update(rules);
        lastRulesRef.current = rulesJson;
    }

    return (
        <AbilityContext.Provider value={ability}>
            {children}
        </AbilityContext.Provider>
    );
}
