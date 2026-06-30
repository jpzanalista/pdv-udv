import type { InputHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="flex flex-col gap-1">
      <span className="text-sm font-semibold text-ink-muted">{label}</span>
      {children}
    </label>
  )
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'min-h-touch w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink placeholder:text-ink-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60',
        className,
      )}
      {...props}
    />
  )
}
