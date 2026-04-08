// ============================================================
// CAIXINHA CASAL - Tipos do banco de dados
// ============================================================

export type UserStatus = 'active' | 'inactive' | 'blocked'
export type FamilyStatus = 'active' | 'inactive'
export type FamilyMemberRole = 'admin' | 'member'
export type FamilyMemberStatus = 'active' | 'inactive'
export type AccountType = 'checking' | 'savings' | 'investment' | 'wallet' | 'safe' | 'other'
export type GoalStatus = 'active' | 'paused' | 'completed' | 'cancelled' | 'deleted'
export type CalculationMode = 'by_months' | 'by_installment'
export type InstallmentStatus = 'pending' | 'partial' | 'paid' | 'overdue' | 'compensated' | 'cancelled'
export type TransactionType =
  | 'deposit'
  | 'extra_deposit'
  | 'advance_installment'
  | 'manual_adjustment'
  | 'balance_correction'
  | 'interest'
  | 'withdrawal'
  | 'transfer_in'
  | 'transfer_out'
export type AuditActionType = 'create' | 'update' | 'delete' | 'login' | 'logout' | 'password_reset'

// ============================================================
// Entidades
// ============================================================

export interface Profile {
  id: string
  full_name: string
  phone?: string | null
  avatar_url?: string | null
  status: UserStatus
  last_login_at?: string | null
  created_at: string
  updated_at: string
  // Joining
  email?: string
}

export interface Family {
  id: string
  name: string
  description?: string | null
  status: FamilyStatus
  invite_code?: string | null
  invite_code_expires_at?: string | null
  created_at: string
  updated_at: string
}

export interface FamilyMember {
  id: string
  family_id: string
  user_id: string
  role: FamilyMemberRole
  joined_at: string
  status: FamilyMemberStatus
  // Joining
  profile?: Profile
  family?: Family
}

export interface BankAccount {
  id: string
  family_id: string
  bank_name: string
  bank_code?: string | null
  account_type: AccountType
  holder_name: string
  agency?: string | null
  account_number?: string | null
  account_digit?: string | null
  pix_key?: string | null
  nickname: string
  initial_balance: number
  current_balance: number
  is_primary: boolean
  status: 'active' | 'inactive'
  notes?: string | null
  opened_at?: string | null
  created_at: string
  updated_at: string
}

export interface Goal {
  id: string
  family_id: string
  bank_account_id?: string | null
  name: string
  description?: string | null
  target_amount: number
  initial_amount: number
  current_balance: number
  remaining_amount: number
  start_date: string
  target_date?: string | null
  months_count?: number | null
  installment_amount?: number | null
  calculation_mode: CalculationMode
  status: GoalStatus
  completed_at?: string | null
  deleted_at?: string | null
  created_at: string
  updated_at: string
  // Joining
  bank_account?: BankAccount
  goal_members?: GoalMember[]
}

export interface GoalMember {
  id: string
  goal_id: string
  user_id: string
  expected_monthly_amount: number
  participation_percent: number
  status: 'active' | 'inactive'
  joined_at: string
  created_at: string
  // Joining
  profile?: Profile
}

export interface Installment {
  id: string
  family_id: string
  goal_id: string
  user_id: string
  bank_account_id?: string | null
  reference_month: string
  due_date: string
  expected_amount: number
  paid_amount: number
  payment_date?: string | null
  payment_method?: string | null
  status: InstallmentStatus
  notes?: string | null
  receipt_url?: string | null
  created_at: string
  updated_at: string
  // Joining
  profile?: Profile
  goal?: Goal
  bank_account?: BankAccount
}

export interface Transaction {
  id: string
  family_id: string
  goal_id?: string | null
  user_id: string
  bank_account_id?: string | null
  installment_id?: string | null
  type: TransactionType
  amount: number
  transaction_date: string
  description: string
  notes?: string | null
  receipt_url?: string | null
  created_by: string
  created_at: string
  // Joining
  profile?: Profile
  goal?: Goal
  bank_account?: BankAccount
  creator?: Profile
}

