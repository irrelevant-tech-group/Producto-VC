-- Create default due diligence template for existing funds
INSERT INTO due_diligence_templates (fund_id, name, is_active, categories, created_at, updated_at)
SELECT 
  id as fund_id,
  'Default Due Diligence Process' as name,
  true as is_active,
  '[
    {"key": "pitch-deck", "name": "Pitch Deck", "required": 1, "importance": "high", "description": "Company presentation and vision", "order": 1, "isDefault": true},
    {"key": "financials", "name": "Financial Documents", "required": 3, "importance": "high", "description": "Financial statements, projections, unit economics", "order": 2, "isDefault": true},
    {"key": "legal", "name": "Legal Documents", "required": 4, "importance": "medium", "description": "Corporate structure, IP, contracts, compliance", "order": 3, "isDefault": true},
    {"key": "tech", "name": "Technical Documentation", "required": 2, "importance": "high", "description": "Technical documentation, architecture, security", "order": 4, "isDefault": true},
    {"key": "market", "name": "Market Analysis", "required": 2, "importance": "medium", "description": "Market research, competitive analysis", "order": 5, "isDefault": true},
    {"key": "other", "name": "Other Documents", "required": 0, "importance": "low", "description": "Additional supporting documents", "order": 999, "isDefault": true}
  ]'::jsonb as categories,
  NOW() as created_at,
  NOW() as updated_at
FROM funds
ON CONFLICT DO NOTHING;
