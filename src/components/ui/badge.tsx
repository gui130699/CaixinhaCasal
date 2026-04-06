import { cn } from '@/lib/utils'
import type { InstallmentStatus, GoalStatus } from '@/types'
import { installmentStatusLabel, installmentStatusColor, goalStatusLabel, goalStatusColor } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  className?: string
}

export function Badge({ children, className }: BadgeProps) {
  return (
    <span className={cn('badge', className)}>{children}</span>
  )
}

export function InstallmentStatusBadge({ status }: { status: InstallmentStatus }) {
  return (
    <span className={cn('badge', installmentStatusColor[status])}>
      {installmentStatusLabel[status]}
    </span>
  )
}

export function GoalStatusBadge({ status }: { status: GoalStatus }) {
  return (
    <span className={cn('badge', goalStatusColor[status])}>
      {goalStatusLabel[status]}
    </span>
  )
}

interface RoleBadgeProps { role: 'admin' | 'member' }
export function RoleBadge({ role }: RoleBadgeProps) {
  if (role === 'admin') {
    return <span className="badge bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">Admin</span>
  }
  return <span className="badge bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">Membro</span>
}

interface UserStatusBadgeProps { status: 'active' | 'inactive' | 'blocked' }
export function UserStatusBadge({ status }: UserStatusBadgeProps) {
  const map = {
    active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    inactive: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    blocked: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  }
  const label = { active: 'Ativo', inactive: 'Inativo', blocked: 'Bloqueado' }
  return <span className={cn('badge', map[status])}>{label[status]}</span>
}
