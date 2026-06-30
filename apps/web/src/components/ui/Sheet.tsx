'use client'

import * as Dialog from '@radix-ui/react-dialog'
import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { cn } from '@/lib/utils'

export const Sheet = Dialog.Root
export const SheetTrigger = Dialog.Trigger
export const SheetClose = Dialog.Close
export const SheetTitle = Dialog.Title

/** Painel deslizante (gaveta) — usado no menu hambúrguer. */
export function SheetContent({
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<typeof Dialog.Content> & { children: ReactNode }) {
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in data-[state=closed]:fade-out" />
      <Dialog.Content
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85%] flex-col border-r border-line bg-surface p-4 shadow-lg focus:outline-none',
          'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left',
          'pl-[max(1rem,env(safe-area-inset-left))]',
          className,
        )}
        {...props}
      >
        {children}
      </Dialog.Content>
    </Dialog.Portal>
  )
}
