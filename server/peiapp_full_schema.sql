-- =============================================================================
-- PEIAPP DATABASE SCHEMA SETUP SCRIPT (PostgreSQL)
-- =============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -------------------------------------------------------------
-- CLEANUP: Drop existing tables, views, and functions
-- -------------------------------------------------------------
DROP VIEW IF EXISTS wallet_balances_view CASCADE;
DROP FUNCTION IF EXISTS sync_wallet_balance(UUID) CASCADE;
DROP FUNCTION IF EXISTS sync_user_wallet_balances(UUID) CASCADE;

DROP TABLE IF EXISTS notification_logs CASCADE;
DROP TABLE IF EXISTS helpdesk CASCADE;
DROP TABLE IF EXISTS recurring_tickets CASCADE;
DROP TABLE IF EXISTS ticket_chat CASCADE;
DROP TABLE IF EXISTS ticket_logs CASCADE;
DROP TABLE IF EXISTS ticket_details CASCADE;
DROP TABLE IF EXISTS tickets CASCADE;
DROP TABLE IF EXISTS wallets_categories CASCADE;
DROP TABLE IF EXISTS wallets_panels CASCADE;
DROP TABLE IF EXISTS wallets_goals CASCADE;
DROP TABLE IF EXISTS wallet_distribution_lists CASCADE;
DROP TABLE IF EXISTS wallet_members CASCADE;
DROP TABLE IF EXISTS wallets CASCADE;
DROP TABLE IF EXISTS phone_otps CASCADE;
DROP TABLE IF EXISTS users CASCADE;


-- -------------------------------------------------------------
-- 1. USERS
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  user_id                           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone                             VARCHAR(20) UNIQUE NOT NULL,     -- E.164 phone number without '+'
  display_name                      VARCHAR(255),
  avatar_url                        VARCHAR(255),
  country                           VARCHAR(255) NOT NULL DEFAULT 'AR',
  currency                          VARCHAR(255) NOT NULL DEFAULT 'USD',
  default_payment_procedure         TEXT,
  gender                            VARCHAR(255),
  age                               INTEGER,
  push_enabled                      BOOLEAN NOT NULL DEFAULT TRUE,
  theme                             VARCHAR(20) DEFAULT 'light',
  default_wallet_id                 UUID,
  notification_id                   VARCHAR(255),                    -- ExponentPushToken[...]
  preferred_notification_time       VARCHAR(5) DEFAULT '09:00',
  daily_reports_enabled             BOOLEAN DEFAULT TRUE,
  monthly_reports_enabled           BOOLEAN DEFAULT TRUE,
  transaction_notifications_enabled BOOLEAN DEFAULT TRUE,
  last_access                       TIMESTAMPTZ,
  created_at                        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at                        TIMESTAMPTZ                      -- Soft delete
);

