-- Añadir fund_id a todas las tablas que lo necesiten según el esquema

-- Añadir fund_id a la tabla documents si no existe
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS fund_id UUID;

-- Añadir fund_id a la tabla chunks si no existe
ALTER TABLE chunks
ADD COLUMN IF NOT EXISTS fund_id UUID;

-- Añadir fund_id a la tabla activities si no existe
ALTER TABLE activities
ADD COLUMN IF NOT EXISTS fund_id UUID;

-- Añadir fund_id a la tabla investment_memos si no existe
ALTER TABLE investment_memos
ADD COLUMN IF NOT EXISTS fund_id UUID;

-- Crear restricciones de clave foránea
ALTER TABLE documents 
DROP CONSTRAINT IF EXISTS documents_fund_id_fkey;

ALTER TABLE documents
ADD CONSTRAINT documents_fund_id_fkey 
FOREIGN KEY (fund_id) REFERENCES funds(id);

ALTER TABLE chunks 
DROP CONSTRAINT IF EXISTS chunks_fund_id_fkey;

ALTER TABLE chunks
ADD CONSTRAINT chunks_fund_id_fkey 
FOREIGN KEY (fund_id) REFERENCES funds(id);

ALTER TABLE activities 
DROP CONSTRAINT IF EXISTS activities_fund_id_fkey;

ALTER TABLE activities
ADD CONSTRAINT activities_fund_id_fkey 
FOREIGN KEY (fund_id) REFERENCES funds(id);

ALTER TABLE investment_memos 
DROP CONSTRAINT IF EXISTS investment_memos_fund_id_fkey;

ALTER TABLE investment_memos
ADD CONSTRAINT investment_memos_fund_id_fkey 
FOREIGN KEY (fund_id) REFERENCES funds(id);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_documents_fund_id ON documents(fund_id);
CREATE INDEX IF NOT EXISTS idx_chunks_fund_id ON chunks(fund_id);
CREATE INDEX IF NOT EXISTS idx_activities_fund_id ON activities(fund_id);
CREATE INDEX IF NOT EXISTS idx_investment_memos_fund_id ON investment_memos(fund_id);