-- Phase 5: period close, audit log, per-row adjustments and notes
BEGIN;

CREATE TABLE IF NOT EXISTS closed_periods (
  year INT NOT NULL,
  month INT NOT NULL,
  closed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_by VARCHAR(128) NOT NULL DEFAULT 'system',
  reason TEXT,
  PRIMARY KEY (year, month),
  CHECK (month BETWEEN 1 AND 12)
);

CREATE TABLE IF NOT EXISTS audit_log (
  id BIGSERIAL PRIMARY KEY,
  actor VARCHAR(128) NOT NULL DEFAULT 'system',
  action VARCHAR(64) NOT NULL,
  entity_type VARCHAR(64) NOT NULL,
  entity_id VARCHAR(512),
  before_json JSONB,
  after_json JSONB,
  metadata_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log (action);

CREATE TABLE IF NOT EXISTS entity_adjustments (
  id BIGSERIAL PRIMARY KEY,
  entity_type VARCHAR(32) NOT NULL,
  source_system VARCHAR(64) NOT NULL,
  source_id VARCHAR(512) NOT NULL,
  amount NUMERIC(18, 4) NOT NULL DEFAULT 0,
  reason VARCHAR(128),
  memo TEXT,
  created_by VARCHAR(128) NOT NULL DEFAULT 'system',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (entity_type IN ('order', 'payment', 'refund', 'fee'))
);

CREATE INDEX IF NOT EXISTS idx_entity_adjustments_entity
  ON entity_adjustments (entity_type, source_system, source_id);
CREATE INDEX IF NOT EXISTS idx_entity_adjustments_created
  ON entity_adjustments (created_at DESC);

CREATE TABLE IF NOT EXISTS entity_notes (
  id BIGSERIAL PRIMARY KEY,
  entity_type VARCHAR(32) NOT NULL,
  source_system VARCHAR(64) NOT NULL,
  source_id VARCHAR(512) NOT NULL,
  body TEXT NOT NULL,
  author VARCHAR(128) NOT NULL DEFAULT 'system',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (entity_type IN ('order', 'payment', 'refund', 'fee'))
);

CREATE INDEX IF NOT EXISTS idx_entity_notes_entity
  ON entity_notes (entity_type, source_system, source_id);
CREATE INDEX IF NOT EXISTS idx_entity_notes_created
  ON entity_notes (created_at DESC);

COMMIT;
