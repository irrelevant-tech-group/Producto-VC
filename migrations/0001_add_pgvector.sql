-- migrations/0001_add_pgvector.sql
-- Asegurarse que este script se ejecute correctamente

-- Activar extensión pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Verificar que la tabla chunks tenga columna de embedding
ALTER TABLE chunks ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Crear índice HNSW para búsqueda rápida
CREATE INDEX IF NOT EXISTS chunks_embedding_idx 
ON chunks USING hnsw(embedding vector_l2_ops) 
WITH (
  m = 16,
  ef_construction = 64
);
