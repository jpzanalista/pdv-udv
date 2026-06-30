import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { ThemeProvider } from '@/components/theme-provider'
import './globals.css'

export const metadata: Metadata = {
  title: 'PDV UDV',
  description: 'PDV dos empórios da União do Vegetal',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover', // respeita o notch/safe-area do iPhone
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#118dff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f1218' },
  ],
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
