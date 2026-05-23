-- Phase 3: Payouts, bank activity, reconciliation
BEGIN;

ALTER TABLE payments ADD COLUMN IF NOT EXISTS payout_source_id TEXT;
ALTER TABLE refunds ADD COLUMN IF NOT EXISTS payout_source_id TEXT;
ALTER TABLE fees ADD COLUMN IF NOT EXISTS payout_source_id TEXT;

CREATE TABLE IF NOT EXISTS payouts (
  id BIGSERIAL PRIMARY KEY,
  source_system VARCHAR(64) NOT NULL,
  source_id VARCHAR(512) NOT NULL,
  payout_id VARCHAR(512) NOT NULL,
  platform VARCHAR(64) NOT NULL,
  payout_date TIMESTAMPTZ NOT NULL,
  arrival_date TIMESTAMPTZ,
  amount NUMERIC(18, 4) NOT NULL DEFAULT 0,
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  payout_status VARCHAR(64) NOT NULL,
  destination_last4 VARCHAR(16),
  external_reference TEXT,
  raw_payload_json JSONB,
  linked_bank_transaction_id BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (source_system, source_id)
);

CREATE INDEX IF NOT EXISTS idx_payouts_payout_date ON payouts (payout_date);
CREATE INDEX IF NOT EXISTS idx_payouts_arrival ON payouts (arrival_date);
CREATE INDEX IF NOT EXISTS idx_payouts_currency ON payouts (currency);
CREATE INDEX IF NOT EXISTS idx_payouts_amount ON payouts (amount);
CREATE INDEX IF NOT EXISTS idx_payouts_external_ref ON payouts (external_reference);
CREATE INDEX IF NOT EXISTS idx_payouts_source_system ON payouts (source_system);

CREATE TABLE IF NOT EXISTS payout_items (
  id BIGSERIAL PRIMARY KEY,
  source_system VARCHAR(64) NOT NULL,
  source_id VARCHAR(512) NOT NULL,
  payout_record_id BIGINT NOT NULL REFERENCES payouts (id) ON DELETE CASCADE,
  item_type VARCHAR(64) NOT NULL,
  linked_payment_source_id TEXT,
  linked_refund_source_id TEXT,
  linked_fee_source_id TEXT,
  amount NUMERIC(18, 4) NOT NULL DEFAULT 0,
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  event_date TIMESTAMPTZ,
  external_reference TEXT,
  raw_payload_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (source_system, source_id)
);

CREATE INDEX IF NOT EXISTS idx_payout_items_payout_record ON payout_items (payout_record_id);
CREATE INDEX IF NOT EXISTS idx_payout_items_event_date ON payout_items (event_date);

CREATE TABLE IF NOT EXISTS bank_transactions (
  id BIGSERIAL PRIMARY KEY,
  source_system VARCHAR(64) NOT NULL,
  source_id VARCHAR(512) NOT NULL,
  bank_account_name TEXT,
  bank_account_last4 VARCHAR(16),
  transaction_date DATE NOT NULL,
  posted_date DATE,
  amount NUMERIC(18, 4) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  transaction_type VARCHAR(64) NOT NULL,
  description TEXT,
  reference_number TEXT,
  external_reference TEXT,
  raw_payload_json JSONB,
  reconciliation_status VARCHAR(32) NOT NULL DEFAULT 'unmatched',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (source_system, source_id)
);

CREATE INDEX IF NOT EXISTS idx_bank_tx_transaction_date ON bank_transactions (transaction_date);
CREATE INDEX IF NOT EXISTS idx_bank_tx_posted_date ON bank_transactions (posted_date);
CREATE INDEX IF NOT EXISTS idx_bank_tx_amount ON bank_transactions (amount);
CREATE INDEX IF NOT EXISTS idx_bank_tx_currency ON bank_transactions (currency);
CREATE INDEX IF NOT EXISTS idx_bank_tx_reference ON bank_transactions (reference_number);
CREATE INDEX IF NOT EXISTS idx_bank_tx_recon_status ON bank_transactions (reconciliation_status);

CREATE TABLE IF NOT EXISTS reconciliation_matches (
  id BIGSERIAL PRIMARY KEY,
  match_type VARCHAR(32) NOT NULL DEFAULT 'payout_to_bank',
  payout_record_id BIGINT REFERENCES payouts (id) ON DELETE SET NULL,
  bank_transaction_record_id BIGINT REFERENCES bank_transactions (id) ON DELETE SET NULL,
  linked_payment_source_id TEXT,
  linked_refund_source_id TEXT,
  linked_fee_source_id TEXT,
  match_status VARCHAR(32) NOT NULL,
  match_method VARCHAR(32) NOT NULL,
  confidence_score NUMERIC(6, 2),
  amount_difference NUMERIC(18, 4),
  date_difference_days INT,
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recon_matches_status ON reconciliation_matches (match_status, active);
CREATE INDEX IF NOT EXISTS idx_recon_matches_payout ON reconciliation_matches (payout_record_id);
CREATE INDEX IF NOT EXISTS idx_recon_matches_bank ON reconciliation_matches (bank_transaction_record_id);

CREATE TABLE IF NOT EXISTS reconciliation_runs (
  id BIGSERIAL PRIMARY KEY,
  run_type VARCHAR(32) NOT NULL DEFAULT 'auto',
  status VARCHAR(32) NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  total_candidates INT NOT NULL DEFAULT 0,
  total_matched INT NOT NULL DEFAULT 0,
  total_partial INT NOT NULL DEFAULT 0,
  total_unmatched INT NOT NULL DEFAULT 0,
  total_needs_review INT NOT NULL DEFAULT 0,
  error_summary TEXT,
  metadata_json JSONB
);

CREATE INDEX IF NOT EXISTS idx_recon_runs_started ON reconciliation_runs (started_at DESC);

COMMIT;
