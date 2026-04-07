import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  padding?: 'none' | 'sm' | 'md' | 'lg'
  hover?: boolean
  onClick?: () => void
}

export function Card({ children, className, padding = 'md', hover, onClick }: CardProps) {
  const paddings = { none: '', sm: 'p-4', md: 'p-5', lg: 'p-6' }
  return (
    <div
      onClick={onClick}
      className={cn(
        hover ? 'card-hover' : 'card',
        paddings[padding],
        onClick && 'cursor-pointer',
        className
      )}
    >
      {children}
    </div>
  )
}

interface StatCardProps {
  title: string
  value: string
  subtitle?: string
  icon?: ReactNode
  trend?: { value: number; label?: string }
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'default'
  loading?: boolean
  className?: string
}

export function StatCard({ title, value, subtitle, icon, trend, color = 'default', loading, className }: StatCardProps) {
  const colorMap = {
    primary: 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400',
    success: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
    warning: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
    danger: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
    default: 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400',
  }

  if (loading) {
    return (
      <Card className={cn('min-h-[110px]', className)}>
        <div className="skeleton h-4 w-24 mb-3" />
        <div className="skeleton h-8 w-36 mb-2" />
        <div className="skeleton h-3 w-20" />
      </Card>
    )
  }

  return (
    <Card className={className}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide leading-tight">
            {title}
          </p>
          <p className="mt-1.5 text-2xl font-bold text-gray-900 dark:text-gray-100 truncate">
            {value}
          </p>
          {subtitle && (
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 truncate">{subtitle}</p>
          )}
          {trend && (
            <p className={cn(
              'mt-1 text-xs font-medium',
              trend.value >= 0 ? 'text-green-600' : 'text-red-600'
            )}>
              {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value).toFixed(1)}%
              {trend.label && <span className="text-gray-400 ml-1">{trend.label}</span>}
            </p>
          )}
        </div>
        {icon && (
          <div className={cn('p-2.5 rounded-xl shrink-0', colorMap[color])}>
            {icon}
          </div>
        )}
      </div>
    </Card>
  )
}

interface ProgressCardProps {
  title: string
  current: number
  target: number
  percent: number
  subtitle?: string
  color?: string
  className?: string
}

export function ProgressCard({ title, current, target, percent, subtitle, color = 'bg-primary-600', className }: ProgressCardProps) {
  return (
    <Card className={className}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</p>
          {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>}
        </div>
        <span className="text-sm font-bold text-primary-600">{percent.toFixed(1)}%</span>
      </div>
      <div className="progress-bar mb-2">
        <div className={cn('progress-fill', color)} style={{ width: `${Math.min(percent, 100)}%` }} />
      </div>
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(current)}</span>
        <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(target)}</span>
      </div>
    </Card>
  )
}
