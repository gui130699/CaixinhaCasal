import { z } from 'zod'

const requiredString = (msg = 'Campo obrigatório') => z.string().min(1, msg)
const positiveNumber = (msg = 'Valor deve ser maior que zero') =>
  z.number({ invalid_type_error: 'Informe um número válido' }).positive(msg)

// ============================================================
// Auth
// ============================================================
export const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter ao menos 6 caracteres'),
})

export const forgotPasswordSchema = z.object({
  email: z.string().email('E-mail inválido'),
})

export const resetPasswordSchema = z
  .object({
    password: z.string().min(6, 'Senha deve ter ao menos 6 caracteres'),
    confirmPassword: z.string().min(6, 'Senha deve ter ao menos 6 caracteres'),
  })
  .refine(d => d.password === d.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  })

export const changePasswordSchema = z
  .object({
    currentPassword: requiredString('Informe a senha atual'),
    newPassword: z.string().min(6, 'Senha deve ter ao menos 6 caracteres'),
    confirmPassword: z.string().min(1),
  })
  .refine(d => d.newPassword === d.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  })

// ============================================================
// Profile
// ============================================================
export const updateProfileSchema = z.object({
  full_name: requiredString('Nome completo obrigatório').max(100),
  phone: z.string().optional(),
})

// ============================================================
// Family
// ============================================================
export const createFamilySchema = z.object({
  name: requiredString('Nome da família obrigatório').max(80),
  description: z.string().max(300).optional(),
})

// ============================================================
// Bank Account
// ============================================================
export const bankAccountSchema = z.object({
  bank_name: requiredString('Nome do banco obrigatório').max(80),
  bank_code: z.string().max(10).optional(),
  account_type: z.enum(['checking', 'savings', 'investment', 'wallet', 'safe', 'other']),
  holder_name: requiredString('Nome do titular obrigatório').max(100),
  agency: z.string().max(20).optional(),
  account_number: z.string().max(20).optional(),
  account_digit: z.string().max(5).optional(),
  pix_key: z.string().max(100).optional(),
  nickname: requiredString('Apelido da conta obrigatório').max(60),
  initial_balance: z.number({ invalid_type_error: 'Informe um número válido' }).min(0),
  is_primary: z.boolean().default(false),
  notes: z.string().max(300).optional(),
  opened_at: z.string().optional(),
})

// ============================================================
// Goal
// ============================================================
export const createGoalSchema = z
  .object({
    name: requiredString('Nome da meta obrigatório').max(80),
    description: z.string().max(300).optional(),
    first_installment_date: requiredString('Data da primeira parcela obrigatória'),
    mode: z.enum(['monthly_value', 'total_value']),
    // monthly_value mode
    monthly_amount: z.number().min(0).optional(),
    months_count: z.number().int().min(0).optional(), // 0 = em aberto
    // total_value mode
    target_amount: z.number().min(0).optional(),
    total_calc_mode: z.enum(['by_months', 'by_installment']).optional(),
    total_months: z.number().int().positive().optional(),
    installment_amount: z.number().min(0).optional(),
    // participants
    participant_ids: z.array(z.string()).min(1, 'Selecione ao menos um participante'),
    percentages: z.record(z.string(), z.number()),
    bank_account_id: z.string().min(1, 'Selecione a conta vinculada'),
  })
  .refine(d => d.mode !== 'monthly_value' || (d.monthly_amount ?? 0) > 0, {
    message: 'Informe o valor mensal', path: ['monthly_amount'],
  })
  .refine(d => d.mode !== 'total_value' || (d.target_amount ?? 0) > 0, {
    message: 'Informe o valor total', path: ['target_amount'],
  })
  .refine(d => !(d.mode === 'total_value' && d.total_calc_mode === 'by_months') || (d.total_months ?? 0) > 0, {
    message: 'Informe a quantidade de meses', path: ['total_months'],
  })
  .refine(d => !(d.mode === 'total_value' && d.total_calc_mode === 'by_installment') || (d.installment_amount ?? 0) > 0, {
    message: 'Informe o valor da parcela', path: ['installment_amount'],
  })

// ============================================================
// Installment
// ============================================================
export const payInstallmentSchema = z.object({
  paid_amount: positiveNumber(),
  payment_date: requiredString('Data do pagamento obrigatória'),
  payment_method: z.string().max(40).optional(),
  bank_account_id: z.string().uuid().optional(),
  notes: z.string().max(300).optional(),
})

// ============================================================
// Transaction
// ============================================================
export const createTransactionSchema = z.object({
  type: z.enum(['deposit', 'withdrawal', 'transfer']),
  amount: positiveNumber(),
  transaction_date: requiredString('Data obrigatória'),
  description: requiredString('Descrição obrigatória').max(120),
  notes: z.string().max(300).optional(),
  bank_account_id: z.string().min(1, 'Selecione uma conta'),
  to_bank_account_id: z.string().optional(),
}).refine(
  d => d.type !== 'transfer' || (!!d.to_bank_account_id && d.to_bank_account_id !== d.bank_account_id),
  { message: 'Selecione uma conta de destino diferente da origem', path: ['to_bank_account_id'] }
)

// ============================================================
// Interest Rate
// ============================================================
export const interestRateSchema = z.object({
  bank_account_id: z.string().uuid('Conta bancária obrigatória'),
  reference_month: requiredString('Mês de referência obrigatório'),
  rate_percent: z.number({ invalid_type_error: 'Informe um número válido' }).positive('Taxa deve ser maior que zero').max(100),
  notes: z.string().max(300).optional(),
})

// ============================================================
// Transfer
// ============================================================
export const transferSchema = z
  .object({
    from_bank_account_id: z.string().uuid('Conta de origem obrigatória'),
    to_bank_account_id: z.string().uuid('Conta de destino obrigatória'),
    amount: positiveNumber(),
    transfer_date: requiredString('Data obrigatória'),
    notes: z.string().max(300).optional(),
  })
  .refine(d => d.from_bank_account_id !== d.to_bank_account_id, {
    message: 'Conta de origem e destino devem ser diferentes',
    path: ['to_bank_account_id'],
  })

// ============================================================
// User management (admin)
// ============================================================
export const createUserSchema = z.object({
  full_name: requiredString('Nome completo obrigatório').max(100),
  email: z.string().email('E-mail inválido'),
  phone: z.string().optional(),
  password: z.string().min(6, 'Senha deve ter ao menos 6 caracteres'),
  family_id: z.string().uuid().optional(),
  role: z.enum(['admin', 'member']).default('member'),
})

export type LoginFormData = z.infer<typeof loginSchema>
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>
export type UpdateProfileFormData = z.infer<typeof updateProfileSchema>
export type CreateFamilyFormData = z.infer<typeof createFamilySchema>
export type BankAccountFormData = z.infer<typeof bankAccountSchema>
export type CreateGoalFormData = z.infer<typeof createGoalSchema>
export type PayInstallmentFormData = z.infer<typeof payInstallmentSchema>
export type CreateTransactionFormData = z.infer<typeof createTransactionSchema>
export type InterestRateFormData = z.infer<typeof interestRateSchema>
export type TransferFormData = z.infer<typeof transferSchema>
export type CreateUserFormData = z.infer<typeof createUserSchema>
