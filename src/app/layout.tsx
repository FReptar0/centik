import type { Metadata } from 'next'
import localFont from 'next/font/local'
import { IBM_Plex_Mono } from 'next/font/google'
import { Toaster } from 'sonner'
import Sidebar from '@/components/layout/Sidebar'
import MobileNav from '@/components/layout/MobileNav'
import FAB from '@/components/layout/FAB'
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
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 md:ml-16 lg:ml-60 pb-16 md:pb-0">
            <div className="p-4 md:p-6 lg:p-8">
              {children}
            </div>
          </main>
        </div>
        <MobileNav />
        <FAB />
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