-- -------------------------------------------------------------
-- 2. PHONE OTPS
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS phone_otps (
  otp_id     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  otp_hash   VARCHAR(255) NOT NULL,                                  -- bcrypt hash of 6-digit code
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------
-- 3. WALLETS
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wallets (
  wallet_id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                       VARCHAR(80) NOT NULL,
  type                       VARCHAR(20) NOT NULL,                   -- personal|business|shared|mymoney|mypays|mycollects|products|...
  currency                   VARCHAR(3) NOT NULL DEFAULT 'USD',
  default_payment_method     TEXT,
  default_transaction_type   VARCHAR(10) NOT NULL DEFAULT 'expense', -- income|expense
  help_to_collect            BOOLEAN NOT NULL DEFAULT FALSE,
  balance                    DECIMAL(14,2) NOT NULL DEFAULT 0,
  total_incomes              DECIMAL(14,2) NOT NULL DEFAULT 0,
  total_expenses             DECIMAL(14,2) NOT NULL DEFAULT 0,
  pending_incomes            DECIMAL(14,2) NOT NULL DEFAULT 0,
  pending_expenses           DECIMAL(14,2) NOT NULL DEFAULT 0,
  avatar_url                 TEXT,
  warning_threshold          DECIMAL(14,2) NOT NULL DEFAULT 0,
  alert_threshold            DECIMAL(14,2) NOT NULL DEFAULT 0,
  include_in_general_balance BOOLEAN DEFAULT TRUE,
  owner_id                   UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  ai_questions               JSONB,                                  -- String array with preset questions
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at                 TIMESTAMPTZ                             -- Soft delete
);

-- -------------------------------------------------------------
-- 4. WALLET MEMBERS
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wallet_members (
  member_id  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id  UUID NOT NULL REFERENCES wallets(wallet_id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  role       VARCHAR(20) NOT NULL,                                   -- owner|admin|operator|viewer
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE (wallet_id, user_id)
);

-- -------------------------------------------------------------
-- 5. WALLET DISTRIBUTION LISTS
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wallet_distribution_lists (
  list_id    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id  UUID NOT NULL REFERENCES wallets(wallet_id) ON DELETE CASCADE,
  name       VARCHAR(100) NOT NULL,
  contacts   JSON,                                                   -- [{name: string, phone: string}]
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- -------------------------------------------------------------
-- 6. WALLET GOALS
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wallets_goals (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id       UUID NOT NULL REFERENCES wallets(wallet_id) ON DELETE CASCADE,
  name            VARCHAR(150) NOT NULL,
  target_amount   DECIMAL(14,2) NOT NULL DEFAULT 0,
  current_amount  DECIMAL(14,2) NOT NULL DEFAULT 0,
  deadline        TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------
-- 7. WALLET PANELS
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wallets_panels (
  panel_id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  panel_name    VARCHAR(100) NOT NULL,
  is_enabled    BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  wallet_id     UUID NOT NULL REFERENCES wallets(wallet_id) ON DELETE CASCADE
);

-- -------------------------------------------------------------
-- 8. WALLET CATEGORIES
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wallets_categories (
  category_id  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_key VARCHAR(100) NOT NULL,
  type         VARCHAR(10) NOT NULL,                                 -- income|expense
  is_enabled   BOOLEAN NOT NULL DEFAULT TRUE,
  wallet_id    UUID NOT NULL REFERENCES wallets(wallet_id) ON DELETE CASCADE
);

-- -------------------------------------------------------------
-- 9. TICKETS
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tickets (
  ticket_id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id                    UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  amount                      DECIMAL(14,2) NOT NULL,
  initial_amount              DECIMAL(14,2),
  amount_paid                 DECIMAL(14,2) NOT NULL DEFAULT 0,
  currency                    VARCHAR(3) NOT NULL DEFAULT 'USD',
  description                 VARCHAR(255),
  due_date                    TIMESTAMPTZ NOT NULL,
  initial_due_date            TIMESTAMPTZ,
  status                      VARCHAR(20) NOT NULL DEFAULT 'completed', -- pending|completed|cancelled
  type                        VARCHAR(20) DEFAULT 'ticket',             -- ticket|transfer|adjustment
  payment_method              TEXT,
  payment_procedure           TEXT,
  private_note                TEXT,
  comment                     TEXT,
  generate_peilink            BOOLEAN NOT NULL DEFAULT FALSE,
  help_to_collect             BOOLEAN NOT NULL DEFAULT FALSE,
  expenses                    DECIMAL(14,2) NOT NULL DEFAULT 0,
  expenses_detail             TEXT,
  reference                   VARCHAR(100),
  attachment_url              TEXT,
  source                      VARCHAR(50) NOT NULL DEFAULT 'app',
  source_info                 TEXT,
  owner_rating                INTEGER,
  participant_rating          INTEGER,
  short_id                    VARCHAR(10),                              -- Public short identifier for PeiLinks
  last_chat_message           TEXT,                                     -- Unread indicator chat message
  last_chat_message_timestamp TIMESTAMPTZ,                              -- Unread indicator timestamp
  last_chat_sender_id         UUID,                                     -- Unread indicator sender
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at                  TIMESTAMPTZ                               -- Soft delete
);

-- -------------------------------------------------------------
-- 10. TICKET DETAILS
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ticket_details (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id    UUID NOT NULL REFERENCES tickets(ticket_id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  wallet_id    UUID REFERENCES wallets(wallet_id) ON DELETE SET NULL,
  role         VARCHAR(255) NOT NULL,                                    -- owner|receiver
  type         VARCHAR(20) NOT NULL,                                     -- income|expense
  rubro        VARCHAR(255),
  description  VARCHAR(255),
  private_note TEXT,
  created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------
-- 11. TICKET LOGS
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ticket_logs (
  log_id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id      UUID NOT NULL REFERENCES tickets(ticket_id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  action         VARCHAR(100) NOT NULL,                                  -- ticket_created|payment_received|due_date_changed|...
  old_value      TEXT,
  new_value      TEXT NOT NULL,
  payment_method VARCHAR(50),
  comment        TEXT,
  attachment_url TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------
-- 12. TICKET CHAT
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ticket_chat (
  chat_id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id            UUID NOT NULL REFERENCES tickets(ticket_id) ON DELETE CASCADE,
  sender_id            UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  message              TEXT,
  sender_name          VARCHAR(100),
  attachment_url       TEXT,
  attachment_type      VARCHAR(20),                                      -- image|file
  reply_to_chat_id     UUID REFERENCES ticket_chat(chat_id) ON DELETE SET NULL, -- WhatsApp-style reply link
  reply_to_message     TEXT,                                             -- Quoted reply parent message text
  reply_to_sender_name VARCHAR(100),                                     -- Quoted reply parent sender name
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------
-- 13. RECURRING TICKETS
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS recurring_tickets (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id              UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  wallet_id             VARCHAR(255) NOT NULL,
  amount                DECIMAL(14,2) NOT NULL,
  currency              VARCHAR(3) NOT NULL,
  description           VARCHAR(255) NOT NULL,
  payment_procedure     TEXT,
  private_note          TEXT,
  comment               TEXT,
  help_to_collect       BOOLEAN NOT NULL DEFAULT FALSE,
  frequency             VARCHAR(50) NOT NULL,                             -- weekly|biweekly|monthly|bimonthly|semi-annually|yearly
  total_installments    INTEGER NOT NULL,
  current_installment   INTEGER NOT NULL DEFAULT 0,
  last_generated_date   TIMESTAMPTZ,
  next_generation_date  TIMESTAMPTZ NOT NULL,
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  category_id           VARCHAR(255),
  rubro                 VARCHAR(255),
  type                  VARCHAR(20) NOT NULL DEFAULT 'ticket',
  participants          JSONB,                                            -- Array of participants info
  short_id              VARCHAR(10),
  to_wallet_id          VARCHAR(255),
  to_rubro              VARCHAR(255),
  created_at            TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMP NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------
-- 14. HELPDESK
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS helpdesk (
  id         SERIAL PRIMARY KEY,
  user_id    UUID REFERENCES users(user_id) ON DELETE CASCADE,
  message    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------
-- 15. NOTIFICATION LOGS (Use in separate DB: peiapp_notifications)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notification_logs (
  id         SERIAL PRIMARY KEY,
  user_id    VARCHAR(50),
  content    TEXT,
  type       VARCHAR(20),                                              -- push|whatsapp|sms
  status     VARCHAR(20),                                              -- pending|sent|logged_only|mocked|error|invalid_token
  created_at TIMESTAMP DEFAULT NOW()
);


-- =============================================================================
-- VIEWS & BALANCE AUTO-CALCULATION PROCEDURES
-- =============================================================================

-- 1. Create wallet balances calculator view
DROP VIEW IF EXISTS wallet_balances_view CASCADE;

CREATE OR REPLACE VIEW wallet_balances_view AS
WITH unique_ticket_wallet AS (
  SELECT 
    td.wallet_id,
    td.ticket_id,
    MIN(td.type) as type 
  FROM ticket_details td
  WHERE td.wallet_id IS NOT NULL
  GROUP BY td.wallet_id, td.ticket_id
)
SELECT
  w.wallet_id,
  w.owner_id,
  w.name,

  -- Net Balance: Real money received - Real money paid
  COALESCE(SUM(
    CASE WHEN utw.type = 'income' THEN t.amount_paid ELSE 0 END
  ), 0) -
  COALESCE(SUM(
    CASE WHEN utw.type = 'expense' THEN t.amount_paid ELSE 0 END
  ), 0) AS balance,

  -- Total actually received/collected
  COALESCE(SUM(
    CASE WHEN utw.type = 'income' THEN t.amount_paid ELSE 0 END
  ), 0) AS total_incomes,

  -- Total actually paid
  COALESCE(SUM(
    CASE WHEN utw.type = 'expense' THEN t.amount_paid ELSE 0 END
  ), 0) AS total_expenses,

  -- Pending collections
  COALESCE(SUM(
    CASE WHEN utw.type = 'income' AND t.status = 'pending' THEN (t.amount - t.amount_paid) ELSE 0 END
  ), 0) AS pending_incomes,

  -- Pending payments
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

-- 2. Balance synchronization helper function (Single Wallet)
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

-- 3. Balance synchronization helper function (All User Wallets)
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
