import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps
    extends React.InputHTMLAttributes<HTMLInputElement> { }

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, onFocus, ...props }, ref) => {
        const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
            // type="number" または inputMode="numeric" の場合は自動選択
            if (type === "number" || props.inputMode === "numeric") {
                const target = e.target;
                setTimeout(() => target.select(), 0);
            }
            if (onFocus) {
                onFocus(e);
            }
        };

        return (
            <input
                type={type}
                className={cn(
                    "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                    className
                )}
                ref={ref}
                onFocus={handleFocus}
                {...props}
            />
        )
    }
)
Input.displayName = "Input"

export { Input }
