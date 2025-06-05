-- migrations/0008_add_investment_thesis.sql
-- Tabla para almacenar la tesis de inversión del fondo
CREATE TABLE IF NOT EXISTS investment_thesis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id UUID NOT NULL REFERENCES funds(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  
  -- Criterios principales
  preferred_verticals JSONB NOT NULL, -- Array de verticales con pesos
  preferred_stages JSONB NOT NULL,    -- Array de etapas con pesos
  geographic_focus JSONB NOT NULL,    -- Regiones y países con pesos
  
  -- Criterios financieros
  ticket_size_min NUMERIC,
  ticket_size_max NUMERIC,
  target_ownership_min REAL,
  target_ownership_max REAL,
  expected_returns JSONB, -- Múltiplos esperados por etapa
  
  -- Criterios de evaluación con pesos
  evaluation_criteria JSONB NOT NULL, -- Estructura detallada de criterios
  
  -- Contexto y filosofía
  investment_philosophy TEXT NOT NULL,
  value_proposition TEXT NOT NULL,
  decision_process TEXT,
  risk_appetite TEXT,
  
  -- Criterios específicos por vertical
  vertical_specific_criteria JSONB,
  
  -- Red flags y deal breakers
  red_flags JSONB,
  must_haves JSONB,
  
  -- Metadatos
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_investment_thesis_fund_id ON investment_thesis(fund_id);
CREATE INDEX IF NOT EXISTS idx_investment_thesis_active ON investment_thesis(fund_id, is_active) WHERE is_active = true;

-- Asegurar que solo hay una tesis activa por fondo
CREATE UNIQUE INDEX IF NOT EXISTS idx_investment_thesis_active_unique 
ON investment_thesis(fund_id) WHERE is_active = true;