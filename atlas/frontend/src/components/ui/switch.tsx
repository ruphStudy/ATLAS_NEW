import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SwitchProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {}

/** Native `<input type="checkbox">` styled as a toggle switch (no Radix switch package installed). */
const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, ...props }, ref) => (
    <label className={cn('relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center', props.disabled && 'cursor-not-allowed opacity-50')}>
      <input ref={ref} type="checkbox" className="peer sr-only" {...props} />
      <span
        className={cn(
          'absolute inset-0 rounded-full bg-muted transition-colors duration-200',
          'peer-checked:bg-primary',
          'peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background',
          className,
        )}
      />
      <span className="pointer-events-none relative left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 peer-checked:translate-x-4" />
    </label>
  ),
);
Switch.displayName = 'Switch';

export { Switch };
