import { type VariantProps, cva } from 'class-variance-authority'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex min-h-touch items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-brand text-white shadow-sm hover:bg-brand-dark',
        secondary: 'border border-brand/40 bg-surface text-brand hover:bg-brand-bg',
        ghost: 'border border-line bg-transparent text-ink-muted hover:bg-canvas hover:text-ink',
      },
    },
    defaultVariants: { variant: 'primary' },
  },
)

type Variant = NonNullable<VariantProps<typeof buttonVariants>['variant']>

export function Button({
  variant,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button className={cn(buttonVariants({ variant }), className)} {...props} />
}
