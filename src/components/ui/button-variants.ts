import { cva, type VariantProps } from 'class-variance-authority';

// Extracted from `button.tsx` so the file containing <Button /> exports only
// React components (issues.md [I-5] — react-refresh/only-export-components).
export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-brand text-brand-foreground hover:bg-brand-hover',
        destructive: 'bg-error text-white hover:bg-red-700',
        outline: 'bg-surface border border-border text-ink-heading hover:bg-surface-muted',
        secondary: 'bg-surface-muted text-ink-heading hover:bg-surface-muted/80',
        ghost: 'hover:bg-surface-muted text-ink-heading',
        link: 'text-brand underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export type ButtonVariants = VariantProps<typeof buttonVariants>;
