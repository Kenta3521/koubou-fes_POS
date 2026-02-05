import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
    className?: string;
    size?: number;
    text?: string;
    fullScreen?: boolean;
}

export function LoadingSpinner({
    className,
    size = 24,
    text,
    fullScreen = false,
}: LoadingSpinnerProps) {
    if (fullScreen) {
        return (
            <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
                <Loader2 className="animate-spin text-primary" size={48} />
                {text && (
                    <p className="mt-4 text-lg font-medium text-foreground animate-pulse">
                        {text}
                    </p>
                )}
            </div>
        );
    }

    return (
        <div
            className={cn(
                'flex flex-col items-center justify-center p-4',
                className
            )}
        >
            <Loader2 className="animate-spin text-primary" size={size} />
            {text && <p className="mt-2 text-sm text-muted-foreground">{text}</p>}
        </div>
    );
}
