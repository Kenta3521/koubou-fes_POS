import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
    title: string;
    description?: string;
    actions?: ReactNode;
    className?: string;
}

export function PageHeader({
    title,
    description,
    actions,
    className,
}: PageHeaderProps) {
    return (
        <div
            className={cn(
                'flex items-center justify-between pb-6 border-b mb-6',
                className
            )}
        >
            <div className="space-y-1">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                    {title}
                </h1>
                {description && (
                    <p className="text-sm text-muted-foreground">{description}</p>
                )}
            </div>
            {actions && <div className="flex items-center space-x-2">{actions}</div>}
        </div>
    );
}
