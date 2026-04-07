import type { ReactNode } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar, MobileSidebar, BottomNav } from './sidebar'
import { Header } from './header'
import { InstallPrompt } from '@/components/ui/install-prompt'

export function AppLayout({ title }: { title?: string }) {
  return (
    <div className="min-h-dvh bg-gray-50 dark:bg-gray-950">
      <Sidebar />
      <MobileSidebar />

      {/* Main content */}
      <div className="lg:pl-60 xl:pl-64 flex flex-col min-h-dvh">
        <Header title={title} />
        <main className="flex-1 px-4 py-5 md:px-6 lg:px-8 pb-24 lg:pb-8 max-w-[1600px] w-full mx-auto">
          <Outlet />
        </main>
      </div>

      <BottomNav />
      <InstallPrompt />
    </div>
  )
}

export function PageHeader({
  title,
  description,
  action,
  breadcrumbs,
}: {
  title: string
  description?: string
  action?: ReactNode
  breadcrumbs?: { label: string; to?: string }[]
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
      <div>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
            {breadcrumbs.map((b, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {i > 0 && <span>/</span>}
                {b.to ? (
                  <a href={b.to} className="hover:text-primary-600 transition-colors">{b.label}</a>
                ) : (
                  <span className="text-gray-700 dark:text-gray-300 font-medium">{b.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">{title}</h1>
        {description && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
