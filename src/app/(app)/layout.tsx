import Sidebar from '@/components/layout/Sidebar'
import MobileNav from '@/components/layout/MobileNav'
import FAB from '@/components/layout/FAB'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 md:ml-16 lg:ml-60 pb-16 md:pb-0 overflow-x-hidden">
          <div className="p-4 md:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
      <MobileNav />
      <FAB />
    </>
  )
}
