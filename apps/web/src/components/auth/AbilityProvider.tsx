import React, { useEffect, ReactNode } from 'react';
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

    // 初期レンダリング時から権限を同期的に設定することで、useEffectを待たずにガードが機能するようにする
    // (特に persists で localStorage から復元された直後に重要)
    if (user) {
        let permissions: string[] = [];
        if (!user.isSystemAdmin && activeOrganizationId) {
            const membership = user.organizations?.find(o => o.id === activeOrganizationId);
            permissions = membership?.permissions || [];
        }
        const initialAbility = defineAbilityFor(permissions, user.id, user.isSystemAdmin);
        ability.update(initialAbility.rules);
    }

    useEffect(() => {
        if (user) {
            let permissions: string[] = [];

            if (user.isSystemAdmin) {
                // System Admin logic is handled in defineAbilityFor
            } else if (activeOrganizationId) {
                const membership = user.organizations?.find(o => o.id === activeOrganizationId);
                permissions = membership?.permissions || [];
            }

            // Generate new ability based on current state
            const newAbility = defineAbilityFor(permissions, user.id, user.isSystemAdmin);

            // Update the singleton instance with new rules
            ability.update(newAbility.rules);
        } else {
            // Reset ability for guest
            ability.update([]);
        }
    }, [user, activeOrganizationId]);

    return (
        <AbilityContext.Provider value={ability}>
            {children}
        </AbilityContext.Provider>
    );
}
