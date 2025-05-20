-- Migración para añadir soporte de Clerk Auth

-- Añadir campos a la tabla de usuarios
ALTER TABLE users
ADD COLUMN IF NOT EXISTS clerk_id TEXT,
ADD COLUMN IF NOT EXISTS fund_id UUID,
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'analyst';

-- Crear tabla de fondos
CREATE TABLE IF NOT EXISTS funds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  clerk_org_id TEXT,
  logo_url TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by INTEGER REFERENCES users(id)
);

-- Añadir campo fund_id a startups
ALTER TABLE startups
ADD COLUMN IF NOT EXISTS fund_id UUID;

-- Agregar la referencia a funds
ALTER TABLE startups
DROP CONSTRAINT IF EXISTS startups_fund_id_fkey;

ALTER TABLE startups
ADD CONSTRAINT startups_fund_id_fkey
FOREIGN KEY (fund_id) REFERENCES funds(id);

-- Restricciones UNIQUE para users
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_clerk_id_unique;
ALTER TABLE users ADD CONSTRAINT users_clerk_id_unique UNIQUE (clerk_id);

-- Restricciones UNIQUE para funds
ALTER TABLE funds DROP CONSTRAINT IF EXISTS funds_slug_unique;
ALTER TABLE funds ADD CONSTRAINT funds_slug_unique UNIQUE (slug);

ALTER TABLE funds DROP CONSTRAINT IF EXISTS funds_clerk_org_id_unique;
ALTER TABLE funds ADD CONSTRAINT funds_clerk_org_id_unique UNIQUE (clerk_org_id);

-- Índices para mejora de rendimiento
DROP INDEX IF EXISTS users_clerk_id_idx;
CREATE INDEX IF NOT EXISTS users_clerk_id_idx ON users(clerk_id);

DROP INDEX IF EXISTS users_email_idx;
CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);

DROP INDEX IF EXISTS funds_clerk_org_id_idx;
CREATE INDEX IF NOT EXISTS funds_clerk_org_id_idx ON funds(clerk_org_id);

DROP INDEX IF EXISTS startups_fund_id_idx;
CREATE INDEX IF NOT EXISTS startups_fund_id_idx ON startups(fund_id);

-- Crear tabla para queries de IA si no existe
CREATE TABLE IF NOT EXISTS ai_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sources JSONB,
  startup_id UUID,
  user_id INTEGER,
  fund_id UUID,
  processing_time_ms INTEGER,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Añadir las restricciones FK a ai_queries
ALTER TABLE ai_queries
DROP CONSTRAINT IF EXISTS ai_queries_startup_id_fkey;

ALTER TABLE ai_queries
ADD CONSTRAINT ai_queries_startup_id_fkey FOREIGN KEY (startup_id) REFERENCES startups(id);

ALTER TABLE ai_queries
DROP CONSTRAINT IF EXISTS ai_queries_user_id_fkey;

ALTER TABLE ai_queries
ADD CONSTRAINT ai_queries_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);

ALTER TABLE ai_queries
DROP CONSTRAINT IF EXISTS ai_queries_fund_id_fkey;

ALTER TABLE ai_queries
ADD CONSTRAINT ai_queries_fund_id_fkey FOREIGN KEY (fund_id) REFERENCES funds(id);

-- Índices para ai_queries
DROP INDEX IF EXISTS ai_queries_startup_id_idx;
CREATE INDEX IF NOT EXISTS ai_queries_startup_id_idx ON ai_queries(startup_id);

DROP INDEX IF EXISTS ai_queries_user_id_idx;
CREATE INDEX IF NOT EXISTS ai_queries_user_id_idx ON ai_queries(user_id);

DROP INDEX IF EXISTS ai_queries_fund_id_idx;
CREATE INDEX IF NOT EXISTS ai_queries_fund_id_idx ON ai_queries(fund_id);

DROP INDEX IF EXISTS ai_queries_created_at_idx;
CREATE INDEX IF NOT EXISTS ai_queries_created_at_idx ON ai_queries(created_at);

-- Función de actualización para timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para users
DROP TRIGGER IF EXISTS set_users_updated_at ON users;
CREATE TRIGGER set_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger para funds
DROP TRIGGER IF EXISTS set_funds_updated_at ON funds;
CREATE TRIGGER set_funds_updated_at
BEFORE UPDATE ON funds
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();