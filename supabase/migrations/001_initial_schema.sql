-- ============================================================
-- CAIXINHA CASAL - Schema Principal
-- Migration: 001_initial_schema.sql
-- Banco: Supabase (PostgreSQL)
-- ============================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABELA: families (Famílias)
-- ============================================================
CREATE TABLE IF NOT EXISTS families (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABELA: profiles (Perfis de usuário, extensão do auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name     TEXT NOT NULL,
  phone         TEXT,
  avatar_url    TEXT,
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','blocked')),
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABELA: family_members (Membros de cada família)
-- ============================================================
CREATE TABLE IF NOT EXISTS family_members (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id  UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin','member')),
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status     TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  UNIQUE(family_id, user_id)
);

-- ============================================================
-- TABELA: admin_roles (Administradores master da plataforma)
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_roles (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABELA: bank_accounts (Contas bancárias)
-- ============================================================
CREATE TABLE IF NOT EXISTS bank_accounts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id       UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  bank_name       TEXT NOT NULL,
  bank_code       TEXT,
  account_type    TEXT NOT NULL DEFAULT 'savings' CHECK (account_type IN ('checking','savings','investment','wallet','safe','other')),
  holder_name     TEXT NOT NULL,
  agency          TEXT,
  account_number  TEXT,
  account_digit   TEXT,
  pix_key         TEXT,
  nickname        TEXT NOT NULL,
  initial_balance NUMERIC(15,2) NOT NULL DEFAULT 0,
  current_balance NUMERIC(15,2) NOT NULL DEFAULT 0,
  is_primary      BOOLEAN NOT NULL DEFAULT FALSE,
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  notes           TEXT,
  opened_at       DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABELA: goals (Metas financeiras)
-- ============================================================
CREATE TABLE IF NOT EXISTS goals (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id           UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  bank_account_id     UUID REFERENCES bank_accounts(id) ON DELETE SET NULL,
  name                TEXT NOT NULL,
  description         TEXT,
  target_amount       NUMERIC(15,2) NOT NULL,
  initial_amount      NUMERIC(15,2) NOT NULL DEFAULT 0,
  current_balance     NUMERIC(15,2) NOT NULL DEFAULT 0,
  remaining_amount    NUMERIC(15,2) NOT NULL DEFAULT 0,
  start_date          DATE NOT NULL DEFAULT CURRENT_DATE,
  target_date         DATE,
  months_count        INTEGER,
  installment_amount  NUMERIC(15,2),
  calculation_mode    TEXT NOT NULL DEFAULT 'by_months' CHECK (calculation_mode IN ('by_months','by_installment')),
  status              TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','completed','cancelled')),
  completed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABELA: goal_members (Participantes de cada meta)
-- ============================================================
CREATE TABLE IF NOT EXISTS goal_members (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  goal_id                  UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  user_id                  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  expected_monthly_amount  NUMERIC(15,2) NOT NULL DEFAULT 0,
  participation_percent    NUMERIC(5,2) NOT NULL DEFAULT 0,
  status                   TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  joined_at                DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(goal_id, user_id)
);

-- ============================================================
-- TABELA: installments (Parcelas)
-- ============================================================
CREATE TABLE IF NOT EXISTS installments (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id        UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  goal_id          UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  bank_account_id  UUID REFERENCES bank_accounts(id) ON DELETE SET NULL,
  reference_month  DATE NOT NULL,
  due_date         DATE NOT NULL,
  expected_amount  NUMERIC(15,2) NOT NULL,
  paid_amount      NUMERIC(15,2) NOT NULL DEFAULT 0,
  payment_date     DATE,
  payment_method   TEXT,
  status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','partial','paid','overdue','compensated')),
  notes            TEXT,
  receipt_url      TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABELA: transactions (Transações/Movimentações)
-- ============================================================
CREATE TABLE IF NOT EXISTS transactions (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id        UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  goal_id          UUID REFERENCES goals(id) ON DELETE SET NULL,
  user_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  bank_account_id  UUID REFERENCES bank_accounts(id) ON DELETE SET NULL,
  installment_id   UUID REFERENCES installments(id) ON DELETE SET NULL,
  type             TEXT NOT NULL CHECK (type IN ('deposit','extra_deposit','advance_installment','manual_adjustment','balance_correction','interest','withdrawal','transfer_in','transfer_out')),
  amount           NUMERIC(15,2) NOT NULL,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description      TEXT NOT NULL,
  notes            TEXT,
  receipt_url      TEXT,
  created_by       UUID NOT NULL REFERENCES profiles(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABELA: interest_rates (Juros mensais e rendimentos)
-- ============================================================
CREATE TABLE IF NOT EXISTS interest_rates (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id           UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  bank_account_id     UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
  reference_month     DATE NOT NULL,
  rate_percent        NUMERIC(8,4) NOT NULL,
  balance_before      NUMERIC(15,2) NOT NULL,
  interest_amount     NUMERIC(15,2) NOT NULL,
  balance_after       NUMERIC(15,2) NOT NULL,
  calculation_method  TEXT DEFAULT 'simple',
  notes               TEXT,
  created_by          UUID NOT NULL REFERENCES profiles(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(bank_account_id, reference_month)
);

-- ============================================================
-- TABELA: transfers (Transferências entre contas)
-- ============================================================
CREATE TABLE IF NOT EXISTS transfers (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id             UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  from_bank_account_id  UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
  to_bank_account_id    UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
  amount                NUMERIC(15,2) NOT NULL,
  transfer_date         DATE NOT NULL DEFAULT CURRENT_DATE,
  notes                 TEXT,
  created_by            UUID NOT NULL REFERENCES profiles(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABELA: audit_logs (Log de auditoria)
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  entity_name   TEXT NOT NULL,
  entity_id     UUID,
  action_type   TEXT NOT NULL CHECK (action_type IN ('create','update','delete','login','logout','password_reset')),
  before_data   JSONB,
  after_data    JSONB,
  ip_address    INET,
  user_agent    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ÍNDICES para performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_family_members_family ON family_members(family_id);
CREATE INDEX IF NOT EXISTS idx_family_members_user ON family_members(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_family ON bank_accounts(family_id);
CREATE INDEX IF NOT EXISTS idx_goals_family ON goals(family_id);
CREATE INDEX IF NOT EXISTS idx_goals_bank_account ON goals(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_goal_members_goal ON goal_members(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_members_user ON goal_members(user_id);
CREATE INDEX IF NOT EXISTS idx_installments_family ON installments(family_id);
CREATE INDEX IF NOT EXISTS idx_installments_goal ON installments(goal_id);
CREATE INDEX IF NOT EXISTS idx_installments_user ON installments(user_id);
CREATE INDEX IF NOT EXISTS idx_installments_status ON installments(status);
CREATE INDEX IF NOT EXISTS idx_installments_reference ON installments(reference_month);
CREATE INDEX IF NOT EXISTS idx_transactions_family ON transactions(family_id);
CREATE INDEX IF NOT EXISTS idx_transactions_goal ON transactions(goal_id);
CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_interest_rates_account ON interest_rates(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_interest_rates_month ON interest_rates(reference_month);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_name, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);

-- ============================================================
-- TRIGGER: updated_at automático
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_families_updated_at         BEFORE UPDATE ON families         FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_profiles_updated_at         BEFORE UPDATE ON profiles         FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_bank_accounts_updated_at    BEFORE UPDATE ON bank_accounts    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_goals_updated_at            BEFORE UPDATE ON goals            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_installments_updated_at     BEFORE UPDATE ON installments     FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- TRIGGER: Criar profile automaticamente ao cadastrar usuário
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'phone'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- TRIGGER: Marcar installment como overdue automaticamente
-- ============================================================
CREATE OR REPLACE FUNCTION check_overdue_installments()
RETURNS VOID AS $$
BEGIN
  UPDATE installments
  SET status = 'overdue'
  WHERE status = 'pending'
    AND due_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;
