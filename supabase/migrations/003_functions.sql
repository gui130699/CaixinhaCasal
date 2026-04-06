-- ============================================================
-- CAIXINHA CASAL - Functions & Views
-- Migration: 003_functions.sql
-- ============================================================

-- ============================================================
-- VIEW: dashboard_summary (Resumo por família)
-- ============================================================
CREATE OR REPLACE VIEW family_dashboard_summary AS
SELECT
  f.id AS family_id,
  f.name AS family_name,
  COUNT(DISTINCT fm.user_id) FILTER (WHERE fm.status = 'active') AS active_members,
  COUNT(DISTINCT g.id) FILTER (WHERE g.status = 'active') AS active_goals,
  COALESCE(SUM(ba.current_balance) FILTER (WHERE ba.status = 'active'), 0) AS total_balance,
  COALESCE(SUM(g.target_amount) FILTER (WHERE g.status = 'active'), 0) AS total_target,
  COALESCE(SUM(g.current_balance) FILTER (WHERE g.status = 'active'), 0) AS total_saved
FROM families f
LEFT JOIN family_members fm ON fm.family_id = f.id
LEFT JOIN bank_accounts ba ON ba.family_id = f.id
LEFT JOIN goals g ON g.family_id = f.id
GROUP BY f.id, f.name;

-- ============================================================
-- FUNCTION: recalculate_goal_balance
-- Recalcula o saldo atual de uma meta com base nas transações
-- ============================================================
CREATE OR REPLACE FUNCTION recalculate_goal_balance(p_goal_id UUID)
RETURNS VOID AS $$
DECLARE
  v_initial NUMERIC;
  v_total   NUMERIC;
  v_target  NUMERIC;
  v_new_balance NUMERIC;
  v_remaining   NUMERIC;
BEGIN
  SELECT initial_amount, target_amount INTO v_initial, v_target
  FROM goals WHERE id = p_goal_id;

  SELECT COALESCE(SUM(
    CASE
      WHEN type IN ('deposit','extra_deposit','advance_installment','interest','transfer_in') THEN amount
      WHEN type IN ('withdrawal','transfer_out','manual_adjustment') THEN -amount
      ELSE amount
    END
  ), 0) INTO v_total
  FROM transactions WHERE goal_id = p_goal_id;

  v_new_balance := v_initial + v_total;
  v_remaining := GREATEST(v_target - v_new_balance, 0);

  UPDATE goals SET
    current_balance  = v_new_balance,
    remaining_amount = v_remaining,
    status = CASE WHEN v_new_balance >= v_target AND status != 'completed' THEN 'completed' ELSE status END,
    completed_at = CASE WHEN v_new_balance >= v_target AND completed_at IS NULL THEN NOW() ELSE completed_at END,
    updated_at = NOW()
  WHERE id = p_goal_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: recalculate_bank_account_balance
-- Recalcula o saldo atual de uma conta bancária
-- ============================================================
CREATE OR REPLACE FUNCTION recalculate_bank_account_balance(p_account_id UUID)
RETURNS VOID AS $$
DECLARE
  v_initial NUMERIC;
  v_deposits NUMERIC;
  v_withdrawals NUMERIC;
  v_interests NUMERIC;
  v_transfers_in NUMERIC;
  v_transfers_out NUMERIC;
BEGIN
  SELECT initial_balance INTO v_initial
  FROM bank_accounts WHERE id = p_account_id;

  SELECT
    COALESCE(SUM(amount) FILTER (WHERE type IN ('deposit','extra_deposit','advance_installment')), 0),
    COALESCE(SUM(amount) FILTER (WHERE type IN ('withdrawal','manual_adjustment')), 0),
    COALESCE(SUM(amount) FILTER (WHERE type = 'interest'), 0),
    COALESCE(SUM(amount) FILTER (WHERE type = 'transfer_in'), 0),
    COALESCE(SUM(amount) FILTER (WHERE type = 'transfer_out'), 0)
  INTO v_deposits, v_withdrawals, v_interests, v_transfers_in, v_transfers_out
  FROM transactions WHERE bank_account_id = p_account_id;

  UPDATE bank_accounts SET
    current_balance = v_initial + v_deposits + v_interests + v_transfers_in - v_withdrawals - v_transfers_out,
    updated_at = NOW()
  WHERE id = p_account_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- TRIGGER: Recalcular saldo após nova transação
