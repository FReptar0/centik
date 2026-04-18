import type { Metadata } from 'next'
import localFont from 'next/font/local'
import { IBM_Plex_Mono } from 'next/font/google'
import { Toaster } from 'sonner'
import './globals.css'

const satoshi = localFont({
  src: [
    {
      path: './fonts/Satoshi-Variable.woff2',
      weight: '300 900',
      style: 'normal',
    },
    {
      path: './fonts/Satoshi-VariableItalic.woff2',
      weight: '300 900',
      style: 'italic',
    },
  ],
  variable: '--font-satoshi',
  display: 'swap',
})

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-ibm-plex-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Centik',
  description: 'Personal finance tracking for the Mexican quincenal pay cycle',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className={`${satoshi.variable} ${ibmPlexMono.variable} h-full antialiased`}>
      <body className="min-h-full bg-bg text-text-primary font-sans">
        {children}
        <Toaster
          position="top-right"
          toastOptions={{ duration: 3000, className: 'text-sm' }}
          theme="dark"
          richColors
          visibleToasts={3}
          closeButton
        />
      </body>
    </html>
  )
}
