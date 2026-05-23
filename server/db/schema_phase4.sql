-- Phase 4: Order tax detail columns (state / county / total)
BEGIN;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS state_tax NUMERIC(18, 4) NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS county_tax NUMERIC(18, 4) NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_tax NUMERIC(18, 4) NOT NULL DEFAULT 0;

-- Backfill total_tax from legacy tax_amount where not yet set
UPDATE orders
SET total_tax = tax_amount
WHERE (total_tax IS NULL OR total_tax = 0) AND tax_amount IS NOT NULL AND tax_amount <> 0;

COMMIT;
