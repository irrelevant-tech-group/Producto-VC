-- migrations/0002_add_startup_fields.sql
-- Idempotent migration to add new startup fields

-- Add amount_sought column if not exists
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'startups' AND column_name = 'amount_sought'
    ) THEN
        ALTER TABLE startups ADD COLUMN amount_sought NUMERIC;
        COMMENT ON COLUMN startups.amount_sought IS 'Amount of funding the startup is seeking';
    END IF;
END $$;

-- Add currency column if not exists (with default value)
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'startups' AND column_name = 'currency'
    ) THEN
        -- First check if the enum type exists, if not create it
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'currency') THEN
            CREATE TYPE currency AS ENUM ('USD', 'MXN', 'COP', 'BRL');
        END IF;
        
        -- Then add the column
        ALTER TABLE startups ADD COLUMN currency currency DEFAULT 'USD';
        COMMENT ON COLUMN startups.currency IS 'Currency for funding amount and financial data';
    END IF;
END $$;

-- Add first_contact_date column if not exists
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'startups' AND column_name = 'first_contact_date'
    ) THEN
        ALTER TABLE startups ADD COLUMN first_contact_date DATE;
        COMMENT ON COLUMN startups.first_contact_date IS 'Date of first contact with the startup';
    END IF;
END $$;

-- Add primary_contact JSONB column if not exists
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'startups' AND column_name = 'primary_contact'
    ) THEN
        ALTER TABLE startups ADD COLUMN primary_contact JSONB;
        COMMENT ON COLUMN startups.primary_contact IS 'Primary contact person details (name, email, position)';
    END IF;
END $$;

-- Add indexes for better performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_startups_first_contact_date ON startups(first_contact_date);
CREATE INDEX IF NOT EXISTS idx_startups_amount_sought ON startups(amount_sought);
CREATE INDEX IF NOT EXISTS idx_startups_currency ON startups(currency);

-- Log that migration is complete
DO $$
BEGIN
    RAISE NOTICE 'Migration 0002_add_startup_fields completed successfully';
END $$;