-- ============================================================
CREATE OR REPLACE FUNCTION trg_recalculate_on_transaction()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalcular conta bancária
  IF NEW.bank_account_id IS NOT NULL THEN
    PERFORM recalculate_bank_account_balance(NEW.bank_account_id);
  END IF;

  -- Recalcular meta
  IF NEW.goal_id IS NOT NULL THEN
    PERFORM recalculate_goal_balance(NEW.goal_id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER after_transaction_insert
  AFTER INSERT ON transactions
  FOR EACH ROW EXECUTE FUNCTION trg_recalculate_on_transaction();

-- ============================================================
-- TRIGGER: Recalcular após lançamento de juros
-- ============================================================
CREATE OR REPLACE FUNCTION trg_recalculate_on_interest()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE bank_accounts SET
    current_balance = NEW.balance_after,
    updated_at = NOW()
  WHERE id = NEW.bank_account_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER after_interest_insert
  AFTER INSERT ON interest_rates
  FOR EACH ROW EXECUTE FUNCTION trg_recalculate_on_interest();

-- ============================================================
-- TRIGGER: Recalcular após transferência
-- ============================================================
CREATE OR REPLACE FUNCTION trg_recalculate_on_transfer()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM recalculate_bank_account_balance(NEW.from_bank_account_id);
  PERFORM recalculate_bank_account_balance(NEW.to_bank_account_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER after_transfer_insert
  AFTER INSERT ON transfers
  FOR EACH ROW EXECUTE FUNCTION trg_recalculate_on_transfer();

-- ============================================================
-- FUNCTION: generate_installments
-- Gera cronograma de parcelas para uma meta
-- ============================================================
CREATE OR REPLACE FUNCTION generate_installments(p_goal_id UUID)
RETURNS VOID AS $$
DECLARE
  v_goal RECORD;
  v_member RECORD;
  v_month DATE;
  v_month_num INTEGER;
BEGIN
  SELECT * INTO v_goal FROM goals WHERE id = p_goal_id;
  IF NOT FOUND THEN RETURN; END IF;

  -- Limpar parcelas pendentes existentes
  DELETE FROM installments WHERE goal_id = p_goal_id AND status = 'pending';

  -- Iterar por cada mês do cronograma
  FOR v_month_num IN 1..COALESCE(v_goal.months_count, 1) LOOP
    v_month := v_goal.start_date + (INTERVAL '1 month' * (v_month_num - 1));

    -- Para cada membro ativo da meta
    FOR v_member IN
      SELECT * FROM goal_members WHERE goal_id = p_goal_id AND status = 'active'
    LOOP
      INSERT INTO installments (
        family_id, goal_id, user_id, reference_month,
        due_date, expected_amount, status
      ) VALUES (
        v_goal.family_id, p_goal_id, v_member.user_id,
        DATE_TRUNC('month', v_month),
        (DATE_TRUNC('month', v_month) + INTERVAL '1 month' - INTERVAL '1 day')::DATE,
        v_member.expected_monthly_amount,
        'pending'
      )
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: log_audit
-- Registra log de auditoria
-- ============================================================
CREATE OR REPLACE FUNCTION log_audit(
  p_actor_id   UUID,
  p_entity     TEXT,
  p_entity_id  UUID,
  p_action     TEXT,
  p_before     JSONB DEFAULT NULL,
  p_after      JSONB DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  INSERT INTO audit_logs (actor_user_id, entity_name, entity_id, action_type, before_data, after_data)
  VALUES (p_actor_id, p_entity, p_entity_id, p_action, p_before, p_after);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
