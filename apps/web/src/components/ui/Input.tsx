import type { InputHTMLAttributes } from 'react'

export function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="flex flex-col gap-1">
      <span className="text-sm font-semibold text-ink-muted">{label}</span>
      {children}
    </label>
  )
}

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`min-h-touch w-full rounded border border-line bg-white px-3 text-ink focus:outline-none focus:ring-2 focus:ring-brand ${className}`}
      {...props}
    />
  )
}