export interface InterestRate {
  id: string
  family_id: string
  bank_account_id: string
  reference_month: string
  rate_percent: number
  balance_before: number
  interest_amount: number
  balance_after: number
  calculation_method?: string | null
  notes?: string | null
  created_by: string
  created_at: string
  // Joining
  bank_account?: BankAccount
  creator?: Profile
}

export interface Transfer {
  id: string
  family_id: string
  from_bank_account_id: string
  to_bank_account_id: string
  amount: number
  transfer_date: string
  notes?: string | null
  created_by: string
  created_at: string
  // Joining
  from_account?: BankAccount
  to_account?: BankAccount
}

export interface AuditLog {
  id: string
  actor_user_id?: string | null
  entity_name: string
  entity_id?: string | null
  action_type: AuditActionType
  before_data?: Record<string, unknown> | null
  after_data?: Record<string, unknown> | null
  ip_address?: string | null
  user_agent?: string | null
  created_at: string
  // Joining
  actor?: Profile
}

export type GoalRequestStatus = 'pending' | 'approved' | 'rejected'

export interface GoalRequest {
  id: string
  family_id: string
  type: 'undo_payment'
  installment_id: string
  goal_id: string
  goal_name: string
  user_id: string
  reference_month: string
  amount: number
  status: GoalRequestStatus
  reviewed_by?: string | null
  reviewed_at?: string | null
  created_at: string
  // Joining
  profile?: Profile
}

// ============================================================
// DTOs (Data Transfer Objects) para formulários
// ============================================================

export interface CreateFamilyDTO {
  name: string
  description?: string
}

export interface CreateBankAccountDTO {
  family_id: string
  bank_name: string
  bank_code?: string
  account_type: AccountType
  holder_name: string
  agency?: string
  account_number?: string
  account_digit?: string
  pix_key?: string
  nickname: string
  initial_balance: number
  is_primary: boolean
  notes?: string
  opened_at?: string
}

export interface CreateGoalDTO {
  family_id: string
  bank_account_id?: string
  name: string
  description?: string
  target_amount: number
  initial_amount?: number
  start_date: string
  calculation_mode: CalculationMode
  months_count?: number
  installment_amount?: number
  members?: { user_id: string; expected_monthly_amount: number; participation_percent: number }[]
}

export interface PayInstallmentDTO {
  installment_id: string
  paid_amount: number
  payment_date: string
  payment_method?: string
  bank_account_id?: string
  notes?: string
  receipt_url?: string
}

export interface CreateTransactionDTO {
  family_id: string
  goal_id?: string
  bank_account_id?: string
  type: TransactionType
  amount: number
  transaction_date: string
  description: string
  notes?: string
}

export interface CreateInterestRateDTO {
  family_id: string
  bank_account_id: string
  reference_month: string
  rate_percent: number
  notes?: string
}

export interface CreateTransferDTO {
  family_id: string
  from_bank_account_id: string
  to_bank_account_id: string
  amount: number
  transfer_date: string
  notes?: string
}

// ============================================================
// Tipos auxiliares para UI
// ============================================================

export interface DashboardSummary {
  total_balance: number
  total_target: number
  total_saved: number
  active_goals: number
  active_members: number
  pending_installments_amount: number
  overdue_installments_amount: number
  monthly_paid: number
  monthly_pending: number
  monthly_interest: number
}

export interface ScheduleMonth {
  month: string
  expected: number
  paid: number
  extras: number
  interest: number
  accumulated: number
  percent: number
  remaining: number
  status: 'future' | 'current' | 'paid' | 'partial' | 'overdue'
}

export interface PaginationParams {
  page: number
  limit: number
}

export interface FilterParams {
  search?: string
  status?: string
  start_date?: string
  end_date?: string
  user_id?: string
  goal_id?: string
  bank_account_id?: string
}
