-- Add an index for faster retrievals
ALTER TABLE document_chunks 
ADD INDEX idx_embedding_vector (embedding_vector(100));

-- Add flag column for better query performance
ALTER TABLE document_chunks 
ADD COLUMN has_embedding BOOLEAN DEFAULT FALSE;

-- Update existing rows
UPDATE document_chunks 
SET has_embedding = TRUE 
WHERE embedding_vector IS NOT NULL;

-- Add index on the flag
ALTER TABLE document_chunks 
ADD INDEX idx_has_embedding (has_embedding);