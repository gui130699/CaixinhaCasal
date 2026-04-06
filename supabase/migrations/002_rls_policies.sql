-- ============================================================
-- CAIXINHA CASAL - Row Level Security (RLS)
-- Migration: 002_rls_policies.sql
-- ============================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE families         ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members   ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_roles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals            ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_members     ENABLE ROW LEVEL SECURITY;
ALTER TABLE installments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE interest_rates   ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfers        ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs       ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Função auxiliar: verificar se é admin master
-- ============================================================
CREATE OR REPLACE FUNCTION is_master_admin(uid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM admin_roles WHERE user_id = uid);
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- Função auxiliar: família do usuário
-- ============================================================
CREATE OR REPLACE FUNCTION user_family_id(uid UUID)
RETURNS UUID AS $$
  SELECT family_id FROM family_members WHERE user_id = uid AND status = 'active' LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- Função auxiliar: papel do usuário na família
-- ============================================================
CREATE OR REPLACE FUNCTION user_family_role(uid UUID, fid UUID)
RETURNS TEXT AS $$
  SELECT role FROM family_members WHERE user_id = uid AND family_id = fid AND status = 'active' LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- POLICIES: profiles
-- ============================================================
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (id = auth.uid() OR is_master_admin(auth.uid()));

CREATE POLICY "profiles_select_family_member" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM family_members fm1
      JOIN family_members fm2 ON fm1.family_id = fm2.family_id
      WHERE fm1.user_id = auth.uid() AND fm2.user_id = profiles.id AND fm1.status = 'active'
    )
  );

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (id = auth.uid() OR is_master_admin(auth.uid()));

-- ============================================================
-- POLICIES: families
-- ============================================================
CREATE POLICY "families_select" ON families
  FOR SELECT USING (
    is_master_admin(auth.uid()) OR
    EXISTS (SELECT 1 FROM family_members WHERE family_id = families.id AND user_id = auth.uid() AND status = 'active')
  );

CREATE POLICY "families_insert_admin" ON families
  FOR INSERT WITH CHECK (is_master_admin(auth.uid()));

CREATE POLICY "families_update" ON families
  FOR UPDATE USING (
    is_master_admin(auth.uid()) OR
    user_family_role(auth.uid(), id) = 'admin'
  );

CREATE POLICY "families_delete_admin" ON families
  FOR DELETE USING (is_master_admin(auth.uid()));

-- ============================================================
-- POLICIES: family_members
-- ============================================================
CREATE POLICY "family_members_select" ON family_members
  FOR SELECT USING (
    is_master_admin(auth.uid()) OR
    user_id = auth.uid() OR
    user_family_role(auth.uid(), family_id) = 'admin'
  );

CREATE POLICY "family_members_insert" ON family_members
  FOR INSERT WITH CHECK (
    is_master_admin(auth.uid()) OR
    user_family_role(auth.uid(), family_id) = 'admin'
  );

CREATE POLICY "family_members_update" ON family_members
  FOR UPDATE USING (
    is_master_admin(auth.uid()) OR
    user_family_role(auth.uid(), family_id) = 'admin'
  );

CREATE POLICY "family_members_delete" ON family_members
  FOR DELETE USING (
    is_master_admin(auth.uid()) OR
    user_family_role(auth.uid(), family_id) = 'admin'
  );

-- ============================================================
-- POLICIES: admin_roles
-- ============================================================
CREATE POLICY "admin_roles_select" ON admin_roles
  FOR SELECT USING (is_master_admin(auth.uid()) OR user_id = auth.uid());

CREATE POLICY "admin_roles_manage" ON admin_roles
  FOR ALL USING (is_master_admin(auth.uid()));

-- ============================================================
-- POLICIES: bank_accounts
-- ============================================================
CREATE POLICY "bank_accounts_select" ON bank_accounts
  FOR SELECT USING (
    is_master_admin(auth.uid()) OR
    EXISTS (SELECT 1 FROM family_members WHERE family_id = bank_accounts.family_id AND user_id = auth.uid() AND status = 'active')
  );

CREATE POLICY "bank_accounts_insert" ON bank_accounts
  FOR INSERT WITH CHECK (
    is_master_admin(auth.uid()) OR
    user_family_role(auth.uid(), family_id) = 'admin'
  );

CREATE POLICY "bank_accounts_update" ON bank_accounts
  FOR UPDATE USING (
    is_master_admin(auth.uid()) OR
    user_family_role(auth.uid(), family_id) = 'admin'
  );

CREATE POLICY "bank_accounts_delete" ON bank_accounts
  FOR DELETE USING (
    is_master_admin(auth.uid()) OR
    user_family_role(auth.uid(), family_id) = 'admin'
  );

