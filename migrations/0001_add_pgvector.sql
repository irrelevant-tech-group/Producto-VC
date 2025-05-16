-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to chunks table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'chunks' AND column_name = 'embedding'
    ) THEN
        ALTER TABLE chunks ADD COLUMN embedding vector(1536);
    END IF;
END $$;

-- Create HNSW index for fast similarity search
CREATE INDEX IF NOT EXISTS chunks_embedding_idx 
ON chunks USING hnsw(embedding vector_l2_ops) 
WITH (
    m = 16,
    ef_construction = 64
);

-- Update existing rows to have a score column if they don't
ALTER TABLE chunks 
ADD COLUMN IF NOT EXISTS similarity_score real;

-- Add an index on startup_id and document_id for faster lookups
CREATE INDEX IF NOT EXISTS chunks_startup_id_idx ON chunks(startup_id);
CREATE INDEX IF NOT EXISTS chunks_document_id_idx ON chunks(document_id);