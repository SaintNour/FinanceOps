-- ERPS Finance Phase 2 — PostgreSQL schema
-- Run: node db/migrate.js (or psql -f db/schema.sql)

BEGIN;

CREATE TABLE IF NOT EXISTS orders (
  id BIGSERIAL PRIMARY KEY,
  source_system VARCHAR(64) NOT NULL,
  source_id VARCHAR(512) NOT NULL,
  order_id VARCHAR(512) NOT NULL,
  platform VARCHAR(64) NOT NULL,
  order_date TIMESTAMPTZ NOT NULL,
  customer_name TEXT,
  gross_amount NUMERIC(18, 4) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(18, 4) NOT NULL DEFAULT 0,
  shipping_amount NUMERIC(18, 4) NOT NULL DEFAULT 0,
  order_status VARCHAR(64) NOT NULL,
  raw_payload_json JSONB,
  external_reference TEXT,
  currency VARCHAR(10) DEFAULT 'USD',
  linked_order_source_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (source_system, source_id)
);

CREATE INDEX IF NOT EXISTS idx_orders_order_date ON orders (order_date);
CREATE INDEX IF NOT EXISTS idx_orders_platform ON orders (platform);
CREATE INDEX IF NOT EXISTS idx_orders_source_system ON orders (source_system);

CREATE TABLE IF NOT EXISTS payments (
  id BIGSERIAL PRIMARY KEY,
  source_system VARCHAR(64) NOT NULL,
  source_id VARCHAR(512) NOT NULL,
  payment_id VARCHAR(512) NOT NULL,
  order_id VARCHAR(512),
  platform VARCHAR(64) NOT NULL,
  payment_processor VARCHAR(64) NOT NULL,
  payment_date TIMESTAMPTZ NOT NULL,
  amount NUMERIC(18, 4) NOT NULL DEFAULT 0,
  fee_amount NUMERIC(18, 4) NOT NULL DEFAULT 0,
  payment_status VARCHAR(64) NOT NULL,
  raw_payload_json JSONB,
  external_reference TEXT,
  currency VARCHAR(10) DEFAULT 'USD',
  linked_payment_source_id TEXT,
  linked_order_source_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (source_system, source_id)
);

CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments (payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments (order_id);
CREATE INDEX IF NOT EXISTS idx_payments_platform ON payments (platform);
CREATE INDEX IF NOT EXISTS idx_payments_source_system ON payments (source_system);

CREATE TABLE IF NOT EXISTS refunds (
  id BIGSERIAL PRIMARY KEY,
  source_system VARCHAR(64) NOT NULL,
  source_id VARCHAR(512) NOT NULL,
  refund_id VARCHAR(512) NOT NULL,
  order_id VARCHAR(512),
  platform VARCHAR(64) NOT NULL,
  refund_date TIMESTAMPTZ NOT NULL,
  refund_amount NUMERIC(18, 4) NOT NULL DEFAULT 0,
  refund_reason TEXT,
  refund_status VARCHAR(64) NOT NULL,
  raw_payload_json JSONB,
  external_reference TEXT,
  currency VARCHAR(10) DEFAULT 'USD',
  linked_payment_source_id TEXT,
  linked_order_source_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (source_system, source_id)
);

CREATE INDEX IF NOT EXISTS idx_refunds_refund_date ON refunds (refund_date);
CREATE INDEX IF NOT EXISTS idx_refunds_order_id ON refunds (order_id);
CREATE INDEX IF NOT EXISTS idx_refunds_source_system ON refunds (source_system);

CREATE TABLE IF NOT EXISTS fees (
  id BIGSERIAL PRIMARY KEY,
  source_system VARCHAR(64) NOT NULL,
  source_id VARCHAR(512) NOT NULL,
  fee_id VARCHAR(512) NOT NULL,
  order_id VARCHAR(512),
  platform VARCHAR(64) NOT NULL,
  fee_type VARCHAR(64) NOT NULL,
  fee_amount NUMERIC(18, 4) NOT NULL DEFAULT 0,
  fee_date DATE NOT NULL,
  source VARCHAR(64) NOT NULL,
  raw_payload_json JSONB,
  external_reference TEXT,
  currency VARCHAR(10) DEFAULT 'USD',
  linked_payment_source_id TEXT,
  linked_order_source_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (source_system, source_id)
);

CREATE INDEX IF NOT EXISTS idx_fees_fee_date ON fees (fee_date);
CREATE INDEX IF NOT EXISTS idx_fees_platform ON fees (platform);
CREATE INDEX IF NOT EXISTS idx_fees_source_system ON fees (source_system);

CREATE TABLE IF NOT EXISTS import_jobs (
  id BIGSERIAL PRIMARY KEY,
  import_type VARCHAR(32) NOT NULL,
  filename TEXT,
  source_system VARCHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL,
  total_rows INT NOT NULL DEFAULT 0,
  imported_rows INT NOT NULL DEFAULT 0,
  updated_rows INT NOT NULL DEFAULT 0,
  skipped_rows INT NOT NULL DEFAULT 0,
  failed_rows INT NOT NULL DEFAULT 0,
  error_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_import_jobs_created ON import_jobs (created_at DESC);

CREATE TABLE IF NOT EXISTS sync_jobs (
  id BIGSERIAL PRIMARY KEY,
  integration_name VARCHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  records_created INT NOT NULL DEFAULT 0,
  records_updated INT NOT NULL DEFAULT 0,
  records_skipped INT NOT NULL DEFAULT 0,
  error_summary TEXT,
  meta_json JSONB
);

CREATE INDEX IF NOT EXISTS idx_sync_jobs_integration ON sync_jobs (integration_name, started_at DESC);

COMMIT;
