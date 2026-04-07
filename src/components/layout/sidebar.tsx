import { NavLink, useNavigate } from 'react-router-dom'
import { Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import {
  LayoutDashboard, Target, Building2, CreditCard, ArrowLeftRight,
  TrendingUp, BarChart3, Users, Settings, LogOut, X, PiggyBank,
  Shield, FileText
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth.store'
import { useUIStore } from '@/stores/ui.store'
import { authApi } from '@/api/auth.api'
import { Avatar } from '@/components/ui/avatar'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/goals', icon: Target, label: 'Metas' },
  { to: '/banking', icon: Building2, label: 'Contas Bancárias' },
  { to: '/installments', icon: CreditCard, label: 'Parcelas' },
  { to: '/transactions', icon: ArrowLeftRight, label: 'Movimentações' },
  { to: '/interest', icon: TrendingUp, label: 'Juros & Rendimentos' },
  { to: '/reports', icon: BarChart3, label: 'Relatórios' },
  { to: '/settings', icon: Settings, label: 'Configurações' },
]

const adminItems = [
  { to: '/admin', icon: Shield, label: 'Painel Admin', end: true },
  { to: '/admin/families', icon: Users, label: 'Famílias' },
  { to: '/admin/users', icon: Users, label: 'Usuários' },
  { to: '/admin/audit', icon: FileText, label: 'Auditoria' },
]

function NavItem({ to, icon: Icon, label, end, onClick }: { to: string; icon: React.ElementType; label: string; end?: boolean; onClick?: () => void }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) => cn(isActive ? 'nav-item-active' : 'nav-item')}
    >
      <Icon className="size-4.5 shrink-0" />
      <span>{label}</span>
    </NavLink>
  )
}

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const { profile, family, isMasterAdmin } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await authApi.signOut()
    navigate('/login')
    onClose?.()
  }

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 pt-5 pb-4 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-600 rounded-xl">
            <PiggyBank className="size-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900 dark:text-gray-100">Caixinha</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[140px]">
              {family?.name ?? 'Família'}
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 scrollbar-thin">
        {navItems.map(item => (
          <NavItem key={item.to} {...item} onClick={onClose} />
        ))}

        {isMasterAdmin && (
          <>
            <div className="pt-4 pb-1 px-3">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Administração</p>
            </div>
            {adminItems.map(item => (
              <NavItem key={item.to} {...item} onClick={onClose} />
            ))}
          </>
        )}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          <Avatar name={profile?.full_name ?? 'U'} src={profile?.avatar_url} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">
              {profile?.full_name}
            </p>
            <NavLink to="/profile" onClick={onClose} className="text-[10px] text-primary-600 hover:underline">
              Meu perfil
            </NavLink>
          </div>
          <button
            onClick={handleLogout}
            title="Sair"
            className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

// Desktop sidebar (fixed)
export function Sidebar() {
  return (
    <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:w-60 xl:w-64 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 z-30">
      <SidebarContent />
    </aside>
  )
}

// Mobile sidebar (drawer)
export function MobileSidebar() {
  const { sidebarOpen, setSidebarOpen } = useUIStore()

  return (
    <Transition show={sidebarOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50 lg:hidden" onClose={() => setSidebarOpen(false)}>
        <Transition.Child
          as={Fragment}
          enter="ease-in-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in-out duration-300"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        </Transition.Child>
        <div className="fixed inset-0 flex">
          <Transition.Child
            as={Fragment}
            enter="ease-in-out duration-300"
            enterFrom="-translate-x-full"
            enterTo="translate-x-0"
            leave="ease-in-out duration-300"
            leaveFrom="translate-x-0"
            leaveTo="-translate-x-full"
          >
            <Dialog.Panel className="relative w-72 max-w-[80vw] bg-white dark:bg-gray-900 h-full">
              <div className="absolute top-3 right-3">
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <X className="size-5" />
                </button>
              </div>
              <SidebarContent onClose={() => setSidebarOpen(false)} />
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  )
}

// Bottom nav for mobile
export function BottomNav() {
  const bottomItems = [
    { to: '/', icon: LayoutDashboard, label: 'Home', end: true },
    { to: '/goals', icon: Target, label: 'Metas' },
    { to: '/installments', icon: CreditCard, label: 'Parcelas' },
    { to: '/transactions', icon: ArrowLeftRight, label: 'Mov.' },
    { to: '/banking', icon: Building2, label: 'Contas' },
  ]

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 safe-area-bottom px-1">
      <div className="flex items-center justify-around">
        {bottomItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => cn(
              'flex flex-col items-center gap-0.5 py-2.5 px-3 text-[10px] font-medium transition-colors',
              isActive
                ? 'text-primary-600 dark:text-primary-400'
                : 'text-gray-500 dark:text-gray-400'
            )}
          >
            {({ isActive }) => (
              <>
                <Icon className={cn('size-5', isActive && 'fill-current opacity-30')} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

// Settings icon for sidebar
const _Settings = Settings
export { _Settings }
