-- migrations/0010_fix_chunks_fund_id.sql
-- Corregir fund_id en chunks existentes y documentos

-- Actualizar chunks existentes para que tengan el fund_id correcto basado en su startup
UPDATE chunks 
SET fund_id = startups.fund_id 
FROM startups 
WHERE chunks.startup_id = startups.id 
AND chunks.fund_id IS NULL;

-- Actualizar documentos existentes para que tengan el fund_id correcto basado en su startup
UPDATE documents 
SET fund_id = startups.fund_id 
FROM startups 
WHERE documents.startup_id = startups.id 
AND documents.fund_id IS NULL;

-- Verificar que los chunks ahora tienen fund_id
DO $$
DECLARE
    chunks_without_fund_id INTEGER;
    chunks_with_fund_id INTEGER;
BEGIN
    SELECT COUNT(*) INTO chunks_without_fund_id FROM chunks WHERE fund_id IS NULL;
    SELECT COUNT(*) INTO chunks_with_fund_id FROM chunks WHERE fund_id IS NOT NULL;
    
    RAISE NOTICE 'Chunks sin fund_id: %', chunks_without_fund_id;
    RAISE NOTICE 'Chunks con fund_id: %', chunks_with_fund_id;
END $$;

-- Verificar que los documentos ahora tienen fund_id
DO $$
DECLARE
    docs_without_fund_id INTEGER;
    docs_with_fund_id INTEGER;
BEGIN
    SELECT COUNT(*) INTO docs_without_fund_id FROM documents WHERE fund_id IS NULL;
    SELECT COUNT(*) INTO docs_with_fund_id FROM documents WHERE fund_id IS NOT NULL;
    
    RAISE NOTICE 'Documentos sin fund_id: %', docs_without_fund_id;
    RAISE NOTICE 'Documentos con fund_id: %', docs_with_fund_id;
END $$;

-- Log de migración completada
DO $$
BEGIN
    RAISE NOTICE 'Migration 0010_fix_chunks_fund_id completed successfully';
END $$;