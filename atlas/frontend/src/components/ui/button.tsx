'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius)] text-sm font-semibold',
    'transition-all duration-200 ease-out',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    'disabled:pointer-events-none disabled:opacity-50',
    'active:scale-[0.96]',
  ],
  {
    variants: {
      variant: {
        default: ['bg-gradient-brand text-white shadow-md', 'hover:shadow-glow hover:opacity-90'],
        secondary: [
          'bg-secondary text-secondary-foreground border border-border',
          'hover:bg-muted hover:border-border',
        ],
        outline: [
          'border border-border bg-transparent text-foreground',
          'hover:bg-secondary hover:text-foreground',
        ],
        ghost: ['text-muted-foreground', 'hover:bg-secondary hover:text-foreground'],
        danger: ['bg-gradient-danger text-white shadow-md', 'hover:opacity-90'],
        success: ['bg-gradient-success text-white shadow-md', 'hover:opacity-90'],
        link: ['text-primary underline-offset-4 hover:underline', 'p-0 h-auto shadow-none'],
      },
      size: {
        sm: 'h-8 px-3 text-xs gap-1.5',
        default: 'h-9 px-4',
        lg: 'h-11 px-6 text-base',
        xl: 'h-13 px-8 text-base',
        icon: 'h-9 w-9',
        'icon-sm': 'h-7 w-7 text-xs',
        'icon-lg': 'h-11 w-11',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
