// Símbolo do Empório (vendinha) — azul monocromático, mesmo vetor do favicon/PWA.
export function Logo({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 80 92"
      width={Math.round((size * 80) / 92)}
      height={size}
      className={className}
      role="img"
      aria-label="Empório"
    >
      <rect x="6" y="34" width="68" height="50" rx="3" fill="#118DFF" />
      <path d="M0 34 h80 v10 l-10 8 -10 -8 -10 8 -10 -8 -10 8 -10 -8 -10 8 Z" fill="#0A6DC2" />
      <path d="M10 34 v9 M30 34 v9 M50 34 v9 M70 34 v9" stroke="#ffffff" strokeWidth="5" />
      <rect x="30" y="56" width="20" height="28" rx="2" fill="#ffffff" />
    </svg>
  )
}
