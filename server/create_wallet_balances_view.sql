-- =============================================================
-- wallet_balances_view: vista que calcula saldos de billeteras
-- Fuente de verdad: ticket_details + tickets
-- CORRECCIÓN: Se utiliza una subconsulta para evitar duplicar montos cuando 
-- un ticket tiene múltiples miembros en la misma billetera compartida.
-- =============================================================

DROP VIEW IF EXISTS wallet_balances_view CASCADE;

CREATE OR REPLACE VIEW wallet_balances_view AS
WITH unique_ticket_wallet AS (
  -- Obtenemos un solo registro por cada combinación de ticket y billetera
  SELECT 
    td.wallet_id,
    td.ticket_id,
    -- Tomamos el tipo del dueño si está en la billetera, o el primero que encontremos
    -- (En billeteras compartidas todos los miembros ven el mismo tipo)
    MIN(td.type) as type 
  FROM ticket_details td
  WHERE td.wallet_id IS NOT NULL
  GROUP BY td.wallet_id, td.ticket_id
)
SELECT
  w.wallet_id,
  w.owner_id,
  w.name,

  -- Balance efectivo: Dinero real que entró - Dinero real que salió
  COALESCE(SUM(
    CASE WHEN utw.type = 'income' THEN t.amount_paid ELSE 0 END
  ), 0) -
  COALESCE(SUM(
    CASE WHEN utw.type = 'expense' THEN t.amount_paid ELSE 0 END
  ), 0) AS balance,

  -- Total cobrado realmente
  COALESCE(SUM(
    CASE WHEN utw.type = 'income' THEN t.amount_paid ELSE 0 END
  ), 0) AS total_incomes,

  -- Total pagado realmente
  COALESCE(SUM(
    CASE WHEN utw.type = 'expense' THEN t.amount_paid ELSE 0 END
  ), 0) AS total_expenses,

  -- Saldo pendiente por cobrar
  COALESCE(SUM(
    CASE WHEN utw.type = 'income' AND t.status = 'pending' THEN (t.amount - t.amount_paid) ELSE 0 END
  ), 0) AS pending_incomes,

  -- Saldo pendiente por pagar
  COALESCE(SUM(
    CASE WHEN utw.type = 'expense' AND t.status = 'pending' THEN (t.amount - t.amount_paid) ELSE 0 END
  ), 0) AS pending_expenses

FROM wallets w
LEFT JOIN unique_ticket_wallet utw
  ON utw.wallet_id = w.wallet_id
LEFT JOIN tickets t
  ON t.ticket_id = utw.ticket_id
  AND t.deleted_at IS NULL
  AND t.status IN ('pending', 'completed')
WHERE
  w.deleted_at IS NULL
GROUP BY w.wallet_id, w.owner_id, w.name;

-- Re-crear funciones que dependen de la vista
CREATE OR REPLACE FUNCTION sync_wallet_balance(p_wallet_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  UPDATE wallets w
  SET
    balance          = v.balance,
    total_incomes    = v.total_incomes,
    total_expenses   = v.total_expenses,
    pending_incomes  = v.pending_incomes,
    pending_expenses = v.pending_expenses,
    updated_at       = NOW()
  FROM wallet_balances_view v
  WHERE w.wallet_id = v.wallet_id
    AND w.wallet_id = p_wallet_id;
END;
$$;

CREATE OR REPLACE FUNCTION sync_user_wallet_balances(p_user_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  UPDATE wallets w
  SET
    balance          = v.balance,
    total_incomes    = v.total_incomes,
    total_expenses   = v.total_expenses,
    pending_incomes  = v.pending_incomes,
    pending_expenses = v.pending_expenses,
    updated_at       = NOW()
  FROM wallet_balances_view v
  WHERE w.wallet_id = v.wallet_id
    AND w.owner_id = p_user_id;
END;
$$;
