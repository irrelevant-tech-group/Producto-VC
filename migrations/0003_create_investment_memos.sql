-- Habilita la extensión para generar UUIDs si no está ya activa
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Crea la tabla investment_memos si no existe
CREATE TABLE IF NOT EXISTS investment_memos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  startup_id UUID NOT NULL
    REFERENCES startups(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  section TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Crea índice sobre startup_id para acelerar consultas
CREATE INDEX IF NOT EXISTS idx_investment_memos_startup_id
  ON investment_memos(startup_id);
