import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, icon, rightElement, ...props }, ref) => {
    return (
      <div className="relative flex items-center">
        {icon && (
          <span className="absolute left-3 flex items-center text-muted-foreground">{icon}</span>
        )}
        <input
          type={type}
          className={cn(
            'flex h-9 w-full rounded-[var(--radius)] border border-border',
            'bg-input px-3 py-2 text-sm text-foreground',
            'placeholder:text-muted-foreground',
            'transition-colors duration-150',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0 focus:border-transparent',
            'disabled:cursor-not-allowed disabled:opacity-50',
            icon && 'pl-9',
            rightElement && 'pr-9',
            className,
          )}
          ref={ref}
          {...props}
        />
        {rightElement && (
          <span className="absolute right-3 flex items-center text-muted-foreground">
            {rightElement}
          </span>
        )}
      </div>
    );
  },
);
Input.displayName = 'Input';

export { Input };
