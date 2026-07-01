import { type RefObject, useEffect } from 'react'

// Foca campos apenas em dispositivos com ponteiro fino (desktop/mouse),
// evitando que o teclado virtual abra sozinho no celular/tablet touch.
function ehDesktop() {
  return typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches
}

/** Callback-ref: use em <Input ref={desktopAutofocus} /> no lugar de autoFocus. */
export function desktopAutofocus(node: HTMLElement | null) {
  if (node && ehDesktop()) node.focus()
}

/** Hook para quando o campo já tem um ref próprio. `when` permite focar após o input montar. */
export function useDesktopAutoFocus<T extends HTMLElement>(ref: RefObject<T | null>, when = true) {
  useEffect(() => {
    if (when && ehDesktop()) ref.current?.focus()
  }, [ref, when])
}
