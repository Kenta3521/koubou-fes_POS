import { ReactNode } from 'react';
import { Can } from '@/contexts/AbilityContext';
import { Action, Subject } from '@koubou-fes-pos/shared';

interface PermissionGuardProps {
    permission: string; // e.g. "product:delete"
    children: ReactNode;
    fallback?: ReactNode;
}

export default function PermissionGuard({ permission, children, fallback = null }: PermissionGuardProps) {
    // Parse permission string "action:subject"
    const [subject, action] = permission.split(':');

    if (!subject || !action) {
        console.warn(`Invalid permission format in PermissionGuard: ${permission}`);
        return <>{fallback}</>;
    }

    // CASL expects (action, subject)
    // We cast action/subject to specific types if needed, but string is fine for now as per shared types
    return (
        <Can I={action as Action} a={subject as Subject} passThrough>
            {(allowed) => (allowed ? children : fallback)}
        </Can>
    );
}
