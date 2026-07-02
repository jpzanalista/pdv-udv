import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { ObservacaoBanner } from '@/components/ObservacaoBanner'
import { ThemeProvider } from '@/components/theme-provider'
import './globals.css'

export const metadata: Metadata = {
  title: 'Empório',
  description: 'PDV dos empórios da União do Vegetal',
  manifest: '/site.webmanifest',
  icons: {
    icon: [
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: { capable: true, title: 'Empório', statusBarStyle: 'default' },
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
        <ObservacaoBanner />
      </body>
    </html>
  )
}
