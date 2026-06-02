import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/layout/Sidebar'
import MobileNav from '@/components/layout/MobileNav'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Desktop sidebar — fixed, hidden on mobile */}
      <div className="hidden md:flex fixed inset-y-0 left-0 w-64 flex-col z-30">
        <Sidebar userEmail={user.email ?? ''} />
      </div>

      {/* Mobile top bar */}
      <header className="md:hidden fixed top-0 inset-x-0 z-30 h-14 bg-slate-900 flex items-center px-4 gap-3 shadow-lg">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <span className="text-white font-semibold">Training Planner</span>
      </header>

      {/* Main content */}
      <main className="md:ml-64 pt-14 md:pt-0 pb-20 md:pb-0 p-4 md:p-6 lg:p-8 min-h-screen">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <MobileNav />
    </div>
  )
}
