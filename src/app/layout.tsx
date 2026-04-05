import type { Metadata } from 'next'
import { DM_Sans } from 'next/font/google'
import Sidebar from '@/components/layout/Sidebar'
import MobileNav from '@/components/layout/MobileNav'
import FAB from '@/components/layout/FAB'
import './globals.css'

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
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
    <html lang="es" className={`${dmSans.variable} h-full antialiased`}>
      <body className="min-h-full bg-bg-primary text-text-primary font-sans">
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
      </body>
    </html>
  )
}
