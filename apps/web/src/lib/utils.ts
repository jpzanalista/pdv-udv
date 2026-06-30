import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Junta classes condicionalmente e resolve conflitos do Tailwind. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
