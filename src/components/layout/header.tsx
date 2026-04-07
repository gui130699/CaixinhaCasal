import { Menu, Bell, Sun, Moon, Settings } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useUIStore } from '@/stores/ui.store'
import { useAuthStore } from '@/stores/auth.store'
import { Avatar } from '@/components/ui/avatar'

export function Header({ title }: { title?: string }) {
  const { toggleSidebar, theme, setTheme } = useUIStore()
  const { profile } = useAuthStore()

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark')

  return (
    <header className="sticky top-0 z-20 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-100 dark:border-gray-800 h-14 flex items-center px-4 gap-3">
      {/* Mobile menu button */}
      <button
        onClick={toggleSidebar}
        className="lg:hidden p-2 -ml-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        aria-label="Menu"
      >
        <Menu className="size-5" />
      </button>

      {/* Title */}
      {title && (
        <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex-1 truncate lg:hidden">
          {title}
        </h1>
      )}

      <div className="flex-1 hidden lg:block" />

      {/* Actions */}
      <div className="flex items-center gap-1">
        <button
          onClick={toggleTheme}
          className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Alternar tema"
        >
          {theme === 'dark' ? <Sun className="size-4.5" /> : <Moon className="size-4.5" />}
        </button>

        <button className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors relative" aria-label="Notificações">
          <Bell className="size-4.5" />
        </button>

        <NavLink to="/profile" className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <Avatar name={profile?.full_name ?? 'U'} src={profile?.avatar_url} size="xs" />
          <span className="hidden sm:block text-xs font-medium text-gray-700 dark:text-gray-300 max-w-[120px] truncate">
            {profile?.full_name}
          </span>
        </NavLink>

        <NavLink to="/settings" className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <Settings className="size-4" />
        </NavLink>
      </div>
    </header>
  )
}