-- ============================================================
-- POLICIES: goals
-- ============================================================
CREATE POLICY "goals_select" ON goals
  FOR SELECT USING (
    is_master_admin(auth.uid()) OR
    EXISTS (SELECT 1 FROM family_members WHERE family_id = goals.family_id AND user_id = auth.uid() AND status = 'active')
  );

CREATE POLICY "goals_insert" ON goals
  FOR INSERT WITH CHECK (
    is_master_admin(auth.uid()) OR
    user_family_role(auth.uid(), family_id) = 'admin'
  );

CREATE POLICY "goals_update" ON goals
  FOR UPDATE USING (
    is_master_admin(auth.uid()) OR
    user_family_role(auth.uid(), family_id) = 'admin'
  );

CREATE POLICY "goals_delete" ON goals
  FOR DELETE USING (
    is_master_admin(auth.uid()) OR
    user_family_role(auth.uid(), family_id) = 'admin'
  );

-- ============================================================
-- POLICIES: goal_members
-- ============================================================
CREATE POLICY "goal_members_select" ON goal_members
  FOR SELECT USING (
    is_master_admin(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM goals g
      JOIN family_members fm ON fm.family_id = g.family_id
      WHERE g.id = goal_members.goal_id AND fm.user_id = auth.uid() AND fm.status = 'active'
    )
  );

CREATE POLICY "goal_members_manage" ON goal_members
  FOR ALL USING (
    is_master_admin(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM goals g
      WHERE g.id = goal_members.goal_id AND user_family_role(auth.uid(), g.family_id) = 'admin'
    )
  );

-- ============================================================
-- POLICIES: installments
-- ============================================================
CREATE POLICY "installments_select" ON installments
  FOR SELECT USING (
    is_master_admin(auth.uid()) OR
    EXISTS (SELECT 1 FROM family_members WHERE family_id = installments.family_id AND user_id = auth.uid() AND status = 'active')
  );

CREATE POLICY "installments_insert" ON installments
  FOR INSERT WITH CHECK (
    is_master_admin(auth.uid()) OR
    user_family_role(auth.uid(), family_id) = 'admin'
  );

CREATE POLICY "installments_update" ON installments
  FOR UPDATE USING (
    is_master_admin(auth.uid()) OR
    user_family_role(auth.uid(), family_id) = 'admin' OR
    user_id = auth.uid()
  );

-- ============================================================
-- POLICIES: transactions
-- ============================================================
CREATE POLICY "transactions_select" ON transactions
  FOR SELECT USING (
    is_master_admin(auth.uid()) OR
    EXISTS (SELECT 1 FROM family_members WHERE family_id = transactions.family_id AND user_id = auth.uid() AND status = 'active')
  );

CREATE POLICY "transactions_insert" ON transactions
  FOR INSERT WITH CHECK (
    is_master_admin(auth.uid()) OR
    EXISTS (SELECT 1 FROM family_members WHERE family_id = transactions.family_id AND user_id = auth.uid() AND status = 'active')
  );

CREATE POLICY "transactions_update" ON transactions
  FOR UPDATE USING (
    is_master_admin(auth.uid()) OR
    user_family_role(auth.uid(), family_id) = 'admin'
  );

-- ============================================================
-- POLICIES: interest_rates
-- ============================================================
CREATE POLICY "interest_rates_select" ON interest_rates
  FOR SELECT USING (
    is_master_admin(auth.uid()) OR
    EXISTS (SELECT 1 FROM family_members WHERE family_id = interest_rates.family_id AND user_id = auth.uid() AND status = 'active')
  );

CREATE POLICY "interest_rates_insert" ON interest_rates
  FOR INSERT WITH CHECK (
    is_master_admin(auth.uid()) OR
    user_family_role(auth.uid(), family_id) = 'admin'
  );

CREATE POLICY "interest_rates_update" ON interest_rates
  FOR UPDATE USING (
    is_master_admin(auth.uid()) OR
    user_family_role(auth.uid(), family_id) = 'admin'
  );

-- ============================================================
-- POLICIES: transfers
-- ============================================================
CREATE POLICY "transfers_select" ON transfers
  FOR SELECT USING (
    is_master_admin(auth.uid()) OR
    EXISTS (SELECT 1 FROM family_members WHERE family_id = transfers.family_id AND user_id = auth.uid() AND status = 'active')
  );

CREATE POLICY "transfers_insert" ON transfers
  FOR INSERT WITH CHECK (
    is_master_admin(auth.uid()) OR
    user_family_role(auth.uid(), family_id) = 'admin'
  );

-- ============================================================
-- POLICIES: audit_logs
-- ============================================================
CREATE POLICY "audit_logs_select" ON audit_logs
  FOR SELECT USING (is_master_admin(auth.uid()));

CREATE POLICY "audit_logs_insert" ON audit_logs
  FOR INSERT WITH CHECK (TRUE); -- Qualquer usuário autenticado pode gerar log
