import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO, isValid, startOfMonth, addMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { InstallmentStatus, GoalStatus, AccountType, TransactionType } from '@/types'

// ============================================================
// Tailwind className merge
// ============================================================
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ============================================================
// Formatadores de moeda
// ============================================================
export function formatCurrency(value: number | null | undefined, compact = false): string {
  if (value === null || value === undefined) return 'R$ 0,00'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    notation: compact ? 'compact' : 'standard',
    minimumFractionDigits: compact ? 0 : 2,
    maximumFractionDigits: compact ? 1 : 2,
  }).format(value)
}

export function formatPercent(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined) return '0%'
  return `${value.toFixed(decimals)}%`
}

export function parseCurrency(value: string): number {
  if (!value) return 0
  const cleaned = value.replace(/[^0-9,.-]/g, '').replace(',', '.')
  return parseFloat(cleaned) || 0
}

// ============================================================
// Formatadores de data
// ============================================================
export function formatDate(date: string | Date | null | undefined, pattern = 'dd/MM/yyyy'): string {
  if (!date) return '-'
  try {
    const d = typeof date === 'string' ? parseISO(date) : date
    if (!isValid(d)) return '-'
    return format(d, pattern, { locale: ptBR })
  } catch {
    return '-'
  }
}

export function formatMonthYear(date: string | Date | null | undefined): string {
  return formatDate(date, "MMMM 'de' yyyy")
}

export function formatDateShort(date: string | Date | null | undefined): string {
  return formatDate(date, 'dd/MM/yy')
}

export function formatDateTime(date: string | Date | null | undefined): string {
  return formatDate(date, 'dd/MM/yyyy HH:mm')
}

export function isoToDisplayDate(date: string | null | undefined): string {
  if (!date) return ''
  return date.substring(0, 10).split('-').reverse().join('/')
}

export function displayDateToIso(date: string): string {
  if (!date) return ''
  const parts = date.split('/')
  if (parts.length !== 3) return date
  return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`
}

export function getMonthRange(months: number, startDate = new Date()): string[] {
  return Array.from({ length: months }, (_, i) => {
    const d = addMonths(startOfMonth(startDate), i)
    return format(d, 'yyyy-MM-dd')
  })
}

// ============================================================
// Labels de status
// ============================================================
export const installmentStatusLabel: Record<InstallmentStatus, string> = {
  pending: 'Pendente',
  partial: 'Parcial',
  paid: 'Pago',
  overdue: 'Atrasado',
  compensated: 'Compensado',
  cancelled: 'Cancelado',
}

export const installmentStatusColor: Record<InstallmentStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  partial: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  paid: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  overdue: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  compensated: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  cancelled: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
}

export const goalStatusLabel: Record<GoalStatus, string> = {
  active: 'Ativa',
  paused: 'Pausada',
  completed: 'Concluída',
  cancelled: 'Cancelada',
  deleted: 'Excluída',
}

export const goalStatusColor: Record<GoalStatus, string> = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  paused: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  completed: 'bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-300',
  cancelled: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  deleted: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
}

export const accountTypeLabel: Record<AccountType, string> = {
  checking: 'Conta Corrente',
  savings: 'Poupança',
  investment: 'Investimento',
  wallet: 'Carteira',
  safe: 'Cofre',
  other: 'Outro',
}

export const transactionTypeLabel: Record<TransactionType, string> = {
  deposit: 'Depósito',
  extra_deposit: 'Depósito Extra',
  advance_installment: 'Antecipação',
  manual_adjustment: 'Ajuste Manual',
  balance_correction: 'Correção de Saldo',
  interest: 'Rendimento/Juros',
  withdrawal: 'Retirada',
  transfer_in: 'Transferência Entrada',
  transfer_out: 'Transferência Saída',
}

export const transactionTypeColor: Record<TransactionType, string> = {
  deposit: 'text-green-600',
  extra_deposit: 'text-green-600',
  advance_installment: 'text-green-600',
  manual_adjustment: 'text-blue-600',
  balance_correction: 'text-blue-600',
  interest: 'text-primary-600',
  withdrawal: 'text-red-600',
  transfer_in: 'text-green-600',
  transfer_out: 'text-red-600',
}

// ============================================================
// Cálculos financeiros
// ============================================================
export function calculateInstallment(targetAmount: number, months: number): number {
  if (months <= 0) return targetAmount
  return targetAmount / months
}

export function calculateMonths(targetAmount: number, installment: number): number {
  if (installment <= 0) return 0
  return Math.ceil(targetAmount / installment)
}

export function calculateProgress(current: number, target: number): number {
  if (target <= 0) return 0
  return Math.min((current / target) * 100, 100)
}

export function calculateInterest(balance: number, ratePercent: number): number {
  return balance * (ratePercent / 100)
}

export function calculateProjectedCompletion(
  current: number,
  target: number,
  monthlyContribution: number,
  monthlyInterestRate = 0
): number {
  if (current >= target) return 0
  if (monthlyContribution <= 0) return Infinity
  let balance = current
  let months = 0
  while (balance < target && months < 600) {
    balance = balance * (1 + monthlyInterestRate / 100) + monthlyContribution
    months++
  }
  return months
}

// ============================================================
// Helpers gerais
// ============================================================
export function getInitials(name: string): string {
  if (!name) return '??'
  return name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('')
}

export function truncate(str: string, max = 30): string {
  if (!str) return ''
  return str.length > max ? str.slice(0, max) + '...' : str
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function generateAvatarColor(name: string): string {
  const colors = [
    'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500',
    'bg-lime-500', 'bg-green-500', 'bg-emerald-500', 'bg-teal-500',
    'bg-cyan-500', 'bg-sky-500', 'bg-blue-500', 'bg-indigo-500',
    'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500', 'bg-pink-500',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

export function groupBy<T>(arr: T[], key: keyof T): Record<string, T[]> {
  return arr.reduce((acc, item) => {
    const k = String(item[key])
    acc[k] = acc[k] ? [...acc[k], item] : [item]
    return acc
  }, {} as Record<string, T[]>)
}

export function sumBy<T>(arr: T[], key: keyof T): number {
  return arr.reduce((sum, item) => sum + (Number(item[key]) || 0), 0)
}
