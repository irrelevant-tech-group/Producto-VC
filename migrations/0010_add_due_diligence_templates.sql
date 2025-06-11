-- Migration to add due diligence templates table
CREATE TABLE IF NOT EXISTS due_diligence_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id UUID NOT NULL REFERENCES funds(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  categories JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_dd_templates_fund_id ON due_diligence_templates(fund_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_dd_templates_active ON due_diligence_templates(fund_id) WHERE is_active = true;
