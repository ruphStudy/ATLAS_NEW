import * as React from 'react';
import { Check, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  indeterminate?: boolean;
}

/** Native `<input type="checkbox">` under the hood (no Radix checkbox package installed) — fully accessible and keyboard-operable without a new dependency. */
const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, indeterminate, checked, disabled, ...props }, ref) => {
    const innerRef = React.useRef<HTMLInputElement>(null);
    React.useImperativeHandle(ref, () => innerRef.current as HTMLInputElement);

    React.useEffect(() => {
      if (innerRef.current) innerRef.current.indeterminate = !!indeterminate;
    }, [indeterminate]);

    return (
      <span className="relative inline-flex h-4 w-4 shrink-0">
        <input
          ref={innerRef}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          className="peer absolute inset-0 h-4 w-4 cursor-pointer appearance-none rounded border border-border bg-input transition-colors checked:border-primary checked:bg-primary disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          {...props}
        />
        <span
          className={cn(
            'pointer-events-none absolute inset-0 flex items-center justify-center text-primary-foreground opacity-0 transition-opacity',
            (checked || indeterminate) && 'opacity-100',
          )}
        >
          {indeterminate ? <Minus className="h-3 w-3" /> : <Check className="h-3 w-3" />}
        </span>
      </span>
    );
  },
);
Checkbox.displayName = 'Checkbox';

export { Checkbox };
