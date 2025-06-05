-- migrations/0009_add_startup_investment_fields.sql
-- Añadir campos para tracking de inversiones y valuación

-- PASO 1: Actualizar enum de status para startups (en transacciones separadas)
-- Añadir 'standby' si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'standby' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'startup_status')) THEN
        ALTER TYPE startup_status ADD VALUE 'standby';
        RAISE NOTICE 'Added standby to startup_status enum';
    ELSE
        RAISE NOTICE 'standby already exists in startup_status enum';
    END IF;
END $$;

-- Hacer commit de la transacción para que el nuevo valor sea seguro de usar
COMMIT;

-- PASO 2: Actualizar enum de status para memos (en transacciones separadas)
-- Añadir 'approved' si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'approved' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'memo_status')) THEN
        ALTER TYPE memo_status ADD VALUE 'approved';
        RAISE NOTICE 'Added approved to memo_status enum';
    ELSE
        RAISE NOTICE 'approved already exists in memo_status enum';
    END IF;
END $$;

-- Hacer commit de la transacción
COMMIT;

-- Añadir 'rejected' si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'rejected' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'memo_status')) THEN
        ALTER TYPE memo_status ADD VALUE 'rejected';
        RAISE NOTICE 'Added rejected to memo_status enum';
    ELSE
        RAISE NOTICE 'rejected already exists in memo_status enum';
    END IF;
END $$;

-- Hacer commit de la transacción
COMMIT;

-- PASO 3: Añadir nuevos campos a startups
ALTER TABLE startups 
ADD COLUMN IF NOT EXISTS valuation NUMERIC,
ADD COLUMN IF NOT EXISTS investment_date DATE,
ADD COLUMN IF NOT EXISTS investment_amount NUMERIC,
ADD COLUMN IF NOT EXISTS ownership_percentage REAL,
ADD COLUMN IF NOT EXISTS decision_reason TEXT;

-- Añadir comentarios para documentación
COMMENT ON COLUMN startups.valuation IS 'Company valuation at funding round';
COMMENT ON COLUMN startups.investment_date IS 'Date when investment was made';
COMMENT ON COLUMN startups.investment_amount IS 'Actual amount invested';
COMMENT ON COLUMN startups.ownership_percentage IS 'Percentage of company acquired';
COMMENT ON COLUMN startups.decision_reason IS 'Reason for investment decision';

-- Crear índices para consultas de rendimiento
CREATE INDEX IF NOT EXISTS idx_startups_valuation ON startups(valuation);
CREATE INDEX IF NOT EXISTS idx_startups_investment_date ON startups(investment_date);
CREATE INDEX IF NOT EXISTS idx_startups_status_extended ON startups(status, stage);
CREATE INDEX IF NOT EXISTS idx_startups_ownership ON startups(ownership_percentage);

-- Añadir índice compuesto para estadísticas de inversión
CREATE INDEX IF NOT EXISTS idx_startups_investment_stats ON startups(status, stage, vertical, fund_id) 
WHERE status IN ('invested', 'active', 'standby');

-- Log de migración completada
DO $$
BEGIN
    RAISE NOTICE 'Migration 0009_add_startup_investment_fields completed successfully';
END $$;